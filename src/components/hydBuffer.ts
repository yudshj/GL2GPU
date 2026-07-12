import { HydHashable } from "./base/hydHashable";

export interface HydExpandedIndexBuffer {
    buffer: GPUBuffer;
    indexCount: number;
    format: GPUIndexFormat;
}

export interface HydConvertedVertexBuffer {
    buffer: GPUBuffer;
    format: GPUVertexFormat;
    arrayStride: number;
    key: string;
}

export interface HydDivisorVertexBuffer {
    buffer: GPUBuffer;
    key: string;
}

export class HydBuffer implements HydHashable {
    static __total__ = 0;
    private __buffer__: GPUBuffer;
    private device: GPUDevice;
    public readonly ownerToken: object;
    public initialized: boolean = false;
    public deleted: boolean = false;
    public webglSize: number = 0;
    public webglUsage: GLenum = 0x88E4;
    public bindingKind: "element-array" | "other" | null = null;
    public descriptor: GPUBufferDescriptor = {
        size: undefined,
        usage: GPUBufferUsage.COPY_DST,
    };
    public shadowData: Uint8Array = new Uint8Array(0);
    private writeVersion: number = 0;
    private uint16IndexBuffer: GPUBuffer = null;
    private uint16IndexBufferVersion: number = -1;
    private readonly indexRangeMaxCache: Map<string, number> = new Map();
    private readonly expandedIndexBuffers: Map<string, HydExpandedIndexBuffer> = new Map();
    private readonly convertedVertexBuffers: Map<string, HydConvertedVertexBuffer> = new Map();
    private readonly divisorVertexBuffers: Map<string, HydDivisorVertexBuffer> = new Map();
    private lastMaxIndexType: GLenum = 0;
    private lastMaxIndexOffset: number = -1;
    private lastMaxIndexCount: number = -1;
    private lastMaxIndexValue: number = -1;

    constructor(device: GPUDevice, ownerToken?: object) {
        this.device = device;
        this.ownerToken = ownerToken;
        this.descriptor.label = `buffer ${HydBuffer.__total__++}`;
    }

    private invalidateIndexCaches() {
        this.uint16IndexBuffer?.destroy();
        this.uint16IndexBuffer = null;
        this.uint16IndexBufferVersion = -1;
        for (const expanded of this.expandedIndexBuffers.values()) {
            expanded.buffer.destroy();
        }
        for (const converted of this.convertedVertexBuffers.values()) {
            converted.buffer.destroy();
        }
        for (const expanded of this.divisorVertexBuffers.values()) {
            expanded.buffer.destroy();
        }
        this.expandedIndexBuffers.clear();
        this.convertedVertexBuffers.clear();
        this.divisorVertexBuffers.clear();
        this.indexRangeMaxCache.clear();
        this.lastMaxIndexCount = -1;
    }

    public write(data: ArrayBufferLike | ArrayBufferView = null, dstOffset: number = 0) {
        this.writeVersion++;
        this.invalidateIndexCaches();
        if (this.__buffer__ && (this.__buffer__.size !== this.descriptor.size)) {
            this.__buffer__.destroy();
            this.__buffer__ = null;
        }
        if (!this.__buffer__) {
            this.descriptor.label += this.descriptor.size.toString() + this.descriptor.usage.toString();
            this.__buffer__ = this.device.createBuffer(this.descriptor);
        }
        if (this.shadowData.byteLength !== this.descriptor.size) {
            this.shadowData = new Uint8Array(this.descriptor.size);
        } else if (data === null) {
            this.shadowData.fill(0);
        }
        if (data !== null) {
            const source = ArrayBuffer.isView(data)
                ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
                : new Uint8Array(data);
            this.shadowData.set(source, dstOffset);
            if (source.byteLength > 0) {
                const alignedStart = dstOffset & ~3;
                const alignedEnd = (dstOffset + source.byteLength + 3) & ~3;
                this.device.queue.writeBuffer(
                    this.__buffer__,
                    alignedStart,
                    this.shadowData.buffer,
                    this.shadowData.byteOffset + alignedStart,
                    alignedEnd - alignedStart,
                );
            }
        }
    }

