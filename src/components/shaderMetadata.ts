import type {
    InitShaderInfoType,
    NameAndType,
    TextureNameAndType,
} from "./shaderDB";
import { hydTrim } from "./shaderSource";

export type ShaderStage = "vertex" | "fragment";

export interface GlslDeclarations {
    attributes: NameAndType[];
    uniforms: NameAndType[];
    samplers: TextureNameAndType[];
    varyings: NameAndType[];
}

const TYPE_MAP: Map<string, string> = new Map([
    ["float", "f32"],
    ["int", "i32"],
    ["uint", "u32"],
    ["bool", "bool"],
    ["vec2", "vec2<f32>"],
    ["vec3", "vec3<f32>"],
    ["vec4", "vec4<f32>"],
    ["ivec2", "vec2<i32>"],
    ["ivec3", "vec3<i32>"],
    ["ivec4", "vec4<i32>"],
    ["uvec2", "vec2<u32>"],
    ["uvec3", "vec3<u32>"],
    ["uvec4", "vec4<u32>"],
    ["bvec2", "vec2<bool>"],
    ["bvec3", "vec3<bool>"],
    ["bvec4", "vec4<bool>"],
    ["mat2", "mat2x2<f32>"],
    ["mat3", "mat3x3<f32>"],
    ["mat4", "mat4x4<f32>"],
    ["mat2x2", "mat2x2<f32>"],
    ["mat2x3", "mat2x3<f32>"],
    ["mat2x4", "mat2x4<f32>"],
    ["mat3x2", "mat3x2<f32>"],
    ["mat3x3", "mat3x3<f32>"],
    ["mat3x4", "mat3x4<f32>"],
    ["mat4x2", "mat4x2<f32>"],
    ["mat4x3", "mat4x3<f32>"],
    ["mat4x4", "mat4x4<f32>"],
]);

const SAMPLER_TEXTURE_MAP: Map<string, string> = new Map([
    ["sampler2D", "texture_2d<f32>"],
    ["samplerCube", "texture_cube<f32>"],
    ["sampler2DArray", "texture_2d_array<f32>"],
    ["sampler3D", "texture_3d<f32>"],
    ["isampler2D", "texture_2d<i32>"],
    ["isamplerCube", "texture_cube<i32>"],
    ["isampler2DArray", "texture_2d_array<i32>"],
    ["isampler3D", "texture_3d<i32>"],
    ["usampler2D", "texture_2d<u32>"],
    ["usamplerCube", "texture_cube<u32>"],
    ["usampler2DArray", "texture_2d_array<u32>"],
    ["usampler3D", "texture_3d<u32>"],
]);

function stripComments(source: string): string {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
}

function normalizeIdentifierName(raw: string): string {
    return raw.replace(/\[[^\]]*\]$/, "").replace(/;$/, "").trim();
}

