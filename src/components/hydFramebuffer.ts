import { HydHashable } from "./base/hydHashable";
import { HydTexture, HydTextureImageState, isWebGlColorRenderableInternalFormat } from "./hydTexture";

export function webGlReadPixelsCopyLayout(
    sourceHeight: number,
    y: number,
    height: number,
): { sourceY: number, reverseRows: boolean } {
    return {
        sourceY: sourceHeight - y - height,
        reverseRows: true,
    };
}

export function webGlInternalFormatColorBits(internalFormat: GLenum): [number, number, number, number] {
    switch (internalFormat) {
        case WebGL2RenderingContext.R8:
        case WebGL2RenderingContext.R8_SNORM:
        case WebGL2RenderingContext.R8UI:
        case WebGL2RenderingContext.R8I:
            return [8, 0, 0, 0];
        case WebGL2RenderingContext.R16F:
        case WebGL2RenderingContext.R16UI:
        case WebGL2RenderingContext.R16I:
            return [16, 0, 0, 0];
        case WebGL2RenderingContext.R32F:
        case WebGL2RenderingContext.R32UI:
        case WebGL2RenderingContext.R32I:
            return [32, 0, 0, 0];
        case WebGL2RenderingContext.RG8:
        case WebGL2RenderingContext.RG8_SNORM:
        case WebGL2RenderingContext.RG8UI:
        case WebGL2RenderingContext.RG8I:
            return [8, 8, 0, 0];
        case WebGL2RenderingContext.RG16F:
        case WebGL2RenderingContext.RG16UI:
        case WebGL2RenderingContext.RG16I:
            return [16, 16, 0, 0];
        case WebGL2RenderingContext.RG32F:
        case WebGL2RenderingContext.RG32UI:
        case WebGL2RenderingContext.RG32I:
            return [32, 32, 0, 0];
        case WebGL2RenderingContext.RGB8:
        case WebGL2RenderingContext.SRGB8:
        case WebGL2RenderingContext.RGB8_SNORM:
        case WebGL2RenderingContext.RGB8UI:
        case WebGL2RenderingContext.RGB8I:
            return [8, 8, 8, 0];
        case WebGL2RenderingContext.RGB16F:
        case WebGL2RenderingContext.RGB16UI:
        case WebGL2RenderingContext.RGB16I:
            return [16, 16, 16, 0];
        case WebGL2RenderingContext.RGB32F:
        case WebGL2RenderingContext.RGB32UI:
        case WebGL2RenderingContext.RGB32I:
            return [32, 32, 32, 0];
        case WebGL2RenderingContext.RGBA8:
        case WebGL2RenderingContext.SRGB8_ALPHA8:
        case WebGL2RenderingContext.RGBA8_SNORM:
        case WebGL2RenderingContext.RGBA8UI:
        case WebGL2RenderingContext.RGBA8I:
            return [8, 8, 8, 8];
        case WebGL2RenderingContext.RGBA16F:
        case WebGL2RenderingContext.RGBA16UI:
        case WebGL2RenderingContext.RGBA16I:
            return [16, 16, 16, 16];
        case WebGL2RenderingContext.RGBA32F:
        case WebGL2RenderingContext.RGBA32UI:
        case WebGL2RenderingContext.RGBA32I:
            return [32, 32, 32, 32];
        case WebGL2RenderingContext.RGBA4:
            return [4, 4, 4, 4];
        case WebGL2RenderingContext.RGB565:
            return [5, 6, 5, 0];
        case WebGL2RenderingContext.RGB5_A1:
            return [5, 5, 5, 1];
        case WebGL2RenderingContext.RGB10_A2:
        case WebGL2RenderingContext.RGB10_A2UI:
            return [10, 10, 10, 2];
        case WebGL2RenderingContext.R11F_G11F_B10F:
            return [11, 11, 10, 0];
        case WebGL2RenderingContext.RGB9_E5:
            return [9, 9, 9, 0];
        case WebGL2RenderingContext.ALPHA:
            return [0, 0, 0, 8];
        case WebGL2RenderingContext.LUMINANCE:
        case WebGL2RenderingContext.RGB:
            return [8, 8, 8, 0];
        case WebGL2RenderingContext.LUMINANCE_ALPHA:
        case WebGL2RenderingContext.RGBA:
            return [8, 8, 8, 8];
        default:
            return [0, 0, 0, 0];
    }
}

