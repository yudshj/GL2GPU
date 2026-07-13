import type { TextureNameAndType } from "./shaderDB";

type SampleComponent = "f32" | "i32" | "u32";
type TextureDimension = "2d" | "2d_array" | "3d";

interface TextureLoadType {
    component: SampleComponent;
    dimension: TextureDimension;
    textureType: string;
}

export interface WgslRobustnessResult {
    wgsl: string;
    rewrittenLoads: number;
    helperCount: number;
}

export interface WgslTextureDimensionResult {
    wgsl: string;
    rewrittenQueries: number;
}

function parseTextureType(type: string): TextureLoadType | null {
    const match = /^texture_(2d|2d_array|3d)\s*<\s*(f32|i32|u32)\s*>$/.exec(type.trim());
    if (!match) return null;
    return {
        dimension: match[1] as TextureDimension,
        component: match[2] as SampleComponent,
        textureType: `texture_${match[1]}<${match[2]}>`,
    };
}

function skipTrivia(source: string, start: number): number {
    let index = start;
    while (index < source.length) {
        if (/\s/.test(source[index])) {
            index++;
            continue;
        }
        if (source.startsWith("//", index)) {
            const lineEnd = source.indexOf("\n", index + 2);
            return lineEnd < 0 ? source.length : skipTrivia(source, lineEnd + 1);
        }
        if (source.startsWith("/*", index)) {
            const commentEnd = source.indexOf("*/", index + 2);
            return commentEnd < 0 ? source.length : skipTrivia(source, commentEnd + 2);
        }
        break;
    }
    return index;
}

function findMatchingDelimiter(source: string, openIndex: number, open: string, close: string): number {
    let depth = 0;
    for (let index = openIndex; index < source.length; index++) {
        if (source.startsWith("//", index)) {
            const lineEnd = source.indexOf("\n", index + 2);
            if (lineEnd < 0) return -1;
            index = lineEnd;
            continue;
        }
        if (source.startsWith("/*", index)) {
            const commentEnd = source.indexOf("*/", index + 2);
            if (commentEnd < 0) return -1;
            index = commentEnd + 1;
            continue;
        }
        if (source[index] === open) {
            depth++;
        } else if (source[index] === close) {
            depth--;
            if (depth === 0) return index;
        }
    }
    return -1;
}

function splitArguments(source: string): string[] {
    const arguments_: string[] = [];
    let start = 0;
    let parens = 0;
    let brackets = 0;
    let braces = 0;
    for (let index = 0; index < source.length; index++) {
        if (source.startsWith("//", index)) {
            const lineEnd = source.indexOf("\n", index + 2);
            if (lineEnd < 0) break;
            index = lineEnd;
            continue;
        }
        if (source.startsWith("/*", index)) {
            const commentEnd = source.indexOf("*/", index + 2);
            if (commentEnd < 0) break;
            index = commentEnd + 1;
            continue;
        }
        switch (source[index]) {
            case "(": parens++; break;
            case ")": parens--; break;
            case "[": brackets++; break;
            case "]": brackets--; break;
            case "{": braces++; break;
            case "}": braces--; break;
            case ",":
                if (parens === 0 && brackets === 0 && braces === 0) {
                    arguments_.push(source.slice(start, index).trim());
                    start = index + 1;
                }
                break;
        }
    }
    arguments_.push(source.slice(start).trim());
    return arguments_;
}

