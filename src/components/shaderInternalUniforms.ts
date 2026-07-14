export const FRAG_COORD_HEIGHT_UNIFORM_NAME = "hyd_internal_fragCoordHeight";
export const DEPTH_RANGE_NEAR_UNIFORM_NAME = "hyd_internal_depthRangeNear";
export const DEPTH_RANGE_FAR_UNIFORM_NAME = "hyd_internal_depthRangeFar";
export const DEPTH_RANGE_DIFF_UNIFORM_NAME = "hyd_internal_depthRangeDiff";

export function samplerFlipYUniformName(samplerName: string): string {
    return `_hyd_samplerFlipY_${samplerName}`;
}
