import { HydHashable } from "./base/hydHashable";
import { HydBuffer } from "./hydBuffer";
import { HydFramebuffer } from "./hydFramebuffer";
import { HydProgram } from "./hydProgram";
import { HydTexture } from "./hydTexture";
import { HydVertexArray } from "./hydVertexArray";
import fastHashCode from "fast-hash-code";

// export class ViewportState {
//     x: number;
//     y: number;
//     width: number;
//     height: number;
//     minDepth: number;
//     maxDepth: number;
//     constructor(width: number, height: number) {
//         this.x = 0;
//         this.y = 0;
//         this.width = width;
//         this.height = height;
//         this.minDepth = 0;
//         this.maxDepth = 1;
//     }
// }

export type ViewportState = [number, number, number, number, number, number];

export class CommonState implements HydHashable {
    activeTextureUnit: number; // TODO: 这个是否不需要放到hash里？
    viewport: ViewportState;
    arrayBufferBinding: HydBuffer;  // TODO: 这个是否不需要放到hash里？
    currentProgram: HydProgram;
    vertexArrayBinding: HydVertexArray;
    renderbufferBinding: HydTexture;
    drawFramebufferBinding: HydFramebuffer;
    readFramebufferBinding: HydFramebuffer;
    public get hash(): string {
        let ret = this.activeTextureUnit.toString()
            + this.viewport.join(',')
            + this.vertexArrayBinding.hash
            + this.drawFramebufferBinding.hash
            + this.readFramebufferBinding.hash;
        if (this.arrayBufferBinding) {
            ret += this.arrayBufferBinding.hash;
        }
        if (this.renderbufferBinding) {
            ret += this.renderbufferBinding.hash;
        }
        if (this.currentProgram) {
            ret += this.currentProgram.hash;
        }
        return ret;
    }
    constructor(
        activeTextureUnit: number,
        viewport: ViewportState,
        arrayBufferBinding: HydBuffer,
        currentProgram: HydProgram,
        vertexArrayBinding: HydVertexArray,
        drawFramebufferBinding: HydFramebuffer,
        readFramebufferBinding: HydFramebuffer,
        renderbufferBinding: HydTexture
    ) {
        this.activeTextureUnit = activeTextureUnit;
        this.viewport = viewport;
        this.arrayBufferBinding = arrayBufferBinding;
        this.currentProgram = currentProgram;
        this.vertexArrayBinding = vertexArrayBinding;
        this.renderbufferBinding = renderbufferBinding;
        this.drawFramebufferBinding = drawFramebufferBinding;
        this.readFramebufferBinding = readFramebufferBinding;
    }
}

export class DepthState implements HydHashable {
    enabled: boolean;
    func: GPUCompareFunction;
    range: [number, number];
    writeMask: boolean;
    // depthBuffer: HydTexture;
    public get hash(): string {
        return this.enabled.toString() + this.func.toString() + this.range.toString() + this.writeMask.toString();
    }
    constructor() {
        this.enabled = false;
        this.func = 'less';
        this.range = [0, 1];
        this.writeMask = true;
    }
}

export class PolygonState implements HydHashable {
    cullFace: boolean;
    cullFaceMode: GPUCullMode;
    frontFace: GPUFrontFace;
    polygonOffsetFill: boolean;
    polygonOffsetUnits: number;
    polygonOffsetFactor: number;
    public get hash(): string {
        return this.cullFace.toString() + this.cullFaceMode.toString() + this.frontFace.toString() + this.polygonOffsetFill.toString() + this.polygonOffsetUnits.toString() + this.polygonOffsetFactor.toString();
    }
    constructor() {
        this.cullFace = false;
        this.cullFaceMode = 'back';
        this.frontFace = 'ccw';
        this.polygonOffsetFill = false;
        this.polygonOffsetUnits = 0;
        this.polygonOffsetFactor = 0;
    }
}

