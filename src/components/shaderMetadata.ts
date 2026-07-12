import type {
    InitShaderInfoType,
    NameAndType,
    TextureNameAndType,
} from "./shaderDB";
import {
    DEPTH_RANGE_DIFF_UNIFORM_NAME,
    DEPTH_RANGE_FAR_UNIFORM_NAME,
    DEPTH_RANGE_NEAR_UNIFORM_NAME,
    FRAG_COORD_HEIGHT_UNIFORM_NAME,
} from "./shaderInternalUniforms";
import { bridgeGlslIdentifier } from "./shaderGlslIdentifiers";
import {
    normalizeAnonymousUniformStructs,
    planValueStructUniforms,
} from "./shaderGlslStructs";
import { hydTrim } from "./shaderSource";

export type ShaderStage = "vertex" | "fragment";

export interface GlslDeclarations {
    attributes: NameAndType[];
    uniforms: NameAndType[];
    samplers: TextureNameAndType[];
    varyings: NameAndType[];
}

export interface ScanGlslDeclarationOptions {
    includeUnusedVaryings?: boolean;
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

interface IntegerExpressionToken {
    kind: "number" | "identifier" | "operator";
    value: string;
}

function tokenizeIntegerExpression(expression: string): IntegerExpressionToken[] | null {
    const tokens: IntegerExpressionToken[] = [];
    const token = /\s*(?:(0[xX][0-9a-fA-F]+[uU]?|\d+[uU]?)|([A-Za-z_]\w*)|(<<|>>|[()+\-*/%~&^|]))/gy;
    let cursor = 0;
    while (cursor < expression.length) {
        token.lastIndex = cursor;
        const match = token.exec(expression);
        if (!match || match.index !== cursor) return null;
        tokens.push({
            kind: match[1] ? "number" : match[2] ? "identifier" : "operator",
            value: match[1] || match[2] || match[3],
        });
        cursor = token.lastIndex;
    }
    return tokens;
}

function evaluateIntegerExpression(expression: string, constants: Map<string, number>): number | null {
    const tokens = tokenizeIntegerExpression(expression);
    if (!tokens) return null;
    let index = 0;
    const accept = (value: string) => tokens[index]?.value === value ? (index++, true) : false;
    const binary = (next: () => number | null, operators: string[], apply: (left: number, op: string, right: number) => number | null) => {
        let left = next();
        if (left === null) return null;
        while (operators.includes(tokens[index]?.value)) {
            const operator = tokens[index++].value;
            const right = next();
            if (right === null) return null;
            left = apply(left, operator, right);
            if (left === null) return null;
        }
        return left;
    };
    const primary = (): number | null => {
        const current = tokens[index];
        if (!current) return null;
        if (accept("(")) {
            const value = bitwiseOr();
            return value !== null && accept(")") ? value : null;
        }
        index++;
        if (current.kind === "number") return Number(current.value.replace(/[uU]$/, ""));
        return current.kind === "identifier" ? constants.get(current.value) ?? null : null;
    };
    const unary = (): number | null => {
        const operator = tokens[index]?.value;
        if (operator !== "+" && operator !== "-" && operator !== "~") return primary();
        index++;
        const value = unary();
        if (value === null) return null;
        return operator === "+" ? value : operator === "-" ? -value : ~value;
    };
    const multiply = (): number | null => binary(unary, ["*", "/", "%"], (left, operator, right) => {
        if ((operator === "/" || operator === "%") && right === 0) return null;
        if (operator === "*") return left * right;
        if (operator === "/") return Math.trunc(left / right);
        return left % right;
    });
    const add = (): number | null => binary(multiply, ["+", "-"], (left, operator, right) => operator === "+" ? left + right : left - right);
    const shift = (): number | null => binary(add, ["<<", ">>"], (left, operator, right) => operator === "<<" ? left << right : left >> right);
    const bitwiseAnd = (): number | null => binary(shift, ["&"], (left, _operator, right) => left & right);
    const bitwiseXor = (): number | null => binary(bitwiseAnd, ["^"], (left, _operator, right) => left ^ right);
    const bitwiseOr = (): number | null => binary(bitwiseXor, ["|"], (left, _operator, right) => left | right);
    const value = bitwiseOr();
    return value !== null && index === tokens.length && Number.isFinite(value) ? Math.trunc(value) : null;
}

function splitIntegerDeclarators(source: string): string[] {
    const result: string[] = [];
    let start = 0;
    let depth = 0;
    for (let index = 0; index < source.length; index++) {
        if (source[index] === "(") depth++;
        else if (source[index] === ")") depth--;
        else if (source[index] === "," && depth === 0) {
            result.push(source.slice(start, index));
            start = index + 1;
        }
    }
    result.push(source.slice(start));
    return result;
}

function integerDefines(source: string): Map<string, number> {
    const constants = new Map<string, number>();
    const pending: Array<{ name: string, expression: string }> = [];
    const defineRegex = /^\s*#define\s+([A-Za-z_]\w*)\s+([^\r\n]+)$/gm;
    for (let match = defineRegex.exec(source); match !== null; match = defineRegex.exec(source)) {
        pending.push({ name: match[1], expression: match[2].trim() });
    }
    const constRegex = /\bconst\s+(?:(?:lowp|mediump|highp)\s+)?(?:int|uint)\s+([^;]+);/g;
    for (let match = constRegex.exec(source); match !== null; match = constRegex.exec(source)) {
        if (!isTopLevelAt(source, match.index)) continue;
        for (const declarator of splitIntegerDeclarators(match[1])) {
            const assignment = /^\s*([A-Za-z_]\w*)\s*=\s*([\s\S]+)$/.exec(declarator);
            if (assignment) pending.push({ name: assignment[1], expression: assignment[2].trim() });
        }
    }
    for (let pass = 0; pass <= pending.length; pass++) {
        let changed = false;
        for (const item of pending) {
            if (constants.has(item.name)) continue;
            const value = evaluateIntegerExpression(item.expression, constants);
            if (value !== null) {
                constants.set(item.name, value);
                changed = true;
            }
        }
        if (!changed) break;
    }
    return constants;
}

function identifierArraySize(raw: string, defines: Map<string, number>): number {
    const match = raw.match(/\[\s*([^\]]+)\s*\]\s*$/);
    if (!match) return 1;
    const value = evaluateIntegerExpression(match[1], defines);
    return value === null ? 1 : Math.max(1, value);
}

