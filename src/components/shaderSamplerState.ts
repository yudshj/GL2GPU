export interface SamplerCoordinateScaleOverrideNames {
    x: string;
    y: string;
}

function sanitizeIdentifier(value: string): string {
    return value.replace(/[^A-Za-z0-9_]/g, "_");
}

export function samplerCoordinateScaleOverrideNames(
    samplerName: string,
): SamplerCoordinateScaleOverrideNames {
    const suffix = sanitizeIdentifier(samplerName);
    return {
        x: `hydgl2gpu_sampler_scale_x_${suffix}`,
        y: `hydgl2gpu_sampler_scale_y_${suffix}`,
    };
}

export function resolveSamplerCoordinateScale(
    logicalWidth: number,
    logicalHeight: number,
    physicalWidth: number,
    physicalHeight: number,
): [number, number] {
    const scale = (logical: number, physical: number): number => {
        if (!Number.isFinite(logical) || !Number.isFinite(physical) ||
            logical <= 0 || physical <= 0 || logical >= physical) {
            return 1;
        }
        return logical / physical;
    };
    return [
        scale(logicalWidth, physicalWidth),
        scale(logicalHeight, physicalHeight),
    ];
}

export function webGlArrayLayerExpression(
    tintArrayIndex: string,
    textureName: string,
): string {
    const trimmed = tintArrayIndex.trim();
    const converted = /^i32\s*\(([\s\S]*)\)$/.exec(trimmed);
    const floatingLayer = converted ? converted[1].trim() : `f32(${trimmed})`;
    return `_hyd_webglArrayLayer(${floatingLayer}, textureNumLayers(${textureName}))`;
}