export class ClearState implements HydHashable {
    color: Iterable<number>;
    depth: GLuint;
    stencil: GLenum;
    target: number;
    public get hash(): string {
        return this.color.toString() + this.depth.toString() + this.stencil.toString();
    }
    constructor() {
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.depth = 1;
        this.stencil = 0x00;
        this.target = WebGL2RenderingContext.COLOR_BUFFER_BIT | WebGL2RenderingContext.DEPTH_BUFFER_BIT;
    }
}

export class BlendState implements HydHashable {
    enabled: boolean;
    color: Iterable<number>;
    dstRGB: GPUBlendFactor;
    srcRGB: GPUBlendFactor;
    dstAlpha: GPUBlendFactor;
    srcAlpha: GPUBlendFactor;
    equationRGB: GPUBlendOperation;
    equationAlpha: GPUBlendOperation;
    public get hash(): string {
        return this.enabled.toString() + this.color.toString() + this.dstRGB.toString() + this.srcRGB.toString() + this.dstAlpha.toString() + this.srcAlpha.toString() + this.equationRGB.toString() + this.equationAlpha.toString();
    }
    constructor() {
        this.enabled = false;
        this.dstRGB = 'zero';
        this.dstAlpha = 'zero';
        this.srcRGB = 'one';
        this.srcAlpha = 'one';
        this.color = [0.0, 0.0, 0.0, 0.0];
        this.equationRGB = 'add';
        this.equationAlpha = 'add';
    }
}

export class MiscState implements HydHashable {
    scissorTest: boolean;
    scissorBox: [number, number, number, number];
    colorWriteMask: [boolean, boolean, boolean, boolean];
    unpackAlignment: number;
    packAlignment: number;

    public get hash(): string {
        return this.scissorTest.toString() + this.scissorBox.toString() + this.colorWriteMask.toString() + this.unpackAlignment.toString() + this.packAlignment.toString();
    }
    constructor() {
        this.scissorTest = false;
        this.scissorBox = undefined; // [x, y, width, height]
        this.colorWriteMask = [true, true, true, true];
        this.unpackAlignment = 4;
        this.packAlignment = 4;
    }
}

export class StencilState implements HydHashable {
    enabled: boolean;

    frontFunc: GPUCompareFunction;
    frontFail: GPUStencilOperation;
    frontPassDepthFail: GPUStencilOperation;
    frontPassDepthPass: GPUStencilOperation;
    frontRef: GLuint;
    frontValueMask: GLuint;
    frontWriteMask: GLuint;

    backFunc: GPUCompareFunction;
    backFail: GPUStencilOperation;
    backPassDepthFail: GPUStencilOperation;
    backPassDepthPass: GPUStencilOperation;
    backRef: GLuint;
    backValueMask: GLuint;
    backWriteMask: GLuint;

    public get hash(): string {
        return this.enabled.toString() + this.frontFunc.toString() + this.frontFail.toString() + this.frontPassDepthFail.toString() + this.frontPassDepthPass.toString() + this.frontRef.toString() + this.frontValueMask.toString() + this.frontWriteMask.toString() + this.backFunc.toString() + this.backFail.toString() + this.backPassDepthFail.toString() + this.backPassDepthPass.toString() + this.backRef.toString() + this.backValueMask.toString() + this.backWriteMask.toString();
    }
    constructor() {
        this.enabled = false;
        this.frontFunc = 'always';
        this.frontFail = 'keep';
        this.frontPassDepthFail = 'keep';
        this.frontPassDepthPass = 'keep';
        this.frontRef = 0;
        this.frontValueMask = 0x7FFFFFFF;
        this.frontWriteMask = 0x7FFFFFFF;
        this.backFunc = 'always';
        this.backFail = 'keep';
        this.backPassDepthPass = 'keep';
        this.backPassDepthFail = 'keep';
        this.backRef = 0;
        this.backValueMask = 0x7FFFFFFF;
        this.backWriteMask = 0x7FFFFFFF;
    }
}