export class FramebufferAttributes implements HydHashable {
    public attachmentPoint: number;
    public level: number;
    public face: number;
    public layer: number;
    public attachment: HydTexture;
    public objectType: GLenum;

    constructor(attachmentPoint: number, level: number, face: number, attachment: HydTexture, layer?: number, objectType: GLenum = WebGL2RenderingContext.TEXTURE) {
        this.attachmentPoint = attachmentPoint;
        this.level = level;
        this.face = face;
        this.layer = layer;
        this.attachment = attachment;
        this.objectType = objectType;
    }

    public get hash(): string {
        return `${this.attachmentPoint}-${this.level}-${this.face}-${this.layer}-${this.objectType}-${this.attachment.hash}`;
    }

    public get view(): GPUTextureView {
        return this.attachment.getFramebufferView(this.face, this.level, this.layer);
    }

    public get depthSlice(): number | undefined {
        return this.attachment.textureDimension === "3d" ? (this.layer || 0) : undefined;
    }

    public get format(): GPUTextureFormat {
        return this.attachment.gpuFormat;
    }

    public get image(): HydTextureImageState | null {
        if (this.objectType !== WebGL2RenderingContext.TEXTURE) return null;
        return this.attachment.getImageState(this.face, this.level || 0, this.layer);
    }

    public get isCubeFace(): boolean {
        return this.face >= WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X &&
            this.face <= WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z;
    }

    public get colorRenderable(): boolean {
        if (this.objectType === WebGL2RenderingContext.RENDERBUFFER) {
            return !this.format?.includes("depth") && !this.format?.includes("stencil");
        }
        const image = this.image;
        if (!image || !isWebGlColorRenderableInternalFormat(image.internalFormat)) return false;
        return image.internalFormat !== WebGL2RenderingContext.RGBA ||
            image.type === WebGL2RenderingContext.UNSIGNED_BYTE ||
            image.type === WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4 ||
            image.type === WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1;
    }

    public get internalFormat(): GLenum {
        return this.objectType === WebGL2RenderingContext.RENDERBUFFER
            ? this.attachment.renderbufferInternalFormat
            : this.image?.internalFormat || 0;
    }

    public get colorBits(): [number, number, number, number] {
        if (this.image?.effectiveColorBits) return this.image.effectiveColorBits;
        const bits = webGlInternalFormatColorBits(this.internalFormat);
        return bits.some(Boolean) ? bits : this.colorRenderable ? [8, 8, 8, 8] : bits;
    }

    public get depthBits(): number {
        if (this.format?.includes("depth16")) return 16;
        if (this.format?.includes("depth32")) return 32;
        return this.format?.includes("depth") ? 24 : 0;
    }

    public get stencilBits(): number {
        return this.format?.includes("stencil") ? 8 : 0;
    }

    public get width(): number {
        return this.image?.width ?? (this.objectType === WebGL2RenderingContext.RENDERBUFFER ? this.attachment.width : 0);
    }

    public get height(): number {
        return this.image?.height ?? (this.objectType === WebGL2RenderingContext.RENDERBUFFER ? this.attachment.height : 0);
    }

    public get sampleCount(): number {
        return this.attachment.sampleCount;
    }
}

export class HydFramebuffer implements HydHashable {
    public readonly ownerToken: object;
    public initialized: boolean = false;
    public deleted: boolean = false;
    public attachments: Map<GLenum, FramebufferAttributes> = new Map();
    public drawBuffers: GLenum[] = [
        WebGL2RenderingContext.COLOR_ATTACHMENT0
    ];
    public readBuffer: GLenum = WebGL2RenderingContext.COLOR_ATTACHMENT0;

    private _hash: string = null;

    constructor(ownerToken?: object) {
        this.ownerToken = ownerToken;
    }

    public get hash(): string {
        if (!this._hash) {
            this._hash = '';
            // for (const [key, value] of this.attachments) {
            // for sorted
            const sortedKeys = Array.from(this.attachments.keys()).sort();
            for (const key of sortedKeys) {
                const value: FramebufferAttributes = this.attachments.get(key);
                this._hash += key.toString() + '-' + value.hash.toString() + '|';
            }
            for (const drawBuffer of this.drawBuffers) {
                this._hash += drawBuffer.toString() + '|';
            }
            this._hash += this.readBuffer.toString();
        }
        return this._hash;
    }

    public resetHash() {
        this._hash = null;
    }
}
