import glslangInit from "../vendor/glslang/glslang.js";
import tintInit from "../vendor/tint-wasm/tint_wasm.js";
import type { TintWasmModule } from "../vendor/tint-wasm/tint_wasm.js";
import {
    InitShaderInfoType,
    NameAndType,
    samplerFlipYUniformName,
    TextureNameAndType,
} from "./shaderDB";
import { makeShaderMetadata, scanGlslDeclarations, ShaderStage } from "./shaderMetadata";
import {
    ShaderCaptureRecord,
    sourceCapture,
    stableHashString,
    stableHashU32,
} from "./shaderCapture";
import { normalizeWebGlTextureCoordinates } from "./shaderTexCoord";
import { optimizeTintWgsl, WgslOptimizerStats } from "./shaderWgslOptimizer";

interface GlslangModule {
    compileGLSL(glsl: string, shaderType: ShaderStage, genDebug: boolean, spirvVersion?: "1.0" | "1.1" | "1.2" | "1.3" | "1.4" | "1.5"): Uint32Array;
}

const DEFAULT_WASM_BASE_URL = (() => {
    if (typeof document !== "undefined") {
        const currentScript = document.currentScript as HTMLScriptElement;
        if (currentScript && currentScript.src) {
            return new URL(".", currentScript.src).href;
        }
        const scripts = Array.from(document.getElementsByTagName("script"));
        for (let i = scripts.length - 1; i >= 0; i--) {
            const src = scripts[i].src;
            if (src && /(^|\/)gl2gpu(?:\.[^/]*)?\.js(?:[?#].*)?$/.test(src)) {
                return new URL(".", src).href;
            }
        }
    }
    if (typeof location !== "undefined" && location.href) {
        return new URL(".", location.href).href;
    }
    return "";
})();

function locateBundledWasm(path: string): string {
    return DEFAULT_WASM_BASE_URL ? new URL(path, DEFAULT_WASM_BASE_URL).href : path;
}

export interface ShaderTranslatorOptions {
    optimizeTintWgsl?: boolean;
    legacyTextureCoordinateFixups?: boolean;
    captureShaders?: boolean;
    preserveImplicitTextureLod?: boolean;
    glslangLocateFile?: (path: string) => string;
    glslangWasmBinary?: ArrayBuffer | Uint8Array;
    tintLocateFile?: (path: string) => string;
    tintWasmBinary?: ArrayBuffer | Uint8Array;
}

export interface ShaderLike {
    type: GLenum;
    glsl_shader: string;
    shader_info?: InitShaderInfoType;
}

export interface TranslatedProgram {
    vertex?: InitShaderInfoType;
    fragment?: InitShaderInfoType;
    attributeLocations?: Map<string, number>;
}

interface ProgramTranslationLayout {
    attributeLocations: Map<string, number>;
    varyingLocations: Map<string, number>;
    samplerBindings: Map<string, number>;
    cacheKey: string;
}

interface ParsedGlslDeclaration {
    qualifier: "attribute" | "uniform" | "varying" | "in" | "out";
    interpolation: string;
    glslType: string;
    name: string;
    arraySuffix: string;
}

interface PreparedGlslSource {
    source: string;
    declarations: ParsedGlslDeclaration[];
}

interface BuildGlslangSourceOptions {
    preserveImplicitTextureLod?: boolean;
}

interface ResourcePruneStats {
    removedUniforms: string[];
    removedSamplers: string[];
}

const GLOBAL_DECLARATION_REGEX = /\b(?:layout\s*\([^)]*\)\s*)?(?:(?:lowp|mediump|highp)\s+)?((?:(?:flat|smooth|noperspective|centroid|sample)\s+)*)(attribute|uniform|varying|in|out)\s+(?:(?:lowp|mediump|highp)\s+)?([A-Za-z_]\w*)\s+([^;]+)\s*;/g;
const SPV_OP_NAME = 5;
const SPV_OP_TYPE_SAMPLED_IMAGE = 27;
const SPV_OP_TYPE_POINTER = 32;
const SPV_OP_FUNCTION_PARAMETER = 55;
const SPV_OP_VARIABLE = 59;
const SPV_OP_LOAD = 61;
const SPV_OP_DECORATE = 71;
const SPV_OP_MEMBER_DECORATE = 72;
const SPV_OP_IMAGE = 100;
const SPV_STORAGE_CLASS_UNIFORM_CONSTANT = 0;
const SPV_DECORATION_RELAXED_PRECISION = 0;

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function nowMs(): number {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
        return performance.now();
    }
    return Date.now();
}

function wordBoundaryReplace(source: string, from: string, to: string): string {
    return source.replace(new RegExp(`\\b${escapeRegExp(from)}\\b`, "g"), to);
}

function sourceNameReplace(source: string, from: string, to: string): string {
    const parts = from.split(".");
    if (parts.length === 1) {
        return wordBoundaryReplace(source, from, to);
    }
    const pattern = parts
        .map((part) => escapeRegExp(part))
        .join("\\s*\\.\\s*");
    return source.replace(new RegExp(`\\b${pattern}\\b`, "g"), to);
}

function referencesIdentifier(source: string, name: string): boolean {
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

function pruneUnusedShaderResources(metadata: InitShaderInfoType, wgsl: string): ResourcePruneStats {
    const removedUniforms: string[] = [];
    const removedSamplers: string[] = [];
    metadata.uniforms = metadata.uniforms.filter((uniform) => {
        const keep = referencesIdentifier(wgsl, `_hyd_uniforms_.${uniform.name}`) || referencesIdentifier(wgsl, uniform.name);
        if (!keep) {
            removedUniforms.push(uniform.name);
        }
        return keep;
    });
    metadata.samplers = metadata.samplers.filter((sampler) => {
        const keep = referencesIdentifier(wgsl, `${sampler.name}S`) || referencesIdentifier(wgsl, `${sampler.name}T`);
        if (!keep) {
            removedSamplers.push(sampler.name);
        }
        return keep;
    });
    return { removedUniforms, removedSamplers };
}

function uniqueByName<T extends NameAndType | TextureNameAndType>(items: T[]): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const item of items) {
        if (!seen.has(item.name)) {
            seen.add(item.name);
            out.push(item);
        }
    }
    return out;
}