export class HydGlobalState {
    public glError: number = WebGL2RenderingContext.NO_ERROR;
    public contextAttributes: WebGLContextAttributes;
    public commonState: CommonState;
    public depthState = new DepthState();
    public polygonState = new PolygonState();
    public clearState = new ClearState();
    public blendState = new BlendState();
    public miscState = new MiscState();
    public stencilState = new StencilState();
    public textureUnits: HydTexture[] = [];
    public topology: GPUPrimitiveTopology = null;

    public readonly defaultVertexArrayBinding: HydVertexArray = new HydVertexArray();
    public readonly defaultFramebuffer: HydFramebuffer;
    public __canvasView: GPUTextureView;
    public device: GPUDevice;
    private __bindGroupCount: number = 0;
    private __pipelineCount: number = 0;
    private uniformBuffer: GPUBuffer;

    constructor(attributes: WebGLContextAttributes, uniform: GPUBuffer, device: GPUDevice) {
        this.contextAttributes = attributes;
        this.defaultFramebuffer = new HydFramebuffer();
        this.defaultFramebuffer.drawBuffers = [WebGL2RenderingContext.BACK];
        // this.defaultFramebuffer.readBuffer = WebGL2RenderingContext.BACK;
        this.defaultFramebuffer.attachments = new Map();
        this.device = device;

        this.commonState = new CommonState(
            0,
            [0, 0, -1, -1, 0, 1],
            null,
            null,
            this.defaultVertexArrayBinding,
            this.defaultFramebuffer,
            this.defaultFramebuffer,
            null,
        );
        this.uniformBuffer = uniform;
    }

