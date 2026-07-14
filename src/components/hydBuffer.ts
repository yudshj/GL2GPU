import { HydHashable } from "./base/hydHashable";

export function physicalWebGlBufferSize(webglSize: number): number {
    // WebGL exposes the exact logical byte size, while WebGPU uniform structs
    // can require trailing alignment bytes that are not included in
    // UNIFORM_BLOCK_DATA_SIZE (notably a final vec3). Keep a small physical
    // tail available without changing BUFFER_SIZE or WebGL bounds checks.
    return Math.max(16, Math.ceil(Math.max(0, webglSize) / 16) * 16);
}

export interface HydExpandedIndexBuffer {
    buffer: GPUBuffer;
    indexCount: number;
    format: GPUIndexFormat;
    maxIndex?: number;
}

export interface HydConvertedVertexBuffer {
    buffer: GPUBuffer;
    format: GPUVertexFormat;
    arrayStride: number;
    key: string;
    data: Float32Array | Int32Array | Uint32Array;
}

export interface HydDivisorVertexBuffer {
    buffer: GPUBuffer;
    key: string;
}

function lastProvokingVertexIndices(
    mode: GLenum,
    source: ArrayLike<number>,
    restartIndex: number | null,
): Uint32Array {
    const output: number[] = [];
    const emitRun = (run: number[]) => {
        switch (mode) {
            case WebGL2RenderingContext.LINES:
                for (let index = 0; index + 1 < run.length; index += 2) {
                    output.push(run[index + 1], run[index]);
                }
                break;
            case WebGL2RenderingContext.LINE_STRIP:
                for (let index = 0; index + 1 < run.length; index++) {
                    output.push(run[index + 1], run[index]);
                }
                break;
            case WebGL2RenderingContext.LINE_LOOP:
                if (run.length < 2) break;
                for (let index = 0; index + 1 < run.length; index++) {
                    output.push(run[index + 1], run[index]);
                }
                output.push(run[0], run[run.length - 1]);
                break;
            case WebGL2RenderingContext.TRIANGLES:
                for (let index = 0; index + 2 < run.length; index += 3) {
                    output.push(run[index + 2], run[index], run[index + 1]);
                }
                break;
            case WebGL2RenderingContext.TRIANGLE_STRIP:
                for (let index = 0; index + 2 < run.length; index++) {
                    if ((index & 1) === 0) {
                        output.push(run[index + 2], run[index], run[index + 1]);
                    } else {
                        output.push(run[index + 2], run[index + 1], run[index]);
                    }
                }
                break;
            case WebGL2RenderingContext.TRIANGLE_FAN:
                for (let index = 1; index + 1 < run.length; index++) {
                    output.push(run[index + 1], run[0], run[index]);
                }
                break;
        }
    };

    let run: number[] = [];
    for (let index = 0; index < source.length; index++) {
        const value = Number(source[index]) >>> 0;
        if (restartIndex !== null && value === restartIndex) {
            emitRun(run);
            run = [];
        } else {
            run.push(value);
        }
    }
    emitRun(run);
    return new Uint32Array(output);
}

