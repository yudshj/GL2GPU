import { isReservedWgslIdentifier } from "./shaderWgslTypes";

const GLSL_310_IDENTIFIER_CONFLICTS = new Set([
    "abs", "acos", "all", "any", "asin", "atan", "ceil", "clamp", "cos", "cosh", "cross",
    "degrees", "determinant", "distance", "dot", "exp", "exp2", "faceforward", "floor", "fwidth",
    "isinf", "isnan", "length", "log", "log2", "max", "min", "modf", "normalize", "pow",
    "radians", "reflect", "refract", "round", "sign", "sin", "sinh", "smoothstep", "sqrt", "step",
    "tan", "tanh", "texture", "transpose", "trunc",
    "layout", "centroid", "smooth", "case", "resource",
    "mat2x2", "mat2x3", "mat2x4", "mat3x2", "mat3x3", "mat3x4", "mat4x2", "mat4x3", "mat4x4",
    "uint", "uvec2", "uvec3", "uvec4",
    "samplerCubeShadow", "sampler2DArray", "sampler2DArrayShadow",
    "isampler2D", "isampler3D", "isamplerCube", "isampler2DArray",
    "usampler2D", "usampler3D", "usamplerCube", "usampler2DArray",
]);

const GLSL_ES100_LANGUAGE_TOKENS = new Set([
    "attribute", "const", "uniform", "varying", "break", "continue", "do", "for", "while",
    "if", "else", "in", "out", "inout", "float", "int", "void", "bool", "true", "false",
    "lowp", "mediump", "highp", "precision", "invariant", "discard", "return", "struct",
    "mat2", "mat3", "mat4", "vec2", "vec3", "vec4", "ivec2", "ivec3", "ivec4",
    "bvec2", "bvec3", "bvec4", "sampler2D", "samplerCube",
]);

const GLSL_PREDEFINED_DUNDER_IDENTIFIERS = new Set([
    "__FILE__",
    "__LINE__",
    "__VERSION__",
]);

function maskComments(source: string): string {
    const masked = source.split("");
    let lineComment = false;
    let blockComment = false;
    for (let index = 0; index < source.length; index++) {
        const ch = source[index];
        const next = source[index + 1];
        if (lineComment) {
            if (ch === "\n") lineComment = false;
            else masked[index] = " ";
            continue;
        }
        if (blockComment) {
            if (ch === "*" && next === "/") {
                masked[index] = " ";
                masked[index + 1] = " ";
                blockComment = false;
                index++;
            } else if (ch !== "\n") {
                masked[index] = " ";
            }
            continue;
        }
        if (ch === "/" && next === "/") {
            masked[index] = " ";
            masked[index + 1] = " ";
            lineComment = true;
            index++;
        } else if (ch === "/" && next === "*") {
            masked[index] = " ";
            masked[index + 1] = " ";
            blockComment = true;
            index++;
        }
    }
    return masked.join("");
}

function isTopLevelAt(source: string, index: number): boolean {
    let braceDepth = 0;
    let parenDepth = 0;
    for (let cursor = 0; cursor < index; cursor++) {
        if (source[cursor] === "{") braceDepth++;
        else if (source[cursor] === "}") braceDepth = Math.max(0, braceDepth - 1);
        else if (source[cursor] === "(") parenDepth++;
        else if (source[cursor] === ")") parenDepth = Math.max(0, parenDepth - 1);
    }
    return braceDepth === 0 && parenDepth === 0;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Vulkan GLSL reserves some WebGL-valid function names. Rename each discovered
 * top-level user function consistently while leaving comments and member calls
 * untouched.
 */
export function renameUserDefinedFunctions(source: string): string {
    const masked = maskComments(source);
    const names = new Set<string>();
    const signature = /(?:^|[;}\n])\s*(?:(?:lowp|mediump|highp)\s+)?[A-Za-z_]\w*\s+([A-Za-z_]\w*)\s*\(/gm;
    for (let match = signature.exec(masked); match !== null; match = signature.exec(masked)) {
        const name = match[1];
        const nameOffset = match.index + match[0].lastIndexOf(name);
        if (name !== "main" && isTopLevelAt(masked, nameOffset)) names.add(name);
    }
    if (names.size === 0) return source;

    const alternatives = Array.from(names)
        .sort((left, right) => right.length - left.length)
        .map(escapeRegExp)
        .join("|");
    const call = new RegExp(`\\b(?:${alternatives})\\b(?=\\s*\\()`, "g");
    let result = "";
    let cursor = 0;
    for (let match = call.exec(masked); match !== null; match = call.exec(masked)) {
        let previous = match.index - 1;
        while (previous >= 0 && /\s/.test(masked[previous])) previous--;
        if (previous >= 0 && masked[previous] === ".") continue;
        result += source.slice(cursor, match.index);
        result += `_hyd_user_${match[0]}`;
        cursor = call.lastIndex;
    }
    return cursor === 0 ? source : result + source.slice(cursor);
}

export function bridgeGlslIdentifier(name: string): string {
    if (GLSL_310_IDENTIFIER_CONFLICTS.has(name) || isReservedWgslIdentifier(name)) {
        return `hydgl2gpu_id_${name}`;
    }
    return bridgeGlslDunderIdentifier(name);
}

export function bridgeGlslDunderIdentifier(name: string): string {
    if (!name.includes("__") || name.startsWith("gl_") || GLSL_PREDEFINED_DUNDER_IDENTIFIERS.has(name)) return name;
    let hash = 0x811c9dc5;
    for (let index = 0; index < name.length; index++) {
        hash ^= name.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    const readableName = name.replace(/_+/g, "_").replace(/^_+|_+$/g, "") || "identifier";
    return `hydgl2gpu_dunder_${readableName}_${(hash >>> 0).toString(36)}`;
}

/**
 * GLSL ES 1.00 permits several names that became keywords or builtins in
 * GLSL ES 3.10. glslang targets 3.10 for Vulkan, so alpha-rename those user
 * identifiers while leaving calls to ES 1.00 builtins untouched.
 */
function bridgeIdentifiers(source: string, includeEs310Conflicts: boolean): string {
    const masked = maskComments(source);
    const structTypes = new Set<string>();
    const structPattern = /\bstruct\s+([A-Za-z_]\w*)/g;
    for (let match = structPattern.exec(masked); match !== null; match = structPattern.exec(masked)) {
        if (bridgeGlslIdentifier(match[1]) !== match[1]) structTypes.add(match[1]);
    }

    const identifier = /\b[A-Za-z_]\w*\b/g;
    let out = "";
    let cursor = 0;
    for (let match = identifier.exec(masked); match !== null; match = identifier.exec(masked)) {
        const name = match[0];
        const dunder = bridgeGlslDunderIdentifier(name) !== name;
        const versionConflict = includeEs310Conflicts &&
            !GLSL_ES100_LANGUAGE_TOKENS.has(name) &&
            bridgeGlslIdentifier(name) !== name;
        if (!dunder && !versionConflict) continue;
        let next = identifier.lastIndex;
        while (next < masked.length && /\s/.test(masked[next])) next++;
        if (!dunder && masked[next] === "(" && !structTypes.has(name)) continue;
        out += source.slice(cursor, match.index);
        out += bridgeGlslIdentifier(name);
        cursor = identifier.lastIndex;
    }
    return cursor === 0 ? source : out + source.slice(cursor);
}

export function bridgeGlslEs100Identifiers(source: string): string {
    return bridgeIdentifiers(source, true);
}

export function bridgeGlslDunderIdentifiers(source: string): string {
    return bridgeIdentifiers(source, false);
}