    public getPipelineDescriptor(topology: GPUPrimitiveTopology, vertexBufferLayout: GPUVertexBufferLayout[]): [string, GPURenderPipelineDescriptor] {
        const haveFragmentState = this.commonState.drawFramebufferBinding.drawBuffers.some((value) => value === WebGL2RenderingContext.BACK || (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15));
        const vertexState: GPUVertexState = {
            module: this.commonState.currentProgram.vertexModule,
            entryPoint: 'main',
            buffers: vertexBufferLayout,
        };
        const pipelineDescriptor: GPURenderPipelineDescriptor = {
            layout: 'auto',
            vertex: vertexState,
            primitive: {
                topology: topology,
                cullMode: this.polygonState.cullFace ? this.polygonState.cullFaceMode : undefined,
                frontFace: this.polygonState.frontFace,
            },
        };
        let cacheKey = this.commonState.currentProgram.hash + this.polygonState.cullFace.toString() + this.polygonState.cullFaceMode.toString() + this.polygonState.frontFace.toString() + this.polygonState.polygonOffsetFill.toString() + this.polygonState.polygonOffsetUnits.toString() + this.polygonState.polygonOffsetFactor.toString() + this.topology.toString();

        if (haveFragmentState) {
            const blend: GPUBlendState = this.blendState.enabled ? {
                color: {
                    srcFactor: this.blendState.srcRGB,
                    dstFactor: this.blendState.dstRGB,
                    operation: this.blendState.equationRGB,
                },
                alpha: {
                    srcFactor: this.blendState.srcAlpha,
                    dstFactor: this.blendState.dstAlpha,
                    operation: this.blendState.equationAlpha,
                },
            } : undefined;
            cacheKey += this.blendState.enabled ? 'true' + this.blendState.srcRGB + this.blendState.dstRGB + this.blendState.equationRGB + this.blendState.srcAlpha + this.blendState.dstAlpha + this.blendState.equationAlpha : 'false';
            pipelineDescriptor.fragment = {
                module: this.commonState.currentProgram.fragmentModule,
                entryPoint: 'main',
                targets: this.commonState.drawFramebufferBinding.drawBuffers
                    .filter((value) => value === WebGL2RenderingContext.BACK || (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15))
                    .map((value) => {
                        cacheKey += value.toString();
                        if (value === WebGL2RenderingContext.BACK) {
                            return { format: 'bgra8unorm', blend } as GPUColorTargetState;
                        } else if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                            return { format: this.commonState.drawFramebufferBinding.attachments.get(value).attachment.texture.format, blend } as GPUColorTargetState;
                        } else {
                            return null;
                        }
                    }),
            }
        }
        if (this.depthState.enabled || this.stencilState.enabled) {
            pipelineDescriptor.depthStencil = {
                format: this.getDepthStencilAttachment().format,
                depthWriteEnabled: this.depthState.enabled,
                depthCompare: this.depthState.enabled ? this.depthState.func : 'always',
                stencilFront: {
                    compare: this.stencilState.frontFunc,
                    failOp: this.stencilState.frontFail,
                    depthFailOp: this.stencilState.frontPassDepthFail,
                    passOp: this.stencilState.frontPassDepthPass,
                },
                stencilBack: {
                    compare: this.stencilState.backFunc,
                    failOp: this.stencilState.backFail,
                    depthFailOp: this.stencilState.backPassDepthFail,
                    passOp: this.stencilState.backPassDepthPass,
                },
                stencilWriteMask: this.stencilState.frontWriteMask, // TODO: WHATS THIS?
                stencilReadMask: this.stencilState.frontValueMask, // TODO: WHATS THIS?
                depthBias: this.polygonState.polygonOffsetFill ? this.polygonState.polygonOffsetUnits : undefined,
                depthBiasSlopeScale: this.polygonState.polygonOffsetFill ? this.polygonState.polygonOffsetFactor : undefined,
                // depthBiasClamp: this.polygonState.polygonOffsetClamp,
            }
            cacheKey += pipelineDescriptor.depthStencil;
        }
        return [fastHashCode(cacheKey).toString(), pipelineDescriptor];
    }

    public getRenderBundleEncoderDescriptor(): GPURenderBundleEncoderDescriptor {
        let ret = {
            colorFormats: this.commonState.drawFramebufferBinding.drawBuffers.map((value) => {
                if (value === WebGL2RenderingContext.BACK) {
                    return 'bgra8unorm';
                } else if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                    return this.commonState.drawFramebufferBinding.attachments.get(value).attachment.texture.format;
                } else {
                    return null;
                }
            }),
            // depthStencilFormat: this.getDepthStencilAttachment().format,
            // sampleCount: 1,
        }
        if (this.depthState.enabled || this.stencilState.enabled) {
            ret['depthStencilFormat'] = this.getDepthStencilAttachment().format;
        }
        return ret;
    }

    public getRenderPassDescriptorCacheKey(): string {
        let cacheKey: string = (this.clearState.target & WebGL2RenderingContext.COLOR_BUFFER_BIT) ? 'clear' : 'load' +
            this.clearState.color[0] + this.clearState.color[1] + this.clearState.color[2] + this.clearState.color[3];
        this.commonState.drawFramebufferBinding.drawBuffers
            .forEach((value) => {
                if (value === WebGL2RenderingContext.BACK) {
                    cacheKey += 'CV'
                } else if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                    cacheKey += this.commonState.drawFramebufferBinding.attachments.get(value).attachment.view.label;
                } else {
                    cacheKey += 'null';
                }
            });
        if (this.depthState.enabled || this.stencilState.enabled) {
            const dsa = this.getDepthStencilAttachment();
            cacheKey += '$' +
                dsa.view.label +
                (this.depthState.enabled ? ((this.clearState.target & WebGL2RenderingContext.DEPTH_BUFFER_BIT) ? 'clear' : 'load') : undefined) +
                (this.depthState.enabled ? 'store' : undefined) +
                this.clearState.depth +
                (this.stencilState.enabled ? ((this.clearState.target & WebGL2RenderingContext.STENCIL_BUFFER_BIT) ? 'clear' : 'load') : undefined) +
                (this.stencilState.enabled ? 'store' : undefined) +
                this.clearState.stencil;
        }
        return cacheKey;
    }

    public getRenderPassDescriptor(): GPURenderPassDescriptor {
        const renderPassDescriptor: GPURenderPassDescriptor = {
            // label: `RP@${commandEncoder.label}`,
            colorAttachments: this.commonState.drawFramebufferBinding.drawBuffers
                .map((value) => {
                    if (value === WebGL2RenderingContext.BACK) {
                        return {
                            view: this.__canvasView,
                            label: this.__canvasView.label,
                            loadOp: (this.clearState.target & WebGL2RenderingContext.COLOR_BUFFER_BIT) ? 'clear' : 'load',
                            storeOp: 'store',
                            clearValue: this.clearState.color,
                        };
                    } else if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                        const view = this.commonState.drawFramebufferBinding.attachments.get(value).attachment.view;
                        return {
                            view,
                            label: view.label,
                            loadOp: (this.clearState.target & WebGL2RenderingContext.COLOR_BUFFER_BIT) ? 'clear' : 'load',
                            storeOp: 'store',
                            clearValue: this.clearState.color,
                        };
                    } else {
                        return null;
                    }
                }),
        };
        if (this.depthState.enabled || this.stencilState.enabled) {
            const dsa = this.getDepthStencilAttachment();
            renderPassDescriptor.depthStencilAttachment = {
                view: dsa.view,
                depthClearValue: this.clearState.depth,
                depthLoadOp: (this.depthState.enabled ? ((this.clearState.target & WebGL2RenderingContext.DEPTH_BUFFER_BIT) ? 'clear' : 'load') : undefined),
                depthStoreOp: (this.depthState.enabled ? 'store' : undefined),
                depthReadOnly: false,
                stencilClearValue: this.clearState.stencil,
                stencilLoadOp: (this.stencilState.enabled ? ((this.clearState.target & WebGL2RenderingContext.STENCIL_BUFFER_BIT) ? 'clear' : 'load') : undefined),
                stencilStoreOp: (this.stencilState.enabled ? 'store' : undefined),
                stencilReadOnly: false,
            }
        }
        return renderPassDescriptor;
    }

    private _bindGroupCache: Map<string, GPUBindGroup> = new Map();
    private _bindGroupLayoutCache: Map<string, GPUBindGroupLayout> = new Map();
    private _pipelineLayoutCache: Map<string, GPUPipelineLayout> = new Map();
    private _pipelineCache: Map<string, GPURenderPipeline> = new Map();

    public getPBV(): PbvInfo {
        const [vertexBufferHashes, vertexBuffers, vertexBufferOffsets, vertexBufferLayoutHash, vertexBufferLayout] = this.getVertexBuffer();

        const [bindGroupHash, bindGroupEntries, bindGroupLayoutHash, bindGroupLayoutEntries] = this.getBindGroup();
        const pipelineLayoutHash = bindGroupLayoutHash;

        /* set pipeline */
        const [_pipelineHash, pipelineDescriptor] = this.getPipelineDescriptor(this.topology, vertexBufferLayout);
        const pipelineHash = _pipelineHash + '|' + bindGroupLayoutHash + '|' + vertexBufferLayoutHash;
        // this.lastPipelineDescriptor.label = fastHashCode(this.lastPipelineCacheKey).toString();

        let bindGroupLayout = this._bindGroupLayoutCache.get(bindGroupLayoutHash);
        if (!bindGroupLayout) {
            bindGroupLayout = this.device.createBindGroupLayout({
                entries: bindGroupLayoutEntries,
            });
            this._bindGroupLayoutCache.set(bindGroupLayoutHash, bindGroupLayout);
        }
        pipelineDescriptor.layout = this._pipelineLayoutCache.get(pipelineLayoutHash);
        if (!pipelineDescriptor.layout) {
            pipelineDescriptor.layout = this.device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout],
                label: 'pipelineLayout' + pipelineDescriptor.label,
            });
            this._pipelineLayoutCache.set(pipelineLayoutHash, pipelineDescriptor.layout);
        }
        let pipeline = this._pipelineCache.get(pipelineHash);
        if (!pipeline) {
            console.log('[HYD] create Pipeline');
            pipelineDescriptor.label = 'ppl' + this.__pipelineCount++;
            pipeline = this.device.createRenderPipeline(pipelineDescriptor);
            this._pipelineCache.set(pipelineHash, pipeline);
        }
        // this.pipelineCache.set(this.lastPipelineCacheKey, this.lastPipeline);

        /* set bindGroup */
        let bindGroup = this._bindGroupCache.get(bindGroupHash);
        if (!bindGroup) {
            console.log('[HYD] create BindGroup');
            bindGroup = this.device.createBindGroup({
                layout: bindGroupLayout,
                entries: bindGroupEntries,
                label: "bg" + this.__bindGroupCount++,
            });
            this._bindGroupCache.set(bindGroupHash, bindGroup);
        }
        const vertexBuffersHash = fastHashCode(vertexBufferHashes.join('%')).toString();
        return {
            pipelineHash,
            pipeline,
            bindGroupHash,
            bindGroup,
            vertexBuffersHash,
            vertexBufferHashes,
            vertexBuffers,
            vertexBufferOffsets,
            renderPassHash: fastHashCode(this.getRenderPassDescriptorCacheKey()).toString(),
            renderBundleEncoderDescriptor: this.getRenderBundleEncoderDescriptor(),
        }
    }

    private getDepthStencilAttachment(): { view: GPUTextureView, format: GPUTextureFormat } {
        if (this.depthState.enabled && this.stencilState.enabled) {
            return this.commonState.drawFramebufferBinding.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT).attachment;
        }
        if (this.depthState.enabled) {
            return this.commonState.drawFramebufferBinding.attachments.get(WebGL2RenderingContext.DEPTH_ATTACHMENT).attachment;
        }
        if (this.stencilState.enabled) {
            return this.commonState.drawFramebufferBinding.attachments.get(WebGL2RenderingContext.STENCIL_ATTACHMENT).attachment;
        }
        throw new Error("getDepthStencilAttachment failed");
    }

    public getBindGroup(): [string, GPUBindGroupEntry[], string, GPUBindGroupLayoutEntry[]] {
        const program = this.commonState.currentProgram;
        const bindGroupEntry: GPUBindGroupEntry[] = [];
        const bindGroupLayoutEntry: GPUBindGroupLayoutEntry[] = [];
        if (program.alignedUniformSize > 0) {
            bindGroupEntry.push({
                binding: 0,
                resource: {
                    buffer: this.uniformBuffer,
                    // offset: 0,  dynamicOffset
                    size: program.alignedUniformSize,
                    label: 'ub' + program.hash,
                },
            });
            bindGroupLayoutEntry.push({
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: {
                    type: 'uniform',
                    hasDynamicOffset: true,
                    minBindingSize: program.alignedUniformSize,
                },
            });
        }
        let bindGroupKey = program.hash;
        let bindGroupLayoutKey = '0-du-' + program.alignedUniformSize;

        for (const sampler of program.hydSamplers) {
            const textureAttachment: HydTexture = this.textureUnits[sampler.textureUnit];
            bindGroupLayoutEntry.push({
                binding: bindGroupLayoutEntry.length,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: {
                    type: textureAttachment.isDepthStencil ? 'non-filtering' : 'filtering',
                },
            });
            bindGroupLayoutEntry.push({
                binding: bindGroupLayoutEntry.length,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: textureAttachment.isDepthStencil ? 'unfilterable-float' : 'float',
                    viewDimension: sampler.viewDimension,
                    multisampled: false,
                },
            });
            bindGroupLayoutKey += bindGroupLayoutEntry.length + '-t-' + textureAttachment.isDepthStencil + sampler.viewDimension;
            bindGroupEntry.push({
                binding: bindGroupEntry.length,
                resource: textureAttachment.sampler,
            });
            bindGroupEntry.push({
                binding: bindGroupEntry.length,
                resource: textureAttachment.view,
            });
            bindGroupKey += this.textureUnits[sampler.textureUnit].hash;
        }
        for (const sampler of program.hydSamplers) {
            const textureAttachment: HydTexture = this.textureUnits[sampler.textureUnit];
            // textureAttachment.bindGroupHashes.push([this._bindGroupCache, bindGroupKey]);
            textureAttachment.onDestroy.push(() => {
                if (this._bindGroupCache.has(bindGroupKey)) {
                    // @ts-ignore
                    this._bindGroupCache.get(bindGroupKey).onDestroy();
                    this._bindGroupCache.delete(bindGroupKey);
                }
            });
        }
        return [fastHashCode(bindGroupKey).toString(), bindGroupEntry, bindGroupLayoutKey, bindGroupLayoutEntry];
    }

    public getVertexBuffer(): [string[], GPUBuffer[], number[], string, GPUVertexBufferLayout[]] {
        const bufferAttributeMap = new Map<string, [GPUBuffer, number, Array<GPUVertexAttribute>]>();
        const vao = this.commonState.vertexArrayBinding;
        const buffers: GPUBuffer[] = [];
        const layouts: GPUVertexBufferLayout[] = [];
        const offsets: number[] = [];
        const vbKeys = [];
        /*
        attribute: {
            public enabled: boolean = false;
            public size: number;
            public type: GLenum;
            public int: boolean;
            public normalized: boolean = false;
            public stride: number = 0;
            public offset: number = 0;
            public divisor: number = 0;
            public buffer: HydBuffer;
            public GPUAttribute: GPUVertexAttribute;
        }
        */
        for (const attribute of vao.attributes) {
            if (attribute.enabled) {
                if (!attribute.buffer) {
                    // throw new Error('[HYD] VertexArray attribute buffer is null.');
                    this.glError = WebGL2RenderingContext.INVALID_OPERATION;
                    return;
                }
                // TODO: if offset > stride, then we need to set the offset of this vertexBuffer when calling renderPass.setVertexBuffer
                // https://github.com/gpuweb/gpuweb/issues/1357#issuecomment-765079909
                let hash = attribute.buffer.hash + '|' + attribute.stride + '|' + Math.floor(attribute.offset / 2048);
                if (bufferAttributeMap.has(hash)) {
                    bufferAttributeMap.get(hash)[2].push({
                        shaderLocation: attribute.shaderLocation,
                        offset: attribute.offset,
                        format: attribute.format,
                    });
                } else {
                    bufferAttributeMap.set(hash, [attribute.buffer.buffer, attribute.stride, [{
                        shaderLocation: attribute.shaderLocation,
                        offset: attribute.offset,
                        format: attribute.format,
                    }]]);
                }
            }
        }

        let layoutKey = '';
        for (const [bufferHash, [buffer, arrayStride, attributes]] of bufferAttributeMap) {
            buffers.push(buffer);
            // let offset = attributes[0].offset;
            // for (let i = 1; i < attributes.length; i++) {
            //     offset = Math.min(offset, attributes[i].offset);
            // }
            const offset = Math.min.apply(null, attributes.map(a => a.offset));
            for (let i = 0; i < attributes.length; i++) {
                attributes[i].offset -= offset;
            }
            offsets.push(offset);
            layouts.push({
                arrayStride,
                attributes,
                stepMode: 'vertex',
            });
            layoutKey += attributes.toString() + arrayStride + '|';
            vbKeys.push(bufferHash + '|' + offset);
        }
        return [vbKeys, buffers, offsets, layoutKey, layouts];
    }
}

