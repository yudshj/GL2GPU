import { HydHashable } from "./base/hydHashable";
import { HydBuffer } from "./hydBuffer";
import { FramebufferAttributes, HydFramebuffer } from "./hydFramebuffer";
import { HydProgram } from "./hydProgram";
import { HydTexture } from "./hydTexture";
import { HydVertexArray } from "./hydVertexArray";
import fastHashCode from "fast-hash-code";

const CURRENT_VERTEX_ATTRIB_BUFFER_ELEMENTS = 4096;
const TEXTURE_UNIT_BINDING_ORDER: GPUTextureViewDimension[] = ["2d", "cube", "3d", "2d-array", "cube-array"];

export type HydTextureUnitBindings = Partial<Record<GPUTextureViewDimension, HydTexture>>;

function programAttributeTypeToVertexFormat(type: GLenum): GPUVertexFormat {
    switch (type) {
        case WebGL2RenderingContext.FLOAT:
            return 'float32';
        case WebGL2RenderingContext.FLOAT_VEC2:
            return 'float32x2';
        case WebGL2RenderingContext.FLOAT_VEC3:
            return 'float32x3';
        case WebGL2RenderingContext.FLOAT_VEC4:
            return 'float32x4';
        default:
            return 'float32x4';
    }
}

// export class ViewportState {
//     x: number;
//     y: number;
//     width: number;
//     height: number;
//     minDepth: number;
//     maxDepth: number;
//     constructor(width: number, height: number) {
//         this.x = 0;
//         this.y = 0;
//         this.width = width;
//         this.height = height;
//         this.minDepth = 0;
//         this.maxDepth = 1;
//     }
// }

export type ViewportState = [number, number, number, number, number, number];

export class CommonState implements HydHashable {
    activeTextureUnit: number; // TODO: 这个是否不需要放到hash里？
    viewport: ViewportState;
    arrayBufferBinding: HydBuffer;  // TODO: 这个是否不需要放到hash里？
    pixelPackBufferBinding: HydBuffer;
    pixelUnpackBufferBinding: HydBuffer;
    currentProgram: HydProgram;
    vertexArrayBinding: HydVertexArray;
    renderbufferBinding: HydTexture;
    drawFramebufferBinding: HydFramebuffer;
    readFramebufferBinding: HydFramebuffer;
    public get hash(): string {
        let ret = this.activeTextureUnit.toString()
            + this.viewport.join(',')
            + this.vertexArrayBinding.hash
            + this.drawFramebufferBinding.hash
            + this.readFramebufferBinding.hash;
        if (this.arrayBufferBinding) {
            ret += this.arrayBufferBinding.hash;
        }
        if (this.pixelPackBufferBinding) {
            ret += this.pixelPackBufferBinding.hash;
        }
        if (this.pixelUnpackBufferBinding) {
            ret += this.pixelUnpackBufferBinding.hash;
        }
        if (this.renderbufferBinding) {
            ret += this.renderbufferBinding.hash;
        }
        if (this.currentProgram) {
            ret += this.currentProgram.hash;
            ret += this.currentProgram.hydSamplers.map((sampler) => `${sampler.name}:${sampler.textureUnit}`).join('|');
        }
        return ret;
    }
    constructor(
        activeTextureUnit: number,
        viewport: ViewportState,
        arrayBufferBinding: HydBuffer,
        currentProgram: HydProgram,
        vertexArrayBinding: HydVertexArray,
        drawFramebufferBinding: HydFramebuffer,
        readFramebufferBinding: HydFramebuffer,
        renderbufferBinding: HydTexture
    ) {
        this.activeTextureUnit = activeTextureUnit;
        this.viewport = viewport;
        this.arrayBufferBinding = arrayBufferBinding;
        this.pixelPackBufferBinding = null;
        this.pixelUnpackBufferBinding = null;
        this.currentProgram = currentProgram;
        this.vertexArrayBinding = vertexArrayBinding;
        this.renderbufferBinding = renderbufferBinding;
        this.drawFramebufferBinding = drawFramebufferBinding;
        this.readFramebufferBinding = readFramebufferBinding;
    }
}

export class DepthState implements HydHashable {
    enabled: boolean;
    func: GPUCompareFunction;
    funcEnum: GLenum;
    range: [number, number];
    writeMask: boolean;
    // depthBuffer: HydTexture;
    public get hash(): string {
        return this.enabled.toString() + this.func.toString() + this.range.toString() + this.writeMask.toString();
    }
    constructor() {
        this.enabled = false;
        this.func = 'less';
        this.funcEnum = WebGL2RenderingContext.LESS;
        this.range = [0, 1];
        this.writeMask = true;
    }
}

export class PolygonState implements HydHashable {
    cullFace: boolean;
    cullFaceMode: GPUCullMode;
    cullFaceModeEnum: GLenum;
    frontFace: GPUFrontFace;
    frontFaceEnum: GLenum;
    polygonOffsetFill: boolean;
    polygonOffsetUnits: number;
    polygonOffsetFactor: number;
    public get hash(): string {
        return this.cullFace.toString() + this.cullFaceMode.toString() + this.frontFace.toString() + this.polygonOffsetFill.toString() + this.polygonOffsetUnits.toString() + this.polygonOffsetFactor.toString();
    }
    constructor() {
        this.cullFace = false;
        this.cullFaceMode = 'back';
        this.cullFaceModeEnum = WebGL2RenderingContext.BACK;
        this.frontFace = 'ccw';
        this.frontFaceEnum = WebGL2RenderingContext.CCW;
        this.polygonOffsetFill = false;
        this.polygonOffsetUnits = 0;
        this.polygonOffsetFactor = 0;
    }
}

export class ClearState implements HydHashable {
    color: [number, number, number, number];
    depth: GLuint;
    stencil: GLenum;
    target: number;
    public get hash(): string {
        return this.color.toString() + this.depth.toString() + this.stencil.toString();
    }
    constructor() {
        this.color = [0.0, 0.0, 0.0, 0.0];
        this.depth = 1;
        this.stencil = 0x00;
        this.target = WebGL2RenderingContext.COLOR_BUFFER_BIT | WebGL2RenderingContext.DEPTH_BUFFER_BIT;
    }
}

