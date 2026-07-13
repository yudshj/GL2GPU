import { HydHashable } from "./base/hydHashable";
import { enumToCompareFunction } from "./hydConstants";
import type { HydPixelUnpackState } from "./hydGlobalState";
import { HydSamplerCompletenessState, resolveWebGpuSamplerLodClamps } from "./hydSampler";
import { resolveSamplerCoordinateScale } from "./shaderSamplerState";
import TypedArray = NodeJS.TypedArray;

const GL_SRGB_EXT = 0x8C40;
const GL_SRGB_ALPHA_EXT = 0x8C42;

const NATIVE_CANVAS_GET_CONTEXT = typeof HTMLCanvasElement === "undefined"
    ? null
    : HTMLCanvasElement.prototype.getContext;

interface ExternalPixelConverter {
    canvas: HTMLCanvasElement;
    gl: WebGLRenderingContext;
    texture: WebGLTexture;
    program: WebGLProgram;
    position: GLint;
    uvScale: WebGLUniformLocation;
    uvOffset: WebGLUniformLocation;
    vertexBuffer: WebGLBuffer;
}

let externalPixelConverter: ExternalPixelConverter | null | undefined;

function createExternalPixelConverter(): ExternalPixelConverter | null {
    if (!NATIVE_CANVAS_GET_CONTEXT || typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    const gl = (NATIVE_CANVAS_GET_CONTEXT.call(canvas, "webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
    }) || NATIVE_CANVAS_GET_CONTEXT.call(canvas, "experimental-webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
    })) as WebGLRenderingContext | null;
    if (!gl) return null;

    const compile = (type: GLenum, source: string): WebGLShader | null => {
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, `
attribute vec2 a_position;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
varying vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = (a_position * 0.5 + 0.5) * u_uvScale + u_uvOffset;
}`);
    const fragment = compile(gl.FRAGMENT_SHADER, `
precision mediump float;
uniform sampler2D u_texture;
varying vec2 v_texCoord;
void main() {
  gl_FragColor = texture2D(u_texture, v_texCoord);
}`);
    if (!vertex || !fragment) return null;
    const program = gl.createProgram();
    if (!program) return null;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;

    const texture = gl.createTexture();
    const vertexBuffer = gl.createBuffer();
    const position = gl.getAttribLocation(program, "a_position");
    const uvScale = gl.getUniformLocation(program, "u_uvScale");
    const uvOffset = gl.getUniformLocation(program, "u_uvOffset");
    if (!texture || !vertexBuffer || position < 0 || !uvScale || !uvOffset) return null;
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    gl.useProgram(program);
    gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return { canvas, gl, texture, program, position, uvScale, uvOffset, vertexBuffer };
}

function externalTextureSourceExtent(source: any): { width: number, height: number } | null {
    const width = Number(
        source?.videoWidth || source?.naturalWidth || source?.displayWidth ||
        source?.codedWidth || source?.width,
    );
    const height = Number(
        source?.videoHeight || source?.naturalHeight || source?.displayHeight ||
        source?.codedHeight || source?.height,
    );
    return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
        ? { width, height }
        : null;
}

export function externalVideoFrameDisplayExtent(frame: {
    displayWidth?: number;
    displayHeight?: number;
    visibleRect?: { width?: number; height?: number } | null;
    codedWidth?: number;
    codedHeight?: number;
}): { width: number, height: number } | null {
    // visibleRect is expressed in coded-image coordinates and therefore does
    // not include rotation metadata. Prefer it for unrotated video because it
    // also excludes coded/container padding, but use display dimensions when
    // the frame metadata rotates the visible rectangle by 90 degrees.
    const displayWidth = Number(frame?.displayWidth);
    const displayHeight = Number(frame?.displayHeight);
    const visibleWidth = Number(frame?.visibleRect?.width);
    const visibleHeight = Number(frame?.visibleRect?.height);
    const rotated = Number.isFinite(displayWidth) && Number.isFinite(displayHeight) &&
        Number.isFinite(visibleWidth) && Number.isFinite(visibleHeight) &&
        visibleWidth > 0 && visibleHeight > 0 &&
        Math.abs(displayWidth / displayHeight - visibleHeight / visibleWidth) < 1e-6 &&
        Math.abs(displayWidth / displayHeight - visibleWidth / visibleHeight) > 1e-6;
    const width = Number(rotated ? displayWidth : visibleWidth || displayWidth || frame?.codedWidth);
    const height = Number(rotated ? displayHeight : visibleHeight || displayHeight || frame?.codedHeight);
    return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
        ? { width, height }
        : null;
}

export function externalSourceUvTransform(
    sourceWidth: number,
    sourceHeight: number,
    uploadWidth: number,
    uploadHeight: number,
    skipPixels: number = 0,
    skipRows: number = 0,
): { scaleX: number, scaleY: number, offsetX: number, offsetY: number } {
    return {
        scaleX: uploadWidth / sourceWidth,
        scaleY: uploadHeight / sourceHeight,
        offsetX: skipPixels / sourceWidth,
        offsetY: skipRows / sourceHeight,
    };
}

function convertExternalTextureSource(
    source: any,
    width: number,
    height: number,
    format: GLenum,
    type: GLenum,
    unpack: HydPixelUnpackState,
): Uint8Array | null {
    if (width <= 0 || height <= 0) return new Uint8Array(0);
    if (externalPixelConverter?.gl.isContextLost()) {
        externalPixelConverter = undefined;
    }
    if (externalPixelConverter === undefined) {
        externalPixelConverter = createExternalPixelConverter();
    }
    const converter = externalPixelConverter;
    if (!converter) return null;
    const { canvas, gl, texture, program, position, uvScale, uvOffset, vertexBuffer } = converter;
    try {
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        gl.viewport(0, 0, width, height);
        gl.useProgram(program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, unpack.alignment);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, unpack.flipY);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, unpack.premultiplyAlpha);
        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, unpack.colorspaceConversion);
        if ("unpackColorSpace" in gl) {
            (gl as any).unpackColorSpace = unpack.unpackColorSpace;
        }
        const conversionFormat = format === GL_SRGB_EXT
            ? gl.RGB
            : format === GL_SRGB_ALPHA_EXT
                ? gl.RGBA
                : format;
        for (let pending = gl.getError(), attempts = 0;
            pending !== gl.NO_ERROR && pending !== gl.CONTEXT_LOST_WEBGL && attempts < 8;
            pending = gl.getError(), attempts++) {
            // Drain errors from a prior conversion before checking this upload.
        }
        (gl.texImage2D as any)(gl.TEXTURE_2D, 0, conversionFormat, conversionFormat, type, source);
        if (gl.getError() !== gl.NO_ERROR) return null;
        const sourceExtent = externalTextureSourceExtent(source);
        if (!sourceExtent) return null;
        const uv = externalSourceUvTransform(
            sourceExtent.width,
            sourceExtent.height,
            width,
            height,
            unpack.skipPixels || 0,
            unpack.skipRows || 0,
        );
        gl.uniform2f(uvScale, uv.scaleX, uv.scaleY);
        gl.uniform2f(uvOffset, uv.offsetX, uv.offsetY);
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        const pixels = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        const error = gl.getError();
        if ((globalThis as any).__HYD_DEBUG_TEXTURE_UPLOAD) {
            const sample = (u: number, v: number) => {
                const x = Math.min(width - 1, Math.max(0, Math.floor(width * u)));
                const y = Math.min(height - 1, Math.max(0, Math.floor(height * v)));
                const offset = (y * width + x) * 4;
                return Array.from(pixels.subarray(offset, offset + 4));
            };
            console.debug("[HYD] external upload conversion", JSON.stringify({
                source: source?.constructor?.name || typeof source,
                width,
                height,
                flipY: unpack.flipY,
                error,
                q25: sample(0.75, 0.25),
                q75: sample(0.75, 0.75),
            }));
        }
        return error === gl.NO_ERROR ? pixels : null;
    } catch (error) {
        if ((error as any)?.name === "SecurityError") throw error;
        return null;
    }
}

function isExternalTextureSource(data: any): boolean {
    return (typeof HTMLImageElement !== "undefined" && data instanceof HTMLImageElement) ||
        (typeof ImageBitmap !== "undefined" && data instanceof ImageBitmap) ||
        (typeof ImageData !== "undefined" && data instanceof ImageData) ||
        (typeof HTMLCanvasElement !== "undefined" && data instanceof HTMLCanvasElement) ||
        (typeof HTMLVideoElement !== "undefined" && data instanceof HTMLVideoElement) ||
        (typeof OffscreenCanvas !== "undefined" && data instanceof OffscreenCanvas) ||
        (typeof VideoFrame !== "undefined" && data instanceof VideoFrame);
}

function packedImageDataSource(data: ImageData, format: GLenum, type: GLenum): TypedArray | null {
    if (type !== WebGL2RenderingContext.UNSIGNED_BYTE) return null;
    const source = data.data;
    if (format === WebGL2RenderingContext.RGBA) return source;
    const channels = format === WebGL2RenderingContext.RGB ? 3 :
        format === WebGL2RenderingContext.RG ? 2 :
            format === WebGL2RenderingContext.RED || format === WebGL2RenderingContext.ALPHA ||
                format === WebGL2RenderingContext.LUMINANCE ? 1 :
                format === WebGL2RenderingContext.LUMINANCE_ALPHA ? 2 : 0;
    if (channels === 0) return null;
    const output = new Uint8Array(data.width * data.height * channels);
    for (let pixel = 0; pixel < data.width * data.height; pixel++) {
        const sourceOffset = pixel * 4;
        const destinationOffset = pixel * channels;
        if (format === WebGL2RenderingContext.ALPHA) {
            output[destinationOffset] = source[sourceOffset + 3];
        } else if (format === WebGL2RenderingContext.LUMINANCE) {
            output[destinationOffset] = source[sourceOffset];
        } else if (format === WebGL2RenderingContext.LUMINANCE_ALPHA) {
            output[destinationOffset] = source[sourceOffset];
            output[destinationOffset + 1] = source[sourceOffset + 3];
        } else {
            for (let channel = 0; channel < channels; channel++) {
                output[destinationOffset + channel] = source[sourceOffset + channel];
            }
        }
    }
    return output;
}

interface HydTextureState {
    minFilter: GPUFilterMode;
    mipmapFilter: GPUFilterMode;
    mipmapped: boolean;
    magFilter: GPUFilterMode;
    wrapS: GPUAddressMode;
    wrapT: GPUAddressMode;
    wrapR: GPUAddressMode;
    compare?: GPUCompareFunction;  // TODO: 这个Compare应该只是作为destination的时候的compare？例如depth stencil。
    maxAnisotropy: number;
}

interface HydTextureDescriptor {
    size: GPUExtent3DDict,
    mipLevelCount?: number,
    sampleCount?: number,
    format: GPUTextureFormat,
    dimension: GPUTextureDimension,
    usage: GPUTextureUsageFlags,
    isDepthStencil: boolean,
    // sampleType: GPUTextureSampleType,
    // viewDimension: GPUTextureViewDimension,
}

export type HydTextureSourceOrigin = "uninitialized" | "typed-upload" | "external-upload" | "render-target" | "copy";

export interface HydTextureImageState {
    level: number;
    layer: number;
    width: number;
    height: number;
    depth: number;
    internalFormat: GLenum;
    format: GLenum;
    type: GLenum;
    effectiveColorBits?: [number, number, number, number];
    sourceOrigin: HydTextureSourceOrigin;
    generation: number;
}

export type HydTextureSamplingClass = "float" | "sint" | "uint" | "depth";

export function isWebGlTextureSamplingFilterable(
    samplingClass: HydTextureSamplingClass | null,
    requiresUnfilterableFloatSampling: boolean,
    comparisonEnabled: boolean = false,
): boolean {
    return (samplingClass === "float" && !requiresUnfilterableFloatSampling) ||
        (samplingClass === "depth" && comparisonEnabled);
}

export interface HydTextureMipRange {
    baseLevel: number;
    maxLevel: number;
    q: number;
    sampledLastLevel: number;
    mipmapComplete: boolean;
    complete: boolean;
}

export function resolveWebGlTextureMipRange(
    rawBaseLevel: number,
    rawMaxLevel: number,
    immutableLevels: number,
    width: number,
    height: number,
    depth: number,
    mipmapped: boolean,
    includeDepth: boolean,
): Omit<HydTextureMipRange, "mipmapComplete" | "complete"> {
    const immutableLastLevel = Math.max(0, immutableLevels - 1);
    const baseLevel = immutableLevels > 0
        ? Math.min(rawBaseLevel, immutableLastLevel)
        : rawBaseLevel;
    const maxLevel = immutableLevels > 0
        ? Math.min(Math.max(baseLevel, rawMaxLevel), immutableLastLevel)
        : rawMaxLevel;
    const largestDimension = Math.max(1, width, height, includeDepth ? depth : 1);
    const p = baseLevel + Math.floor(Math.log2(largestDimension));
    const q = Math.min(p, maxLevel);
    return {
        baseLevel,
        maxLevel,
        q,
        sampledLastLevel: mipmapped ? q : baseLevel,
    };
}

export function resolveMutableTextureBaseDimension(
    currentBaseSize: number,
    levelSize: number,
    mipLevel: number,
    reuseCurrentStorage: boolean,
    shrinksWithMip: boolean = true,
    currentMipLevelCount: number = Math.floor(Math.log2(Math.max(1, currentBaseSize))) + 1,
): number {
    const levelScale = shrinksWithMip ? 2 ** mipLevel : 1;
    const inferredBaseSize = Math.max(1, levelSize * levelScale);
    if (!reuseCurrentStorage || currentBaseSize <= 0) return inferredBaseSize;
    const currentLevelSize = shrinksWithMip
        ? Math.max(1, currentBaseSize >> mipLevel)
        : currentBaseSize;
    // A rectangular texture's short dimension can reach one before its last
    // legal mip. Preserve that dimension when the backing already has the
    // requested level; otherwise enlarge the base so WebGPU can represent it.
    if (mipLevel < currentMipLevelCount && levelSize <= currentLevelSize) {
        return currentBaseSize;
    }
    return Math.max(currentBaseSize, inferredBaseSize);
}

const DEFAULT_PIXEL_UNPACK_STATE: HydPixelUnpackState = {
    flipY: false,
    alignment: 4,
    rowLength: 0,
    imageHeight: 0,
    skipPixels: 0,
    skipRows: 0,
    skipImages: 0,
    premultiplyAlpha: false,
    colorspaceConversion: WebGL2RenderingContext.BROWSER_DEFAULT_WEBGL,
    unpackColorSpace: "srgb",
};

export interface PreparedTextureUpload {
    data: Uint8Array | TypedArray;
    bytesPerRow: number;
    internalformat: GLenum;
    format: GLenum;
    type: GLenum;
}

// The order of the array layers is [+X, -X, +Y, -Y, +Z, -Z]
const targetToOrigin: Map<GLenum, GPUOrigin3DDict> = new Map([
    [WebGL2RenderingContext.TEXTURE_2D, { x: 0, y: 0, z: 0 }],
    [WebGL2RenderingContext.TEXTURE_3D, { x: 0, y: 0, z: 0 }],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP, { x: 0, y: 0, z: 0 }],
    [WebGL2RenderingContext.TEXTURE_2D_ARRAY, { x: 0, y: 0, z: 0 }],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X, { x: 0, y: 0, z: 0 }],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_X, { x: 0, y: 0, z: 1 }],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Y, { x: 0, y: 0, z: 2 }],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Y, { x: 0, y: 0, z: 3 }],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Z, { x: 0, y: 0, z: 4 }],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z, { x: 0, y: 0, z: 5 }],
]);

const targetViewDimensionMap: Map<GLenum, GPUTextureViewDimension> = new Map([
    [WebGL2RenderingContext.TEXTURE_2D, "2d"],
    [WebGL2RenderingContext.TEXTURE_3D, "3d"],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP, "cube"],
    [WebGL2RenderingContext.TEXTURE_2D_ARRAY, "2d-array"],
    // [WebGL2RenderingContext.TEXTURE_CUBE_MAP, "cube-array"],
]);

const CUBE_FACE_TARGETS: readonly GLenum[] = [
    WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X,
    WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_X,
    WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Y,
    WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Y,
    WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Z,
    WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z,
];

export function isWebGlColorRenderableInternalFormat(internalFormat: GLenum): boolean {
    switch (internalFormat) {
        case GL_SRGB_ALPHA_EXT:
        case WebGL2RenderingContext.RGB:
        case WebGL2RenderingContext.RGBA:
        case WebGL2RenderingContext.RGB565:
        case WebGL2RenderingContext.RGBA4:
        case WebGL2RenderingContext.RGB5_A1:
        case WebGL2RenderingContext.R8:
        case WebGL2RenderingContext.RG8:
        case WebGL2RenderingContext.RGB8:
        case WebGL2RenderingContext.RGBA8:
        case WebGL2RenderingContext.SRGB8_ALPHA8:
        case WebGL2RenderingContext.R8UI:
        case WebGL2RenderingContext.R8I:
        case WebGL2RenderingContext.R16UI:
        case WebGL2RenderingContext.R16I:
        case WebGL2RenderingContext.R32UI:
        case WebGL2RenderingContext.R32I:
        case WebGL2RenderingContext.RG8UI:
        case WebGL2RenderingContext.RG8I:
        case WebGL2RenderingContext.RG16UI:
        case WebGL2RenderingContext.RG16I:
        case WebGL2RenderingContext.RG32UI:
        case WebGL2RenderingContext.RG32I:
        case WebGL2RenderingContext.RGBA8UI:
        case WebGL2RenderingContext.RGBA8I:
        case WebGL2RenderingContext.RGBA16UI:
        case WebGL2RenderingContext.RGBA16I:
        case WebGL2RenderingContext.RGBA32UI:
        case WebGL2RenderingContext.RGBA32I:
        case WebGL2RenderingContext.RGB10_A2UI:
        case WebGL2RenderingContext.RGB10_A2:
            return true;
        default:
            return false;
    }
}

const parameterToString: Map<GLenum, GPUAddressMode | GPUFilterMode> = new Map([
    [WebGL2RenderingContext.LINEAR, "linear"],
    [WebGL2RenderingContext.NEAREST, "nearest"],
    [WebGL2RenderingContext.REPEAT, "repeat"],
    [WebGL2RenderingContext.CLAMP_TO_EDGE, "clamp-to-edge"],
    [WebGL2RenderingContext.MIRRORED_REPEAT, "mirror-repeat"],
    [WebGL2RenderingContext.LINEAR_MIPMAP_LINEAR, "linear"],
    [WebGL2RenderingContext.LINEAR_MIPMAP_NEAREST, "linear"],
    [WebGL2RenderingContext.NEAREST_MIPMAP_LINEAR, "nearest"],
    [WebGL2RenderingContext.NEAREST_MIPMAP_NEAREST, "nearest"],
]);

const pnameToString: Map<GLenum, string> = new Map([
    [WebGL2RenderingContext.TEXTURE_MIN_FILTER, "minFilter"],
    [WebGL2RenderingContext.TEXTURE_MAG_FILTER, "magFilter"],
    [WebGL2RenderingContext.TEXTURE_WRAP_S, "wrapS"],
    [WebGL2RenderingContext.TEXTURE_WRAP_T, "wrapT"],
    [WebGL2RenderingContext.TEXTURE_WRAP_R, "wrapR"],
]);

