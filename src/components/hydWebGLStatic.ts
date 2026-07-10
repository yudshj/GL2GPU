import {
    HydActiveUniformInfo,
    // TTurboMode,
} from "../types";
import { HydRenderPassCache } from "./hydRenderPassCache";
import {
    HydGlobalStateHashed,
    HydPixelUnpackState,
} from "./hydGlobalState";
import { HydVertexArray } from "./hydVertexArray";
import {
    enumToConstant,
    enumToCompareFunction,
    enumToFrontFace,
    enumToCullFace,
    enumToViewDimension,
    enumToBlendFactors,
    enumToBlendOperations,
    enumToStencilOperation,
    enum2PT,
    indexEnumToBytes,
    getVertexFormat,
    enumToIndexFormat
} from './hydConstants';
import { HydShader } from "./hydShader";
import { HydProgram, ProgramUniformBuffer, ProgramUniformSampler } from "./hydProgram";
import { HydTexture, textureUploadBytesPerPixel } from "./hydTexture";
import { HydBuffer } from "./hydBuffer";
import { FramebufferAttributes, HydFramebuffer } from "./hydFramebuffer";
import TypedArray = NodeJS.TypedArray;
import { hydWebGLConstants } from "./hydWebGLConstants";
import { ShaderTranslator } from "./shaderTranslator";

const GLOB_GL_CTX = document.createElement('canvas').getContext('webgl2');
const frameBeginFuncLst = [];
const frameEndFuncList = [];
const VALID_PIXEL_ALIGNMENT = new Set([1, 2, 4, 8]);
let frameDepth = 0;
let autoFrameScheduled = false;

export function beginFrame() {
    if (frameDepth++ === 0) {
        frameBeginFuncLst.forEach((func) => func());
    }
}

export function endFrame() {
    if (frameDepth === 0) return;
    frameDepth--;
    if (frameDepth === 0) {
        frameEndFuncList.forEach((func) => func());
    }
}

function scheduleMicrotask(callback: () => void) {
    if (typeof queueMicrotask === 'function') {
        queueMicrotask(callback);
    } else {
        Promise.resolve().then(callback);
    }
}

function ensureAutoFrame() {
    if (frameDepth > 0) return;
    beginFrame();
    if (autoFrameScheduled) return;
    autoFrameScheduled = true;
    scheduleMicrotask(() => {
        autoFrameScheduled = false;
        endFrame();
    });
}

export class HydWebGLStatic {
    private static nextUniformUseToken: number = 1;
    hydLastCanvasSize: [number, number] = [-1, -1];
    hydMaxUniSize: number;
    hydCanvas: HTMLCanvasElement;
    hydGpuctx: GPUCanvasContext;
    hydDevice: GPUDevice;
    hydUniArr: Uint8Array;
    hydUniBuf: GPUBuffer;
    hydUniOff: number = 0;
    hydWrapper: any;
    public readonly hydContextType: string;
    hydGlobalState: HydGlobalStateHashed;
    bindedGetRenderPassDesc: () => GPURenderPassDescriptor;

    private hydRpCache: HydRenderPassCache;
    private shaderTranslator: ShaderTranslator;
    private triangleFanIndexBuffers: Map<number, GPUBuffer> = new Map();
    private readonly hydTextureObjects: WeakMap<object, HydTexture> = new WeakMap();
    private readonly hydBufferObjects: WeakMap<object, HydBuffer> = new WeakMap();
    private readonly contextToken: object = {};
    private readonly maskedClearPipelines: Map<string, GPURenderPipeline> = new Map();
    private maskedClearUniformBuffer: GPUBuffer = null;
    private samplerOriginStateVersion: number = 0;
    private gpuViewportDirty: boolean = true;
    private gpuScissorDirty: boolean = true;
    private lastDrawPbv: any = null;
    private pendingReadbacks: Promise<void>[] = [];
    private currentUniformUseToken: number = HydWebGLStatic.nextUniformUseToken++;
    private currentProgramValid: boolean = false;
    private synchronousReadbackCanvas: HTMLCanvasElement = null;
    private synchronousReadbackContext: CanvasRenderingContext2D = null;

    increaseOk() {
        // // @ts-ignore
        // if (hydOk !== undefined) { console.log("Replay waited. increase hydOk:", hydOk); hydOk++; }
    }

    decreaseOk() {
        // // @ts-ignore
        // if (hydOk !== undefined) { console.log("Replay enabled. decrease hydOk:", hydOk); hydOk--; }
    }

    public get wrapperContext() {
        return this.hydWrapper;
    }

    private setObjectValidationError(...objects: any[]) {
        const foreignObject = objects.some((object) => object && object.ownerToken && object.ownerToken !== this.contextToken);
        this.hydGlobalState.setError(foreignObject
            ? WebGL2RenderingContext.INVALID_OPERATION
            : WebGL2RenderingContext.INVALID_VALUE);
    }

    regenerateDS(label: string, format: GPUTextureFormat, compareFunc: GPUCompareFunction, bindPoint: GLenum, width: number, height: number) {
        const texture = new HydTexture(this.hydDevice);
        texture.label = label;
        texture.state.compare = compareFunc;
        texture.renderbufferStorage(format, width, height);
        texture.viewDimension = '2d';
        this.hydGlobalState.defaultFramebuffer.attachments.set(bindPoint, new FramebufferAttributes(bindPoint, undefined, undefined, texture, undefined, WebGL2RenderingContext.RENDERBUFFER));
        this.hydGlobalState.defaultFramebuffer.resetHash();
    }

    updateCanvasSize() {
        const width: number = this.hydCanvas.width;
        const height: number = this.hydCanvas.height;
        if (this.hydLastCanvasSize[0] === width && this.hydLastCanvasSize[1] === height) {
            return;     // skip
        }
        if (width <= 0 || height <= 0) {
            return;
        }

        if (this.hydRpCache) {
            this._der_flush();
        }

        // console.log("canvas resized, last:", this._lastCanvasSize, "new:", [width, height]);
        this.hydGlobalState.miscState.scissorBox = [0, 0, width, height];
        this.hydGlobalState.commonState.viewport = [0, 0, width, height, 0, 1];
        this.gpuViewportDirty = true;
        this.gpuScissorDirty = true;
        this['drawingBufferWidth'] = width;
        this['drawingBufferHeight'] = height;

        try {
            this.hydGlobalState.defaultFramebuffer.attachments.get(WebGL2RenderingContext.DEPTH_ATTACHMENT).attachment.destroy();
            this.hydGlobalState.defaultFramebuffer.attachments.get(WebGL2RenderingContext.STENCIL_ATTACHMENT).attachment.destroy();
            this.hydGlobalState.defaultFramebuffer.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT).attachment.destroy();
        } catch (error) {
        }