export class BlendState implements HydHashable {
    enabled: boolean;
    color: [number, number, number, number];
    dstRGB: GPUBlendFactor;
    dstRGBEnum: GLenum;
    srcRGB: GPUBlendFactor;
    srcRGBEnum: GLenum;
    dstAlpha: GPUBlendFactor;
    dstAlphaEnum: GLenum;
    srcAlpha: GPUBlendFactor;
    srcAlphaEnum: GLenum;
    equationRGB: GPUBlendOperation;
    equationRGBEnum: GLenum;
    equationAlpha: GPUBlendOperation;
    equationAlphaEnum: GLenum;
    public get hash(): string {
        return this.enabled.toString() + this.color.toString() + this.dstRGB.toString() + this.srcRGB.toString() + this.dstAlpha.toString() + this.srcAlpha.toString() + this.equationRGB.toString() + this.equationAlpha.toString();
    }
    constructor() {
        this.enabled = false;
        this.dstRGB = 'zero';
        this.dstRGBEnum = WebGL2RenderingContext.ZERO;
        this.dstAlpha = 'zero';
        this.dstAlphaEnum = WebGL2RenderingContext.ZERO;
        this.srcRGB = 'one';
        this.srcRGBEnum = WebGL2RenderingContext.ONE;
        this.srcAlpha = 'one';
        this.srcAlphaEnum = WebGL2RenderingContext.ONE;
        this.color = [0.0, 0.0, 0.0, 0.0];
        this.equationRGB = 'add';
        this.equationRGBEnum = WebGL2RenderingContext.FUNC_ADD;
        this.equationAlpha = 'add';
        this.equationAlphaEnum = WebGL2RenderingContext.FUNC_ADD;
    }
}

export interface HydPixelUnpackState {
    flipY: boolean;
    alignment: number;
    premultiplyAlpha: boolean;
    colorspaceConversion: GLenum;
    unpackColorSpace: "srgb" | "display-p3";
}

export class MiscState implements HydHashable {
    scissorTest: boolean;
    scissorBox: [number, number, number, number];
    colorWriteMask: [boolean, boolean, boolean, boolean];
    unpackFlipYWebGL: boolean;
    unpackPremultiplyAlphaWebGL: boolean;
    unpackColorSpaceConversionWebGL: GLenum;
    unpackColorSpace: "srgb" | "display-p3";
    unpackAlignment: number;
    packAlignment: number;
    sampleAlphaToCoverage: boolean;
    sampleCoverage: boolean;
    sampleCoverageValue: number;
    sampleCoverageInvert: boolean;
    dither: boolean;
    lineWidth: number;
    generateMipmapHint: GLenum;

    public get unpackState(): HydPixelUnpackState {
        return {
            flipY: this.unpackFlipYWebGL,
            alignment: this.unpackAlignment,
            premultiplyAlpha: this.unpackPremultiplyAlphaWebGL,
            colorspaceConversion: this.unpackColorSpaceConversionWebGL,
            unpackColorSpace: this.unpackColorSpace,
        };
    }

    public get hash(): string {
        return this.scissorTest.toString() + this.scissorBox.toString() + this.colorWriteMask.toString() + this.unpackFlipYWebGL.toString() + this.unpackPremultiplyAlphaWebGL.toString() + this.unpackColorSpaceConversionWebGL.toString() + this.unpackColorSpace + this.unpackAlignment.toString() + this.packAlignment.toString() + this.sampleAlphaToCoverage.toString();
    }
    constructor() {
        this.scissorTest = false;
        this.scissorBox = [0, 0, 0, 0]; // [x, y, width, height]
        this.colorWriteMask = [true, true, true, true];
        this.unpackFlipYWebGL = false;
        this.unpackPremultiplyAlphaWebGL = false;
        this.unpackColorSpaceConversionWebGL = WebGL2RenderingContext.BROWSER_DEFAULT_WEBGL;
        this.unpackColorSpace = "srgb";
        this.unpackAlignment = 4;
        this.packAlignment = 4;
        this.sampleAlphaToCoverage = false;
        this.sampleCoverage = false;
        this.sampleCoverageValue = 1;
        this.sampleCoverageInvert = false;
        this.dither = true;
        this.lineWidth = 1;
        this.generateMipmapHint = WebGL2RenderingContext.DONT_CARE;
    }
}

export class StencilState implements HydHashable {
    enabled: boolean;

    frontFunc: GPUCompareFunction;
    frontFuncEnum: GLenum;
    frontFail: GPUStencilOperation;
    frontFailEnum: GLenum;
    frontPassDepthFail: GPUStencilOperation;
    frontPassDepthFailEnum: GLenum;
    frontPassDepthPass: GPUStencilOperation;
    frontPassDepthPassEnum: GLenum;
    frontRef: GLuint;
    frontValueMask: GLuint;
    frontWriteMask: GLuint;

    backFunc: GPUCompareFunction;
    backFuncEnum: GLenum;
    backFail: GPUStencilOperation;
    backFailEnum: GLenum;
    backPassDepthFail: GPUStencilOperation;
    backPassDepthFailEnum: GLenum;
    backPassDepthPass: GPUStencilOperation;
    backPassDepthPassEnum: GLenum;
    backRef: GLuint;
    backValueMask: GLuint;
    backWriteMask: GLuint;

