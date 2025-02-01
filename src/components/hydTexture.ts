import { HydHashable } from "./base/hydHashable";
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
    if (internalFormat === WebGL2RenderingContext.RGBA && format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "rgba8unorm";
    }
    if (internalFormat === WebGL2RenderingContext.LUMINANCE && format === WebGL2RenderingContext.LUMINANCE && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "r8unorm";
    }
    if (internalFormat === WebGL2RenderingContext.DEPTH_COMPONENT32F && format === WebGL2RenderingContext.DEPTH_COMPONENT && type === WebGL2RenderingContext.FLOAT) {
        return "depth32float";
    }
    if (internalFormat === WebGL2RenderingContext.RGB && format === WebGL2RenderingContext.RGB && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "rgba8unorm";
    }
    throw new Error(`Unsupported texture format: ${internalFormat}, ${format}, ${type}`);
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
    private _hash: any;

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

    public get format(): GPUTextureFormat {
        return this._textureDescriptor.format;
    }

    public set viewDimension(viewDimension: GPUTextureViewDimension) {
        this._viewDimension = viewDimension;
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
        this._texture.destroy();
        this._texture = null;
        this._view = null;
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

    private static getDepthOrArrayLayers(target: GLenum): number {
        if (target === WebGL2RenderingContext.TEXTURE_2D) {
            return 1;
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

    public texImage2D(
        data: ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap | TypedArray,
        target: GLenum,
        mipLevel: GLint,
        internalformat: GLenum,
        width: GLsizei,
        height: GLsizei,
        border: GLint,
        format: GLenum,
        type: GLenum,
    ) {
        this.label += ' 2D';
        if (internalformat === WebGL2RenderingContext.LUMINANCE && format === WebGL2RenderingContext.LUMINANCE && type === WebGL2RenderingContext.UNSIGNED_BYTE && "byteLength" in data) {
            /* 特殊处理 LUMINANCE，可能会影响性能！ */
            console.warn("LUMINANCE texture is not supported, fallback to RGBA texture");
            internalformat = WebGL2RenderingContext.RGBA;
            format = WebGL2RenderingContext.RGBA;
            type = WebGL2RenderingContext.UNSIGNED_BYTE;
            const originBuffer = data.buffer;
            const newBuffer = new Uint8Array(originBuffer.byteLength * 4);
            for (let i = 0; i < originBuffer.byteLength; i++) {
                for (let j = 0; j < 3; j++) {
                    newBuffer[i * 4 + j] = data[i] as number;
                }
                newBuffer[i * 4 + 3] = 255;
            }
            data = newBuffer;
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
        if (data === null) {
            return;
        }
        if (data instanceof HTMLImageElement) {
            createImageBitmap(data).then((bitmap) => {
                this.device.queue.copyExternalImageToTexture(
                    { source: bitmap },
                    { texture: this.texture, origin: targetToOrigin.get(target)!! },
                    [width, height],
                );
            });
        } else if (data instanceof ImageBitmap ||
            data instanceof HTMLCanvasElement ||
            data instanceof OffscreenCanvas) {
            this.device.queue.copyExternalImageToTexture(
                { source: data },
                { texture: this.texture, origin: targetToOrigin.get(target)!! },
                [width, height],
            );
        } else if (data instanceof ImageData) {
            this.device.queue.writeTexture(
                { texture: this.texture, origin: targetToOrigin.get(target)!! },
                data.data,
                {
                    offset: 0,
                    bytesPerRow: data.data.length / height,
                    rowsPerImage: height,
                },
                [width, height],
            );
        } else if ("byteLength" in data) {
            this.device.queue.writeTexture(
                { texture: this.texture, origin: targetToOrigin.get(target)!! },
                data,
                {
                    offset: 0,
                    bytesPerRow: data.byteLength / height,
                    rowsPerImage: height,
                },
                [width, height],
            );
        } else if (data instanceof HTMLVideoElement) {
            throw new Error("Not implemented");
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
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING,
            isDepthStencil: format === WebGL2RenderingContext.DEPTH_COMPONENT,
            // sampleType: sampleTypeLookup(internalformat, format, type),
        });
        if (data === null) return;

        if (data instanceof HTMLImageElement) {
            createImageBitmap(data).then((bitmap) => {
                this.device.queue.copyExternalImageToTexture(
                    { source: bitmap },
                    { texture: this.texture },
                    [width, height, depth],
                );
            });
        } else if (data instanceof ImageBitmap ||
            data instanceof HTMLCanvasElement ||
            data instanceof OffscreenCanvas) {
            this.device.queue.copyExternalImageToTexture(
                { source: data },
                { texture: this.texture },
                [width, height, depth],
            );
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
        } else if (data instanceof HTMLVideoElement) {
            throw new Error("Not implemented");
        }
    }

    public texParameteri(pname: GLenum, param: GLenum) {
        console.assert(pnameToString.has(pname) && parameterToString.has(param));
        this.state[pnameToString.get(pname)] = parameterToString.get(param);
    }

    public renderbufferStorage(format: GPUTextureFormat, width: number, height: number) {
        this.configureTexture({
            size: { width, height, depthOrArrayLayers: 1 },
            format,
            dimension: "2d",
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            isDepthStencil: true,
            // viewDimension: "2d", // TODO: force renderbuffer use 2d view!
            // sampleType: 'depth',
        });
    }

    private configureTexture(descriptor: HydTextureDescriptor) {
        this._textureDescriptor.dimension = descriptor.dimension;
        this._textureDescriptor.format = descriptor.format;
        this._textureDescriptor.size = descriptor.size as GPUExtent3DDict;
        this._textureDescriptor.usage = descriptor.usage;
        this._textureDescriptor.isDepthStencil = descriptor.isDepthStencil;
        // this._textureDescriptor.sampleType = descriptor.sampleType;
        // this._textureDescriptor.viewDimension = descriptor.viewDimension;
    }
}