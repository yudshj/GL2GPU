import { HydHashable } from "./base/hydHashable";
import { HydBuffer, HydConvertedVertexBuffer } from "./hydBuffer";
import { FramebufferAttributes, HydFramebuffer } from "./hydFramebuffer";
import { HydIndexedBufferBinding, HydProgram } from "./hydProgram";
import { HydSampler } from "./hydSampler";
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
        case WebGL2RenderingContext.INT:
            return 'sint32';
        case WebGL2RenderingContext.INT_VEC2:
            return 'sint32x2';
        case WebGL2RenderingContext.INT_VEC3:
            return 'sint32x3';
        case WebGL2RenderingContext.INT_VEC4:
            return 'sint32x4';
        case WebGL2RenderingContext.UNSIGNED_INT:
            return 'uint32';
        case WebGL2RenderingContext.UNSIGNED_INT_VEC2:
            return 'uint32x2';
        case WebGL2RenderingContext.UNSIGNED_INT_VEC3:
            return 'uint32x3';
        case WebGL2RenderingContext.UNSIGNED_INT_VEC4:
            return 'uint32x4';
        case WebGL2RenderingContext.FLOAT_MAT2:
        case WebGL2RenderingContext.FLOAT_MAT3x2:
        case WebGL2RenderingContext.FLOAT_MAT4x2:
            return 'float32x2';
        case WebGL2RenderingContext.FLOAT_MAT3:
        case WebGL2RenderingContext.FLOAT_MAT2x3:
        case WebGL2RenderingContext.FLOAT_MAT4x3:
            return 'float32x3';
        case WebGL2RenderingContext.FLOAT_MAT4:
        case WebGL2RenderingContext.FLOAT_MAT2x4:
        case WebGL2RenderingContext.FLOAT_MAT3x4:
            return 'float32x4';
        default:
            return 'float32x4';
    }
}

function vertexFormatByteSize(format: GPUVertexFormat): number {
    const formatName = String(format);
    const eightBit = /8x([24])(?:-bgra)?$/.exec(formatName);
    if (eightBit) return Number(eightBit[1]);
    const sixteenBit = /16x([24])$/.exec(formatName);
    if (sixteenBit) return Number(sixteenBit[1]) * 2;
    const thirtyTwoBit = /32(?:x([234]))?$/.exec(formatName);
    if (thirtyTwoBit) return Number(thirtyTwoBit[1] || 1) * 4;
    return 4;
}

function vertexFormatAlignment(format: GPUVertexFormat): number {
    const formatName = String(format);
    if (/8x[24](?:-bgra)?$/.test(formatName)) return 1;
    if (/16x[24]$/.test(formatName)) return 2;
    return 4;
}

function vertexBufferLayoutCacheKey(layout: GPUVertexBufferLayout): string {
    return `${layout.stepMode || 'vertex'}:${layout.arrayStride}:` + Array.from(layout.attributes)
        .map((attribute) => `${attribute.shaderLocation}:${attribute.offset}:${attribute.format}`)
        .join(',');
}

interface RepackedVertexAttribute {
    shaderLocation: number;
    format: GPUVertexFormat;
    byteLength: number;
    source?: HydConvertedVertexBuffer;
    currentValue?: number[];
    key: string;
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
    copyReadBufferBinding: HydBuffer;
    copyWriteBufferBinding: HydBuffer;
    pixelPackBufferBinding: HydBuffer;
    pixelUnpackBufferBinding: HydBuffer;
    transformFeedbackBufferBinding: HydBuffer;
    uniformBufferBinding: HydBuffer;
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
        this.copyReadBufferBinding = null;
        this.copyWriteBufferBinding = null;
        this.pixelPackBufferBinding = null;
        this.pixelUnpackBufferBinding = null;
        this.transformFeedbackBufferBinding = null;
        this.uniformBufferBinding = null;
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
    rowLength?: number;
    imageHeight?: number;
    skipPixels?: number;
    skipRows?: number;
    skipImages?: number;
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
    unpackRowLength: number;
    unpackImageHeight: number;
    unpackSkipPixels: number;
    unpackSkipRows: number;
    unpackSkipImages: number;
    packRowLength: number;
    packSkipPixels: number;
    packSkipRows: number;
    sampleAlphaToCoverage: boolean;
    sampleCoverage: boolean;
    sampleCoverageValue: number;
    sampleCoverageInvert: boolean;
    dither: boolean;
    lineWidth: number;
    generateMipmapHint: GLenum;
    fragmentShaderDerivativeHint: GLenum;
    rasterizerDiscard: boolean;

    public get unpackState(): HydPixelUnpackState {
        return {
            flipY: this.unpackFlipYWebGL,
            alignment: this.unpackAlignment,
            rowLength: this.unpackRowLength,
            imageHeight: this.unpackImageHeight,
            skipPixels: this.unpackSkipPixels,
            skipRows: this.unpackSkipRows,
            skipImages: this.unpackSkipImages,
            premultiplyAlpha: this.unpackPremultiplyAlphaWebGL,
            colorspaceConversion: this.unpackColorSpaceConversionWebGL,
            unpackColorSpace: this.unpackColorSpace,
        };
    }

