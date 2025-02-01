// import { TTurboMode } from "../types";

type GpuOperators = 'setPipeline' | 'setBindGroup' | 'setVertexBuffer' | 'setIndexBuffer' | 'draw' | 'drawIndexed';

class GPURenderBundleTransition {
    public renderBundle: GPURenderBundle = null;
    // public jumpTable: { [key: string]: GPURenderBundleTransition } = {};
    public jumpTable: Map<string, GPURenderBundleTransition> = new Map();
    public readonly opName: GpuOperators;
    public readonly opArgs: any[];
    public readonly father: GPURenderBundleTransition;

    public onceHash: string | GPUBindGroup = null;
    public onceNext: GPURenderBundleTransition;
    public bindGroupOffset: number = -1;

    constructor(opName: GpuOperators, opArgs: any[], father: GPURenderBundleTransition) {
        this.opName = opName;
        this.opArgs = opArgs;
        this.father = father;
    }

    public goto(hash: string, opName: GpuOperators, ...opArgs: any[]): GPURenderBundleTransition {
        if (hash === this.onceHash) {
            return this.onceNext;
        }
        this.onceHash = hash;
        const transition = this.jumpTable.get(hash);
        if (!transition) {
            const newTransition = new GPURenderBundleTransition(opName, opArgs, this);
            this.jumpTable.set(hash, newTransition);
            return this.onceNext = newTransition;
        }
        return this.onceNext = transition;
    }

    public gotoBindGroup(bindGroup: GPUBindGroup, do0: number) {
        if (this.bindGroupOffset === do0 && this.onceHash == bindGroup) {
            return this.onceNext;
        }
        this.onceHash = bindGroup;
        this.bindGroupOffset = do0;
        const hash = 'b0' + bindGroup.label + do0;
        const transition = this.jumpTable.get(hash);
        if (!transition) {
            const newTransition = new GPURenderBundleTransition('setBindGroup', [0, bindGroup, do0], this);
            this.jumpTable.set(hash, newTransition);
            return this.onceNext = newTransition;
        }
        return this.onceNext = transition;
    }
}

class HydRenderPassEncoder {
    static initBundleCache: Map<string, GPURenderBundleTransition> = new Map();
    private bundleCache: GPURenderBundleTransition;

    // private opHashes: string[] = [];
    private device: GPUDevice;
    public readonly renderBundleEncoderDescriptor: GPURenderBundleEncoderDescriptor;
    constructor(device: GPUDevice, renderBundleEncoderDescriptor: GPURenderBundleEncoderDescriptor) {
        this.device = device;
        this.renderBundleEncoderDescriptor = renderBundleEncoderDescriptor;
        const initKey = (renderBundleEncoderDescriptor.colorFormats as Array<GPUTextureFormat>).join(',') + renderBundleEncoderDescriptor.depthStencilFormat;
        this.bundleCache = HydRenderPassEncoder.initBundleCache.get(initKey);
        if (!this.bundleCache) {
            this.bundleCache = new GPURenderBundleTransition(null, null, null);
            HydRenderPassEncoder.initBundleCache.set(initKey, this.bundleCache);
        }
    }
    public setPipeline(opHash: string, pipeline: GPURenderPipeline) {
        this.bundleCache = this.bundleCache.goto(
            opHash,
            'setPipeline',
            pipeline
        );
    }
    public setBindGroup(bindGroup: GPUBindGroup, do0: number) {
        this.bundleCache = this.bundleCache.gotoBindGroup(bindGroup, do0);
    }
    public setVertexBuffer(opHash: string, slot: number, buffer: GPUBuffer, offset: number) {
        this.bundleCache = this.bundleCache.goto(
            opHash,
            'setVertexBuffer',
            slot, buffer, offset
        );
    }
    public setIndexBuffer(opHash: string, buffer: GPUBuffer, format: GPUIndexFormat) {
        this.bundleCache = this.bundleCache.goto(
            opHash,
            'setIndexBuffer',
            buffer, format
        );
    }
    public draw(vertexCount: number, instanceCount: number, firstVertex: number, firstInstance: number) {
        this.bundleCache = this.bundleCache.goto('d' + (vertexCount*839 ^ instanceCount*853 ^ firstVertex*857 ^ firstInstance*859), 'draw', vertexCount, instanceCount, firstVertex, firstInstance);
    }
    public drawIndexed(indexCount: number, instanceCount: number, firstIndex: number, baseVertex: number, firstInstance: number) {
        this.bundleCache = this.bundleCache.goto('i' + (indexCount*977 ^ instanceCount*983 ^ firstIndex*991 ^ baseVertex*997 ^ firstInstance*1009), 'drawIndexed', indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
    }

    public generateBundle() {
        if (!this.bundleCache.renderBundle) {
            console.log('[HYD] create bundle');
            const bundleEncoder = this.device.createRenderBundleEncoder(this.renderBundleEncoderDescriptor);
            const tmp = [0]; // 减少list创建开销
            const operators = [];
            let cur = this.bundleCache;
            while (cur) {
                operators.push([cur.opName, cur.opArgs]);
                cur = cur.father;
            }
            for (let i = operators.length - 2; i >= 0; i--) {
                const [opName, opArgs] = operators[i];
                if (opName === 'setBindGroup') {
                    tmp[0] = opArgs[2];
                    bundleEncoder.setBindGroup(opArgs[0], opArgs[1], tmp);
                } else {
                    bundleEncoder[opName].apply(bundleEncoder, opArgs);
                }
            }
            this.bundleCache.renderBundle = bundleEncoder.finish();
        }
        return this.bundleCache.renderBundle;
    }
}

export class HydRenderPassCache {
    private renderBundleGenerator: HydRenderPassEncoder = null;
    private renderPassEncoder: GPURenderPassEncoder = null;
    private device: GPUDevice;
    private _commandEncoder: GPUCommandEncoder = null;
    public renderPassDescriptorCacheKey: string = null;
    private renderPassDescriptor: GPURenderPassDescriptor = null;
    public renderPassPipelineCacheKey: string = null;
    public renderPassBindGroupCacheKey: string = null;
    public renderPassVertexBufferCacheKeys: string[] = [];
    public renderPassVertexBufferCacheKey: string = null;
    public renderPassIndexBufferCacheKey: string = null;
    private viewPortInfo: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
    private scissorInfo: [number, number, number, number] = [0, 0, 0, 0];
    private stencilReferenceInfo: number = 0;
    private colorInfo: Iterable<number> = [0, 0, 0, 0];
    private __commandEncoderCount = 0;
    private bundleNum: number[];