    public get hash(): string {
        return this.enabled.toString() + this.frontFunc.toString() + this.frontFail.toString() + this.frontPassDepthFail.toString() + this.frontPassDepthPass.toString() + this.frontRef.toString() + this.frontValueMask.toString() + this.frontWriteMask.toString() + this.backFunc.toString() + this.backFail.toString() + this.backPassDepthFail.toString() + this.backPassDepthPass.toString() + this.backRef.toString() + this.backValueMask.toString() + this.backWriteMask.toString();
    }
    constructor() {
        this.enabled = false;
        this.frontFunc = 'always';
        this.frontFuncEnum = WebGL2RenderingContext.ALWAYS;
        this.frontFail = 'keep';
        this.frontFailEnum = WebGL2RenderingContext.KEEP;
        this.frontPassDepthFail = 'keep';
        this.frontPassDepthFailEnum = WebGL2RenderingContext.KEEP;
        this.frontPassDepthPass = 'keep';
        this.frontPassDepthPassEnum = WebGL2RenderingContext.KEEP;
        this.frontRef = 0;
        this.frontValueMask = 0xFFFFFFFF;
        this.frontWriteMask = 0xFFFFFFFF;
        this.backFunc = 'always';
        this.backFuncEnum = WebGL2RenderingContext.ALWAYS;
        this.backFail = 'keep';
        this.backFailEnum = WebGL2RenderingContext.KEEP;
        this.backPassDepthPass = 'keep';
        this.backPassDepthPassEnum = WebGL2RenderingContext.KEEP;
        this.backPassDepthFail = 'keep';
        this.backPassDepthFailEnum = WebGL2RenderingContext.KEEP;
        this.backRef = 0;
        this.backValueMask = 0xFFFFFFFF;
        this.backWriteMask = 0xFFFFFFFF;
    }
}

export class HydGlobalState {
    public glError: number = WebGL2RenderingContext.NO_ERROR;
    public contextAttributes: WebGLContextAttributes;
    public commonState: CommonState;
    public depthState = new DepthState();
    public polygonState = new PolygonState();
    public clearState = new ClearState();
    public blendState = new BlendState();
    public miscState = new MiscState();
    public stencilState = new StencilState();
    public textureUnits: HydTextureUnitBindings[] = [];
    public topology: GPUPrimitiveTopology = null;
    public stripIndexFormat: GPUIndexFormat | undefined;
    public drawingBufferGeneration: number = 0;
    public readonly currentVertexAttribValues: Float32Array[] = Array.from({ length: 16 }, () => new Float32Array([0, 0, 0, 1]));

    public readonly defaultVertexArrayBinding: HydVertexArray = new HydVertexArray();
    public readonly defaultFramebuffer: HydFramebuffer;
    public __canvasTexture: GPUTexture;
    public __canvasView: GPUTextureView;
    public device: GPUDevice;
    private __bindGroupCount: number = 0;
    private __pipelineCount: number = 0;
    private uniformBuffer: GPUBuffer;
    private readonly defaultSampleTextures: Map<string, HydTexture> = new Map();
    private readonly webglVersion: 1 | 2;

    constructor(attributes: WebGLContextAttributes, uniform: GPUBuffer, device: GPUDevice, webglVersion: 1 | 2 = 1) {
        this.contextAttributes = attributes;
        this.defaultFramebuffer = new HydFramebuffer();
        this.defaultFramebuffer.drawBuffers = [WebGL2RenderingContext.BACK];
        this.defaultFramebuffer.readBuffer = WebGL2RenderingContext.BACK;
        this.defaultFramebuffer.attachments = new Map();
        this.device = device;
        this.webglVersion = webglVersion;

        this.commonState = new CommonState(
            0,
            [0, 0, -1, -1, 0, 1],
            null,
            null,
            this.defaultVertexArrayBinding,
            this.defaultFramebuffer,
            this.defaultFramebuffer,
            null,
        );
        this.uniformBuffer = uniform;
    }

    public setError(error: GLenum) {
        if (this.glError === WebGL2RenderingContext.NO_ERROR) {
            this.glError = error;
        }
    }

    public consumeError(): GLenum {
        const error = this.glError;
        this.glError = WebGL2RenderingContext.NO_ERROR;
        return error;
    }

    private getDefaultSampleTexture(viewDimension: GPUTextureViewDimension, sampleType: GPUTextureSampleType): HydTexture {
        const key = `${viewDimension}:${sampleType}`;
        let texture = this.defaultSampleTextures.get(key);
        if (!texture) {
            texture = new HydTexture(this.device);
            texture.label = `HydDefaultSampleTexture-${viewDimension}-${sampleType}`;
            texture.ensureSampleable(viewDimension, sampleType);
            this.defaultSampleTextures.set(key, texture);
        }
        return texture;
    }

    public getTextureUnitBinding(textureUnit: number, viewDimension: GPUTextureViewDimension): HydTexture | null {
        return this.textureUnits[textureUnit]?.[viewDimension] || null;
    }

    public setTextureUnitBinding(textureUnit: number, viewDimension: GPUTextureViewDimension, texture: HydTexture | null) {
        let bindings = this.textureUnits[textureUnit];
        if (!bindings) {
            bindings = {};
            this.textureUnits[textureUnit] = bindings;
        }
        if (texture) {
            bindings[viewDimension] = texture;
        } else {
            delete bindings[viewDimension];
        }
    }

    public deleteTextureBinding(texture: HydTexture) {
        for (const bindings of this.textureUnits) {
            if (!bindings) continue;
            for (const viewDimension of TEXTURE_UNIT_BINDING_ORDER) {
                if (bindings[viewDimension] === texture) {
                    delete bindings[viewDimension];
                }
            }
        }
    }

    private getSamplerTexture(textureUnit: number, viewDimension: GPUTextureViewDimension, sampleType: GPUTextureSampleType): HydTexture {
        const texture = this.getTextureUnitBinding(textureUnit, viewDimension);
        if (!texture || !texture.isSamplingComplete(viewDimension, this.webglVersion)) {
            return this.getDefaultSampleTexture(viewDimension, sampleType);
        }
        texture.ensureSampleable(viewDimension, sampleType);
        return texture;
    }

    private getColorWriteMask(attachment?: FramebufferAttributes): GPUColorWriteFlags {
        const [r, g, b, a] = this.miscState.colorWriteMask;
        const writesDefaultFramebuffer = this.commonState.drawFramebufferBinding === this.defaultFramebuffer;
        const targetHasAlpha = !attachment || attachment.colorBits[3] > 0;
        const writeAlpha = a && targetHasAlpha && !(writesDefaultFramebuffer && this.contextAttributes.alpha === false);
        return (r ? GPUColorWrite.RED : 0) |
            (g ? GPUColorWrite.GREEN : 0) |
            (b ? GPUColorWrite.BLUE : 0) |
            (writeAlpha ? GPUColorWrite.ALPHA : 0);
    }

