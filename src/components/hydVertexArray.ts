import { HydVertexArrayAttribute } from "../types";
import { HydHashable } from "./base/hydHashable";
import { HydBuffer } from "./hydBuffer";


export class HydVertexArray  implements HydHashable {
    private __hash__: string;
    public readonly ownerToken: object;
    public initialized: boolean = false;
    public deleted: boolean = false;
    public attributes: Array<HydVertexArrayAttribute> = [
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
    ];
    public elementArrayBufferBinding: HydBuffer = null;
    constructor(ownerToken?: object) {
        this.ownerToken = ownerToken;
    }
    public get hash(): string {
        let ret = this.elementArrayBufferBinding ? this.elementArrayBufferBinding.hash : 'null';
        for (const attribute of this.attributes) {
            ret += attribute.hash;
        }
        return ret;
    }
}