    constructor(device: GPUDevice) {
        this.device = device;
    }

    public resetbundleNum() {
        this.bundleNum = [];
    }

    public CeSubmitAndReset() {
        this.RpEnd();
        if (this._commandEncoder !== null) {
            this.device.queue.submit([this._commandEncoder.finish({ label: this._commandEncoder.label + '.finish()' })]);
            this._commandEncoder = null;
        }
    }

    public get commandEncoder() {
        return this._commandEncoder = this._commandEncoder || this.device.createCommandEncoder({
            label: `commandEncoder-${this.__commandEncoderCount++}`,
        });
    }

    private resetCache() {
        this.renderPassEncoder = null;
        this.renderBundleGenerator = null;

        this.renderPassDescriptorCacheKey = null;
        this.renderPassDescriptor = null;
        this.renderPassPipelineCacheKey = null;
        this.renderPassBindGroupCacheKey = null;
        this.renderPassVertexBufferCacheKey = null;
        this.renderPassVertexBufferCacheKeys = [];
        this.renderPassIndexBufferCacheKey = null;
        this.viewPortInfo = [0, 0, 0, 0, 0, 0];
        this.scissorInfo = [0, 0, 0, 0];
        this.stencilReferenceInfo = 0;
        this.colorInfo = [0, 0, 0, 0];
    }

    private RpEnd() {
        if (this.renderPassEncoder) {
            const bundle = this.renderBundleGenerator.generateBundle();
            this.renderPassEncoder.executeBundles([bundle]);
            this.renderPassEncoder.end();

            this.resetCache();
        }
    }

    // public RpSetViewport(viewPort: ViewportState) {
    //     const { x, y, width, height, minDepth, maxDepth } = viewPort;
    //     if (this.viewPortInfo[0] !== x || this.viewPortInfo[1] !== y || this.viewPortInfo[2] !== width || this.viewPortInfo[3] !== height || this.viewPortInfo[4] !== minDepth || this.viewPortInfo[5] !== maxDepth) {
    //         this.viewPortInfo = [x, y, width, height, minDepth, maxDepth];
    //         this.renderPassEncoder.setViewport(x, y, width, height, minDepth, maxDepth);
    //     }
    // }

    // public RpSetScissorRect(scissorBox: [number, number, number, number]) {
    //     const [x, y, width, height] = scissorBox;
    //     if (this.scissorInfo[0] !== x || this.scissorInfo[1] !== y || this.scissorInfo[2] !== width || this.scissorInfo[3] !== height) {
    //         this.scissorInfo = [x, y, width, height];
    //         this.renderPassEncoder.setScissorRect(x, y, width, height);
    //     }
    // }