    public getPipelineDescriptor(topology: GPUPrimitiveTopology, vertexBufferLayout: GPUVertexBufferLayout[]): [string, GPURenderPipelineDescriptor] {
        const haveFragmentState = this.commonState.drawFramebufferBinding.drawBuffers.some((value) => value === WebGL2RenderingContext.BACK || (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15));
        const vertexState: GPUVertexState = {
            module: this.commonState.currentProgram.vertexModule,
            entryPoint: 'main',
            buffers: vertexBufferLayout,
        };
        const pipelineDescriptor: GPURenderPipelineDescriptor = {
            layout: 'auto',
            vertex: vertexState,
            primitive: {
                topology: topology,
                stripIndexFormat: topology === "line-strip" || topology === "triangle-strip"
                    ? this.stripIndexFormat
                    : undefined,
                cullMode: this.polygonState.cullFace ? this.polygonState.cullFaceMode : undefined,
                frontFace: this.polygonState.frontFace,
            },
        };
        let cacheKey = this.commonState.currentProgram.hash + this.polygonState.cullFace.toString() + this.polygonState.cullFaceMode.toString() + this.polygonState.frontFace.toString() + this.polygonState.polygonOffsetFill.toString() + this.polygonState.polygonOffsetUnits.toString() + this.polygonState.polygonOffsetFactor.toString() + this.topology.toString() + (this.stripIndexFormat || "none");

        if (haveFragmentState) {
            const blend: GPUBlendState = this.blendState.enabled ? {
                color: {
                    srcFactor: this.blendState.srcRGB,
                    dstFactor: this.blendState.dstRGB,
                    operation: this.blendState.equationRGB,
                },
                alpha: {
                    srcFactor: this.blendState.srcAlpha,
                    dstFactor: this.blendState.dstAlpha,
                    operation: this.blendState.equationAlpha,
                },
            } : undefined;
            cacheKey += this.blendState.enabled ? 'true' + this.blendState.srcRGB + this.blendState.dstRGB + this.blendState.equationRGB + this.blendState.srcAlpha + this.blendState.dstAlpha + this.blendState.equationAlpha : 'false';
            cacheKey += this.miscState.colorWriteMask.join(',');
            pipelineDescriptor.fragment = {
                module: this.commonState.currentProgram.fragmentModule,
                entryPoint: 'main',
                targets: this.commonState.drawFramebufferBinding.drawBuffers
                    .filter((value) => value === WebGL2RenderingContext.BACK || (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15))
                    .map((value) => {
                        cacheKey += value.toString();
                        if (value === WebGL2RenderingContext.BACK) {
                            const writeMask = this.getColorWriteMask();
                            cacheKey += `:${writeMask}`;
                            return { format: 'bgra8unorm', blend, writeMask } as GPUColorTargetState;
                        } else if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                            const attachment = this.commonState.drawFramebufferBinding.attachments.get(value);
                            const writeMask = this.getColorWriteMask(attachment);
                            cacheKey += `:${writeMask}`;
                            return { format: attachment.format, blend, writeMask } as GPUColorTargetState;
                        } else {
                            return null;
                        }
                    }),
            }
        }
        const depthStencilAttachment = this.getDepthStencilAttachment();
        if (depthStencilAttachment) {
            cacheKey += depthStencilAttachment.format;
            const hasDepth = depthStencilAttachment.format.startsWith("depth");
            const hasStencil = depthStencilAttachment.format.includes("stencil");
            const depthStencil: GPUDepthStencilState = {
                format: depthStencilAttachment.format,
            };
            if (hasDepth) {
                depthStencil.depthWriteEnabled = this.depthState.enabled && this.depthState.writeMask;
                depthStencil.depthCompare = this.depthState.enabled ? this.depthState.func : 'always';
            }
            if (hasStencil) {
                depthStencil.stencilFront = {
                    compare: this.stencilState.frontFunc,
                    failOp: this.stencilState.frontFail,
                    depthFailOp: this.stencilState.frontPassDepthFail,
                    passOp: this.stencilState.frontPassDepthPass,
                };
                depthStencil.stencilBack = {
                    compare: this.stencilState.backFunc,
                    failOp: this.stencilState.backFail,
                    depthFailOp: this.stencilState.backPassDepthFail,
                    passOp: this.stencilState.backPassDepthPass,
                };
                depthStencil.stencilWriteMask = this.stencilState.frontWriteMask;
                depthStencil.stencilReadMask = this.stencilState.frontValueMask;
            }
            depthStencil.depthBias = this.polygonState.polygonOffsetFill ? this.polygonState.polygonOffsetUnits : undefined;
            depthStencil.depthBiasSlopeScale = this.polygonState.polygonOffsetFill ? this.polygonState.polygonOffsetFactor : undefined;
            pipelineDescriptor.depthStencil = depthStencil;
            cacheKey += this.depthState.hash + this.stencilState.hash;
        }
        return [fastHashCode(cacheKey).toString(), pipelineDescriptor];
    }

    public getRenderBundleEncoderDescriptor(): GPURenderBundleEncoderDescriptor {
        let ret = {
            colorFormats: this.commonState.drawFramebufferBinding.drawBuffers.map((value) => {
                if (value === WebGL2RenderingContext.BACK) {
                    return 'bgra8unorm';
                } else if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                    return this.commonState.drawFramebufferBinding.attachments.get(value).format;
                } else {
                    return null;
                }
            }),
            // depthStencilFormat: this.getDepthStencilAttachment().format,
            // sampleCount: 1,
        }
        const depthStencilAttachment = this.getDepthStencilAttachment();
        if (depthStencilAttachment) {
            ret['depthStencilFormat'] = depthStencilAttachment.format;
        }
        return ret;
    }

    public getRenderPassDescriptorCacheKey(): string {
        let cacheKey: string = ((this.clearState.target & WebGL2RenderingContext.COLOR_BUFFER_BIT) ? 'clear' : 'load') +
            this.clearState.color[0] + this.clearState.color[1] + this.clearState.color[2] + this.clearState.color[3];
        this.commonState.drawFramebufferBinding.drawBuffers
            .forEach((value) => {
                if (value === WebGL2RenderingContext.BACK) {
                    cacheKey += 'CV'
                } else if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                    cacheKey += this.commonState.drawFramebufferBinding.attachments.get(value).view.label;
                } else {
                    cacheKey += 'null';
                }
        });
        const depthStencilAttachment = this.getDepthStencilAttachment();
        if (depthStencilAttachment) {
            const dsa = depthStencilAttachment;
            const clearDepth = Boolean(this.clearState.target & WebGL2RenderingContext.DEPTH_BUFFER_BIT);
            const clearStencil = Boolean(this.clearState.target & WebGL2RenderingContext.STENCIL_BUFFER_BIT);
            const useDepth = this.depthState.enabled || clearDepth;
            const useStencil = this.stencilState.enabled || clearStencil;
            cacheKey += '$' +
                dsa.view.label +
                (useDepth ? (clearDepth ? 'clear' : 'load') : undefined) +
                (useDepth ? 'store' : undefined) +
                this.clearState.depth +
                (useStencil ? (clearStencil ? 'clear' : 'load') : undefined) +
                (useStencil ? 'store' : undefined) +
                this.clearState.stencil;
        }
        return cacheKey;
    }

    public getRenderPassDescriptor(): GPURenderPassDescriptor {
        const renderPassDescriptor: GPURenderPassDescriptor = {
            // label: `RP@${commandEncoder.label}`,
            colorAttachments: this.commonState.drawFramebufferBinding.drawBuffers
                .map((value) => {
                    if (value === WebGL2RenderingContext.BACK) {
                        const clearValue = this.contextAttributes.alpha === false
                            ? [this.clearState.color[0], this.clearState.color[1], this.clearState.color[2], 1]
                            : this.clearState.color;
                        return {
                            view: this.__canvasView,
                            label: this.__canvasView.label,
                            loadOp: (this.clearState.target & WebGL2RenderingContext.COLOR_BUFFER_BIT) ? 'clear' : 'load',
                            storeOp: 'store',
                            clearValue,
                        };
                    } else if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                        const attachment = this.commonState.drawFramebufferBinding.attachments.get(value);
                        const view = attachment.view;
                        const clearValue = attachment.colorBits[3] === 0
                            ? [this.clearState.color[0], this.clearState.color[1], this.clearState.color[2], 1]
                            : this.clearState.color;
                        return {
                            view,
                            label: view.label,
                            loadOp: (this.clearState.target & WebGL2RenderingContext.COLOR_BUFFER_BIT) ? 'clear' : 'load',
                            storeOp: 'store',
                            clearValue,
                        };
                    } else {
                        return null;
                    }
                }),
        };
        const depthStencilAttachment = this.getDepthStencilAttachment();
        if (depthStencilAttachment) {
            const dsa = depthStencilAttachment;
            const clearDepth = Boolean(this.clearState.target & WebGL2RenderingContext.DEPTH_BUFFER_BIT);
            const clearStencil = Boolean(this.clearState.target & WebGL2RenderingContext.STENCIL_BUFFER_BIT);
            const useDepth = this.depthState.enabled || clearDepth;
            const useStencil = this.stencilState.enabled || clearStencil;
            const hasDepth = dsa.format.startsWith("depth");
            const hasStencil = dsa.format.includes("stencil");
            renderPassDescriptor.depthStencilAttachment = {
                view: dsa.view,
                depthClearValue: this.clearState.depth,
                depthLoadOp: hasDepth ? (useDepth && clearDepth ? 'clear' : 'load') : undefined,
                depthStoreOp: hasDepth ? 'store' : undefined,
                depthReadOnly: hasDepth ? false : undefined,
                stencilClearValue: this.clearState.stencil,
                stencilLoadOp: hasStencil ? (useStencil && clearStencil ? 'clear' : 'load') : undefined,
                stencilStoreOp: hasStencil ? 'store' : undefined,
                stencilReadOnly: hasStencil ? false : undefined,
            }
        }
        return renderPassDescriptor;
    }

    public getCurrentRenderPassInfo(): {
        hash: string,
        bundleDescriptor: GPURenderBundleEncoderDescriptor,
        passDescriptor: GPURenderPassDescriptor,
    } {
        return {
            hash: fastHashCode(this.getRenderPassDescriptorCacheKey()).toString(),
            bundleDescriptor: this.getRenderBundleEncoderDescriptor(),
            passDescriptor: this.getRenderPassDescriptor(),
        };
    }

    private _bindGroupCache: Map<string, GPUBindGroup> = new Map();
    private _bindGroupLayoutCache: Map<string, GPUBindGroupLayout> = new Map();
    private _pipelineLayoutCache: Map<string, GPUPipelineLayout> = new Map();
    private _pipelineCache: Map<string, GPURenderPipeline> = new Map();
    private _currentVertexAttribBuffers: GPUBuffer[] = [];
    private _currentVertexAttribBufferKeys: string[] = [];

    private getCurrentVertexAttribBuffer(index: number): [GPUBuffer, string] {
        if (!this._currentVertexAttribBuffers[index]) {
            this._currentVertexAttribBuffers[index] = this.device.createBuffer({
                label: `currentVertexAttrib${index}`,
                size: CURRENT_VERTEX_ATTRIB_BUFFER_ELEMENTS * 16,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            });
        }
        const values = this.currentVertexAttribValues[index] || this.currentVertexAttribValues[0];
        const key = `${index}:${values[0]},${values[1]},${values[2]},${values[3]}`;
        if (this._currentVertexAttribBufferKeys[index] !== key) {
            const repeated = new Float32Array(CURRENT_VERTEX_ATTRIB_BUFFER_ELEMENTS * 4);
            for (let i = 0; i < CURRENT_VERTEX_ATTRIB_BUFFER_ELEMENTS; i++) {
                repeated[i * 4] = values[0];
                repeated[i * 4 + 1] = values[1];
                repeated[i * 4 + 2] = values[2];
                repeated[i * 4 + 3] = values[3];
            }
            this.device.queue.writeBuffer(this._currentVertexAttribBuffers[index], 0, repeated.buffer, repeated.byteOffset, repeated.byteLength);
            this._currentVertexAttribBufferKeys[index] = key;
        }
        return [this._currentVertexAttribBuffers[index], key];
    }

    public updateCurrentVertexAttribBuffer(index: number) {
        this.getCurrentVertexAttribBuffer(index);
    }

    public getPBV(): PbvInfo {
        const [vertexBufferHashes, vertexBuffers, vertexBufferOffsets, vertexBufferLayoutHash, vertexBufferLayout] = this.getVertexBuffer();

        const [bindGroupHash, bindGroupEntries, bindGroupLayoutHash, bindGroupLayoutEntries, bindGroupTextures] = this.getBindGroup();
        const pipelineLayoutHash = bindGroupLayoutHash;

        /* set pipeline */
        const [_pipelineHash, pipelineDescriptor] = this.getPipelineDescriptor(this.topology, vertexBufferLayout);
        const pipelineHash = _pipelineHash + '|' + bindGroupLayoutHash + '|' + vertexBufferLayoutHash;
        // this.lastPipelineDescriptor.label = fastHashCode(this.lastPipelineCacheKey).toString();

        let bindGroupLayout = this._bindGroupLayoutCache.get(bindGroupLayoutHash);
        if (!bindGroupLayout) {
            bindGroupLayout = this.device.createBindGroupLayout({
                entries: bindGroupLayoutEntries,
            });
            this._bindGroupLayoutCache.set(bindGroupLayoutHash, bindGroupLayout);
        }
        pipelineDescriptor.layout = this._pipelineLayoutCache.get(pipelineLayoutHash);
        if (!pipelineDescriptor.layout) {
            pipelineDescriptor.layout = this.device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout],
                label: 'pipelineLayout' + pipelineDescriptor.label,
            });
            this._pipelineLayoutCache.set(pipelineLayoutHash, pipelineDescriptor.layout);
        }
        let pipeline = this._pipelineCache.get(pipelineHash);
        if (!pipeline) {
            console.log('[HYD] create Pipeline');
            pipelineDescriptor.label = 'ppl' + this.__pipelineCount++;
            pipeline = this.device.createRenderPipeline(pipelineDescriptor);
            this._pipelineCache.set(pipelineHash, pipeline);
        }
        // this.pipelineCache.set(this.lastPipelineCacheKey, this.lastPipeline);

        /* set bindGroup */
        let bindGroup = this._bindGroupCache.get(bindGroupHash);
        if (!bindGroup) {
            console.log('[HYD] create BindGroup');
            bindGroup = this.device.createBindGroup({
                layout: bindGroupLayout,
                entries: bindGroupEntries,
                label: "bg" + this.__bindGroupCount++,
            });
            this._bindGroupCache.set(bindGroupHash, bindGroup);
            for (const textureAttachment of bindGroupTextures) {
                textureAttachment.onDestroy.push(() => {
                    const cachedBindGroup = this._bindGroupCache.get(bindGroupHash);
                    if (cachedBindGroup) {
                        // @ts-ignore
                        if (typeof cachedBindGroup.onDestroy === 'function') {
                            // @ts-ignore
                            cachedBindGroup.onDestroy();
                        }
                        this._bindGroupCache.delete(bindGroupHash);
                    }
                });
            }
        }
        const vertexBuffersHash = fastHashCode(vertexBufferHashes.join('%')).toString();
        return {
            pipelineHash,
            pipeline,
            bindGroupHash,
            bindGroup,
            vertexBuffersHash,
            vertexBufferHashes,
            vertexBuffers,
            vertexBufferOffsets,
            renderPassHash: fastHashCode(this.getRenderPassDescriptorCacheKey()).toString(),
            renderBundleEncoderDescriptor: this.getRenderBundleEncoderDescriptor(),
        }
    }

    private getDepthStencilAttachment(): { view: GPUTextureView, format: GPUTextureFormat } | null {
        const framebuffer = this.commonState.drawFramebufferBinding;
        let needsDepth = this.depthState.enabled || Boolean(this.clearState.target & WebGL2RenderingContext.DEPTH_BUFFER_BIT);
        let needsStencil = this.stencilState.enabled || Boolean(this.clearState.target & WebGL2RenderingContext.STENCIL_BUFFER_BIT);
        if (framebuffer === this.defaultFramebuffer) {
            needsDepth = needsDepth && this.contextAttributes.depth !== false;
            needsStencil = needsStencil && this.contextAttributes.stencil === true;
            if ((needsDepth || needsStencil) && this.contextAttributes.depth !== false && this.contextAttributes.stencil === true) {
                const attachment = framebuffer.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT);
                return attachment ? { view: attachment.view, format: attachment.format } : null;
            }
        }
        if (needsDepth && needsStencil) {
            const attachment = framebuffer.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT);
            if (!attachment) return null;
            return { view: attachment.view, format: attachment.format };
        }
        if (needsDepth) {
            const attachment = framebuffer.attachments.get(WebGL2RenderingContext.DEPTH_ATTACHMENT) ||
                framebuffer.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT);
            if (!attachment) return null;
            return { view: attachment.view, format: attachment.format };
        }
        if (needsStencil) {
            const attachment = framebuffer.attachments.get(WebGL2RenderingContext.STENCIL_ATTACHMENT) ||
                framebuffer.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT);
            if (!attachment) return null;
            return { view: attachment.view, format: attachment.format };
        }
        return null;
    }

    public getBindGroup(): [string, GPUBindGroupEntry[], string, GPUBindGroupLayoutEntry[], HydTexture[]] {
        const program = this.commonState.currentProgram;
        const bindGroupEntry: GPUBindGroupEntry[] = [];
        const bindGroupLayoutEntry: GPUBindGroupLayoutEntry[] = [];
        const textureAttachments: HydTexture[] = [];
        if (program.alignedUniformSize > 0) {
            bindGroupEntry.push({
                binding: 0,
                resource: {
                    buffer: this.uniformBuffer,
                    // offset: 0,  dynamicOffset
                    size: program.alignedUniformSize,
                    label: 'ub' + program.hash,
                },
            });
            bindGroupLayoutEntry.push({
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: {
                    type: 'uniform',
                    hasDynamicOffset: true,
                    minBindingSize: program.alignedUniformSize,
                },
            });
        }
        let bindGroupKey = program.hash;
        let bindGroupLayoutKey = '0-du-' + program.alignedUniformSize;

        for (const sampler of program.hydSamplers) {
            const textureAttachment: HydTexture = this.getSamplerTexture(sampler.textureUnit, sampler.viewDimension, sampler.sampleType);
            const samplerBindingType = textureAttachment.isDepthStencil ? 'non-filtering' : sampler.samplerBindingType;
            textureAttachments.push(textureAttachment);
            bindGroupLayoutEntry.push({
                binding: bindGroupLayoutEntry.length,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                sampler: {
                    type: samplerBindingType,
                },
            });
            bindGroupLayoutEntry.push({
                binding: bindGroupLayoutEntry.length,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: textureAttachment.isDepthStencil ? 'unfilterable-float' : sampler.sampleType,
                    viewDimension: sampler.viewDimension,
                    multisampled: false,
                },
            });
            bindGroupLayoutKey += bindGroupLayoutEntry.length + '-t-' + textureAttachment.isDepthStencil + sampler.viewDimension + sampler.sampleType + sampler.samplerBindingType;
            bindGroupEntry.push({
                binding: bindGroupEntry.length,
                resource: textureAttachment.samplerForBinding(samplerBindingType),
            });
            bindGroupEntry.push({
                binding: bindGroupEntry.length,
                resource: textureAttachment.view,
            });
            bindGroupKey += textureAttachment.hash;
        }
        return [fastHashCode(bindGroupKey).toString(), bindGroupEntry, bindGroupLayoutKey, bindGroupLayoutEntry, textureAttachments];
    }

    public getVertexBuffer(): [string[], GPUBuffer[], number[], string, GPUVertexBufferLayout[]] {
        const bufferAttributeMap = new Map<string, [GPUBuffer, number, GPUVertexStepMode, Array<GPUVertexAttribute>]>();
        const vao = this.commonState.vertexArrayBinding;
        const activeAttributeLocations = this.commonState.currentProgram.hydAttributeLocations;
        const divisorGroupBaseOffsets = new WeakMap<HydBuffer, Map<string, number>>();
        const buffers: GPUBuffer[] = [];
        const layouts: GPUVertexBufferLayout[] = [];
        const offsets: number[] = [];
        const vbKeys = [];
        for (let location = 0; location < vao.attributes.length; location++) {
            if (!activeAttributeLocations.has(location)) continue;
            const attribute = vao.attributes[location];
            if (!attribute.enabled || !attribute.buffer || !attribute.format || attribute.divisor <= 1) continue;
            let offsetsByLayout = divisorGroupBaseOffsets.get(attribute.buffer);
            if (!offsetsByLayout) {
                offsetsByLayout = new Map();
                divisorGroupBaseOffsets.set(attribute.buffer, offsetsByLayout);
            }
            const key = `${attribute.stride}:${attribute.divisor}`;
            offsetsByLayout.set(key, Math.min(offsetsByLayout.get(key) ?? attribute.offset, attribute.offset));
        }
        /*
        attribute: {
            public enabled: boolean = false;
            public size: number;
            public type: GLenum;
            public int: boolean;
            public normalized: boolean = false;
            public stride: number = 0;
            public offset: number = 0;
            public divisor: number = 0;
            public buffer: HydBuffer;
            public GPUAttribute: GPUVertexAttribute;
        }
        */
        for (let location = 0; location < vao.attributes.length; location++) {
            if (!activeAttributeLocations.has(location)) continue;
            const attribute = vao.attributes[location];
            if (attribute.enabled) {
                if (!attribute.buffer) {
                    // throw new Error('[HYD] VertexArray attribute buffer is null.');
                    this.setError(WebGL2RenderingContext.INVALID_OPERATION);
                    return;
                }
                let vertexBuffer = attribute.buffer.buffer;
                let arrayStride = attribute.stride;
                let attributeOffset = attribute.offset;
                let format = attribute.format;
                let bufferHash = attribute.buffer.hash;
                if (!format) {
                    const converted = attribute.buffer.getFloatVertexBuffer(
                        attribute.type,
                        attribute.size,
                        attribute.normalized,
                        attribute.webglStride,
                        attribute.offset,
                        attribute.divisor > 1 ? attribute.divisor : 1,
                    );
                    vertexBuffer = converted.buffer;
                    arrayStride = converted.arrayStride;
                    attributeOffset = 0;
                    format = converted.format;
                    bufferHash = converted.key;
                } else if (attribute.divisor > 1) {
                    const layoutKey = `${attribute.stride}:${attribute.divisor}`;
                    const sourceOffset = divisorGroupBaseOffsets.get(attribute.buffer)?.get(layoutKey) ?? attribute.offset;
                    const expanded = attribute.buffer.getDivisorVertexBuffer(
                        attribute.stride,
                        attribute.divisor,
                        sourceOffset,
                    );
                    vertexBuffer = expanded.buffer;
                    attributeOffset -= sourceOffset;
                    bufferHash = expanded.key;
                }
                const stepMode: GPUVertexStepMode = attribute.divisor > 0 ? 'instance' : 'vertex';
                let hash = bufferHash + '|' + arrayStride + '|' + stepMode + '|' + Math.floor(attributeOffset / 2048);
                if (bufferAttributeMap.has(hash)) {
                    bufferAttributeMap.get(hash)[3].push({
                        shaderLocation: attribute.shaderLocation,
                        offset: attributeOffset,
                        format,
                    });
                } else {
                    bufferAttributeMap.set(hash, [vertexBuffer, arrayStride, stepMode, [{
                        shaderLocation: attribute.shaderLocation,
                        offset: attributeOffset,
                        format,
                    }]]);
                }
            }
        }

        for (const programAttribute of this.commonState.currentProgram.hydAttributes) {
            const location = programAttribute.location;
            const attribute = vao.attributes[location];
            if (attribute && !attribute.enabled) {
                const [buffer, key] = this.getCurrentVertexAttribBuffer(location);
                const hash = `current-vertex-attrib-${key}`;
                bufferAttributeMap.set(hash, [buffer, 16, 'instance', [{
                    shaderLocation: location,
                    offset: 0,
                    format: programAttributeTypeToVertexFormat(programAttribute.type),
                }]]);
            }
        }

        let layoutKey = '';
        for (const [bufferHash, [buffer, arrayStride, stepMode, attributes]] of bufferAttributeMap) {
            buffers.push(buffer);
            // let offset = attributes[0].offset;
            // for (let i = 1; i < attributes.length; i++) {
            //     offset = Math.min(offset, attributes[i].offset);
            // }
            const offset = Math.min.apply(null, attributes.map(a => a.offset));
            for (let i = 0; i < attributes.length; i++) {
                attributes[i].offset -= offset;
            }
            offsets.push(offset);
            layouts.push({
                arrayStride,
                attributes,
                stepMode,
            });
            layoutKey += attributes.toString() + arrayStride + stepMode + '|';
            vbKeys.push(bufferHash + '|' + offset);
        }
        return [vbKeys, buffers, offsets, layoutKey, layouts];
    }
}

