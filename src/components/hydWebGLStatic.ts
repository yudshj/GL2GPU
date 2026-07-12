import {
    HydActiveUniformInfo,
    brandHydWebGlObject,
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
    getVertexFormat,
} from './hydConstants';
import { HydShader } from "./hydShader";
import { HydProgram, ProgramUniformBuffer, ProgramUniformSampler, uniformMatrixDimensions } from "./hydProgram";
import { HydTexture, packedPixelLayout, textureUploadBytesPerPixel } from "./hydTexture";
import { HydBuffer } from "./hydBuffer";
import { FramebufferAttributes, HydFramebuffer } from "./hydFramebuffer";
import TypedArray = NodeJS.TypedArray;
import { hydWebGLConstants } from "./hydWebGLConstants";
import { ShaderTranslator } from "./shaderTranslator";
import { bridgeGlslDunderIdentifier, bridgeGlslDunderIdentifiers } from "./shaderGlslIdentifiers";

const NATIVE_CANVAS_GET_CONTEXT = HTMLCanvasElement.prototype.getContext;
const GL_SRGB_EXT = 0x8C40;
const GL_SRGB_ALPHA_EXT = 0x8C42;
const GL_SRGB8_ALPHA8_EXT = 0x8C43;
const GL_FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING_EXT = 0x8210;
const RENDER_PASS_DESCRIPTOR_CALLBACK = Symbol("renderPassDescriptorCallback");
type NativeValidationContext = WebGLRenderingContext | WebGL2RenderingContext;
let validationWebGl1: NativeValidationContext | null = null;
let validationWebGl2: NativeValidationContext | null = null;
const hydCanvasContexts = new WeakMap<HTMLCanvasElement, HydWebGLStatic>();
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
const SUPPORTED_EXTENSION_NAMES = [
    "ANGLE_instanced_arrays",
    "OES_element_index_uint",
    "EXT_sRGB",
] as const;
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
        case WebGL2RenderingContext.FLOAT:
            return 4;
        default:
            return 0;
    }
}