    // public RpSetStencilReference(reference: number) {
    //     if (this.stencilReferenceInfo !== reference) {
    //         this.stencilReferenceInfo = reference;
    //         this.renderPassEncoder.setStencilReference(reference);
    //     }
    // }

    // public RpSetBlendConstant(color: Iterable<number>) {
    //     if (this.colorInfo[0] !== color[0] || this.colorInfo[1] !== color[1] || this.colorInfo[2] !== color[2] || this.colorInfo[3] !== color[3]) {
    //         this.colorInfo = color;
    //         this.renderPassEncoder.setBlendConstant(color);
    //     }
    // }

    public RpSetDescriptor(hash: string, renderBundleEncoderDescriptor: GPURenderBundleEncoderDescriptor, callback: () => GPURenderPassDescriptor) {
        if (this.renderPassDescriptorCacheKey !== hash) {
            this.RpEnd();
            this.renderPassDescriptorCacheKey = hash;
            this.renderPassDescriptor = callback();
            // this.renderPassDescriptor.label += hash;
            this.renderPassEncoder = this.commandEncoder.beginRenderPass(this.renderPassDescriptor);
            this.renderBundleGenerator = new HydRenderPassEncoder(this.device, renderBundleEncoderDescriptor);
        }
    }

    public RpSetPipeline(hash: string, pipeline: GPURenderPipeline) {
        if (this.renderPassPipelineCacheKey !== hash) {
            this.renderPassPipelineCacheKey = hash;
            this.renderBundleGenerator.setPipeline(hash, pipeline);
        }
    }

    public RpSetBindGroup(bindGroup: GPUBindGroup, dynamicOffset0: number) {
        this.renderBundleGenerator.setBindGroup(bindGroup, dynamicOffset0);
        // this.renderBundleGenerator.setBindGroup(bindGroup.label + dynamicOffset0, index, bindGroup, dynamicOffset0);
    }

    public RpSetVertexBuffer(hash: string, loc: number, vertexBuffer: GPUBuffer, offset: number) {
        if (this.renderPassVertexBufferCacheKeys[loc] !== hash) {
            this.renderPassVertexBufferCacheKeys[loc] = hash;
            this.renderBundleGenerator.setVertexBuffer(hash, loc, vertexBuffer, offset);
        }
    }

    public RpSetVertexBuffers(hash: string, hashes: string[], vertexBuffers: GPUBuffer[], offsets: number[]) {
        if (this.renderPassVertexBufferCacheKey !== hash) {
            this.renderPassVertexBufferCacheKey = hash;
            const n = vertexBuffers.length;
            for (let i = 0; i < n; i++) {
                this.RpSetVertexBuffer(hashes[i], i, vertexBuffers[i], offsets[i]);
            }
        }
    }

    public RpSetIndexBuffer(indexBuffer: GPUBuffer, indexFormat: GPUIndexFormat) {
        if (this.renderPassIndexBufferCacheKey !== indexBuffer.label) {
            this.renderPassIndexBufferCacheKey = indexBuffer.label;
            this.renderBundleGenerator.setIndexBuffer(indexBuffer.label, indexBuffer, indexFormat);
        }
    }

    public RpSetViewport(viewPort: [number, number, number, number, number, number]) {
        if (this.viewPortInfo.join(',') !== viewPort.join(',')) {
            this.viewPortInfo = viewPort;
            this.renderPassEncoder.setViewport(viewPort[0], viewPort[1], viewPort[2], viewPort[3], viewPort[4], viewPort[5]);
        }
    }

    /**
     * Draws primitives.
     * See [[#rendering-operations]] for the detailed specification.
     * @param vertexCount - The number of vertices to draw.
     * @param instanceCount - The number of instances to draw.
     * @param firstVertex - Offset into the vertex buffers, in vertices, to begin drawing from.
     * @param firstInstance - First instance to draw.
     */
    public RpDraw(vertexCount: number, instanceCount: number, firstVertex: number, firstInstance: number) {
        this.renderBundleGenerator.draw(vertexCount, instanceCount, firstVertex, firstInstance);
    }

    /**
     * Draws indexed primitives.
     * See [[#rendering-operations]] for the detailed specification.
     * @param indexCount - The number of indices to draw.
     * @param instanceCount - The number of instances to draw.
     * @param firstIndex - Offset into the index buffer, in indices, begin drawing from.
     * @param baseVertex - Added to each index value before indexing into the vertex buffers.
     * @param firstInstance - First instance to draw.
     */
    public RpDrawIndexed(indexCount: number, instanceCount: number, firstIndex: number, baseVertex: number, firstInstance: number) {
        this.renderBundleGenerator.drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
    }
}