function sanitizeResourceName(name: string): string {
    return name.replace(/[^A-Za-z0-9_]/g, "_").replace(/_+$/g, "");
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isIdentifierReferenced(source: string, name: string): boolean {
    return new RegExp(`\\b${escapeRegExp(name)}\\b`).test(source);
}

function isTopLevelAt(source: string, index: number): boolean {
    let braceDepth = 0;
    let parenDepth = 0;
    for (let i = 0; i < index; i++) {
        const ch = source[i];
        if (ch === "{") {
            braceDepth++;
        } else if (ch === "}") {
            braceDepth = Math.max(0, braceDepth - 1);
        } else if (ch === "(") {
            parenDepth++;
        } else if (ch === ")") {
            parenDepth = Math.max(0, parenDepth - 1);
        }
    }
    return braceDepth === 0 && parenDepth === 0;
}

function toWgslType(glslType: string): string {
    const mapped = TYPE_MAP.get(glslType);
    if (!mapped) {
        throw new Error(`unsupported GLSL type: ${glslType}`);
    }
    return mapped;
}

function toUniformWgslType(glslType: string): string {
    switch (glslType) {
        case "bool":
            return "u32";
        case "bvec2":
            return "vec2<u32>";
        case "bvec3":
            return "vec3<u32>";
        case "bvec4":
            return "vec4<u32>";
        default:
            return toWgslType(glslType);
    }
}

function declarationFrom(glslType: string, name: string, interpolation: string = "", sourceName?: string, uniform: boolean = false): NameAndType {
    return {
        name,
        glsl_type: glslType,
        wgsl_type: uniform ? toUniformWgslType(glslType) : toWgslType(glslType),
        interpolation,
        source_name: sourceName,
    };
}

function isKnownValueType(glslType: string): boolean {
    return TYPE_MAP.has(glslType);
}

function isKnownSamplerType(glslType: string): boolean {
    return SAMPLER_TEXTURE_MAP.has(glslType);
}

interface StructField {
    name: string;
    glslType: string;
}

function parseStructDefinitions(source: string): Map<string, StructField[]> {
    const structs = new Map<string, StructField[]>();
    const structRegex = /\bstruct\s+([A-Za-z_]\w*)\s*\{([\s\S]*?)\}\s*;/g;
    let match: RegExpExecArray;
    while ((match = structRegex.exec(source)) !== null) {
        const fields: StructField[] = [];
        const fieldRegex = /^\s*(?:(?:lowp|mediump|highp)\s+)?([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*(?:\[[^\]]*\])?\s*;/gm;
        let fieldMatch: RegExpExecArray;
        while ((fieldMatch = fieldRegex.exec(match[2])) !== null) {
            fields.push({
                glslType: fieldMatch[1],
                name: fieldMatch[2],
            });
        }
        structs.set(match[1], fields);
    }
    return structs;
}

export function scanGlslDeclarations(source: string, stage: ShaderStage): GlslDeclarations {
    const cleaned = stripComments(source);
    const declarations: GlslDeclarations = {
        attributes: [],
        uniforms: [],
        samplers: [],
        varyings: [],
    };
    const structs = parseStructDefinitions(cleaned);

    const seen = new Set<string>();
    const declarationPattern = /(?:^|[;\n])\s*(?:(?:layout\s*\([^)]*\)\s*)?)(?:(?:lowp|mediump|highp)\s+)?((?:(?:flat|smooth|noperspective|centroid|sample)\s+)*)(attribute|uniform|varying|in|out)\s+(?:(?:lowp|mediump|highp)\s+)?([A-Za-z_]\w*)\s+([^;]+)\s*;/g;
    const bodyWithoutGlobalDeclarations = cleaned.replace(declarationPattern, (full, ...args) => {
        const offset = args[args.length - 2] as number;
        return isTopLevelAt(cleaned, offset) ? "\n" : full;
    });
    const declarationRegex = new RegExp(declarationPattern);
    let match: RegExpExecArray;
    while ((match = declarationRegex.exec(cleaned)) !== null) {
        if (!isTopLevelAt(cleaned, match.index)) {
            continue;
        }
        const interpolation = match[1].trim();
        const qualifier = match[2];
        const glslType = match[3];
        const names = match[4].split(",");
        for (const rawName of names) {
            const name = normalizeIdentifierName(rawName);
            if (!name) continue;
            const key = `${qualifier}:${glslType}:${name}`;
            if (seen.has(key)) continue;
            seen.add(key);

            if (qualifier === "uniform") {
                if (!isIdentifierReferenced(bodyWithoutGlobalDeclarations, name)) {
                    continue;
                }
                const textureType = SAMPLER_TEXTURE_MAP.get(glslType);
                if (textureType) {
                    declarations.samplers.push({
                        name,
                        glsl_type: glslType,
                        wgsl_texture_type: textureType,
                        wgsl_sampler_type: "sampler",
                    });
                } else if (structs.has(glslType)) {
                    for (const field of structs.get(glslType)) {
                        const sourceName = `${name}.${field.name}`;
                        if (!isIdentifierReferenced(bodyWithoutGlobalDeclarations, sourceName)) {
                            continue;
                        }
                        const fieldTextureType = SAMPLER_TEXTURE_MAP.get(field.glslType);
                        const fieldName = sanitizeResourceName(sourceName);
                        if (fieldTextureType) {
                            declarations.samplers.push({
                                name: fieldName,
                                glsl_type: field.glslType,
                                wgsl_texture_type: fieldTextureType,
                                wgsl_sampler_type: "sampler",
                                source_name: sourceName,
                            });
                        } else if (isKnownValueType(field.glslType)) {
                            declarations.uniforms.push(declarationFrom(field.glslType, fieldName, "", sourceName, true));
                        }
                    }
                } else if (isKnownValueType(glslType)) {
                    declarations.uniforms.push(declarationFrom(glslType, name, "", undefined, true));
                } else {
                    continue;
                }
                continue;
            }

            if (qualifier === "attribute" || (qualifier === "in" && stage === "vertex")) {
                if (!isIdentifierReferenced(bodyWithoutGlobalDeclarations, name)) {
                    continue;
                }
                if (!isKnownValueType(glslType)) {
                    continue;
                }
                declarations.attributes.push(declarationFrom(glslType, name, interpolation));
                continue;
            }

            if (qualifier === "varying" || (qualifier === "out" && stage === "vertex") || (qualifier === "in" && stage === "fragment")) {
                if (!isKnownValueType(glslType)) {
                    continue;
                }
                declarations.varyings.push(declarationFrom(glslType, name, interpolation));
            }
        }
    }

    return declarations;
}

export function makeShaderMetadata(source: string, type: GLenum, wgsl: string = ""): InitShaderInfoType {
    const stage: ShaderStage = type === WebGLRenderingContext.VERTEX_SHADER ? "vertex" : "fragment";
    const declarations = scanGlslDeclarations(source, stage);
    return {
        attributes: stage === "vertex" ? declarations.attributes : [],
        uniforms: declarations.uniforms,
        samplers: declarations.samplers,
        glsl: hydTrim(source),
        wgsl,
        debug_info: JSON.stringify({
            source: "runtime",
            stage,
            translated: wgsl.length > 0,
        }),
    };
}