    public get hash(): string {
        return this.scissorTest.toString() + this.scissorBox.toString() + this.colorWriteMask.toString() + this.unpackFlipYWebGL.toString() + this.unpackPremultiplyAlphaWebGL.toString() + this.unpackColorSpaceConversionWebGL.toString() + this.unpackColorSpace + this.unpackAlignment.toString() + this.packAlignment.toString() + this.unpackRowLength.toString() + this.unpackImageHeight.toString() + this.unpackSkipPixels.toString() + this.unpackSkipRows.toString() + this.unpackSkipImages.toString() + this.packRowLength.toString() + this.packSkipPixels.toString() + this.packSkipRows.toString() +
            `:alphaToCoverage=${this.sampleAlphaToCoverage}` +
            `:sampleCoverage=${this.sampleCoverage}` +
            `:${this.sampleCoverageValue}:${this.sampleCoverageInvert}` +
            this.rasterizerDiscard.toString();
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
        this.unpackRowLength = 0;
        this.unpackImageHeight = 0;
        this.unpackSkipPixels = 0;
        this.unpackSkipRows = 0;
        this.unpackSkipImages = 0;
        this.packRowLength = 0;
        this.packSkipPixels = 0;
        this.packSkipRows = 0;
        this.sampleAlphaToCoverage = false;
        this.sampleCoverage = false;
        this.sampleCoverageValue = 1;
        this.sampleCoverageInvert = false;
        this.dither = true;
        this.lineWidth = 1;
        this.generateMipmapHint = WebGL2RenderingContext.DONT_CARE;
        this.fragmentShaderDerivativeHint = WebGL2RenderingContext.DONT_CARE;
        this.rasterizerDiscard = false;
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
    public samplerBindings: Array<HydSampler | null> = [];
    public uniformBufferBindings: Array<HydIndexedBufferBinding | null> = [];
    public topology: GPUPrimitiveTopology = null;
    public stripIndexFormat: GPUIndexFormat | undefined;
    public drawingBufferGeneration: number = 0;
    public readonly currentVertexAttribValues: number[][] = Array.from({ length: 16 }, () => [0, 0, 0, 1]);
    public readonly currentVertexAttribValueTypes: Array<"float" | "int" | "uint"> = Array.from({ length: 16 }, () => "float");

    public readonly defaultVertexArrayBinding: HydVertexArray = new HydVertexArray();
    public readonly defaultFramebuffer: HydFramebuffer;
    public __canvasTexture: GPUTexture;
    public __canvasView: GPUTextureView;
    public __canvasMultisampleView: GPUTextureView;
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
            if ((globalThis as any).__HYD_DEBUG_GL_ERRORS) {
                console.debug("[HYD] WebGL error", error, new Error().stack);
            }
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

    private getSamplerTexture(
        textureUnit: number,
        viewDimension: GPUTextureViewDimension,
        sampleType: GPUTextureSampleType,
        bindingViewDimension: GPUTextureViewDimension = viewDimension,
        sampler?: HydSampler | null,
    ): HydTexture {
        const texture = this.getTextureUnitBinding(textureUnit, bindingViewDimension);
        if (!texture || !texture.isSamplingComplete(
            bindingViewDimension, this.webglVersion, sampler?.completenessState)) {
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

    private getSampleMask(sampleCount: number): number {
        if (sampleCount <= 1 || !this.miscState.sampleCoverage) return 0xffffffff;
        const activeMask = sampleCount >= 32 ? 0xffffffff : (2 ** sampleCount - 1) >>> 0;
        const coveredSamples = Math.min(
            sampleCount,
            Math.max(0, Math.round(this.miscState.sampleCoverageValue * sampleCount)),
        );
        const coverageMask = coveredSamples >= 32 ? 0xffffffff : (2 ** coveredSamples - 1) >>> 0;
        return this.miscState.sampleCoverageInvert
            ? (activeMask ^ coverageMask) >>> 0
            : coverageMask;
    }

    private getAlphaToCoverageEnabled(sampleCount: number, haveFragmentState: boolean): boolean {
        if (sampleCount <= 1 || !haveFragmentState || !this.miscState.sampleAlphaToCoverage) return false;
        const firstDrawBuffer = this.commonState.drawFramebufferBinding.drawBuffers[0];
        if (firstDrawBuffer === WebGL2RenderingContext.BACK) return true;
        if (firstDrawBuffer !== WebGL2RenderingContext.COLOR_ATTACHMENT0) return false;
        const attachment = this.commonState.drawFramebufferBinding.attachments.get(firstDrawBuffer);
        return !!attachment && !/(?:sint|uint)$/.test(attachment.format);
    }

    private integerSamplerPipelineConstants(stage: "vertex" | "fragment"): {
        constants: Record<string, number>,
        key: string,
    } {
        const program = this.commonState.currentProgram;
        const constants: Record<string, number> = {};
        const keyParts: string[] = [];
        if (!program || typeof (program as any).integerSamplerOverrides !== "function") {
            return { constants, key: "" };
        }
        const overrides = program.integerSamplerOverrides(stage);
        if (overrides.size === 0) return { constants, key: "" };

        const wrapValue = (value: number | undefined): number => {
            if (value === WebGL2RenderingContext.CLAMP_TO_EDGE) return 0;
            if (value === WebGL2RenderingContext.MIRRORED_REPEAT) return 2;
            return 1;
        };
        const parameter = (
            sampler: HydSampler | null,
            texture: HydTexture,
            pname: GLenum,
            fallback: number,
        ): number => sampler?.getParameter(pname) ?? texture.webglParameters.get(pname) ?? fallback;

        for (const sampler of program.hydSamplers) {
            const names = overrides.get(sampler.name);
            if (!names) continue;
            const boundSampler = this.samplerBindings[sampler.textureUnit] || null;
            const texture = this.getSamplerTexture(
                sampler.textureUnit,
                sampler.viewDimension,
                sampler.sampleType,
                sampler.bindingViewDimension,
                boundSampler,
            );
            const minFilter = parameter(
                boundSampler,
                texture,
                WebGL2RenderingContext.TEXTURE_MIN_FILTER,
                WebGL2RenderingContext.NEAREST_MIPMAP_LINEAR,
            );
            const mipmapped = minFilter !== WebGL2RenderingContext.NEAREST &&
                minFilter !== WebGL2RenderingContext.LINEAR;
            const range = texture.getSamplingMipRange(
                sampler.viewDimension,
                this.webglVersion,
                boundSampler?.completenessState,
            );
            const levels = Math.max(1, range.sampledLastLevel - range.baseLevel + 1);
            constants[names.wrapS] = wrapValue(parameter(
                boundSampler, texture, WebGL2RenderingContext.TEXTURE_WRAP_S, WebGL2RenderingContext.REPEAT));
            constants[names.wrapT] = wrapValue(parameter(
                boundSampler, texture, WebGL2RenderingContext.TEXTURE_WRAP_T, WebGL2RenderingContext.REPEAT));
            constants[names.wrapR] = wrapValue(parameter(
                boundSampler, texture, WebGL2RenderingContext.TEXTURE_WRAP_R, WebGL2RenderingContext.REPEAT));
            constants[names.mipmapped] = mipmapped ? 1 : 0;
            constants[names.minLod] = parameter(
                boundSampler, texture, WebGL2RenderingContext.TEXTURE_MIN_LOD, -1000);
            constants[names.maxLod] = parameter(
                boundSampler, texture, WebGL2RenderingContext.TEXTURE_MAX_LOD, 1000);
            constants[names.levels] = levels;
            constants[names.flipY] = texture.needsSamplingYFlip() ? 1 : 0;
            if ((globalThis as any).__HYD_DEBUG_TEXTURE_UPLOAD) {
                console.debug("[HYD] integer sampler specialization", JSON.stringify({
                    stage,
                    sampler: sampler.name,
                    width: texture.width,
                    height: texture.height,
                    levels,
                    mipmapped,
                    minFilter,
                    wrapS: constants[names.wrapS],
                    wrapT: constants[names.wrapT],
                    wrapR: constants[names.wrapR],
                    flipY: constants[names.flipY],
                }));
            }
            keyParts.push(Object.values(names).map((name) => `${name}=${constants[name]}`).join(","));
        }
        return { constants, key: keyParts.join("|") };
    }

    private samplerCoordinateScalePipelineConstants(stage: "vertex" | "fragment"): {
        constants: Record<string, number>,
        key: string,
    } {
        const program = this.commonState.currentProgram;
        const constants: Record<string, number> = {};
        const keyParts: string[] = [];
        if (!program || typeof (program as any).samplerCoordinateScaleOverrides !== "function") {
            return { constants, key: "" };
        }
        const overrides = program.samplerCoordinateScaleOverrides(stage);
        if (overrides.size === 0) return { constants, key: "" };

        for (const sampler of program.hydSamplers) {
            const names = overrides.get(sampler.name);
            if (!names) continue;
            const boundSampler = this.samplerBindings[sampler.textureUnit] || null;
            const texture = this.getSamplerTexture(
                sampler.textureUnit,
                sampler.viewDimension,
                sampler.sampleType,
                sampler.bindingViewDimension,
                boundSampler,
            );
            const [scaleX, scaleY] = texture.getSamplingCoordinateScale(
                sampler.bindingViewDimension,
                this.webglVersion,
                boundSampler?.completenessState,
            );
            constants[names.x] = scaleX;
            constants[names.y] = scaleY;
            keyParts.push(`${names.x}=${scaleX},${names.y}=${scaleY}`);
        }
        return { constants, key: keyParts.join("|") };
    }

    public getPipelineDescriptor(topology: GPUPrimitiveTopology, vertexBufferLayout: GPUVertexBufferLayout[]): [string, GPURenderPipelineDescriptor] {
        const haveFragmentState = this.commonState.drawFramebufferBinding.drawBuffers.some((value) => value === WebGL2RenderingContext.BACK || (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15));
        const fragmentOutputLocations = new Set(
            this.commonState.currentProgram.fragmentOutputLocations.values());
        const vertexState: GPUVertexState = {
            module: this.commonState.currentProgram.vertexModule,
            entryPoint: 'main',
            buffers: vertexBufferLayout,
        };
        const vertexIntegerConstants = this.integerSamplerPipelineConstants("vertex");
        const vertexCoordinateScaleConstants = this.samplerCoordinateScalePipelineConstants("vertex");
        const vertexConstants = {
            ...vertexIntegerConstants.constants,
            ...vertexCoordinateScaleConstants.constants,
        };
        if (Object.keys(vertexConstants).length > 0) {
            vertexState.constants = vertexConstants;
        }
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
        const sampleCount = this.getFramebufferSampleCount();
        const sampleMask = this.getSampleMask(sampleCount);
        const alphaToCoverageEnabled = this.getAlphaToCoverageEnabled(sampleCount, haveFragmentState);
        if (sampleCount > 1) {
            pipelineDescriptor.multisample = {
                count: sampleCount,
                mask: sampleMask,
                alphaToCoverageEnabled,
            };
        }
        let cacheKey = this.commonState.currentProgram.hash + this.polygonState.cullFace.toString() + this.polygonState.cullFaceMode.toString() + this.polygonState.frontFace.toString() + this.polygonState.polygonOffsetFill.toString() + this.polygonState.polygonOffsetUnits.toString() + this.polygonState.polygonOffsetFactor.toString() + this.topology.toString() + (this.stripIndexFormat || "none");
        cacheKey += `:integer-vertex=${vertexIntegerConstants.key}`;
        cacheKey += `:coordinate-scale-vertex=${vertexCoordinateScaleConstants.key}`;
        cacheKey += `:samples=${sampleCount}:sampleMask=${sampleMask}:alphaToCoverage=${alphaToCoverageEnabled}`;

        if (haveFragmentState) {
            const blend: GPUBlendState = this.blendState.enabled ? {
                color: {
                    srcFactor: this.blendState.equationRGB === "min" || this.blendState.equationRGB === "max"
                        ? "one"
                        : this.blendState.srcRGB,
                    dstFactor: this.blendState.equationRGB === "min" || this.blendState.equationRGB === "max"
                        ? "one"
                        : this.blendState.dstRGB,
                    operation: this.blendState.equationRGB,
                },
                alpha: {
                    srcFactor: this.blendState.equationAlpha === "min" || this.blendState.equationAlpha === "max"
                        ? "one"
                        : this.blendState.srcAlpha,
                    dstFactor: this.blendState.equationAlpha === "min" || this.blendState.equationAlpha === "max"
                        ? "one"
                        : this.blendState.dstAlpha,
                    operation: this.blendState.equationAlpha,
                },
            } : undefined;
            cacheKey += this.blendState.enabled ? 'true' + this.blendState.srcRGB + this.blendState.dstRGB + this.blendState.equationRGB + this.blendState.srcAlpha + this.blendState.dstAlpha + this.blendState.equationAlpha : 'false';
            cacheKey += this.miscState.colorWriteMask.join(',');
            pipelineDescriptor.fragment = {
                module: this.commonState.currentProgram.fragmentModule,
                entryPoint: 'main',
                targets: this.commonState.drawFramebufferBinding.drawBuffers
                    .map((value, index) => {
                        cacheKey += value.toString();
                        if (value === WebGL2RenderingContext.BACK) {
                            const writeMask = fragmentOutputLocations.has(index)
                                ? this.getColorWriteMask()
                                : 0;
                            cacheKey += `:${writeMask}`;
                            return { format: 'bgra8unorm', blend, writeMask } as GPUColorTargetState;
                        } else if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                            const attachment = this.commonState.drawFramebufferBinding.attachments.get(value);
                        if (!attachment) {
                            cacheKey += ':missing';
                            return null;
                        }
                        cacheKey += `:${attachment.format}`;
                        const writeMask = fragmentOutputLocations.has(index)
                            ? this.getColorWriteMask(attachment)
                                : 0;
                            const targetBlend = /(?:sint|uint)$/.test(attachment.format) ? undefined : blend;
                            cacheKey += `:${writeMask}:${targetBlend ? "blend" : "no-blend"}`;
                            return { format: attachment.format, blend: targetBlend, writeMask } as GPUColorTargetState;
                        } else {
                            return null;
                        }
                    }),
            }
            const fragmentIntegerConstants = this.integerSamplerPipelineConstants("fragment");
            const fragmentCoordinateScaleConstants = this.samplerCoordinateScalePipelineConstants("fragment");
            const fragmentConstants = {
                ...fragmentIntegerConstants.constants,
                ...fragmentCoordinateScaleConstants.constants,
            };
            if (Object.keys(fragmentConstants).length > 0) {
                pipelineDescriptor.fragment.constants = fragmentConstants;
            }
            cacheKey += `:integer-fragment=${fragmentIntegerConstants.key}`;
            cacheKey += `:coordinate-scale-fragment=${fragmentCoordinateScaleConstants.key}`;
        }
        const depthStencilAttachment = this.getDepthStencilAttachment();
        if (depthStencilAttachment) {
            cacheKey += `${depthStencilAttachment.format}:logical-depth=${depthStencilAttachment.hasDepth ? 1 : 0}:` +
                `logical-stencil=${depthStencilAttachment.hasStencil ? 1 : 0}`;
            const physicalHasDepth = depthStencilAttachment.format.startsWith("depth");
            const physicalHasStencil = depthStencilAttachment.format.includes("stencil");
            const depthStencil: GPUDepthStencilState = {
                format: depthStencilAttachment.format,
            };
            if (physicalHasDepth) {
                depthStencil.depthWriteEnabled = depthStencilAttachment.hasDepth &&
                    this.depthState.enabled && this.depthState.writeMask;
                depthStencil.depthCompare = depthStencilAttachment.hasDepth && this.depthState.enabled
                    ? this.depthState.func
                    : 'always';
            }
            if (physicalHasStencil) {
                if (depthStencilAttachment.hasStencil && this.stencilState.enabled) {
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
                } else {
                    const disabledStencil: GPUStencilFaceState = {
                        compare: "always",
                        failOp: "keep",
                        depthFailOp: "keep",
                        passOp: "keep",
                    };
                    depthStencil.stencilFront = disabledStencil;
                    depthStencil.stencilBack = disabledStencil;
                    depthStencil.stencilWriteMask = 0;
                    depthStencil.stencilReadMask = 0xffffffff;
                }
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
                    return this.commonState.drawFramebufferBinding.attachments.get(value)?.format || null;
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
        const sampleCount = this.getFramebufferSampleCount();
        if (sampleCount > 1) ret['sampleCount'] = sampleCount;
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
                    const attachment = this.commonState.drawFramebufferBinding.attachments.get(value);
                    cacheKey += attachment ? attachment.view.label : 'missing';
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
            colorAttachments: this.commonState.drawFramebufferBinding.drawBuffers
                .map((value) => {
                    if (value === WebGL2RenderingContext.BACK) {
                        const clearValue = this.contextAttributes.alpha === false
                            ? [this.clearState.color[0], this.clearState.color[1], this.clearState.color[2], 1]
                            : this.clearState.color;
                        const multisampleView = this.contextAttributes.antialias === true
                            ? this.__canvasMultisampleView
                            : null;
                        const view = multisampleView || this.__canvasView;
                        return {
                            view,
                            resolveTarget: multisampleView ? this.__canvasView : undefined,
                            label: view.label,
                            loadOp: (this.clearState.target & WebGL2RenderingContext.COLOR_BUFFER_BIT) ? 'clear' : 'load',
                            storeOp: 'store',
                            clearValue,
                        };
                    } else if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                        const attachment = this.commonState.drawFramebufferBinding.attachments.get(value);
                        if (!attachment) return null;
                        const view = attachment.view;
                        const clearValue = attachment.colorBits[3] === 0
                            ? [this.clearState.color[0], this.clearState.color[1], this.clearState.color[2], 1]
                            : this.clearState.color;
                        return {
                            view,
                            depthSlice: attachment.depthSlice,
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
    private _repackedVertexBufferCache: Map<string, GPUBuffer> = new Map();

    private getCurrentVertexAttribBuffer(index: number, shaderType: GLenum = WebGL2RenderingContext.FLOAT_VEC4): [GPUBuffer, string] {
        if (!this._currentVertexAttribBuffers[index]) {
            this._currentVertexAttribBuffers[index] = this.device.createBuffer({
                label: `currentVertexAttrib${index}`,
                size: CURRENT_VERTEX_ATTRIB_BUFFER_ELEMENTS * 16,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            });
        }
        const values = this.currentVertexAttribValues[index] || this.currentVertexAttribValues[0];
        const format = programAttributeTypeToVertexFormat(shaderType);
        const key = `${index}:${format}:${values[0]},${values[1]},${values[2]},${values[3]}`;
        if (this._currentVertexAttribBufferKeys[index] !== key) {
            const repeated = format.startsWith("sint")
                ? new Int32Array(CURRENT_VERTEX_ATTRIB_BUFFER_ELEMENTS * 4)
                : format.startsWith("uint")
                    ? new Uint32Array(CURRENT_VERTEX_ATTRIB_BUFFER_ELEMENTS * 4)
                    : new Float32Array(CURRENT_VERTEX_ATTRIB_BUFFER_ELEMENTS * 4);
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
        this._currentVertexAttribBufferKeys[index] = "";
    }

    private getRepackedVertexBuffers(): [string[], GPUBuffer[], number[], string, GPUVertexBufferLayout[]] {
        const vao = this.commonState.vertexArrayBinding;
        const program = this.commonState.currentProgram;
        const programTypes = new Map<number, GLenum>();
        for (const programAttribute of program.hydAttributes) {
            for (let column = 0; column < programAttribute.locationSpan; column++) {
                programTypes.set(programAttribute.location + column, programAttribute.type);
            }
        }

        const vertexAttributes: RepackedVertexAttribute[] = [];
        const instanceAttributes: RepackedVertexAttribute[] = [];
        const currentAttributes: RepackedVertexAttribute[] = [];
        const activeLocations = Array.from(program.hydAttributeLocations).sort((left, right) => left - right);
        for (const location of activeLocations) {
            const attribute = vao.attributes[location];
            if (!attribute) continue;
            if (!attribute.enabled) {
                const format = programAttributeTypeToVertexFormat(programTypes.get(location));
                const currentValue = this.currentVertexAttribValues[location] || this.currentVertexAttribValues[0];
                currentAttributes.push({
                    shaderLocation: location,
                    format,
                    byteLength: vertexFormatByteSize(format),
                    currentValue,
                    key: `current:${location}:${format}:${currentValue.join(',')}`,
                });
                continue;
            }
            if (!attribute.buffer) {
                this.setError(WebGL2RenderingContext.INVALID_OPERATION);
                continue;
            }
            const source = attribute.int
                ? attribute.buffer.getIntegerVertexBuffer(
                    attribute.type,
                    attribute.size,
                    attribute.webglStride,
                    attribute.offset,
                    attribute.divisor > 1 ? attribute.divisor : 1,
                )
                : attribute.buffer.getFloatVertexBuffer(
                    attribute.type,
                    attribute.size,
                    attribute.normalized,
                    attribute.webglStride,
                    attribute.offset,
                    attribute.divisor > 1 ? attribute.divisor : 1,
                );
            const repackedAttribute: RepackedVertexAttribute = {
                shaderLocation: location,
                format: source.format,
                byteLength: source.arrayStride,
                source,
                key: `${location}:${source.format}:${source.key}`,
            };
            (attribute.divisor > 0 ? instanceAttributes : vertexAttributes).push(repackedAttribute);
        }

        // A disabled WebGL attribute is constant for the whole draw. Packing it
        // into an existing per-vertex group avoids consuming another WebGPU
        // vertex-buffer slot; otherwise retain the existing per-instance model.
        if (vertexAttributes.length > 0) {
            vertexAttributes.push(...currentAttributes);
        } else {
            instanceAttributes.push(...currentAttributes);
        }

        const buffers: GPUBuffer[] = [];
        const layouts: GPUVertexBufferLayout[] = [];
        const offsets: number[] = [];
        const bufferKeys: string[] = [];
        const appendGroup = (attributes: RepackedVertexAttribute[], stepMode: GPUVertexStepMode) => {
            if (attributes.length === 0) return;
            attributes.sort((left, right) => left.shaderLocation - right.shaderLocation);
            const gpuAttributes: GPUVertexAttribute[] = [];
            let arrayStride = 0;
            for (const attribute of attributes) {
                gpuAttributes.push({
                    shaderLocation: attribute.shaderLocation,
                    offset: arrayStride,
                    format: attribute.format,
                });
                arrayStride += attribute.byteLength;
            }

            const sourceCounts = attributes
                .filter((attribute) => !!attribute.source)
                .map((attribute) => Math.floor(attribute.source.data.byteLength / attribute.source.arrayStride));
            const recordCount = sourceCounts.length > 0
                ? Math.min(...sourceCounts)
                : CURRENT_VERTEX_ATTRIB_BUFFER_ELEMENTS;
            const groupKey = `repacked:${stepMode}:${arrayStride}:${recordCount}:` +
                attributes.map((attribute) => attribute.key).join('|');
            let buffer = this._repackedVertexBufferCache.get(groupKey);
            if (!buffer) {
                const payloadByteLength = arrayStride * recordCount;
                const packed = new Uint8Array(Math.max(4, payloadByteLength));
                for (let attributeIndex = 0; attributeIndex < attributes.length; attributeIndex++) {
                    const attribute = attributes[attributeIndex];
                    const destinationOffset = Number(gpuAttributes[attributeIndex].offset);
                    if (attribute.source) {
                        const sourceBytes = new Uint8Array(
                            attribute.source.data.buffer,
                            attribute.source.data.byteOffset,
                            attribute.source.data.byteLength,
                        );
                        for (let record = 0; record < recordCount; record++) {
                            const sourceOffset = record * attribute.source.arrayStride;
                            packed.set(
                                sourceBytes.subarray(sourceOffset, sourceOffset + attribute.byteLength),
                                record * arrayStride + destinationOffset,
                            );
                        }
                    } else {
                        const componentCount = attribute.byteLength / 4;
                        const values = attribute.currentValue || [0, 0, 0, 1];
                        const constant = attribute.format.startsWith('sint')
                            ? new Int32Array(componentCount)
                            : attribute.format.startsWith('uint')
                                ? new Uint32Array(componentCount)
                                : new Float32Array(componentCount);
                        for (let component = 0; component < componentCount; component++) {
                            constant[component] = values[component];
                        }
                        const constantBytes = new Uint8Array(constant.buffer, constant.byteOffset, constant.byteLength);
                        for (let record = 0; record < recordCount; record++) {
                            packed.set(constantBytes, record * arrayStride + destinationOffset);
                        }
                    }
                }
                buffer = this.device.createBuffer({
                    label: `repackedVertexBuffer-${fastHashCode(groupKey)}`,
                    size: packed.byteLength,
                    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
                });
                if (payloadByteLength > 0) {
                    this.device.queue.writeBuffer(buffer, 0, packed.buffer, packed.byteOffset, payloadByteLength);
                }
                this._repackedVertexBufferCache.set(groupKey, buffer);
            }
            const layout: GPUVertexBufferLayout = { arrayStride, attributes: gpuAttributes, stepMode };
            buffers.push(buffer);
            layouts.push(layout);
            offsets.push(0);
            bufferKeys.push(groupKey);
        };

        appendGroup(vertexAttributes, 'vertex');
        appendGroup(instanceAttributes, 'instance');
        const layoutKey = layouts.map(vertexBufferLayoutCacheKey).join('|');
        return [bufferKeys, buffers, offsets, `repacked|${layoutKey}`, layouts];
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

    private getDepthStencilAttachment(): {
        view: GPUTextureView,
        format: GPUTextureFormat,
        hasDepth: boolean,
        hasStencil: boolean,
    } | null {
        const framebuffer = this.commonState.drawFramebufferBinding;
        let needsDepth = this.depthState.enabled || Boolean(this.clearState.target & WebGL2RenderingContext.DEPTH_BUFFER_BIT);
        let needsStencil = this.stencilState.enabled || Boolean(this.clearState.target & WebGL2RenderingContext.STENCIL_BUFFER_BIT);
        if (framebuffer === this.defaultFramebuffer) {
            needsDepth = needsDepth && this.contextAttributes.depth !== false;
            needsStencil = needsStencil && this.contextAttributes.stencil === true;
            if ((needsDepth || needsStencil) && this.contextAttributes.depth !== false && this.contextAttributes.stencil === true) {
                const attachment = framebuffer.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT);
                return attachment ? {
                    view: attachment.view,
                    format: attachment.format,
                    hasDepth: true,
                    hasStencil: true,
                } : null;
            }
        }
        const combined = framebuffer.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT);
        const depth = framebuffer.attachments.get(WebGL2RenderingContext.DEPTH_ATTACHMENT) || combined;
        const stencil = framebuffer.attachments.get(WebGL2RenderingContext.STENCIL_ATTACHMENT) || combined;
        const sameImage = (left: FramebufferAttributes | undefined, right: FramebufferAttributes | undefined) =>
            !!left && !!right && left.attachment === right.attachment &&
            (left.level || 0) === (right.level || 0) &&
            (left.layer ?? -1) === (right.layer ?? -1) &&
            (left.face || 0) === (right.face || 0);
        const describe = (attachment: FramebufferAttributes | undefined) => attachment ? {
            view: attachment.view,
            format: attachment.format,
            hasDepth: sameImage(attachment, depth),
            hasStencil: sameImage(attachment, stencil),
        } : null;
        if (needsDepth && needsStencil) {
            if (depth && stencil) {
                if (!sameImage(depth, stencil)) return null;
                return describe(depth);
            }
            // Enabling a test for an aspect that is absent from a complete
            // WebGL framebuffer must not disable the other, present aspect.
            // The missing depth/stencil test behaves as if it always passes.
            const available = depth || stencil;
            return describe(available);
        }
        if (needsDepth) {
            return describe(depth);
        }
        if (needsStencil) {
            return describe(stencil);
        }
        return null;
    }

    public getFramebufferSampleCount(): number {
        const framebuffer = this.commonState.drawFramebufferBinding;
        if (framebuffer === this.defaultFramebuffer) {
            return this.contextAttributes.antialias === true ? 4 : 1;
        }
        for (const attachment of framebuffer.attachments.values()) {
            if (attachment.sampleCount > 1) return attachment.sampleCount;
        }
        return 1;
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
            const boundSampler = this.samplerBindings[sampler.textureUnit] || null;
            const textureAttachment: HydTexture = this.getSamplerTexture(
                sampler.textureUnit,
                sampler.viewDimension,
                sampler.sampleType,
                sampler.bindingViewDimension,
                boundSampler,
            );
            const textureSampleType: GPUTextureSampleType = sampler.sampleType === "depth"
                ? "depth"
                : textureAttachment.isDepthStencil || textureAttachment.requiresUnfilterableFloatSampling
                    ? "unfilterable-float"
                    : sampler.sampleType;
            const samplerBindingType = sampler.samplerBindingType === "comparison"
                ? "comparison"
                : textureSampleType === "unfilterable-float" ? "non-filtering" : sampler.samplerBindingType;
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
                    sampleType: textureSampleType,
                    viewDimension: sampler.viewDimension,
                    multisampled: false,
                },
            });
            bindGroupLayoutKey += bindGroupLayoutEntry.length + '-t-' + textureAttachment.isDepthStencil +
                sampler.viewDimension + textureSampleType + samplerBindingType;
            bindGroupEntry.push({
                binding: bindGroupEntry.length,
                resource: boundSampler
                    ? boundSampler.samplerForBinding(samplerBindingType, sampler.viewDimension)
                    : textureAttachment.samplerForBinding(samplerBindingType),
            });
            bindGroupEntry.push({
                binding: bindGroupEntry.length,
                resource: textureAttachment.getSampleView(
                    sampler.viewDimension,
                    this.webglVersion,
                    boundSampler?.completenessState,
                ),
            });
            bindGroupKey += textureAttachment.hash + (boundSampler ? `|${boundSampler.hash}` : "|texture-sampler");
        }
        for (const block of [...program.hydUniformBlocks].sort((left, right) => left.resourceBinding - right.resourceBinding)) {
            const indexed = block.bufferBinding;
            if (block.resourceBinding < 0 || !indexed?.buffer.buffer) continue;
            const bindingSize = block.wgslBindingSize;
            bindGroupLayoutEntry.push({
                binding: block.resourceBinding,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: {
                    type: "uniform",
                    hasDynamicOffset: false,
                    minBindingSize: bindingSize,
                },
            });
            bindGroupEntry.push({
                binding: block.resourceBinding,
                resource: {
                    buffer: indexed.buffer.buffer,
                    offset: indexed.offset,
                    size: bindingSize,
                },
            });
            bindGroupLayoutKey += `|ubo:${block.resourceBinding}:${bindingSize}`;
            bindGroupKey += `|ubo:${block.resourceBinding}:${indexed.buffer.hash}:${indexed.offset}:${bindingSize}`;
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
                    const converted = attribute.int
                        ? attribute.buffer.getIntegerVertexBuffer(
                            attribute.type,
                            attribute.size,
                            attribute.webglStride,
                            attribute.offset,
                            attribute.divisor > 1 ? attribute.divisor : 1,
                        )
                        : attribute.buffer.getFloatVertexBuffer(
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
            for (let column = 0; column < programAttribute.locationSpan; column++) {
                const location = programAttribute.location + column;
                const attribute = vao.attributes[location];
                if (attribute && !attribute.enabled) {
                    const [buffer, key] = this.getCurrentVertexAttribBuffer(location, programAttribute.type);
                    const hash = `current-vertex-attrib-${key}`;
                    bufferAttributeMap.set(hash, [buffer, 16, 'instance', [{
                        shaderLocation: location,
                        offset: 0,
                        format: programAttributeTypeToVertexFormat(programAttribute.type),
                    }]]);
                }
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
            layoutKey += vertexBufferLayoutCacheKey(layouts[layouts.length - 1]) + '|';
            vbKeys.push(bufferHash + '|' + offset);
        }
        const limits = this.device.limits;
        const maxVertexBuffers = Number(limits?.maxVertexBuffers ?? 8);
        const maxArrayStride = Number(limits?.maxVertexBufferArrayStride ?? 2048);
        const requiresRepack = layouts.length > maxVertexBuffers || layouts.some((layout, index) => {
            const arrayStride = Number(layout.arrayStride);
            if (arrayStride <= 0 || arrayStride > maxArrayStride || arrayStride % 4 !== 0 || offsets[index] % 4 !== 0) {
                return true;
            }
            return Array.from(layout.attributes).some((attribute) => {
                const attributeOffset = Number(attribute.offset);
                return attributeOffset % vertexFormatAlignment(attribute.format) !== 0 ||
                    attributeOffset + vertexFormatByteSize(attribute.format) > maxArrayStride;
            });
        });
        if (requiresRepack) {
            return this.getRepackedVertexBuffers();
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
    private derivedVertexStateEpoch: number = 0;
    private samplerBindingHashCache: string | null = null;
    private uniformBufferBindingHashCache: string | null = null;
    private currentVertexAttribHashCache: string | null = null;
    private nonTextureStateHashCache: string | null = null;
    private readonly stateCacheDisabled: boolean = (globalThis as any).__HYD_DISABLE_STATE_CACHE === true;
    public get stateToken(): object {
        return this._hashPbvCur;
    }
    public recordTransition(glFunc: string, ...glArgs: ({ toString(): string })[]) {
        // recordTransition 的正确性尤为重要！
        this.recordTransitionOne(glFunc + '$' + glArgs.join(','));
    }
    public recordTransitionOne(glOpHash: string, textureBindingOnly: boolean = false) {
        // recordTransition 的正确性尤为重要！
        if (!textureBindingOnly) this.nonTextureStateHashCache = null;
        if (this.stateCacheDisabled) {
            this._hashPbvCur = new HydHashPbv(this.hash);
            return;
        }
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
    public invalidateNonTextureStateHash() {
        this.nonTextureStateHashCache = null;
    }

    public invalidateDerivedVertexState() {
        this.derivedVertexStateEpoch++;
        this.nonTextureStateHashCache = null;
        const hash = this.hash;
        this._hashPbvCur = new HydHashPbv(hash);
        this._hashPbvCache.set(hash, this._hashPbvCur);
    }

    public invalidateSamplerBindingHash() {
        this.samplerBindingHashCache = null;
        this.nonTextureStateHashCache = null;
    }

    public invalidateUniformBufferBindingHash() {
        this.uniformBufferBindingHashCache = null;
        this.nonTextureStateHashCache = null;
    }

    public invalidateCurrentVertexAttribHash() {
        this.currentVertexAttribHashCache = null;
        this.nonTextureStateHashCache = null;
    }

    public get hash(): string {
        const textureUnitHash = this.textureUnits.map((bindings) => {
            if (!bindings) return "null";
            return TEXTURE_UNIT_BINDING_ORDER
                .map((viewDimension) => `${viewDimension}:${bindings[viewDimension]?.hash || "null"}`)
                .join(',');
        }).join('|');
        if (this.samplerBindingHashCache === null) {
            this.samplerBindingHashCache = this.samplerBindings
                .map((sampler) => sampler?.hash || "null")
                .join('|');
        }
        if (this.uniformBufferBindingHashCache === null) {
            this.uniformBufferBindingHashCache = this.uniformBufferBindings.map((binding) => binding
                ? `${binding.buffer.hash}:${binding.offset}:${binding.size}:${binding.wholeBuffer ? 1 : 0}`
                : "null").join('|');
        }
        if (this.currentVertexAttribHashCache === null) {
            this.currentVertexAttribHashCache = this.commonState.vertexArrayBinding.attributes
                .map((attribute, index) => attribute.enabled
                    ? "enabled"
                    : `${this.currentVertexAttribValueTypes[index]}:${this.currentVertexAttribValues[index].join(',')}`)
                .join('|');
        }
        if (this.nonTextureStateHashCache === null) {
            this.nonTextureStateHashCache = this.commonState.hash
                + this.depthState.hash
                + this.polygonState.hash
                + this.clearState.hash
                + this.blendState.hash
                + this.miscState.hash
                + this.stencilState.hash
                + this.samplerBindingHashCache
                + this.uniformBufferBindingHashCache
                + this.currentVertexAttribHashCache
                + this.clearState.target.toString()
                + this.drawingBufferGeneration.toString()
                + `:derivedVertexEpoch=${this.derivedVertexStateEpoch}`
                + this.topology
                + (this.stripIndexFormat || "none");
        }
        return this.nonTextureStateHashCache + textureUnitHash;
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