        this.hydLastCanvasSize = [width, height];
        this.regenerateDS(`defaultDepthBuffer ${width} ${height}`, 'depth32float', this.hydGlobalState.depthState.func, WebGL2RenderingContext.DEPTH_ATTACHMENT, width, height);
        this.regenerateDS(`defaultStencilBuffer ${width} ${height}`, 'stencil8', this.hydGlobalState.stencilState.frontFunc, WebGL2RenderingContext.STENCIL_ATTACHMENT, width, height);
        this.regenerateDS(`defaultDepthStencilBuffer ${width} ${height}`, 'depth24plus-stencil8', this.hydGlobalState.depthState.func, WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT, width, height);
        this.hydGlobalState.__canvasView = this.hydGpuctx.getCurrentTexture().createView({ label: 'canvasView resized' });
    }
    constructor(_canvas: HTMLCanvasElement, _gpuctx: GPUCanvasContext, _attributes: WebGLContextAttributes, _device: GPUDevice, _maxUniformSize: number, _replay: number, shaderTranslator: ShaderTranslator, contextType: string = "webgl") {
        this.shaderTranslator = shaderTranslator;
        this.hydContextType = contextType;
        this.hydMaxUniSize = _maxUniformSize;
        this.hydCanvas = _canvas;
        this.hydGpuctx = _gpuctx;
        this.hydDevice = _device;
        this.hydUniArr = new Uint8Array(this.hydMaxUniSize);
        this.hydUniBuf = this.hydDevice.createBuffer({
            label: 'GU',
            size: this.hydMaxUniSize + 65536,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.hydCanvas.onresize = () => {
            this.updateCanvasSize();
        };
        for (const propertyName in hydWebGLConstants) {
            this[propertyName] = hydWebGLConstants[propertyName];
        }
        this['canvas'] = _canvas;
        this['drawingBufferWidth'] = _canvas.width;
        this['drawingBufferHeight'] = _canvas.height;
        this['drawingBufferColorSpace'] = 'srgb';
        // Object.setPrototypeOf(this, glctx.constructor.prototype);
        this.hydWrapper = this;
        this.hydGlobalState = new HydGlobalStateHashed(_attributes, this.hydUniBuf, _device);
        this.hydGlobalState.__canvasView = this.hydGpuctx.getCurrentTexture().createView({ label: 'initial canvasView' });
        this.bindedGetRenderPassDesc = this.hydGlobalState.getRenderPassDescriptor.bind(this.hydGlobalState);

        frameBeginFuncLst.push(this._frameStart.bind(this));  // 这里能work是因为我们只需要draw的第一个参数！
        frameEndFuncList.push(this._frameEnd.bind(this));  // 这里能work是因为我们只需要draw的第一个参数！

        // this.renderPassInfo = new HydRenderPassCache();
        this.hydRpCache = new HydRenderPassCache(this.hydDevice);
        this.updateCanvasSize();
    }

    private flushUniforms() {
        if (this.hydUniOff > 0) {
            // console.log('[HYD] flush uniforms', this.uniformWrite);
            this.hydDevice.queue.writeBuffer(this.hydUniBuf, 0, this.hydUniArr.buffer, 0, this.hydUniOff);
            this.hydUniOff = 0;
        }
    }

    private materializePendingClear() {
        if (this.hydGlobalState.clearState.target === 0 || this.hydRpCache.hasActiveRenderPass()) {
            return;
        }
        this.hydRpCache.RpClear(this.bindedGetRenderPassDesc);
        this.hydGlobalState.clearState.target = 0;
        this.hydGlobalState.recordTransitionOne('!!d0');
    }

    public _der_flush() {
        this.materializePendingClear();
        this.flushUniforms();
        this.hydRpCache.CeSubmitAndReset(); // TODO: schedule Command Encoder.
    }

    public _frameEnd() {
        this._der_flush();
        this.hydGlobalState.__canvasView = null;
    }

    public _frameStart() {
        this.hydUniOff = 0;
        this.updateCanvasSize();
        this.hydGlobalState.__canvasView = this.hydGpuctx.getCurrentTexture().createView({ label: 'canvasView' });
    }

    bindAttribLocation(program: HydProgram, index: GLuint, name: string) {
        if (!this.isProgram(program)) {
            this.setObjectValidationError(program);
            return;
        }
        program.bindAttribLocation(index, name);
        this.hydGlobalState.recordTransition("bindAttribLocation", program.hash || "unlinked", index, name);
    }

    getError() {
        return this.hydGlobalState.consumeError();
    }

    getShaderPrecisionFormat(shaderType: GLenum, precisionType: GLenum) {
        if (shaderType !== WebGL2RenderingContext.VERTEX_SHADER &&
            shaderType !== WebGL2RenderingContext.FRAGMENT_SHADER) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }

        switch (precisionType) {
            case WebGL2RenderingContext.LOW_FLOAT:
                return { rangeMin: 8, rangeMax: 8, precision: 8 };
            case WebGL2RenderingContext.MEDIUM_FLOAT:
                return { rangeMin: 14, rangeMax: 14, precision: 10 };
            case WebGL2RenderingContext.HIGH_FLOAT:
                return { rangeMin: 127, rangeMax: 127, precision: 23 };
            case WebGL2RenderingContext.LOW_INT:
                return { rangeMin: 8, rangeMax: 8, precision: 0 };
            case WebGL2RenderingContext.MEDIUM_INT:
                return { rangeMin: 16, rangeMax: 16, precision: 0 };
            case WebGL2RenderingContext.HIGH_INT:
                return { rangeMin: 31, rangeMax: 31, precision: 0 };
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return null;
        }
    }

    detachShader(program: HydProgram, shader: HydShader) {
        if (!this.isProgram(program) || !this.isShader(shader)) {
            this.setObjectValidationError(program, shader);
            return;
        }
        if (!program.detachShader(shader)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
        }
    }

    deleteShader(s: HydShader | null) {
        if (s === null) return;
        if (!this.isShader(s)) {
            this.setObjectValidationError(s);
            return;
        }
        s.deleted = true;
        if (s.attachmentCount === 0) {
            s.destroyed = true;
        }
    }

    private finalizeProgramDeletion(program: HydProgram) {
        program.detachAllShaders();
        program.destroyed = true;
        program.linked = false;
    }

    deleteProgram(p: HydProgram | null) {
        if (p === null) return;
        if (!this.isProgram(p)) {
            this.setObjectValidationError(p);
            return;
        }
        p.deleted = true;
        if (this.hydGlobalState.commonState.currentProgram !== p) {
            this.finalizeProgramDeletion(p);
        }
    }

    deleteFramebuffer(framebuffer: HydFramebuffer | null) {
        if (!framebuffer) return;
        if (!(framebuffer instanceof HydFramebuffer) || framebuffer.ownerToken !== this.contextToken) {
            this.setObjectValidationError(framebuffer);
            return;
        }
        framebuffer.deleted = true;
        this._der_flush();
        if (this.hydGlobalState.commonState.drawFramebufferBinding === framebuffer) {
            this.hydGlobalState.commonState.drawFramebufferBinding = this.hydGlobalState.defaultFramebuffer;
        }
        if (this.hydGlobalState.commonState.readFramebufferBinding === framebuffer) {
            this.hydGlobalState.commonState.readFramebufferBinding = this.hydGlobalState.defaultFramebuffer;
        }
        framebuffer.attachments.clear();
        framebuffer.resetHash();
        this.hydGlobalState.recordTransition("deleteFramebuffer", "framebuffer");
    }

    deleteRenderbuffer(renderbuffer: HydTexture | null) {
        if (!renderbuffer) return;
        if (!(renderbuffer instanceof HydTexture) || renderbuffer.ownerToken !== this.contextToken) {
            this.setObjectValidationError(renderbuffer);
            return;
        }
        renderbuffer.deleted = true;
        this._der_flush();
        if (this.hydGlobalState.commonState.renderbufferBinding === renderbuffer) {
            this.hydGlobalState.commonState.renderbufferBinding = null;
        }
        for (const callback of renderbuffer.onDelete.splice(0)) callback();
        renderbuffer.destroy();
        this.hydGlobalState.recordTransition("deleteRenderbuffer", "renderbuffer");
    }

    private lookupTexture(texture: HydTexture | object | null): HydTexture | null {
        if (texture === null) {
            return null;
        }
        if (texture instanceof HydTexture) {
            return texture.ownerToken === this.contextToken && typeof texture.texImage2D === "function" ? texture : null;
        }
        if (typeof texture !== "object") {
            return null;
        }
        const tagged = (texture as any).__hydTexture;
        if (tagged instanceof HydTexture && tagged.ownerToken === this.contextToken) {
            return tagged;
        }
        const mapped = this.hydTextureObjects.get(texture);
        if (mapped) {
            return mapped;
        }
        const wrapped = (texture as any).texture;
        if (wrapped instanceof HydTexture && wrapped.ownerToken === this.contextToken) {
            this.hydTextureObjects.set(texture, wrapped);
            return wrapped;
        }
        return null;
    }

    private normalizeTexture(texture: HydTexture | object | null): HydTexture | null {
        const knownTexture = this.lookupTexture(texture);
        if (knownTexture || texture === null || typeof texture !== "object") {
            return knownTexture;
        }
        const hydTexture = new HydTexture(this.hydDevice, this.contextToken);
        this.hydTextureObjects.set(texture, hydTexture);
        try {
            Object.defineProperty(texture, "__hydTexture", {
                configurable: false,
                enumerable: false,
                value: hydTexture,
            });
        } catch (_) {
        }
        return hydTexture;
    }

    deleteTexture(texture: HydTexture | object | null) {
        if (texture instanceof HydTexture && texture.ownerToken !== this.contextToken) {
            this.setObjectValidationError(texture);
            return;
        }
        const hydTexture = this.lookupTexture(texture);
        if (!hydTexture) return;
        this._der_flush();
        this.hydGlobalState.deleteTextureBinding(hydTexture);
        hydTexture.deleted = true;
        for (const callback of hydTexture.onDelete.splice(0)) callback();
        hydTexture.destroy();
        this.hydGlobalState.recordTransition("deleteTexture", "texture");
    }

    private lookupBuffer(buffer: HydBuffer | object | null): HydBuffer | null {
        if (buffer === null) {
            return null;
        }
        if (buffer instanceof HydBuffer) {
            return buffer.ownerToken === this.contextToken && typeof buffer.write === "function" ? buffer : null;
        }
        if (typeof buffer !== "object") {
            return null;
        }
        const tagged = (buffer as any).__hydBuffer;
        if (tagged instanceof HydBuffer && tagged.ownerToken === this.contextToken) {
            return tagged;
        }
        const mapped = this.hydBufferObjects.get(buffer);
        if (mapped) {
            return mapped;
        }
        const wrapped = (buffer as any).buffer;
        if (wrapped instanceof HydBuffer && wrapped.ownerToken === this.contextToken) {
            this.hydBufferObjects.set(buffer, wrapped);
            return wrapped;
        }
        return null;
    }

    private normalizeBuffer(buffer: HydBuffer | object | null): HydBuffer | null {
        const knownBuffer = this.lookupBuffer(buffer);
        if (knownBuffer || buffer === null || typeof buffer !== "object") {
            return knownBuffer;
        }
        const hydBuffer = new HydBuffer(this.hydDevice, this.contextToken);
        this.hydBufferObjects.set(buffer, hydBuffer);
        try {
            Object.defineProperty(buffer, "__hydBuffer", {
                configurable: false,
                enumerable: false,
                value: hydBuffer,
            });
        } catch (_) {
        }
        return hydBuffer;
    }

    deleteBuffer(buffer: HydBuffer | object | null) {
        if (buffer instanceof HydBuffer && buffer.ownerToken !== this.contextToken) {
            this.setObjectValidationError(buffer);
            return;
        }
        const hydBuffer = this.lookupBuffer(buffer);
        if (!hydBuffer) return;
        hydBuffer.deleted = true;
        this._der_flush();
        if (this.hydGlobalState.commonState.arrayBufferBinding === hydBuffer) {
            this.hydGlobalState.commonState.arrayBufferBinding = null;
        }
        if (this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding === hydBuffer) {
            this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding = null;
        }
        for (const attribute of this.hydGlobalState.commonState.vertexArrayBinding.attributes) {
            if (attribute.buffer === hydBuffer) {
                attribute.buffer = null;
                attribute.updateHash();
            }
        }
        this.hydGlobalState.recordTransition("deleteBuffer", "buffer");
    }

    getShaderInfoLog(shader: HydShader) {
        if (!this.isShader(shader)) {
            this.setObjectValidationError(shader);
            return null;
        }
        return shader.infoLog;
    }

    getProgramInfoLog(program: HydProgram) {
        if (!this.isProgram(program)) {
            this.setObjectValidationError(program);
            return null;
        }
        return program.infoLog;
    }

    getAttachedShaders(program: HydProgram) {
        if (!(program instanceof HydProgram)) {
            throw new TypeError("getAttachedShaders requires a WebGLProgram");
        }
        if (!this.isProgram(program)) {
            this.setObjectValidationError(program);
            return null;
        }
        return program.getAttachedShaders();
    }

    getParameter(pname: GLenum) {
        if (enumToConstant.has(pname)) {
            return enumToConstant.get(pname);
        } else {
            switch (pname) {
                case WebGL2RenderingContext.ACTIVE_TEXTURE:
                    return this.hydGlobalState.commonState.activeTextureUnit + WebGL2RenderingContext.TEXTURE0;
                case WebGL2RenderingContext.ARRAY_BUFFER_BINDING:
                    return this.hydGlobalState.commonState.arrayBufferBinding;
                case WebGL2RenderingContext.BLEND:
                    return this.hydGlobalState.blendState.enabled;
                case WebGL2RenderingContext.BLEND_COLOR:
                    return new Float32Array(this.hydGlobalState.blendState.color);
                case WebGL2RenderingContext.BLEND_SRC_RGB:
                    return this.hydGlobalState.blendState.srcRGB;
                case WebGL2RenderingContext.BLEND_SRC_ALPHA:
                    return this.hydGlobalState.blendState.srcAlpha;
                case WebGL2RenderingContext.BLEND_DST_RGB:
                    return this.hydGlobalState.blendState.dstRGB;
                case WebGL2RenderingContext.BLEND_DST_ALPHA:
                    return this.hydGlobalState.blendState.dstAlpha;
                case WebGL2RenderingContext.COLOR_CLEAR_VALUE:
                    return new Float32Array(this.hydGlobalState.clearState.color);
                case WebGL2RenderingContext.COLOR_WRITEMASK:
                    return this.hydGlobalState.miscState.colorWriteMask.slice();
                case WebGL2RenderingContext.CULL_FACE:
                    return this.hydGlobalState.polygonState.cullFace;
                case WebGL2RenderingContext.CULL_FACE_MODE:
                    return this.hydGlobalState.polygonState.cullFaceMode;
                case WebGL2RenderingContext.FRONT_FACE:
                    return this.hydGlobalState.polygonState.frontFace;
                case WebGL2RenderingContext.DEPTH_TEST:
                    return this.hydGlobalState.depthState.enabled;
                case WebGL2RenderingContext.DEPTH_WRITEMASK:
                    return this.hydGlobalState.depthState.writeMask;
                case WebGL2RenderingContext.DEPTH_CLEAR_VALUE:
                    return this.hydGlobalState.clearState.depth;
                case WebGL2RenderingContext.SCISSOR_BOX:
                    return new Int32Array(this.hydGlobalState.miscState.scissorBox);
                case WebGL2RenderingContext.SCISSOR_TEST:
                    return this.hydGlobalState.miscState.scissorTest;
                case WebGL2RenderingContext.UNPACK_FLIP_Y_WEBGL:
                    return this.hydGlobalState.miscState.unpackFlipYWebGL;
                case WebGL2RenderingContext.UNPACK_ALIGNMENT:
                    return this.hydGlobalState.miscState.unpackAlignment;
                case WebGL2RenderingContext.PACK_ALIGNMENT:
                    return this.hydGlobalState.miscState.packAlignment;
                case WebGL2RenderingContext.STENCIL_TEST:
                    return this.hydGlobalState.stencilState.enabled;
                case WebGL2RenderingContext.STENCIL_WRITEMASK:
                    return this.hydGlobalState.stencilState.frontWriteMask;
                case WebGL2RenderingContext.STENCIL_BACK_WRITEMASK:
                    return this.hydGlobalState.stencilState.backWriteMask;
                case WebGL2RenderingContext.STENCIL_VALUE_MASK:
                    return this.hydGlobalState.stencilState.frontValueMask;
                case WebGL2RenderingContext.STENCIL_BACK_VALUE_MASK:
                    return this.hydGlobalState.stencilState.backValueMask;
                case WebGL2RenderingContext.STENCIL_REF:
                    return this.hydGlobalState.stencilState.frontRef;
                case WebGL2RenderingContext.STENCIL_BACK_REF:
                    return this.hydGlobalState.stencilState.backRef;
                case WebGL2RenderingContext.STENCIL_FUNC:
                    return this.hydGlobalState.stencilState.frontFunc;
                case WebGL2RenderingContext.STENCIL_BACK_FUNC:
                    return this.hydGlobalState.stencilState.backFunc;
                case WebGL2RenderingContext.STENCIL_FAIL:
                    return this.hydGlobalState.stencilState.frontFail;
                case WebGL2RenderingContext.STENCIL_BACK_FAIL:
                    return this.hydGlobalState.stencilState.backFail;
                case WebGL2RenderingContext.STENCIL_PASS_DEPTH_FAIL:
                    return this.hydGlobalState.stencilState.frontPassDepthFail;
                case WebGL2RenderingContext.STENCIL_BACK_PASS_DEPTH_FAIL:
                    return this.hydGlobalState.stencilState.backPassDepthFail;
                case WebGL2RenderingContext.STENCIL_PASS_DEPTH_PASS:
                    return this.hydGlobalState.stencilState.frontPassDepthPass;
                case WebGL2RenderingContext.STENCIL_BACK_PASS_DEPTH_PASS:
                    return this.hydGlobalState.stencilState.backPassDepthPass;
                case WebGL2RenderingContext.STENCIL_CLEAR_VALUE:
                    return this.hydGlobalState.clearState.stencil
                case WebGL2RenderingContext.VIEWPORT:
                    const [x, y, width, height, minDepth, maxDepth] = this.hydGlobalState.commonState.viewport;
                    return new Int32Array([x, y, width, height]);
                case WebGL2RenderingContext.FRAMEBUFFER_BINDING:
                case WebGL2RenderingContext.DRAW_FRAMEBUFFER_BINDING:
                    return this.hydGlobalState.commonState.drawFramebufferBinding === this.hydGlobalState.defaultFramebuffer ? null : this.hydGlobalState.commonState.drawFramebufferBinding;
                case WebGL2RenderingContext.READ_FRAMEBUFFER_BINDING:
                    return this.hydGlobalState.commonState.readFramebufferBinding === this.hydGlobalState.defaultFramebuffer ? null : this.hydGlobalState.commonState.readFramebufferBinding;
                case WebGL2RenderingContext.RENDERBUFFER_BINDING:
                    return this.hydGlobalState.commonState.renderbufferBinding;
            }
            throw new Error("unhandled getParameter: " + pname);
        }
    }

    getContextAttributes() {
        return this.hydGlobalState.contextAttributes;
    }

    isContextLost() {
        return false;
    }

    getShaderParameter(shader: HydShader, pname: GLenum) {
        if (!this.isShader(shader)) {
            this.setObjectValidationError(shader);
            return null;
        }
        switch (pname) {
            case WebGL2RenderingContext.DELETE_STATUS:
                return shader.deleted;
            case WebGL2RenderingContext.COMPILE_STATUS:
                return shader.compiled;
            case WebGL2RenderingContext.SHADER_TYPE:
                return shader.type;
            // case WebGL2RenderingContext.SHADER_SOURCE_LENGTH:
            //     return shader.sourceLength;
        }
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
        return null;
    }

    getProgramParameter(program: HydProgram, pname: GLenum) {
        if (!this.isProgram(program)) {
            this.setObjectValidationError(program);
            return null;
        }
        switch (pname) {
            case WebGL2RenderingContext.DELETE_STATUS:
                return program.deleted;
            case WebGL2RenderingContext.LINK_STATUS:
                return program.linked;
            case WebGL2RenderingContext.VALIDATE_STATUS:
                return program.validated;
            case WebGL2RenderingContext.ATTACHED_SHADERS:
                return program.getAttachedShaders().length;
            case WebGL2RenderingContext.ACTIVE_ATTRIBUTES:
                return program.hydAttributes.length;
            case WebGL2RenderingContext.ACTIVE_UNIFORMS:
                return program.hydUniforms.filter((uniform) => !uniform.internal).length + program.hydSamplers.length; // 0824
            case WebGL2RenderingContext.ACTIVE_UNIFORM_BLOCKS:
                if (this.hydContextType === "webgl2") return 0;
                break;
        }
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
        return null;
    }

    getExtension(extensionName: string) {
        if (extensionName === 'OES_vertex_array_object') {
            return {
                createVertexArrayOES: () => {
                    return this.createVertexArray();
                },
                deleteVertexArrayOES: (vertexArray: HydVertexArray) => {
                    console.warn("deleteVertexArrayOES is not implemented");
                },
                bindVertexArrayOES: (vertexArray: HydVertexArray | null) => {
                    return this.bindVertexArray(vertexArray);
                },
                isVertexArrayOES: (vertexArray: HydVertexArray) => {
                    return vertexArray instanceof HydVertexArray;
                },
            };
        }
        if (extensionName === 'ANGLE_instanced_arrays') {
            return {
                VERTEX_ATTRIB_ARRAY_DIVISOR_ANGLE: WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_DIVISOR,
                drawArraysInstancedANGLE: this.drawArraysInstanced.bind(this),
                drawElementsInstancedANGLE: this.drawElementsInstanced.bind(this),
                vertexAttribDivisorANGLE: this.vertexAttribDivisor.bind(this),
            };
        }
        if (extensionName === 'OES_texture_float' ||
            extensionName === 'OES_texture_float_linear' ||
            extensionName === 'OES_element_index_uint' ||
            extensionName === 'OES_standard_derivatives' ||
            extensionName === 'EXT_shader_texture_lod' ||
            extensionName === 'WEBGL_depth_texture' ||
            extensionName === 'EXT_color_buffer_float' ||
            extensionName === 'WEBGL_color_buffer_float' ||
            extensionName === 'EXT_blend_minmax') {
            return {};
        }
        console.warn("extension required: " + extensionName);
        return null;
    }

    getBufferParameter(target: GLenum, pname: GLenum) {
        let buffer: HydBuffer = null;
        switch (target) {
            case WebGL2RenderingContext.ARRAY_BUFFER:
                buffer = this.hydGlobalState.commonState.arrayBufferBinding;
                break;
            case WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER:
                buffer = this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
                break;
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return null;
        }
        if (!buffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        switch (pname) {
            case WebGL2RenderingContext.BUFFER_SIZE:
                return buffer.webglSize;
            case WebGL2RenderingContext.BUFFER_USAGE:
                return buffer.webglUsage;
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return null;
        }
    }

    getRenderbufferParameter(target: GLenum, pname: GLenum) {
        if (target !== WebGL2RenderingContext.RENDERBUFFER) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        if (!this.hydGlobalState.commonState.renderbufferBinding) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        const renderbuffer = this.hydGlobalState.commonState.renderbufferBinding;
        const format = renderbuffer.format || "";
        switch (pname) {
            case WebGL2RenderingContext.RENDERBUFFER_WIDTH:
                return renderbuffer.width;
            case WebGL2RenderingContext.RENDERBUFFER_HEIGHT:
                return renderbuffer.height;
            case WebGL2RenderingContext.RENDERBUFFER_INTERNAL_FORMAT:
                return renderbuffer.renderbufferInternalFormat;
            case WebGL2RenderingContext.RENDERBUFFER_RED_SIZE:
            case WebGL2RenderingContext.RENDERBUFFER_GREEN_SIZE:
            case WebGL2RenderingContext.RENDERBUFFER_BLUE_SIZE:
            case WebGL2RenderingContext.RENDERBUFFER_ALPHA_SIZE:
                return format.includes("rgba") || format.includes("bgra") ? 8 : 0;
            case WebGL2RenderingContext.RENDERBUFFER_DEPTH_SIZE:
                if (format.includes("depth16")) return 16;
                if (format.includes("depth32")) return 32;
                return format.includes("depth") ? 24 : 0;
            case WebGL2RenderingContext.RENDERBUFFER_STENCIL_SIZE:
                return format.includes("stencil") ? 8 : 0;
            case WebGL2RenderingContext.RENDERBUFFER_SAMPLES:
                if (this.hydContextType === "webgl2") return renderbuffer.renderbufferSamples;
                break;
            default:
                break;
        }
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
        return null;
    }

    getFramebufferAttachmentParameter(target: GLenum, attachment: GLenum, pname: GLenum) {
        const webgl2Target = this.hydContextType === "webgl2" &&
            (target === WebGL2RenderingContext.DRAW_FRAMEBUFFER || target === WebGL2RenderingContext.READ_FRAMEBUFFER);
        if (target !== WebGL2RenderingContext.FRAMEBUFFER && !webgl2Target) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        const maxColorAttachments = this.hydContextType === "webgl2" ? 16 : 1;
        const colorAttachment = attachment >= WebGL2RenderingContext.COLOR_ATTACHMENT0 &&
            attachment < WebGL2RenderingContext.COLOR_ATTACHMENT0 + maxColorAttachments;
        if (!colorAttachment &&
            attachment !== WebGL2RenderingContext.DEPTH_ATTACHMENT &&
            attachment !== WebGL2RenderingContext.STENCIL_ATTACHMENT &&
            attachment !== WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        const framebuffer = this.getFramebufferForTarget(target);
        const attrib = framebuffer.attachments.get(attachment);
        if (!attrib) {
            if (pname === WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE) {
                return WebGL2RenderingContext.NONE;
            }
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        switch (pname) {
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE:
                return attrib.objectType;
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME:
                return attrib.attachment;
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL:
                return attrib.level || 0;
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE:
                return attrib.face >= WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X &&
                    attrib.face <= WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z
                    ? attrib.face
                    : WebGL2RenderingContext.NONE;
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return null;
        }
    }

    getAttribLocation(program: HydProgram, attribName: string) {
        if (!this.isProgram(program)) {
            this.setObjectValidationError(program);
            return -1;
        }
        const attrib = program.hydAttributes.find((item) => item.name === attribName);
        return attrib ? attrib.location : -1;
    }

    getUniformLocation(program: HydProgram, uniformName: string) {
        if (!this.isProgram(program)) {
            this.setObjectValidationError(program);
            return null;
        }
        // return program.uniforms.findIndex((uniform) => uniform.name === uniformName);
        const safeUniformName = uniformName.replace(/[^A-Za-z0-9_]/g, "_").replace(/_+$/g, "");
        const ret = program.hydUniforms.find((uniform) => !uniform.internal &&
                (uniform.name === uniformName || uniform.name === safeUniformName || uniform.sourceName === uniformName)) ||
            program.hydSamplers.find((sampler) =>
                sampler.name === uniformName || sampler.name === safeUniformName || sampler.sourceName === uniformName);
        if (ret) {
            return ret;
        } else {
            return null;
        }
    }

    getUniform(program: HydProgram, location: ProgramUniformBuffer | ProgramUniformSampler | null) {
        if (!this.isProgram(program)) {
            this.setObjectValidationError(program);
            return null;
        }
        if (location === null ||
            (!(location instanceof ProgramUniformBuffer) && !(location instanceof ProgramUniformSampler)) ||
            location.ownerToken !== this.contextToken ||
            location.program !== program ||
            location.linkGeneration !== program.linkGeneration) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        if (location instanceof ProgramUniformSampler) {
            return location.textureUnit;
        }

        const componentCount = (() => {
            switch (location.webgl_type) {
                case WebGL2RenderingContext.FLOAT_MAT3: return 9;
                case WebGL2RenderingContext.FLOAT_MAT2x3: return 6;
                case WebGL2RenderingContext.FLOAT_MAT2x4: return 8;
                case WebGL2RenderingContext.FLOAT_MAT3x2: return 6;
                case WebGL2RenderingContext.FLOAT_MAT3x4: return 12;
                case WebGL2RenderingContext.FLOAT_MAT4x2: return 8;
                case WebGL2RenderingContext.FLOAT_MAT4x3: return 12;
                default: return Math.max(1, location.byteLength / 4);
            }
        })();
        if (location.webgl_type === WebGL2RenderingContext.BOOL) return Boolean(location.int32View[location.wordOffset]);
        if (location.webgl_type >= WebGL2RenderingContext.BOOL_VEC2 && location.webgl_type <= WebGL2RenderingContext.BOOL_VEC4) {
            return Array.from(location.int32View.slice(location.wordOffset, location.wordOffset + componentCount), Boolean);
        }
        if (location.webgl_type === WebGL2RenderingContext.FLOAT) return location.float32View[location.wordOffset];
        if (location.webgl_type === WebGL2RenderingContext.INT) return location.int32View[location.wordOffset];
        if (location.webgl_type === WebGL2RenderingContext.UNSIGNED_INT) return location.uint32View[location.wordOffset];
        if (location.webgl_type === WebGL2RenderingContext.UNSIGNED_INT ||
            (WebGL2RenderingContext.UNSIGNED_INT_VEC2 <= location.webgl_type && location.webgl_type <= WebGL2RenderingContext.UNSIGNED_INT_VEC4)) {
            return location.uint32View.slice(location.wordOffset, location.wordOffset + componentCount);
        }
        if (location.webgl_type >= WebGL2RenderingContext.INT_VEC2 && location.webgl_type <= WebGL2RenderingContext.INT_VEC4) {
            return location.int32View.slice(location.wordOffset, location.wordOffset + componentCount);
        }
        if (location.webgl_type === WebGL2RenderingContext.FLOAT_MAT3) {
            const value = new Float32Array(9);
            for (let column = 0; column < 3; column++) {
                value.set(location.float32View.subarray(location.wordOffset + column * 4, location.wordOffset + column * 4 + 3), column * 3);
            }
            return value;
        }
        return location.float32View.slice(location.wordOffset, location.wordOffset + componentCount);
    }

    getVertexAttrib(index: GLuint, pname: GLenum) {
        const attributes = this.hydGlobalState.commonState.vertexArrayBinding.attributes;
        if (index < 0 || index >= attributes.length) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return null;
        }
        const attribute = attributes[index];
        switch (pname) {
            case WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING:
                return attribute.buffer && !attribute.buffer.deleted ? attribute.buffer : null;
            case WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_ENABLED:
                return attribute.enabled;
            case WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_SIZE:
                return attribute.size === undefined ? 4 : attribute.size;
            case WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_STRIDE:
                return attribute.webglStride;
            case WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_TYPE:
                return attribute.type === undefined ? WebGL2RenderingContext.FLOAT : attribute.type;
            case WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_NORMALIZED:
                return attribute.normalized;
            case WebGL2RenderingContext.CURRENT_VERTEX_ATTRIB:
                return new Float32Array(this.hydGlobalState.currentVertexAttribValues[index]);
            case WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_DIVISOR:
                if (this.hydContextType === "webgl2") return attribute.divisor;
                break;
            case WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_INTEGER:
                if (this.hydContextType === "webgl2") return Boolean(attribute.int);
                break;
        }
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
        return null;
    }

    getVertexAttribOffset(index: GLuint, pname: GLenum) {
        const attributes = this.hydGlobalState.commonState.vertexArrayBinding.attributes;
        if (index < 0 || index >= attributes.length) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return 0;
        }
        if (pname !== WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_POINTER) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return 0;
        }
        return attributes[index].offset || 0;
    }

    isTexture(texture: HydTexture | object) {
        const hydTexture = this.lookupTexture(texture);
        return Boolean(hydTexture && hydTexture.initialized && !hydTexture.deleted);
    }

    isBuffer(buffer: HydBuffer | object) {
        const hydBuffer = this.lookupBuffer(buffer);
        return Boolean(hydBuffer && hydBuffer.initialized && !hydBuffer.deleted);
    }

    isFramebuffer(framebuffer: HydFramebuffer) {
        return framebuffer instanceof HydFramebuffer && framebuffer.ownerToken === this.contextToken && framebuffer.initialized && !framebuffer.deleted;
    }

    isRenderbuffer(renderbuffer: HydTexture) {
        return renderbuffer instanceof HydTexture && renderbuffer.ownerToken === this.contextToken && renderbuffer.initialized && !renderbuffer.deleted;
    }

    isProgram(program: HydProgram) {
        return program instanceof HydProgram && program.ownerToken === this.contextToken && !program.destroyed;
    }

    isShader(shader: HydShader) {
        return shader instanceof HydShader && shader.ownerToken === this.contextToken && !shader.destroyed;
    }

    isVertexArray(vertexArray: HydVertexArray) {
        return vertexArray instanceof HydVertexArray && vertexArray.ownerToken === this.contextToken;
    }

    polygonOffset(x: number, y: number) {
        this.hydGlobalState.polygonState.polygonOffsetFactor = x;
        this.hydGlobalState.polygonState.polygonOffsetUnits = y;
    }

    shaderSource(shader: HydShader, source: string) {
        if (!this.isShader(shader)) {
            this.setObjectValidationError(shader);
            return;
        }
        shader.sourceLength = source.length;
        shader.glsl_shader = source.trim();
        shader.compiled = false;
        shader.infoLog = "";
    }

    getShaderSource(shader: HydShader) {
        if (!this.isShader(shader)) {
            this.setObjectValidationError(shader);
            return null;
        }
        return shader.glsl_shader;
    }

    private validateUniformLocation(uniform: ProgramUniformBuffer | ProgramUniformSampler | null): boolean {
        if (uniform === null) {
            return false;
        }
        if (uniform.useToken === this.currentUniformUseToken) {
            return true;
        }
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
        return false;
    }

    private activateUniformLocations(program: HydProgram | null) {
        this.currentUniformUseToken = HydWebGLStatic.nextUniformUseToken++;
        if (!program) return;
        for (const uniform of program.hydUniforms) uniform.useToken = this.currentUniformUseToken;
        for (const sampler of program.hydSamplers) sampler.useToken = this.currentUniformUseToken;
    }

    uniform1f(pub: ProgramUniformBuffer, x0: number) {
        if (!this.validateUniformLocation(pub)) return;
        pub.float32View[pub.wordOffset] = x0;
    }
    uniform2f(pub: ProgramUniformBuffer, x0: number, x1: number) {
        if (!this.validateUniformLocation(pub)) return;
        const a = pub.float32View;
        const offset = pub.wordOffset;
        a[offset] = x0;
        a[offset + 1] = x1;
    }
    uniform3f(pub: ProgramUniformBuffer, x0: number, x1: number, x2: number) {
        if (!this.validateUniformLocation(pub)) return;
        const a = pub.float32View;
        const offset = pub.wordOffset;
        a[offset] = x0;
        a[offset + 1] = x1;
        a[offset + 2] = x2;
    }
    uniform4f(pub: ProgramUniformBuffer, x0: number, x1: number, x2: number, x3: number) {
        if (!this.validateUniformLocation(pub)) return;
        const a = pub.float32View;
        const offset = pub.wordOffset;
        a[offset] = x0;
        a[offset + 1] = x1;
        a[offset + 2] = x2;
        a[offset + 3] = x3;
    }
    uniform1i(uniform: ProgramUniformBuffer | ProgramUniformSampler, x0: number) {
        if (!this.validateUniformLocation(uniform)) return;
        if (uniform instanceof ProgramUniformSampler) {
            if (uniform.textureUnit !== x0) {
                uniform.textureUnit = x0;
                this.samplerOriginStateVersion++;
                this.hydGlobalState.recordTransition("uniformSampler", uniform.name, x0);
            }
            return;
        }
        const offset = uniform.wordOffset;
        uniform.int32View[offset] = x0;
    }
    uniform2i(pub: ProgramUniformBuffer, x0: number, x1: number) {
        if (!this.validateUniformLocation(pub)) return;
        const a = pub.int32View;
        const offset = pub.wordOffset;
        a[offset] = x0;
        a[offset + 1] = x1;
    }
    uniform3i(pub: ProgramUniformBuffer, x0: number, x1: number, x2: number) {
        if (!this.validateUniformLocation(pub)) return;
        const a = pub.int32View;
        const offset = pub.wordOffset;
        a[offset] = x0;
        a[offset + 1] = x1;
        a[offset + 2] = x2;
    }
    uniform4i(pub: ProgramUniformBuffer, x0: number, x1: number, x2: number, x3: number) {
        if (!this.validateUniformLocation(pub)) return;
        const a = pub.int32View;
        const offset = pub.wordOffset;
        a[offset] = x0;
        a[offset + 1] = x1;
        a[offset + 2] = x2;
        a[offset + 3] = x3;
    }
    uniform1ui(pub: ProgramUniformBuffer, x0: number) {
        if (!this.validateUniformLocation(pub)) return;
        pub.uint32View[pub.wordOffset] = x0 >>> 0;
    }
    uniform2ui(pub: ProgramUniformBuffer, x0: number, x1: number) {
        if (!this.validateUniformLocation(pub)) return;
        const a = pub.uint32View;
        const offset = pub.wordOffset;
        a[offset] = x0 >>> 0;
        a[offset + 1] = x1 >>> 0;
    }
    uniform3ui(pub: ProgramUniformBuffer, x0: number, x1: number, x2: number) {
        if (!this.validateUniformLocation(pub)) return;
        const a = pub.uint32View;
        const offset = pub.wordOffset;
        a[offset] = x0 >>> 0;
        a[offset + 1] = x1 >>> 0;
        a[offset + 2] = x2 >>> 0;
    }
    uniform4ui(pub: ProgramUniformBuffer, x0: number, x1: number, x2: number, x3: number) {
        if (!this.validateUniformLocation(pub)) return;
        const a = pub.uint32View;
        const offset = pub.wordOffset;
        a[offset] = x0 >>> 0;
        a[offset + 1] = x1 >>> 0;
        a[offset + 2] = x2 >>> 0;
        a[offset + 3] = x3 >>> 0;
    }

    uniform1fv(pub: ProgramUniformBuffer, v: Float32Array) {
        if (!this.validateUniformLocation(pub)) return;
        pub.float32View.set(v, pub.wordOffset);
    }
    uniform2fv(pub: ProgramUniformBuffer, v: Float32Array) {
        if (!this.validateUniformLocation(pub)) return;
        pub.float32View.set(v, pub.wordOffset);
    }
    uniform3fv(pub: ProgramUniformBuffer, v: Float32Array) {
        if (!this.validateUniformLocation(pub)) return;
        pub.float32View.set(v, pub.wordOffset);
    }
    uniform4fv(pub: ProgramUniformBuffer, v: Float32Array) {
        if (!this.validateUniformLocation(pub)) return;
        pub.float32View.set(v, pub.wordOffset);
    }

    uniform1iv(pub: ProgramUniformBuffer, v: Int32Array) {
        if (!this.validateUniformLocation(pub)) return;
        pub.int32View.set(v, pub.wordOffset);
    }
    uniform2iv(pub: ProgramUniformBuffer, v: Int32Array) {
        if (!this.validateUniformLocation(pub)) return;
        pub.int32View.set(v, pub.wordOffset);
    }
    uniform3iv(pub: ProgramUniformBuffer, v: Int32Array) {
        if (!this.validateUniformLocation(pub)) return;
        pub.int32View.set(v, pub.wordOffset);
    }
    uniform4iv(pub: ProgramUniformBuffer, v: Int32Array) {
        if (!this.validateUniformLocation(pub)) return;
        pub.int32View.set(v, pub.wordOffset);
    }
    uniform1uiv(pub: ProgramUniformBuffer, v: Uint32Array) {
        if (!this.validateUniformLocation(pub)) return;
        pub.uint32View.set(v, pub.wordOffset);
    }
    uniform2uiv(pub: ProgramUniformBuffer, v: Uint32Array) {
        if (!this.validateUniformLocation(pub)) return;
        pub.uint32View.set(v, pub.wordOffset);
    }
    uniform3uiv(pub: ProgramUniformBuffer, v: Uint32Array) {
        if (!this.validateUniformLocation(pub)) return;
        pub.uint32View.set(v, pub.wordOffset);
    }
    uniform4uiv(pub: ProgramUniformBuffer, v: Uint32Array) {
        if (!this.validateUniformLocation(pub)) return;
        pub.uint32View.set(v, pub.wordOffset);
    }

    uniformMatrix2fv(pub: ProgramUniformBuffer, transpose: boolean, v: Float32Array) {
        if (!this.validateUniformLocation(pub)) return;
        if (transpose) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        pub.float32View.set(v, pub.wordOffset);
    }
    uniformMatrix3fv(pub: ProgramUniformBuffer, transpose: boolean, v: Float32Array) {
        if (!this.validateUniformLocation(pub)) return;
        if (transpose) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const target = pub.float32View;
        const offset = pub.wordOffset;
        target[offset] = v[0]; target[offset + 1] = v[1]; target[offset + 2] = v[2];
        target[offset + 4] = v[3]; target[offset + 5] = v[4]; target[offset + 6] = v[5];
        target[offset + 8] = v[6]; target[offset + 9] = v[7]; target[offset + 10] = v[8];
    }
    uniformMatrix4fv(pub: ProgramUniformBuffer, transpose: boolean, v: Float32Array) {
        if (!this.validateUniformLocation(pub)) return;
        if (transpose) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        pub.float32View.set(v, pub.wordOffset);
    }

    createProgram() {
        return new HydProgram(this.hydDevice, this.shaderTranslator, this.contextToken);
    }

    createShader(type: GLenum) {
        if (type !== WebGL2RenderingContext.VERTEX_SHADER && type !== WebGL2RenderingContext.FRAGMENT_SHADER) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        return new HydShader(this.hydDevice, type, this.shaderTranslator, this.contextToken);
    }

    createBuffer() {
        return new HydBuffer(this.hydDevice, this.contextToken);
    }

    createTexture() {
        return new HydTexture(this.hydDevice, this.contextToken);
    }

    createFramebuffer(): HydFramebuffer {
        return new HydFramebuffer(this.contextToken);
    }

    createRenderbuffer(): HydTexture {
        return new HydTexture(this.hydDevice, this.contextToken);
    }

    createVertexArray() {
        return new HydVertexArray(this.contextToken);
    }

    private currentTexture(target: GLenum): HydTexture {
        const viewDimension = enumToViewDimension.get(target);
        const texture = viewDimension
            ? this.hydGlobalState.getTextureUnitBinding(this.hydGlobalState.commonState.activeTextureUnit, viewDimension)
            : null;
        if (!texture) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            throw new Error("No texture bound to active texture unit");
        }
        return texture;
    }

    private isSupportedTextureUploadFormat(internalformat: GLenum, format: GLenum, type: GLenum): boolean {
        return ((internalformat === WebGL2RenderingContext.RGBA || internalformat === WebGL2RenderingContext.RGBA8) && format === WebGL2RenderingContext.RGBA && (type === WebGL2RenderingContext.UNSIGNED_BYTE || type === WebGL2RenderingContext.FLOAT))
            || (internalformat === WebGL2RenderingContext.RGBA8UI && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (internalformat === WebGL2RenderingContext.RGBA16UI && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.UNSIGNED_SHORT)
            || (internalformat === WebGL2RenderingContext.RGBA32UI && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT)
            || (internalformat === WebGL2RenderingContext.RGBA32I && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.INT)
            || (internalformat === WebGL2RenderingContext.RGBA32F && format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.FLOAT)
            || (internalformat === WebGL2RenderingContext.RG32UI && format === WebGL2RenderingContext.RG_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT)
            || (internalformat === WebGL2RenderingContext.R32UI && format === WebGL2RenderingContext.RED_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT)
            || (internalformat === WebGL2RenderingContext.RG32F && format === WebGL2RenderingContext.RG && type === WebGL2RenderingContext.FLOAT)
            || (internalformat === WebGL2RenderingContext.R32F && format === WebGL2RenderingContext.RED && type === WebGL2RenderingContext.FLOAT)
            || (internalformat === WebGL2RenderingContext.DEPTH_COMPONENT32F && format === WebGL2RenderingContext.DEPTH_COMPONENT && type === WebGL2RenderingContext.FLOAT)
            || ((internalformat === WebGL2RenderingContext.DEPTH_COMPONENT ||
                internalformat === WebGL2RenderingContext.DEPTH_COMPONENT16 ||
                internalformat === WebGL2RenderingContext.DEPTH_COMPONENT24) &&
                format === WebGL2RenderingContext.DEPTH_COMPONENT &&
                (type === WebGL2RenderingContext.UNSIGNED_INT || type === WebGL2RenderingContext.UNSIGNED_SHORT))
            || (internalformat === WebGL2RenderingContext.LUMINANCE && format === WebGL2RenderingContext.LUMINANCE && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (internalformat === WebGL2RenderingContext.ALPHA && format === WebGL2RenderingContext.ALPHA && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (internalformat === WebGL2RenderingContext.LUMINANCE_ALPHA && format === WebGL2RenderingContext.LUMINANCE_ALPHA && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (internalformat === WebGL2RenderingContext.RGB && format === WebGL2RenderingContext.RGB && type === WebGL2RenderingContext.UNSIGNED_BYTE);
    }

    private isSupportedTextureSubUploadFormat(format: GLenum, type: GLenum): boolean {
        return this.isSupportedTextureUploadFormat(format, format, type)
            || (format === WebGL2RenderingContext.RGBA_INTEGER &&
                (type === WebGL2RenderingContext.UNSIGNED_BYTE ||
                    type === WebGL2RenderingContext.UNSIGNED_SHORT ||
                    type === WebGL2RenderingContext.UNSIGNED_INT ||
                    type === WebGL2RenderingContext.INT))
            || (format === WebGL2RenderingContext.RG_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT)
            || (format === WebGL2RenderingContext.RED_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT)
            || (format === WebGL2RenderingContext.RGBA && (type === WebGL2RenderingContext.UNSIGNED_BYTE || type === WebGL2RenderingContext.FLOAT))
            || (format === WebGL2RenderingContext.RG && type === WebGL2RenderingContext.FLOAT)
            || (format === WebGL2RenderingContext.RED && type === WebGL2RenderingContext.FLOAT)
            || (format === WebGL2RenderingContext.RGB && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (format === WebGL2RenderingContext.LUMINANCE && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (format === WebGL2RenderingContext.ALPHA && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (format === WebGL2RenderingContext.LUMINANCE_ALPHA && type === WebGL2RenderingContext.UNSIGNED_BYTE);
    }

    private textureStorageUploadFormat(internalformat: GLenum): { format: GLenum, type: GLenum } {
        switch (internalformat) {
            case WebGL2RenderingContext.RGBA:
            case WebGL2RenderingContext.RGBA8:
                return { format: WebGL2RenderingContext.RGBA, type: WebGL2RenderingContext.UNSIGNED_BYTE };
            case WebGL2RenderingContext.RGBA8UI:
                return { format: WebGL2RenderingContext.RGBA_INTEGER, type: WebGL2RenderingContext.UNSIGNED_BYTE };
            case WebGL2RenderingContext.RGBA16UI:
                return { format: WebGL2RenderingContext.RGBA_INTEGER, type: WebGL2RenderingContext.UNSIGNED_SHORT };
            case WebGL2RenderingContext.RGBA32UI:
                return { format: WebGL2RenderingContext.RGBA_INTEGER, type: WebGL2RenderingContext.UNSIGNED_INT };
            case WebGL2RenderingContext.RGBA32I:
                return { format: WebGL2RenderingContext.RGBA_INTEGER, type: WebGL2RenderingContext.INT };
            case WebGL2RenderingContext.RGBA32F:
                return { format: WebGL2RenderingContext.RGBA, type: WebGL2RenderingContext.FLOAT };
            case WebGL2RenderingContext.RG32UI:
                return { format: WebGL2RenderingContext.RG_INTEGER, type: WebGL2RenderingContext.UNSIGNED_INT };
            case WebGL2RenderingContext.R32UI:
                return { format: WebGL2RenderingContext.RED_INTEGER, type: WebGL2RenderingContext.UNSIGNED_INT };
            case WebGL2RenderingContext.RG32F:
                return { format: WebGL2RenderingContext.RG, type: WebGL2RenderingContext.FLOAT };
            case WebGL2RenderingContext.R32F:
                return { format: WebGL2RenderingContext.RED, type: WebGL2RenderingContext.FLOAT };
            case WebGL2RenderingContext.DEPTH_COMPONENT16:
            case WebGL2RenderingContext.DEPTH_COMPONENT24:
            case WebGL2RenderingContext.DEPTH_COMPONENT:
                return { format: WebGL2RenderingContext.DEPTH_COMPONENT, type: WebGL2RenderingContext.UNSIGNED_INT };
            case WebGL2RenderingContext.DEPTH_COMPONENT32F:
                return { format: WebGL2RenderingContext.DEPTH_COMPONENT, type: WebGL2RenderingContext.FLOAT };
            default:
                throw new Error("unsupported texStorage internalformat: " + internalformat);
        }
    }

    private pixelUnpackBufferSlice(byteOffset: number, width: number, height: number, depth: number, format: GLenum, type: GLenum): Uint8Array {
        const buffer = this.hydGlobalState.commonState.pixelUnpackBufferBinding;
        if (!buffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            throw new Error("texture upload offset requires PIXEL_UNPACK_BUFFER binding");
        }
        const bytesPerRow = width * textureUploadBytesPerPixel(format, type);
        const byteLength = bytesPerRow * height * depth;
        const end = byteOffset + byteLength;
        if (end > buffer.shadowData.byteLength) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            throw new Error(`PIXEL_UNPACK_BUFFER upload exceeds buffer size: ${byteOffset}+${byteLength}/${buffer.shadowData.byteLength}`);
        }
        return buffer.shadowData.subarray(byteOffset, end);
    }

    private alignReadbackBytesPerRow(bytesPerRow: number): number {
        return Math.ceil(bytesPerRow / 256) * 256;
    }

    private getReadColorAttachment(): FramebufferAttributes | null {
        const framebuffer = this.hydGlobalState.commonState.readFramebufferBinding;
        let attachmentPoint = framebuffer.readBuffer;
        if (attachmentPoint === WebGL2RenderingContext.BACK) {
            attachmentPoint = WebGL2RenderingContext.COLOR_ATTACHMENT0;
        }
        return framebuffer.attachments.get(attachmentPoint) || framebuffer.attachments.get(WebGL2RenderingContext.COLOR_ATTACHMENT0) || null;
    }

    private getFramebufferForTarget(target: GLenum): HydFramebuffer {
        if (target === WebGL2RenderingContext.FRAMEBUFFER || target === WebGL2RenderingContext.DRAW_FRAMEBUFFER) {
            return this.hydGlobalState.commonState.drawFramebufferBinding;
        }
        if (target === WebGL2RenderingContext.READ_FRAMEBUFFER) {
            return this.hydGlobalState.commonState.readFramebufferBinding;
        }
        throw new Error("unsupported framebuffer target: " + target);
    }

    private getDrawFramebufferHeight(): number {
        const framebuffer = this.hydGlobalState.commonState.drawFramebufferBinding;
        if (framebuffer === this.hydGlobalState.defaultFramebuffer || framebuffer.drawBuffers.includes(WebGL2RenderingContext.BACK)) {
            return this.hydCanvas.height;
        }
        for (const attachment of framebuffer.attachments.values()) {
            if (attachment.height > 0) {
                return attachment.height;
            }
        }
        return this.hydCanvas.height;
    }

    private toGpuViewport(): [number, number, number, number, number, number] {
        const [x, y, width, height, minDepth, maxDepth] = this.hydGlobalState.commonState.viewport;
        const framebufferHeight = this.getDrawFramebufferHeight();
        return [x, framebufferHeight - y - height, width, height, minDepth, maxDepth];
    }

    private toGpuScissorRect(): [number, number, number, number] {
        const [x, y, width, height] = this.hydGlobalState.miscState.scissorBox;
        const framebufferHeight = this.getDrawFramebufferHeight();
        return [x, framebufferHeight - y - height, width, height];
    }

    private setGpuViewport() {
        const viewport = this.hydGlobalState.commonState.viewport;
        const framebufferHeight = this.getDrawFramebufferHeight();
        this.hydRpCache.RpSetViewportValues(
            viewport[0],
            framebufferHeight - viewport[1] - viewport[3],
            viewport[2],
            viewport[3],
            viewport[4],
            viewport[5],
        );
    }

    private setGpuScissorRect() {
        const scissorBox = this.hydGlobalState.miscState.scissorBox;
        const framebufferHeight = this.getDrawFramebufferHeight();
        this.hydRpCache.RpSetScissorRectValues(
            scissorBox[0],
            framebufferHeight - scissorBox[1] - scissorBox[3],
            scissorBox[2],
            scissorBox[3],
        );
    }

    private blendUsesConstantFactor(): boolean {
        const blend = this.hydGlobalState.blendState;
        return blend.srcRGB === "constant" ||
            blend.dstRGB === "constant" ||
            blend.srcAlpha === "constant" ||
            blend.dstAlpha === "constant" ||
            blend.srcRGB === "one-minus-constant" ||
            blend.dstRGB === "one-minus-constant" ||
            blend.srcAlpha === "one-minus-constant" ||
            blend.dstAlpha === "one-minus-constant";
    }

    private samplerNeedsOriginFlip(texture: HydTexture | null): boolean {
        return !!texture && (texture.sourceOrigin === "render-target" || texture.sourceOrigin === "copy");
    }

    private getColorWriteMask(): GPUColorWriteFlags {
        const [r, g, b, a] = this.hydGlobalState.miscState.colorWriteMask;
        return (r ? GPUColorWrite.RED : 0) |
            (g ? GPUColorWrite.GREEN : 0) |
            (b ? GPUColorWrite.BLUE : 0) |
            (a ? GPUColorWrite.ALPHA : 0);
    }

    private getMaskedClearTargets(): Array<{ view: GPUTextureView, format: GPUTextureFormat }> {
        return this.hydGlobalState.commonState.drawFramebufferBinding.drawBuffers.flatMap((value) => {
            if (value === WebGL2RenderingContext.BACK) {
                return this.hydGlobalState.__canvasView ? [{ view: this.hydGlobalState.__canvasView, format: "bgra8unorm" as GPUTextureFormat }] : [];
            }
            if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                const attachment = this.hydGlobalState.commonState.drawFramebufferBinding.attachments.get(value);
                return attachment ? [{ view: attachment.view, format: attachment.format }] : [];
            }
            return [];
        });
    }

    private getMaskedClearPipeline(targets: Array<{ view: GPUTextureView, format: GPUTextureFormat }>, writeMask: GPUColorWriteFlags): GPURenderPipeline {
        const key = `${targets.map((target) => target.format).join(",")}|${writeMask}`;
        let pipeline = this.maskedClearPipelines.get(key);
        if (!pipeline) {
            const outputs = targets.map((_, index) => `    @location(${index}) color${index}: vec4<f32>,`).join("\n");
            const assignments = targets.map((_, index) => `    out.color${index} = _hyd_clear_.color;`).join("\n");
            const module = this.hydDevice.createShaderModule({
                label: `masked-clear-shader-${key}`,
                code: `
struct ClearUniforms {
    color: vec4<f32>,
};
struct FragmentOutput {
${outputs}
};
@group(0) @binding(0) var<uniform> _hyd_clear_: ClearUniforms;
@vertex
fn vs(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4<f32> {
    let positions = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(3.0, -1.0),
        vec2<f32>(-1.0, 3.0)
    );
    return vec4<f32>(positions[vertex_index], 0.0, 1.0);
}
@fragment
fn fs() -> FragmentOutput {
    var out: FragmentOutput;
${assignments}
    return out;
}
`,
            });
            pipeline = this.hydDevice.createRenderPipeline({
                label: `masked-clear-pipeline-${key}`,
                layout: "auto",
                vertex: { module, entryPoint: "vs" },
                fragment: {
                    module,
                    entryPoint: "fs",
                    targets: targets.map((target) => ({ format: target.format, writeMask })),
                },
                primitive: { topology: "triangle-list" },
            });
            this.maskedClearPipelines.set(key, pipeline);
        }
        return pipeline;
    }

    private clearColorWithMask() {
        const writeMask = this.getColorWriteMask();
        if (writeMask === 0) {
            return;
        }
        const targets = this.getMaskedClearTargets();
        if (targets.length === 0) {
            return;
        }
        if (!this.maskedClearUniformBuffer) {
            this.maskedClearUniformBuffer = this.hydDevice.createBuffer({
                label: "masked-clear-uniforms",
                size: 16,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
            });
        }
        this.hydDevice.queue.writeBuffer(
            this.maskedClearUniformBuffer,
            0,
            new Float32Array(this.hydGlobalState.clearState.color),
        );
        const pipeline = this.getMaskedClearPipeline(targets, writeMask);
        const bindGroup = this.hydDevice.createBindGroup({
            label: "masked-clear-bind-group",
            layout: pipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: this.maskedClearUniformBuffer } }],
        });
        const commandEncoder = this.hydDevice.createCommandEncoder({ label: "masked-clear-commandEncoder" });
        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: targets.map((target) => ({
                view: target.view,
                loadOp: "load",
                storeOp: "store",
            })),
        });
        if (this.hydGlobalState.miscState.scissorTest) {
            renderPass.setScissorRect(...this.toGpuScissorRect());
        }
        renderPass.setPipeline(pipeline);
        renderPass.setBindGroup(0, bindGroup);
        renderPass.draw(3);
        renderPass.end();
        this.hydDevice.queue.submit([commandEncoder.finish()]);
    }

    bindRenderbuffer(target: GLenum, renderbuffer: HydTexture | null) {
        if (renderbuffer !== null && (!(renderbuffer instanceof HydTexture) || renderbuffer.ownerToken !== this.contextToken || renderbuffer.deleted)) {
            this.setObjectValidationError(renderbuffer);
            return;
        }
        if (target === WebGL2RenderingContext.RENDERBUFFER) {
            if (renderbuffer) renderbuffer.initialized = true;
            this.hydGlobalState.commonState.renderbufferBinding = renderbuffer;
        } else {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        this.hydGlobalState.recordTransition("bindRenderbuffer", target, renderbuffer ? renderbuffer.hash : "null");
    }

    renderbufferStorage(target: GLenum, internalFormat: GLenum, width: GLsizei, height: GLsizei) {
        if (target === WebGL2RenderingContext.RENDERBUFFER) {
            const renderbuffer = this.hydGlobalState.commonState.renderbufferBinding;
            if (!renderbuffer) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                throw new Error("renderbufferStorage called with no renderbuffer bound");
            }
            renderbuffer.renderbufferInternalFormat = internalFormat;
            renderbuffer.renderbufferSamples = 0;
            switch (internalFormat) {
                case WebGL2RenderingContext.DEPTH_COMPONENT16:
                    renderbuffer.renderbufferStorage('depth16unorm', width, height);
                    break;
                case WebGL2RenderingContext.DEPTH_COMPONENT24:
                    renderbuffer.renderbufferStorage('depth24plus', width, height);
                    break;
                case WebGL2RenderingContext.DEPTH24_STENCIL8:
                case WebGL2RenderingContext.DEPTH_STENCIL:
                    renderbuffer.renderbufferStorage('depth24plus-stencil8', width, height);
                    break;
                case WebGL2RenderingContext.DEPTH_COMPONENT32F:
                    renderbuffer.renderbufferStorage('depth32float', width, height);
                    break;
                case WebGL2RenderingContext.STENCIL_INDEX8:
                    renderbuffer.renderbufferStorage('stencil8', width, height);
                    break;
                case WebGL2RenderingContext.RGBA32F:
                    renderbuffer.renderbufferStorage('rgba32float', width, height);
                    break;
                case WebGL2RenderingContext.RGBA4:
                case WebGL2RenderingContext.RGB565:
                case WebGL2RenderingContext.RGB5_A1:
                    renderbuffer.renderbufferStorage('rgba8unorm', width, height);
                    break;
                default:
                    throw new Error("unsupported internalFormat: " + internalFormat);
            }
        } else {
            console.warn("unknown target: " + target);
        }
        this.hydGlobalState.recordTransition("renderbufferStorage", target, internalFormat, width, height);
    }

    enableVertexAttribArray(index: number) {
        const attribute = this.hydGlobalState.commonState.vertexArrayBinding.attributes[index];
        if (!attribute.enabled) {
            attribute.enabled = true;
            attribute.updateHash();
            // this.globalState.commonState.vertexArrayBinding.updateMeta();
            this.hydGlobalState.recordTransition("enableVertexAttribArray", index);
        }
    }

    disableVertexAttribArray(index: number) {
        const attribute = this.hydGlobalState.commonState.vertexArrayBinding.attributes[index];
        if (attribute.enabled) {
            attribute.enabled = false;
            attribute.updateHash();
            // this.globalState.commonState.vertexArrayBinding.updateMeta();
            this.hydGlobalState.recordTransition("disableVertexAttribArray", index);
        }
    }

    private setCurrentVertexAttrib(index: number, x: number, y: number, z: number, w: number) {
        const values = this.hydGlobalState.currentVertexAttribValues[index];
        values[0] = x;
        values[1] = y;
        values[2] = z;
        values[3] = w;
        this.hydGlobalState.recordTransition("vertexAttrib", index, x, y, z, w);
    }

    vertexAttrib1f(index: number, x: number) {
        this.setCurrentVertexAttrib(index, x, 0, 0, 1);
    }

    vertexAttrib2f(index: number, x: number, y: number) {
        this.setCurrentVertexAttrib(index, x, y, 0, 1);
    }

    vertexAttrib3f(index: number, x: number, y: number, z: number) {
        this.setCurrentVertexAttrib(index, x, y, z, 1);
    }

    vertexAttrib4f(index: number, x: number, y: number, z: number, w: number) {
        this.setCurrentVertexAttrib(index, x, y, z, w);
    }

    vertexAttrib1fv(index: number, values: ArrayLike<number>) {
        this.vertexAttrib1f(index, values[0]);
    }

    vertexAttrib2fv(index: number, values: ArrayLike<number>) {
        this.vertexAttrib2f(index, values[0], values[1]);
    }

    vertexAttrib3fv(index: number, values: ArrayLike<number>) {
        this.vertexAttrib3f(index, values[0], values[1], values[2]);
    }

    vertexAttrib4fv(index: number, values: ArrayLike<number>) {
        this.vertexAttrib4f(index, values[0], values[1], values[2], values[3]);
    }

    clearColor(r: number, g: number, b: number, a: number) {
        const [r1, g1, b1, a1] = this.hydGlobalState.clearState.color;
        if (r !== r1 || g !== g1 || b !== b1 || a !== a1) {
            this.hydGlobalState.clearState.color = [r, g, b, a];
            this.hydGlobalState.recordTransition("clearColor", r, g, b, a);
        }
    }

    clearDepth(depth: number) {
        if (this.hydGlobalState.clearState.depth !== depth) {
            this.hydGlobalState.clearState.depth = depth;
            this.hydGlobalState.recordTransition("clearDepth", depth);
        }
    }

    clearStencil(stencil: number) {
        if (this.hydGlobalState.clearState.stencil !== stencil) {
            this.hydGlobalState.clearState.stencil = stencil;
            this.hydGlobalState.recordTransition("clearStencil", stencil);
        }
    }

    clear(mask: GLbitfield) {
        ensureAutoFrame();
        let effectiveMask = mask;
        let needsMaskedColorClear = false;
        if (mask & WebGL2RenderingContext.COLOR_BUFFER_BIT) {
            const writeMask = this.getColorWriteMask();
            const fullWriteMask = GPUColorWrite.RED | GPUColorWrite.GREEN | GPUColorWrite.BLUE | GPUColorWrite.ALPHA;
            if (writeMask === 0) {
                effectiveMask &= ~WebGL2RenderingContext.COLOR_BUFFER_BIT;
            } else if (writeMask !== fullWriteMask || this.hydGlobalState.miscState.scissorTest) {
                effectiveMask &= ~WebGL2RenderingContext.COLOR_BUFFER_BIT;
                needsMaskedColorClear = true;
            }
        }
        if ((mask & WebGL2RenderingContext.DEPTH_BUFFER_BIT) && !this.hydGlobalState.depthState.writeMask) {
            effectiveMask &= ~WebGL2RenderingContext.DEPTH_BUFFER_BIT;
        }
        const canUseLoadOpClear = effectiveMask !== 0 &&
            !needsMaskedColorClear &&
            !this.hydGlobalState.miscState.scissorTest &&
            !this.hydRpCache.hasActiveRenderPass();
        if (canUseLoadOpClear) {
            if (this.hydGlobalState.clearState.target !== effectiveMask) {
                this.hydGlobalState.clearState.target = effectiveMask;
                this.hydGlobalState.recordTransition("clear", effectiveMask);
            }
            return;
        }

        this.updateCanvasSize();
        this._der_flush();
        if (needsMaskedColorClear) {
            this.clearColorWithMask();
        }
        if (effectiveMask === 0) {
            return;
        }
        if (this.hydGlobalState.miscState.scissorTest) {
            this.hydGlobalState.recordTransition("clear", 0);
            return;
        }
        const previousTarget = this.hydGlobalState.clearState.target;
        this.hydGlobalState.clearState.target = effectiveMask;
        this.hydRpCache.RpClear(this.bindedGetRenderPassDesc);
        this.hydGlobalState.clearState.target = previousTarget;
        this.hydGlobalState.recordTransition("clear", effectiveMask);
    }

    depthFunc(func: GLenum) {
        const tmp = enumToCompareFunction.get(func);
        if (this.hydGlobalState.depthState.func !== tmp) {
            this.hydGlobalState.depthState.func = tmp;
            this.hydGlobalState.recordTransition("depthFunc", func);
        }
    }

    depthMask(flag: GLboolean) {
        if (this.hydGlobalState.depthState.writeMask !== flag) {
            this.hydGlobalState.depthState.writeMask = flag;
            this.hydGlobalState.recordTransition("depthMask", flag);
        }
    }

    colorMask(r: GLboolean, g: GLboolean, b: GLboolean, a: GLboolean) {
        const [r1, g1, b1, a1] = this.hydGlobalState.miscState.colorWriteMask;
        if (r !== r1 || g !== g1 || b !== b1 || a !== a1) {
            this.hydGlobalState.miscState.colorWriteMask = [r, g, b, a];
            this.hydGlobalState.recordTransition("colorMask", r, g, b, a);
        }
    }

    frontFace(mode: GLenum) {
        let tmp = enumToFrontFace.get(mode);
        if (this.hydGlobalState.polygonState.frontFace !== tmp) {
            this.hydGlobalState.polygonState.frontFace = tmp;
            this.hydGlobalState.recordTransition("frontFace", mode);
        }
    }

    cullFace(mode: GLenum) {
        let tmp = enumToCullFace.get(mode);
        if (this.hydGlobalState.polygonState.cullFaceMode !== tmp) {
            this.hydGlobalState.polygonState.cullFaceMode = tmp;
            this.hydGlobalState.recordTransition("cullFace", mode);
        }
    }

    bindBuffer(target: GLenum, buffer: HydBuffer | object | null) {
        if (buffer instanceof HydBuffer && (buffer.ownerToken !== this.contextToken || buffer.deleted)) {
            this.setObjectValidationError(buffer);
            return;
        }
        const hydBuffer = this.normalizeBuffer(buffer);
        if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER) {
            if (hydBuffer) hydBuffer.initialized = true;
            if (this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding !== hydBuffer) {
                this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding = hydBuffer;
                this.hydGlobalState.recordTransition("bindBuffer", target, hydBuffer ? hydBuffer.hash : "null");
            }
        } else if (target === WebGL2RenderingContext.ARRAY_BUFFER) {
            if (hydBuffer) hydBuffer.initialized = true;
            if (this.hydGlobalState.commonState.arrayBufferBinding !== hydBuffer) {
                this.hydGlobalState.commonState.arrayBufferBinding = hydBuffer;
            }
        } else if (target === WebGL2RenderingContext.PIXEL_PACK_BUFFER) {
            if (hydBuffer) hydBuffer.initialized = true;
            if (this.hydGlobalState.commonState.pixelPackBufferBinding !== hydBuffer) {
                this.hydGlobalState.commonState.pixelPackBufferBinding = hydBuffer;
            }
        } else if (target === WebGL2RenderingContext.PIXEL_UNPACK_BUFFER) {
            if (hydBuffer) hydBuffer.initialized = true;
            if (this.hydGlobalState.commonState.pixelUnpackBufferBinding !== hydBuffer) {
                this.hydGlobalState.commonState.pixelUnpackBufferBinding = hydBuffer;
            }
        } else {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
        }
    }

    private getBoundBufferForTarget(target: GLenum): HydBuffer {
        if (target === WebGL2RenderingContext.ARRAY_BUFFER) {
            return this.hydGlobalState.commonState.arrayBufferBinding;
        }
        if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER) {
            return this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
        }
        if (target === WebGL2RenderingContext.PIXEL_PACK_BUFFER) {
            return this.hydGlobalState.commonState.pixelPackBufferBinding;
        }
        if (target === WebGL2RenderingContext.PIXEL_UNPACK_BUFFER) {
            return this.hydGlobalState.commonState.pixelUnpackBufferBinding;
        }
        throw new Error("unsupported buffer target: " + target);
    }

    bufferData(target: GLenum, data: GLsizeiptr | ArrayBuffer | TypedArray, usage: GLenum) {
        this._der_flush();
        // const [target, data, usage] = args;
        const buffer = this.getBoundBufferForTarget(target);
        if (!buffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            throw new Error("bufferData called with no buffer bound for target: " + target);
        }
        if (target === WebGL2RenderingContext.ARRAY_BUFFER) {
            buffer.descriptor.usage |= GPUBufferUsage.VERTEX;
        } else if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER) {
            buffer.descriptor.usage |= GPUBufferUsage.INDEX;
        } else if (target === WebGL2RenderingContext.PIXEL_PACK_BUFFER || target === WebGL2RenderingContext.PIXEL_UNPACK_BUFFER) {
            buffer.descriptor.usage |= GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
        }

        if (typeof data === 'number') {
            buffer.webglSize = data;
            buffer.descriptor.size = (data + 3) & (~3);
            buffer.write();
        } else {
            buffer.webglSize = data.byteLength;
            buffer.descriptor.size = (data.byteLength + 3) & (~3);
            buffer.write(data, 0);
        }
        buffer.webglUsage = usage;

        if (usage !== WebGL2RenderingContext.STATIC_DRAW &&
            usage !== WebGL2RenderingContext.DYNAMIC_DRAW &&
            usage !== WebGL2RenderingContext.STREAM_DRAW &&
            usage !== WebGL2RenderingContext.STATIC_READ &&
            usage !== WebGL2RenderingContext.DYNAMIC_READ &&
            usage !== WebGL2RenderingContext.STREAM_READ &&
            usage !== WebGL2RenderingContext.STATIC_COPY &&
            usage !== WebGL2RenderingContext.DYNAMIC_COPY &&
            usage !== WebGL2RenderingContext.STREAM_COPY) {
            throw new Error("unsupported buffer usage: " + usage);
        }
    }

    bufferSubData(target: GLenum, dstOffset: GLintptr, data: ArrayBuffer | TypedArray) {
        const buffer = this.getBoundBufferForTarget(target);
        if (!buffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            throw new Error("bufferSubData called with no buffer bound for target: " + target);
        }
        buffer.write(data, dstOffset);
    }

    getBufferSubData(target: GLenum, srcByteOffset: GLintptr, dstData: ArrayBufferView, dstOffset: GLuint = 0, length?: GLuint) {
        const buffer = this.getBoundBufferForTarget(target);
        if (!buffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            throw new Error("getBufferSubData called with no buffer bound for target: " + target);
        }
        const dst = new Uint8Array(dstData.buffer, dstData.byteOffset, dstData.byteLength);
        const bytesPerElement = (dstData as any).BYTES_PER_ELEMENT || 1;
        const byteOffset = dstOffset * bytesPerElement;
        const byteLength = length === undefined ? dst.byteLength - byteOffset : length * bytesPerElement;
        dst.set(buffer.shadowData.subarray(srcByteOffset, srcByteOffset + byteLength), byteOffset);
    }

    getActiveUniform(program: HydProgram, index: GLuint): HydActiveUniformInfo {
        if (!this.isProgram(program)) {
            this.setObjectValidationError(program);
            return null;
        }
        const publicUniforms = program.hydUniforms.filter((uniform) => !uniform.internal);
        if (index < publicUniforms.length) {
            return {
                name: publicUniforms[index].sourceName || publicUniforms[index].name,
                size: publicUniforms[index].size,
                type: publicUniforms[index].webgl_type,
            };
        } else if (index - publicUniforms.length < program.hydSamplers.length) {
            return {
                name: program.hydSamplers[index - publicUniforms.length].sourceName || program.hydSamplers[index - publicUniforms.length].name,
                size: program.hydSamplers[index - publicUniforms.length].size,
                type: program.hydSamplers[index - publicUniforms.length].webgl_type,
            };
        }
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
        return null;
    }

    getUniformIndices(program: HydProgram, uniformNames: string[]): GLuint[] {
        if (!this.isProgram(program)) {
            this.setObjectValidationError(program);
            return null;
        }
        const publicUniforms = program.hydUniforms.filter((uniform) => !uniform.internal);
        return uniformNames.map((name) => {
            const safeName = name.replace(/[^A-Za-z0-9_]/g, "_").replace(/_+$/g, "");
            const uniformIndex = publicUniforms.findIndex((uniform) =>
                uniform.name === name || uniform.name === safeName || uniform.sourceName === name);
            if (uniformIndex >= 0) {
                return uniformIndex;
            }
            const samplerIndex = program.hydSamplers.findIndex((sampler) =>
                sampler.name === name || sampler.name === safeName || sampler.sourceName === name);
            if (samplerIndex >= 0) {
                return publicUniforms.length + samplerIndex;
            }
            return 0xffffffff;
        });
    }

    getActiveUniforms(program: HydProgram, uniformIndices: GLuint[], pname: GLenum): any[] {
        const publicUniforms = program.hydUniforms.filter((uniform) => !uniform.internal);
        const entries = [...publicUniforms, ...program.hydSamplers];
        return uniformIndices.map((index) => {
            const entry = entries[index];
            if (!entry) {
                return null;
            }
            switch (pname) {
                case WebGL2RenderingContext.UNIFORM_TYPE:
                    return entry.webgl_type;
                case WebGL2RenderingContext.UNIFORM_SIZE:
                    return entry.size;
                case WebGL2RenderingContext.UNIFORM_BLOCK_INDEX:
                    return -1;
                case WebGL2RenderingContext.UNIFORM_OFFSET:
                    return entry instanceof ProgramUniformBuffer ? entry.offset : -1;
                case WebGL2RenderingContext.UNIFORM_ARRAY_STRIDE:
                case WebGL2RenderingContext.UNIFORM_MATRIX_STRIDE:
                    return 0;
                case WebGL2RenderingContext.UNIFORM_IS_ROW_MAJOR:
                    return false;
                default:
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                    return null;
            }
        });
    }

    getActiveAttrib(program: HydProgram, index: GLuint): HydActiveUniformInfo {
        if (!this.isProgram(program)) {
            this.setObjectValidationError(program);
            return null;
        }
        if (index >= program.hydAttributes.length) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return null;
        }
        return {
            name: program.hydAttributes[index].name,
            size: program.hydAttributes[index].size,
            type: program.hydAttributes[index].type,
        }
    }

    attachShader(program: HydProgram, shader: HydShader) {
        if (!this.isProgram(program) || !this.isShader(shader)) {
            this.setObjectValidationError(program, shader);
            return;
        }
        if (!program.attachShader(shader)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
        }
    }

    compileShader(s: HydShader) {
        if (!this.isShader(s) || (s.deleted && s.attachmentCount === 0)) {
            this.setObjectValidationError(s);
            return;
        }
        s.compiled = false;
        s.infoLog = "";
        if (!GLOB_GL_CTX) {
            s.infoLog = "Native WebGL shader validation context is unavailable.";
            return;
        }
        if (s.validationShader) {
            GLOB_GL_CTX.deleteShader(s.validationShader);
        }
        const shader = GLOB_GL_CTX.createShader(s.type);
        if (!shader) {
            s.infoLog = "Unable to create native validation shader.";
            return;
        }
        GLOB_GL_CTX.shaderSource(shader, s.glsl_shader);
        GLOB_GL_CTX.compileShader(shader);
        s.validationShader = shader;
        s.compiled = Boolean(GLOB_GL_CTX.getShaderParameter(shader, WebGL2RenderingContext.COMPILE_STATUS));
        s.infoLog = GLOB_GL_CTX.getShaderInfoLog(shader) || "";
        const debugShaders = GLOB_GL_CTX.getExtension('WEBGL_debug_shaders');
        s.translated_glsl_shader = debugShaders && s.compiled
            ? debugShaders.getTranslatedShaderSource(shader)
            : "";
        if (!s.compiled) {
            return;
        }
        try {
            s.compileShader();
        } catch (error) {
            s.compiled = false;
            s.infoLog = `GL2GPU shader preprocessing failed: ${error instanceof Error ? error.message : String(error)}`;
        }
    }

    useProgram(program: HydProgram | null) {
        if (program !== null && !this.isProgram(program)) {
            this.setObjectValidationError(program);
            return;
        }
        if (program !== null && !program.linked) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (this.hydGlobalState.commonState.currentProgram !== program) {
            const previousProgram = this.hydGlobalState.commonState.currentProgram;
            // this.flush();
            this.hydGlobalState.commonState.currentProgram = program;
            this.currentProgramValid = Boolean(program?.linked);
            this.activateUniformLocations(program);
            this.hydGlobalState.recordTransition("useProgram", program ? program.hash : "null");
            if (previousProgram?.deleted) {
                this.finalizeProgramDeletion(previousProgram);
            }
        }
    }

    linkProgram(program: HydProgram) {
        if (!this.isProgram(program) || (program.deleted && this.hydGlobalState.commonState.currentProgram !== program)) {
            this.setObjectValidationError(program);
            return;
        }
        program.linkGeneration++;
        program.linked = false;
        this.lastDrawPbv = null;
        if (this.hydGlobalState.commonState.currentProgram === program) {
            this.currentProgramValid = false;
            this.activateUniformLocations(null);
        }
        program.infoLog = "";
        const attachedShaders = program.getAttachedShaders();
        if (attachedShaders.length !== 2 || attachedShaders.some((shader) => !shader.compiled || !shader.validationShader)) {
            program.infoLog = "A successfully compiled vertex shader and fragment shader must both be attached.";
            return;
        }
        if (GLOB_GL_CTX) {
            const validationProgram = GLOB_GL_CTX.createProgram();
            if (!validationProgram) {
                program.infoLog = "Unable to create native validation program.";
                return;
            }
            for (const shader of attachedShaders) {
                GLOB_GL_CTX.attachShader(validationProgram, shader.validationShader);
            }
            for (const [name, index] of program.boundAttributeLocations) {
                GLOB_GL_CTX.bindAttribLocation(validationProgram, index, name);
            }
            GLOB_GL_CTX.linkProgram(validationProgram);
            const linked = Boolean(GLOB_GL_CTX.getProgramParameter(validationProgram, WebGL2RenderingContext.LINK_STATUS));
            const infoLog = GLOB_GL_CTX.getProgramInfoLog(validationProgram) || "";
            GLOB_GL_CTX.deleteProgram(validationProgram);
            if (!linked) {
                program.infoLog = infoLog;
                return;
            }
        }
        try {
            if (program.linkProgram()) {
                if (this.hydGlobalState.commonState.currentProgram === program) {
                    this.currentProgramValid = true;
                    this.activateUniformLocations(program);
                }
                this.hydGlobalState.recordTransition("linkProgram", program.hash, program.linkGeneration);
            }
        } catch (error) {
            program.linked = false;
            program.infoLog = error instanceof Error ? error.message : String(error);
        }
    }

    validateProgram(program: HydProgram) {
        if (!this.isProgram(program)) {
            this.setObjectValidationError(program);
            return;
        }
        program.validated = program.linked;
    }

    bindVertexArray(vertexArray: HydVertexArray | null) {
        if (vertexArray !== null && !this.isVertexArray(vertexArray)) {
            this.setObjectValidationError(vertexArray);
            return;
        }
        const target = vertexArray || this.hydGlobalState.defaultVertexArrayBinding;
        if (this.hydGlobalState.commonState.vertexArrayBinding !== target) {
            this.hydGlobalState.commonState.vertexArrayBinding = target;
            this.hydGlobalState.recordTransition("bindVertexArray", target.hash);
        }
    }

    // ***** texture *****
    activeTexture(texture: GLenum) {
        const target = texture - WebGL2RenderingContext.TEXTURE0;
        if (this.hydGlobalState.commonState.activeTextureUnit !== target) {
            this.hydGlobalState.commonState.activeTextureUnit = target;
        }
    }

    bindTexture(target: GLenum, texture: HydTexture | object | null) {
        const vd = enumToViewDimension.get(target);
        if (!vd) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (texture instanceof HydTexture && (texture.ownerToken !== this.contextToken || texture.deleted)) {
            this.setObjectValidationError(texture);
            return;
        }
        const hydTexture = this.normalizeTexture(texture);
        if (hydTexture) hydTexture.initialized = true;
        const textureUnit = this.hydGlobalState.commonState.activeTextureUnit;
        const previous = this.hydGlobalState.getTextureUnitBinding(textureUnit, vd);
        if (hydTexture === null) {
            if (previous === null) {
                return;
            }
            if (this.samplerNeedsOriginFlip(previous) !== false) {
                this.samplerOriginStateVersion++;
            }
            this.hydGlobalState.setTextureUnitBinding(textureUnit, vd, null);
            this.hydGlobalState.recordTransition("bindTexture", target, "null");
            return;
        }
        if (previous === hydTexture && hydTexture.viewDimension === vd) {
            return;
        }
        hydTexture.viewDimension = vd;
        if (this.samplerNeedsOriginFlip(previous) !== this.samplerNeedsOriginFlip(hydTexture)) {
            this.samplerOriginStateVersion++;
        }
        this.hydGlobalState.setTextureUnitBinding(textureUnit, vd, hydTexture);
        this.hydGlobalState.recordTransitionOne(hydTexture.hash);
        // this.hydGlobalState.recordTransition("bindTexture", vd, texture.hash);
    }

    texImage2D(...args: Array<any>) {
        this._der_flush();
        console.assert(args.length === 9 || args.length === 6);
        const target: GLenum = args.at(0);
        const level: GLint = args.at(1);
        const internalformat: GLenum = args.at(2);
        let width: GLsizei;
        let height: GLsizei;
        const border: GLint = 0;
        const format: GLenum = args.at(-3);
        const type: GLenum = args.at(-2);
        const pixels: ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap | TypedArray | null = args.at(-1);
        if (args.length === 6) {
            if (pixels instanceof HTMLVideoElement) {
                width = pixels.videoWidth;
                height = pixels.videoHeight;
            } else if (pixels !== null && "width" in pixels && "height" in pixels) {
                width = pixels.width;
                height = pixels.height;
            } else {
                throw new Error("unsupported texImage2D: " + args);
            }
        } else {
            width = args.at(3);
            height = args.at(4);
        }
        if (!this.isSupportedTextureUploadFormat(internalformat, format, type)) {
            throw new Error("unsupported texImage2D: " + args);
        }
        const unpack: HydPixelUnpackState = this.hydGlobalState.miscState.unpackState;
        this.currentTexture(target).texImage2D(pixels, target, level, internalformat, width, height, border, format, type, unpack);
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("texImage2D", target, level, internalformat, width, height, border, format, type);
    }

    texStorage2D(target: GLenum, levels: GLsizei, internalformat: GLenum, width: GLsizei, height: GLsizei) {
        this._der_flush();
        if (levels < 1) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const { format, type } = this.textureStorageUploadFormat(internalformat);
        this.currentTexture(target).texImage2D(null, target, 0, internalformat, width, height, 0, format, type, this.hydGlobalState.miscState.unpackState);
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("texStorage2D", target, levels, internalformat, width, height);
    }

    texSubImage2D(...args: Array<any>) {
        this._der_flush();
        console.assert(args.length === 7 || args.length === 9 || args.length === 8 || args.length === 10);
        const target: GLenum = args.at(0);
        const level: GLint = args.at(1);
        const xoffset: GLint = args.at(2);
        const yoffset: GLint = args.at(3);
        let width: GLsizei;
        let height: GLsizei;
        let format: GLenum;
        let type: GLenum;
        let pixels: ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap | TypedArray;
        if (args.length === 7 || args.length === 8) {
            format = args.at(4);
            type = args.at(5);
            pixels = args.at(6);
            if (args.length === 8 && pixels && "byteLength" in pixels) {
                const sourceOffset = args.at(7) || 0;
                const byteOffset = sourceOffset * ((pixels as any).BYTES_PER_ELEMENT || 1);
                pixels = new Uint8Array((pixels as TypedArray).buffer, (pixels as TypedArray).byteOffset + byteOffset, (pixels as TypedArray).byteLength - byteOffset);
            }
            if (pixels instanceof HTMLVideoElement) {
                width = pixels.videoWidth;
                height = pixels.videoHeight;
            } else if (pixels && "width" in pixels && "height" in pixels) {
                width = pixels.width;
                height = pixels.height;
            } else {
                throw new Error("unsupported texSubImage2D: " + args);
            }
        } else {
            width = args.at(4);
            height = args.at(5);
            format = args.at(6);
            type = args.at(7);
            pixels = args.at(8);
            if (typeof pixels === "number") {
                pixels = this.pixelUnpackBufferSlice(pixels, width, height, 1, format, type);
            } else if (args.length === 10 && pixels && "byteLength" in pixels) {
                const sourceOffset = args.at(9) || 0;
                const byteOffset = sourceOffset * ((pixels as any).BYTES_PER_ELEMENT || 1);
                pixels = new Uint8Array((pixels as TypedArray).buffer, (pixels as TypedArray).byteOffset + byteOffset, (pixels as TypedArray).byteLength - byteOffset);
            }
        }
        if (!this.isSupportedTextureSubUploadFormat(format, type)) {
            throw new Error("unsupported texSubImage2D: " + args);
        }
        const unpack: HydPixelUnpackState = this.hydGlobalState.miscState.unpackState;
        this.currentTexture(target).texSubImage2D(pixels, target, level, xoffset, yoffset, width, height, format, type, unpack);
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("texSubImage2D", target, level, xoffset, yoffset, width, height, format, type);
    }

    texStorage3D(target: GLenum, levels: GLsizei, internalformat: GLenum, width: GLsizei, height: GLsizei, depth: GLsizei) {
        this._der_flush();
        if (levels < 1) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const { format, type } = this.textureStorageUploadFormat(internalformat);
        this.currentTexture(target).texImage3D(null, target, 0, internalformat, width, height, depth, 0, format, type, 0);
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("texStorage3D", target, levels, internalformat, width, height, depth);
    }

    texImage3D(...args: Array<any>) {
        this._der_flush();
        // gl.texImage3D( target, 0, gl.RGBA, 1, 1, dimensions, 0, gl.RGBA, gl.UNSIGNED_BYTE, data );
        if (args.length === 10) {
            args.push(0);
        }
        console.assert(args.length === 11);
        const [target, level, internalformat, width, height, depth, border, format, type, rawPixels, offset] = args;
        let pixels = rawPixels;
        if (pixels instanceof HTMLVideoElement
            || border !== 0
        ) {
            throw new Error("unsupported texImage3D: " + args);
        }
        if (typeof pixels === "number") {
            pixels = this.pixelUnpackBufferSlice(pixels, width, height, depth, format, type);
        } else if (offset && pixels && "byteLength" in pixels) {
            const byteOffset = offset * ((pixels as any).BYTES_PER_ELEMENT || 1);
            pixels = new Uint8Array((pixels as TypedArray).buffer, (pixels as TypedArray).byteOffset + byteOffset, (pixels as TypedArray).byteLength - byteOffset);
        }
        if (!this.isSupportedTextureUploadFormat(internalformat, format, type)) {
            throw new Error("unsupported texImage3D: " + args);
        }
        this.currentTexture(target).texImage3D(pixels, target, level, internalformat, width, height, depth, border, format, type, offset);
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("texImage3D", target, level, internalformat, width, height, depth, border, format, type, offset);
    }

    texSubImage3D(...args: Array<any>) {
        this._der_flush();
        console.assert(args.length === 11 || args.length === 12);
        const target: GLenum = args.at(0);
        const level: GLint = args.at(1);
        const xoffset: GLint = args.at(2);
        const yoffset: GLint = args.at(3);
        const zoffset: GLint = args.at(4);
        const width: GLsizei = args.at(5);
        const height: GLsizei = args.at(6);
        const depth: GLsizei = args.at(7);
        const format: GLenum = args.at(8);
        const type: GLenum = args.at(9);
        let pixels: ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap | TypedArray = args.at(10);
        if (typeof pixels === "number") {
            pixels = this.pixelUnpackBufferSlice(pixels, width, height, depth, format, type);
        } else if (args.length === 12 && pixels && "byteLength" in pixels) {
            const sourceOffset = args.at(11) || 0;
            const byteOffset = sourceOffset * ((pixels as any).BYTES_PER_ELEMENT || 1);
            pixels = new Uint8Array((pixels as TypedArray).buffer, (pixels as TypedArray).byteOffset + byteOffset, (pixels as TypedArray).byteLength - byteOffset);
        }
        if (!this.isSupportedTextureSubUploadFormat(format, type)) {
            throw new Error("unsupported texSubImage3D: " + args);
        }
        const unpack: HydPixelUnpackState = this.hydGlobalState.miscState.unpackState;
        this.currentTexture(target).texSubImage3D(pixels, target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, unpack);
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("texSubImage3D", target, level, xoffset, yoffset, zoffset, width, height, depth, format, type);
    }

    texParameteri(target: GLenum, pname: GLenum, param: GLfloat | GLint) {
        const validTargets = new Set<number>([
            WebGL2RenderingContext.TEXTURE_2D,
            WebGL2RenderingContext.TEXTURE_CUBE_MAP,
            ...(this.hydContextType === "webgl2" ? [WebGL2RenderingContext.TEXTURE_3D, WebGL2RenderingContext.TEXTURE_2D_ARRAY] : []),
        ]);
        if (!validTargets.has(target)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        const viewDimension = enumToViewDimension.get(target);
        const texture = this.hydGlobalState.getTextureUnitBinding(this.hydGlobalState.commonState.activeTextureUnit, viewDimension);
        if (!texture) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const minFilters = new Set<number>([
            WebGL2RenderingContext.NEAREST,
            WebGL2RenderingContext.LINEAR,
            WebGL2RenderingContext.NEAREST_MIPMAP_NEAREST,
            WebGL2RenderingContext.LINEAR_MIPMAP_NEAREST,
            WebGL2RenderingContext.NEAREST_MIPMAP_LINEAR,
            WebGL2RenderingContext.LINEAR_MIPMAP_LINEAR,
        ]);
        const magFilters = new Set<number>([WebGL2RenderingContext.NEAREST, WebGL2RenderingContext.LINEAR]);
        const wrapModes = new Set<number>([WebGL2RenderingContext.CLAMP_TO_EDGE, WebGL2RenderingContext.MIRRORED_REPEAT, WebGL2RenderingContext.REPEAT]);
        const valid = (pname === WebGL2RenderingContext.TEXTURE_MIN_FILTER && minFilters.has(param)) ||
            (pname === WebGL2RenderingContext.TEXTURE_MAG_FILTER && magFilters.has(param)) ||
            ((pname === WebGL2RenderingContext.TEXTURE_WRAP_S || pname === WebGL2RenderingContext.TEXTURE_WRAP_T ||
                (this.hydContextType === "webgl2" && pname === WebGL2RenderingContext.TEXTURE_WRAP_R)) && wrapModes.has(param));
        if (!valid) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        texture.texParameteri(pname, param);
        this.hydGlobalState.recordTransition("texParameteri", target, pname, param);
    }

    texParameterf(target: GLenum, pname: GLenum, param: GLfloat) {
        this.texParameteri(target, pname, param);
    }

    generateMipmap(target: GLenum) {
        console.assert(target === WebGL2RenderingContext.TEXTURE_2D || target === WebGL2RenderingContext.TEXTURE_CUBE_MAP);
        this.currentTexture(target);
        this.hydGlobalState.recordTransition("generateMipmap", target);
    }

    getTexParameter(target: GLenum, pname: GLenum) {
        const validTargets = target === WebGL2RenderingContext.TEXTURE_2D || target === WebGL2RenderingContext.TEXTURE_CUBE_MAP ||
            (this.hydContextType === "webgl2" && (target === WebGL2RenderingContext.TEXTURE_3D || target === WebGL2RenderingContext.TEXTURE_2D_ARRAY));
        if (!validTargets) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        const texture = this.hydGlobalState.getTextureUnitBinding(
            this.hydGlobalState.commonState.activeTextureUnit,
            enumToViewDimension.get(target),
        );
        if (!texture) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        const validPname = pname === WebGL2RenderingContext.TEXTURE_MIN_FILTER ||
            pname === WebGL2RenderingContext.TEXTURE_MAG_FILTER ||
            pname === WebGL2RenderingContext.TEXTURE_WRAP_S ||
            pname === WebGL2RenderingContext.TEXTURE_WRAP_T ||
            (this.hydContextType === "webgl2" && pname === WebGL2RenderingContext.TEXTURE_WRAP_R);
        if (!validPname) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        return texture.webglParameters.get(pname);
    }

    viewport(x: GLint, y: GLint, width: GLsizei, height: GLsizei) {
        const viewport = this.hydGlobalState.commonState.viewport;
        if (viewport[0] !== x || viewport[1] !== y || viewport[2] !== width || viewport[3] !== height) {
            this._der_flush();
            this.gpuViewportDirty = true;
        }
        this.hydGlobalState.commonState.viewport[0] = x;
        this.hydGlobalState.commonState.viewport[1] = y;
        this.hydGlobalState.commonState.viewport[2] = width;
        this.hydGlobalState.commonState.viewport[3] = height;
        this.hydGlobalState.recordTransition("viewport", x, y, width, height);
    }

    scissor(x: GLint, y: GLint, width: GLsizei, height: GLsizei) {
        const scissorBox = this.hydGlobalState.miscState.scissorBox;
        if (scissorBox[0] !== x || scissorBox[1] !== y || scissorBox[2] !== width || scissorBox[3] !== height) {
            this._der_flush();
            this.gpuScissorDirty = true;
        }
        this.hydGlobalState.miscState.scissorBox = [x, y, width, height];
        this.hydGlobalState.recordTransition("scissor", x, y, width, height);
    }

    depthRange(zNear: number, zFar: number) {
        const viewport = this.hydGlobalState.commonState.viewport;
        if (viewport[4] !== zNear || viewport[5] !== zFar) {
            this._der_flush();
            this.gpuViewportDirty = true;
        }
        this.hydGlobalState.commonState.viewport[4] = zNear;
        this.hydGlobalState.commonState.viewport[5] = zFar;
        this.hydGlobalState.recordTransition("depthRange", zNear, zFar);
    }

    vertexAttribDivisor(index: GLuint, divisor: GLuint) {
        const buffer = this.hydGlobalState.commonState.arrayBufferBinding;
        buffer.descriptor.usage |= GPUBufferUsage.VERTEX;

        const attribute = this.hydGlobalState.commonState.vertexArrayBinding.attributes[index];
        attribute.divisor = divisor;
        attribute.updateHash();
        // this.globalState.commonState.vertexArrayBinding.updateMeta();
        this.hydGlobalState.recordTransition("vertexAttribDivisor", index, divisor);
    }

    vertexAttribPointer(index: GLuint, size: GLint, type: GLenum, normalized: GLboolean, _stride: GLsizei, offset: GLintptr) {
        const buffer = this.hydGlobalState.commonState.arrayBufferBinding;
        const attribute = this.hydGlobalState.commonState.vertexArrayBinding.attributes[index];
        const stride = _stride || size * 4;

        if (attribute.size !== size || attribute.type !== type || attribute.normalized !== normalized || attribute.stride !== stride || attribute.offset !== offset || attribute.buffer !== buffer) {
            // buffer.descriptor.usage |= GPUBufferUsage.VERTEX;
            const formatChanged = attribute.size !== size || attribute.type !== type || attribute.normalized !== normalized;
            attribute.size = size;
            attribute.type = type;
            attribute.normalized = normalized;
            attribute.int = false;
            attribute.stride = stride;
            attribute.webglStride = _stride;
            attribute.offset = offset;
            attribute.buffer = buffer;
            attribute.shaderLocation = index;
            if (formatChanged || !attribute.format) {
                attribute.format = getVertexFormat(type, size, normalized);
            }
            attribute.updateHash();
            // if (attribute.enabled && attribute.buffer) {
            //     this.globalState.commonState.vertexArrayBinding.updateMeta();
            // }
            this.hydGlobalState.recordTransition("vertexAttribPointer", index, size, type, normalized, stride, offset);
        }
    }

    private xxable(cap: GLenum, value: boolean) {
        switch (cap) {
            case WebGL2RenderingContext.DEPTH_TEST:
                this.hydGlobalState.depthState.enabled = value;
                break;
            case WebGL2RenderingContext.STENCIL_TEST:
                this.hydGlobalState.stencilState.enabled = value;
                break;
            case WebGL2RenderingContext.CULL_FACE:
                this.hydGlobalState.polygonState.cullFace = value;
                break;
            case WebGL2RenderingContext.BLEND:
                this.hydGlobalState.blendState.enabled = value;
                break;
            case WebGL2RenderingContext.SCISSOR_TEST:
                if (this.hydGlobalState.miscState.scissorTest !== value) {
                    this._der_flush();
                    this.hydGlobalState.miscState.scissorTest = value;
                    this.gpuScissorDirty = true;
                }
                break;
            case WebGL2RenderingContext.POLYGON_OFFSET_FILL:
                this.hydGlobalState.polygonState.polygonOffsetFill = value;
                break;
            case WebGL2RenderingContext.SAMPLE_ALPHA_TO_COVERAGE:
                this.hydGlobalState.miscState.sampleAlphaToCoverage = value;
                break;
            default:
                throw new Error("unsupported enable: " + cap);
        }
    }

    enable(cap: GLenum) {
        this.xxable(cap, true);
        this.hydGlobalState.recordTransition("enable", cap);
    }

    disable(cap: GLenum) {
        this.xxable(cap, false);
        this.hydGlobalState.recordTransition("disable", cap);
    }


    blendFunc(sfactor: GLenum, dfactor: GLenum) {
        const src = enumToBlendFactors.get(sfactor)!;
        const dst = enumToBlendFactors.get(dfactor)!;
        this.hydGlobalState.blendState.srcRGB = src;
        this.hydGlobalState.blendState.srcAlpha = src;
        this.hydGlobalState.blendState.dstRGB = dst;
        this.hydGlobalState.blendState.dstAlpha = dst;
        this.hydGlobalState.recordTransition("blendFunc", sfactor, dfactor);
    }

    blendColor(r: GLfloat, g: GLfloat, b: GLfloat, a: GLfloat) {
        this.hydGlobalState.blendState.color = [r, g, b, a];
        this.hydGlobalState.recordTransition("blendColor", r, g, b, a);
    }

    blendFuncSeparate(srcRGB: GLenum, dstRGB: GLenum, srcAlpha: GLenum, dstAlpha: GLenum) {
        const srcRGB1 = enumToBlendFactors.get(srcRGB)!;
        const dstRGB1 = enumToBlendFactors.get(dstRGB)!;
        const srcAlpha1 = enumToBlendFactors.get(srcAlpha)!;
        const dstAlpha1 = enumToBlendFactors.get(dstAlpha)!;
        this.hydGlobalState.blendState.srcRGB = srcRGB1;
        this.hydGlobalState.blendState.srcAlpha = srcAlpha1;
        this.hydGlobalState.blendState.dstRGB = dstRGB1;
        this.hydGlobalState.blendState.dstAlpha = dstAlpha1;
        this.hydGlobalState.recordTransition("blendFuncSeparate", srcRGB, dstRGB, srcAlpha, dstAlpha);
    }

    blendEquation(mode: GLenum) {
        const op = enumToBlendOperations.get(mode)!;
        this.hydGlobalState.blendState.equationRGB = op;
        this.hydGlobalState.blendState.equationAlpha = op;
        this.hydGlobalState.recordTransition("blendEquation", mode);
    }

    blendEquationSeparate(modeRGB: GLenum, modeAlpha: GLenum) {
        const rgbOp = enumToBlendOperations.get(modeRGB)!;
        const alphaOp = enumToBlendOperations.get(modeAlpha)!;
        this.hydGlobalState.blendState.equationRGB = rgbOp;
        this.hydGlobalState.blendState.equationAlpha = alphaOp;
        this.hydGlobalState.recordTransition("blendEquationSeparate", modeRGB, modeAlpha);
    }

    stencilFunc(func: GLenum, ref: GLint, mask: GLuint) {
        this.hydGlobalState.stencilState.frontFunc = enumToCompareFunction.get(func);
        this.hydGlobalState.stencilState.frontRef = ref;
        this.hydGlobalState.stencilState.frontValueMask = mask >>> 0;
        this.hydGlobalState.stencilState.backFunc = enumToCompareFunction.get(func);
        this.hydGlobalState.stencilState.backRef = ref;
        this.hydGlobalState.stencilState.backValueMask = mask >>> 0;
        this.hydGlobalState.recordTransition("stencilFunc", func, ref, mask);
    }

    stencilFuncSeparate(face: GLenum, func: GLenum, ref: GLint, mask: GLuint) {
        const compare = enumToCompareFunction.get(func);
        if (!compare) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        const valueMask = mask >>> 0;
        switch (face) {
            case WebGL2RenderingContext.FRONT:
                this.hydGlobalState.stencilState.frontFunc = compare;
                this.hydGlobalState.stencilState.frontRef = ref;
                this.hydGlobalState.stencilState.frontValueMask = valueMask;
                break;
            case WebGL2RenderingContext.BACK:
                this.hydGlobalState.stencilState.backFunc = compare;
                this.hydGlobalState.stencilState.backRef = ref;
                this.hydGlobalState.stencilState.backValueMask = valueMask;
                break;
            case WebGL2RenderingContext.FRONT_AND_BACK:
                this.hydGlobalState.stencilState.frontFunc = compare;
                this.hydGlobalState.stencilState.frontRef = ref;
                this.hydGlobalState.stencilState.frontValueMask = valueMask;
                this.hydGlobalState.stencilState.backFunc = compare;
                this.hydGlobalState.stencilState.backRef = ref;
                this.hydGlobalState.stencilState.backValueMask = valueMask;
                break;
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return;
        }
        this.hydGlobalState.recordTransition("stencilFuncSeparate", face, func, ref, mask);
    }

    stencilMask(mask: GLuint) {
        const writeMask = mask >>> 0;
        this.hydGlobalState.stencilState.frontWriteMask = writeMask;
        this.hydGlobalState.stencilState.backWriteMask = writeMask;
        this.hydGlobalState.recordTransition("stencilMask", mask);
    }

    stencilMaskSeparate(face: GLenum, mask: GLuint) {
        const writeMask = mask >>> 0;
        switch (face) {
            case WebGL2RenderingContext.FRONT:
                this.hydGlobalState.stencilState.frontWriteMask = writeMask;
                break;
            case WebGL2RenderingContext.BACK:
                this.hydGlobalState.stencilState.backWriteMask = writeMask;
                break;
            case WebGL2RenderingContext.FRONT_AND_BACK:
                this.hydGlobalState.stencilState.frontWriteMask = writeMask;
                this.hydGlobalState.stencilState.backWriteMask = writeMask;
                break;
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return;
        }
        this.hydGlobalState.recordTransition("stencilMaskSeparate", face, mask);
    }

    stencilOp(fail: GLenum, zfail: GLenum, zpass: GLenum) {
        this.hydGlobalState.stencilState.frontFail = enumToStencilOperation.get(fail);
        this.hydGlobalState.stencilState.frontPassDepthFail = enumToStencilOperation.get(zfail);
        this.hydGlobalState.stencilState.frontPassDepthPass = enumToStencilOperation.get(zpass);
        this.hydGlobalState.stencilState.backFail = enumToStencilOperation.get(fail);
        this.hydGlobalState.stencilState.backPassDepthFail = enumToStencilOperation.get(zfail);
        this.hydGlobalState.stencilState.backPassDepthPass = enumToStencilOperation.get(zpass);
        this.hydGlobalState.recordTransition("stencilOp", fail, zfail, zpass);
    }

    stencilOpSeparate(face: GLenum, fail: GLenum, zfail: GLenum, zpass: GLenum) {
        const failOp = enumToStencilOperation.get(fail);
        const depthFailOp = enumToStencilOperation.get(zfail);
        const passOp = enumToStencilOperation.get(zpass);
        if (!failOp || !depthFailOp || !passOp) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        switch (face) {
            case WebGL2RenderingContext.FRONT:
                this.hydGlobalState.stencilState.frontFail = failOp;
                this.hydGlobalState.stencilState.frontPassDepthFail = depthFailOp;
                this.hydGlobalState.stencilState.frontPassDepthPass = passOp;
                break;
            case WebGL2RenderingContext.BACK:
                this.hydGlobalState.stencilState.backFail = failOp;
                this.hydGlobalState.stencilState.backPassDepthFail = depthFailOp;
                this.hydGlobalState.stencilState.backPassDepthPass = passOp;
                break;
            case WebGL2RenderingContext.FRONT_AND_BACK:
                this.hydGlobalState.stencilState.frontFail = failOp;
                this.hydGlobalState.stencilState.frontPassDepthFail = depthFailOp;
                this.hydGlobalState.stencilState.frontPassDepthPass = passOp;
                this.hydGlobalState.stencilState.backFail = failOp;
                this.hydGlobalState.stencilState.backPassDepthFail = depthFailOp;
                this.hydGlobalState.stencilState.backPassDepthPass = passOp;
                break;
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return;
        }
        this.hydGlobalState.recordTransition("stencilOpSeparate", face, fail, zfail, zpass);
    }

    bindFramebuffer(target: GLenum, framebuffer: HydFramebuffer | null) {
        if (framebuffer !== null && (!(framebuffer instanceof HydFramebuffer) || framebuffer.ownerToken !== this.contextToken || framebuffer.deleted)) {
            this.setObjectValidationError(framebuffer);
            return;
        }
        this._der_flush();
        this.gpuViewportDirty = true;
        this.gpuScissorDirty = true;
        if (framebuffer === null) {
            framebuffer = this.hydGlobalState.defaultFramebuffer;
        }
        if (target === WebGL2RenderingContext.FRAMEBUFFER) {
            if (framebuffer !== this.hydGlobalState.defaultFramebuffer) framebuffer.initialized = true;
            this.hydGlobalState.commonState.drawFramebufferBinding = framebuffer;
            this.hydGlobalState.commonState.readFramebufferBinding = framebuffer;
        } else if (target === WebGL2RenderingContext.DRAW_FRAMEBUFFER) {
            if (framebuffer !== this.hydGlobalState.defaultFramebuffer) framebuffer.initialized = true;
            this.hydGlobalState.commonState.drawFramebufferBinding = framebuffer;
        } else if (target === WebGL2RenderingContext.READ_FRAMEBUFFER) {
            if (framebuffer !== this.hydGlobalState.defaultFramebuffer) framebuffer.initialized = true;
            this.hydGlobalState.commonState.readFramebufferBinding = framebuffer;
        } else {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        this.hydGlobalState.recordTransition("bindFramebuffer", target, framebuffer.hash);
    }

    framebufferTexture2D(target: GLenum, attachment: GLenum, texTarget: GLenum, texture: HydTexture | null, level: GLint) {
        if (texture !== null && !this.isTexture(texture)) {
            this.setObjectValidationError(texture);
            return;
        }
        this._der_flush();
        const framebuffer = this.getFramebufferForTarget(target);
        if (texture === null) {
            framebuffer.attachments.delete(attachment);
            framebuffer.resetHash();
            this.gpuViewportDirty = true;
            this.gpuScissorDirty = true;
            this.hydGlobalState.recordTransition("framebufferTexture2D", target, attachment, texTarget, "null", level);
            return;
        }

        texture.markFramebufferRenderTarget();
        this.samplerOriginStateVersion++;
        const attrib = new FramebufferAttributes(attachment, level, texTarget, texture);
        texture.onDelete.push(() => {
            if (framebuffer.attachments.get(attachment) === attrib) {
                framebuffer.attachments.delete(attachment);
                framebuffer.resetHash();
            }
        });
        switch (attachment) {
            case WebGL2RenderingContext.DEPTH_ATTACHMENT:
                texture.state.compare = this.hydGlobalState.depthState.func;
                break;
            case WebGL2RenderingContext.STENCIL_ATTACHMENT:
                texture.state.compare = this.hydGlobalState.stencilState.frontFunc;
                break;
            case WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT:
                texture.state.compare = this.hydGlobalState.depthState.func;
                break;
        }

        framebuffer.attachments.set(attachment, attrib);
        framebuffer.resetHash();
        this.gpuViewportDirty = true;
        this.gpuScissorDirty = true;
        this.hydGlobalState.recordTransition("framebufferTexture2D", target, attachment, texTarget, texture.hash, level);
    }

    framebufferTextureLayer(target: GLenum, attachment: GLenum, texture: HydTexture | null, level: GLint, layer: GLint) {
        if (texture !== null && !this.isTexture(texture)) {
            this.setObjectValidationError(texture);
            return;
        }
        this._der_flush();
        const framebuffer = this.getFramebufferForTarget(target);
        if (texture === null) {
            framebuffer.attachments.delete(attachment);
            framebuffer.resetHash();
            this.gpuViewportDirty = true;
            this.gpuScissorDirty = true;
            this.hydGlobalState.recordTransition("framebufferTextureLayer", target, attachment, "null", level, layer);
            return;
        }

        texture.markFramebufferRenderTarget();
        this.samplerOriginStateVersion++;
        const attrib = new FramebufferAttributes(attachment, level, undefined, texture, layer);
        texture.onDelete.push(() => {
            if (framebuffer.attachments.get(attachment) === attrib) {
                framebuffer.attachments.delete(attachment);
                framebuffer.resetHash();
            }
        });
        framebuffer.attachments.set(attachment, attrib);
        framebuffer.resetHash();
        this.gpuViewportDirty = true;
        this.gpuScissorDirty = true;
        this.hydGlobalState.recordTransition("framebufferTextureLayer", target, attachment, texture.hash, level, layer);
    }

    framebufferRenderbuffer(target: GLenum, attachment: GLenum, renderbufferTarget: GLenum, renderbuffer: HydTexture | null) {
        if (renderbuffer !== null && !this.isRenderbuffer(renderbuffer)) {
            this.setObjectValidationError(renderbuffer);
            return;
        }
        if (renderbufferTarget !== WebGL2RenderingContext.RENDERBUFFER) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        this._der_flush();
        const framebuffer = this.getFramebufferForTarget(target);
        if (renderbuffer === null) {
            framebuffer.attachments.delete(attachment);
            framebuffer.resetHash();
            this.gpuViewportDirty = true;
            this.gpuScissorDirty = true;
            this.hydGlobalState.recordTransition("framebufferRenderbuffer", target, attachment, renderbufferTarget, "null");
            return;
        }

        renderbuffer.markFramebufferRenderTarget();
        this.samplerOriginStateVersion++;
        const attrib: FramebufferAttributes = new FramebufferAttributes(attachment, undefined, undefined, renderbuffer, undefined, WebGL2RenderingContext.RENDERBUFFER);
        renderbuffer.onDelete.push(() => {
            if (framebuffer.attachments.get(attachment) === attrib) {
                framebuffer.attachments.delete(attachment);
                framebuffer.resetHash();
            }
        });
        framebuffer.attachments.set(attachment, attrib);
        framebuffer.resetHash();
        this.gpuViewportDirty = true;
        this.gpuScissorDirty = true;
        this.hydGlobalState.recordTransition("framebufferRenderbuffer", target, attachment, renderbufferTarget, renderbuffer.hash);
    }

    blitFramebuffer(
        srcX0: GLint,
        srcY0: GLint,
        srcX1: GLint,
        srcY1: GLint,
        dstX0: GLint,
        dstY0: GLint,
        dstX1: GLint,
        dstY1: GLint,
        mask: GLbitfield,
        filter: GLenum,
    ) {
        this._der_flush();
        this.hydGlobalState.recordTransition("blitFramebuffer", srcX0, srcY0, srcX1, srcY1, dstX0, dstY0, dstX1, dstY1, mask, filter);
    }

    copyTexImage2D(target: GLenum, level: GLint, internalformat: GLenum, x: GLint, y: GLint, width: GLsizei, height: GLsizei, border: GLint) {
        this._der_flush();
        const texture = this.currentTexture(target);
        texture.texImage2D(null, target, level, internalformat, width, height, border, WebGL2RenderingContext.RGBA, WebGL2RenderingContext.UNSIGNED_BYTE);
        texture.markCopyDestination();
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("copyTexImage2D", target, level, internalformat, x, y, width, height, border);
    }

    copyTexSubImage2D(target: GLenum, level: GLint, xoffset: GLint, yoffset: GLint, x: GLint, y: GLint, width: GLsizei, height: GLsizei) {
        this._der_flush();
        this.currentTexture(target).markCopyDestination();
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("copyTexSubImage2D", target, level, xoffset, yoffset, x, y, width, height);
    }

    private readDefaultFramebufferSynchronously(
        x: GLint,
        y: GLint,
        width: GLsizei,
        height: GLsizei,
        destination: Uint8Array,
        destinationOffset: number,
    ): boolean {
        if (width === 0 || height === 0) {
            return true;
        }
        if (!this.synchronousReadbackCanvas) {
            this.synchronousReadbackCanvas = document.createElement("canvas");
            this.synchronousReadbackContext = this.synchronousReadbackCanvas.getContext("2d", { willReadFrequently: true });
        }
        if (!this.synchronousReadbackContext) {
            return false;
        }

        const canvas = this.synchronousReadbackCanvas;
        if (canvas.width !== this.hydCanvas.width || canvas.height !== this.hydCanvas.height) {
            canvas.width = this.hydCanvas.width;
            canvas.height = this.hydCanvas.height;
        }
        const context = this.synchronousReadbackContext;
        try {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(this.hydCanvas, 0, 0);
            const sourceY = this.hydCanvas.height - y - height;
            const source = context.getImageData(x, sourceY, width, height).data;
            const rowBytes = width * 4;
            for (let row = 0; row < height; row++) {
                const sourceOffset = row * rowBytes;
                const targetOffset = destinationOffset + (height - row - 1) * rowBytes;
                destination.set(source.subarray(sourceOffset, sourceOffset + rowBytes), targetOffset);
            }
            return true;
        } catch (error) {
            console.warn("[HYD] synchronous default-framebuffer readPixels failed:", error);
            return false;
        }
    }

    readPixels(x: GLint, y: GLint, width: GLsizei, height: GLsizei, format: GLenum, type: GLenum, pixels: ArrayBufferView | GLintptr | null) {
        if (width < 0 || height < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        this._der_flush();
        const bytesPerPixel = textureUploadBytesPerPixel(format, type);
        const rowBytes = width * bytesPerPixel;
        const readbackBytesPerRow = this.alignReadbackBytesPerRow(rowBytes);
        const byteLength = rowBytes * height;
        const attachment = this.getReadColorAttachment();
        let destination: Uint8Array | null = null;
        let destinationOffset = 0;

        if (typeof pixels === "number") {
            const buffer = this.hydGlobalState.commonState.pixelPackBufferBinding;
            if (!buffer) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                throw new Error("readPixels offset requires PIXEL_PACK_BUFFER binding");
            }
            destinationOffset = pixels;
            if (destinationOffset + byteLength > buffer.shadowData.byteLength) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                throw new Error(`readPixels exceeds PIXEL_PACK_BUFFER size: ${destinationOffset}+${byteLength}/${buffer.shadowData.byteLength}`);
            }
            destination = buffer.shadowData;
        } else if (pixels && "byteLength" in pixels) {
            destination = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength);
            if (byteLength > destination.byteLength) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                throw new Error(`readPixels destination too small: ${byteLength}/${destination.byteLength}`);
            }
        }

        if (!destination) {
            this.hydGlobalState.recordTransition("readPixels", x, y, width, height, format, type);
            return;
        }

        const readsDefaultFramebuffer = this.hydGlobalState.commonState.readFramebufferBinding === this.hydGlobalState.defaultFramebuffer;
        if (readsDefaultFramebuffer &&
            format === WebGL2RenderingContext.RGBA &&
            type === WebGL2RenderingContext.UNSIGNED_BYTE &&
            this.readDefaultFramebufferSynchronously(x, y, width, height, destination, destinationOffset)) {
            this.hydGlobalState.recordTransition("readPixels", x, y, width, height, format, type);
            return;
        }

        if (!attachment) {
            destination.fill(0, destinationOffset, destinationOffset + byteLength);
            this.hydGlobalState.recordTransition("readPixels", x, y, width, height, format, type);
            return;
        }

        const readbackBuffer = this.hydDevice.createBuffer({
            size: readbackBytesPerRow * height,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            label: "readPixels",
        });
        const encoder = this.hydDevice.createCommandEncoder({ label: "readPixels" });
        const gpuY = Math.max(0, attachment.height - y - height);
        encoder.copyTextureToBuffer(
            {
                texture: attachment.attachment.texture,
                mipLevel: attachment.level || 0,
                origin: {
                    x,
                    y: gpuY,
                    z: attachment.layer || 0,
                },
            },
            {
                buffer: readbackBuffer,
                bytesPerRow: readbackBytesPerRow,
                rowsPerImage: height,
            },
            {
                width,
                height,
                depthOrArrayLayers: 1,
            },
        );
        this.hydDevice.queue.submit([encoder.finish()]);

        const readback = readbackBuffer.mapAsync(GPUMapMode.READ).then(() => {
            const mapped = new Uint8Array(readbackBuffer.getMappedRange());
            for (let row = 0; row < height; row++) {
                const sourceOffset = row * readbackBytesPerRow;
                const targetOffset = destinationOffset + row * rowBytes;
                destination.set(mapped.subarray(sourceOffset, sourceOffset + rowBytes), targetOffset);
            }
            readbackBuffer.unmap();
            readbackBuffer.destroy();
        }).catch((error) => {
            readbackBuffer.destroy();
            console.error("[HYD] readPixels failed:", error);
        });
        this.pendingReadbacks.push(readback);
        this.hydGlobalState.recordTransition("readPixels", x, y, width, height, format, type);
    }

    drawBuffers(buffers: Array<GLenum>) {
        this.hydGlobalState.commonState.drawFramebufferBinding.drawBuffers = buffers;
        this.hydGlobalState.commonState.drawFramebufferBinding.resetHash();
        this.gpuViewportDirty = true;
        this.gpuScissorDirty = true;
        this.hydGlobalState.recordTransition("drawBuffers", ...buffers);
    }

    readBuffer(mode: GLenum) {
        const framebuffer = this.hydGlobalState.commonState.readFramebufferBinding;
        if (framebuffer.readBuffer !== mode) {
            framebuffer.readBuffer = mode;
            framebuffer.resetHash();
        }
        this.hydGlobalState.recordTransition("readBuffer", mode);
    }

    fenceSync(condition: GLenum, flags: GLbitfield) {
        if (condition !== WebGL2RenderingContext.SYNC_GPU_COMMANDS_COMPLETE || flags !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        const pending = this.pendingReadbacks.splice(0);
        const sync = {
            condition,
            flags,
            signaled: pending.length === 0,
        } as WebGLSync & { signaled: boolean };
        if (pending.length > 0) {
            Promise.allSettled(pending).then(() => {
                sync.signaled = true;
            });
        }
        return sync as WebGLSync;
    }

    clientWaitSync(sync: WebGLSync, flags: GLbitfield, _timeout: GLuint64) {
        if (flags !== 0 && flags !== WebGL2RenderingContext.SYNC_FLUSH_COMMANDS_BIT) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return WebGL2RenderingContext.WAIT_FAILED;
        }
        return (sync as any)?.signaled ? WebGL2RenderingContext.ALREADY_SIGNALED : WebGL2RenderingContext.TIMEOUT_EXPIRED;
    }

    waitSync(_sync: WebGLSync, _flags: GLbitfield, _timeout: GLint64) {
    }

    deleteSync(_sync: WebGLSync) {
    }

    isSync(sync: WebGLSync) {
        return !!sync;
    }

    flush() {
        this._der_flush();
    }

    finish() {
        this._der_flush();
    }

    pixelStorei(pname: GLenum, param: GLint | GLboolean) {
        const value = typeof param === "boolean" ? (param ? 1 : 0) : param;
        switch (pname) {
            case WebGL2RenderingContext.UNPACK_FLIP_Y_WEBGL:
                this.hydGlobalState.miscState.unpackFlipYWebGL = value !== 0;
                this.hydGlobalState.recordTransition("pixelStorei", pname, value);
                return;
            case WebGL2RenderingContext.UNPACK_PREMULTIPLY_ALPHA_WEBGL:
                this.hydGlobalState.miscState.unpackPremultiplyAlphaWebGL = value !== 0;
                this.hydGlobalState.recordTransition("pixelStorei", pname, value);
                return;
            case WebGL2RenderingContext.UNPACK_COLORSPACE_CONVERSION_WEBGL:
                if (value !== WebGL2RenderingContext.BROWSER_DEFAULT_WEBGL && value !== WebGL2RenderingContext.NONE) {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                    return;
                }
                this.hydGlobalState.miscState.unpackColorSpaceConversionWebGL = value;
                this.hydGlobalState.recordTransition("pixelStorei", pname, value);
                return;
            case WebGL2RenderingContext.UNPACK_ALIGNMENT:
                if (!VALID_PIXEL_ALIGNMENT.has(value)) {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                    return;
                }
                this.hydGlobalState.miscState.unpackAlignment = value;
                this.hydGlobalState.recordTransition("pixelStorei", pname, value);
                return;
            case WebGL2RenderingContext.PACK_ALIGNMENT:
                if (!VALID_PIXEL_ALIGNMENT.has(value)) {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                    return;
                }
                this.hydGlobalState.miscState.packAlignment = value;
                this.hydGlobalState.recordTransition("pixelStorei", pname, value);
                return;
            default:
                console.warn("pixelStorei not implemented. Args:", pname, param);
        }
    }

    checkFramebufferStatus(): GLenum {
        return WebGL2RenderingContext.FRAMEBUFFER_COMPLETE;
    }

    private updateSamplerOriginUniforms(program: HydProgram, collectFlips: boolean): Map<string, boolean> | null {
        if (collectFlips && program.originVariantStateVersion === this.samplerOriginStateVersion) {
            return null;
        }
        if (!collectFlips && program.originUniformStateVersion === this.samplerOriginStateVersion) {
            return null;
        }
        const samplerOriginFlips = collectFlips ? new Map<string, boolean>() : null;
        for (const sampler of program.hydSamplers) {
            if (!collectFlips && !sampler.originFlipUniform) {
                continue;
            }
            const texture = this.hydGlobalState.getTextureUnitBinding(sampler.textureUnit, sampler.viewDimension);
            const shouldFlipY = this.samplerNeedsOriginFlip(texture);
            if (samplerOriginFlips) {
                samplerOriginFlips.set(sampler.name, shouldFlipY);
            }
            if (sampler.originFlipUniform && sampler.originFlipValue !== shouldFlipY) {
                sampler.originFlipValue = shouldFlipY;
                program.write_uniform_f1(sampler.originFlipUniform.offset, shouldFlipY ? 1 : 0);
            }
        }
        if (collectFlips) {
            program.originVariantStateVersion = this.samplerOriginStateVersion;
        } else {
            program.originUniformStateVersion = this.samplerOriginStateVersion;
        }
        return samplerOriginFlips;
    }

    private validateDrawState(): boolean {
        if (!this.currentProgramValid) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return false;
        }
        return true;
    }

    private setPBV() {
        if (frameDepth === 0) {
            ensureAutoFrame();
        }
        this.updateCanvasSize();
        // this.renderPassInfo.endPass();

        const program = this.hydGlobalState.commonState.currentProgram;
        const useSamplerOriginVariants = program.staticSamplerOriginVariants;
        if ((useSamplerOriginVariants ? program.hydSampler2D.length : program.hydSamplers.length) > 0) {
            const samplerOriginFlips = this.updateSamplerOriginUniforms(program, useSamplerOriginVariants);
            if (useSamplerOriginVariants && samplerOriginFlips) {
                program.applySamplerOriginVariant(samplerOriginFlips);
            }
        }

        /* set renderPass */
        // const [renderPassHash, renderPassDescriptor] = this.globalState.getRenderPassDescriptor(this._canvasView);

        const pbv = this.hydGlobalState.getPBV();
        const {pipelineHash, pipeline, bindGroup, vertexBuffersHash, vertexBufferHashes, vertexBuffers, vertexBufferOffsets, renderPassHash, renderBundleEncoderDescriptor} = pbv;
        const canReuseDrawState = pbv === this.lastDrawPbv &&
            this.hydRpCache.hasActiveRenderPass() &&
            !this.gpuViewportDirty &&
            !(this.hydGlobalState.miscState.scissorTest && this.gpuScissorDirty);
        if (!canReuseDrawState) {
            const passChanged = this.hydRpCache.RpSetDescriptor(renderPassHash, renderBundleEncoderDescriptor, this.bindedGetRenderPassDesc);
            if (passChanged || this.gpuViewportDirty) {
                this.setGpuViewport();
                this.gpuViewportDirty = false;
            }
            if (this.hydGlobalState.miscState.scissorTest && (passChanged || this.gpuScissorDirty)) {
                this.setGpuScissorRect();
                this.gpuScissorDirty = false;
            }
            if (this.hydGlobalState.stencilState.enabled) {
                this.hydRpCache.RpSetStencilReference(this.hydGlobalState.stencilState.frontRef);
            }
            if (this.hydGlobalState.blendState.enabled && this.blendUsesConstantFactor()) {
                const color = this.hydGlobalState.blendState.color as ArrayLike<number>;
                this.hydRpCache.RpSetBlendConstant4(color[0], color[1], color[2], color[3]);
            }
            this.hydRpCache.RpSetPipeline(pipelineHash, pipeline);
            this.hydRpCache.RpSetVertexBuffers(vertexBuffersHash, vertexBufferHashes, vertexBuffers, vertexBufferOffsets);
        }
        this.hydRpCache.RpSetBindGroup(bindGroup, program.alignedUniformSize > 0 ? this.hydUniOff : null);
        this.lastDrawPbv = pbv;

        if (program.alignedUniformSize > 0) {
            this.hydUniOff = program.setUniform(this.hydUniArr, this.hydUniOff);
        }
    }

    private getTriangleFanIndexBuffer(vertexCount: number): GPUBuffer {
        let buffer = this.triangleFanIndexBuffers.get(vertexCount);
        if (buffer) return buffer;

        const indexCount = Math.max(0, vertexCount - 2) * 3;
        const indices = new Uint32Array(indexCount);
        for (let i = 0; i < vertexCount - 2; i++) {
            indices[i * 3] = 0;
            indices[i * 3 + 1] = i + 1;
            indices[i * 3 + 2] = i + 2;
        }
        buffer = this.hydDevice.createBuffer({
            label: `triangleFanIndexBuffer-${vertexCount}`,
            size: Math.max(4, indices.byteLength),
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        if (indices.byteLength > 0) {
            this.hydDevice.queue.writeBuffer(buffer, 0, indices.buffer, indices.byteOffset, indices.byteLength);
        }
        this.triangleFanIndexBuffers.set(vertexCount, buffer);
        return buffer;
    }

    drawArrays(mode: GLenum, first: GLint, count: GLsizei) {
        if (!this.validateDrawState()) return;
        if (mode === WebGL2RenderingContext.TRIANGLE_FAN) {
            const topology: GPUPrimitiveTopology = "triangle-list";
            if (this.hydGlobalState.topology !== topology) {
                this.hydGlobalState.topology = topology;
                this.hydGlobalState.recordTransitionOne(topology);
            }
            this.setPBV();
            this.hydRpCache.RpSetIndexBuffer(this.getTriangleFanIndexBuffer(count), "uint32");
            this.hydRpCache.RpDrawIndexed(Math.max(0, count - 2) * 3, 1, 0, first, 0);
            if (this.hydUniOff >= this.hydMaxUniSize) {
                this._der_flush();
            }
            if (this.hydGlobalState.clearState.target !== 0) {
                this.hydGlobalState.clearState.target = 0;
                this.hydGlobalState.recordTransitionOne('!!d0');
            }
            return;
        }
        const topology = enum2PT[mode];
        if (this.hydGlobalState.topology !== topology) {
            this.hydGlobalState.topology = topology;
            this.hydGlobalState.recordTransitionOne(topology);
        }

        this.setPBV();
        this.hydRpCache.RpDraw(count, 1, first, 0);

        if (this.hydUniOff >= this.hydMaxUniSize) {
            this._der_flush();
        }

        if (this.hydGlobalState.clearState.target !== 0) {
            this.hydGlobalState.clearState.target = 0;
            this.hydGlobalState.recordTransitionOne('!!d0');
        }
    }

    drawArraysInstanced(mode: GLenum, first: GLint, count: GLsizei, instanceCount: GLsizei) {
        if (!this.validateDrawState()) return;
        const topology = enum2PT[mode];
        if (this.hydGlobalState.topology !== topology) {
            this.hydGlobalState.topology = topology;
            this.hydGlobalState.recordTransitionOne(topology);
        }

        this.setPBV();
        this.hydRpCache.RpDraw(count, instanceCount, first, 0);

        if (this.hydUniOff >= this.hydMaxUniSize) {
            this._der_flush();
        }

        if (this.hydGlobalState.clearState.target !== 0) {
            this.hydGlobalState.clearState.target = 0;
            this.hydGlobalState.recordTransitionOne('!!d0');
        }
    }

    drawElements(mode: GLenum, count: GLsizei, type: GLenum, offset: GLintptr) {
        if (!this.validateDrawState()) return;
        const topology = enum2PT[mode];
        if (this.hydGlobalState.topology !== topology) {
            this.hydGlobalState.topology = topology;
            this.hydGlobalState.recordTransitionOne(topology);
        }

        const elementArrayBuffer = this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
        if (!elementArrayBuffer || !elementArrayBuffer.buffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }

        this.setPBV();
        // const indexBuffer = this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding.buffer;
        // const indexFormat = enumToIndexFormat.get(type);
        // const indexCacheKey = indexBuffer.label + '$' + indexFormat;
        // const indexSize = indexEnumToBytes.get(type);

        this.hydRpCache.RpSetIndexBuffer(elementArrayBuffer.buffer, enumToIndexFormat.get(type));
        this.hydRpCache.RpDrawIndexed(count, 1, Math.floor(offset / indexEnumToBytes.get(type)), 0, 0);

        if (this.hydUniOff >= this.hydMaxUniSize) {
            this._der_flush();
        }

        if (this.hydGlobalState.clearState.target !== 0) {
            this.hydGlobalState.clearState.target = 0;
            this.hydGlobalState.recordTransitionOne('!!d0');
        }
    }

    drawElementsInstanced(mode: GLenum, count: GLsizei, type: GLenum, offset: GLintptr, instanceCount: GLsizei) {
        if (!this.validateDrawState()) return;
        const topology = enum2PT[mode];
        if (this.hydGlobalState.topology !== topology) {
            this.hydGlobalState.topology = topology;
            this.hydGlobalState.recordTransitionOne(topology);
        }

        const elementArrayBuffer = this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
        if (!elementArrayBuffer || !elementArrayBuffer.buffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }

        this.setPBV();
        this.hydRpCache.RpSetIndexBuffer(elementArrayBuffer.buffer, enumToIndexFormat.get(type));
        this.hydRpCache.RpDrawIndexed(count, instanceCount, Math.floor(offset / indexEnumToBytes.get(type)), 0, 0);

        if (this.hydUniOff >= this.hydMaxUniSize) {
            this._der_flush();
        }

        if (this.hydGlobalState.clearState.target !== 0) {
            this.hydGlobalState.clearState.target = 0;
            this.hydGlobalState.recordTransitionOne('!!d0');
        }
    }
}
