import type { TextureNameAndType } from "./shaderDB";

interface SamplerArrayGroup {
    name: string;
    elements: TextureNameAndType[];
}

type ShaderStage = "vertex" | "fragment";

export interface SamplerArrayLoweringResult {
    source: string;
    helpers: string[];
}

interface SamplerStructField {
    name: string;
    glslType: string;
    size: number;
}

interface SamplerStructDefinition {
    name: string;
    fields: SamplerStructField[];
}

interface SamplerStructExpansion {
    suffix: string;
    name: string;
    glslType: string;
}

interface SamplerStructFunctionParam {
    index: number;
    name: string;
    expansions: SamplerStructExpansion[];
}

interface SamplerStructFunctionLowering {
    name: string;
    params: SamplerStructFunctionParam[];
}

const SAMPLER_TYPE_PATTERN = /^(?:[iu]?sampler(?:2D|Cube|2DArray|3D)|sampler(?:2D|Cube|2DArray)Shadow)$/;
const STRUCT_FUNCTION_SIGNATURE = /((?:^|[;\n{}])\s*(?:[A-Za-z_]\w*\s+)+([A-Za-z_]\w*)\s*)\(([^()]*)\)(\s*[;{])/gm;

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeResourceName(name: string): string {
    return name.replace(/[^A-Za-z0-9_]/g, "_").replace(/_+/g, "_").replace(/_+$/g, "");
}

export function replaceGlslSourcePath(source: string, from: string, to: string): string {
    if (/^[A-Za-z_]\w*$/.test(from)) {
        return source.replace(new RegExp(`\\b${escapeRegExp(from)}\\b`, "g"), to);
    }
    let pattern = "";
    let cursor = 0;
    const token = /([A-Za-z_]\w*)|\.\s*|\[\s*([^\]]+?)\s*\]/g;
    for (let match = token.exec(from); match !== null; match = token.exec(from)) {
        if (match.index !== cursor) return source;
        if (match[1]) pattern += escapeRegExp(match[1]);
        else if (match[0].trimStart().startsWith(".")) pattern += "\\s*\\.\\s*";
        else pattern += `\\s*\\[\\s*${escapeRegExp(match[2].trim())}\\s*\\]`;
        cursor = token.lastIndex;
    }
    if (cursor !== from.length || !pattern) return source;
    return source.replace(
        new RegExp(`(^|[^A-Za-z0-9_])${pattern}(?=$|[^A-Za-z0-9_])`, "g"),
        (_match, prefix) => `${prefix}${to}`,
    );
}