function vertexFormatNeedsFloatConversion(type: GLenum, size: number, normalized: boolean): boolean {
    if (type === WebGL2RenderingContext.FLOAT) return false;
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
    private activeUniformBuffers: ProgramUniformBuffer[] = [];
    private activeUniformSamplers: ProgramUniformSampler[] = [];
    private currentProgramValid: boolean = false;
    private synchronousReadbackCanvas: HTMLCanvasElement = null;
    private synchronousReadbackContext: CanvasRenderingContext2D = null;
    private synchronousSnapshotCanvas: OffscreenCanvas = null;
    private synchronousSnapshotContext: GPUCanvasContext = null;
    private snapshotRgbPipeline: GPURenderPipeline = null;
    private snapshotAlphaPipeline: GPURenderPipeline = null;
    private exactExternalReadCanvas: HTMLCanvasElement = null;
    private exactExternalReadContext: CanvasRenderingContext2D = null;
    private defaultFramebufferBackingTexture: GPUTexture = null;
    private defaultFramebufferBackingView: GPUTextureView = null;
    private useDefaultFramebufferBacking: boolean = true;
    private defaultFramebufferBackingNeedsPresentation: boolean = false;
    private defaultFramebufferNeedsImplicitClear: boolean = true;
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
    private readonly indexedDrawCache: WeakMap<object, PreparedIndexedDraw[]> = new WeakMap();
    private readonly arrayDrawCache: WeakMap<object, PreparedArrayDraw[]> = new WeakMap();
    private lastIndexedDraw: PreparedIndexedDraw = null;
    private lastArrayDraw: PreparedArrayDraw = null;

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
        return this.hydGlobalState.contextAttributes.alpha === false
            ? WebGL2RenderingContext.RGB8
            : WebGL2RenderingContext.RGBA8;
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

    regenerateDS(label: string, format: GPUTextureFormat, compareFunc: GPUCompareFunction, bindPoint: GLenum, width: number, height: number) {
        const texture = new HydTexture(this.hydDevice);
        texture.label = label;
        texture.state.compare = compareFunc;
        texture.renderbufferStorage(format, width, height);
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
        const clearState = this.hydGlobalState.clearState;
        const savedTarget = clearState.target;
        const savedColor = clearState.color;
        const savedDepth = clearState.depth;
        const savedStencil = clearState.stencil;
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

        this.hydLastCanvasSize = [width, height];
        this.canvasSizeDirty = false;
        this.regenerateDS(`defaultDepthBuffer ${width} ${height}`, 'depth32float', this.hydGlobalState.depthState.func, WebGL2RenderingContext.DEPTH_ATTACHMENT, width, height);
        this.regenerateDS(`defaultStencilBuffer ${width} ${height}`, 'stencil8', this.hydGlobalState.stencilState.frontFunc, WebGL2RenderingContext.STENCIL_ATTACHMENT, width, height);
        this.regenerateDS(`defaultDepthStencilBuffer ${width} ${height}`, 'depth24plus-stencil8', this.hydGlobalState.depthState.func, WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT, width, height);
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
        if (!this.shouldUseDefaultFramebufferBacking() && this.hydCanvas.width > 0 && this.hydCanvas.height > 0) {
            this.hydGlobalState.__canvasTexture = this.hydGpuctx.getCurrentTexture();
            this.hydGlobalState.__canvasView = this.hydGlobalState.__canvasTexture.createView({ label: 'initial canvasView' });
        }
        this[RENDER_PASS_DESCRIPTOR_CALLBACK] = this.hydGlobalState.getRenderPassDescriptor.bind(this.hydGlobalState);

        frameBeginFuncLst.push(this._frameStart.bind(this));  // 这里能work是因为我们只需要draw的第一个参数！
        frameEndFuncList.push(this._frameEnd.bind(this));  // 这里能work是因为我们只需要draw的第一个参数！

        // this.renderPassInfo = new HydRenderPassCache();
        this.hydRpCache = new HydRenderPassCache(this.hydDevice);
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
                return brandHydWebGlObject({ rangeMin: 8, rangeMax: 8, precision: 8 }, "shader-precision-format");
            case WebGL2RenderingContext.MEDIUM_FLOAT:
                return brandHydWebGlObject({ rangeMin: 14, rangeMax: 14, precision: 10 }, "shader-precision-format");
            case WebGL2RenderingContext.HIGH_FLOAT:
                return brandHydWebGlObject({ rangeMin: 127, rangeMax: 127, precision: 23 }, "shader-precision-format");
            case WebGL2RenderingContext.LOW_INT:
                return brandHydWebGlObject({ rangeMin: 8, rangeMax: 8, precision: 0 }, "shader-precision-format");
            case WebGL2RenderingContext.MEDIUM_INT:
                return brandHydWebGlObject({ rangeMin: 16, rangeMax: 16, precision: 0 }, "shader-precision-format");
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
        hydBuffer.deleted = true;
        this._der_flush();
        if (this.hydGlobalState.commonState.arrayBufferBinding === hydBuffer) {
            this.hydGlobalState.commonState.arrayBufferBinding = null;
        }
        if (this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding === hydBuffer) {
            this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding = null;
        }
        if (this.hydGlobalState.commonState.pixelPackBufferBinding === hydBuffer) {
            this.hydGlobalState.commonState.pixelPackBufferBinding = null;
        }
        if (this.hydGlobalState.commonState.pixelUnpackBufferBinding === hydBuffer) {
            this.hydGlobalState.commonState.pixelUnpackBufferBinding = null;
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
                case WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER_BINDING:
                    return this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
                case WebGL2RenderingContext.GENERATE_MIPMAP_HINT:
                    return this.hydGlobalState.miscState.generateMipmapHint;
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
                case WebGL2RenderingContext.UNPACK_PREMULTIPLY_ALPHA_WEBGL:
                    return this.hydGlobalState.miscState.unpackPremultiplyAlphaWebGL;
                case WebGL2RenderingContext.UNPACK_COLORSPACE_CONVERSION_WEBGL:
                    return this.hydGlobalState.miscState.unpackColorSpaceConversionWebGL;
                case WebGL2RenderingContext.SAMPLE_BUFFERS:
                    return this.hydGlobalState.contextAttributes.antialias ? 1 : 0;
                case WebGL2RenderingContext.SAMPLES:
                    return this.hydGlobalState.contextAttributes.antialias ? 4 : 0;
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
                return program.hydAttributes.length;
            case WebGL2RenderingContext.ACTIVE_UNIFORMS:
                return program.hydUniforms.filter(isVisibleActiveUniform).length +
                    program.hydSamplers.filter((sampler) => sampler.arrayIndex === undefined || sampler.arrayIndex === 0).length;
            case WebGL2RenderingContext.ACTIVE_UNIFORM_BLOCKS:
                if (this.hydContextType === "webgl2") return 0;
                break;
        }
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
        return null;
    }

    getSupportedExtensions(): string[] {
        return [...SUPPORTED_EXTENSION_NAMES];
    }

    getExtension(extensionName: string) {
        const canonicalName = typeof extensionName === "string"
            ? SUPPORTED_EXTENSION_BY_LOWER_NAME.get(extensionName.toLowerCase())
            : undefined;
        if (!canonicalName) {
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
        }
        if (extension) this.extensionObjects.set(canonicalName, extension);
        return extension;
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
        if (framebuffer === this.hydGlobalState.defaultFramebuffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        const attrib = framebuffer.attachments.get(attachment);
        if (!attrib) {
            if (pname === WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE) {
                return WebGL2RenderingContext.NONE;
            }
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        switch (pname) {
            case GL_FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING_EXT:
                if (!this.enabledExtensions.has("EXT_SRGB")) {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                    return null;
                }
                return attrib.format?.endsWith("-srgb")
                    ? GL_SRGB_EXT
                    : WebGL2RenderingContext.LINEAR;
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
        program.uniformBufferLocations.push(location);
        if (this.currentProgramValid && this.hydGlobalState.commonState.currentProgram === program) {
            location.writeFloat32View = location.float32View;
            location.writeInt32View = location.int32View;
            location.writeUint32View = location.uint32View;
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
        if (target !== WebGL2RenderingContext.GENERATE_MIPMAP_HINT) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (mode !== WebGL2RenderingContext.FASTEST &&
            mode !== WebGL2RenderingContext.NICEST &&
            mode !== WebGL2RenderingContext.DONT_CARE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        this.hydGlobalState.miscState.generateMipmapHint = mode;
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
        shader.glsl_shader = source.trim();
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
        }
        for (const sampler of this.activeUniformSamplers) {
            sampler.activeForUniformUpdates = true;
        }
    }

    uniform1f(pub: ProgramUniformBuffer, x0: number) {
        if (pub === null) return;
        const a = pub.writeFloat32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        a[pub.wordOffset] = x0;
    }
    uniform2f(pub: ProgramUniformBuffer, x0: number, x1: number) {
        if (pub === null) return;
        const a = pub.writeFloat32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = pub.wordOffset;
        a[offset] = x0;
        a[offset + 1] = x1;
    }
    uniform3f(pub: ProgramUniformBuffer, x0: number, x1: number, x2: number) {
        if (pub === null) return;
        const a = pub.writeFloat32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = pub.wordOffset;
        a[offset] = x0;
        a[offset + 1] = x1;
        a[offset + 2] = x2;
    }
    uniform4f(pub: ProgramUniformBuffer, x0: number, x1: number, x2: number, x3: number) {
        if (pub === null) return;
        const a = pub.writeFloat32View;
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
        const a = uniform.writeInt32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = uniform.wordOffset;
        a[offset] = x0;
    }
    uniform2i(pub: ProgramUniformBuffer, x0: number, x1: number) {
        if (pub === null) return;
        const a = pub.writeInt32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = pub.wordOffset;
        a[offset] = x0;
        a[offset + 1] = x1;
    }
    uniform3i(pub: ProgramUniformBuffer, x0: number, x1: number, x2: number) {
        if (pub === null) return;
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
    uniform4i(pub: ProgramUniformBuffer, x0: number, x1: number, x2: number, x3: number) {
        if (pub === null) return;
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
    uniform1ui(pub: ProgramUniformBuffer, x0: number) {
        if (pub === null) return;
        const a = pub.writeUint32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        a[pub.wordOffset] = x0 >>> 0;
    }
    uniform2ui(pub: ProgramUniformBuffer, x0: number, x1: number) {
        if (pub === null) return;
        const a = pub.writeUint32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = pub.wordOffset;
        a[offset] = x0 >>> 0;
        a[offset + 1] = x1 >>> 0;
    }
    uniform3ui(pub: ProgramUniformBuffer, x0: number, x1: number, x2: number) {
        if (pub === null) return;
        const a = pub.writeUint32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = pub.wordOffset;
        a[offset] = x0 >>> 0;
        a[offset + 1] = x1 >>> 0;
        a[offset + 2] = x2 >>> 0;
    }
    uniform4ui(pub: ProgramUniformBuffer, x0: number, x1: number, x2: number, x3: number) {
        if (pub === null) return;
        const a = pub.writeUint32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = pub.wordOffset;
        a[offset] = x0 >>> 0;
        a[offset + 1] = x1 >>> 0;
        a[offset + 2] = x2 >>> 0;
        a[offset + 3] = x3 >>> 0;
    }

    private uniformArrayLength(value: ArrayLike<number>): number {
        if ((typeof value !== "object" && typeof value !== "function") || value === null || typeof (value as any).length !== "number") {
            throw new TypeError("uniform vector data must be an array or typed array");
        }
        return Number((value as any).length);
    }

    private writeFloatUniformArray(pub: ProgramUniformBuffer, value: ArrayLike<number>, components: number, expectedType: GLenum) {
        const length = this.uniformArrayLength(value);
        const target = pub.writeFloat32View;
        if (!target) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (pub.webgl_type !== expectedType) {
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
            target[offset] = value[0];
            if (components > 1) target[offset + 1] = value[1];
            if (components > 2) target[offset + 2] = value[2];
            if (components > 3) target[offset + 3] = value[3];
            return;
        }
        if (stride === components && valueCount === length && ArrayBuffer.isView(value)) {
            target.set(value, pub.wordOffset);
            return;
        }
        for (let element = 0; element < elements; element++) {
            const sourceOffset = element * components;
            const targetOffset = pub.wordOffset + element * stride;
            for (let component = 0; component < components; component++) {
                target[targetOffset + component] = value[sourceOffset + component];
            }
        }
    }

    private writeIntUniformArray(pub: ProgramUniformBuffer, value: ArrayLike<number>, components: number, expectedType: GLenum, boolType: GLenum) {
        const length = this.uniformArrayLength(value);
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
            target[offset] = value[0];
            if (components > 1) target[offset + 1] = value[1];
            if (components > 2) target[offset + 2] = value[2];
            if (components > 3) target[offset + 3] = value[3];
            return;
        }
        if (stride === components && valueCount === length && ArrayBuffer.isView(value)) {
            target.set(value, pub.wordOffset);
            return;
        }
        for (let element = 0; element < elements; element++) {
            const sourceOffset = element * components;
            const targetOffset = pub.wordOffset + element * stride;
            for (let component = 0; component < components; component++) {
                target[targetOffset + component] = value[sourceOffset + component];
            }
        }
    }

    private writeUintUniformArray(pub: ProgramUniformBuffer, value: ArrayLike<number>, components: number, expectedType: GLenum, boolType: GLenum) {
        const length = this.uniformArrayLength(value);
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
            target[offset] = value[0] >>> 0;
            if (components > 1) target[offset + 1] = value[1] >>> 0;
            if (components > 2) target[offset + 2] = value[2] >>> 0;
            if (components > 3) target[offset + 3] = value[3] >>> 0;
            return;
        }
        if (stride === components && valueCount === length && ArrayBuffer.isView(value)) {
            target.set(value, pub.wordOffset);
            return;
        }
        for (let element = 0; element < elements; element++) {
            const sourceOffset = element * components;
            const targetOffset = pub.wordOffset + element * stride;
            for (let component = 0; component < components; component++) {
                target[targetOffset + component] = value[sourceOffset + component] >>> 0;
            }
        }
    }

    uniform1fv(pub: ProgramUniformBuffer, v: ArrayLike<number>) {
        if (pub === null) return;
        this.writeFloatUniformArray(pub, v, 1, WebGL2RenderingContext.FLOAT);
    }
    uniform2fv(pub: ProgramUniformBuffer, v: ArrayLike<number>) {
        if (pub === null) return;
        this.writeFloatUniformArray(pub, v, 2, WebGL2RenderingContext.FLOAT_VEC2);
    }
    uniform3fv(pub: ProgramUniformBuffer, v: ArrayLike<number>) {
        if (pub === null) return;
        const target = pub.writeFloat32View;
        if (target && pub.webgl_type === WebGL2RenderingContext.FLOAT_VEC3 &&
            v !== null && (typeof v === "object" || typeof v === "function") && v.length === 3) {
            const offset = pub.wordOffset;
            target[offset] = v[0];
            target[offset + 1] = v[1];
            target[offset + 2] = v[2];
            return;
        }
        this.writeFloatUniformArray(pub, v, 3, WebGL2RenderingContext.FLOAT_VEC3);
    }
    uniform4fv(pub: ProgramUniformBuffer, v: ArrayLike<number>) {
        if (pub === null) return;
        this.writeFloatUniformArray(pub, v, 4, WebGL2RenderingContext.FLOAT_VEC4);
    }

    uniform1iv(pub: ProgramUniformBuffer | ProgramUniformSampler, v: ArrayLike<number>) {
        if (pub === null) return;
        const length = this.uniformArrayLength(v);
        if (length < 1) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (pub instanceof ProgramUniformSampler) {
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
                const unit = Number(v[i]);
                if (!Number.isInteger(unit) || unit < 0 || unit >= maxTextureUnits) {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                    return;
                }
            }
            for (let i = 0; i < count; i++) {
                const sampler = elements[i];
                const unit = Number(v[i]);
                if (sampler.textureUnit !== unit) {
                    sampler.textureUnit = unit;
                    this.samplerOriginStateVersion++;
                    this.hydGlobalState.recordTransition("uniformSampler", sampler.name, unit);
                }
            }
            return;
        }
        this.writeIntUniformArray(pub, v, 1, WebGL2RenderingContext.INT, WebGL2RenderingContext.BOOL);
    }
    uniform2iv(pub: ProgramUniformBuffer, v: ArrayLike<number>) {
        if (pub === null) return;
        this.writeIntUniformArray(pub, v, 2, WebGL2RenderingContext.INT_VEC2, WebGL2RenderingContext.BOOL_VEC2);
    }
    uniform3iv(pub: ProgramUniformBuffer, v: ArrayLike<number>) {
        if (pub === null) return;
        this.writeIntUniformArray(pub, v, 3, WebGL2RenderingContext.INT_VEC3, WebGL2RenderingContext.BOOL_VEC3);
    }
    uniform4iv(pub: ProgramUniformBuffer, v: ArrayLike<number>) {
        if (pub === null) return;
        this.writeIntUniformArray(pub, v, 4, WebGL2RenderingContext.INT_VEC4, WebGL2RenderingContext.BOOL_VEC4);
    }
    uniform1uiv(pub: ProgramUniformBuffer, v: ArrayLike<number>) {
        if (pub === null) return;
        this.writeUintUniformArray(pub, v, 1, WebGL2RenderingContext.UNSIGNED_INT, WebGL2RenderingContext.BOOL);
    }
    uniform2uiv(pub: ProgramUniformBuffer, v: ArrayLike<number>) {
        if (pub === null) return;
        this.writeUintUniformArray(pub, v, 2, WebGL2RenderingContext.UNSIGNED_INT_VEC2, WebGL2RenderingContext.BOOL_VEC2);
    }
    uniform3uiv(pub: ProgramUniformBuffer, v: ArrayLike<number>) {
        if (pub === null) return;
        this.writeUintUniformArray(pub, v, 3, WebGL2RenderingContext.UNSIGNED_INT_VEC3, WebGL2RenderingContext.BOOL_VEC3);
    }
    uniform4uiv(pub: ProgramUniformBuffer, v: ArrayLike<number>) {
        if (pub === null) return;
        this.writeUintUniformArray(pub, v, 4, WebGL2RenderingContext.UNSIGNED_INT_VEC4, WebGL2RenderingContext.BOOL_VEC4);
    }

    private writeFloatUniformMatrix(
        pub: ProgramUniformBuffer,
        transpose: boolean,
        value: ArrayLike<number>,
        columns: number,
        rows: number,
        expectedType: GLenum,
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
        if (transpose) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const matrixValues = columns * rows;
        const length = this.uniformArrayLength(value);
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
                    target[targetBase + column * columnStride + row] = value[sourceIndex];
                }
            }
        }
    }

    uniformMatrix2fv(pub: ProgramUniformBuffer, transpose: boolean, v: ArrayLike<number>) {
        if (pub === null) return;
        this.writeFloatUniformMatrix(pub, transpose, v, 2, 2, WebGL2RenderingContext.FLOAT_MAT2);
    }
    uniformMatrix3fv(pub: ProgramUniformBuffer, transpose: boolean, v: ArrayLike<number>) {
        if (pub === null) return;
        this.writeFloatUniformMatrix(pub, transpose, v, 3, 3, WebGL2RenderingContext.FLOAT_MAT3);
    }
    uniformMatrix4fv(pub: ProgramUniformBuffer, transpose: boolean, v: ArrayLike<number>) {
        if (pub === null) return;
        this.writeFloatUniformMatrix(pub, transpose, v, 4, 4, WebGL2RenderingContext.FLOAT_MAT4);
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

    private resolveTexImageSourceExtent(source: any): { width: number, height: number } | null {
        if (!source) return null;
        if (typeof HTMLVideoElement !== "undefined" && source instanceof HTMLVideoElement) {
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
                format === WebGL2RenderingContext.RGBA_INTEGER));
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
                type === WebGL2RenderingContext.HALF_FLOAT ||
                type === WebGL2RenderingContext.UNSIGNED_INT_24_8));
    }

    private validateTextureUploadView(
        pixels: any,
        width: number,
        height: number,
        format: GLenum,
        type: GLenum,
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
                        type === WebGL2RenderingContext.UNSIGNED_INT_24_8
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
            const required = packedPixelLayout(
                width,
                height,
                bytesPerPixel,
                this.hydGlobalState.miscState.unpackAlignment,
            ).requiredBytes;
            if (pixels.byteLength < required) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return false;
            }
        } catch {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return false;
        }
        return true;
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
            || (((internalformat === GL_SRGB_EXT && format === GL_SRGB_EXT) ||
                (internalformat === GL_SRGB_ALPHA_EXT && format === GL_SRGB_ALPHA_EXT)) &&
                type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (this.hydContextType === "webgl2" &&
                ((internalformat === WebGL2RenderingContext.SRGB8 && format === WebGL2RenderingContext.RGB) ||
                    (internalformat === WebGL2RenderingContext.SRGB8_ALPHA8 && format === WebGL2RenderingContext.RGBA)) &&
                type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (internalformat === WebGL2RenderingContext.RGB && format === WebGL2RenderingContext.RGB &&
                (type === WebGL2RenderingContext.UNSIGNED_BYTE || type === WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5))
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
            || (format === WebGL2RenderingContext.LUMINANCE_ALPHA && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || ((format === GL_SRGB_EXT || format === GL_SRGB_ALPHA_EXT) && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (format === WebGL2RenderingContext.RGB && type === WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5)
            || (format === WebGL2RenderingContext.RGBA &&
                (type === WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4 ||
                    type === WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1));
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

    private markDrawFramebufferAttachmentsAsRenderTargets(mask: GLbitfield) {
        const framebuffer = this.hydGlobalState.commonState.drawFramebufferBinding;
        if (framebuffer === this.hydGlobalState.defaultFramebuffer || mask === 0) return;

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

    private getMaskedClearTargets(): Array<{ view: GPUTextureView, format: GPUTextureFormat, writeMask: GPUColorWriteFlags }> {
        return this.hydGlobalState.commonState.drawFramebufferBinding.drawBuffers.flatMap((value) => {
            if (value === WebGL2RenderingContext.BACK) {
                return this.hydGlobalState.__canvasView ? [{
                    view: this.hydGlobalState.__canvasView,
                    format: "bgra8unorm" as GPUTextureFormat,
                    writeMask: this.colorWriteMaskForAttachment(),
                }] : [];
            }
            if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                const attachment = this.hydGlobalState.commonState.drawFramebufferBinding.attachments.get(value);
                return attachment ? [{
                    view: attachment.view,
                    format: attachment.format,
                    writeMask: this.colorWriteMaskForAttachment(attachment),
                }] : [];
            }
            return [];
        });
    }

    private getMaskedClearPipeline(targets: Array<{ view: GPUTextureView, format: GPUTextureFormat, writeMask: GPUColorWriteFlags }>): GPURenderPipeline {
        const key = targets.map((target) => `${target.format}:${target.writeMask}`).join(",");
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
            new Float32Array(
                this.hydGlobalState.commonState.drawFramebufferBinding === this.hydGlobalState.defaultFramebuffer &&
                this.hydGlobalState.contextAttributes.alpha === false
                    ? [...this.hydGlobalState.clearState.color.slice(0, 3), 1]
                    : this.hydGlobalState.clearState.color,
            ),
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
        if (target === WebGL2RenderingContext.RENDERBUFFER) {
            const renderbuffer = this.hydGlobalState.commonState.renderbufferBinding;
            if (!renderbuffer) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            this._der_flush();
            renderbuffer.renderbufferInternalFormat = internalFormat;
            renderbuffer.renderbufferSamples = 0;
            switch (internalFormat) {
                case GL_SRGB8_ALPHA8_EXT:
                    if (this.hydContextType !== "webgl2" && !this.enabledExtensions.has("EXT_SRGB")) {
                        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                        return;
                    }
                    renderbuffer.renderbufferStorage('rgba8unorm-srgb', width, height);
                    break;
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
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                    return;
            }
        }
        this.hydGlobalState.recordTransition("renderbufferStorage", target, internalFormat, width, height);
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
            this.hydGlobalState.recordTransition("disableVertexAttribArray", index);
        }
    }

    private setCurrentVertexAttrib(index: number, x: number, y: number, z: number, w: number) {
        index = Number(index) >>> 0;
        const values = this.hydGlobalState.currentVertexAttribValues[index];
        if (!values) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (values[0] === x && values[1] === y && values[2] === z && values[3] === w) return;
        this._der_flush();
        values[0] = x;
        values[1] = y;
        values[2] = z;
        values[3] = w;
        this.hydGlobalState.updateCurrentVertexAttribBuffer(index);
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

    clearColor(r: number, g: number, b: number, a: number) {
        r = clampWebGlUnitFloat(r);
        g = clampWebGlUnitFloat(g);
        b = clampWebGlUnitFloat(b);
        a = clampWebGlUnitFloat(a);
        const [r1, g1, b1, a1] = this.hydGlobalState.clearState.color;
        if (r !== r1 || g !== g1 || b !== b1 || a !== a1) {
            this.hydGlobalState.clearState.color = [r, g, b, a];
            this.hydGlobalState.recordTransition("clearColor", r, g, b, a);
        }
    }

    clearDepth(depth: number) {
        depth = clampWebGlUnitFloat(depth);
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
        this.markDrawFramebufferAttachmentsAsRenderTargets(
            effectiveMask | (needsMaskedColorClear ? WebGL2RenderingContext.COLOR_BUFFER_BIT : 0),
        );
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
        if (effectiveMask === 0) {
            return;
        }
        if (this.hydGlobalState.miscState.scissorTest) {
            this.hydGlobalState.recordTransition("clear", 0);
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

    private bufferBindingKindForTarget(target: GLenum): "element-array" | "other" | null {
        if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER) {
            return "element-array";
        }
        if (target === WebGL2RenderingContext.ARRAY_BUFFER) {
            return "other";
        }
        if (this.hydContextType === "webgl2" &&
            (target === WebGL2RenderingContext.PIXEL_PACK_BUFFER ||
                target === WebGL2RenderingContext.PIXEL_UNPACK_BUFFER)) {
            return "other";
        }
        return null;
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
            buffer === this.hydGlobalState.commonState.arrayBufferBinding) {
            return;
        }
        if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER &&
            buffer === this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding) {
            return;
        }
        if (this.hydContextType === "webgl2" && target === WebGL2RenderingContext.PIXEL_PACK_BUFFER &&
            buffer === this.hydGlobalState.commonState.pixelPackBufferBinding) {
            return;
        }
        if (this.hydContextType === "webgl2" && target === WebGL2RenderingContext.PIXEL_UNPACK_BUFFER &&
            buffer === this.hydGlobalState.commonState.pixelUnpackBufferBinding) {
            return;
        }
        if (buffer instanceof HydBuffer &&
            (target === WebGL2RenderingContext.ARRAY_BUFFER || target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER)) {
            if (buffer.ownerToken !== this.contextToken || buffer.deleted) {
                this.setObjectValidationError(buffer);
                return;
            }
            const bindingKind = target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER ? "element-array" : "other";
            if (buffer.bindingKind && buffer.bindingKind !== bindingKind) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            buffer.bindingKind = bindingKind;
            buffer.initialized = true;
            if (target === WebGL2RenderingContext.ARRAY_BUFFER) {
                this.hydGlobalState.commonState.arrayBufferBinding = buffer;
            } else {
                this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding = buffer;
                this.hydGlobalState.recordTransition("bindBuffer", target, buffer.hash);
            }
            return;
        }
        const bindingKind = this.bufferBindingKindForTarget(target);
        if (!bindingKind) {
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
        if (hydBuffer && hydBuffer.bindingKind && hydBuffer.bindingKind !== bindingKind) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (hydBuffer && !hydBuffer.bindingKind) {
            hydBuffer.bindingKind = bindingKind;
        }
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
        }
    }

    private getBoundBufferForTarget(target: GLenum): HydBuffer | null {
        if (!this.bufferBindingKindForTarget(target)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
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
        return null;
    }

    bufferData(target: GLenum, data: any, usage: GLenum) {
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
        if (!this.bufferBindingKindForTarget(target)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        const buffer = this.getBoundBufferForTarget(target);
        if (!buffer) {
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
            source = data;
            size = data.byteLength;
        } else {
            const converted = Number(data);
            size = Number.isFinite(converted) ? Math.trunc(converted) : 0;
        }
        if (size < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }

        this._der_flush();
        if (target === WebGL2RenderingContext.ARRAY_BUFFER) {
            buffer.descriptor.usage |= GPUBufferUsage.VERTEX;
        } else if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER) {
            buffer.descriptor.usage |= GPUBufferUsage.INDEX;
        } else if (target === WebGL2RenderingContext.PIXEL_PACK_BUFFER || target === WebGL2RenderingContext.PIXEL_UNPACK_BUFFER) {
            buffer.descriptor.usage |= GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
        }

        buffer.webglSize = size;
        buffer.descriptor.size = Math.max(4, Math.ceil(size / 4) * 4);
        const invalidatesConvertedVertices = buffer.hasConvertedVertexBuffers;
        buffer.write(source, 0);
        buffer.webglUsage = usage;
        this.hydGlobalState.recordTransition(
            "bufferData",
            target,
            buffer.hash,
            size,
            invalidatesConvertedVertices ? buffer.version : 0,
        );
    }

    bufferSubData(target: GLenum, dstOffset: GLintptr, data: any) {
        if (!this.bufferBindingKindForTarget(target)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        const buffer = this.getBoundBufferForTarget(target);
        if (!buffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (!isBufferSource(data)) {
            throw new TypeError("bufferSubData requires an ArrayBuffer or ArrayBufferView");
        }
        const offset = toWebGlInt64(dstOffset);
        if (offset < 0 || offset + data.byteLength > buffer.webglSize) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (data.byteLength === 0) return;
        this._der_flush();
        const invalidatesConvertedVertices = buffer.hasConvertedVertexBuffers;
        buffer.write(data, offset);
        if (invalidatesConvertedVertices) {
            this.hydGlobalState.recordTransition("bufferSubDataConvertedVertex", buffer.hash, buffer.version);
        }
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
        if (program === null || program === undefined) {
            throw new TypeError("getActiveUniform requires a WebGLProgram");
        }
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return null;
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

    getActiveAttrib(program: HydProgram, index: GLuint): HydActiveUniformInfo {
        if (program === null || program === undefined) {
            throw new TypeError("getActiveAttrib requires a WebGLProgram");
        }
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return null;
        }
        if (index < 0 || index >= program.hydAttributes.length) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return null;
        }
        return brandHydWebGlObject({
            name: program.hydAttributes[index].name,
            size: program.hydAttributes[index].size,
            type: program.hydAttributes[index].type,
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

    useProgram(program: HydProgram | null) {
        if (program !== null && !this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
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
            this.setShaderProgramValidationError(program);
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
        program.infoLog = "";
        const attachedShaders = program.getAttachedShaders();
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
            validationContext.linkProgram(validationProgram);
            const linked = Boolean(validationContext.getProgramParameter(validationProgram, WebGL2RenderingContext.LINK_STATUS));
            const infoLog = validationContext.getProgramInfoLog(validationProgram) || "";
            validationContext.deleteProgram(validationProgram);
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
        const maxTextureUnits = enumToConstant.get(WebGL2RenderingContext.MAX_COMBINED_TEXTURE_IMAGE_UNITS) || 0;
        if (target < 0 || target >= maxTextureUnits) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (this.hydGlobalState.commonState.activeTextureUnit !== target) {
            this.hydGlobalState.commonState.activeTextureUnit = target;
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
        if (texture instanceof HydTexture) {
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
        console.assert(args.length === 9 || args.length === 6);
        const target: GLenum = args.at(0);
        const level: GLint = args.at(1);
        const internalformat: GLenum = args.at(2);
        let width: GLsizei;
        let height: GLsizei;
        const border: GLint = 0;
        const format: GLenum = args.at(-3);
        const type: GLenum = args.at(-2);
        const sourcePixels: any = args.at(-1);
        let pixels = sourcePixels;
        if (!this.validateTexImage2DTarget(target)) return;
        if (args.length === 6) {
            const extent = this.resolveTexImageSourceExtent(sourcePixels);
            if (!extent) {
                throw new Error("unsupported texImage2D: " + args);
            }
            width = extent.width;
            height = extent.height;
        } else {
            width = args.at(3);
            height = args.at(4);
            if (this.hydContextType !== "webgl2" && sourcePixels !== null && !ArrayBuffer.isView(sourcePixels)) {
                throw new TypeError("texImage2D pixels must be an ArrayBufferView or null");
            }
        }
        if ((args.length === 9 && args.at(5) !== 0) ||
            !this.validateTexImage2DDimensions(target, level, width, height)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (!this.isKnownTextureFormat(format) || !this.isKnownTextureType(type)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (sourcePixels instanceof HTMLCanvasElement) {
            pixels = hydCanvasContexts.get(sourcePixels)?.prepareCanvasForTextureUpload() || sourcePixels;
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
        this._der_flush();
        try {
            texture.texImage2D(pixels, target, level, internalformat, width, height, border, format, type, unpack);
        } catch (error) {
            if ((error as any)?.name === "SecurityError") throw error;
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("texImage2D", target, level, internalformat, width, height, border, format, type);
    }

    compressedTexImage2D(...args: Array<any>) {
        if (this.hydContextType !== "webgl2" && (args.length < 7 || !ArrayBuffer.isView(args[6]))) {
            throw new TypeError(`compressedTexImage2D requires 7 arguments in WebGL 1, received ${args.length}`);
        }
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
    }

    compressedTexSubImage2D(...args: Array<any>) {
        if (this.hydContextType !== "webgl2" && (args.length < 8 || !ArrayBuffer.isView(args[7]))) {
            throw new TypeError(`compressedTexSubImage2D requires 8 arguments in WebGL 1, received ${args.length}`);
        }
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
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
        console.assert(args.length === 7 || args.length === 9 || args.length === 8 || args.length === 10);
        const target: GLenum = args.at(0);
        const level: GLint = args.at(1);
        const xoffset: GLint = args.at(2);
        const yoffset: GLint = args.at(3);
        let width: GLsizei;
        let height: GLsizei;
        let format: GLenum;
        let type: GLenum;
        let pixels: any;
        if (!this.validateTexImage2DTarget(target)) return;
        if (args.length === 7 || args.length === 8) {
            format = args.at(4);
            type = args.at(5);
            pixels = args.at(6);
            if (args.length === 8 && pixels && "byteLength" in pixels) {
                const sourceOffset = args.at(7) || 0;
                const byteOffset = sourceOffset * ((pixels as any).BYTES_PER_ELEMENT || 1);
                pixels = new Uint8Array((pixels as TypedArray).buffer, (pixels as TypedArray).byteOffset + byteOffset, (pixels as TypedArray).byteLength - byteOffset);
            }
            const extent = this.resolveTexImageSourceExtent(pixels);
            if (!extent) {
                throw new Error("unsupported texSubImage2D: " + args);
            }
            width = extent.width;
            height = extent.height;
        } else {
            width = args.at(4);
            height = args.at(5);
            format = args.at(6);
            type = args.at(7);
            pixels = args.at(8);
            if (this.hydContextType !== "webgl2" && pixels !== null && !ArrayBuffer.isView(pixels)) {
                throw new TypeError("texSubImage2D pixels must be an ArrayBufferView or null");
            }
            if (typeof pixels === "number") {
                pixels = this.pixelUnpackBufferSlice(pixels, width, height, 1, format, type);
            } else if (args.length === 10 && pixels && "byteLength" in pixels) {
                const sourceOffset = args.at(9) || 0;
                const byteOffset = sourceOffset * ((pixels as any).BYTES_PER_ELEMENT || 1);
                pixels = new Uint8Array((pixels as TypedArray).buffer, (pixels as TypedArray).byteOffset + byteOffset, (pixels as TypedArray).byteLength - byteOffset);
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
        if (!this.isSupportedTextureSubUploadFormat(format, type)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
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
        if (image.format !== format || (this.hydContextType !== "webgl2" && image.type !== type)) {
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
        if (target !== WebGL2RenderingContext.TEXTURE_2D && target !== WebGL2RenderingContext.TEXTURE_CUBE_MAP) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        const texture = this.currentTexture(target);
        if (!texture) return;
        const baseTarget = target === WebGL2RenderingContext.TEXTURE_CUBE_MAP
            ? WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X
            : WebGL2RenderingContext.TEXTURE_2D;
        const baseImage = texture.getImageState(baseTarget, 0);
        const powerOfTwo = (value: number) => value > 0 && (value & (value - 1)) === 0;
        if (!baseImage || baseImage.width <= 0 || baseImage.height <= 0 ||
            (this.hydContextType !== "webgl2" &&
                (baseImage.internalFormat === GL_SRGB_EXT || baseImage.internalFormat === GL_SRGB_ALPHA_EXT)) ||
            (target === WebGL2RenderingContext.TEXTURE_CUBE_MAP && !texture.isCubeCompleteAtLevel(0)) ||
            (this.hydContextType !== "webgl2" && (!powerOfTwo(baseImage.width) || !powerOfTwo(baseImage.height))) ||
            !texture.generateMipmap(target)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
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
        if (repeatAttribute && repeatBuffer &&
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
        const webgl1Type = type === WebGL2RenderingContext.BYTE || type === WebGL2RenderingContext.UNSIGNED_BYTE ||
            type === WebGL2RenderingContext.SHORT || type === WebGL2RenderingContext.UNSIGNED_SHORT ||
            type === WebGL2RenderingContext.FLOAT;
        const validType = webgl1Type || (this.hydContextType === "webgl2" &&
            (type === WebGL2RenderingContext.HALF_FLOAT || type === WebGL2RenderingContext.INT || type === WebGL2RenderingContext.UNSIGNED_INT));
        if (!validType) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
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
        const stride = _stride || size * componentBytes;

        if (attribute.size !== size || attribute.type !== type || attribute.normalized !== normalized ||
            attribute.stride !== stride || attribute.webglStride !== _stride ||
            attribute.offset !== offset || attribute.buffer !== buffer) {
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
                if (vertexFormatNeedsFloatConversion(type, size, normalized)) {
                    attribute.format = null;
                } else try {
                    attribute.format = getVertexFormat(type, size, normalized);
                } catch (_) {
                    attribute.format = null;
                }
            }
            attribute.updateHash();
            this.hydGlobalState.recordTransition("vertexAttribPointer", index, size, type, normalized, stride, offset);
        }
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
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return false;
        }
    }


    blendFunc(sfactor: GLenum, dfactor: GLenum) {
        const src = enumToBlendFactors.get(sfactor);
        const dst = enumToBlendFactors.get(dfactor);
        if (!src || !dst || dfactor === WebGL2RenderingContext.SRC_ALPHA_SATURATE) {
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
        if (!srcRGB1 || !dstRGB1 || !srcAlpha1 || !dstAlpha1 ||
            dstRGB === WebGL2RenderingContext.SRC_ALPHA_SATURATE ||
            dstAlpha === WebGL2RenderingContext.SRC_ALPHA_SATURATE) {
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

    framebufferTexture2D(target: GLenum, attachment: GLenum, texTarget: GLenum, texture: HydTexture | null, level: GLint) {
        if (!this.validateFramebufferTarget(target)) return;
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
        this._der_flush();
        const framebuffer = this.getFramebufferForTarget(target);
        if (framebuffer === this.hydGlobalState.defaultFramebuffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (texture === null) {
            framebuffer.attachments.delete(attachment);
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

        framebuffer.attachments.set(attachment, attrib);
        framebuffer.resetHash();
        this.gpuViewportDirty = true;
        this.gpuScissorDirty = true;
        this.hydGlobalState.recordTransition("framebufferTexture2D", target, attachment, texTarget, texture.hash, level);
    }

    framebufferTextureLayer(target: GLenum, attachment: GLenum, texture: HydTexture | null, level: GLint, layer: GLint) {
        if (texture !== null && !this.isTexture(texture)) {
            if (texture instanceof HydTexture && texture.ownerToken === this.contextToken) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
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
        framebuffer.attachments.set(attachment, attrib);
        framebuffer.resetHash();
        this.gpuViewportDirty = true;
        this.gpuScissorDirty = true;
        this.hydGlobalState.recordTransition("framebufferTextureLayer", target, attachment, texture.hash, level, layer);
    }

    framebufferRenderbuffer(target: GLenum, attachment: GLenum, renderbufferTarget: GLenum, renderbuffer: HydTexture | null) {
        if (!this.validateFramebufferTarget(target)) return;
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
            framebuffer.attachments.delete(attachment);
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
        const sourceHasAlpha = readFramebuffer === this.hydGlobalState.defaultFramebuffer
            ? this.hydGlobalState.contextAttributes.alpha !== false
            : (this.getReadColorAttachment()?.colorBits[3] || 0) > 0;
        const destinationNeedsAlpha = internalformat === WebGL2RenderingContext.ALPHA ||
            internalformat === WebGL2RenderingContext.LUMINANCE_ALPHA ||
            internalformat === WebGL2RenderingContext.RGBA;
        if (destinationNeedsAlpha && !sourceHasAlpha) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const texture = this.currentTexture(target);
        if (!texture) return;
        if (this.copyAliasesReadAttachment(texture, target, level)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this._der_flush();
        texture.texImage2D(null, target, level, internalformat, width, height, border, internalformat, WebGL2RenderingContext.UNSIGNED_BYTE);
        if (!this.copyReadFramebufferRegionToTexture(texture, target, level, 0, 0, x, y, width, height)) return;
        texture.markCopyDestination();
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
        texture.markCopyDestination();
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("copyTexSubImage2D", target, level, xoffset, yoffset, x, y, width, height);
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
    ): boolean {
        if (width === 0 || height === 0) return true;
        if (destination.format !== "rgba8unorm" && destination.format !== "bgra8unorm") {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return false;
        }
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

        const pixels = new Uint8Array(copyWidth * copyHeight * 4);
        const read = readsDefault
            ? this.readDefaultFramebufferSynchronously(sourceX0, sourceY0, copyWidth, copyHeight, pixels, 0)
            : this.readColorAttachmentSynchronously(attachment, sourceX0, sourceY0, copyWidth, copyHeight, pixels, 0);
        if (!read) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return false;
        }

        const destinationImage = destination.getImageState(target, level);
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
        const gpuRows = new Uint8Array(pixels.byteLength);
        for (let row = 0; row < copyHeight; row++) {
            const sourceOffset = row * rowBytes;
            const destinationOffset = (copyHeight - row - 1) * rowBytes;
            gpuRows.set(pixels.subarray(sourceOffset, sourceOffset + rowBytes), destinationOffset);
        }
        const destinationLogicalX = xoffset + sourceX0 - x;
        const destinationLogicalY = yoffset + sourceY0 - y;
        const destinationHeight = Math.max(1, destination.height >> level);
        const layer = target >= WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X &&
            target <= WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z
            ? target - WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X
            : 0;
        this.hydDevice.queue.writeTexture(
            {
                texture: destination.texture,
                mipLevel: level,
                origin: {
                    x: destinationLogicalX,
                    y: destinationHeight - destinationLogicalY - copyHeight,
                    z: layer,
                },
            },
            gpuRows,
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
            attachment.format !== "rgba8unorm-srgb") {
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
        try {
            const read = this.readTextureChannelsSynchronously(
                attachment.attachment.texture,
                sourceWidth,
                sourceHeight,
                x,
                readY,
                width,
                height,
                destination,
                destinationOffset,
                level,
                layer,
                false,
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
        if (format !== WebGL2RenderingContext.RGBA || type !== WebGL2RenderingContext.UNSIGNED_BYTE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (pixels === null) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const readFramebuffer = this.hydGlobalState.commonState.readFramebufferBinding;
        if (this.framebufferStatus(readFramebuffer) !== WebGL2RenderingContext.FRAMEBUFFER_COMPLETE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_FRAMEBUFFER_OPERATION);
            return;
        }
        if (this.canvasSizeDirty) this.updateCanvasSize();
        const layout = packedPixelLayout(width, height, 4, this.hydGlobalState.miscState.packAlignment);
        let destination: Uint8Array | null = null;
        let destinationOffset = 0;

        if (typeof pixels === "number") {
            const buffer = this.hydGlobalState.commonState.pixelPackBufferBinding;
            if (!buffer) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            destinationOffset = pixels;
            if (destinationOffset < 0 || destinationOffset + layout.requiredBytes > buffer.shadowData.byteLength) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            destination = buffer.shadowData;
        } else if (pixels && "byteLength" in pixels) {
            const bytesPerElement = (pixels as any).BYTES_PER_ELEMENT;
            if (bytesPerElement !== 1) {
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
            this.hydGlobalState.recordTransition("readPixels", x, y, width, height, format, type);
            return;
        }

        const readsDefaultFramebuffer = readFramebuffer === this.hydGlobalState.defaultFramebuffer;
        const attachment = readsDefaultFramebuffer ? null : this.getReadColorAttachment();
        if (!readsDefaultFramebuffer && !attachment) {
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
            this.hydGlobalState.recordTransition("readPixels", x, y, width, height, format, type);
            return;
        }

        this._der_flush();
        const tightPixels = new Uint8Array(clippedWidth * clippedHeight * 4);
        const read = readsDefaultFramebuffer
            ? this.readDefaultFramebufferSynchronously(
                sourceX0, sourceY0, clippedWidth, clippedHeight, tightPixels, 0)
            : this.readColorAttachmentSynchronously(
                attachment, sourceX0, sourceY0, clippedWidth, clippedHeight, tightPixels, 0);
        if (!read) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const destinationColumnOffset = (sourceX0 - x) * 4;
        const destinationFirstRow = sourceY0 - y;
        const tightRowBytes = clippedWidth * 4;
        for (let row = 0; row < clippedHeight; row++) {
            const sourceOffset = row * tightRowBytes;
            const targetOffset = destinationOffset +
                (destinationFirstRow + row) * layout.rowStride + destinationColumnOffset;
            destination.set(tightPixels.subarray(sourceOffset, sourceOffset + tightRowBytes), targetOffset);
        }
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
        const depthStencilAttachmentCount = [
            WebGL2RenderingContext.DEPTH_ATTACHMENT,
            WebGL2RenderingContext.STENCIL_ATTACHMENT,
            WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT,
        ].filter((point) => framebuffer.attachments.has(point)).length;
        if (depthStencilAttachmentCount > 1) {
            return WebGL2RenderingContext.FRAMEBUFFER_UNSUPPORTED;
        }
        let width: number | null = null;
        let height: number | null = null;
        for (const [attachmentPoint, attachment] of framebuffer.attachments) {
            if (!attachment.attachment.isConfigured || attachment.width <= 0 || attachment.height <= 0) {
                return WebGL2RenderingContext.FRAMEBUFFER_INCOMPLETE_ATTACHMENT;
            }
            if (attachment.isCubeFace && !attachment.attachment.isCubeCompleteAtLevel(attachment.level || 0)) {
                return WebGL2RenderingContext.FRAMEBUFFER_INCOMPLETE_ATTACHMENT;
            }
            const format = attachment.format;
            const colorAttachment = attachmentPoint >= WebGL2RenderingContext.COLOR_ATTACHMENT0 &&
                attachmentPoint <= WebGL2RenderingContext.COLOR_ATTACHMENT15;
            if ((attachmentPoint === WebGL2RenderingContext.DEPTH_ATTACHMENT &&
                    (!format.includes("depth") || format.includes("stencil"))) ||
                (attachmentPoint === WebGL2RenderingContext.STENCIL_ATTACHMENT &&
                    (!format.includes("stencil") || format.includes("depth"))) ||
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
        }
        for (const drawBuffer of framebuffer.drawBuffers) {
            if (drawBuffer >= WebGL2RenderingContext.COLOR_ATTACHMENT0 &&
                drawBuffer <= WebGL2RenderingContext.COLOR_ATTACHMENT15 &&
                !framebuffer.attachments.has(drawBuffer)) {
                return WebGL2RenderingContext.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT;
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
            if (!buffer || buffer.deleted) {
                valid = false;
                break;
            }
            if (!activeLocations.has(location)) continue;
            const componentBytes = vertexComponentByteSize(attribute.type);
            const elementBytes = componentBytes * attribute.size;
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
            (instancedApi && !limits.hasActivePerVertexAttribute)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return false;
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
            const samplerCount = useSamplerOriginVariants ? program.hydSampler2D.length : program.hydSamplers.length;
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

    private validateFramebufferAndStencilForDraw(): boolean {
        const framebuffer = this.hydGlobalState.commonState.drawFramebufferBinding;
        if (this.framebufferStatus(framebuffer) !== WebGL2RenderingContext.FRAMEBUFFER_COMPLETE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_FRAMEBUFFER_OPERATION);
            return false;
        }
        if (this.currentProgramValid && framebuffer !== this.hydGlobalState.defaultFramebuffer) {
            const attachedTextures = new Set(
                Array.from(framebuffer.attachments.values(), (attachment) => attachment.attachment),
            );
            const feedbackLoop = this.hydGlobalState.commonState.currentProgram.hydSamplers.some((sampler) => {
                const texture = this.hydGlobalState.getTextureUnitBinding(sampler.textureUnit, sampler.viewDimension);
                return texture !== null &&
                    texture.isSamplingComplete(sampler.viewDimension, this.hydContextType === "webgl2" ? 2 : 1) &&
                    attachedTextures.has(texture);
            });
            if (feedbackLoop) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return false;
            }
        }
        if (!this.hydGlobalState.stencilState.enabled) return true;
        const hasStencil = framebuffer === this.hydGlobalState.defaultFramebuffer
            ? this.hydGlobalState.contextAttributes.stencil === true
            : Array.from(framebuffer.attachments.entries()).some(([point, attachment]) =>
                (point === WebGL2RenderingContext.STENCIL_ATTACHMENT ||
                    point === WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT) &&
                attachment.format.includes("stencil"));
        if (!hasStencil) return true;

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
        return true;
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

    drawArrays(mode: GLenum, first: GLint, count: GLsizei) {
        if (!this.validateFramebufferAndStencilForDraw()) return;
        if (this.shouldCullAllTriangles(mode)) {
            this.drawArraysInternal(mode, first, count, 1, false, true);
            return;
        }
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
        if (this.shouldCullAllTriangles(mode)) {
            this.drawArraysInternal(mode, first, count, instanceCount, true, true);
            return;
        }
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
        if (cullAll) return;
        if (!this.currentDrawTargetHasSize()) return;
        this.setPrimitiveState(topology);
        this.setPBV();
        let indexBuffer: GPUBuffer | undefined;
        let indexCount: number | undefined;
        if (mode === WebGL2RenderingContext.TRIANGLE_FAN) {
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
        if (this.shouldCullAllTriangles(mode)) {
            this.drawElementsInternal(mode, count, type, offset, 1, false, true);
            return;
        }
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

    drawElementsInstanced(mode: GLenum, count: GLsizei, type: GLenum, offset: GLintptr, instanceCount: GLsizei) {
        if (!this.validateFramebufferAndStencilForDraw()) return;
        if (this.shouldCullAllTriangles(mode)) {
            this.drawElementsInternal(mode, count, type, offset, instanceCount, true, true);
            return;
        }
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
        if (count === 0 || instanceCount === 0) return;
        if (!elementArrayBuffer.buffer || offset + count * indexSize > elementArrayBuffer.webglSize) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const maxIndex = elementArrayBuffer.maxIndex(type, offset, count);
        if (!this.validateDrawVertexState(maxIndex, instanceCount, instancedApi)) return;
        if (cullAll) return;
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
        if (mode === WebGL2RenderingContext.TRIANGLE_FAN || mode === WebGL2RenderingContext.LINE_LOOP) {
            const expanded = elementArrayBuffer.getExpandedIndexBuffer(mode, type, offset, count);
            indexBuffer = expanded.buffer;
            indexFormat = expanded.format;
            drawIndexCount = expanded.indexCount;
            firstIndex = 0;
        }
        this.setPrimitiveState(topology, indexFormat);
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