function assignLocations(items: NameAndType[], boundLocations: Map<string, number> = new Map()): Map<string, number> {
    const locations = new Map<string, number>();
    const usedLocations = new Set<number>();
    for (const item of items) {
        const boundLocation = boundLocations.get(item.name);
        if (boundLocation !== undefined && !locations.has(item.name)) {
            locations.set(item.name, boundLocation);
            usedLocations.add(boundLocation);
        }
    }
    let nextLocation = 0;
    for (const item of items) {
        if (locations.has(item.name)) continue;
        while (usedLocations.has(nextLocation)) {
            nextLocation++;
        }
        locations.set(item.name, nextLocation);
        usedLocations.add(nextLocation);
    }
    return locations;
}

function parseDeclarationNames(rawNames: string): Array<{ name: string, arraySuffix: string }> {
    const names: Array<{ name: string, arraySuffix: string }> = [];
    for (const rawName of rawNames.split(",")) {
        const match = rawName.trim().replace(/\s*=.*$/, "").match(/^([A-Za-z_]\w*)\s*((?:\[[^\]]*\]\s*)*)/);
        if (match) {
            names.push({
                name: match[1],
                arraySuffix: match[2] ? match[2].replace(/\s+/g, "") : "",
            });
        }
    }
    return names;
}

function declarationArraySuffix(declarations: ParsedGlslDeclaration[], name: string): string {
    const declaration = declarations.find((item) => item.name === name);
    return declaration ? declaration.arraySuffix : "";
}

function isFragmentOutput(declaration: ParsedGlslDeclaration, stage: ShaderStage): boolean {
    return stage === "fragment" && declaration.qualifier === "out";
}