export function normalizeWebGlTextureDimensionQueries(
    wgsl: string,
    samplers: TextureNameAndType[],
): WgslTextureDimensionResult {
    const dimensions = new Map<string, 2 | 3>();
    for (const sampler of samplers) {
        dimensions.set(`${sampler.name}T`, /sampler3D$/.test(sampler.glsl_type) ? 3 : 2);
    }
    const replacements: Array<{ start: number, end: number, text: string }> = [];
    for (let index = 0; index < wgsl.length;) {
        if (wgsl.startsWith("//", index)) {
            const lineEnd = wgsl.indexOf("\n", index + 2);
            index = lineEnd < 0 ? wgsl.length : lineEnd + 1;
            continue;
        }
        if (wgsl.startsWith("/*", index)) {
            const commentEnd = wgsl.indexOf("*/", index + 2);
            index = commentEnd < 0 ? wgsl.length : commentEnd + 2;
            continue;
        }
        if (!wgsl.startsWith("textureDimensions", index) ||
            (index > 0 && /[A-Za-z0-9_]/.test(wgsl[index - 1]))) {
            index++;
            continue;
        }
        const identifierEnd = index + "textureDimensions".length;
        const open = skipTrivia(wgsl, identifierEnd);
        if (wgsl[open] !== "(") {
            index = identifierEnd;
            continue;
        }
        const close = findMatchingDelimiter(wgsl, open, "(", ")");
        if (close < 0) break;
        const args = splitArguments(wgsl.slice(open + 1, close));
        const textureName = args[0]?.trim();
        const dimension = textureName && /^[A-Za-z_]\w*$/.test(textureName)
            ? dimensions.get(textureName)
            : undefined;
        if (dimension && args.length === 2) {
            const vector = dimension === 3 ? "vec3u" : "vec2u";
            const level = args[1].trim();
            const divisor = `(1u << u32(clamp(i32(${level}), 0i, 30i)))`;
            replacements.push({
                start: index,
                end: close + 1,
                text: `max(${vector}(1u), textureDimensions(${textureName}) / ${vector}(${divisor}))`,
            });
        }
        index = close + 1;
    }
    if (replacements.length === 0) return { wgsl, rewrittenQueries: 0 };
    let rewritten = "";
    let cursor = 0;
    for (const replacement of replacements) {
        rewritten += wgsl.slice(cursor, replacement.start) + replacement.text;
        cursor = replacement.end;
    }
    rewritten += wgsl.slice(cursor);
    return { wgsl: rewritten, rewrittenQueries: replacements.length };
}

