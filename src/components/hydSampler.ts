import { enumToCompareFunction } from "./hydConstants";

const MIN_FILTERS = new Map<GLenum, { minFilter: GPUFilterMode, mipmapFilter: GPUMipmapFilterMode, mipmapped: boolean }>([
    [WebGL2RenderingContext.NEAREST, { minFilter: "nearest", mipmapFilter: "nearest", mipmapped: false }],
    [WebGL2RenderingContext.LINEAR, { minFilter: "linear", mipmapFilter: "nearest", mipmapped: false }],
    [WebGL2RenderingContext.NEAREST_MIPMAP_NEAREST, { minFilter: "nearest", mipmapFilter: "nearest", mipmapped: true }],
    [WebGL2RenderingContext.LINEAR_MIPMAP_NEAREST, { minFilter: "linear", mipmapFilter: "nearest", mipmapped: true }],
    [WebGL2RenderingContext.NEAREST_MIPMAP_LINEAR, { minFilter: "nearest", mipmapFilter: "linear", mipmapped: true }],
    [WebGL2RenderingContext.LINEAR_MIPMAP_LINEAR, { minFilter: "linear", mipmapFilter: "linear", mipmapped: true }],
]);

const WRAP_MODES = new Map<GLenum, GPUAddressMode>([
    [WebGL2RenderingContext.CLAMP_TO_EDGE, "clamp-to-edge"],
    [WebGL2RenderingContext.REPEAT, "repeat"],
    [WebGL2RenderingContext.MIRRORED_REPEAT, "mirror-repeat"],
]);

export interface HydSamplerCompletenessState {
    mipmapped: boolean;
    wrapS: GLenum;
    wrapT: GLenum;
    filtering: boolean;
    compareMode: GLenum;
}

export function resolveWebGpuSamplerLodClamps(minLod: number, maxLod: number): {
    lodMinClamp: number,
    lodMaxClamp: number,
} {
    const lodMinClamp = Math.max(0, minLod);
    return {
        lodMinClamp,
        lodMaxClamp: Math.max(lodMinClamp, maxLod),
    };
}

export class HydSampler {
    public readonly ownerToken: object;
    public deleted: boolean = false;
    private version: number = 0;
    private readonly parameters = new Map<GLenum, number>();
    private readonly gpuSamplers = new Map<string, GPUSampler>();

    constructor(private readonly device: GPUDevice, ownerToken?: object) {
        this.ownerToken = ownerToken;
        this.parameters.set(WebGL2RenderingContext.TEXTURE_MIN_FILTER, WebGL2RenderingContext.NEAREST_MIPMAP_LINEAR);
        this.parameters.set(WebGL2RenderingContext.TEXTURE_MAG_FILTER, WebGL2RenderingContext.LINEAR);
        this.parameters.set(WebGL2RenderingContext.TEXTURE_WRAP_S, WebGL2RenderingContext.REPEAT);
        this.parameters.set(WebGL2RenderingContext.TEXTURE_WRAP_T, WebGL2RenderingContext.REPEAT);
        this.parameters.set(WebGL2RenderingContext.TEXTURE_WRAP_R, WebGL2RenderingContext.REPEAT);
        this.parameters.set(WebGL2RenderingContext.TEXTURE_MIN_LOD, -1000);
        this.parameters.set(WebGL2RenderingContext.TEXTURE_MAX_LOD, 1000);
        this.parameters.set(WebGL2RenderingContext.TEXTURE_COMPARE_MODE, WebGL2RenderingContext.NONE);
        this.parameters.set(WebGL2RenderingContext.TEXTURE_COMPARE_FUNC, WebGL2RenderingContext.LEQUAL);
    }

    public setParameter(pname: GLenum, value: number) {
        if (this.parameters.get(pname) === value) return;
        this.parameters.set(pname, value);
        this.version++;
        this.gpuSamplers.clear();
    }

    public getParameter(pname: GLenum): number | undefined {
        return this.parameters.get(pname);
    }

    public get completenessState(): HydSamplerCompletenessState {
        const minFilter = MIN_FILTERS.get(this.parameters.get(WebGL2RenderingContext.TEXTURE_MIN_FILTER)) ||
            MIN_FILTERS.get(WebGL2RenderingContext.NEAREST_MIPMAP_LINEAR)!;
        return {
            mipmapped: minFilter.mipmapped,
            wrapS: this.parameters.get(WebGL2RenderingContext.TEXTURE_WRAP_S),
            wrapT: this.parameters.get(WebGL2RenderingContext.TEXTURE_WRAP_T),
            filtering: minFilter.minFilter === "linear" ||
                (minFilter.mipmapped && minFilter.mipmapFilter === "linear") ||
                this.parameters.get(WebGL2RenderingContext.TEXTURE_MAG_FILTER) === WebGL2RenderingContext.LINEAR,
            compareMode: this.parameters.get(WebGL2RenderingContext.TEXTURE_COMPARE_MODE),
        };
    }

    public samplerForBinding(
        bindingType: GPUSamplerBindingType,
        viewDimension: GPUTextureViewDimension = "2d",
    ): GPUSampler {
        const cacheKey = `${bindingType}:${viewDimension}:${this.version}`;
        const cached = this.gpuSamplers.get(cacheKey);
        if (cached) return cached;
        const min = MIN_FILTERS.get(this.parameters.get(WebGL2RenderingContext.TEXTURE_MIN_FILTER))!;
        const lodClamps = resolveWebGpuSamplerLodClamps(
            this.parameters.get(WebGL2RenderingContext.TEXTURE_MIN_LOD),
            this.parameters.get(WebGL2RenderingContext.TEXTURE_MAX_LOD),
        );
        const nonFiltering = bindingType === "non-filtering";
        const cube = viewDimension === "cube" || viewDimension === "cube-array";
        const descriptor: GPUSamplerDescriptor = {
            minFilter: nonFiltering ? "nearest" : min.minFilter,
            magFilter: nonFiltering || this.parameters.get(WebGL2RenderingContext.TEXTURE_MAG_FILTER) === WebGL2RenderingContext.NEAREST
                ? "nearest"
                : "linear",
            mipmapFilter: nonFiltering ? "nearest" : min.mipmapFilter,
            addressModeU: cube ? "clamp-to-edge" : WRAP_MODES.get(this.parameters.get(WebGL2RenderingContext.TEXTURE_WRAP_S)),
            addressModeV: cube ? "clamp-to-edge" : WRAP_MODES.get(this.parameters.get(WebGL2RenderingContext.TEXTURE_WRAP_T)),
            addressModeW: cube ? "clamp-to-edge" : WRAP_MODES.get(this.parameters.get(WebGL2RenderingContext.TEXTURE_WRAP_R)),
            ...lodClamps,
            compare: bindingType === "comparison"
                ? enumToCompareFunction.get(this.parameters.get(WebGL2RenderingContext.TEXTURE_COMPARE_FUNC)) || "less-equal"
                : undefined,
            label: `HydSampler-${this.version}-${bindingType}-${viewDimension}`,
        };
        const sampler = this.device.createSampler(descriptor);
        this.gpuSamplers.set(cacheKey, sampler);
        return sampler;
    }

    public get hash(): string {
        return `sampler:${this.version}`;
    }
}
