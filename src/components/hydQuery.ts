export interface HydOcclusionQuerySegment {
    querySet: GPUQuerySet;
    capacity: number;
    used: number;
}

export class HydQuery {
    public initialized: boolean = false;
    public deleted: boolean = false;
    public active: boolean = false;
    public target: GLenum = 0;
    public result: number = 0;
    public available: boolean = false;
    public generation: number = 0;
    public occlusionSegments: HydOcclusionQuerySegment[] = [];

    constructor(public readonly ownerToken: object) {}
}