    public get version(): number {
        return this.writeVersion;
    }

    public get hasConvertedVertexBuffers(): boolean {
        return this.convertedVertexBuffers.size > 0 || this.divisorVertexBuffers.size > 0;
    }

    private readIndex(type: GLenum, byteOffset: number): number {
        if (type === WebGL2RenderingContext.UNSIGNED_BYTE) {
            return this.shadowData[byteOffset];
        }
        const view = new DataView(this.shadowData.buffer, this.shadowData.byteOffset, this.shadowData.byteLength);
        if (type === WebGL2RenderingContext.UNSIGNED_SHORT) {
            return view.getUint16(byteOffset, true);
        }
        return view.getUint32(byteOffset, true);
    }

    public maxIndex(type: GLenum, byteOffset: number, count: number): number {
        if (count <= 0) return -1;
        if (this.lastMaxIndexType === type &&
            this.lastMaxIndexOffset === byteOffset &&
            this.lastMaxIndexCount === count) {
            return this.lastMaxIndexValue;
        }
        const key = `${type}:${byteOffset}:${count}`;
        const cached = this.indexRangeMaxCache.get(key);
        if (cached !== undefined) {
            this.lastMaxIndexType = type;
            this.lastMaxIndexOffset = byteOffset;
            this.lastMaxIndexCount = count;
            this.lastMaxIndexValue = cached;
            return cached;
        }
        const indexSize = type === WebGL2RenderingContext.UNSIGNED_BYTE ? 1 :
            type === WebGL2RenderingContext.UNSIGNED_SHORT ? 2 : 4;
        let max = -1;
        for (let i = 0; i < count; i++) {
            max = Math.max(max, this.readIndex(type, byteOffset + i * indexSize));
        }
        this.indexRangeMaxCache.set(key, max);
        this.lastMaxIndexType = type;
        this.lastMaxIndexOffset = byteOffset;
        this.lastMaxIndexCount = count;
        this.lastMaxIndexValue = max;
        return max;
    }