interface PbvInfo {
    pipelineHash: string,
    pipeline: GPURenderPipeline,
    bindGroupHash: string,
    bindGroup: GPUBindGroup,
    vertexBuffersHash: string,
    vertexBufferHashes: string[],
    vertexBuffers: GPUBuffer[],
    vertexBufferOffsets: number[],
    renderPassHash: string,
    renderBundleEncoderDescriptor: GPURenderBundleEncoderDescriptor,
}

export class HydHashPbv implements PbvInfo {
    public readonly hash: string;

    public generated: boolean = false;

    public pipelineHash: string = null;
    public bindGroupHash: string = null;
    public vertexBuffersHash: string = null;
    public vertexBufferHashes: string[] = null;

    public pipeline: GPURenderPipeline = null;
    public bindGroup: GPUBindGroup = null;
    public vertexBuffers: GPUBuffer[] = null;
    public vertexBufferOffsets: number[] = null;

    public renderBundleEncoderDescriptor: GPURenderBundleEncoderDescriptor = null;

    public renderPassHash: string = null;

    public jumpTable: Map<string, HydHashPbv> = new Map();

    public __last_visit_hash: string = null;
    public __last_visit_pbv: HydHashPbv = null;

    constructor(hash: string) {
        this.hash = hash;
    }
}

