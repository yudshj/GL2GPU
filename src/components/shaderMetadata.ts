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
]);

function stripComments(source: string): string {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
}

function normalizeIdentifierName(raw: string): string {
    return raw.replace(/\[[^\]]*\]$/, "").replace(/;$/, "").trim();
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isIdentifierReferenced(source: string, name: string): boolean {
    return new RegExp(`\\b${escapeRegExp(name)}\\b`).test(source);
}

function toWgslType(glslType: string): string {
    const mapped = TYPE_MAP.get(glslType);
    if (!mapped) {
        throw new Error(`unsupported GLSL type: ${glslType}`);
    }
    return mapped;
}

function declarationFrom(glslType: string, name: string): NameAndType {
    return {
        name,
        glsl_type: glslType,
        wgsl_type: toWgslType(glslType),
    };
}

export function scanGlslDeclarations(source: string, stage: ShaderStage): GlslDeclarations {
    const cleaned = stripComments(source);
    const declarations: GlslDeclarations = {
        attributes: [],
        uniforms: [],
        samplers: [],
        varyings: [],
    };

    const seen = new Set<string>();
    const declarationPattern = /(?:^|[;\n])\s*(?:(?:layout\s*\([^)]*\)\s*)?)(?:(?:lowp|mediump|highp)\s+)?(attribute|uniform|varying|in|out)\s+(?:(?:lowp|mediump|highp)\s+)?([A-Za-z_]\w*)\s+([^;]+)\s*;/g;
    const bodyWithoutGlobalDeclarations = cleaned.replace(declarationPattern, "\n");
    const declarationRegex = new RegExp(declarationPattern);
    let match: RegExpExecArray;
    while ((match = declarationRegex.exec(cleaned)) !== null) {
        const qualifier = match[1];
        const glslType = match[2];
        const names = match[3].split(",");
        for (const rawName of names) {
            const name = normalizeIdentifierName(rawName);
            if (!name) continue;
            const key = `${qualifier}:${glslType}:${name}`;
            if (seen.has(key)) continue;
            seen.add(key);

            if (qualifier === "uniform") {
                const textureType = SAMPLER_TEXTURE_MAP.get(glslType);
                if (textureType) {
                    declarations.samplers.push({
                        name,
                        glsl_type: glslType,
                        wgsl_texture_type: textureType,
                        wgsl_sampler_type: "sampler",
                    });
                } else {
                    declarations.uniforms.push(declarationFrom(glslType, name));
                }
                continue;
            }

            if (qualifier === "attribute" || (qualifier === "in" && stage === "vertex")) {
                if (!isIdentifierReferenced(bodyWithoutGlobalDeclarations, name)) {
                    continue;
                }
                declarations.attributes.push(declarationFrom(glslType, name));
                continue;
            }

            if (qualifier === "varying" || (qualifier === "out" && stage === "vertex") || (qualifier === "in" && stage === "fragment")) {
                declarations.varyings.push(declarationFrom(glslType, name));
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
