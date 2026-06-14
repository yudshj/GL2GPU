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
import { HydTexture } from "./hydTexture";
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
    hydLastCanvasSize: [number, number] = [-1, -1];
    hydMaxUniSize: number;
    hydCanvas: HTMLCanvasElement;
    hydGpuctx: GPUCanvasContext;
    hydDevice: GPUDevice;
    hydUniArr: Uint8Array;
    hydUniBuf: GPUBuffer;
    hydUniOff: number = 0;
    hydWrapper: any;
    hydGlobalState: HydGlobalStateHashed;
    bindedGetRenderPassDesc: () => GPURenderPassDescriptor;

    private hydRpCache: HydRenderPassCache;
    private shaderTranslator: ShaderTranslator;
    private triangleFanIndexBuffers: Map<number, GPUBuffer> = new Map();
    private readonly hydTextureObjects: WeakMap<object, HydTexture> = new WeakMap();
    private readonly hydBufferObjects: WeakMap<object, HydBuffer> = new WeakMap();
    private readonly maskedClearPipelines: Map<string, GPURenderPipeline> = new Map();
    private maskedClearUniformBuffer: GPUBuffer = null;

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

    regenerateDS(label: string, format: GPUTextureFormat, compareFunc: GPUCompareFunction, bindPoint: GLenum, width: number, height: number) {
        const texture = new HydTexture(this.hydDevice);
        texture.label = label;
        texture.state.compare = compareFunc;
        texture.renderbufferStorage(format, width, height);
        texture.viewDimension = '2d';
        this.hydGlobalState.defaultFramebuffer.attachments.set(bindPoint, new FramebufferAttributes(bindPoint, undefined, undefined, texture));
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
    constructor(_canvas: HTMLCanvasElement, _gpuctx: GPUCanvasContext, _attributes: WebGLContextAttributes, _device: GPUDevice, _maxUniformSize: number, _replay: number, shaderTranslator: ShaderTranslator) {
        this.shaderTranslator = shaderTranslator;
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

        frameBeginFuncLst.push(this._frameStart.bind(this));  // 这里能work是因为我们只需要draw的第一个参数！
        frameEndFuncList.push(this._frameEnd.bind(this));  // 这里能work是因为我们只需要draw的第一个参数！

        // this.renderPassInfo = new HydRenderPassCache();
        this.hydRpCache = new HydRenderPassCache(this.hydDevice);
        this.updateCanvasSize();
        this.bindedGetRenderPassDesc = this.hydGlobalState.getRenderPassDescriptor.bind(this.hydGlobalState);
    }

    private flushUniforms() {
        if (this.hydUniOff > 0) {
            // console.log('[HYD] flush uniforms', this.uniformWrite);
            this.hydDevice.queue.writeBuffer(this.hydUniBuf, 0, this.hydUniArr.buffer, 0, this.hydUniOff);
            this.hydUniOff = 0;
        }
    }

    public _der_flush() {
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
        program.bindAttribLocation(index, name);
        this.hydGlobalState.recordTransition("bindAttribLocation", program.hash || "unlinked", index, name);
    }

    getError() {
        const error = this.hydGlobalState.glError;
        this.hydGlobalState.glError = WebGL2RenderingContext.NO_ERROR;
        return error;
    }

    detachShader() {
        console.warn("skipping detachShader");
    }

    deleteShader(s: HydShader) {
        s.deleted = true;
    }

    deleteProgram(p: HydProgram) {
        p.deleted = true;
    }

    deleteFramebuffer(framebuffer: HydFramebuffer | null) {
        if (!framebuffer) return;
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
        this._der_flush();
        if (this.hydGlobalState.commonState.renderbufferBinding === renderbuffer) {
            this.hydGlobalState.commonState.renderbufferBinding = null;
        }
        renderbuffer.destroy();
        this.hydGlobalState.recordTransition("deleteRenderbuffer", "renderbuffer");
    }

    private lookupTexture(texture: HydTexture | object | null): HydTexture | null {
        if (texture === null) {
            return null;
        }
        if (texture instanceof HydTexture && typeof texture.texImage2D === "function") {
            return texture;
        }
        if (typeof texture !== "object") {
            return null;
        }
        const tagged = (texture as any).__hydTexture;
        if (tagged instanceof HydTexture) {
            return tagged;
        }
        const mapped = this.hydTextureObjects.get(texture);
        if (mapped) {
            return mapped;
        }
        const wrapped = (texture as any).texture;
        if (wrapped instanceof HydTexture) {
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
        const hydTexture = new HydTexture(this.hydDevice);
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
        const hydTexture = this.lookupTexture(texture);
        if (!hydTexture) return;
        this._der_flush();
        this.hydGlobalState.deleteTextureBinding(hydTexture);
        hydTexture.destroy();
        this.hydGlobalState.recordTransition("deleteTexture", "texture");
    }

    private lookupBuffer(buffer: HydBuffer | object | null): HydBuffer | null {
        if (buffer === null) {
            return null;
        }
        if (buffer instanceof HydBuffer && typeof buffer.write === "function") {
            return buffer;
        }
        if (typeof buffer !== "object") {
            return null;
        }
        const tagged = (buffer as any).__hydBuffer;
        if (tagged instanceof HydBuffer) {
            return tagged;
        }
        const mapped = this.hydBufferObjects.get(buffer);
        if (mapped) {
            return mapped;
        }
        const wrapped = (buffer as any).buffer;
        if (wrapped instanceof HydBuffer) {
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
        const hydBuffer = new HydBuffer(this.hydDevice);
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
        const hydBuffer = this.lookupBuffer(buffer);
        if (!hydBuffer) return;
        this._der_flush();
        if (this.hydGlobalState.commonState.arrayBufferBinding === hydBuffer) {
            this.hydGlobalState.commonState.arrayBufferBinding = null;
        }
        if (this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding === hydBuffer) {
            this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding = null;
        }
        this.hydGlobalState.recordTransition("deleteBuffer", "buffer");
    }

    getShaderInfoLog(x: HydShader) {
        return "fake shader info log";
    }

    getProgramInfoLog(p: HydProgram) {
        return "fake program info log";
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
        throw new Error("unhandled getShaderParameter: " + pname);
    }

    getProgramParameter(program: HydProgram, pname: GLenum) {
        switch (pname) {
            case WebGL2RenderingContext.DELETE_STATUS:
                return program.deleted;
            case WebGL2RenderingContext.LINK_STATUS:
                return program.linked;
            // case WebGL2RenderingContext.VALIDATE_STATUS:
            //     return program.validated;
            case WebGL2RenderingContext.ATTACHED_SHADERS:
                return 2;
            case WebGL2RenderingContext.ACTIVE_ATTRIBUTES:
                return program.hydAttributes.length;
            case WebGL2RenderingContext.ACTIVE_UNIFORMS:
                return program.hydUniforms.filter((uniform) => !uniform.internal).length + program.hydSamplers.length; // 0824
            case WebGL2RenderingContext.ACTIVE_UNIFORM_BLOCKS:
                return 0;
        }
        throw new Error("unhandled getProgramParameter: " + pname);
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
                throw new Error("unsupported target: " + target);
        }
        switch (pname) {
            case WebGL2RenderingContext.BUFFER_SIZE:
                return buffer.buffer.size;
            case WebGL2RenderingContext.BUFFER_USAGE:
                return buffer.buffer.usage;
            default:
                throw new Error("unsupported pname: " + pname);
        }
    }

    getRenderbufferParameter(target: GLenum, pname: GLenum) {
        if (target !== WebGL2RenderingContext.RENDERBUFFER || !this.hydGlobalState.commonState.renderbufferBinding) {
            this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_OPERATION;
            return null;
        }
        const renderbuffer = this.hydGlobalState.commonState.renderbufferBinding;
        switch (pname) {
            case WebGL2RenderingContext.RENDERBUFFER_WIDTH:
                return renderbuffer.width;
            case WebGL2RenderingContext.RENDERBUFFER_HEIGHT:
                return renderbuffer.height;
            case WebGL2RenderingContext.RENDERBUFFER_INTERNAL_FORMAT:
                return renderbuffer.format;
            default:
                throw new Error("unsupported getRenderbufferParameter: " + pname);
        }
    }

    getFramebufferAttachmentParameter(target: GLenum, attachment: GLenum, pname: GLenum) {
        const framebuffer = this.getFramebufferForTarget(target);
        const attrib = framebuffer.attachments.get(attachment);
        if (!attrib) {
            return pname === WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE ? WebGL2RenderingContext.NONE : null;
        }
        switch (pname) {
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE:
                return WebGL2RenderingContext.TEXTURE;
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME:
                return attrib.attachment;
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL:
                return attrib.level || 0;
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE:
                return attrib.face || 0;
            default:
                throw new Error("unsupported getFramebufferAttachmentParameter: " + pname);
        }
    }

    getAttribLocation(program: HydProgram, attribName: string) {
        const attrib = program.hydAttributes.find((item) => item.name === attribName);
        return attrib ? attrib.location : -1;
    }

    getUniformLocation(program: HydProgram, uniformName: string) {
        // return program.uniforms.findIndex((uniform) => uniform.name === uniformName);
        const ret = program.hydUniforms.find((uniform) => !uniform.internal && uniform.name === uniformName) || program.hydSamplers.find((sampler) => sampler.name === uniformName);
        if (ret) {
            return ret;
        } else {
            return null;
        }
    }

    isTexture(texture: HydTexture | object) {
        return Boolean(this.lookupTexture(texture));
    }

    isBuffer(buffer: HydBuffer | object) {
        return Boolean(this.lookupBuffer(buffer));
    }

    isFramebuffer(framebuffer: HydFramebuffer) {
        return framebuffer instanceof HydFramebuffer;
    }

    isRenderbuffer(renderbuffer: HydTexture) {
        return renderbuffer instanceof HydTexture;
    }

    isProgram(program: HydProgram) {
        return program instanceof HydProgram;
    }

    isShader(shader: HydShader) {
        return shader instanceof HydShader;
    }

    isVertexArray(vertexArray: HydVertexArray) {
        return vertexArray instanceof HydVertexArray;
    }

    polygonOffset(x: number, y: number) {
        this.hydGlobalState.polygonState.polygonOffsetFactor = x;
        this.hydGlobalState.polygonState.polygonOffsetUnits = y;
    }

    shaderSource(shader: HydShader, source: string) {
        shader.sourceLength = source.length;
        shader.glsl_shader = source.trim();
    }


    uniform1f(pub: ProgramUniformBuffer, x0: number) {
        this.hydGlobalState.commonState.currentProgram.uniformArrayBufferTempView.setFloat32(pub.offset, x0, true);
    }
    uniform2f(pub: ProgramUniformBuffer, x0: number, x1: number) {
        this.hydGlobalState.commonState.currentProgram.uniformArrayBufferTempView.setFloat32(pub.offset, x0, true);
        this.hydGlobalState.commonState.currentProgram.uniformArrayBufferTempView.setFloat32(pub.offset + 4, x1, true);
    }
    uniform3f(pub: ProgramUniformBuffer, x0: number, x1: number, x2: number) {
        const a = this.hydGlobalState.commonState.currentProgram.uniformArrayBufferTempView;
        a.setFloat32(pub.offset, x0, true);
        a.setFloat32(pub.offset + 4, x1, true);
        a.setFloat32(pub.offset + 8, x2, true);
    }
    uniform4f(pub: ProgramUniformBuffer, x0: number, x1: number, x2: number, x3: number) {
        const a = this.hydGlobalState.commonState.currentProgram.uniformArrayBufferTempView;
        a.setFloat32(pub.offset, x0, true);
        a.setFloat32(pub.offset + 4, x1, true);
        a.setFloat32(pub.offset + 8, x2, true);
        a.setFloat32(pub.offset + 12, x3, true);
    }
    uniform1i(uniform: ProgramUniformBuffer | ProgramUniformSampler, x0: number) {
        if (uniform instanceof ProgramUniformSampler) {
            if (uniform.textureUnit !== x0) {
                uniform.textureUnit = x0;
                this.hydGlobalState.recordTransition("uniformSampler", uniform.name, x0);
            }
            return;
        }
        this.hydGlobalState.commonState.currentProgram.uniformArrayBufferTempView.setInt32(uniform.offset, x0, true);
    }
    uniform2i(pub: ProgramUniformBuffer, x0: number, x1: number) {
        this.hydGlobalState.commonState.currentProgram.uniformArrayBufferTempView.setInt32(pub.offset, x0, true);
        this.hydGlobalState.commonState.currentProgram.uniformArrayBufferTempView.setInt32(pub.offset + 4, x1, true);
    }
    uniform3i(pub: ProgramUniformBuffer, x0: number, x1: number, x2: number) {
        const a = this.hydGlobalState.commonState.currentProgram.uniformArrayBufferTempView;
        a.setInt32(pub.offset, x0, true);
        a.setInt32(pub.offset + 4, x1, true);
        a.setInt32(pub.offset + 8, x2, true);
    }
    uniform4i(pub: ProgramUniformBuffer, x0: number, x1: number, x2: number, x3: number) {
        const a = this.hydGlobalState.commonState.currentProgram.uniformArrayBufferTempView;
        a.setInt32(pub.offset, x0, true);
        a.setInt32(pub.offset + 4, x1, true);
        a.setInt32(pub.offset + 8, x2, true);
        a.setInt32(pub.offset + 12, x3, true);
    }

    uniform1fv(pub: ProgramUniformBuffer, v: Float32Array) {
        this.hydGlobalState.commonState.currentProgram.write_uniform_f(pub.offset, v.length, v);
    }
    uniform2fv(pub: ProgramUniformBuffer, v: Float32Array) {
        this.hydGlobalState.commonState.currentProgram.write_uniform_f(pub.offset, v.length, v);
    }
    uniform3fv(pub: ProgramUniformBuffer, v: Float32Array) {
        this.hydGlobalState.commonState.currentProgram.write_uniform_f(pub.offset, v.length, v);
    }
    uniform4fv(pub: ProgramUniformBuffer, v: Float32Array) {
        this.hydGlobalState.commonState.currentProgram.write_uniform_f(pub.offset, v.length, v);
    }

    uniform1iv(pub: ProgramUniformBuffer, v: Int32Array) {
        this.hydGlobalState.commonState.currentProgram.write_uniform_i(pub.offset, v.length, v);
    }
    uniform2iv(pub: ProgramUniformBuffer, v: Int32Array) {
        this.hydGlobalState.commonState.currentProgram.write_uniform_i(pub.offset, v.length, v);
    }
    uniform3iv(pub: ProgramUniformBuffer, v: Int32Array) {
        this.hydGlobalState.commonState.currentProgram.write_uniform_i(pub.offset, v.length, v);
    }
    uniform4iv(pub: ProgramUniformBuffer, v: Int32Array) {
        this.hydGlobalState.commonState.currentProgram.write_uniform_i(pub.offset, v.length, v);
    }

    uniformMatrix2fv(pub: ProgramUniformBuffer, transpose: boolean, v: Float32Array) {
        this.hydGlobalState.commonState.currentProgram.write_uniform_f(pub.offset, v.length, v);
    }
    uniformMatrix3fv(pub: ProgramUniformBuffer, transpose: boolean, v: Float32Array) {
        this.hydGlobalState.commonState.currentProgram.write_uniform_f(pub.offset, v.length, v);
    }
    uniformMatrix4fv(pub: ProgramUniformBuffer, transpose: boolean, v: Float32Array) {
        this.hydGlobalState.commonState.currentProgram.write_uniform_f(pub.offset, v.length, v);
    }

    createProgram() {
        return new HydProgram(this.hydDevice, this.shaderTranslator);
    }

    createShader(type: GLenum) {
        return new HydShader(this.hydDevice, type, this.shaderTranslator);
    }

    createBuffer() {
        return new HydBuffer(this.hydDevice);
    }

    createTexture() {
        return new HydTexture(this.hydDevice);
    }

    createFramebuffer(): HydFramebuffer {
        return new HydFramebuffer();
    }

    createRenderbuffer(): HydTexture {
        return new HydTexture(this.hydDevice);
    }

    createVertexArray() {
        return new HydVertexArray();
    }

    private currentTexture(target: GLenum): HydTexture {
        const viewDimension = enumToViewDimension.get(target);
        const texture = viewDimension
            ? this.hydGlobalState.getTextureUnitBinding(this.hydGlobalState.commonState.activeTextureUnit, viewDimension)
            : null;
        if (!texture) {
            this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_OPERATION;
            throw new Error("No texture bound to active texture unit");
        }
        return texture;
    }

    private isSupportedTextureUploadFormat(internalformat: GLenum, format: GLenum, type: GLenum): boolean {
        return ((internalformat === WebGL2RenderingContext.RGBA || internalformat === WebGL2RenderingContext.RGBA8) && format === WebGL2RenderingContext.RGBA && (type === WebGL2RenderingContext.UNSIGNED_BYTE || type === WebGL2RenderingContext.FLOAT))
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
        if (target === WebGL2RenderingContext.RENDERBUFFER) {
            this.hydGlobalState.commonState.renderbufferBinding = renderbuffer;
        } else {
            console.warn("unknown target: " + target);
        }
        this.hydGlobalState.recordTransition("bindRenderbuffer", target, renderbuffer ? renderbuffer.hash : "null");
    }

    renderbufferStorage(target: GLenum, internalFormat: GLenum, width: GLsizei, height: GLsizei) {
        if (target === WebGL2RenderingContext.RENDERBUFFER) {
            const renderbuffer = this.hydGlobalState.commonState.renderbufferBinding;
            if (!renderbuffer) {
                this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_OPERATION;
                throw new Error("renderbufferStorage called with no renderbuffer bound");
            }
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
        this.updateCanvasSize();
        this._der_flush();
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
        const hydBuffer = this.normalizeBuffer(buffer);
        if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER) {
            if (this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding !== hydBuffer) {
                this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding = hydBuffer;
                this.hydGlobalState.recordTransition("bindBuffer", target, hydBuffer ? hydBuffer.hash : "null");
            }
        } else if (target === WebGL2RenderingContext.ARRAY_BUFFER) {
            if (this.hydGlobalState.commonState.arrayBufferBinding !== hydBuffer) {
                this.hydGlobalState.commonState.arrayBufferBinding = hydBuffer;
                this.hydGlobalState.recordTransition("bindBuffer", target, hydBuffer ? hydBuffer.hash : "null");
            }
        } else {
            throw new Error("unsupported buffer target: " + target);
        }
    }

    bufferData(target: GLenum, data: GLsizeiptr | ArrayBuffer | TypedArray, usage: GLenum) {
        this._der_flush();
        // const [target, data, usage] = args;
        let buffer: HydBuffer;
        if (target === WebGL2RenderingContext.ARRAY_BUFFER) {
            buffer = this.hydGlobalState.commonState.arrayBufferBinding;
            if (!buffer) {
                this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_OPERATION;
                throw new Error("bufferData called with no ARRAY_BUFFER bound");
            }
            buffer.descriptor.usage |= GPUBufferUsage.VERTEX;
        } else if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER) {
            buffer = this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
            if (!buffer) {
                this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_OPERATION;
                throw new Error("bufferData called with no ELEMENT_ARRAY_BUFFER bound");
            }
            buffer.descriptor.usage |= GPUBufferUsage.INDEX;
        } else {
            throw new Error("unsupported buffer target: " + target);
        }

        if (typeof data === 'number') {
            buffer.descriptor.size = (data + 3) & (~3);
            buffer.write();
        } else {
            buffer.descriptor.size = (data.byteLength + 3) & (~3);
            buffer.write(data, 0);
        }

        if (usage !== WebGL2RenderingContext.STATIC_DRAW && usage !== WebGL2RenderingContext.DYNAMIC_DRAW && usage !== WebGL2RenderingContext.STREAM_DRAW) {
            throw new Error("unsupported buffer usage: " + usage);
        }
    }

    bufferSubData(target: GLenum, dstOffset: GLintptr, data: ArrayBuffer | TypedArray) {
        let buffer: HydBuffer;
        if (target === WebGL2RenderingContext.ARRAY_BUFFER) {
            buffer = this.hydGlobalState.commonState.arrayBufferBinding;
            if (!buffer) {
                this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_OPERATION;
                throw new Error("bufferSubData called with no ARRAY_BUFFER bound");
            }
        } else if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER) {
            buffer = this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
            if (!buffer) {
                this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_OPERATION;
                throw new Error("bufferSubData called with no ELEMENT_ARRAY_BUFFER bound");
            }
        } else {
            throw new Error("unsupported buffer target: " + target);
        }
        buffer.write(data, dstOffset);
    }

    getActiveUniform(program: HydProgram, index: GLuint): HydActiveUniformInfo {
        const publicUniforms = program.hydUniforms.filter((uniform) => !uniform.internal);
        if (index < publicUniforms.length) {
            return {
                name: publicUniforms[index].name,
                size: publicUniforms[index].size,
                type: publicUniforms[index].webgl_type,
            };
        } else {
            return {
                name: program.hydSamplers[index - publicUniforms.length].name,
                size: program.hydSamplers[index - publicUniforms.length].size,
                type: program.hydSamplers[index - publicUniforms.length].webgl_type,
            };
        }
    }

    getUniformIndices(program: HydProgram, uniformNames: string[]): GLuint[] {
        const publicUniforms = program.hydUniforms.filter((uniform) => !uniform.internal);
        return uniformNames.map((name) => {
            const uniformIndex = publicUniforms.findIndex((uniform) => uniform.name === name);
            if (uniformIndex >= 0) {
                return uniformIndex;
            }
            const samplerIndex = program.hydSamplers.findIndex((sampler) => sampler.name === name);
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
                    this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_ENUM;
                    return null;
            }
        });
    }

    getActiveAttrib(program: HydProgram, index: GLuint): HydActiveUniformInfo {
        return {
            name: program.hydAttributes[index].name,
            size: program.hydAttributes[index].size,
            type: program.hydAttributes[index].type,
        }
    }

    attachShader(program: HydProgram, shader: HydShader) {
        program.attachShader(shader);
    }

    compileShader(s: HydShader) {
        const shader = GLOB_GL_CTX.createShader(s.type);
        GLOB_GL_CTX.shaderSource(shader, s.glsl_shader);
        GLOB_GL_CTX.compileShader(shader);
        s.translated_glsl_shader = GLOB_GL_CTX.getExtension('WEBGL_debug_shaders').getTranslatedShaderSource(shader);
        s.compileShader();
    }

    useProgram(program: HydProgram) {
        if (this.hydGlobalState.commonState.currentProgram !== program) {
            // this.flush();
            this.hydGlobalState.commonState.currentProgram = program;
            this.hydGlobalState.recordTransition("useProgram", program.hash);
        }
    }

    linkProgram(program: HydProgram) {
        program.linkProgram();
    }

    bindVertexArray(vertexArray: HydVertexArray | null) {
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
            this.hydGlobalState.recordTransition("activeTexture", target.toString());
        }
    }

    bindTexture(target: GLenum, texture: HydTexture | object | null) {
        const vd = enumToViewDimension.get(target);
        if (!vd) {
            this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_ENUM;
            return;
        }
        const hydTexture = this.normalizeTexture(texture);
        if (hydTexture === null) {
            this.hydGlobalState.setTextureUnitBinding(this.hydGlobalState.commonState.activeTextureUnit, vd, null);
            this.hydGlobalState.recordTransition("bindTexture", target, "null");
            return;
        }
        hydTexture.viewDimension = vd;
        this.hydGlobalState.setTextureUnitBinding(this.hydGlobalState.commonState.activeTextureUnit, vd, hydTexture);
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
        this.hydGlobalState.recordTransition("texImage2D", target, level, internalformat, width, height, border, format, type);
    }

    texSubImage2D(...args: Array<any>) {
        this._der_flush();
        console.assert(args.length === 7 || args.length === 9);
        const target: GLenum = args.at(0);
        const level: GLint = args.at(1);
        const xoffset: GLint = args.at(2);
        const yoffset: GLint = args.at(3);
        let width: GLsizei;
        let height: GLsizei;
        let format: GLenum;
        let type: GLenum;
        let pixels: ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap | TypedArray;
        if (args.length === 7) {
            format = args.at(4);
            type = args.at(5);
            pixels = args.at(6);
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
        }
        if (!this.isSupportedTextureUploadFormat(format, format, type)) {
            throw new Error("unsupported texSubImage2D: " + args);
        }
        const unpack: HydPixelUnpackState = this.hydGlobalState.miscState.unpackState;
        this.currentTexture(target).texSubImage2D(pixels, target, level, xoffset, yoffset, width, height, format, type, unpack);
        this.hydGlobalState.recordTransition("texSubImage2D", target, level, xoffset, yoffset, width, height, format, type);
    }

    texImage3D(...args: Array<any>) {
        this._der_flush();
        // gl.texImage3D( target, 0, gl.RGBA, 1, 1, dimensions, 0, gl.RGBA, gl.UNSIGNED_BYTE, data );
        if (args.length === 10) {
            args.push(0);
        }
        console.assert(args.length === 11);
        const [target, level, internalformat, width, height, depth, border, format, type, pixels, offset] = args;
        if (pixels instanceof HTMLVideoElement
            || border !== 0
        ) {
            throw new Error("unsupported texImage3D: " + args);
        }
        this.currentTexture(target).texImage3D(pixels, target, level, internalformat, width, height, depth, border, format, type, offset);
        this.hydGlobalState.recordTransition("texImage3D", target, level, internalformat, width, height, depth, border, format, type, offset);
    }

    texParameteri(target: GLenum, pname: GLenum, param: GLfloat | GLint) {
        const texture = this.currentTexture(target);
        console.assert(enumToViewDimension.get(target)! === texture.viewDimension);
        texture.texParameteri(pname, param);
        this.hydGlobalState.recordTransition("texParameteri", target, pname, param);
    }

    generateMipmap(target: GLenum) {
        console.assert(target === WebGL2RenderingContext.TEXTURE_2D || target === WebGL2RenderingContext.TEXTURE_CUBE_MAP);
        this.currentTexture(target);
        this.hydGlobalState.recordTransition("generateMipmap", target);
    }

    getTexParameter(target: GLenum, pname: GLenum) {
        const texture = this.currentTexture(target);
        const state = texture.state;
        switch (pname) {
            case WebGL2RenderingContext.TEXTURE_MIN_FILTER:
                return state.minFilter;
            case WebGL2RenderingContext.TEXTURE_MAG_FILTER:
                return state.magFilter;
            case WebGL2RenderingContext.TEXTURE_WRAP_S:
                return state.wrapS;
            case WebGL2RenderingContext.TEXTURE_WRAP_T:
                return state.wrapT;
            case WebGL2RenderingContext.TEXTURE_WRAP_R:
                return state.wrapR;
            default:
                throw new Error("unsupported getTexParameter: " + target + ", " + pname);
        }
    }

    viewport(x: GLint, y: GLint, width: GLsizei, height: GLsizei) {
        const viewport = this.hydGlobalState.commonState.viewport;
        if (viewport[0] !== x || viewport[1] !== y || viewport[2] !== width || viewport[3] !== height) {
            this._der_flush();
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
        }
        this.hydGlobalState.miscState.scissorBox = [x, y, width, height];
        this.hydGlobalState.recordTransition("scissor", x, y, width, height);
    }

    depthRange(zNear: number, zFar: number) {
        const viewport = this.hydGlobalState.commonState.viewport;
        if (viewport[4] !== zNear || viewport[5] !== zFar) {
            this._der_flush();
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
            const format = getVertexFormat(type, size, normalized);
            attribute.size = size;
            attribute.type = type;
            attribute.normalized = normalized;
            attribute.int = false;
            attribute.stride = stride;
            attribute.offset = offset;
            attribute.buffer = buffer;
            attribute.shaderLocation = index;
            attribute.format = format;
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
                }
                break;
            case WebGL2RenderingContext.POLYGON_OFFSET_FILL:
                this.hydGlobalState.polygonState.polygonOffsetFill = value;
                break;
            case WebGL2RenderingContext.SAMPLE_ALPHA_TO_COVERAGE:
                console.error("unimplemented: SAMPLE_ALPHA_TO_COVERAGE");
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
        this.hydGlobalState.stencilState.frontValueMask = mask;
        this.hydGlobalState.stencilState.backFunc = enumToCompareFunction.get(func);
        this.hydGlobalState.stencilState.backRef = ref;
        this.hydGlobalState.stencilState.backValueMask = mask;
        this.hydGlobalState.recordTransition("stencilFunc", func, ref, mask);
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

    bindFramebuffer(target: GLenum, framebuffer: HydFramebuffer | null) {
        this._der_flush();
        if (framebuffer === null) {
            framebuffer = this.hydGlobalState.defaultFramebuffer;
        }
        if (target === WebGL2RenderingContext.FRAMEBUFFER) {
            this.hydGlobalState.commonState.drawFramebufferBinding = framebuffer;
            this.hydGlobalState.commonState.readFramebufferBinding = framebuffer;
        } else if (target === WebGL2RenderingContext.DRAW_FRAMEBUFFER) {
            this.hydGlobalState.commonState.drawFramebufferBinding = framebuffer;
        } else if (target === WebGL2RenderingContext.READ_FRAMEBUFFER) {
            this.hydGlobalState.commonState.readFramebufferBinding = framebuffer;
        } else {
            throw new Error("unsupported bindFramebuffer: " + target);
        }
        this.hydGlobalState.recordTransition("bindFramebuffer", target, framebuffer.hash);
    }

    framebufferTexture2D(target: GLenum, attachment: GLenum, texTarget: GLenum, texture: HydTexture | null, level: GLint) {
        this._der_flush();
        const framebuffer = this.getFramebufferForTarget(target);
        if (texture === null) {
            framebuffer.attachments.delete(attachment);
            framebuffer.resetHash();
            this.hydGlobalState.recordTransition("framebufferTexture2D", target, attachment, texTarget, "null", level);
            return;
        }

        texture.markFramebufferRenderTarget();
        const attrib = new FramebufferAttributes(attachment, level, texTarget, texture);
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
        this.hydGlobalState.recordTransition("framebufferTexture2D", target, attachment, texTarget, texture.hash, level);
    }

    framebufferTextureLayer(target: GLenum, attachment: GLenum, texture: HydTexture | null, level: GLint, layer: GLint) {
        this._der_flush();
        const framebuffer = this.getFramebufferForTarget(target);
        if (texture === null) {
            framebuffer.attachments.delete(attachment);
            framebuffer.resetHash();
            this.hydGlobalState.recordTransition("framebufferTextureLayer", target, attachment, "null", level, layer);
            return;
        }

        texture.markFramebufferRenderTarget();
        const attrib = new FramebufferAttributes(attachment, level, undefined, texture, layer);
        framebuffer.attachments.set(attachment, attrib);
        framebuffer.resetHash();
        this.hydGlobalState.recordTransition("framebufferTextureLayer", target, attachment, texture.hash, level, layer);
    }

    framebufferRenderbuffer(target: GLenum, attachment: GLenum, renderbufferTarget: GLenum, renderbuffer: HydTexture | null) {
        this._der_flush();
        console.assert(renderbufferTarget === WebGL2RenderingContext.RENDERBUFFER);
        const framebuffer = this.getFramebufferForTarget(target);
        if (renderbuffer === null) {
            framebuffer.attachments.delete(attachment);
            framebuffer.resetHash();
            this.hydGlobalState.recordTransition("framebufferRenderbuffer", target, attachment, renderbufferTarget, "null");
            return;
        }

        renderbuffer.markFramebufferRenderTarget();
        const attrib: FramebufferAttributes = new FramebufferAttributes(attachment, undefined, undefined, renderbuffer);
        framebuffer.attachments.set(attachment, attrib);
        framebuffer.resetHash();
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
        this.hydGlobalState.recordTransition("copyTexImage2D", target, level, internalformat, x, y, width, height, border);
    }

    copyTexSubImage2D(target: GLenum, level: GLint, xoffset: GLint, yoffset: GLint, x: GLint, y: GLint, width: GLsizei, height: GLsizei) {
        this._der_flush();
        this.currentTexture(target).markCopyDestination();
        this.hydGlobalState.recordTransition("copyTexSubImage2D", target, level, xoffset, yoffset, x, y, width, height);
    }

    readPixels(x: GLint, y: GLint, width: GLsizei, height: GLsizei, format: GLenum, type: GLenum, pixels: ArrayBufferView | null) {
        this._der_flush();
        if (pixels && "byteLength" in pixels) {
            new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength).fill(0);
        }
        this.hydGlobalState.recordTransition("readPixels", x, y, width, height, format, type);
    }

    drawBuffers(buffers: Array<GLenum>) {
        this.hydGlobalState.commonState.drawFramebufferBinding.drawBuffers = buffers;
        this.hydGlobalState.commonState.drawFramebufferBinding.resetHash();
        this.hydGlobalState.recordTransition("drawBuffers", ...buffers);
    }

    pixelStorei(pname: GLenum, param: GLint | GLboolean) {
        const value = typeof param === "boolean" ? (param ? 1 : 0) : param;
        switch (pname) {
            case WebGL2RenderingContext.UNPACK_FLIP_Y_WEBGL:
                this.hydGlobalState.miscState.unpackFlipYWebGL = value !== 0;
                this.hydGlobalState.recordTransition("pixelStorei", pname, value);
                return;
            case WebGL2RenderingContext.UNPACK_ALIGNMENT:
                if (!VALID_PIXEL_ALIGNMENT.has(value)) {
                    this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_VALUE;
                    return;
                }
                this.hydGlobalState.miscState.unpackAlignment = value;
                this.hydGlobalState.recordTransition("pixelStorei", pname, value);
                return;
            case WebGL2RenderingContext.PACK_ALIGNMENT:
                if (!VALID_PIXEL_ALIGNMENT.has(value)) {
                    this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_VALUE;
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

    private updateSamplerOriginUniforms(program: HydProgram) {
        for (const sampler of program.hydSamplers) {
            if (!sampler.originFlipUniform) {
                continue;
            }
            const texture = this.hydGlobalState.getTextureUnitBinding(sampler.textureUnit, sampler.viewDimension);
            const flipY = texture && (texture.sourceOrigin === "render-target" || texture.sourceOrigin === "copy") ? 1 : 0;
            program.write_uniform_f(sampler.originFlipUniform.offset, 1, [flipY]);
        }
    }

    private setPBV() {
        this.updateCanvasSize();
        ensureAutoFrame();
        // this.renderPassInfo.endPass();

        const program = this.hydGlobalState.commonState.currentProgram;
        this.updateSamplerOriginUniforms(program);

        /* set renderPass */
        // const [renderPassHash, renderPassDescriptor] = this.globalState.getRenderPassDescriptor(this._canvasView);

        const {pipelineHash, pipeline, bindGroupHash: _bindGroupHash, bindGroup, vertexBuffersHash, vertexBufferHashes, vertexBuffers, vertexBufferOffsets, renderPassHash, renderBundleEncoderDescriptor} = this.hydGlobalState.getPBV();
        this.hydRpCache.RpSetDescriptor(renderPassHash, renderBundleEncoderDescriptor, this.bindedGetRenderPassDesc);
        this.hydRpCache.RpSetViewport(this.toGpuViewport());
        if (this.hydGlobalState.miscState.scissorTest) {
            this.hydRpCache.RpSetScissorRect(this.toGpuScissorRect());
        }
        if (this.hydGlobalState.stencilState.enabled) {
            this.hydRpCache.RpSetStencilReference(this.hydGlobalState.stencilState.frontRef);
        }
        if (this.hydGlobalState.blendState.enabled) {
            this.hydRpCache.RpSetBlendConstant(this.hydGlobalState.blendState.color);
        }
        this.hydRpCache.RpSetPipeline(pipelineHash, pipeline);
        this.hydRpCache.RpSetBindGroup(bindGroup, program.alignedUniformSize > 0 ? this.hydUniOff : null);
        this.hydRpCache.RpSetVertexBuffers(vertexBuffersHash, vertexBufferHashes, vertexBuffers, vertexBufferOffsets);

        this.hydUniOff = program.setUniform(this.hydUniArr, this.hydUniOff);
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
        const topology = enum2PT[mode];
        if (this.hydGlobalState.topology !== topology) {
            this.hydGlobalState.topology = topology;
            this.hydGlobalState.recordTransitionOne(topology);
        }

        const elementArrayBuffer = this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
        if (!elementArrayBuffer || !elementArrayBuffer.buffer) {
            this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_OPERATION;
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
        const topology = enum2PT[mode];
        if (this.hydGlobalState.topology !== topology) {
            this.hydGlobalState.topology = topology;
            this.hydGlobalState.recordTransitionOne(topology);
        }

        const elementArrayBuffer = this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
        if (!elementArrayBuffer || !elementArrayBuffer.buffer) {
            this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_OPERATION;
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