interface PbvInfo {
    pipelineHash: string,
    pipeline: GPURenderPipeline,
    bindGroupHash: string,
    bindGroup: GPUBindGroup,
    vertexBuffersHash: string,
    vertexBufferHashes: string[],
    vertexBuffers: GPUBuffer[],
    vertexBufferOffsets: number[],
    renderPassHash: string,
    renderBundleEncoderDescriptor: GPURenderBundleEncoderDescriptor,
}

export class HydHashPbv implements PbvInfo {
    public readonly hash: string;

    public generated: boolean = false;

    public pipelineHash: string = null;
    public bindGroupHash: string = null;
    public vertexBuffersHash: string = null;
    public vertexBufferHashes: string[] = null;

    public pipeline: GPURenderPipeline = null;
    public bindGroup: GPUBindGroup = null;
    public vertexBuffers: GPUBuffer[] = null;
    public vertexBufferOffsets: number[] = null;

    public renderBundleEncoderDescriptor: GPURenderBundleEncoderDescriptor = null;

    public renderPassHash: string = null;

    public jumpTable: Map<string, HydHashPbv> = new Map();

    public __last_visit_hash: string = null;
    public __last_visit_pbv: HydHashPbv = null;

    constructor(hash: string) {
        this.hash = hash;
    }
}

