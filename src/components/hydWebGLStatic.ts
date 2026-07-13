import {
    HydActiveUniformInfo,
    brandHydWebGlObject,
    // TTurboMode,
} from "../types";
import { HydOcclusionQueryAllocation, HydRenderPassCache } from "./hydRenderPassCache";
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
    getVertexFormat,
} from './hydConstants';
import { HydShader } from "./hydShader";
import {
    HydIndexedBufferBinding,
    HydProgram,
    ProgramUniformBlock,
    ProgramUniformBuffer,
    ProgramUniformReflection,
    ProgramUniformSampler,
    ProgramTransformFeedbackVarying,
    uniformMatrixDimensions,
} from "./hydProgram";
import {
    externalVideoFrameDisplayExtent,
    HydTexture,
    packedPixelLayout,
    packedPixelLayout3D,
    textureUploadBytesPerPixel,
} from "./hydTexture";
import { HydBuffer, physicalWebGlBufferSize } from "./hydBuffer";
import { HydSampler } from "./hydSampler";
import {
    HydTransformFeedback,
    transformFeedbackOutputVertexCount,
} from "./hydTransformFeedback";
import { HydTransformFeedbackExecutor, TransformFeedbackDraw } from "./hydTransformFeedbackExecutor";
import { HydOcclusionQuerySegment, HydQuery } from "./hydQuery";
import { HydSync } from "./hydSync";
import {
    FramebufferAttributes,
    HydFramebuffer,
    webGlInternalFormatColorBits,
    webGlReadPixelsCopyLayout,
} from "./hydFramebuffer";
import TypedArray = NodeJS.TypedArray;
import { hydWebGLConstants } from "./hydWebGLConstants";
import { ShaderTranslator } from "./shaderTranslator";
import { bridgeGlslDunderIdentifier, bridgeGlslDunderIdentifiers } from "./shaderGlslIdentifiers";
import { hasMisplacedGlslEs3VersionDirective } from "./shaderGlslCompatibility";
import { scanGlslFragmentOutputScalarTypes } from "./shaderMetadata";

const NATIVE_CANVAS_GET_CONTEXT = HTMLCanvasElement.prototype.getContext;
const GL_SRGB_EXT = 0x8C40;
const GL_SRGB_ALPHA_EXT = 0x8C42;
const GL_SRGB8_ALPHA8_EXT = 0x8C43;
const GL_FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING_EXT = 0x8210;
const GL_COMPRESSED_RGB_ETC1_WEBGL = 0x8D64;
interface CompressedTextureFormatInfo {
    gpuFormat: GPUTextureFormat;
    blockBytes: number;
    supportsSubImage: boolean;
}
const ETC2_COMPRESSED_FORMATS = new Map<GLenum, CompressedTextureFormatInfo>([
    [0x9270, { gpuFormat: "eac-r11unorm", blockBytes: 8, supportsSubImage: true }],
    [0x9271, { gpuFormat: "eac-r11snorm", blockBytes: 8, supportsSubImage: true }],
    [0x9272, { gpuFormat: "eac-rg11unorm", blockBytes: 16, supportsSubImage: true }],
    [0x9273, { gpuFormat: "eac-rg11snorm", blockBytes: 16, supportsSubImage: true }],
    [0x9274, { gpuFormat: "etc2-rgb8unorm", blockBytes: 8, supportsSubImage: true }],
    [0x9275, { gpuFormat: "etc2-rgb8unorm-srgb", blockBytes: 8, supportsSubImage: true }],
    [0x9276, { gpuFormat: "etc2-rgb8a1unorm", blockBytes: 8, supportsSubImage: true }],
    [0x9277, { gpuFormat: "etc2-rgb8a1unorm-srgb", blockBytes: 8, supportsSubImage: true }],
    [0x9278, { gpuFormat: "etc2-rgba8unorm", blockBytes: 16, supportsSubImage: true }],
    [0x9279, { gpuFormat: "etc2-rgba8unorm-srgb", blockBytes: 16, supportsSubImage: true }],
]);
const ETC1_COMPRESSED_FORMAT: CompressedTextureFormatInfo = {
    gpuFormat: "etc2-rgb8unorm",
    blockBytes: 8,
    supportsSubImage: false,
};
const RENDER_PASS_DESCRIPTOR_CALLBACK = Symbol("renderPassDescriptorCallback");
type NativeValidationContext = WebGLRenderingContext | WebGL2RenderingContext;
let validationWebGl1: NativeValidationContext | null = null;
let validationWebGl2: NativeValidationContext | null = null;
const hydCanvasContexts = new WeakMap<HTMLCanvasElement, HydWebGLStatic>();
const videoDisplayExtents = new WeakMap<HTMLVideoElement, {
    reportedWidth: number;
    reportedHeight: number;
    width: number;
    height: number;
}>();
let canvasReadHooksInstalled = false;

interface StraightAlphaCanvasScratch {
    canvas: HTMLCanvasElement;
    gl: WebGL2RenderingContext;
    texture: WebGLTexture;
    framebuffer: WebGLFramebuffer;
}

let straightAlphaCanvasScratch: StraightAlphaCanvasScratch | null | undefined;

interface SynchronousReadbackScratch {
    canvas: HTMLCanvasElement;
    gl: WebGL2RenderingContext;
    texture: WebGLTexture;
    framebuffer: WebGLFramebuffer;
}

let synchronousReadbackScratch: SynchronousReadbackScratch | null | undefined;

function getSynchronousReadbackScratch(): SynchronousReadbackScratch | null {
    if (synchronousReadbackScratch?.gl.isContextLost()) synchronousReadbackScratch = undefined;
    if (synchronousReadbackScratch === undefined) {
        const canvas = document.createElement("canvas");
        const gl = NATIVE_CANVAS_GET_CONTEXT.call(canvas, "webgl2", {
            alpha: true,
            antialias: false,
            premultipliedAlpha: true,
            preserveDrawingBuffer: true,
        }) as WebGL2RenderingContext | null;
        const texture = gl?.createTexture() || null;
        const framebuffer = gl?.createFramebuffer() || null;
        synchronousReadbackScratch = gl && texture && framebuffer
            ? { canvas, gl, texture, framebuffer }
            : null;
    }
    return synchronousReadbackScratch;
}

function prepareStraightAlphaCanvas(pixels: Uint8Array, width: number, height: number): HTMLCanvasElement | null {
    if (straightAlphaCanvasScratch === undefined) {
        const canvas = document.createElement("canvas");
        const gl = NATIVE_CANVAS_GET_CONTEXT.call(canvas, "webgl2", {
            alpha: true,
            antialias: false,
            premultipliedAlpha: false,
            preserveDrawingBuffer: true,
        }) as WebGL2RenderingContext | null;
        const texture = gl?.createTexture() || null;
        const framebuffer = gl?.createFramebuffer() || null;
        straightAlphaCanvasScratch = gl && texture && framebuffer
            ? { canvas, gl, texture, framebuffer }
            : null;
    }
    const scratch = straightAlphaCanvasScratch;
    if (!scratch) return null;
    const { canvas, gl, texture, framebuffer } = scratch;
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.finish();
    return gl.getError() === gl.NO_ERROR ? canvas : null;
}

function installCanvasReadHooks() {
    if (canvasReadHooksInstalled) return;
    canvasReadHooksInstalled = true;

    if (typeof CanvasRenderingContext2D !== "undefined") {
        const nativeDrawImage = CanvasRenderingContext2D.prototype.drawImage;
        CanvasRenderingContext2D.prototype.drawImage = function(...args: any[]) {
            let source = args[0];
            if (typeof HTMLCanvasElement !== "undefined" && source instanceof HTMLCanvasElement) {
                source = hydCanvasContexts.get(source)?.prepareCanvasForExternalRead() || source;
                args[0] = source;
            }
            return nativeDrawImage.apply(this, args as any);
        } as typeof CanvasRenderingContext2D.prototype.drawImage;
    }

    const nativeToDataUrl = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(...args: any[]) {
        const source = hydCanvasContexts.get(this)?.prepareCanvasForExternalRead() || this;
        return nativeToDataUrl.apply(source, args as any);
    } as typeof HTMLCanvasElement.prototype.toDataURL;

    const nativeToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(...args: any[]) {
        const source = hydCanvasContexts.get(this)?.prepareCanvasForExternalRead() || this;
        return nativeToBlob.apply(source, args as any);
    } as typeof HTMLCanvasElement.prototype.toBlob;
}

function createNativeValidationContext(type: "webgl" | "webgl2"): NativeValidationContext | null {
    const canvas = document.createElement("canvas");
    const attributes = { alpha: false, antialias: false, depth: false, stencil: false };
    return (NATIVE_CANVAS_GET_CONTEXT.call(canvas, type, attributes) ||
        (type === "webgl" ? NATIVE_CANVAS_GET_CONTEXT.call(canvas, "experimental-webgl", attributes) : null)) as NativeValidationContext | null;
}

function nativeValidationContext(type: string): NativeValidationContext | null {
    if (type === "webgl2") {
        if (!validationWebGl2 || validationWebGl2.isContextLost()) {
            validationWebGl2 = createNativeValidationContext("webgl2");
        }
        return validationWebGl2;
    }
    if (!validationWebGl1 || validationWebGl1.isContextLost()) {
        validationWebGl1 = createNativeValidationContext("webgl");
    }
    return validationWebGl1;
}
const frameBeginFuncLst = [];
const frameEndFuncList = [];
const VALID_PIXEL_ALIGNMENT = new Set([1, 2, 4, 8]);
const VALID_WEBGL2_RENDERBUFFER_INTERNAL_FORMATS = new Set<GLenum>([
    WebGL2RenderingContext.R8, WebGL2RenderingContext.R8_SNORM,
    WebGL2RenderingContext.RG8, WebGL2RenderingContext.RG8_SNORM,
    WebGL2RenderingContext.RGB8, WebGL2RenderingContext.RGB8_SNORM,
    WebGL2RenderingContext.RGB565, WebGL2RenderingContext.RGBA4,
    WebGL2RenderingContext.RGB5_A1, WebGL2RenderingContext.RGBA8,
    WebGL2RenderingContext.RGBA8_SNORM, WebGL2RenderingContext.RGB10_A2,
    WebGL2RenderingContext.RGB10_A2UI, WebGL2RenderingContext.SRGB8,
    WebGL2RenderingContext.SRGB8_ALPHA8, WebGL2RenderingContext.R16F,
    WebGL2RenderingContext.RG16F, WebGL2RenderingContext.RGB16F,
    WebGL2RenderingContext.RGBA16F, WebGL2RenderingContext.R32F,
    WebGL2RenderingContext.RG32F, WebGL2RenderingContext.RGB32F,
    WebGL2RenderingContext.RGBA32F, WebGL2RenderingContext.R11F_G11F_B10F,
    WebGL2RenderingContext.RGB9_E5, WebGL2RenderingContext.R8I,
    WebGL2RenderingContext.R8UI, WebGL2RenderingContext.R16I,
    WebGL2RenderingContext.R16UI, WebGL2RenderingContext.R32I,
    WebGL2RenderingContext.R32UI, WebGL2RenderingContext.RG8I,
    WebGL2RenderingContext.RG8UI, WebGL2RenderingContext.RG16I,
    WebGL2RenderingContext.RG16UI, WebGL2RenderingContext.RG32I,
    WebGL2RenderingContext.RG32UI, WebGL2RenderingContext.RGB8I,
    WebGL2RenderingContext.RGB8UI, WebGL2RenderingContext.RGB16I,
    WebGL2RenderingContext.RGB16UI, WebGL2RenderingContext.RGB32I,
    WebGL2RenderingContext.RGB32UI, WebGL2RenderingContext.RGBA8I,
    WebGL2RenderingContext.RGBA8UI, WebGL2RenderingContext.RGBA16I,
    WebGL2RenderingContext.RGBA16UI, WebGL2RenderingContext.RGBA32I,
    WebGL2RenderingContext.RGBA32UI, WebGL2RenderingContext.RGB,
    WebGL2RenderingContext.RGBA, WebGL2RenderingContext.DEPTH_STENCIL,
    WebGL2RenderingContext.DEPTH_COMPONENT16, WebGL2RenderingContext.DEPTH_COMPONENT24,
    WebGL2RenderingContext.DEPTH_COMPONENT32F, WebGL2RenderingContext.DEPTH24_STENCIL8,
    WebGL2RenderingContext.DEPTH32F_STENCIL8, WebGL2RenderingContext.STENCIL_INDEX8,
]);
const INTEGER_WEBGL2_RENDERBUFFER_INTERNAL_FORMATS = new Set<GLenum>([
    WebGL2RenderingContext.R8I, WebGL2RenderingContext.R8UI,
    WebGL2RenderingContext.R16I, WebGL2RenderingContext.R16UI,
    WebGL2RenderingContext.R32I, WebGL2RenderingContext.R32UI,
    WebGL2RenderingContext.RG8I, WebGL2RenderingContext.RG8UI,
    WebGL2RenderingContext.RG16I, WebGL2RenderingContext.RG16UI,
    WebGL2RenderingContext.RG32I, WebGL2RenderingContext.RG32UI,
    WebGL2RenderingContext.RGBA8I, WebGL2RenderingContext.RGBA8UI,
    WebGL2RenderingContext.RGBA16I, WebGL2RenderingContext.RGBA16UI,
    WebGL2RenderingContext.RGBA32I, WebGL2RenderingContext.RGBA32UI,
    WebGL2RenderingContext.RGB10_A2UI,
]);
const SUPPORTED_EXTENSION_NAMES = [
    "ANGLE_instanced_arrays",
    "OES_element_index_uint",
    "EXT_sRGB",
    "WEBGL_compressed_texture_etc",
    "WEBGL_compressed_texture_etc1",
] as const;
const WEBGL2_PROMOTED_EXTENSION_NAMES = new Set<string>([
    "ANGLE_instanced_arrays",
    "EXT_blend_minmax",
    "EXT_frag_depth",
    "EXT_shader_texture_lod",
    "EXT_sRGB",
    "OES_element_index_uint",
    "OES_standard_derivatives",
    "OES_texture_float",
    "OES_texture_half_float",
    "OES_texture_half_float_linear",
    "OES_vertex_array_object",
    "WEBGL_depth_texture",
    "WEBGL_draw_buffers",
]);
const TRANSFORM_FEEDBACK_TYPE_BYTES = new Map<GLenum, number>([
    [WebGL2RenderingContext.FLOAT, 4],
    [WebGL2RenderingContext.FLOAT_VEC2, 8],
    [WebGL2RenderingContext.FLOAT_VEC3, 12],
    [WebGL2RenderingContext.FLOAT_VEC4, 16],
    [WebGL2RenderingContext.INT, 4],
    [WebGL2RenderingContext.INT_VEC2, 8],
    [WebGL2RenderingContext.INT_VEC3, 12],
    [WebGL2RenderingContext.INT_VEC4, 16],
    [WebGL2RenderingContext.UNSIGNED_INT, 4],
    [WebGL2RenderingContext.UNSIGNED_INT_VEC2, 8],
    [WebGL2RenderingContext.UNSIGNED_INT_VEC3, 12],
    [WebGL2RenderingContext.UNSIGNED_INT_VEC4, 16],
    [WebGL2RenderingContext.FLOAT_MAT2, 16],
    [WebGL2RenderingContext.FLOAT_MAT3, 36],
    [WebGL2RenderingContext.FLOAT_MAT4, 64],
    [WebGL2RenderingContext.FLOAT_MAT2x3, 24],
    [WebGL2RenderingContext.FLOAT_MAT2x4, 32],
    [WebGL2RenderingContext.FLOAT_MAT3x2, 24],
    [WebGL2RenderingContext.FLOAT_MAT3x4, 48],
    [WebGL2RenderingContext.FLOAT_MAT4x2, 32],
    [WebGL2RenderingContext.FLOAT_MAT4x3, 48],
]);
const SUPPORTED_EXTENSION_BY_LOWER_NAME = new Map(
    SUPPORTED_EXTENSION_NAMES.map((name) => [name.toLowerCase(), name]),
);
const VALID_DRAW_MODES = new Set<number>([
    WebGL2RenderingContext.POINTS,
    WebGL2RenderingContext.LINES,
    WebGL2RenderingContext.LINE_LOOP,
    WebGL2RenderingContext.LINE_STRIP,
    WebGL2RenderingContext.TRIANGLES,
    WebGL2RenderingContext.TRIANGLE_STRIP,
    WebGL2RenderingContext.TRIANGLE_FAN,
]);
let frameDepth = 0;
let autoFrameScheduled = false;

function isBufferSource(value: unknown): value is ArrayBufferLike | ArrayBufferView {
    if (ArrayBuffer.isView(value)) return true;
    if (value instanceof ArrayBuffer) return true;
    const SharedArrayBufferConstructor = (globalThis as any).SharedArrayBuffer;
    return Boolean(SharedArrayBufferConstructor && value instanceof SharedArrayBufferConstructor);
}

function toWebGlInt32(value: unknown): number {
    return Number(value) >> 0;
}

function toWebGlInt64(value: unknown): number {
    const converted = Number(value);
    return Number.isFinite(converted) ? Math.trunc(converted) : 0;
}

function clampWebGlUnitFloat(value: number): number {
    if (Number.isNaN(value)) return 0;
    return Math.min(1, Math.max(0, value));
}

function linearToSrgb(value: number): number {
    const clamped = clampWebGlUnitFloat(value);
    return clamped <= 0.0031308
        ? clamped * 12.92
        : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

function isWebGlIdentifierName(name: string, allowUniformPath: boolean = false): boolean {
    if (!allowUniformPath) return /^[A-Za-z_]\w*$/.test(name);
    return /^[A-Za-z_]\w*(?:(?:\[\d+\])|(?:\.[A-Za-z_]\w*))*$/.test(name);
}

function isVisibleActiveUniform(uniform: ProgramUniformBuffer): boolean {
    return !uniform.internal || Boolean(uniform.sourceName?.startsWith("gl_"));
}

function mixesConstantColorAndAlpha(first: GLenum, second: GLenum): boolean {
    const color = first === WebGL2RenderingContext.CONSTANT_COLOR ||
        first === WebGL2RenderingContext.ONE_MINUS_CONSTANT_COLOR ||
        second === WebGL2RenderingContext.CONSTANT_COLOR ||
        second === WebGL2RenderingContext.ONE_MINUS_CONSTANT_COLOR;
    const alpha = first === WebGL2RenderingContext.CONSTANT_ALPHA ||
        first === WebGL2RenderingContext.ONE_MINUS_CONSTANT_ALPHA ||
        second === WebGL2RenderingContext.CONSTANT_ALPHA ||
        second === WebGL2RenderingContext.ONE_MINUS_CONSTANT_ALPHA;
    return color && alpha;
}

function vertexComponentByteSize(type: GLenum): number {
    switch (type) {
        case WebGL2RenderingContext.BYTE:
        case WebGL2RenderingContext.UNSIGNED_BYTE:
            return 1;
        case WebGL2RenderingContext.SHORT:
        case WebGL2RenderingContext.UNSIGNED_SHORT:
        case WebGL2RenderingContext.HALF_FLOAT:
            return 2;
        case WebGL2RenderingContext.INT:
        case WebGL2RenderingContext.UNSIGNED_INT:
        case WebGL2RenderingContext.INT_2_10_10_10_REV:
        case WebGL2RenderingContext.UNSIGNED_INT_2_10_10_10_REV:
        case WebGL2RenderingContext.FLOAT:
            return 4;
        default:
            return 0;
    }
}

function vertexFormatNeedsFloatConversion(type: GLenum, size: number, normalized: boolean): boolean {
    if (type === WebGL2RenderingContext.FLOAT) return false;
    if (type === WebGL2RenderingContext.INT_2_10_10_10_REV ||
        type === WebGL2RenderingContext.UNSIGNED_INT_2_10_10_10_REV) return true;
    if (type === WebGL2RenderingContext.HALF_FLOAT) return size !== 2 && size !== 4;
    if (type === WebGL2RenderingContext.INT || type === WebGL2RenderingContext.UNSIGNED_INT) return true;
    return !normalized || (size !== 2 && size !== 4);
}

interface PreparedIndexedDraw {
    stateToken: object;
    elementArrayBuffer: HydBuffer;
    bufferVersion: number;
    mode: GLenum;
    count: number;
    type: GLenum;
    offset: number;
    instanceCount: number;
    instancedApi: boolean;
    indexBuffer: GPUBuffer;
    indexFormat: GPUIndexFormat;
    indexCount: number;
    firstIndex: number;
}

interface PreparedArrayDraw {
    stateToken: object;
    mode: GLenum;
    first: number;
    count: number;
    instanceCount: number;
    instancedApi: boolean;
    indexBuffer?: GPUBuffer;
    indexCount?: number;
}

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
    private [RENDER_PASS_DESCRIPTOR_CALLBACK]: () => GPURenderPassDescriptor;
    hydLastCanvasSize: [number, number] = [-1, -1];
    private canvasSizeDirty: boolean = true;
    private readonly maxDrawingBufferDimension: number;
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
    private hydRpCache: HydRenderPassCache;
    private shaderTranslator: ShaderTranslator;
    private triangleFanIndexBuffers: Map<number, GPUBuffer> = new Map();
    private lineLoopIndexBuffers: Map<number, GPUBuffer> = new Map();
    private lastProvokingVertexIndexBuffers: Map<string, { buffer: GPUBuffer, indexCount: number }> = new Map();
    private readonly hydTextureObjects: WeakMap<object, HydTexture> = new WeakMap();
    private readonly hydBufferObjects: WeakMap<object, HydBuffer> = new WeakMap();
    private readonly contextToken: object = {};
    private readonly maskedClearPipelines: Map<string, GPURenderPipeline> = new Map();
    private maskedClearUniformBuffer: GPUBuffer = null;
    private readonly integerClearPipelines: Map<string, GPURenderPipeline> = new Map();
    private integerClearUniformBuffer: GPUBuffer = null;
    private readonly depthStencilClearPipelines: Map<string, GPURenderPipeline> = new Map();
    private depthStencilClearUniformBuffer: GPUBuffer = null;
    private readonly colorBlitPipelines: Map<string, GPURenderPipeline> = new Map();
    private colorBlitUniformBuffer: GPUBuffer = null;
    private colorBlitLinearSampler: GPUSampler = null;
    private readonly depthBlitPipelines: Map<string, GPURenderPipeline> = new Map();
    private readonly stencilCapturePipelines: Map<string, GPURenderPipeline> = new Map();
    private readonly stencilWritePipelines: Map<string, GPURenderPipeline> = new Map();
    private readonly stencilZeroPipelines: Map<string, GPURenderPipeline> = new Map();
    private depthStencilBlitUniformBuffer: GPUBuffer = null;
    private samplerOriginStateVersion: number = 0;
    private gpuViewportDirty: boolean = true;
    private gpuScissorDirty: boolean = true;
    private lastDrawPbv: any = null;
    private pendingReadbacks: Promise<void>[] = [];
    private readonly pendingPixelPackReadbacks: WeakMap<HydBuffer, Set<{
        settled: boolean;
        fallbackUsed: boolean;
        completeSynchronously: () => void;
    }>> = new WeakMap();
    private framebufferWriteGeneration: number = 0;
    private normalizedReadPixelsCache: {
        stateToken: object;
        writeGeneration: number;
        key: string;
        pixels: Uint8Array;
    } | null = null;
    private activeUniformBuffers: ProgramUniformBuffer[] = [];
    private activeUniformSamplers: ProgramUniformSampler[] = [];
    private currentProgramValid: boolean = false;
    private synchronousReadbackCanvas: HTMLCanvasElement = null;
    private synchronousReadbackContext: CanvasRenderingContext2D = null;
    private synchronousSnapshotCanvas: OffscreenCanvas = null;
    private synchronousSnapshotContext: GPUCanvasContext = null;
    private snapshotRgbPipeline: GPURenderPipeline = null;
    private snapshotAlphaPipeline: GPURenderPipeline = null;
    private readonly integerSnapshotPipelines: Map<string, GPURenderPipeline> = new Map();
    private packedUnormSnapshotPipeline: GPURenderPipeline = null;
    private exactExternalReadCanvas: HTMLCanvasElement = null;
    private exactExternalReadContext: CanvasRenderingContext2D = null;
    private defaultFramebufferBackingTexture: GPUTexture = null;
    private defaultFramebufferBackingView: GPUTextureView = null;
    private defaultFramebufferMultisampleTexture: GPUTexture = null;
    private useDefaultFramebufferBacking: boolean = true;
    private defaultFramebufferBackingNeedsPresentation: boolean = false;
    private defaultFramebufferNeedsImplicitClear: boolean = true;
    private drawingBufferFormatOverride: GLenum | null = null;
    private canvasPresentationPipeline: GPURenderPipeline = null;
    private canvasPresentationBindGroup: GPUBindGroup = null;
    private readonly enabledExtensions: Set<string> = new Set();
    private readonly extensionObjects: Map<string, object> = new Map();
    private readonly drawValidationCache: WeakMap<object, {
        valid: boolean,
        vertexCapacity: number,
        instanceCapacity: number,
        hasActivePerVertexAttribute: boolean,
    }> = new WeakMap();
    private readonly successfulDrawSemanticValidations: WeakMap<object, number> = new WeakMap();
    private drawSemanticValidationGeneration: number = 0;
    private readonly indexedDrawCache: WeakMap<object, PreparedIndexedDraw[]> = new WeakMap();
    private readonly arrayDrawCache: WeakMap<object, PreparedArrayDraw[]> = new WeakMap();
    private lastIndexedDraw: PreparedIndexedDraw = null;
    private lastArrayDraw: PreparedArrayDraw = null;
    private readonly uniformBufferBindings: Array<HydIndexedBufferBinding | null> = Array.from({ length: 72 }, () => null);
    private readonly samplerBindings: Array<HydSampler | null> = Array.from({ length: 16 }, () => null);
    private readonly defaultTransformFeedback: HydTransformFeedback = new HydTransformFeedback();
    private readonly transformFeedbackObjects: Set<HydTransformFeedback> = new Set();
    private transformFeedbackBinding: HydTransformFeedback;
    private transformFeedbackExecutor: HydTransformFeedbackExecutor | null = null;
    private readonly queryObjects: Set<HydQuery> = new Set();
    private readonly activeQueries: Map<GLenum, HydQuery> = new Map();
    private readonly syncObjects: Set<HydSync> = new Set();

    get unpackColorSpace(): "srgb" | "display-p3" {
        return this.hydGlobalState?.miscState.unpackColorSpace || "srgb";
    }

    set unpackColorSpace(value: "srgb" | "display-p3") {
        if ((value === "srgb" || value === "display-p3") && this.hydGlobalState) {
            this.hydGlobalState.miscState.unpackColorSpace = value;
        }
    }

    private getSnapshotPipeline(channel: "rgb" | "alpha"): GPURenderPipeline {
        const cached = channel === "rgb" ? this.snapshotRgbPipeline : this.snapshotAlphaPipeline;
        if (cached) return cached;
        const module = this.hydDevice.createShaderModule({
            label: "lossless texture snapshot shader",
            code: `
@group(0) @binding(0) var source : texture_2d<f32>;

@vertex
fn vertexMain(@builtin(vertex_index) index : u32) -> @builtin(position) vec4f {
  let positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  return vec4f(positions[index], 0.0, 1.0);
}

@fragment
fn fragmentRgb(@builtin(position) position : vec4f) -> @location(0) vec4f {
  let color = textureLoad(source, vec2i(position.xy), 0);
  return vec4f(color.rgb, 1.0);
}

@fragment
fn fragmentAlpha(@builtin(position) position : vec4f) -> @location(0) vec4f {
  let color = textureLoad(source, vec2i(position.xy), 0);
  return vec4f(color.aaa, 1.0);
}
`,
        });
        const pipeline = this.hydDevice.createRenderPipeline({
            label: `lossless ${channel} texture snapshot pipeline`,
            layout: "auto",
            vertex: { module, entryPoint: "vertexMain" },
            fragment: {
                module,
                entryPoint: channel === "rgb" ? "fragmentRgb" : "fragmentAlpha",
                targets: [{ format: "bgra8unorm" }],
            },
            primitive: { topology: "triangle-list" },
        });
        if (channel === "rgb") {
            this.snapshotRgbPipeline = pipeline;
        } else {
            this.snapshotAlphaPipeline = pipeline;
        }
        return pipeline;
    }

    private snapshotTextureChannel(
        texture: GPUTexture,
        width: number,
        height: number,
        channel: "rgb" | "alpha",
        mipLevel: number = 0,
        layer: number = 0,
        viewFormat?: GPUTextureFormat,
    ): ImageBitmap | null {
        if (typeof OffscreenCanvas === "undefined") return null;
        if (!this.synchronousSnapshotCanvas) {
            this.synchronousSnapshotCanvas = new OffscreenCanvas(width, height);
            this.synchronousSnapshotContext = this.synchronousSnapshotCanvas.getContext("webgpu") as GPUCanvasContext;
        }
        const canvas = this.synchronousSnapshotCanvas;
        const context = this.synchronousSnapshotContext;
        if (!context) return null;
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        context.configure({
            device: this.hydDevice,
            format: "bgra8unorm",
            alphaMode: "opaque",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
        const pipeline = this.getSnapshotPipeline(channel);
        const sourceView = texture.createView({
            dimension: "2d",
            format: viewFormat,
            baseMipLevel: mipLevel,
            mipLevelCount: 1,
            baseArrayLayer: layer,
            arrayLayerCount: 1,
        });
        const bindGroup = this.hydDevice.createBindGroup({
            label: `lossless ${channel} texture snapshot bind group`,
            layout: pipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: sourceView }],
        });
        const encoder = this.hydDevice.createCommandEncoder({ label: `synchronous ${channel} texture snapshot` });
        const pass = encoder.beginRenderPass({
            label: `synchronous ${channel} texture snapshot pass`,
            colorAttachments: [{
                view: context.getCurrentTexture().createView(),
                loadOp: "clear",
                storeOp: "store",
                clearValue: [0, 0, 0, 1],
            }],
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();
        this.hydDevice.queue.submit([encoder.finish()]);
        return canvas.transferToImageBitmap();
    }

    private getIntegerSnapshotPipeline(signed: boolean): GPURenderPipeline {
        const key = signed ? "sint" : "uint";
        let pipeline = this.integerSnapshotPipelines.get(key);
        if (pipeline) return pipeline;
        const scalar = signed ? "i32" : "u32";
        const word = signed ? "bitcast<u32>(value[component])" : "value[component]";
        const module = this.hydDevice.createShaderModule({
            label: `lossless ${key} texture snapshot shader`,
            code: `
@group(0) @binding(0) var source : texture_2d<${scalar}>;

@vertex
fn vertexMain(@builtin(vertex_index) index : u32) -> @builtin(position) vec4f {
  let positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  return vec4f(positions[index], 0.0, 1.0);
}

@fragment
fn fragmentMain(@builtin(position) position : vec4f) -> @location(0) vec4f {
  let encodedX = u32(position.x);
  let component = (encodedX / 2u) % 4u;
  let sourceCoord = vec2i(i32(encodedX / 8u), i32(position.y));
  let value = textureLoad(source, sourceCoord, 0);
  let bits = ${word};
  if ((encodedX & 1u) == 0u) {
    return vec4f(
      f32(bits & 255u),
      f32((bits >> 8u) & 255u),
      f32((bits >> 16u) & 255u),
      255.0
    ) / 255.0;
  }
  return vec4f(f32((bits >> 24u) & 255u), 0.0, 0.0, 255.0) / 255.0;
}
`,
        });
        pipeline = this.hydDevice.createRenderPipeline({
            label: `lossless ${key} texture snapshot pipeline`,
            layout: "auto",
            vertex: { module, entryPoint: "vertexMain" },
            fragment: { module, entryPoint: "fragmentMain", targets: [{ format: "bgra8unorm" }] },
            primitive: { topology: "triangle-list" },
        });
        this.integerSnapshotPipelines.set(key, pipeline);
        return pipeline;
    }

    private snapshotIntegerTexture(
        texture: GPUTexture,
        width: number,
        height: number,
        signed: boolean,
        mipLevel: number = 0,
        layer: number = 0,
    ): ImageBitmap | null {
        if (typeof OffscreenCanvas === "undefined") return null;
        const encodedWidth = width * 8;
        if (!this.synchronousSnapshotCanvas) {
            this.synchronousSnapshotCanvas = new OffscreenCanvas(encodedWidth, height);
            this.synchronousSnapshotContext = this.synchronousSnapshotCanvas.getContext("webgpu") as GPUCanvasContext;
        }
        const canvas = this.synchronousSnapshotCanvas;
        const context = this.synchronousSnapshotContext;
        if (!context) return null;
        if (canvas.width !== encodedWidth || canvas.height !== height) {
            canvas.width = encodedWidth;
            canvas.height = height;
        }
        context.configure({
            device: this.hydDevice,
            format: "bgra8unorm",
            alphaMode: "opaque",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
        const pipeline = this.getIntegerSnapshotPipeline(signed);
        const sourceView = texture.createView({
            dimension: "2d",
            baseMipLevel: mipLevel,
            mipLevelCount: 1,
            baseArrayLayer: layer,
            arrayLayerCount: 1,
        });
        const bindGroup = this.hydDevice.createBindGroup({
            label: `lossless ${signed ? "sint" : "uint"} texture snapshot bind group`,
            layout: pipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: sourceView }],
        });
        const encoder = this.hydDevice.createCommandEncoder({ label: "synchronous integer texture snapshot" });
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: context.getCurrentTexture().createView(),
                loadOp: "clear",
                storeOp: "store",
                clearValue: [0, 0, 0, 1],
            }],
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();
        this.hydDevice.queue.submit([encoder.finish()]);
        return canvas.transferToImageBitmap();
    }

    private getPackedUnormSnapshotPipeline(): GPURenderPipeline {
        if (this.packedUnormSnapshotPipeline) return this.packedUnormSnapshotPipeline;
        const module = this.hydDevice.createShaderModule({
            label: "lossless rgb10a2unorm snapshot shader",
            code: `
@group(0) @binding(0) var source : texture_2d<f32>;

@vertex
fn vertexMain(@builtin(vertex_index) index : u32) -> @builtin(position) vec4f {
  let positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  return vec4f(positions[index], 0.0, 1.0);
}

@fragment
fn fragmentMain(@builtin(position) position : vec4f) -> @location(0) vec4f {
  let encodedX = u32(position.x);
  let sourceCoord = vec2i(i32(encodedX / 2u), i32(position.y));
  let color = clamp(textureLoad(source, sourceCoord, 0), vec4f(0.0), vec4f(1.0));
  let value = vec4u(round(color * vec4f(1023.0, 1023.0, 1023.0, 3.0)));
  let bits = value.r | (value.g << 10u) | (value.b << 20u) | (value.a << 30u);
  if ((encodedX & 1u) == 0u) {
    return vec4f(
      f32(bits & 255u),
      f32((bits >> 8u) & 255u),
      f32((bits >> 16u) & 255u),
      255.0
    ) / 255.0;
  }
  return vec4f(f32((bits >> 24u) & 255u), 0.0, 0.0, 255.0) / 255.0;
}
`,
        });
        this.packedUnormSnapshotPipeline = this.hydDevice.createRenderPipeline({
            label: "lossless rgb10a2unorm snapshot pipeline",
            layout: "auto",
            vertex: { module, entryPoint: "vertexMain" },
            fragment: { module, entryPoint: "fragmentMain", targets: [{ format: "bgra8unorm" }] },
            primitive: { topology: "triangle-list" },
        });
        return this.packedUnormSnapshotPipeline;
    }

    private snapshotPackedUnormTexture(
        texture: GPUTexture,
        width: number,
        height: number,
        mipLevel: number = 0,
        layer: number = 0,
    ): ImageBitmap | null {
        if (typeof OffscreenCanvas === "undefined") return null;
        const encodedWidth = width * 2;
        if (!this.synchronousSnapshotCanvas) {
            this.synchronousSnapshotCanvas = new OffscreenCanvas(encodedWidth, height);
            this.synchronousSnapshotContext = this.synchronousSnapshotCanvas.getContext("webgpu") as GPUCanvasContext;
        }
        const canvas = this.synchronousSnapshotCanvas;
        const context = this.synchronousSnapshotContext;
        if (!context) return null;
        if (canvas.width !== encodedWidth || canvas.height !== height) {
            canvas.width = encodedWidth;
            canvas.height = height;
        }
        context.configure({
            device: this.hydDevice,
            format: "bgra8unorm",
            alphaMode: "opaque",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
        const pipeline = this.getPackedUnormSnapshotPipeline();
        const sourceView = texture.createView({
            dimension: "2d",
            baseMipLevel: mipLevel,
            mipLevelCount: 1,
            baseArrayLayer: layer,
            arrayLayerCount: 1,
        });
        const bindGroup = this.hydDevice.createBindGroup({
            label: "lossless rgb10a2unorm snapshot bind group",
            layout: pipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: sourceView }],
        });
        const encoder = this.hydDevice.createCommandEncoder({ label: "synchronous rgb10a2unorm snapshot" });
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: context.getCurrentTexture().createView(),
                loadOp: "clear",
                storeOp: "store",
                clearValue: [0, 0, 0, 1],
            }],
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();
        this.hydDevice.queue.submit([encoder.finish()]);
        return canvas.transferToImageBitmap();
    }

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

    public get drawingBufferWidth(): number {
        if (this.canvasSizeDirty) this.updateCanvasSize();
        return Math.max(1, Math.min(this.hydCanvas.width, this.maxDrawingBufferDimension));
    }

    public get drawingBufferHeight(): number {
        if (this.canvasSizeDirty) this.updateCanvasSize();
        return Math.max(1, Math.min(this.hydCanvas.height, this.maxDrawingBufferDimension));
    }

    public get drawingBufferFormat(): GLenum {
        if (this.drawingBufferFormatOverride !== null) {
            return this.drawingBufferFormatOverride;
        }
        return this.hydGlobalState.contextAttributes.alpha === false
            ? WebGL2RenderingContext.RGB8
            : WebGL2RenderingContext.RGBA8;
    }

    drawingBufferStorage(format: GLenum, width: GLsizei, height: GLsizei) {
        if (this.hydGlobalState.contextAttributes.alpha === false) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const rgba8 = WebGL2RenderingContext.RGBA8;
        const srgb8Alpha8 = WebGL2RenderingContext.SRGB8_ALPHA8 || GL_SRGB8_ALPHA8_EXT;
        if (format === WebGL2RenderingContext.RGBA16F) {
            if (!this.enabledExtensions.has("EXT_COLOR_BUFFER_FLOAT")) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return;
            }
            // The advertised extension set currently excludes float default buffers.
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (format !== rgba8 && format !== srgb8Alpha8) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        const maxSize = Number(enumToConstant.get(WebGL2RenderingContext.MAX_RENDERBUFFER_SIZE)) || 4096;
        if (width <= 0 || height <= 0 || width > maxSize || height > maxSize) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }

        this.discardPendingCanvasCommands();
        this.drawingBufferFormatOverride = format;
        this.useDefaultFramebufferBacking = true;
        this.hydCanvas.width = width;
        this.hydCanvas.height = height;
        this.canvasSizeDirty = true;
        this.updateCanvasSize();
        this.hydGlobalState.recordTransition("drawingBufferStorage", format, width, height);
    }

    private canvasExceedsDrawingBufferLimit(): boolean {
        return this.hydCanvas.width > this.maxDrawingBufferDimension ||
            this.hydCanvas.height > this.maxDrawingBufferDimension;
    }

    private clampCanvasToDrawingBufferLimit() {
        const canvas = this.hydCanvas;
        for (const property of ["width", "height"] as const) {
            const value = canvas[property];
            if (value <= this.maxDrawingBufferDimension) continue;
            const descriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, property);
            descriptor?.set?.call(canvas, this.maxDrawingBufferDimension);
        }
    }

    private installCanvasSizeTracking() {
        const canvas = this.hydCanvas;
        for (const property of ["width", "height"] as const) {
            const descriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, property);
            if (!descriptor?.get || !descriptor.set) continue;
            try {
                Object.defineProperty(canvas, property, {
                    configurable: true,
                    enumerable: descriptor.enumerable,
                    get: () => descriptor.get.call(canvas),
                    set: (value: number) => {
                        const previous = descriptor.get.call(canvas);
                        if (Number(value) === previous) return;
                        this.discardPendingCanvasCommands();
                        descriptor.set.call(canvas, value);
                        if (descriptor.get.call(canvas) !== previous) {
                            this.canvasSizeDirty = true;
                            if (this.hydGlobalState) {
                                this.hydGlobalState.drawingBufferGeneration++;
                                this.hydGlobalState.recordTransition(
                                    "canvasResize",
                                    this.hydGlobalState.drawingBufferGeneration,
                                );
                            }
                        }
                    },
                });
            } catch (_) {
            }
        }
    }

    private discardPendingCanvasCommands() {
        if (!this.hydRpCache) return;
        this.hydRpCache.CeDiscardAndReset();
        this.hydUniOff = 0;
        this.lastDrawPbv = null;
        if (this.hydGlobalState) this.hydGlobalState.clearState.target = 0;
    }

    private setObjectValidationError(...objects: any[]) {
        const foreignObject = objects.some((object) => object && object.ownerToken && object.ownerToken !== this.contextToken);
        const deletedObject = objects.some((object) => object && object.deleted === true);
        this.hydGlobalState.setError(foreignObject || deletedObject
            ? WebGL2RenderingContext.INVALID_OPERATION
            : WebGL2RenderingContext.INVALID_VALUE);
    }

    private setShaderProgramValidationError(...objects: any[]) {
        const foreignObject = objects.some((object) =>
            object && object.ownerToken && object.ownerToken !== this.contextToken);
        this.hydGlobalState.setError(foreignObject
            ? WebGL2RenderingContext.INVALID_OPERATION
            : WebGL2RenderingContext.INVALID_VALUE);
    }

    regenerateDS(
        label: string,
        format: GPUTextureFormat,
        internalFormat: GLenum,
        compareFunc: GPUCompareFunction,
        bindPoint: GLenum,
        width: number,
        height: number,
        sampleCount: number = 1,
    ) {
        const texture = new HydTexture(this.hydDevice);
        texture.label = label;
        texture.state.compare = compareFunc;
        texture.renderbufferInternalFormat = internalFormat;
        texture.renderbufferStorage(format, width, height, sampleCount);
        texture.viewDimension = '2d';
        this.hydGlobalState.defaultFramebuffer.attachments.set(bindPoint, new FramebufferAttributes(bindPoint, undefined, undefined, texture, undefined, WebGL2RenderingContext.RENDERBUFFER));
        this.hydGlobalState.defaultFramebuffer.resetHash();
    }

    private shouldUseDefaultFramebufferBacking(): boolean {
        return this.useDefaultFramebufferBacking ||
            this.hydGlobalState.contextAttributes.preserveDrawingBuffer === true ||
            this.hydGlobalState.contextAttributes.premultipliedAlpha === false ||
            !this.hydCanvas.isConnected;
    }

    private shouldKeepDefaultFramebufferBackingAcrossResize(): boolean {
        return this.useDefaultFramebufferBacking ||
            this.hydGlobalState.contextAttributes.preserveDrawingBuffer === true ||
            this.hydGlobalState.contextAttributes.premultipliedAlpha === false;
    }

    private createDefaultFramebufferBacking() {
        const width = this.hydCanvas.width;
        const height = this.hydCanvas.height;
        if (width <= 0 || height <= 0) return;
        this.defaultFramebufferBackingTexture?.destroy();
        this.defaultFramebufferBackingTexture = this.hydDevice.createTexture({
            label: `defaultFramebufferBacking ${width}x${height}`,
            size: { width, height, depthOrArrayLayers: 1 },
            format: "bgra8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT |
                GPUTextureUsage.COPY_SRC |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.TEXTURE_BINDING,
        });
        this.defaultFramebufferBackingView = this.defaultFramebufferBackingTexture.createView({
            label: `defaultFramebufferBackingView ${width}x${height}`,
        });
        this.defaultFramebufferBackingNeedsPresentation = false;
        this.canvasPresentationBindGroup = null;
    }

    private createDefaultFramebufferMultisampleTarget(width: number, height: number) {
        this.defaultFramebufferMultisampleTexture?.destroy();
        this.defaultFramebufferMultisampleTexture = null;
        this.hydGlobalState.__canvasMultisampleView = null;
        if (this.hydGlobalState.contextAttributes.antialias !== true || width <= 0 || height <= 0) return;
        this.defaultFramebufferMultisampleTexture = this.hydDevice.createTexture({
            label: `defaultFramebufferMSAA ${width}x${height}`,
            size: { width, height, depthOrArrayLayers: 1 },
            sampleCount: 4,
            format: "bgra8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
        this.hydGlobalState.__canvasMultisampleView = this.defaultFramebufferMultisampleTexture.createView({
            label: `defaultFramebufferMSAAView ${width}x${height}`,
        });
    }

    private getCanvasPresentationPipeline(): GPURenderPipeline {
        if (this.canvasPresentationPipeline) return this.canvasPresentationPipeline;
        const module = this.hydDevice.createShaderModule({
            label: "straight-alpha canvas presentation shader",
            code: `
@group(0) @binding(0) var source : texture_2d<f32>;

@vertex
fn vertexMain(@builtin(vertex_index) index : u32) -> @builtin(position) vec4f {
  let positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  return vec4f(positions[index], 0.0, 1.0);
}

@fragment
fn fragmentMain(@builtin(position) position : vec4f) -> @location(0) vec4f {
  let color = textureLoad(source, vec2i(position.xy), 0);
  return vec4f(color.rgb * color.a, color.a);
}
`,
        });
        this.canvasPresentationPipeline = this.hydDevice.createRenderPipeline({
            label: "straight-alpha canvas presentation pipeline",
            layout: "auto",
            vertex: { module, entryPoint: "vertexMain" },
            fragment: {
                module,
                entryPoint: "fragmentMain",
                targets: [{ format: "bgra8unorm" }],
            },
            primitive: { topology: "triangle-list" },
        });
        return this.canvasPresentationPipeline;
    }

    private activateDefaultFramebufferBacking(preserveCurrentContents: boolean) {
        if (this.defaultFramebufferBackingTexture) {
            this.useDefaultFramebufferBacking = true;
            this.hydGlobalState.__canvasTexture = this.defaultFramebufferBackingTexture;
            this.hydGlobalState.__canvasView = this.defaultFramebufferBackingView;
            return;
        }
        const currentTexture = this.hydGlobalState.__canvasTexture;
        this.createDefaultFramebufferBacking();
        if (!this.defaultFramebufferBackingTexture) return;
        if (preserveCurrentContents && currentTexture && currentTexture !== this.defaultFramebufferBackingTexture) {
            const encoder = this.hydDevice.createCommandEncoder({ label: "preserve default framebuffer" });
            encoder.copyTextureToTexture(
                { texture: currentTexture },
                { texture: this.defaultFramebufferBackingTexture },
                {
                    width: this.hydCanvas.width,
                    height: this.hydCanvas.height,
                    depthOrArrayLayers: 1,
                },
            );
            this.hydDevice.queue.submit([encoder.finish()]);
        }
        this.useDefaultFramebufferBacking = true;
        this.hydGlobalState.__canvasTexture = this.defaultFramebufferBackingTexture;
        this.hydGlobalState.__canvasView = this.defaultFramebufferBackingView;
    }

    private presentDefaultFramebufferBacking() {
        if (!this.defaultFramebufferBackingTexture || !this.defaultFramebufferBackingNeedsPresentation ||
            this.hydCanvas.width <= 0 || this.hydCanvas.height <= 0) return;
        const canvasTexture = this.hydGpuctx.getCurrentTexture();
        const encoder = this.hydDevice.createCommandEncoder({ label: "present default framebuffer backing" });
        const needsPremultiply = this.hydGlobalState.contextAttributes.alpha !== false &&
            this.hydGlobalState.contextAttributes.premultipliedAlpha === false;
        if (needsPremultiply) {
            const pipeline = this.getCanvasPresentationPipeline();
            if (!this.canvasPresentationBindGroup) {
                this.canvasPresentationBindGroup = this.hydDevice.createBindGroup({
                    label: "straight-alpha canvas presentation bind group",
                    layout: pipeline.getBindGroupLayout(0),
                    entries: [{ binding: 0, resource: this.defaultFramebufferBackingView }],
                });
            }
            const pass = encoder.beginRenderPass({
                label: "straight-alpha canvas presentation pass",
                colorAttachments: [{
                    view: canvasTexture.createView(),
                    loadOp: "clear",
                    storeOp: "store",
                    clearValue: [0, 0, 0, 0],
                }],
            });
            pass.setPipeline(pipeline);
            pass.setBindGroup(0, this.canvasPresentationBindGroup);
            pass.draw(3);
            pass.end();
        } else {
            encoder.copyTextureToTexture(
                { texture: this.defaultFramebufferBackingTexture },
                { texture: canvasTexture },
                {
                    width: this.hydCanvas.width,
                    height: this.hydCanvas.height,
                    depthOrArrayLayers: 1,
                },
            );
        }
        this.hydDevice.queue.submit([encoder.finish()]);
        this.defaultFramebufferBackingNeedsPresentation = false;
    }

    private prepareDefaultFramebufferForExternalRead(): boolean {
        if (this.canvasSizeDirty) {
            this.updateCanvasSize();
        }
        const hasGpuSource = Boolean(this.hydGlobalState.__canvasTexture || this.defaultFramebufferBackingTexture);
        this._der_flush();
        if (!hasGpuSource) return false;
        this.activateDefaultFramebufferBacking(true);
        this.materializeImplicitDefaultFramebufferClear();
        this._der_flush();
        this.presentDefaultFramebufferBacking();
        return Boolean(this.defaultFramebufferBackingTexture);
    }

    public prepareCanvasForExternalRead(): HTMLCanvasElement {
        if (this.canvasSizeDirty) this.updateCanvasSize();
        const hasGpuSource = Boolean(this.hydGlobalState.__canvasTexture || this.defaultFramebufferBackingTexture);
        this._der_flush();
        if (!hasGpuSource) return this.hydCanvas;
        this.activateDefaultFramebufferBacking(Boolean(this.hydGlobalState.__canvasTexture));
        this.materializeImplicitDefaultFramebufferClear();
        this._der_flush();
        const snapshot = this.prepareExactExternalReadCanvas();
        if (snapshot) return snapshot;
        this.presentDefaultFramebufferBacking();
        return this.hydCanvas;
    }

    public prepareCanvasForTextureUpload(): HTMLCanvasElement | Uint8Array {
        if (!this.prepareDefaultFramebufferForExternalRead()) return this.hydCanvas;
        return this.prepareExactExternalReadCanvas() || this.hydCanvas;
    }

    private materializeImplicitDefaultFramebufferClear() {
        if (!this.defaultFramebufferNeedsImplicitClear || !this.defaultFramebufferBackingTexture) return;
        this.defaultFramebufferNeedsImplicitClear = false;
        const savedDrawFramebuffer = this.hydGlobalState.commonState.drawFramebufferBinding;
        const clearState = this.hydGlobalState.clearState;
        const savedTarget = clearState.target;
        const savedColor = clearState.color;
        const savedDepth = clearState.depth;
        const savedStencil = clearState.stencil;
        this.hydGlobalState.commonState.drawFramebufferBinding = this.hydGlobalState.defaultFramebuffer;
        clearState.target = WebGL2RenderingContext.COLOR_BUFFER_BIT |
            (this.hydGlobalState.contextAttributes.depth === false ? 0 : WebGL2RenderingContext.DEPTH_BUFFER_BIT) |
            (this.hydGlobalState.contextAttributes.stencil === true ? WebGL2RenderingContext.STENCIL_BUFFER_BIT : 0);
        clearState.color = [0, 0, 0, 0];
        clearState.depth = 1;
        clearState.stencil = 0;
        this.defaultFramebufferBackingNeedsPresentation = true;
        this.hydRpCache.RpClear(this[RENDER_PASS_DESCRIPTOR_CALLBACK]);
        clearState.target = savedTarget;
        clearState.color = savedColor;
        clearState.depth = savedDepth;
        clearState.stencil = savedStencil;
        this.hydGlobalState.commonState.drawFramebufferBinding = savedDrawFramebuffer;
    }

    updateCanvasSize() {
        if (this.canvasExceedsDrawingBufferLimit()) this.clampCanvasToDrawingBufferLimit();
        const width: number = this.hydCanvas.width;
        const height: number = this.hydCanvas.height;
        if (!this.canvasSizeDirty && this.hydLastCanvasSize[0] === width && this.hydLastCanvasSize[1] === height) {
            return;     // skip
        }
        if (width <= 0 || height <= 0) {
            this.discardPendingCanvasCommands();
            this.defaultFramebufferBackingTexture?.destroy();
            this.defaultFramebufferBackingTexture = null;
            this.defaultFramebufferBackingView = null;
            this.defaultFramebufferBackingNeedsPresentation = false;
            this.defaultFramebufferMultisampleTexture?.destroy();
            this.defaultFramebufferMultisampleTexture = null;
            this.hydGlobalState.__canvasMultisampleView = null;
            this.canvasPresentationBindGroup = null;
            this.hydGlobalState.__canvasTexture = null;
            this.hydGlobalState.__canvasView = null;
            this.hydLastCanvasSize = [width, height];
            this.canvasSizeDirty = false;
            return;
        }

        const initialSize = this.hydLastCanvasSize[0] < 0 || this.hydLastCanvasSize[1] < 0;
        if (this.hydRpCache && !initialSize) {
            this.hydRpCache.CeDiscardAndReset();
            this.hydUniOff = 0;
            this.lastDrawPbv = null;
            this.hydGlobalState.clearState.target = 0;
        }

        if (initialSize) {
            this.hydGlobalState.miscState.scissorBox = [0, 0, width, height];
            this.hydGlobalState.commonState.viewport = [0, 0, width, height, 0, 1];
            this.gpuViewportDirty = true;
            this.gpuScissorDirty = true;
        }

        try {
            this.hydGlobalState.defaultFramebuffer.attachments.get(WebGL2RenderingContext.DEPTH_ATTACHMENT).attachment.destroy();
            this.hydGlobalState.defaultFramebuffer.attachments.get(WebGL2RenderingContext.STENCIL_ATTACHMENT).attachment.destroy();
            this.hydGlobalState.defaultFramebuffer.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT).attachment.destroy();
        } catch (error) {
        }
        this.defaultFramebufferBackingTexture?.destroy();
        this.defaultFramebufferBackingTexture = null;
        this.defaultFramebufferBackingView = null;
        this.defaultFramebufferBackingNeedsPresentation = false;
        this.canvasPresentationBindGroup = null;
        this.createDefaultFramebufferMultisampleTarget(width, height);

        this.hydLastCanvasSize = [width, height];
        this.canvasSizeDirty = false;
        const defaultSampleCount = this.hydGlobalState.contextAttributes.antialias === true ? 4 : 1;
        this.regenerateDS(
            `defaultDepthBuffer ${width} ${height}`,
            "depth32float",
            WebGL2RenderingContext.DEPTH_COMPONENT24,
            this.hydGlobalState.depthState.func,
            WebGL2RenderingContext.DEPTH_ATTACHMENT,
            width,
            height,
            defaultSampleCount,
        );
        this.regenerateDS(
            `defaultStencilBuffer ${width} ${height}`,
            "stencil8",
            WebGL2RenderingContext.STENCIL_INDEX8,
            this.hydGlobalState.stencilState.frontFunc,
            WebGL2RenderingContext.STENCIL_ATTACHMENT,
            width,
            height,
            defaultSampleCount,
        );
        this.regenerateDS(
            `defaultDepthStencilBuffer ${width} ${height}`,
            "depth24plus-stencil8",
            WebGL2RenderingContext.DEPTH24_STENCIL8,
            this.hydGlobalState.depthState.func,
            WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT,
            width,
            height,
            defaultSampleCount,
        );
        if (this.shouldKeepDefaultFramebufferBackingAcrossResize()) {
            this.createDefaultFramebufferBacking();
            this.useDefaultFramebufferBacking = true;
            this.hydGlobalState.__canvasTexture = this.defaultFramebufferBackingTexture;
            this.hydGlobalState.__canvasView = this.defaultFramebufferBackingView;
        } else {
            this.hydGlobalState.__canvasTexture = this.hydGpuctx.getCurrentTexture();
            this.hydGlobalState.__canvasView = this.hydGlobalState.__canvasTexture.createView({ label: 'canvasView resized' });
        }
        this.defaultFramebufferNeedsImplicitClear = true;
    }
    constructor(_canvas: HTMLCanvasElement, _gpuctx: GPUCanvasContext, _attributes: WebGLContextAttributes, _device: GPUDevice, _maxUniformSize: number, _replay: number, shaderTranslator: ShaderTranslator, contextType: string = "webgl") {
        this.shaderTranslator = shaderTranslator;
        this.hydContextType = contextType;
        this.hydMaxUniSize = _maxUniformSize;
        this.hydCanvas = _canvas;
        this.maxDrawingBufferDimension = _device.limits.maxTextureDimension2D;
        this.installCanvasSizeTracking();
        hydCanvasContexts.set(this.hydCanvas, this);
        installCanvasReadHooks();
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
        const contextPrototype = contextType === "webgl2"
            ? WebGL2RenderingContext.prototype
            : WebGLRenderingContext.prototype;
        for (const propertyName in hydWebGLConstants) {
            if (!(propertyName in contextPrototype)) continue;
            if (!Object.prototype.hasOwnProperty.call(HydWebGLStatic.prototype, propertyName)) {
                Object.defineProperty(HydWebGLStatic.prototype, propertyName, {
                    configurable: true,
                    enumerable: true,
                    value: hydWebGLConstants[propertyName],
                    writable: false,
                });
            }
            Object.defineProperty(this, propertyName, {
                configurable: true,
                enumerable: true,
                value: hydWebGLConstants[propertyName],
                writable: false,
            });
        }
        this['canvas'] = _canvas;
        this['drawingBufferColorSpace'] = 'srgb';
        // Object.setPrototypeOf(this, glctx.constructor.prototype);
        this.hydWrapper = this;
        this.hydGlobalState = new HydGlobalStateHashed(
            _attributes,
            this.hydUniBuf,
            _device,
            this.hydContextType === "webgl2" ? 2 : 1,
        );
        this.hydGlobalState.samplerBindings = this.samplerBindings;
        this.hydGlobalState.uniformBufferBindings = this.uniformBufferBindings;
        this.transformFeedbackBinding = this.defaultTransformFeedback;
        this.transformFeedbackObjects.add(this.defaultTransformFeedback);
        if (!this.shouldUseDefaultFramebufferBacking() && this.hydCanvas.width > 0 && this.hydCanvas.height > 0) {
            this.hydGlobalState.__canvasTexture = this.hydGpuctx.getCurrentTexture();
            this.hydGlobalState.__canvasView = this.hydGlobalState.__canvasTexture.createView({ label: 'initial canvasView' });
        }
        this[RENDER_PASS_DESCRIPTOR_CALLBACK] = this.hydGlobalState.getRenderPassDescriptor.bind(this.hydGlobalState);

        frameBeginFuncLst.push(this._frameStart.bind(this));  // 这里能work是因为我们只需要draw的第一个参数！
        frameEndFuncList.push(this._frameEnd.bind(this));  // 这里能work是因为我们只需要draw的第一个参数！

        // this.renderPassInfo = new HydRenderPassCache();
        this.hydRpCache = new HydRenderPassCache(this.hydDevice);
        this.hydRpCache.setOcclusionQueryProvider(() => this.allocateActiveOcclusionQuery());
        this.updateCanvasSize();
        const publicOwnProperties = new Set(["canvas", "drawingBufferColorSpace", "drawingBufferFormat", "unpackColorSpace", ...Object.keys(hydWebGLConstants)]);
        for (const propertyName of Object.keys(this)) {
            if (publicOwnProperties.has(propertyName)) continue;
            Object.defineProperty(this, propertyName, { enumerable: false });
        }
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
        this.ensureDefaultFramebufferRenderTarget();
        this.hydRpCache.RpClear(this[RENDER_PASS_DESCRIPTOR_CALLBACK]);
        this.hydGlobalState.clearState.target = 0;
        this.hydGlobalState.recordTransitionOne('!!d0');
    }

    public _der_flush() {
        this.materializePendingClear();
        this.flushUniforms();
        this.hydRpCache.CeSubmitAndReset(); // TODO: schedule Command Encoder.
    }

    public _frameEnd() {
        if (this.canvasSizeDirty) {
            this.discardPendingCanvasCommands();
            return;
        }
        this._der_flush();
        const renderingToBacking = this.defaultFramebufferBackingTexture &&
            this.hydGlobalState.__canvasTexture === this.defaultFramebufferBackingTexture;
        if (renderingToBacking) {
            if (this.hydCanvas.isConnected) {
                this.presentDefaultFramebufferBacking();
                if (this.hydGlobalState.contextAttributes.preserveDrawingBuffer !== true) {
                    this.defaultFramebufferNeedsImplicitClear = true;
                }
            }
        } else {
            this.hydGlobalState.__canvasTexture = null;
            this.hydGlobalState.__canvasView = null;
        }
    }

    public _frameStart() {
        this.hydUniOff = 0;
        this.updateCanvasSize();
        if (this.shouldUseDefaultFramebufferBacking()) {
            this.activateDefaultFramebufferBacking(Boolean(this.hydGlobalState.__canvasTexture));
            this.materializeImplicitDefaultFramebufferClear();
        } else {
            this.hydGlobalState.__canvasTexture = this.hydGpuctx.getCurrentTexture();
            this.hydGlobalState.__canvasView = this.hydGlobalState.__canvasTexture.createView({ label: 'canvasView' });
        }
    }

    private ensureDefaultFramebufferRenderTarget() {
        if (this.hydGlobalState.commonState.drawFramebufferBinding !== this.hydGlobalState.defaultFramebuffer ||
            this.hydGlobalState.__canvasView) {
            return;
        }
        if (this.shouldUseDefaultFramebufferBacking()) {
            this.activateDefaultFramebufferBacking(false);
        } else if (this.hydCanvas.width > 0 && this.hydCanvas.height > 0) {
            this.hydGlobalState.__canvasTexture = this.hydGpuctx.getCurrentTexture();
            this.hydGlobalState.__canvasView = this.hydGlobalState.__canvasTexture.createView({
                label: "canvasView after external read",
            });
        }
        this.hydGlobalState.drawingBufferGeneration++;
        this.hydGlobalState.recordTransition("drawingBufferTarget", this.hydGlobalState.drawingBufferGeneration);
        this.lastDrawPbv = null;
    }

    bindAttribLocation(program: HydProgram, index: GLuint, name: string) {
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return;
        }
        index = Number(index) >>> 0;
        const maxVertexAttribs = enumToConstant.get(WebGL2RenderingContext.MAX_VERTEX_ATTRIBS) || 0;
        if (index >= maxVertexAttribs) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (name.startsWith("gl_") || name.startsWith("webgl_") || name.startsWith("_webgl_")) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const maxNameLength = this.hydContextType === "webgl2" ? 1024 : 256;
        if (name.length > maxNameLength || /[^\x00-\x7f]/.test(name) || !isWebGlIdentifierName(name)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
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
            case WebGL2RenderingContext.MEDIUM_FLOAT:
            case WebGL2RenderingContext.HIGH_FLOAT:
                return brandHydWebGlObject({ rangeMin: 127, rangeMax: 127, precision: 23 }, "shader-precision-format");
            case WebGL2RenderingContext.LOW_INT:
            case WebGL2RenderingContext.MEDIUM_INT:
            case WebGL2RenderingContext.HIGH_INT:
                return brandHydWebGlObject({ rangeMin: 31, rangeMax: 31, precision: 0 }, "shader-precision-format");
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return null;
        }
    }

    detachShader(program: HydProgram, shader: HydShader) {
        if (!this.isProgram(program) || !this.isShader(shader)) {
            this.setShaderProgramValidationError(program, shader);
            return;
        }
        if (!program.detachShader(shader)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
        }
    }

    deleteShader(s: HydShader | null) {
        if (s === null) return;
        if (s instanceof HydShader && s.ownerToken === this.contextToken && s.deleted) return;
        if (!this.isShader(s)) {
            this.setShaderProgramValidationError(s);
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
        if (p instanceof HydProgram && p.ownerToken === this.contextToken && p.deleted) return;
        if (!this.isProgram(p)) {
            this.setShaderProgramValidationError(p);
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
        if (renderbuffer.deleted) return;
        renderbuffer.deleted = true;
        this._der_flush();
        if (this.hydGlobalState.commonState.renderbufferBinding === renderbuffer) {
            this.hydGlobalState.commonState.renderbufferBinding = null;
        }
        for (const callback of renderbuffer.onDelete.splice(0)) callback();
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
        if (hydTexture.deleted) return;
        this._der_flush();
        this.hydGlobalState.deleteTextureBinding(hydTexture);
        hydTexture.deleted = true;
        for (const callback of hydTexture.onDelete.splice(0)) callback();
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
        if (hydBuffer.deleted) return;
        hydBuffer.deleted = true;
        this._der_flush();
        if (this.hydGlobalState.commonState.arrayBufferBinding === hydBuffer) {
            this.hydGlobalState.commonState.arrayBufferBinding = null;
        }
        if (this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding === hydBuffer) {
            this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding = null;
        }
        for (const attribute of this.hydGlobalState.commonState.vertexArrayBinding.attributes) {
            if (attribute.buffer === hydBuffer) attribute.buffer = null;
        }
        if (this.hydGlobalState.commonState.pixelPackBufferBinding === hydBuffer) {
            this.hydGlobalState.commonState.pixelPackBufferBinding = null;
        }
        if (this.hydGlobalState.commonState.pixelUnpackBufferBinding === hydBuffer) {
            this.hydGlobalState.commonState.pixelUnpackBufferBinding = null;
        }
        if (this.hydGlobalState.commonState.copyReadBufferBinding === hydBuffer) {
            this.hydGlobalState.commonState.copyReadBufferBinding = null;
        }
        if (this.hydGlobalState.commonState.copyWriteBufferBinding === hydBuffer) {
            this.hydGlobalState.commonState.copyWriteBufferBinding = null;
        }
        if (this.hydGlobalState.commonState.transformFeedbackBufferBinding === hydBuffer) {
            this.hydGlobalState.commonState.transformFeedbackBufferBinding = null;
        }
        if (this.hydGlobalState.commonState.uniformBufferBinding === hydBuffer) {
            this.hydGlobalState.commonState.uniformBufferBinding = null;
        }
        for (let index = 0; index < this.uniformBufferBindings.length; index++) {
            if (this.uniformBufferBindings[index]?.buffer === hydBuffer) {
                this.uniformBufferBindings[index] = null;
            }
        }
        this.hydGlobalState.invalidateUniformBufferBindingHash();
        for (let index = 0; index < this.transformFeedbackBinding.bufferBindings.length; index++) {
            if (this.transformFeedbackBinding.bufferBindings[index]?.buffer === hydBuffer) {
                this.transformFeedbackBinding.bufferBindings[index] = null;
                this.transformFeedbackBinding.writeOffsets[index] = 0;
            }
        }
        // Unbound vertex-array and transform-feedback objects retain their
        // references until those container bindings are replaced.
        this.hydGlobalState.recordTransition("deleteBuffer", hydBuffer.hash);
    }

    getShaderInfoLog(shader: HydShader) {
        if (!this.isShader(shader)) {
            this.setShaderProgramValidationError(shader);
            return null;
        }
        return shader.infoLog;
    }

    getProgramInfoLog(program: HydProgram) {
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return null;
        }
        return program.infoLog;
    }

    getAttachedShaders(program: HydProgram) {
        if (!(program instanceof HydProgram)) {
            throw new TypeError("getAttachedShaders requires a WebGLProgram");
        }
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return null;
        }
        return program.getAttachedShaders();
    }

    private currentFramebufferBits(pname: GLenum): number {
        const framebuffer = this.hydGlobalState.commonState.drawFramebufferBinding;
        if (framebuffer === this.hydGlobalState.defaultFramebuffer) {
            if (pname === WebGL2RenderingContext.DEPTH_BITS) {
                return this.hydGlobalState.contextAttributes.depth ? 24 : 0;
            }
            if (pname === WebGL2RenderingContext.STENCIL_BITS) {
                return this.hydGlobalState.contextAttributes.stencil ? 8 : 0;
            }
            if (pname === WebGL2RenderingContext.ALPHA_BITS) {
                return this.hydGlobalState.contextAttributes.alpha ? 8 : 0;
            }
            return 8;
        }
        if (pname === WebGL2RenderingContext.DEPTH_BITS) {
            return (framebuffer.attachments.get(WebGL2RenderingContext.DEPTH_ATTACHMENT) ||
                framebuffer.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT))?.depthBits || 0;
        }
        if (pname === WebGL2RenderingContext.STENCIL_BITS) {
            return (framebuffer.attachments.get(WebGL2RenderingContext.STENCIL_ATTACHMENT) ||
                framebuffer.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT))?.stencilBits || 0;
        }
        const color = framebuffer.attachments.get(WebGL2RenderingContext.COLOR_ATTACHMENT0);
        if (!color) return 0;
        const channel = pname === WebGL2RenderingContext.RED_BITS ? 0 :
            pname === WebGL2RenderingContext.GREEN_BITS ? 1 :
                pname === WebGL2RenderingContext.BLUE_BITS ? 2 : 3;
        return color.colorBits[channel];
    }

    getParameter(pname: GLenum) {
        if (this.hydContextType !== "webgl2" &&
            (pname === WebGL2RenderingContext.MAX_COLOR_ATTACHMENTS ||
                pname === WebGL2RenderingContext.MAX_DRAW_BUFFERS) &&
            !this.enabledExtensions.has("WEBGL_DRAW_BUFFERS")) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        if (this.hydContextType === "webgl2") {
            const maxDrawBuffers = Number(enumToConstant.get(WebGL2RenderingContext.MAX_DRAW_BUFFERS)) || 1;
            if (pname >= WebGL2RenderingContext.DRAW_BUFFER0 &&
                pname < WebGL2RenderingContext.DRAW_BUFFER0 + maxDrawBuffers) {
                const index = pname - WebGL2RenderingContext.DRAW_BUFFER0;
                return this.hydGlobalState.commonState.drawFramebufferBinding.drawBuffers[index] ??
                    WebGL2RenderingContext.NONE;
            }
        }
        switch (pname) {
            case WebGL2RenderingContext.VERSION:
                return this.hydContextType === "webgl2"
                    ? "WebGL 2.0 (GL2GPU)"
                    : "WebGL 1.0 (GL2GPU)";
            case WebGL2RenderingContext.SHADING_LANGUAGE_VERSION:
                return this.hydContextType === "webgl2"
                    ? "WebGL GLSL ES 3.00 (GL2GPU)"
                    : "WebGL GLSL ES 1.0 (GL2GPU)";
            case WebGL2RenderingContext.VENDOR:
                return "GL2GPU";
            case WebGL2RenderingContext.RENDERER:
                return "WebGPU";
            case WebGL2RenderingContext.MAX_VIEWPORT_DIMS:
                return new Int32Array([this.maxDrawingBufferDimension, this.maxDrawingBufferDimension]);
            case WebGL2RenderingContext.MAX_3D_TEXTURE_SIZE:
            case WebGL2RenderingContext.MAX_ARRAY_TEXTURE_LAYERS:
                return this.textureLimit(pname);
            case WebGL2RenderingContext.COMPRESSED_TEXTURE_FORMATS: {
                const formats: number[] = [];
                if (this.enabledExtensions.has("WEBGL_COMPRESSED_TEXTURE_ETC")) {
                    formats.push(...ETC2_COMPRESSED_FORMATS.keys());
                }
                if (this.enabledExtensions.has("WEBGL_COMPRESSED_TEXTURE_ETC1")) {
                    formats.push(GL_COMPRESSED_RGB_ETC1_WEBGL);
                }
                return new Uint32Array(formats);
            }
        }
        if (enumToConstant.has(pname)) {
            const value = enumToConstant.get(pname);
            return ArrayBuffer.isView(value) ? (value as any).slice() : value;
        } else {
            switch (pname) {
                case WebGL2RenderingContext.ACTIVE_TEXTURE:
                    return this.hydGlobalState.commonState.activeTextureUnit + WebGL2RenderingContext.TEXTURE0;
                case WebGL2RenderingContext.ARRAY_BUFFER_BINDING:
                    return this.hydGlobalState.commonState.arrayBufferBinding;
                case WebGL2RenderingContext.COPY_READ_BUFFER_BINDING:
                    if (this.hydContextType === "webgl2") return this.hydGlobalState.commonState.copyReadBufferBinding;
                    break;
                case WebGL2RenderingContext.COPY_WRITE_BUFFER_BINDING:
                    if (this.hydContextType === "webgl2") return this.hydGlobalState.commonState.copyWriteBufferBinding;
                    break;
                case WebGL2RenderingContext.PIXEL_PACK_BUFFER_BINDING:
                    if (this.hydContextType === "webgl2") return this.hydGlobalState.commonState.pixelPackBufferBinding;
                    break;
                case WebGL2RenderingContext.PIXEL_UNPACK_BUFFER_BINDING:
                    if (this.hydContextType === "webgl2") return this.hydGlobalState.commonState.pixelUnpackBufferBinding;
                    break;
                case WebGL2RenderingContext.READ_BUFFER:
                    if (this.hydContextType === "webgl2") {
                        return this.hydGlobalState.commonState.readFramebufferBinding.readBuffer;
                    }
                    break;
                case WebGL2RenderingContext.IMPLEMENTATION_COLOR_READ_FORMAT:
                    return this.implementationColorReadParameters().format;
                case WebGL2RenderingContext.IMPLEMENTATION_COLOR_READ_TYPE:
                    return this.implementationColorReadParameters().type;
                case WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER_BINDING:
                    if (this.hydContextType === "webgl2") return this.hydGlobalState.commonState.transformFeedbackBufferBinding;
                    break;
                case WebGL2RenderingContext.UNIFORM_BUFFER_BINDING:
                    if (this.hydContextType === "webgl2") return this.hydGlobalState.commonState.uniformBufferBinding;
                    break;
                case WebGL2RenderingContext.BLEND:
                    return this.hydGlobalState.blendState.enabled;
                case WebGL2RenderingContext.BLEND_COLOR:
                    return new Float32Array(this.hydGlobalState.blendState.color);
                case WebGL2RenderingContext.BLEND_SRC_RGB:
                    return this.hydGlobalState.blendState.srcRGBEnum;
                case WebGL2RenderingContext.BLEND_SRC_ALPHA:
                    return this.hydGlobalState.blendState.srcAlphaEnum;
                case WebGL2RenderingContext.BLEND_DST_RGB:
                    return this.hydGlobalState.blendState.dstRGBEnum;
                case WebGL2RenderingContext.BLEND_DST_ALPHA:
                    return this.hydGlobalState.blendState.dstAlphaEnum;
                case WebGL2RenderingContext.BLEND_EQUATION_RGB:
                    return this.hydGlobalState.blendState.equationRGBEnum;
                case WebGL2RenderingContext.BLEND_EQUATION_ALPHA:
                    return this.hydGlobalState.blendState.equationAlphaEnum;
                case WebGL2RenderingContext.COLOR_CLEAR_VALUE:
                    return new Float32Array(this.hydGlobalState.clearState.color);
                case WebGL2RenderingContext.COLOR_WRITEMASK:
                    return this.hydGlobalState.miscState.colorWriteMask.slice();
                case WebGL2RenderingContext.CULL_FACE:
                    return this.hydGlobalState.polygonState.cullFace;
                case WebGL2RenderingContext.CULL_FACE_MODE:
                    return this.hydGlobalState.polygonState.cullFaceModeEnum;
                case WebGL2RenderingContext.FRONT_FACE:
                    return this.hydGlobalState.polygonState.frontFaceEnum;
                case WebGL2RenderingContext.DEPTH_TEST:
                    return this.hydGlobalState.depthState.enabled;
                case WebGL2RenderingContext.DEPTH_WRITEMASK:
                    return this.hydGlobalState.depthState.writeMask;
                case WebGL2RenderingContext.DEPTH_CLEAR_VALUE:
                    return this.hydGlobalState.clearState.depth;
                case WebGL2RenderingContext.DEPTH_FUNC:
                    return this.hydGlobalState.depthState.funcEnum;
                case WebGL2RenderingContext.DEPTH_RANGE:
                    return new Float32Array(this.hydGlobalState.depthState.range);
                case WebGL2RenderingContext.DITHER:
                    return this.hydGlobalState.miscState.dither;
                case WebGL2RenderingContext.CURRENT_PROGRAM:
                    return this.hydGlobalState.commonState.currentProgram;
                case WebGL2RenderingContext.RASTERIZER_DISCARD:
                    if (this.hydContextType === "webgl2") return this.hydGlobalState.miscState.rasterizerDiscard;
                    break;
                case WebGL2RenderingContext.TRANSFORM_FEEDBACK_BINDING:
                    if (this.hydContextType === "webgl2") {
                        return this.transformFeedbackBinding === this.defaultTransformFeedback ? null : this.transformFeedbackBinding;
                    }
                    break;
                case WebGL2RenderingContext.TRANSFORM_FEEDBACK_ACTIVE:
                    if (this.hydContextType === "webgl2") return this.transformFeedbackBinding.active;
                    break;
                case WebGL2RenderingContext.TRANSFORM_FEEDBACK_PAUSED:
                    if (this.hydContextType === "webgl2") return this.transformFeedbackBinding.paused;
                    break;
                case WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER_BINDING:
                    return this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
                case WebGL2RenderingContext.GENERATE_MIPMAP_HINT:
                    return this.hydGlobalState.miscState.generateMipmapHint;
                case WebGL2RenderingContext.FRAGMENT_SHADER_DERIVATIVE_HINT:
                    if (this.hydContextType === "webgl2") {
                        return this.hydGlobalState.miscState.fragmentShaderDerivativeHint;
                    }
                    break;
                case WebGL2RenderingContext.LINE_WIDTH:
                    return this.hydGlobalState.miscState.lineWidth;
                case WebGL2RenderingContext.POLYGON_OFFSET_FACTOR:
                    return this.hydGlobalState.polygonState.polygonOffsetFactor;
                case WebGL2RenderingContext.POLYGON_OFFSET_FILL:
                    return this.hydGlobalState.polygonState.polygonOffsetFill;
                case WebGL2RenderingContext.POLYGON_OFFSET_UNITS:
                    return this.hydGlobalState.polygonState.polygonOffsetUnits;
                case WebGL2RenderingContext.SAMPLE_ALPHA_TO_COVERAGE:
                    return this.hydGlobalState.miscState.sampleAlphaToCoverage;
                case WebGL2RenderingContext.SAMPLE_COVERAGE:
                    return this.hydGlobalState.miscState.sampleCoverage;
                case WebGL2RenderingContext.SAMPLE_COVERAGE_INVERT:
                    return this.hydGlobalState.miscState.sampleCoverageInvert;
                case WebGL2RenderingContext.SAMPLE_COVERAGE_VALUE:
                    return this.hydGlobalState.miscState.sampleCoverageValue;
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
                case WebGL2RenderingContext.UNPACK_ROW_LENGTH:
                    if (this.hydContextType === "webgl2") return this.hydGlobalState.miscState.unpackRowLength;
                    break;
                case WebGL2RenderingContext.UNPACK_IMAGE_HEIGHT:
                    if (this.hydContextType === "webgl2") return this.hydGlobalState.miscState.unpackImageHeight;
                    break;
                case WebGL2RenderingContext.UNPACK_SKIP_PIXELS:
                    if (this.hydContextType === "webgl2") return this.hydGlobalState.miscState.unpackSkipPixels;
                    break;
                case WebGL2RenderingContext.UNPACK_SKIP_ROWS:
                    if (this.hydContextType === "webgl2") return this.hydGlobalState.miscState.unpackSkipRows;
                    break;
                case WebGL2RenderingContext.UNPACK_SKIP_IMAGES:
                    if (this.hydContextType === "webgl2") return this.hydGlobalState.miscState.unpackSkipImages;
                    break;
                case WebGL2RenderingContext.PACK_ROW_LENGTH:
                    if (this.hydContextType === "webgl2") return this.hydGlobalState.miscState.packRowLength;
                    break;
                case WebGL2RenderingContext.PACK_SKIP_PIXELS:
                    if (this.hydContextType === "webgl2") return this.hydGlobalState.miscState.packSkipPixels;
                    break;
                case WebGL2RenderingContext.PACK_SKIP_ROWS:
                    if (this.hydContextType === "webgl2") return this.hydGlobalState.miscState.packSkipRows;
                    break;
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
                    return this.hydGlobalState.stencilState.frontFuncEnum;
                case WebGL2RenderingContext.STENCIL_BACK_FUNC:
                    return this.hydGlobalState.stencilState.backFuncEnum;
                case WebGL2RenderingContext.STENCIL_FAIL:
                    return this.hydGlobalState.stencilState.frontFailEnum;
                case WebGL2RenderingContext.STENCIL_BACK_FAIL:
                    return this.hydGlobalState.stencilState.backFailEnum;
                case WebGL2RenderingContext.STENCIL_PASS_DEPTH_FAIL:
                    return this.hydGlobalState.stencilState.frontPassDepthFailEnum;
                case WebGL2RenderingContext.STENCIL_BACK_PASS_DEPTH_FAIL:
                    return this.hydGlobalState.stencilState.backPassDepthFailEnum;
                case WebGL2RenderingContext.STENCIL_PASS_DEPTH_PASS:
                    return this.hydGlobalState.stencilState.frontPassDepthPassEnum;
                case WebGL2RenderingContext.STENCIL_BACK_PASS_DEPTH_PASS:
                    return this.hydGlobalState.stencilState.backPassDepthPassEnum;
                case WebGL2RenderingContext.STENCIL_CLEAR_VALUE:
                    return this.hydGlobalState.clearState.stencil;
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
                case WebGL2RenderingContext.TEXTURE_BINDING_2D:
                    return this.hydGlobalState.getTextureUnitBinding(this.hydGlobalState.commonState.activeTextureUnit, "2d");
                case WebGL2RenderingContext.TEXTURE_BINDING_CUBE_MAP:
                    return this.hydGlobalState.getTextureUnitBinding(this.hydGlobalState.commonState.activeTextureUnit, "cube");
                case WebGL2RenderingContext.TEXTURE_BINDING_3D:
                    if (this.hydContextType === "webgl2") {
                        return this.hydGlobalState.getTextureUnitBinding(this.hydGlobalState.commonState.activeTextureUnit, "3d");
                    }
                    break;
                case WebGL2RenderingContext.TEXTURE_BINDING_2D_ARRAY:
                    if (this.hydContextType === "webgl2") {
                        return this.hydGlobalState.getTextureUnitBinding(this.hydGlobalState.commonState.activeTextureUnit, "2d-array");
                    }
                    break;
                case WebGL2RenderingContext.VERTEX_ARRAY_BINDING:
                    if (this.hydContextType === "webgl2") {
                        const vertexArray = this.hydGlobalState.commonState.vertexArrayBinding;
                        return vertexArray === this.hydGlobalState.defaultVertexArrayBinding ? null : vertexArray;
                    }
                    break;
                case WebGL2RenderingContext.SAMPLER_BINDING:
                    if (this.hydContextType === "webgl2") {
                        return this.samplerBindings[this.hydGlobalState.commonState.activeTextureUnit];
                    }
                    break;
                case WebGL2RenderingContext.UNPACK_PREMULTIPLY_ALPHA_WEBGL:
                    return this.hydGlobalState.miscState.unpackPremultiplyAlphaWebGL;
                case WebGL2RenderingContext.UNPACK_COLORSPACE_CONVERSION_WEBGL:
                    return this.hydGlobalState.miscState.unpackColorSpaceConversionWebGL;
                case WebGL2RenderingContext.SAMPLE_BUFFERS:
                    return this.hydGlobalState.getFramebufferSampleCount() > 1 ? 1 : 0;
                case WebGL2RenderingContext.SAMPLES:
                    {
                        const sampleCount = this.hydGlobalState.getFramebufferSampleCount();
                        return sampleCount > 1 ? sampleCount : 0;
                    }
                case WebGL2RenderingContext.DEPTH_BITS:
                    return this.currentFramebufferBits(pname);
                case WebGL2RenderingContext.RED_BITS:
                case WebGL2RenderingContext.GREEN_BITS:
                case WebGL2RenderingContext.BLUE_BITS:
                case WebGL2RenderingContext.ALPHA_BITS:
                    return this.currentFramebufferBits(pname);
                case WebGL2RenderingContext.STENCIL_BITS:
                    return this.currentFramebufferBits(pname);
            }
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
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
            this.setShaderProgramValidationError(shader);
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
            this.setShaderProgramValidationError(program);
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
                return program.hydAttributes.length + program.activeBuiltInAttributes.length;
            case WebGL2RenderingContext.ACTIVE_UNIFORMS:
                if (this.hydContextType === "webgl2" && program.uniformReflection.length > 0) {
                    return program.uniformReflection.length;
                }
                return program.hydUniforms.filter(isVisibleActiveUniform).length +
                    program.hydSamplers.filter((sampler) => sampler.arrayIndex === undefined || sampler.arrayIndex === 0).length;
            case WebGL2RenderingContext.ACTIVE_UNIFORM_BLOCKS:
                if (this.hydContextType === "webgl2") return program.hydUniformBlocks.length;
                break;
            case WebGL2RenderingContext.TRANSFORM_FEEDBACK_VARYINGS:
                if (this.hydContextType === "webgl2") return program.transformFeedbackVaryingNames.length;
                break;
            case WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER_MODE:
                if (this.hydContextType === "webgl2") {
                    return program.transformFeedbackBufferMode || WebGL2RenderingContext.INTERLEAVED_ATTRIBS;
                }
                break;
        }
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
        return null;
    }

    getSupportedExtensions(): string[] {
        const extensions = this.hydContextType === "webgl2"
            ? SUPPORTED_EXTENSION_NAMES.filter((name) => !WEBGL2_PROMOTED_EXTENSION_NAMES.has(name))
            : [...SUPPORTED_EXTENSION_NAMES];
        return extensions.filter((name) => this.isExtensionAvailable(name));
    }

    private isExtensionAvailable(name: string): boolean {
        if (name === "WEBGL_compressed_texture_etc" || name === "WEBGL_compressed_texture_etc1") {
            return this.hydDevice.features.has("texture-compression-etc2");
        }
        return true;
    }

    getExtension(extensionName: string) {
        const canonicalName = typeof extensionName === "string"
            ? SUPPORTED_EXTENSION_BY_LOWER_NAME.get(extensionName.toLowerCase())
            : undefined;
        if (!canonicalName || !this.isExtensionAvailable(canonicalName) ||
            (this.hydContextType === "webgl2" && WEBGL2_PROMOTED_EXTENSION_NAMES.has(canonicalName))) {
            return null;
        }
        this.enabledExtensions.add(canonicalName.toUpperCase());
        const cached = this.extensionObjects.get(canonicalName);
        if (cached) return cached;
        let extension: object | null = null;
        if (canonicalName === 'ANGLE_instanced_arrays') {
            extension = {
                VERTEX_ATTRIB_ARRAY_DIVISOR_ANGLE: WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_DIVISOR,
                drawArraysInstancedANGLE: HydWebGLStatic.prototype.drawArraysInstanced.bind(this),
                drawElementsInstancedANGLE: HydWebGLStatic.prototype.drawElementsInstanced.bind(this),
                vertexAttribDivisorANGLE: HydWebGLStatic.prototype.vertexAttribDivisor.bind(this),
            };
        } else if (canonicalName === 'OES_element_index_uint') {
            extension = {};
        } else if (canonicalName === 'EXT_sRGB') {
            extension = {
                SRGB_EXT: GL_SRGB_EXT,
                SRGB_ALPHA_EXT: GL_SRGB_ALPHA_EXT,
                SRGB8_ALPHA8_EXT: GL_SRGB8_ALPHA8_EXT,
                FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING_EXT: GL_FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING_EXT,
            };
        } else if (canonicalName === 'WEBGL_compressed_texture_etc') {
            extension = Object.create({
                COMPRESSED_R11_EAC: 0x9270,
                COMPRESSED_SIGNED_R11_EAC: 0x9271,
                COMPRESSED_RG11_EAC: 0x9272,
                COMPRESSED_SIGNED_RG11_EAC: 0x9273,
                COMPRESSED_RGB8_ETC2: 0x9274,
                COMPRESSED_SRGB8_ETC2: 0x9275,
                COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2: 0x9276,
                COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2: 0x9277,
                COMPRESSED_RGBA8_ETC2_EAC: 0x9278,
                COMPRESSED_SRGB8_ALPHA8_ETC2_EAC: 0x9279,
            });
        } else if (canonicalName === 'WEBGL_compressed_texture_etc1') {
            extension = Object.create({ COMPRESSED_RGB_ETC1_WEBGL: GL_COMPRESSED_RGB_ETC1_WEBGL });
        }
        if (extension) this.extensionObjects.set(canonicalName, extension);
        return extension;
    }

    getBufferParameter(target: GLenum, pname: GLenum) {
        const buffer = this.getBoundBufferForTarget(target);
        if (!buffer) {
            if (this.hydGlobalState.glError === WebGL2RenderingContext.NO_ERROR) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            }
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
        const format = renderbuffer.gpuFormat || "";
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

    getInternalformatParameter(target: GLenum, internalFormat: GLenum, pname: GLenum) {
        if (this.hydContextType !== "webgl2" || target !== WebGL2RenderingContext.RENDERBUFFER ||
            pname !== WebGL2RenderingContext.SAMPLES) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        if (!VALID_WEBGL2_RENDERBUFFER_INTERNAL_FORMATS.has(internalFormat)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        if (INTEGER_WEBGL2_RENDERBUFFER_INTERNAL_FORMATS.has(internalFormat) ||
            !this.renderbufferGpuFormat(internalFormat) ||
            internalFormat === WebGL2RenderingContext.DEPTH_STENCIL) {
            return new Int32Array(0);
        }
        const maxSamples = Number(enumToConstant.get(WebGL2RenderingContext.MAX_SAMPLES)) || 4;
        return new Int32Array([maxSamples]);
    }

    getFramebufferAttachmentParameter(target: GLenum, attachment: GLenum, pname: GLenum) {
        const webgl2Target = this.hydContextType === "webgl2" &&
            (target === WebGL2RenderingContext.DRAW_FRAMEBUFFER || target === WebGL2RenderingContext.READ_FRAMEBUFFER);
        if (target !== WebGL2RenderingContext.FRAMEBUFFER && !webgl2Target) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        const framebuffer = this.getFramebufferForTarget(target);
        if (framebuffer === this.hydGlobalState.defaultFramebuffer) {
            const isBack = attachment === WebGL2RenderingContext.BACK;
            const isDepth = this.hydContextType === "webgl2" && attachment === WebGL2RenderingContext.DEPTH;
            const isStencil = this.hydContextType === "webgl2" && attachment === WebGL2RenderingContext.STENCIL;
            if (!isBack && !isDepth && !isStencil) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return null;
            }
            const present = isBack ||
                (isDepth && this.hydGlobalState.contextAttributes.depth !== false) ||
                (isStencil && this.hydGlobalState.contextAttributes.stencil === true);
            if (pname === WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE) {
                return present ? WebGL2RenderingContext.FRAMEBUFFER_DEFAULT : WebGL2RenderingContext.NONE;
            }
            if (!present) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return null;
            }
            switch (pname) {
                case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING:
                    return WebGL2RenderingContext.LINEAR;
                case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE:
                    return isStencil ? WebGL2RenderingContext.UNSIGNED_INT : WebGL2RenderingContext.UNSIGNED_NORMALIZED;
                case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_RED_SIZE:
                case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_GREEN_SIZE:
                case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_BLUE_SIZE:
                    return isBack ? 8 : 0;
                case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_ALPHA_SIZE:
                    return isBack && this.hydGlobalState.contextAttributes.alpha !== false ? 8 : 0;
                case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_DEPTH_SIZE:
                    return isDepth ? 24 : 0;
                case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_STENCIL_SIZE:
                    return isStencil ? 8 : 0;
                default:
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                    return null;
            }
        }
        const maxColorAttachments = this.hydContextType === "webgl2"
            ? Number(enumToConstant.get(WebGL2RenderingContext.MAX_COLOR_ATTACHMENTS)) || 16
            : 1;
        const colorAttachment = attachment >= WebGL2RenderingContext.COLOR_ATTACHMENT0 &&
            attachment < WebGL2RenderingContext.COLOR_ATTACHMENT0 + maxColorAttachments;
        if (!colorAttachment &&
            attachment !== WebGL2RenderingContext.DEPTH_ATTACHMENT &&
            attachment !== WebGL2RenderingContext.STENCIL_ATTACHMENT &&
            attachment !== WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        const attrib = this.framebufferAttachment(framebuffer, attachment);
        if (!attrib) {
            if (pname === WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE) {
                return WebGL2RenderingContext.NONE;
            }
            if (pname === WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME) {
                const hasDepthOrStencil = this.framebufferAttachment(
                    framebuffer, WebGL2RenderingContext.DEPTH_ATTACHMENT) ||
                    this.framebufferAttachment(framebuffer, WebGL2RenderingContext.STENCIL_ATTACHMENT);
                if (attachment !== WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT || !hasDepthOrStencil) {
                    return null;
                }
            }
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        if (attachment === WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT &&
            pname === WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        switch (pname) {
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING:
                if (this.hydContextType !== "webgl2" && !this.enabledExtensions.has("EXT_SRGB")) {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                    return null;
                }
                return attrib.format?.endsWith("-srgb")
                    ? WebGL2RenderingContext.SRGB
                    : WebGL2RenderingContext.LINEAR;
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE:
                return attrib.objectType;
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME:
                return attrib.attachment;
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE:
                if (attrib.format.endsWith("sint")) return WebGL2RenderingContext.INT;
                if (attrib.format.endsWith("uint")) return WebGL2RenderingContext.UNSIGNED_INT;
                if (attrib.format.includes("float")) return WebGL2RenderingContext.FLOAT;
                return WebGL2RenderingContext.UNSIGNED_NORMALIZED;
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_RED_SIZE:
                return attrib.colorBits[0];
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_GREEN_SIZE:
                return attrib.colorBits[1];
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_BLUE_SIZE:
                return attrib.colorBits[2];
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_ALPHA_SIZE:
                return attrib.colorBits[3];
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_DEPTH_SIZE:
                return attrib.depthBits;
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_STENCIL_SIZE:
                return attrib.stencilBits;
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL:
                if (attrib.objectType !== WebGL2RenderingContext.TEXTURE) {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                    return null;
                }
                return attrib.level || 0;
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE:
                if (attrib.objectType !== WebGL2RenderingContext.TEXTURE) {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                    return null;
                }
                return attrib.face >= WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X &&
                    attrib.face <= WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z
                    ? attrib.face
                    : WebGL2RenderingContext.NONE;
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_TEXTURE_LAYER:
                if (attrib.objectType !== WebGL2RenderingContext.TEXTURE) {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                    return null;
                }
                return attrib.layer || 0;
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return null;
        }
    }

    getAttribLocation(program: HydProgram, attribName: string) {
        if (!this.isProgram(program)) {
            if (program instanceof HydProgram &&
                program.ownerToken === this.contextToken && program.deleted) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            } else {
                this.setShaderProgramValidationError(program);
            }
            return -1;
        }
        if (!program.linked) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return -1;
        }
        const maxNameLength = this.hydContextType === "webgl2" ? 1024 : 256;
        if (attribName.length > maxNameLength || /[^\x00-\x7f]/.test(attribName) || !isWebGlIdentifierName(attribName)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return -1;
        }
        const attrib = program.hydAttributes.find((item) => item.name === attribName);
        return attrib ? attrib.location : -1;
    }

    getFragDataLocation(program: HydProgram, name: string) {
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return -1;
        }
        if (!program.linked) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return -1;
        }
        if (name.length > 1024 || /[^\x00-\x7f]/.test(name) || !isWebGlIdentifierName(name, true)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return -1;
        }
        if (name.startsWith("gl_")) return -1;
        return program.fragmentOutputLocations.get(name) ?? -1;
    }

    getUniformLocation(program: HydProgram, uniformName: string) {
        if (!this.isProgram(program)) {
            if (program instanceof HydProgram &&
                program.ownerToken === this.contextToken && program.deleted) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            } else {
                this.setShaderProgramValidationError(program);
            }
            return null;
        }
        if (!program.linked) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        const maxNameLength = this.hydContextType === "webgl2" ? 1024 : 256;
        if (uniformName.length > maxNameLength || /[^\x00-\x7f]/.test(uniformName) || !isWebGlIdentifierName(uniformName, true)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return null;
        }
        const arrayMatch = /^(.*)\[\s*(\d+)\s*\]$/.exec(uniformName);
        const lookupName = arrayMatch ? arrayMatch[1] : uniformName;
        const arrayIndex = arrayMatch ? Number(arrayMatch[2]) : 0;
        const safeUniformName = lookupName.replace(/[^A-Za-z0-9_]/g, "_").replace(/_+$/g, "");
        const ret = program.hydUniforms.find((uniform) => !uniform.internal &&
                (uniform.name === lookupName || uniform.name === safeUniformName || uniform.sourceName === lookupName)) ||
            program.hydSamplers.find((sampler) =>
                sampler.name === lookupName || sampler.name === safeUniformName || sampler.sourceName === uniformName ||
                (sampler.arrayName === lookupName && (sampler.arrayIndex || 0) === arrayIndex));
        if (!ret) {
            return null;
        }
        if (arrayMatch && (!ret.isArray || arrayIndex >= ret.size)) {
            return null;
        }
        if (ret instanceof ProgramUniformSampler) {
            const location = brandHydWebGlObject(
                Object.create(ret) as ProgramUniformSampler,
                "uniform-location",
            );
            location.activeForUniformUpdates = false;
            location.storage = ret;
            location.arrayElements = ret.arrayName
                ? program.hydSamplers
                    .filter((sampler) => sampler.arrayName === ret.arrayName && (sampler.arrayIndex || 0) >= (ret.arrayIndex || 0))
                    .sort((a, b) => (a.arrayIndex || 0) - (b.arrayIndex || 0))
                : [ret];
            location.remainingArrayElements = location.arrayElements.length;
            program.uniformSamplerLocations.push(location);
            if (this.currentProgramValid && this.hydGlobalState.commonState.currentProgram === program) {
                location.activeForUniformUpdates = true;
            }
            return location;
        }
        const location = brandHydWebGlObject(
            Object.create(ret) as ProgramUniformBuffer,
            "uniform-location",
        );
        location.wordOffset = ret.wordOffset + (ret.elementStride >> 2) * arrayIndex;
        location.byteLength = ret.elementByteLength;
        location.arrayStrideWords = ret.elementStride >> 2;
        location.remainingArrayElements = ret.size - arrayIndex;
        location.writeFloat32View = null;
        location.writeInt32View = null;
        location.writeUint32View = null;
        this.setFloatScalarSetterViews(location, false);
        program.uniformBufferLocations.push(location);
        if (this.currentProgramValid && this.hydGlobalState.commonState.currentProgram === program) {
            location.writeFloat32View = location.float32View;
            location.writeInt32View = location.int32View;
            location.writeUint32View = location.uint32View;
            this.setFloatScalarSetterViews(location, true);
        }
        return location;
    }

    getUniform(program: HydProgram, location: ProgramUniformBuffer | ProgramUniformSampler | null) {
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
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
            return (location.storage || location).textureUnit;
        }

        const matrixDimensions = uniformMatrixDimensions(location.webgl_type);
        const componentCount = (() => {
            if (matrixDimensions) return matrixDimensions.columns * matrixDimensions.rows;
            switch (location.webgl_type) {
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
        if (matrixDimensions) {
            const value = new Float32Array(componentCount);
            for (let column = 0; column < matrixDimensions.columns; column++) {
                value.set(
                    location.float32View.subarray(
                        location.wordOffset + column * 4,
                        location.wordOffset + column * 4 + matrixDimensions.rows,
                    ),
                    column * matrixDimensions.rows,
                );
            }
            return value;
        }
        return location.float32View.slice(location.wordOffset, location.wordOffset + componentCount);
    }

    getVertexAttrib(index: GLuint, pname: GLenum) {
        index = Number(index) >>> 0;
        pname = Number(pname) >>> 0;
        const attributes = this.hydGlobalState.commonState.vertexArrayBinding.attributes;
        if (index < 0 || index >= attributes.length) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return null;
        }
        const attribute = attributes[index];
        switch (pname) {
            case WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING:
                return attribute.buffer || null;
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
                if (this.hydContextType === "webgl2") {
                    const valueType = this.hydGlobalState.currentVertexAttribValueTypes[index];
                    if (valueType === "int") return new Int32Array(this.hydGlobalState.currentVertexAttribValues[index]);
                    if (valueType === "uint") return new Uint32Array(this.hydGlobalState.currentVertexAttribValues[index]);
                }
                return new Float32Array(this.hydGlobalState.currentVertexAttribValues[index]);
            case WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_DIVISOR:
                if (this.hydContextType === "webgl2" || this.enabledExtensions.has("ANGLE_INSTANCED_ARRAYS")) {
                    return attribute.divisor;
                }
                break;
            case WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_INTEGER:
                if (this.hydContextType === "webgl2") return Boolean(attribute.int);
                break;
        }
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
        return null;
    }

    getVertexAttribOffset(index: GLuint, pname: GLenum) {
        index = Number(index) >>> 0;
        pname = Number(pname) >>> 0;
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
        return vertexArray instanceof HydVertexArray && vertexArray.ownerToken === this.contextToken &&
            vertexArray.initialized && !vertexArray.deleted;
    }

    isSampler(sampler: HydSampler) {
        return sampler instanceof HydSampler && sampler.ownerToken === this.contextToken && !sampler.deleted;
    }

    isQuery(query: HydQuery | null) {
        return query instanceof HydQuery && query.ownerToken === this.contextToken &&
            query.initialized && !query.deleted;
    }

    isTransformFeedback(transformFeedback: HydTransformFeedback) {
        return this.isTransformFeedbackObject(transformFeedback) && transformFeedback.initialized;
    }

    private isTransformFeedbackObject(transformFeedback: HydTransformFeedback | null): transformFeedback is HydTransformFeedback {
        return transformFeedback instanceof HydTransformFeedback &&
            transformFeedback.ownerToken === this.contextToken && !transformFeedback.deleted;
    }

    polygonOffset(x: number, y: number) {
        this.hydGlobalState.polygonState.polygonOffsetFactor = x;
        this.hydGlobalState.polygonState.polygonOffsetUnits = y;
        this.hydGlobalState.recordTransition("polygonOffset", x, y);
    }

    lineWidth(width: number) {
        if (!Number.isFinite(width) || width <= 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        this.hydGlobalState.miscState.lineWidth = width;
        this.hydGlobalState.recordTransition("lineWidth", width);
    }

    hint(target: GLenum, mode: GLenum) {
        const derivativeHint = this.hydContextType === "webgl2" &&
            target === WebGL2RenderingContext.FRAGMENT_SHADER_DERIVATIVE_HINT;
        if (target !== WebGL2RenderingContext.GENERATE_MIPMAP_HINT && !derivativeHint) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (mode !== WebGL2RenderingContext.FASTEST &&
            mode !== WebGL2RenderingContext.NICEST &&
            mode !== WebGL2RenderingContext.DONT_CARE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (derivativeHint) this.hydGlobalState.miscState.fragmentShaderDerivativeHint = mode;
        else this.hydGlobalState.miscState.generateMipmapHint = mode;
        this.hydGlobalState.recordTransition("hint", target, mode);
    }

    sampleCoverage(value: number, invert: GLboolean) {
        this.hydGlobalState.miscState.sampleCoverageValue = clampWebGlUnitFloat(value);
        this.hydGlobalState.miscState.sampleCoverageInvert = Boolean(invert);
        this.hydGlobalState.recordTransition("sampleCoverage", value, invert);
    }

    shaderSource(shader: HydShader, source: string) {
        if (!this.isShader(shader)) {
            this.setShaderProgramValidationError(shader);
            return;
        }
        shader.sourceLength = source.length;
        // WebGL preserves the source exactly. Trimming changes both
        // getShaderSource() and GLSL ES 3's first-line #version rule.
        shader.glsl_shader = source;
    }

    getShaderSource(shader: HydShader) {
        if (!this.isShader(shader)) {
            this.setShaderProgramValidationError(shader);
            return null;
        }
        return shader.glsl_shader;
    }

    private activateUniformLocations(program: HydProgram | null) {
        for (const uniform of this.activeUniformBuffers) {
            uniform.writeFloat32View = null;
            uniform.writeInt32View = null;
            uniform.writeUint32View = null;
            this.setFloatScalarSetterViews(uniform, false);
        }
        for (const sampler of this.activeUniformSamplers) {
            sampler.activeForUniformUpdates = false;
        }
        this.activeUniformBuffers = program ? program.uniformBufferLocations : [];
        this.activeUniformSamplers = program ? program.uniformSamplerLocations : [];
        for (const uniform of this.activeUniformBuffers) {
            uniform.writeFloat32View = uniform.float32View;
            uniform.writeInt32View = uniform.int32View;
            uniform.writeUint32View = uniform.uint32View;
            this.setFloatScalarSetterViews(uniform, true);
        }
        for (const sampler of this.activeUniformSamplers) {
            sampler.activeForUniformUpdates = true;
        }
    }

    private setFloatScalarSetterViews(uniform: ProgramUniformBuffer, active: boolean) {
        uniform.writeUniform1fFloatView = active && uniform.webgl_type === WebGL2RenderingContext.FLOAT
            ? uniform.float32View : null;
        uniform.writeUniform2fFloatView = active && uniform.webgl_type === WebGL2RenderingContext.FLOAT_VEC2
            ? uniform.float32View : null;
        uniform.writeUniform3fFloatView = active && uniform.webgl_type === WebGL2RenderingContext.FLOAT_VEC3
            ? uniform.float32View : null;
        uniform.writeUniform4fFloatView = active && uniform.webgl_type === WebGL2RenderingContext.FLOAT_VEC4
            ? uniform.float32View : null;
        uniform.writeUniform1fBooleanView = active && uniform.webgl_type === WebGL2RenderingContext.BOOL
            ? uniform.int32View : null;
        uniform.writeUniform2fBooleanView = active && uniform.webgl_type === WebGL2RenderingContext.BOOL_VEC2
            ? uniform.int32View : null;
        uniform.writeUniform3fBooleanView = active && uniform.webgl_type === WebGL2RenderingContext.BOOL_VEC3
            ? uniform.int32View : null;
        uniform.writeUniform4fBooleanView = active && uniform.webgl_type === WebGL2RenderingContext.BOOL_VEC4
            ? uniform.int32View : null;
    }

    private validateScalarUniformType(
        uniform: ProgramUniformBuffer | ProgramUniformSampler,
        expectedType: GLenum,
        booleanType: GLenum | null,
    ): uniform is ProgramUniformBuffer {
        if (!(uniform instanceof ProgramUniformBuffer) ||
            (uniform.webgl_type !== expectedType && uniform.webgl_type !== booleanType)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return false;
        }
        return true;
    }

    private writeBooleanFromFloatScalars(
        buffer: ProgramUniformBuffer,
        components: 1 | 2 | 3 | 4,
        x0: number,
        x1: number = 0,
        x2: number = 0,
        x3: number = 0,
    ) {
        const target = components === 1 ? buffer.writeUniform1fBooleanView
            : components === 2 ? buffer.writeUniform2fBooleanView
                : components === 3 ? buffer.writeUniform3fBooleanView
                    : buffer.writeUniform4fBooleanView;
        if (!target) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = buffer.wordOffset;
        target[offset] = x0 !== 0 ? 1 : 0;
        if (components > 1) target[offset + 1] = x1 !== 0 ? 1 : 0;
        if (components > 2) target[offset + 2] = x2 !== 0 ? 1 : 0;
        if (components > 3) target[offset + 3] = x3 !== 0 ? 1 : 0;
    }

    uniform1f(pub: ProgramUniformBuffer | ProgramUniformSampler, x0: number) {
        if (pub === null) return;
        const buffer = pub as ProgramUniformBuffer;
        const target = buffer.writeUniform1fFloatView;
        if (target) {
            target[buffer.wordOffset] = x0;
            return;
        }
        this.writeBooleanFromFloatScalars(buffer, 1, x0);
    }
    uniform2f(pub: ProgramUniformBuffer | ProgramUniformSampler, x0: number, x1: number) {
        if (pub === null) return;
        const buffer = pub as ProgramUniformBuffer;
        const offset = buffer.wordOffset;
        const target = buffer.writeUniform2fFloatView;
        if (target) {
            target[offset] = x0;
            target[offset + 1] = x1;
            return;
        }
        this.writeBooleanFromFloatScalars(buffer, 2, x0, x1);
    }
    uniform3f(pub: ProgramUniformBuffer | ProgramUniformSampler, x0: number, x1: number, x2: number) {
        if (pub === null) return;
        const buffer = pub as ProgramUniformBuffer;
        const offset = buffer.wordOffset;
        const target = buffer.writeUniform3fFloatView;
        if (target) {
            target[offset] = x0;
            target[offset + 1] = x1;
            target[offset + 2] = x2;
            return;
        }
        this.writeBooleanFromFloatScalars(buffer, 3, x0, x1, x2);
    }
    uniform4f(pub: ProgramUniformBuffer | ProgramUniformSampler, x0: number, x1: number, x2: number, x3: number) {
        if (pub === null) return;
        const buffer = pub as ProgramUniformBuffer;
        const offset = buffer.wordOffset;
        const target = buffer.writeUniform4fFloatView;
        if (target) {
            target[offset] = x0;
            target[offset + 1] = x1;
            target[offset + 2] = x2;
            target[offset + 3] = x3;
            return;
        }
        this.writeBooleanFromFloatScalars(buffer, 4, x0, x1, x2, x3);
    }
    uniform1i(uniform: ProgramUniformBuffer | ProgramUniformSampler, x0: number) {
        if (uniform === null) return;
        if (uniform instanceof ProgramUniformSampler) {
            if (!uniform.activeForUniformUpdates) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            const maxTextureUnits = enumToConstant.get(WebGL2RenderingContext.MAX_COMBINED_TEXTURE_IMAGE_UNITS) || 0;
            if (!Number.isInteger(x0) || x0 < 0 || x0 >= maxTextureUnits) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                return;
            }
            const storage = uniform.storage || uniform;
            if (storage.textureUnit !== x0) {
                storage.textureUnit = x0;
                this.samplerOriginStateVersion++;
                this.hydGlobalState.recordTransition("uniformSampler", storage.name, x0);
            }
            return;
        }
        if (!this.validateScalarUniformType(uniform, WebGL2RenderingContext.INT, WebGL2RenderingContext.BOOL)) return;
        const a = uniform.writeInt32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = uniform.wordOffset;
        a[offset] = x0;
    }
    uniform2i(pub: ProgramUniformBuffer | ProgramUniformSampler, x0: number, x1: number) {
        if (pub === null) return;
        if (!this.validateScalarUniformType(pub, WebGL2RenderingContext.INT_VEC2, WebGL2RenderingContext.BOOL_VEC2)) return;
        const a = pub.writeInt32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = pub.wordOffset;
        a[offset] = x0;
        a[offset + 1] = x1;
    }
    uniform3i(pub: ProgramUniformBuffer | ProgramUniformSampler, x0: number, x1: number, x2: number) {
        if (pub === null) return;
        if (!this.validateScalarUniformType(pub, WebGL2RenderingContext.INT_VEC3, WebGL2RenderingContext.BOOL_VEC3)) return;
        const a = pub.writeInt32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = pub.wordOffset;
        a[offset] = x0;
        a[offset + 1] = x1;
        a[offset + 2] = x2;
    }
    uniform4i(pub: ProgramUniformBuffer | ProgramUniformSampler, x0: number, x1: number, x2: number, x3: number) {
        if (pub === null) return;
        if (!this.validateScalarUniformType(pub, WebGL2RenderingContext.INT_VEC4, WebGL2RenderingContext.BOOL_VEC4)) return;
        const a = pub.writeInt32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = pub.wordOffset;
        a[offset] = x0;
        a[offset + 1] = x1;
        a[offset + 2] = x2;
        a[offset + 3] = x3;
    }
    uniform1ui(pub: ProgramUniformBuffer | ProgramUniformSampler, x0: number) {
        if (pub === null) return;
        if (!this.validateScalarUniformType(pub, WebGL2RenderingContext.UNSIGNED_INT, WebGL2RenderingContext.BOOL)) return;
        const writesBoolean = pub.webgl_type === WebGL2RenderingContext.BOOL;
        const a = writesBoolean ? pub.writeInt32View : pub.writeUint32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        a[pub.wordOffset] = writesBoolean ? Number(x0) !== 0 ? 1 : 0 : x0 >>> 0;
    }
    uniform2ui(pub: ProgramUniformBuffer | ProgramUniformSampler, x0: number, x1: number) {
        if (pub === null) return;
        if (!this.validateScalarUniformType(pub, WebGL2RenderingContext.UNSIGNED_INT_VEC2, WebGL2RenderingContext.BOOL_VEC2)) return;
        const writesBoolean = pub.webgl_type === WebGL2RenderingContext.BOOL_VEC2;
        const a = writesBoolean ? pub.writeInt32View : pub.writeUint32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = pub.wordOffset;
        a[offset] = writesBoolean ? Number(x0) !== 0 ? 1 : 0 : x0 >>> 0;
        a[offset + 1] = writesBoolean ? Number(x1) !== 0 ? 1 : 0 : x1 >>> 0;
    }
    uniform3ui(pub: ProgramUniformBuffer | ProgramUniformSampler, x0: number, x1: number, x2: number) {
        if (pub === null) return;
        if (!this.validateScalarUniformType(pub, WebGL2RenderingContext.UNSIGNED_INT_VEC3, WebGL2RenderingContext.BOOL_VEC3)) return;
        const writesBoolean = pub.webgl_type === WebGL2RenderingContext.BOOL_VEC3;
        const a = writesBoolean ? pub.writeInt32View : pub.writeUint32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = pub.wordOffset;
        a[offset] = writesBoolean ? Number(x0) !== 0 ? 1 : 0 : x0 >>> 0;
        a[offset + 1] = writesBoolean ? Number(x1) !== 0 ? 1 : 0 : x1 >>> 0;
        a[offset + 2] = writesBoolean ? Number(x2) !== 0 ? 1 : 0 : x2 >>> 0;
    }
    uniform4ui(pub: ProgramUniformBuffer | ProgramUniformSampler, x0: number, x1: number, x2: number, x3: number) {
        if (pub === null) return;
        if (!this.validateScalarUniformType(pub, WebGL2RenderingContext.UNSIGNED_INT_VEC4, WebGL2RenderingContext.BOOL_VEC4)) return;
        const writesBoolean = pub.webgl_type === WebGL2RenderingContext.BOOL_VEC4;
        const a = writesBoolean ? pub.writeInt32View : pub.writeUint32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = pub.wordOffset;
        a[offset] = writesBoolean ? Number(x0) !== 0 ? 1 : 0 : x0 >>> 0;
        a[offset + 1] = writesBoolean ? Number(x1) !== 0 ? 1 : 0 : x1 >>> 0;
        a[offset + 2] = writesBoolean ? Number(x2) !== 0 ? 1 : 0 : x2 >>> 0;
        a[offset + 3] = writesBoolean ? Number(x3) !== 0 ? 1 : 0 : x3 >>> 0;
    }

    private uniformArrayLength(value: ArrayLike<number>): number {
        if ((typeof value !== "object" && typeof value !== "function") || value === null || typeof (value as any).length !== "number") {
            throw new TypeError("uniform vector data must be an array or typed array");
        }
        return Number((value as any).length);
    }

    private uniformSourceSubrange(
        value: ArrayLike<number>,
        srcOffset: GLuint = 0,
        srcLength: GLuint = 0,
    ): ArrayLike<number> | null {
        const totalLength = this.uniformArrayLength(value);
        const offset = Number(srcOffset) >>> 0;
        const requestedLength = Number(srcLength) >>> 0;
        const length = requestedLength === 0 ? totalLength - offset : requestedLength;
        if (offset > totalLength || length < 0 || length > totalLength - offset) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return null;
        }
        if (offset === 0 && length === totalLength) return value;
        if (ArrayBuffer.isView(value) && typeof (value as any).subarray === "function") {
            return (value as any).subarray(offset, offset + length);
        }
        return Array.prototype.slice.call(value, offset, offset + length);
    }

    private writeFloatUniformArray(
        pub: ProgramUniformBuffer,
        value: ArrayLike<number>,
        components: number,
        expectedType: GLenum,
        srcOffset: GLuint = 0,
        srcLength: GLuint = 0,
    ) {
        const source = this.uniformSourceSubrange(value, srcOffset, srcLength);
        if (!source) return;
        const length = this.uniformArrayLength(source);
        const boolType = components === 1
            ? WebGL2RenderingContext.BOOL
            : WebGL2RenderingContext.BOOL_VEC2 + components - 2;
        const writesBoolean = pub.webgl_type === boolType;
        const target = writesBoolean ? pub.writeInt32View : pub.writeFloat32View;
        if (!target) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (pub.webgl_type !== expectedType && !writesBoolean) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (length < components || length % components !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const requestedElements = length / components;
        if (!pub.isArray && requestedElements > pub.remainingArrayElements) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const elements = Math.min(requestedElements, pub.remainingArrayElements);
        const stride = pub.arrayStrideWords || components;
        const valueCount = elements * components;
        if (elements === 1) {
            const offset = pub.wordOffset;
            target[offset] = writesBoolean ? Number(source[0]) !== 0 ? 1 : 0 : source[0];
            if (components > 1) target[offset + 1] = writesBoolean ? Number(source[1]) !== 0 ? 1 : 0 : source[1];
            if (components > 2) target[offset + 2] = writesBoolean ? Number(source[2]) !== 0 ? 1 : 0 : source[2];
            if (components > 3) target[offset + 3] = writesBoolean ? Number(source[3]) !== 0 ? 1 : 0 : source[3];
            return;
        }
        if (!writesBoolean && stride === components && valueCount === length && ArrayBuffer.isView(source)) {
            target.set(source, pub.wordOffset);
            return;
        }
        for (let element = 0; element < elements; element++) {
            const sourceOffset = element * components;
            const targetOffset = pub.wordOffset + element * stride;
            for (let component = 0; component < components; component++) {
                const sourceValue = source[sourceOffset + component];
                target[targetOffset + component] = writesBoolean
                    ? Number(sourceValue) !== 0 ? 1 : 0
                    : sourceValue;
            }
        }
    }

    private writeIntUniformArray(
        pub: ProgramUniformBuffer,
        value: ArrayLike<number>,
        components: number,
        expectedType: GLenum,
        boolType: GLenum,
        srcOffset: GLuint = 0,
        srcLength: GLuint = 0,
    ) {
        const source = this.uniformSourceSubrange(value, srcOffset, srcLength);
        if (!source) return;
        const length = this.uniformArrayLength(source);
        const target = pub.writeInt32View;
        if (!target) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (pub.webgl_type !== expectedType && pub.webgl_type !== boolType) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (length < components || length % components !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const requestedElements = length / components;
        if (!pub.isArray && requestedElements > pub.remainingArrayElements) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const elements = Math.min(requestedElements, pub.remainingArrayElements);
        const stride = pub.arrayStrideWords || components;
        const valueCount = elements * components;
        if (elements === 1) {
            const offset = pub.wordOffset;
            target[offset] = source[0];
            if (components > 1) target[offset + 1] = source[1];
            if (components > 2) target[offset + 2] = source[2];
            if (components > 3) target[offset + 3] = source[3];
            return;
        }
        if (stride === components && valueCount === length && ArrayBuffer.isView(source)) {
            target.set(source, pub.wordOffset);
            return;
        }
        for (let element = 0; element < elements; element++) {
            const sourceOffset = element * components;
            const targetOffset = pub.wordOffset + element * stride;
            for (let component = 0; component < components; component++) {
                target[targetOffset + component] = source[sourceOffset + component];
            }
        }
    }

    private writeUintUniformArray(
        pub: ProgramUniformBuffer,
        value: ArrayLike<number>,
        components: number,
        expectedType: GLenum,
        boolType: GLenum,
        srcOffset: GLuint = 0,
        srcLength: GLuint = 0,
    ) {
        const source = this.uniformSourceSubrange(value, srcOffset, srcLength);
        if (!source) return;
        const length = this.uniformArrayLength(source);
        const target = pub.writeUint32View;
        if (!target) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (pub.webgl_type !== expectedType && pub.webgl_type !== boolType) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (length < components || length % components !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const requestedElements = length / components;
        if (!pub.isArray && requestedElements > pub.remainingArrayElements) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const elements = Math.min(requestedElements, pub.remainingArrayElements);
        const stride = pub.arrayStrideWords || components;
        const valueCount = elements * components;
        if (elements === 1) {
            const offset = pub.wordOffset;
            target[offset] = source[0] >>> 0;
            if (components > 1) target[offset + 1] = source[1] >>> 0;
            if (components > 2) target[offset + 2] = source[2] >>> 0;
            if (components > 3) target[offset + 3] = source[3] >>> 0;
            return;
        }
        if (stride === components && valueCount === length && ArrayBuffer.isView(source)) {
            target.set(source, pub.wordOffset);
            return;
        }
        for (let element = 0; element < elements; element++) {
            const sourceOffset = element * components;
            const targetOffset = pub.wordOffset + element * stride;
            for (let component = 0; component < components; component++) {
                target[targetOffset + component] = source[sourceOffset + component] >>> 0;
            }
        }
    }

    uniform1fv(pub: ProgramUniformBuffer, v: ArrayLike<number>, srcOffset: GLuint = 0, srcLength: GLuint = 0) {
        if (pub === null) return;
        this.writeFloatUniformArray(pub, v, 1, WebGL2RenderingContext.FLOAT, srcOffset, srcLength);
    }
    uniform2fv(pub: ProgramUniformBuffer, v: ArrayLike<number>, srcOffset: GLuint = 0, srcLength: GLuint = 0) {
        if (pub === null) return;
        this.writeFloatUniformArray(pub, v, 2, WebGL2RenderingContext.FLOAT_VEC2, srcOffset, srcLength);
    }
    uniform3fv(pub: ProgramUniformBuffer, v: ArrayLike<number>, srcOffset: GLuint = 0, srcLength: GLuint = 0) {
        if (pub === null) return;
        this.writeFloatUniformArray(pub, v, 3, WebGL2RenderingContext.FLOAT_VEC3, srcOffset, srcLength);
    }
    uniform4fv(pub: ProgramUniformBuffer, v: ArrayLike<number>, srcOffset: GLuint = 0, srcLength: GLuint = 0) {
        if (pub === null) return;
        this.writeFloatUniformArray(pub, v, 4, WebGL2RenderingContext.FLOAT_VEC4, srcOffset, srcLength);
    }

    uniform1iv(
        pub: ProgramUniformBuffer | ProgramUniformSampler,
        v: ArrayLike<number>,
        srcOffset: GLuint = 0,
        srcLength: GLuint = 0,
    ) {
        if (pub === null) return;
        if (pub instanceof ProgramUniformSampler) {
            const source = this.uniformSourceSubrange(v, srcOffset, srcLength);
            if (!source) return;
            const length = this.uniformArrayLength(source);
            if (length < 1) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                return;
            }
            if (!pub.activeForUniformUpdates) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            const elements = pub.arrayElements || [pub.storage || pub];
            if (!pub.isArray && length > elements.length) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            const count = Math.min(length, elements.length);
            const maxTextureUnits = enumToConstant.get(WebGL2RenderingContext.MAX_COMBINED_TEXTURE_IMAGE_UNITS) || 0;
            for (let i = 0; i < count; i++) {
                const unit = Number(source[i]);
                if (!Number.isInteger(unit) || unit < 0 || unit >= maxTextureUnits) {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                    return;
                }
            }
            for (let i = 0; i < count; i++) {
                const sampler = elements[i];
                const unit = Number(source[i]);
                if (sampler.textureUnit !== unit) {
                    sampler.textureUnit = unit;
                    this.samplerOriginStateVersion++;
                    this.hydGlobalState.recordTransition("uniformSampler", sampler.name, unit);
                }
            }
            return;
        }
        this.writeIntUniformArray(
            pub, v, 1, WebGL2RenderingContext.INT, WebGL2RenderingContext.BOOL, srcOffset, srcLength);
    }
    uniform2iv(pub: ProgramUniformBuffer, v: ArrayLike<number>, srcOffset: GLuint = 0, srcLength: GLuint = 0) {
        if (pub === null) return;
        this.writeIntUniformArray(
            pub, v, 2, WebGL2RenderingContext.INT_VEC2, WebGL2RenderingContext.BOOL_VEC2, srcOffset, srcLength);
    }
    uniform3iv(pub: ProgramUniformBuffer, v: ArrayLike<number>, srcOffset: GLuint = 0, srcLength: GLuint = 0) {
        if (pub === null) return;
        this.writeIntUniformArray(
            pub, v, 3, WebGL2RenderingContext.INT_VEC3, WebGL2RenderingContext.BOOL_VEC3, srcOffset, srcLength);
    }
    uniform4iv(pub: ProgramUniformBuffer, v: ArrayLike<number>, srcOffset: GLuint = 0, srcLength: GLuint = 0) {
        if (pub === null) return;
        this.writeIntUniformArray(
            pub, v, 4, WebGL2RenderingContext.INT_VEC4, WebGL2RenderingContext.BOOL_VEC4, srcOffset, srcLength);
    }
    uniform1uiv(pub: ProgramUniformBuffer, v: ArrayLike<number>, srcOffset: GLuint = 0, srcLength: GLuint = 0) {
        if (pub === null) return;
        this.writeUintUniformArray(
            pub, v, 1, WebGL2RenderingContext.UNSIGNED_INT, WebGL2RenderingContext.BOOL, srcOffset, srcLength);
    }
    uniform2uiv(pub: ProgramUniformBuffer, v: ArrayLike<number>, srcOffset: GLuint = 0, srcLength: GLuint = 0) {
        if (pub === null) return;
        this.writeUintUniformArray(
            pub, v, 2, WebGL2RenderingContext.UNSIGNED_INT_VEC2, WebGL2RenderingContext.BOOL_VEC2, srcOffset, srcLength);
    }
    uniform3uiv(pub: ProgramUniformBuffer, v: ArrayLike<number>, srcOffset: GLuint = 0, srcLength: GLuint = 0) {
        if (pub === null) return;
        this.writeUintUniformArray(
            pub, v, 3, WebGL2RenderingContext.UNSIGNED_INT_VEC3, WebGL2RenderingContext.BOOL_VEC3, srcOffset, srcLength);
    }
    uniform4uiv(pub: ProgramUniformBuffer, v: ArrayLike<number>, srcOffset: GLuint = 0, srcLength: GLuint = 0) {
        if (pub === null) return;
        this.writeUintUniformArray(
            pub, v, 4, WebGL2RenderingContext.UNSIGNED_INT_VEC4, WebGL2RenderingContext.BOOL_VEC4, srcOffset, srcLength);
    }

    private writeFloatUniformMatrix(
        pub: ProgramUniformBuffer,
        transpose: boolean,
        value: ArrayLike<number>,
        columns: number,
        rows: number,
        expectedType: GLenum,
        srcOffset: GLuint = 0,
        srcLength: GLuint = 0,
    ) {
        const target = pub.writeFloat32View;
        if (!target) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (pub.webgl_type !== expectedType) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (transpose && this.hydContextType !== "webgl2") {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const matrixValues = columns * rows;
        const source = this.uniformSourceSubrange(value, srcOffset, srcLength);
        if (!source) return;
        const length = this.uniformArrayLength(source);
        if (length < matrixValues || length % matrixValues !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const requestedElements = length / matrixValues;
        if (!pub.isArray && requestedElements > pub.remainingArrayElements) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const elements = Math.min(requestedElements, pub.remainingArrayElements);
        const columnStride = 4;
        const matrixStride = pub.arrayStrideWords || columns * columnStride;
        for (let element = 0; element < elements; element++) {
            const sourceBase = element * matrixValues;
            const targetBase = pub.wordOffset + element * matrixStride;
            for (let column = 0; column < columns; column++) {
                for (let row = 0; row < rows; row++) {
                    const sourceIndex = transpose
                        ? sourceBase + row * columns + column
                        : sourceBase + column * rows + row;
                    target[targetBase + column * columnStride + row] = source[sourceIndex];
                }
            }
        }
    }

    uniformMatrix2fv(pub: ProgramUniformBuffer, transpose: boolean, v: ArrayLike<number>, srcOffset: GLuint = 0, srcLength: GLuint = 0) {
        if (pub === null) return;
        this.writeFloatUniformMatrix(pub, transpose, v, 2, 2, WebGL2RenderingContext.FLOAT_MAT2, srcOffset, srcLength);
    }
    uniformMatrix3fv(pub: ProgramUniformBuffer, transpose: boolean, v: ArrayLike<number>, srcOffset: GLuint = 0, srcLength: GLuint = 0) {
        if (pub === null) return;
        this.writeFloatUniformMatrix(pub, transpose, v, 3, 3, WebGL2RenderingContext.FLOAT_MAT3, srcOffset, srcLength);
    }
    uniformMatrix4fv(pub: ProgramUniformBuffer, transpose: boolean, v: ArrayLike<number>, srcOffset: GLuint = 0, srcLength: GLuint = 0) {
        if (pub === null) return;
        this.writeFloatUniformMatrix(pub, transpose, v, 4, 4, WebGL2RenderingContext.FLOAT_MAT4, srcOffset, srcLength);
    }
    uniformMatrix2x3fv(pub: ProgramUniformBuffer, transpose: boolean, v: ArrayLike<number>, srcOffset: GLuint = 0, srcLength: GLuint = 0) {
        if (pub === null) return;
        this.writeFloatUniformMatrix(pub, transpose, v, 2, 3, WebGL2RenderingContext.FLOAT_MAT2x3, srcOffset, srcLength);
    }
    uniformMatrix2x4fv(pub: ProgramUniformBuffer, transpose: boolean, v: ArrayLike<number>, srcOffset: GLuint = 0, srcLength: GLuint = 0) {
        if (pub === null) return;
        this.writeFloatUniformMatrix(pub, transpose, v, 2, 4, WebGL2RenderingContext.FLOAT_MAT2x4, srcOffset, srcLength);
    }
    uniformMatrix3x2fv(pub: ProgramUniformBuffer, transpose: boolean, v: ArrayLike<number>, srcOffset: GLuint = 0, srcLength: GLuint = 0) {
        if (pub === null) return;
        this.writeFloatUniformMatrix(pub, transpose, v, 3, 2, WebGL2RenderingContext.FLOAT_MAT3x2, srcOffset, srcLength);
    }
    uniformMatrix3x4fv(pub: ProgramUniformBuffer, transpose: boolean, v: ArrayLike<number>, srcOffset: GLuint = 0, srcLength: GLuint = 0) {
        if (pub === null) return;
        this.writeFloatUniformMatrix(pub, transpose, v, 3, 4, WebGL2RenderingContext.FLOAT_MAT3x4, srcOffset, srcLength);
    }
    uniformMatrix4x2fv(pub: ProgramUniformBuffer, transpose: boolean, v: ArrayLike<number>, srcOffset: GLuint = 0, srcLength: GLuint = 0) {
        if (pub === null) return;
        this.writeFloatUniformMatrix(pub, transpose, v, 4, 2, WebGL2RenderingContext.FLOAT_MAT4x2, srcOffset, srcLength);
    }
    uniformMatrix4x3fv(pub: ProgramUniformBuffer, transpose: boolean, v: ArrayLike<number>, srcOffset: GLuint = 0, srcLength: GLuint = 0) {
        if (pub === null) return;
        this.writeFloatUniformMatrix(pub, transpose, v, 4, 3, WebGL2RenderingContext.FLOAT_MAT4x3, srcOffset, srcLength);
    }

    createProgram() {
        return brandHydWebGlObject(
            new HydProgram(this.hydDevice, this.shaderTranslator, this.contextToken),
            "program",
        );
    }

    createShader(type: GLenum) {
        if (type !== WebGL2RenderingContext.VERTEX_SHADER && type !== WebGL2RenderingContext.FRAGMENT_SHADER) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        return brandHydWebGlObject(new HydShader(
            this.hydDevice,
            type,
            this.shaderTranslator,
            this.contextToken,
            this.hydContextType === "webgl2" ? 2 : 1,
        ), "shader");
    }

    createBuffer() {
        return brandHydWebGlObject(new HydBuffer(this.hydDevice, this.contextToken), "buffer");
    }

    createTexture() {
        return brandHydWebGlObject(new HydTexture(this.hydDevice, this.contextToken), "texture");
    }

    createFramebuffer(): HydFramebuffer {
        return brandHydWebGlObject(new HydFramebuffer(this.contextToken), "framebuffer");
    }

    createRenderbuffer(): HydTexture {
        return brandHydWebGlObject(new HydTexture(this.hydDevice, this.contextToken), "renderbuffer");
    }

    createVertexArray() {
        return brandHydWebGlObject(new HydVertexArray(this.contextToken), "vertex-array");
    }

    createSampler() {
        if (this.hydContextType !== "webgl2") return null;
        return brandHydWebGlObject(new HydSampler(this.hydDevice, this.contextToken), "sampler");
    }

    createTransformFeedback() {
        if (this.hydContextType !== "webgl2") return null;
        const feedback = new HydTransformFeedback(this.contextToken);
        this.transformFeedbackObjects.add(feedback);
        return brandHydWebGlObject(feedback, "transform-feedback");
    }

    createQuery() {
        if (this.hydContextType !== "webgl2") return null;
        const query = new HydQuery(this.contextToken);
        this.queryObjects.add(query);
        return brandHydWebGlObject(query, "query");
    }

    private currentTexture(target: GLenum): HydTexture {
        const viewDimension = enumToViewDimension.get(target);
        const texture = viewDimension
            ? this.hydGlobalState.getTextureUnitBinding(this.hydGlobalState.commonState.activeTextureUnit, viewDimension)
            : null;
        if (!texture) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        return texture;
    }

    private isCubeFaceTarget(target: GLenum): boolean {
        return target >= WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X &&
            target <= WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z;
    }

    private validateTexImage2DTarget(target: GLenum): boolean {
        const valid = target === WebGL2RenderingContext.TEXTURE_2D || this.isCubeFaceTarget(target);
        if (!valid) this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
        return valid;
    }

    private validateTexImage2DDimensions(target: GLenum, level: number, width: number, height: number): boolean {
        const maxSize = enumToConstant.get(this.isCubeFaceTarget(target)
            ? WebGL2RenderingContext.MAX_CUBE_MAP_TEXTURE_SIZE
            : WebGL2RenderingContext.MAX_TEXTURE_SIZE) || 0;
        const maxLevel = Math.floor(Math.log2(maxSize));
        const levelLimit = level <= maxLevel ? Math.max(1, maxSize >> level) : 0;
        const powerOfTwo = (value: number) => value > 0 && (value & (value - 1)) === 0;
        const invalid = level < 0 || level > maxLevel || width < 0 || height < 0 ||
            width > levelLimit || height > levelLimit ||
            (this.isCubeFaceTarget(target) && width !== height) ||
            (this.hydContextType !== "webgl2" && level > 0 &&
                width > 0 && height > 0 && (!powerOfTwo(width) || !powerOfTwo(height)));
        if (invalid) this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
        return !invalid;
    }

    private textureLimit(pname: GLenum): number {
        if (pname === WebGL2RenderingContext.MAX_3D_TEXTURE_SIZE) {
            return Number(this.hydDevice.limits.maxTextureDimension3D) ||
                Number(enumToConstant.get(pname)) || 256;
        }
        if (pname === WebGL2RenderingContext.MAX_ARRAY_TEXTURE_LAYERS) {
            return Number(this.hydDevice.limits.maxTextureArrayLayers) ||
                Number(enumToConstant.get(pname)) || 256;
        }
        return Number(enumToConstant.get(pname)) || 0;
    }

    private validateTexImage3DDimensions(
        target: GLenum,
        level: number,
        width: number,
        height: number,
        depth: number,
    ): boolean {
        const maxSize = this.textureLimit(
            target === WebGL2RenderingContext.TEXTURE_3D
                ? WebGL2RenderingContext.MAX_3D_TEXTURE_SIZE
                : WebGL2RenderingContext.MAX_TEXTURE_SIZE);
        const maxDepth = target === WebGL2RenderingContext.TEXTURE_3D
            ? maxSize
            : this.textureLimit(WebGL2RenderingContext.MAX_ARRAY_TEXTURE_LAYERS);
        const maxLevel = Math.floor(Math.log2(maxSize));
        const levelLimit = level <= maxLevel ? Math.max(1, maxSize >> level) : 0;
        const depthLimit = target === WebGL2RenderingContext.TEXTURE_3D ? levelLimit : maxDepth;
        const invalid = level < 0 || level > maxLevel || width < 0 || height < 0 || depth < 0 ||
            width > levelLimit || height > levelLimit || depth > depthLimit;
        if (invalid) this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
        return !invalid;
    }

    private resolveTexImageSourceExtent(source: any): { width: number, height: number } | null {
        if (!source) return null;
        if (typeof HTMLVideoElement !== "undefined" && source instanceof HTMLVideoElement) {
            const cached = videoDisplayExtents.get(source);
            if (cached && cached.reportedWidth === source.videoWidth && cached.reportedHeight === source.videoHeight) {
                return { width: cached.width, height: cached.height };
            }
            if (typeof VideoFrame !== "undefined" && source.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                try {
                    const frame = new VideoFrame(source, { timestamp: Math.round(source.currentTime * 1_000_000) });
                    const extent = externalVideoFrameDisplayExtent(frame);
                    frame.close();
                    if (extent) {
                        videoDisplayExtents.set(source, {
                            reportedWidth: source.videoWidth,
                            reportedHeight: source.videoHeight,
                            width: extent.width,
                            height: extent.height,
                        });
                        return extent;
                    }
                } catch (_) {
                }
            }
            return { width: source.videoWidth, height: source.videoHeight };
        }
        if (typeof HTMLImageElement !== "undefined" && source instanceof HTMLImageElement) {
            const imageUrl = source.currentSrc || source.src || "";
            const isSvg = /^data:image\/svg\+xml(?:[;,]|$)/i.test(imageUrl) || (() => {
                try {
                    return new URL(imageUrl, document.baseURI).pathname.toLowerCase().endsWith(".svg");
                } catch {
                    return false;
                }
            })();
            if (isSvg) return { width: source.width, height: source.height };
            return { width: source.naturalWidth, height: source.naturalHeight };
        }
        if (Number.isFinite(source.displayWidth) && Number.isFinite(source.displayHeight)) {
            return { width: source.displayWidth, height: source.displayHeight };
        }
        if (Number.isFinite(source.width) && Number.isFinite(source.height)) {
            return { width: source.width, height: source.height };
        }
        return null;
    }

    private isKnownTextureFormat(format: GLenum): boolean {
        return format === WebGL2RenderingContext.ALPHA ||
            format === WebGL2RenderingContext.RGB ||
            format === WebGL2RenderingContext.RGBA ||
            format === WebGL2RenderingContext.LUMINANCE ||
            format === WebGL2RenderingContext.LUMINANCE_ALPHA ||
            format === WebGL2RenderingContext.DEPTH_COMPONENT ||
            format === WebGL2RenderingContext.DEPTH_STENCIL ||
            format === GL_SRGB_EXT ||
            format === GL_SRGB_ALPHA_EXT ||
            (this.hydContextType === "webgl2" && (
                format === WebGL2RenderingContext.RED ||
                format === WebGL2RenderingContext.RG ||
                format === WebGL2RenderingContext.RED_INTEGER ||
                format === WebGL2RenderingContext.RG_INTEGER ||
                format === WebGL2RenderingContext.RGB_INTEGER ||
                format === WebGL2RenderingContext.RGBA_INTEGER));
    }

    private isKnownTextureInternalFormat(internalformat: GLenum): boolean {
        if (this.isKnownTextureFormat(internalformat)) return true;
        try {
            this.textureStorageUploadFormat(internalformat);
            return true;
        } catch (_) {
            return false;
        }
    }

    private isKnownTextureType(type: GLenum): boolean {
        return type === WebGL2RenderingContext.UNSIGNED_BYTE ||
            type === WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5 ||
            type === WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4 ||
            type === WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1 ||
            type === WebGL2RenderingContext.FLOAT ||
            type === 0x8D61 ||
            (this.hydContextType === "webgl2" && (
                type === WebGL2RenderingContext.BYTE ||
                type === WebGL2RenderingContext.SHORT ||
                type === WebGL2RenderingContext.UNSIGNED_SHORT ||
                type === WebGL2RenderingContext.INT ||
                type === WebGL2RenderingContext.UNSIGNED_INT ||
                type === WebGL2RenderingContext.UNSIGNED_INT_2_10_10_10_REV ||
                type === WebGL2RenderingContext.UNSIGNED_INT_10F_11F_11F_REV ||
                type === WebGL2RenderingContext.UNSIGNED_INT_5_9_9_9_REV ||
                type === WebGL2RenderingContext.HALF_FLOAT ||
                type === WebGL2RenderingContext.UNSIGNED_INT_24_8 ||
                type === WebGL2RenderingContext.FLOAT_32_UNSIGNED_INT_24_8_REV));
    }

    private validateTextureUploadView(
        pixels: any,
        width: number,
        height: number,
        format: GLenum,
        type: GLenum,
        depth: number = 1,
        layered: boolean = false,
    ): boolean {
        if (pixels === null || !ArrayBuffer.isView(pixels)) return true;
        const compatible = type === WebGL2RenderingContext.UNSIGNED_BYTE
            ? pixels instanceof Uint8Array || pixels instanceof Uint8ClampedArray
            : type === WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5 ||
                type === WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4 ||
                type === WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1 ||
                type === WebGL2RenderingContext.UNSIGNED_SHORT ||
                type === WebGL2RenderingContext.HALF_FLOAT || type === 0x8D61
                ? pixels instanceof Uint16Array
                : type === WebGL2RenderingContext.FLOAT
                    ? pixels instanceof Float32Array
                    : type === WebGL2RenderingContext.UNSIGNED_INT ||
                type === WebGL2RenderingContext.UNSIGNED_INT_10F_11F_11F_REV ||
                type === WebGL2RenderingContext.UNSIGNED_INT_5_9_9_9_REV ||
                type === WebGL2RenderingContext.UNSIGNED_INT_2_10_10_10_REV ||
                type === WebGL2RenderingContext.UNSIGNED_INT_24_8 ||
                type === WebGL2RenderingContext.FLOAT_32_UNSIGNED_INT_24_8_REV
                        ? pixels instanceof Uint32Array
                        : type === WebGL2RenderingContext.INT
                            ? pixels instanceof Int32Array
                            : type === WebGL2RenderingContext.BYTE
                                ? pixels instanceof Int8Array
                                : type === WebGL2RenderingContext.SHORT
                                    ? pixels instanceof Int16Array
                                    : false;
        if (!compatible) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return false;
        }
        try {
            const bytesPerPixel = textureUploadBytesPerPixel(format, type);
            const unpack = this.hydGlobalState.miscState.unpackState;
            const effectiveRowLength = unpack.rowLength || width;
            if (effectiveRowLength < width + (unpack.skipPixels || 0)) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return false;
            }
            if (layered) {
                const effectiveImageHeight = unpack.imageHeight || height;
                if (effectiveImageHeight < height + (unpack.skipRows || 0)) {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                    return false;
                }
            }
            const requiredBytes = layered
                ? packedPixelLayout3D(
                    width, height, depth, bytesPerPixel, unpack.alignment,
                    unpack.rowLength || 0, unpack.imageHeight || 0,
                    unpack.skipPixels || 0, unpack.skipRows || 0, unpack.skipImages || 0,
                ).requiredBytes
                : packedPixelLayout(
                    width, height, bytesPerPixel, unpack.alignment,
                    unpack.rowLength || 0, unpack.skipPixels || 0, unpack.skipRows || 0,
                ).requiredBytes;
            if (pixels.byteLength < requiredBytes) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return false;
            }
        } catch {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return false;
        }
        return true;
    }

    private textureUploadViewFromElementOffset(pixels: ArrayBufferView, sourceOffset: number): TypedArray | null {
        const offset = Number(sourceOffset);
        const length = Number((pixels as any).length);
        const subarray = (pixels as any).subarray;
        if (!Number.isFinite(offset) || Math.trunc(offset) !== offset || offset < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return null;
        }
        if (!Number.isFinite(length) || typeof subarray !== "function") {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        return subarray.call(pixels, Math.min(offset, length)) as TypedArray;
    }

    private compressedTextureViewBytes(
        source: ArrayBufferView,
        sourceOffset: number,
        sourceLengthOverride: number | undefined,
        expectedBytes: number,
    ): Uint8Array | null {
        const bytesPerElement = Number((source as any).BYTES_PER_ELEMENT) || 1;
        const elementLength = Number((source as any).length ?? source.byteLength);
        const offset = Number(sourceOffset);
        const length = sourceLengthOverride === undefined
            ? elementLength - offset
            : Number(sourceLengthOverride);
        if (!Number.isFinite(offset) || Math.trunc(offset) !== offset || offset < 0 ||
            !Number.isFinite(length) || Math.trunc(length) !== length || length < 0 ||
            offset > elementLength || offset + length > elementLength ||
            length * bytesPerElement !== expectedBytes) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return null;
        }
        return new Uint8Array(
            source.buffer,
            source.byteOffset + offset * bytesPerElement,
            length * bytesPerElement,
        );
    }

    private isSupportedTextureUploadFormat(internalformat: GLenum, format: GLenum, type: GLenum): boolean {
        return (internalformat === WebGL2RenderingContext.RGBA && format === WebGL2RenderingContext.RGBA &&
                (type === WebGL2RenderingContext.UNSIGNED_BYTE ||
                    (this.hydContextType !== "webgl2" && type === WebGL2RenderingContext.FLOAT &&
                        this.enabledExtensions.has("OES_TEXTURE_FLOAT"))))
            || (internalformat === WebGL2RenderingContext.RGBA8 && format === WebGL2RenderingContext.RGBA &&
                type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (internalformat === WebGL2RenderingContext.RGBA8UI && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (internalformat === WebGL2RenderingContext.RGBA8I && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.BYTE)
            || (internalformat === WebGL2RenderingContext.RGBA16UI && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.UNSIGNED_SHORT)
            || (internalformat === WebGL2RenderingContext.RGBA16I && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.SHORT)
            || (internalformat === WebGL2RenderingContext.RGBA32UI && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT)
            || (internalformat === WebGL2RenderingContext.RGBA32I && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.INT)
            || (internalformat === WebGL2RenderingContext.R8 && format === WebGL2RenderingContext.RED && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (internalformat === WebGL2RenderingContext.R8UI && format === WebGL2RenderingContext.RED_INTEGER && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (internalformat === WebGL2RenderingContext.R8I && format === WebGL2RenderingContext.RED_INTEGER && type === WebGL2RenderingContext.BYTE)
            || (internalformat === WebGL2RenderingContext.R16UI && format === WebGL2RenderingContext.RED_INTEGER && type === WebGL2RenderingContext.UNSIGNED_SHORT)
            || (internalformat === WebGL2RenderingContext.R16I && format === WebGL2RenderingContext.RED_INTEGER && type === WebGL2RenderingContext.SHORT)
            || (internalformat === WebGL2RenderingContext.R32I && format === WebGL2RenderingContext.RED_INTEGER && type === WebGL2RenderingContext.INT)
            || (internalformat === WebGL2RenderingContext.RG8 && format === WebGL2RenderingContext.RG && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (internalformat === WebGL2RenderingContext.RG8UI && format === WebGL2RenderingContext.RG_INTEGER && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (internalformat === WebGL2RenderingContext.RG8I && format === WebGL2RenderingContext.RG_INTEGER && type === WebGL2RenderingContext.BYTE)
            || (internalformat === WebGL2RenderingContext.RG16UI && format === WebGL2RenderingContext.RG_INTEGER && type === WebGL2RenderingContext.UNSIGNED_SHORT)
            || (internalformat === WebGL2RenderingContext.RG16I && format === WebGL2RenderingContext.RG_INTEGER && type === WebGL2RenderingContext.SHORT)
            || (internalformat === WebGL2RenderingContext.RG32I && format === WebGL2RenderingContext.RG_INTEGER && type === WebGL2RenderingContext.INT)
            || (internalformat === WebGL2RenderingContext.RGB10_A2UI && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT_2_10_10_10_REV)
            || (internalformat === WebGL2RenderingContext.RGB10_A2 && format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.UNSIGNED_INT_2_10_10_10_REV)
            || (internalformat === WebGL2RenderingContext.RGBA32F && format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.FLOAT)
            || (internalformat === WebGL2RenderingContext.RGB32F && format === WebGL2RenderingContext.RGB && type === WebGL2RenderingContext.FLOAT)
            || (internalformat === WebGL2RenderingContext.RGB8UI && format === WebGL2RenderingContext.RGB_INTEGER && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (internalformat === WebGL2RenderingContext.RGB8I && format === WebGL2RenderingContext.RGB_INTEGER && type === WebGL2RenderingContext.BYTE)
            || (internalformat === WebGL2RenderingContext.RGB16UI && format === WebGL2RenderingContext.RGB_INTEGER && type === WebGL2RenderingContext.UNSIGNED_SHORT)
            || (internalformat === WebGL2RenderingContext.RGB16I && format === WebGL2RenderingContext.RGB_INTEGER && type === WebGL2RenderingContext.SHORT)
            || (internalformat === WebGL2RenderingContext.RGB32UI && format === WebGL2RenderingContext.RGB_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT)
            || (internalformat === WebGL2RenderingContext.RGB32I && format === WebGL2RenderingContext.RGB_INTEGER && type === WebGL2RenderingContext.INT)
            || (internalformat === WebGL2RenderingContext.RG32UI && format === WebGL2RenderingContext.RG_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT)
            || (internalformat === WebGL2RenderingContext.R32UI && format === WebGL2RenderingContext.RED_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT)
            || (internalformat === WebGL2RenderingContext.RG32F && format === WebGL2RenderingContext.RG && type === WebGL2RenderingContext.FLOAT)
            || (internalformat === WebGL2RenderingContext.R32F && format === WebGL2RenderingContext.RED && type === WebGL2RenderingContext.FLOAT)
            || ((internalformat === WebGL2RenderingContext.R16F && format === WebGL2RenderingContext.RED) ||
                (internalformat === WebGL2RenderingContext.RG16F && format === WebGL2RenderingContext.RG) ||
                (internalformat === WebGL2RenderingContext.RGB16F && format === WebGL2RenderingContext.RGB) ||
                (internalformat === WebGL2RenderingContext.RGBA16F && format === WebGL2RenderingContext.RGBA)) &&
                (type === WebGL2RenderingContext.FLOAT || type === WebGL2RenderingContext.HALF_FLOAT)
            || (internalformat === WebGL2RenderingContext.R11F_G11F_B10F && format === WebGL2RenderingContext.RGB &&
                (type === WebGL2RenderingContext.FLOAT ||
                    type === WebGL2RenderingContext.HALF_FLOAT ||
                    type === WebGL2RenderingContext.UNSIGNED_INT_10F_11F_11F_REV))
            || (internalformat === WebGL2RenderingContext.RGB9_E5 && format === WebGL2RenderingContext.RGB &&
                (type === WebGL2RenderingContext.FLOAT || type === WebGL2RenderingContext.HALF_FLOAT ||
                    type === WebGL2RenderingContext.UNSIGNED_INT_5_9_9_9_REV))
            || (internalformat === WebGL2RenderingContext.R8_SNORM && format === WebGL2RenderingContext.RED && type === WebGL2RenderingContext.BYTE)
            || (internalformat === WebGL2RenderingContext.RG8_SNORM && format === WebGL2RenderingContext.RG && type === WebGL2RenderingContext.BYTE)
            || (internalformat === WebGL2RenderingContext.RGB8_SNORM && format === WebGL2RenderingContext.RGB && type === WebGL2RenderingContext.BYTE)
            || (internalformat === WebGL2RenderingContext.RGBA8_SNORM && format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.BYTE)
            || (internalformat === WebGL2RenderingContext.DEPTH_COMPONENT32F && format === WebGL2RenderingContext.DEPTH_COMPONENT && type === WebGL2RenderingContext.FLOAT)
            || (internalformat === WebGL2RenderingContext.DEPTH24_STENCIL8 &&
                format === WebGL2RenderingContext.DEPTH_STENCIL &&
                type === WebGL2RenderingContext.UNSIGNED_INT_24_8)
            || (internalformat === WebGL2RenderingContext.DEPTH32F_STENCIL8 &&
                format === WebGL2RenderingContext.DEPTH_STENCIL &&
                type === WebGL2RenderingContext.FLOAT_32_UNSIGNED_INT_24_8_REV)
            || ((internalformat === WebGL2RenderingContext.DEPTH_COMPONENT ||
                internalformat === WebGL2RenderingContext.DEPTH_COMPONENT16 ||
                internalformat === WebGL2RenderingContext.DEPTH_COMPONENT24) &&
                format === WebGL2RenderingContext.DEPTH_COMPONENT &&
                (type === WebGL2RenderingContext.UNSIGNED_INT || type === WebGL2RenderingContext.UNSIGNED_SHORT))
            || (internalformat === WebGL2RenderingContext.LUMINANCE && format === WebGL2RenderingContext.LUMINANCE && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (internalformat === WebGL2RenderingContext.ALPHA && format === WebGL2RenderingContext.ALPHA && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (internalformat === WebGL2RenderingContext.LUMINANCE_ALPHA && format === WebGL2RenderingContext.LUMINANCE_ALPHA && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (((internalformat === GL_SRGB_EXT && format === GL_SRGB_EXT) ||
                (internalformat === GL_SRGB_ALPHA_EXT && format === GL_SRGB_ALPHA_EXT)) &&
                type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (this.hydContextType === "webgl2" &&
                ((internalformat === WebGL2RenderingContext.SRGB8 && format === WebGL2RenderingContext.RGB) ||
                    (internalformat === WebGL2RenderingContext.SRGB8_ALPHA8 && format === WebGL2RenderingContext.RGBA)) &&
                type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (internalformat === WebGL2RenderingContext.RGB && format === WebGL2RenderingContext.RGB &&
                (type === WebGL2RenderingContext.UNSIGNED_BYTE || type === WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5))
            || (internalformat === WebGL2RenderingContext.RGB8 && format === WebGL2RenderingContext.RGB && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (internalformat === WebGL2RenderingContext.RGB565 && format === WebGL2RenderingContext.RGB &&
                (type === WebGL2RenderingContext.UNSIGNED_BYTE || type === WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5))
            || (internalformat === WebGL2RenderingContext.RGB5_A1 && format === WebGL2RenderingContext.RGBA &&
                (type === WebGL2RenderingContext.UNSIGNED_BYTE ||
                    type === WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1 ||
                    type === WebGL2RenderingContext.UNSIGNED_INT_2_10_10_10_REV))
            || (internalformat === WebGL2RenderingContext.RGBA4 && format === WebGL2RenderingContext.RGBA &&
                (type === WebGL2RenderingContext.UNSIGNED_BYTE || type === WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4))
            || (internalformat === WebGL2RenderingContext.RGBA && format === WebGL2RenderingContext.RGBA &&
                (type === WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4 ||
                    type === WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1));
    }

    private textureUploadExtensionsAllow(format: GLenum, type: GLenum): boolean {
        if (this.hydContextType === "webgl2") return true;
        const extensionName = format === GL_SRGB_EXT || format === GL_SRGB_ALPHA_EXT
            ? "EXT_SRGB"
            : type === WebGL2RenderingContext.FLOAT
            ? "OES_TEXTURE_FLOAT"
            : type === 0x8D61
                ? "OES_TEXTURE_HALF_FLOAT"
                : (format === WebGL2RenderingContext.DEPTH_COMPONENT || format === WebGL2RenderingContext.DEPTH_STENCIL)
                    ? "WEBGL_DEPTH_TEXTURE"
                    : null;
        if (!extensionName || this.enabledExtensions.has(extensionName)) return true;
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
        return false;
    }

    private isSupportedTextureSubUploadFormat(format: GLenum, type: GLenum): boolean {
        return this.isSupportedTextureUploadFormat(format, format, type)
            || (format === WebGL2RenderingContext.RGBA_INTEGER &&
                (type === WebGL2RenderingContext.UNSIGNED_BYTE ||
                    type === WebGL2RenderingContext.BYTE ||
                    type === WebGL2RenderingContext.UNSIGNED_SHORT ||
                    type === WebGL2RenderingContext.SHORT ||
                    type === WebGL2RenderingContext.UNSIGNED_INT ||
                    type === WebGL2RenderingContext.INT))
            || (format === WebGL2RenderingContext.RG_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT)
            || (format === WebGL2RenderingContext.RED_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT)
            || (format === WebGL2RenderingContext.RGBA && (type === WebGL2RenderingContext.UNSIGNED_BYTE || type === WebGL2RenderingContext.FLOAT))
            || (format === WebGL2RenderingContext.RGBA && (type === WebGL2RenderingContext.HALF_FLOAT || type === WebGL2RenderingContext.BYTE))
            || (format === WebGL2RenderingContext.RG && (type === WebGL2RenderingContext.FLOAT || type === WebGL2RenderingContext.HALF_FLOAT || type === WebGL2RenderingContext.BYTE))
            || (format === WebGL2RenderingContext.RED && (type === WebGL2RenderingContext.FLOAT || type === WebGL2RenderingContext.HALF_FLOAT || type === WebGL2RenderingContext.BYTE))
            || (format === WebGL2RenderingContext.RGB && (type === WebGL2RenderingContext.FLOAT || type === WebGL2RenderingContext.HALF_FLOAT || type === WebGL2RenderingContext.BYTE || type === WebGL2RenderingContext.UNSIGNED_INT_5_9_9_9_REV))
            || (format === WebGL2RenderingContext.RGB && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (format === WebGL2RenderingContext.LUMINANCE && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (format === WebGL2RenderingContext.ALPHA && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (format === WebGL2RenderingContext.LUMINANCE_ALPHA && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || ((format === GL_SRGB_EXT || format === GL_SRGB_ALPHA_EXT) && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (format === WebGL2RenderingContext.RGB && type === WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5)
            || (format === WebGL2RenderingContext.RGBA &&
                (type === WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4 ||
                    type === WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1));
    }

    private textureStorageUploadFormat(internalformat: GLenum): { format: GLenum, type: GLenum } {
        switch (internalformat) {
            case WebGL2RenderingContext.RGBA8:
                return { format: WebGL2RenderingContext.RGBA, type: WebGL2RenderingContext.UNSIGNED_BYTE };
            case WebGL2RenderingContext.RGB8:
            case WebGL2RenderingContext.SRGB8:
                return { format: WebGL2RenderingContext.RGB, type: WebGL2RenderingContext.UNSIGNED_BYTE };
            case WebGL2RenderingContext.SRGB8_ALPHA8:
                return { format: WebGL2RenderingContext.RGBA, type: WebGL2RenderingContext.UNSIGNED_BYTE };
            case WebGL2RenderingContext.RGB565:
                return { format: WebGL2RenderingContext.RGB, type: WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5 };
            case WebGL2RenderingContext.RGBA4:
                return { format: WebGL2RenderingContext.RGBA, type: WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4 };
            case WebGL2RenderingContext.RGB5_A1:
                return { format: WebGL2RenderingContext.RGBA, type: WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1 };
            case WebGL2RenderingContext.RGB10_A2:
                return { format: WebGL2RenderingContext.RGBA, type: WebGL2RenderingContext.UNSIGNED_INT_2_10_10_10_REV };
            case WebGL2RenderingContext.RGB10_A2UI:
                return { format: WebGL2RenderingContext.RGBA_INTEGER, type: WebGL2RenderingContext.UNSIGNED_INT_2_10_10_10_REV };
            case WebGL2RenderingContext.RGBA8UI:
                return { format: WebGL2RenderingContext.RGBA_INTEGER, type: WebGL2RenderingContext.UNSIGNED_BYTE };
            case WebGL2RenderingContext.RGBA8I:
                return { format: WebGL2RenderingContext.RGBA_INTEGER, type: WebGL2RenderingContext.BYTE };
            case WebGL2RenderingContext.RGBA16UI:
                return { format: WebGL2RenderingContext.RGBA_INTEGER, type: WebGL2RenderingContext.UNSIGNED_SHORT };
            case WebGL2RenderingContext.RGBA16I:
                return { format: WebGL2RenderingContext.RGBA_INTEGER, type: WebGL2RenderingContext.SHORT };
            case WebGL2RenderingContext.RGBA32UI:
                return { format: WebGL2RenderingContext.RGBA_INTEGER, type: WebGL2RenderingContext.UNSIGNED_INT };
            case WebGL2RenderingContext.RGBA32I:
                return { format: WebGL2RenderingContext.RGBA_INTEGER, type: WebGL2RenderingContext.INT };
            case WebGL2RenderingContext.RGBA32F:
                return { format: WebGL2RenderingContext.RGBA, type: WebGL2RenderingContext.FLOAT };
            case WebGL2RenderingContext.RGBA16F:
                return { format: WebGL2RenderingContext.RGBA, type: WebGL2RenderingContext.HALF_FLOAT };
            case WebGL2RenderingContext.RG32UI:
                return { format: WebGL2RenderingContext.RG_INTEGER, type: WebGL2RenderingContext.UNSIGNED_INT };
            case WebGL2RenderingContext.RG32I:
                return { format: WebGL2RenderingContext.RG_INTEGER, type: WebGL2RenderingContext.INT };
            case WebGL2RenderingContext.R32UI:
                return { format: WebGL2RenderingContext.RED_INTEGER, type: WebGL2RenderingContext.UNSIGNED_INT };
            case WebGL2RenderingContext.R32I:
                return { format: WebGL2RenderingContext.RED_INTEGER, type: WebGL2RenderingContext.INT };
            case WebGL2RenderingContext.R8:
                return { format: WebGL2RenderingContext.RED, type: WebGL2RenderingContext.UNSIGNED_BYTE };
            case WebGL2RenderingContext.R8UI:
                return { format: WebGL2RenderingContext.RED_INTEGER, type: WebGL2RenderingContext.UNSIGNED_BYTE };
            case WebGL2RenderingContext.R8I:
                return { format: WebGL2RenderingContext.RED_INTEGER, type: WebGL2RenderingContext.BYTE };
            case WebGL2RenderingContext.R16UI:
                return { format: WebGL2RenderingContext.RED_INTEGER, type: WebGL2RenderingContext.UNSIGNED_SHORT };
            case WebGL2RenderingContext.R16I:
                return { format: WebGL2RenderingContext.RED_INTEGER, type: WebGL2RenderingContext.SHORT };
            case WebGL2RenderingContext.RG8:
                return { format: WebGL2RenderingContext.RG, type: WebGL2RenderingContext.UNSIGNED_BYTE };
            case WebGL2RenderingContext.RG8UI:
                return { format: WebGL2RenderingContext.RG_INTEGER, type: WebGL2RenderingContext.UNSIGNED_BYTE };
            case WebGL2RenderingContext.RG8I:
                return { format: WebGL2RenderingContext.RG_INTEGER, type: WebGL2RenderingContext.BYTE };
            case WebGL2RenderingContext.RG16UI:
                return { format: WebGL2RenderingContext.RG_INTEGER, type: WebGL2RenderingContext.UNSIGNED_SHORT };
            case WebGL2RenderingContext.RG16I:
                return { format: WebGL2RenderingContext.RG_INTEGER, type: WebGL2RenderingContext.SHORT };
            case WebGL2RenderingContext.RG32F:
                return { format: WebGL2RenderingContext.RG, type: WebGL2RenderingContext.FLOAT };
            case WebGL2RenderingContext.RG16F:
                return { format: WebGL2RenderingContext.RG, type: WebGL2RenderingContext.HALF_FLOAT };
            case WebGL2RenderingContext.R32F:
                return { format: WebGL2RenderingContext.RED, type: WebGL2RenderingContext.FLOAT };
            case WebGL2RenderingContext.R16F:
                return { format: WebGL2RenderingContext.RED, type: WebGL2RenderingContext.HALF_FLOAT };
            case WebGL2RenderingContext.RGB32F:
                return { format: WebGL2RenderingContext.RGB, type: WebGL2RenderingContext.FLOAT };
            case WebGL2RenderingContext.RGB16F:
                return { format: WebGL2RenderingContext.RGB, type: WebGL2RenderingContext.HALF_FLOAT };
            case WebGL2RenderingContext.R11F_G11F_B10F:
                return { format: WebGL2RenderingContext.RGB, type: WebGL2RenderingContext.FLOAT };
            case WebGL2RenderingContext.RGB9_E5:
                return { format: WebGL2RenderingContext.RGB, type: WebGL2RenderingContext.UNSIGNED_INT_5_9_9_9_REV };
            case WebGL2RenderingContext.R8_SNORM:
                return { format: WebGL2RenderingContext.RED, type: WebGL2RenderingContext.BYTE };
            case WebGL2RenderingContext.RG8_SNORM:
                return { format: WebGL2RenderingContext.RG, type: WebGL2RenderingContext.BYTE };
            case WebGL2RenderingContext.RGB8_SNORM:
                return { format: WebGL2RenderingContext.RGB, type: WebGL2RenderingContext.BYTE };
            case WebGL2RenderingContext.RGBA8_SNORM:
                return { format: WebGL2RenderingContext.RGBA, type: WebGL2RenderingContext.BYTE };
            case WebGL2RenderingContext.RGB8UI:
                return { format: WebGL2RenderingContext.RGB_INTEGER, type: WebGL2RenderingContext.UNSIGNED_BYTE };
            case WebGL2RenderingContext.RGB8I:
                return { format: WebGL2RenderingContext.RGB_INTEGER, type: WebGL2RenderingContext.BYTE };
            case WebGL2RenderingContext.RGB16UI:
                return { format: WebGL2RenderingContext.RGB_INTEGER, type: WebGL2RenderingContext.UNSIGNED_SHORT };
            case WebGL2RenderingContext.RGB16I:
                return { format: WebGL2RenderingContext.RGB_INTEGER, type: WebGL2RenderingContext.SHORT };
            case WebGL2RenderingContext.RGB32UI:
                return { format: WebGL2RenderingContext.RGB_INTEGER, type: WebGL2RenderingContext.UNSIGNED_INT };
            case WebGL2RenderingContext.RGB32I:
                return { format: WebGL2RenderingContext.RGB_INTEGER, type: WebGL2RenderingContext.INT };
            case WebGL2RenderingContext.DEPTH_COMPONENT16:
            case WebGL2RenderingContext.DEPTH_COMPONENT24:
                return { format: WebGL2RenderingContext.DEPTH_COMPONENT, type: WebGL2RenderingContext.UNSIGNED_INT };
            case WebGL2RenderingContext.DEPTH_COMPONENT32F:
                return { format: WebGL2RenderingContext.DEPTH_COMPONENT, type: WebGL2RenderingContext.FLOAT };
            case WebGL2RenderingContext.DEPTH24_STENCIL8:
                return { format: WebGL2RenderingContext.DEPTH_STENCIL, type: WebGL2RenderingContext.UNSIGNED_INT_24_8 };
            case WebGL2RenderingContext.DEPTH32F_STENCIL8:
                return { format: WebGL2RenderingContext.DEPTH_STENCIL, type: WebGL2RenderingContext.FLOAT_32_UNSIGNED_INT_24_8_REV };
            default:
                throw new Error("unsupported texStorage internalformat: " + internalformat);
        }
    }

    private pixelUnpackBufferSlice(
        byteOffset: number,
        width: number,
        height: number,
        depth: number,
        format: GLenum,
        type: GLenum,
        layered: boolean = false,
    ): TypedArray | null {
        const buffer = this.hydGlobalState.commonState.pixelUnpackBufferBinding;
        if (!buffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        if (this.bufferOperationConflictsWithTransformFeedback(buffer, WebGL2RenderingContext.PIXEL_UNPACK_BUFFER)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        if (!Number.isInteger(byteOffset) || byteOffset < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return null;
        }
        const elementBytes = type === WebGL2RenderingContext.BYTE ||
            type === WebGL2RenderingContext.UNSIGNED_BYTE
            ? 1
            : type === WebGL2RenderingContext.SHORT ||
                type === WebGL2RenderingContext.UNSIGNED_SHORT ||
                type === WebGL2RenderingContext.HALF_FLOAT || type === 0x8D61 ||
                type === WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5 ||
                type === WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4 ||
                type === WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1
                ? 2
                : 4;
        if (byteOffset % elementBytes !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        const bytesPerPixel = textureUploadBytesPerPixel(format, type);
        const unpack = this.hydGlobalState.miscState.unpackState;
        if (unpack.flipY || unpack.premultiplyAlpha) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        const effectiveRowLength = unpack.rowLength || width;
        const effectiveImageHeight = unpack.imageHeight || height;
        if (effectiveRowLength < width + (unpack.skipPixels || 0) ||
            (layered && effectiveImageHeight < height + (unpack.skipRows || 0))) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        const byteLength = layered
            ? packedPixelLayout3D(
                width, height, depth, bytesPerPixel, unpack.alignment,
                unpack.rowLength || 0, unpack.imageHeight || 0,
                unpack.skipPixels || 0, unpack.skipRows || 0, unpack.skipImages || 0,
            ).requiredBytes
            : packedPixelLayout(
                width, height, bytesPerPixel, unpack.alignment,
                unpack.rowLength || 0, unpack.skipPixels || 0, unpack.skipRows || 0,
            ).requiredBytes;
        const end = byteOffset + byteLength;
        if (end > buffer.webglSize) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        const bytes = buffer.shadowData.subarray(byteOffset, end);
        const length = bytes.byteLength / elementBytes;
        if (!Number.isInteger(length)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        if (type === WebGL2RenderingContext.BYTE) {
            return new Int8Array(bytes.buffer, bytes.byteOffset, length);
        }
        if (type === WebGL2RenderingContext.SHORT) {
            return new Int16Array(bytes.buffer, bytes.byteOffset, length);
        }
        if (type === WebGL2RenderingContext.INT) {
            return new Int32Array(bytes.buffer, bytes.byteOffset, length);
        }
        if (type === WebGL2RenderingContext.FLOAT) {
            return new Float32Array(bytes.buffer, bytes.byteOffset, length);
        }
        if (elementBytes === 2) {
            return new Uint16Array(bytes.buffer, bytes.byteOffset, length);
        }
        if (elementBytes === 4) {
            return new Uint32Array(bytes.buffer, bytes.byteOffset, length);
        }
        return bytes;
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
        return framebuffer.attachments.get(attachmentPoint) || null;
    }

    private implementationColorReadParameters(): { format: GLenum, type: GLenum } {
        const framebuffer = this.hydGlobalState.commonState.readFramebufferBinding;
        const attachment = framebuffer === this.hydGlobalState.defaultFramebuffer
            ? null
            : this.getReadColorAttachment();
        if (attachment?.format.endsWith("sint")) {
            return {
                format: WebGL2RenderingContext.RGBA_INTEGER,
                type: WebGL2RenderingContext.INT,
            };
        }
        if (attachment?.format.endsWith("uint")) {
            return {
                format: WebGL2RenderingContext.RGBA_INTEGER,
                type: WebGL2RenderingContext.UNSIGNED_INT,
            };
        }
        return {
            format: WebGL2RenderingContext.RGBA,
            type: WebGL2RenderingContext.UNSIGNED_BYTE,
        };
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

    private sameFramebufferImage(a: FramebufferAttributes | null, b: FramebufferAttributes | null): boolean {
        return !!a && !!b &&
            a.attachment === b.attachment &&
            (a.level || 0) === (b.level || 0) &&
            (a.layer ?? -1) === (b.layer ?? -1) &&
            (a.face || 0) === (b.face || 0);
    }

    private sameFramebufferObject(a: FramebufferAttributes | null, b: FramebufferAttributes | null): boolean {
        return !!a && !!b && a.attachment === b.attachment && a.objectType === b.objectType;
    }

    private framebufferAttachment(
        framebuffer: HydFramebuffer,
        attachment: GLenum,
    ): FramebufferAttributes | null {
        const combined = framebuffer.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT) || null;
        if (framebuffer === this.hydGlobalState.defaultFramebuffer &&
            this.hydGlobalState.contextAttributes.depth !== false &&
            this.hydGlobalState.contextAttributes.stencil === true &&
            combined &&
            (attachment === WebGL2RenderingContext.DEPTH_ATTACHMENT ||
                attachment === WebGL2RenderingContext.STENCIL_ATTACHMENT ||
                attachment === WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT)) {
            return combined;
        }
        if (attachment === WebGL2RenderingContext.DEPTH_ATTACHMENT) {
            return framebuffer.attachments.get(attachment) || combined;
        }
        if (attachment === WebGL2RenderingContext.STENCIL_ATTACHMENT) {
            return framebuffer.attachments.get(attachment) || combined;
        }
        if (attachment === WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT) {
            const depth = framebuffer.attachments.get(WebGL2RenderingContext.DEPTH_ATTACHMENT) || combined;
            const stencil = framebuffer.attachments.get(WebGL2RenderingContext.STENCIL_ATTACHMENT) || combined;
            return this.sameFramebufferObject(depth, stencil) ? depth : null;
        }
        return framebuffer.attachments.get(attachment) || null;
    }

    private setFramebufferAttachment(
        framebuffer: HydFramebuffer,
        attachment: GLenum,
        value: FramebufferAttributes | null,
    ) {
        const combinedPoint = WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT;
        const depthPoint = WebGL2RenderingContext.DEPTH_ATTACHMENT;
        const stencilPoint = WebGL2RenderingContext.STENCIL_ATTACHMENT;
        if (attachment === combinedPoint) {
            framebuffer.attachments.delete(combinedPoint);
            framebuffer.attachments.delete(depthPoint);
            framebuffer.attachments.delete(stencilPoint);
            if (value) framebuffer.attachments.set(combinedPoint, value);
            return;
        }
        if ((attachment === depthPoint || attachment === stencilPoint) &&
            framebuffer.attachments.has(combinedPoint)) {
            const combined = framebuffer.attachments.get(combinedPoint);
            framebuffer.attachments.delete(combinedPoint);
            framebuffer.attachments.set(
                attachment === depthPoint ? stencilPoint : depthPoint,
                combined,
            );
        }
        if (value) {
            framebuffer.attachments.set(attachment, value);
        } else {
            framebuffer.attachments.delete(attachment);
        }
    }

    private validateFramebufferTarget(target: GLenum): boolean {
        const valid = target === WebGL2RenderingContext.FRAMEBUFFER ||
            (this.hydContextType === "webgl2" &&
                (target === WebGL2RenderingContext.DRAW_FRAMEBUFFER ||
                    target === WebGL2RenderingContext.READ_FRAMEBUFFER));
        if (!valid) this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
        return valid;
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

    private getDrawFramebufferWidth(): number {
        const framebuffer = this.hydGlobalState.commonState.drawFramebufferBinding;
        if (framebuffer === this.hydGlobalState.defaultFramebuffer || framebuffer.drawBuffers.includes(WebGL2RenderingContext.BACK)) {
            return this.hydCanvas.width;
        }
        for (const attachment of framebuffer.attachments.values()) {
            if (attachment.width > 0) {
                return attachment.width;
            }
        }
        return this.hydCanvas.width;
    }

    private toGpuViewport(): [number, number, number, number, number, number] {
        const [x, y, width, height, minDepth, maxDepth] = this.hydGlobalState.commonState.viewport;
        const framebufferHeight = this.getDrawFramebufferHeight();
        return [x, framebufferHeight - y - height, width, height, minDepth, maxDepth];
    }

    private toGpuScissorRect(): [number, number, number, number] {
        const [x, y, width, height] = this.hydGlobalState.miscState.scissorBox;
        const framebufferWidth = this.getDrawFramebufferWidth();
        const framebufferHeight = this.getDrawFramebufferHeight();
        const x0 = Math.min(framebufferWidth, Math.max(0, x));
        const y0 = Math.min(framebufferHeight, Math.max(0, y));
        const x1 = Math.min(framebufferWidth, Math.max(0, x + width));
        const y1 = Math.min(framebufferHeight, Math.max(0, y + height));
        return [x0, framebufferHeight - y1, Math.max(0, x1 - x0), Math.max(0, y1 - y0)];
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
        this.hydRpCache.RpSetScissorRectValues(...this.toGpuScissorRect());
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

    private markFramebufferContentChanged() {
        this.framebufferWriteGeneration++;
        this.normalizedReadPixelsCache = null;
    }

    private markDrawFramebufferAttachmentsAsRenderTargets(mask: GLbitfield) {
        const framebuffer = this.hydGlobalState.commonState.drawFramebufferBinding;
        if (mask === 0) return;
        this.markFramebufferContentChanged();
        if (framebuffer === this.hydGlobalState.defaultFramebuffer) return;

        let changed = false;
        for (const [point, attachment] of framebuffer.attachments) {
            const isColor = point >= WebGL2RenderingContext.COLOR_ATTACHMENT0 &&
                point <= WebGL2RenderingContext.COLOR_ATTACHMENT15;
            const isDepth = point === WebGL2RenderingContext.DEPTH_ATTACHMENT ||
                point === WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT;
            const isStencil = point === WebGL2RenderingContext.STENCIL_ATTACHMENT ||
                point === WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT;
            const isWritten = (isColor && Boolean(mask & WebGL2RenderingContext.COLOR_BUFFER_BIT)) ||
                (isDepth && Boolean(mask & WebGL2RenderingContext.DEPTH_BUFFER_BIT)) ||
                (isStencil && Boolean(mask & WebGL2RenderingContext.STENCIL_BUFFER_BIT));
            if (isWritten) {
                if (isDepth) attachment.attachment.uniformDepthValue = null;
                if (isStencil) attachment.attachment.uniformStencilValue = null;
                changed = attachment.attachment.markFramebufferRenderTarget() || changed;
            }
        }
        if (changed) {
            this.samplerOriginStateVersion++;
        }
    }

    private colorWriteMaskForAttachment(attachment?: FramebufferAttributes): GPUColorWriteFlags {
        const [r, g, b, a] = this.hydGlobalState.miscState.colorWriteMask;
        const writesDefaultFramebuffer = this.hydGlobalState.commonState.drawFramebufferBinding === this.hydGlobalState.defaultFramebuffer;
        const targetHasAlpha = !attachment || attachment.colorBits[3] > 0;
        const writeAlpha = targetHasAlpha &&
            (writesDefaultFramebuffer && this.hydGlobalState.contextAttributes.alpha === false ? true : a);
        return (r ? GPUColorWrite.RED : 0) |
            (g ? GPUColorWrite.GREEN : 0) |
            (b ? GPUColorWrite.BLUE : 0) |
            (writeAlpha ? GPUColorWrite.ALPHA : 0);
    }

    private getColorWriteMask(): GPUColorWriteFlags {
        const framebuffer = this.hydGlobalState.commonState.drawFramebufferBinding;
        if (framebuffer === this.hydGlobalState.defaultFramebuffer) {
            return this.colorWriteMaskForAttachment();
        }
        return framebuffer.drawBuffers.reduce((mask, point) => {
            const attachment = framebuffer.attachments.get(point);
            return mask | (attachment ? this.colorWriteMaskForAttachment(attachment) : 0);
        }, 0);
    }

    private getMaskedClearTargets(): Array<{
        view: GPUTextureView,
        depthSlice?: number,
        format: GPUTextureFormat,
        writeMask: GPUColorWriteFlags,
        sampleCount: number,
    }> {
        return this.hydGlobalState.commonState.drawFramebufferBinding.drawBuffers.flatMap((value) => {
            if (value === WebGL2RenderingContext.BACK) {
                return this.hydGlobalState.__canvasView ? [{
                    view: this.hydGlobalState.__canvasView,
                    format: "bgra8unorm" as GPUTextureFormat,
                    writeMask: this.colorWriteMaskForAttachment(),
                    sampleCount: 1,
                }] : [];
            }
            if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                const attachment = this.hydGlobalState.commonState.drawFramebufferBinding.attachments.get(value);
                return attachment ? [{
                    view: attachment.view,
                    depthSlice: attachment.depthSlice,
                    format: attachment.format,
                    writeMask: this.colorWriteMaskForAttachment(attachment),
                    sampleCount: attachment.sampleCount,
                }] : [];
            }
            return [];
        });
    }

    private getMaskedClearPipeline(targets: Array<{
        view: GPUTextureView,
        depthSlice?: number,
        format: GPUTextureFormat,
        writeMask: GPUColorWriteFlags,
        sampleCount: number,
    }>): GPURenderPipeline {
        const sampleCount = targets[0]?.sampleCount || 1;
        const key = targets.map((target) => `${target.format}:${target.writeMask}`).join(",") +
            `:samples=${sampleCount}`;
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
                    targets: targets.map((target) => ({ format: target.format, writeMask: target.writeMask })),
                },
                primitive: { topology: "triangle-list" },
                multisample: { count: sampleCount },
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
        let clearColor = this.hydGlobalState.clearState.color;
        if (this.hydGlobalState.commonState.drawFramebufferBinding === this.hydGlobalState.defaultFramebuffer) {
            if (this.drawingBufferFormat === WebGL2RenderingContext.SRGB8_ALPHA8) {
                clearColor = [
                    linearToSrgb(clearColor[0]),
                    linearToSrgb(clearColor[1]),
                    linearToSrgb(clearColor[2]),
                    clearColor[3],
                ];
            } else if (this.hydGlobalState.contextAttributes.alpha === false) {
                clearColor = [clearColor[0], clearColor[1], clearColor[2], 1];
            }
        }
        this.hydDevice.queue.writeBuffer(
            this.maskedClearUniformBuffer,
            0,
            new Float32Array(clearColor),
        );
        const pipeline = this.getMaskedClearPipeline(targets);
        const bindGroup = this.hydDevice.createBindGroup({
            label: "masked-clear-bind-group",
            layout: pipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: this.maskedClearUniformBuffer } }],
        });
        const commandEncoder = this.hydDevice.createCommandEncoder({ label: "masked-clear-commandEncoder" });
        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: targets.map((target) => ({
                view: target.view,
                depthSlice: target.depthSlice,
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

    private getDepthStencilClearPipeline(
        format: GPUTextureFormat,
        clearDepth: boolean,
        clearStencil: boolean,
        stencilWriteMask: number,
        sampleCount: number,
    ): GPURenderPipeline {
        const key = `${format}:depth=${clearDepth ? 1 : 0}:stencil=${clearStencil ? 1 : 0}:` +
            `mask=${stencilWriteMask}:samples=${sampleCount}`;
        const cached = this.depthStencilClearPipelines.get(key);
        if (cached) return cached;
        const module = this.hydDevice.createShaderModule({
            label: `depth/stencil clear shader ${key}`,
            code: `
struct ClearDepth { value: f32 };
@group(0) @binding(0) var<uniform> clearDepthValue : ClearDepth;

@vertex
fn vertexMain(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  let positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  return vec4f(positions[index], clearDepthValue.value, 1.0);
}

@fragment
fn fragmentMain() {}
`,
        });
        const hasDepth = format.includes("depth");
        const hasStencil = format.includes("stencil");
        const depthStencil: GPUDepthStencilState = { format };
        if (hasDepth) {
            depthStencil.depthWriteEnabled = clearDepth;
            depthStencil.depthCompare = "always";
        }
        if (hasStencil) {
            const stencilFace: GPUStencilFaceState = {
                compare: "always",
                failOp: "keep",
                depthFailOp: "keep",
                passOp: clearStencil ? "replace" : "keep",
            };
            depthStencil.stencilFront = stencilFace;
            depthStencil.stencilBack = stencilFace;
            depthStencil.stencilReadMask = 0xff;
            depthStencil.stencilWriteMask = clearStencil ? stencilWriteMask & 0xff : 0;
        }
        const pipeline = this.hydDevice.createRenderPipeline({
            label: `depth/stencil clear pipeline ${key}`,
            layout: "auto",
            vertex: { module, entryPoint: "vertexMain" },
            fragment: { module, entryPoint: "fragmentMain", targets: [] },
            primitive: { topology: "triangle-list" },
            depthStencil,
            multisample: { count: sampleCount },
        });
        this.depthStencilClearPipelines.set(key, pipeline);
        return pipeline;
    }

    private clearDepthStencilWithMask(mask: GLbitfield) {
        const clearDepth = Boolean(mask & WebGL2RenderingContext.DEPTH_BUFFER_BIT);
        const clearStencil = Boolean(mask & WebGL2RenderingContext.STENCIL_BUFFER_BIT);
        if (!clearDepth && !clearStencil) return;
        const framebuffer = this.hydGlobalState.commonState.drawFramebufferBinding;
        const depth = clearDepth
            ? this.framebufferAttachment(framebuffer, WebGL2RenderingContext.DEPTH_ATTACHMENT)
            : null;
        const stencil = clearStencil
            ? this.framebufferAttachment(framebuffer, WebGL2RenderingContext.STENCIL_ATTACHMENT)
            : null;
        const attachment = depth || stencil;
        if (!attachment || (depth && stencil && !this.sameFramebufferImage(depth, stencil))) return;
        const stencilWriteMask = this.hydGlobalState.stencilState.frontWriteMask & 0xff;
        const pipeline = this.getDepthStencilClearPipeline(
            attachment.format,
            clearDepth,
            clearStencil,
            stencilWriteMask,
            attachment.sampleCount,
        );
        if (!this.depthStencilClearUniformBuffer) {
            this.depthStencilClearUniformBuffer = this.hydDevice.createBuffer({
                label: "depth/stencil clear uniforms",
                size: 16,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
            });
        }
        this.hydDevice.queue.writeBuffer(
            this.depthStencilClearUniformBuffer,
            0,
            new Float32Array([this.hydGlobalState.clearState.depth, 0, 0, 0]),
        );
        const bindGroup = this.hydDevice.createBindGroup({
            label: "depth/stencil clear bind group",
            layout: pipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: this.depthStencilClearUniformBuffer } }],
        });
        const depthStencilAttachment: GPURenderPassDepthStencilAttachment = { view: attachment.view };
        if (attachment.format.includes("depth")) {
            depthStencilAttachment.depthLoadOp = "load";
            depthStencilAttachment.depthStoreOp = "store";
        }
        if (attachment.format.includes("stencil")) {
            depthStencilAttachment.stencilLoadOp = "load";
            depthStencilAttachment.stencilStoreOp = "store";
        }
        const encoder = this.hydDevice.createCommandEncoder({ label: "depth/stencil masked clear" });
        const pass = encoder.beginRenderPass({ colorAttachments: [], depthStencilAttachment });
        if (this.hydGlobalState.miscState.scissorTest) {
            pass.setScissorRect(...this.toGpuScissorRect());
        }
        if (clearStencil) pass.setStencilReference(this.hydGlobalState.clearState.stencil & 0xff);
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();
        this.hydDevice.queue.submit([encoder.finish()]);
    }

    bindRenderbuffer(target: GLenum, renderbuffer: HydTexture | null) {
        if (renderbuffer?.deleted) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (renderbuffer !== null && (!(renderbuffer instanceof HydTexture) || renderbuffer.ownerToken !== this.contextToken)) {
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

    private renderbufferGpuFormat(internalFormat: GLenum): GPUTextureFormat | null {
        const halfFloatColorFormat = internalFormat === WebGL2RenderingContext.R16F ||
            internalFormat === WebGL2RenderingContext.RG16F ||
            internalFormat === WebGL2RenderingContext.RGBA16F;
        const fullFloatColorFormat = internalFormat === WebGL2RenderingContext.R32F ||
            internalFormat === WebGL2RenderingContext.RG32F ||
            internalFormat === WebGL2RenderingContext.RGBA32F ||
            internalFormat === WebGL2RenderingContext.R11F_G11F_B10F;
        if (halfFloatColorFormat &&
            !this.enabledExtensions.has("EXT_COLOR_BUFFER_FLOAT") &&
            !this.enabledExtensions.has("EXT_COLOR_BUFFER_HALF_FLOAT")) {
            return null;
        }
        if (fullFloatColorFormat && !this.enabledExtensions.has("EXT_COLOR_BUFFER_FLOAT")) {
            return null;
        }
        switch (internalFormat) {
            case GL_SRGB8_ALPHA8_EXT:
                if (this.hydContextType !== "webgl2" && !this.enabledExtensions.has("EXT_SRGB")) return null;
                return "rgba8unorm-srgb";
            case WebGL2RenderingContext.DEPTH_COMPONENT16:
                return "depth16unorm";
            case WebGL2RenderingContext.DEPTH_COMPONENT24:
                return "depth24plus";
            case WebGL2RenderingContext.DEPTH24_STENCIL8:
            case WebGL2RenderingContext.DEPTH_STENCIL:
                return "depth24plus-stencil8";
            case WebGL2RenderingContext.DEPTH32F_STENCIL8:
                return "depth32float-stencil8";
            case WebGL2RenderingContext.DEPTH_COMPONENT32F:
                return "depth32float";
            case WebGL2RenderingContext.STENCIL_INDEX8:
                return "stencil8";
            case WebGL2RenderingContext.RGBA4:
            case WebGL2RenderingContext.RGB565:
            case WebGL2RenderingContext.RGB5_A1:
            case WebGL2RenderingContext.RGB8:
            case WebGL2RenderingContext.RGBA8:
                return "rgba8unorm";
            case WebGL2RenderingContext.R8:
                return "r8unorm";
            case WebGL2RenderingContext.RG8:
                return "rg8unorm";
            case WebGL2RenderingContext.R8UI:
                return "r8uint";
            case WebGL2RenderingContext.R8I:
                return "r8sint";
            case WebGL2RenderingContext.R16UI:
                return "r16uint";
            case WebGL2RenderingContext.R16I:
                return "r16sint";
            case WebGL2RenderingContext.R32UI:
                return "r32uint";
            case WebGL2RenderingContext.R32I:
                return "r32sint";
            case WebGL2RenderingContext.RG8UI:
                return "rg8uint";
            case WebGL2RenderingContext.RG8I:
                return "rg8sint";
            case WebGL2RenderingContext.RG16UI:
                return "rg16uint";
            case WebGL2RenderingContext.RG16I:
                return "rg16sint";
            case WebGL2RenderingContext.RG32UI:
                return "rg32uint";
            case WebGL2RenderingContext.RG32I:
                return "rg32sint";
            case WebGL2RenderingContext.RGB10_A2:
                return "rgb10a2unorm";
            case WebGL2RenderingContext.RGB10_A2UI:
                return "rgb10a2uint";
            case WebGL2RenderingContext.RGBA8UI:
                return "rgba8uint";
            case WebGL2RenderingContext.RGBA8I:
                return "rgba8sint";
            case WebGL2RenderingContext.RGBA16UI:
                return "rgba16uint";
            case WebGL2RenderingContext.RGBA16I:
                return "rgba16sint";
            case WebGL2RenderingContext.RGBA32UI:
                return "rgba32uint";
            case WebGL2RenderingContext.RGBA32I:
                return "rgba32sint";
            case WebGL2RenderingContext.R16F:
                return "r16float";
            case WebGL2RenderingContext.RG16F:
                return "rg16float";
            case WebGL2RenderingContext.RGBA16F:
                return "rgba16float";
            case WebGL2RenderingContext.R32F:
                return "r32float";
            case WebGL2RenderingContext.RG32F:
                return "rg32float";
            case WebGL2RenderingContext.RGBA32F:
                return "rgba32float";
            default:
                return null;
        }
    }

    private allocateRenderbufferStorage(
        renderbuffer: HydTexture,
        internalFormat: GLenum,
        width: GLsizei,
        height: GLsizei,
        requestedSamples: number,
    ): boolean {
        const format = this.renderbufferGpuFormat(internalFormat);
        if (!format) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return false;
        }
        const actualSamples = requestedSamples > 0
            ? Number(enumToConstant.get(WebGL2RenderingContext.MAX_SAMPLES)) || 4
            : 1;
        renderbuffer.renderbufferInternalFormat = internalFormat;
        renderbuffer.renderbufferSamples = requestedSamples > 0 ? actualSamples : 0;
        renderbuffer.renderbufferStorage(format, width, height, actualSamples);
        return true;
    }

    renderbufferStorage(target: GLenum, internalFormat: GLenum, width: GLsizei, height: GLsizei) {
        if (target !== WebGL2RenderingContext.RENDERBUFFER) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        const maxSize = Number(enumToConstant.get(WebGL2RenderingContext.MAX_RENDERBUFFER_SIZE)) || 4096;
        if (width < 0 || height < 0 || width > maxSize || height > maxSize) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const renderbuffer = this.hydGlobalState.commonState.renderbufferBinding;
        if (!renderbuffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this._der_flush();
        if (!this.allocateRenderbufferStorage(renderbuffer, internalFormat, width, height, 0)) return;
        this.hydGlobalState.recordTransition("renderbufferStorage", target, internalFormat, width, height);
    }

    renderbufferStorageMultisample(
        target: GLenum,
        samples: GLsizei,
        internalFormat: GLenum,
        width: GLsizei,
        height: GLsizei,
    ) {
        if (this.hydContextType !== "webgl2" || target !== WebGL2RenderingContext.RENDERBUFFER) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        const maxSamples = Number(enumToConstant.get(WebGL2RenderingContext.MAX_SAMPLES)) || 4;
        const maxSize = Number(enumToConstant.get(WebGL2RenderingContext.MAX_RENDERBUFFER_SIZE)) || 4096;
        if (samples < 0 || width < 0 || height < 0 || width > maxSize || height > maxSize) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const renderbuffer = this.hydGlobalState.commonState.renderbufferBinding;
        if (!renderbuffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (internalFormat === WebGL2RenderingContext.DEPTH_STENCIL && samples > 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (samples > maxSamples) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this._der_flush();
        if (!this.allocateRenderbufferStorage(renderbuffer, internalFormat, width, height, samples)) return;
        this.hydGlobalState.recordTransition(
            "renderbufferStorageMultisample",
            target,
            samples,
            internalFormat,
            width,
            height,
        );
    }

    enableVertexAttribArray(index: number) {
        index = Number(index) >>> 0;
        const attribute = this.hydGlobalState.commonState.vertexArrayBinding.attributes[index];
        if (!attribute) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (!attribute.enabled) {
            attribute.enabled = true;
            attribute.updateHash();
            this.hydGlobalState.invalidateCurrentVertexAttribHash();
            this.hydGlobalState.recordTransition("enableVertexAttribArray", index);
        }
    }

    disableVertexAttribArray(index: number) {
        index = Number(index) >>> 0;
        const attribute = this.hydGlobalState.commonState.vertexArrayBinding.attributes[index];
        if (!attribute) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (attribute.enabled) {
            attribute.enabled = false;
            attribute.updateHash();
            this.hydGlobalState.invalidateCurrentVertexAttribHash();
            this.hydGlobalState.recordTransition("disableVertexAttribArray", index);
        }
    }

    private setCurrentVertexAttrib(
        index: number,
        x: number,
        y: number,
        z: number,
        w: number,
        valueType: "float" | "int" | "uint" = "float",
    ) {
        index = Number(index) >>> 0;
        const values = this.hydGlobalState.currentVertexAttribValues[index];
        if (!values) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (values[0] === x && values[1] === y && values[2] === z && values[3] === w &&
            this.hydGlobalState.currentVertexAttribValueTypes[index] === valueType) return;
        this._der_flush();
        values[0] = x;
        values[1] = y;
        values[2] = z;
        values[3] = w;
        this.hydGlobalState.currentVertexAttribValueTypes[index] = valueType;
        this.hydGlobalState.updateCurrentVertexAttribBuffer(index);
        this.hydGlobalState.invalidateCurrentVertexAttribHash();
        this.hydGlobalState.recordTransition("vertexAttrib", index, valueType, x, y, z, w);
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
        if (!values || values.length < 1) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        this.vertexAttrib1f(index, values[0]);
    }

    vertexAttrib2fv(index: number, values: ArrayLike<number>) {
        if (!values || values.length < 2) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        this.vertexAttrib2f(index, values[0], values[1]);
    }

    vertexAttrib3fv(index: number, values: ArrayLike<number>) {
        if (!values || values.length < 3) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        this.vertexAttrib3f(index, values[0], values[1], values[2]);
    }

    vertexAttrib4fv(index: number, values: ArrayLike<number>) {
        if (!values || values.length < 4) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        this.vertexAttrib4f(index, values[0], values[1], values[2], values[3]);
    }

    vertexAttribI4i(index: GLuint, x: GLint, y: GLint, z: GLint, w: GLint) {
        this.setCurrentVertexAttrib(index, x | 0, y | 0, z | 0, w | 0, "int");
    }

    vertexAttribI4ui(index: GLuint, x: GLuint, y: GLuint, z: GLuint, w: GLuint) {
        this.setCurrentVertexAttrib(index, x >>> 0, y >>> 0, z >>> 0, w >>> 0, "uint");
    }

    vertexAttribI4iv(index: GLuint, values: Int32List) {
        if (!values || values.length < 4) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        this.vertexAttribI4i(index, values[0], values[1], values[2], values[3]);
    }

    vertexAttribI4uiv(index: GLuint, values: Uint32List) {
        if (!values || values.length < 4) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        this.vertexAttribI4ui(index, values[0], values[1], values[2], values[3]);
    }

    clearColor(r: number, g: number, b: number, a: number) {
        r = clampWebGlUnitFloat(r);
        g = clampWebGlUnitFloat(g);
        b = clampWebGlUnitFloat(b);
        a = clampWebGlUnitFloat(a);
        const [r1, g1, b1, a1] = this.hydGlobalState.clearState.color;
        if (r !== r1 || g !== g1 || b !== b1 || a !== a1) {
            if (this.hydGlobalState.clearState.target !== 0) this._der_flush();
            this.hydGlobalState.clearState.color = [r, g, b, a];
            this.hydGlobalState.recordTransition("clearColor", r, g, b, a);
        }
    }

    clearDepth(depth: number) {
        depth = clampWebGlUnitFloat(depth);
        if (this.hydGlobalState.clearState.depth !== depth) {
            if (this.hydGlobalState.clearState.target !== 0) this._der_flush();
            this.hydGlobalState.clearState.depth = depth;
            this.hydGlobalState.recordTransition("clearDepth", depth);
        }
    }

    clearStencil(stencil: number) {
        if (this.hydGlobalState.clearState.stencil !== stencil) {
            if (this.hydGlobalState.clearState.target !== 0) this._der_flush();
            this.hydGlobalState.clearState.stencil = stencil;
            this.hydGlobalState.recordTransition("clearStencil", stencil);
        }
    }

    clear(mask: GLbitfield) {
        const validMask = WebGL2RenderingContext.COLOR_BUFFER_BIT |
            WebGL2RenderingContext.DEPTH_BUFFER_BIT |
            WebGL2RenderingContext.STENCIL_BUFFER_BIT;
        if ((mask & ~validMask) !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (this.framebufferStatus(this.hydGlobalState.commonState.drawFramebufferBinding) !== WebGL2RenderingContext.FRAMEBUFFER_COMPLETE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_FRAMEBUFFER_OPERATION);
            return;
        }
        const drawFramebuffer = this.hydGlobalState.commonState.drawFramebufferBinding;
        if ((mask & WebGL2RenderingContext.COLOR_BUFFER_BIT) &&
            drawFramebuffer !== this.hydGlobalState.defaultFramebuffer &&
            drawFramebuffer.drawBuffers.some((drawBuffer) => {
                if (drawBuffer === WebGL2RenderingContext.NONE) return false;
                const attachment = drawFramebuffer.attachments.get(drawBuffer);
                return !!attachment && (attachment.format.endsWith("sint") || attachment.format.endsWith("uint"));
            })) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (this.hydGlobalState.miscState.rasterizerDiscard) return;
        ensureAutoFrame();
        if (this.canvasSizeDirty) {
            this.updateCanvasSize();
        }
        this.ensureDefaultFramebufferRenderTarget();
        if (this.hydGlobalState.commonState.drawFramebufferBinding === this.hydGlobalState.defaultFramebuffer &&
            this.defaultFramebufferNeedsImplicitClear) {
            this.materializeImplicitDefaultFramebufferClear();
            this._der_flush();
        }
        let effectiveMask = mask;
        const hasDepthBuffer = drawFramebuffer === this.hydGlobalState.defaultFramebuffer
            ? this.hydGlobalState.contextAttributes.depth !== false
            : Boolean(this.framebufferAttachment(drawFramebuffer, WebGL2RenderingContext.DEPTH_ATTACHMENT)?.depthBits);
        const hasStencilBuffer = drawFramebuffer === this.hydGlobalState.defaultFramebuffer
            ? this.hydGlobalState.contextAttributes.stencil === true
            : Boolean(this.framebufferAttachment(drawFramebuffer, WebGL2RenderingContext.STENCIL_ATTACHMENT)?.stencilBits);
        if (!hasDepthBuffer) effectiveMask &= ~WebGL2RenderingContext.DEPTH_BUFFER_BIT;
        if (!hasStencilBuffer) effectiveMask &= ~WebGL2RenderingContext.STENCIL_BUFFER_BIT;
        let needsMaskedColorClear = false;
        if (mask & WebGL2RenderingContext.COLOR_BUFFER_BIT) {
            const writeMask = this.getColorWriteMask();
            const fullWriteMask = GPUColorWrite.RED | GPUColorWrite.GREEN | GPUColorWrite.BLUE | GPUColorWrite.ALPHA;
            if (writeMask === 0) {
                effectiveMask &= ~WebGL2RenderingContext.COLOR_BUFFER_BIT;
            } else if (writeMask !== fullWriteMask || this.hydGlobalState.miscState.scissorTest ||
                (this.hydGlobalState.commonState.drawFramebufferBinding === this.hydGlobalState.defaultFramebuffer &&
                    this.drawingBufferFormat === WebGL2RenderingContext.SRGB8_ALPHA8)) {
                effectiveMask &= ~WebGL2RenderingContext.COLOR_BUFFER_BIT;
                needsMaskedColorClear = true;
            }
        }
        if ((mask & WebGL2RenderingContext.DEPTH_BUFFER_BIT) && !this.hydGlobalState.depthState.writeMask) {
            effectiveMask &= ~WebGL2RenderingContext.DEPTH_BUFFER_BIT;
        }
        const stencilWriteMask = this.hydGlobalState.stencilState.frontWriteMask & 0xff;
        if ((effectiveMask & WebGL2RenderingContext.STENCIL_BUFFER_BIT) && stencilWriteMask === 0) {
            effectiveMask &= ~WebGL2RenderingContext.STENCIL_BUFFER_BIT;
        }
        const depthStencilBits = WebGL2RenderingContext.DEPTH_BUFFER_BIT |
            WebGL2RenderingContext.STENCIL_BUFFER_BIT;
        const needsMaskedDepthStencilClear = this.hydGlobalState.miscState.scissorTest ||
            (Boolean(effectiveMask & WebGL2RenderingContext.STENCIL_BUFFER_BIT) && stencilWriteMask !== 0xff);
        const maskedDepthStencilClear = needsMaskedDepthStencilClear
            ? effectiveMask & depthStencilBits
            : 0;
        this.markDrawFramebufferAttachmentsAsRenderTargets(
            effectiveMask | (needsMaskedColorClear ? WebGL2RenderingContext.COLOR_BUFFER_BIT : 0),
        );
        if (!this.hydGlobalState.miscState.scissorTest &&
            drawFramebuffer !== this.hydGlobalState.defaultFramebuffer) {
            if (effectiveMask & WebGL2RenderingContext.DEPTH_BUFFER_BIT) {
                const attachment = this.framebufferAttachment(
                    drawFramebuffer, WebGL2RenderingContext.DEPTH_ATTACHMENT);
                if (attachment) attachment.attachment.uniformDepthValue = this.hydGlobalState.clearState.depth;
            }
            if (effectiveMask & WebGL2RenderingContext.STENCIL_BUFFER_BIT) {
                const attachment = this.framebufferAttachment(
                    drawFramebuffer, WebGL2RenderingContext.STENCIL_ATTACHMENT);
                if (attachment) attachment.attachment.uniformStencilValue = this.hydGlobalState.clearState.stencil & 0xff;
            }
        }
        effectiveMask &= ~maskedDepthStencilClear;
        if ((effectiveMask & WebGL2RenderingContext.COLOR_BUFFER_BIT || needsMaskedColorClear) &&
            this.hydGlobalState.commonState.drawFramebufferBinding === this.hydGlobalState.defaultFramebuffer &&
            this.hydGlobalState.__canvasTexture === this.defaultFramebufferBackingTexture) {
            this.defaultFramebufferBackingNeedsPresentation = true;
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
        if (maskedDepthStencilClear) {
            this.clearDepthStencilWithMask(maskedDepthStencilClear);
        }
        if (effectiveMask === 0) {
            this.hydGlobalState.recordTransition("clearMaterialized", mask, 0);
            return;
        }
        const previousTarget = this.hydGlobalState.clearState.target;
        this.hydGlobalState.clearState.target = effectiveMask;
        this.hydRpCache.RpClear(this[RENDER_PASS_DESCRIPTOR_CALLBACK]);
        this.hydGlobalState.clearState.target = previousTarget;
        // A materialized clear returns to the previous draw state. It must not
        // share a transition with the deferred loadOp clear, which keeps the
        // clear mask in state until the next draw.
        this.hydGlobalState.recordTransition("clearMaterialized", effectiveMask, previousTarget);
    }

    clearBufferfv(buffer: GLenum, drawbuffer: GLint, values: ArrayLike<number>, srcOffset: GLuint = 0) {
        const length = this.uniformArrayLength(values);
        if (!Number.isInteger(srcOffset) || srcOffset < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (buffer === WebGL2RenderingContext.COLOR) {
            if (srcOffset + 4 > length) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                return;
            }
            this.clearFloatColorBuffer(drawbuffer, [
                Number(values[srcOffset]),
                Number(values[srcOffset + 1]),
                Number(values[srcOffset + 2]),
                Number(values[srcOffset + 3]),
            ]);
            return;
        }
        if (buffer === WebGL2RenderingContext.DEPTH) {
            if (drawbuffer !== 0 || srcOffset >= length) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                return;
            }
            const savedDepth = this.hydGlobalState.clearState.depth;
            const savedWriteMask = this.hydGlobalState.depthState.writeMask;
            this.hydGlobalState.clearState.depth = clampWebGlUnitFloat(Number(values[srcOffset]));
            this.hydGlobalState.depthState.writeMask = true;
            this.clear(WebGL2RenderingContext.DEPTH_BUFFER_BIT);
            this._der_flush();
            this.hydGlobalState.clearState.depth = savedDepth;
            this.hydGlobalState.depthState.writeMask = savedWriteMask;
            return;
        }
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
    }

    clearBufferiv(buffer: GLenum, drawbuffer: GLint, values: ArrayLike<number>, srcOffset: GLuint = 0) {
        const length = this.uniformArrayLength(values);
        if (!Number.isInteger(srcOffset) || srcOffset < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (buffer === WebGL2RenderingContext.STENCIL) {
            if (drawbuffer !== 0 || srcOffset >= length) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                return;
            }
            const savedStencil = this.hydGlobalState.clearState.stencil;
            const savedFrontMask = this.hydGlobalState.stencilState.frontWriteMask;
            const savedBackMask = this.hydGlobalState.stencilState.backWriteMask;
            this.hydGlobalState.clearState.stencil = Number(values[srcOffset]) | 0;
            this.hydGlobalState.stencilState.frontWriteMask = 0xffffffff;
            this.hydGlobalState.stencilState.backWriteMask = 0xffffffff;
            this.clear(WebGL2RenderingContext.STENCIL_BUFFER_BIT);
            this._der_flush();
            this.hydGlobalState.clearState.stencil = savedStencil;
            this.hydGlobalState.stencilState.frontWriteMask = savedFrontMask;
            this.hydGlobalState.stencilState.backWriteMask = savedBackMask;
            return;
        }
        if (buffer === WebGL2RenderingContext.COLOR) {
            if (srcOffset + 4 > length) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                return;
            }
            this.clearIntegerColorBuffer(drawbuffer, [
                Number(values[srcOffset]) | 0,
                Number(values[srcOffset + 1]) | 0,
                Number(values[srcOffset + 2]) | 0,
                Number(values[srcOffset + 3]) | 0,
            ], true);
            return;
        }
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
    }

    clearBufferuiv(buffer: GLenum, drawbuffer: GLint, values: ArrayLike<number>, srcOffset: GLuint = 0) {
        const length = this.uniformArrayLength(values);
        if (!Number.isInteger(srcOffset) || srcOffset < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (buffer === WebGL2RenderingContext.COLOR) {
            if (srcOffset + 4 > length) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                return;
            }
            this.clearIntegerColorBuffer(drawbuffer, [
                Number(values[srcOffset]) >>> 0,
                Number(values[srcOffset + 1]) >>> 0,
                Number(values[srcOffset + 2]) >>> 0,
                Number(values[srcOffset + 3]) >>> 0,
            ], false);
            return;
        }
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
    }

    clearBufferfi(buffer: GLenum, drawbuffer: GLint, depth: GLfloat, stencil: GLint) {
        if (buffer !== WebGL2RenderingContext.DEPTH_STENCIL) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (drawbuffer !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const clearState = this.hydGlobalState.clearState;
        const savedDepth = clearState.depth;
        const savedStencil = clearState.stencil;
        const savedDepthMask = this.hydGlobalState.depthState.writeMask;
        const savedFrontMask = this.hydGlobalState.stencilState.frontWriteMask;
        const savedBackMask = this.hydGlobalState.stencilState.backWriteMask;
        clearState.depth = clampWebGlUnitFloat(depth);
        clearState.stencil = stencil | 0;
        this.hydGlobalState.depthState.writeMask = true;
        this.hydGlobalState.stencilState.frontWriteMask = 0xffffffff;
        this.hydGlobalState.stencilState.backWriteMask = 0xffffffff;
        this.clear(WebGL2RenderingContext.DEPTH_BUFFER_BIT | WebGL2RenderingContext.STENCIL_BUFFER_BIT);
        this._der_flush();
        clearState.depth = savedDepth;
        clearState.stencil = savedStencil;
        this.hydGlobalState.depthState.writeMask = savedDepthMask;
        this.hydGlobalState.stencilState.frontWriteMask = savedFrontMask;
        this.hydGlobalState.stencilState.backWriteMask = savedBackMask;
    }

    private clearFloatColorBuffer(drawbuffer: GLint, color: [number, number, number, number]) {
        const maxDrawBuffers = Number(enumToConstant.get(WebGL2RenderingContext.MAX_DRAW_BUFFERS)) || 1;
        if (!Number.isInteger(drawbuffer) || drawbuffer < 0 || drawbuffer >= maxDrawBuffers) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (this.framebufferStatus(this.hydGlobalState.commonState.drawFramebufferBinding) !== WebGL2RenderingContext.FRAMEBUFFER_COMPLETE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_FRAMEBUFFER_OPERATION);
            return;
        }
        ensureAutoFrame();
        if (this.canvasSizeDirty) this.updateCanvasSize();
        const framebuffer = this.hydGlobalState.commonState.drawFramebufferBinding;
        let target: {
            view: GPUTextureView,
            depthSlice?: number,
            format: GPUTextureFormat,
            writeMask: GPUColorWriteFlags,
            sampleCount: number,
        } | null = null;
        if (framebuffer === this.hydGlobalState.defaultFramebuffer) {
            if (drawbuffer !== 0 || framebuffer.drawBuffers[0] === WebGL2RenderingContext.NONE) return;
            this.ensureDefaultFramebufferRenderTarget();
            target = {
                view: this.hydGlobalState.__canvasView,
                format: "bgra8unorm",
                writeMask: GPUColorWrite.ALL,
                sampleCount: 1,
            };
            if (this.drawingBufferFormat === WebGL2RenderingContext.SRGB8_ALPHA8) {
                color = [linearToSrgb(color[0]), linearToSrgb(color[1]), linearToSrgb(color[2]), color[3]];
            }
            if (this.hydGlobalState.contextAttributes.alpha === false) color[3] = 1;
        } else {
            const drawBuffer = framebuffer.drawBuffers[drawbuffer] ?? WebGL2RenderingContext.NONE;
            if (drawBuffer === WebGL2RenderingContext.NONE) return;
            const attachment = framebuffer.attachments.get(drawBuffer);
            if (!attachment) return;
            if (/uint|sint/.test(attachment.format)) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            target = {
                view: attachment.view,
                depthSlice: attachment.depthSlice,
                format: attachment.format,
                writeMask: GPUColorWrite.ALL,
                sampleCount: attachment.sampleCount,
            };
            attachment.attachment.markFramebufferRenderTarget();
        }
        if (this.hydGlobalState.miscState.rasterizerDiscard) return;
        this._der_flush();
        if (!this.maskedClearUniformBuffer) {
            this.maskedClearUniformBuffer = this.hydDevice.createBuffer({
                label: "masked-clear-uniforms",
                size: 16,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
            });
        }
        this.hydDevice.queue.writeBuffer(this.maskedClearUniformBuffer, 0, new Float32Array(color));
        const pipeline = this.getMaskedClearPipeline([target]);
        const bindGroup = this.hydDevice.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: this.maskedClearUniformBuffer } }],
        });
        const encoder = this.hydDevice.createCommandEncoder({ label: "clearBufferfv" });
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: target.view,
                depthSlice: target.depthSlice,
                loadOp: "load",
                storeOp: "store",
            }],
        });
        if (this.hydGlobalState.miscState.scissorTest) pass.setScissorRect(...this.toGpuScissorRect());
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();
        this.hydDevice.queue.submit([encoder.finish()]);
        this.markFramebufferContentChanged();
        if (framebuffer === this.hydGlobalState.defaultFramebuffer &&
            this.hydGlobalState.__canvasTexture === this.defaultFramebufferBackingTexture) {
            this.defaultFramebufferBackingNeedsPresentation = true;
        }
        this.hydGlobalState.recordTransition("clearBufferfv", drawbuffer, ...color);
    }

    private getIntegerClearPipeline(
        format: GPUTextureFormat,
        signed: boolean,
        sampleCount: number,
    ): GPURenderPipeline {
        const key = `${format}:${signed ? "sint" : "uint"}:samples=${sampleCount}`;
        let pipeline = this.integerClearPipelines.get(key);
        if (pipeline) return pipeline;
        const scalar = signed ? "i32" : "u32";
        const module = this.hydDevice.createShaderModule({
            label: `${key} clearBuffer shader`,
            code: `
struct ClearValue { value: vec4<${scalar}> }
@group(0) @binding(0) var<uniform> clearValue : ClearValue;

@vertex
fn vertexMain(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  let positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  return vec4f(positions[index], 0.0, 1.0);
}

@fragment
fn fragmentMain() -> @location(0) vec4<${scalar}> {
  return clearValue.value;
}
`,
        });
        pipeline = this.hydDevice.createRenderPipeline({
            label: `${key} clearBuffer pipeline`,
            layout: "auto",
            vertex: { module, entryPoint: "vertexMain" },
            fragment: { module, entryPoint: "fragmentMain", targets: [{ format }] },
            primitive: { topology: "triangle-list" },
            multisample: { count: sampleCount },
        });
        this.integerClearPipelines.set(key, pipeline);
        return pipeline;
    }

    private clearIntegerColorBuffer(
        drawbuffer: GLint,
        color: [number, number, number, number],
        signed: boolean,
    ) {
        const maxDrawBuffers = Number(enumToConstant.get(WebGL2RenderingContext.MAX_DRAW_BUFFERS)) || 1;
        if (!Number.isInteger(drawbuffer) || drawbuffer < 0 || drawbuffer >= maxDrawBuffers) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const framebuffer = this.hydGlobalState.commonState.drawFramebufferBinding;
        if (this.framebufferStatus(framebuffer) !== WebGL2RenderingContext.FRAMEBUFFER_COMPLETE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_FRAMEBUFFER_OPERATION);
            return;
        }
        if (framebuffer === this.hydGlobalState.defaultFramebuffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const drawBuffer = framebuffer.drawBuffers[drawbuffer] ?? WebGL2RenderingContext.NONE;
        if (drawBuffer === WebGL2RenderingContext.NONE) return;
        const attachment = framebuffer.attachments.get(drawBuffer);
        if (!attachment) return;
        if (signed ? !attachment.format.endsWith("sint") : !attachment.format.endsWith("uint")) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (this.hydGlobalState.miscState.rasterizerDiscard) return;
        this._der_flush();
        attachment.attachment.markFramebufferRenderTarget();
        if (!this.integerClearUniformBuffer) {
            this.integerClearUniformBuffer = this.hydDevice.createBuffer({
                label: "integer clearBuffer uniforms",
                size: 16,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
            });
        }
        const upload = signed ? new Int32Array(color) : new Uint32Array(color);
        this.hydDevice.queue.writeBuffer(this.integerClearUniformBuffer, 0, upload);
        const pipeline = this.getIntegerClearPipeline(attachment.format, signed, attachment.sampleCount);
        const bindGroup = this.hydDevice.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: this.integerClearUniformBuffer } }],
        });
        const encoder = this.hydDevice.createCommandEncoder({ label: "integer clearBuffer" });
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: attachment.view,
                depthSlice: attachment.depthSlice,
                loadOp: "load",
                storeOp: "store",
            }],
        });
        if (this.hydGlobalState.miscState.scissorTest) pass.setScissorRect(...this.toGpuScissorRect());
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();
        this.hydDevice.queue.submit([encoder.finish()]);
        this.markFramebufferContentChanged();
        this.hydGlobalState.recordTransition(
            signed ? "clearBufferiv" : "clearBufferuiv", drawbuffer, ...color);
    }

    depthFunc(func: GLenum) {
        const tmp = enumToCompareFunction.get(func);
        if (!tmp) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (this.hydGlobalState.depthState.func !== tmp) {
            this.hydGlobalState.depthState.func = tmp;
            this.hydGlobalState.depthState.funcEnum = func;
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
        if (!tmp) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (this.hydGlobalState.polygonState.frontFace !== tmp) {
            this.hydGlobalState.polygonState.frontFace = tmp;
            this.hydGlobalState.polygonState.frontFaceEnum = mode;
            this.hydGlobalState.recordTransition("frontFace", mode);
        }
    }

    cullFace(mode: GLenum) {
        let tmp = enumToCullFace.get(mode);
        if (!tmp) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (this.hydGlobalState.polygonState.cullFaceMode !== tmp) {
            this.hydGlobalState.polygonState.cullFaceMode = tmp;
            this.hydGlobalState.polygonState.cullFaceModeEnum = mode;
            this.hydGlobalState.recordTransition("cullFace", mode);
        }
    }

    private isValidBufferTarget(target: GLenum): boolean {
        if (target === WebGL2RenderingContext.ARRAY_BUFFER ||
            target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER) {
            return true;
        }
        return this.hydContextType === "webgl2" && (
            target === WebGL2RenderingContext.COPY_READ_BUFFER ||
            target === WebGL2RenderingContext.COPY_WRITE_BUFFER ||
            target === WebGL2RenderingContext.PIXEL_PACK_BUFFER ||
            target === WebGL2RenderingContext.PIXEL_UNPACK_BUFFER ||
            target === WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER ||
            target === WebGL2RenderingContext.UNIFORM_BUFFER
        );
    }

    private bufferBindingKindForTarget(target: GLenum): "element-array" | "other" | null {
        if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER) {
            return "element-array";
        }
        if (target === WebGL2RenderingContext.ARRAY_BUFFER ||
            target === WebGL2RenderingContext.PIXEL_PACK_BUFFER ||
            target === WebGL2RenderingContext.PIXEL_UNPACK_BUFFER ||
            target === WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER ||
            target === WebGL2RenderingContext.UNIFORM_BUFFER) {
            return "other";
        }
        // COPY_* targets deliberately preserve the buffer's first-binding type.
        return null;
    }

    private getBoundBufferForTarget(target: GLenum): HydBuffer | null {
        if (!this.isValidBufferTarget(target)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        switch (target) {
            case WebGL2RenderingContext.ARRAY_BUFFER:
                return this.hydGlobalState.commonState.arrayBufferBinding;
            case WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER:
                return this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
            case WebGL2RenderingContext.COPY_READ_BUFFER:
                return this.hydGlobalState.commonState.copyReadBufferBinding;
            case WebGL2RenderingContext.COPY_WRITE_BUFFER:
                return this.hydGlobalState.commonState.copyWriteBufferBinding;
            case WebGL2RenderingContext.PIXEL_PACK_BUFFER:
                return this.hydGlobalState.commonState.pixelPackBufferBinding;
            case WebGL2RenderingContext.PIXEL_UNPACK_BUFFER:
                return this.hydGlobalState.commonState.pixelUnpackBufferBinding;
            case WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER:
                return this.hydGlobalState.commonState.transformFeedbackBufferBinding;
            case WebGL2RenderingContext.UNIFORM_BUFFER:
                return this.hydGlobalState.commonState.uniformBufferBinding;
        }
        return null;
    }

    private setBoundBufferForTarget(target: GLenum, buffer: HydBuffer | null) {
        switch (target) {
            case WebGL2RenderingContext.ARRAY_BUFFER:
                this.hydGlobalState.commonState.arrayBufferBinding = buffer;
                break;
            case WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER:
                this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding = buffer;
                this.hydGlobalState.recordTransition("bindBuffer", target, buffer ? buffer.hash : "null");
                break;
            case WebGL2RenderingContext.COPY_READ_BUFFER:
                this.hydGlobalState.commonState.copyReadBufferBinding = buffer;
                break;
            case WebGL2RenderingContext.COPY_WRITE_BUFFER:
                this.hydGlobalState.commonState.copyWriteBufferBinding = buffer;
                break;
            case WebGL2RenderingContext.PIXEL_PACK_BUFFER:
                this.hydGlobalState.commonState.pixelPackBufferBinding = buffer;
                break;
            case WebGL2RenderingContext.PIXEL_UNPACK_BUFFER:
                this.hydGlobalState.commonState.pixelUnpackBufferBinding = buffer;
                break;
            case WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER:
                this.hydGlobalState.commonState.transformFeedbackBufferBinding = buffer;
                break;
            case WebGL2RenderingContext.UNIFORM_BUFFER:
                this.hydGlobalState.commonState.uniformBufferBinding = buffer;
                break;
        }
        if (target === WebGL2RenderingContext.COPY_READ_BUFFER ||
            target === WebGL2RenderingContext.COPY_WRITE_BUFFER ||
            target === WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER ||
            target === WebGL2RenderingContext.UNIFORM_BUFFER) {
            this.invalidateDrawSemanticValidation();
        }
    }

    bindBuffer(target: GLenum, buffer: HydBuffer | object | null) {
        if (buffer instanceof HydBuffer && buffer.ownerToken === this.contextToken && !buffer.deleted) {
            if (target === WebGL2RenderingContext.ARRAY_BUFFER && buffer.bindingKind === "other") {
                this.hydGlobalState.commonState.arrayBufferBinding = buffer;
                return;
            }
            if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER && buffer.bindingKind === "element-array") {
                if (this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding !== buffer) {
                    this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding = buffer;
                    this.hydGlobalState.recordTransition("bindBuffer", target, buffer.hash);
                }
                return;
            }
        }
        if (target === WebGL2RenderingContext.ARRAY_BUFFER &&
            buffer === this.hydGlobalState.commonState.arrayBufferBinding) return;
        if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER &&
            buffer === this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding) return;
        if (!this.isValidBufferTarget(target)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        let hydBuffer: HydBuffer | null;
        if (buffer instanceof HydBuffer) {
            if (buffer.ownerToken !== this.contextToken || buffer.deleted) {
                this.setObjectValidationError(buffer);
                return;
            }
            hydBuffer = buffer;
        } else {
            hydBuffer = this.normalizeBuffer(buffer);
        }
        if (this.getBoundBufferForTarget(target) === hydBuffer) return;
        const bindingKind = this.bufferBindingKindForTarget(target);
        const copyTarget = target === WebGL2RenderingContext.COPY_READ_BUFFER ||
            target === WebGL2RenderingContext.COPY_WRITE_BUFFER;
        if (hydBuffer && bindingKind && hydBuffer.bindingKind && hydBuffer.bindingKind !== bindingKind) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (hydBuffer) {
            if (bindingKind && !hydBuffer.bindingKind) hydBuffer.bindingKind = bindingKind;
            if (copyTarget && !hydBuffer.bindingKind) hydBuffer.bindingKind = "other";
            hydBuffer.initialized = true;
        }
        this.setBoundBufferForTarget(target, hydBuffer);
    }

    private bufferIsBoundForActiveTransformFeedback(buffer: HydBuffer | null): boolean {
        return !!buffer && Array.from(this.transformFeedbackObjects).some((feedback) =>
            feedback.active && feedback.bufferBindings.some((binding) => binding?.buffer === buffer));
    }

    private bufferIsReferencedByCurrentOrActiveTransformFeedback(buffer: HydBuffer | null): boolean {
        if (!buffer) return false;
        if (this.transformFeedbackBinding.bufferBindings.some((binding) => binding?.buffer === buffer)) return true;
        return this.bufferIsBoundForActiveTransformFeedback(buffer);
    }

    private bufferHasNonTransformFeedbackBinding(buffer: HydBuffer): boolean {
        const common = this.hydGlobalState.commonState;
        if (common.arrayBufferBinding === buffer ||
            common.copyReadBufferBinding === buffer || common.copyWriteBufferBinding === buffer ||
            common.pixelPackBufferBinding === buffer || common.pixelUnpackBufferBinding === buffer ||
            common.uniformBufferBinding === buffer || common.vertexArrayBinding.elementArrayBufferBinding === buffer ||
            common.vertexArrayBinding.attributes.some((attribute) => attribute.buffer === buffer) ||
            this.uniformBufferBindings.some((binding) => binding?.buffer === buffer)) return true;
        return false;
    }

    private bufferOperationConflictsWithTransformFeedback(buffer: HydBuffer, target: GLenum): boolean {
        if (!this.bufferIsReferencedByCurrentOrActiveTransformFeedback(buffer)) return false;
        if (this.bufferIsBoundForActiveTransformFeedback(buffer)) return true;
        return target !== WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER ||
            this.bufferHasNonTransformFeedbackBinding(buffer);
    }

    private invalidateDerivedVertexState(invalidated: boolean) {
        if (!invalidated) return;
        this.hydGlobalState.invalidateDerivedVertexState();
        this.lastDrawPbv = null;
        this.lastArrayDraw = null;
        this.lastIndexedDraw = null;
    }

    private bufferSourceSubrange(data: ArrayBufferLike | ArrayBufferView, srcOffset: number = 0, length?: number): Uint8Array | null {
        const bytesPerElement = ArrayBuffer.isView(data) ? ((data as any).BYTES_PER_ELEMENT || 1) : 1;
        const byteLength = data.byteLength;
        const elementLength = ArrayBuffer.isView(data) && typeof (data as any).length === "number"
            ? (data as any).length
            : Math.floor(byteLength / bytesPerElement);
        const offset = toWebGlInt64(srcOffset);
        const requestedLength = length === undefined || Number(length) === 0
            ? elementLength - offset
            : toWebGlInt64(length);
        if (offset < 0 || requestedLength < 0 || offset > elementLength || offset + requestedLength > elementLength) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return null;
        }
        const sourceBuffer = ArrayBuffer.isView(data) ? data.buffer : data;
        const sourceByteOffset = (ArrayBuffer.isView(data) ? data.byteOffset : 0) + offset * bytesPerElement;
        return new Uint8Array(sourceBuffer, sourceByteOffset, requestedLength * bytesPerElement);
    }

    bufferData(target: GLenum, data: any, usage: GLenum, ...sourceRange: [GLuint?, GLuint?]) {
        const drawUsage = usage === WebGL2RenderingContext.STATIC_DRAW ||
            usage === WebGL2RenderingContext.DYNAMIC_DRAW ||
            usage === WebGL2RenderingContext.STREAM_DRAW;
        const webgl2Usage = usage === WebGL2RenderingContext.STATIC_READ ||
            usage === WebGL2RenderingContext.DYNAMIC_READ ||
            usage === WebGL2RenderingContext.STREAM_READ ||
            usage === WebGL2RenderingContext.STATIC_COPY ||
            usage === WebGL2RenderingContext.DYNAMIC_COPY ||
            usage === WebGL2RenderingContext.STREAM_COPY;
        if (!drawUsage && !(this.hydContextType === "webgl2" && webgl2Usage)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (!this.isValidBufferTarget(target)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        const buffer = this.getBoundBufferForTarget(target);
        if (!buffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (this.bufferOperationConflictsWithTransformFeedback(buffer, target)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        let source: ArrayBufferLike | ArrayBufferView | null = null;
        let size: number;
        if (data === null || data === undefined) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (isBufferSource(data)) {
            const range = this.hydContextType === "webgl2" && sourceRange.length > 0
                ? this.bufferSourceSubrange(data, sourceRange[0], sourceRange[1])
                : this.bufferSourceSubrange(data);
            if (!range) return;
            source = range;
            size = range.byteLength;
        } else {
            const converted = Number(data);
            size = Number.isFinite(converted) ? Math.trunc(converted) : 0;
        }
        if (size < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }

        this._der_flush();
        buffer.webglSize = size;
        buffer.descriptor.size = physicalWebGlBufferSize(size);
        const invalidatesConvertedVertices = buffer.hasConvertedVertexBuffers;
        buffer.write(source, 0);
        buffer.webglUsage = usage;
        this.hydGlobalState.invalidateUniformBufferBindingHash();
        this.hydGlobalState.recordTransition(
            "bufferData",
            target,
            buffer.hash,
            size,
            invalidatesConvertedVertices ? buffer.version : 0,
        );
        this.invalidateDerivedVertexState(invalidatesConvertedVertices);
    }

    bufferSubData(target: GLenum, dstOffset: GLintptr, data: any, ...sourceRange: [GLuint?, GLuint?]) {
        if (!this.isValidBufferTarget(target)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        const buffer = this.getBoundBufferForTarget(target);
        if (!buffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (this.bufferOperationConflictsWithTransformFeedback(buffer, target)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (!isBufferSource(data)) {
            throw new TypeError("bufferSubData requires an ArrayBuffer or ArrayBufferView");
        }
        const source = this.hydContextType === "webgl2" && sourceRange.length > 0
            ? this.bufferSourceSubrange(data, sourceRange[0], sourceRange[1])
            : this.bufferSourceSubrange(data);
        if (!source) return;
        const offset = toWebGlInt64(dstOffset);
        if (offset < 0 || offset + source.byteLength > buffer.webglSize) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (source.byteLength === 0) return;
        this._der_flush();
        const invalidatesConvertedVertices = buffer.hasConvertedVertexBuffers;
        buffer.write(source, offset);
        if (invalidatesConvertedVertices) {
            this.hydGlobalState.recordTransition("bufferSubDataConvertedVertex", buffer.hash, buffer.version);
        }
        this.invalidateDerivedVertexState(invalidatesConvertedVertices);
    }

    getBufferSubData(target: GLenum, srcByteOffset: GLintptr, dstData: ArrayBufferView, dstOffset: GLuint = 0, length?: GLuint) {
        if (this.hydContextType !== "webgl2") {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (!ArrayBuffer.isView(dstData)) {
            throw new TypeError("getBufferSubData destination must be an ArrayBufferView");
        }
        const buffer = this.getBoundBufferForTarget(target);
        if (!buffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (this.bufferOperationConflictsWithTransformFeedback(buffer, target)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const pendingPixelPackReadbacks = this.pendingPixelPackReadbacks.get(buffer);
        if (pendingPixelPackReadbacks) {
            for (const pending of pendingPixelPackReadbacks) {
                if (!pending.settled && !pending.fallbackUsed) {
                    pending.fallbackUsed = true;
                    pending.completeSynchronously();
                }
            }
        }
        const dst = new Uint8Array(dstData.buffer, dstData.byteOffset, dstData.byteLength);
        const bytesPerElement = (dstData as any).BYTES_PER_ELEMENT || 1;
        const destinationOffset = toWebGlInt64(dstOffset);
        const destinationElementLength = typeof (dstData as any).length === "number"
            ? (dstData as any).length
            : Math.floor(dst.byteLength / bytesPerElement);
        const copyElementLength = length === undefined || Number(length) === 0
            ? destinationElementLength - destinationOffset
            : toWebGlInt64(length);
        const sourceOffset = toWebGlInt64(srcByteOffset);
        const destinationByteOffset = destinationOffset * bytesPerElement;
        const copyByteLength = copyElementLength * bytesPerElement;
        if (sourceOffset < 0 || destinationOffset < 0 || copyElementLength < 0 ||
            destinationOffset > destinationElementLength ||
            destinationOffset + copyElementLength > destinationElementLength ||
            sourceOffset + copyByteLength > buffer.webglSize) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (copyByteLength === 0) return;
        dst.set(buffer.shadowData.subarray(sourceOffset, sourceOffset + copyByteLength), destinationByteOffset);
    }

    copyBufferSubData(readTarget: GLenum, writeTarget: GLenum, readOffset: GLintptr, writeOffset: GLintptr, size: GLsizeiptr) {
        if (this.hydContextType !== "webgl2" ||
            !this.isValidBufferTarget(readTarget) || !this.isValidBufferTarget(writeTarget)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        const source = this.getBoundBufferForTarget(readTarget);
        const destination = this.getBoundBufferForTarget(writeTarget);
        if (!source || !destination) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (this.bufferOperationConflictsWithTransformFeedback(source, readTarget) ||
            this.bufferOperationConflictsWithTransformFeedback(destination, writeTarget)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const sourceOffset = toWebGlInt64(readOffset);
        const destinationOffset = toWebGlInt64(writeOffset);
        const byteLength = toWebGlInt64(size);
        if (sourceOffset < 0 || destinationOffset < 0 || byteLength < 0 ||
            sourceOffset + byteLength > source.webglSize ||
            destinationOffset + byteLength > destination.webglSize) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (source.bindingKind && destination.bindingKind && source.bindingKind !== destination.bindingKind) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (source === destination && byteLength > 0 &&
            sourceOffset < destinationOffset + byteLength && destinationOffset < sourceOffset + byteLength) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (byteLength === 0) return;
        this._der_flush();
        const invalidatesConvertedVertices = destination.hasConvertedVertexBuffers;
        destination.write(source.shadowData.slice(sourceOffset, sourceOffset + byteLength), destinationOffset);
        this.hydGlobalState.recordTransition("copyBufferSubData", destination.hash, destination.version);
        this.invalidateDerivedVertexState(invalidatesConvertedVertices);
    }

    private indexedBindingsForTarget(target: GLenum): Array<HydIndexedBufferBinding | null> | null {
        if (target === WebGL2RenderingContext.UNIFORM_BUFFER) return this.uniformBufferBindings;
        if (target === WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER) return this.transformFeedbackBinding.bufferBindings;
        return null;
    }

    bindBufferBase(target: GLenum, index: GLuint, buffer: HydBuffer | null) {
        const bindings = this.indexedBindingsForTarget(target);
        index = Number(index) >>> 0;
        if (!bindings) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (index >= bindings.length) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (target === WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER && this.transformFeedbackBinding.active) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this.bindBuffer(target, buffer);
        if (this.getBoundBufferForTarget(target) !== buffer) return;
        bindings[index] = buffer ? { buffer, offset: 0, size: buffer.webglSize, wholeBuffer: true } : null;
        if (target === WebGL2RenderingContext.UNIFORM_BUFFER) {
            this.hydGlobalState.invalidateUniformBufferBindingHash();
        }
        if (target === WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER) {
            this.invalidateDrawSemanticValidation();
        }
        this.hydGlobalState.recordTransition("bindBufferBase", target, index, buffer?.hash || "null", buffer?.webglSize || 0);
    }

    bindBufferRange(target: GLenum, index: GLuint, buffer: HydBuffer | null, offset: GLintptr, size: GLsizeiptr) {
        const bindings = this.indexedBindingsForTarget(target);
        index = Number(index) >>> 0;
        offset = toWebGlInt64(offset);
        size = toWebGlInt64(size);
        if (!bindings) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (index >= bindings.length) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (target === WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER && this.transformFeedbackBinding.active) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (buffer && (offset < 0 || size <= 0)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const alignment = target === WebGL2RenderingContext.UNIFORM_BUFFER
            ? this.hydDevice.limits.minUniformBufferOffsetAlignment
            : 4;
        if (buffer && (offset % alignment !== 0 ||
            (target === WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER && size % 4 !== 0))) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        this.bindBuffer(target, buffer);
        if (this.getBoundBufferForTarget(target) !== buffer) return;
        bindings[index] = buffer ? { buffer, offset, size } : null;
        if (target === WebGL2RenderingContext.UNIFORM_BUFFER) {
            this.hydGlobalState.invalidateUniformBufferBindingHash();
        }
        if (target === WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER) {
            this.invalidateDrawSemanticValidation();
        }
        this.hydGlobalState.recordTransition("bindBufferRange", target, index, buffer?.hash || "null", offset, size);
    }

    getIndexedParameter(target: GLenum, index: GLuint) {
        index = Number(index) >>> 0;
        let bindings: Array<HydIndexedBufferBinding | null> | null = null;
        let field: "buffer" | "offset" | "size" = "buffer";
        if (target === WebGL2RenderingContext.UNIFORM_BUFFER_BINDING) bindings = this.uniformBufferBindings;
        else if (target === WebGL2RenderingContext.UNIFORM_BUFFER_START) {
            bindings = this.uniformBufferBindings;
            field = "offset";
        } else if (target === WebGL2RenderingContext.UNIFORM_BUFFER_SIZE) {
            bindings = this.uniformBufferBindings;
            field = "size";
        } else if (target === WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER_BINDING) bindings = this.transformFeedbackBinding.bufferBindings;
        else if (target === WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER_START) {
            bindings = this.transformFeedbackBinding.bufferBindings;
            field = "offset";
        } else if (target === WebGL2RenderingContext.TRANSFORM_FEEDBACK_BUFFER_SIZE) {
            bindings = this.transformFeedbackBinding.bufferBindings;
            field = "size";
        }
        if (!bindings) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        if (index >= bindings.length) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return null;
        }
        const binding = bindings[index];
        if (field === "buffer") return binding?.buffer || null;
        return binding && !binding.wholeBuffer ? binding[field] : 0;
    }

    getActiveUniform(program: HydProgram, index: GLuint): HydActiveUniformInfo {
        if (program === null || program === undefined) {
            throw new TypeError("getActiveUniform requires a WebGLProgram");
        }
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return null;
        }
        if (this.hydContextType === "webgl2" && program.uniformReflection.length > 0) {
            const uniform = program.uniformReflection[index];
            if (!uniform) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                return null;
            }
            return brandHydWebGlObject({
                name: uniform.name,
                size: uniform.size,
                type: uniform.type,
            }, "active-info");
        }
        const publicUniforms = program.hydUniforms.filter(isVisibleActiveUniform);
        const publicSamplers = program.hydSamplers.filter((sampler) => sampler.arrayIndex === undefined || sampler.arrayIndex === 0);
        if (index < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return null;
        }
        if (index < publicUniforms.length) {
            const uniform = publicUniforms[index];
            const baseName = uniform.sourceName || uniform.name;
            return brandHydWebGlObject({
                name: uniform.isArray ? `${baseName}[0]` : baseName,
                size: uniform.size,
                type: uniform.webgl_type,
            }, "active-info");
        } else if (index - publicUniforms.length < publicSamplers.length) {
            const sampler = publicSamplers[index - publicUniforms.length];
            return brandHydWebGlObject({
                name: sampler.arrayName ? `${sampler.arrayName}[0]` : (sampler.sourceName || sampler.name),
                size: sampler.size,
                type: sampler.webgl_type,
            }, "active-info");
        }
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
        return null;
    }

    getUniformIndices(program: HydProgram, uniformNames: string[]): GLuint[] {
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return null;
        }
        if (this.hydContextType === "webgl2" && program.uniformReflection.length > 0) {
            return uniformNames.map((name) => {
                const exact = program.uniformReflection.findIndex((uniform) => uniform.name === name);
                if (exact >= 0) return exact;
                const normalized = name.replace(/\[0\](?=\.|$)/g, "");
                const normalizedIndex = program.uniformReflection.findIndex((uniform) =>
                    (uniform.size > 1 || /\[0\](?=\.|$)/.test(uniform.name)) &&
                    uniform.name.replace(/\[0\](?=\.|$)/g, "") === normalized);
                return normalizedIndex >= 0 ? normalizedIndex : 0xffffffff;
            });
        }
        const publicUniforms = program.hydUniforms.filter(isVisibleActiveUniform);
        const publicSamplers = program.hydSamplers.filter((sampler) => sampler.arrayIndex === undefined || sampler.arrayIndex === 0);
        return uniformNames.map((name) => {
            const safeName = name.replace(/[^A-Za-z0-9_]/g, "_").replace(/_+$/g, "");
            const uniformIndex = publicUniforms.findIndex((uniform) =>
                uniform.name === name || uniform.name === safeName || uniform.sourceName === name);
            if (uniformIndex >= 0) {
                return uniformIndex;
            }
            const samplerIndex = publicSamplers.findIndex((sampler) =>
                sampler.name === name || sampler.name === safeName || sampler.sourceName === name || sampler.arrayName === name);
            if (samplerIndex >= 0) {
                return publicUniforms.length + samplerIndex;
            }
            return 0xffffffff;
        });
    }

    getActiveUniforms(program: HydProgram, uniformIndices: GLuint[], pname: GLenum): any[] {
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return null;
        }
        if (this.hydContextType !== "webgl2" || !program.linked) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        const validPnames = new Set<GLenum>([
            WebGL2RenderingContext.UNIFORM_TYPE,
            WebGL2RenderingContext.UNIFORM_SIZE,
            WebGL2RenderingContext.UNIFORM_BLOCK_INDEX,
            WebGL2RenderingContext.UNIFORM_OFFSET,
            WebGL2RenderingContext.UNIFORM_ARRAY_STRIDE,
            WebGL2RenderingContext.UNIFORM_MATRIX_STRIDE,
            WebGL2RenderingContext.UNIFORM_IS_ROW_MAJOR,
        ]);
        if (!validPnames.has(pname)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        const activeUniformCount = program.uniformReflection.length ||
            program.hydUniforms.filter(isVisibleActiveUniform).length +
            program.hydSamplers.filter((sampler) => sampler.arrayIndex === undefined || sampler.arrayIndex === 0).length;
        if (uniformIndices.some((index) => index >= activeUniformCount)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return null;
        }
        if (this.hydContextType === "webgl2" && program.uniformReflection.length > 0) {
            return uniformIndices.map((index) => {
                const entry = program.uniformReflection[index];
                if (!entry) return null;
                switch (pname) {
                    case WebGL2RenderingContext.UNIFORM_TYPE:
                        return entry.type;
                    case WebGL2RenderingContext.UNIFORM_SIZE:
                        return entry.size;
                    case WebGL2RenderingContext.UNIFORM_BLOCK_INDEX:
                        return entry.blockIndex;
                    case WebGL2RenderingContext.UNIFORM_OFFSET:
                        return entry.offset;
                    case WebGL2RenderingContext.UNIFORM_ARRAY_STRIDE:
                        return entry.arrayStride;
                    case WebGL2RenderingContext.UNIFORM_MATRIX_STRIDE:
                        return entry.matrixStride;
                    case WebGL2RenderingContext.UNIFORM_IS_ROW_MAJOR:
                        return entry.rowMajor;
                    default:
                        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                        return null;
                }
            });
        }
        const publicUniforms = program.hydUniforms.filter(isVisibleActiveUniform);
        const publicSamplers = program.hydSamplers.filter((sampler) => sampler.arrayIndex === undefined || sampler.arrayIndex === 0);
        const entries = [...publicUniforms, ...publicSamplers];
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

    getUniformBlockIndex(program: HydProgram, uniformBlockName: string): GLuint {
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return 0xffffffff;
        }
        if (this.hydContextType !== "webgl2") {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return 0xffffffff;
        }
        const exact = program.hydUniformBlocks.find((block) => block.name === uniformBlockName);
        if (exact) return exact.index;
        const normalized = uniformBlockName.replace(/\[0\]$/, "");
        const firstArrayElement = program.hydUniformBlocks.find((block) =>
            block.name.replace(/\[0\]$/, "") === normalized);
        return firstArrayElement?.index ?? 0xffffffff;
    }

    getActiveUniformBlockName(program: HydProgram, uniformBlockIndex: GLuint): string | null {
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return null;
        }
        if (!program.linked) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        const block = program.hydUniformBlocks[uniformBlockIndex];
        if (this.hydContextType !== "webgl2" || !block) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return null;
        }
        return block.name;
    }

    getActiveUniformBlockParameter(program: HydProgram, uniformBlockIndex: GLuint, pname: GLenum): any {
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return null;
        }
        const block = program.hydUniformBlocks[uniformBlockIndex];
        if (this.hydContextType !== "webgl2" || !block) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return null;
        }
        switch (pname) {
            case WebGL2RenderingContext.UNIFORM_BLOCK_BINDING:
                return block.binding;
            case WebGL2RenderingContext.UNIFORM_BLOCK_DATA_SIZE:
                return block.dataSize;
            case WebGL2RenderingContext.UNIFORM_BLOCK_ACTIVE_UNIFORMS:
                return block.activeUniformIndices.length;
            case WebGL2RenderingContext.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES:
                return new Uint32Array(block.activeUniformIndices);
            case WebGL2RenderingContext.UNIFORM_BLOCK_REFERENCED_BY_VERTEX_SHADER:
                return block.referencedByVertex;
            case WebGL2RenderingContext.UNIFORM_BLOCK_REFERENCED_BY_FRAGMENT_SHADER:
                return block.referencedByFragment;
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return null;
        }
    }

    uniformBlockBinding(program: HydProgram, uniformBlockIndex: GLuint, uniformBlockBinding: GLuint) {
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return;
        }
        const block = program.hydUniformBlocks[uniformBlockIndex];
        if (this.hydContextType !== "webgl2" || !block || uniformBlockBinding >= this.uniformBufferBindings.length) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (block.binding !== uniformBlockBinding) {
            block.binding = uniformBlockBinding;
            this.invalidateDrawSemanticValidation();
            this.hydGlobalState.recordTransition(
                "uniformBlockBinding",
                program.hash,
                uniformBlockIndex,
                uniformBlockBinding,
            );
        }
    }

    getActiveAttrib(program: HydProgram, index: GLuint): HydActiveUniformInfo {
        if (program === null || program === undefined) {
            throw new TypeError("getActiveAttrib requires a WebGLProgram");
        }
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return null;
        }
        const activeAttributes = [...program.hydAttributes, ...program.activeBuiltInAttributes];
        if (index < 0 || index >= activeAttributes.length) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return null;
        }
        const attribute = activeAttributes[index];
        return brandHydWebGlObject({
            name: attribute.name,
            size: attribute.size,
            type: attribute.type,
        }, "active-info");
    }

    attachShader(program: HydProgram, shader: HydShader) {
        if (!this.isProgram(program) || !this.isShader(shader)) {
            this.setShaderProgramValidationError(program, shader);
            return;
        }
        if (!program.attachShader(shader)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
        }
    }

    compileShader(s: HydShader) {
        if (!this.isShader(s) || (s.deleted && s.attachmentCount === 0)) {
            this.setShaderProgramValidationError(s);
            return;
        }
        s.compiled = false;
        s.infoLog = "";
        if (this.hydContextType === "webgl2" && hasMisplacedGlslEs3VersionDirective(s.glsl_shader)) {
            s.infoLog = "GLSL ES 3.00 #version directive must occur on the first line.";
            return;
        }
        const validationContext = nativeValidationContext(this.hydContextType);
        if (!validationContext) {
            s.infoLog = "Native WebGL shader validation context is unavailable.";
            return;
        }
        if (s.validationShader && s.validationContext) {
            s.validationContext.deleteShader(s.validationShader);
        }
        const shader = validationContext.createShader(s.type);
        if (!shader) {
            s.infoLog = "Unable to create native validation shader.";
            return;
        }
        // WebGL requires user identifiers containing "__" to work even when
        // the native GLSL compiler reserves them. Validate the same mangled
        // source that the runtime translation path will consume while keeping
        // getShaderSource() and public reflection names unchanged.
        validationContext.shaderSource(shader, bridgeGlslDunderIdentifiers(s.glsl_shader));
        validationContext.compileShader(shader);
        s.validationShader = shader;
        s.validationContext = validationContext;
        s.compiled = Boolean(validationContext.getShaderParameter(shader, WebGL2RenderingContext.COMPILE_STATUS));
        s.infoLog = validationContext.getShaderInfoLog(shader) || "";
        const debugShaders = validationContext.getExtension('WEBGL_debug_shaders');
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

    private captureWebGl2ProgramReflection(
        program: HydProgram,
        gl: WebGL2RenderingContext,
        nativeProgram: WebGLProgram,
        attachedShaders: HydShader[],
    ): ProgramTransformFeedbackVarying[] {
        const originalNames = new Map<string, string>();
        const identifier = /\b[A-Za-z_]\w*\b/g;
        for (const shader of attachedShaders) {
            for (let match = identifier.exec(shader.glsl_shader); match !== null; match = identifier.exec(shader.glsl_shader)) {
                const bridged = bridgeGlslDunderIdentifier(match[0]);
                if (bridged !== match[0]) originalNames.set(bridged, match[0]);
            }
        }
        const restoreName = (name: string) => name.replace(identifier, (part) => originalNames.get(part) || part);
        const uniformCount = Number(gl.getProgramParameter(nativeProgram, gl.ACTIVE_UNIFORMS)) || 0;
        const indices = Array.from({ length: uniformCount }, (_, index) => index);
        const queryUniformProperty = (pname: GLenum, fallback: number | boolean) => {
            if (indices.length === 0) return [];
            const values = gl.getActiveUniforms(nativeProgram, indices, pname);
            return values ? Array.from(values) : indices.map(() => fallback);
        };
        const blockIndices = queryUniformProperty(gl.UNIFORM_BLOCK_INDEX, -1);
        const offsets = queryUniformProperty(gl.UNIFORM_OFFSET, -1);
        const arrayStrides = queryUniformProperty(gl.UNIFORM_ARRAY_STRIDE, 0);
        const matrixStrides = queryUniformProperty(gl.UNIFORM_MATRIX_STRIDE, 0);
        const rowMajors = queryUniformProperty(gl.UNIFORM_IS_ROW_MAJOR, false);
        const uniforms: ProgramUniformReflection[] = [];
        for (let index = 0; index < uniformCount; index++) {
            const info = gl.getActiveUniform(nativeProgram, index);
            if (!info) continue;
            uniforms.push({
                name: restoreName(info.name),
                size: info.size,
                type: info.type,
                blockIndex: Number(blockIndices[index]),
                offset: Number(offsets[index]),
                arrayStride: Number(arrayStrides[index]),
                matrixStride: Number(matrixStrides[index]),
                rowMajor: Boolean(rowMajors[index]),
            });
        }

        const blockCount = Number(gl.getProgramParameter(nativeProgram, gl.ACTIVE_UNIFORM_BLOCKS)) || 0;
        const blocks: ProgramUniformBlock[] = [];
        for (let index = 0; index < blockCount; index++) {
            const name = gl.getActiveUniformBlockName(nativeProgram, index);
            const activeIndices = gl.getActiveUniformBlockParameter(
                nativeProgram,
                index,
                gl.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES,
            ) as Uint32Array | number[] | null;
            blocks.push(new ProgramUniformBlock(
                restoreName(name || ""),
                index,
                Number(gl.getActiveUniformBlockParameter(nativeProgram, index, gl.UNIFORM_BLOCK_DATA_SIZE)) || 0,
                activeIndices ? Array.from(activeIndices) : [],
                Boolean(gl.getActiveUniformBlockParameter(nativeProgram, index, gl.UNIFORM_BLOCK_REFERENCED_BY_VERTEX_SHADER)),
                Boolean(gl.getActiveUniformBlockParameter(nativeProgram, index, gl.UNIFORM_BLOCK_REFERENCED_BY_FRAGMENT_SHADER)),
        ));
    }

        program.setUniformBlockReflection(uniforms, blocks);
        const varyingCount = Number(gl.getProgramParameter(nativeProgram, gl.TRANSFORM_FEEDBACK_VARYINGS)) || 0;
        const varyings: ProgramTransformFeedbackVarying[] = [];
        for (let index = 0; index < varyingCount; index++) {
            const info = gl.getTransformFeedbackVarying(nativeProgram, index);
            if (info) varyings.push({ name: restoreName(info.name), size: info.size, type: info.type });
        }
        return varyings;
    }

    private captureFragmentOutputLocations(
        program: HydProgram,
        gl: WebGLRenderingContext | WebGL2RenderingContext,
        nativeProgram: WebGLProgram,
        attachedShaders: HydShader[],
    ) {
        const fragmentShader = attachedShaders.find((shader) => shader.type === WebGL2RenderingContext.FRAGMENT_SHADER);
        const outputs = new Map<string, number>();
        const outputTypes = new Map<number, "float" | "sint" | "uint">();
        if (!fragmentShader) {
            program.fragmentOutputLocations = outputs;
            program.fragmentOutputTypes = outputTypes;
            return;
        }
        const source = fragmentShader.glsl_shader
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/\/\/.*$/gm, "");
        const declarations = /\b(?:layout\s*\([^)]*\)\s*)?(?:(?:flat|smooth|noperspective|centroid|sample|invariant)\s+)*(?:out)\s+(?:(?:lowp|mediump|highp)\s+)?[A-Za-z_]\w*\s+([^;{}]+);/g;
        for (let match = declarations.exec(source); match !== null; match = declarations.exec(source)) {
            for (const declarator of match[1].split(",")) {
                const nameMatch = /^\s*([A-Za-z_]\w*)(?:\s*\[\s*(\d+)\s*\])?/.exec(declarator);
                if (!nameMatch) continue;
                const sourceName = nameMatch[1];
                const bridgedName = bridgeGlslDunderIdentifier(sourceName);
                const arraySize = nameMatch[2] ? Number(nameMatch[2]) : 0;
                const candidates = [sourceName];
                for (let index = 0; index < arraySize; index++) candidates.push(`${sourceName}[${index}]`);
                for (const candidate of candidates) {
                    if (typeof (gl as WebGL2RenderingContext).getFragDataLocation !== "function") continue;
                    const queryName = candidate.replace(sourceName, bridgedName);
                    const location = (gl as WebGL2RenderingContext).getFragDataLocation(nativeProgram, queryName);
                    if (location >= 0) outputs.set(candidate, location);
                }
            }
        }
        if (/\bgl_FragColor\b|\bgl_FragData\s*\[\s*0\s*\]/.test(source)) {
            outputs.set("gl_FragColor", 0);
        }
        const scannedOutputTypes = scanGlslFragmentOutputScalarTypes(fragmentShader.glsl_shader);
        for (const [name, scalar] of scannedOutputTypes) {
            const arrayElement = /^(.*)\[(\d+)\]$/.exec(name);
            const baseName = arrayElement?.[1] || name;
            const offset = arrayElement ? Number(arrayElement[2]) : 0;
            const baseLocation = outputs.get(baseName);
            const location = outputs.get(name) ??
                (baseLocation === undefined ? undefined : baseLocation + offset);
            if (location !== undefined) outputTypes.set(location, scalar);
        }
        if (outputs.has("gl_FragColor")) outputTypes.set(0, "float");
        program.fragmentOutputLocations = outputs;
        program.fragmentOutputTypes = outputTypes;
    }

    useProgram(program: HydProgram | null) {
        if (program !== null && !this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return;
        }
        if (program !== null && !program.linked) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const activeFeedback = Array.from(this.transformFeedbackObjects).find((feedback) =>
            feedback.active && !feedback.paused);
        if (activeFeedback && program !== activeFeedback.activeProgram) {
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
            this.setShaderProgramValidationError(program);
            return;
        }
        if (this.hydGlobalState.commonState.currentProgram === program &&
            Array.from(this.transformFeedbackObjects).some((feedback) =>
                feedback.active && feedback.activeProgram === program)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        program.linkGeneration++;
        program.linked = false;
        this.lastDrawPbv = null;
        if (this.hydGlobalState.commonState.currentProgram === program) {
            this.currentProgramValid = false;
            this.activateUniformLocations(null);
        }
        program.uniformBufferLocations = [];
        program.uniformSamplerLocations = [];
        program.setUniformBlockReflection([], []);
        program.fragmentOutputLocations = new Map();
        program.fragmentOutputTypes = new Map();
        program.infoLog = "";
        const attachedShaders = program.getAttachedShaders();
        let linkedTransformFeedbackVaryings: ProgramTransformFeedbackVarying[] = [];
        if (attachedShaders.length !== 2 || attachedShaders.some((shader) => !shader.compiled || !shader.validationShader)) {
            program.infoLog = "A successfully compiled vertex shader and fragment shader must both be attached.";
            return;
        }
        const validationContext = nativeValidationContext(this.hydContextType);
        if (validationContext) {
            if (attachedShaders.some((shader) => shader.validationContext !== validationContext)) {
                program.infoLog = "Attached shaders were not compiled for this WebGL context version.";
                return;
            }
            const validationProgram = validationContext.createProgram();
            if (!validationProgram) {
                program.infoLog = "Unable to create native validation program.";
                return;
            }
            for (const shader of attachedShaders) {
                validationContext.attachShader(validationProgram, shader.validationShader);
            }
            for (const [name, index] of program.boundAttributeLocations) {
                validationContext.bindAttribLocation(validationProgram, index, bridgeGlslDunderIdentifier(name));
            }
            if (this.hydContextType === "webgl2" && program.pendingTransformFeedbackVaryingNames.length > 0) {
                (validationContext as WebGL2RenderingContext).transformFeedbackVaryings(
                    validationProgram,
                    program.pendingTransformFeedbackVaryingNames.map(bridgeGlslDunderIdentifier),
                    program.pendingTransformFeedbackBufferMode || WebGL2RenderingContext.INTERLEAVED_ATTRIBS,
                );
            }
            validationContext.linkProgram(validationProgram);
            const linked = Boolean(validationContext.getProgramParameter(validationProgram, WebGL2RenderingContext.LINK_STATUS));
            const infoLog = validationContext.getProgramInfoLog(validationProgram) || "";
            if (linked) {
                if (this.hydContextType === "webgl2") {
                    linkedTransformFeedbackVaryings = this.captureWebGl2ProgramReflection(
                        program,
                        validationContext as WebGL2RenderingContext,
                        validationProgram,
                        attachedShaders,
                    );
                }
                this.captureFragmentOutputLocations(
                    program,
                    validationContext,
                    validationProgram,
                    attachedShaders,
                );
            }
            validationContext.deleteProgram(validationProgram);
            if (!linked) {
                program.infoLog = infoLog;
                return;
            }
        }
        try {
            if (program.linkProgram()) {
                if (this.hydContextType === "webgl2") {
                    program.commitTransformFeedbackVaryings(linkedTransformFeedbackVaryings);
                }
                if (this.hydGlobalState.commonState.currentProgram === program) {
                    this.currentProgramValid = true;
                    this.activateUniformLocations(program);
                }
                this.hydGlobalState.recordTransition("linkProgram", program.hash, program.linkGeneration);
            } else if (program.infoLog) {
                console.error("[HYD] Program link failed:", program.infoLog);
            }
        } catch (error) {
            program.linked = false;
            program.infoLog = error instanceof Error ? error.message : String(error);
            console.error("[HYD] Program link failed after shader translation:", program.infoLog);
        }
    }

    validateProgram(program: HydProgram) {
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return;
        }
        program.validated = program.linked;
    }

    bindVertexArray(vertexArray: HydVertexArray | null) {
        if (vertexArray !== null && (!(vertexArray instanceof HydVertexArray) ||
            vertexArray.ownerToken !== this.contextToken || vertexArray.deleted)) {
            this.setObjectValidationError(vertexArray);
            return;
        }
        if (vertexArray) vertexArray.initialized = true;
        const target = vertexArray || this.hydGlobalState.defaultVertexArrayBinding;
        if (this.hydGlobalState.commonState.vertexArrayBinding !== target) {
            this.hydGlobalState.commonState.vertexArrayBinding = target;
            this.hydGlobalState.invalidateCurrentVertexAttribHash();
            this.hydGlobalState.recordTransition("bindVertexArray", target.hash);
        }
    }

    deleteVertexArray(vertexArray: HydVertexArray | null) {
        if (vertexArray === null) return;
        if (!(vertexArray instanceof HydVertexArray) || vertexArray.ownerToken !== this.contextToken) {
            this.setObjectValidationError(vertexArray);
            return;
        }
        if (vertexArray.deleted) return;
        vertexArray.deleted = true;
        if (this.hydGlobalState.commonState.vertexArrayBinding === vertexArray) {
            this.hydGlobalState.commonState.vertexArrayBinding = this.hydGlobalState.defaultVertexArrayBinding;
            this.hydGlobalState.invalidateCurrentVertexAttribHash();
            this.hydGlobalState.recordTransition("deleteVertexArray", vertexArray.hash);
        }
    }

    deleteSampler(sampler: HydSampler | null) {
        if (sampler === null) return;
        if (!(sampler instanceof HydSampler) || sampler.ownerToken !== this.contextToken) {
            this.setObjectValidationError(sampler);
            return;
        }
        if (sampler.deleted) return;
        sampler.deleted = true;
        for (let unit = 0; unit < this.samplerBindings.length; unit++) {
            if (this.samplerBindings[unit] === sampler) this.samplerBindings[unit] = null;
        }
        this.hydGlobalState.invalidateSamplerBindingHash();
        this.hydGlobalState.recordTransition("deleteSampler", sampler.hash);
    }

    bindSampler(unit: GLuint, sampler: HydSampler | null) {
        unit = Number(unit) >>> 0;
        if (unit >= this.samplerBindings.length) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (sampler !== null && !this.isSampler(sampler)) {
            this.setObjectValidationError(sampler);
            return;
        }
        if (this.samplerBindings[unit] === sampler) return;
        this.samplerBindings[unit] = sampler;
        this.hydGlobalState.invalidateSamplerBindingHash();
        this.hydGlobalState.recordTransition("bindSampler", unit, sampler?.hash || "null");
    }

    private setSamplerParameter(sampler: HydSampler, pname: GLenum, param: number) {
        if (!this.isSampler(sampler)) {
            this.setObjectValidationError(sampler);
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
        const wraps = new Set<number>([
            WebGL2RenderingContext.REPEAT,
            WebGL2RenderingContext.CLAMP_TO_EDGE,
            WebGL2RenderingContext.MIRRORED_REPEAT,
        ]);
        const compareModes = new Set<number>([WebGL2RenderingContext.NONE, WebGL2RenderingContext.COMPARE_REF_TO_TEXTURE]);
        const compareFunctions = new Set<number>([
            WebGL2RenderingContext.NEVER,
            WebGL2RenderingContext.LESS,
            WebGL2RenderingContext.EQUAL,
            WebGL2RenderingContext.LEQUAL,
            WebGL2RenderingContext.GREATER,
            WebGL2RenderingContext.NOTEQUAL,
            WebGL2RenderingContext.GEQUAL,
            WebGL2RenderingContext.ALWAYS,
        ]);
        const valid = pname === WebGL2RenderingContext.TEXTURE_MIN_FILTER ? minFilters.has(param) :
            pname === WebGL2RenderingContext.TEXTURE_MAG_FILTER ? magFilters.has(param) :
                pname === WebGL2RenderingContext.TEXTURE_WRAP_S ||
                    pname === WebGL2RenderingContext.TEXTURE_WRAP_T ||
                    pname === WebGL2RenderingContext.TEXTURE_WRAP_R ? wraps.has(param) :
                    pname === WebGL2RenderingContext.TEXTURE_COMPARE_MODE ? compareModes.has(param) :
                        pname === WebGL2RenderingContext.TEXTURE_COMPARE_FUNC ? compareFunctions.has(param) :
                            pname === WebGL2RenderingContext.TEXTURE_MIN_LOD ||
                                pname === WebGL2RenderingContext.TEXTURE_MAX_LOD;
        if (!valid) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        sampler.setParameter(pname, param);
        this.hydGlobalState.invalidateSamplerBindingHash();
        this.hydGlobalState.recordTransition("samplerParameter", sampler.hash, pname, param);
    }

    samplerParameteri(sampler: HydSampler, pname: GLenum, param: GLint) {
        this.setSamplerParameter(sampler, pname, Number(param));
    }

    samplerParameterf(sampler: HydSampler, pname: GLenum, param: GLfloat) {
        this.setSamplerParameter(sampler, pname, Number(param));
    }

    getSamplerParameter(sampler: HydSampler, pname: GLenum) {
        if (!this.isSampler(sampler)) {
            this.setObjectValidationError(sampler);
            return null;
        }
        const value = sampler.getParameter(pname);
        if (value === undefined) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        return value;
    }

    private isValidQueryTarget(target: GLenum): boolean {
        return target === WebGL2RenderingContext.ANY_SAMPLES_PASSED ||
            target === WebGL2RenderingContext.ANY_SAMPLES_PASSED_CONSERVATIVE ||
            target === WebGL2RenderingContext.TRANSFORM_FEEDBACK_PRIMITIVES_WRITTEN;
    }

    private isOcclusionQueryTarget(target: GLenum): boolean {
        return target === WebGL2RenderingContext.ANY_SAMPLES_PASSED ||
            target === WebGL2RenderingContext.ANY_SAMPLES_PASSED_CONSERVATIVE;
    }

    private queryTargetKey(target: GLenum): GLenum {
        return this.isOcclusionQueryTarget(target)
            ? WebGL2RenderingContext.ANY_SAMPLES_PASSED
            : target;
    }

    private allocateActiveOcclusionQuery(): HydOcclusionQueryAllocation | null {
        const query = this.activeQueries.get(WebGL2RenderingContext.ANY_SAMPLES_PASSED) ||
            this.activeQueries.get(WebGL2RenderingContext.ANY_SAMPLES_PASSED_CONSERVATIVE);
        if (!query || !query.active || !this.isOcclusionQueryTarget(query.target)) return null;

        const capacity = 64;
        let segment = query.occlusionSegments[query.occlusionSegments.length - 1];
        if (!segment || segment.used >= segment.capacity) {
            segment = {
                querySet: this.hydDevice.createQuerySet({
                    label: `webgl-occlusion-query-${query.generation}-${query.occlusionSegments.length}`,
                    type: "occlusion",
                    count: capacity,
                }),
                capacity,
                used: 0,
            };
            query.occlusionSegments.push(segment);
        }
        return {
            querySet: segment.querySet,
            queryIndex: segment.used++,
        };
    }

    private waitForQueryPublicationFrame(): Promise<void> {
        return new Promise((resolve) => requestAnimationFrame(() => resolve()));
    }

    private publishQueryResult(query: HydQuery, generation: number, result: number) {
        if (query.generation !== generation || query.active || query.deleted) return;
        query.result = result;
        query.available = true;
    }

    private resolveOcclusionQuery(
        query: HydQuery,
        generation: number,
        segments: HydOcclusionQuerySegment[],
    ) {
        if (segments.length === 0) {
            this.waitForQueryPublicationFrame().then(() => {
                this.publishQueryResult(query, generation, 0);
            });
            return;
        }

        const encoder = this.hydDevice.createCommandEncoder({
            label: `webgl-occlusion-query-resolve-${generation}`,
        });
        const buffers = segments.map((segment, index) => {
            const byteLength = segment.used * BigUint64Array.BYTES_PER_ELEMENT;
            const resolveBuffer = this.hydDevice.createBuffer({
                label: `webgl-occlusion-query-resolve-${generation}-${index}`,
                size: byteLength,
                usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
            });
            const readBuffer = this.hydDevice.createBuffer({
                label: `webgl-occlusion-query-read-${generation}-${index}`,
                size: byteLength,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
            });
            encoder.resolveQuerySet(segment.querySet, 0, segment.used, resolveBuffer, 0);
            encoder.copyBufferToBuffer(resolveBuffer, 0, readBuffer, 0, byteLength);
            return { segment, resolveBuffer, readBuffer };
        });
        this.hydDevice.queue.submit([encoder.finish()]);

        const readResults = buffers.map(async ({ readBuffer }) => {
            await readBuffer.mapAsync(GPUMapMode.READ);
            const values = new BigUint64Array(readBuffer.getMappedRange());
            let passed = false;
            for (const value of values) {
                if (value !== 0n) {
                    passed = true;
                    break;
                }
            }
            readBuffer.unmap();
            return passed;
        });

        Promise.all([...readResults, this.waitForQueryPublicationFrame()])
            .then((results) => {
                const passed = results.slice(0, readResults.length).some((result) => result === true);
                this.publishQueryResult(query, generation, passed ? 1 : 0);
            })
            .catch((error) => {
                console.error("[HYD] Failed to resolve WebGL occlusion query:", error);
                this.publishQueryResult(query, generation, 0);
            })
            .finally(() => {
                for (const { segment, resolveBuffer, readBuffer } of buffers) {
                    segment.querySet.destroy();
                    resolveBuffer.destroy();
                    readBuffer.destroy();
                }
            });
    }

    private discardOcclusionQuerySegments(segments: HydOcclusionQuerySegment[]) {
        if (segments.length === 0) return;
        this.hydDevice.queue.onSubmittedWorkDone().finally(() => {
            for (const segment of segments) segment.querySet.destroy();
        });
    }

    deleteQuery(query: HydQuery | null) {
        if (query === null) return;
        if (!(query instanceof HydQuery) || query.ownerToken !== this.contextToken) {
            this.setObjectValidationError(query);
            return;
        }
        if (query.deleted) return;
        if (query.active) {
            if (this.isOcclusionQueryTarget(query.target)) this._der_flush();
            this.activeQueries.delete(query.target);
            query.active = false;
        }
        const segments = query.occlusionSegments;
        query.occlusionSegments = [];
        query.generation++;
        query.deleted = true;
        this.queryObjects.delete(query);
        this.discardOcclusionQuerySegments(segments);
    }

    beginQuery(target: GLenum, query: HydQuery) {
        if (!this.isValidQueryTarget(target)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (!(query instanceof HydQuery) || query.ownerToken !== this.contextToken || query.deleted) {
            this.setObjectValidationError(query);
            return;
        }
        const targetKey = this.queryTargetKey(target);
        const targetAlreadyActive = this.isOcclusionQueryTarget(target)
            ? this.activeQueries.has(WebGL2RenderingContext.ANY_SAMPLES_PASSED) ||
                this.activeQueries.has(WebGL2RenderingContext.ANY_SAMPLES_PASSED_CONSERVATIVE)
            : this.activeQueries.has(target);
        if (targetAlreadyActive || query.active ||
            (query.target !== 0 && this.queryTargetKey(query.target) !== targetKey)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (this.isOcclusionQueryTarget(target)) this._der_flush();
        query.initialized = true;
        query.active = true;
        query.target = target;
        query.result = 0;
        query.available = false;
        query.generation++;
        query.occlusionSegments = [];
        this.activeQueries.set(target, query);
    }

    endQuery(target: GLenum) {
        if (!this.isValidQueryTarget(target)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        const query = this.activeQueries.get(target);
        if (!query) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (this.isOcclusionQueryTarget(target)) this._der_flush();
        const generation = query.generation;
        const segments = query.occlusionSegments;
        query.occlusionSegments = [];
        query.active = false;
        this.activeQueries.delete(target);
        if (this.isOcclusionQueryTarget(target)) {
            this.resolveOcclusionQuery(query, generation, segments);
        } else {
            this.waitForQueryPublicationFrame().then(() => {
                this.publishQueryResult(query, generation, query.result);
            });
        }
    }

    getQuery(target: GLenum, pname: GLenum) {
        if (!this.isValidQueryTarget(target)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        if (pname !== WebGL2RenderingContext.CURRENT_QUERY) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        return this.activeQueries.get(target) || null;
    }

    getQueryParameter(query: HydQuery, pname: GLenum) {
        if (!(query instanceof HydQuery) || query.ownerToken !== this.contextToken || query.deleted) {
            this.setObjectValidationError(query);
            return null;
        }
        if (!query.initialized) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        if (query.active) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        if (pname === WebGL2RenderingContext.QUERY_RESULT_AVAILABLE) return query.available;
        if (pname === WebGL2RenderingContext.QUERY_RESULT) {
            return query.result;
        }
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
        return null;
    }

    deleteTransformFeedback(transformFeedback: HydTransformFeedback | null) {
        if (transformFeedback === null) return;
        if (!this.isTransformFeedbackObject(transformFeedback)) {
            this.setObjectValidationError(transformFeedback);
            return;
        }
        if (transformFeedback.active) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        transformFeedback.deleted = true;
        this.transformFeedbackObjects.delete(transformFeedback);
        if (this.transformFeedbackBinding === transformFeedback) {
            this.transformFeedbackBinding = this.defaultTransformFeedback;
        }
    }

    bindTransformFeedback(target: GLenum, transformFeedback: HydTransformFeedback | null) {
        if (target !== WebGL2RenderingContext.TRANSFORM_FEEDBACK) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (this.transformFeedbackBinding.active && !this.transformFeedbackBinding.paused) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (transformFeedback !== null && !this.isTransformFeedbackObject(transformFeedback)) {
            this.setObjectValidationError(transformFeedback);
            return;
        }
        if (transformFeedback) transformFeedback.initialized = true;
        this.transformFeedbackBinding = transformFeedback || this.defaultTransformFeedback;
        this.invalidateDrawSemanticValidation();
        this.hydGlobalState.recordTransition("bindTransformFeedback", transformFeedback ? "object" : "default");
    }

    transformFeedbackVaryings(program: HydProgram, varyings: string[], bufferMode: GLenum) {
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return;
        }
        if (bufferMode !== WebGL2RenderingContext.INTERLEAVED_ATTRIBS &&
            bufferMode !== WebGL2RenderingContext.SEPARATE_ATTRIBS) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (!Array.isArray(varyings)) {
            throw new TypeError("transformFeedbackVaryings requires a string array");
        }
        const maxSeparateAttributes = enumToConstant.get(
            WebGL2RenderingContext.MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS,
        ) || 0;
        if (bufferMode === WebGL2RenderingContext.SEPARATE_ATTRIBS &&
            varyings.length > maxSeparateAttributes) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        program.pendingTransformFeedbackVaryingNames = varyings.map(String);
        program.pendingTransformFeedbackBufferMode = bufferMode;
        this.hydGlobalState.recordTransition(
            "transformFeedbackVaryings",
            program.hash,
            bufferMode,
            ...program.pendingTransformFeedbackVaryingNames,
        );
    }

    getTransformFeedbackVarying(program: HydProgram, index: GLuint) {
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return null;
        }
        index = Number(index) >>> 0;
        const info = program.transformFeedbackVaryingInfo[index];
        if (!info) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return null;
        }
        return brandHydWebGlObject({ ...info }, "active-info");
    }

    beginTransformFeedback(primitiveMode: GLenum) {
        if (primitiveMode !== WebGL2RenderingContext.POINTS &&
            primitiveMode !== WebGL2RenderingContext.LINES &&
            primitiveMode !== WebGL2RenderingContext.TRIANGLES) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (this.transformFeedbackBinding.active || !this.currentProgramValid) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const currentProgram = this.hydGlobalState.commonState.currentProgram;
        if (!currentProgram || currentProgram.transformFeedbackVaryingInfo.length === 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const requiredBufferCount = currentProgram.transformFeedbackBufferMode ===
            WebGL2RenderingContext.SEPARATE_ATTRIBS
            ? currentProgram.transformFeedbackVaryingInfo.length
            : 1;
        for (let index = 0; index < requiredBufferCount; index++) {
            const binding = this.transformFeedbackBinding.bufferBindings[index];
            // Deleting a buffer name does not release storage retained by a
            // transform-feedback object's indexed binding.
            if (!binding) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
        }
        const outputBuffers = new Set<HydBuffer>();
        for (const binding of this.transformFeedbackBinding.bufferBindings) {
            if (!binding) continue;
            if (outputBuffers.has(binding.buffer)) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            outputBuffers.add(binding.buffer);
        }
        this.transformFeedbackBinding.active = true;
        this.transformFeedbackBinding.paused = false;
        this.transformFeedbackBinding.primitiveMode = primitiveMode;
        this.transformFeedbackBinding.activeProgram = currentProgram;
        this.transformFeedbackBinding.writeOffsets.fill(0);
        this.invalidateDrawSemanticValidation();
        this.hydGlobalState.recordTransition("beginTransformFeedback", primitiveMode);
    }

    endTransformFeedback() {
        if (!this.transformFeedbackBinding.active) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this.transformFeedbackBinding.active = false;
        this.transformFeedbackBinding.paused = false;
        this.transformFeedbackBinding.primitiveMode = 0;
        this.transformFeedbackBinding.activeProgram = null;
        this.invalidateDrawSemanticValidation();
        this.hydGlobalState.recordTransitionOne("endTransformFeedback");
    }

    pauseTransformFeedback() {
        if (!this.transformFeedbackBinding.active || this.transformFeedbackBinding.paused) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this.transformFeedbackBinding.paused = true;
        this.invalidateDrawSemanticValidation();
        this.hydGlobalState.recordTransitionOne("pauseTransformFeedback");
    }

    resumeTransformFeedback() {
        if (!this.transformFeedbackBinding.active || !this.transformFeedbackBinding.paused) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (this.hydGlobalState.commonState.currentProgram !== this.transformFeedbackBinding.activeProgram) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this.transformFeedbackBinding.paused = false;
        this.invalidateDrawSemanticValidation();
        this.hydGlobalState.recordTransitionOne("resumeTransformFeedback");
    }

    // ***** texture *****
    activeTexture(texture: GLenum) {
        const target = texture - WebGL2RenderingContext.TEXTURE0;
        const maxTextureUnits = enumToConstant.get(WebGL2RenderingContext.MAX_COMBINED_TEXTURE_IMAGE_UNITS) || 0;
        if (target < 0 || target >= maxTextureUnits) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (this.hydGlobalState.commonState.activeTextureUnit !== target) {
            this.hydGlobalState.commonState.activeTextureUnit = target;
            this.hydGlobalState.invalidateNonTextureStateHash();
        }
    }

    bindTexture(target: GLenum, texture: HydTexture | object | null) {
        const vd = enumToViewDimension.get(target);
        const webgl2OnlyTarget = target === WebGL2RenderingContext.TEXTURE_3D ||
            target === WebGL2RenderingContext.TEXTURE_2D_ARRAY;
        if (!vd || (this.hydContextType !== "webgl2" && webgl2OnlyTarget)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        let hydTexture: HydTexture | null;
        const knownTargetTexture = texture instanceof HydTexture &&
            texture.bindingTarget === target &&
            texture.ownerToken === this.contextToken &&
            !texture.deleted;
        if (knownTargetTexture) {
            hydTexture = texture as HydTexture;
        } else if (texture instanceof HydTexture) {
            if (texture.deleted) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            if (texture.ownerToken !== this.contextToken) {
                this.setObjectValidationError(texture);
                return;
            }
            hydTexture = texture;
        } else {
            hydTexture = this.normalizeTexture(texture);
        }
        if (hydTexture && !knownTargetTexture) {
            if (hydTexture.bindingTarget !== null && hydTexture.bindingTarget !== target) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            hydTexture.bindingTarget = target;
            hydTexture.initialized = true;
        }
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
            this.hydGlobalState.recordTransitionOne(`bindTexture$${target},null`, true);
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
        this.hydGlobalState.recordTransitionOne(hydTexture.hash, true);
        // this.hydGlobalState.recordTransition("bindTexture", vd, texture.hash);
    }

    texImage2D(...args: Array<any>) {
        console.assert(args.length === 10 || args.length === 9 || args.length === 6);
        const target: GLenum = toWebGlInt32(args.at(0));
        const level: GLint = toWebGlInt32(args.at(1));
        const internalformat: GLenum = toWebGlInt32(args.at(2));
        let width: GLsizei;
        let height: GLsizei;
        const sizedUpload = args.length !== 6;
        const border: GLint = sizedUpload ? toWebGlInt32(args.at(5)) : 0;
        const format: GLenum = toWebGlInt32(sizedUpload ? args.at(6) : args.at(3));
        const type: GLenum = toWebGlInt32(sizedUpload ? args.at(7) : args.at(4));
        const sourcePixels: any = sizedUpload ? args.at(8) : args.at(5);
        let pixels = sourcePixels;
        if (!this.validateTexImage2DTarget(target)) return;
        if (!sizedUpload && this.hydGlobalState.commonState.pixelUnpackBufferBinding) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (args.length === 6) {
            const extent = this.resolveTexImageSourceExtent(sourcePixels);
            if (!extent) {
                throw new Error("unsupported texImage2D: " + args);
            }
            width = extent.width;
            height = extent.height;
        } else {
            width = toWebGlInt32(args.at(3));
            height = toWebGlInt32(args.at(4));
            if (this.hydContextType !== "webgl2" && sourcePixels !== null && !ArrayBuffer.isView(sourcePixels)) {
                throw new TypeError("texImage2D pixels must be an ArrayBufferView or null");
            }
        }
        if ((sizedUpload && border !== 0) ||
            !this.validateTexImage2DDimensions(target, level, width, height)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (!this.isKnownTextureFormat(format) || !this.isKnownTextureType(type)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (!this.isKnownTextureInternalFormat(internalformat)) {
            this.hydGlobalState.setError(this.hydContextType === "webgl2"
                ? WebGL2RenderingContext.INVALID_VALUE
                : WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        const externalSource = sourcePixels !== null &&
            !ArrayBuffer.isView(sourcePixels) && typeof sourcePixels !== "number";
        if (externalSource && (
            format === WebGL2RenderingContext.RED_INTEGER ||
            format === WebGL2RenderingContext.RG_INTEGER ||
            format === WebGL2RenderingContext.RGB_INTEGER ||
            format === WebGL2RenderingContext.RGBA_INTEGER
        ) && type !== WebGL2RenderingContext.UNSIGNED_BYTE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (args.length === 10) {
            if (!ArrayBuffer.isView(pixels)) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            pixels = this.textureUploadViewFromElementOffset(pixels, args.at(9));
            if (!pixels) return;
        }
        if (sourcePixels instanceof HTMLCanvasElement) {
            pixels = hydCanvasContexts.get(sourcePixels)?.prepareCanvasForTextureUpload() || sourcePixels;
        }
        if (this.hydContextType === "webgl2" && typeof pixels === "number") {
            pixels = this.pixelUnpackBufferSlice(pixels, width, height, 1, format, type);
            if (!pixels) return;
        }
        if (!this.textureUploadExtensionsAllow(format, type)) return;
        if (!this.isSupportedTextureUploadFormat(internalformat, format, type)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (!this.validateTextureUploadView(pixels, width, height, format, type)) return;
        const unpack: HydPixelUnpackState = this.hydGlobalState.miscState.unpackState;
        const texture = this.currentTexture(target);
        if (!texture) return;
        if (texture.immutableFormat) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this._der_flush();
        try {
            texture.texImage2D(pixels, target, level, internalformat, width, height, border, format, type, unpack);
        } catch (error) {
            if ((error as any)?.name === "SecurityError") throw error;
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this.markFramebufferContentChanged();
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("texImage2D", target, level, internalformat, width, height, border, format, type);
    }

    compressedTexImage2D(...args: Array<any>) {
        if (args.length < 7 || (this.hydContextType !== "webgl2" && !ArrayBuffer.isView(args[6]))) {
            throw new TypeError(`compressedTexImage2D requires 7 arguments in WebGL 1, received ${args.length}`);
        }
        const [target, level, internalformat, width, height, border] = args;
        const info = this.compressedTextureFormatInfo(internalformat);
        if (!info) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (!this.validateTexImage2DTarget(target)) return;
        if (border !== 0 || !this.validateTexImage2DDimensions(target, level, width, height)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const expectedBytes = this.compressedTextureByteLength(width, height, info.blockBytes);
        let data: Uint8Array;
        if (typeof args[6] === "number") {
            const imageSize = args[6];
            const offset = Number(args[7]) || 0;
            const buffer = this.hydGlobalState.commonState.pixelUnpackBufferBinding;
            if (!buffer) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            if (imageSize !== expectedBytes || offset < 0) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                return;
            }
            if (offset + imageSize > buffer.webglSize) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            data = buffer.shadowData.subarray(offset, offset + imageSize);
        } else if (ArrayBuffer.isView(args[6])) {
            const source = args[6] as ArrayBufferView;
            data = this.compressedTextureViewBytes(source, args[7] ?? 0, args[8], expectedBytes);
            if (!data) return;
        } else {
            throw new TypeError("compressedTexImage2D data must be an ArrayBufferView or PBO offset");
        }
        const texture = this.currentTexture(target);
        if (!texture) return;
        this._der_flush();
        texture.compressedTexImage2D(data, target, level, internalformat, width, height, info.gpuFormat, info.blockBytes);
        this.markFramebufferContentChanged();
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("compressedTexImage2D", target, level, internalformat, width, height);
    }

    compressedTexSubImage2D(...args: Array<any>) {
        if (args.length < 8 || (this.hydContextType !== "webgl2" && !ArrayBuffer.isView(args[7]))) {
            throw new TypeError(`compressedTexSubImage2D requires 8 arguments in WebGL 1, received ${args.length}`);
        }
        const [target, level, xoffset, yoffset, width, height, format] = args;
        const info = this.compressedTextureFormatInfo(format);
        if (!info) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (!this.validateTexImage2DTarget(target)) return;
        if (level < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (!info.supportsSubImage) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const texture = this.currentTexture(target);
        if (!texture) return;
        const image = texture.getImageState(target, level);
        if (!image || image.internalFormat !== format) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (xoffset < 0 || yoffset < 0 || width < 0 || height < 0 ||
            xoffset + width > image.width || yoffset + height > image.height) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (xoffset % 4 !== 0 || yoffset % 4 !== 0 ||
            (width % 4 !== 0 && xoffset + width !== image.width) ||
            (height % 4 !== 0 && yoffset + height !== image.height)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const expectedBytes = this.compressedTextureByteLength(width, height, info.blockBytes);
        let data: Uint8Array;
        if (typeof args[7] === "number") {
            const imageSize = args[7];
            const offset = Number(args[8]) || 0;
            const buffer = this.hydGlobalState.commonState.pixelUnpackBufferBinding;
            if (!buffer) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            if (imageSize !== expectedBytes || offset < 0) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                return;
            }
            if (offset + imageSize > buffer.webglSize) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            data = buffer.shadowData.subarray(offset, offset + imageSize);
        } else if (ArrayBuffer.isView(args[7])) {
            const source = args[7] as ArrayBufferView;
            data = this.compressedTextureViewBytes(source, args[8] ?? 0, args[9], expectedBytes);
            if (!data) return;
        } else {
            throw new TypeError("compressedTexSubImage2D data must be an ArrayBufferView or PBO offset");
        }
        this._der_flush();
        texture.compressedTexSubImage2D(data, target, level, xoffset, yoffset, width, height, info.blockBytes);
        this.markFramebufferContentChanged();
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("compressedTexSubImage2D", target, level, xoffset, yoffset, width, height, format);
    }

    compressedTexImage3D(...args: Array<any>) {
        if (args.length < 8) {
            throw new TypeError(`compressedTexImage3D requires 8 arguments, received ${args.length}`);
        }
        const [target, level, internalformat, width, height, depth, border] = args;
        const info = this.compressedTextureFormatInfo(internalformat);
        if (!info) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (target !== WebGL2RenderingContext.TEXTURE_3D &&
            target !== WebGL2RenderingContext.TEXTURE_2D_ARRAY) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (target === WebGL2RenderingContext.TEXTURE_3D) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (border !== 0 || !this.validateTexImage3DDimensions(target, level, width, height, depth)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const expectedBytes = this.compressedTextureByteLength(width, height, info.blockBytes) * depth;
        let data: Uint8Array;
        if (typeof args[7] === "number") {
            const imageSize = Number(args[7]);
            const byteOffset = Number(args[8]) || 0;
            const buffer = this.hydGlobalState.commonState.pixelUnpackBufferBinding;
            if (!buffer) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            if (imageSize !== expectedBytes || byteOffset < 0) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                return;
            }
            if (byteOffset + imageSize > buffer.webglSize) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            data = buffer.shadowData.subarray(byteOffset, byteOffset + imageSize);
        } else if (ArrayBuffer.isView(args[7])) {
            data = this.compressedTextureViewBytes(args[7], args[8] ?? 0, args[9], expectedBytes);
            if (!data) return;
        } else {
            throw new TypeError("compressedTexImage3D data must be an ArrayBufferView or PBO offset");
        }
        const texture = this.currentTexture(target);
        if (!texture) return;
        this._der_flush();
        texture.compressedTexImage3D(
            data, target, level, internalformat, width, height, depth, info.gpuFormat, info.blockBytes);
        this.markFramebufferContentChanged();
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition(
            "compressedTexImage3D", target, level, internalformat, width, height, depth);
    }

    compressedTexSubImage3D(...args: Array<any>) {
        if (args.length < 10) {
            throw new TypeError(`compressedTexSubImage3D requires 10 arguments, received ${args.length}`);
        }
        const [target, level, xoffset, yoffset, zoffset, width, height, depth, format] = args;
        const info = this.compressedTextureFormatInfo(format);
        if (!info) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (target !== WebGL2RenderingContext.TEXTURE_3D &&
            target !== WebGL2RenderingContext.TEXTURE_2D_ARRAY) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (target === WebGL2RenderingContext.TEXTURE_3D) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (level < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (!info.supportsSubImage) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const texture = this.currentTexture(target);
        if (!texture) return;
        const image = texture.getImageState(target, level);
        if (!image || image.internalFormat !== format) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (xoffset < 0 || yoffset < 0 || zoffset < 0 || width < 0 || height < 0 || depth < 0 ||
            xoffset + width > image.width || yoffset + height > image.height || zoffset + depth > image.depth) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (xoffset % 4 !== 0 || yoffset % 4 !== 0 ||
            (width % 4 !== 0 && xoffset + width !== image.width) ||
            (height % 4 !== 0 && yoffset + height !== image.height)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const expectedBytes = this.compressedTextureByteLength(width, height, info.blockBytes) * depth;
        let data: Uint8Array;
        if (typeof args[9] === "number") {
            const imageSize = Number(args[9]);
            const byteOffset = Number(args[10]) || 0;
            const buffer = this.hydGlobalState.commonState.pixelUnpackBufferBinding;
            if (!buffer) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            if (imageSize !== expectedBytes || byteOffset < 0) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                return;
            }
            if (byteOffset + imageSize > buffer.webglSize) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            data = buffer.shadowData.subarray(byteOffset, byteOffset + imageSize);
        } else if (ArrayBuffer.isView(args[9])) {
            data = this.compressedTextureViewBytes(args[9], args[10] ?? 0, args[11], expectedBytes);
            if (!data) return;
        } else {
            throw new TypeError("compressedTexSubImage3D data must be an ArrayBufferView or PBO offset");
        }
        this._der_flush();
        texture.compressedTexSubImage3D(
            data, level, xoffset, yoffset, zoffset, width, height, depth, info.blockBytes);
        this.markFramebufferContentChanged();
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition(
            "compressedTexSubImage3D", target, level, xoffset, yoffset, zoffset, width, height, depth, format);
    }

    private compressedTextureFormatInfo(format: GLenum): CompressedTextureFormatInfo | null {
        if (format === GL_COMPRESSED_RGB_ETC1_WEBGL && this.enabledExtensions.has("WEBGL_COMPRESSED_TEXTURE_ETC1")) {
            return ETC1_COMPRESSED_FORMAT;
        }
        if (this.enabledExtensions.has("WEBGL_COMPRESSED_TEXTURE_ETC")) {
            return ETC2_COMPRESSED_FORMATS.get(format) || null;
        }
        return null;
    }

    private compressedTextureByteLength(width: number, height: number, blockBytes: number): number {
        return Math.ceil(width / 4) * Math.ceil(height / 4) * blockBytes;
    }

    texStorage2D(target: GLenum, levels: GLsizei, internalformat: GLenum, width: GLsizei, height: GLsizei) {
        const validTarget = target === WebGL2RenderingContext.TEXTURE_2D ||
            target === WebGL2RenderingContext.TEXTURE_CUBE_MAP;
        if (!validTarget) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (levels < 1 || width < 1 || height < 1) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const maxLevels = Math.floor(Math.log2(Math.max(width, height))) + 1;
        if (levels > maxLevels) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const compressedInfo = this.compressedTextureFormatInfo(internalformat);
        let uploadFormat: { format: GLenum, type: GLenum };
        if (compressedInfo) {
            uploadFormat = { format: internalformat, type: WebGL2RenderingContext.UNSIGNED_BYTE };
        } else {
            try {
                uploadFormat = this.textureStorageUploadFormat(internalformat);
            } catch (_) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return;
            }
        }
        const texture = this.currentTexture(target);
        if (!texture) return;
        if (texture.immutableFormat) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this._der_flush();
        texture.texStorage2D(target, levels, internalformat, width, height,
            uploadFormat.format, uploadFormat.type, compressedInfo?.gpuFormat);
        this.markFramebufferContentChanged();
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("texStorage2D", target, levels, internalformat, width, height);
    }

    texSubImage2D(...args: Array<any>) {
        console.assert(args.length === 7 || args.length === 9 || args.length === 8 || args.length === 10);
        const target: GLenum = toWebGlInt32(args.at(0));
        const level: GLint = toWebGlInt32(args.at(1));
        const xoffset: GLint = toWebGlInt32(args.at(2));
        const yoffset: GLint = toWebGlInt32(args.at(3));
        let width: GLsizei;
        let height: GLsizei;
        let format: GLenum;
        let type: GLenum;
        let pixels: any;
        if (!this.validateTexImage2DTarget(target)) return;
        if (args.length === 7 || args.length === 8) {
            format = toWebGlInt32(args.at(4));
            type = toWebGlInt32(args.at(5));
            pixels = args.at(6);
            if (this.hydGlobalState.commonState.pixelUnpackBufferBinding) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            if (args.length === 8 && ArrayBuffer.isView(pixels)) {
                pixels = this.textureUploadViewFromElementOffset(pixels, args.at(7));
                if (!pixels) return;
            }
            const extent = this.resolveTexImageSourceExtent(pixels);
            if (!extent) {
                throw new Error("unsupported texSubImage2D: " + args);
            }
            width = extent.width;
            height = extent.height;
        } else {
            width = toWebGlInt32(args.at(4));
            height = toWebGlInt32(args.at(5));
            format = toWebGlInt32(args.at(6));
            type = toWebGlInt32(args.at(7));
            pixels = args.at(8);
            if (this.hydContextType !== "webgl2" && pixels !== null && !ArrayBuffer.isView(pixels)) {
                throw new TypeError("texSubImage2D pixels must be an ArrayBufferView or null");
            }
            if (typeof pixels === "number") {
                pixels = this.pixelUnpackBufferSlice(pixels, width, height, 1, format, type);
                if (!pixels) return;
            } else if (args.length === 10) {
                if (!ArrayBuffer.isView(pixels)) {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                    return;
                }
                pixels = this.textureUploadViewFromElementOffset(pixels, args.at(9));
                if (!pixels) return;
            }
        }
        if (level < 0 || xoffset < 0 || yoffset < 0 || width < 0 || height < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (!this.isKnownTextureFormat(format) || !this.isKnownTextureType(type)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (pixels === null) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (pixels instanceof HTMLCanvasElement) {
            pixels = hydCanvasContexts.get(pixels)?.prepareCanvasForTextureUpload() || pixels;
        }
        if (!this.textureUploadExtensionsAllow(format, type)) return;
        const texture = this.currentTexture(target);
        if (!texture) return;
        const image = texture.getImageState(target, level);
        if (!image) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (xoffset > image.width || yoffset > image.height ||
            width > image.width - xoffset || height > image.height - yoffset) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (image.format !== format ||
            !this.isSupportedTextureUploadFormat(image.internalFormat, format, type) ||
            (this.hydContextType !== "webgl2" && image.type !== type)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (!this.validateTextureUploadView(pixels, width, height, format, type)) return;
        const unpack: HydPixelUnpackState = this.hydGlobalState.miscState.unpackState;
        this._der_flush();
        try {
            texture.texSubImage2D(pixels, target, level, xoffset, yoffset, width, height, format, type, unpack);
        } catch (error) {
            if ((error as any)?.name === "SecurityError") throw error;
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this.markFramebufferContentChanged();
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("texSubImage2D", target, level, xoffset, yoffset, width, height, format, type);
    }

    texStorage3D(target: GLenum, levels: GLsizei, internalformat: GLenum, width: GLsizei, height: GLsizei, depth: GLsizei) {
        const validTarget = target === WebGL2RenderingContext.TEXTURE_3D ||
            target === WebGL2RenderingContext.TEXTURE_2D_ARRAY;
        if (!validTarget) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (levels < 1 || width < 1 || height < 1 || depth < 1) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const maxDimension = this.textureLimit(target === WebGL2RenderingContext.TEXTURE_3D
            ? WebGL2RenderingContext.MAX_3D_TEXTURE_SIZE
            : WebGL2RenderingContext.MAX_TEXTURE_SIZE);
        const maxDepth = target === WebGL2RenderingContext.TEXTURE_3D
            ? maxDimension
            : this.textureLimit(WebGL2RenderingContext.MAX_ARRAY_TEXTURE_LAYERS);
        if (width > maxDimension || height > maxDimension || depth > maxDepth) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const mipDimension = target === WebGL2RenderingContext.TEXTURE_3D
            ? Math.max(width, height, depth)
            : Math.max(width, height);
        const maxLevels = Math.floor(Math.log2(mipDimension)) + 1;
        if (levels > maxLevels) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const compressedInfo = this.compressedTextureFormatInfo(internalformat);
        if (compressedInfo && target === WebGL2RenderingContext.TEXTURE_3D) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        let uploadFormat: { format: GLenum, type: GLenum };
        if (compressedInfo) {
            uploadFormat = { format: internalformat, type: WebGL2RenderingContext.UNSIGNED_BYTE };
        } else {
            try {
                uploadFormat = this.textureStorageUploadFormat(internalformat);
            } catch (_) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return;
            }
        }
        const texture = this.currentTexture(target);
        if (!texture) return;
        if (texture.immutableFormat) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this._der_flush();
        texture.texStorage3D(
            target, levels, internalformat, width, height, depth,
            uploadFormat.format, uploadFormat.type, compressedInfo?.gpuFormat);
        this.markFramebufferContentChanged();
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("texStorage3D", target, levels, internalformat, width, height, depth);
    }

    texImage3D(...args: Array<any>) {
        console.assert(args.length === 10 || args.length === 11);
        const [target, level, internalformat, width, height, depth, border, format, type, rawPixels] = args;
        let pixels = rawPixels;
        const validTarget = target === WebGL2RenderingContext.TEXTURE_3D ||
            target === WebGL2RenderingContext.TEXTURE_2D_ARRAY;
        if (!validTarget) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (border !== 0 || !this.validateTexImage3DDimensions(target, level, width, height, depth)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (!this.isKnownTextureFormat(format) || !this.isKnownTextureType(type)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (!this.isKnownTextureInternalFormat(internalformat)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if ((typeof rawPixels === "number" || ArrayBuffer.isView(rawPixels)) &&
            (this.hydGlobalState.miscState.unpackFlipYWebGL ||
                this.hydGlobalState.miscState.unpackPremultiplyAlphaWebGL)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (pixels instanceof HTMLCanvasElement) {
            pixels = hydCanvasContexts.get(pixels)?.prepareCanvasForTextureUpload() || pixels;
        }
        if (typeof pixels === "number") {
            pixels = this.pixelUnpackBufferSlice(pixels, width, height, depth, format, type, true);
            if (!pixels) return;
        } else if (args.length === 11) {
            if (!ArrayBuffer.isView(pixels)) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            pixels = this.textureUploadViewFromElementOffset(pixels, args.at(10));
            if (!pixels) return;
        }
        if (!this.isSupportedTextureUploadFormat(internalformat, format, type)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (!this.validateTextureUploadView(pixels, width, height, format, type, depth, true)) return;
        const texture = this.currentTexture(target);
        if (!texture) return;
        if (texture.immutableFormat) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const unpack: HydPixelUnpackState = this.hydGlobalState.miscState.unpackState;
        this._der_flush();
        try {
            texture.texImage3D(pixels, target, level, internalformat, width, height, depth, border, format, type, 0, unpack);
        } catch (_) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this.markFramebufferContentChanged();
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("texImage3D", target, level, internalformat, width, height, depth, border, format, type);
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
        const validTarget = target === WebGL2RenderingContext.TEXTURE_3D ||
            target === WebGL2RenderingContext.TEXTURE_2D_ARRAY;
        if (!validTarget) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (level < 0 || xoffset < 0 || yoffset < 0 || zoffset < 0 ||
            width < 0 || height < 0 || depth < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (!this.isKnownTextureFormat(format) || !this.isKnownTextureType(type)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if ((typeof pixels === "number" || ArrayBuffer.isView(pixels)) &&
            (this.hydGlobalState.miscState.unpackFlipYWebGL ||
                this.hydGlobalState.miscState.unpackPremultiplyAlphaWebGL)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (pixels instanceof HTMLCanvasElement) {
            pixels = hydCanvasContexts.get(pixels)?.prepareCanvasForTextureUpload() || pixels;
        }
        if (typeof pixels === "number") {
            pixels = this.pixelUnpackBufferSlice(pixels, width, height, depth, format, type, true);
            if (!pixels) return;
        } else if (args.length === 12) {
            if (!ArrayBuffer.isView(pixels)) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            pixels = this.textureUploadViewFromElementOffset(pixels, args.at(11));
            if (!pixels) return;
        }
        if (!this.validateTextureUploadView(pixels, width, height, format, type, depth, true)) return;
        const texture = this.currentTexture(target);
        if (!texture) return;
        const image = texture.getImageState(target, level);
        if (!image) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (image.format !== format ||
            !this.isSupportedTextureUploadFormat(image.internalFormat, format, type)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (xoffset + width > image.width || yoffset + height > image.height ||
            zoffset + depth > image.depth) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const unpack: HydPixelUnpackState = this.hydGlobalState.miscState.unpackState;
        this._der_flush();
        try {
            texture.texSubImage3D(pixels, target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, unpack);
        } catch (_) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this.markFramebufferContentChanged();
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
        const levelParameter = this.hydContextType === "webgl2" &&
            (pname === WebGL2RenderingContext.TEXTURE_BASE_LEVEL ||
                pname === WebGL2RenderingContext.TEXTURE_MAX_LEVEL);
        const lodParameter = this.hydContextType === "webgl2" &&
            (pname === WebGL2RenderingContext.TEXTURE_MIN_LOD ||
                pname === WebGL2RenderingContext.TEXTURE_MAX_LOD) && Number.isFinite(param);
        if (levelParameter) {
            param = toWebGlInt32(param);
            if (param < 0) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                return;
            }
        }
        const compareModeParameter = this.hydContextType === "webgl2" &&
            pname === WebGL2RenderingContext.TEXTURE_COMPARE_MODE &&
            (param === WebGL2RenderingContext.NONE || param === WebGL2RenderingContext.COMPARE_REF_TO_TEXTURE);
        const compareFuncParameter = this.hydContextType === "webgl2" &&
            pname === WebGL2RenderingContext.TEXTURE_COMPARE_FUNC &&
            enumToCompareFunction.has(param);
        const valid = (pname === WebGL2RenderingContext.TEXTURE_MIN_FILTER && minFilters.has(param)) ||
            (pname === WebGL2RenderingContext.TEXTURE_MAG_FILTER && magFilters.has(param)) ||
            ((pname === WebGL2RenderingContext.TEXTURE_WRAP_S || pname === WebGL2RenderingContext.TEXTURE_WRAP_T ||
                (this.hydContextType === "webgl2" && pname === WebGL2RenderingContext.TEXTURE_WRAP_R)) && wrapModes.has(param)) ||
            levelParameter || lodParameter || compareModeParameter || compareFuncParameter;
        if (!valid) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        texture.texParameteri(pname, param);
        this.hydGlobalState.recordTransition("texParameteri", target, pname, param);
    }

    texParameterf(target: GLenum, pname: GLenum, param: GLfloat) {
        const integerLevel = this.hydContextType === "webgl2" &&
            (pname === WebGL2RenderingContext.TEXTURE_BASE_LEVEL ||
                pname === WebGL2RenderingContext.TEXTURE_MAX_LEVEL);
        this.texParameteri(target, pname, integerLevel ? Math.round(param) : param);
    }

    generateMipmap(target: GLenum) {
        const validTarget = target === WebGL2RenderingContext.TEXTURE_2D ||
            target === WebGL2RenderingContext.TEXTURE_CUBE_MAP ||
            (this.hydContextType === "webgl2" && (
                target === WebGL2RenderingContext.TEXTURE_3D ||
                target === WebGL2RenderingContext.TEXTURE_2D_ARRAY));
        if (!validTarget) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        const texture = this.currentTexture(target);
        if (!texture) return;
        const baseLevel = texture.webglParameters.get(WebGL2RenderingContext.TEXTURE_BASE_LEVEL) || 0;
        const maxLevel = texture.webglParameters.get(WebGL2RenderingContext.TEXTURE_MAX_LEVEL) ?? 1000;
        if (baseLevel > maxLevel) {
            this.hydGlobalState.recordTransition("generateMipmap", target, "empty-range");
            return;
        }
        const baseTarget = target === WebGL2RenderingContext.TEXTURE_CUBE_MAP
            ? WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X
            : target;
        const baseImage = texture.getImageState(baseTarget, baseLevel);
        const powerOfTwo = (value: number) => value > 0 && (value & (value - 1)) === 0;
        if (!baseImage || baseImage.width <= 0 || baseImage.height <= 0 ||
            (this.hydContextType !== "webgl2" &&
                (baseImage.internalFormat === GL_SRGB_EXT || baseImage.internalFormat === GL_SRGB_ALPHA_EXT)) ||
            (target === WebGL2RenderingContext.TEXTURE_CUBE_MAP && !texture.isCubeCompleteAtLevel(baseLevel)) ||
            (this.hydContextType !== "webgl2" && (!powerOfTwo(baseImage.width) || !powerOfTwo(baseImage.height))) ||
            !texture.generateMipmap(target)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this.markFramebufferContentChanged();
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
            (this.hydContextType === "webgl2" && (pname === WebGL2RenderingContext.TEXTURE_WRAP_R ||
                pname === WebGL2RenderingContext.TEXTURE_BASE_LEVEL ||
                pname === WebGL2RenderingContext.TEXTURE_MAX_LEVEL ||
                pname === WebGL2RenderingContext.TEXTURE_MIN_LOD ||
                pname === WebGL2RenderingContext.TEXTURE_MAX_LOD ||
                pname === WebGL2RenderingContext.TEXTURE_COMPARE_MODE ||
                pname === WebGL2RenderingContext.TEXTURE_COMPARE_FUNC ||
                pname === WebGL2RenderingContext.TEXTURE_IMMUTABLE_FORMAT ||
                pname === WebGL2RenderingContext.TEXTURE_IMMUTABLE_LEVELS));
        if (!validPname) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        if (pname === WebGL2RenderingContext.TEXTURE_IMMUTABLE_FORMAT) return texture.immutableFormat;
        if (pname === WebGL2RenderingContext.TEXTURE_IMMUTABLE_LEVELS) return texture.immutableLevels;
        return texture.webglParameters.get(pname);
    }

    viewport(x: GLint, y: GLint, width: GLsizei, height: GLsizei) {
        if (width < 0 || height < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        width = Math.min(width, this.maxDrawingBufferDimension);
        height = Math.min(height, this.maxDrawingBufferDimension);
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
        if (width < 0 || height < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const scissorBox = this.hydGlobalState.miscState.scissorBox;
        if (scissorBox[0] !== x || scissorBox[1] !== y || scissorBox[2] !== width || scissorBox[3] !== height) {
            this._der_flush();
            this.gpuScissorDirty = true;
        }
        this.hydGlobalState.miscState.scissorBox = [x, y, width, height];
        this.hydGlobalState.recordTransition("scissor", x, y, width, height);
    }

    depthRange(zNear: number, zFar: number) {
        if (zNear > zFar) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        zNear = clampWebGlUnitFloat(zNear);
        zFar = clampWebGlUnitFloat(zFar);
        const viewport = this.hydGlobalState.commonState.viewport;
        if (viewport[4] !== zNear || viewport[5] !== zFar) {
            this._der_flush();
            this.gpuViewportDirty = true;
        }
        this.hydGlobalState.commonState.viewport[4] = zNear;
        this.hydGlobalState.commonState.viewport[5] = zFar;
        this.hydGlobalState.depthState.range = [zNear, zFar];
        this.hydGlobalState.recordTransition("depthRange", zNear, zFar);
    }

    vertexAttribDivisor(index: GLuint, divisor: GLuint) {
        index = Number(index) >>> 0;
        divisor = Number(divisor) >>> 0;
        const attribute = this.hydGlobalState.commonState.vertexArrayBinding.attributes[index];
        if (!attribute) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (attribute.divisor === divisor) return;
        attribute.divisor = divisor;
        attribute.updateHash();
        this.hydGlobalState.recordTransition("vertexAttribDivisor", index, divisor);
    }

    vertexAttribPointer(index: GLuint, size: GLint, type: GLenum, normalized: GLboolean, _stride: GLsizei, offset: GLintptr) {
        const repeatAttribute = this.hydGlobalState.commonState.vertexArrayBinding.attributes[index as number];
        const repeatBuffer = this.hydGlobalState.commonState.arrayBufferBinding;
        if (repeatAttribute && repeatBuffer && repeatAttribute.int === false &&
            repeatAttribute.size === size && repeatAttribute.type === type &&
            repeatAttribute.normalized === Boolean(normalized) && repeatAttribute.webglStride === _stride &&
            repeatAttribute.offset === offset && repeatAttribute.buffer === repeatBuffer) {
            return;
        }
        index = Number(index) >>> 0;
        size = toWebGlInt32(size);
        type = Number(type) >>> 0;
        _stride = toWebGlInt32(_stride);
        offset = toWebGlInt64(offset);
        const attribute = this.hydGlobalState.commonState.vertexArrayBinding.attributes[index];
        if (!attribute) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const componentBytes = vertexComponentByteSize(type);
        const packed = type === WebGL2RenderingContext.INT_2_10_10_10_REV ||
            type === WebGL2RenderingContext.UNSIGNED_INT_2_10_10_10_REV;
        const webgl1Type = type === WebGL2RenderingContext.BYTE || type === WebGL2RenderingContext.UNSIGNED_BYTE ||
            type === WebGL2RenderingContext.SHORT || type === WebGL2RenderingContext.UNSIGNED_SHORT ||
            type === WebGL2RenderingContext.FLOAT;
        const validType = webgl1Type || (this.hydContextType === "webgl2" &&
            (type === WebGL2RenderingContext.HALF_FLOAT || type === WebGL2RenderingContext.INT ||
                type === WebGL2RenderingContext.UNSIGNED_INT || packed));
        if (!validType) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (packed && size !== 4) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (size < 1 || size > 4 || _stride < 0 || _stride > 255 || offset < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if ((offset % componentBytes) !== 0 || (_stride % componentBytes) !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        normalized = Boolean(normalized);
        const buffer = this.hydGlobalState.commonState.arrayBufferBinding;
        if (!buffer && offset !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const stride = _stride || (packed ? 4 : size * componentBytes);

        if (attribute.int !== false || attribute.size !== size || attribute.type !== type || attribute.normalized !== normalized ||
            attribute.stride !== stride || attribute.webglStride !== _stride ||
            attribute.offset !== offset || attribute.buffer !== buffer) {
            const formatChanged = attribute.int !== false || attribute.size !== size ||
                attribute.type !== type || attribute.normalized !== normalized;
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
                if (vertexFormatNeedsFloatConversion(type, size, normalized)) {
                    attribute.format = null;
                } else try {
                    attribute.format = getVertexFormat(type, size, normalized);
                } catch (_) {
                    attribute.format = null;
                }
            }
            attribute.updateHash();
            this.hydGlobalState.recordTransition(
                "vertexAttribPointer",
                index,
                size,
                type,
                normalized,
                stride,
                offset,
                buffer?.hash || "null",
            );
        }
    }

    vertexAttribIPointer(index: GLuint, size: GLint, type: GLenum, stride: GLsizei, offset: GLintptr) {
        if (this.hydContextType !== "webgl2") {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        index = Number(index) >>> 0;
        size = toWebGlInt32(size);
        type = Number(type) >>> 0;
        stride = toWebGlInt32(stride);
        offset = toWebGlInt64(offset);
        const attribute = this.hydGlobalState.commonState.vertexArrayBinding.attributes[index];
        if (!attribute) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const validType = type === WebGL2RenderingContext.BYTE ||
            type === WebGL2RenderingContext.UNSIGNED_BYTE ||
            type === WebGL2RenderingContext.SHORT ||
            type === WebGL2RenderingContext.UNSIGNED_SHORT ||
            type === WebGL2RenderingContext.INT ||
            type === WebGL2RenderingContext.UNSIGNED_INT;
        if (!validType) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (size < 1 || size > 4 || stride < 0 || stride > 255 || offset < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const componentBytes = vertexComponentByteSize(type);
        if (offset % componentBytes !== 0 || stride % componentBytes !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const buffer = this.hydGlobalState.commonState.arrayBufferBinding;
        if (!buffer && offset !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const effectiveStride = stride || size * componentBytes;
        if (attribute.size === size && attribute.type === type && attribute.int === true &&
            attribute.webglStride === stride && attribute.offset === offset && attribute.buffer === buffer) return;
        attribute.size = size;
        attribute.type = type;
        attribute.normalized = false;
        attribute.int = true;
        attribute.stride = effectiveStride;
        attribute.webglStride = stride;
        attribute.offset = offset;
        attribute.buffer = buffer;
        attribute.shaderLocation = index;
        // Integer data is converted to tightly packed 32-bit values. This also
        // handles WebGL strides that are not legal WebGPU array strides.
        attribute.format = null;
        attribute.updateHash();
        this.hydGlobalState.recordTransition(
            "vertexAttribIPointer",
            index,
            size,
            type,
            effectiveStride,
            offset,
            buffer?.hash || "null",
        );
    }

    private xxable(cap: GLenum, value: boolean): boolean {
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
            case WebGL2RenderingContext.SAMPLE_COVERAGE:
                this.hydGlobalState.miscState.sampleCoverage = value;
                break;
            case WebGL2RenderingContext.DITHER:
                this.hydGlobalState.miscState.dither = value;
                break;
            case WebGL2RenderingContext.RASTERIZER_DISCARD:
                if (this.hydContextType !== "webgl2") {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                    return false;
                }
                this.hydGlobalState.miscState.rasterizerDiscard = value;
                break;
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return false;
        }
        return true;
    }

    enable(cap: GLenum) {
        if (this.xxable(cap, true)) {
            this.hydGlobalState.recordTransition("enable", cap);
        }
    }

    disable(cap: GLenum) {
        if (this.xxable(cap, false)) {
            this.hydGlobalState.recordTransition("disable", cap);
        }
    }

    isEnabled(cap: GLenum): boolean {
        switch (cap) {
            case WebGL2RenderingContext.DEPTH_TEST:
                return this.hydGlobalState.depthState.enabled;
            case WebGL2RenderingContext.STENCIL_TEST:
                return this.hydGlobalState.stencilState.enabled;
            case WebGL2RenderingContext.CULL_FACE:
                return this.hydGlobalState.polygonState.cullFace;
            case WebGL2RenderingContext.BLEND:
                return this.hydGlobalState.blendState.enabled;
            case WebGL2RenderingContext.SCISSOR_TEST:
                return this.hydGlobalState.miscState.scissorTest;
            case WebGL2RenderingContext.POLYGON_OFFSET_FILL:
                return this.hydGlobalState.polygonState.polygonOffsetFill;
            case WebGL2RenderingContext.SAMPLE_ALPHA_TO_COVERAGE:
                return this.hydGlobalState.miscState.sampleAlphaToCoverage;
            case WebGL2RenderingContext.SAMPLE_COVERAGE:
                return this.hydGlobalState.miscState.sampleCoverage;
            case WebGL2RenderingContext.DITHER:
                return this.hydGlobalState.miscState.dither;
            case WebGL2RenderingContext.RASTERIZER_DISCARD:
                if (this.hydContextType === "webgl2") return this.hydGlobalState.miscState.rasterizerDiscard;
                break;
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return false;
        }
    }


    blendFunc(sfactor: GLenum, dfactor: GLenum) {
        const src = enumToBlendFactors.get(sfactor);
        const dst = enumToBlendFactors.get(dfactor);
        if (!src || !dst) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (mixesConstantColorAndAlpha(sfactor, dfactor)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this.hydGlobalState.blendState.srcRGB = src;
        this.hydGlobalState.blendState.srcAlpha = src;
        this.hydGlobalState.blendState.dstRGB = dst;
        this.hydGlobalState.blendState.dstAlpha = dst;
        this.hydGlobalState.blendState.srcRGBEnum = sfactor;
        this.hydGlobalState.blendState.srcAlphaEnum = sfactor;
        this.hydGlobalState.blendState.dstRGBEnum = dfactor;
        this.hydGlobalState.blendState.dstAlphaEnum = dfactor;
        this.hydGlobalState.recordTransition("blendFunc", sfactor, dfactor);
    }

    blendColor(r: GLfloat, g: GLfloat, b: GLfloat, a: GLfloat) {
        r = clampWebGlUnitFloat(r);
        g = clampWebGlUnitFloat(g);
        b = clampWebGlUnitFloat(b);
        a = clampWebGlUnitFloat(a);
        this.hydGlobalState.blendState.color = [r, g, b, a];
        this.hydGlobalState.recordTransition("blendColor", r, g, b, a);
    }

    blendFuncSeparate(srcRGB: GLenum, dstRGB: GLenum, srcAlpha: GLenum, dstAlpha: GLenum) {
        const srcRGB1 = enumToBlendFactors.get(srcRGB);
        const dstRGB1 = enumToBlendFactors.get(dstRGB);
        const srcAlpha1 = enumToBlendFactors.get(srcAlpha);
        const dstAlpha1 = enumToBlendFactors.get(dstAlpha);
        if (!srcRGB1 || !dstRGB1 || !srcAlpha1 || !dstAlpha1) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (mixesConstantColorAndAlpha(srcRGB, dstRGB) || mixesConstantColorAndAlpha(srcAlpha, dstAlpha)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this.hydGlobalState.blendState.srcRGB = srcRGB1;
        this.hydGlobalState.blendState.srcAlpha = srcAlpha1;
        this.hydGlobalState.blendState.dstRGB = dstRGB1;
        this.hydGlobalState.blendState.dstAlpha = dstAlpha1;
        this.hydGlobalState.blendState.srcRGBEnum = srcRGB;
        this.hydGlobalState.blendState.srcAlphaEnum = srcAlpha;
        this.hydGlobalState.blendState.dstRGBEnum = dstRGB;
        this.hydGlobalState.blendState.dstAlphaEnum = dstAlpha;
        this.hydGlobalState.recordTransition("blendFuncSeparate", srcRGB, dstRGB, srcAlpha, dstAlpha);
    }

    blendEquation(mode: GLenum) {
        const op = enumToBlendOperations.get(mode);
        const extensionMinMax = this.enabledExtensions.has("EXT_BLEND_MINMAX");
        if (!op || (this.hydContextType !== "webgl2" &&
            (mode === WebGL2RenderingContext.MIN || mode === WebGL2RenderingContext.MAX) && !extensionMinMax)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        this.hydGlobalState.blendState.equationRGB = op;
        this.hydGlobalState.blendState.equationAlpha = op;
        this.hydGlobalState.blendState.equationRGBEnum = mode;
        this.hydGlobalState.blendState.equationAlphaEnum = mode;
        this.hydGlobalState.recordTransition("blendEquation", mode);
    }

    blendEquationSeparate(modeRGB: GLenum, modeAlpha: GLenum) {
        const rgbOp = enumToBlendOperations.get(modeRGB);
        const alphaOp = enumToBlendOperations.get(modeAlpha);
        const extensionMinMax = this.enabledExtensions.has("EXT_BLEND_MINMAX");
        const webgl1MinMax = this.hydContextType !== "webgl2" && !extensionMinMax &&
            (modeRGB === WebGL2RenderingContext.MIN || modeRGB === WebGL2RenderingContext.MAX ||
                modeAlpha === WebGL2RenderingContext.MIN || modeAlpha === WebGL2RenderingContext.MAX);
        if (!rgbOp || !alphaOp || webgl1MinMax) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        this.hydGlobalState.blendState.equationRGB = rgbOp;
        this.hydGlobalState.blendState.equationAlpha = alphaOp;
        this.hydGlobalState.blendState.equationRGBEnum = modeRGB;
        this.hydGlobalState.blendState.equationAlphaEnum = modeAlpha;
        this.hydGlobalState.recordTransition("blendEquationSeparate", modeRGB, modeAlpha);
    }

    stencilFunc(func: GLenum, ref: GLint, mask: GLuint) {
        const compare = enumToCompareFunction.get(func);
        if (!compare) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        this.hydGlobalState.stencilState.frontFunc = compare;
        this.hydGlobalState.stencilState.frontFuncEnum = func;
        this.hydGlobalState.stencilState.frontRef = ref;
        this.hydGlobalState.stencilState.frontValueMask = mask >>> 0;
        this.hydGlobalState.stencilState.backFunc = compare;
        this.hydGlobalState.stencilState.backFuncEnum = func;
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
                this.hydGlobalState.stencilState.frontFuncEnum = func;
                this.hydGlobalState.stencilState.frontRef = ref;
                this.hydGlobalState.stencilState.frontValueMask = valueMask;
                break;
            case WebGL2RenderingContext.BACK:
                this.hydGlobalState.stencilState.backFunc = compare;
                this.hydGlobalState.stencilState.backFuncEnum = func;
                this.hydGlobalState.stencilState.backRef = ref;
                this.hydGlobalState.stencilState.backValueMask = valueMask;
                break;
            case WebGL2RenderingContext.FRONT_AND_BACK:
                this.hydGlobalState.stencilState.frontFunc = compare;
                this.hydGlobalState.stencilState.frontFuncEnum = func;
                this.hydGlobalState.stencilState.frontRef = ref;
                this.hydGlobalState.stencilState.frontValueMask = valueMask;
                this.hydGlobalState.stencilState.backFunc = compare;
                this.hydGlobalState.stencilState.backFuncEnum = func;
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
        const failOp = enumToStencilOperation.get(fail);
        const depthFailOp = enumToStencilOperation.get(zfail);
        const passOp = enumToStencilOperation.get(zpass);
        if (!failOp || !depthFailOp || !passOp) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        this.hydGlobalState.stencilState.frontFail = failOp;
        this.hydGlobalState.stencilState.frontFailEnum = fail;
        this.hydGlobalState.stencilState.frontPassDepthFail = depthFailOp;
        this.hydGlobalState.stencilState.frontPassDepthFailEnum = zfail;
        this.hydGlobalState.stencilState.frontPassDepthPass = passOp;
        this.hydGlobalState.stencilState.frontPassDepthPassEnum = zpass;
        this.hydGlobalState.stencilState.backFail = failOp;
        this.hydGlobalState.stencilState.backFailEnum = fail;
        this.hydGlobalState.stencilState.backPassDepthFail = depthFailOp;
        this.hydGlobalState.stencilState.backPassDepthFailEnum = zfail;
        this.hydGlobalState.stencilState.backPassDepthPass = passOp;
        this.hydGlobalState.stencilState.backPassDepthPassEnum = zpass;
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
                this.hydGlobalState.stencilState.frontFailEnum = fail;
                this.hydGlobalState.stencilState.frontPassDepthFail = depthFailOp;
                this.hydGlobalState.stencilState.frontPassDepthFailEnum = zfail;
                this.hydGlobalState.stencilState.frontPassDepthPass = passOp;
                this.hydGlobalState.stencilState.frontPassDepthPassEnum = zpass;
                break;
            case WebGL2RenderingContext.BACK:
                this.hydGlobalState.stencilState.backFail = failOp;
                this.hydGlobalState.stencilState.backFailEnum = fail;
                this.hydGlobalState.stencilState.backPassDepthFail = depthFailOp;
                this.hydGlobalState.stencilState.backPassDepthFailEnum = zfail;
                this.hydGlobalState.stencilState.backPassDepthPass = passOp;
                this.hydGlobalState.stencilState.backPassDepthPassEnum = zpass;
                break;
            case WebGL2RenderingContext.FRONT_AND_BACK:
                this.hydGlobalState.stencilState.frontFail = failOp;
                this.hydGlobalState.stencilState.frontFailEnum = fail;
                this.hydGlobalState.stencilState.frontPassDepthFail = depthFailOp;
                this.hydGlobalState.stencilState.frontPassDepthFailEnum = zfail;
                this.hydGlobalState.stencilState.frontPassDepthPass = passOp;
                this.hydGlobalState.stencilState.frontPassDepthPassEnum = zpass;
                this.hydGlobalState.stencilState.backFail = failOp;
                this.hydGlobalState.stencilState.backFailEnum = fail;
                this.hydGlobalState.stencilState.backPassDepthFail = depthFailOp;
                this.hydGlobalState.stencilState.backPassDepthFailEnum = zfail;
                this.hydGlobalState.stencilState.backPassDepthPass = passOp;
                this.hydGlobalState.stencilState.backPassDepthPassEnum = zpass;
                break;
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return;
        }
        this.hydGlobalState.recordTransition("stencilOpSeparate", face, fail, zfail, zpass);
    }

    bindFramebuffer(target: GLenum, framebuffer: HydFramebuffer | null) {
        if (!this.validateFramebufferTarget(target)) return;
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
        }
        this.hydGlobalState.recordTransition("bindFramebuffer", target, framebuffer.hash);
    }

    private validateFramebufferAttachmentPoint(attachment: GLenum): boolean {
        if (attachment === WebGL2RenderingContext.DEPTH_ATTACHMENT ||
            attachment === WebGL2RenderingContext.STENCIL_ATTACHMENT ||
            attachment === WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT) {
            return true;
        }
        const maxColorAttachments = Number(
            enumToConstant.get(WebGL2RenderingContext.MAX_COLOR_ATTACHMENTS)) || 1;
        if (attachment >= WebGL2RenderingContext.COLOR_ATTACHMENT0 &&
            attachment < WebGL2RenderingContext.COLOR_ATTACHMENT0 + maxColorAttachments) {
            return true;
        }
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
        return false;
    }

    framebufferTexture2D(target: GLenum, attachment: GLenum, texTarget: GLenum, texture: HydTexture | null, level: GLint) {
        if (!this.validateFramebufferTarget(target)) return;
        if (!this.validateFramebufferAttachmentPoint(attachment)) return;
        const validTextureTarget = texTarget === WebGL2RenderingContext.TEXTURE_2D || this.isCubeFaceTarget(texTarget);
        if (!validTextureTarget) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        const maxDimension = Number(enumToConstant.get(
            this.isCubeFaceTarget(texTarget)
                ? WebGL2RenderingContext.MAX_CUBE_MAP_TEXTURE_SIZE
                : WebGL2RenderingContext.MAX_TEXTURE_SIZE,
        )) || 4096;
        if (texture !== null && (level < 0 || level > Math.floor(Math.log2(maxDimension)))) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (this.hydContextType !== "webgl2" && level !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (this.hydContextType !== "webgl2" &&
            attachment >= WebGL2RenderingContext.COLOR_ATTACHMENT1 &&
            attachment <= WebGL2RenderingContext.COLOR_ATTACHMENT15 &&
            !this.enabledExtensions.has("WEBGL_DRAW_BUFFERS")) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (texture !== null && !this.isTexture(texture)) {
            if (texture instanceof HydTexture && texture.ownerToken === this.contextToken) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            this.setObjectValidationError(texture);
            return;
        }
        if (texture !== null) {
            const expectedBindingTarget = this.isCubeFaceTarget(texTarget)
                ? WebGL2RenderingContext.TEXTURE_CUBE_MAP
                : WebGL2RenderingContext.TEXTURE_2D;
            if (texture.bindingTarget !== expectedBindingTarget) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
        }
        this._der_flush();
        const framebuffer = this.getFramebufferForTarget(target);
        if (framebuffer === this.hydGlobalState.defaultFramebuffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (texture === null) {
            this.setFramebufferAttachment(framebuffer, attachment, null);
            framebuffer.resetHash();
            this.gpuViewportDirty = true;
            this.gpuScissorDirty = true;
            this.hydGlobalState.recordTransition("framebufferTexture2D", target, attachment, texTarget, "null", level);
            return;
        }

        const attrib = new FramebufferAttributes(attachment, level, texTarget, texture);
        texture.onStorageChange.push(() => {
            if (framebuffer.attachments.get(attachment) === attrib) framebuffer.resetHash();
        });
        texture.onDelete.push(() => {
            if (this.isFramebufferBound(framebuffer) && framebuffer.attachments.get(attachment) === attrib) {
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

        this.setFramebufferAttachment(framebuffer, attachment, attrib);
        framebuffer.resetHash();
        this.gpuViewportDirty = true;
        this.gpuScissorDirty = true;
        this.hydGlobalState.recordTransition("framebufferTexture2D", target, attachment, texTarget, texture.hash, level);
    }

    framebufferTextureLayer(target: GLenum, attachment: GLenum, texture: HydTexture | null, level: GLint, layer: GLint) {
        if (!this.validateFramebufferTarget(target)) return;
        if (!this.validateFramebufferAttachmentPoint(attachment)) return;
        if (texture !== null && !this.isTexture(texture)) {
            if (texture instanceof HydTexture && texture.ownerToken === this.contextToken) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            this.setObjectValidationError(texture);
            return;
        }
        if (texture !== null) {
            if (texture.viewDimension !== "3d" && texture.viewDimension !== "2d-array") {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            const maxDimension = this.textureLimit(
                texture.viewDimension === "3d"
                    ? WebGL2RenderingContext.MAX_3D_TEXTURE_SIZE
                    : WebGL2RenderingContext.MAX_TEXTURE_SIZE);
            const maxLayers = this.textureLimit(
                texture.viewDimension === "3d"
                    ? WebGL2RenderingContext.MAX_3D_TEXTURE_SIZE
                    : WebGL2RenderingContext.MAX_ARRAY_TEXTURE_LAYERS);
            if (level < 0 || level > Math.floor(Math.log2(maxDimension)) || layer < 0 || layer >= maxLayers) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                return;
            }
        }
        this._der_flush();
        const framebuffer = this.getFramebufferForTarget(target);
        if (framebuffer === this.hydGlobalState.defaultFramebuffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (texture === null) {
            this.setFramebufferAttachment(framebuffer, attachment, null);
            framebuffer.resetHash();
            this.gpuViewportDirty = true;
            this.gpuScissorDirty = true;
            this.hydGlobalState.recordTransition("framebufferTextureLayer", target, attachment, "null", level, layer);
            return;
        }

        const attrib = new FramebufferAttributes(attachment, level, undefined, texture, layer);
        texture.onStorageChange.push(() => {
            if (framebuffer.attachments.get(attachment) === attrib) framebuffer.resetHash();
        });
        texture.onDelete.push(() => {
            if (this.isFramebufferBound(framebuffer) && framebuffer.attachments.get(attachment) === attrib) {
                framebuffer.attachments.delete(attachment);
                framebuffer.resetHash();
            }
        });
        this.setFramebufferAttachment(framebuffer, attachment, attrib);
        framebuffer.resetHash();
        this.gpuViewportDirty = true;
        this.gpuScissorDirty = true;
        this.hydGlobalState.recordTransition("framebufferTextureLayer", target, attachment, texture.hash, level, layer);
    }

    framebufferRenderbuffer(target: GLenum, attachment: GLenum, renderbufferTarget: GLenum, renderbuffer: HydTexture | null) {
        if (!this.validateFramebufferTarget(target)) return;
        if (!this.validateFramebufferAttachmentPoint(attachment)) return;
        if (this.hydContextType !== "webgl2" &&
            attachment >= WebGL2RenderingContext.COLOR_ATTACHMENT1 &&
            attachment <= WebGL2RenderingContext.COLOR_ATTACHMENT15 &&
            !this.enabledExtensions.has("WEBGL_DRAW_BUFFERS")) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (renderbuffer !== null && !this.isRenderbuffer(renderbuffer)) {
            if (renderbuffer instanceof HydTexture && renderbuffer.ownerToken === this.contextToken) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            this.setObjectValidationError(renderbuffer);
            return;
        }
        if (renderbufferTarget !== WebGL2RenderingContext.RENDERBUFFER) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        this._der_flush();
        const framebuffer = this.getFramebufferForTarget(target);
        if (framebuffer === this.hydGlobalState.defaultFramebuffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (renderbuffer === null) {
            this.setFramebufferAttachment(framebuffer, attachment, null);
            framebuffer.resetHash();
            this.gpuViewportDirty = true;
            this.gpuScissorDirty = true;
            this.hydGlobalState.recordTransition("framebufferRenderbuffer", target, attachment, renderbufferTarget, "null");
            return;
        }

        const attrib: FramebufferAttributes = new FramebufferAttributes(attachment, undefined, undefined, renderbuffer, undefined, WebGL2RenderingContext.RENDERBUFFER);
        renderbuffer.onStorageChange.push(() => {
            if (framebuffer.attachments.get(attachment) === attrib) framebuffer.resetHash();
        });
        renderbuffer.onDelete.push(() => {
            if (this.isFramebufferBound(framebuffer) && framebuffer.attachments.get(attachment) === attrib) {
                framebuffer.attachments.delete(attachment);
                framebuffer.resetHash();
            }
        });
        this.setFramebufferAttachment(framebuffer, attachment, attrib);
        framebuffer.resetHash();
        this.gpuViewportDirty = true;
        this.gpuScissorDirty = true;
        this.hydGlobalState.recordTransition("framebufferRenderbuffer", target, attachment, renderbufferTarget, renderbuffer.hash);
    }

    private framebufferColorSurface(framebuffer: HydFramebuffer, read: boolean): {
        texture: GPUTexture,
        view: GPUTextureView,
        depthSlice?: number,
        format: GPUTextureFormat,
        width: number,
        height: number,
        sampleCount: number,
        hasAlpha: boolean,
        colorBits: [number, number, number, number],
        srgb: boolean,
        isDefault: boolean,
        attachment: FramebufferAttributes | null,
    } | null {
        if (framebuffer === this.hydGlobalState.defaultFramebuffer) {
            this.ensureDefaultFramebufferRenderTarget();
            return {
                texture: this.hydGlobalState.__canvasTexture,
                view: this.hydGlobalState.__canvasView,
                format: "bgra8unorm",
                width: this.hydCanvas.width,
                height: this.hydCanvas.height,
                sampleCount: 1,
                hasAlpha: this.hydGlobalState.contextAttributes.alpha !== false,
                colorBits: this.hydGlobalState.contextAttributes.alpha === false
                    ? [8, 8, 8, 0]
                    : [8, 8, 8, 8],
                srgb: this.drawingBufferFormat === WebGL2RenderingContext.SRGB8_ALPHA8,
                isDefault: true,
                attachment: null,
            };
        }
        const attachmentPoint = read
            ? framebuffer.readBuffer
            : framebuffer.drawBuffers.find((value) =>
                value >= WebGL2RenderingContext.COLOR_ATTACHMENT0 &&
                value <= WebGL2RenderingContext.COLOR_ATTACHMENT15);
        if (attachmentPoint === undefined || attachmentPoint === WebGL2RenderingContext.NONE) return null;
        const attachment = framebuffer.attachments.get(attachmentPoint);
        if (!attachment) return null;
        return {
            texture: attachment.attachment.texture,
            view: attachment.view,
            depthSlice: attachment.depthSlice,
            format: attachment.format,
            width: attachment.width,
            height: attachment.height,
            sampleCount: attachment.sampleCount,
            hasAlpha: attachment.colorBits[3] > 0,
            colorBits: attachment.colorBits,
            srgb: attachment.format.endsWith("-srgb"),
            isDefault: false,
            attachment,
        };
    }

    private colorBlitScalar(format: GPUTextureFormat): "f32" | "i32" | "u32" {
        if (format.endsWith("sint")) return "i32";
        if (format.endsWith("uint")) return "u32";
        return "f32";
    }

    private colorBlitFormatClass(surface: ReturnType<HydWebGLStatic["framebufferColorSurface"]>): string {
        return `${this.colorBlitScalar(surface.format)}:${surface.srgb ? "srgb" : "linear"}:` +
            surface.colorBits.join(",");
    }

    private getColorBlitPipeline(
        sourceFormat: GPUTextureFormat,
        destinationFormat: GPUTextureFormat,
        sampleCount: number,
        linear: boolean,
        sourceFlipped: boolean,
        conversion: "identity" | "rgb" | "alpha" | "luminance" | "luminance-alpha" = "identity",
    ): GPURenderPipeline | null {
        const sourceScalar = this.colorBlitScalar(sourceFormat);
        const destinationScalar = this.colorBlitScalar(destinationFormat);
        if (sourceScalar !== destinationScalar || (linear && sourceScalar !== "f32") ||
            (conversion !== "identity" && conversion !== "rgb" && sourceScalar !== "f32")) {
            return null;
        }
        const key = `${sourceScalar}:${destinationFormat}:samples=${sampleCount}:` +
            `${linear ? "linear" : "nearest"}:${sourceFlipped ? "flipped" : "uploaded"}:${conversion}`;
        const cached = this.colorBlitPipelines.get(key);
        if (cached) return cached;

        const vectorType = `vec4<${sourceScalar}>`;
        const sourceDeclaration = sampleCount > 1
            ? `@group(0) @binding(0) var source : texture_multisampled_2d<${sourceScalar}>;\n` +
                `@group(0) @binding(1) var<uniform> params : BlitParams;`
            : linear
                ? `@group(0) @binding(0) var source : texture_2d<${sourceScalar}>;\n` +
                    `@group(0) @binding(1) var sourceSampler : sampler;\n` +
                    `@group(0) @binding(2) var<uniform> params : BlitParams;`
                : `@group(0) @binding(0) var source : texture_2d<${sourceScalar}>;\n` +
                    `@group(0) @binding(1) var<uniform> params : BlitParams;`;
        let sampleExpression: string;
        if (sampleCount > 1 && sourceScalar === "f32") {
            sampleExpression = `
  var sampled = vec4f(0.0);
  for (var sampleIndex = 0; sampleIndex < ${sampleCount}; sampleIndex++) {
    sampled += textureLoad(source, sourceTexel, sampleIndex);
  }
  sampled /= ${sampleCount}.0;`;
        } else if (sampleCount > 1) {
            sampleExpression = `let sampled = textureLoad(source, sourceTexel, 0);`;
        } else if (linear) {
            sampleExpression = `let sampled = textureSample(source, sourceSampler, sourceGpu / params.sizes.xy);`;
        } else {
            sampleExpression = `let sampled = textureLoad(source, sourceTexel, 0);`;
        }
        const scalarOne = sourceScalar === "f32" ? "1.0" : sourceScalar === "i32" ? "1i" : "1u";
        const convertedSample = conversion === "rgb"
            ? `${vectorType}(sampled.rgb, ${scalarOne})`
            : conversion === "alpha"
            ? "vec4f(0.0, 0.0, 0.0, sampled.a)"
            : conversion === "luminance"
                ? "vec4f(sampled.r, sampled.r, sampled.r, 1.0)"
                : conversion === "luminance-alpha"
                    ? "vec4f(sampled.r, sampled.r, sampled.r, sampled.a)"
                    : "sampled";
        const module = this.hydDevice.createShaderModule({
            label: `blitFramebuffer shader ${key}`,
            code: `
struct BlitParams {
  sizes : vec4f,
  sourceRect : vec4f,
  destinationRect : vec4f,
};
${sourceDeclaration}

@vertex
fn vertexMain(@builtin(vertex_index) index : u32) -> @builtin(position) vec4f {
  let positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  return vec4f(positions[index], 0.0, 1.0);
}

@fragment
fn fragmentMain(@builtin(position) position : vec4f) -> @location(0) ${vectorType} {
  let destinationGl = vec2f(position.x, params.sizes.w - position.y);
  let interpolation = (destinationGl - params.destinationRect.xy) /
      (params.destinationRect.zw - params.destinationRect.xy);
  let sourceGl = params.sourceRect.xy + interpolation *
      (params.sourceRect.zw - params.sourceRect.xy);
  if (sourceGl.x < 0.0 || sourceGl.y < 0.0 ||
      sourceGl.x >= params.sizes.x || sourceGl.y >= params.sizes.y) {
    discard;
  }
  let sourceGpu = vec2f(sourceGl.x, ${sourceFlipped ? "params.sizes.y - sourceGl.y" : "sourceGl.y"});
  let sourceTexel = clamp(vec2i(floor(sourceGpu)), vec2i(0), vec2i(params.sizes.xy) - vec2i(1));
  ${sampleExpression}
  return ${convertedSample};
}
`,
        });
        const pipeline = this.hydDevice.createRenderPipeline({
            label: `blitFramebuffer pipeline ${key}`,
            layout: "auto",
            vertex: { module, entryPoint: "vertexMain" },
            fragment: { module, entryPoint: "fragmentMain", targets: [{ format: destinationFormat }] },
            primitive: { topology: "triangle-list" },
        });
        this.colorBlitPipelines.set(key, pipeline);
        return pipeline;
    }

    private shaderBlitColor(
        source: ReturnType<HydWebGLStatic["framebufferColorSurface"]>,
        destination: ReturnType<HydWebGLStatic["framebufferColorSurface"]>,
        sourceRect: [number, number, number, number],
        destinationRect: [number, number, number, number],
        linear: boolean,
        conversion: "identity" | "rgb" | "alpha" | "luminance" | "luminance-alpha" = "identity",
    ): boolean {
        const sourceFlipped = source.isDefault ||
            Boolean(source.attachment && this.samplerNeedsOriginFlip(source.attachment.attachment));
        const sampledLinear = linear && source.sampleCount === 1;
        const pipeline = this.getColorBlitPipeline(
            source.format, destination.format, source.sampleCount, sampledLinear, sourceFlipped, conversion);
        if (!pipeline) return false;
        const minX = Math.max(0, Math.min(destinationRect[0], destinationRect[2]));
        const maxX = Math.min(destination.width, Math.max(destinationRect[0], destinationRect[2]));
        const minY = Math.max(0, Math.min(destinationRect[1], destinationRect[3]));
        const maxY = Math.min(destination.height, Math.max(destinationRect[1], destinationRect[3]));
        if (minX >= maxX || minY >= maxY) return true;
        if (!this.colorBlitUniformBuffer) {
            this.colorBlitUniformBuffer = this.hydDevice.createBuffer({
                label: "blitFramebuffer uniforms",
                size: 48,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
            });
        }
        this.hydDevice.queue.writeBuffer(this.colorBlitUniformBuffer, 0, new Float32Array([
            source.width, source.height, destination.width, destination.height,
            ...sourceRect,
            ...destinationRect,
        ]));
        const entries: GPUBindGroupEntry[] = [{ binding: 0, resource: source.view }];
        if (sampledLinear) {
            if (!this.colorBlitLinearSampler) {
                this.colorBlitLinearSampler = this.hydDevice.createSampler({
                    minFilter: "linear",
                    magFilter: "linear",
                    addressModeU: "clamp-to-edge",
                    addressModeV: "clamp-to-edge",
                });
            }
            entries.push({ binding: 1, resource: this.colorBlitLinearSampler });
            entries.push({ binding: 2, resource: { buffer: this.colorBlitUniformBuffer } });
        } else {
            entries.push({ binding: 1, resource: { buffer: this.colorBlitUniformBuffer } });
        }
        const bindGroup = this.hydDevice.createBindGroup({
            label: "blitFramebuffer bind group",
            layout: pipeline.getBindGroupLayout(0),
            entries,
        });
        const encoder = this.hydDevice.createCommandEncoder({ label: "blitFramebuffer-shader" });
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: destination.view,
                depthSlice: destination.depthSlice,
                loadOp: "load",
                storeOp: "store",
            }],
        });
        pass.setScissorRect(minX, destination.height - maxY, maxX - minX, maxY - minY);
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();
        this.hydDevice.queue.submit([encoder.finish()]);
        return true;
    }

    private blitColorAttachments(
        srcX0: GLint,
        srcY0: GLint,
        srcX1: GLint,
        srcY1: GLint,
        dstX0: GLint,
        dstY0: GLint,
        dstX1: GLint,
        dstY1: GLint,
        filter: GLenum,
    ): boolean {
        const source = this.framebufferColorSurface(
            this.hydGlobalState.commonState.readFramebufferBinding, true);
        const destination = this.framebufferColorSurface(
            this.hydGlobalState.commonState.drawFramebufferBinding, false);
        // Missing draw images discard the blit. A missing read image is only an
        // error when at least one selected draw image would consume it.
        if (!destination) return true;
        if (!source) return false;
        const sameImage = (source.isDefault && destination.isDefault) ||
            Boolean(source.attachment && destination.attachment &&
                this.sameFramebufferImage(source.attachment, destination.attachment));
        if (sameImage) return false;
        const sourceWidth = Math.abs(srcX1 - srcX0);
        const sourceHeight = Math.abs(srcY1 - srcY0);
        const destinationWidth = Math.abs(dstX1 - dstX0);
        const destinationHeight = Math.abs(dstY1 - dstY0);
        if (source.sampleCount > 1 &&
            (destination.sampleCount !== 1 || sourceWidth !== destinationWidth || sourceHeight !== destinationHeight ||
                srcX0 !== dstX0 || srcY0 !== dstY0 || srcX1 !== dstX1 || srcY1 !== dstY1)) {
            return false;
        }
        if (destination.sampleCount > 1 || (destination.isDefault && this.hydGlobalState.contextAttributes.antialias === true)) {
            return false;
        }
        if (source.sampleCount > 1 &&
            this.colorBlitFormatClass(source) !== this.colorBlitFormatClass(destination)) return false;
        if (source.sampleCount > 1 && source.hasAlpha !== destination.hasAlpha) return false;
        if (filter === WebGL2RenderingContext.LINEAR && this.colorBlitScalar(source.format) !== "f32") return false;

        const sameSize = sourceWidth === destinationWidth && sourceHeight === destinationHeight;
        const forward = srcX1 >= srcX0 && srcY1 >= srcY0 && dstX1 >= dstX0 && dstY1 >= dstY0;
        const inBounds = srcX0 >= 0 && srcY0 >= 0 && srcX1 <= source.width && srcY1 <= source.height &&
            dstX0 >= 0 && dstY0 >= 0 && dstX1 <= destination.width && dstY1 <= destination.height;
        const encoder = this.hydDevice.createCommandEncoder({ label: "blitFramebuffer-color" });
        const sourceFlipped = source.isDefault ||
            Boolean(source.attachment && this.samplerNeedsOriginFlip(source.attachment.attachment));
        const alphaConversion = source.hasAlpha && destination.hasAlpha ? "identity" : "rgb";
        if (source.sampleCount > 1 && source.format === destination.format) {
            const fullSource = srcX0 === 0 && srcY0 === 0 && srcX1 === source.width && srcY1 === source.height;
            const fullDestination = dstX0 === 0 && dstY0 === 0 && dstX1 === destination.width && dstY1 === destination.height;
            if (fullSource && fullDestination && alphaConversion === "identity") {
                const pass = encoder.beginRenderPass({
                    colorAttachments: [{
                        view: source.view,
                        depthSlice: source.depthSlice,
                        resolveTarget: destination.view,
                        loadOp: "load",
                        storeOp: "store",
                    }],
                });
                pass.end();
            } else if (!this.shaderBlitColor(
                source,
                destination,
                [srcX0, srcY0, srcX1, srcY1],
                [dstX0, dstY0, dstX1, dstY1],
                false,
                alphaConversion,
            )) {
                return false;
            }
        } else if (source.sampleCount === 1 && source.format === destination.format &&
            source.texture !== destination.texture && sourceFlipped &&
            sameSize && forward && inBounds && alphaConversion === "identity") {
            encoder.copyTextureToTexture(
                {
                    texture: source.texture,
                    origin: { x: srcX0, y: source.height - srcY1, z: 0 },
                },
                {
                    texture: destination.texture,
                    origin: { x: dstX0, y: destination.height - dstY1, z: 0 },
                },
                { width: sourceWidth, height: sourceHeight, depthOrArrayLayers: 1 },
            );
        } else {
            if (!this.shaderBlitColor(
                source,
                destination,
                [srcX0, srcY0, srcX1, srcY1],
                [dstX0, dstY0, dstX1, dstY1],
                filter === WebGL2RenderingContext.LINEAR,
                alphaConversion,
            )) return false;
        }
        this.hydDevice.queue.submit([encoder.finish()]);
        if (destination.attachment) {
            destination.attachment.attachment.markFramebufferRenderTarget();
        } else if (this.hydGlobalState.__canvasTexture === this.defaultFramebufferBackingTexture) {
            this.defaultFramebufferBackingNeedsPresentation = true;
        }
        return true;
    }

    private depthStencilPassAttachment(
        attachment: FramebufferAttributes,
    ): GPURenderPassDepthStencilAttachment {
        const descriptor: GPURenderPassDepthStencilAttachment = { view: attachment.view };
        if (attachment.format.includes("depth")) {
            descriptor.depthLoadOp = "load";
            descriptor.depthStoreOp = "store";
        }
        if (attachment.format.includes("stencil")) {
            descriptor.stencilLoadOp = "load";
            descriptor.stencilStoreOp = "store";
        }
        return descriptor;
    }

    private getDepthBlitPipeline(
        sourceSamples: number,
        destinationFormat: GPUTextureFormat,
        destinationSamples: number,
    ): GPURenderPipeline {
        const key = `${sourceSamples}:${destinationFormat}:${destinationSamples}`;
        const cached = this.depthBlitPipelines.get(key);
        if (cached) return cached;
        const sourceDeclaration = sourceSamples > 1
            ? "@group(0) @binding(0) var source : texture_depth_multisampled_2d;"
            : "@group(0) @binding(0) var source : texture_depth_2d;";
        const sampleParameter = destinationSamples > 1
            ? ", @builtin(sample_index) sampleIndex : u32"
            : "";
        const sampleIndex = sourceSamples > 1 && destinationSamples > 1
            ? "i32(sampleIndex)"
            : "0";
        const sampleExpression = sourceSamples > 1
            ? `textureLoad(source, sourceTexel, ${sampleIndex})`
            : "textureLoad(source, sourceTexel, 0)";
        const module = this.hydDevice.createShaderModule({
            label: `depth blit shader ${key}`,
            code: `
struct BlitParams {
  sizes : vec4f,
  sourceRect : vec4f,
  destinationRect : vec4f,
};
${sourceDeclaration}
@group(0) @binding(1) var<uniform> params : BlitParams;

@vertex
fn vertexMain(@builtin(vertex_index) index : u32) -> @builtin(position) vec4f {
  let positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  return vec4f(positions[index], 0.0, 1.0);
}

@fragment
fn fragmentMain(@builtin(position) position : vec4f${sampleParameter}) -> @builtin(frag_depth) f32 {
  let destinationGl = vec2f(position.x, params.sizes.w - position.y);
  let interpolation = (destinationGl - params.destinationRect.xy) /
      (params.destinationRect.zw - params.destinationRect.xy);
  let sourceGl = params.sourceRect.xy + interpolation *
      (params.sourceRect.zw - params.sourceRect.xy);
  if (sourceGl.x < 0.0 || sourceGl.y < 0.0 ||
      sourceGl.x >= params.sizes.x || sourceGl.y >= params.sizes.y) {
    discard;
  }
  let sourceGpu = vec2f(sourceGl.x, params.sizes.y - sourceGl.y);
  let sourceTexel = clamp(vec2i(floor(sourceGpu)), vec2i(0), vec2i(params.sizes.xy) - vec2i(1));
  return ${sampleExpression};
}
`,
        });
        const depthStencil: GPUDepthStencilState = {
            format: destinationFormat,
            depthWriteEnabled: true,
            depthCompare: "always",
        };
        if (destinationFormat.includes("stencil")) {
            const neutralStencil: GPUStencilFaceState = {
                compare: "always",
                failOp: "keep",
                depthFailOp: "keep",
                passOp: "keep",
            };
            depthStencil.stencilFront = neutralStencil;
            depthStencil.stencilBack = neutralStencil;
            depthStencil.stencilWriteMask = 0;
        }
        const pipeline = this.hydDevice.createRenderPipeline({
            label: `depth blit pipeline ${key}`,
            layout: "auto",
            vertex: { module, entryPoint: "vertexMain" },
            fragment: { module, entryPoint: "fragmentMain", targets: [] },
            primitive: { topology: "triangle-list" },
            depthStencil,
            multisample: { count: destinationSamples },
        });
        this.depthBlitPipelines.set(key, pipeline);
        return pipeline;
    }

    private getStencilCapturePipeline(
        sourceFormat: GPUTextureFormat,
        sourceSamples: number,
        bit: number,
    ): GPURenderPipeline {
        const key = `${sourceFormat}:${sourceSamples}:${bit}`;
        const cached = this.stencilCapturePipelines.get(key);
        if (cached) return cached;
        const module = this.hydDevice.createShaderModule({
            label: `stencil capture shader ${key}`,
            code: `
@vertex
fn vertexMain(@builtin(vertex_index) index : u32) -> @builtin(position) vec4f {
  let positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  return vec4f(positions[index], 0.0, 1.0);
}

@fragment
fn fragmentMain() -> @location(0) vec4f {
  return vec4f(${bit}.0 / 255.0, 0.0, 0.0, 0.0);
}
`,
        });
        const testBit: GPUStencilFaceState = {
            compare: "equal",
            failOp: "keep",
            depthFailOp: "keep",
            passOp: "keep",
        };
        const depthStencil: GPUDepthStencilState = {
            format: sourceFormat,
            stencilFront: testBit,
            stencilBack: testBit,
            stencilReadMask: bit,
            stencilWriteMask: 0,
        };
        if (sourceFormat.includes("depth")) {
            depthStencil.depthWriteEnabled = false;
            depthStencil.depthCompare = "always";
        }
        const additive: GPUBlendState = {
            color: { srcFactor: "one", dstFactor: "one", operation: "add" },
            alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
        };
        const pipeline = this.hydDevice.createRenderPipeline({
            label: `stencil capture pipeline ${key}`,
            layout: "auto",
            vertex: { module, entryPoint: "vertexMain" },
            fragment: {
                module,
                entryPoint: "fragmentMain",
                targets: [{ format: "rgba8unorm", blend: additive, writeMask: GPUColorWrite.RED }],
            },
            primitive: { topology: "triangle-list" },
            depthStencil,
            multisample: { count: sourceSamples },
        });
        this.stencilCapturePipelines.set(key, pipeline);
        return pipeline;
    }

    private getStencilZeroPipeline(
        destinationFormat: GPUTextureFormat,
        destinationSamples: number,
    ): GPURenderPipeline {
        const key = `${destinationFormat}:${destinationSamples}`;
        const cached = this.stencilZeroPipelines.get(key);
        if (cached) return cached;
        const module = this.hydDevice.createShaderModule({
            label: `stencil zero shader ${key}`,
            code: `
@vertex
fn vertexMain(@builtin(vertex_index) index : u32) -> @builtin(position) vec4f {
  let positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  return vec4f(positions[index], 0.0, 1.0);
}
@fragment fn fragmentMain() {}
`,
        });
        const replace: GPUStencilFaceState = {
            compare: "always",
            failOp: "keep",
            depthFailOp: "keep",
            passOp: "replace",
        };
        const depthStencil: GPUDepthStencilState = {
            format: destinationFormat,
            stencilFront: replace,
            stencilBack: replace,
            stencilReadMask: 0xffffffff,
            stencilWriteMask: 0xff,
        };
        if (destinationFormat.includes("depth")) {
            depthStencil.depthWriteEnabled = false;
            depthStencil.depthCompare = "always";
        }
        const pipeline = this.hydDevice.createRenderPipeline({
            label: `stencil zero pipeline ${key}`,
            layout: "auto",
            vertex: { module, entryPoint: "vertexMain" },
            fragment: { module, entryPoint: "fragmentMain", targets: [] },
            primitive: { topology: "triangle-list" },
            depthStencil,
            multisample: { count: destinationSamples },
        });
        this.stencilZeroPipelines.set(key, pipeline);
        return pipeline;
    }

    private getStencilWritePipeline(
        sourceSamples: number,
        destinationFormat: GPUTextureFormat,
        destinationSamples: number,
        bit: number,
    ): GPURenderPipeline {
        const key = `${sourceSamples}:${destinationFormat}:${destinationSamples}:${bit}`;
        const cached = this.stencilWritePipelines.get(key);
        if (cached) return cached;
        const sourceDeclaration = sourceSamples > 1
            ? "@group(0) @binding(0) var source : texture_multisampled_2d<f32>;"
            : "@group(0) @binding(0) var source : texture_2d<f32>;";
        const sampleParameter = destinationSamples > 1
            ? ", @builtin(sample_index) sampleIndex : u32"
            : "";
        const sampleIndex = sourceSamples > 1 && destinationSamples > 1
            ? "i32(sampleIndex)"
            : "0";
        const sampleExpression = sourceSamples > 1
            ? `textureLoad(source, sourceTexel, ${sampleIndex})`
            : "textureLoad(source, sourceTexel, 0)";
        const module = this.hydDevice.createShaderModule({
            label: `stencil write shader ${key}`,
            code: `
struct BlitParams {
  sizes : vec4f,
  sourceRect : vec4f,
  destinationRect : vec4f,
};
${sourceDeclaration}
@group(0) @binding(1) var<uniform> params : BlitParams;

@vertex
fn vertexMain(@builtin(vertex_index) index : u32) -> @builtin(position) vec4f {
  let positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  return vec4f(positions[index], 0.0, 1.0);
}

@fragment
fn fragmentMain(@builtin(position) position : vec4f${sampleParameter}) {
  let destinationGl = vec2f(position.x, params.sizes.w - position.y);
  let interpolation = (destinationGl - params.destinationRect.xy) /
      (params.destinationRect.zw - params.destinationRect.xy);
  let sourceGl = params.sourceRect.xy + interpolation *
      (params.sourceRect.zw - params.sourceRect.xy);
  if (sourceGl.x < 0.0 || sourceGl.y < 0.0 ||
      sourceGl.x >= params.sizes.x || sourceGl.y >= params.sizes.y) {
    discard;
  }
  let sourceGpu = vec2f(sourceGl.x, params.sizes.y - sourceGl.y);
  let sourceTexel = clamp(vec2i(floor(sourceGpu)), vec2i(0), vec2i(params.sizes.xy) - vec2i(1));
  let encoded = ${sampleExpression};
  let stencil = u32(round(encoded.r * 255.0));
  if ((stencil & ${bit}u) == 0u) {
    discard;
  }
}
`,
        });
        const replace: GPUStencilFaceState = {
            compare: "always",
            failOp: "keep",
            depthFailOp: "keep",
            passOp: "replace",
        };
        const depthStencil: GPUDepthStencilState = {
            format: destinationFormat,
            stencilFront: replace,
            stencilBack: replace,
            stencilReadMask: 0xffffffff,
            stencilWriteMask: bit,
        };
        if (destinationFormat.includes("depth")) {
            depthStencil.depthWriteEnabled = false;
            depthStencil.depthCompare = "always";
        }
        const pipeline = this.hydDevice.createRenderPipeline({
            label: `stencil write pipeline ${key}`,
            layout: "auto",
            vertex: { module, entryPoint: "vertexMain" },
            fragment: { module, entryPoint: "fragmentMain", targets: [] },
            primitive: { topology: "triangle-list" },
            depthStencil,
            multisample: { count: destinationSamples },
        });
        this.stencilWritePipelines.set(key, pipeline);
        return pipeline;
    }

    private encodeDepthBlit(
        encoder: GPUCommandEncoder,
        source: FramebufferAttributes,
        destination: FramebufferAttributes,
        destinationScissor: [number, number, number, number],
    ) {
        const pipeline = this.getDepthBlitPipeline(
            source.sampleCount,
            destination.format,
            destination.sampleCount,
        );
        const sourceView = source.attachment.getDepthSampleView(source.face, source.level || 0, source.layer);
        const bindGroup = this.hydDevice.createBindGroup({
            label: "depth blit bind group",
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: sourceView },
                { binding: 1, resource: { buffer: this.depthStencilBlitUniformBuffer } },
            ],
        });
        const pass = encoder.beginRenderPass({
            colorAttachments: [],
            depthStencilAttachment: this.depthStencilPassAttachment(destination),
        });
        pass.setScissorRect(...destinationScissor);
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();
    }

    private encodeStencilBlit(
        encoder: GPUCommandEncoder,
        source: FramebufferAttributes,
        destination: FramebufferAttributes,
        destinationScissor: [number, number, number, number],
    ): GPUTexture {
        const intermediate = this.hydDevice.createTexture({
            label: "stencil blit bit planes",
            size: { width: source.width, height: source.height, depthOrArrayLayers: 1 },
            format: "rgba8unorm",
            sampleCount: source.sampleCount,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        });
        const intermediateView = intermediate.createView({ label: "stencil blit bit planes view" });
        const capturePass = encoder.beginRenderPass({
            colorAttachments: [{
                view: intermediateView,
                loadOp: "clear",
                storeOp: "store",
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
            }],
            depthStencilAttachment: this.depthStencilPassAttachment(source),
        });
        for (let shift = 0; shift < 8; shift++) {
            const bit = 1 << shift;
            capturePass.setPipeline(this.getStencilCapturePipeline(source.format, source.sampleCount, bit));
            capturePass.setStencilReference(bit);
            capturePass.draw(3);
        }
        capturePass.end();

        const writePass = encoder.beginRenderPass({
            colorAttachments: [],
            depthStencilAttachment: this.depthStencilPassAttachment(destination),
        });
        writePass.setScissorRect(...destinationScissor);
        writePass.setPipeline(this.getStencilZeroPipeline(destination.format, destination.sampleCount));
        writePass.setStencilReference(0);
        writePass.draw(3);
        for (let shift = 0; shift < 8; shift++) {
            const bit = 1 << shift;
            const pipeline = this.getStencilWritePipeline(
                source.sampleCount,
                destination.format,
                destination.sampleCount,
                bit,
            );
            const bindGroup = this.hydDevice.createBindGroup({
                label: `stencil blit bind group bit ${bit}`,
                layout: pipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: intermediateView },
                    { binding: 1, resource: { buffer: this.depthStencilBlitUniformBuffer } },
                ],
            });
            writePass.setPipeline(pipeline);
            writePass.setBindGroup(0, bindGroup);
            writePass.setStencilReference(bit);
            writePass.draw(3);
        }
        writePass.end();
        return intermediate;
    }

    private blitUniformDepthStencil(
        mask: GLbitfield,
        srcX0: GLint,
        srcY0: GLint,
        srcX1: GLint,
        srcY1: GLint,
        dstX0: GLint,
        dstY0: GLint,
        dstX1: GLint,
        dstY1: GLint,
    ): boolean {
        const readFramebuffer = this.hydGlobalState.commonState.readFramebufferBinding;
        const drawFramebuffer = this.hydGlobalState.commonState.drawFramebufferBinding;
        const sourceDepth = this.framebufferAttachment(readFramebuffer, WebGL2RenderingContext.DEPTH_ATTACHMENT);
        const sourceStencil = this.framebufferAttachment(readFramebuffer, WebGL2RenderingContext.STENCIL_ATTACHMENT);
        const destinationDepth = this.framebufferAttachment(drawFramebuffer, WebGL2RenderingContext.DEPTH_ATTACHMENT);
        const destinationStencil = this.framebufferAttachment(drawFramebuffer, WebGL2RenderingContext.STENCIL_ATTACHMENT);
        let activeMask = mask;
        if (!destinationDepth) activeMask &= ~WebGL2RenderingContext.DEPTH_BUFFER_BIT;
        else if ((activeMask & WebGL2RenderingContext.DEPTH_BUFFER_BIT) && !sourceDepth) return false;
        if (!destinationStencil) activeMask &= ~WebGL2RenderingContext.STENCIL_BUFFER_BIT;
        else if ((activeMask & WebGL2RenderingContext.STENCIL_BUFFER_BIT) && !sourceStencil) return false;
        const copyDepth = Boolean(activeMask & WebGL2RenderingContext.DEPTH_BUFFER_BIT);
        const copyStencil = Boolean(activeMask & WebGL2RenderingContext.STENCIL_BUFFER_BIT);
        if (!copyDepth && !copyStencil) return true;
        if ((copyDepth && this.sameFramebufferImage(sourceDepth, destinationDepth)) ||
            (copyStencil && this.sameFramebufferImage(sourceStencil, destinationStencil))) {
            return false;
        }

        const source = copyDepth ? sourceDepth : sourceStencil;
        const destination = copyDepth ? destinationDepth : destinationStencil;
        const sameExtent = Math.abs(srcX1 - srcX0) === Math.abs(dstX1 - dstX0) &&
            Math.abs(srcY1 - srcY0) === Math.abs(dstY1 - dstY0);
        if (!source || !destination || (source.sampleCount > 1 && !sameExtent)) return false;
        if (copyDepth && sourceDepth.internalFormat !== destinationDepth.internalFormat) return false;
        if (copyStencil && sourceStencil.internalFormat !== destinationStencil.internalFormat) return false;

        const destinationMinX = Math.max(0, Math.min(dstX0, dstX1));
        const destinationMaxX = Math.min(destination.width, Math.max(dstX0, dstX1));
        const destinationMinY = Math.max(0, Math.min(dstY0, dstY1));
        const destinationMaxY = Math.min(destination.height, Math.max(dstY0, dstY1));
        if (destinationMinX >= destinationMaxX || destinationMinY >= destinationMaxY) return true;
        const destinationScissor: [number, number, number, number] = [
            destinationMinX,
            destination.height - destinationMaxY,
            destinationMaxX - destinationMinX,
            destinationMaxY - destinationMinY,
        ];
        const fullSource = srcX0 === 0 && srcY0 === 0 &&
            srcX1 === source.width && srcY1 === source.height;
        const fullDestination = dstX0 === 0 && dstY0 === 0 &&
            dstX1 === destination.width && dstY1 === destination.height;

        if (copyDepth && copyStencil && fullSource && fullDestination &&
            this.sameFramebufferImage(sourceDepth, sourceStencil) &&
            this.sameFramebufferImage(destinationDepth, destinationStencil) &&
            sourceDepth.format === destinationDepth.format &&
            sourceDepth.sampleCount === 1 && destinationDepth.sampleCount === 1) {
            const sourceLayer = sourceDepth.layer ??
                (sourceDepth.isCubeFace
                    ? sourceDepth.face - WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X
                    : 0);
            const destinationLayer = destinationDepth.layer ??
                (destinationDepth.isCubeFace
                    ? destinationDepth.face - WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X
                    : 0);
            const encoder = this.hydDevice.createCommandEncoder({ label: "blitFramebuffer-depth-stencil-full" });
            encoder.copyTextureToTexture(
                {
                    texture: sourceDepth.attachment.texture,
                    mipLevel: sourceDepth.level || 0,
                    origin: { x: 0, y: 0, z: sourceLayer },
                    aspect: "all",
                },
                {
                    texture: destinationDepth.attachment.texture,
                    mipLevel: destinationDepth.level || 0,
                    origin: { x: 0, y: 0, z: destinationLayer },
                    aspect: "all",
                },
                { width: sourceDepth.width, height: sourceDepth.height, depthOrArrayLayers: 1 },
            );
            this.hydDevice.queue.submit([encoder.finish()]);
            destinationDepth.attachment.uniformDepthValue = sourceDepth.attachment.uniformDepthValue;
            destinationStencil.attachment.uniformStencilValue = sourceStencil.attachment.uniformStencilValue;
            destinationDepth.attachment.markFramebufferRenderTarget();
            return true;
        }

        const uniformDepth = !copyDepth || sourceDepth.attachment.uniformDepthValue !== null;
        const uniformStencil = !copyStencil || sourceStencil.attachment.uniformStencilValue !== null;
        const combinedDestination = !copyDepth || !copyStencil ||
            this.sameFramebufferImage(destinationDepth, destinationStencil);
        if (fullDestination && uniformDepth && uniformStencil && combinedDestination) {
            const target = copyDepth ? destinationDepth : destinationStencil;
            const descriptor = this.depthStencilPassAttachment(target);
            if (copyDepth) {
                descriptor.depthLoadOp = "clear";
                descriptor.depthClearValue = sourceDepth.attachment.uniformDepthValue;
            }
            if (copyStencil) {
                descriptor.stencilLoadOp = "clear";
                descriptor.stencilClearValue = sourceStencil.attachment.uniformStencilValue;
            }
            const encoder = this.hydDevice.createCommandEncoder({ label: "blitFramebuffer-depth-stencil-uniform" });
            encoder.beginRenderPass({ colorAttachments: [], depthStencilAttachment: descriptor }).end();
            this.hydDevice.queue.submit([encoder.finish()]);
        } else {
            if (!this.depthStencilBlitUniformBuffer) {
                this.depthStencilBlitUniformBuffer = this.hydDevice.createBuffer({
                    label: "depth/stencil blit uniforms",
                    size: 48,
                    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
                });
            }
            this.hydDevice.queue.writeBuffer(this.depthStencilBlitUniformBuffer, 0, new Float32Array([
                source.width, source.height, destination.width, destination.height,
                srcX0, srcY0, srcX1, srcY1,
                dstX0, dstY0, dstX1, dstY1,
            ]));
            const encoder = this.hydDevice.createCommandEncoder({ label: "blitFramebuffer-depth-stencil-shader" });
            const temporaryTextures: GPUTexture[] = [];
            if (copyDepth) {
                this.encodeDepthBlit(encoder, sourceDepth, destinationDepth, destinationScissor);
            }
            if (copyStencil) {
                temporaryTextures.push(this.encodeStencilBlit(
                    encoder,
                    sourceStencil,
                    destinationStencil,
                    destinationScissor,
                ));
            }
            this.hydDevice.queue.submit([encoder.finish()]);
            if (temporaryTextures.length > 0) {
                this.hydDevice.queue.onSubmittedWorkDone().then(() => {
                    for (const texture of temporaryTextures) texture.destroy();
                });
            }
        }

        if (copyDepth) {
            destinationDepth.attachment.uniformDepthValue = fullDestination
                ? sourceDepth.attachment.uniformDepthValue
                : null;
            destinationDepth.attachment.markFramebufferRenderTarget();
        }
        if (copyStencil) {
            destinationStencil.attachment.uniformStencilValue = fullDestination
                ? sourceStencil.attachment.uniformStencilValue
                : null;
            destinationStencil.attachment.markFramebufferRenderTarget();
        }
        return true;
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
        const readFramebuffer = this.hydGlobalState.commonState.readFramebufferBinding;
        const drawFramebuffer = this.hydGlobalState.commonState.drawFramebufferBinding;
        if ((readFramebuffer === this.hydGlobalState.defaultFramebuffer ||
            drawFramebuffer === this.hydGlobalState.defaultFramebuffer) &&
            this.defaultFramebufferNeedsImplicitClear) {
            if (this.canvasSizeDirty) this.updateCanvasSize();
            this.activateDefaultFramebufferBacking(Boolean(this.hydGlobalState.__canvasTexture));
            this.materializeImplicitDefaultFramebufferClear();
            this._der_flush();
        }
        const validMask = WebGL2RenderingContext.COLOR_BUFFER_BIT |
            WebGL2RenderingContext.DEPTH_BUFFER_BIT |
            WebGL2RenderingContext.STENCIL_BUFFER_BIT;
        if ((mask & ~validMask) !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const coordinates = [srcX0, srcY0, srcX1, srcY1, dstX0, dstY0, dstX1, dstY1];
        if (coordinates.some((value) => !Number.isFinite(value) || !Number.isInteger(value)) ||
            Math.abs(srcX1 - srcX0) > 0x7fffffff ||
            Math.abs(srcY1 - srcY0) > 0x7fffffff ||
            Math.abs(dstX1 - dstX0) > 0x7fffffff ||
            Math.abs(dstY1 - dstY0) > 0x7fffffff) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (filter !== WebGL2RenderingContext.NEAREST && filter !== WebGL2RenderingContext.LINEAR) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if ((mask & (WebGL2RenderingContext.DEPTH_BUFFER_BIT | WebGL2RenderingContext.STENCIL_BUFFER_BIT)) &&
            filter !== WebGL2RenderingContext.NEAREST) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (this.framebufferStatus(this.hydGlobalState.commonState.readFramebufferBinding) !== WebGL2RenderingContext.FRAMEBUFFER_COMPLETE ||
            this.framebufferStatus(this.hydGlobalState.commonState.drawFramebufferBinding) !== WebGL2RenderingContext.FRAMEBUFFER_COMPLETE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_FRAMEBUFFER_OPERATION);
            return;
        }
        if ((mask & WebGL2RenderingContext.COLOR_BUFFER_BIT) &&
            !this.blitColorAttachments(
                srcX0, srcY0, srcX1, srcY1,
                dstX0, dstY0, dstX1, dstY1,
                filter,
            )) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if ((mask & (WebGL2RenderingContext.DEPTH_BUFFER_BIT | WebGL2RenderingContext.STENCIL_BUFFER_BIT)) &&
            !this.blitUniformDepthStencil(
                mask,
                srcX0, srcY0, srcX1, srcY1,
                dstX0, dstY0, dstX1, dstY1,
            )) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (mask !== 0) this.markFramebufferContentChanged();
        this.hydGlobalState.recordTransition("blitFramebuffer", srcX0, srcY0, srcX1, srcY1, dstX0, dstY0, dstX1, dstY1, mask, filter);
    }

    private copyAliasesReadAttachment(texture: HydTexture, target: GLenum, level: GLint): boolean {
        if (this.hydGlobalState.commonState.readFramebufferBinding === this.hydGlobalState.defaultFramebuffer) {
            return false;
        }
        const attachment = this.getReadColorAttachment();
        if (!attachment || attachment.attachment !== texture || (attachment.level || 0) !== level) {
            return false;
        }
        const sourceLayer = attachment.layer !== undefined
            ? attachment.layer
            : this.isCubeFaceTarget(attachment.face)
                ? attachment.face - WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X
                : 0;
        const destinationLayer = this.isCubeFaceTarget(target)
            ? target - WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X
            : 0;
        return sourceLayer === destinationLayer;
    }

    private copyTextureInternalFormatInfo(internalformat: GLenum): {
        uploadFormat: { format: GLenum, type: GLenum },
        scalar: "f32" | "i32" | "u32",
        colorBits: [number, number, number, number],
        srgb: boolean,
        sized: boolean,
    } | null {
        const legacyFormats = new Set<GLenum>([
            WebGL2RenderingContext.ALPHA,
            WebGL2RenderingContext.LUMINANCE,
            WebGL2RenderingContext.LUMINANCE_ALPHA,
            WebGL2RenderingContext.RGB,
            WebGL2RenderingContext.RGBA,
        ]);
        let uploadFormat: { format: GLenum, type: GLenum };
        if (legacyFormats.has(internalformat)) {
            uploadFormat = { format: internalformat, type: WebGL2RenderingContext.UNSIGNED_BYTE };
        } else {
            try {
                uploadFormat = this.textureStorageUploadFormat(internalformat);
            } catch (_) {
                return null;
            }
        }
        const integer = uploadFormat.format === WebGL2RenderingContext.RED_INTEGER ||
            uploadFormat.format === WebGL2RenderingContext.RG_INTEGER ||
            uploadFormat.format === WebGL2RenderingContext.RGB_INTEGER ||
            uploadFormat.format === WebGL2RenderingContext.RGBA_INTEGER;
        const signed = uploadFormat.type === WebGL2RenderingContext.BYTE ||
            uploadFormat.type === WebGL2RenderingContext.SHORT ||
            uploadFormat.type === WebGL2RenderingContext.INT;
        return {
            uploadFormat,
            scalar: integer ? (signed ? "i32" : "u32") : "f32",
            colorBits: webGlInternalFormatColorBits(internalformat),
            srgb: internalformat === WebGL2RenderingContext.SRGB8 ||
                internalformat === WebGL2RenderingContext.SRGB8_ALPHA8,
            sized: !legacyFormats.has(internalformat),
        };
    }

    copyTexImage2D(target: GLenum, level: GLint, internalformat: GLenum, x: GLint, y: GLint, width: GLsizei, height: GLsizei, border: GLint) {
        if (!this.validateTexImage2DTarget(target)) return;
        if (border !== 0 || !this.validateTexImage2DDimensions(target, level, width, height)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const validInternalFormats = new Set<GLenum>([
            WebGL2RenderingContext.ALPHA,
            WebGL2RenderingContext.LUMINANCE,
            WebGL2RenderingContext.LUMINANCE_ALPHA,
            WebGL2RenderingContext.RGB,
            WebGL2RenderingContext.RGBA,
        ]);
        if (this.hydContextType !== "webgl2" && !validInternalFormats.has(internalformat)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (this.framebufferStatus(this.hydGlobalState.commonState.readFramebufferBinding) !== WebGL2RenderingContext.FRAMEBUFFER_COMPLETE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_FRAMEBUFFER_OPERATION);
            return;
        }
        const readFramebuffer = this.hydGlobalState.commonState.readFramebufferBinding;
        if (readFramebuffer !== this.hydGlobalState.defaultFramebuffer && !this.getReadColorAttachment()) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const source = this.framebufferColorSurface(readFramebuffer, true);
        const destinationInfo = this.copyTextureInternalFormatInfo(internalformat);
        if (!source || !destinationInfo || destinationInfo.colorBits.every((bits) => bits === 0)) {
            this.hydGlobalState.setError(destinationInfo ? WebGL2RenderingContext.INVALID_OPERATION : WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (internalformat === WebGL2RenderingContext.R8_SNORM ||
            internalformat === WebGL2RenderingContext.RG8_SNORM ||
            internalformat === WebGL2RenderingContext.RGB8_SNORM ||
            internalformat === WebGL2RenderingContext.RGBA8_SNORM) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const sourceHasAlpha = source.hasAlpha;
        const destinationNeedsAlpha = destinationInfo.colorBits[3] > 0;
        if (destinationNeedsAlpha && !sourceHasAlpha) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (this.colorBlitScalar(source.format) !== destinationInfo.scalar ||
            (destinationInfo.sized && destinationInfo.colorBits.some(
                (bits, index) => bits > 0 && source.colorBits[index] !== bits)) ||
            destinationInfo.srgb !== source.srgb) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const texture = this.currentTexture(target);
        if (!texture) return;
        if (texture.immutableFormat) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (this.copyAliasesReadAttachment(texture, target, level)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this._der_flush();
        texture.texImage2D(
            null,
            target,
            level,
            internalformat,
            width,
            height,
            border,
            destinationInfo.uploadFormat.format,
            destinationInfo.uploadFormat.type,
        );
        const destinationImage = texture.getImageState(target, level);
        if (destinationImage && !destinationInfo.sized) {
            destinationImage.effectiveColorBits = internalformat === WebGL2RenderingContext.ALPHA
                ? [0, 0, 0, source.colorBits[3]]
                : internalformat === WebGL2RenderingContext.LUMINANCE
                    ? [source.colorBits[0], 0, 0, 0]
                    : internalformat === WebGL2RenderingContext.LUMINANCE_ALPHA
                        ? [source.colorBits[0], 0, 0, source.colorBits[3]]
                        : internalformat === WebGL2RenderingContext.RGB
                            ? [source.colorBits[0], source.colorBits[1], source.colorBits[2], 0]
                            : [...source.colorBits];
        }
        if (!this.copyReadFramebufferRegionToTexture(texture, target, level, 0, 0, x, y, width, height)) return;
        this.markFramebufferContentChanged();
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("copyTexImage2D", target, level, internalformat, x, y, width, height, border);
    }

    copyTexSubImage2D(target: GLenum, level: GLint, xoffset: GLint, yoffset: GLint, x: GLint, y: GLint, width: GLsizei, height: GLsizei) {
        if (!this.validateTexImage2DTarget(target)) return;
        if (level < 0 || xoffset < 0 || yoffset < 0 || width < 0 || height < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (this.framebufferStatus(this.hydGlobalState.commonState.readFramebufferBinding) !== WebGL2RenderingContext.FRAMEBUFFER_COMPLETE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_FRAMEBUFFER_OPERATION);
            return;
        }
        const texture = this.currentTexture(target);
        if (!texture) return;
        const destinationImage = texture.getImageState(target, level);
        if (!destinationImage) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (xoffset > destinationImage.width || yoffset > destinationImage.height ||
            width > destinationImage.width - xoffset || height > destinationImage.height - yoffset) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const readFramebuffer = this.hydGlobalState.commonState.readFramebufferBinding;
        if (readFramebuffer !== this.hydGlobalState.defaultFramebuffer && !this.getReadColorAttachment()) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const sourceHasAlpha = readFramebuffer === this.hydGlobalState.defaultFramebuffer
            ? this.hydGlobalState.contextAttributes.alpha !== false
            : (this.getReadColorAttachment()?.colorBits[3] || 0) > 0;
        const destinationNeedsAlpha = destinationImage.internalFormat === WebGL2RenderingContext.ALPHA ||
            destinationImage.internalFormat === WebGL2RenderingContext.LUMINANCE_ALPHA ||
            destinationImage.internalFormat === WebGL2RenderingContext.RGBA;
        if (destinationNeedsAlpha && !sourceHasAlpha) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (this.copyAliasesReadAttachment(texture, target, level)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this._der_flush();
        if (!this.copyReadFramebufferRegionToTexture(texture, target, level, xoffset, yoffset, x, y, width, height)) return;
        this.markFramebufferContentChanged();
        this.hydGlobalState.recordTransition("copyTexSubImage2D", target, level, xoffset, yoffset, x, y, width, height);
    }

    copyTexSubImage3D(
        target: GLenum,
        level: GLint,
        xoffset: GLint,
        yoffset: GLint,
        zoffset: GLint,
        x: GLint,
        y: GLint,
        width: GLsizei,
        height: GLsizei,
    ) {
        if (this.hydContextType !== "webgl2" ||
            (target !== WebGL2RenderingContext.TEXTURE_3D &&
                target !== WebGL2RenderingContext.TEXTURE_2D_ARRAY)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (level < 0 || xoffset < 0 || yoffset < 0 || zoffset < 0 || width < 0 || height < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const readFramebuffer = this.hydGlobalState.commonState.readFramebufferBinding;
        if (this.framebufferStatus(readFramebuffer) !== WebGL2RenderingContext.FRAMEBUFFER_COMPLETE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_FRAMEBUFFER_OPERATION);
            return;
        }
        const readAttachment = readFramebuffer === this.hydGlobalState.defaultFramebuffer
            ? null
            : this.getReadColorAttachment();
        if (readFramebuffer !== this.hydGlobalState.defaultFramebuffer && !readAttachment) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const texture = this.currentTexture(target);
        if (!texture) return;
        const destinationImage = texture.getImageState(target, level, 0);
        if (!destinationImage) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (xoffset > destinationImage.width || yoffset > destinationImage.height ||
            width > destinationImage.width - xoffset || height > destinationImage.height - yoffset ||
            zoffset >= destinationImage.depth) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (readAttachment && readAttachment.attachment === texture &&
            (readAttachment.level || 0) === level && (readAttachment.layer || 0) === zoffset) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const sourceHasAlpha = readFramebuffer === this.hydGlobalState.defaultFramebuffer
            ? this.hydGlobalState.contextAttributes.alpha !== false
            : (readAttachment.colorBits[3] || 0) > 0;
        const destinationNeedsAlpha = destinationImage.internalFormat === WebGL2RenderingContext.ALPHA ||
            destinationImage.internalFormat === WebGL2RenderingContext.LUMINANCE_ALPHA ||
            destinationImage.internalFormat === WebGL2RenderingContext.RGBA ||
            destinationImage.internalFormat === WebGL2RenderingContext.RGBA8;
        if (destinationNeedsAlpha && !sourceHasAlpha) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this._der_flush();
        if (!this.copyReadFramebufferRegionToTexture(
            texture, target, level, xoffset, yoffset, x, y, width, height, zoffset)) return;
        this.markFramebufferContentChanged();
        this.hydGlobalState.recordTransition(
            "copyTexSubImage3D", target, level, xoffset, yoffset, zoffset, x, y, width, height);
    }

    private copyReadFramebufferRegionToTexture(
        destination: HydTexture,
        target: GLenum,
        level: GLint,
        xoffset: GLint,
        yoffset: GLint,
        x: GLint,
        y: GLint,
        width: GLsizei,
        height: GLsizei,
        destinationLayer: GLint = 0,
    ): boolean {
        if (width === 0 || height === 0) return true;
        const framebuffer = this.hydGlobalState.commonState.readFramebufferBinding;
        const readsDefault = framebuffer === this.hydGlobalState.defaultFramebuffer;
        const attachment = readsDefault ? null : this.getReadColorAttachment();
        const sourceWidth = readsDefault ? this.hydCanvas.width : attachment?.width || 0;
        const sourceHeight = readsDefault ? this.hydCanvas.height : attachment?.height || 0;
        if (!readsDefault && !attachment) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return false;
        }

        const sourceX0 = Math.max(0, x);
        const sourceY0 = Math.max(0, y);
        const sourceX1 = Math.min(sourceWidth, x + width);
        const sourceY1 = Math.min(sourceHeight, y + height);
        const copyWidth = Math.max(0, sourceX1 - sourceX0);
        const copyHeight = Math.max(0, sourceY1 - sourceY0);
        if (copyWidth === 0 || copyHeight === 0) return true;

        const resolvedDestinationLayer = target >= WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X &&
            target <= WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z
            ? target - WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X
            : destinationLayer;
        const destinationImage = destination.getImageState(target, level, resolvedDestinationLayer);
        if (!destinationImage) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return false;
        }
        const destinationLogicalX = xoffset + sourceX0 - x;
        const destinationLogicalY = yoffset + sourceY0 - y;
        const destinationFlipped = this.samplerNeedsOriginFlip(destination);
        const channelConversion = destinationImage.internalFormat === WebGL2RenderingContext.RGB
            ? "rgb"
            : destinationImage.internalFormat === WebGL2RenderingContext.ALPHA
                ? "alpha"
                : destinationImage.internalFormat === WebGL2RenderingContext.LUMINANCE
                    ? "luminance"
                    : destinationImage.internalFormat === WebGL2RenderingContext.LUMINANCE_ALPHA
                        ? "luminance-alpha"
                        : "identity";
        const sourceSurface = this.framebufferColorSurface(framebuffer, true);
        const sourceIs3DLayer = sourceSurface?.attachment?.attachment.textureDimension === "3d";
        if (destination.isRenderAttachmentCapable && sourceSurface && !sourceIs3DLayer &&
            this.colorBlitScalar(sourceSurface.format) === this.colorBlitScalar(destination.gpuFormat)) {
            const destinationAttachment = new FramebufferAttributes(
                WebGL2RenderingContext.COLOR_ATTACHMENT0,
                level,
                target,
                destination,
                resolvedDestinationLayer,
            );
            const destinationSurface: NonNullable<ReturnType<HydWebGLStatic["framebufferColorSurface"]>> = {
                texture: destination.texture,
                view: destinationAttachment.view,
                depthSlice: destinationAttachment.depthSlice,
                format: destination.gpuFormat,
                width: destinationImage.width,
                height: destinationImage.height,
                sampleCount: 1,
                hasAlpha: destinationAttachment.colorBits[3] > 0,
                colorBits: destinationAttachment.colorBits,
                srgb: destination.gpuFormat.endsWith("-srgb"),
                isDefault: false,
                attachment: destinationAttachment,
            };
            const destinationRect: [number, number, number, number] = destinationFlipped
                ? [
                    destinationLogicalX,
                    destinationLogicalY,
                    destinationLogicalX + copyWidth,
                    destinationLogicalY + copyHeight,
                ]
                : [
                    destinationLogicalX,
                    destinationImage.height - destinationLogicalY,
                    destinationLogicalX + copyWidth,
                    destinationImage.height - destinationLogicalY - copyHeight,
                ];
            if (this.shaderBlitColor(
                sourceSurface,
                destinationSurface,
                [sourceX0, sourceY0, sourceX1, sourceY1],
                destinationRect,
                false,
                channelConversion,
            )) {
                return true;
            }
        }

        if (destination.gpuFormat !== "rgba8unorm" && destination.gpuFormat !== "bgra8unorm") {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return false;
        }

        const pixels = new Uint8Array(copyWidth * copyHeight * 4);
        const read = readsDefault
            ? this.readDefaultFramebufferSynchronously(sourceX0, sourceY0, copyWidth, copyHeight, pixels, 0)
            : this.readColorAttachmentSynchronously(attachment, sourceX0, sourceY0, copyWidth, copyHeight, pixels, 0);
        if (!read) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return false;
        }

        const logicalFormat = destinationImage?.internalFormat || WebGL2RenderingContext.RGBA;
        for (let offset = 0; offset < pixels.length; offset += 4) {
            const red = pixels[offset];
            const alpha = pixels[offset + 3];
            if (logicalFormat === WebGL2RenderingContext.ALPHA) {
                pixels[offset] = 0;
                pixels[offset + 1] = 0;
                pixels[offset + 2] = 0;
                pixels[offset + 3] = alpha;
            } else if (logicalFormat === WebGL2RenderingContext.LUMINANCE) {
                pixels[offset] = red;
                pixels[offset + 1] = red;
                pixels[offset + 2] = red;
                pixels[offset + 3] = 255;
            } else if (logicalFormat === WebGL2RenderingContext.LUMINANCE_ALPHA) {
                pixels[offset] = red;
                pixels[offset + 1] = red;
                pixels[offset + 2] = red;
                pixels[offset + 3] = alpha;
            } else if (logicalFormat === WebGL2RenderingContext.RGB) {
                pixels[offset + 3] = 255;
            }
        }

        const rowBytes = copyWidth * 4;
        let uploadRows = pixels;
        if (destinationFlipped) {
            uploadRows = new Uint8Array(pixels.byteLength);
            for (let row = 0; row < copyHeight; row++) {
                const sourceOffset = row * rowBytes;
                const destinationOffset = (copyHeight - row - 1) * rowBytes;
                uploadRows.set(pixels.subarray(sourceOffset, sourceOffset + rowBytes), destinationOffset);
            }
        }
        const destinationHeight = Math.max(1, destination.height >> level);
        this.hydDevice.queue.writeTexture(
            {
                texture: destination.texture,
                mipLevel: level,
                origin: {
                    x: destinationLogicalX,
                    y: destinationFlipped
                        ? destinationHeight - destinationLogicalY - copyHeight
                        : destinationLogicalY,
                    z: resolvedDestinationLayer,
                },
            },
            uploadRows,
            { bytesPerRow: rowBytes, rowsPerImage: copyHeight },
            { width: copyWidth, height: copyHeight, depthOrArrayLayers: 1 },
        );
        return true;
    }

    private readSnapshotSynchronously(
        snapshot: ImageBitmap,
        sourceWidth: number,
        sourceHeight: number,
        x: GLint,
        y: GLint,
        width: GLsizei,
        height: GLsizei,
        destination: Uint8Array,
        destinationOffset: number,
    ): boolean {
        const scratch = getSynchronousReadbackScratch();
        if (!scratch) return false;
        const { canvas, gl: readbackGl, texture, framebuffer } = scratch;
        try {
            if (canvas.width !== sourceWidth || canvas.height !== sourceHeight) {
                canvas.width = sourceWidth;
                canvas.height = sourceHeight;
            }
            readbackGl.bindTexture(readbackGl.TEXTURE_2D, texture);
            readbackGl.pixelStorei(readbackGl.UNPACK_FLIP_Y_WEBGL, false);
            readbackGl.pixelStorei(readbackGl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
            readbackGl.pixelStorei(readbackGl.UNPACK_COLORSPACE_CONVERSION_WEBGL, readbackGl.NONE);
            readbackGl.texParameteri(readbackGl.TEXTURE_2D, readbackGl.TEXTURE_MIN_FILTER, readbackGl.NEAREST);
            readbackGl.texParameteri(readbackGl.TEXTURE_2D, readbackGl.TEXTURE_MAG_FILTER, readbackGl.NEAREST);
            if ((globalThis as any).__HYD_DEBUG_READBACK) {
                const probeCanvas = new OffscreenCanvas(snapshot.width, snapshot.height);
                const probeContext = probeCanvas.getContext("2d");
                probeContext?.drawImage(snapshot, 0, 0);
                console.debug("[HYD] readback snapshot center", Array.from(
                    probeContext?.getImageData(snapshot.width >> 1, snapshot.height >> 1, 1, 1).data || [],
                ));
            }
            readbackGl.texImage2D(
                readbackGl.TEXTURE_2D,
                0,
                readbackGl.RGBA,
                readbackGl.RGBA,
                readbackGl.UNSIGNED_BYTE,
                snapshot,
            );
            readbackGl.bindFramebuffer(readbackGl.FRAMEBUFFER, framebuffer);
            readbackGl.framebufferTexture2D(
                readbackGl.FRAMEBUFFER,
                readbackGl.COLOR_ATTACHMENT0,
                readbackGl.TEXTURE_2D,
                texture,
                0,
            );
            if (readbackGl.checkFramebufferStatus(readbackGl.FRAMEBUFFER) !== readbackGl.FRAMEBUFFER_COMPLETE) {
                return false;
            }
            const target = new Uint8Array(
                destination.buffer,
                destination.byteOffset + destinationOffset,
                width * height * 4,
            );
            const nativeY = sourceHeight - y - height;
            readbackGl.readPixels(x, nativeY, width, height, readbackGl.RGBA, readbackGl.UNSIGNED_BYTE, target);
            if (readbackGl.getError() !== readbackGl.NO_ERROR) {
                return false;
            }
            const rowBytes = width * 4;
            const temporaryRow = new Uint8Array(rowBytes);
            for (let row = 0; row < Math.floor(height / 2); row++) {
                const opposite = height - row - 1;
                const rowOffset = row * rowBytes;
                const oppositeOffset = opposite * rowBytes;
                temporaryRow.set(target.subarray(rowOffset, rowOffset + rowBytes));
                target.copyWithin(rowOffset, oppositeOffset, oppositeOffset + rowBytes);
                target.set(temporaryRow, oppositeOffset);
            }
            if ((globalThis as any).__HYD_DEBUG_READBACK && width * height <= 16) {
                console.debug("[HYD] synchronous readback pixels", width, height, Array.from(target));
            }
            return true;
        } catch (error) {
            console.warn("[HYD] native WebGL snapshot readPixels failed:", error);
            return false;
        }
    }

    private readTextureChannelsSynchronously(
        texture: GPUTexture,
        sourceWidth: number,
        sourceHeight: number,
        x: GLint,
        y: GLint,
        width: GLsizei,
        height: GLsizei,
        destination: Uint8Array,
        destinationOffset: number,
        mipLevel: number = 0,
        layer: number = 0,
        opaqueAlpha: boolean = false,
        viewFormat?: GPUTextureFormat,
    ): boolean {
        if (width === 0 || height === 0) return true;
        const byteLength = width * height * 4;
        const rgb = new Uint8Array(byteLength);
        const alpha = opaqueAlpha ? null : new Uint8Array(byteLength);
        let snapshot: ImageBitmap | null = null;
        try {
            snapshot = this.snapshotTextureChannel(
                texture, sourceWidth, sourceHeight, "rgb", mipLevel, layer, viewFormat);
            if (!snapshot || !this.readSnapshotSynchronously(
                snapshot,
                sourceWidth,
                sourceHeight,
                x,
                y,
                width,
                height,
                rgb,
                0,
            )) {
                return false;
            }
            snapshot.close();
            snapshot = null;
            if (alpha) {
                snapshot = this.snapshotTextureChannel(
                    texture, sourceWidth, sourceHeight, "alpha", mipLevel, layer, viewFormat);
                if (!snapshot || !this.readSnapshotSynchronously(
                    snapshot,
                    sourceWidth,
                    sourceHeight,
                    x,
                    y,
                    width,
                    height,
                    alpha,
                    0,
                )) {
                    return false;
                }
            }
            for (let offset = 0; offset < byteLength; offset += 4) {
                const target = destinationOffset + offset;
                destination[target] = rgb[offset];
                destination[target + 1] = rgb[offset + 1];
                destination[target + 2] = rgb[offset + 2];
                destination[target + 3] = alpha ? alpha[offset] : 255;
            }
            return true;
        } catch (error) {
            console.warn("[HYD] lossless texture-channel readback failed:", error);
            return false;
        } finally {
            snapshot?.close();
        }
    }

    private prepareExactExternalReadCanvas(): HTMLCanvasElement | null {
        if (!this.defaultFramebufferBackingTexture || this.hydCanvas.width <= 0 || this.hydCanvas.height <= 0) {
            return null;
        }
        const width = this.hydCanvas.width;
        const height = this.hydCanvas.height;
        const pixels = new Uint8Array(width * height * 4);
        if (!this.readTextureChannelsSynchronously(
            this.defaultFramebufferBackingTexture,
            width,
            height,
            0,
            0,
            width,
            height,
            pixels,
            0,
        )) {
            return null;
        }
        if (this.hydGlobalState.contextAttributes.alpha !== false &&
            this.hydGlobalState.contextAttributes.premultipliedAlpha === false) {
            return prepareStraightAlphaCanvas(pixels, width, height);
        }
        const rowBytes = width * 4;
        const temporaryRow = new Uint8Array(rowBytes);
        for (let row = 0; row < Math.floor(height / 2); row++) {
            const opposite = height - row - 1;
            const rowOffset = row * rowBytes;
            const oppositeOffset = opposite * rowBytes;
            temporaryRow.set(pixels.subarray(rowOffset, rowOffset + rowBytes));
            pixels.copyWithin(rowOffset, oppositeOffset, oppositeOffset + rowBytes);
            pixels.set(temporaryRow, oppositeOffset);
        }
        const premultiplied = this.hydGlobalState.contextAttributes.alpha !== false &&
            this.hydGlobalState.contextAttributes.premultipliedAlpha !== false;
        for (let offset = 0; offset < pixels.length; offset += 4) {
            if (this.hydGlobalState.contextAttributes.alpha === false) {
                pixels[offset + 3] = 255;
            } else if (premultiplied) {
                const alpha = pixels[offset + 3];
                if (alpha === 0) {
                    pixels[offset] = 0;
                    pixels[offset + 1] = 0;
                    pixels[offset + 2] = 0;
                } else {
                    pixels[offset] = Math.min(255, Math.round(pixels[offset] * 255 / alpha));
                    pixels[offset + 1] = Math.min(255, Math.round(pixels[offset + 1] * 255 / alpha));
                    pixels[offset + 2] = Math.min(255, Math.round(pixels[offset + 2] * 255 / alpha));
                }
            }
        }
        if (!this.exactExternalReadCanvas) {
            this.exactExternalReadCanvas = document.createElement("canvas");
            this.exactExternalReadContext = this.exactExternalReadCanvas.getContext("2d");
        }
        const canvas = this.exactExternalReadCanvas;
        const context = this.exactExternalReadContext;
        if (!canvas || !context) {
            return null;
        }
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        context.putImageData(new ImageData(
            new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, pixels.byteLength),
            width,
            height,
        ), 0, 0);
        return canvas;
    }

    private readColorAttachmentSynchronously(
        attachment: FramebufferAttributes,
        x: GLint,
        y: GLint,
        width: GLsizei,
        height: GLsizei,
        destination: Uint8Array,
        destinationOffset: number,
    ): boolean {
        if (attachment.format !== "rgba8unorm" &&
            attachment.format !== "bgra8unorm" &&
            attachment.format !== "rgba8unorm-srgb" &&
            attachment.format !== "r8unorm" &&
            attachment.format !== "rg8unorm" &&
            attachment.format !== "rgb10a2unorm") {
            return false;
        }
        const level = attachment.level || 0;
        const sourceWidth = attachment.width;
        const sourceHeight = attachment.height;
        const cubeLayer = attachment.face >= WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X &&
            attachment.face <= WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z
            ? attachment.face - WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X
            : 0;
        const layer = attachment.layer === undefined ? cubeLayer : attachment.layer;
        const framebufferOriented = this.samplerNeedsOriginFlip(attachment.attachment);
        const readY = framebufferOriented ? y : sourceHeight - y - height;
        let sourceTexture = attachment.attachment.texture;
        let sourceLevel = level;
        let sourceLayer = layer;
        let temporarySlice: GPUTexture | null = null;
        try {
            if (attachment.attachment.textureDimension === "3d") {
                temporarySlice = this.hydDevice.createTexture({
                    label: "3d framebuffer layer readback slice",
                    size: { width: sourceWidth, height: sourceHeight, depthOrArrayLayers: 1 },
                    format: attachment.format,
                    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING,
                    viewFormats: attachment.format === "rgba8unorm-srgb" ? ["rgba8unorm"] : undefined,
                });
                const encoder = this.hydDevice.createCommandEncoder({ label: "copy 3d framebuffer layer for readback" });
                encoder.copyTextureToTexture(
                    {
                        texture: sourceTexture,
                        mipLevel: level,
                        origin: { x: 0, y: 0, z: layer },
                    },
                    { texture: temporarySlice },
                    { width: sourceWidth, height: sourceHeight, depthOrArrayLayers: 1 },
                );
                this.hydDevice.queue.submit([encoder.finish()]);
                sourceTexture = temporarySlice;
                sourceLevel = 0;
                sourceLayer = 0;
            }
            const read = this.readTextureChannelsSynchronously(
                sourceTexture,
                sourceWidth,
                sourceHeight,
                x,
                readY,
                width,
                height,
                destination,
                destinationOffset,
                sourceLevel,
                sourceLayer,
                attachment.colorBits[3] === 0,
                attachment.format === "rgba8unorm-srgb" ? "rgba8unorm" : undefined,
            );
            if (read && !framebufferOriented) {
                const rowBytes = width * 4;
                const temporaryRow = new Uint8Array(rowBytes);
                for (let row = 0; row < Math.floor(height / 2); row++) {
                    const opposite = height - row - 1;
                    const rowOffset = destinationOffset + row * rowBytes;
                    const oppositeOffset = destinationOffset + opposite * rowBytes;
                    temporaryRow.set(destination.subarray(rowOffset, rowOffset + rowBytes));
                    destination.copyWithin(rowOffset, oppositeOffset, oppositeOffset + rowBytes);
                    destination.set(temporaryRow, oppositeOffset);
                }
            }
            return read;
        } catch (error) {
            console.warn("[HYD] synchronous color-attachment readPixels failed:", error);
            return false;
        } finally {
            temporarySlice?.destroy();
        }
    }

    private enqueuePixelPackRgba8Readback(
        attachment: FramebufferAttributes,
        x: GLint,
        y: GLint,
        width: GLsizei,
        height: GLsizei,
        destinationBuffer: HydBuffer,
        destinationOffset: number,
        destinationFirstRow: number,
        destinationColumnOffset: number,
        layout: ReturnType<typeof packedPixelLayout>,
    ): boolean {
        if (attachment.format !== "rgba8unorm" && attachment.format !== "rgba8unorm-srgb") {
            return false;
        }

        const sourceHeight = attachment.height;
        const { sourceY, reverseRows } = webGlReadPixelsCopyLayout(sourceHeight, y, height);
        const rowBytes = width * 4;
        const bytesPerRow = this.alignReadbackBytesPerRow(rowBytes);
        const stagingBuffer = this.hydDevice.createBuffer({
            label: "webgl-pixel-pack-readback",
            size: bytesPerRow * height,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });
        const encoder = this.hydDevice.createCommandEncoder({
            label: "webgl-pixel-pack-copy",
        });
        encoder.copyTextureToBuffer(
            {
                texture: attachment.attachment.texture,
                mipLevel: attachment.level || 0,
                origin: { x, y: sourceY, z: attachment.layer || 0 },
            },
            {
                buffer: stagingBuffer,
                bytesPerRow,
                rowsPerImage: height,
            },
            { width, height, depthOrArrayLayers: 1 },
        );
        this.hydDevice.queue.submit([encoder.finish()]);

        let pendingForBuffer = this.pendingPixelPackReadbacks.get(destinationBuffer);
        if (!pendingForBuffer) {
            pendingForBuffer = new Set();
            this.pendingPixelPackReadbacks.set(destinationBuffer, pendingForBuffer);
        }
        const pendingState = {
            settled: false,
            fallbackUsed: false,
            completeSynchronously: () => {
                const source = new Uint8Array(rowBytes * height);
                if (!this.readColorAttachmentSynchronously(
                    attachment,
                    x,
                    y,
                    width,
                    height,
                    source,
                    0,
                )) {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                    return;
                }
                this.writePixelPackRgba8Rows(
                    source,
                    rowBytes,
                    width,
                    height,
                    false,
                    attachment.colorBits[3] === 0,
                    destinationBuffer,
                    destinationOffset,
                    destinationFirstRow,
                    destinationColumnOffset,
                    layout,
                );
            },
        };
        pendingForBuffer.add(pendingState);
        let mapped = false;
        const readback = stagingBuffer.mapAsync(GPUMapMode.READ)
            .then(() => {
                mapped = true;
                const source = new Uint8Array(stagingBuffer.getMappedRange());
                this.writePixelPackRgba8Rows(
                    source,
                    bytesPerRow,
                    width,
                    height,
                    reverseRows,
                    attachment.colorBits[3] === 0,
                    destinationBuffer,
                    destinationOffset,
                    destinationFirstRow,
                    destinationColumnOffset,
                    layout,
                );
            })
            .catch((error) => {
                console.error("[HYD] asynchronous pixel-pack readback failed:", error);
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            })
            .finally(() => {
                pendingState.settled = true;
                pendingForBuffer.delete(pendingState);
                if (mapped) stagingBuffer.unmap();
                stagingBuffer.destroy();
            });
        this.pendingReadbacks.push(readback);
        return true;
    }

    private writePixelPackRgba8Rows(
        source: Uint8Array,
        sourceBytesPerRow: number,
        width: GLsizei,
        height: GLsizei,
        reverseRows: boolean,
        opaqueAlpha: boolean,
        destinationBuffer: HydBuffer,
        destinationOffset: number,
        destinationFirstRow: number,
        destinationColumnOffset: number,
        layout: ReturnType<typeof packedPixelLayout>,
    ) {
        const rowBytes = width * 4;
        for (let row = 0; row < height; row++) {
            const destinationRow = reverseRows ? height - row - 1 : row;
            const sourceRowOffset = row * sourceBytesPerRow;
            const targetRowOffset = destinationOffset + layout.dataOffset +
                (destinationFirstRow + destinationRow) * layout.rowStride + destinationColumnOffset;
            destinationBuffer.shadowData.set(
                source.subarray(sourceRowOffset, sourceRowOffset + rowBytes),
                targetRowOffset,
            );
            if (opaqueAlpha) {
                for (let column = 0; column < width; column++) {
                    destinationBuffer.shadowData[targetRowOffset + column * 4 + 3] = 255;
                }
            }
        }
        destinationBuffer.commitShadowData(destinationOffset, layout.requiredBytes);
    }

    private readPackedUnormColorAttachmentSynchronously(
        attachment: FramebufferAttributes,
        x: GLint,
        y: GLint,
        width: GLsizei,
        height: GLsizei,
        destination: Uint8Array,
        destinationOffset: number,
    ): boolean {
        if (attachment.format !== "rgb10a2unorm") return false;
        const level = attachment.level || 0;
        const sourceWidth = attachment.width;
        const sourceHeight = attachment.height;
        const cubeLayer = attachment.face >= WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X &&
            attachment.face <= WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z
            ? attachment.face - WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X
            : 0;
        const layer = attachment.layer === undefined ? cubeLayer : attachment.layer;
        const framebufferOriented = this.samplerNeedsOriginFlip(attachment.attachment);
        const readY = framebufferOriented ? y : sourceHeight - y - height;
        let snapshot: ImageBitmap | null = null;
        try {
            snapshot = this.snapshotPackedUnormTexture(
                attachment.attachment.texture,
                sourceWidth,
                sourceHeight,
                level,
                layer,
            );
            if (!snapshot) return false;
            const encoded = new Uint8Array(width * height * 2 * 4);
            if (!this.readSnapshotSynchronously(
                snapshot,
                sourceWidth * 2,
                sourceHeight,
                x * 2,
                readY,
                width * 2,
                height,
                encoded,
                0,
            )) {
                return false;
            }
            const destinationView = new DataView(
                destination.buffer,
                destination.byteOffset,
                destination.byteLength,
            );
            for (let row = 0; row < height; row++) {
                for (let column = 0; column < width; column++) {
                    const encodedPixel = (row * width + column) * 2;
                    const lowOffset = encodedPixel * 4;
                    const highOffset = (encodedPixel + 1) * 4;
                    const word = (encoded[lowOffset] |
                        (encoded[lowOffset + 1] << 8) |
                        (encoded[lowOffset + 2] << 16) |
                        (encoded[highOffset] << 24)) >>> 0;
                    destinationView.setUint32(
                        destinationOffset + (row * width + column) * 4,
                        word,
                        true,
                    );
                }
            }
            if (!framebufferOriented) {
                const rowBytes = width * 4;
                const temporaryRow = new Uint8Array(rowBytes);
                for (let row = 0; row < Math.floor(height / 2); row++) {
                    const opposite = height - row - 1;
                    const rowOffset = destinationOffset + row * rowBytes;
                    const oppositeOffset = destinationOffset + opposite * rowBytes;
                    temporaryRow.set(destination.subarray(rowOffset, rowOffset + rowBytes));
                    destination.copyWithin(rowOffset, oppositeOffset, oppositeOffset + rowBytes);
                    destination.set(temporaryRow, oppositeOffset);
                }
            }
            return true;
        } catch (error) {
            console.warn("[HYD] synchronous packed color-attachment readPixels failed:", error);
            return false;
        } finally {
            snapshot?.close();
        }
    }

    private readIntegerColorAttachmentSynchronously(
        attachment: FramebufferAttributes,
        x: GLint,
        y: GLint,
        width: GLsizei,
        height: GLsizei,
        destination: Uint8Array,
        destinationOffset: number,
        signed: boolean,
    ): boolean {
        if (signed ? !attachment.format.endsWith("sint") : !attachment.format.endsWith("uint")) {
            return false;
        }
        const level = attachment.level || 0;
        const sourceWidth = attachment.width;
        const sourceHeight = attachment.height;
        const cubeLayer = attachment.face >= WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X &&
            attachment.face <= WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z
            ? attachment.face - WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X
            : 0;
        const layer = attachment.layer === undefined ? cubeLayer : attachment.layer;
        const framebufferOriented = this.samplerNeedsOriginFlip(attachment.attachment);
        const readY = framebufferOriented ? y : sourceHeight - y - height;
        let sourceTexture = attachment.attachment.texture;
        let sourceLevel = level;
        let sourceLayer = layer;
        let temporarySlice: GPUTexture | null = null;
        let snapshot: ImageBitmap | null = null;
        try {
            if (attachment.attachment.textureDimension === "3d") {
                temporarySlice = this.hydDevice.createTexture({
                    label: "3d integer framebuffer layer readback slice",
                    size: { width: sourceWidth, height: sourceHeight, depthOrArrayLayers: 1 },
                    format: attachment.format,
                    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING,
                });
                const encoder = this.hydDevice.createCommandEncoder({ label: "copy 3d integer layer for readback" });
                encoder.copyTextureToTexture(
                    { texture: sourceTexture, mipLevel: level, origin: { x: 0, y: 0, z: layer } },
                    { texture: temporarySlice },
                    { width: sourceWidth, height: sourceHeight, depthOrArrayLayers: 1 },
                );
                this.hydDevice.queue.submit([encoder.finish()]);
                sourceTexture = temporarySlice;
                sourceLevel = 0;
                sourceLayer = 0;
            }
            snapshot = this.snapshotIntegerTexture(
                sourceTexture, sourceWidth, sourceHeight, signed, sourceLevel, sourceLayer);
            if (!snapshot) return false;
            const encoded = new Uint8Array(width * height * 8 * 4);
            if (!this.readSnapshotSynchronously(
                snapshot,
                sourceWidth * 8,
                sourceHeight,
                x * 8,
                readY,
                width * 8,
                height,
                encoded,
                0,
            )) {
                return false;
            }
            const destinationView = new DataView(
                destination.buffer, destination.byteOffset, destination.byteLength);
            for (let row = 0; row < height; row++) {
                for (let column = 0; column < width; column++) {
                    for (let component = 0; component < 4; component++) {
                        const encodedPixel = (row * width + column) * 8 + component * 2;
                        const encodedOffset = encodedPixel * 4;
                        const highByteOffset = (encodedPixel + 1) * 4;
                        const word = (encoded[encodedOffset] |
                            (encoded[encodedOffset + 1] << 8) |
                            (encoded[encodedOffset + 2] << 16) |
                            (encoded[highByteOffset] << 24)) >>> 0;
                        const targetOffset = destinationOffset +
                            ((row * width + column) * 4 + component) * 4;
                        destinationView.setUint32(targetOffset, word, true);
                    }
                }
            }
            if (!framebufferOriented) {
                const rowBytes = width * 16;
                const temporaryRow = new Uint8Array(rowBytes);
                for (let row = 0; row < Math.floor(height / 2); row++) {
                    const opposite = height - row - 1;
                    const rowOffset = destinationOffset + row * rowBytes;
                    const oppositeOffset = destinationOffset + opposite * rowBytes;
                    temporaryRow.set(destination.subarray(rowOffset, rowOffset + rowBytes));
                    destination.copyWithin(rowOffset, oppositeOffset, oppositeOffset + rowBytes);
                    destination.set(temporaryRow, oppositeOffset);
                }
            }
            return true;
        } catch (error) {
            console.warn("[HYD] synchronous integer attachment readPixels failed:", error);
            return false;
        } finally {
            snapshot?.close();
            temporarySlice?.destroy();
        }
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
        try {
            this.activateDefaultFramebufferBacking(true);
            this.materializeImplicitDefaultFramebufferClear();
            this._der_flush();
            if (this.readTextureChannelsSynchronously(
                this.defaultFramebufferBackingTexture,
                this.hydCanvas.width,
                this.hydCanvas.height,
                x,
                y,
                width,
                height,
                destination,
                destinationOffset,
                0,
                0,
                this.hydGlobalState.contextAttributes.alpha === false,
            )) {
                return true;
            }
        } catch (error) {
            console.warn("[HYD] native WebGL default-framebuffer readPixels failed:", error);
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

    readPixels(
        x: GLint,
        y: GLint,
        width: GLsizei,
        height: GLsizei,
        format: GLenum,
        type: GLenum,
        pixels: ArrayBufferView | GLintptr | null,
        dstOffset: GLuint = 0,
    ) {
        if (width < 0 || height < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const pixelPackBuffer = this.hydGlobalState.commonState.pixelPackBufferBinding;
        if (pixelPackBuffer && typeof pixels !== "number") {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const validReadFormats = new Set<GLenum>([
            WebGL2RenderingContext.ALPHA,
            WebGL2RenderingContext.RED,
            WebGL2RenderingContext.RG,
            WebGL2RenderingContext.RGB,
            WebGL2RenderingContext.RGBA,
            WebGL2RenderingContext.RED_INTEGER,
            WebGL2RenderingContext.RG_INTEGER,
            WebGL2RenderingContext.RGB_INTEGER,
            WebGL2RenderingContext.RGBA_INTEGER,
        ]);
        const validReadTypes = new Set<GLenum>([
            WebGL2RenderingContext.BYTE,
            WebGL2RenderingContext.UNSIGNED_BYTE,
            WebGL2RenderingContext.SHORT,
            WebGL2RenderingContext.UNSIGNED_SHORT,
            WebGL2RenderingContext.INT,
            WebGL2RenderingContext.UNSIGNED_INT,
            WebGL2RenderingContext.HALF_FLOAT,
            WebGL2RenderingContext.FLOAT,
            WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5,
            WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4,
            WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1,
            WebGL2RenderingContext.UNSIGNED_INT_2_10_10_10_REV,
            WebGL2RenderingContext.UNSIGNED_INT_10F_11F_11F_REV,
            WebGL2RenderingContext.UNSIGNED_INT_5_9_9_9_REV,
        ]);
        if (!validReadFormats.has(format) || !validReadTypes.has(type)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        const normalizedRead = format === WebGL2RenderingContext.RGBA &&
            type === WebGL2RenderingContext.UNSIGNED_BYTE;
        const integerRead = format === WebGL2RenderingContext.RGBA_INTEGER &&
            (type === WebGL2RenderingContext.INT || type === WebGL2RenderingContext.UNSIGNED_INT);
        const packedUnormRead = format === WebGL2RenderingContext.RGBA &&
            type === WebGL2RenderingContext.UNSIGNED_INT_2_10_10_10_REV;
        if (!normalizedRead && !integerRead && !packedUnormRead) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (pixels === null) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const readFramebuffer = this.hydGlobalState.commonState.readFramebufferBinding;
        if (readFramebuffer.readBuffer === WebGL2RenderingContext.NONE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (this.framebufferStatus(readFramebuffer) !== WebGL2RenderingContext.FRAMEBUFFER_COMPLETE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_FRAMEBUFFER_OPERATION);
            return;
        }
        const readsDefaultFramebuffer = readFramebuffer === this.hydGlobalState.defaultFramebuffer;
        const attachment = readsDefaultFramebuffer ? null : this.getReadColorAttachment();
        if (attachment && attachment.sampleCount > 1) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (this.canvasSizeDirty) this.updateCanvasSize();
        const bytesPerPixel = integerRead ? 16 : 4;
        const packState = this.hydGlobalState.miscState;
        const effectivePackRowLength = packState.packRowLength || width;
        if (effectivePackRowLength < width || packState.packSkipPixels + width > effectivePackRowLength) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const layout = packedPixelLayout(
            width,
            height,
            bytesPerPixel,
            packState.packAlignment,
            packState.packRowLength,
            packState.packSkipPixels,
            packState.packSkipRows,
        );
        let destination: Uint8Array | null = null;
        let destinationOffset = 0;
        let destinationBuffer: HydBuffer | null = null;

        if (typeof pixels === "number") {
            const buffer = pixelPackBuffer;
            if (!buffer) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            if (this.bufferOperationConflictsWithTransformFeedback(buffer, WebGL2RenderingContext.PIXEL_PACK_BUFFER)) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            destinationOffset = pixels;
            if (destinationOffset < 0) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                return;
            }
            if (destinationOffset + layout.requiredBytes > buffer.webglSize) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            destination = buffer.shadowData;
            destinationBuffer = buffer;
        } else if (pixels && "byteLength" in pixels) {
            const bytesPerElement = (pixels as any).BYTES_PER_ELEMENT;
            const compatible = normalizedRead
                ? pixels instanceof Uint8Array || pixels instanceof Uint8ClampedArray
                : packedUnormRead
                    ? pixels instanceof Uint32Array
                : type === WebGL2RenderingContext.INT
                    ? pixels instanceof Int32Array
                    : pixels instanceof Uint32Array;
            if (!compatible) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            destination = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength);
            if (dstOffset < 0 || dstOffset > (pixels as any).length) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                return;
            }
            destinationOffset = dstOffset * bytesPerElement;
            if (destinationOffset + layout.requiredBytes > destination.byteLength) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
        }

        if (!destination) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (width === 0 || height === 0) {
            return;
        }

        if (integerRead && readsDefaultFramebuffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (!readsDefaultFramebuffer && !attachment) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (packedUnormRead &&
            (readsDefaultFramebuffer || attachment.internalFormat !== WebGL2RenderingContext.RGB10_A2)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const sourceWidth = readsDefaultFramebuffer ? this.hydCanvas.width : attachment.width;
        const sourceHeight = readsDefaultFramebuffer ? this.hydCanvas.height : attachment.height;
        const sourceX0 = Math.max(0, x);
        const sourceY0 = Math.max(0, y);
        const sourceX1 = Math.min(sourceWidth, x + width);
        const sourceY1 = Math.min(sourceHeight, y + height);
        const clippedWidth = Math.max(0, sourceX1 - sourceX0);
        const clippedHeight = Math.max(0, sourceY1 - sourceY0);
        if (clippedWidth === 0 || clippedHeight === 0) {
            return;
        }

        this._der_flush();
        if (destinationBuffer && normalizedRead && attachment && this.enqueuePixelPackRgba8Readback(
            attachment,
            sourceX0,
            sourceY0,
            clippedWidth,
            clippedHeight,
            destinationBuffer,
            destinationOffset,
            sourceY0 - y,
            (sourceX0 - x) * bytesPerPixel,
            layout,
        )) {
            this.hydGlobalState.recordTransition("readPixels", x, y, width, height, format, type);
            return;
        }
        const tightPixels = new Uint8Array(clippedWidth * clippedHeight * bytesPerPixel);
        const cacheKey = normalizedRead && !destinationBuffer
            ? `${readFramebuffer.hash}:${sourceX0}:${sourceY0}:${clippedWidth}:${clippedHeight}`
            : null;
        const cachedRead = cacheKey && this.normalizedReadPixelsCache?.stateToken === this.hydGlobalState.stateToken &&
            this.normalizedReadPixelsCache.writeGeneration === this.framebufferWriteGeneration &&
            this.normalizedReadPixelsCache.key === cacheKey &&
            this.normalizedReadPixelsCache.pixels.byteLength === tightPixels.byteLength
            ? this.normalizedReadPixelsCache
            : null;
        let read = true;
        if (cachedRead) {
            tightPixels.set(cachedRead.pixels);
        } else {
            read = packedUnormRead
                ? this.readPackedUnormColorAttachmentSynchronously(
                    attachment,
                    sourceX0,
                    sourceY0,
                    clippedWidth,
                    clippedHeight,
                    tightPixels,
                    0,
                )
                : integerRead
                ? this.readIntegerColorAttachmentSynchronously(
                    attachment,
                    sourceX0,
                    sourceY0,
                    clippedWidth,
                    clippedHeight,
                    tightPixels,
                    0,
                    type === WebGL2RenderingContext.INT,
                )
                : readsDefaultFramebuffer
                ? this.readDefaultFramebufferSynchronously(
                    sourceX0, sourceY0, clippedWidth, clippedHeight, tightPixels, 0)
                : this.readColorAttachmentSynchronously(
                    attachment, sourceX0, sourceY0, clippedWidth, clippedHeight, tightPixels, 0);
            if (read && cacheKey) {
                this.normalizedReadPixelsCache = {
                    stateToken: this.hydGlobalState.stateToken,
                    writeGeneration: this.framebufferWriteGeneration,
                    key: cacheKey,
                    pixels: tightPixels.slice(),
                };
            }
        }
        if (!read) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const destinationColumnOffset = (sourceX0 - x) * bytesPerPixel;
        const destinationFirstRow = sourceY0 - y;
        const tightRowBytes = clippedWidth * bytesPerPixel;
        for (let row = 0; row < clippedHeight; row++) {
            const sourceOffset = row * tightRowBytes;
            const targetOffset = destinationOffset +
                layout.dataOffset +
                (destinationFirstRow + row) * layout.rowStride + destinationColumnOffset;
            destination.set(tightPixels.subarray(sourceOffset, sourceOffset + tightRowBytes), targetOffset);
        }
        if (destinationBuffer) {
            destinationBuffer.commitShadowData(destinationOffset, layout.requiredBytes);
            this.hydGlobalState.recordTransition("readPixels", x, y, width, height, format, type);
        }
    }

    drawBuffers(buffers: Array<GLenum>) {
        const normalized = Array.from(buffers || [], (value) => Number(value) >>> 0);
        const framebuffer = this.hydGlobalState.commonState.drawFramebufferBinding;
        const maxDrawBuffers = Number(enumToConstant.get(WebGL2RenderingContext.MAX_DRAW_BUFFERS)) || 1;
        if (normalized.length > maxDrawBuffers) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const validTokens = normalized.every((value) => value === WebGL2RenderingContext.NONE ||
            value === WebGL2RenderingContext.BACK ||
            (value >= WebGL2RenderingContext.COLOR_ATTACHMENT0 &&
                value < WebGL2RenderingContext.COLOR_ATTACHMENT0 + maxDrawBuffers));
        if (!validTokens) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (framebuffer === this.hydGlobalState.defaultFramebuffer) {
            if (normalized.length !== 1 ||
                (normalized[0] !== WebGL2RenderingContext.BACK && normalized[0] !== WebGL2RenderingContext.NONE)) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
        } else {
            for (let index = 0; index < normalized.length; index++) {
                const value = normalized[index];
                if (value !== WebGL2RenderingContext.NONE &&
                    value !== WebGL2RenderingContext.COLOR_ATTACHMENT0 + index) {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                    return;
                }
            }
        }
        this._der_flush();
        framebuffer.drawBuffers = normalized;
        framebuffer.resetHash();
        this.gpuViewportDirty = true;
        this.gpuScissorDirty = true;
        this.hydGlobalState.recordTransition("drawBuffers", ...normalized);
    }

    readBuffer(mode: GLenum) {
        if (this.hydContextType !== "webgl2") {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const framebuffer = this.hydGlobalState.commonState.readFramebufferBinding;
        const isDefault = framebuffer === this.hydGlobalState.defaultFramebuffer;
        const maxColorAttachments = Number(enumToConstant.get(WebGL2RenderingContext.MAX_COLOR_ATTACHMENTS)) || 1;
        if (isDefault) {
            if (mode !== WebGL2RenderingContext.BACK && mode !== WebGL2RenderingContext.NONE) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
        } else if (mode !== WebGL2RenderingContext.NONE) {
            if (mode === WebGL2RenderingContext.BACK) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            if (mode < WebGL2RenderingContext.COLOR_ATTACHMENT0) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return;
            }
            if (mode >= WebGL2RenderingContext.COLOR_ATTACHMENT0 + maxColorAttachments) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
        }
        if (framebuffer.readBuffer !== mode) {
            framebuffer.readBuffer = mode;
            framebuffer.resetHash();
        }
        this.hydGlobalState.recordTransition("readBuffer", mode);
    }

    private validateInvalidateFramebufferAttachments(target: GLenum, attachments: ArrayLike<GLenum>): boolean {
        if (!this.validateFramebufferTarget(target)) return false;
        const framebuffer = this.getFramebufferForTarget(target);
        const isDefault = framebuffer === this.hydGlobalState.defaultFramebuffer;
        const maxColorAttachments = Number(enumToConstant.get(WebGL2RenderingContext.MAX_COLOR_ATTACHMENTS)) || 1;
        for (let index = 0; index < attachments.length; index++) {
            const attachment = Number(attachments[index]);
            if (isDefault) {
                if (attachment !== WebGL2RenderingContext.COLOR &&
                    attachment !== WebGL2RenderingContext.DEPTH &&
                    attachment !== WebGL2RenderingContext.STENCIL) {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                    return false;
                }
                continue;
            }
            const colorAttachment = attachment >= WebGL2RenderingContext.COLOR_ATTACHMENT0 &&
                attachment < WebGL2RenderingContext.COLOR_ATTACHMENT0 + maxColorAttachments;
            if (!colorAttachment &&
                attachment !== WebGL2RenderingContext.DEPTH_ATTACHMENT &&
                attachment !== WebGL2RenderingContext.STENCIL_ATTACHMENT &&
                attachment !== WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT) {
                const exceedsColorAttachments = attachment >= WebGL2RenderingContext.COLOR_ATTACHMENT0;
                this.hydGlobalState.setError(exceedsColorAttachments
                    ? WebGL2RenderingContext.INVALID_OPERATION
                    : WebGL2RenderingContext.INVALID_ENUM);
                return false;
            }
        }
        return true;
    }

    invalidateFramebuffer(target: GLenum, attachments: ArrayLike<GLenum>) {
        if (!this.validateInvalidateFramebufferAttachments(target, attachments)) return;
        this._der_flush();
        this.hydGlobalState.recordTransition(
            "invalidateFramebuffer",
            target,
            ...Array.from(attachments, Number),
        );
    }

    invalidateSubFramebuffer(
        target: GLenum,
        attachments: ArrayLike<GLenum>,
        x: GLint,
        y: GLint,
        width: GLsizei,
        height: GLsizei,
    ) {
        if (width < 0 || height < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (!this.validateInvalidateFramebufferAttachments(target, attachments)) return;
        this._der_flush();
        this.hydGlobalState.recordTransition(
            "invalidateSubFramebuffer",
            target,
            x,
            y,
            width,
            height,
            ...Array.from(attachments, Number),
        );
    }

    fenceSync(condition: GLenum, flags: GLbitfield): HydSync | null {
        if (condition !== WebGL2RenderingContext.SYNC_GPU_COMMANDS_COMPLETE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        if (flags !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return null;
        }
        this._der_flush();
        const pending: Promise<unknown>[] = this.pendingReadbacks.splice(0);
        pending.push(typeof this.hydDevice.queue.onSubmittedWorkDone === "function"
            ? this.hydDevice.queue.onSubmittedWorkDone()
            : Promise.resolve());
        const sync = brandHydWebGlObject(
            new HydSync(this.contextToken, condition, flags, false),
            "sync",
        );
        this.syncObjects.add(sync);
        Promise.allSettled(pending).then(() => {
            sync.signaled = true;
        });
        return sync;
    }

    clientWaitSync(sync: HydSync, flags: GLbitfield, timeout: GLuint64) {
        if (!(sync instanceof HydSync) || sync.ownerToken !== this.contextToken) {
            this.hydGlobalState.setError(sync instanceof HydSync
                ? WebGL2RenderingContext.INVALID_OPERATION
                : WebGL2RenderingContext.INVALID_VALUE);
            return WebGL2RenderingContext.WAIT_FAILED;
        }
        if (sync.deleted) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return WebGL2RenderingContext.WAIT_FAILED;
        }
        if (flags !== 0 && flags !== WebGL2RenderingContext.SYNC_FLUSH_COMMANDS_BIT) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return WebGL2RenderingContext.WAIT_FAILED;
        }
        const maxTimeout = Number(enumToConstant.get(WebGL2RenderingContext.MAX_CLIENT_WAIT_TIMEOUT_WEBGL)) || 0;
        if (Number(timeout) > maxTimeout) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return WebGL2RenderingContext.WAIT_FAILED;
        }
        if (flags === WebGL2RenderingContext.SYNC_FLUSH_COMMANDS_BIT) this._der_flush();
        return sync.signaled ? WebGL2RenderingContext.ALREADY_SIGNALED : WebGL2RenderingContext.TIMEOUT_EXPIRED;
    }

    waitSync(sync: HydSync, flags: GLbitfield, timeout: GLint64) {
        if (!(sync instanceof HydSync) || sync.ownerToken !== this.contextToken) {
            this.hydGlobalState.setError(sync instanceof HydSync
                ? WebGL2RenderingContext.INVALID_OPERATION
                : WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (sync.deleted) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (flags !== 0 || timeout !== WebGL2RenderingContext.TIMEOUT_IGNORED) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
        }
    }

    deleteSync(sync: HydSync | null) {
        if (sync === null) return;
        if (!(sync instanceof HydSync) || sync.ownerToken !== this.contextToken) {
            this.hydGlobalState.setError(sync instanceof HydSync
                ? WebGL2RenderingContext.INVALID_OPERATION
                : WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (sync.deleted) return;
        sync.deleted = true;
        this.syncObjects.delete(sync);
    }

    isSync(sync: HydSync | null) {
        return sync instanceof HydSync && sync.ownerToken === this.contextToken && !sync.deleted;
    }

    getSyncParameter(sync: HydSync, pname: GLenum) {
        if (!(sync instanceof HydSync) || sync.ownerToken !== this.contextToken || sync.deleted) {
            this.hydGlobalState.setError(sync instanceof HydSync && sync.ownerToken !== this.contextToken
                ? WebGL2RenderingContext.INVALID_OPERATION
                : WebGL2RenderingContext.INVALID_VALUE);
            return null;
        }
        switch (pname) {
            case WebGL2RenderingContext.OBJECT_TYPE:
                return WebGL2RenderingContext.SYNC_FENCE;
            case WebGL2RenderingContext.SYNC_STATUS:
                return sync.signaled ? WebGL2RenderingContext.SIGNALED : WebGL2RenderingContext.UNSIGNALED;
            case WebGL2RenderingContext.SYNC_CONDITION:
                return sync.condition;
            case WebGL2RenderingContext.SYNC_FLAGS:
                return sync.flags;
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return null;
        }
    }

    flush() {
        this._der_flush();
    }

    finish() {
        this._der_flush();
    }

    pixelStorei(pname: GLenum, param: GLint | GLboolean) {
        pname = toWebGlInt32(pname);
        const value = typeof param === "boolean" ? (param ? 1 : 0) : toWebGlInt32(param);
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
                if (value !== hydWebGLConstants.BROWSER_DEFAULT_WEBGL && value !== hydWebGLConstants.NONE) {
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
            case WebGL2RenderingContext.UNPACK_ROW_LENGTH:
            case WebGL2RenderingContext.UNPACK_IMAGE_HEIGHT:
            case WebGL2RenderingContext.UNPACK_SKIP_PIXELS:
            case WebGL2RenderingContext.UNPACK_SKIP_ROWS:
            case WebGL2RenderingContext.UNPACK_SKIP_IMAGES:
            case WebGL2RenderingContext.PACK_ROW_LENGTH:
            case WebGL2RenderingContext.PACK_SKIP_PIXELS:
            case WebGL2RenderingContext.PACK_SKIP_ROWS:
                if (this.hydContextType !== "webgl2") {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                    return;
                }
                if (value < 0) {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                    return;
                }
                switch (pname) {
                    case WebGL2RenderingContext.UNPACK_ROW_LENGTH: this.hydGlobalState.miscState.unpackRowLength = value; break;
                    case WebGL2RenderingContext.UNPACK_IMAGE_HEIGHT: this.hydGlobalState.miscState.unpackImageHeight = value; break;
                    case WebGL2RenderingContext.UNPACK_SKIP_PIXELS: this.hydGlobalState.miscState.unpackSkipPixels = value; break;
                    case WebGL2RenderingContext.UNPACK_SKIP_ROWS: this.hydGlobalState.miscState.unpackSkipRows = value; break;
                    case WebGL2RenderingContext.UNPACK_SKIP_IMAGES: this.hydGlobalState.miscState.unpackSkipImages = value; break;
                    case WebGL2RenderingContext.PACK_ROW_LENGTH: this.hydGlobalState.miscState.packRowLength = value; break;
                    case WebGL2RenderingContext.PACK_SKIP_PIXELS: this.hydGlobalState.miscState.packSkipPixels = value; break;
                    case WebGL2RenderingContext.PACK_SKIP_ROWS: this.hydGlobalState.miscState.packSkipRows = value; break;
                }
                this.hydGlobalState.recordTransition("pixelStorei", pname, value);
                return;
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
        }
    }

    private isFramebufferBound(framebuffer: HydFramebuffer): boolean {
        return this.hydGlobalState.commonState.drawFramebufferBinding === framebuffer ||
            this.hydGlobalState.commonState.readFramebufferBinding === framebuffer;
    }

    private framebufferStatus(framebuffer: HydFramebuffer): GLenum {
        if (framebuffer === this.hydGlobalState.defaultFramebuffer) {
            return WebGL2RenderingContext.FRAMEBUFFER_COMPLETE;
        }
        if (framebuffer.attachments.size === 0) {
            return WebGL2RenderingContext.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT;
        }
        const combined = framebuffer.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT) || null;
        const depthAttachment = framebuffer.attachments.get(WebGL2RenderingContext.DEPTH_ATTACHMENT) || combined;
        const stencilAttachment = framebuffer.attachments.get(WebGL2RenderingContext.STENCIL_ATTACHMENT) || combined;
        if (depthAttachment && stencilAttachment && !this.sameFramebufferImage(depthAttachment, stencilAttachment)) {
            return WebGL2RenderingContext.FRAMEBUFFER_UNSUPPORTED;
        }
        const colorImages: FramebufferAttributes[] = [];
        for (const [attachmentPoint, attachment] of framebuffer.attachments) {
            if (attachmentPoint < WebGL2RenderingContext.COLOR_ATTACHMENT0 ||
                attachmentPoint > WebGL2RenderingContext.COLOR_ATTACHMENT15) continue;
            if (colorImages.some((other) => this.sameFramebufferImage(other, attachment))) {
                return WebGL2RenderingContext.FRAMEBUFFER_UNSUPPORTED;
            }
            colorImages.push(attachment);
        }
        let width: number | null = null;
        let height: number | null = null;
        let sampleCount: number | null = null;
        for (const [attachmentPoint, attachment] of framebuffer.attachments) {
            if (!attachment.attachment.isConfigured || attachment.width <= 0 || attachment.height <= 0) {
                return WebGL2RenderingContext.FRAMEBUFFER_INCOMPLETE_ATTACHMENT;
            }
            if (attachment.objectType === WebGL2RenderingContext.TEXTURE) {
                if (!attachment.attachment.isFramebufferAttachmentComplete(
                    attachment.face,
                    attachment.level || 0,
                    attachment.layer,
                )) {
                    return WebGL2RenderingContext.FRAMEBUFFER_INCOMPLETE_ATTACHMENT;
                }
                if (attachment.isCubeFace &&
                    !attachment.attachment.isCubeCompleteAtLevel(attachment.level || 0)) {
                    return WebGL2RenderingContext.FRAMEBUFFER_INCOMPLETE_ATTACHMENT;
                }
            }
            const format = attachment.format;
            const colorAttachment = attachmentPoint >= WebGL2RenderingContext.COLOR_ATTACHMENT0 &&
                attachmentPoint <= WebGL2RenderingContext.COLOR_ATTACHMENT15;
            if ((attachmentPoint === WebGL2RenderingContext.DEPTH_ATTACHMENT &&
                    !format.includes("depth")) ||
                (attachmentPoint === WebGL2RenderingContext.STENCIL_ATTACHMENT &&
                    !format.includes("stencil")) ||
                (attachmentPoint === WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT &&
                    (!format.includes("depth") || !format.includes("stencil"))) ||
                (colorAttachment && !attachment.colorRenderable)) {
                return WebGL2RenderingContext.FRAMEBUFFER_INCOMPLETE_ATTACHMENT;
            }
            width ??= attachment.width;
            height ??= attachment.height;
            if (attachment.width !== width || attachment.height !== height) {
                return WebGL2RenderingContext.FRAMEBUFFER_INCOMPLETE_DIMENSIONS;
            }
            sampleCount ??= attachment.sampleCount;
            if (attachment.sampleCount !== sampleCount) {
                return WebGL2RenderingContext.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE;
            }
        }
        return WebGL2RenderingContext.FRAMEBUFFER_COMPLETE;
    }

    checkFramebufferStatus(target: GLenum = WebGL2RenderingContext.FRAMEBUFFER): GLenum {
        const webgl2Target = this.hydContextType === "webgl2" &&
            (target === WebGL2RenderingContext.DRAW_FRAMEBUFFER || target === WebGL2RenderingContext.READ_FRAMEBUFFER);
        if (target !== WebGL2RenderingContext.FRAMEBUFFER && !webgl2Target) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return 0;
        }
        return this.framebufferStatus(this.getFramebufferForTarget(target));
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
            const texture = this.hydGlobalState.getTextureUnitBinding(
                sampler.textureUnit,
                sampler.bindingViewDimension,
            );
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

    private getDrawValidationLimits(): {
        valid: boolean,
        vertexCapacity: number,
        instanceCapacity: number,
        hasActivePerVertexAttribute: boolean,
    } {
        const stateToken = this.hydGlobalState.stateToken;
        const cached = this.drawValidationCache.get(stateToken);
        if (cached) return cached;
        let valid = true;
        let vertexCapacity = Number.POSITIVE_INFINITY;
        let instanceCapacity = Number.POSITIVE_INFINITY;
        let hasActivePerVertexAttribute = false;
        const attributes = this.hydGlobalState.commonState.vertexArrayBinding.attributes;
        const activeLocations = this.hydGlobalState.commonState.currentProgram?.hydAttributeLocations || new Set<number>();
        for (let location = 0; location < attributes.length; location++) {
            const attribute = attributes[location];
            if (!attribute.enabled) continue;
            const buffer = attribute.buffer;
            if (!buffer) {
                valid = false;
                break;
            }
            if (!activeLocations.has(location)) continue;
            const componentBytes = vertexComponentByteSize(attribute.type);
            const packed = attribute.type === WebGL2RenderingContext.INT_2_10_10_10_REV ||
                attribute.type === WebGL2RenderingContext.UNSIGNED_INT_2_10_10_10_REV;
            const elementBytes = packed ? 4 : componentBytes * attribute.size;
            const stride = attribute.webglStride || elementBytes;
            if (!buffer.buffer || componentBytes === 0 ||
                !Number.isInteger(attribute.size) || attribute.size < 1 || attribute.size > 4 ||
                attribute.offset < 0 || stride <= 0) {
                valid = false;
                break;
            }
            const capacity = buffer.webglSize < attribute.offset + elementBytes
                ? 0
                : Math.floor((buffer.webglSize - attribute.offset - elementBytes) / stride) + 1;
            if (attribute.divisor > 0) {
                instanceCapacity = Math.min(instanceCapacity, capacity * attribute.divisor);
            } else {
                hasActivePerVertexAttribute = true;
                vertexCapacity = Math.min(vertexCapacity, capacity);
            }
        }
        const validation = { valid, vertexCapacity, instanceCapacity, hasActivePerVertexAttribute };
        this.drawValidationCache.set(stateToken, validation);
        return validation;
    }

    private validateDrawVertexState(maxVertexIndex: number, instanceCount: number, instancedApi: boolean): boolean {
        const limits = this.getDrawValidationLimits();
        if (!limits.valid || maxVertexIndex >= limits.vertexCapacity || instanceCount > limits.instanceCapacity ||
            (instancedApi && this.hydContextType !== "webgl2" && !limits.hasActivePerVertexAttribute)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return false;
        }
        return true;
    }

    private validateActiveVertexAttributeTypes(): boolean {
        const program = this.hydGlobalState.commonState.currentProgram;
        if (!this.currentProgramValid || !program) return true;
        const attributes = this.hydGlobalState.commonState.vertexArrayBinding.attributes;
        for (const programAttribute of program.hydAttributes) {
            let expectedType: "float" | "int" | "uint" = "float";
            if (programAttribute.type === WebGL2RenderingContext.INT ||
                (programAttribute.type >= WebGL2RenderingContext.INT_VEC2 &&
                    programAttribute.type <= WebGL2RenderingContext.INT_VEC4)) {
                expectedType = "int";
            } else if (programAttribute.type === WebGL2RenderingContext.UNSIGNED_INT ||
                (programAttribute.type >= WebGL2RenderingContext.UNSIGNED_INT_VEC2 &&
                    programAttribute.type <= WebGL2RenderingContext.UNSIGNED_INT_VEC4)) {
                expectedType = "uint";
            }
            for (let column = 0; column < programAttribute.locationSpan; column++) {
                const location = programAttribute.location + column;
                const attribute = attributes[location];
                const actualType = attribute?.enabled
                    ? (attribute.int
                        ? (attribute.type === WebGL2RenderingContext.UNSIGNED_BYTE ||
                            attribute.type === WebGL2RenderingContext.UNSIGNED_SHORT ||
                            attribute.type === WebGL2RenderingContext.UNSIGNED_INT ? "uint" : "int")
                        : "float")
                    : this.hydGlobalState.currentVertexAttribValueTypes[location];
                if (actualType !== expectedType) {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                    return false;
                }
            }
        }
        return true;
    }

    private primitiveTopology(mode: GLenum): GPUPrimitiveTopology | null {
        if (!VALID_DRAW_MODES.has(mode)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        if (mode === WebGL2RenderingContext.LINE_LOOP) return "line-list";
        if (mode === WebGL2RenderingContext.TRIANGLE_FAN) return "triangle-list";
        return enum2PT[mode];
    }

    private lastProvokingVertexTopology(mode: GLenum): GPUPrimitiveTopology {
        return mode === WebGL2RenderingContext.LINES ||
            mode === WebGL2RenderingContext.LINE_STRIP ||
            mode === WebGL2RenderingContext.LINE_LOOP
            ? "line-list"
            : "triangle-list";
    }

    private setPrimitiveState(topology: GPUPrimitiveTopology, stripIndexFormat?: GPUIndexFormat) {
        const nextStripIndexFormat = topology === "line-strip" || topology === "triangle-strip"
            ? stripIndexFormat
            : undefined;
        if (this.hydGlobalState.topology === topology && this.hydGlobalState.stripIndexFormat === nextStripIndexFormat) {
            return;
        }
        this.hydGlobalState.topology = topology;
        this.hydGlobalState.stripIndexFormat = nextStripIndexFormat;
        this.hydGlobalState.recordTransition("primitive", topology, nextStripIndexFormat || "none");
    }

    private finishDraw() {
        if (this.hydUniOff >= this.hydMaxUniSize) {
            this._der_flush();
        }
        if (this.hydGlobalState.clearState.target !== 0) {
            this.hydGlobalState.clearState.target = 0;
            this.hydGlobalState.recordTransitionOne('!!d0');
        }
    }

    private findPreparedIndexedDraw(
        mode: GLenum,
        count: GLsizei,
        type: GLenum,
        offset: GLintptr,
        instanceCount: GLsizei,
        instancedApi: boolean,
    ): PreparedIndexedDraw | null {
        if (!this.currentProgramValid) return null;
        const stateToken = this.hydGlobalState.stateToken;
        const elementArrayBuffer = this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
        const last = this.lastIndexedDraw;
        if (last && last.stateToken === stateToken && last.mode === mode && last.count === count && last.type === type &&
            last.offset === offset && last.instanceCount === instanceCount &&
            last.instancedApi === instancedApi &&
            last.elementArrayBuffer === elementArrayBuffer && last.bufferVersion === last.elementArrayBuffer.version) {
            return last;
        }
        const preparedDraws = this.indexedDrawCache.get(stateToken);
        if (!preparedDraws) return null;
        for (const prepared of preparedDraws) {
            if (prepared.mode === mode && prepared.count === count && prepared.type === type &&
                prepared.offset === offset && prepared.instanceCount === instanceCount &&
                prepared.instancedApi === instancedApi &&
                prepared.elementArrayBuffer === elementArrayBuffer && prepared.bufferVersion === prepared.elementArrayBuffer.version) {
                this.lastIndexedDraw = prepared;
                return prepared;
            }
        }
        return null;
    }

    private executePreparedIndexedDraw(prepared: PreparedIndexedDraw) {
        this.setPBV();
        this.hydRpCache.RpSetIndexBuffer(prepared.indexBuffer, prepared.indexFormat);
        this.hydRpCache.RpDrawIndexed(prepared.indexCount, prepared.instanceCount, prepared.firstIndex, 0, 0);
        this.finishDraw();
    }

    private cachePreparedIndexedDraw(prepared: PreparedIndexedDraw) {
        let preparedDraws = this.indexedDrawCache.get(prepared.stateToken);
        if (!preparedDraws) {
            this.indexedDrawCache.set(prepared.stateToken, [prepared]);
            return;
        }
        const existing = preparedDraws.findIndex((candidate) =>
            candidate.mode === prepared.mode && candidate.count === prepared.count &&
            candidate.type === prepared.type && candidate.offset === prepared.offset &&
            candidate.instanceCount === prepared.instanceCount &&
            candidate.instancedApi === prepared.instancedApi &&
            candidate.elementArrayBuffer === prepared.elementArrayBuffer);
        if (existing >= 0) {
            preparedDraws[existing] = prepared;
        } else {
            preparedDraws.push(prepared);
        }
    }

    private findPreparedArrayDraw(
        mode: GLenum,
        first: GLint,
        count: GLsizei,
        instanceCount: GLsizei,
        instancedApi: boolean,
    ): PreparedArrayDraw | null {
        if (!this.currentProgramValid) return null;
        const stateToken = this.hydGlobalState.stateToken;
        const last = this.lastArrayDraw;
        if (last && last.stateToken === stateToken && last.mode === mode && last.first === first &&
            last.count === count && last.instanceCount === instanceCount && last.instancedApi === instancedApi) {
            return last;
        }
        const preparedDraws = this.arrayDrawCache.get(stateToken);
        if (!preparedDraws) return null;
        for (const prepared of preparedDraws) {
            if (prepared.mode === mode && prepared.first === first &&
                prepared.count === count && prepared.instanceCount === instanceCount &&
                prepared.instancedApi === instancedApi) {
                this.lastArrayDraw = prepared;
                return prepared;
            }
        }
        return null;
    }

    private executePreparedArrayDraw(prepared: PreparedArrayDraw) {
        this.setPBV();
        if (prepared.indexBuffer) {
            this.hydRpCache.RpSetIndexBuffer(prepared.indexBuffer, "uint32");
            this.hydRpCache.RpDrawIndexed(prepared.indexCount, prepared.instanceCount, 0, prepared.first, 0);
        } else {
            this.hydRpCache.RpDraw(prepared.count, prepared.instanceCount, prepared.first, 0);
        }
        this.finishDraw();
    }

    private cachePreparedArrayDraw(prepared: PreparedArrayDraw) {
        let preparedDraws = this.arrayDrawCache.get(prepared.stateToken);
        if (!preparedDraws) {
            this.arrayDrawCache.set(prepared.stateToken, [prepared]);
            return;
        }
        const existing = preparedDraws.findIndex((candidate) =>
            candidate.mode === prepared.mode && candidate.first === prepared.first &&
            candidate.count === prepared.count && candidate.instanceCount === prepared.instanceCount &&
            candidate.instancedApi === prepared.instancedApi);
        if (existing >= 0) {
            preparedDraws[existing] = prepared;
        } else {
            preparedDraws.push(prepared);
        }
    }

    private setPBV() {
        if (frameDepth === 0) {
            ensureAutoFrame();
        }
        if (this.canvasSizeDirty) this.updateCanvasSize();
        this.ensureDefaultFramebufferRenderTarget();
        if (this.hydGlobalState.commonState.drawFramebufferBinding === this.hydGlobalState.defaultFramebuffer &&
            this.defaultFramebufferNeedsImplicitClear) {
            this.materializeImplicitDefaultFramebufferClear();
            this._der_flush();
            this.ensureDefaultFramebufferRenderTarget();
        }
        let framebufferWriteMask = this.getColorWriteMask() !== 0
            ? WebGL2RenderingContext.COLOR_BUFFER_BIT
            : 0;
        if (this.hydGlobalState.depthState.enabled && this.hydGlobalState.depthState.writeMask) {
            framebufferWriteMask |= WebGL2RenderingContext.DEPTH_BUFFER_BIT;
        }
        if (this.hydGlobalState.stencilState.enabled &&
            ((this.hydGlobalState.stencilState.frontWriteMask | this.hydGlobalState.stencilState.backWriteMask) & 0xff) !== 0) {
            framebufferWriteMask |= WebGL2RenderingContext.STENCIL_BUFFER_BIT;
        }
        this.markDrawFramebufferAttachmentsAsRenderTargets(framebufferWriteMask);
        if ((framebufferWriteMask & WebGL2RenderingContext.COLOR_BUFFER_BIT) &&
            this.hydGlobalState.commonState.drawFramebufferBinding === this.hydGlobalState.defaultFramebuffer &&
            this.hydGlobalState.__canvasTexture === this.defaultFramebufferBackingTexture) {
            this.defaultFramebufferBackingNeedsPresentation = true;
        }
        // this.renderPassInfo.endPass();

        const program = this.hydGlobalState.commonState.currentProgram;
        program.resolveUniformBlockBindings(this.uniformBufferBindings);
        if (program.fragCoordHeightUniform) {
            const framebufferHeight = this.getDrawFramebufferHeight();
            if (program.fragCoordHeightValue !== framebufferHeight) {
                program.fragCoordHeightValue = framebufferHeight;
                program.write_uniform_f1(program.fragCoordHeightUniform.offset, framebufferHeight);
            }
        }
        if (program.depthRangeUniforms.some(Boolean)) {
            const near = this.hydGlobalState.commonState.viewport[4];
            const far = this.hydGlobalState.commonState.viewport[5];
            if (program.depthRangeValue[0] !== near || program.depthRangeValue[1] !== far) {
                program.depthRangeValue = [near, far];
                const values = [near, far, far - near];
                program.depthRangeUniforms.forEach((uniform, index) => {
                    if (uniform) program.write_uniform_f1(uniform.offset, values[index]);
                });
            }
        }
        if (program.hydSamplers.length > 0) {
            const useSamplerOriginVariants = program.staticSamplerOriginVariants;
            const samplerCount = useSamplerOriginVariants ? program.hydOriginSamplers.length : program.hydSamplers.length;
            const samplerOriginVersion = useSamplerOriginVariants
                ? program.originVariantStateVersion
                : program.originUniformStateVersion;
            if (samplerCount > 0 && samplerOriginVersion !== this.samplerOriginStateVersion) {
                const samplerOriginFlips = this.updateSamplerOriginUniforms(program, useSamplerOriginVariants);
                if (useSamplerOriginVariants && samplerOriginFlips) {
                    program.applySamplerOriginVariant(samplerOriginFlips);
                }
            }
        }

        /* set renderPass */
        // const [renderPassHash, renderPassDescriptor] = this.globalState.getRenderPassDescriptor(this._canvasView);

        const pbv = this.hydGlobalState.getPBV();
        const {
            pipelineHash,
            pipeline,
            bindGroup,
            vertexBuffersHash,
            vertexBufferHashes,
            vertexBuffers,
            vertexBufferOffsets,
        } = pbv;
        const canReuseDrawState = pbv === this.lastDrawPbv &&
            this.hydRpCache.hasActiveRenderPass() &&
            !this.gpuViewportDirty &&
            !(this.hydGlobalState.miscState.scissorTest && this.gpuScissorDirty);
        if (!canReuseDrawState) {
            const currentRenderPass = this.hydGlobalState.getCurrentRenderPassInfo();
            const passChanged = this.hydRpCache.RpSetDescriptor(
                currentRenderPass.hash,
                currentRenderPass.bundleDescriptor,
                () => currentRenderPass.passDescriptor,
            );
            if (passChanged || this.gpuViewportDirty) {
                this.setGpuViewport();
                this.gpuViewportDirty = false;
            }
            if (this.hydGlobalState.miscState.scissorTest && (passChanged || this.gpuScissorDirty)) {
                this.setGpuScissorRect();
                this.gpuScissorDirty = false;
            }
            if (this.hydGlobalState.stencilState.enabled) {
                const reference = Math.min(0xff, Math.max(0, this.hydGlobalState.stencilState.frontRef | 0));
                this.hydRpCache.RpSetStencilReference(reference);
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

    private currentDrawTargetHasSize(): boolean {
        if (this.hydGlobalState.commonState.drawFramebufferBinding !== this.hydGlobalState.defaultFramebuffer ||
            (this.hydCanvas.width > 0 && this.hydCanvas.height > 0)) {
            return true;
        }
        this.hydGlobalState.clearState.target = 0;
        return false;
    }

    private shouldCullAllTriangles(mode: GLenum): boolean {
        if (!this.hydGlobalState.polygonState.cullFace ||
            this.hydGlobalState.polygonState.cullFaceModeEnum !== WebGL2RenderingContext.FRONT_AND_BACK) {
            return false;
        }
        return mode === WebGL2RenderingContext.TRIANGLES ||
            mode === WebGL2RenderingContext.TRIANGLE_STRIP ||
            mode === WebGL2RenderingContext.TRIANGLE_FAN;
    }

    private transformFeedbackModeMatchesDraw(beginMode: GLenum, drawMode: GLenum): boolean {
        if (beginMode === WebGL2RenderingContext.POINTS) return drawMode === WebGL2RenderingContext.POINTS;
        if (beginMode === WebGL2RenderingContext.LINES) {
            return drawMode === WebGL2RenderingContext.LINES ||
                drawMode === WebGL2RenderingContext.LINE_LOOP ||
                drawMode === WebGL2RenderingContext.LINE_STRIP;
        }
        return drawMode === WebGL2RenderingContext.TRIANGLES ||
            drawMode === WebGL2RenderingContext.TRIANGLE_STRIP ||
            drawMode === WebGL2RenderingContext.TRIANGLE_FAN;
    }

    private drawPrimitiveCount(mode: GLenum, count: number): number {
        if (mode === WebGL2RenderingContext.POINTS) return count;
        if (mode === WebGL2RenderingContext.LINES) return Math.floor(count / 2);
        if (mode === WebGL2RenderingContext.LINE_STRIP) return Math.max(0, count - 1);
        if (mode === WebGL2RenderingContext.LINE_LOOP) return count > 1 ? count : 0;
        if (mode === WebGL2RenderingContext.TRIANGLES) return Math.floor(count / 3);
        return Math.max(0, count - 2);
    }

    private validateTransformFeedbackDraw(draw: TransformFeedbackDraw): number[] | null {
        const feedback = this.transformFeedbackBinding;
        const program = this.hydGlobalState.commonState.currentProgram;
        if (!this.transformFeedbackModeMatchesDraw(feedback.primitiveMode, draw.mode) ||
            feedback.activeProgram !== program) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        const bound = feedback.bufferBindings.filter((binding): binding is HydIndexedBufferBinding => !!binding);
        const buffers = new Set<HydBuffer>();
        for (const binding of bound) {
            if (buffers.has(binding.buffer)) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return null;
            }
            buffers.add(binding.buffer);
        }
        const vao = this.hydGlobalState.commonState.vertexArrayBinding;
        if (vao.attributes.some((attribute) => attribute.enabled && attribute.buffer && buffers.has(attribute.buffer)) ||
            (draw.elementBuffer && buffers.has(draw.elementBuffer)) ||
            program.hydUniformBlocks.some((block) => block.bufferBinding && buffers.has(block.bufferBinding.buffer))) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }

        const vertexCount = transformFeedbackOutputVertexCount(draw.mode, draw.count) * draw.instanceCount;
        const byteLengths = Array.from({ length: feedback.bufferBindings.length }, () => 0);
        if (program.transformFeedbackBufferMode === WebGL2RenderingContext.SEPARATE_ATTRIBS) {
            for (let index = 0; index < program.transformFeedbackVaryingInfo.length; index++) {
                const varying = program.transformFeedbackVaryingInfo[index];
                byteLengths[index] = (TRANSFORM_FEEDBACK_TYPE_BYTES.get(varying.type) || 0) * varying.size * vertexCount;
            }
        } else {
            byteLengths[0] = program.transformFeedbackVaryingInfo.reduce((bytes, varying) =>
                bytes + (TRANSFORM_FEEDBACK_TYPE_BYTES.get(varying.type) || 0) * varying.size, 0) * vertexCount;
        }
        for (let index = 0; index < byteLengths.length; index++) {
            const required = byteLengths[index];
            if (required === 0) continue;
            const binding = feedback.bufferBindings[index];
            if (!binding || !binding.buffer.buffer) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return null;
            }
            const available = binding.wholeBuffer
                ? binding.buffer.webglSize - binding.offset
                : Math.min(binding.size, binding.buffer.webglSize - binding.offset);
            if (feedback.writeOffsets[index] + required > available) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return null;
            }
        }
        return byteLengths;
    }

    private executeActiveTransformFeedback(draw: TransformFeedbackDraw): boolean {
        if (!this.transformFeedbackBinding.active || this.transformFeedbackBinding.paused) return true;
        const byteLengths = this.validateTransformFeedbackDraw(draw);
        if (!byteLengths) return false;
        draw.feedbackByteLengths = byteLengths;
        if (!this.transformFeedbackExecutor) {
            const canvas = document.createElement("canvas");
            const gl = NATIVE_CANVAS_GET_CONTEXT.call(canvas, "webgl2", {
                alpha: false,
                antialias: false,
                depth: false,
                stencil: false,
            }) as WebGL2RenderingContext | null;
            if (!gl) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return false;
            }
            this.transformFeedbackExecutor = new HydTransformFeedbackExecutor(gl);
        }
        const program = this.hydGlobalState.commonState.currentProgram;
        program.resolveUniformBlockBindings(this.uniformBufferBindings);
        const error = this.transformFeedbackExecutor.execute(
            program,
            this.hydGlobalState.commonState.vertexArrayBinding,
            this.hydGlobalState.currentVertexAttribValues,
            this.hydGlobalState.currentVertexAttribValueTypes,
            this.transformFeedbackBinding,
            draw,
        );
        if (error !== WebGL2RenderingContext.NO_ERROR) {
            this.hydGlobalState.setError(error);
            return false;
        }
        const query = this.activeQueries.get(WebGL2RenderingContext.TRANSFORM_FEEDBACK_PRIMITIVES_WRITTEN);
        if (query) query.result += this.drawPrimitiveCount(draw.mode, draw.count) * draw.instanceCount;
        return true;
    }

    private validateFramebufferAndStencilForDraw(): boolean {
        const stateToken = this.hydGlobalState.stateToken;
        const generation = this.drawSemanticValidationGeneration;
        if (this.successfulDrawSemanticValidations.get(stateToken) === generation) return true;
        const validated = () => {
            this.successfulDrawSemanticValidations.set(stateToken, generation);
            return true;
        };
        const framebuffer = this.hydGlobalState.commonState.drawFramebufferBinding;
        if (this.framebufferStatus(framebuffer) !== WebGL2RenderingContext.FRAMEBUFFER_COMPLETE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_FRAMEBUFFER_OPERATION);
            return false;
        }
        if (!this.validateActiveVertexAttributeTypes()) return false;
        if (this.currentProgramValid && !this.validateSamplerTextureCompatibilityForDraw()) return false;
        if (this.currentProgramValid && framebuffer !== this.hydGlobalState.defaultFramebuffer) {
            const feedbackLoop = this.hydGlobalState.commonState.currentProgram.hydSamplers.some((sampler) => {
                const texture = this.hydGlobalState.getTextureUnitBinding(
                    sampler.textureUnit, sampler.bindingViewDimension);
                const samplerState = this.samplerBindings[sampler.textureUnit]?.completenessState;
                const webglVersion = this.hydContextType === "webgl2" ? 2 : 1;
                if (!texture || !texture.isSamplingComplete(
                    sampler.bindingViewDimension, webglVersion, samplerState)) return false;
                const range = texture.getSamplingMipRange(
                    sampler.bindingViewDimension, webglVersion, samplerState);
                return Array.from(framebuffer.attachments.values()).some((attachment) =>
                    attachment.objectType === WebGL2RenderingContext.TEXTURE &&
                    attachment.attachment === texture &&
                    (attachment.level || 0) >= range.baseLevel &&
                    (attachment.level || 0) <= range.sampledLastLevel);
            });
            if (feedbackLoop) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return false;
            }
        }
        if (this.currentProgramValid) {
            const program = this.hydGlobalState.commonState.currentProgram;
            const outputLocations = new Set(program.fragmentOutputLocations.values());
            const colorWritesEnabled = this.hydGlobalState.miscState.colorWriteMask.some(Boolean);
            if (colorWritesEnabled && !this.hydGlobalState.miscState.rasterizerDiscard) {
                for (let index = 0; index < framebuffer.drawBuffers.length; index++) {
                    const drawBuffer = framebuffer.drawBuffers[index];
                    if (drawBuffer === WebGL2RenderingContext.NONE) continue;
                    const attachment = framebuffer === this.hydGlobalState.defaultFramebuffer
                        ? (drawBuffer === WebGL2RenderingContext.BACK ? null : undefined)
                        : framebuffer.attachments.get(drawBuffer);
                    if (attachment === undefined ||
                        (framebuffer !== this.hydGlobalState.defaultFramebuffer && !attachment)) {
                        continue;
                    }
                    if (!outputLocations.has(index)) {
                        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                        return false;
                    }
                    const outputType = program.fragmentOutputTypes.get(index) || "float";
                    const attachmentType = attachment === null
                        ? "float"
                        : attachment.format.endsWith("uint")
                            ? "uint"
                            : attachment.format.endsWith("sint")
                                ? "sint"
                                : "float";
                    if (outputType !== attachmentType) {
                        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                        return false;
                    }
                }
            }
            program.resolveUniformBlockBindings(this.uniformBufferBindings);
            const feedbackOutputs = new Set(
                this.transformFeedbackBinding.bufferBindings
                    .map((binding) => binding?.buffer)
                    .filter((buffer): buffer is HydBuffer => !!buffer),
            );
            const outputUsedByDraw = this.hydGlobalState.commonState.vertexArrayBinding.attributes.some((attribute) =>
                attribute.enabled && attribute.buffer && feedbackOutputs.has(attribute.buffer)) ||
                program.hydUniformBlocks.some((block) =>
                    block.bufferBinding && feedbackOutputs.has(block.bufferBinding.buffer));
            const common = this.hydGlobalState.commonState;
            const outputHasActiveGenericConflict = this.transformFeedbackBinding.active && [
                common.arrayBufferBinding,
                common.copyReadBufferBinding,
                common.copyWriteBufferBinding,
                common.pixelPackBufferBinding,
                common.pixelUnpackBufferBinding,
                common.uniformBufferBinding,
            ].some((buffer) => buffer && feedbackOutputs.has(buffer));
            if (outputUsedByDraw || outputHasActiveGenericConflict) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return false;
            }
            for (const block of program.hydUniformBlocks) {
                const binding = block.bufferBinding;
                const effectiveSize = binding?.wholeBuffer
                    ? Math.max(0, binding.buffer.webglSize - binding.offset)
                    : binding?.size || 0;
                if (block.resourceBinding < 0 || !binding || binding.buffer.deleted || !binding.buffer.buffer ||
                    binding.offset < 0 || effectiveSize < block.dataSize ||
                    binding.offset + block.dataSize > binding.buffer.webglSize) {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                    return false;
                }
            }
        }
        if (!this.hydGlobalState.stencilState.enabled) return validated();
        const hasStencil = framebuffer === this.hydGlobalState.defaultFramebuffer
            ? this.hydGlobalState.contextAttributes.stencil === true
            : Array.from(framebuffer.attachments.entries()).some(([point, attachment]) =>
                (point === WebGL2RenderingContext.STENCIL_ATTACHMENT ||
                    point === WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT) &&
                attachment.format.includes("stencil"));
        if (!hasStencil) return validated();

        const state = this.hydGlobalState.stencilState;
        const stencilMask = 0xff;
        const clampRef = (value: number) => Math.min(stencilMask, Math.max(0, value | 0));
        const mismatch = clampRef(state.frontRef) !== clampRef(state.backRef) ||
            (state.frontValueMask & stencilMask) !== (state.backValueMask & stencilMask) ||
            (state.frontWriteMask & stencilMask) !== (state.backWriteMask & stencilMask);
        if (mismatch) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return false;
        }
        return validated();
    }

    private invalidateDrawSemanticValidation() {
        this.drawSemanticValidationGeneration++;
    }

    private validateSamplerTextureCompatibilityForDraw(): boolean {
        const samplersByUnit = new Map<number, GLenum>();
        for (const sampler of this.hydGlobalState.commonState.currentProgram.hydSamplers) {
            const priorType = samplersByUnit.get(sampler.textureUnit);
            if (priorType !== undefined && priorType !== sampler.webgl_type) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return false;
            }
            samplersByUnit.set(sampler.textureUnit, sampler.webgl_type);

            const texture = this.hydGlobalState.getTextureUnitBinding(
                sampler.textureUnit,
                sampler.bindingViewDimension,
            );
            const textureClass = texture?.getBaseLevelSamplingClass();
            if (!texture || !textureClass) continue;
            const samplerObject = this.samplerBindings[sampler.textureUnit] || null;
            const compareMode = samplerObject?.getParameter(WebGL2RenderingContext.TEXTURE_COMPARE_MODE) ??
                texture.webglParameters.get(WebGL2RenderingContext.TEXTURE_COMPARE_MODE) ??
                WebGL2RenderingContext.NONE;
            const compatible = sampler.sampleType === "depth"
                ? textureClass === "depth" && compareMode === WebGL2RenderingContext.COMPARE_REF_TO_TEXTURE
                : sampler.sampleType === "float"
                    ? textureClass === "float" ||
                        (textureClass === "depth" && compareMode === WebGL2RenderingContext.NONE)
                    : sampler.sampleType === textureClass;
            if (!compatible) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return false;
            }
        }
        return true;
    }

    private currentDrawHasGpuAttachment(): boolean {
        const framebuffer = this.hydGlobalState.commonState.drawFramebufferBinding;
        const hasColor = framebuffer.drawBuffers.some((drawBuffer) =>
            drawBuffer === WebGL2RenderingContext.BACK ||
            (drawBuffer !== WebGL2RenderingContext.NONE && framebuffer.attachments.has(drawBuffer)));
        if (hasColor) return true;
        if (this.hydGlobalState.depthState.enabled &&
            (framebuffer.attachments.has(WebGL2RenderingContext.DEPTH_ATTACHMENT) ||
                framebuffer.attachments.has(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT))) {
            return true;
        }
        return this.hydGlobalState.stencilState.enabled &&
            (framebuffer.attachments.has(WebGL2RenderingContext.STENCIL_ATTACHMENT) ||
                framebuffer.attachments.has(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT));
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

    private getLineLoopIndexBuffer(vertexCount: number): GPUBuffer {
        let buffer = this.lineLoopIndexBuffers.get(vertexCount);
        if (buffer) return buffer;
        const indices = new Uint32Array(vertexCount >= 2 ? vertexCount * 2 : 0);
        if (vertexCount >= 2) {
            for (let i = 0; i < vertexCount - 1; i++) {
                indices[i * 2] = i;
                indices[i * 2 + 1] = i + 1;
            }
            indices[(vertexCount - 1) * 2] = vertexCount - 1;
            indices[(vertexCount - 1) * 2 + 1] = 0;
        }
        buffer = this.hydDevice.createBuffer({
            label: `lineLoopIndexBuffer-${vertexCount}`,
            size: Math.max(4, indices.byteLength),
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        if (indices.byteLength > 0) {
            this.hydDevice.queue.writeBuffer(buffer, 0, indices.buffer, indices.byteOffset, indices.byteLength);
        }
        this.lineLoopIndexBuffers.set(vertexCount, buffer);
        return buffer;
    }

    private getLastProvokingVertexIndexBuffer(mode: GLenum, vertexCount: number): { buffer: GPUBuffer, indexCount: number } {
        const key = `${mode}:${vertexCount}`;
        const cached = this.lastProvokingVertexIndexBuffers.get(key);
        if (cached) return cached;
        const source = Array.from({ length: vertexCount }, (_, index) => index);
        const output: number[] = [];
        if (mode === WebGL2RenderingContext.LINES) {
            for (let index = 0; index + 1 < source.length; index += 2) output.push(index + 1, index);
        } else if (mode === WebGL2RenderingContext.LINE_STRIP) {
            for (let index = 0; index + 1 < source.length; index++) output.push(index + 1, index);
        } else if (mode === WebGL2RenderingContext.LINE_LOOP) {
            if (source.length >= 2) {
                for (let index = 0; index + 1 < source.length; index++) output.push(index + 1, index);
                output.push(0, source.length - 1);
            }
        } else if (mode === WebGL2RenderingContext.TRIANGLES) {
            for (let index = 0; index + 2 < source.length; index += 3) output.push(index + 2, index, index + 1);
        } else if (mode === WebGL2RenderingContext.TRIANGLE_STRIP) {
            for (let index = 0; index + 2 < source.length; index++) {
                if ((index & 1) === 0) output.push(index + 2, index, index + 1);
                else output.push(index + 2, index + 1, index);
            }
        } else if (mode === WebGL2RenderingContext.TRIANGLE_FAN) {
            for (let index = 1; index + 1 < source.length; index++) output.push(index + 1, 0, index);
        }
        const indices = new Uint32Array(output);
        const buffer = this.hydDevice.createBuffer({
            label: `last-provoking-index-buffer-${mode}-${vertexCount}`,
            size: Math.max(4, indices.byteLength),
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        if (indices.byteLength > 0) {
            this.hydDevice.queue.writeBuffer(buffer, 0, indices.buffer, indices.byteOffset, indices.byteLength);
        }
        const result = { buffer, indexCount: indices.length };
        this.lastProvokingVertexIndexBuffers.set(key, result);
        return result;
    }

    drawArrays(mode: GLenum, first: GLint, count: GLsizei) {
        if (!this.validateFramebufferAndStencilForDraw()) return;
        if (this.transformFeedbackBinding.active && !this.transformFeedbackBinding.paused) {
            this.drawArraysInternal(mode, first, count, 1, false, this.shouldCullAllTriangles(mode));
            return;
        }
        if (this.shouldCullAllTriangles(mode)) {
            this.drawArraysInternal(mode, first, count, 1, false, true);
            return;
        }
        if (!this.currentDrawHasGpuAttachment()) return;
        const stateToken = this.hydGlobalState.stateToken;
        const prepared = this.lastArrayDraw;
        if (this.currentProgramValid && prepared && prepared.stateToken === stateToken &&
            prepared.mode === mode && prepared.first === first && prepared.count === count &&
            prepared.instanceCount === 1 && !prepared.instancedApi && !prepared.indexBuffer) {
            this.setPBV();
            this.hydRpCache.RpDraw(count, 1, first, 0);
            if (this.hydUniOff >= this.hydMaxUniSize) this._der_flush();
            if (this.hydGlobalState.clearState.target !== 0) {
                this.hydGlobalState.clearState.target = 0;
                this.hydGlobalState.recordTransitionOne('!!d0');
            }
            return;
        }
        if (this.currentProgramValid) {
            const preparedDraws = this.arrayDrawCache.get(stateToken);
            if (preparedDraws) {
                for (const candidate of preparedDraws) {
                    if (candidate.mode === mode && candidate.first === first && candidate.count === count &&
                        candidate.instanceCount === 1 && !candidate.instancedApi) {
                        this.lastArrayDraw = candidate;
                        this.executePreparedArrayDraw(candidate);
                        return;
                    }
                }
            }
        }
        this.drawArraysInternal(mode, first, count, 1, false);
    }

    drawArraysInstanced(mode: GLenum, first: GLint, count: GLsizei, instanceCount: GLsizei) {
        if (!this.validateFramebufferAndStencilForDraw()) return;
        if (this.transformFeedbackBinding.active && !this.transformFeedbackBinding.paused) {
            this.drawArraysInternal(mode, first, count, instanceCount, true, this.shouldCullAllTriangles(mode));
            return;
        }
        if (this.shouldCullAllTriangles(mode)) {
            this.drawArraysInternal(mode, first, count, instanceCount, true, true);
            return;
        }
        if (!this.currentDrawHasGpuAttachment()) return;
        const prepared = this.findPreparedArrayDraw(mode, first, count, instanceCount, true);
        if (prepared) {
            this.executePreparedArrayDraw(prepared);
            return;
        }
        this.drawArraysInternal(mode, first, count, instanceCount, true);
    }

    private drawArraysInternal(
        mode: GLenum,
        first: GLint,
        count: GLsizei,
        instanceCount: GLsizei,
        instancedApi: boolean,
        cullAll: boolean = false,
    ) {
        mode = Number(mode) >>> 0;
        first = toWebGlInt32(first);
        count = toWebGlInt32(count);
        instanceCount = toWebGlInt32(instanceCount);
        const topology = this.primitiveTopology(mode);
        if (!topology) return;
        if (first < 0 || count < 0 || instanceCount < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (!this.currentProgramValid) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (count === 0 || instanceCount === 0) return;
        if (!this.validateDrawVertexState(first + count - 1, instanceCount, instancedApi)) return;
        if (!this.executeActiveTransformFeedback({ mode, first, count, instanceCount })) return;
        if (this.hydGlobalState.miscState.rasterizerDiscard) return;
        if (cullAll) return;
        if (!this.currentDrawHasGpuAttachment()) return;
        if (!this.currentDrawTargetHasSize()) return;
        const needsLastProvokingVertex = this.hydGlobalState.commonState.currentProgram.usesFlatInterpolation &&
            mode !== WebGL2RenderingContext.POINTS;
        this.setPrimitiveState(needsLastProvokingVertex ? this.lastProvokingVertexTopology(mode) : topology);
        this.setPBV();
        let indexBuffer: GPUBuffer | undefined;
        let indexCount: number | undefined;
        if (needsLastProvokingVertex) {
            const expanded = this.getLastProvokingVertexIndexBuffer(mode, count);
            indexBuffer = expanded.buffer;
            indexCount = expanded.indexCount;
            this.hydRpCache.RpSetIndexBuffer(indexBuffer, "uint32");
            this.hydRpCache.RpDrawIndexed(indexCount, instanceCount, 0, first, 0);
        } else if (mode === WebGL2RenderingContext.TRIANGLE_FAN) {
            indexBuffer = this.getTriangleFanIndexBuffer(count);
            indexCount = Math.max(0, count - 2) * 3;
            this.hydRpCache.RpSetIndexBuffer(indexBuffer, "uint32");
            this.hydRpCache.RpDrawIndexed(indexCount, instanceCount, 0, first, 0);
        } else if (mode === WebGL2RenderingContext.LINE_LOOP) {
            indexBuffer = this.getLineLoopIndexBuffer(count);
            indexCount = count >= 2 ? count * 2 : 0;
            this.hydRpCache.RpSetIndexBuffer(indexBuffer, "uint32");
            this.hydRpCache.RpDrawIndexed(indexCount, instanceCount, 0, first, 0);
        } else {
            this.hydRpCache.RpDraw(count, instanceCount, first, 0);
        }
        this.finishDraw();
        const cached = {
            stateToken: this.hydGlobalState.stateToken,
            mode,
            first,
            count,
            instanceCount,
            instancedApi,
            indexBuffer,
            indexCount,
        };
        this.lastArrayDraw = cached;
        this.cachePreparedArrayDraw(cached);
    }

    drawElements(mode: GLenum, count: GLsizei, type: GLenum, offset: GLintptr) {
        if (!this.validateFramebufferAndStencilForDraw()) return;
        if (this.transformFeedbackBinding.active && !this.transformFeedbackBinding.paused) {
            this.drawElementsInternal(mode, count, type, offset, 1, false, this.shouldCullAllTriangles(mode));
            return;
        }
        if (this.shouldCullAllTriangles(mode)) {
            this.drawElementsInternal(mode, count, type, offset, 1, false, true);
            return;
        }
        if (!this.currentDrawHasGpuAttachment()) return;
        if (this.currentProgramValid) {
            const stateToken = this.hydGlobalState.stateToken;
            const prepared = this.lastIndexedDraw;
            const elementArrayBuffer = this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
            if (prepared && prepared.stateToken === stateToken && prepared.mode === mode &&
                prepared.count === count && prepared.type === type && prepared.offset === offset &&
                prepared.instanceCount === 1 && !prepared.instancedApi &&
                prepared.elementArrayBuffer === elementArrayBuffer &&
                prepared.bufferVersion === prepared.elementArrayBuffer.version) {
                this.setPBV();
                this.hydRpCache.RpSetIndexBuffer(prepared.indexBuffer, prepared.indexFormat);
                this.hydRpCache.RpDrawIndexed(prepared.indexCount, 1, prepared.firstIndex, 0, 0);
                this.finishDraw();
                return;
            }
        }
        const prepared = this.findPreparedIndexedDraw(mode, count, type, offset, 1, false);
        if (prepared) {
            this.executePreparedIndexedDraw(prepared);
            return;
        }
        this.drawElementsInternal(mode, count, type, offset, 1, false);
    }

    drawRangeElements(mode: GLenum, start: GLuint, end: GLuint, count: GLsizei, type: GLenum, offset: GLintptr) {
        start = Number(start) >>> 0;
        end = Number(end) >>> 0;
        if (end < start) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        this.drawElements(mode, count, type, offset);
    }

    drawElementsInstanced(mode: GLenum, count: GLsizei, type: GLenum, offset: GLintptr, instanceCount: GLsizei) {
        if (!this.validateFramebufferAndStencilForDraw()) return;
        if (this.transformFeedbackBinding.active && !this.transformFeedbackBinding.paused) {
            this.drawElementsInternal(mode, count, type, offset, instanceCount, true, this.shouldCullAllTriangles(mode));
            return;
        }
        if (this.shouldCullAllTriangles(mode)) {
            this.drawElementsInternal(mode, count, type, offset, instanceCount, true, true);
            return;
        }
        if (!this.currentDrawHasGpuAttachment()) return;
        const prepared = this.findPreparedIndexedDraw(mode, count, type, offset, instanceCount, true);
        if (prepared) {
            this.executePreparedIndexedDraw(prepared);
            return;
        }
        this.drawElementsInternal(mode, count, type, offset, instanceCount, true);
    }

    private drawElementsInternal(
        mode: GLenum,
        count: GLsizei,
        type: GLenum,
        offset: GLintptr,
        instanceCount: GLsizei,
        instancedApi: boolean,
        cullAll: boolean = false,
    ) {
        mode = Number(mode) >>> 0;
        count = toWebGlInt32(count);
        type = Number(type) >>> 0;
        offset = toWebGlInt64(offset);
        instanceCount = toWebGlInt32(instanceCount);
        const topology = this.primitiveTopology(mode);
        if (!topology) return;
        if (count < 0 || offset < 0 || instanceCount < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const uint32Enabled = this.hydContextType === "webgl2" || this.enabledExtensions.has("OES_ELEMENT_INDEX_UINT");
        if (type !== WebGL2RenderingContext.UNSIGNED_BYTE &&
            type !== WebGL2RenderingContext.UNSIGNED_SHORT &&
            (type !== WebGL2RenderingContext.UNSIGNED_INT || !uint32Enabled)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        const indexSize = type === WebGL2RenderingContext.UNSIGNED_BYTE ? 1 :
            type === WebGL2RenderingContext.UNSIGNED_SHORT ? 2 : 4;
        if ((offset % indexSize) !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (!this.currentProgramValid) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const elementArrayBuffer = this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
        if (!elementArrayBuffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        // WebGL 2 forbids indexed draws while transform feedback is active.
        // This validation still applies to zero-count draws, which otherwise
        // return before the transform-feedback execution path is reached.
        if (this.transformFeedbackBinding.active && !this.transformFeedbackBinding.paused) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (count === 0 || instanceCount === 0) return;
        if (!elementArrayBuffer.buffer || offset + count * indexSize > elementArrayBuffer.webglSize) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const restartIndices = this.hydContextType === "webgl2"
            ? elementArrayBuffer.getFixedRestartIndexBuffer(mode, type, offset, count)
            : null;
        const maxIndex = restartIndices?.maxIndex ?? elementArrayBuffer.maxIndex(type, offset, count);
        if (!this.validateDrawVertexState(maxIndex, instanceCount, instancedApi)) return;
        if (!this.executeActiveTransformFeedback({
            mode,
            count,
            instanceCount,
            elementBuffer: elementArrayBuffer,
            elementType: type,
            elementOffset: offset,
        })) return;
        if (this.hydGlobalState.miscState.rasterizerDiscard) return;
        if (cullAll) return;
        if (!this.currentDrawHasGpuAttachment()) return;
        if (!this.currentDrawTargetHasSize()) return;

        let indexBuffer = elementArrayBuffer.buffer;
        let indexFormat: GPUIndexFormat;
        if (type === WebGL2RenderingContext.UNSIGNED_SHORT) {
            indexFormat = "uint16";
        } else if (type === WebGL2RenderingContext.UNSIGNED_INT) {
            indexFormat = "uint32";
        } else {
            indexBuffer = elementArrayBuffer.getUint16IndexBuffer();
            indexFormat = "uint16";
        }

        let drawIndexCount = count;
        let firstIndex = Math.floor(offset / indexSize);
        if (restartIndices) {
            indexBuffer = restartIndices.buffer;
            indexFormat = restartIndices.format;
            drawIndexCount = restartIndices.indexCount;
            firstIndex = 0;
        } else if (mode === WebGL2RenderingContext.TRIANGLE_FAN || mode === WebGL2RenderingContext.LINE_LOOP) {
            const expanded = elementArrayBuffer.getExpandedIndexBuffer(mode, type, offset, count);
            indexBuffer = expanded.buffer;
            indexFormat = expanded.format;
            drawIndexCount = expanded.indexCount;
            firstIndex = 0;
        }
        const needsLastProvokingVertex = this.hydGlobalState.commonState.currentProgram.usesFlatInterpolation &&
            mode !== WebGL2RenderingContext.POINTS;
        if (needsLastProvokingVertex) {
            const expanded = elementArrayBuffer.getLastProvokingVertexIndexBuffer(
                mode,
                type,
                offset,
                count,
                this.hydContextType === "webgl2",
            );
            indexBuffer = expanded.buffer;
            indexFormat = expanded.format;
            drawIndexCount = expanded.indexCount;
            firstIndex = 0;
        }
        this.setPrimitiveState(
            needsLastProvokingVertex ? this.lastProvokingVertexTopology(mode) : topology,
            indexFormat,
        );
        this.setPBV();
        this.hydRpCache.RpSetIndexBuffer(indexBuffer, indexFormat);
        this.hydRpCache.RpDrawIndexed(drawIndexCount, instanceCount, firstIndex, 0, 0);
        this.finishDraw();
        const prepared: PreparedIndexedDraw = {
            stateToken: this.hydGlobalState.stateToken,
            elementArrayBuffer,
            bufferVersion: elementArrayBuffer.version,
            mode,
            count,
            type,
            offset,
            instanceCount,
            instancedApi,
            indexBuffer,
            indexFormat,
            indexCount: drawIndexCount,
            firstIndex,
        };
        this.lastIndexedDraw = prepared;
        this.cachePreparedIndexedDraw(prepared);
    }
}