export function lowerFixedRestartIndices(
    mode: GLenum,
    source: ArrayLike<number>,
    restartIndex: number,
): Uint32Array {
    const output: number[] = [];
    const emitRun = (run: number[]) => {
        switch (mode) {
            case WebGL2RenderingContext.POINTS:
                output.push(...run);
                break;
            case WebGL2RenderingContext.LINES:
            case WebGL2RenderingContext.TRIANGLES: {
                const primitiveSize = mode === WebGL2RenderingContext.LINES ? 2 : 3;
                const completeLength = run.length - run.length % primitiveSize;
                output.push(...run.slice(0, completeLength));
                break;
            }
            case WebGL2RenderingContext.LINE_LOOP:
                if (run.length < 2) break;
                for (let index = 1; index < run.length; index++) {
                    output.push(run[index - 1], run[index]);
                }
                output.push(run[run.length - 1], run[0]);
                break;
            case WebGL2RenderingContext.TRIANGLE_FAN:
                if (run.length < 3) break;
                for (let index = 2; index < run.length; index++) {
                    output.push(run[0], run[index - 1], run[index]);
                }
                break;
            default:
                output.push(...run);
                output.push(0xffffffff);
                break;
        }
    };

    let run: number[] = [];
    for (let index = 0; index < source.length; index++) {
        const value = Number(source[index]) >>> 0;
        if (value === restartIndex) {
            emitRun(run);
            run = [];
        } else {
            run.push(value);
        }
    }
    emitRun(run);
    if (mode === WebGL2RenderingContext.LINE_STRIP || mode === WebGL2RenderingContext.TRIANGLE_STRIP) {
        while (output[output.length - 1] === 0xffffffff) output.pop();
    }
    return new Uint32Array(output);
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
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC |
            GPUBufferUsage.VERTEX | GPUBufferUsage.INDEX |
            GPUBufferUsage.UNIFORM | GPUBufferUsage.STORAGE,
    };
    public shadowData: Uint8Array = new Uint8Array(0);
    private writeVersion: number = 0;
    private uint16IndexBuffer: GPUBuffer = null;
    private uint16IndexBufferVersion: number = -1;
    private readonly indexRangeMaxCache: Map<string, number> = new Map();
    private readonly expandedIndexBuffers: Map<string, HydExpandedIndexBuffer> = new Map();
    private readonly convertedVertexBuffers: Map<string, HydConvertedVertexBuffer> = new Map();
    private readonly divisorVertexBuffers: Map<string, HydDivisorVertexBuffer> = new Map();
    public derivedVertexGeneration: number = 0;
    private retiredBuffers: GPUBuffer[] = [];
    private retirementPending: boolean = false;
    private lastMaxIndexType: GLenum = 0;
    private lastMaxIndexOffset: number = -1;
    private lastMaxIndexCount: number = -1;
    private lastMaxIndexValue: number = -1;

    constructor(device: GPUDevice, ownerToken?: object) {
        this.device = device;
        this.ownerToken = ownerToken;
        this.descriptor.label = `buffer ${HydBuffer.__total__++}`;
    }

    private retireBuffer(buffer: GPUBuffer | null | undefined) {
        if (!buffer) return;
        this.retiredBuffers.push(buffer);
        this.scheduleRetirement();
    }

    private scheduleRetirement() {
        if (this.retirementPending || this.retiredBuffers.length === 0) return;
        this.retirementPending = true;
        const retired = this.retiredBuffers.splice(0);
        const destroyRetired = () => {
            for (const retiredBuffer of retired) retiredBuffer.destroy();
            this.retirementPending = false;
            this.scheduleRetirement();
        };
        const queue = this.device?.queue;
        if (queue && typeof queue.onSubmittedWorkDone === "function") {
            void queue.onSubmittedWorkDone().then(destroyRetired, destroyRetired);
        } else {
            destroyRetired();
        }
    }

    private invalidateIndexCaches() {
        if (this.convertedVertexBuffers.size > 0 || this.divisorVertexBuffers.size > 0) {
            this.derivedVertexGeneration++;
        }
        this.retireBuffer(this.uint16IndexBuffer);
        this.uint16IndexBuffer = null;
        this.uint16IndexBufferVersion = -1;
        for (const expanded of this.expandedIndexBuffers.values()) {
            this.retireBuffer(expanded.buffer);
        }
        for (const converted of this.convertedVertexBuffers.values()) {
            this.retireBuffer(converted.buffer);
        }
        for (const expanded of this.divisorVertexBuffers.values()) {
            this.retireBuffer(expanded.buffer);
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
            this.retireBuffer(this.__buffer__);
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

    public commitShadowData(offset: number = 0, byteLength: number = this.webglSize - offset) {
        if (!this.__buffer__ || byteLength <= 0) return;
        this.writeVersion++;
        this.invalidateIndexCaches();
        const alignedStart = Math.max(0, offset) & ~3;
        const alignedEnd = Math.min(
            this.shadowData.byteLength,
            (Math.max(0, offset) + byteLength + 3) & ~3,
        );
        if (alignedEnd <= alignedStart) return;
        this.device.queue.writeBuffer(
            this.__buffer__,
            alignedStart,
            this.shadowData.buffer,
            this.shadowData.byteOffset + alignedStart,
            alignedEnd - alignedStart,
        );
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

    public matchesIndexSequence(type: GLenum, byteOffset: number, expected: number[]): boolean {
        const indexSize = type === WebGL2RenderingContext.UNSIGNED_BYTE ? 1 :
            type === WebGL2RenderingContext.UNSIGNED_SHORT ? 2 :
                type === WebGL2RenderingContext.UNSIGNED_INT ? 4 : 0;
        if (indexSize === 0 || byteOffset < 0 ||
            byteOffset + expected.length * indexSize > this.webglSize) {
            return false;
        }
        for (let index = 0; index < expected.length; index++) {
            if (this.readIndex(type, byteOffset + index * indexSize) !== expected[index]) return false;
        }
        return true;
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

    public getLastProvokingVertexIndexBuffer(
        mode: GLenum,
        type: GLenum,
        byteOffset: number,
        count: number,
        fixedRestart: boolean,
    ): HydExpandedIndexBuffer {
        const key = `last-provoking:${mode}:${type}:${byteOffset}:${count}:${fixedRestart ? 1 : 0}`;
        const cached = this.expandedIndexBuffers.get(key);
        if (cached) return cached;

        const indexSize = type === WebGL2RenderingContext.UNSIGNED_BYTE ? 1 :
            type === WebGL2RenderingContext.UNSIGNED_SHORT ? 2 : 4;
        const source = Array.from({ length: count }, (_, index) =>
            this.readIndex(type, byteOffset + index * indexSize));
        const restartIndex = !fixedRestart ? null :
            type === WebGL2RenderingContext.UNSIGNED_BYTE ? 0xff :
                type === WebGL2RenderingContext.UNSIGNED_SHORT ? 0xffff : 0xffffffff;
        const indices = lastProvokingVertexIndices(mode, source, restartIndex);
        const buffer = this.device.createBuffer({
            label: `${this.descriptor.label} last-provoking-${mode}-${type}-${byteOffset}-${count}-v${this.writeVersion}`,
            size: Math.max(4, indices.byteLength),
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        if (indices.byteLength > 0) {
            this.device.queue.writeBuffer(buffer, 0, indices.buffer, indices.byteOffset, indices.byteLength);
        }
        let maxIndex = -1;
        for (const index of indices) maxIndex = Math.max(maxIndex, index);
        const expanded: HydExpandedIndexBuffer = {
            buffer,
            indexCount: indices.length,
            format: "uint32",
            maxIndex,
        };
        this.expandedIndexBuffers.set(key, expanded);
        return expanded;
    }

    public getFixedRestartIndexBuffer(
        mode: GLenum,
        type: GLenum,
        byteOffset: number,
        count: number,
    ): HydExpandedIndexBuffer | null {
        const restartIndex = type === WebGL2RenderingContext.UNSIGNED_BYTE ? 0xff :
            type === WebGL2RenderingContext.UNSIGNED_SHORT ? 0xffff : 0xffffffff;
        const indexSize = type === WebGL2RenderingContext.UNSIGNED_BYTE ? 1 :
            type === WebGL2RenderingContext.UNSIGNED_SHORT ? 2 : 4;
        const source = Array.from({ length: count }, (_, index) =>
            this.readIndex(type, byteOffset + index * indexSize));
        if (!source.includes(restartIndex)) return null;

        const key = `restart:${mode}:${type}:${byteOffset}:${count}`;
        const cached = this.expandedIndexBuffers.get(key);
        if (cached) return cached;

        const indices = lowerFixedRestartIndices(mode, source, restartIndex);
        const buffer = this.device.createBuffer({
            label: `${this.descriptor.label} fixed-restart-${mode}-${type}-${byteOffset}-${count}-v${this.writeVersion}`,
            size: Math.max(4, indices.byteLength),
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        if (indices.byteLength > 0) {
            this.device.queue.writeBuffer(buffer, 0, indices.buffer, indices.byteOffset, indices.byteLength);
        }
        let maxIndex = -1;
        for (const index of source) {
            if (index !== restartIndex) maxIndex = Math.max(maxIndex, index);
        }
        const expanded: HydExpandedIndexBuffer = {
            buffer,
            indexCount: indices.length,
            format: "uint32",
            maxIndex,
        };
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
            case WebGL2RenderingContext.INT: {
                const value = view.getInt32(byteOffset, true);
                return normalized ? Math.max(value / 2147483647, -1) : value;
            }
            case WebGL2RenderingContext.UNSIGNED_INT: {
                const value = view.getUint32(byteOffset, true);
                return normalized ? value / 4294967295 : value;
            }
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

    private packedVertexComponent(view: DataView, type: GLenum, byteOffset: number, component: number, normalized: boolean): number {
        const packed = view.getUint32(byteOffset, true);
        const bits = component === 3 ? 2 : 10;
        const shift = component === 0 ? 0 : component === 1 ? 10 : component === 2 ? 20 : 30;
        const mask = (1 << bits) - 1;
        let value = (packed >>> shift) & mask;
        if (type === WebGL2RenderingContext.INT_2_10_10_10_REV) {
            const signBit = 1 << (bits - 1);
            if (value & signBit) value -= 1 << bits;
            return normalized ? Math.max(-1, value / ((1 << (bits - 1)) - 1)) : value;
        }
        return normalized ? value / mask : value;
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
        const packed = type === WebGL2RenderingContext.INT_2_10_10_10_REV ||
            type === WebGL2RenderingContext.UNSIGNED_INT_2_10_10_10_REV;
        const componentBytes = type === WebGL2RenderingContext.BYTE || type === WebGL2RenderingContext.UNSIGNED_BYTE ? 1 :
            type === WebGL2RenderingContext.SHORT || type === WebGL2RenderingContext.UNSIGNED_SHORT || type === WebGL2RenderingContext.HALF_FLOAT ? 2 : 4;
        const elementBytes = packed ? 4 : size * componentBytes;
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
                const value = packed
                    ? this.packedVertexComponent(sourceView, type, sourceBase, component, normalized)
                    : this.vertexComponent(sourceView, type, sourceBase + component * componentBytes, normalized);
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
        const converted = {
            buffer,
            format,
            arrayStride,
            key: `${this.hash}|float:${key}:v${this.writeVersion}`,
            data: values,
        };
        this.convertedVertexBuffers.set(key, converted);
        return converted;
    }

    public getIntegerVertexBuffer(
        type: GLenum,
        size: number,
        webglStride: number,
        offset: number,
        divisor: number = 1,
    ): HydConvertedVertexBuffer {
        const signed = type === WebGL2RenderingContext.BYTE ||
            type === WebGL2RenderingContext.SHORT ||
            type === WebGL2RenderingContext.INT;
        const key = `integer:${type}:${size}:${webglStride}:${offset}:d${divisor}`;
        const cached = this.convertedVertexBuffers.get(key);
        if (cached) return cached;
        const componentBytes = type === WebGL2RenderingContext.BYTE || type === WebGL2RenderingContext.UNSIGNED_BYTE ? 1 :
            type === WebGL2RenderingContext.SHORT || type === WebGL2RenderingContext.UNSIGNED_SHORT ? 2 : 4;
        const elementBytes = size * componentBytes;
        const sourceStride = webglStride || elementBytes;
        const elementCount = this.webglSize < offset + elementBytes
            ? 0
            : Math.floor((this.webglSize - offset - elementBytes) / sourceStride) + 1;
        const repeatCount = Math.max(1, divisor);
        const values = signed
            ? new Int32Array(elementCount * repeatCount * size)
            : new Uint32Array(elementCount * repeatCount * size);
        const sourceView = new DataView(this.shadowData.buffer, this.shadowData.byteOffset, this.shadowData.byteLength);
        for (let element = 0; element < elementCount; element++) {
            const sourceBase = offset + element * sourceStride;
            for (let component = 0; component < size; component++) {
                const value = this.vertexComponent(sourceView, type, sourceBase + component * componentBytes, false);
                for (let repeat = 0; repeat < repeatCount; repeat++) {
                    values[(element * repeatCount + repeat) * size + component] = value;
                }
            }
        }
        const prefix = signed ? "sint32" : "uint32";
        const format = (size === 1 ? prefix : `${prefix}x${size}`) as GPUVertexFormat;
        const arrayStride = size * 4;
        const buffer = this.device.createBuffer({
            label: `${this.descriptor.label} integer-vertex-${key}-v${this.writeVersion}`,
            size: Math.max(4, values.byteLength),
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        if (values.byteLength > 0) {
            this.device.queue.writeBuffer(buffer, 0, values.buffer, values.byteOffset, values.byteLength);
        }
        const converted = {
            buffer,
            format,
            arrayStride,
            key: `${this.hash}|${key}:v${this.writeVersion}`,
            data: values,
        };
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