function textureFormatLookup(internalFormat: GLenum, format: GLenum, type: GLenum): GPUTextureFormat {
    if (((internalFormat === GL_SRGB_EXT && format === GL_SRGB_EXT) ||
        (internalFormat === GL_SRGB_ALPHA_EXT && format === GL_SRGB_ALPHA_EXT) ||
        (internalFormat === WebGL2RenderingContext.SRGB8 && format === WebGL2RenderingContext.RGB) ||
        (internalFormat === WebGL2RenderingContext.SRGB8_ALPHA8 && format === WebGL2RenderingContext.RGBA)) &&
        type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "rgba8unorm-srgb";
    }
    if ((internalFormat === WebGL2RenderingContext.RGBA || internalFormat === WebGL2RenderingContext.RGBA8) && format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "rgba8unorm";
    }
    if (internalFormat === WebGL2RenderingContext.R8 && format === WebGL2RenderingContext.RED && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "r8unorm";
    }
    if (internalFormat === WebGL2RenderingContext.R8UI && format === WebGL2RenderingContext.RED_INTEGER && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "r8uint";
    }
    if (internalFormat === WebGL2RenderingContext.R8I && format === WebGL2RenderingContext.RED_INTEGER && type === WebGL2RenderingContext.BYTE) {
        return "r8sint";
    }
    if (internalFormat === WebGL2RenderingContext.R16UI && format === WebGL2RenderingContext.RED_INTEGER && type === WebGL2RenderingContext.UNSIGNED_SHORT) {
        return "r16uint";
    }
    if (internalFormat === WebGL2RenderingContext.R16I && format === WebGL2RenderingContext.RED_INTEGER && type === WebGL2RenderingContext.SHORT) {
        return "r16sint";
    }
    if (internalFormat === WebGL2RenderingContext.R32I && format === WebGL2RenderingContext.RED_INTEGER && type === WebGL2RenderingContext.INT) {
        return "r32sint";
    }
    if (internalFormat === WebGL2RenderingContext.RG8 && format === WebGL2RenderingContext.RG && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "rg8unorm";
    }
    if (internalFormat === WebGL2RenderingContext.RG8UI && format === WebGL2RenderingContext.RG_INTEGER && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "rg8uint";
    }
    if (internalFormat === WebGL2RenderingContext.RG8I && format === WebGL2RenderingContext.RG_INTEGER && type === WebGL2RenderingContext.BYTE) {
        return "rg8sint";
    }
    if (internalFormat === WebGL2RenderingContext.RG16UI && format === WebGL2RenderingContext.RG_INTEGER && type === WebGL2RenderingContext.UNSIGNED_SHORT) {
        return "rg16uint";
    }
    if (internalFormat === WebGL2RenderingContext.RG16I && format === WebGL2RenderingContext.RG_INTEGER && type === WebGL2RenderingContext.SHORT) {
        return "rg16sint";
    }
    if (internalFormat === WebGL2RenderingContext.RG32I && format === WebGL2RenderingContext.RG_INTEGER && type === WebGL2RenderingContext.INT) {
        return "rg32sint";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA8UI && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "rgba8uint";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA8I && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.BYTE) {
        return "rgba8sint";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA16UI && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.UNSIGNED_SHORT) {
        return "rgba16uint";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA16I && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.SHORT) {
        return "rgba16sint";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA32UI && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT) {
        return "rgba32uint";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA32I && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.INT) {
        return "rgba32sint";
    }
    if (internalFormat === WebGL2RenderingContext.RGB8UI && format === WebGL2RenderingContext.RGB_INTEGER && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "rgba8uint";
    }
    if (internalFormat === WebGL2RenderingContext.RGB8I && format === WebGL2RenderingContext.RGB_INTEGER && type === WebGL2RenderingContext.BYTE) {
        return "rgba8sint";
    }
    if (internalFormat === WebGL2RenderingContext.RGB16UI && format === WebGL2RenderingContext.RGB_INTEGER && type === WebGL2RenderingContext.UNSIGNED_SHORT) {
        return "rgba16uint";
    }
    if (internalFormat === WebGL2RenderingContext.RGB16I && format === WebGL2RenderingContext.RGB_INTEGER && type === WebGL2RenderingContext.SHORT) {
        return "rgba16sint";
    }
    if (internalFormat === WebGL2RenderingContext.RGB32UI && format === WebGL2RenderingContext.RGB_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT) {
        return "rgba32uint";
    }
    if (internalFormat === WebGL2RenderingContext.RGB32I && format === WebGL2RenderingContext.RGB_INTEGER && type === WebGL2RenderingContext.INT) {
        return "rgba32sint";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA32F && format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.FLOAT) {
        return "rgba32float";
    }
    if (internalFormat === WebGL2RenderingContext.RGB32F && format === WebGL2RenderingContext.RGB && type === WebGL2RenderingContext.FLOAT) {
        return "rgba32float";
    }
    if (internalFormat === WebGL2RenderingContext.RG32UI && format === WebGL2RenderingContext.RG_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT) {
        return "rg32uint";
    }
    if (internalFormat === WebGL2RenderingContext.R32UI && format === WebGL2RenderingContext.RED_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT) {
        return "r32uint";
    }
    if (internalFormat === WebGL2RenderingContext.RGB10_A2UI && format === WebGL2RenderingContext.RGBA_INTEGER &&
        type === WebGL2RenderingContext.UNSIGNED_INT_2_10_10_10_REV) {
        return "rgb10a2uint";
    }
    if (internalFormat === WebGL2RenderingContext.RGB10_A2 && format === WebGL2RenderingContext.RGBA &&
        type === WebGL2RenderingContext.UNSIGNED_INT_2_10_10_10_REV) {
        return "rgb10a2unorm";
    }
    if (internalFormat === WebGL2RenderingContext.RG32F && format === WebGL2RenderingContext.RG && type === WebGL2RenderingContext.FLOAT) {
        return "rg32float";
    }
    if (internalFormat === WebGL2RenderingContext.R32F && format === WebGL2RenderingContext.RED && type === WebGL2RenderingContext.FLOAT) {
        return "r32float";
    }
    if (internalFormat === WebGL2RenderingContext.R16F && format === WebGL2RenderingContext.RED &&
        (type === WebGL2RenderingContext.HALF_FLOAT || type === WebGL2RenderingContext.FLOAT)) {
        return "r16float";
    }
    if (internalFormat === WebGL2RenderingContext.RG16F && format === WebGL2RenderingContext.RG &&
        (type === WebGL2RenderingContext.HALF_FLOAT || type === WebGL2RenderingContext.FLOAT)) {
        return "rg16float";
    }
    if (internalFormat === WebGL2RenderingContext.RGB16F && format === WebGL2RenderingContext.RGB &&
        (type === WebGL2RenderingContext.HALF_FLOAT || type === WebGL2RenderingContext.FLOAT)) {
        return "rgba16float";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA16F && format === WebGL2RenderingContext.RGBA &&
        (type === WebGL2RenderingContext.HALF_FLOAT || type === WebGL2RenderingContext.FLOAT)) {
        return "rgba16float";
    }
    if (internalFormat === WebGL2RenderingContext.R11F_G11F_B10F &&
        format === WebGL2RenderingContext.RGB &&
        (type === WebGL2RenderingContext.FLOAT ||
            type === WebGL2RenderingContext.HALF_FLOAT ||
            type === WebGL2RenderingContext.UNSIGNED_INT_10F_11F_11F_REV)) {
        return "rg11b10ufloat";
    }
    if (internalFormat === WebGL2RenderingContext.RGB9_E5 && format === WebGL2RenderingContext.RGB &&
        (type === WebGL2RenderingContext.FLOAT || type === WebGL2RenderingContext.HALF_FLOAT ||
            type === WebGL2RenderingContext.UNSIGNED_INT_5_9_9_9_REV)) {
        return "rgb9e5ufloat";
    }
    if (internalFormat === WebGL2RenderingContext.R8_SNORM && format === WebGL2RenderingContext.RED && type === WebGL2RenderingContext.BYTE) {
        return "r8snorm";
    }
    if (internalFormat === WebGL2RenderingContext.RG8_SNORM && format === WebGL2RenderingContext.RG && type === WebGL2RenderingContext.BYTE) {
        return "rg8snorm";
    }
    if (internalFormat === WebGL2RenderingContext.RGB8_SNORM && format === WebGL2RenderingContext.RGB && type === WebGL2RenderingContext.BYTE) {
        return "rgba8snorm";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA8_SNORM && format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.BYTE) {
        return "rgba8snorm";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA && format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.FLOAT) {
        return "rgba32float";
    }
    if (internalFormat === WebGL2RenderingContext.LUMINANCE && format === WebGL2RenderingContext.LUMINANCE && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "rgba8unorm";
    }
    if (internalFormat === WebGL2RenderingContext.DEPTH_COMPONENT32F && format === WebGL2RenderingContext.DEPTH_COMPONENT && type === WebGL2RenderingContext.FLOAT) {
        return "depth32float";
    }
    if (internalFormat === WebGL2RenderingContext.DEPTH24_STENCIL8 &&
        format === WebGL2RenderingContext.DEPTH_STENCIL &&
        type === WebGL2RenderingContext.UNSIGNED_INT_24_8) {
        return "depth24plus-stencil8";
    }
    if (internalFormat === WebGL2RenderingContext.DEPTH32F_STENCIL8 &&
        format === WebGL2RenderingContext.DEPTH_STENCIL &&
        type === WebGL2RenderingContext.FLOAT_32_UNSIGNED_INT_24_8_REV) {
        return "depth32float-stencil8";
    }
    if ((internalFormat === WebGL2RenderingContext.DEPTH_COMPONENT ||
        internalFormat === WebGL2RenderingContext.DEPTH_COMPONENT16 ||
        internalFormat === WebGL2RenderingContext.DEPTH_COMPONENT24) &&
        format === WebGL2RenderingContext.DEPTH_COMPONENT &&
        (type === WebGL2RenderingContext.UNSIGNED_INT || type === WebGL2RenderingContext.UNSIGNED_SHORT)) {
        return "depth24plus";
    }
    if (internalFormat === WebGL2RenderingContext.RGB && format === WebGL2RenderingContext.RGB && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "rgba8unorm";
    }
    if (internalFormat === WebGL2RenderingContext.RGB8 && format === WebGL2RenderingContext.RGB && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "rgba8unorm";
    }
    if (internalFormat === WebGL2RenderingContext.RGB565 && format === WebGL2RenderingContext.RGB &&
        (type === WebGL2RenderingContext.UNSIGNED_BYTE || type === WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5)) {
        return "rgba8unorm";
    }
    if (internalFormat === WebGL2RenderingContext.RGB && format === WebGL2RenderingContext.RGB &&
        type === WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5) {
        return "rgba8unorm";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA && format === WebGL2RenderingContext.RGBA &&
        (type === WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4 ||
            type === WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1)) {
        return "rgba8unorm";
    }
    if (internalFormat === WebGL2RenderingContext.RGB5_A1 && format === WebGL2RenderingContext.RGBA &&
        (type === WebGL2RenderingContext.UNSIGNED_BYTE ||
            type === WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1 ||
            type === WebGL2RenderingContext.UNSIGNED_INT_2_10_10_10_REV)) {
        return "rgba8unorm";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA4 && format === WebGL2RenderingContext.RGBA &&
        (type === WebGL2RenderingContext.UNSIGNED_BYTE || type === WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4)) {
        return "rgba8unorm";
    }
    if ((internalFormat === WebGL2RenderingContext.ALPHA && format === WebGL2RenderingContext.ALPHA && type === WebGL2RenderingContext.UNSIGNED_BYTE) ||
        (internalFormat === WebGL2RenderingContext.LUMINANCE_ALPHA && format === WebGL2RenderingContext.LUMINANCE_ALPHA && type === WebGL2RenderingContext.UNSIGNED_BYTE)) {
        return "rgba8unorm";
    }
    throw new Error(`Unsupported texture format: ${internalFormat}, ${format}, ${type}`);
}

function textureUsageForFormat(format: GPUTextureFormat): GPUTextureUsageFlags {
    const compressed = /^(?:etc2|eac|bc|astc)-/.test(format);
    const texturableOnly = compressed || format === "rgb9e5ufloat" || format.endsWith("snorm");
    return GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING |
        (texturableOnly ? 0 : GPUTextureUsage.RENDER_ATTACHMENT);
}

function alignTo(value: number, alignment: number): number {
    return Math.ceil(value / alignment) * alignment;
}

function prepareCompressedWrite(
    data: Uint8Array,
    width: number,
    height: number,
    physicalWidth: number,
    physicalHeight: number,
    depth: number,
    blockBytes: number,
): { data: Uint8Array, bytesPerRow: number, rowsPerImage: number } {
    const sourceBlocksPerRow = Math.ceil(width / 4);
    const sourceBlockRows = Math.ceil(height / 4);
    const physicalBlocksPerRow = Math.ceil(physicalWidth / 4);
    const physicalBlockRows = Math.ceil(physicalHeight / 4);
    const bytesPerRow = physicalBlocksPerRow * blockBytes;
    if (sourceBlocksPerRow === physicalBlocksPerRow && sourceBlockRows === physicalBlockRows) {
        return { data, bytesPerRow, rowsPerImage: physicalBlockRows };
    }
    const padded = new Uint8Array(bytesPerRow * physicalBlockRows * depth);
    const sourceBytesPerRow = sourceBlocksPerRow * blockBytes;
    const sourceBytesPerImage = sourceBytesPerRow * sourceBlockRows;
    const physicalBytesPerImage = bytesPerRow * physicalBlockRows;
    for (let layer = 0; layer < depth; layer++) {
        for (let row = 0; row < sourceBlockRows; row++) {
            const sourceOffset = layer * sourceBytesPerImage + row * sourceBytesPerRow;
            const destinationOffset = layer * physicalBytesPerImage + row * bytesPerRow;
            padded.set(data.subarray(sourceOffset, sourceOffset + sourceBytesPerRow), destinationOffset);
        }
    }
    return { data: padded, bytesPerRow, rowsPerImage: physicalBlockRows };
}

export interface PackedPixelLayout {
    rowBytes: number;
    rowStride: number;
    dataOffset: number;
    requiredBytes: number;
}

export interface PackedPixelLayout3D extends PackedPixelLayout {
    imageStride: number;
}

export function packedPixelLayout(
    width: number,
    height: number,
    bytesPerPixel: number,
    alignment: number,
    rowLength: number = 0,
    skipPixels: number = 0,
    skipRows: number = 0,
): PackedPixelLayout {
    const rowBytes = width * bytesPerPixel;
    const rowStride = alignTo((rowLength || width) * bytesPerPixel, alignment);
    const dataOffset = skipRows * rowStride + skipPixels * bytesPerPixel;
    return {
        rowBytes,
        rowStride,
        dataOffset,
        requiredBytes: width === 0 || height === 0
            ? 0
            : dataOffset + rowStride * (height - 1) + rowBytes,
    };
}

export function packedPixelLayout3D(
    width: number,
    height: number,
    depth: number,
    bytesPerPixel: number,
    alignment: number,
    rowLength: number = 0,
    imageHeight: number = 0,
    skipPixels: number = 0,
    skipRows: number = 0,
    skipImages: number = 0,
): PackedPixelLayout3D {
    const rowBytes = width * bytesPerPixel;
    const rowStride = alignTo((rowLength || width) * bytesPerPixel, alignment);
    const imageStride = rowStride * (imageHeight || height);
    const dataOffset = skipImages * imageStride + skipRows * rowStride + skipPixels * bytesPerPixel;
    return {
        rowBytes,
        rowStride,
        imageStride,
        dataOffset,
        requiredBytes: width === 0 || height === 0 || depth === 0
            ? 0
            : dataOffset + imageStride * (depth - 1) + rowStride * (height - 1) + rowBytes,
    };
}

