import { HydHashable } from "./base/hydHashable";
import { HydTexture, HydTextureImageState, isWebGlColorRenderableInternalFormat } from "./hydTexture";

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

    public get format(): GPUTextureFormat {
        return this.attachment.format;
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
        if (image.internalFormat === WebGL2RenderingContext.RGB565 ||
            image.internalFormat === WebGL2RenderingContext.RGBA4 ||
            image.internalFormat === WebGL2RenderingContext.RGB5_A1) return false;
        return image.internalFormat !== WebGL2RenderingContext.RGBA ||
            image.type === WebGL2RenderingContext.UNSIGNED_BYTE;
    }

    public get internalFormat(): GLenum {
        return this.objectType === WebGL2RenderingContext.RENDERBUFFER
            ? this.attachment.renderbufferInternalFormat
            : this.image?.internalFormat || 0;
    }

    public get colorBits(): [number, number, number, number] {
        switch (this.internalFormat) {
            case WebGL2RenderingContext.RGBA4:
                return [4, 4, 4, 4];
            case WebGL2RenderingContext.RGB565:
                return [5, 6, 5, 0];
            case WebGL2RenderingContext.RGB5_A1:
                return [5, 5, 5, 1];
            case WebGL2RenderingContext.RGB:
            case WebGL2RenderingContext.RGB8:
                return [8, 8, 8, 0];
            case WebGL2RenderingContext.RGBA:
            case WebGL2RenderingContext.RGBA8:
                return [8, 8, 8, 8];
            default:
                return this.colorRenderable ? [8, 8, 8, 8] : [0, 0, 0, 0];
        }
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