function parseSamplerOnlyStructs(source: string): Map<string, SamplerStructDefinition> {
    const structs = new Map<string, SamplerStructDefinition>();
    const regex = /\bstruct\s+([A-Za-z_]\w*)\s*\{([\s\S]*?)\}\s*;/g;
    for (let match = regex.exec(source); match !== null; match = regex.exec(source)) {
        const fields: SamplerStructField[] = [];
        let totalFields = 0;
        const fieldRegex = /^\s*(?:(?:lowp|mediump|highp)\s+)?([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*(?:\[\s*(\d+)\s*\])?\s*;/gm;
        for (let field = fieldRegex.exec(match[2]); field !== null; field = fieldRegex.exec(match[2])) {
            totalFields++;
            if (!SAMPLER_TYPE_PATTERN.test(field[1])) continue;
            fields.push({
                glslType: field[1],
                name: field[2],
                size: field[3] ? Math.max(1, Number(field[3])) : 1,
            });
        }
        if (fields.length > 0 && fields.length === totalFields) {
            structs.set(match[1], { name: match[1], fields });
        }
    }
    return structs;
}

function parseSamplerStructParam(
    raw: string,
    structs: Map<string, SamplerStructDefinition>,
): { name: string, struct: SamplerStructDefinition, size: number } | null {
    const normalized = raw.trim()
        .replace(/^(?:const|in|out|inout)\s+/, "")
        .replace(/^(?:lowp|mediump|highp)\s+/, "");
    const match = /^([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*(?:\[\s*(\d+)\s*\])?$/.exec(normalized);
    if (!match) return null;
    const struct = structs.get(match[1]);
    return struct ? { name: match[2], struct, size: match[3] ? Math.max(1, Number(match[3])) : 1 } : null;
}

function samplerStructExpansions(
    parameterName: string,
    struct: SamplerStructDefinition,
    parameterSize: number,
): SamplerStructExpansion[] {
    const expansions: SamplerStructExpansion[] = [];
    for (let parameterIndex = 0; parameterIndex < parameterSize; parameterIndex++) {
        const parameterSuffix = parameterSize > 1 ? `[${parameterIndex}]` : "";
        for (const field of struct.fields) {
            for (let fieldIndex = 0; fieldIndex < field.size; fieldIndex++) {
                const fieldSuffix = field.size > 1 ? `[${fieldIndex}]` : "";
                const suffix = `${parameterSuffix}.${field.name}${fieldSuffix}`;
                expansions.push({
                    suffix,
                    name: sanitizeResourceName(`${parameterName}${suffix}`),
                    glslType: field.glslType,
                });
            }
        }
    }
    return expansions;
}

function rewriteSamplerStructCalls(
    source: string,
    lowerings: SamplerStructFunctionLowering[],
    samplers: TextureNameAndType[],
): string {
    const samplerBySourceName = new Map(
        samplers.filter((sampler) => sampler.source_name).map((sampler) => [sampler.source_name!, sampler.name]),
    );
    let out = source;
    for (const lowering of lowerings) {
        let result = "";
        let cursor = 0;
        const callRegex = new RegExp(`\\b${escapeRegExp(lowering.name)}\\s*\\(`, "g");
        for (let match = callRegex.exec(out); match !== null; match = callRegex.exec(out)) {
            const open = callRegex.lastIndex - 1;
            const close = findMatchingParen(out, open);
            if (close < 0) break;
            const next = out.slice(close + 1).match(/^\s*([;{])/);
            const statementStart = Math.max(
                out.lastIndexOf(";", match.index - 1),
                out.lastIndexOf("{", match.index - 1),
                out.lastIndexOf("}", match.index - 1),
                out.lastIndexOf("\n", match.index - 1),
            ) + 1;
            const prefix = out.slice(statementStart, match.index);
            const isPrototype = !!(next && next[1] === ";" && /^\s*(?:[A-Za-z_]\w*\s+)+$/.test(prefix));
            if ((next && next[1] === "{") || isPrototype) {
                callRegex.lastIndex = close + 1;
                continue;
            }
            const args = splitTopLevelArguments(out.slice(open + 1, close));
            const loweringByIndex = new Map(lowering.params.map((param) => [param.index, param]));
            const rewritten: string[] = [];
            for (let index = 0; index < args.length; index++) {
                const param = loweringByIndex.get(index);
                if (!param) {
                    rewritten.push(args[index].trim());
                    continue;
                }
                const argument = args[index].trim();
                for (const expansion of param.expansions) {
                    const sourceName = `${argument}${expansion.suffix}`.replace(/\s+/g, "");
                    rewritten.push(samplerBySourceName.get(sourceName) || sanitizeResourceName(sourceName));
                }
            }
            result += out.slice(cursor, match.index);
            result += `${lowering.name}(${rewritten.join(", ")})`;
            cursor = close + 1;
            callRegex.lastIndex = close + 1;
        }
        if (cursor !== 0) out = result + out.slice(cursor);
    }
    return out;
}

export function lowerSamplerStructFunctionParameters(
    source: string,
    samplers: TextureNameAndType[],
): string {
    const structs = parseSamplerOnlyStructs(source);
    if (structs.size === 0) return source;
    const loweringByName = new Map<string, SamplerStructFunctionLowering>();
    let out = source.replace(STRUCT_FUNCTION_SIGNATURE, (full, prefix, functionName, rawParams, suffix) => {
        const params = splitTopLevelArguments(rawParams);
        const structParams: SamplerStructFunctionParam[] = [];
        const rewrittenParams: string[] = [];
        for (let index = 0; index < params.length; index++) {
            const parsed = parseSamplerStructParam(params[index], structs);
            if (!parsed) {
                rewrittenParams.push(params[index].trim());
                continue;
            }
            const expansions = samplerStructExpansions(parsed.name, parsed.struct, parsed.size);
            structParams.push({ index, name: parsed.name, expansions });
            for (const expansion of expansions) {
                rewrittenParams.push(`${expansion.glslType} ${expansion.name}`);
            }
        }
        if (structParams.length === 0) return full;
        loweringByName.set(functionName, { name: functionName, params: structParams });
        return `${prefix}(${rewrittenParams.join(", ")})${suffix}`;
    });
    const lowerings = Array.from(loweringByName.values());
    if (lowerings.length === 0) return source;

    // Replace accesses after signatures have been expanded. The flattened name is
    // derived from the exact parameter access path, so fixed struct/field arrays
    // preserve their declaration order.
    for (const lowering of lowerings) {
        for (const param of lowering.params) {
            for (const expansion of param.expansions) {
                const access = `${param.name}${expansion.suffix}`;
                const accessPattern = new RegExp(
                    `\\b${escapeRegExp(access)}(?=$|[^A-Za-z0-9_])`,
                    "g",
                );
                out = out.replace(accessPattern, expansion.name);
            }
        }
    }
    out = rewriteSamplerStructCalls(out, lowerings, samplers);
    for (const struct of structs.values()) {
        out = out.replace(new RegExp(`\\bstruct\\s+${escapeRegExp(struct.name)}\\s*\\{[\\s\\S]*?\\}\\s*;`, "g"), "");
    }
    return out;
}

function samplerGroups(samplers: TextureNameAndType[]): Map<string, SamplerArrayGroup> {
    const groups = new Map<string, SamplerArrayGroup>();
    for (const sampler of samplers) {
        if (!sampler.array_name) continue;
        let group = groups.get(sampler.array_name);
        if (!group) {
            group = { name: sampler.array_name, elements: [] };
            groups.set(sampler.array_name, group);
        }
        group.elements.push(sampler);
    }
    for (const group of groups.values()) {
        group.elements.sort((a, b) => (a.array_index || 0) - (b.array_index || 0));
    }
    return groups;
}

function findMatchingParen(source: string, openIndex: number): number {
    let depth = 0;
    for (let i = openIndex; i < source.length; i++) {
        if (source[i] === "(") depth++;
        else if (source[i] === ")" && --depth === 0) return i;
    }
    return -1;
}

function splitTopLevelArguments(source: string): string[] {
    const args: string[] = [];
    let start = 0;
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    for (let i = 0; i < source.length; i++) {
        const ch = source[i];
        if (ch === "(") parenDepth++;
        else if (ch === ")") parenDepth--;
        else if (ch === "[") bracketDepth++;
        else if (ch === "]") bracketDepth--;
        else if (ch === "{") braceDepth++;
        else if (ch === "}") braceDepth--;
        else if (ch === "," && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
            args.push(source.slice(start, i).trim());
            start = i + 1;
        }
    }
    args.push(source.slice(start).trim());
    return args;
}

export function lowerTexelFetchOffsetCalls(
    source: string,
    samplers: Array<{ name: string, glsl_type: string }>,
): string {
    const samplerTypes = new Map(samplers.map((sampler) => [sampler.name, sampler.glsl_type]));
    const helpers = new Set<string>();
    let result = "";
    let cursor = 0;
    const call = /\btexelFetchOffset\s*\(/g;
    for (let match = call.exec(source); match !== null; match = call.exec(source)) {
        const openParen = call.lastIndex - 1;
        const closeParen = findMatchingParen(source, openParen);
        if (closeParen < 0) break;
        const args = splitTopLevelArguments(source.slice(openParen + 1, closeParen));
        const samplerType = samplerTypes.get(args[0]?.trim());
        let helper = "";
        if (samplerType === "sampler2D" || samplerType === "isampler2D" || samplerType === "usampler2D") {
            helper = "_hyd_texel_fetch_offset_2d";
            helpers.add("ivec2 _hyd_texel_fetch_offset_2d(ivec2 coord, ivec2 offset) { return coord + offset; }");
        } else if (samplerType === "sampler3D" || samplerType === "isampler3D" || samplerType === "usampler3D") {
            helper = "_hyd_texel_fetch_offset_3d";
            helpers.add("ivec3 _hyd_texel_fetch_offset_3d(ivec3 coord, ivec3 offset) { return coord + offset; }");
        } else if (samplerType === "sampler2DArray" || samplerType === "isampler2DArray" || samplerType === "usampler2DArray") {
            helper = "_hyd_texel_fetch_offset_2d_array";
            helpers.add("ivec3 _hyd_texel_fetch_offset_2d_array(ivec3 coord, ivec2 offset) { return ivec3(coord.xy + offset, coord.z); }");
        }
        if (!helper || args.length !== 4) {
            call.lastIndex = closeParen + 1;
            continue;
        }
        result += source.slice(cursor, match.index);
        result += `texelFetch(${args[0]}, ${helper}(${args[1]}, ${args[3]}), ${args[2]})`;
        cursor = closeParen + 1;
        call.lastIndex = closeParen + 1;
    }
    if (cursor === 0) return source;
    return `${Array.from(helpers).join("\n")}\n${result}${source.slice(cursor)}`;
}

function sampleResultType(glslType: string): string {
    if (glslType.startsWith("isampler")) return "ivec4";
    if (glslType.startsWith("usampler")) return "uvec4";
    return "vec4";
}

function sampleCoordinateType(glslType: string): string {
    return glslType.endsWith("2D") ? "vec2" : "vec3";
}

function helperName(group: SamplerArrayGroup, argumentCount: number): string {
    return `_hyd_texture_sampler_array_${group.elements[0].name.replace(/_0$/, "")}_${argumentCount}`;
}

function makeTextureHelper(group: SamplerArrayGroup, argumentCount: number, stage: ShaderStage): string {
    const glslType = group.elements[0].glsl_type;
    const resultType = sampleResultType(glslType);
    const params = ["int index", `${sampleCoordinateType(glslType)} coord`];
    if (argumentCount === 3) {
        params.push("float bias");
    }
    const lines = [`${resultType} ${helperName(group, argumentCount)}(${params.join(", ")}) {`];
    for (let i = 0; i < group.elements.length; i++) {
        const element = group.elements[i];
        const combinedSampler = `${glslType}(${element.name}T, ${element.name}S)`;
        const sample = stage === "fragment"
            ? `texture(${combinedSampler}, coord${argumentCount === 3 ? ", bias" : ""})`
            : `textureLod(${combinedSampler}, coord, 0.0)`;
        if (i < group.elements.length - 1) lines.push(`  if (index == ${i}) return ${sample};`);
        else lines.push(`  return ${sample};`);
    }
    lines.push("}");
    return lines.join("\n");
}

export function lowerDynamicSamplerArrayTextureCalls(
    source: string,
    samplers: TextureNameAndType[],
    stage: ShaderStage = "fragment",
): SamplerArrayLoweringResult {
    const groups = samplerGroups(samplers);
    if (groups.size === 0) return { source, helpers: [] };
    const helperKeys = new Map<string, { group: SamplerArrayGroup, argumentCount: number }>();
    let result = "";
    let cursor = 0;
    const callRegex = /\btexture\s*\(/g;
    for (let match = callRegex.exec(source); match !== null; match = callRegex.exec(source)) {
        const open = callRegex.lastIndex - 1;
        const close = findMatchingParen(source, open);
        if (close < 0) break;
        const args = splitTopLevelArguments(source.slice(open + 1, close));
        if (args.length < 2 || args.length > 3) {
            callRegex.lastIndex = close + 1;
            continue;
        }
        const arrayAccess = /^([A-Za-z_]\w*)\s*\[([\s\S]+)\]$/.exec(args[0]);
        const group = arrayAccess ? groups.get(arrayAccess[1]) : undefined;
        if (!group) {
            callRegex.lastIndex = close + 1;
            continue;
        }
        const indexExpression = arrayAccess[2].trim();
        const constantIndex = /^\d+$/.test(indexExpression) ? Number(indexExpression) : -1;
        let replacement: string;
        if (constantIndex >= 0 && constantIndex < group.elements.length) {
            const rewrittenArgs = args.slice();
            rewrittenArgs[0] = group.elements[constantIndex].name;
            replacement = `texture(${rewrittenArgs.join(", ")})`;
        } else {
            const key = `${group.name}:${args.length}`;
            helperKeys.set(key, { group, argumentCount: args.length });
            replacement = `${helperName(group, args.length)}(int(${indexExpression}), ${args.slice(1).join(", ")})`;
        }
        result += source.slice(cursor, match.index) + replacement;
        cursor = close + 1;
        callRegex.lastIndex = close + 1;
    }
    return {
        source: cursor === 0 ? source : result + source.slice(cursor),
        helpers: Array.from(helperKeys.values()).map(({ group, argumentCount }) => makeTextureHelper(group, argumentCount, stage)),
    };
}