export class HydGlobalStateHashed extends HydGlobalState implements HydHashable {
    private _hashPbvCur: HydHashPbv = new HydHashPbv(null);
    private _hashPbvCache: Map<string, HydHashPbv> = new Map();
    public get stateToken(): object {
        return this._hashPbvCur;
    }
    public recordTransition(glFunc: string, ...glArgs: ({ toString(): string })[]) {
        // recordTransition 的正确性尤为重要！
        this.recordTransitionOne(glFunc + '$' + glArgs.join(','));
    }
    public recordTransitionOne(glOpHash: string) {
        // recordTransition 的正确性尤为重要！
        if (glOpHash === this._hashPbvCur.__last_visit_hash) {
            this._hashPbvCur = this._hashPbvCur.__last_visit_pbv;
            return;
        }
        let jumpToHashPbv;
        if (!(jumpToHashPbv = this._hashPbvCur.jumpTable.get(glOpHash))) {
            const newHash = this.hash;
            if (!this._hashPbvCache.has(newHash)) {
                jumpToHashPbv = new HydHashPbv(newHash);
                this._hashPbvCache.set(newHash, jumpToHashPbv);
            }
            else {
                jumpToHashPbv = this._hashPbvCache.get(newHash);
            }
            this._hashPbvCur.jumpTable.set(glOpHash, jumpToHashPbv);
        }
        this._hashPbvCur.__last_visit_hash = glOpHash;
        this._hashPbvCur.__last_visit_pbv = jumpToHashPbv;
        this._hashPbvCur = jumpToHashPbv;
    }