function byteView(data: TypedArray): Uint8Array {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

export function textureUploadBytesPerPixel(format: GLenum, type: GLenum): number {
    if (type === WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5 ||
        type === WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4 ||
        type === WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1) {
        return 2;
    }
    if (type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        switch (format) {
            case WebGL2RenderingContext.RGBA:
            case GL_SRGB_ALPHA_EXT:
                return 4;
            case WebGL2RenderingContext.RGB:
            case GL_SRGB_EXT:
                return 3;
            case WebGL2RenderingContext.RG:
                return 2;
            case WebGL2RenderingContext.RED:
            case WebGL2RenderingContext.LUMINANCE:
            case WebGL2RenderingContext.ALPHA:
                return 1;
            case WebGL2RenderingContext.LUMINANCE_ALPHA:
                return 2;
        }
    }
    if (type === WebGL2RenderingContext.FLOAT) {
        switch (format) {
            case WebGL2RenderingContext.RGBA:
                return 16;
            case WebGL2RenderingContext.RGB:
                return 12;
            case WebGL2RenderingContext.RG:
                return 8;
            case WebGL2RenderingContext.RED:
                return 4;
        }
    }
    if (type === WebGL2RenderingContext.HALF_FLOAT) {
        switch (format) {
            case WebGL2RenderingContext.RGBA: return 8;
            case WebGL2RenderingContext.RGB: return 6;
            case WebGL2RenderingContext.RG: return 4;
            case WebGL2RenderingContext.RED: return 2;
        }
    }
    if (type === WebGL2RenderingContext.BYTE) {
        switch (format) {
            case WebGL2RenderingContext.RGBA: return 4;
            case WebGL2RenderingContext.RGB: return 3;
            case WebGL2RenderingContext.RG: return 2;
            case WebGL2RenderingContext.RED: return 1;
        }
    }
    if ((type === WebGL2RenderingContext.UNSIGNED_INT_10F_11F_11F_REV ||
        type === WebGL2RenderingContext.UNSIGNED_INT_5_9_9_9_REV) && format === WebGL2RenderingContext.RGB) {
        return 4;
    }
    if (type === WebGL2RenderingContext.UNSIGNED_INT_2_10_10_10_REV &&
        (format === WebGL2RenderingContext.RGBA || format === WebGL2RenderingContext.RGBA_INTEGER)) {
        return 4;
    }
    if (format === WebGL2RenderingContext.RED_INTEGER ||
        format === WebGL2RenderingContext.RG_INTEGER ||
        format === WebGL2RenderingContext.RGB_INTEGER ||
        format === WebGL2RenderingContext.RGBA_INTEGER) {
        const channels = format === WebGL2RenderingContext.RED_INTEGER ? 1 :
            format === WebGL2RenderingContext.RG_INTEGER ? 2 :
                format === WebGL2RenderingContext.RGB_INTEGER ? 3 : 4;
        switch (type) {
            case WebGL2RenderingContext.UNSIGNED_BYTE:
            case WebGL2RenderingContext.BYTE:
                return channels;
            case WebGL2RenderingContext.UNSIGNED_SHORT:
            case WebGL2RenderingContext.SHORT:
                return channels * 2;
            case WebGL2RenderingContext.UNSIGNED_INT:
            case WebGL2RenderingContext.INT:
                return channels * 4;
        }
    }
    if (format === WebGL2RenderingContext.DEPTH_COMPONENT && type === WebGL2RenderingContext.FLOAT) {
        return 4;
    }
    if (format === WebGL2RenderingContext.DEPTH_COMPONENT && type === WebGL2RenderingContext.UNSIGNED_INT) {
        return 4;
    }
    if (format === WebGL2RenderingContext.DEPTH_COMPONENT && type === WebGL2RenderingContext.UNSIGNED_SHORT) {
        return 2;
    }
    if (format === WebGL2RenderingContext.DEPTH_STENCIL && type === WebGL2RenderingContext.UNSIGNED_INT_24_8) {
        return 4;
    }
    if (format === WebGL2RenderingContext.DEPTH_STENCIL &&
        type === WebGL2RenderingContext.FLOAT_32_UNSIGNED_INT_24_8_REV) {
        return 8;
    }
    throw new Error(`Unsupported texture upload format: ${format}, ${type}`);
}

function float32ToFloat16(value: number): number {
    const float = new Float32Array(1);
    const bits = new Uint32Array(float.buffer);
    float[0] = value;
    const word = bits[0];
    const sign = (word >>> 16) & 0x8000;
    let exponent = ((word >>> 23) & 0xff) - 127 + 15;
    let mantissa = word & 0x7fffff;
    if (exponent <= 0) {
        if (exponent < -10) return sign;
        mantissa = (mantissa | 0x800000) >>> (1 - exponent);
        return sign | ((mantissa + 0x1000) >>> 13);
    }
    if (exponent >= 31) {
        return sign | (mantissa ? 0x7e00 : 0x7c00);
    }
    mantissa += 0x1000;
    if (mantissa & 0x800000) {
        mantissa = 0;
        exponent++;
        if (exponent >= 31) return sign | 0x7c00;
    }
    return sign | (exponent << 10) | (mantissa >>> 13);
}

function float16ToFloat32(value: number): number {
    const sign = value & 0x8000 ? -1 : 1;
    const exponent = (value >>> 10) & 0x1f;
    const mantissa = value & 0x3ff;
    if (exponent === 0) {
        return mantissa === 0 ? sign * 0 : sign * mantissa * Math.pow(2, -24);
    }
    if (exponent === 0x1f) {
        return mantissa === 0 ? sign * Infinity : NaN;
    }
    return sign * (1 + mantissa / 0x400) * Math.pow(2, exponent - 15);
}

function decodeUnsignedFloat(value: number, mantissaBits: number): number {
    const mantissaMask = (1 << mantissaBits) - 1;
    const exponent = value >>> mantissaBits;
    const mantissa = value & mantissaMask;
    if (exponent === 0) {
        return mantissa * Math.pow(2, 1 - 15 - mantissaBits);
    }
    if (exponent === 0x1f) {
        return mantissa === 0 ? Infinity : NaN;
    }
    return (1 + mantissa / (1 << mantissaBits)) * Math.pow(2, exponent - 15);
}

function encodeUnsignedFloat(value: number, mantissaBits: number): number {
    const mantissaLimit = 1 << mantissaBits;
    if (Number.isNaN(value)) return (0x1f << mantissaBits) | 1;
    if (!(value > 0)) return 0;
    if (!Number.isFinite(value)) return 0x1f << mantissaBits;
    const exponent = Math.floor(Math.log2(value));
    let biasedExponent = exponent + 15;
    if (biasedExponent <= 0) {
        const mantissa = Math.round(value / Math.pow(2, 1 - 15 - mantissaBits));
        return Math.min(mantissaLimit - 1, Math.max(0, mantissa));
    }
    if (biasedExponent >= 0x1f) return 0x1f << mantissaBits;
    let mantissa = Math.round((value / Math.pow(2, exponent) - 1) * mantissaLimit);
    if (mantissa === mantissaLimit) {
        biasedExponent++;
        mantissa = 0;
        if (biasedExponent >= 0x1f) return 0x1f << mantissaBits;
    }
    return (biasedExponent << mantissaBits) | mantissa;
}

function encodeRgb9e5(red: number, green: number, blue: number): number {
    const clamp = (value: number) => Number.isNaN(value)
        ? 0
        : Math.min(65408, Math.max(0, value));
    const components = [clamp(red), clamp(green), clamp(blue)];
    const maximum = Math.max(...components);
    let exponent = maximum === 0
        ? 0
        : Math.max(0, Math.min(31, Math.floor(Math.log2(maximum)) + 1 + 15));
    let scale = Math.pow(2, (exponent === 0 ? 1 : exponent) - 15 - 9);
    if (Math.round(maximum / scale) >= 512 && exponent < 31) {
        exponent++;
        scale *= 2;
    }
    const mantissas = components.map((component) =>
        Math.min(511, Math.max(0, Math.round(component / scale))));
    return (mantissas[0] | (mantissas[1] << 9) | (mantissas[2] << 18) |
        (exponent << 27)) >>> 0;
}

export function prepareTypedTextureUpload(
    data: TypedArray,
    width: number,
    height: number,
    internalformat: GLenum,
    format: GLenum,
    type: GLenum,
    unpack: HydPixelUnpackState,
): PreparedTextureUpload {
    const sourceBytes = byteView(data);
    const sourceBytesPerPixel = textureUploadBytesPerPixel(format, type);
    const sourceLayout = packedPixelLayout(
        width,
        height,
        sourceBytesPerPixel,
        unpack.alignment,
        unpack.rowLength || 0,
        unpack.skipPixels || 0,
        unpack.skipRows || 0,
    );
    if (sourceBytes.byteLength < sourceLayout.requiredBytes) {
        throw new Error(`Texture upload data is too small: ${sourceBytes.byteLength} bytes for ${width}x${height}`);
    }
    const sourceBytesPerRow = sourceLayout.rowStride;
    const sourceDataOffset = sourceLayout.dataOffset;
    if (format === WebGL2RenderingContext.RGB_INTEGER) {
        const componentBytes = type === WebGL2RenderingContext.BYTE || type === WebGL2RenderingContext.UNSIGNED_BYTE
            ? 1
            : type === WebGL2RenderingContext.SHORT || type === WebGL2RenderingContext.UNSIGNED_SHORT
                ? 2
                : 4;
        const destinationBytesPerPixel = componentBytes * 4;
        const upload = new Uint8Array(width * height * destinationBytesPerPixel);
        for (let y = 0; y < height; y++) {
            const sourceY = unpack.flipY ? height - 1 - y : y;
            for (let x = 0; x < width; x++) {
                const sourcePixel = sourceDataOffset + sourceY * sourceBytesPerRow + x * componentBytes * 3;
                const destinationPixel = (y * width + x) * destinationBytesPerPixel;
                upload.set(
                    sourceBytes.subarray(sourcePixel, sourcePixel + componentBytes * 3),
                    destinationPixel,
                );
                upload[destinationPixel + componentBytes * 3] = 1;
            }
        }
        return {
            data: upload,
            bytesPerRow: width * destinationBytesPerPixel,
            internalformat,
            format,
            type,
        };
    }
    const halfFloatInternal = internalformat === WebGL2RenderingContext.R16F ||
        internalformat === WebGL2RenderingContext.RG16F ||
        internalformat === WebGL2RenderingContext.RGB16F ||
        internalformat === WebGL2RenderingContext.RGBA16F;
    if (halfFloatInternal && (type === WebGL2RenderingContext.FLOAT || type === WebGL2RenderingContext.HALF_FLOAT)) {
        const sourceChannels = format === WebGL2RenderingContext.RED ? 1 :
            format === WebGL2RenderingContext.RG ? 2 :
                format === WebGL2RenderingContext.RGB ? 3 : 4;
        const destinationChannels = sourceChannels === 3 ? 4 : sourceChannels;
        const upload = new Uint16Array(width * height * destinationChannels);
        const sourceView = new DataView(sourceBytes.buffer, sourceBytes.byteOffset, sourceBytes.byteLength);
        const sourceComponentBytes = type === WebGL2RenderingContext.FLOAT ? 4 : 2;
        for (let y = 0; y < height; y++) {
            const sourceY = unpack.flipY ? height - 1 - y : y;
            for (let x = 0; x < width; x++) {
                const sourcePixel = sourceDataOffset + sourceY * sourceBytesPerRow + x * sourceChannels * sourceComponentBytes;
                const destinationPixel = (y * width + x) * destinationChannels;
                for (let channel = 0; channel < sourceChannels; channel++) {
                    const sourceOffset = sourcePixel + channel * sourceComponentBytes;
                    upload[destinationPixel + channel] = type === WebGL2RenderingContext.FLOAT
                        ? float32ToFloat16(sourceView.getFloat32(sourceOffset, true))
                        : sourceView.getUint16(sourceOffset, true);
                }
                if (sourceChannels === 3) upload[destinationPixel + 3] = 0x3c00;
            }
        }
        return {
            data: upload,
            bytesPerRow: width * destinationChannels * 2,
            internalformat,
            format,
            type: WebGL2RenderingContext.HALF_FLOAT,
        };
    }
    if (internalformat === WebGL2RenderingContext.R11F_G11F_B10F &&
        format === WebGL2RenderingContext.RGB &&
        (type === WebGL2RenderingContext.FLOAT ||
            type === WebGL2RenderingContext.HALF_FLOAT ||
            type === WebGL2RenderingContext.UNSIGNED_INT_10F_11F_11F_REV)) {
        const upload = new Uint32Array(width * height);
        const sourceView = new DataView(sourceBytes.buffer, sourceBytes.byteOffset, sourceBytes.byteLength);
        for (let y = 0; y < height; y++) {
            const sourceY = unpack.flipY ? height - 1 - y : y;
            for (let x = 0; x < width; x++) {
                const sourcePixel = sourceDataOffset + sourceY * sourceBytesPerRow + x * sourceBytesPerPixel;
                let red: number;
                let green: number;
                let blue: number;
                if (type === WebGL2RenderingContext.UNSIGNED_INT_10F_11F_11F_REV) {
                    const packed = sourceView.getUint32(sourcePixel, true);
                    red = decodeUnsignedFloat(packed & 0x7ff, 6);
                    green = decodeUnsignedFloat((packed >>> 11) & 0x7ff, 6);
                    blue = decodeUnsignedFloat((packed >>> 22) & 0x3ff, 5);
                } else if (type === WebGL2RenderingContext.HALF_FLOAT) {
                    red = float16ToFloat32(sourceView.getUint16(sourcePixel, true));
                    green = float16ToFloat32(sourceView.getUint16(sourcePixel + 2, true));
                    blue = float16ToFloat32(sourceView.getUint16(sourcePixel + 4, true));
                } else {
                    red = sourceView.getFloat32(sourcePixel, true);
                    green = sourceView.getFloat32(sourcePixel + 4, true);
                    blue = sourceView.getFloat32(sourcePixel + 8, true);
                }
                upload[y * width + x] = (encodeUnsignedFloat(red, 6) |
                    (encodeUnsignedFloat(green, 6) << 11) |
                    (encodeUnsignedFloat(blue, 5) << 22)) >>> 0;
            }
        }
        return {
            data: upload,
            bytesPerRow: width * 4,
            internalformat,
            format,
            type: WebGL2RenderingContext.UNSIGNED_INT_10F_11F_11F_REV,
        };
    }
    if (internalformat === WebGL2RenderingContext.RGB32F &&
        format === WebGL2RenderingContext.RGB && type === WebGL2RenderingContext.FLOAT) {
        const upload = new Float32Array(width * height * 4);
        const sourceView = new DataView(sourceBytes.buffer, sourceBytes.byteOffset, sourceBytes.byteLength);
        for (let y = 0; y < height; y++) {
            const sourceY = unpack.flipY ? height - 1 - y : y;
            for (let x = 0; x < width; x++) {
                const sourcePixel = sourceDataOffset + sourceY * sourceBytesPerRow + x * 12;
                const destinationPixel = (y * width + x) * 4;
                upload[destinationPixel] = sourceView.getFloat32(sourcePixel, true);
                upload[destinationPixel + 1] = sourceView.getFloat32(sourcePixel + 4, true);
                upload[destinationPixel + 2] = sourceView.getFloat32(sourcePixel + 8, true);
                upload[destinationPixel + 3] = 1;
            }
        }
        return { data: upload, bytesPerRow: width * 16, internalformat, format, type };
    }
    if (internalformat === WebGL2RenderingContext.RGB9_E5 &&
        format === WebGL2RenderingContext.RGB &&
        (type === WebGL2RenderingContext.FLOAT || type === WebGL2RenderingContext.HALF_FLOAT)) {
        const upload = new Uint32Array(width * height);
        const sourceView = new DataView(sourceBytes.buffer, sourceBytes.byteOffset, sourceBytes.byteLength);
        const componentBytes = type === WebGL2RenderingContext.FLOAT ? 4 : 2;
        const readComponent = (offset: number) => type === WebGL2RenderingContext.FLOAT
            ? sourceView.getFloat32(offset, true)
            : float16ToFloat32(sourceView.getUint16(offset, true));
        for (let y = 0; y < height; y++) {
            const sourceY = unpack.flipY ? height - 1 - y : y;
            for (let x = 0; x < width; x++) {
                const sourcePixel = sourceDataOffset + sourceY * sourceBytesPerRow + x * componentBytes * 3;
                upload[y * width + x] = encodeRgb9e5(
                    readComponent(sourcePixel),
                    readComponent(sourcePixel + componentBytes),
                    readComponent(sourcePixel + componentBytes * 2),
                );
            }
        }
        return {
            data: upload,
            bytesPerRow: width * 4,
            internalformat,
            format,
            type: WebGL2RenderingContext.UNSIGNED_INT_5_9_9_9_REV,
        };
    }
    if (internalformat === WebGL2RenderingContext.RGB5_A1 &&
        format === WebGL2RenderingContext.RGBA &&
        type === WebGL2RenderingContext.UNSIGNED_INT_2_10_10_10_REV) {
        const upload = new Uint8Array(width * height * 4);
        const sourceView = new DataView(sourceBytes.buffer, sourceBytes.byteOffset, sourceBytes.byteLength);
        for (let y = 0; y < height; y++) {
            const sourceY = unpack.flipY ? height - 1 - y : y;
            for (let x = 0; x < width; x++) {
                const packed = sourceView.getUint32(sourceDataOffset + sourceY * sourceBytesPerRow + x * 4, true);
                const destinationPixel = (y * width + x) * 4;
                upload[destinationPixel] = Math.round((packed & 0x3ff) * 255 / 0x3ff);
                upload[destinationPixel + 1] = Math.round(((packed >>> 10) & 0x3ff) * 255 / 0x3ff);
                upload[destinationPixel + 2] = Math.round(((packed >>> 20) & 0x3ff) * 255 / 0x3ff);
                upload[destinationPixel + 3] = ((packed >>> 30) & 0x3) >= 2 ? 255 : 0;
            }
        }
        return {
            data: upload,
            bytesPerRow: width * 4,
            internalformat,
            format: WebGL2RenderingContext.RGBA,
            type: WebGL2RenderingContext.UNSIGNED_BYTE,
        };
    }
    if (internalformat === WebGL2RenderingContext.RGB8_SNORM &&
        format === WebGL2RenderingContext.RGB && type === WebGL2RenderingContext.BYTE) {
        const upload = new Int8Array(width * height * 4);
        for (let y = 0; y < height; y++) {
            const sourceY = unpack.flipY ? height - 1 - y : y;
            for (let x = 0; x < width; x++) {
                const sourcePixel = sourceDataOffset + sourceY * sourceBytesPerRow + x * 3;
                const destinationPixel = (y * width + x) * 4;
                upload[destinationPixel] = sourceBytes[sourcePixel];
                upload[destinationPixel + 1] = sourceBytes[sourcePixel + 1];
                upload[destinationPixel + 2] = sourceBytes[sourcePixel + 2];
                upload[destinationPixel + 3] = 127;
            }
        }
        return { data: upload, bytesPerRow: width * 4, internalformat, format, type };
    }
    const packed16 = type === WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5 ||
        type === WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4 ||
        type === WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1;
    const needsRgbaExpansion = packed16 ||
        type === WebGL2RenderingContext.UNSIGNED_BYTE &&
        (format === WebGL2RenderingContext.RGB ||
            format === GL_SRGB_EXT ||
            format === WebGL2RenderingContext.LUMINANCE ||
            format === WebGL2RenderingContext.ALPHA ||
            format === WebGL2RenderingContext.LUMINANCE_ALPHA);
    const needsPremultiply = unpack.premultiplyAlpha &&
        (format === WebGL2RenderingContext.RGBA ||
            format === GL_SRGB_ALPHA_EXT ||
            format === WebGL2RenderingContext.LUMINANCE_ALPHA);
    const preserveSrgbFormat = internalformat === GL_SRGB_EXT ||
        internalformat === GL_SRGB_ALPHA_EXT ||
        internalformat === WebGL2RenderingContext.SRGB8 ||
        internalformat === WebGL2RenderingContext.SRGB8_ALPHA8;
    const uploadInternalformat = needsRgbaExpansion && !preserveSrgbFormat ? WebGL2RenderingContext.RGBA : internalformat;
    const uploadFormat = needsRgbaExpansion && !preserveSrgbFormat ? WebGL2RenderingContext.RGBA : format;
    const uploadType = needsRgbaExpansion ? WebGL2RenderingContext.UNSIGNED_BYTE : type;
    const destinationBytesPerPixel = needsRgbaExpansion ? 4 : sourceBytesPerPixel;
    const destinationBytesPerRow = width * destinationBytesPerPixel;

    if (!unpack.flipY && !needsRgbaExpansion && !needsPremultiply && sourceBytesPerRow === destinationBytesPerRow) {
        return {
            data,
            bytesPerRow: sourceBytesPerRow,
            internalformat: uploadInternalformat,
            format: uploadFormat,
            type: uploadType,
        };
    }

    const uploadBytes = new Uint8Array(destinationBytesPerRow * height);
    for (let y = 0; y < height; y++) {
        const sourceY = unpack.flipY ? height - 1 - y : y;
        const sourceOffset = sourceDataOffset + sourceY * sourceBytesPerRow;
        const destinationOffset = y * destinationBytesPerRow;

        if (!needsRgbaExpansion) {
            uploadBytes.set(sourceBytes.subarray(sourceOffset, sourceOffset + destinationBytesPerRow), destinationOffset);
            if (needsPremultiply && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
                for (let x = 0; x < width; x++) {
                    const dst = destinationOffset + x * 4;
                    const alpha = uploadBytes[dst + 3];
                    uploadBytes[dst] = Math.round(uploadBytes[dst] * alpha / 255);
                    uploadBytes[dst + 1] = Math.round(uploadBytes[dst + 1] * alpha / 255);
                    uploadBytes[dst + 2] = Math.round(uploadBytes[dst + 2] * alpha / 255);
                }
            }
            continue;
        }

        for (let x = 0; x < width; x++) {
            const src = sourceOffset + x * sourceBytesPerPixel;
            const dst = destinationOffset + x * 4;
            if (packed16) {
                const packed = sourceBytes[src] | (sourceBytes[src + 1] << 8);
                const expand = (value: number, bits: number) => Math.round(value * 255 / ((1 << bits) - 1));
                if (type === WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5) {
                    uploadBytes[dst] = expand((packed >> 11) & 0x1f, 5);
                    uploadBytes[dst + 1] = expand((packed >> 5) & 0x3f, 6);
                    uploadBytes[dst + 2] = expand(packed & 0x1f, 5);
                    uploadBytes[dst + 3] = 255;
                } else if (type === WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4) {
                    uploadBytes[dst] = expand((packed >> 12) & 0xf, 4);
                    uploadBytes[dst + 1] = expand((packed >> 8) & 0xf, 4);
                    uploadBytes[dst + 2] = expand((packed >> 4) & 0xf, 4);
                    uploadBytes[dst + 3] = expand(packed & 0xf, 4);
                } else {
                    uploadBytes[dst] = expand((packed >> 11) & 0x1f, 5);
                    uploadBytes[dst + 1] = expand((packed >> 6) & 0x1f, 5);
                    uploadBytes[dst + 2] = expand((packed >> 1) & 0x1f, 5);
                    uploadBytes[dst + 3] = (packed & 1) ? 255 : 0;
                }
            } else if (format === WebGL2RenderingContext.LUMINANCE) {
                const luminance = sourceBytes[src];
                uploadBytes[dst] = luminance;
                uploadBytes[dst + 1] = luminance;
                uploadBytes[dst + 2] = luminance;
                uploadBytes[dst + 3] = 255;
            } else if (format === WebGL2RenderingContext.ALPHA) {
                uploadBytes[dst] = 0;
                uploadBytes[dst + 1] = 0;
                uploadBytes[dst + 2] = 0;
                uploadBytes[dst + 3] = sourceBytes[src];
            } else if (format === WebGL2RenderingContext.LUMINANCE_ALPHA) {
                const luminance = sourceBytes[src];
                uploadBytes[dst] = luminance;
                uploadBytes[dst + 1] = luminance;
                uploadBytes[dst + 2] = luminance;
                uploadBytes[dst + 3] = sourceBytes[src + 1];
            } else {
                uploadBytes[dst] = sourceBytes[src];
                uploadBytes[dst + 1] = sourceBytes[src + 1];
                uploadBytes[dst + 2] = sourceBytes[src + 2];
                uploadBytes[dst + 3] = 255;
            }
            if (needsPremultiply) {
                const alpha = uploadBytes[dst + 3];
                uploadBytes[dst] = Math.round(uploadBytes[dst] * alpha / 255);
                uploadBytes[dst + 1] = Math.round(uploadBytes[dst + 1] * alpha / 255);
                uploadBytes[dst + 2] = Math.round(uploadBytes[dst + 2] * alpha / 255);
            }
        }
    }

    return {
        data: uploadBytes,
        bytesPerRow: destinationBytesPerRow,
        internalformat: uploadInternalformat,
        format: uploadFormat,
        type: uploadType,
    };
}

function externalUploadChannels(format: GLenum): number[] | null {
    switch (format) {
        case WebGL2RenderingContext.RED:
        case WebGL2RenderingContext.RED_INTEGER:
        case WebGL2RenderingContext.LUMINANCE:
            return [0];
        case WebGL2RenderingContext.ALPHA:
            return [3];
        case WebGL2RenderingContext.RG:
        case WebGL2RenderingContext.RG_INTEGER:
            return [0, 1];
        case WebGL2RenderingContext.LUMINANCE_ALPHA:
            return [0, 3];
        case WebGL2RenderingContext.RGB:
        case WebGL2RenderingContext.RGB_INTEGER:
        case GL_SRGB_EXT:
            return [0, 1, 2];
        case WebGL2RenderingContext.RGBA:
        case WebGL2RenderingContext.RGBA_INTEGER:
        case GL_SRGB_ALPHA_EXT:
            return [0, 1, 2, 3];
        default:
            return null;
    }
}

/** Encode already unpacked external RGBA8 pixels as a WebGL typed upload. */
export function prepareExternalRgba8TextureUpload(
    rgba: Uint8Array,
    width: number,
    height: number,
    internalformat: GLenum,
    format: GLenum,
    type: GLenum,
): PreparedTextureUpload | null {
    if (rgba.byteLength < width * height * 4) return null;
    const channels = externalUploadChannels(format);
    if (!channels) return null;
    const pixelCount = width * height;
    const sourceChannel = (pixel: number, channel: number) => rgba[pixel * 4 + channels[channel]];
    let source: TypedArray;

    if (type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        const values = new Uint8Array(pixelCount * channels.length);
        for (let pixel = 0; pixel < pixelCount; pixel++) {
            for (let channel = 0; channel < channels.length; channel++) {
                values[pixel * channels.length + channel] = sourceChannel(pixel, channel);
            }
        }
        source = values;
    } else if (type === WebGL2RenderingContext.FLOAT) {
        const values = new Float32Array(pixelCount * channels.length);
        for (let pixel = 0; pixel < pixelCount; pixel++) {
            for (let channel = 0; channel < channels.length; channel++) {
                values[pixel * channels.length + channel] = sourceChannel(pixel, channel) / 255;
            }
        }
        source = values;
    } else if (type === WebGL2RenderingContext.HALF_FLOAT) {
        const values = new Uint16Array(pixelCount * channels.length);
        for (let pixel = 0; pixel < pixelCount; pixel++) {
            for (let channel = 0; channel < channels.length; channel++) {
                values[pixel * channels.length + channel] = float32ToFloat16(sourceChannel(pixel, channel) / 255);
            }
        }
        source = values;
    } else if (type === WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5 && channels.length === 3) {
        const values = new Uint16Array(pixelCount);
        for (let pixel = 0; pixel < pixelCount; pixel++) {
            values[pixel] = (Math.round(sourceChannel(pixel, 0) * 31 / 255) << 11) |
                (Math.round(sourceChannel(pixel, 1) * 63 / 255) << 5) |
                Math.round(sourceChannel(pixel, 2) * 31 / 255);
        }
        source = values;
    } else if (type === WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4 && channels.length === 4) {
        const values = new Uint16Array(pixelCount);
        for (let pixel = 0; pixel < pixelCount; pixel++) {
            values[pixel] = (Math.round(sourceChannel(pixel, 0) * 15 / 255) << 12) |
                (Math.round(sourceChannel(pixel, 1) * 15 / 255) << 8) |
                (Math.round(sourceChannel(pixel, 2) * 15 / 255) << 4) |
                Math.round(sourceChannel(pixel, 3) * 15 / 255);
        }
        source = values;
    } else if (type === WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1 && channels.length === 4) {
        const values = new Uint16Array(pixelCount);
        for (let pixel = 0; pixel < pixelCount; pixel++) {
            values[pixel] = (Math.round(sourceChannel(pixel, 0) * 31 / 255) << 11) |
                (Math.round(sourceChannel(pixel, 1) * 31 / 255) << 6) |
                (Math.round(sourceChannel(pixel, 2) * 31 / 255) << 1) |
                (sourceChannel(pixel, 3) >= 128 ? 1 : 0);
        }
        source = values;
    } else if (type === WebGL2RenderingContext.UNSIGNED_INT_10F_11F_11F_REV && channels.length === 3) {
        const values = new Uint32Array(pixelCount);
        for (let pixel = 0; pixel < pixelCount; pixel++) {
            values[pixel] = (encodeUnsignedFloat(sourceChannel(pixel, 0) / 255, 6) |
                (encodeUnsignedFloat(sourceChannel(pixel, 1) / 255, 6) << 11) |
                (encodeUnsignedFloat(sourceChannel(pixel, 2) / 255, 5) << 22)) >>> 0;
        }
        source = values;
    } else if (type === WebGL2RenderingContext.UNSIGNED_INT_5_9_9_9_REV && channels.length === 3) {
        const values = new Uint32Array(pixelCount);
        for (let pixel = 0; pixel < pixelCount; pixel++) {
            values[pixel] = encodeRgb9e5(
                sourceChannel(pixel, 0) / 255,
                sourceChannel(pixel, 1) / 255,
                sourceChannel(pixel, 2) / 255,
            );
        }
        source = values;
    } else if (type === WebGL2RenderingContext.UNSIGNED_INT_2_10_10_10_REV && channels.length === 4) {
        const values = new Uint32Array(pixelCount);
        for (let pixel = 0; pixel < pixelCount; pixel++) {
            values[pixel] = (Math.round(sourceChannel(pixel, 0) * 1023 / 255) |
                (Math.round(sourceChannel(pixel, 1) * 1023 / 255) << 10) |
                (Math.round(sourceChannel(pixel, 2) * 1023 / 255) << 20) |
                (Math.round(sourceChannel(pixel, 3) * 3 / 255) << 30)) >>> 0;
        }
        source = values;
    } else {
        return null;
    }

    return prepareTypedTextureUpload(
        source,
        width,
        height,
        internalformat,
        format,
        type,
        { ...DEFAULT_PIXEL_UNPACK_STATE, alignment: 1 },
    );
}

function prepareExternalTextureUpload(
    source: any,
    width: number,
    height: number,
    internalformat: GLenum,
    format: GLenum,
    type: GLenum,
    unpack: HydPixelUnpackState,
): PreparedTextureUpload | null {
    if (typeof ImageData !== "undefined" && source instanceof ImageData) {
        return prepareExternalRgba8TextureUploadLayers(
            source.data,
            source.width,
            source.height,
            width,
            height,
            1,
            internalformat,
            format,
            type,
            unpack,
        );
    }
    const rgba = convertExternalTextureSource(
        source,
        width,
        height,
        WebGL2RenderingContext.RGBA,
        WebGL2RenderingContext.UNSIGNED_BYTE,
        unpack,
    );
    return rgba
        ? prepareExternalRgba8TextureUpload(rgba, width, height, internalformat, format, type)
        : null;
}

/** Apply WebGL DOM unpack state to RGBA8 pixels before layered conversion. */
export function prepareExternalRgba8TextureUploadLayers(
    sourceRgba: Uint8Array | Uint8ClampedArray,
    sourceWidth: number,
    sourceHeight: number,
    width: number,
    height: number,
    depth: number,
    internalformat: GLenum,
    format: GLenum,
    type: GLenum,
    unpack: HydPixelUnpackState,
): PreparedTextureUpload | null {
    const imageHeight = unpack.imageHeight || height;
    const firstImage = unpack.skipImages || 0;
    const skipRows = unpack.skipRows || 0;
    const skipPixels = unpack.skipPixels || 0;
    let result: PreparedTextureUpload | null = null;
    let output: Uint8Array | null = null;
    for (let layer = 0; layer < depth; layer++) {
        const rgba = new Uint8Array(width * height * 4);
        for (let y = 0; y < height; y++) {
            const unpackRow = skipRows + (firstImage + layer) * imageHeight + y;
            const sourceY = unpack.flipY ? sourceHeight - unpackRow - 1 : unpackRow;
            if (sourceY < 0 || sourceY >= sourceHeight ||
                skipPixels < 0 || skipPixels + width > sourceWidth) return null;
            for (let x = 0; x < width; x++) {
                const sourceOffset = (sourceY * sourceWidth + skipPixels + x) * 4;
                const destinationOffset = (y * width + x) * 4;
                const alpha = sourceRgba[sourceOffset + 3];
                rgba[destinationOffset] = unpack.premultiplyAlpha
                    ? Math.round(sourceRgba[sourceOffset] * alpha / 255)
                    : sourceRgba[sourceOffset];
                rgba[destinationOffset + 1] = unpack.premultiplyAlpha
                    ? Math.round(sourceRgba[sourceOffset + 1] * alpha / 255)
                    : sourceRgba[sourceOffset + 1];
                rgba[destinationOffset + 2] = unpack.premultiplyAlpha
                    ? Math.round(sourceRgba[sourceOffset + 2] * alpha / 255)
                    : sourceRgba[sourceOffset + 2];
                rgba[destinationOffset + 3] = alpha;
            }
        }
        const prepared = prepareExternalRgba8TextureUpload(
            rgba, width, height, internalformat, format, type);
        if (!prepared) return null;
        const bytes = byteView(prepared.data as TypedArray);
        const imageStride = prepared.bytesPerRow * height;
        if (!result) {
            result = prepared;
            output = new Uint8Array(imageStride * depth);
        } else if (prepared.bytesPerRow !== result.bytesPerRow ||
            prepared.internalformat !== result.internalformat ||
            prepared.format !== result.format || prepared.type !== result.type) {
            return null;
        }
        output.set(bytes.subarray(0, Math.min(bytes.byteLength, imageStride)), layer * imageStride);
    }
    return result && output ? { ...result, data: output } : null;
}

function prepareExternalTextureUploadLayers(
    source: any,
    width: number,
    height: number,
    depth: number,
    internalformat: GLenum,
    format: GLenum,
    type: GLenum,
    unpack: HydPixelUnpackState,
): PreparedTextureUpload | null {
    if (typeof ImageData !== "undefined" && source instanceof ImageData) {
        return prepareExternalRgba8TextureUploadLayers(
            source.data,
            source.width,
            source.height,
            width,
            height,
            depth,
            internalformat,
            format,
            type,
            unpack,
        );
    }
    const sourceImageHeight = unpack.imageHeight || height;
    const firstImage = unpack.skipImages || 0;
    let result: PreparedTextureUpload | null = null;
    let output: Uint8Array | null = null;
    for (let layer = 0; layer < depth; layer++) {
        const prepared = prepareExternalTextureUpload(
            source,
            width,
            height,
            internalformat,
            format,
            type,
            {
                ...unpack,
                imageHeight: 0,
                skipRows: (unpack.skipRows || 0) + (firstImage + layer) * sourceImageHeight,
                skipImages: 0,
            },
        );
        if (!prepared) return null;
        const bytes = byteView(prepared.data as TypedArray);
        const imageStride = prepared.bytesPerRow * height;
        if (!result) {
            result = prepared;
            output = new Uint8Array(imageStride * depth);
        } else if (prepared.bytesPerRow !== result.bytesPerRow ||
            prepared.internalformat !== result.internalformat ||
            prepared.format !== result.format || prepared.type !== result.type) {
            return null;
        }
        output.set(bytes.subarray(0, Math.min(bytes.byteLength, imageStride)), layer * imageStride);
    }
    return result && output ? { ...result, data: output } : null;
}

export function requiresPreparedExternalUpload(
    gpuFormat: GPUTextureFormat,
    logicalFormat: GLenum,
    supportsDirectExternalCopy: boolean = true,
): boolean {
    // WebGPU's external-image copy performs the browser-native decode and
    // preserves source precision for these color formats. Restrict this path
    // to RGBA sources whose source-object semantics WebGPU can preserve.
    const directHighPrecision = supportsDirectExternalCopy &&
        logicalFormat === WebGL2RenderingContext.RGBA &&
        (gpuFormat === "rgb10a2unorm" || gpuFormat === "rgba16float");
    return gpuFormat !== "rgba8unorm" && gpuFormat !== "rgba8unorm-srgb" &&
        !directHighPrecision;
}

export function resolveExternalCopyLayout(
    sourceWidth: number,
    sourceHeight: number,
    copyWidth: number,
    copyHeight: number,
    skipPixels: number,
    skipRows: number,
    flipY: boolean,
): { origin: { x: number, y: number }, flipY: boolean } {
    return {
        origin: {
            x: skipPixels,
            y: flipY ? sourceHeight - skipRows - copyHeight : skipRows,
        },
        flipY,
    };
}

function supportsDirectExternalCopy(source: any): boolean {
    return !(typeof ImageData !== "undefined" && source instanceof ImageData) &&
        !(typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) &&
        !(typeof HTMLVideoElement !== "undefined" && source instanceof HTMLVideoElement);
}

function externalCopySource(
    source: GPUCopyExternalImageSource,
    width: number,
    height: number,
    unpack: HydPixelUnpackState,
): GPUCopyExternalImageSourceInfo {
    const extent = externalTextureSourceExtent(source);
    const flipY = shouldApplyExternalFlipY(source, unpack);
    const layout = resolveExternalCopyLayout(
        extent?.width || width,
        extent?.height || height,
        width,
        height,
        unpack.skipPixels || 0,
        unpack.skipRows || 0,
        flipY,
    );
    return { source, ...layout };
}

function prepareTypedTextureUploadLayers(
    data: TypedArray,
    width: number,
    height: number,
    depth: number,
    internalformat: GLenum,
    format: GLenum,
    type: GLenum,
    unpack: HydPixelUnpackState,
): PreparedTextureUpload {
    const sourceBytes = byteView(data);
    const sourceBytesPerPixel = textureUploadBytesPerPixel(format, type);
    const sourceLayout = packedPixelLayout3D(
        width,
        height,
        depth,
        sourceBytesPerPixel,
        unpack.alignment,
        unpack.rowLength || 0,
        unpack.imageHeight || 0,
        unpack.skipPixels || 0,
        unpack.skipRows || 0,
        unpack.skipImages || 0,
    );
    if (sourceBytes.byteLength < sourceLayout.requiredBytes) {
        throw new Error(`Layered texture upload data is too small: ${sourceBytes.byteLength} bytes`);
    }
    const layerUnpack: HydPixelUnpackState = {
        ...unpack,
        imageHeight: 0,
        skipPixels: 0,
        skipRows: 0,
        skipImages: 0,
    };
    let output: Uint8Array | null = null;
    let result: PreparedTextureUpload | null = null;
    for (let layer = 0; layer < depth; layer++) {
        const sourceOffset = sourceLayout.dataOffset + layer * sourceLayout.imageStride;
        const sourceLength = sourceLayout.rowStride * (height - 1) + sourceLayout.rowBytes;
        const prepared = prepareTypedTextureUpload(
            sourceBytes.subarray(sourceOffset, sourceOffset + sourceLength) as TypedArray,
            width,
            height,
            internalformat,
            format,
            type,
            layerUnpack,
        );
        const preparedBytes = byteView(prepared.data as TypedArray);
        const destinationImageStride = prepared.bytesPerRow * height;
        if (!output) {
            output = new Uint8Array(destinationImageStride * depth);
            result = prepared;
        } else if (prepared.bytesPerRow !== result.bytesPerRow ||
            prepared.internalformat !== result.internalformat ||
            prepared.format !== result.format || prepared.type !== result.type) {
            throw new Error("Inconsistent layered texture upload conversion");
        }
        output.set(
            preparedBytes.subarray(0, Math.min(preparedBytes.byteLength, destinationImageStride)),
            layer * destinationImageStride,
        );
    }
    return { ...result, data: output };
}

function shouldApplyExternalFlipY(data: GPUCopyExternalImageSource, unpack: HydPixelUnpackState): boolean {
    return unpack.flipY && !(typeof ImageBitmap !== "undefined" && data instanceof ImageBitmap);
}

function sampleTypeLookup(internalFormat: GLenum, format: GLenum, type: GLenum): GPUTextureSampleType {
    if (internalFormat === WebGL2RenderingContext.RGBA && format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "uint"
    }
    if (internalFormat === WebGL2RenderingContext.LUMINANCE && format === WebGL2RenderingContext.LUMINANCE && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "uint";
    }
    if (internalFormat === WebGL2RenderingContext.DEPTH_COMPONENT32F && format === WebGL2RenderingContext.DEPTH_COMPONENT && type === WebGL2RenderingContext.FLOAT) {
        return "depth";
    }
    throw new Error(`Unsupported texture format: ${internalFormat}, ${format}, ${type}`);
}

export class HydTexture implements HydHashable {
    // public bindGroupHashes: [Map<string, GPUBindGroup>, string][] = [];
    public onDestroy: Array<() => void> = [];
    public onDelete: Array<() => void> = [];
    public onStorageChange: Array<() => void> = [];
    static __total__ = 0;
    public static isDestroyedTexture: boolean = false;
    public label: string;
    private _texture: GPUTexture = null;
    private _textureDescriptor: HydTextureDescriptor = {
        size: {
            width: undefined,
            height: undefined,
            depthOrArrayLayers: undefined,
        },
        // sampleType: undefined,
        usage: undefined,
        format: undefined,
        dimension: undefined,
        isDepthStencil: false,
    };
    private _sampler: GPUSampler = null;
    private _nonFilteringSampler: GPUSampler = null;
    private _comparisonSampler: GPUSampler = null;
    private _view: GPUTextureView = null;
    private readonly _sampleViews: Map<string, GPUTextureView> = new Map();
    private _attachmentViews: Map<string, GPUTextureView> = new Map();
    private _hash: any;
    public sourceOrigin: HydTextureSourceOrigin = "uninitialized";
    private readonly imageStates: Map<string, HydTextureImageState> = new Map();
    private readonly residentImages: Set<string> = new Set();
    private readonly archivedImages: Map<string, {
        texture: GPUTexture;
        width: number;
        height: number;
        format: GPUTextureFormat;
    }> = new Map();
    private imageGeneration: number = 0;

    public needsSamplingYFlip(): boolean {
        return this.sourceOrigin === "render-target" || this.sourceOrigin === "copy";
    }

    get isDepthStencil(): boolean {
        return this._textureDescriptor.isDepthStencil;
    }

    private _currentTextureDescriptor: HydTextureDescriptor = {
        size: {
            width: undefined,
            height: undefined,
            depthOrArrayLayers: undefined,
        },
        // sampleType: undefined,
        usage: undefined,
        format: undefined,
        dimension: undefined,
        isDepthStencil: false,
    };

    private _viewDimension: GPUTextureViewDimension = undefined;

    public state: HydTextureState = {
        minFilter: "nearest",
        mipmapFilter: "linear",
        mipmapped: true,
        magFilter: "linear",
        wrapS: "repeat",
        wrapT: "repeat",
        wrapR: "repeat",
        maxAnisotropy: 1,
    };

    private readonly device: GPUDevice;
    public readonly ownerToken: object;
    public initialized: boolean = false;
    public deleted: boolean = false;
    public immutableFormat: boolean = false;
    public immutableLevels: number = 0;
    public renderbufferInternalFormat: GLenum = WebGL2RenderingContext.RGBA4;
    public renderbufferSamples: number = 0;
    public uniformDepthValue: number | null = null;
    public uniformStencilValue: number | null = null;
    public readonly webglParameters: Map<GLenum, GLenum> = new Map();
    public bindingTarget: GLenum | null = null;
    private static __samplerCount: number = 0;
    private static __viewCount: number = 0;
    private static readonly mipmapPipelines = new WeakMap<GPUDevice, Map<GPUTextureFormat, GPURenderPipeline>>();
    private static readonly mipmapSamplers = new WeakMap<GPUDevice, GPUSampler>();
    private static readonly depthUploadPipelines = new WeakMap<GPUDevice, Map<GPUTextureFormat, GPURenderPipeline>>();

    public get isConfigured(): boolean {
        return Boolean(
            this._textureDescriptor.format &&
            this._textureDescriptor.dimension &&
            this._textureDescriptor.usage &&
            this._textureDescriptor.size.width &&
            this._textureDescriptor.size.height &&
            this._textureDescriptor.size.depthOrArrayLayers,
        );
    }

    public get gpuFormat(): GPUTextureFormat {
        return this._textureDescriptor.format;
    }

    public get requiresUnfilterableFloatSampling(): boolean {
        return this.gpuFormat === "r32float" ||
            this.gpuFormat === "rg32float" ||
            this.gpuFormat === "rgba32float";
    }

    public get isRenderAttachmentCapable(): boolean {
        return Boolean(this._textureDescriptor.usage & GPUTextureUsage.RENDER_ATTACHMENT);
    }

    public get textureDimension(): GPUTextureDimension {
        return this._textureDescriptor.dimension;
    }

    public get width(): number {
        return Number(this._textureDescriptor.size.width) || 0;
    }

    public get height(): number {
        return Number(this._textureDescriptor.size.height) || 0;
    }

    public get mipLevelCount(): number {
        return this._textureDescriptor.mipLevelCount || 1;
    }

    public get sampleCount(): number {
        return this._textureDescriptor.sampleCount || 1;
    }

    private imageKey(level: number, layer: number): string {
        return `${level}:${layer}`;
    }

    public getImageState(target: GLenum, level: number = 0, layer?: number): HydTextureImageState | null {
        const imageLayer = layer === undefined ? HydTexture.getArrayLayer(target) : layer;
        return this.imageStates.get(this.imageKey(level, imageLayer)) || null;
    }

    public getBaseLevelSamplingClass(baseLevel?: number): HydTextureSamplingClass | null {
        if (baseLevel === undefined) {
            const rawBaseLevel = this.webglParameters.get(WebGL2RenderingContext.TEXTURE_BASE_LEVEL) || 0;
            baseLevel = this.immutableFormat
                ? Math.min(rawBaseLevel, Math.max(0, this.immutableLevels - 1))
                : rawBaseLevel;
        }
        const image = this.imageStates.get(this.imageKey(baseLevel, 0));
        if (!image) return null;
        if (image.format === WebGL2RenderingContext.DEPTH_COMPONENT ||
            image.format === WebGL2RenderingContext.DEPTH_STENCIL) {
            return "depth";
        }
        if (image.format === WebGL2RenderingContext.RED_INTEGER ||
            image.format === WebGL2RenderingContext.RG_INTEGER ||
            image.format === WebGL2RenderingContext.RGB_INTEGER ||
            image.format === WebGL2RenderingContext.RGBA_INTEGER) {
            return image.type === WebGL2RenderingContext.BYTE ||
                image.type === WebGL2RenderingContext.SHORT ||
                image.type === WebGL2RenderingContext.INT
                ? "sint"
                : "uint";
        }
        return "float";
    }

    private defineImageState(
        target: GLenum,
        level: number,
        width: number,
        height: number,
        depth: number,
        internalFormat: GLenum,
        format: GLenum,
        type: GLenum,
        sourceOrigin: HydTextureSourceOrigin,
        layer?: number,
    ): HydTextureImageState {
        const imageLayer = layer === undefined ? HydTexture.getArrayLayer(target) : layer;
        const state: HydTextureImageState = {
            level,
            layer: imageLayer,
            width,
            height,
            depth,
            internalFormat,
            format,
            type,
            sourceOrigin,
            generation: ++this.imageGeneration,
        };
        const key = this.imageKey(level, imageLayer);
        this.imageStates.set(key, state);
        this.residentImages.add(key);
        this._hash = null;
        return state;
    }

    private initializeNullImage(
        target: GLenum,
        level: number,
        width: number,
        height: number,
        _internalFormat: GLenum,
        depth: number = 1,
    ) {
        if (width <= 0 || height <= 0 || depth <= 0) return;
        const image = this.getImageState(target, level);
        const needsPhysicalAlphaOne = image && (
            image.format === WebGL2RenderingContext.RGB ||
            image.format === WebGL2RenderingContext.RGB_INTEGER ||
            image.format === GL_SRGB_EXT ||
            image.format === WebGL2RenderingContext.LUMINANCE
        ) && this.gpuFormat.startsWith("rgba");
        // WebGPU guarantees zero-initialized new texture memory. Reusing an
        // existing storage for a null redefinition must still discard the
        // previous image, and logical RGB storage additionally needs alpha 1.
        if (!this._texture && !needsPhysicalAlphaOne) return;
        const colorFormat = !this.gpuFormat.includes("depth") && !this.gpuFormat.includes("stencil");
        if (colorFormat && this.isRenderAttachmentCapable) {
            const encoder = this.device.createCommandEncoder({ label: `${this.label} RGB initialization` });
            for (let layer = 0; layer < depth; layer++) {
                const attachmentLayer = CUBE_FACE_TARGETS.includes(target) ? undefined : layer;
                encoder.beginRenderPass({
                    colorAttachments: [{
                        view: this.getFramebufferView(target, level, attachmentLayer),
                        depthSlice: this.textureDimension === "3d" ? layer : undefined,
                        clearValue: { r: 0, g: 0, b: 0, a: needsPhysicalAlphaOne ? 1 : 0 },
                        loadOp: "clear",
                        storeOp: "store",
                    }],
                }).end();
            }
            this.device.queue.submit([encoder.finish()]);
            return;
        }
        if (this.gpuFormat === "rgba8snorm") {
            const pixels = new Int8Array(width * height * 4);
            for (let offset = 3; offset < pixels.length; offset += 4) pixels[offset] = 127;
            this.device.queue.writeTexture(
                { texture: this.texture, mipLevel: level, origin: targetToOrigin.get(target) || { x: 0, y: 0, z: 0 } },
                pixels,
                { bytesPerRow: width * 4, rowsPerImage: height },
                { width, height, depthOrArrayLayers: 1 },
            );
        }
    }

    private getDepthUploadPipeline(): GPURenderPipeline {
        let pipelines = HydTexture.depthUploadPipelines.get(this.device);
        if (!pipelines) {
            pipelines = new Map();
            HydTexture.depthUploadPipelines.set(this.device, pipelines);
        }
        const cached = pipelines.get(this.gpuFormat);
        if (cached) return cached;
        const module = this.device.createShaderModule({
            label: `depth upload shader ${this.gpuFormat}`,
            code: `
struct UploadParams {
  destinationOffset : vec2i,
};
@group(0) @binding(0) var source : texture_2d<f32>;
@group(0) @binding(1) var<uniform> params : UploadParams;

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
fn fragmentMain(@builtin(position) position : vec4f) -> @builtin(frag_depth) f32 {
  let dimensions = vec2i(textureDimensions(source));
  let coordinate = clamp(
      vec2i(floor(position.xy)) - params.destinationOffset,
      vec2i(0),
      dimensions - vec2i(1));
  return textureLoad(source, coordinate, 0).r;
}
`,
        });
        const pipeline = this.device.createRenderPipeline({
            label: `depth upload pipeline ${this.gpuFormat}`,
            layout: "auto",
            vertex: { module, entryPoint: "vertexMain" },
            fragment: { module, entryPoint: "fragmentMain", targets: [] },
            primitive: { topology: "triangle-list" },
            depthStencil: {
                format: this.gpuFormat,
                depthWriteEnabled: true,
                depthCompare: "always",
                stencilFront: this.gpuFormat.includes("stencil") ? {
                    compare: "always",
                    failOp: "keep",
                    depthFailOp: "keep",
                    passOp: "keep",
                } : undefined,
                stencilBack: this.gpuFormat.includes("stencil") ? {
                    compare: "always",
                    failOp: "keep",
                    depthFailOp: "keep",
                    passOp: "keep",
                } : undefined,
                stencilWriteMask: this.gpuFormat.includes("stencil") ? 0 : undefined,
            },
        });
        pipelines.set(this.gpuFormat, pipeline);
        return pipeline;
    }

    private initializeDepthStencilTypedImage(
        data: TypedArray,
        target: GLenum,
        mipLevel: GLint,
        width: number,
        height: number,
        layerCount: number,
        format: GLenum,
        type: GLenum,
        unpack: HydPixelUnpackState = DEFAULT_PIXEL_UNPACK_STATE,
        destinationX: number = 0,
        destinationY: number = 0,
        destinationLayer: number = 0,
    ) {
        const bytes = byteView(data);
        const source = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        if (width <= 0 || height <= 0 || layerCount <= 0 || !this.gpuFormat.includes("depth")) return;
        const bytesPerPixel = textureUploadBytesPerPixel(format, type);
        const layout = packedPixelLayout3D(
            width,
            height,
            layerCount,
            bytesPerPixel,
            unpack.alignment,
            unpack.rowLength || 0,
            unpack.imageHeight || 0,
            unpack.skipPixels || 0,
            unpack.skipRows || 0,
            unpack.skipImages || 0,
        );
        if (bytes.byteLength < layout.requiredBytes) {
            throw new Error(`Depth texture upload data is too small: ${bytes.byteLength} bytes`);
        }
        const depths = new Float32Array(width * height * layerCount);
        let firstStencil = 0;
        for (let layer = 0; layer < layerCount; layer++) {
            for (let y = 0; y < height; y++) {
                const sourceY = unpack.flipY ? height - y - 1 : y;
                for (let x = 0; x < width; x++) {
                    const sourceOffset = layout.dataOffset + layer * layout.imageStride +
                        sourceY * layout.rowStride + x * bytesPerPixel;
                    let depth = 0;
                    if (format === WebGL2RenderingContext.DEPTH_COMPONENT) {
                        if (type === WebGL2RenderingContext.FLOAT) {
                            depth = source.getFloat32(sourceOffset, true);
                        } else if (type === WebGL2RenderingContext.UNSIGNED_SHORT) {
                            depth = source.getUint16(sourceOffset, true) / 0xffff;
                        } else {
                            depth = source.getUint32(sourceOffset, true) / 0xffffffff;
                        }
                    } else if (type === WebGL2RenderingContext.FLOAT_32_UNSIGNED_INT_24_8_REV) {
                        depth = source.getFloat32(sourceOffset, true);
                        if (layer === 0 && x === 0 && y === 0) {
                            firstStencil = source.getUint32(sourceOffset + 4, true) & 0xff;
                        }
                    } else {
                        const packed = source.getUint32(sourceOffset, true);
                        depth = (packed >>> 8) / 0xffffff;
                        if (layer === 0 && x === 0 && y === 0) firstStencil = packed & 0xff;
                    }
                    depths[(layer * height + y) * width + x] = Math.min(1, Math.max(0, depth));
                }
            }
        }
        const staging = this.device.createTexture({
            label: `${this.label} depth upload staging`,
            size: { width, height, depthOrArrayLayers: layerCount },
            format: "r32float",
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING,
        });
        this.device.queue.writeTexture(
            { texture: staging },
            depths,
            { bytesPerRow: width * 4, rowsPerImage: height },
            { width, height, depthOrArrayLayers: layerCount },
        );
        const pipeline = this.getDepthUploadPipeline();
        const paramsBuffer = this.device.createBuffer({
            label: `${this.label} depth upload parameters`,
            size: 16,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
        });
        this.device.queue.writeBuffer(
            paramsBuffer,
            0,
            new Int32Array([destinationX, destinationY, 0, 0]),
        );
        const encoder = this.device.createCommandEncoder({ label: `${this.label} depth/stencil upload` });
        for (let layer = 0; layer < layerCount; layer++) {
            const sourceView = staging.createView({
                dimension: "2d",
                baseArrayLayer: layer,
                arrayLayerCount: 1,
            });
            const bindGroup = this.device.createBindGroup({
                layout: pipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: sourceView },
                    { binding: 1, resource: { buffer: paramsBuffer } },
                ],
            });
            const attachment: GPURenderPassDepthStencilAttachment = {
                view: this.getFramebufferView(
                    target,
                    mipLevel,
                    target === WebGL2RenderingContext.TEXTURE_2D_ARRAY ? destinationLayer + layer : undefined,
                ),
                depthLoadOp: "clear",
                depthClearValue: 0,
                depthStoreOp: "store",
                stencilLoadOp: this.gpuFormat.includes("stencil") ? "clear" : undefined,
                stencilClearValue: this.gpuFormat.includes("stencil") ? firstStencil : undefined,
                stencilStoreOp: this.gpuFormat.includes("stencil") ? "store" : undefined,
            };
            const pass = encoder.beginRenderPass({ colorAttachments: [], depthStencilAttachment: attachment });
            pass.setViewport(destinationX, destinationY, width, height, 0, 1);
            pass.setScissorRect(destinationX, destinationY, width, height);
            pass.setPipeline(pipeline);
            pass.setBindGroup(0, bindGroup);
            pass.draw(3);
            pass.end();
        }
        this.device.queue.submit([encoder.finish()]);
        void this.device.queue.onSubmittedWorkDone().then(() => {
            staging.destroy();
            paramsBuffer.destroy();
        });
        this.uniformDepthValue = null;
        if (this.gpuFormat.includes("stencil")) this.uniformStencilValue = null;
    }

    public isCubeCompleteAtLevel(level: number = 0): boolean {
        const faces = CUBE_FACE_TARGETS.map((target) => this.getImageState(target, level));
        const first = faces[0];
        return Boolean(first && first.width > 0 && first.height > 0 && first.width === first.height &&
            faces.every((face) => face && face.width === first.width && face.height === first.height &&
                face.internalFormat === first.internalFormat && face.type === first.type));
    }

    public hasConsistentDefinedMipLevels(): boolean {
        const baseLevel = this.webglParameters.get(WebGL2RenderingContext.TEXTURE_BASE_LEVEL) || 0;
        const base = this.imageStates.get(this.imageKey(baseLevel, 0));
        if (!base) return false;
        for (const image of this.imageStates.values()) {
            if (image.level < baseLevel) continue;
            const levelOffset = image.level - baseLevel;
            const expectedWidth = Math.max(1, base.width >> levelOffset);
            const expectedHeight = Math.max(1, base.height >> levelOffset);
            if (image.width !== expectedWidth || image.height !== expectedHeight ||
                image.internalFormat !== base.internalFormat) {
                return false;
            }
        }
        return true;
    }

    private hasCompleteMipRange(
        viewDimension: GPUTextureViewDimension,
        baseLevel: number,
        lastLevel: number,
        base: HydTextureImageState,
    ): boolean {
        if (lastLevel < baseLevel) return false;
        for (let level = baseLevel; level <= lastLevel; level++) {
            const levelOffset = level - baseLevel;
            const expectedWidth = Math.max(1, base.width >> levelOffset);
            const expectedHeight = Math.max(1, base.height >> levelOffset);
            const expectedDepth = viewDimension === "3d"
                ? Math.max(1, base.depth >> levelOffset)
                : base.depth;
            const layers = viewDimension === "cube"
                ? 6
                : viewDimension === "3d" || viewDimension === "2d-array"
                    ? expectedDepth
                    : 1;
            for (let layer = 0; layer < layers; layer++) {
                const image = this.imageStates.get(this.imageKey(level, layer));
                if (!image || image.width <= 0 || image.height <= 0 || image.depth <= 0 ||
                    image.width !== expectedWidth || image.height !== expectedHeight ||
                    image.depth !== expectedDepth || image.internalFormat !== base.internalFormat ||
                    image.format !== base.format || image.type !== base.type) {
                    return false;
                }
            }
        }
        return true;
    }

    public getSamplingMipRange(
        viewDimension: GPUTextureViewDimension,
        webglVersion: 1 | 2 = 1,
        samplerState?: HydSamplerCompletenessState,
    ): HydTextureMipRange {
        const rawBaseLevel = webglVersion === 2
            ? this.webglParameters.get(WebGL2RenderingContext.TEXTURE_BASE_LEVEL) || 0
            : 0;
        const rawMaxLevel = webglVersion === 2
            ? this.webglParameters.get(WebGL2RenderingContext.TEXTURE_MAX_LEVEL) ?? 1000
            : 1000;
        const immutableLevels = webglVersion === 2 && this.immutableFormat
            ? this.immutableLevels
            : 0;
        const effectiveBaseLevel = immutableLevels > 0
            ? Math.min(rawBaseLevel, Math.max(0, immutableLevels - 1))
            : rawBaseLevel;
        const base = this.imageStates.get(this.imageKey(effectiveBaseLevel, 0)) || null;
        const mipmapped = samplerState?.mipmapped ?? this.state.mipmapped;
        const resolved = resolveWebGlTextureMipRange(
            rawBaseLevel,
            rawMaxLevel,
            immutableLevels,
            base?.width || 1,
            base?.height || 1,
            base?.depth || 1,
            mipmapped,
            viewDimension === "3d",
        );
        const mipmapComplete = Boolean(base && resolved.baseLevel <= resolved.maxLevel &&
            this.hasCompleteMipRange(viewDimension, resolved.baseLevel, resolved.q, base));
        return {
            ...resolved,
            mipmapComplete,
            complete: Boolean(base && resolved.baseLevel <= resolved.maxLevel &&
                (mipmapped ? mipmapComplete : this.hasCompleteMipRange(
                    viewDimension, resolved.baseLevel, resolved.baseLevel, base))),
        };
    }

    public getSamplingCoordinateScale(
        viewDimension: GPUTextureViewDimension,
        webglVersion: 1 | 2 = 1,
        samplerState?: HydSamplerCompletenessState,
    ): [number, number] {
        const range = this.getSamplingMipRange(viewDimension, webglVersion, samplerState);
        const base = this.imageStates.get(this.imageKey(range.baseLevel, 0));
        if (!base) return [1, 1];
        const divisor = Math.pow(2, range.baseLevel);
        const physicalWidth = Math.max(1, Math.floor(this.width / divisor));
        const physicalHeight = Math.max(1, Math.floor(this.height / divisor));
        return resolveSamplerCoordinateScale(
            base.width,
            base.height,
            physicalWidth,
            physicalHeight,
        );
    }

    public isFramebufferAttachmentComplete(
        target: GLenum,
        level: number,
        layer?: number,
    ): boolean {
        const image = this.getImageState(target, level, layer);
        if (!image || image.width <= 0 || image.height <= 0 || image.depth <= 0) return false;
        if (this.immutableFormat) return true;
        const viewDimension = this.bindingTarget === WebGL2RenderingContext.TEXTURE_CUBE_MAP
            ? "cube"
            : this.bindingTarget === WebGL2RenderingContext.TEXTURE_3D
                ? "3d"
                : this.bindingTarget === WebGL2RenderingContext.TEXTURE_2D_ARRAY
                    ? "2d-array"
                    : "2d";
        const range = this.getSamplingMipRange(viewDimension, 2, { mipmapped: true } as HydSamplerCompletenessState);
        if (level < range.baseLevel || level > range.q) return false;
        return level === range.baseLevel || range.mipmapComplete;
    }

    public isSamplingComplete(
        viewDimension: GPUTextureViewDimension,
        webglVersion: 1 | 2 = 1,
        samplerState?: HydSamplerCompletenessState,
    ): boolean {
        const range = this.getSamplingMipRange(viewDimension, webglVersion, samplerState);
        if (!range.complete) return false;
        const base = this.imageStates.get(this.imageKey(range.baseLevel, 0));
        if (!base) return false;
        const samplingClass = this.getBaseLevelSamplingClass(range.baseLevel);
        const filtering = samplerState?.filtering ??
            (this.state.minFilter === "linear" || this.state.magFilter === "linear" ||
                (this.state.mipmapped && this.state.mipmapFilter === "linear"));
        const compareMode = samplerState?.compareMode ??
            this.webglParameters.get(WebGL2RenderingContext.TEXTURE_COMPARE_MODE) ??
            WebGL2RenderingContext.NONE;
        if (filtering && !isWebGlTextureSamplingFilterable(
            samplingClass,
            this.requiresUnfilterableFloatSampling,
            compareMode === WebGL2RenderingContext.COMPARE_REF_TO_TEXTURE,
        )) return false;

        const powerOfTwo = (value: number) => (value & (value - 1)) === 0;
        const mipmapped = samplerState?.mipmapped ?? this.state.mipmapped;
        const wrapS = samplerState?.wrapS ?? this.webglParameters.get(WebGL2RenderingContext.TEXTURE_WRAP_S);
        const wrapT = samplerState?.wrapT ?? this.webglParameters.get(WebGL2RenderingContext.TEXTURE_WRAP_T);
        if (webglVersion === 1 && (!powerOfTwo(base.width) || !powerOfTwo(base.height))) {
            const clamp = WebGL2RenderingContext.CLAMP_TO_EDGE;
            if (mipmapped || wrapS !== clamp || wrapT !== clamp) {
                return false;
            }
        }
        return true;
    }

    public set viewDimension(viewDimension: GPUTextureViewDimension) {
        if (this._viewDimension === viewDimension) {
            return;
        }
        this._viewDimension = viewDimension;
        this._view = null;
        this._sampleViews.clear();
        this._hash = null;
    }

    public get viewDimension(): GPUTextureViewDimension {
        return this._viewDimension;
    }

    public get view(): GPUTextureView {
        if (!this._view) {
            this._view = this.getSampleView(this._viewDimension);
        }
        return this._view;
    }

    public getSampleView(
        viewDimension: GPUTextureViewDimension,
        webglVersion: 1 | 2 = 2,
        samplerState?: HydSamplerCompletenessState,
    ): GPUTextureView {
        const range = this.getSamplingMipRange(viewDimension, webglVersion, samplerState);
        const baseMipLevel = Math.min(this.mipLevelCount - 1, Math.max(0, range.baseLevel));
        const maxMipLevel = Math.min(
            this.mipLevelCount - 1,
            Math.max(baseMipLevel, range.sampledLastLevel),
        );
        const aspect: GPUTextureAspect = this.gpuFormat.includes("depth") && this.gpuFormat.includes("stencil")
            ? "depth-only"
            : "all";
        const viewFormat: GPUTextureFormat = aspect === "depth-only"
            ? this.gpuFormat === "depth32float-stencil8" ? "depth32float" : "depth24plus"
            : this.gpuFormat;
        const key = `${viewDimension}:${aspect}:${baseMipLevel}:${maxMipLevel}`;
        let view = this._sampleViews.get(key);
        if (!view) {
            view = this.texture.createView({
                dimension: viewDimension,
                format: viewFormat,
                aspect,
                baseMipLevel,
                mipLevelCount: Math.max(1, maxMipLevel - baseMipLevel + 1),
                label: "view_" + (HydTexture.__viewCount++) + "@" + this.label,
            });
            this._sampleViews.set(key, view);
        }
        return view;
    }

    public get sampler(): GPUSampler {
        if (!this._sampler) {
            const cube = this._viewDimension === "cube" || this._viewDimension === "cube-array";
            const lodClamps = resolveWebGpuSamplerLodClamps(
                this.webglParameters.get(WebGL2RenderingContext.TEXTURE_MIN_LOD),
                this.webglParameters.get(WebGL2RenderingContext.TEXTURE_MAX_LOD),
            );
            const desc: GPUSamplerDescriptor = {
                minFilter: this.state.minFilter,
                magFilter: this.state.magFilter,
                mipmapFilter: this.state.mipmapFilter,
                addressModeU: cube ? "clamp-to-edge" : this.state.wrapS,
                addressModeV: cube ? "clamp-to-edge" : this.state.wrapT,
                addressModeW: cube ? "clamp-to-edge" : this.state.wrapR,
                ...lodClamps,
                maxAnisotropy: this.state.maxAnisotropy,
                label: "sampler-" + (HydTexture.__samplerCount++),
            }
            // if (this.state.compare) {
            // 注意到compare只是dest，所以这里不加
            //     desc.compare = this.state.compare;
            // }
            this._sampler = this.device.createSampler(desc);
        }
        return this._sampler;
    }

    public samplerForBinding(bindingType: GPUSamplerBindingType): GPUSampler {
        const cube = this._viewDimension === "cube" || this._viewDimension === "cube-array";
        const lodClamps = resolveWebGpuSamplerLodClamps(
            this.webglParameters.get(WebGL2RenderingContext.TEXTURE_MIN_LOD),
            this.webglParameters.get(WebGL2RenderingContext.TEXTURE_MAX_LOD),
        );
        if (bindingType === "comparison") {
            if (!this._comparisonSampler) {
                this._comparisonSampler = this.device.createSampler({
                    minFilter: this.state.minFilter,
                    magFilter: this.state.magFilter,
                    mipmapFilter: this.state.mipmapFilter,
                    addressModeU: cube ? "clamp-to-edge" : this.state.wrapS,
                    addressModeV: cube ? "clamp-to-edge" : this.state.wrapT,
                    addressModeW: cube ? "clamp-to-edge" : this.state.wrapR,
                    ...lodClamps,
                    compare: this.state.compare || "less-equal",
                    label: "sampler-comparison-" + (HydTexture.__samplerCount++),
                });
            }
            return this._comparisonSampler;
        }
        if (bindingType !== "non-filtering") {
            return this.sampler;
        }
        if (!this._nonFilteringSampler) {
            this._nonFilteringSampler = this.device.createSampler({
                minFilter: "nearest",
                magFilter: "nearest",
                mipmapFilter: "nearest",
                addressModeU: cube ? "clamp-to-edge" : this.state.wrapS,
                addressModeV: cube ? "clamp-to-edge" : this.state.wrapT,
                addressModeW: cube ? "clamp-to-edge" : this.state.wrapR,
                ...lodClamps,
                label: "sampler-nonfilter-" + (HydTexture.__samplerCount++),
            });
        }
        return this._nonFilteringSampler;
    }

    public get hash(): string {
        if (!this._view) {
            if (!this._hash) {
                this._hash = this.label + '|' +
                    this.state.minFilter +
                    this.state.mipmapFilter +
                    this.state.mipmapped +
                    this.state.magFilter +
                    this.state.wrapS +
                    this.state.wrapT +
                    this.state.wrapR +
                    this.state.compare +
                    this.state.maxAnisotropy +
                    'uninitialized ' +
                    this._viewDimension +
                    this._textureDescriptor.format +
                    this._textureDescriptor.dimension +
                    this._textureDescriptor.usage +
                    this._textureDescriptor.isDepthStencil +
                    this._textureDescriptor.size.width +
                    this._textureDescriptor.size.height +
                    this._textureDescriptor.size.depthOrArrayLayers +
                    this.sampleCount +
                    this.webglParameters.get(WebGL2RenderingContext.TEXTURE_BASE_LEVEL) +
                    this.webglParameters.get(WebGL2RenderingContext.TEXTURE_MAX_LEVEL) +
                    this.webglParameters.get(WebGL2RenderingContext.TEXTURE_MIN_LOD) +
                    this.webglParameters.get(WebGL2RenderingContext.TEXTURE_MAX_LOD) +
                    this.webglParameters.get(WebGL2RenderingContext.TEXTURE_COMPARE_MODE) +
                    this.imageGeneration;
            }
            return this._hash;
        }
        if (!this._hash) {
            this._hash = this.state.minFilter +
                this.state.mipmapFilter +
                this.state.mipmapped +
                this.state.magFilter +
                this.state.wrapS +
                this.state.wrapT +
                this.state.wrapR +
                this.state.compare +
                this.state.maxAnisotropy +
                this.webglParameters.get(WebGL2RenderingContext.TEXTURE_MIN_LOD) +
                this.webglParameters.get(WebGL2RenderingContext.TEXTURE_MAX_LOD) +
                this.webglParameters.get(WebGL2RenderingContext.TEXTURE_COMPARE_MODE) +
                this.imageGeneration +
                this.view.label;
        }
        return this._hash;
    }
    
    public destroy() {
        if (this._texture) {
            this._texture.destroy();
        }
        this._texture = null;
        this._view = null;
        this._sampleViews.clear();
        this._attachmentViews.clear();
        this._sampler = null;
        this._nonFilteringSampler = null;
        this._comparisonSampler = null;
        this._hash = null;
        HydTexture.isDestroyedTexture = true;
        // for (const [map, key] of this.bindGroupHashes) {
        //     map.delete(key);
        // }
        // this.bindGroupHashes = [];
        for (const callback of this.onDestroy) {
            callback();
        }
        this.onDestroy = [];
    }

    public get texture(): GPUTexture {
        if (this._texture && (
            this._textureDescriptor.size.width !== this._currentTextureDescriptor.size.width
            || this._textureDescriptor.size.height !== this._currentTextureDescriptor.size.height
            || this._textureDescriptor.size.depthOrArrayLayers !== this._currentTextureDescriptor.size.depthOrArrayLayers
            || this._textureDescriptor.format !== this._currentTextureDescriptor.format
            || this._textureDescriptor.dimension !== this._currentTextureDescriptor.dimension
            || this._textureDescriptor.usage !== this._currentTextureDescriptor.usage
            || this._textureDescriptor.mipLevelCount !== this._currentTextureDescriptor.mipLevelCount
            || this.sampleCount !== (this._currentTextureDescriptor.sampleCount || 1)
        )) {
            this.destroy();
        }
        if (!this._texture) {
            this._texture = this.device.createTexture({
                label: this.label,
                size: this._textureDescriptor.size,
                format: this._textureDescriptor.format,
                usage: this._textureDescriptor.usage,
                dimension: this._textureDescriptor.dimension,
                mipLevelCount: this._textureDescriptor.mipLevelCount,
                sampleCount: this.sampleCount,
                viewFormats: this._textureDescriptor.format === "rgba8unorm-srgb"
                    ? ["rgba8unorm"]
                    : undefined,
            });
            this._currentTextureDescriptor = Object.assign({}, this._textureDescriptor);
        }
        return this._texture;
    }
    constructor(device: GPUDevice, ownerToken?: object) {
        this.device = device;
        this.ownerToken = ownerToken;
        this.label = `HydTexture${HydTexture.__total__++}`;
        this.webglParameters.set(WebGL2RenderingContext.TEXTURE_MIN_FILTER, WebGL2RenderingContext.NEAREST_MIPMAP_LINEAR);
        this.webglParameters.set(WebGL2RenderingContext.TEXTURE_MAG_FILTER, WebGL2RenderingContext.LINEAR);
        this.webglParameters.set(WebGL2RenderingContext.TEXTURE_WRAP_S, WebGL2RenderingContext.REPEAT);
        this.webglParameters.set(WebGL2RenderingContext.TEXTURE_WRAP_T, WebGL2RenderingContext.REPEAT);
        this.webglParameters.set(WebGL2RenderingContext.TEXTURE_WRAP_R, WebGL2RenderingContext.REPEAT);
        this.webglParameters.set(WebGL2RenderingContext.TEXTURE_BASE_LEVEL, 0);
        this.webglParameters.set(WebGL2RenderingContext.TEXTURE_MAX_LEVEL, 1000);
        this.webglParameters.set(WebGL2RenderingContext.TEXTURE_MIN_LOD, -1000);
        this.webglParameters.set(WebGL2RenderingContext.TEXTURE_MAX_LOD, 1000);
        this.webglParameters.set(WebGL2RenderingContext.TEXTURE_COMPARE_MODE, WebGL2RenderingContext.NONE);
        this.webglParameters.set(WebGL2RenderingContext.TEXTURE_COMPARE_FUNC, WebGL2RenderingContext.LEQUAL);
    }

    public ensureSampleable(viewDimension: GPUTextureViewDimension = "2d", sampleType: GPUTextureSampleType = "float") {
        if (this.isConfigured) {
            if (!this._viewDimension) {
                this._viewDimension = viewDimension;
            }
            return;
        }
        this._viewDimension = viewDimension;
        const isUint = sampleType === "uint";
        const isSint = sampleType === "sint";
        const isDepth = sampleType === "depth";
        const textureDimension: GPUTextureDimension = viewDimension === "3d" ? "3d" : "2d";
        const layers = viewDimension === "cube" || viewDimension === "cube-array" ? 6 : 1;
        this.configureTexture({
            size: {
                width: 1,
                height: 1,
                depthOrArrayLayers: layers,
            },
            format: isUint ? "rgba32uint" : isSint ? "rgba32sint" : isDepth ? "depth24plus" : "rgba8unorm",
            dimension: textureDimension,
            usage: GPUTextureUsage.TEXTURE_BINDING |
                (isDepth ? GPUTextureUsage.RENDER_ATTACHMENT : GPUTextureUsage.COPY_DST),
            isDepthStencil: isDepth,
        });
        if (isDepth) {
            const encoder = this.device.createCommandEncoder({ label: `${this.label}-initialize-depth` });
            for (let layer = 0; layer < layers; layer++) {
                const view = this.texture.createView({
                    dimension: "2d",
                    aspect: "depth-only",
                    baseArrayLayer: layer,
                    arrayLayerCount: 1,
                });
                encoder.beginRenderPass({
                    colorAttachments: [],
                    depthStencilAttachment: {
                        view,
                        depthClearValue: 0,
                        depthLoadOp: "clear",
                        depthStoreOp: "store",
                    },
                }).end();
            }
            this.device.queue.submit([encoder.finish()]);
            this.sourceOrigin = "uninitialized";
            return;
        }
        const data = isUint
            ? new Uint32Array([0, 0, 0, 1])
            : isSint
                ? new Int32Array([0, 0, 0, 1])
                : new Uint8Array([0, 0, 0, 255]);
        for (let layer = 0; layer < layers; layer++) {
            this.device.queue.writeTexture(
                { texture: this.texture, origin: { x: 0, y: 0, z: layer } },
                data,
                { offset: 0 },
                { width: 1, height: 1, depthOrArrayLayers: 1 },
            );
        }
        this.sourceOrigin = "uninitialized";
    }

    private static getDepthOrArrayLayers(target: GLenum): number {
        if (target === WebGL2RenderingContext.TEXTURE_2D) {
            return 1;
        } else if (target === WebGL2RenderingContext.TEXTURE_CUBE_MAP) {
            return 6;
        } else if (target === WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X
            || target === WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_X
            || target === WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Y
            || target === WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Y
            || target === WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Z
            || target === WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z
        ) {
            return 6;
        } else {
            throw new Error(`Unsupported texture target: ${target}`);
        }
    }

    private static getArrayLayer(target: GLenum): number {
        return targetToOrigin.get(target)?.z || 0;
    }

    public markFramebufferRenderTarget(): boolean {
        if (this.sourceOrigin === "render-target") {
            return false;
        }
        this.sourceOrigin = "render-target";
        this._hash = null;
        return true;
    }

    public markCopyDestination() {
        this.sourceOrigin = "copy";
        this._hash = null;
    }

    private mipmapPipeline(): GPURenderPipeline | null {
        if (!this.gpuFormat || /(?:uint|sint|depth|stencil)/.test(this.gpuFormat)) return null;
        let pipelines = HydTexture.mipmapPipelines.get(this.device);
        if (!pipelines) {
            pipelines = new Map();
            HydTexture.mipmapPipelines.set(this.device, pipelines);
        }
        let pipeline = pipelines.get(this.gpuFormat);
        if (pipeline) return pipeline;
        const unfilterableFloat = this.requiresUnfilterableFloatSampling;
        const module = this.device.createShaderModule({
            label: "HydTexture-mipmap-shader",
            code: unfilterableFloat ? `
struct VertexOutput {
  @builtin(position) position: vec4f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  let positions = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var output: VertexOutput;
  output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
  return output;
}

@group(0) @binding(0) var sourceTexture: texture_2d<f32>;

@fragment
fn fragmentMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let sourceSize = vec2i(textureDimensions(sourceTexture));
  let maximumCoord = sourceSize - vec2i(1);
  let baseCoord = min(vec2i(position.xy) * 2, maximumCoord);
  let horizontalCoord = min(baseCoord + vec2i(1, 0), maximumCoord);
  let verticalCoord = min(baseCoord + vec2i(0, 1), maximumCoord);
  let diagonalCoord = min(baseCoord + vec2i(1, 1), maximumCoord);
  return (textureLoad(sourceTexture, baseCoord, 0) +
    textureLoad(sourceTexture, horizontalCoord, 0) +
    textureLoad(sourceTexture, verticalCoord, 0) +
    textureLoad(sourceTexture, diagonalCoord, 0)) * 0.25;
}
` : `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  let positions = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  let position = positions[vertexIndex];
  var output: VertexOutput;
  output.position = vec4f(position, 0.0, 1.0);
  output.uv = position * vec2f(0.5, -0.5) + vec2f(0.5);
  return output;
}

@group(0) @binding(0) var sourceTexture: texture_2d<f32>;
@group(0) @binding(1) var sourceSampler: sampler;

@fragment
fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
  return textureSampleLevel(sourceTexture, sourceSampler, uv, 0.0);
}
`,
        });
        pipeline = this.device.createRenderPipeline({
            label: `HydTexture-mipmap-pipeline-${this.gpuFormat}`,
            layout: "auto",
            vertex: { module, entryPoint: "vertexMain" },
            fragment: {
                module,
                entryPoint: "fragmentMain",
                targets: [{ format: this.gpuFormat }],
            },
            primitive: { topology: "triangle-list" },
        });
        pipelines.set(this.gpuFormat, pipeline);
        return pipeline;
    }

    public generateMipmap(target: GLenum): boolean {
        const pipeline = this.mipmapPipeline();
        if (!pipeline || !this.isConfigured) return false;
        const baseLevel = this.webglParameters.get(WebGL2RenderingContext.TEXTURE_BASE_LEVEL) || 0;
        const maxLevel = this.webglParameters.get(WebGL2RenderingContext.TEXTURE_MAX_LEVEL) ?? 1000;
        if (baseLevel > maxLevel) return true;
        const base = this.imageStates.get(this.imageKey(baseLevel, 0));
        if (!base || base.width <= 0 || base.height <= 0 || base.depth <= 0) return false;
        const mipDimension = target === WebGL2RenderingContext.TEXTURE_3D
            ? Math.max(base.width, base.height, base.depth)
            : Math.max(base.width, base.height);
        const lastLevel = Math.min(
            this.mipLevelCount - 1,
            maxLevel,
            baseLevel + Math.floor(Math.log2(mipDimension)),
        );
        if (lastLevel <= baseLevel) return true;

        if (target === WebGL2RenderingContext.TEXTURE_3D) {
            for (let level = baseLevel + 1; level <= lastLevel; level++) {
                const levelOffset = level - baseLevel;
                const levelDepth = Math.max(1, base.depth >> levelOffset);
                for (let layer = 0; layer < levelDepth; layer++) {
                    this.defineImageState(
                        target,
                        level,
                        Math.max(1, base.width >> levelOffset),
                        Math.max(1, base.height >> levelOffset),
                        levelDepth,
                        base.internalFormat,
                        base.format,
                        base.type,
                        base.sourceOrigin,
                        layer,
                    );
                }
            }
            this._hash = null;
            return true;
        }

        let sampler: GPUSampler | null = null;
        if (!this.requiresUnfilterableFloatSampling) {
            sampler = HydTexture.mipmapSamplers.get(this.device) || null;
            if (!sampler) {
                sampler = this.device.createSampler({
                    minFilter: "linear",
                    magFilter: "linear",
                    mipmapFilter: "nearest",
                    addressModeU: "clamp-to-edge",
                    addressModeV: "clamp-to-edge",
                    lodMinClamp: 0,
                    lodMaxClamp: 0,
                    label: "HydTexture-mipmap-sampler",
                });
                HydTexture.mipmapSamplers.set(this.device, sampler);
            }
        }
        const layers = target === WebGL2RenderingContext.TEXTURE_CUBE_MAP
            ? 6
            : target === WebGL2RenderingContext.TEXTURE_2D_ARRAY ? base.depth : 1;
        const encoder = this.device.createCommandEncoder({ label: `${this.label}-generateMipmap` });
        for (let layer = 0; layer < layers; layer++) {
            for (let level = baseLevel + 1; level <= lastLevel; level++) {
                const sourceView = this.texture.createView({
                    dimension: "2d",
                    baseMipLevel: level - 1,
                    mipLevelCount: 1,
                    baseArrayLayer: layer,
                    arrayLayerCount: 1,
                });
                const destinationView = this.texture.createView({
                    dimension: "2d",
                    baseMipLevel: level,
                    mipLevelCount: 1,
                    baseArrayLayer: layer,
                    arrayLayerCount: 1,
                });
                const bindGroup = this.device.createBindGroup({
                    layout: pipeline.getBindGroupLayout(0),
                    entries: sampler
                        ? [
                            { binding: 0, resource: sourceView },
                            { binding: 1, resource: sampler },
                        ]
                        : [{ binding: 0, resource: sourceView }],
                });
                const pass = encoder.beginRenderPass({
                    colorAttachments: [{
                        view: destinationView,
                        loadOp: "clear",
                        storeOp: "store",
                        clearValue: { r: 0, g: 0, b: 0, a: 0 },
                    }],
                });
                pass.setPipeline(pipeline);
                pass.setBindGroup(0, bindGroup);
                pass.draw(3);
                pass.end();
            }
        }
        this.device.queue.submit([encoder.finish()]);
        for (let layer = 0; layer < layers; layer++) {
            for (let level = baseLevel + 1; level <= lastLevel; level++) {
                const levelOffset = level - baseLevel;
                this.defineImageState(
                    target,
                    level,
                    Math.max(1, base.width >> levelOffset),
                    Math.max(1, base.height >> levelOffset),
                    target === WebGL2RenderingContext.TEXTURE_2D_ARRAY ? base.depth : 1,
                    base.internalFormat,
                    base.format,
                    base.type,
                    base.sourceOrigin,
                    layer,
                );
            }
        }
        this._hash = null;
        return true;
    }

    public getFramebufferView(target?: GLenum, mipLevel: GLint = 0, layer?: GLint): GPUTextureView {
        const baseMipLevel = mipLevel || 0;
        const baseArrayLayer = layer === undefined ? HydTexture.getArrayLayer(target) : layer;
        const key = `${baseMipLevel}:${baseArrayLayer}`;
        let view = this._attachmentViews.get(key);
        if (!view) {
            const is3d = this.textureDimension === "3d";
            const descriptor: GPUTextureViewDescriptor = {
                dimension: is3d ? "3d" : "2d",
                format: this.gpuFormat,
                baseMipLevel,
                mipLevelCount: 1,
                label: `attachment_view_${HydTexture.__viewCount++}@${this.label}:${key}`,
            };
            if (!is3d) {
                descriptor.baseArrayLayer = baseArrayLayer;
                descriptor.arrayLayerCount = 1;
            }
            view = this.texture.createView(descriptor);
            this._attachmentViews.set(key, view);
        }
        return view;
    }

    public getDepthSampleView(target?: GLenum, mipLevel: GLint = 0, layer?: GLint): GPUTextureView {
        const baseMipLevel = mipLevel || 0;
        const baseArrayLayer = layer === undefined ? HydTexture.getArrayLayer(target) : layer;
        const viewFormat: GPUTextureFormat = this.gpuFormat === "depth32float-stencil8"
            ? "depth32float"
            : this.gpuFormat === "depth24plus-stencil8"
                ? "depth24plus"
                : this.gpuFormat;
        const key = `depth:${baseMipLevel}:${baseArrayLayer}:${viewFormat}`;
        let view = this._sampleViews.get(key);
        if (!view) {
            view = this.texture.createView({
                dimension: "2d",
                format: viewFormat,
                aspect: "depth-only",
                baseMipLevel,
                mipLevelCount: 1,
                baseArrayLayer,
                arrayLayerCount: 1,
                label: `depth_sample_view_${HydTexture.__viewCount++}@${this.label}:${key}`,
            });
            this._sampleViews.set(key, view);
        }
        return view;
    }

    public compressedTexImage2D(
        data: Uint8Array,
        target: GLenum,
        mipLevel: GLint,
        internalformat: GLenum,
        width: GLsizei,
        height: GLsizei,
        gpuFormat: GPUTextureFormat,
        blockBytes: number,
    ) {
        const baseWidth = Math.max(1, width * Math.pow(2, mipLevel));
        const baseHeight = Math.max(1, height * Math.pow(2, mipLevel));
        const physicalBaseWidth = alignTo(baseWidth, 4);
        const physicalBaseHeight = alignTo(baseHeight, 4);
        const mipLevelCount = Math.floor(Math.log2(Math.max(baseWidth, baseHeight))) + 1;
        if (this.isConfigured && this.gpuFormat !== gpuFormat) {
            this.destroy();
            this.imageStates.clear();
            this.residentImages.clear();
        }
        this.configureTexture({
            size: {
                width: physicalBaseWidth,
                height: physicalBaseHeight,
                depthOrArrayLayers: HydTexture.getDepthOrArrayLayers(target),
            },
            mipLevelCount,
            format: gpuFormat,
            dimension: "2d",
            usage: textureUsageForFormat(gpuFormat),
            isDepthStencil: false,
        });
        this.defineImageState(
            target,
            mipLevel,
            width,
            height,
            1,
            internalformat,
            internalformat,
            WebGL2RenderingContext.UNSIGNED_BYTE,
            "typed-upload",
        );
        if (width > 0 && height > 0) {
            const physicalWidth = Math.max(1, physicalBaseWidth >> mipLevel);
            const physicalHeight = Math.max(1, physicalBaseHeight >> mipLevel);
            const prepared = prepareCompressedWrite(
                data, width, height, physicalWidth, physicalHeight, 1, blockBytes);
            this.device.queue.writeTexture(
                {
                    texture: this.texture,
                    mipLevel,
                    origin: targetToOrigin.get(target) || { x: 0, y: 0, z: 0 },
                },
                prepared.data,
                {
                    bytesPerRow: prepared.bytesPerRow,
                    rowsPerImage: prepared.rowsPerImage,
                },
                { width: physicalWidth, height: physicalHeight, depthOrArrayLayers: 1 },
            );
        }
        this.sourceOrigin = "typed-upload";
    }

    public compressedTexSubImage2D(
        data: Uint8Array,
        target: GLenum,
        mipLevel: GLint,
        xoffset: GLint,
        yoffset: GLint,
        width: GLsizei,
        height: GLsizei,
        blockBytes: number,
    ) {
        if (width > 0 && height > 0) {
            const image = this.getImageState(target, mipLevel);
            const physicalLevelWidth = Math.max(1, this.width >> mipLevel);
            const physicalLevelHeight = Math.max(1, this.height >> mipLevel);
            const physicalWidth = image && xoffset + width === image.width
                ? physicalLevelWidth - xoffset
                : width;
            const physicalHeight = image && yoffset + height === image.height
                ? physicalLevelHeight - yoffset
                : height;
            const prepared = prepareCompressedWrite(
                data, width, height, physicalWidth, physicalHeight, 1, blockBytes);
            this.device.queue.writeTexture(
                {
                    texture: this.texture,
                    mipLevel,
                    origin: {
                        x: xoffset,
                        y: yoffset,
                        z: HydTexture.getArrayLayer(target),
                    },
                },
                prepared.data,
                {
                    bytesPerRow: prepared.bytesPerRow,
                    rowsPerImage: prepared.rowsPerImage,
                },
                { width: physicalWidth, height: physicalHeight, depthOrArrayLayers: 1 },
            );
        }
        this.sourceOrigin = "typed-upload";
        this._hash = null;
    }

    public compressedTexImage3D(
        data: Uint8Array,
        target: GLenum,
        mipLevel: GLint,
        internalformat: GLenum,
        width: GLsizei,
        height: GLsizei,
        depth: GLsizei,
        gpuFormat: GPUTextureFormat,
        blockBytes: number,
    ) {
        const baseWidth = Math.max(1, width * Math.pow(2, mipLevel));
        const baseHeight = Math.max(1, height * Math.pow(2, mipLevel));
        const physicalBaseWidth = alignTo(baseWidth, 4);
        const physicalBaseHeight = alignTo(baseHeight, 4);
        const baseDepth = target === WebGL2RenderingContext.TEXTURE_3D
            ? Math.max(1, depth * Math.pow(2, mipLevel))
            : depth;
        const mipLevelCount = Math.floor(Math.log2(Math.max(baseWidth, baseHeight))) + 1;
        if (this.isConfigured && this.gpuFormat !== gpuFormat) {
            this.destroy();
            this.imageStates.clear();
            this.residentImages.clear();
        }
        this.configureTexture({
            size: { width: physicalBaseWidth, height: physicalBaseHeight, depthOrArrayLayers: baseDepth },
            mipLevelCount,
            format: gpuFormat,
            dimension: target === WebGL2RenderingContext.TEXTURE_3D ? "3d" : "2d",
            usage: textureUsageForFormat(gpuFormat),
            isDepthStencil: false,
        });
        for (let layer = 0; layer < Math.max(1, depth); layer++) {
            this.defineImageState(
                target,
                mipLevel,
                width,
                height,
                depth,
                internalformat,
                internalformat,
                WebGL2RenderingContext.UNSIGNED_BYTE,
                "typed-upload",
                layer,
            );
        }
        if (width > 0 && height > 0 && depth > 0) {
            const physicalWidth = Math.max(1, physicalBaseWidth >> mipLevel);
            const physicalHeight = Math.max(1, physicalBaseHeight >> mipLevel);
            const prepared = prepareCompressedWrite(
                data, width, height, physicalWidth, physicalHeight, depth, blockBytes);
            this.device.queue.writeTexture(
                { texture: this.texture, mipLevel },
                prepared.data,
                {
                    bytesPerRow: prepared.bytesPerRow,
                    rowsPerImage: prepared.rowsPerImage,
                },
                { width: physicalWidth, height: physicalHeight, depthOrArrayLayers: depth },
            );
        }
        this.sourceOrigin = "typed-upload";
    }

    public compressedTexSubImage3D(
        data: Uint8Array,
        mipLevel: GLint,
        xoffset: GLint,
        yoffset: GLint,
        zoffset: GLint,
        width: GLsizei,
        height: GLsizei,
        depth: GLsizei,
        blockBytes: number,
    ) {
        if (width > 0 && height > 0 && depth > 0) {
            const image = this.getImageState(WebGL2RenderingContext.TEXTURE_2D_ARRAY, mipLevel, zoffset);
            const physicalLevelWidth = Math.max(1, this.width >> mipLevel);
            const physicalLevelHeight = Math.max(1, this.height >> mipLevel);
            const physicalWidth = image && xoffset + width === image.width
                ? physicalLevelWidth - xoffset
                : width;
            const physicalHeight = image && yoffset + height === image.height
                ? physicalLevelHeight - yoffset
                : height;
            const prepared = prepareCompressedWrite(
                data, width, height, physicalWidth, physicalHeight, depth, blockBytes);
            this.device.queue.writeTexture(
                {
                    texture: this.texture,
                    mipLevel,
                    origin: { x: xoffset, y: yoffset, z: zoffset },
                },
                prepared.data,
                {
                    bytesPerRow: prepared.bytesPerRow,
                    rowsPerImage: prepared.rowsPerImage,
                },
                { width: physicalWidth, height: physicalHeight, depthOrArrayLayers: depth },
            );
        }
        this.sourceOrigin = "typed-upload";
        this._hash = null;
    }

    public texImage2D(
        data: ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap | TypedArray | null,
        target: GLenum,
        mipLevel: GLint,
        internalformat: GLenum,
        width: GLsizei,
        height: GLsizei,
        border: GLint,
        format: GLenum,
        type: GLenum,
        unpack: HydPixelUnpackState = DEFAULT_PIXEL_UNPACK_STATE,
    ) {
        this.label += ' 2D';
        const logicalInternalFormat = internalformat;
        const logicalFormat = format;
        const logicalType = type;
        let uploadData = data;
        let uploadBytesPerRow: number = undefined;
        if (data !== null && "byteLength" in data) {
            const prepared = prepareTypedTextureUpload(data, width, height, internalformat, format, type, unpack);
            uploadData = prepared.data;
            uploadBytesPerRow = prepared.bytesPerRow;
            internalformat = prepared.internalformat;
            format = prepared.format;
            type = prepared.type;
        }

        const inferredBaseWidth = Math.max(1, width * Math.pow(2, mipLevel));
        const inferredBaseHeight = Math.max(1, height * Math.pow(2, mipLevel));
        const gpuFormat = textureFormatLookup(internalformat, format, type);
        const canShareStorage = this.isConfigured && this.gpuFormat === gpuFormat && this.textureDimension === "2d";
        const lowestDefinedLevel = this.imageStates.size > 0
            ? Math.min(...Array.from(this.imageStates.values(), (image) => image.level))
            : Number.POSITIVE_INFINITY;
        const rawBaseLevel = this.webglParameters.get(WebGL2RenderingContext.TEXTURE_BASE_LEVEL) || 0;
        const effectiveBaseLevel = this.immutableFormat
            ? Math.min(rawBaseLevel, Math.max(0, this.immutableLevels - 1))
            : rawBaseLevel;
        const preservesActiveBase = mipLevel < effectiveBaseLevel &&
            Boolean(this.getImageState(target, effectiveBaseLevel));
        const definesStorageAnchor = !canShareStorage ||
            (mipLevel <= lowestDefinedLevel && !preservesActiveBase);
        const reuseCurrentStorage = canShareStorage && !definesStorageAnchor;
        const baseWidth = resolveMutableTextureBaseDimension(
            this.width, width, mipLevel, reuseCurrentStorage, true, this.mipLevelCount);
        const baseHeight = resolveMutableTextureBaseDimension(
            this.height, height, mipLevel, reuseCurrentStorage, true, this.mipLevelCount);
        const requestedMipLevelCount = Math.floor(Math.log2(Math.max(inferredBaseWidth, inferredBaseHeight))) + 1;
        const mipLevelCount = canShareStorage && !definesStorageAnchor
            ? Math.max(this.mipLevelCount, requestedMipLevelCount, mipLevel + 1)
            : requestedMipLevelCount;
        this.configureTexture({
            size: {
                width: baseWidth,
                height: baseHeight,
                depthOrArrayLayers: canShareStorage
                    ? Math.max(Number(this._textureDescriptor.size.depthOrArrayLayers) || 1, HydTexture.getDepthOrArrayLayers(target))
                    : HydTexture.getDepthOrArrayLayers(target),
            },
            mipLevelCount,
            format: gpuFormat,
            dimension: "2d",
            usage: textureUsageForFormat(gpuFormat),
            isDepthStencil: format === WebGL2RenderingContext.DEPTH_COMPONENT ||
                format === WebGL2RenderingContext.DEPTH_STENCIL,
            // sampleType: sampleTypeLookup(internalformat, format, type),
            // viewDimension: this.viewDimension,
        });
        const imageOrigin: HydTextureSourceOrigin = uploadData === null || (uploadData && "byteLength" in uploadData)
            ? "typed-upload"
            : "external-upload";
        this.defineImageState(
            target,
            mipLevel,
            width,
            height,
            1,
            logicalInternalFormat,
            logicalFormat,
            logicalType,
            imageOrigin,
        );
        if (uploadData === null) {
            this.initializeNullImage(target, mipLevel, width, height, logicalInternalFormat);
            this.sourceOrigin = "typed-upload";
            return;
        }
        if (width === 0 || height === 0) {
            this.sourceOrigin = imageOrigin;
            return;
        }
        if (isExternalTextureSource(uploadData)) {
            const preparedExternal = requiresPreparedExternalUpload(
                gpuFormat,
                logicalFormat,
                supportsDirectExternalCopy(uploadData),
            )
                ? prepareExternalTextureUpload(
                    uploadData, width, height, logicalInternalFormat, logicalFormat, logicalType, unpack)
                : null;
            const converted = !preparedExternal &&
                (gpuFormat === "rgba8unorm" || gpuFormat === "rgba8unorm-srgb")
                ? convertExternalTextureSource(uploadData, width, height, logicalFormat, logicalType, unpack)
                : null;
            if ((globalThis as any).__HYD_DEBUG_TEXTURE_UPLOAD) {
                console.debug("[HYD] external texImage2D", JSON.stringify({
                    mipLevel,
                    width,
                    height,
                    gpuFormat,
                    prepared: Boolean(preparedExternal),
                    converted: Boolean(converted),
                }));
            }
            if (preparedExternal) {
                this.device.queue.writeTexture(
                    { texture: this.texture, mipLevel, origin: targetToOrigin.get(target)!! },
                    preparedExternal.data,
                    { offset: 0, bytesPerRow: preparedExternal.bytesPerRow, rowsPerImage: height },
                    [width, height],
                );
            } else if (converted) {
                this.device.queue.writeTexture(
                    { texture: this.texture, mipLevel, origin: targetToOrigin.get(target)!! },
                    converted,
                    { offset: 0, bytesPerRow: width * 4, rowsPerImage: height },
                    [width, height],
                );
            } else {
                this.device.queue.copyExternalImageToTexture(
                    externalCopySource(uploadData as GPUCopyExternalImageSource, width, height, unpack),
                    {
                        texture: this.texture,
                        mipLevel,
                        origin: targetToOrigin.get(target)!!,
                        premultipliedAlpha: unpack.premultiplyAlpha,
                    },
                    [width, height],
                );
            }
            this.sourceOrigin = "external-upload";
        } else if ("byteLength" in uploadData) {
            if (gpuFormat.includes("depth") || gpuFormat.includes("stencil")) {
                this.initializeDepthStencilTypedImage(
                    uploadData as TypedArray,
                    target,
                    mipLevel,
                    width,
                    height,
                    1,
                    logicalFormat,
                    logicalType,
                    { ...DEFAULT_PIXEL_UNPACK_STATE, alignment: 1 },
                );
                this.sourceOrigin = "typed-upload";
                return;
            }
            this.device.queue.writeTexture(
                { texture: this.texture, mipLevel, origin: targetToOrigin.get(target)!! },
                uploadData,
                {
                    offset: 0,
                    bytesPerRow: uploadBytesPerRow,
                    rowsPerImage: height,
                },
                [width, height],
            );
            this.sourceOrigin = "typed-upload";
        }
    }

    public texStorage2D(
        target: GLenum,
        levels: GLsizei,
        internalformat: GLenum,
        width: GLsizei,
        height: GLsizei,
        format: GLenum,
        type: GLenum,
        gpuFormatOverride?: GPUTextureFormat,
    ) {
        const gpuFormat = gpuFormatOverride || textureFormatLookup(internalformat, format, type);
        const physicalWidth = gpuFormatOverride ? alignTo(width, 4) : width;
        const physicalHeight = gpuFormatOverride ? alignTo(height, 4) : height;
        const targets = target === WebGL2RenderingContext.TEXTURE_CUBE_MAP
            ? CUBE_FACE_TARGETS
            : [target];
        this.configureTexture({
            size: {
                width: physicalWidth,
                height: physicalHeight,
                depthOrArrayLayers: HydTexture.getDepthOrArrayLayers(target),
            },
            mipLevelCount: levels,
            format: gpuFormat,
            dimension: "2d",
            usage: textureUsageForFormat(gpuFormat),
            isDepthStencil: format === WebGL2RenderingContext.DEPTH_COMPONENT ||
                format === WebGL2RenderingContext.DEPTH_STENCIL,
        });
        for (let level = 0; level < levels; level++) {
            const levelWidth = Math.max(1, width >> level);
            const levelHeight = Math.max(1, height >> level);
            for (const imageTarget of targets) {
                this.defineImageState(
                    imageTarget,
                    level,
                    levelWidth,
                    levelHeight,
                    1,
                    internalformat,
                    format,
                    type,
                    "typed-upload",
                );
                this.initializeNullImage(imageTarget, level, levelWidth, levelHeight, internalformat);
            }
        }
        this.immutableFormat = true;
        this.immutableLevels = levels;
        this.sourceOrigin = "typed-upload";
        void this.texture;
    }

    public texStorage3D(
        target: GLenum,
        levels: GLsizei,
        internalformat: GLenum,
        width: GLsizei,
        height: GLsizei,
        depth: GLsizei,
        format: GLenum,
        type: GLenum,
        gpuFormatOverride?: GPUTextureFormat,
    ) {
        const gpuFormat = gpuFormatOverride || textureFormatLookup(internalformat, format, type);
        const physicalWidth = gpuFormatOverride ? alignTo(width, 4) : width;
        const physicalHeight = gpuFormatOverride ? alignTo(height, 4) : height;
        const textureDimension: GPUTextureDimension = target === WebGL2RenderingContext.TEXTURE_3D ? "3d" : "2d";
        this.configureTexture({
            size: { width: physicalWidth, height: physicalHeight, depthOrArrayLayers: depth },
            mipLevelCount: levels,
            format: gpuFormat,
            dimension: textureDimension,
            usage: textureUsageForFormat(gpuFormat),
            isDepthStencil: format === WebGL2RenderingContext.DEPTH_COMPONENT ||
                format === WebGL2RenderingContext.DEPTH_STENCIL,
        });
        for (let level = 0; level < levels; level++) {
            const levelWidth = Math.max(1, width >> level);
            const levelHeight = Math.max(1, height >> level);
            const levelDepth = target === WebGL2RenderingContext.TEXTURE_3D
                ? Math.max(1, depth >> level)
                : depth;
            for (let layer = 0; layer < levelDepth; layer++) {
                this.defineImageState(
                    target,
                    level,
                    levelWidth,
                    levelHeight,
                    levelDepth,
                    internalformat,
                    format,
                    type,
                    "typed-upload",
                    layer,
                );
            }
            this.initializeNullImage(
                target,
                level,
                levelWidth,
                levelHeight,
                internalformat,
                levelDepth,
            );
        }
        this.immutableFormat = true;
        this.immutableLevels = levels;
        this.sourceOrigin = "typed-upload";
        void this.texture;
    }

    public texSubImage2D(
        data: ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap | TypedArray | null,
        target: GLenum,
        mipLevel: GLint,
        xoffset: GLint,
        yoffset: GLint,
        width: GLsizei,
        height: GLsizei,
        format: GLenum,
        type: GLenum,
        unpack: HydPixelUnpackState = DEFAULT_PIXEL_UNPACK_STATE,
    ) {
        let uploadData = data;
        let uploadBytesPerRow: number = undefined;
        if (data !== null && "byteLength" in data) {
            const image = this.getImageState(target, mipLevel);
            if (!image) throw new Error("texSubImage2D destination image is undefined");
            const prepared = prepareTypedTextureUpload(
                data, width, height, image.internalFormat, format, type, unpack);
            uploadData = prepared.data;
            uploadBytesPerRow = prepared.bytesPerRow;
            format = prepared.format;
            type = prepared.type;
        }

        const baseOrigin = targetToOrigin.get(target) || { x: 0, y: 0, z: 0 };
        const origin = {
            x: (baseOrigin.x || 0) + xoffset,
            y: (baseOrigin.y || 0) + yoffset,
            z: baseOrigin.z || 0,
        };
        const destination: GPUImageCopyTexture = {
            texture: this.texture,
            mipLevel,
            origin,
        };

        if (width === 0 || height === 0) return;
        if (isExternalTextureSource(uploadData)) {
            const image = this.getImageState(target, mipLevel);
            const preparedExternal = image && requiresPreparedExternalUpload(
                this.gpuFormat,
                format,
                supportsDirectExternalCopy(uploadData),
            )
                ? prepareExternalTextureUpload(
                    uploadData, width, height, image.internalFormat, format, type, unpack)
                : null;
            const converted = !preparedExternal &&
                (this.gpuFormat === "rgba8unorm" || this.gpuFormat === "rgba8unorm-srgb")
                ? convertExternalTextureSource(uploadData, width, height, format, type, unpack)
                : null;
            if (preparedExternal) {
                this.device.queue.writeTexture(
                    destination,
                    preparedExternal.data,
                    { offset: 0, bytesPerRow: preparedExternal.bytesPerRow, rowsPerImage: height },
                    [width, height],
                );
            } else if (converted) {
                this.device.queue.writeTexture(
                    destination,
                    converted,
                    { offset: 0, bytesPerRow: width * 4, rowsPerImage: height },
                    [width, height],
                );
            } else {
                this.device.queue.copyExternalImageToTexture(
                    externalCopySource(uploadData as GPUCopyExternalImageSource, width, height, unpack),
                    { ...destination, premultipliedAlpha: unpack.premultiplyAlpha },
                    [width, height],
                );
            }
            this.sourceOrigin = "external-upload";
        } else if (uploadData && "byteLength" in uploadData) {
            if (this.gpuFormat.includes("depth") || this.gpuFormat.includes("stencil")) {
                this.initializeDepthStencilTypedImage(
                    uploadData as TypedArray,
                    target,
                    mipLevel,
                    width,
                    height,
                    1,
                    format,
                    type,
                    { ...DEFAULT_PIXEL_UNPACK_STATE, alignment: 1 },
                    xoffset,
                    yoffset,
                );
                this.sourceOrigin = "typed-upload";
                return;
            }
            this.device.queue.writeTexture(
                destination,
                uploadData,
                {
                    offset: 0,
                    bytesPerRow: uploadBytesPerRow,
                    rowsPerImage: height,
                },
                [width, height],
            );
            this.sourceOrigin = "typed-upload";
        }
    }

    public texImage3D(
        data: ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap | TypedArray | null,
        target: GLenum,
        mipLevel: GLint,
        internalformat: GLenum,
        width: GLsizei,
        height: GLsizei,
        depth: GLsizei,
        border: GLint,
        format: GLenum,
        type: GLenum,
        offset: GLintptr,
        unpack: HydPixelUnpackState = DEFAULT_PIXEL_UNPACK_STATE,
    ) {
        this.label += ' 3D';
        const logicalInternalFormat = internalformat;
        const logicalFormat = format;
        const logicalType = type;
        const textureDimension: GPUTextureDimension = target === WebGL2RenderingContext.TEXTURE_3D ? "3d" : "2d";
        const inferredBaseWidth = Math.max(1, width * Math.pow(2, mipLevel));
        const inferredBaseHeight = Math.max(1, height * Math.pow(2, mipLevel));
        const inferredBaseDepth = target === WebGL2RenderingContext.TEXTURE_3D
            ? Math.max(1, depth * Math.pow(2, mipLevel))
            : depth;
        const gpuFormat = textureFormatLookup(internalformat, format, type);
        const canShareStorage = this.isConfigured && this.gpuFormat === gpuFormat &&
            this.textureDimension === textureDimension;
        const lowestDefinedLevel = this.imageStates.size > 0
            ? Math.min(...Array.from(this.imageStates.values(), (image) => image.level))
            : Number.POSITIVE_INFINITY;
        const rawBaseLevel = this.webglParameters.get(WebGL2RenderingContext.TEXTURE_BASE_LEVEL) || 0;
        const effectiveBaseLevel = this.immutableFormat
            ? Math.min(rawBaseLevel, Math.max(0, this.immutableLevels - 1))
            : rawBaseLevel;
        const preservesActiveBase = mipLevel < effectiveBaseLevel &&
            Boolean(this.getImageState(target, effectiveBaseLevel));
        const definesStorageAnchor = !canShareStorage ||
            (mipLevel <= lowestDefinedLevel && !preservesActiveBase);
        const reuseCurrentStorage = canShareStorage && !definesStorageAnchor;
        const currentDepth = Number(this._textureDescriptor.size.depthOrArrayLayers) || 1;
        const baseWidth = resolveMutableTextureBaseDimension(
            this.width, width, mipLevel, reuseCurrentStorage, true, this.mipLevelCount);
        const baseHeight = resolveMutableTextureBaseDimension(
            this.height, height, mipLevel, reuseCurrentStorage, true, this.mipLevelCount);
        const baseDepth = resolveMutableTextureBaseDimension(
            currentDepth,
            depth,
            mipLevel,
            reuseCurrentStorage,
            target === WebGL2RenderingContext.TEXTURE_3D,
            this.mipLevelCount,
        );
        const mipDimension = target === WebGL2RenderingContext.TEXTURE_3D
            ? Math.max(inferredBaseWidth, inferredBaseHeight, inferredBaseDepth)
            : Math.max(inferredBaseWidth, inferredBaseHeight);
        const requestedMipLevelCount = Math.floor(Math.log2(mipDimension)) + 1;
        const mipLevelCount = canShareStorage && !definesStorageAnchor
            ? Math.max(this.mipLevelCount, requestedMipLevelCount, mipLevel + 1)
            : requestedMipLevelCount;
        this.configureTexture({
            size: { width: baseWidth, height: baseHeight, depthOrArrayLayers: baseDepth },
            mipLevelCount,
            format: gpuFormat,
            dimension: textureDimension,
            usage: textureUsageForFormat(gpuFormat),
            isDepthStencil: format === WebGL2RenderingContext.DEPTH_COMPONENT ||
                format === WebGL2RenderingContext.DEPTH_STENCIL,
            // sampleType: sampleTypeLookup(internalformat, format, type),
        });
        const imageOrigin: HydTextureSourceOrigin = data === null || (data && "byteLength" in data)
            ? "typed-upload"
            : "external-upload";
        for (let layer = 0; layer < Math.max(1, depth); layer++) {
            this.defineImageState(
                target,
                mipLevel,
                width,
                height,
                depth,
                logicalInternalFormat,
                logicalFormat,
                logicalType,
                imageOrigin,
                layer,
            );
        }
        if (data === null) {
            this.initializeNullImage(target, mipLevel, width, height, logicalInternalFormat, depth);
            this.sourceOrigin = "typed-upload";
            return;
        }
        if ((gpuFormat.includes("depth") || gpuFormat.includes("stencil")) && "byteLength" in data) {
            this.initializeDepthStencilTypedImage(
                data as TypedArray,
                target,
                mipLevel,
                width,
                height,
                depth,
                logicalFormat,
                logicalType,
                unpack,
            );
            this.sourceOrigin = "typed-upload";
            return;
        }

        if (isExternalTextureSource(data)) {
            const prepared = prepareExternalTextureUploadLayers(
                data, width, height, depth, internalformat, format, type, unpack);
            if (!prepared) throw new Error("Unsupported external layered texture upload format");
            this.device.queue.writeTexture(
                { texture: this.texture, mipLevel, origin: targetToOrigin.get(target) || { x: 0, y: 0, z: 0 } },
                prepared.data,
                {
                    offset: 0,
                    bytesPerRow: prepared.bytesPerRow,
                    rowsPerImage: height,
                },
                [width, height, depth],
            );
            this.sourceOrigin = "external-upload";
        } else if ("byteLength" in data) {
            const prepared = prepareTypedTextureUploadLayers(
                data, width, height, depth, internalformat, format, type, unpack);
            this.device.queue.writeTexture(
                { texture: this.texture, mipLevel, origin: targetToOrigin.get(target) || { x: 0, y: 0, z: 0 } },
                prepared.data,
                {
                    offset: 0,
                    bytesPerRow: prepared.bytesPerRow,
                    rowsPerImage: height,
                },
                [width, height, depth],
            );
            this.sourceOrigin = "typed-upload";
        } else if (data instanceof HTMLVideoElement) {
            throw new Error("Not implemented");
        }
    }

    public texSubImage3D(
        data: ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap | TypedArray,
        target: GLenum,
        mipLevel: GLint,
        xoffset: GLint,
        yoffset: GLint,
        zoffset: GLint,
        width: GLsizei,
        height: GLsizei,
        depth: GLsizei,
        format: GLenum,
        type: GLenum,
        unpack: HydPixelUnpackState = DEFAULT_PIXEL_UNPACK_STATE,
    ) {
        const origin = { x: xoffset, y: yoffset, z: zoffset };
        const destination: GPUImageCopyTexture = {
            texture: this.texture,
            mipLevel,
            origin,
        };

        if (isExternalTextureSource(data)) {
            const image = this.getImageState(target, mipLevel, zoffset);
            if (!image) throw new Error("texSubImage3D destination image is undefined");
            const prepared = prepareExternalTextureUploadLayers(
                data, width, height, depth, image.internalFormat, format, type, unpack);
            if (!prepared) throw new Error("Unsupported external layered texture upload format");
            this.device.queue.writeTexture(
                destination,
                prepared.data,
                {
                    offset: 0,
                    bytesPerRow: prepared.bytesPerRow,
                    rowsPerImage: height,
                },
                [width, height, depth],
            );
            this.sourceOrigin = "external-upload";
            return;
        }

        if (data && "byteLength" in data) {
            const image = this.getImageState(target, mipLevel, zoffset);
            if (!image) throw new Error("texSubImage3D destination image is undefined");
            if (this.gpuFormat.includes("depth") || this.gpuFormat.includes("stencil")) {
                this.initializeDepthStencilTypedImage(
                    data as TypedArray,
                    target,
                    mipLevel,
                    width,
                    height,
                    depth,
                    format,
                    type,
                    unpack,
                    xoffset,
                    yoffset,
                    zoffset,
                );
                this.sourceOrigin = "typed-upload";
                return;
            }
            const prepared = prepareTypedTextureUploadLayers(
                data, width, height, depth, image.internalFormat, format, type, unpack);
            this.device.queue.writeTexture(
                destination,
                prepared.data,
                {
                    offset: 0,
                    bytesPerRow: prepared.bytesPerRow,
                    rowsPerImage: height,
                },
                [width, height, depth],
            );
            this.sourceOrigin = "typed-upload";
        }
    }

    public texParameteri(pname: GLenum, param: GLenum) {
        if (pname === WebGL2RenderingContext.TEXTURE_BASE_LEVEL ||
            pname === WebGL2RenderingContext.TEXTURE_MAX_LEVEL) {
            if (this.webglParameters.get(pname) === param) return;
            this.webglParameters.set(pname, param);
            this._view = null;
            this._sampleViews.clear();
            this._sampler = null;
            this._nonFilteringSampler = null;
            this._comparisonSampler = null;
            this._hash = null;
            this.onStorageChange.forEach((callback) => callback());
            return;
        }
        if (pname === WebGL2RenderingContext.TEXTURE_COMPARE_MODE ||
            pname === WebGL2RenderingContext.TEXTURE_COMPARE_FUNC) {
            if (this.webglParameters.get(pname) === param) return;
            this.webglParameters.set(pname, param);
            if (pname === WebGL2RenderingContext.TEXTURE_COMPARE_FUNC) {
                this.state.compare = enumToCompareFunction.get(param);
            }
            this._sampler = null;
            this._nonFilteringSampler = null;
            this._comparisonSampler = null;
            this._hash = null;
            return;
        }
        if (pname === WebGL2RenderingContext.TEXTURE_MIN_LOD ||
            pname === WebGL2RenderingContext.TEXTURE_MAX_LOD) {
            if (this.webglParameters.get(pname) === param) return;
            this.webglParameters.set(pname, param);
            this._sampler = null;
            this._nonFilteringSampler = null;
            this._comparisonSampler = null;
            this._hash = null;
            return;
        }
        console.assert(pnameToString.has(pname) && parameterToString.has(param));
        this.state[pnameToString.get(pname)] = parameterToString.get(param);
        if (pname === WebGL2RenderingContext.TEXTURE_MIN_FILTER) {
            this.state.mipmapFilter = param === WebGL2RenderingContext.LINEAR_MIPMAP_LINEAR ||
                param === WebGL2RenderingContext.NEAREST_MIPMAP_LINEAR
                ? "linear"
                : "nearest";
            this.state.mipmapped = param !== WebGL2RenderingContext.LINEAR &&
                param !== WebGL2RenderingContext.NEAREST;
        }
        this.webglParameters.set(pname, param);
        this._sampler = null;
        this._nonFilteringSampler = null;
        this._comparisonSampler = null;
        this._hash = null;
    }

    public renderbufferStorage(format: GPUTextureFormat, width: number, height: number, sampleCount: number = 1) {
        const sameDescriptor = this._textureDescriptor.format === format &&
            this._textureDescriptor.size.width === width &&
            this._textureDescriptor.size.height === height &&
            this._textureDescriptor.size.depthOrArrayLayers === 1 &&
            this.sampleCount === sampleCount;
        if (sameDescriptor && this._texture) {
            this.destroy();
        }
        this.configureTexture({
            size: { width, height, depthOrArrayLayers: 1 },
            format,
            sampleCount,
            dimension: "2d",
            usage: sampleCount > 1
                ? GPUTextureUsage.RENDER_ATTACHMENT |
                    GPUTextureUsage.COPY_SRC |
                    GPUTextureUsage.COPY_DST |
                    (format === "stencil8" ? 0 : GPUTextureUsage.TEXTURE_BINDING)
                : GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC |
                    GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            isDepthStencil: format.startsWith("depth") || format === "stencil8",
            // viewDimension: "2d", // TODO: force renderbuffer use 2d view!
            // sampleType: 'depth',
        });
        this.uniformDepthValue = format.includes("depth") ? 1 : null;
        this.uniformStencilValue = format.includes("stencil") ? 0 : null;
        if (sameDescriptor) {
            this.onStorageChange.forEach((callback) => callback());
        }
        this.sourceOrigin = "render-target";
        if (width > 0 && height > 0 && typeof this.device.createCommandEncoder === "function") {
            this.initializeRenderbufferStorage();
        }
    }

    private initializeRenderbufferStorage() {
        const encoder = this.device.createCommandEncoder({ label: `${this.label}-initialize-renderbuffer` });
        const view = this.getFramebufferView();
        let passDescriptor: GPURenderPassDescriptor;
        if (this.gpuFormat.includes("depth") || this.gpuFormat.includes("stencil")) {
            const depthStencilAttachment: GPURenderPassDepthStencilAttachment = { view };
            if (this.gpuFormat.includes("depth")) {
                depthStencilAttachment.depthLoadOp = "clear";
                depthStencilAttachment.depthStoreOp = "store";
                depthStencilAttachment.depthClearValue = 1;
            }
            if (this.gpuFormat.includes("stencil")) {
                depthStencilAttachment.stencilLoadOp = "clear";
                depthStencilAttachment.stencilStoreOp = "store";
                depthStencilAttachment.stencilClearValue = 0;
            }
            passDescriptor = { colorAttachments: [], depthStencilAttachment };
        } else {
            passDescriptor = {
                colorAttachments: [{
                    view,
                    loadOp: "clear",
                    storeOp: "store",
                    clearValue: { r: 0, g: 0, b: 0, a: 0 },
                }],
            };
        }
        encoder.beginRenderPass(passDescriptor).end();
        this.device.queue.submit([encoder.finish()]);
    }

    private migrateTextureStorage(descriptor: HydTextureDescriptor): boolean {
        const oldTexture = this._texture;
        if (!oldTexture || this.imageStates.size === 0 ||
            this._textureDescriptor.format !== descriptor.format ||
            this._textureDescriptor.dimension !== descriptor.dimension ||
            this.sampleCount !== (descriptor.sampleCount || 1) ||
            typeof this.device.createCommandEncoder !== "function") {
            return false;
        }
        const oldWidth = Number(this._textureDescriptor.size.width) || 0;
        const oldHeight = Number(this._textureDescriptor.size.height) || 0;
        const oldLayers = Number(this._textureDescriptor.size.depthOrArrayLayers) || 1;
        const oldMipLevels = this._textureDescriptor.mipLevelCount || 1;
        const newWidth = Number(descriptor.size.width) || 0;
        const newHeight = Number(descriptor.size.height) || 0;
        const newLayers = Number(descriptor.size.depthOrArrayLayers) || 1;
        const newMipLevels = descriptor.mipLevelCount || 1;
        if (newWidth <= 0 || newHeight <= 0) return false;

        const replacement = this.device.createTexture({
            label: this.label,
            size: descriptor.size,
            format: descriptor.format,
            usage: descriptor.usage,
            dimension: descriptor.dimension,
            mipLevelCount: descriptor.mipLevelCount,
            viewFormats: descriptor.format === "rgba8unorm-srgb"
                ? ["rgba8unorm"]
                : undefined,
        });
        const encoder = this.device.createCommandEncoder({ label: `${this.label}-migrate-images` });
        const nextResident = new Set<string>();
        const staleArchives: GPUTexture[] = [];
        for (const image of this.imageStates.values()) {
            if (image.width <= 0 || image.height <= 0) continue;
            const key = this.imageKey(image.level, image.layer);
            const oldLevelWidth = Math.max(1, oldWidth >> image.level);
            const oldLevelHeight = Math.max(1, oldHeight >> image.level);
            const oldLevelLayers = this._textureDescriptor.dimension === "3d"
                ? Math.max(1, oldLayers >> image.level)
                : oldLayers;
            const newLevelWidth = Math.max(1, newWidth >> image.level);
            const newLevelHeight = Math.max(1, newHeight >> image.level);
            const newLevelLayers = descriptor.dimension === "3d"
                ? Math.max(1, newLayers >> image.level)
                : newLayers;
            const fitsOld = image.layer < oldLevelLayers && image.level < oldMipLevels &&
                image.width <= oldLevelWidth && image.height <= oldLevelHeight;
            const fitsNew = image.layer < newLevelLayers && image.level < newMipLevels &&
                image.width <= newLevelWidth && image.height <= newLevelHeight;
            if (this.residentImages.has(key) && fitsOld) {
                if (fitsNew) {
                    encoder.copyTextureToTexture(
                        { texture: oldTexture, mipLevel: image.level, origin: { x: 0, y: 0, z: image.layer } },
                        { texture: replacement, mipLevel: image.level, origin: { x: 0, y: 0, z: image.layer } },
                        { width: image.width, height: image.height, depthOrArrayLayers: 1 },
                    );
                    nextResident.add(key);
                } else {
                    const archive = this.device.createTexture({
                        label: `${this.label}-archive-${key}`,
                        size: { width: image.width, height: image.height, depthOrArrayLayers: 1 },
                        format: this._textureDescriptor.format,
                        dimension: "2d",
                        usage: GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
                    });
                    encoder.copyTextureToTexture(
                        { texture: oldTexture, mipLevel: image.level, origin: { x: 0, y: 0, z: image.layer } },
                        { texture: archive },
                        { width: image.width, height: image.height, depthOrArrayLayers: 1 },
                    );
                    const stale = this.archivedImages.get(key);
                    if (stale) staleArchives.push(stale.texture);
                    this.archivedImages.set(key, {
                        texture: archive,
                        width: image.width,
                        height: image.height,
                        format: this._textureDescriptor.format,
                    });
                }
                continue;
            }
            const archive = this.archivedImages.get(key);
            if (archive && archive.format === descriptor.format && fitsNew &&
                archive.width === image.width && archive.height === image.height) {
                encoder.copyTextureToTexture(
                    { texture: archive.texture },
                    { texture: replacement, mipLevel: image.level, origin: { x: 0, y: 0, z: image.layer } },
                    { width: image.width, height: image.height, depthOrArrayLayers: 1 },
                );
                nextResident.add(key);
            }
        }
        this.device.queue.submit([encoder.finish()]);
        for (const stale of staleArchives) stale.destroy();
        oldTexture.destroy();
        this.residentImages.clear();
        for (const key of nextResident) this.residentImages.add(key);
        this._texture = replacement;
        this._currentTextureDescriptor = {
            ...descriptor,
            size: { ...descriptor.size },
        };
        this._view = null;
        this._sampleViews.clear();
        this._attachmentViews.clear();
        this._hash = null;
        HydTexture.isDestroyedTexture = true;
        for (const callback of this.onDestroy) callback();
        this.onDestroy = [];
        return true;
    }

    private configureTexture(descriptor: HydTextureDescriptor) {
        const descriptorChanged =
            this._textureDescriptor.dimension !== descriptor.dimension ||
            this._textureDescriptor.format !== descriptor.format ||
            this._textureDescriptor.usage !== descriptor.usage ||
            this._textureDescriptor.isDepthStencil !== descriptor.isDepthStencil ||
            this._textureDescriptor.size.width !== descriptor.size.width ||
            this._textureDescriptor.size.height !== descriptor.size.height ||
            this._textureDescriptor.size.depthOrArrayLayers !== descriptor.size.depthOrArrayLayers ||
            this._textureDescriptor.mipLevelCount !== descriptor.mipLevelCount ||
            this.sampleCount !== (descriptor.sampleCount || 1);
        if (descriptorChanged && this._texture && !this.migrateTextureStorage(descriptor)) {
            this.destroy();
            this.residentImages.clear();
        }
        this._textureDescriptor.dimension = descriptor.dimension;
        this._textureDescriptor.format = descriptor.format;
        this._textureDescriptor.size = descriptor.size as GPUExtent3DDict;
        this._textureDescriptor.mipLevelCount = descriptor.mipLevelCount;
        this._textureDescriptor.sampleCount = descriptor.sampleCount || 1;
        this._textureDescriptor.usage = descriptor.usage;
        this._textureDescriptor.isDepthStencil = descriptor.isDepthStencil;
        if (descriptorChanged) {
            this._view = null;
            this._sampleViews.clear();
            this._attachmentViews.clear();
            this._hash = null;
            this.sourceOrigin = "uninitialized";
            this.onStorageChange.forEach((callback) => callback());
        }
        // this._textureDescriptor.sampleType = descriptor.sampleType;
        // this._textureDescriptor.viewDimension = descriptor.viewDimension;
    }
}
