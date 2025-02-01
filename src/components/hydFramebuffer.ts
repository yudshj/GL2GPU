import { HydHashable } from "./base/hydHashable";
import {HydTexture} from "./hydTexture";

export class FramebufferAttributes implements HydHashable {
    public attachmentPoint: number;
    public level: number;
    public face: number;
    public attachment: HydTexture;

    constructor(attachmentPoint: number, level: number, face: number, attachment: HydTexture) {
        this.attachmentPoint = attachmentPoint;
        this.level = level;
        this.face = face;
        this.attachment = attachment;
    }

    public get hash(): string {
        return `${this.attachmentPoint}-${this.level}-${this.face}-${this.attachment.hash}`;
    }
}

export class HydFramebuffer implements HydHashable {
    public attachments: Map<GLenum, FramebufferAttributes> = new Map();
    public drawBuffers: GLenum[] = [
        WebGL2RenderingContext.COLOR_ATTACHMENT0
    ];
    // public readBuffer: GLenum = WebGL2RenderingContext.COLOR_ATTACHMENT0;

    private _hash: string = null;

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
            // this._hash += this.readBuffer.toString();
        }
        return this._hash;
    }

    public resetHash() {
        this._hash = null;
    }
}