    public getExpandedIndexBuffer(
        mode: GLenum,
        type: GLenum,
        byteOffset: number,
        count: number,
    ): HydExpandedIndexBuffer {
        const key = `${mode}:${type}:${byteOffset}:${count}`;
        const cached = this.expandedIndexBuffers.get(key);
        if (cached) return cached;

        let indices: Uint32Array;
        if (mode === WebGL2RenderingContext.TRIANGLE_FAN) {
            indices = new Uint32Array(Math.max(0, count - 2) * 3);
            if (count >= 3) {
                const first = this.readIndex(type, byteOffset);
                for (let i = 0; i < count - 2; i++) {
                    indices[i * 3] = first;
                    indices[i * 3 + 1] = this.readIndex(type, byteOffset + (i + 1) * (type === WebGL2RenderingContext.UNSIGNED_BYTE ? 1 : type === WebGL2RenderingContext.UNSIGNED_SHORT ? 2 : 4));
                    indices[i * 3 + 2] = this.readIndex(type, byteOffset + (i + 2) * (type === WebGL2RenderingContext.UNSIGNED_BYTE ? 1 : type === WebGL2RenderingContext.UNSIGNED_SHORT ? 2 : 4));
                }
            }
        } else {
            indices = new Uint32Array(count >= 2 ? count * 2 : 0);
            if (count >= 2) {
                const indexSize = type === WebGL2RenderingContext.UNSIGNED_BYTE ? 1 : type === WebGL2RenderingContext.UNSIGNED_SHORT ? 2 : 4;
                const first = this.readIndex(type, byteOffset);
                let previous = first;
                for (let i = 1; i < count; i++) {
                    const current = this.readIndex(type, byteOffset + i * indexSize);
                    indices[(i - 1) * 2] = previous;
                    indices[(i - 1) * 2 + 1] = current;
                    previous = current;
                }
                indices[(count - 1) * 2] = previous;
                indices[(count - 1) * 2 + 1] = first;
            }
        }
        const buffer = this.device.createBuffer({
            label: `${this.descriptor.label} expanded-${mode}-${type}-${byteOffset}-${count}-v${this.writeVersion}`,
            size: Math.max(4, indices.byteLength),
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        if (indices.byteLength > 0) {
            this.device.queue.writeBuffer(buffer, 0, indices.buffer, indices.byteOffset, indices.byteLength);
        }
        const expanded = { buffer, indexCount: indices.length, format: "uint32" as GPUIndexFormat };
        this.expandedIndexBuffers.set(key, expanded);
        return expanded;
    }

    private vertexComponent(view: DataView, type: GLenum, byteOffset: number, normalized: boolean): number {
        switch (type) {
            case WebGL2RenderingContext.BYTE: {
                const value = view.getInt8(byteOffset);
                return normalized ? Math.max(value / 127, -1) : value;
            }
            case WebGL2RenderingContext.UNSIGNED_BYTE: {
                const value = view.getUint8(byteOffset);
                return normalized ? value / 255 : value;
            }
            case WebGL2RenderingContext.SHORT: {
                const value = view.getInt16(byteOffset, true);
                return normalized ? Math.max(value / 32767, -1) : value;
            }
            case WebGL2RenderingContext.UNSIGNED_SHORT: {
                const value = view.getUint16(byteOffset, true);
                return normalized ? value / 65535 : value;
            }
            case WebGL2RenderingContext.INT:
                return view.getInt32(byteOffset, true);
            case WebGL2RenderingContext.UNSIGNED_INT:
                return view.getUint32(byteOffset, true);
            case WebGL2RenderingContext.HALF_FLOAT: {
                const bits = view.getUint16(byteOffset, true);
                const sign = bits & 0x8000 ? -1 : 1;
                const exponent = (bits >>> 10) & 0x1f;
                const fraction = bits & 0x03ff;
                if (exponent === 0) return sign * Math.pow(2, -14) * (fraction / 1024);
                if (exponent === 0x1f) return fraction ? NaN : sign * Infinity;
                return sign * Math.pow(2, exponent - 15) * (1 + fraction / 1024);
            }
            default:
                return view.getFloat32(byteOffset, true);
        }
    }

    public getFloatVertexBuffer(
        type: GLenum,
        size: number,
        normalized: boolean,
        webglStride: number,
        offset: number,
        divisor: number = 1,
    ): HydConvertedVertexBuffer {
        const key = `${type}:${size}:${normalized ? 1 : 0}:${webglStride}:${offset}:d${divisor}`;
        const cached = this.convertedVertexBuffers.get(key);
        if (cached) return cached;
        const componentBytes = type === WebGL2RenderingContext.BYTE || type === WebGL2RenderingContext.UNSIGNED_BYTE ? 1 :
            type === WebGL2RenderingContext.SHORT || type === WebGL2RenderingContext.UNSIGNED_SHORT || type === WebGL2RenderingContext.HALF_FLOAT ? 2 : 4;
        const elementBytes = size * componentBytes;
        const sourceStride = webglStride || elementBytes;
        const elementCount = this.webglSize < offset + elementBytes
            ? 0
            : Math.floor((this.webglSize - offset - elementBytes) / sourceStride) + 1;
        const repeatCount = Math.max(1, divisor);
        const values = new Float32Array(elementCount * repeatCount * size);
        const sourceView = new DataView(this.shadowData.buffer, this.shadowData.byteOffset, this.shadowData.byteLength);
        for (let element = 0; element < elementCount; element++) {
            const sourceBase = offset + element * sourceStride;
            for (let component = 0; component < size; component++) {
                const value = this.vertexComponent(sourceView, type, sourceBase + component * componentBytes, normalized);
                for (let repeat = 0; repeat < repeatCount; repeat++) {
                    values[(element * repeatCount + repeat) * size + component] = value;
                }
            }
        }
        const format = (["float32", "float32x2", "float32x3", "float32x4"] as GPUVertexFormat[])[size - 1];
        const arrayStride = size * 4;
        const buffer = this.device.createBuffer({
            label: `${this.descriptor.label} float-vertex-${key}-v${this.writeVersion}`,
            size: Math.max(4, values.byteLength),
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        if (values.byteLength > 0) {
            this.device.queue.writeBuffer(buffer, 0, values.buffer, values.byteOffset, values.byteLength);
        }
        const converted = { buffer, format, arrayStride, key: `${this.hash}|float:${key}:v${this.writeVersion}` };
        this.convertedVertexBuffers.set(key, converted);
        return converted;
    }

    public getDivisorVertexBuffer(arrayStride: number, divisor: number, sourceOffset: number): HydDivisorVertexBuffer {
        const key = `${arrayStride}:${divisor}:${sourceOffset}`;
        const cached = this.divisorVertexBuffers.get(key);
        if (cached) return cached;

        const sourceByteLength = Math.max(0, this.webglSize - sourceOffset);
        const recordCount = sourceByteLength === 0 ? 0 : Math.ceil(sourceByteLength / arrayStride);
        const expandedByteLength = recordCount * divisor * arrayStride;
        const uploadByteLength = Math.max(4, (expandedByteLength + 3) & ~3);
        const expandedData = new Uint8Array(uploadByteLength);
        for (let record = 0; record < recordCount; record++) {
            const sourceStart = sourceOffset + record * arrayStride;
            const sourceEnd = Math.min(sourceStart + arrayStride, this.webglSize);
            const source = this.shadowData.subarray(sourceStart, sourceEnd);
            for (let repeat = 0; repeat < divisor; repeat++) {
                expandedData.set(source, (record * divisor + repeat) * arrayStride);
            }
        }
        const buffer = this.device.createBuffer({
            label: `${this.descriptor.label} divisor-${divisor}-${arrayStride}-${sourceOffset}-v${this.writeVersion}`,
            size: uploadByteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        if (expandedByteLength > 0) {
            this.device.queue.writeBuffer(buffer, 0, expandedData.buffer, expandedData.byteOffset, uploadByteLength);
        }
        const expanded = {
            buffer,
            key: `${this.hash}|divisor:${arrayStride}:${divisor}:${sourceOffset}:v${this.writeVersion}`,
        };
        this.divisorVertexBuffers.set(key, expanded);
        return expanded;
    }

    public getUint16IndexBuffer(): GPUBuffer {
        if (this.uint16IndexBuffer && this.uint16IndexBufferVersion === this.writeVersion) {
            return this.uint16IndexBuffer;
        }
        const elementCount = this.webglSize;
        const size = Math.max(4, (elementCount * 2 + 3) & ~3);
        const converted = new Uint16Array(size / 2);
        for (let i = 0; i < elementCount; i++) {
            converted[i] = this.shadowData[i];
        }
        this.uint16IndexBuffer = this.device.createBuffer({
            label: `${this.descriptor.label} uint8-to-uint16 v${this.writeVersion}`,
            size,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        if (elementCount > 0) {
            this.device.queue.writeBuffer(
                this.uint16IndexBuffer,
                0,
                converted.buffer,
                converted.byteOffset,
                size,
            );
        }
        this.uint16IndexBufferVersion = this.writeVersion;
        return this.uint16IndexBuffer;
    }

    public get buffer() {
        return this.__buffer__;
    }

    public get hash() {
        return this.__buffer__ ? this.__buffer__.label : this.descriptor.label;
    }
}
