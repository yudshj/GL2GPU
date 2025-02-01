import { HydHashable } from "./base/hydHashable";
import TypedArray = NodeJS.TypedArray;

export class HydBuffer implements HydHashable {
    static __total__ = 0;
    private __buffer__: GPUBuffer;
    private device: GPUDevice;
    public descriptor: GPUBufferDescriptor = {
        size: undefined,
        usage: GPUBufferUsage.COPY_DST,
    };

    constructor(device: GPUDevice) {
        this.device = device;
        this.descriptor.label = `buffer ${HydBuffer.__total__++}`;
    }

    public write(data: ArrayBuffer | TypedArray = null, dstOffset: number = 0) {
        if (this.__buffer__ && (this.__buffer__.size !== this.descriptor.size)) {
            this.__buffer__.destroy();
            this.__buffer__ = null;
        }
        if (!this.__buffer__) {
            this.descriptor.label += this.descriptor.size.toString() + this.descriptor.usage.toString();
            this.__buffer__ = this.device.createBuffer(this.descriptor);
        }
        if (data !== null) {
            const secondLength = data.byteLength & 3;
            const firstLength = data.byteLength - secondLength;
            const dataOffset = 'byteOffset' in data ? data.byteOffset : 0;
            if (!(data instanceof ArrayBuffer)) {
                data = data.buffer;
            }
            this.device.queue.writeBuffer(this.__buffer__, dstOffset, data, dataOffset, firstLength);
            if (secondLength > 0) {
                const tmpUint8Array = new Uint8Array(4);
                tmpUint8Array.set(new Uint8Array(data, dataOffset + firstLength, secondLength));
                this.device.queue.writeBuffer(this.__buffer__, dstOffset + firstLength, tmpUint8Array.buffer);
            }
        }
    }

    public get buffer() {
        return this.__buffer__;
    }

    public get hash() {
        return this.__buffer__ ? this.__buffer__.label : this.descriptor.label;
    }
}