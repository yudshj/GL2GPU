import { HydHashable } from "./base/hydHashable";
import type { HydPixelUnpackState } from "./hydGlobalState";
import TypedArray = NodeJS.TypedArray;

interface HydTextureState {
    minFilter: GPUFilterMode;
    magFilter: GPUFilterMode;
    wrapS: GPUAddressMode;
    wrapT: GPUAddressMode;
    wrapR: GPUAddressMode;
    compare?: GPUCompareFunction;  // TODO: 这个Compare应该只是作为destination的时候的compare？例如depth stencil。
    maxAnisotropy: number;
}

interface HydTextureDescriptor {
    size: GPUExtent3DDict,
    format: GPUTextureFormat,
    dimension: GPUTextureDimension,
    usage: GPUTextureUsageFlags,
    isDepthStencil: boolean,
    // sampleType: GPUTextureSampleType,
    // viewDimension: GPUTextureViewDimension,
}

export type HydTextureSourceOrigin = "uninitialized" | "typed-upload" | "external-upload" | "render-target" | "copy";

const DEFAULT_PIXEL_UNPACK_STATE: HydPixelUnpackState = {
    flipY: false,
    alignment: 4,
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

const parameterToString: Map<GLenum, GPUAddressMode | GPUFilterMode> = new Map([
    [WebGL2RenderingContext.LINEAR, "linear"],
    [WebGL2RenderingContext.NEAREST, "nearest"],
    [WebGL2RenderingContext.REPEAT, "repeat"],
    [WebGL2RenderingContext.CLAMP_TO_EDGE, "clamp-to-edge"],
    [WebGL2RenderingContext.MIRRORED_REPEAT, "mirror-repeat"],
    [WebGL2RenderingContext.LINEAR_MIPMAP_LINEAR, "linear"],
]);

const pnameToString: Map<GLenum, string> = new Map([
    [WebGL2RenderingContext.TEXTURE_MIN_FILTER, "minFilter"],
    [WebGL2RenderingContext.TEXTURE_MAG_FILTER, "magFilter"],
    [WebGL2RenderingContext.TEXTURE_WRAP_S, "wrapS"],
    [WebGL2RenderingContext.TEXTURE_WRAP_T, "wrapT"],
    [WebGL2RenderingContext.TEXTURE_WRAP_R, "wrapR"],
]);

function textureFormatLookup(internalFormat: GLenum, format: GLenum, type: GLenum): GPUTextureFormat {
    if ((internalFormat === WebGL2RenderingContext.RGBA || internalFormat === WebGL2RenderingContext.RGBA8) && format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "rgba8unorm";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA && format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.FLOAT) {
        return "rgba32float";
    }
    if (internalFormat === WebGL2RenderingContext.LUMINANCE && format === WebGL2RenderingContext.LUMINANCE && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "r8unorm";
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
    if ((internalFormat === WebGL2RenderingContext.ALPHA && format === WebGL2RenderingContext.ALPHA && type === WebGL2RenderingContext.UNSIGNED_BYTE) ||
        (internalFormat === WebGL2RenderingContext.LUMINANCE_ALPHA && format === WebGL2RenderingContext.LUMINANCE_ALPHA && type === WebGL2RenderingContext.UNSIGNED_BYTE)) {
        return "rgba8unorm";
    }
    throw new Error(`Unsupported texture format: ${internalFormat}, ${format}, ${type}`);
}

function alignTo(value: number, alignment: number): number {
    return Math.ceil(value / alignment) * alignment;
}

function byteView(data: TypedArray): Uint8Array {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

function bytesPerPixel(format: GLenum, type: GLenum): number {
    if (type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        switch (format) {
            case WebGL2RenderingContext.RGBA:
                return 4;
            case WebGL2RenderingContext.RGB:
                return 3;
            case WebGL2RenderingContext.LUMINANCE:
            case WebGL2RenderingContext.ALPHA:
                return 1;
            case WebGL2RenderingContext.LUMINANCE_ALPHA:
                return 2;
        }
    }
    if (format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.FLOAT) {
        return 16;
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

    const tight = width * sourceBytesPerPixel;
    if (byteLength >= tight * height) {
        return tight;
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
    const sourceBytesPerPixel = bytesPerPixel(format, type);
    const sourceBytesPerRow = getSourceBytesPerRow(sourceBytes.byteLength, width, height, sourceBytesPerPixel, unpack.alignment);
    const needsRgbaExpansion =
        type === WebGL2RenderingContext.UNSIGNED_BYTE &&
        (format === WebGL2RenderingContext.RGB ||
            format === WebGL2RenderingContext.LUMINANCE ||
            format === WebGL2RenderingContext.ALPHA ||
            format === WebGL2RenderingContext.LUMINANCE_ALPHA);
    const uploadInternalformat = needsRgbaExpansion ? WebGL2RenderingContext.RGBA : internalformat;
    const uploadFormat = needsRgbaExpansion ? WebGL2RenderingContext.RGBA : format;
    const uploadType = type;
    const destinationBytesPerPixel = needsRgbaExpansion ? 4 : sourceBytesPerPixel;
    const destinationBytesPerRow = width * destinationBytesPerPixel;

    if (!unpack.flipY && !needsRgbaExpansion && sourceBytesPerRow === destinationBytesPerRow) {
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
            continue;
        }

        for (let x = 0; x < width; x++) {
            const src = sourceOffset + x * sourceBytesPerPixel;
            const dst = destinationOffset + x * 4;
            if (format === WebGL2RenderingContext.LUMINANCE) {
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
    private _view: GPUTextureView = null;
    private _attachmentViews: Map<string, GPUTextureView> = new Map();
    private _hash: any;
    public sourceOrigin: HydTextureSourceOrigin = "uninitialized";

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
        magFilter: "linear",
        wrapS: "repeat",
        wrapT: "repeat",
        wrapR: "repeat",
        maxAnisotropy: 1,
    };

    private readonly device: GPUDevice;
    private static __samplerCount: number = 0;
    private static __viewCount: number = 0;

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
                addressModeU: this.state.wrapS,
                addressModeV: this.state.wrapT,
                addressModeW: this.state.wrapR,
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

    public get hash(): string {
        if (!this._view) {
            // 此时还未创建texture
            return this.state.minFilter +
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
            this._textureDescriptor.size.depthOrArrayLayers;
        }
        if (!this._hash) {
            this._hash = this.state.minFilter +
                this.state.magFilter +
                this.state.wrapS +
                this.state.wrapT +
                this.state.wrapR +
                this.state.compare +
                this.state.maxAnisotropy +
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
            });
            this._currentTextureDescriptor = Object.assign({}, this._textureDescriptor);
        }
        return this._texture;
    }
    constructor(device: GPUDevice) {
        this.device = device;
        this.label = `HydTexture${HydTexture.__total__++}`;
    }

    public ensureSampleable(viewDimension: GPUTextureViewDimension = "2d") {
        if (this.isConfigured) {
            if (!this._viewDimension) {
                this._viewDimension = viewDimension;
            }
            return;
        }
        this._viewDimension = viewDimension;
        this.configureTexture({
            size: {
                width: 1,
                height: 1,
                depthOrArrayLayers: viewDimension === "cube" ? 6 : 1,
            },
            format: "rgba8unorm",
            dimension: "2d",
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING,
            isDepthStencil: false,
        });
        const layers = viewDimension === "cube" ? 6 : 1;
        for (let layer = 0; layer < layers; layer++) {
            this.device.queue.writeTexture(
                { texture: this.texture, origin: { x: 0, y: 0, z: layer } },
                new Uint8Array([0, 0, 0, 255]),
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

    public markFramebufferRenderTarget() {
        this.sourceOrigin = "render-target";
        this._hash = null;
    }

    public markCopyDestination() {
        this.sourceOrigin = "copy";
        this._hash = null;
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

        this.configureTexture({
            size: { width, height, depthOrArrayLayers: HydTexture.getDepthOrArrayLayers(target) },
            format: textureFormatLookup(internalformat, format, type),
            dimension: "2d",
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            isDepthStencil: format === WebGL2RenderingContext.DEPTH_COMPONENT,
            // sampleType: sampleTypeLookup(internalformat, format, type),
            // viewDimension: this.viewDimension,
        });
        if (uploadData === null) {
            this.sourceOrigin = "typed-upload";
            return;
        }
        if (uploadData instanceof HTMLImageElement ||
            (typeof ImageBitmap !== "undefined" && uploadData instanceof ImageBitmap) ||
            uploadData instanceof ImageData ||
            uploadData instanceof HTMLCanvasElement ||
            uploadData instanceof HTMLVideoElement ||
            (typeof OffscreenCanvas !== "undefined" && uploadData instanceof OffscreenCanvas)) {
            this.device.queue.copyExternalImageToTexture(
                { source: uploadData, flipY: shouldApplyExternalFlipY(uploadData, unpack) },
                { texture: this.texture, origin: targetToOrigin.get(target)!! },
                [width, height],
            );
            this.sourceOrigin = "external-upload";
        } else if ("byteLength" in uploadData) {
            this.device.queue.writeTexture(
                { texture: this.texture, origin: targetToOrigin.get(target)!! },
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
        data: ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap | TypedArray,
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

        if (uploadData instanceof HTMLImageElement ||
            (typeof ImageBitmap !== "undefined" && uploadData instanceof ImageBitmap) ||
            uploadData instanceof ImageData ||
            uploadData instanceof HTMLCanvasElement ||
            uploadData instanceof HTMLVideoElement ||
            (typeof OffscreenCanvas !== "undefined" && uploadData instanceof OffscreenCanvas)) {
            this.device.queue.copyExternalImageToTexture(
                { source: uploadData, flipY: shouldApplyExternalFlipY(uploadData, unpack) },
                destination,
                [width, height],
            );
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
        this.configureTexture({
            size: { width, height, depthOrArrayLayers: depth },
            format: textureFormatLookup(internalformat, format, type),
            dimension: "3d",
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
            this.device.queue.writeTexture(
                { texture: this.texture },
                data,
                {
                    offset: 0,
                    bytesPerRow: data.byteLength / height,
                    rowsPerImage: height,
                },
                [width, height, depth],
            );
            this.sourceOrigin = "typed-upload";
        } else if (data instanceof HTMLVideoElement) {
            throw new Error("Not implemented");
        }
    }

    public texParameteri(pname: GLenum, param: GLenum) {
        console.assert(pnameToString.has(pname) && parameterToString.has(param));
        this.state[pnameToString.get(pname)] = parameterToString.get(param);
        this._sampler = null;
        this._hash = null;
    }

    public renderbufferStorage(format: GPUTextureFormat, width: number, height: number) {
        this.configureTexture({
            size: { width, height, depthOrArrayLayers: 1 },
            format,
            dimension: "2d",
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            isDepthStencil: format.startsWith("depth") || format === "stencil8",
            // viewDimension: "2d", // TODO: force renderbuffer use 2d view!
            // sampleType: 'depth',
        });
        this.sourceOrigin = "render-target";
    }

    private configureTexture(descriptor: HydTextureDescriptor) {
        const descriptorChanged =
            this._textureDescriptor.dimension !== descriptor.dimension ||
            this._textureDescriptor.format !== descriptor.format ||
            this._textureDescriptor.usage !== descriptor.usage ||
            this._textureDescriptor.isDepthStencil !== descriptor.isDepthStencil ||
            this._textureDescriptor.size.width !== descriptor.size.width ||
            this._textureDescriptor.size.height !== descriptor.size.height ||
            this._textureDescriptor.size.depthOrArrayLayers !== descriptor.size.depthOrArrayLayers;
        if (descriptorChanged && this._texture) {
            this.destroy();
        }
        this._textureDescriptor.dimension = descriptor.dimension;
        this._textureDescriptor.format = descriptor.format;
        this._textureDescriptor.size = descriptor.size as GPUExtent3DDict;
        this._textureDescriptor.usage = descriptor.usage;
        this._textureDescriptor.isDepthStencil = descriptor.isDepthStencil;
        if (descriptorChanged) {
            this._view = null;
            this._attachmentViews.clear();
            this._hash = null;
            this.sourceOrigin = "uninitialized";
        }
        // this._textureDescriptor.sampleType = descriptor.sampleType;
        // this._textureDescriptor.viewDimension = descriptor.viewDimension;
    }
}