function identifierIsArray(raw: string): boolean {
    return /\[\s*[^\]]+\s*\]\s*$/.test(raw);
}

function appendSamplerDeclarations(
    output: TextureNameAndType[],
    name: string,
    glslType: string,
    textureType: string,
    size: number,
    sourceName?: string,
    isArray: boolean = false,
) {
    for (let index = 0; index < size; index++) {
        output.push({
            name: isArray ? `${name}_${index}` : name,
            glsl_type: glslType,
            wgsl_texture_type: textureType,
            wgsl_sampler_type: "sampler",
            source_name: isArray ? `${sourceName || name}[${index}]` : sourceName,
            size,
            is_array: isArray,
            array_name: isArray ? (sourceName || name) : undefined,
            array_index: isArray ? index : undefined,
        });
    }
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

function declarationFrom(
    glslType: string,
    name: string,
    interpolation: string = "",
    sourceName?: string,
    uniform: boolean = false,
    size: number = 1,
    isArray: boolean = false,
): NameAndType {
    const elementType = uniform ? toUniformWgslType(glslType) : toWgslType(glslType);
    return {
        name,
        glsl_type: glslType,
        wgsl_type: isArray ? `array<${elementType}, ${size}>` : elementType,
        interpolation,
        source_name: sourceName,
        size,
        is_array: isArray,
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
    size: number;
    isArray: boolean;
}

function parseStructDefinitions(source: string, defines: Map<string, number>): Map<string, StructField[]> {
    const structs = new Map<string, StructField[]>();
    const structRegex = /\bstruct\s+([A-Za-z_]\w*)\s*\{([\s\S]*?)\}\s*;/g;
    let match: RegExpExecArray;
    while ((match = structRegex.exec(source)) !== null) {
        const fields: StructField[] = [];
        const fieldRegex = /^\s*(?:(?:lowp|mediump|highp)\s+)?([A-Za-z_]\w*)\s+([A-Za-z_]\w*\s*(?:\[[^\]]*\])?)\s*;/gm;
        let fieldMatch: RegExpExecArray;
        while ((fieldMatch = fieldRegex.exec(match[2])) !== null) {
            const rawName = fieldMatch[2].replace(/\s+/g, "");
            fields.push({
                glslType: fieldMatch[1],
                name: normalizeIdentifierName(rawName),
                size: identifierArraySize(rawName, defines),
                isArray: identifierIsArray(rawName),
            });
        }
        structs.set(match[1], fields);
    }
    return structs;
}

export function scanGlslDeclarations(
    source: string,
    stage: ShaderStage,
    options: ScanGlslDeclarationOptions = {},
): GlslDeclarations {
    const cleaned = normalizeAnonymousUniformStructs(stripComments(source));
    const defines = integerDefines(cleaned);
    const declarations: GlslDeclarations = {
        attributes: [],
        uniforms: [],
        samplers: [],
        varyings: [],
    };
    const structs = parseStructDefinitions(cleaned, defines);
    const valueStructUniforms = planValueStructUniforms(cleaned);

    const seen = new Set<string>();
    const declarationPattern = /\b(?:(?:layout\s*\([^)]*\)\s*)?)(?:invariant\s+)?(?:(?:lowp|mediump|highp)\s+)?((?:(?:flat|smooth|noperspective|centroid|sample)\s+)*)(attribute|uniform|varying|in|out)\s+(?:(?:lowp|mediump|highp)\s+)?([A-Za-z_]\w*)\s+([^;]+)\s*;/g;
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
            const sourceName = normalizeIdentifierName(rawName);
            const name = bridgeGlslIdentifier(sourceName);
            const size = identifierArraySize(rawName, defines);
            const isArray = identifierIsArray(rawName);
            if (!name) continue;
            const key = `${qualifier}:${glslType}:${name}`;
            if (seen.has(key)) continue;
            seen.add(key);

            if (qualifier === "uniform") {
                if (!isIdentifierReferenced(bodyWithoutGlobalDeclarations, sourceName)) {
                    continue;
                }
                const textureType = SAMPLER_TEXTURE_MAP.get(glslType);
                if (textureType) {
                    appendSamplerDeclarations(
                        declarations.samplers,
                        name,
                        glslType,
                        textureType,
                        size,
                        name === sourceName ? undefined : sourceName,
                        isArray,
                    );
                } else if (structs.has(glslType)) {
                    const rootReferenced = isIdentifierReferenced(bodyWithoutGlobalDeclarations, sourceName);
                    for (const field of structs.get(glslType)) {
                        const fieldTextureType = SAMPLER_TEXTURE_MAP.get(field.glslType);
                        if (fieldTextureType) {
                            if (!rootReferenced) continue;
                            const outerCount = isArray ? size : 1;
                            const fieldCount = field.isArray ? field.size : 1;
                            for (let outerIndex = 0; outerIndex < outerCount; outerIndex++) {
                                const rootName = isArray ? `${sourceName}[${outerIndex}]` : sourceName;
                                const fieldBase = `${rootName}.${field.name}`;
                                for (let fieldIndex = 0; fieldIndex < fieldCount; fieldIndex++) {
                                    const sourceName = field.isArray ? `${fieldBase}[${fieldIndex}]` : fieldBase;
                                    declarations.samplers.push({
                                        name: sanitizeResourceName(sourceName),
                                        glsl_type: field.glslType,
                                        wgsl_texture_type: fieldTextureType,
                                        wgsl_sampler_type: "sampler",
                                        source_name: sourceName,
                                        size: outerCount * fieldCount,
                                        is_array: isArray || field.isArray,
                                        array_name: field.isArray ? fieldBase : undefined,
                                        array_index: field.isArray ? fieldIndex : undefined,
                                    });
                                }
                            }
                        }
                    }
                    for (const leaf of valueStructUniforms.leaves.filter((item) => item.rootName === sourceName)) {
                        declarations.uniforms.push(declarationFrom(
                            leaf.glslType,
                            leaf.name,
                            "",
                            leaf.sourceName,
                            true,
                            leaf.size,
                            leaf.isArray,
                        ));
                    }
                } else if (isKnownValueType(glslType)) {
                    declarations.uniforms.push(declarationFrom(
                        glslType,
                        name,
                        "",
                        name === sourceName ? undefined : sourceName,
                        true,
                        size,
                        isArray,
                    ));
                } else {
                    continue;
                }
                continue;
            }

            if (qualifier === "attribute" || (qualifier === "in" && stage === "vertex")) {
                if (!isIdentifierReferenced(bodyWithoutGlobalDeclarations, sourceName)) {
                    continue;
                }
                if (!isKnownValueType(glslType)) {
                    continue;
                }
                declarations.attributes.push(declarationFrom(
                    glslType,
                    name,
                    interpolation,
                    name === sourceName ? undefined : sourceName,
                    false,
                    size,
                    isArray,
                ));
                continue;
            }

            if (qualifier === "varying" || (qualifier === "out" && stage === "vertex") || (qualifier === "in" && stage === "fragment")) {
                if (!options.includeUnusedVaryings && !isIdentifierReferenced(bodyWithoutGlobalDeclarations, sourceName)) {
                    continue;
                }
                if (!isKnownValueType(glslType)) {
                    continue;
                }
                declarations.varyings.push(declarationFrom(
                    glslType,
                    name,
                    interpolation,
                    name === sourceName ? undefined : sourceName,
                    false,
                    size,
                    isArray,
                ));
            }
        }
    }

    return declarations;
}

