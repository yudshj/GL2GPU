import {
    HydActiveUniformInfo,
    // TTurboMode,
} from "../types";
import { HydRenderPassCache } from "./hydRenderPassCache";
import {
    HydGlobalStateHashed,
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
import { InitShaderInfoType } from "./shaderDB";

const GLOB_GL_CTX = document.createElement('canvas').getContext('webgl2');
const frameBeginFuncLst = [];
const frameEndFuncList = [];

export function beginFrame() {
    frameBeginFuncLst.forEach((func) => func());
}

export function endFrame() {
    frameEndFuncList.forEach((func) => func());
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
    private shaderMap: Map<string, InitShaderInfoType>;

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

        // console.log("canvas resized, last:", this._lastCanvasSize, "new:", [width, height]);
        this.hydGlobalState.miscState.scissorBox = [0, 0, width, height];
        this.hydGlobalState.commonState.viewport = [0, 0, width, height, 0, 1];

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
    }
    constructor(_canvas: HTMLCanvasElement, _gpuctx: GPUCanvasContext, _attributes: WebGLContextAttributes, _device: GPUDevice, _maxUniformSize: number, _replay: number, shaderMap: Map<string, InitShaderInfoType>) {
        this.shaderMap = shaderMap;
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
        this.hydGlobalState.__canvasView = this.hydGpuctx.getCurrentTexture().createView({ label: 'canvasView' });
    }

    bindAttribLocation() {
        console.warn("skipping bindAttribLocation");
    }

    getError() {
        return this.hydGlobalState.glError;
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
                case WebGL2RenderingContext.SCISSOR_BOX:
                    return new Int32Array(this.hydGlobalState.miscState.scissorBox);
                case WebGL2RenderingContext.SCISSOR_TEST:
                    return this.hydGlobalState.miscState.scissorTest;
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
            }
            throw new Error("unhandled getParameter: " + pname);
        }
    }

    getContextAttributes() {
        return this.hydGlobalState.contextAttributes;
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
                return program.hydUniforms.length + program.hydSamplers.length; // 0824
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
        console.warn("extension required: " + extensionName);
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

    getAttribLocation(program: HydProgram, attribName: string) {
        const ret = program.hydAttributes.findIndex((attrib) => attrib.name === attribName);
        if (ret === -1) {
            throw new Error("attrib not found: " + attribName + " in program: " + program);
        }
        return ret;
    }

    getUniformLocation(program: HydProgram, uniformName: string) {
        // return program.uniforms.findIndex((uniform) => uniform.name === uniformName);
        const ret = program.hydUniforms.find((uniform) => uniform.name === uniformName) || program.hydSamplers.find((sampler) => sampler.name === uniformName);
        if (ret) {
            return ret;
        } else {
            // throw new Error("uniform not found: " + uniformName);
            console.error("uniform not found: " + uniformName);
        }
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
            uniform.textureUnit = x0;
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
        return new HydProgram(this.hydDevice);
    }

    createShader(type: GLenum) {
        return new HydShader(this.hydDevice, type, this.shaderMap);
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

    bindRenderbuffer(target: GLenum, renderbuffer: HydTexture) {
        if (target === WebGL2RenderingContext.RENDERBUFFER) {
            this.hydGlobalState.commonState.renderbufferBinding = renderbuffer;
        } else {
            console.warn("unknown target: " + target);
        }
        this.hydGlobalState.recordTransition("bindRenderbuffer", target, renderbuffer.hash);
    }

    renderbufferStorage(target: GLenum, internalFormat: GLenum, width: GLsizei, height: GLsizei) {
        if (target === WebGL2RenderingContext.RENDERBUFFER) {
            switch (internalFormat) {
                case WebGL2RenderingContext.DEPTH_COMPONENT16:
                    this.hydGlobalState.commonState.renderbufferBinding.renderbufferStorage('depth16unorm', width, height);
                    break;
                case WebGL2RenderingContext.DEPTH_COMPONENT24:
                    this.hydGlobalState.commonState.renderbufferBinding.renderbufferStorage('depth24plus', width, height);
                    break;
                case WebGL2RenderingContext.DEPTH24_STENCIL8:
                    this.hydGlobalState.commonState.renderbufferBinding.renderbufferStorage('depth24plus-stencil8', width, height);
                    break;
                case WebGL2RenderingContext.DEPTH_COMPONENT32F:
                    this.hydGlobalState.commonState.renderbufferBinding.renderbufferStorage('depth32float', width, height);
                    break;
                case WebGL2RenderingContext.STENCIL_INDEX8:
                    this.hydGlobalState.commonState.renderbufferBinding.renderbufferStorage('stencil8', width, height);
                    break;
                case WebGL2RenderingContext.RGBA32F:
                    this.hydGlobalState.commonState.renderbufferBinding.renderbufferStorage('rgba32float', width, height);
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
        if (this.hydGlobalState.clearState.target !== mask) {
            this.hydGlobalState.clearState.target = mask;
            this.hydGlobalState.recordTransition("clear", mask);
        }
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

    bindBuffer(target: GLenum, buffer: HydBuffer) {
        if (buffer === null) return;
        if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER) {
            if (this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding !== buffer) {
                this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding = buffer;
                this.hydGlobalState.recordTransitionOne(buffer.hash);
            }
        } else if (target === WebGL2RenderingContext.ARRAY_BUFFER) {
            if (this.hydGlobalState.commonState.arrayBufferBinding !== buffer) {
                this.hydGlobalState.commonState.arrayBufferBinding = buffer;
                this.hydGlobalState.recordTransitionOne(buffer.hash);
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
            buffer.descriptor.usage |= GPUBufferUsage.VERTEX;
        } else if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER) {
            buffer = this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
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
        } else if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER) {
            buffer = this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
        } else {
            throw new Error("unsupported buffer target: " + target);
        }
        buffer.write(data, dstOffset);
    }

    getActiveUniform(program: HydProgram, index: GLuint): HydActiveUniformInfo {
        if (index < program.hydUniforms.length) {
            return {
                name: program.hydUniforms[index].name,
                size: program.hydUniforms[index].size,
                type: program.hydUniforms[index].webgl_type,
            };
        } else {
            return {
                name: program.hydSamplers[index - program.hydUniforms.length].name,
                size: program.hydSamplers[index - program.hydUniforms.length].size,
                type: program.hydSamplers[index - program.hydUniforms.length].webgl_type,
            };
        }
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

    bindTexture(target: GLenum, texture: HydTexture) {
        if (texture === null) return;
        const vd = enumToViewDimension.get(target);
        texture.viewDimension = vd;
        this.hydGlobalState.textureUnits[this.hydGlobalState.commonState.activeTextureUnit] = texture;
        this.hydGlobalState.recordTransitionOne(texture.hash);
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
        const pixels: ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap | TypedArray = args.at(-1);
        if (args.length === 6) {
            if ("width" in pixels && "height" in pixels) {
                width = pixels.width;
                height = pixels.height;
            } else {
                throw new Error("unsupported texImage2D: " + args);
            }
        } else {
            width = args.at(3);
            height = args.at(4);
        }
        if (pixels instanceof HTMLVideoElement
            // || border !== 0
            || !((internalformat === WebGL2RenderingContext.RGBA && format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.UNSIGNED_BYTE)
                || (internalformat === WebGL2RenderingContext.DEPTH_COMPONENT32F && format === WebGL2RenderingContext.DEPTH_COMPONENT && type === WebGL2RenderingContext.FLOAT)
                || (internalformat === WebGL2RenderingContext.LUMINANCE && format === WebGL2RenderingContext.LUMINANCE && type === WebGL2RenderingContext.UNSIGNED_BYTE)
                || (internalformat === WebGL2RenderingContext.RGB && format === WebGL2RenderingContext.RGB && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            )
        ) {
            throw new Error("unsupported texImage2D: " + args);
        }
        this.hydGlobalState.textureUnits[this.hydGlobalState.commonState.activeTextureUnit].texImage2D(pixels, target, level, internalformat, width, height, border, format, type);
        this.hydGlobalState.recordTransition("texImage2D", target, level, internalformat, width, height, border, format, type);
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
        this.hydGlobalState.textureUnits[this.hydGlobalState.commonState.activeTextureUnit].texImage3D(pixels, target, level, internalformat, width, height, depth, border, format, type, offset);
        this.hydGlobalState.recordTransition("texImage3D", target, level, internalformat, width, height, depth, border, format, type, offset);
    }

    texParameteri(target: GLenum, pname: GLenum, param: GLfloat | GLint) {
        console.assert(enumToViewDimension.get(target)! === this.hydGlobalState.textureUnits[this.hydGlobalState.commonState.activeTextureUnit].viewDimension);
        this.hydGlobalState.textureUnits[this.hydGlobalState.commonState.activeTextureUnit].texParameteri(pname, param);
        this.hydGlobalState.recordTransition("texParameteri", target, pname, param);
    }

    generateMipmap(target: GLenum) {
        console.assert(target === WebGL2RenderingContext.TEXTURE_2D || target === WebGL2RenderingContext.TEXTURE_CUBE_MAP);
        // mipLevelCount = Math.floor(Math.log2(Math.max(source.width, source.height))) + 1;
        console.warn("generateMipmap is not implemented");
    }

    viewport(x: GLint, y: GLint, width: GLsizei, height: GLsizei) {
        this.hydGlobalState.commonState.viewport[0] = x;
        this.hydGlobalState.commonState.viewport[1] = y;
        this.hydGlobalState.commonState.viewport[2] = width;
        this.hydGlobalState.commonState.viewport[3] = height;
        this.hydGlobalState.recordTransition("viewport", x, y, width, height);
    }

    depthRange(zNear: number, zFar: number) {
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
                this.hydGlobalState.miscState.scissorTest = value;
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

    framebufferTexture2D(target: GLenum, attachment: GLenum, texTarget: GLenum, texture: HydTexture, level: GLint) {
        console.assert(texTarget === WebGL2RenderingContext.TEXTURE_2D);
        console.assert(target === WebGL2RenderingContext.FRAMEBUFFER);

        const attrib = new FramebufferAttributes(attachment, level, undefined, texture);
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

        this.hydGlobalState.commonState.drawFramebufferBinding.attachments.set(attachment, attrib);
        this.hydGlobalState.defaultFramebuffer.resetHash();
        this.hydGlobalState.recordTransition("framebufferTexture2D", target, attachment, texTarget, texture.hash, level);
    }

    framebufferRenderbuffer(target: GLenum, attachment: GLenum, renderbufferTarget: GLenum, renderbuffer: HydTexture) {
        console.assert(target === WebGL2RenderingContext.FRAMEBUFFER);
        console.assert(renderbufferTarget === WebGL2RenderingContext.RENDERBUFFER);

        const attrib: FramebufferAttributes = new FramebufferAttributes(attachment, undefined, undefined, renderbuffer);
        this.hydGlobalState.commonState.drawFramebufferBinding.attachments.set(attachment, attrib);
        this.hydGlobalState.defaultFramebuffer.resetHash();
        this.hydGlobalState.recordTransition("framebufferRenderbuffer", target, attachment, renderbufferTarget, renderbuffer.hash);
    }

    drawBuffers(buffers: Array<GLenum>) {
        this.hydGlobalState.commonState.drawFramebufferBinding.drawBuffers = buffers;
        this.hydGlobalState.defaultFramebuffer.resetHash();
        this.hydGlobalState.recordTransition("drawBuffers", ...buffers);
    }

    pixelStorei(pname: GLenum, param: GLint) {
        console.warn("pixelStorei not implemented. Args:", pname, param);
    }

    checkFramebufferStatus(): GLenum {
        return WebGL2RenderingContext.FRAMEBUFFER_COMPLETE;
    }

    private setPBV() {
        // this.renderPassInfo.endPass();

        const program = this.hydGlobalState.commonState.currentProgram;

        /* set renderPass */
        // const [renderPassHash, renderPassDescriptor] = this.globalState.getRenderPassDescriptor(this._canvasView);

        const {pipelineHash, pipeline, bindGroupHash: _bindGroupHash, bindGroup, vertexBuffersHash, vertexBufferHashes, vertexBuffers, vertexBufferOffsets, renderPassHash, renderBundleEncoderDescriptor} = this.hydGlobalState.getPBV();
        this.hydRpCache.RpSetDescriptor(renderPassHash, renderBundleEncoderDescriptor, this.bindedGetRenderPassDesc);
        this.hydRpCache.RpSetPipeline(pipelineHash, pipeline);
        this.hydRpCache.RpSetBindGroup(bindGroup, this.hydUniOff);
        this.hydRpCache.RpSetVertexBuffers(vertexBuffersHash, vertexBufferHashes, vertexBuffers, vertexBufferOffsets);

        this.hydUniOff = program.setUniform(this.hydUniArr, this.hydUniOff);
    }

    drawArrays(mode: GLenum, first: GLint, count: GLsizei) {
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

    drawElements(mode: GLenum, count: GLsizei, type: GLenum, offset: GLintptr) {
        const topology = enum2PT[mode];
        if (this.hydGlobalState.topology !== topology) {
            this.hydGlobalState.topology = topology;
            this.hydGlobalState.recordTransitionOne(topology);
        }

        this.setPBV();
        // const indexBuffer = this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding.buffer;
        // const indexFormat = enumToIndexFormat.get(type);
        // const indexCacheKey = indexBuffer.label + '$' + indexFormat;
        // const indexSize = indexEnumToBytes.get(type);

        this.hydRpCache.RpSetIndexBuffer(this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding.buffer, enumToIndexFormat.get(type));
        this.hydRpCache.RpDrawIndexed(count, 1, Math.floor(offset / indexEnumToBytes.get(type)), 0, 0);

        if (this.hydUniOff >= this.hydMaxUniSize) {
            this._der_flush();
        }

        if (this.hydGlobalState.clearState.target !== 0) {
            this.hydGlobalState.clearState.target = 0;
            this.hydGlobalState.recordTransitionOne('!!d0');
        }
    }
}