function integerHelperRanges(source: string): Array<[number, number]> {
    const ranges: Array<[number, number]> = [];
    const signature = /\bfn\s+([A-Za-z_]\w*)\s*\(/g;
    for (let match = signature.exec(source); match !== null; match = signature.exec(source)) {
        if (!match[1].includes("hyd_integer_texture_")) continue;
        const parameterOpen = source.indexOf("(", match.index);
        const parameterClose = findMatchingDelimiter(source, parameterOpen, "(", ")");
        if (parameterClose < 0) continue;
        const bodyOpen = source.indexOf("{", parameterClose + 1);
        if (bodyOpen < 0) continue;
        const bodyClose = findMatchingDelimiter(source, bodyOpen, "{", "}");
        if (bodyClose < 0) continue;
        ranges.push([match.index, bodyClose + 1]);
        signature.lastIndex = bodyClose + 1;
    }
    return ranges;
}

function inRanges(index: number, ranges: Array<[number, number]>): boolean {
    return ranges.some(([start, end]) => index >= start && index < end);
}

function returnType(component: SampleComponent): string {
    return component === "f32" ? "vec4f" : component === "i32" ? "vec4i" : "vec4u";
}

function zeroValue(component: SampleComponent): string {
    return component === "f32" ? "vec4f(0.0f)" : component === "i32" ? "vec4i(0i)" : "vec4u(0u)";
}

function helperSource(name: string, type: TextureLoadType): string {
    const result = returnType(type.component);
    const zero = zeroValue(type.component);
    if (type.dimension === "2d_array") {
        return `fn ${name}(tex: ${type.textureType}, coord: vec2i, layer: i32, level: i32) -> ${result} {
  if (level < 0i || level >= i32(textureNumLevels(tex)) || layer < 0i || layer >= i32(textureNumLayers(tex))) {
    return ${zero};
  }
  let size = vec2i(textureDimensions(tex, level));
  if (any(coord < vec2i(0i)) || any(coord >= size)) {
    return ${zero};
  }
  return textureLoad(tex, coord, layer, level);
}`;
    }
    const coordinateType = type.dimension === "3d" ? "vec3i" : "vec2i";
    return `fn ${name}(tex: ${type.textureType}, coord: ${coordinateType}, level: i32) -> ${result} {
  if (level < 0i || level >= i32(textureNumLevels(tex))) {
    return ${zero};
  }
  let size = ${coordinateType}(textureDimensions(tex, level));
  if (any(coord < ${coordinateType}(0i)) || any(coord >= size)) {
    return ${zero};
  }
  return textureLoad(tex, coord, level);
}`;
}

function uniqueHelperName(source: string, type: TextureLoadType): string {
    const base = `_hyd_webgl_robust_load_${type.dimension}_${type.component}`;
    let name = base;
    for (let suffix = 1; new RegExp(`\\b${name}\\b`).test(source); suffix++) {
        name = `${base}_${suffix}`;
    }
    return name;
}

export function enforceWebGlTextureLoadBounds(
    wgsl: string,
    samplers: TextureNameAndType[],
): WgslRobustnessResult {
    const textureTypes = new Map<string, TextureLoadType>();
    for (const sampler of samplers) {
        const type = parseTextureType(sampler.wgsl_texture_type);
        if (type) textureTypes.set(`${sampler.name}T`, type);
    }
    const typedIdentifier = /\b([A-Za-z_]\w*)\s*:\s*(texture_(?:2d|2d_array|3d)\s*<\s*(?:f32|i32|u32)\s*>)/g;
    for (let match = typedIdentifier.exec(wgsl); match !== null; match = typedIdentifier.exec(wgsl)) {
        const type = parseTextureType(match[2]);
        if (type) textureTypes.set(match[1], type);
    }

    const skippedRanges = integerHelperRanges(wgsl);
    const helpers = new Map<string, { name: string, type: TextureLoadType }>();
    const replacements: Array<{ start: number, end: number, text: string }> = [];
    for (let index = 0; index < wgsl.length;) {
        if (wgsl.startsWith("//", index)) {
            const lineEnd = wgsl.indexOf("\n", index + 2);
            index = lineEnd < 0 ? wgsl.length : lineEnd + 1;
            continue;
        }
        if (wgsl.startsWith("/*", index)) {
            const commentEnd = wgsl.indexOf("*/", index + 2);
            index = commentEnd < 0 ? wgsl.length : commentEnd + 2;
            continue;
        }
        if (!/[A-Za-z_]/.test(wgsl[index])) {
            index++;
            continue;
        }
        let identifierEnd = index + 1;
        while (identifierEnd < wgsl.length && /[A-Za-z0-9_]/.test(wgsl[identifierEnd])) identifierEnd++;
        if (wgsl.slice(index, identifierEnd) !== "textureLoad" || inRanges(index, skippedRanges)) {
            index = identifierEnd;
            continue;
        }
        const open = skipTrivia(wgsl, identifierEnd);
        if (wgsl[open] !== "(") {
            index = identifierEnd;
            continue;
        }
        const close = findMatchingDelimiter(wgsl, open, "(", ")");
        if (close < 0) break;
        const args = splitArguments(wgsl.slice(open + 1, close));
        const textureName = args[0]?.trim();
        const type = textureName && /^[A-Za-z_]\w*$/.test(textureName)
            ? textureTypes.get(textureName)
            : null;
        const expectedArguments = type?.dimension === "2d_array" ? 4 : 3;
        if (!type || args.length !== expectedArguments) {
            index = close + 1;
            continue;
        }
        const key = `${type.dimension}:${type.component}`;
        let helper = helpers.get(key);
        if (!helper) {
            helper = { name: uniqueHelperName(wgsl, type), type };
            helpers.set(key, helper);
        }
        replacements.push({
            start: index,
            end: close + 1,
            text: `${helper.name}(${args.join(", ")})`,
        });
        index = close + 1;
    }

    if (replacements.length === 0) return { wgsl, rewrittenLoads: 0, helperCount: 0 };
    let rewritten = "";
    let cursor = 0;
    for (const replacement of replacements) {
        rewritten += wgsl.slice(cursor, replacement.start) + replacement.text;
        cursor = replacement.end;
    }
    rewritten += wgsl.slice(cursor);
    const helperBlock = Array.from(helpers.values(), ({ name, type }) => helperSource(name, type)).join("\n\n");
    return {
        wgsl: `${rewritten.trimEnd()}\n\n${helperBlock}\n`,
        rewrittenLoads: replacements.length,
        helperCount: helpers.size,
    };
}
