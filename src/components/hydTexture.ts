import { HydHashable } from "./base/hydHashable";
import type { HydPixelUnpackState } from "./hydGlobalState";
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
varying vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_position * 0.5 + 0.5;
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
    if (!texture || !vertexBuffer || position < 0) return null;
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
    return { canvas, gl, texture, program, position, vertexBuffer };
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
    const { canvas, gl, texture, program, position, vertexBuffer } = converter;
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
    sourceOrigin: HydTextureSourceOrigin;
    generation: number;
}

const DEFAULT_PIXEL_UNPACK_STATE: HydPixelUnpackState = {
    flipY: false,
    alignment: 4,
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
        case WebGL2RenderingContext.RGBA8UI:
        case WebGL2RenderingContext.RGBA16UI:
        case WebGL2RenderingContext.RGBA32UI:
        case WebGL2RenderingContext.RGBA32I:
        case WebGL2RenderingContext.RGBA32F:
        case WebGL2RenderingContext.RG32UI:
        case WebGL2RenderingContext.R32UI:
        case WebGL2RenderingContext.RG32F:
        case WebGL2RenderingContext.R32F:
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
    if (internalFormat === WebGL2RenderingContext.RGBA8UI && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "rgba8uint";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA16UI && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.UNSIGNED_SHORT) {
        return "rgba16uint";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA32UI && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT) {
        return "rgba32uint";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA32I && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.INT) {
        return "rgba32sint";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA32F && format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.FLOAT) {
        return "rgba32float";
    }
    if (internalFormat === WebGL2RenderingContext.RG32UI && format === WebGL2RenderingContext.RG_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT) {
        return "rg32uint";
    }
    if (internalFormat === WebGL2RenderingContext.R32UI && format === WebGL2RenderingContext.RED_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT) {
        return "r32uint";
    }
    if (internalFormat === WebGL2RenderingContext.RG32F && format === WebGL2RenderingContext.RG && type === WebGL2RenderingContext.FLOAT) {
        return "rg32float";
    }
    if (internalFormat === WebGL2RenderingContext.R32F && format === WebGL2RenderingContext.RED && type === WebGL2RenderingContext.FLOAT) {
        return "r32float";
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
    if (internalFormat === WebGL2RenderingContext.RGB && format === WebGL2RenderingContext.RGB &&
        type === WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5) {
        return "rgba8unorm";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA && format === WebGL2RenderingContext.RGBA &&
        (type === WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4 ||
            type === WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1)) {
        return "rgba8unorm";
    }
    if ((internalFormat === WebGL2RenderingContext.ALPHA && format === WebGL2RenderingContext.ALPHA && type === WebGL2RenderingContext.UNSIGNED_BYTE) ||
        (internalFormat === WebGL2RenderingContext.LUMINANCE_ALPHA && format === WebGL2RenderingContext.LUMINANCE_ALPHA && type === WebGL2RenderingContext.UNSIGNED_BYTE)) {
        return "rgba8unorm";
    }
    throw new Error(`Unsupported texture format: ${internalFormat}, ${format}, ${type}`);
}

function alignTo(value: number, alignment: number): number {
    return Math.ceil(value / alignment) * alignment;
}

export interface PackedPixelLayout {
    rowBytes: number;
    rowStride: number;
    requiredBytes: number;
}

export function packedPixelLayout(
    width: number,
    height: number,
    bytesPerPixel: number,
    alignment: number,
): PackedPixelLayout {
    const rowBytes = width * bytesPerPixel;
    const rowStride = alignTo(rowBytes, alignment);
    return {
        rowBytes,
        rowStride,
        requiredBytes: width === 0 || height === 0 ? 0 : rowStride * (height - 1) + rowBytes,
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
            case WebGL2RenderingContext.RG:
                return 8;
            case WebGL2RenderingContext.RED:
                return 4;
        }
    }
    if (format === WebGL2RenderingContext.RGBA_INTEGER) {
        switch (type) {
            case WebGL2RenderingContext.UNSIGNED_BYTE:
                return 4;
            case WebGL2RenderingContext.UNSIGNED_SHORT:
                return 8;
            case WebGL2RenderingContext.UNSIGNED_INT:
            case WebGL2RenderingContext.INT:
                return 16;
        }
    }
    if (format === WebGL2RenderingContext.RG_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT) {
        return 8;
    }
    if (format === WebGL2RenderingContext.RED_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT) {
        return 4;
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
    throw new Error(`Unsupported texture upload format: ${format}, ${type}`);
}

function getSourceBytesPerRow(byteLength: number, width: number, height: number, sourceBytesPerPixel: number, alignment: number): number {
    const aligned = alignTo(width * sourceBytesPerPixel, alignment);
    const minimumRequired = aligned * (height - 1) + width * sourceBytesPerPixel;
    if (byteLength >= minimumRequired) {
        return aligned;
    }
    throw new Error(`Texture upload data is too small: ${byteLength} bytes for ${width}x${height}`);
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
    const sourceBytesPerRow = getSourceBytesPerRow(sourceBytes.byteLength, width, height, sourceBytesPerPixel, unpack.alignment);
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
    const preserveSrgbFormat = internalformat === GL_SRGB_EXT || internalformat === GL_SRGB_ALPHA_EXT;
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
        const sourceOffset = sourceY * sourceBytesPerRow;
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
    private _view: GPUTextureView = null;
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
    public renderbufferInternalFormat: GLenum = 0;
    public renderbufferSamples: number = 0;
    public readonly webglParameters: Map<GLenum, GLenum> = new Map();
    private static __samplerCount: number = 0;
    private static __viewCount: number = 0;
    private static readonly mipmapPipelines = new WeakMap<GPUDevice, Map<GPUTextureFormat, GPURenderPipeline>>();
    private static readonly mipmapSamplers = new WeakMap<GPUDevice, GPUSampler>();

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

    public get format(): GPUTextureFormat {
        return this._textureDescriptor.format;
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

    private imageKey(level: number, layer: number): string {
        return `${level}:${layer}`;
    }

    public getImageState(target: GLenum, level: number = 0, layer?: number): HydTextureImageState | null {
        const imageLayer = layer === undefined ? HydTexture.getArrayLayer(target) : layer;
        return this.imageStates.get(this.imageKey(level, imageLayer)) || null;
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

    private initializeNullImage(target: GLenum, level: number, width: number, height: number, internalFormat: GLenum) {
        if (width <= 0 || height <= 0 ||
            (this.format !== "rgba8unorm" && this.format !== "rgba8unorm-srgb")) return;
        const pixels = new Uint8Array(width * height * 4);
        if (internalFormat === WebGL2RenderingContext.RGB ||
            internalFormat === GL_SRGB_EXT ||
            internalFormat === WebGL2RenderingContext.LUMINANCE) {
            for (let offset = 3; offset < pixels.length; offset += 4) pixels[offset] = 255;
        }
        this.device.queue.writeTexture(
            {
                texture: this.texture,
                mipLevel: level,
                origin: targetToOrigin.get(target) || { x: 0, y: 0, z: 0 },
            },
            pixels,
            { bytesPerRow: width * 4, rowsPerImage: height },
            { width, height, depthOrArrayLayers: 1 },
        );
    }

    public isCubeCompleteAtLevel(level: number = 0): boolean {
        const faces = CUBE_FACE_TARGETS.map((target) => this.getImageState(target, level));
        const first = faces[0];
        return Boolean(first && first.width > 0 && first.height > 0 && first.width === first.height &&
            faces.every((face) => face && face.width === first.width && face.height === first.height &&
                face.internalFormat === first.internalFormat && face.type === first.type));
    }

    public isSamplingComplete(viewDimension: GPUTextureViewDimension, webglVersion: 1 | 2 = 1): boolean {
        const layers = viewDimension === "cube" ? 6 : 1;
        const baseImages = Array.from({ length: layers }, (_, layer) =>
            this.imageStates.get(this.imageKey(0, layer)) || null);
        const base = baseImages[0];
        if (!base || base.width <= 0 || base.height <= 0) return false;
        if (viewDimension === "cube" && !this.isCubeCompleteAtLevel(0)) return false;

        const powerOfTwo = (value: number) => (value & (value - 1)) === 0;
        if (webglVersion === 1 && (!powerOfTwo(base.width) || !powerOfTwo(base.height))) {
            const clamp = WebGL2RenderingContext.CLAMP_TO_EDGE;
            if (this.state.mipmapped ||
                this.webglParameters.get(WebGL2RenderingContext.TEXTURE_WRAP_S) !== clamp ||
                this.webglParameters.get(WebGL2RenderingContext.TEXTURE_WRAP_T) !== clamp) {
                return false;
            }
        }
        if (!this.state.mipmapped) return true;

        const requiredLevels = Math.floor(Math.log2(Math.max(base.width, base.height))) + 1;
        for (let level = 1; level < requiredLevels; level++) {
            const expectedWidth = Math.max(1, base.width >> level);
            const expectedHeight = Math.max(1, base.height >> level);
            for (let layer = 0; layer < layers; layer++) {
                const image = this.imageStates.get(this.imageKey(level, layer));
                if (!image || image.width !== expectedWidth || image.height !== expectedHeight ||
                    image.internalFormat !== base.internalFormat || image.type !== base.type) {
                    return false;
                }
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
        this._hash = null;
    }

    public get viewDimension(): GPUTextureViewDimension {
        return this._viewDimension;
    }

    public get view(): GPUTextureView {
        if (!this._view) {
            this._view = this.texture.createView({
                dimension: this._viewDimension,
                format: this.format,
                label: "view_" + (HydTexture.__viewCount++) + "@" + this.label,
            });
        }
        return this._view;
    }

    public get sampler(): GPUSampler {
        if (!this._sampler) {
            const desc: GPUSamplerDescriptor = {
                minFilter: this.state.minFilter,
                magFilter: this.state.magFilter,
                mipmapFilter: this.state.mipmapFilter,
                addressModeU: this.state.wrapS,
                addressModeV: this.state.wrapT,
                addressModeW: this.state.wrapR,
                maxAnisotropy: this.state.maxAnisotropy,
                label: "sampler-" + (HydTexture.__samplerCount++),
            }
            if (!this.state.mipmapped) {
                desc.lodMinClamp = 0;
                desc.lodMaxClamp = 0;
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
        if (bindingType !== "non-filtering") {
            return this.sampler;
        }
        if (!this._nonFilteringSampler) {
            this._nonFilteringSampler = this.device.createSampler({
                minFilter: "nearest",
                magFilter: "nearest",
                mipmapFilter: "nearest",
                ...(!this.state.mipmapped ? { lodMinClamp: 0, lodMaxClamp: 0 } : {}),
                addressModeU: this.state.wrapS,
                addressModeV: this.state.wrapT,
                addressModeW: this.state.wrapR,
                label: "sampler-nonfilter-" + (HydTexture.__samplerCount++),
            });
        }
        return this._nonFilteringSampler;
    }

    public get hash(): string {
        if (!this._view) {
            // 此时还未创建texture
            return this.label + '|' +
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
            this.imageGeneration;
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
        this._attachmentViews.clear();
        this._sampler = null;
        this._nonFilteringSampler = null;
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
        this.configureTexture({
            size: {
                width: 1,
                height: 1,
                depthOrArrayLayers: viewDimension === "cube" ? 6 : 1,
            },
            format: isUint ? "rgba32uint" : isSint ? "rgba32sint" : "rgba8unorm",
            dimension: "2d",
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING,
            isDepthStencil: false,
        });
        const layers = viewDimension === "cube" ? 6 : 1;
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
                [1, 1],
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
        if (!this.format || /(?:uint|sint|depth|stencil)/.test(this.format)) return null;
        let pipelines = HydTexture.mipmapPipelines.get(this.device);
        if (!pipelines) {
            pipelines = new Map();
            HydTexture.mipmapPipelines.set(this.device, pipelines);
        }
        let pipeline = pipelines.get(this.format);
        if (pipeline) return pipeline;
        const module = this.device.createShaderModule({
            label: "HydTexture-mipmap-shader",
            code: `
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
            label: `HydTexture-mipmap-pipeline-${this.format}`,
            layout: "auto",
            vertex: { module, entryPoint: "vertexMain" },
            fragment: {
                module,
                entryPoint: "fragmentMain",
                targets: [{ format: this.format }],
            },
            primitive: { topology: "triangle-list" },
        });
        pipelines.set(this.format, pipeline);
        return pipeline;
    }

    public generateMipmap(target: GLenum): boolean {
        const pipeline = this.mipmapPipeline();
        if (!pipeline || this.mipLevelCount <= 1 || !this.isConfigured) return Boolean(pipeline);
        let sampler = HydTexture.mipmapSamplers.get(this.device);
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
        const layers = target === WebGL2RenderingContext.TEXTURE_CUBE_MAP ? 6 : 1;
        const encoder = this.device.createCommandEncoder({ label: `${this.label}-generateMipmap` });
        for (let layer = 0; layer < layers; layer++) {
            for (let level = 1; level < this.mipLevelCount; level++) {
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
                    entries: [
                        { binding: 0, resource: sourceView },
                        { binding: 1, resource: sampler },
                    ],
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
        const base = this.imageStates.get(this.imageKey(0, 0));
        if (base) {
            for (let layer = 0; layer < layers; layer++) {
                for (let level = 1; level < this.mipLevelCount; level++) {
                    this.defineImageState(
                        target,
                        level,
                        Math.max(1, base.width >> level),
                        Math.max(1, base.height >> level),
                        1,
                        base.internalFormat,
                        base.format,
                        base.type,
                        base.sourceOrigin,
                        layer,
                    );
                }
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
            view = this.texture.createView({
                dimension: "2d",
                format: this.format,
                baseMipLevel,
                mipLevelCount: 1,
                baseArrayLayer,
                arrayLayerCount: 1,
                label: `attachment_view_${HydTexture.__viewCount++}@${this.label}:${key}`,
            });
            this._attachmentViews.set(key, view);
        }
        return view;
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

        const baseWidth = Math.max(1, width * Math.pow(2, mipLevel));
        const baseHeight = Math.max(1, height * Math.pow(2, mipLevel));
        const mipLevelCount = Math.floor(Math.log2(Math.max(baseWidth, baseHeight))) + 1;
        const gpuFormat = textureFormatLookup(internalformat, format, type);
        this.configureTexture({
            size: { width: baseWidth, height: baseHeight, depthOrArrayLayers: HydTexture.getDepthOrArrayLayers(target) },
            mipLevelCount,
            format: gpuFormat,
            dimension: "2d",
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            isDepthStencil: format === WebGL2RenderingContext.DEPTH_COMPONENT,
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
            const converted = gpuFormat === "rgba8unorm" || gpuFormat === "rgba8unorm-srgb"
                ? convertExternalTextureSource(uploadData, width, height, logicalFormat, logicalType, unpack)
                : null;
            if ((globalThis as any).__HYD_DEBUG_TEXTURE_UPLOAD) {
                console.debug("[HYD] external texImage2D", JSON.stringify({
                    mipLevel,
                    width,
                    height,
                    gpuFormat,
                    converted: Boolean(converted),
                }));
            }
            if (converted) {
                this.device.queue.writeTexture(
                    { texture: this.texture, mipLevel, origin: targetToOrigin.get(target)!! },
                    converted,
                    { offset: 0, bytesPerRow: width * 4, rowsPerImage: height },
                    [width, height],
                );
            } else {
                this.device.queue.copyExternalImageToTexture(
                    { source: uploadData as GPUCopyExternalImageSource, flipY: shouldApplyExternalFlipY(uploadData as GPUCopyExternalImageSource, unpack) },
                    { texture: this.texture, mipLevel, origin: targetToOrigin.get(target)!! },
                    [width, height],
                );
            }
            this.sourceOrigin = "external-upload";
        } else if ("byteLength" in uploadData) {
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
            const prepared = prepareTypedTextureUpload(data, width, height, format, format, type, unpack);
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
            const converted = this.format === "rgba8unorm" || this.format === "rgba8unorm-srgb"
                ? convertExternalTextureSource(uploadData, width, height, format, type, unpack)
                : null;
            if (converted) {
                this.device.queue.writeTexture(
                    destination,
                    converted,
                    { offset: 0, bytesPerRow: width * 4, rowsPerImage: height },
                    [width, height],
                );
            } else {
                this.device.queue.copyExternalImageToTexture(
                    { source: uploadData as GPUCopyExternalImageSource, flipY: shouldApplyExternalFlipY(uploadData as GPUCopyExternalImageSource, unpack) },
                    destination,
                    [width, height],
                );
            }
            this.sourceOrigin = "external-upload";
        } else if (uploadData && "byteLength" in uploadData) {
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
        data: ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap | TypedArray,
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
    ) {
        this.label += ' 3D';
        const textureDimension: GPUTextureDimension = target === WebGL2RenderingContext.TEXTURE_3D ? "3d" : "2d";
        this.configureTexture({
            size: { width, height, depthOrArrayLayers: depth },
            format: textureFormatLookup(internalformat, format, type),
            dimension: textureDimension,
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            isDepthStencil: format === WebGL2RenderingContext.DEPTH_COMPONENT,
            // sampleType: sampleTypeLookup(internalformat, format, type),
        });
        if (data === null) {
            this.sourceOrigin = "typed-upload";
            return;
        }

        if (data instanceof HTMLImageElement) {
            createImageBitmap(data).then((bitmap) => {
                this.device.queue.copyExternalImageToTexture(
                    { source: bitmap },
                    { texture: this.texture },
                    [width, height, depth],
                );
            });
            this.sourceOrigin = "external-upload";
        } else if (data instanceof ImageBitmap ||
            data instanceof HTMLCanvasElement ||
            data instanceof OffscreenCanvas) {
            this.device.queue.copyExternalImageToTexture(
                { source: data },
                { texture: this.texture },
                [width, height, depth],
            );
            this.sourceOrigin = "external-upload";
        } else if (data instanceof ImageData) {
            this.device.queue.writeTexture(
                { texture: this.texture },
                data.data,
                {
                    offset: 0,
                    bytesPerRow: data.data.length / height,
                    rowsPerImage: height,
                },
                [width, height, depth],
            );
            this.sourceOrigin = "external-upload";
        } else if ("byteLength" in data) {
            const bytesPerRow = width * textureUploadBytesPerPixel(format, type);
            this.device.queue.writeTexture(
                { texture: this.texture },
                data,
                {
                    offset: 0,
                    bytesPerRow,
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

        if (data instanceof ImageData) {
            this.device.queue.writeTexture(
                destination,
                data.data,
                {
                    offset: 0,
                    bytesPerRow: data.data.length / height,
                    rowsPerImage: height,
                },
                [width, height, depth],
            );
            this.sourceOrigin = "external-upload";
            return;
        }

        if (data instanceof HTMLImageElement ||
            (typeof ImageBitmap !== "undefined" && data instanceof ImageBitmap) ||
            data instanceof HTMLCanvasElement ||
            data instanceof HTMLVideoElement ||
            (typeof OffscreenCanvas !== "undefined" && data instanceof OffscreenCanvas)) {
            this.device.queue.copyExternalImageToTexture(
                { source: data, flipY: shouldApplyExternalFlipY(data, unpack) },
                destination,
                [width, height, depth],
            );
            this.sourceOrigin = "external-upload";
            return;
        }

        if (data && "byteLength" in data) {
            const bytesPerRow = width * textureUploadBytesPerPixel(format, type);
            this.device.queue.writeTexture(
                destination,
                data,
                {
                    offset: 0,
                    bytesPerRow,
                    rowsPerImage: height,
                },
                [width, height, depth],
            );
            this.sourceOrigin = "typed-upload";
        }
    }

    public texParameteri(pname: GLenum, param: GLenum) {
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
        this._hash = null;
    }

    public renderbufferStorage(format: GPUTextureFormat, width: number, height: number) {
        const sameDescriptor = this._textureDescriptor.format === format &&
            this._textureDescriptor.size.width === width &&
            this._textureDescriptor.size.height === height &&
            this._textureDescriptor.size.depthOrArrayLayers === 1;
        if (sameDescriptor && this._texture) {
            this.destroy();
        }
        this.configureTexture({
            size: { width, height, depthOrArrayLayers: 1 },
            format,
            dimension: "2d",
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            isDepthStencil: format.startsWith("depth") || format === "stencil8",
            // viewDimension: "2d", // TODO: force renderbuffer use 2d view!
            // sampleType: 'depth',
        });
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
        if (this.format.includes("depth") || this.format.includes("stencil")) {
            const depthStencilAttachment: GPURenderPassDepthStencilAttachment = { view };
            if (this.format.includes("depth")) {
                depthStencilAttachment.depthLoadOp = "clear";
                depthStencilAttachment.depthStoreOp = "store";
                depthStencilAttachment.depthClearValue = 1;
            }
            if (this.format.includes("stencil")) {
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
            const newLevelWidth = Math.max(1, newWidth >> image.level);
            const newLevelHeight = Math.max(1, newHeight >> image.level);
            const fitsOld = image.layer < oldLayers && image.level < oldMipLevels &&
                image.width <= oldLevelWidth && image.height <= oldLevelHeight;
            const fitsNew = image.layer < newLayers && image.level < newMipLevels &&
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
            this._textureDescriptor.mipLevelCount !== descriptor.mipLevelCount;
        if (descriptorChanged && this._texture && !this.migrateTextureStorage(descriptor)) {
            this.destroy();
            this.residentImages.clear();
        }
        this._textureDescriptor.dimension = descriptor.dimension;
        this._textureDescriptor.format = descriptor.format;
        this._textureDescriptor.size = descriptor.size as GPUExtent3DDict;
        this._textureDescriptor.mipLevelCount = descriptor.mipLevelCount;
        this._textureDescriptor.usage = descriptor.usage;
        this._textureDescriptor.isDepthStencil = descriptor.isDepthStencil;
        if (descriptorChanged) {
            this._view = null;
            this._attachmentViews.clear();
            this._hash = null;
            this.sourceOrigin = "uninitialized";
            this.onStorageChange.forEach((callback) => callback());
        }
        // this._textureDescriptor.sampleType = descriptor.sampleType;
        // this._textureDescriptor.viewDimension = descriptor.viewDimension;
    }
}