    public get hash(): string {
        const textureUnitHash = this.textureUnits.map((bindings) => {
            if (!bindings) return "null";
            return TEXTURE_UNIT_BINDING_ORDER
                .map((viewDimension) => `${viewDimension}:${bindings[viewDimension]?.hash || "null"}`)
                .join(',');
        }).join('|');
        return this.commonState.hash
            + this.depthState.hash
            + this.polygonState.hash
            + this.clearState.hash
            + this.blendState.hash
            + this.miscState.hash
            + this.stencilState.hash
            + textureUnitHash
            + this.clearState.target.toString()
            + this.drawingBufferGeneration.toString()
            + this.topology
            + (this.stripIndexFormat || "none");
    }

    public getPBV(): PbvInfo {
        const pbv = this._hashPbvCur;
        if (!pbv.generated) {
            // [this._hashPbvCur.pipelineHash, this._hashPbvCur.pipeline, this._hashPbvCur.bindGroupHash, this._hashPbvCur.bindGroup, this._hashPbvCur.vertexBufferHashes, this._hashPbvCur.vertexBuffers, this._hashPbvCur.renderPassHash] = super.getPBV();
            Object.assign(pbv, super.getPBV());
            pbv.generated = true;
            // @ts-ignore
            pbv.bindGroup.onDestroy = () => {
                pbv.generated = false;
            };
        }
        return pbv;
    }

}
