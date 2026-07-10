import { HydHashable } from "./base/hydHashable";
import {HydTexture} from "./hydTexture";

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

    public get width(): number {
        return this.attachment.width;
    }

    public get height(): number {
        return this.attachment.height;
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
