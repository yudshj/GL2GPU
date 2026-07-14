import type { NameAndType } from "./shaderDB";

export interface BooleanUniformSpecialization {
    uniformName: string;
    overrideName: string;
    referenceCount: number;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countUniformReferences(wgsl: string, uniformName: string): number {
    const reference = `_hyd_uniforms_.${uniformName}`;
    return wgsl.match(new RegExp(`${escapeRegExp(reference)}\\b`, "g"))?.length || 0;
}

function stableNameHash(value: string): string {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index++) {
        hash = Math.imul(hash ^ value.charCodeAt(index), 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
}

function insertOverrides(wgsl: string, declarations: string[]): string {
    if (declarations.length === 0) return wgsl;
    const directivePrefix = wgsl.match(
        /^\s*(?:(?:(?:enable|requires)\s+[^;]+;|diagnostic\s*\([^;]+\)\s*;)\s*)+/,
    );
    const insertion = directivePrefix ? directivePrefix[0].length : 0;
    return wgsl.slice(0, insertion) + declarations.join("\n") + "\n\n" + wgsl.slice(insertion);
}

export function selectBooleanUniformSpecializations(
    uniforms: NameAndType[],
    modules: string[],
    limit: number = 8,
): BooleanUniformSpecialization[] {
    if (limit <= 0) return [];
    return uniforms
        .filter((uniform) => uniform.glsl_type === "bool" && !uniform.internal &&
            !uniform.is_array && (uniform.size || 1) === 1)
        .map((uniform) => ({
            uniformName: uniform.name,
            overrideName: `_hyd_static_bool_${stableNameHash(uniform.name)}`,
            referenceCount: modules.reduce(
                (sum, module) => sum + countUniformReferences(module, uniform.name),
                0,
            ),
        }))
        .filter((candidate) => candidate.referenceCount > 0)
        .sort((left, right) => right.referenceCount - left.referenceCount ||
            left.uniformName.localeCompare(right.uniformName))
        .slice(0, limit);
}

export function lowerBooleanUniformSpecializations(
    wgsl: string,
    specializations: BooleanUniformSpecialization[],
): { wgsl: string, overrides: Map<string, string> } {
    let out = wgsl;
    const overrides = new Map<string, string>();
    const declarations: string[] = [];
    for (const specialization of specializations) {
        const reference = `_hyd_uniforms_.${specialization.uniformName}`;
        const pattern = new RegExp(`${escapeRegExp(reference)}\\b`, "g");
        if (!pattern.test(out)) continue;
        pattern.lastIndex = 0;
        out = out.replace(pattern, specialization.overrideName);
        overrides.set(specialization.uniformName, specialization.overrideName);
        declarations.push(`override ${specialization.overrideName}: u32 = 0u;`);
    }
    return { wgsl: insertOverrides(out, declarations), overrides };
}