export class HydGlobalStateHashed extends HydGlobalState implements HydHashable {
    private _hashPbvCur: HydHashPbv = new HydHashPbv(null);
    private _hashPbvCache: Map<string, HydHashPbv> = new Map();
    public recordTransition(glFunc: string, ...glArgs: ({ toString(): string })[]) {
        // recordTransition 的正确性尤为重要！
        this.recordTransitionOne(glFunc + '$' + glArgs.join(','));
    }
    public recordTransitionOne(glOpHash: string) {
        // recordTransition 的正确性尤为重要！
        if (glOpHash === this._hashPbvCur.__last_visit_hash) {
            this._hashPbvCur = this._hashPbvCur.__last_visit_pbv;
            return;
        }
        let jumpToHashPbv;
        if (!(jumpToHashPbv = this._hashPbvCur.jumpTable.get(glOpHash))) {
            const newHash = this.hash;
            if (!this._hashPbvCache.has(newHash)) {
                jumpToHashPbv = new HydHashPbv(newHash);
                this._hashPbvCache.set(newHash, jumpToHashPbv);
            }
            else {
                jumpToHashPbv = this._hashPbvCache.get(newHash);
            }
            this._hashPbvCur.jumpTable.set(glOpHash, jumpToHashPbv);
        }
        this._hashPbvCur.__last_visit_hash = glOpHash;
        this._hashPbvCur.__last_visit_pbv = jumpToHashPbv;
        this._hashPbvCur = jumpToHashPbv;
    }

    public get hash(): string {
        return this.commonState.hash
            + this.depthState.hash
            + this.polygonState.hash
            + this.clearState.hash
            + this.blendState.hash
            + this.miscState.hash
            + this.stencilState.hash
            + this.textureUnits.map((texture) => texture.hash).join('|')
            + this.clearState.target.toString()
            + this.topology;
    }

    public getPBV(): PbvInfo {
        if (!this._hashPbvCur.generated) {
            // [this._hashPbvCur.pipelineHash, this._hashPbvCur.pipeline, this._hashPbvCur.bindGroupHash, this._hashPbvCur.bindGroup, this._hashPbvCur.vertexBufferHashes, this._hashPbvCur.vertexBuffers, this._hashPbvCur.renderPassHash] = super.getPBV();
            Object.assign(this._hashPbvCur, super.getPBV());
            this._hashPbvCur.generated = true;
            // @ts-ignore
            this._hashPbvCur.bindGroup.onDestroy = () => {
                this._hashPbvCur.generated = false;
            };
        }
        return this._hashPbvCur;
    }
}