export function makeShaderMetadata(source: string, type: GLenum, wgsl: string = ""): InitShaderInfoType {
    const stage: ShaderStage = type === 0x8B31 ? "vertex" : "fragment";
    const declarations = scanGlslDeclarations(source, stage);
    const sourceWithoutComments = stripComments(source);
    const readsFragCoord = stage === "fragment" && /\bgl_FragCoord\b/.test(
        sourceWithoutComments.replace(/\binvariant\s+gl_FragCoord\s*;/g, ""),
    );
    if (readsFragCoord) {
        declarations.uniforms.push({
            name: FRAG_COORD_HEIGHT_UNIFORM_NAME,
            glsl_type: "float",
            wgsl_type: "f32",
            internal: true,
        });
    }
    if (/\bgl_DepthRange\s*\./.test(sourceWithoutComments)) {
        declarations.uniforms.push(
            {
                name: DEPTH_RANGE_NEAR_UNIFORM_NAME,
                source_name: "gl_DepthRange.near",
                glsl_type: "float",
                wgsl_type: "f32",
                internal: true,
            },
            {
                name: DEPTH_RANGE_FAR_UNIFORM_NAME,
                source_name: "gl_DepthRange.far",
                glsl_type: "float",
                wgsl_type: "f32",
                internal: true,
            },
            {
                name: DEPTH_RANGE_DIFF_UNIFORM_NAME,
                source_name: "gl_DepthRange.diff",
                glsl_type: "float",
                wgsl_type: "f32",
                internal: true,
            },
        );
    }
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