function prepareSourceAndDeclarations(source: string): PreparedGlslSource {
    const preamble: string[] = ["#version 310 es"];
    const seenPreamble = new Set<string>(preamble);
    let body = source.replace(/^\s*#version[^\n]*(?:\n|$)/gm, "");

    body = body.replace(/^\s*(#extension[^\n]*|#define[^\n]*|precision\s+(?:lowp|mediump|highp)\s+\w+\s*;)\s*$/gm, (line) => {
        const trimmed = line.trim();
        if (!seenPreamble.has(trimmed)) {
            seenPreamble.add(trimmed);
            preamble.push(trimmed);
        }
        return "";
    });
    if (!preamble.some((line) => /^precision\s+(?:lowp|mediump|highp)\s+float\s*;/.test(line))) {
        const defaultFloatPrecision = "precision highp float;";
        preamble.splice(1, 0, defaultFloatPrecision);
        seenPreamble.add(defaultFloatPrecision);
    }

    const declarations: ParsedGlslDeclaration[] = [];
    body = body.replace(GLOBAL_DECLARATION_REGEX, (full, interpolation, qualifier, glslType, rawNames, offset) => {
        if (!isTopLevelAt(body, offset)) {
            return full;
        }
        for (const parsed of parseDeclarationNames(rawNames)) {
            declarations.push({
                qualifier,
                interpolation: interpolation.trim(),
                glslType,
                name: parsed.name,
                arraySuffix: parsed.arraySuffix,
            });
        }
        return "";
    });

    return {
        declarations,
        source: `${preamble.join("\n")}\n`,
    };
}

function normalizeLegacyFragmentBuiltins(source: string): { source: string, usesFragColor: boolean } {
    let out = source;
    const usesFragColor = /\bgl_FragColor\b/.test(out);
    out = wordBoundaryReplace(out, "gl_FragColor", "_hyd_fragColor");
    out = wordBoundaryReplace(out, "texture2D", "texture");
    out = wordBoundaryReplace(out, "textureCube", "texture");
    out = wordBoundaryReplace(out, "texture2DProj", "textureProj");
    out = wordBoundaryReplace(out, "texture2DProjLodEXT", "textureProjLod");
    out = wordBoundaryReplace(out, "texture2DLodEXT", "textureLod");
    out = wordBoundaryReplace(out, "textureCubeLodEXT", "textureLod");
    return { source: out, usesFragColor };
}

function normalizeWebGlBuiltinsForVulkanGlsl(source: string): string {
    let out = source;
    out = wordBoundaryReplace(out, "gl_VertexID", "gl_VertexIndex");
    out = wordBoundaryReplace(out, "gl_InstanceID", "gl_InstanceIndex");
    out = out.replace(/\b1(?:\.0)?\s*\/\s*0(?:\.0)?\b/g, "3.4028234663852886e38");
    out = out.replace(/-\s*3\.4028234663852886e38/g, "-3.4028234663852886e38");
    return out;
}

function makeSamplerBindingDeclarations(metadata: InitShaderInfoType, layout: ProgramTranslationLayout): string[] {
    const lines: string[] = [];
    metadata.samplers.forEach((sampler, fallback) => {
        const binding = layout.samplerBindings.get(sampler.name);
        const textureType = samplerGlslTextureType(sampler.glsl_type);
        const baseBinding = binding === undefined ? fallback * 2 : binding;
        lines.push(`layout(set = 0, binding = ${baseBinding}) uniform highp sampler ${sampler.name}S;`);
        lines.push(`layout(set = 0, binding = ${baseBinding + 1}) uniform ${textureType} ${sampler.name}T;`);
    });
    return lines;
}

function makeUniformBlockDeclarations(metadata: InitShaderInfoType, declarations: ParsedGlslDeclaration[]): string[] {
    if (metadata.uniforms.length === 0) {
        return [];
    }

    const lines = ["layout(std140, set = 0, binding = 0) uniform HydUniformObject {"];
    for (const uniform of metadata.uniforms) {
        lines.push(`  ${uniform.glsl_type} ${uniform.name}${declarationArraySuffix(declarations, uniform.name)};`);
    }
    lines.push("};");
    return lines;
}

function samplerGlslTextureType(glslType: string): string {
    switch (glslType) {
        case "sampler2D":
            return "texture2D";
        case "samplerCube":
            return "textureCube";
        case "sampler2DArray":
            return "texture2DArray";
        case "sampler3D":
            return "texture3D";
        case "isampler2D":
            return "itexture2D";
        case "isamplerCube":
            return "itextureCube";
        case "isampler2DArray":
            return "itexture2DArray";
        case "isampler3D":
            return "itexture3D";
        case "usampler2D":
            return "utexture2D";
        case "usamplerCube":
            return "utextureCube";
        case "usampler2DArray":
            return "utexture2DArray";
        case "usampler3D":
            return "utexture3D";
        default:
            throw new Error(`unsupported sampler type: ${glslType}`);
    }
}

function addSamplerPrecisionDeclarations(lines: string[], metadata: InitShaderInfoType) {
    const seen = new Set<string>();
    for (const sampler of metadata.samplers) {
        const separateSamplerPrecision = "precision highp sampler;";
        const samplerPrecision = `precision highp ${sampler.glsl_type};`;
        if (!seen.has(separateSamplerPrecision)) {
            seen.add(separateSamplerPrecision);
            lines.push(separateSamplerPrecision);
        }
        if (!seen.has(samplerPrecision)) {
            seen.add(samplerPrecision);
            lines.push(samplerPrecision);
        }
    }
}

function rewriteMetadataSourceNames(source: string, metadata: InitShaderInfoType): string {
    let out = source;
    for (const uniform of metadata.uniforms) {
        if (uniform.source_name && uniform.source_name !== uniform.name) {
            out = sourceNameReplace(out, uniform.source_name, uniform.name);
        }
    }
    for (const sampler of metadata.samplers) {
        if (sampler.source_name && sampler.source_name !== sampler.name) {
            out = sourceNameReplace(out, sampler.source_name, sampler.name);
        }
    }
    return out;
}

function rewriteSamplerExpressions(source: string, metadata: InitShaderInfoType): string {
    return rewriteSamplerExpressionsForSamplers(source, metadata.samplers);
}

function rewriteSamplerExpressionsForSamplers(source: string, samplers: Array<{ name: string, glsl_type: string }>): string {
    let out = source;
    const sampleFunctions = [
        "texture",
        "textureProj",
        "textureLod",
        "textureGrad",
        "textureOffset",
        "textureProjOffset",
        "textureLodOffset",
        "textureProjLod",
        "textureProjLodOffset",
        "textureGradOffset",
    ];
    for (const sampler of samplers) {
        const name = escapeRegExp(sampler.name);
        const constructor = sampler.glsl_type;
        out = out.replace(
            new RegExp(`\\b(${sampleFunctions.join("|")})\\s*\\(\\s*${name}\\s*,`, "g"),
            `$1(${constructor}(${sampler.name}T, ${sampler.name}S),`,
        );
        out = out.replace(new RegExp(`\\btextureSize\\s*\\(\\s*${name}\\s*,`, "g"), `textureSize(${sampler.name}T,`);
        out = out.replace(new RegExp(`\\btextureQueryLevels\\s*\\(\\s*${name}\\s*\\)`, "g"), `textureQueryLevels(${sampler.name}T)`);
        out = out.replace(new RegExp(`\\btexelFetch\\s*\\(\\s*${name}\\s*,`, "g"), `texelFetch(${sampler.name}T,`);
    }
    return out;
}

function findMatchingParen(source: string, openIndex: number): number {
    let depth = 0;
    for (let i = openIndex; i < source.length; i++) {
        const ch = source[i];
        if (ch === "(") {
            depth++;
        } else if (ch === ")") {
            depth--;
            if (depth === 0) {
                return i;
            }
        }
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
        if (ch === "(") {
            parenDepth++;
        } else if (ch === ")") {
            parenDepth--;
        } else if (ch === "[") {
            bracketDepth++;
        } else if (ch === "]") {
            bracketDepth--;
        } else if (ch === "{") {
            braceDepth++;
        } else if (ch === "}") {
            braceDepth--;
        } else if (ch === "," && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
            args.push(source.slice(start, i));
            start = i + 1;
        }
    }

    args.push(source.slice(start));
    return args;
}

interface SamplerFunctionParam {
    index: number;
    glslType: string;
    name: string;
}

interface SamplerFunctionLowering {
    name: string;
    params: SamplerFunctionParam[];
}

const FUNCTION_SIGNATURE_WITH_PAREN_ARGS_REGEX = /((?:^|[;\n{}])\s*(?:[A-Za-z_]\w*\s+)+([A-Za-z_]\w*)\s*)\(([^()]*)\)(\s*[;{])/gm;

function parseSamplerFunctionParameter(raw: string): { glslType: string, name: string } | null {
    const normalized = raw.trim()
        .replace(/^(?:const|in|out|inout)\s+/, "")
        .replace(/^(?:lowp|mediump|highp)\s+/, "");
    const match = normalized.match(/^([iu]?sampler(?:2D|Cube|2DArray|3D))\s+([A-Za-z_]\w*)\s*(?:\[[^\]]*\])?$/);
    return match ? { glslType: match[1], name: match[2] } : null;
}

function expandSamplerArgument(expr: string): string[] {
    const trimmed = expr.trim();
    const constructor = trimmed.match(/^[iu]?sampler(?:2D|Cube|2DArray|3D)\s*\(([\s\S]*)\)$/);
    if (constructor) {
        const args = splitTopLevelArguments(constructor[1]);
        if (args.length === 2) {
            return [args[0].trim(), args[1].trim()];
        }
    }

    const identifier = trimmed.match(/^([A-Za-z_]\w*)$/);
    if (identifier) {
        return [`${identifier[1]}T`, `${identifier[1]}S`];
    }
    return [`${trimmed}T`, `${trimmed}S`];
}

function rewriteSamplerFunctionCalls(source: string, lowerings: SamplerFunctionLowering[]): string {
    let out = source;
    for (const lowering of lowerings) {
        let result = "";
        let cursor = 0;
        const callRegex = new RegExp(`\\b${escapeRegExp(lowering.name)}\\s*\\(`, "g");
        for (let match = callRegex.exec(out); match !== null; match = callRegex.exec(out)) {
            const openParen = callRegex.lastIndex - 1;
            const closeParen = findMatchingParen(out, openParen);
            if (closeParen < 0) break;

            const next = out.slice(closeParen + 1).match(/^\s*([;{])/);
            const statementStart = Math.max(
                out.lastIndexOf(";", match.index - 1),
                out.lastIndexOf("{", match.index - 1),
                out.lastIndexOf("}", match.index - 1),
                out.lastIndexOf("\n", match.index - 1),
            ) + 1;
            const prefix = out.slice(statementStart, match.index);
            const isPrototype = !!(next && next[1] === ";" && /^\s*(?:[A-Za-z_]\w*\s+)+$/.test(prefix));
            if ((next && next[1] === "{") || isPrototype) {
                callRegex.lastIndex = closeParen + 1;
                continue;
            }

            const args = splitTopLevelArguments(out.slice(openParen + 1, closeParen));
            const samplerByIndex = new Map(lowering.params.map((param) => [param.index, param]));
            const rewrittenArgs: string[] = [];
            for (let i = 0; i < args.length; i++) {
                if (samplerByIndex.has(i)) {
                    rewrittenArgs.push(...expandSamplerArgument(args[i]));
                } else {
                    rewrittenArgs.push(args[i].trim());
                }
            }

            result += out.slice(cursor, match.index);
            result += `${lowering.name}(${rewrittenArgs.join(", ")})`;
            cursor = closeParen + 1;
            callRegex.lastIndex = closeParen + 1;
        }
        if (cursor !== 0) {
            out = result + out.slice(cursor);
        }
    }
    return out;
}

function lowerSamplerFunctionParameters(source: string): string {
    const loweringByName = new Map<string, SamplerFunctionLowering>();
    let out = source.replace(FUNCTION_SIGNATURE_WITH_PAREN_ARGS_REGEX, (full, prefix, functionName, rawParams, suffix) => {
        const params = splitTopLevelArguments(rawParams);
        const samplerParams: SamplerFunctionParam[] = [];
        const rewrittenParams: string[] = [];
        for (let index = 0; index < params.length; index++) {
            const parsed = parseSamplerFunctionParameter(params[index]);
            if (!parsed) {
                rewrittenParams.push(params[index].trim());
                continue;
            }

            samplerParams.push({ index, glslType: parsed.glslType, name: parsed.name });
            rewrittenParams.push(`${samplerGlslTextureType(parsed.glslType)} ${parsed.name}T`);
            rewrittenParams.push(`sampler ${parsed.name}S`);
        }

        if (samplerParams.length === 0) {
            return full;
        }
        if (!loweringByName.has(functionName)) {
            loweringByName.set(functionName, { name: functionName, params: samplerParams });
        }
        return `${prefix}(${rewrittenParams.join(", ")})${suffix}`;
    });

    const lowerings = Array.from(loweringByName.values());
    if (lowerings.length === 0) {
        return source;
    }

    for (const lowering of lowerings) {
        out = rewriteSamplerExpressionsForSamplers(out, lowering.params.map((param) => ({
            name: param.name,
            glsl_type: param.glslType,
        })));
    }
    return rewriteSamplerFunctionCalls(out, lowerings);
}

function rewriteFragmentImplicitTextureLod(source: string): string {
    let result = "";
    let cursor = 0;
    const callRegex = /\btexture\s*\(/g;

    for (let match = callRegex.exec(source); match !== null; match = callRegex.exec(source)) {
        const openParen = callRegex.lastIndex - 1;
        const closeParen = findMatchingParen(source, openParen);
        if (closeParen < 0) {
            break;
        }
        const args = splitTopLevelArguments(source.slice(openParen + 1, closeParen));
        if (args.length >= 2 && /^[iu]?sampler(?:2D|Cube|2DArray|3D)\s*\(/.test(args[0].trim())) {
            result += source.slice(cursor, match.index);
            result += `textureLod(${args[0].trim()}, ${args[1].trim()}, 0.0)`;
            cursor = closeParen + 1;
        }
        callRegex.lastIndex = closeParen + 1;
    }

    if (cursor === 0) {
        return source;
    }
    return result + source.slice(cursor);
}

function decodeSpirvString(words: Uint32Array, start: number, end: number): string {
    const bytes: number[] = [];
    for (let i = start; i < end; i++) {
        const word = words[i];
        for (let shift = 0; shift < 32; shift += 8) {
            const byte = (word >> shift) & 0xff;
            if (byte === 0) {
                return String.fromCharCode(...bytes);
            }
            bytes.push(byte);
        }
    }
    return String.fromCharCode(...bytes);
}

export function patchGlslangSampledTextureVariables(spirv: Uint32Array, samplers: TextureNameAndType[]): Uint32Array {
    const filteredWords = Array.from(spirv.slice(0, 5));
    let strippedDecorations = false;
    for (let offset = 5; offset < spirv.length;) {
        const firstWord = spirv[offset];
        const wordCount = firstWord >>> 16;
        const op = firstWord & 0xffff;
        if (wordCount === 0) {
            throw new Error("invalid SPIR-V instruction with word count 0");
        }

        const isRelaxedPrecisionDecorate =
            (op === SPV_OP_DECORATE && wordCount >= 3 && spirv[offset + 2] === SPV_DECORATION_RELAXED_PRECISION) ||
            (op === SPV_OP_MEMBER_DECORATE && wordCount >= 4 && spirv[offset + 3] === SPV_DECORATION_RELAXED_PRECISION);
        if (!isRelaxedPrecisionDecorate) {
            for (let i = 0; i < wordCount; i++) {
                filteredWords.push(spirv[offset + i]);
            }
        } else {
            strippedDecorations = true;
        }
        offset += wordCount;
    }

    const filtered = strippedDecorations ? new Uint32Array(filteredWords) : spirv;
    if (samplers.length === 0) {
        return filtered;
    }

    const textureVariableNames = new Set(samplers.map((sampler) => `${sampler.name}T`));
    const names = new Map<number, string>();
    const sampledImageTypes = new Map<number, number>();
    const pointerTypes = new Map<number, { storageClass: number, pointeeType: number }>();
    const pointerTypeOffsets = new Map<number, number>();
    const variables = new Map<number, number>();
    const pointerValues = new Map<number, number>();
    const offsets: number[] = [];

    for (let offset = 5; offset < filtered.length;) {
        const firstWord = filtered[offset];
        const wordCount = firstWord >>> 16;
        const op = firstWord & 0xffff;
        if (wordCount === 0) {
            throw new Error("invalid SPIR-V instruction with word count 0");
        }
        offsets.push(offset);

        if (op === SPV_OP_NAME && wordCount >= 2) {
            names.set(filtered[offset + 1], decodeSpirvString(filtered, offset + 2, offset + wordCount));
        } else if (op === SPV_OP_TYPE_SAMPLED_IMAGE && wordCount >= 3) {
            sampledImageTypes.set(filtered[offset + 1], filtered[offset + 2]);
        } else if (op === SPV_OP_TYPE_POINTER && wordCount >= 4) {
            pointerTypes.set(filtered[offset + 1], {
                storageClass: filtered[offset + 2],
                pointeeType: filtered[offset + 3],
            });
            pointerTypeOffsets.set(filtered[offset + 1], offset);
        } else if (op === SPV_OP_VARIABLE && wordCount >= 4) {
            variables.set(filtered[offset + 2], filtered[offset + 1]);
        } else if (op === SPV_OP_FUNCTION_PARAMETER && wordCount >= 3) {
            pointerValues.set(filtered[offset + 2], filtered[offset + 1]);
        }

        offset += wordCount;
    }

    const textureVariables = new Map<number, number>();
    const pointerPatches = new Map<number, number>();
    for (const [variableId, pointerTypeId] of variables) {
        const variableName = names.get(variableId);
        const pointerType = pointerTypes.get(pointerTypeId);
        if (!variableName || !textureVariableNames.has(variableName) || !pointerType || pointerType.storageClass !== SPV_STORAGE_CLASS_UNIFORM_CONSTANT) {
            continue;
        }

        const imageType = sampledImageTypes.get(pointerType.pointeeType);
        if (imageType === undefined) {
            continue;
        }
        textureVariables.set(variableId, imageType);
        pointerPatches.set(pointerTypeId, imageType);
    }

    if (textureVariables.size === 0) {
        return filtered;
    }

    for (const [valueId, pointerTypeId] of variables) {
        const imageType = pointerPatches.get(pointerTypeId);
        if (imageType !== undefined) {
            pointerValues.set(valueId, pointerTypeId);
        }
    }

    const patched = new Uint32Array(filtered);
    const patchedImageLoads = new Set<number>();
    for (const [pointerTypeId, imageType] of pointerPatches) {
        const pointerOffset = pointerTypeOffsets.get(pointerTypeId);
        if (pointerOffset !== undefined) {
            patched[pointerOffset + 3] = imageType;
        }
    }

    for (const offset of offsets) {
        const op = patched[offset] & 0xffff;
        if (op !== SPV_OP_LOAD) {
            continue;
        }
        const pointerId = patched[offset + 3];
        let imageType = textureVariables.get(pointerId);
        const pointerTypeId = pointerValues.get(pointerId);
        if (imageType === undefined && pointerTypeId !== undefined) {
            imageType = pointerPatches.get(pointerTypeId);
        }
        if (imageType !== undefined) {
            patched[offset + 1] = imageType;
            patchedImageLoads.add(patched[offset + 2]);
        }
    }

    const replacements = new Map<number, number>();
    const removedOffsets = new Set<number>();
    for (const offset of offsets) {
        const op = patched[offset] & 0xffff;
        if (op !== SPV_OP_IMAGE) {
            continue;
        }
        const sampledImageId = patched[offset + 3];
        if (patchedImageLoads.has(sampledImageId)) {
            replacements.set(patched[offset + 2], sampledImageId);
            removedOffsets.add(offset);
        }
    }
    if (replacements.size === 0) {
        return patched;
    }

    const finalWords = Array.from(patched.slice(0, 5));
    for (const offset of offsets) {
        if (removedOffsets.has(offset)) {
            continue;
        }
        const wordCount = patched[offset] >>> 16;
        finalWords.push(patched[offset]);
        for (let i = 1; i < wordCount; i++) {
            finalWords.push(replacements.get(patched[offset + i]) || patched[offset + i]);
        }
    }

    return new Uint32Array(finalWords);
}

export function buildGlslangSource(
    source: string,
    stage: ShaderStage,
    metadata: InitShaderInfoType,
    layout: ProgramTranslationLayout,
    options: BuildGlslangSourceOptions = {},
): string {
    const prepared = prepareSourceAndDeclarations(source);
    const lines: string[] = [prepared.source.trimEnd()];
    const declarations = prepared.declarations;
    const sourceWithoutPreamble = source
        .replace(/^\s*#version[^\n]*(?:\n|$)/gm, "")
        .replace(/^\s*(#extension[^\n]*|#define[^\n]*|precision\s+(?:lowp|mediump|highp)\s+\w+\s*;)\s*$/gm, "");
    const bodyStart = sourceWithoutPreamble.replace(
        GLOBAL_DECLARATION_REGEX,
        (full, _interpolation, _qualifier, _glslType, _rawNames, offset) => {
            return isTopLevelAt(sourceWithoutPreamble, offset) ? "" : full;
        },
    );
    let body = bodyStart;
    addSamplerPrecisionDeclarations(lines, metadata);

    if (stage === "vertex") {
        for (const attribute of metadata.attributes) {
            const location = layout.attributeLocations.get(attribute.name);
            lines.push(`layout(location = ${location === undefined ? 0 : location}) in ${attribute.glsl_type} ${attribute.name};`);
        }
    }

    const stageVaryings = uniqueByName(
        scanGlslDeclarations(source, stage).varyings,
    );
    for (const varying of stageVaryings) {
        const location = layout.varyingLocations.get(varying.name);
        const direction = stage === "vertex" ? "out" : "in";
        const interpolation = varying.interpolation ? `${varying.interpolation} ` : "";
        lines.push(`layout(location = ${location === undefined ? 0 : location}) ${interpolation}${direction} ${varying.glsl_type} ${varying.name}${declarationArraySuffix(declarations, varying.name)};`);
    }

    let fragmentOutputLocation = 0;
    for (const declaration of declarations) {
        if (isFragmentOutput(declaration, stage)) {
            lines.push(`layout(location = ${fragmentOutputLocation++}) out ${declaration.glslType} ${declaration.name}${declaration.arraySuffix};`);
        }
    }

    const normalized = stage === "fragment" ? normalizeLegacyFragmentBuiltins(body) : { source: body, usesFragColor: false };
    normalized.source = normalizeWebGlBuiltinsForVulkanGlsl(normalized.source);
    normalized.source = rewriteMetadataSourceNames(normalized.source, metadata);
    body = lowerSamplerFunctionParameters(normalized.source);
    body = rewriteSamplerExpressions(body, metadata);
    if (stage === "fragment" && options.preserveImplicitTextureLod === false) {
        body = rewriteFragmentImplicitTextureLod(body);
    }
    if (stage === "fragment" && normalized.usesFragColor) {
        lines.push("layout(location = 0) out vec4 _hyd_fragColor;");
    }

    lines.push(...makeUniformBlockDeclarations(metadata, declarations));
    lines.push(...makeSamplerBindingDeclarations(metadata, layout));
    lines.push("");
    lines.push(body.trim());
    return `${lines.filter((line) => line.length > 0).join("\n")}\n`;
}

function stripResourceDeclarations(wgsl: string): string {
    return wgsl
        .replace(/^\s*@group\([^)]*\)\s*@binding\([^)]*\)\s*var(?:<[^>]+>)?\s+\w+\s*:\s*[^;]+;\s*$/gm, "")
        .replace(/^\s*@binding\([^)]*\)\s*@group\([^)]*\)\s*var(?:<[^>]+>)?\s+\w+\s*:\s*[^;]+;\s*$/gm, "")
        .replace(/^\s*struct\s+\w*Uniform\w*\s*\{[\s\S]*?^\s*\}\s*;?\s*$/gm, "");
}

function uniformReadExpression(uniform: NameAndType): string {
    return `_hyd_uniforms_.${uniform.name}`;
}

const WGSL_RESERVED_IDENTIFIER_RENAMES: Record<string, string> = {
    target: "target_",
};

function replaceBareIdentifier(source: string, from: string, to: string): string {
    return source.replace(new RegExp(`\\b${escapeRegExp(from)}\\b`, "g"), (match, offset: number) => {
        if (offset > 0 && source[offset - 1] === ".") {
            return match;
        }
        return to;
    });
}

function renameReservedWgslIdentifiers(wgsl: string): string {
    let out = wgsl;
    for (const [reserved, replacement] of Object.entries(WGSL_RESERVED_IDENTIFIER_RENAMES)) {
        const declarationRegex = new RegExp(`\\b(?:var(?:<[^>]+>)?|let)\\s+${escapeRegExp(reserved)}\\b|[(,]\\s*${escapeRegExp(reserved)}\\s*:`, "m");
        if (declarationRegex.test(out)) {
            out = replaceBareIdentifier(out, reserved, replacement);
        }
    }
    return out;
}

function normalizeTintWgsl(wgsl: string, metadata: InitShaderInfoType): string {
    let out = stripResourceDeclarations(wgsl);
    out = renameReservedWgslIdentifiers(out);

    const uniformPlaceholders: Array<[string, string]> = [];
    for (const uniform of metadata.uniforms) {
        const placeholder = `__HYD_UNIFORM_${uniformPlaceholders.length}__`;
        uniformPlaceholders.push([placeholder, uniformReadExpression(uniform)]);
        out = out.replace(new RegExp(`\\b[A-Za-z_]\\w*\\s*\\.\\s*${escapeRegExp(uniform.name)}\\b`, "g"), placeholder);
        out = wordBoundaryReplace(out, uniform.name, placeholder);
    }

    for (const sampler of metadata.samplers) {
        out = out.replace(new RegExp(`textureSample\\s*\\(\\s*${sampler.name}\\s*,`, "g"), `textureSample(${sampler.name}T, ${sampler.name}S,`);
        out = wordBoundaryReplace(out, `${sampler.name}_sampler`, `${sampler.name}S`);
        out = wordBoundaryReplace(out, `${sampler.name}_texture`, `${sampler.name}T`);
    }

    for (const [placeholder, value] of uniformPlaceholders) {
        out = wordBoundaryReplace(out, placeholder, value);
    }
    out = out.replace(/\barr_to_mat\d+x\d+_stride_\d+\s*\(\s*(_hyd_uniforms_\.[A-Za-z_]\w*)\s*\)/g, "$1");

    return normalizeSamplerOriginCoordinates(out.trim() + "\n", metadata);
}

const WGSL_TEXTURE_SAMPLE_CALL = /\b(textureSample(?:Level|Bias|Grad)?)\s*\(/g;

function addSamplerOriginHelper(wgsl: string): string {
    if (wgsl.includes("fn _hyd_samplerOriginCoord")) {
        return wgsl;
    }
    const helper = `fn _hyd_samplerOriginCoord(texCoord: vec2<f32>, flipY: f32) -> vec2<f32> {\n    return vec2<f32>(texCoord.x, select(texCoord.y, 1.0 - texCoord.y, flipY > 0.5));\n}\n\n`;
    const fragmentIndex = wgsl.search(/^\s*@fragment\b/m);
    if (fragmentIndex < 0) {
        return helper + wgsl;
    }
    return wgsl.slice(0, fragmentIndex) + helper + wgsl.slice(fragmentIndex);
}

function normalizeSamplerOriginCoordinates(wgsl: string, metadata: InitShaderInfoType): string {
    const sampler2DNames = metadata.samplers
        .filter((sampler) => sampler.glsl_type === "sampler2D")
        .map((sampler) => sampler.name);
    if (sampler2DNames.length === 0) {
        return wgsl;
    }

    let changed = false;
    let result = "";
    let cursor = 0;
    WGSL_TEXTURE_SAMPLE_CALL.lastIndex = 0;
    for (let match = WGSL_TEXTURE_SAMPLE_CALL.exec(wgsl); match !== null; match = WGSL_TEXTURE_SAMPLE_CALL.exec(wgsl)) {
        const openParen = WGSL_TEXTURE_SAMPLE_CALL.lastIndex - 1;
        const closeParen = findMatchingParen(wgsl, openParen);
        if (closeParen < 0) {
            break;
        }
        const args = splitTopLevelArguments(wgsl.slice(openParen + 1, closeParen));
        if (args.length >= 3) {
            const samplerName = sampler2DNames.find((name) => {
                return args[0].trim() === `${name}T` && args[1].trim() === `${name}S`;
            });
            if (samplerName && !args[2].includes("_hyd_samplerOriginCoord")) {
                const rewrittenArgs = args.slice();
                rewrittenArgs[2] = `_hyd_samplerOriginCoord(${args[2].trim()}, _hyd_uniforms_.${samplerFlipYUniformName(samplerName)})`;
                result += wgsl.slice(cursor, openParen + 1) + rewrittenArgs.map((arg) => arg.trim()).join(", ") + ")";
                cursor = closeParen + 1;
                changed = true;
            }
        }
        WGSL_TEXTURE_SAMPLE_CALL.lastIndex = closeParen + 1;
    }
    if (!changed) {
        return wgsl;
    }
    result += wgsl.slice(cursor);
    return addSamplerOriginHelper(result);
}

export class ShaderTranslator {
    private readonly glslang: GlslangModule;
    private readonly tint: TintWasmModule;
    private readonly options: ShaderTranslatorOptions;
    private readonly runtimeCache: Map<string, InitShaderInfoType> = new Map();

    private constructor(
        glslang: GlslangModule,
        tint: TintWasmModule,
        options: ShaderTranslatorOptions,
    ) {
        this.glslang = glslang;
        this.tint = tint;
        this.options = options;
    }

    static async create(options: ShaderTranslatorOptions = {}): Promise<ShaderTranslator> {
        let glslang: GlslangModule = null;
        let tint: TintWasmModule = null;

        try {
            glslang = await glslangInit({
                locateFile: options.glslangLocateFile || locateBundledWasm,
                wasmBinary: options.glslangWasmBinary,
            });
        } catch (error) {
            console.warn("[HYD] glslang WASM unavailable, runtime shader translation disabled:", error);
        }

        try {
            tint = await tintInit({
                locateFile: options.tintLocateFile || locateBundledWasm,
                wasmBinary: options.tintWasmBinary,
            });
        } catch (error) {
            console.warn("[HYD] Tint WASM unavailable, runtime shader translation disabled:", error);
        }

        return new ShaderTranslator(glslang, tint, options);
    }

    private get runtimeTranslationAvailable(): boolean {
        return !!this.glslang && !!this.tint;
    }

    inspectShader(type: GLenum, source: string): InitShaderInfoType {
        return makeShaderMetadata(source, type);
    }

    translateProgram(vertexShader?: ShaderLike, fragmentShader?: ShaderLike, boundAttributeLocations: Map<string, number> = new Map()): TranslatedProgram {
        const layout = this.makeLayout(vertexShader, fragmentShader, boundAttributeLocations);
        const translated: TranslatedProgram = {};
        translated.attributeLocations = layout.attributeLocations;
        if (vertexShader) {
            translated.vertex = this.translateShader(vertexShader, "vertex", layout);
        }
        if (fragmentShader) {
            translated.fragment = this.translateShader(fragmentShader, "fragment", layout);
        }
        return translated;
    }

    private metadataFor(shader: ShaderLike): InitShaderInfoType {
        return shader.shader_info || makeShaderMetadata(shader.glsl_shader, shader.type);
    }

    private makeLayout(vertexShader?: ShaderLike, fragmentShader?: ShaderLike, boundAttributeLocations: Map<string, number> = new Map()): ProgramTranslationLayout {
        const vertexMetadata = vertexShader ? this.metadataFor(vertexShader) : undefined;
        const fragmentMetadata = fragmentShader ? this.metadataFor(fragmentShader) : undefined;
        const vertexVaryings = vertexShader ? scanGlslDeclarations(vertexShader.glsl_shader, "vertex").varyings : [];
        const fragmentVaryings = fragmentShader ? scanGlslDeclarations(fragmentShader.glsl_shader, "fragment").varyings : [];
        const samplers = uniqueByName([
            ...(vertexMetadata ? vertexMetadata.samplers : []),
            ...(fragmentMetadata ? fragmentMetadata.samplers : []),
        ]);
        const uniforms = uniqueByName([
            ...(vertexMetadata ? vertexMetadata.uniforms : []),
            ...(fragmentMetadata ? fragmentMetadata.uniforms : []),
        ]);
        const hasHydUniformBlock = uniforms.length > 0 || samplers.some((sampler) => sampler.glsl_type === "sampler2D");
        const samplerOffset = hasHydUniformBlock ? 1 : 0;
        const samplerBindings = new Map<string, number>();
        samplers.forEach((sampler, index) => {
            samplerBindings.set(sampler.name, samplerOffset + index * 2);
        });

        const attributeLocations = assignLocations(vertexMetadata ? vertexMetadata.attributes : [], boundAttributeLocations);
        const varyingLocations = assignLocations(uniqueByName([...vertexVaryings, ...fragmentVaryings]));

        return {
            attributeLocations,
            varyingLocations,
            samplerBindings,
            cacheKey: [
                Array.from(attributeLocations).map(([name, location]) => `${name}:${location}`).join(","),
                Array.from(varyingLocations).map(([name, location]) => `${name}:${location}`).join(","),
                Array.from(samplerBindings).map(([name, binding]) => `${name}:${binding}`).join(","),
            ].join("|"),
        };
    }

    private translateShader(shader: ShaderLike, stage: ShaderStage, layout: ProgramTranslationLayout): InitShaderInfoType {
        const key = shader.glsl_shader;
        const preserveImplicitTextureLod = this.options.preserveImplicitTextureLod !== false;
        const shouldOptimizeTintWgsl = this.options.optimizeTintWgsl !== false;
        const runtimeKey = [
            stage,
            layout.cacheKey,
            `lod=${preserveImplicitTextureLod ? 1 : 0}`,
            `opt=${shouldOptimizeTintWgsl ? 1 : 0}`,
            `legacyTexCoord=${this.options.legacyTextureCoordinateFixups ? 1 : 0}`,
            key,
        ].join(":");
        const cachedRuntime = this.runtimeCache.get(runtimeKey);
        if (cachedRuntime) {
            return cachedRuntime;
        }

        const metadata = makeShaderMetadata(shader.glsl_shader, shader.type);
        if (!this.runtimeTranslationAvailable) {
            throw new Error(`Runtime shader translator is unavailable (${stage}).`);
        }

        let glslangSource = "";
        const timingsMs: Record<string, number> = {};
        try {
            const buildStart = nowMs();
            glslangSource = buildGlslangSource(shader.glsl_shader, stage, metadata, layout, {
                preserveImplicitTextureLod,
            });
            timingsMs.glslPreprocess = nowMs() - buildStart;

            const compileStart = nowMs();
            const spirv = patchGlslangSampledTextureVariables(
                this.glslang.compileGLSL(glslangSource, stage, false),
                metadata.samplers,
            );
            timingsMs.glslang = nowMs() - compileStart;

            const tintStart = nowMs();
            const tintWgsl = this.tint.spirvToWgsl(spirv);
            timingsMs.tint = nowMs() - tintStart;

            const normalizeStart = nowMs();
            let wgsl = normalizeTintWgsl(tintWgsl, metadata);
            const normalizedWgsl = wgsl;
            timingsMs.wgslNormalize = nowMs() - normalizeStart;

            let optimizerStats: WgslOptimizerStats = {
                optimizeTintWgsl: shouldOptimizeTintWgsl,
                loweredPrivateVars: 0,
                loweredPointerParams: 0,
                promotedLocalVars: 0,
                branchifiedSelects: 0,
                hoistedModOperands: 0,
                foldedModByOne: 0,
                elidedRangeClamps: 0,
                foldedOutputStores: 0,
                collapsedOutputStructs: 0,
                removedTemporaries: 0,
                foldedConstructors: 0,
                skippedPasses: [],
            };
            if (shouldOptimizeTintWgsl) {
                const optimizeStart = nowMs();
                const optimized = optimizeTintWgsl(wgsl);
                wgsl = optimized.wgsl;
                optimizerStats = optimized.stats;
                timingsMs.wgslOptimize = nowMs() - optimizeStart;
            }
            if (this.options.legacyTextureCoordinateFixups) {
                const legacyFixupStart = nowMs();
                metadata.wgsl = normalizeWebGlTextureCoordinates(wgsl, metadata, stage, shader.glsl_shader);
                timingsMs.legacyTextureCoordinateFixups = nowMs() - legacyFixupStart;
            } else {
                metadata.wgsl = wgsl;
            }
            const resourcePrune = pruneUnusedShaderResources(metadata, metadata.wgsl);
            const shaderId = `${stage}:${stableHashString(shader.glsl_shader)}:${layout.cacheKey}`;
            const capture: ShaderCaptureRecord = {
                kind: "shader-stage",
                stage,
                shaderId,
                source: "runtime",
                optimizer: optimizerStats,
                timingsMs,
                glsl: sourceCapture(shader.glsl_shader),
                normalizedGlsl: sourceCapture(glslangSource),
                spirv: {
                    hash: stableHashU32(spirv),
                    wordCount: spirv.length,
                    byteLength: spirv.byteLength,
                },
                tintWgsl: sourceCapture(tintWgsl),
                normalizedWgsl: sourceCapture(normalizedWgsl),
                postProcessWgsl: sourceCapture(metadata.wgsl),
            };
            metadata.shader_capture = capture;
            metadata.debug_info = JSON.stringify({
                source: "runtime",
                stage,
                translated: true,
                glsl: "310es",
                legacyTextureCoordinateFixups: !!this.options.legacyTextureCoordinateFixups,
                preserveImplicitTextureLod,
                optimizer: optimizerStats,
                resourcePrune,
                shaderId,
                spirv: capture.spirv,
                shapeStats: {
                    tintWgsl: capture.tintWgsl.stats,
                    normalizedWgsl: capture.normalizedWgsl.stats,
                    postProcessWgsl: capture.postProcessWgsl.stats,
                },
            });
            this.runtimeCache.set(runtimeKey, metadata);
            return metadata;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Runtime shader translation failed for ${stage} shader: ${message}\n--- original GLSL ---\n${shader.glsl_shader}\n--- normalized GLSL ---\n${glslangSource}`);
        }
    }
}
