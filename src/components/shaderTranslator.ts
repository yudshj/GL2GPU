import glslangInit from "../vendor/glslang/glslang.js";
import tintInit from "../vendor/tint-wasm/tint_wasm.js";
import type { TintWasmModule } from "../vendor/tint-wasm/tint_wasm.js";
import {
    InitShaderInfoType,
    NameAndType,
    SamplerOriginCoordinateKind,
    samplerOriginCoordinateKind,
    samplerFlipYUniformName,
    TextureNameAndType,
} from "./shaderDB";
import { FRAG_COORD_HEIGHT_UNIFORM_NAME } from "./shaderInternalUniforms";
import { bridgeGlslEs100Identifiers, renameUserDefinedFunctions } from "./shaderGlslIdentifiers";
import {
    lowerEs100GlobalInitializers,
    lowerDoWhileLoops,
    lowerFallthroughSwitches,
    lowerUnsupportedFloatBuiltins,
    foldGlslIntegerBuiltinCaseLabels,
    lowerWebGlPointSizeToPrivateState,
    materializeWebGlLineMacros,
    maskGlslPreprocessorDirectives,
    maskStaticallyInactivePreprocessorBranches,
    normalizeGlslInterfaceTypeArrays,
    normalizeWebGlDerivativeOrientation,
    normalizeWebGlDepthRange,
    normalizeWebGl1BuiltinLimits,
    normalizeWebGl2BuiltinLimits,
    normalizeWebGlShaderLanguageVersion,
    normalizeEs100SequenceArrayDimensions,
    preserveComplexArrayLengthSideEffects,
    sanitizeGlslangLineComments,
    stripGlslVersionDirectives,
    stripProvablyEmptyTopLevelMacroInvocations,
    wrapVertexMainForWebGpuClipSpace,
} from "./shaderGlslCompatibility";
import {
    lowerInlineInterfaceStructs,
    normalizeAnonymousUniformStructs,
    planValueStructUniforms,
    rewriteDynamicStructUniformReads,
    rewriteStructUniformAggregateReads,
} from "./shaderGlslStructs";
import { makeShaderMetadata, scanGlslDeclarations, ShaderStage } from "./shaderMetadata";
import {
    emitShaderCapture,
    ShaderCaptureRecord,
    sourceCapture,
    stableHashString,
    stableHashU32,
} from "./shaderCapture";
import { normalizeWebGlTextureCoordinates } from "./shaderTexCoord";
import {
    normalizeWebGlFragmentOutputWidths,
    optimizeTintWgsl,
    WgslOptimizerStats,
} from "./shaderWgslOptimizer";
import {
    enforceWebGlTextureLoadBounds,
    normalizeWebGlTextureDimensionQueries,
} from "./shaderWgslRobustness";
import { preserveFlatFloatVaryingBits } from "./shaderWgslFlatVaryings";
import { injectGlslUniformBlockBindings, scanGlslUniformBlocks } from "./shaderGlslUniformBlocks";
import {
    replaceBareWgslIdentifier,
    replaceWgslMemberAccess,
    renameReservedWgslIdentifiers,
    synchronizeTintUniformTypes,
    wgslUniformVariableNames,
} from "./shaderWgslTypes";
import {
    makeMatrixArrayLoaders,
    matrixArrayStorageDeclaration,
    rewriteMatrixArrayUniformReads,
} from "./shaderGlslUniforms";
import {
    lowerDynamicSamplerArrayTextureCalls,
    lowerSamplerStructFunctionParameters,
    lowerTexelFetchOffsetCalls,
    replaceGlslSourcePath,
} from "./shaderGlslSamplers";
import { lowerRowMajorUniformBlocks } from "./shaderGlslRowMajor";
import { lowerIntegerTextureSampling } from "./shaderGlslIntegerSampling";
import {
    samplerCoordinateScaleOverrideNames,
    webGlArrayLayerExpression,
} from "./shaderSamplerState";

interface GlslangModule {
    compileGLSL(glsl: string, shaderType: ShaderStage, genDebug: boolean, spirvVersion?: "1.0" | "1.1" | "1.2" | "1.3" | "1.4" | "1.5"): Uint32Array;
    clearDiagnostics?(): void;
    getDiagnostics?(): string[];
}

function glslangFailure(error: unknown, diagnostics: string[]): Error {
    const message = error instanceof Error ? error.message : String(error);
    const details = diagnostics.map((line) => line.trim()).filter(Boolean);
    return new Error(details.length > 0 ? `${message}\n${details.join("\n")}` : message);
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
    compiled_glsl_shader?: string;
    shader_info?: InitShaderInfoType;
    webglVersion?: 1 | 2;
}

export interface TranslatedProgram {
    vertex?: InitShaderInfoType;
    fragment?: InitShaderInfoType;
    attributeLocations?: Map<string, number>;
    uniformBlockBindings?: Map<string, number>;
    usesFlatInterpolation?: boolean;
}

function compiledShaderSource(shader: ShaderLike): string {
    return shader.compiled_glsl_shader || shader.glsl_shader;
}

interface ProgramTranslationLayout {
    attributeLocations: Map<string, number>;
    varyingLocations: Map<string, number>;
    varyingInterpolations: Map<string, string>;
    samplerBindings: Map<string, number>;
    uniformBlockBindings: Map<string, number>;
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
    webglVersion?: 1 | 2;
}

interface ResourcePruneStats {
    removedUniforms: string[];
    removedSamplers: string[];
}

const GLOBAL_DECLARATION_REGEX = /\b(?:layout\s*\([^)]*\)\s*)?(?:invariant\s+)?(?:(?:lowp|mediump|highp)\s+)?((?:(?:flat|smooth|noperspective|centroid|sample)\s+)*)(attribute|uniform|varying|in|out)\s+(?:(?:lowp|mediump|highp)\s+)?([A-Za-z_]\w*)\s+([^;]+)\s*;/g;
const SPV_OP_NAME = 5;
const SPV_OP_TYPE_SAMPLED_IMAGE = 27;
const SPV_OP_TYPE_POINTER = 32;
const SPV_OP_FUNCTION_PARAMETER = 55;
const SPV_OP_VARIABLE = 59;
const SPV_OP_LOAD = 61;
const SPV_OP_DECORATE = 71;
const SPV_OP_MEMBER_DECORATE = 72;
const SPV_OP_IMAGE = 100;
const SPV_OP_COPY_OBJECT = 83;
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

function maskGlslComments(source: string): string {
    const masked = source.split("");
    let lineComment = false;
    let blockComment = false;
    for (let index = 0; index < source.length; index++) {
        const ch = source[index];
        const next = source[index + 1];
        if (lineComment) {
            if (ch === "\n") {
                lineComment = false;
            } else {
                masked[index] = " ";
            }
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

function replaceTopLevelGlobalDeclarations(
    source: string,
    replacement: (
        full: string,
        interpolation: string,
        qualifier: ParsedGlslDeclaration["qualifier"],
        glslType: string,
        rawNames: string,
        offset: number,
    ) => string,
): string {
    const masked = maskGlslPreprocessorDirectives(maskGlslComments(source));
    const regex = new RegExp(GLOBAL_DECLARATION_REGEX.source, GLOBAL_DECLARATION_REGEX.flags);
    let result = "";
    let cursor = 0;
    for (let match = regex.exec(masked); match !== null; match = regex.exec(masked)) {
        if (!isTopLevelAt(masked, match.index)) continue;
        // Uniform interface blocks are resources in their own right. They must
        // survive the ordinary-uniform rewrite as a complete declaration.
        if (match[2] === "uniform" && match[4].trimStart().startsWith("{")) continue;
        result += source.slice(cursor, match.index);
        result += replacement(
            source.slice(match.index, regex.lastIndex),
            match[1],
            match[2] as ParsedGlslDeclaration["qualifier"],
            match[3],
            match[4],
            match.index,
        );
        cursor = regex.lastIndex;
    }
    return result + source.slice(cursor);
}

function normalizeUnsupportedInvariantPragmas(source: string): string {
    return source
        .replace(/^\s*#\s*pragma\b[^\r\n]*$/gmi, "")
        .replace(/^\s*invariant\s+[A-Za-z_]\w*\s*;\s*$/gmi, "");
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
        const groupUsed = sampler.array_name && metadata.samplers.some((item) =>
            item.array_name === sampler.array_name &&
            (referencesIdentifier(wgsl, `${item.name}S`) || referencesIdentifier(wgsl, `${item.name}T`)));
        const keep = groupUsed || referencesIdentifier(wgsl, `${sampler.name}S`) || referencesIdentifier(wgsl, `${sampler.name}T`);
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

function attributeLocationSpan(item: NameAndType): number {
    const matrix = /^mat([2-4])(?:x[2-4])?$/.exec(item.glsl_type);
    const elementSpan = matrix ? Number(matrix[1]) : 1;
    return elementSpan * (item.is_array ? Math.max(1, item.size || 1) : 1);
}

function assignLocations(
    items: NameAndType[],
    boundLocations: Map<string, number> = new Map(),
    locationSpan: (item: NameAndType) => number = () => 1,
): Map<string, number> {
    const locations = new Map<string, number>();
    const usedLocations = new Set<number>();
    for (const item of items) {
        const requestedLocation = item.location ??
            boundLocations.get(item.source_name || item.name) ??
            boundLocations.get(item.name);
        if (requestedLocation !== undefined && !locations.has(item.name)) {
            locations.set(item.name, requestedLocation);
            for (let offset = 0; offset < locationSpan(item); offset++) {
                usedLocations.add(requestedLocation + offset);
            }
        }
    }
    let nextLocation = 0;
    for (const item of items) {
        if (locations.has(item.name)) continue;
        const span = locationSpan(item);
        while (Array.from({ length: span }, (_, offset) => nextLocation + offset).some((location) => usedLocations.has(location))) {
            nextLocation++;
        }
        locations.set(item.name, nextLocation);
        for (let offset = 0; offset < span; offset++) {
            usedLocations.add(nextLocation + offset);
        }
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

function linkedVaryingInterpolation(vertex: NameAndType | undefined, fragment: NameAndType | undefined): string {
    const vertexTokens = new Set((vertex?.interpolation || "").split(/\s+/).filter(Boolean));
    const fragmentTokens = new Set((fragment?.interpolation || "").split(/\s+/).filter(Boolean));
    const firstToken = (tokens: Set<string>, candidates: string[]) =>
        candidates.find((candidate) => tokens.has(candidate)) || "";
    const interpolation = firstToken(fragmentTokens, ["flat", "noperspective", "smooth"]) ||
        firstToken(vertexTokens, ["flat", "noperspective", "smooth"]);
    const sampling = firstToken(fragmentTokens, ["sample", "centroid"]) ||
        firstToken(vertexTokens, ["sample", "centroid"]);
    return [sampling, interpolation].filter(Boolean).join(" ");
}

function isFragmentOutput(declaration: ParsedGlslDeclaration, stage: ShaderStage): boolean {
    return stage === "fragment" && declaration.qualifier === "out";
}

function prepareSourceAndDeclarations(source: string): PreparedGlslSource {
    const preamble: string[] = ["#version 310 es"];
    const seenPreamble = new Set<string>(preamble);
    let body = stripGlslVersionDirectives(source);

    body = body.replace(
        /^[\t ]*(#extension[^\r\n]*|precision\s+(?:lowp|mediump|highp)\s+\w+\s*;)[\t ]*(\r?\n|$)/gm,
        (_line, directive: string, newline: string) => {
        const trimmed = directive.trim();
        if (!seenPreamble.has(trimmed)) {
            seenPreamble.add(trimmed);
            preamble.push(trimmed);
        }
        return newline;
    });
    if (!preamble.some((line) => /^precision\s+(?:lowp|mediump|highp)\s+float\s*;/.test(line))) {
        const defaultFloatPrecision = "precision highp float;";
        preamble.splice(1, 0, defaultFloatPrecision);
        seenPreamble.add(defaultFloatPrecision);
    }

    const declarations: ParsedGlslDeclaration[] = [];
    body = replaceTopLevelGlobalDeclarations(body, (_full, interpolation, qualifier, glslType, rawNames) => {
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
    const usesFragColor = /\bgl_FragColor\b|\bgl_FragData\s*\[\s*0\s*\]/.test(out);
    out = wordBoundaryReplace(out, "gl_FragColor", "_hyd_fragColor");
    out = out.replace(/\bgl_FragData\s*\[\s*0\s*\]/g, "_hyd_fragColor");
    out = wordBoundaryReplace(out, "texture2D", "texture");
    out = wordBoundaryReplace(out, "textureCube", "texture");
    out = wordBoundaryReplace(out, "texture2DProj", "textureProj");
    out = wordBoundaryReplace(out, "texture2DProjLod", "textureProjLod");
    out = wordBoundaryReplace(out, "texture2DProjLodEXT", "textureProjLod");
    out = wordBoundaryReplace(out, "texture2DLod", "textureLod");
    out = wordBoundaryReplace(out, "texture2DLodEXT", "textureLod");
    out = wordBoundaryReplace(out, "textureCubeLod", "textureLod");
    out = wordBoundaryReplace(out, "textureCubeLodEXT", "textureLod");
    return { source: out, usesFragColor };
}

function normalizeWebGlBuiltinsForVulkanGlsl(
    source: string,
    webglVersion: 1 | 2 = 1,
    shaderLanguageVersion: 1 | 2 = webglVersion,
): string {
    let out = source;
    out = wordBoundaryReplace(out, "gl_VertexID", "gl_VertexIndex");
    out = wordBoundaryReplace(out, "gl_InstanceID", "gl_InstanceIndex");
    if (webglVersion === 1) {
        out = normalizeWebGl1BuiltinLimits(out);
    } else {
        out = normalizeWebGl2BuiltinLimits(out);
    }
    out = normalizeWebGlShaderLanguageVersion(out, shaderLanguageVersion);
    // Tint's SPIR-V reader rejects an OpConstant carrying infinity. Use the
    // largest finite f32 as an internal sentinel; the isinf lowering below
    // recognizes it as overflow while keeping the IR representable.
    const overflow = "3.4028234663852886e38";
    out = out.replace(/\b1(?:\.0)?\s*\/\s*0(?:\.0)?\b/g, overflow);
    return clampOutOfRangeFloatLiterals(out, overflow);
}

function clampOutOfRangeFloatLiterals(source: string, overflow: string): string {
    const masked = maskGlslComments(source);
    const regex = /(?<![A-Za-z0-9_.])(?:\d+\.\d*|\.\d+|\d+[eE][+\-]?\d+)(?:[eE][+\-]?\d+)?(?![A-Za-z0-9_.])/g;
    let result = "";
    let cursor = 0;
    for (let match = regex.exec(masked); match !== null; match = regex.exec(masked)) {
        const parsed = Number(match[0]);
        const value = Math.fround(parsed);
        let replacement: string;
        if (!Number.isFinite(value)) {
            replacement = overflow;
        } else {
            replacement = String(value);
            if (!/[.eE]/.test(replacement)) replacement += ".0";
        }
        if (replacement === match[0]) continue;
        result += source.slice(cursor, match.index);
        result += replacement;
        cursor = regex.lastIndex;
    }
    return cursor === 0 ? source : result + source.slice(cursor);
}

function demoteConstDeclarationsForVulkanGlsl(source: string): string {
    return source.replace(
        /\bconst\s+((?:(?:lowp|mediump|highp)\s+)?[A-Za-z_]\w*\s+)([A-Za-z_]\w*)\s*=\s*([^;]+);/g,
        (full, typeAndSpacing, name, initializer) => {
            const requiresConstant = new RegExp(`\\[\\s*${escapeRegExp(name)}\\s*\\]`).test(source) ||
                new RegExp(`\\bcase\\s+${escapeRegExp(name)}\\s*:`).test(source);
            return requiresConstant ? full : `${typeAndSpacing}${name} = ${initializer};`;
        },
    );
}

function ensureVertexPositionBuiltin(source: string): string {
    const withoutComments = source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
    if (/\bgl_Position\b/.test(withoutComments)) return source;
    return source.replace(
        /\bvoid\s+main\s*\(\s*(?:void\s*)?\)\s*\{/,
        (signature) => `${signature}\n  gl_Position = vec4(0.0);`,
    );
}

function normalizeWebGlFragCoord(source: string, metadata: InitShaderInfoType): string {
    if (!metadata.uniforms.some((uniform) => uniform.name === FRAG_COORD_HEIGHT_UNIFORM_NAME)) {
        return source;
    }
    const invariantStatements: string[] = [];
    let body = source.replace(/\binvariant\s+gl_FragCoord\s*;/g, (statement) => {
        const placeholder = `__HYD_FRAG_COORD_INVARIANT_${invariantStatements.length}__`;
        invariantStatements.push(statement);
        return placeholder;
    });
    body = wordBoundaryReplace(body, "gl_FragCoord", "_hydWebGlFragCoord()");
    invariantStatements.forEach((statement, index) => {
        body = wordBoundaryReplace(body, `__HYD_FRAG_COORD_INVARIANT_${index}__`, statement);
    });
    return `
vec4 _hydWebGlFragCoord() {
  return vec4(
      gl_FragCoord.x,
      ${FRAG_COORD_HEIGHT_UNIFORM_NAME} - gl_FragCoord.y,
      gl_FragCoord.z,
      gl_FragCoord.w);
}

${body}`;
}

function normalizeWebGlPointCoord(source: string): string {
    if (!/\bgl_PointCoord\b/.test(maskGlslComments(source))) return source;
    const body = wordBoundaryReplace(source, "gl_PointCoord", "_hydWebGlPointCoord()");
    return `
vec2 _hydWebGlPointCoord() {
  return vec2(0.5, 0.5);
}

${body}`;
}

function makeSamplerBindingDeclarations(metadata: InitShaderInfoType, layout: ProgramTranslationLayout): string[] {
    const lines: string[] = [];
    metadata.samplers.forEach((sampler, fallback) => {
        const binding = layout.samplerBindings.get(sampler.name);
        const textureType = samplerGlslTextureType(sampler.glsl_type);
        const baseBinding = binding === undefined ? fallback * 2 : binding;
        const samplerType = /Shadow$/.test(sampler.glsl_type) ? "samplerShadow" : "sampler";
        lines.push(`layout(set = 0, binding = ${baseBinding}) uniform highp ${samplerType} ${sampler.name}S;`);
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
        const matrixArrayStorage = matrixArrayStorageDeclaration(uniform);
        const arraySuffix = uniform.is_array
            ? `[${Math.max(1, uniform.size || 1)}]`
            : declarationArraySuffix(declarations, uniform.name);
        lines.push(`  ${matrixArrayStorage || `${uniform.glsl_type} ${uniform.name}${arraySuffix};`}`);
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
        case "sampler2DShadow":
            return "texture2D";
        case "samplerCubeShadow":
            return "textureCube";
        case "sampler2DArrayShadow":
            return "texture2DArray";
        case "isampler2D":
            return "itexture2D";
        case "isamplerCube":
            return "itexture2DArray";
        case "isampler2DArray":
            return "itexture2DArray";
        case "isampler3D":
            return "itexture3D";
        case "usampler2D":
            return "utexture2D";
        case "usamplerCube":
            return "utexture2DArray";
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
        const texturePrecision = `precision highp ${samplerGlslTextureType(sampler.glsl_type)};`;
        if (!seen.has(separateSamplerPrecision)) {
            seen.add(separateSamplerPrecision);
            lines.push(separateSamplerPrecision);
        }
        if (!seen.has(samplerPrecision)) {
            seen.add(samplerPrecision);
            lines.push(samplerPrecision);
        }
        if (!seen.has(texturePrecision)) {
            seen.add(texturePrecision);
            lines.push(texturePrecision);
        }
    }
}

function rewriteMetadataSourceNames(
    source: string,
    metadata: InitShaderInfoType,
    varyings: NameAndType[] = [],
): string {
    let out = source;
    for (const value of [...metadata.attributes, ...metadata.uniforms, ...varyings]) {
        if (value.source_name && value.source_name !== value.name) {
            if (/^[A-Za-z_]\w*$/.test(value.source_name)) continue;
            out = replaceGlslSourcePath(out, value.source_name, value.name);
        }
    }
    for (const sampler of metadata.samplers) {
        if (sampler.source_name && sampler.source_name !== sampler.name) {
            if (/^[A-Za-z_]\w*$/.test(sampler.source_name)) continue;
            out = replaceGlslSourcePath(out, sampler.source_name, sampler.name);
        }
    }
    return out;
}

function rewriteSamplerExpressions(source: string, metadata: InitShaderInfoType, stage: ShaderStage): string {
    return rewriteSamplerExpressionsForSamplers(source, metadata.samplers, stage);
}

function rewriteIntegerCubeTextureSizeCalls(source: string, samplerName: string): string {
    let result = "";
    let cursor = 0;
    const call = /\btextureSize\s*\(/g;
    for (let match = call.exec(source); match !== null; match = call.exec(source)) {
        const openParen = source.indexOf("(", match.index);
        const closeParen = findMatchingParen(source, openParen);
        if (closeParen < 0) break;
        const args = splitTopLevelArguments(source.slice(openParen + 1, closeParen));
        if (args.length !== 2 || args[0].trim() !== samplerName) {
            call.lastIndex = closeParen + 1;
            continue;
        }
        result += source.slice(cursor, match.index);
        result += `textureSize(${samplerName}T, ${args[1].trim()}).xy`;
        cursor = closeParen + 1;
        call.lastIndex = closeParen + 1;
    }
    return cursor === 0 ? source : result + source.slice(cursor);
}

function rewriteShadowProjectiveCalls(
    source: string,
    samplers: Array<{ name: string, glsl_type: string }>,
): string {
    let out = source;
    let used = false;
    for (const sampler of samplers) {
        if (sampler.glsl_type !== "sampler2DShadow") continue;
        let result = "";
        let cursor = 0;
        const call = /\b(textureProjOffset|textureProj)\s*\(/g;
        for (let match = call.exec(out); match !== null; match = call.exec(out)) {
            const openParen = call.lastIndex - 1;
            const closeParen = findMatchingParen(out, openParen);
            if (closeParen < 0) break;
            const args = splitTopLevelArguments(out.slice(openParen + 1, closeParen));
            if (args[0]?.trim() !== sampler.name || args.length < 2) {
                call.lastIndex = closeParen + 1;
                continue;
            }
            const projected = `hydgl2gpu_shadow_project_2d(${args[1].trim()})`;
            let replacement: string;
            if (match[1] === "textureProjOffset") {
                if (args.length < 3) {
                    call.lastIndex = closeParen + 1;
                    continue;
                }
                replacement = `textureOffset(${sampler.name}, ${projected}, ${args[2].trim()}`;
                if (args[3]) replacement += `, ${args[3].trim()}`;
                replacement += ")";
            } else {
                replacement = `texture(${sampler.name}, ${projected}`;
                if (args[2]) replacement += `, ${args[2].trim()}`;
                replacement += ")";
            }
            result += out.slice(cursor, match.index) + replacement;
            cursor = closeParen + 1;
            call.lastIndex = closeParen + 1;
            used = true;
        }
        if (cursor > 0) out = result + out.slice(cursor);
    }
    return used
        ? `vec3 hydgl2gpu_shadow_project_2d(vec4 coordinate) {\n  return coordinate.xyz / coordinate.w;\n}\n\n${out}`
        : out;
}

function lowerNonMipmapShadowLodBias(
    source: string,
    samplers: Array<{ name: string, glsl_type: string }>,
): string {
    let out = source;
    for (const sampler of samplers) {
        if (!/Shadow$/.test(sampler.glsl_type)) continue;
        let result = "";
        let cursor = 0;
        const call = /\b(textureOffset|texture)\s*\(/g;
        for (let match = call.exec(out); match !== null; match = call.exec(out)) {
            const openParen = call.lastIndex - 1;
            const closeParen = findMatchingParen(out, openParen);
            if (closeParen < 0) break;
            const args = splitTopLevelArguments(out.slice(openParen + 1, closeParen));
            if (args[0]?.trim() !== sampler.name) {
                call.lastIndex = closeParen + 1;
                continue;
            }
            const expectedWithBias = match[1] === "textureOffset" ? 4 : 3;
            if (args.length !== expectedWithBias) {
                call.lastIndex = closeParen + 1;
                continue;
            }
            // WGSL has no depth-reference sample-with-bias operation. For a
            // non-mipmapped minification filter the selected image is always
            // the base image, so GLSL's bias has no observable effect. WebGL
            // completeness and sampler-state handling remain in the API layer;
            // a future manual compare path is still required for mipmapped
            // shadow-bias sampling.
            result += out.slice(cursor, match.index);
            result += `${match[1]}(${args.slice(0, -1).map((arg) => arg.trim()).join(", ")})`;
            cursor = closeParen + 1;
            call.lastIndex = closeParen + 1;
        }
        if (cursor > 0) out = result + out.slice(cursor);
    }
    return out;
}

function rewriteFloatCubeGradCalls(
    source: string,
    samplers: Array<{ name: string, glsl_type: string }>,
): string {
    let out = source;
    let used = false;
    for (const sampler of samplers) {
        if (sampler.glsl_type !== "samplerCube") continue;
        let result = "";
        let cursor = 0;
        const call = /\btextureGrad\s*\(/g;
        for (let match = call.exec(out); match !== null; match = call.exec(out)) {
            const openParen = call.lastIndex - 1;
            const closeParen = findMatchingParen(out, openParen);
            if (closeParen < 0) break;
            const args = splitTopLevelArguments(out.slice(openParen + 1, closeParen));
            if (args.length !== 4 || args[0].trim() !== sampler.name) {
                call.lastIndex = closeParen + 1;
                continue;
            }
            const coordinate = args[1].trim();
            const lod = `hydgl2gpu_cube_gradient_lod(${sampler.name}T, ${coordinate}, ${args[2].trim()}, ${args[3].trim()})`;
            result += out.slice(cursor, match.index) + `textureLod(${sampler.name}, ${coordinate}, ${lod})`;
            cursor = closeParen + 1;
            call.lastIndex = closeParen + 1;
            used = true;
        }
        if (cursor > 0) out = result + out.slice(cursor);
    }
    if (!used) return out;
    return `vec2 hydgl2gpu_cube_face_gradient(vec3 direction, vec3 gradient) {
  vec3 magnitude = abs(direction);
  float major;
  float majorGradient;
  vec2 numerator;
  vec2 numeratorGradient;
  if (magnitude.x >= magnitude.y && magnitude.x >= magnitude.z) {
    major = magnitude.x;
    majorGradient = (direction.x >= 0.0 ? 1.0 : -1.0) * gradient.x;
    numerator = direction.x >= 0.0 ? vec2(-direction.z, -direction.y) : vec2(direction.z, -direction.y);
    numeratorGradient = direction.x >= 0.0 ? vec2(-gradient.z, -gradient.y) : vec2(gradient.z, -gradient.y);
  } else if (magnitude.y >= magnitude.z) {
    major = magnitude.y;
    majorGradient = (direction.y >= 0.0 ? 1.0 : -1.0) * gradient.y;
    numerator = direction.y >= 0.0 ? vec2(direction.x, direction.z) : vec2(direction.x, -direction.z);
    numeratorGradient = direction.y >= 0.0 ? vec2(gradient.x, gradient.z) : vec2(gradient.x, -gradient.z);
  } else {
    major = magnitude.z;
    majorGradient = (direction.z >= 0.0 ? 1.0 : -1.0) * gradient.z;
    numerator = direction.z >= 0.0 ? vec2(direction.x, -direction.y) : vec2(-direction.x, -direction.y);
    numeratorGradient = direction.z >= 0.0 ? vec2(gradient.x, -gradient.y) : vec2(-gradient.x, -gradient.y);
  }
  major = max(major, 1.0e-20);
  return (numeratorGradient * major - numerator * majorGradient) / (major * major) * 0.5;
}

float hydgl2gpu_cube_gradient_lod(textureCube tex, vec3 coordinate, vec3 gradientX, vec3 gradientY) {
  float size = float(textureSize(tex, 0).x);
  vec2 deltaX = hydgl2gpu_cube_face_gradient(coordinate, gradientX) * size;
  vec2 deltaY = hydgl2gpu_cube_face_gradient(coordinate, gradientY) * size;
  return log2(max(length(deltaX), length(deltaY)));
}

${out}`;
}

function rewriteSamplerExpressionsForSamplers(
    source: string,
    samplers: Array<{ name: string, glsl_type: string }>,
    stage: ShaderStage,
): string {
    let out = rewriteShadowProjectiveCalls(source, samplers);
    out = lowerNonMipmapShadowLodBias(out, samplers);
    out = rewriteFloatCubeGradCalls(out, samplers);
    out = lowerIntegerTextureSampling(out, samplers, stage);
    const sampleFunctions = [
        "texture",
        "textureProj",
        "textureLod",
        "textureGrad",
        "textureOffset",
        "textureProjOffset",
        "textureProjGrad",
        "textureProjGradOffset",
        "textureLodOffset",
        "textureProjLod",
        "textureProjLodOffset",
        "textureGradOffset",
        "textureGather",
        "textureGatherOffset",
        "textureGatherOffsets",
        "textureQueryLod",
    ];
    for (const sampler of samplers) {
        if (/^[iu]samplerCube$/.test(sampler.glsl_type)) {
            out = rewriteIntegerCubeTextureSizeCalls(out, sampler.name);
        }
        const name = escapeRegExp(sampler.name);
        const constructor = sampler.glsl_type;
        out = out.replace(
            new RegExp(`\\b(${sampleFunctions.join("|")})\\s*\\(\\s*${name}\\s*,`, "g"),
            `$1(${constructor}(${sampler.name}T, ${sampler.name}S),`,
        );
        out = out.replace(new RegExp(`\\btextureSize\\s*\\(\\s*${name}\\s*,`, "g"), `textureSize(${sampler.name}T,`);
        out = out.replace(new RegExp(`\\btextureQueryLevels\\s*\\(\\s*${name}\\s*\\)`, "g"), `textureQueryLevels(${sampler.name}T)`);
        out = out.replace(new RegExp(`\\b(texelFetch|texelFetchOffset)\\s*\\(\\s*${name}\\s*,`, "g"), `$1(${sampler.name}T,`);
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

function lowerSamplerFunctionParameters(source: string, stage: ShaderStage): string {
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
        })), stage);
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

    for (const offset of offsets) {
        const op = patched[offset] & 0xffff;
        if (op !== SPV_OP_IMAGE) {
            continue;
        }
        const sampledImageId = patched[offset + 3];
        if (patchedImageLoads.has(sampledImageId)) {
            // The texture variable load was changed from sampled-image to
            // image. Preserve the result id expected by downstream uses with
            // a typed copy. Replacing matching words globally is invalid:
            // SPIR-V literal operands (for example OpTypeFloat's bit width)
            // may numerically equal an id.
            const wordCount = patched[offset] >>> 16;
            patched[offset] = (wordCount << 16) | SPV_OP_COPY_OBJECT;
        }
    }
    return patched;
}

export function buildGlslangSource(
    source: string,
    stage: ShaderStage,
    metadata: InitShaderInfoType,
    layout: ProgramTranslationLayout,
    options: BuildGlslangSourceOptions = {},
): string {
    const languageVersion: 1 | 2 = /^[\t \r\n]*#\s*version\s+300\s+es\b/.test(source) ? 2 : 1;
    const commentNormalizedSource = normalizeGlslInterfaceTypeArrays(sanitizeGlslangLineComments(source));
    const anonymousStructSource = normalizeAnonymousUniformStructs(lowerInlineInterfaceStructs(commentNormalizedSource));
    const structUniformPlan = planValueStructUniforms(anonymousStructSource);
    const invariantNormalizedSource = normalizeUnsupportedInvariantPragmas(
        maskStaticallyInactivePreprocessorBranches(anonymousStructSource, languageVersion),
    );
    const lineNormalizedSource = materializeWebGlLineMacros(invariantNormalizedSource);
    const bridgeSource = languageVersion === 2
        ? lineNormalizedSource
        : bridgeGlslEs100Identifiers(lineNormalizedSource);
    const prepared = prepareSourceAndDeclarations(bridgeSource);
    const lines: string[] = [prepared.source.trimEnd()];
    const declarations = prepared.declarations;
    const sourceWithoutPreamble = stripGlslVersionDirectives(bridgeSource)
        .replace(
            /^[\t ]*(?:#extension[^\r\n]*|precision\s+(?:lowp|mediump|highp)\s+\w+\s*;)[\t ]*(\r?\n|$)/gm,
            (_line, newline: string) => newline,
        );
    const bodyStart = lowerRowMajorUniformBlocks(
        injectGlslUniformBlockBindings(
            replaceTopLevelGlobalDeclarations(sourceWithoutPreamble, () => ""),
            layout.uniformBlockBindings,
        ),
    );
    let body = stripProvablyEmptyTopLevelMacroInvocations(bodyStart);
    addSamplerPrecisionDeclarations(lines, metadata);

    if (stage === "vertex") {
        for (const attribute of metadata.attributes) {
            const location = layout.attributeLocations.get(attribute.name);
            lines.push(`layout(location = ${location === undefined ? 0 : location}) in ${attribute.glsl_type} ${attribute.name};`);
        }
    }

    const stageVaryings = uniqueByName(
        scanGlslDeclarations(anonymousStructSource, stage, {
            // A fragment-static-use varying must have a matching WebGPU vertex
            // output even when the WebGL vertex shader only declares it.
            includeUnusedVaryings: stage === "vertex",
        }).varyings.filter((varying) => layout.varyingLocations.has(varying.name)),
    );
    for (const varying of stageVaryings) {
        const location = layout.varyingLocations.get(varying.name);
        const direction = stage === "vertex" ? "out" : "in";
        const linkedInterpolation = layout.varyingInterpolations.get(varying.name) || varying.interpolation;
        const interpolation = linkedInterpolation ? `${linkedInterpolation} ` : "";
        lines.push(`layout(location = ${location === undefined ? 0 : location}) ${interpolation}${direction} ${varying.glsl_type} ${varying.name}${declarationArraySuffix(declarations, varying.name)};`);
    }

    const fragmentDeclarations = declarations.filter((declaration) => isFragmentOutput(declaration, stage));
    const fragmentOutputMetadata = new Map(
        scanGlslDeclarations(bridgeSource, stage).outputs.map((output) => [output.name, output]),
    );
    const fragmentOutputLocations = new Map<string, number>();
    const usedFragmentLocations = new Set<number>();
    for (const declaration of fragmentDeclarations) {
        const output = fragmentOutputMetadata.get(declaration.name);
        if (output?.location === undefined) continue;
        fragmentOutputLocations.set(declaration.name, output.location);
        for (let offset = 0; offset < attributeLocationSpan(output); offset++) {
            usedFragmentLocations.add(output.location + offset);
        }
    }
    let nextFragmentLocation = 0;
    for (const declaration of fragmentDeclarations) {
        const output = fragmentOutputMetadata.get(declaration.name);
        const span = output ? attributeLocationSpan(output) : 1;
        let location = fragmentOutputLocations.get(declaration.name);
        if (location === undefined) {
            while (Array.from({ length: span }, (_, offset) => nextFragmentLocation + offset)
                .some((candidate) => usedFragmentLocations.has(candidate))) {
                nextFragmentLocation++;
            }
            location = nextFragmentLocation;
            fragmentOutputLocations.set(declaration.name, location);
            for (let offset = 0; offset < span; offset++) usedFragmentLocations.add(location + offset);
            nextFragmentLocation += span;
        }
        lines.push(`layout(location = ${location}) out ${declaration.glslType} ${declaration.name}${declaration.arraySuffix};`);
    }

    body = renameUserDefinedFunctions(body);
    body = preserveComplexArrayLengthSideEffects(body);
    body = lowerDoWhileLoops(body);
    body = lowerFallthroughSwitches(body);
    const normalized = normalizeLegacyFragmentBuiltins(body);
    if (languageVersion !== 2) {
        normalized.source = bridgeGlslEs100Identifiers(normalized.source);
    }
    normalized.source = lowerSamplerStructFunctionParameters(normalized.source, metadata.samplers);
    const samplerArrayLowering = lowerDynamicSamplerArrayTextureCalls(normalized.source, metadata.samplers, stage);
    normalized.source = samplerArrayLowering.source;
    normalized.source = normalizeWebGlBuiltinsForVulkanGlsl(
        normalized.source,
        options.webglVersion || languageVersion,
        languageVersion,
    );
    normalized.source = foldGlslIntegerBuiltinCaseLabels(normalized.source);
    normalized.source = lowerUnsupportedFloatBuiltins(normalized.source);
    normalized.source = normalizeWebGlDerivativeOrientation(normalized.source);
    normalized.source = normalizeWebGlDepthRange(normalized.source);
    if (stage === "vertex") {
        normalized.source = lowerWebGlPointSizeToPrivateState(normalized.source);
        normalized.source = ensureVertexPositionBuiltin(normalized.source);
        normalized.source = wrapVertexMainForWebGpuClipSpace(normalized.source);
    } else {
        normalized.source = normalizeWebGlFragCoord(normalized.source, metadata);
        normalized.source = normalizeWebGlPointCoord(normalized.source);
    }
    const dynamicStructUniforms = rewriteDynamicStructUniformReads(normalized.source, structUniformPlan);
    normalized.source = dynamicStructUniforms.source;
    normalized.source = rewriteMetadataSourceNames(normalized.source, metadata, stageVaryings);
    normalized.source = rewriteStructUniformAggregateReads(normalized.source, structUniformPlan);
    normalized.source = lowerTexelFetchOffsetCalls(normalized.source, metadata.samplers);
    body = lowerSamplerFunctionParameters(normalized.source, stage);
    body = rewriteSamplerExpressions(body, metadata, stage);
    body = rewriteMatrixArrayUniformReads(body, metadata.uniforms);
    if (languageVersion !== 2) {
        body = normalizeEs100SequenceArrayDimensions(body);
        body = lowerEs100GlobalInitializers(body);
    }
    if (stage === "fragment" && options.preserveImplicitTextureLod === false) {
        body = rewriteFragmentImplicitTextureLod(body);
    }
    if (stage === "fragment" && normalized.usesFragColor) {
        lines.push("layout(location = 0) out vec4 _hyd_fragColor;");
    }

    lines.push(...makeUniformBlockDeclarations(metadata, declarations));
    lines.push(...makeSamplerBindingDeclarations(metadata, layout));
    lines.push(...makeMatrixArrayLoaders(metadata.uniforms));
    lines.push(...dynamicStructUniforms.helpers);
    lines.push(...samplerArrayLowering.helpers);
    lines.push("");
    const leadingLineBreaks = (body.match(/^[\t \r\n]*/)?.[0].match(/\n/g) || []).length;
    lines.push(`#line ${leadingLineBreaks + 1}`);
    lines.push(body.trim());
    return sanitizeGlslangLineComments(`${lines.filter((line) => line.length > 0).join("\n")}\n`);
}

function stripOwnedResourceDeclarations(wgsl: string, ownedBindings: ReadonlySet<number>): string {
    const resource = /^\s*((?:(?:@group|@binding)\([^)]*\)\s*)+)var(?:<[^>]+>)?\s+\w+\s*:\s*[^;]+;\s*$/gm;
    const ownedUniformStructs = new Set<string>();
    const uniformResource = /((?:(?:@group|@binding)\([^)]*\)\s*)+)var\s*<\s*uniform\s*>\s+\w+\s*:\s*([A-Za-z_]\w*)\s*;/g;
    for (let match = uniformResource.exec(wgsl); match !== null; match = uniformResource.exec(wgsl)) {
        const binding = /@binding\(\s*(\d+)u?\s*\)/.exec(match[1]);
        if (binding && ownedBindings.has(Number(binding[1]))) ownedUniformStructs.add(match[2]);
    }
    let out = wgsl.replace(resource, (line, attributes: string) => {
        const binding = /@binding\(\s*(\d+)u?\s*\)/.exec(attributes);
        return binding && ownedBindings.has(Number(binding[1])) ? "" : line;
    });
    for (const structName of ownedUniformStructs) {
        out = out.replace(
            new RegExp(`^\\s*struct\\s+${escapeRegExp(structName)}\\s*\\{[\\s\\S]*?^\\s*\\}\\s*;?\\s*$`, "gm"),
            "",
        );
    }
    return out;
}

function uniformReadExpression(uniform: NameAndType): string {
    return `_hyd_uniforms_.${uniform.name}`;
}

function normalizeTintWgsl(
    wgsl: string,
    metadata: InitShaderInfoType,
    layout: ProgramTranslationLayout,
): string {
    const ordinaryUniformBindings = metadata.uniforms.length > 0 ? new Set([0]) : new Set<number>();
    const uniformVariableNames = wgslUniformVariableNames(wgsl, ordinaryUniformBindings);
    wgsl = synchronizeTintUniformTypes(wgsl, metadata, ordinaryUniformBindings);
    const ownedBindings = new Set<number>(ordinaryUniformBindings);
    for (const binding of layout.samplerBindings.values()) {
        ownedBindings.add(binding);
        ownedBindings.add(binding + 1);
    }
    let out = stripOwnedResourceDeclarations(wgsl, ownedBindings);
    out = renameReservedWgslIdentifiers(out);
    // Dawn addresses named WGSL overrides by identifier. Tint preserves the
    // SPIR-V SpecId as @id(), which changes the pipeline constant key to the
    // numeric id. Drop ids only for GL2GPU-owned sampler-state overrides so the
    // runtime can use stable sampler-derived names across shader stages.
    out = out.replace(/@id\(\s*\d+\s*\)\s+(?=override\s+hydgl2gpu_integer_)/g, "");

    const uniformPlaceholders: Array<[string, string]> = [];
    for (const uniform of metadata.uniforms) {
        const placeholder = `__HYD_UNIFORM_${uniformPlaceholders.length}__`;
        uniformPlaceholders.push([placeholder, uniformReadExpression(uniform)]);
        out = replaceWgslMemberAccess(out, uniformVariableNames, uniform.name, placeholder);
        out = replaceBareWgslIdentifier(out, uniform.name, placeholder);
    }

    for (const sampler of metadata.samplers) {
        out = out.replace(new RegExp(`textureSample\\s*\\(\\s*${sampler.name}\\s*,`, "g"), `textureSample(${sampler.name}T, ${sampler.name}S,`);
        out = wordBoundaryReplace(out, `${sampler.name}_sampler`, `${sampler.name}S`);
        out = wordBoundaryReplace(out, `${sampler.name}_texture`, `${sampler.name}T`);
    }

    for (const [placeholder, value] of uniformPlaceholders) {
        out = wordBoundaryReplace(out, placeholder, value);
    }

    return out.trim() + "\n";
}

const WGSL_TEXTURE_SAMPLE_CALL = /\b(textureSample(?:CompareLevel|Compare|Level|Bias|Grad)?)\s*\(/g;
const WGSL_INTEGER_TEXTURE_CALL = /\b([A-Za-z_]\w*hyd_integer_texture_\w*)\s*\(/g;

function addSamplerOriginHelpers(
    wgsl: string,
    dimensions: Set<SamplerOriginCoordinateKind>,
    cubeSamplers: Set<string>,
    usesArrayLayers: boolean,
): string {
    const declarations: string[] = [];
    for (const samplerName of cubeSamplers) {
        const names = samplerCoordinateScaleOverrideNames(samplerName);
        if (!wgsl.includes(`override ${names.x}:`)) {
            declarations.push(`override ${names.x}: f32 = 1.0f;`);
        }
        if (!wgsl.includes(`override ${names.y}:`)) {
            declarations.push(`override ${names.y}: f32 = 1.0f;`);
        }
    }
    const helpers: string[] = [];
    if (dimensions.has(2) && !wgsl.includes("fn _hyd_samplerOriginCoord(")) {
        helpers.push(`fn _hyd_samplerOriginCoord(texCoord: vec2<f32>, flipY: f32) -> vec2<f32> {\n    return vec2<f32>(texCoord.x, select(texCoord.y, 1.0 - texCoord.y, flipY > 0.5));\n}`);
    }
    if (dimensions.has(3) && !wgsl.includes("fn _hyd_samplerOriginCoord3(")) {
        helpers.push(`fn _hyd_samplerOriginCoord3(texCoord: vec3<f32>, flipY: f32) -> vec3<f32> {\n    return vec3<f32>(texCoord.x, select(texCoord.y, 1.0 - texCoord.y, flipY > 0.5), texCoord.z);\n}`);
    }
    if (dimensions.has("cube") && !wgsl.includes("fn _hyd_samplerOriginCubeCoord(")) {
        helpers.push(`fn _hyd_samplerCubeCoordScale(direction: vec3<f32>, scale: vec2<f32>) -> vec3<f32> {
    if (all(scale == vec2<f32>(1.0f))) { return direction; }
    let magnitude = abs(direction);
    if (max(magnitude.x, max(magnitude.y, magnitude.z)) <= 1.0e-20f) { return direction; }
    if (magnitude.x >= magnitude.y && magnitude.x >= magnitude.z) {
        let faceCoord = select(
            vec2<f32>(direction.z, -direction.y),
            vec2<f32>(-direction.z, -direction.y),
            direction.x >= 0.0f,
        ) / magnitude.x;
        let scaled = (faceCoord + vec2<f32>(1.0f)) * scale - vec2<f32>(1.0f);
        return select(
            vec3<f32>(direction.x, -scaled.y * magnitude.x, scaled.x * magnitude.x),
            vec3<f32>(direction.x, -scaled.y * magnitude.x, -scaled.x * magnitude.x),
            direction.x >= 0.0f,
        );
    }
    if (magnitude.y >= magnitude.z) {
        let faceCoord = select(
            vec2<f32>(direction.x, -direction.z),
            vec2<f32>(direction.x, direction.z),
            direction.y >= 0.0f,
        ) / magnitude.y;
        let scaled = (faceCoord + vec2<f32>(1.0f)) * scale - vec2<f32>(1.0f);
        return select(
            vec3<f32>(scaled.x * magnitude.y, direction.y, -scaled.y * magnitude.y),
            vec3<f32>(scaled.x * magnitude.y, direction.y, scaled.y * magnitude.y),
            direction.y >= 0.0f,
        );
    }
    let faceCoord = select(
        vec2<f32>(-direction.x, -direction.y),
        vec2<f32>(direction.x, -direction.y),
        direction.z >= 0.0f,
    ) / magnitude.z;
    let scaled = (faceCoord + vec2<f32>(1.0f)) * scale - vec2<f32>(1.0f);
    return select(
        vec3<f32>(-scaled.x * magnitude.z, -scaled.y * magnitude.z, direction.z),
        vec3<f32>(scaled.x * magnitude.z, -scaled.y * magnitude.z, direction.z),
        direction.z >= 0.0f,
    );
}

fn _hyd_samplerOriginCubeCoord(direction: vec3<f32>, flipY: f32, scale: vec2<f32>) -> vec3<f32> {
    if (flipY <= 0.5f) { return _hyd_samplerCubeCoordScale(direction, scale); }
    let magnitude = abs(direction);
    if (magnitude.x >= magnitude.y && magnitude.x >= magnitude.z) {
        return _hyd_samplerCubeCoordScale(vec3<f32>(direction.x, -direction.y, direction.z), scale);
    }
    if (magnitude.y >= magnitude.z) {
        return _hyd_samplerCubeCoordScale(vec3<f32>(direction.x, direction.y, -direction.z), scale);
    }
    return _hyd_samplerCubeCoordScale(vec3<f32>(direction.x, -direction.y, direction.z), scale);
}`);
    }
    if (usesArrayLayers && !wgsl.includes("fn _hyd_webglArrayLayer(")) {
        helpers.push(`fn _hyd_webglArrayLayer(layer: f32, layerCount: u32) -> i32 {
    return clamp(i32(floor(layer + 0.5f)), 0i, max(0i, i32(layerCount) - 1i));
}`);
    }
    if (declarations.length === 0 && helpers.length === 0) return wgsl;
    const directivePrefix = wgsl.match(
        /^\s*(?:(?:(?:enable|requires)\s+[^;]+;|diagnostic\s*\([^;]+\)\s*;)\s*)+/,
    );
    const insertion = directivePrefix ? directivePrefix[0].length : 0;
    const additions = [...declarations, ...helpers];
    return wgsl.slice(0, insertion) + additions.join("\n\n") + "\n\n" + wgsl.slice(insertion);
}

export function normalizeSamplerOriginCoordinates(wgsl: string, metadata: InitShaderInfoType): string {
    const samplerDimensions = new Map<string, SamplerOriginCoordinateKind>();
    const samplerTypes = new Map<string, string>();
    for (const sampler of metadata.samplers) {
        samplerTypes.set(sampler.name, sampler.glsl_type);
        const dimension = samplerOriginCoordinateKind(sampler.glsl_type);
        if (dimension !== null) samplerDimensions.set(sampler.name, dimension);
    }
    if (samplerDimensions.size === 0) return wgsl;

    let changed = false;
    const usedDimensions = new Set<SamplerOriginCoordinateKind>();
    const usedCubeSamplers = new Set<string>();
    let usesArrayLayers = false;
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
            const samplerName = Array.from(samplerDimensions.keys()).find((name) => {
                return args[0].trim() === `${name}T` && args[1].trim() === `${name}S`;
            });
            if (samplerName) {
                const dimension = samplerDimensions.get(samplerName)!;
                const rewrittenArgs = args.slice();
                let callChanged = false;
                if (!args[2].includes("_hyd_samplerOriginCoord")) {
                    const helper = dimension === "cube"
                        ? "_hyd_samplerOriginCubeCoord"
                        : dimension === 3 ? "_hyd_samplerOriginCoord3" : "_hyd_samplerOriginCoord";
                    const scale = samplerCoordinateScaleOverrideNames(samplerName);
                    const scaleArgument = dimension === "cube"
                        ? `, vec2<f32>(${scale.x}, ${scale.y})`
                        : "";
                    rewrittenArgs[2] = `${helper}(${args[2].trim()}, _hyd_uniforms_.${samplerFlipYUniformName(samplerName)}${scaleArgument})`;
                    callChanged = true;
                    usedDimensions.add(dimension);
                    if (dimension === "cube") usedCubeSamplers.add(samplerName);
                }
                const samplerType = samplerTypes.get(samplerName) || "";
                if (/sampler2DArray(?:Shadow)?$/.test(samplerType) && args.length >= 4 &&
                    !args[3].includes("_hyd_webglArrayLayer")) {
                    rewrittenArgs[3] = webGlArrayLayerExpression(args[3], `${samplerName}T`);
                    callChanged = true;
                    usesArrayLayers = true;
                }
                if (callChanged) {
                    result += wgsl.slice(cursor, openParen + 1) + rewrittenArgs.map((arg) => arg.trim()).join(", ") + ")";
                    cursor = closeParen + 1;
                    changed = true;
                }
            }
        }
        WGSL_TEXTURE_SAMPLE_CALL.lastIndex = closeParen + 1;
    }
    let out = wgsl;
    if (changed) {
        result += wgsl.slice(cursor);
        out = result;
    }

    result = "";
    cursor = 0;
    WGSL_INTEGER_TEXTURE_CALL.lastIndex = 0;
    for (let match = WGSL_INTEGER_TEXTURE_CALL.exec(out); match !== null; match = WGSL_INTEGER_TEXTURE_CALL.exec(out)) {
        const before = out.slice(Math.max(0, match.index - 4), match.index);
        const openParen = WGSL_INTEGER_TEXTURE_CALL.lastIndex - 1;
        const closeParen = findMatchingParen(out, openParen);
        if (closeParen < 0) break;
        if (/\bfn\s+$/.test(before)) {
            WGSL_INTEGER_TEXTURE_CALL.lastIndex = closeParen + 1;
            continue;
        }
        const args = splitTopLevelArguments(out.slice(openParen + 1, closeParen));
        const samplerName = args.length >= 2
            ? Array.from(samplerDimensions.keys()).find((name) => args[0].trim() === `${name}T`)
            : undefined;
        if (samplerName && !args[1].includes("_hyd_samplerOriginCoord")) {
            const samplerType = samplerTypes.get(samplerName) || "";
            const dimension: SamplerOriginCoordinateKind = /Cube$/.test(samplerType)
                ? "cube"
                : /(?:2DArray|3D)$/.test(samplerType) ? 3 : 2;
            const rewrittenArgs = args.slice();
            const helper = dimension === "cube"
                ? "_hyd_samplerOriginCubeCoord"
                : dimension === 3 ? "_hyd_samplerOriginCoord3" : "_hyd_samplerOriginCoord";
            const scale = samplerCoordinateScaleOverrideNames(samplerName);
            const scaleArgument = dimension === "cube"
                ? `, vec2<f32>(${scale.x}, ${scale.y})`
                : "";
            rewrittenArgs[1] = `${helper}(${args[1].trim()}, _hyd_uniforms_.${samplerFlipYUniformName(samplerName)}${scaleArgument})`;
            result += out.slice(cursor, openParen + 1) + rewrittenArgs.map((arg) => arg.trim()).join(", ") + ")";
            cursor = closeParen + 1;
            changed = true;
            usedDimensions.add(dimension);
            if (dimension === "cube") usedCubeSamplers.add(samplerName);
        }
        WGSL_INTEGER_TEXTURE_CALL.lastIndex = closeParen + 1;
    }
    if (cursor > 0) {
        result += out.slice(cursor);
        out = result;
    }
    return changed ? addSamplerOriginHelpers(out, usedDimensions, usedCubeSamplers, usesArrayLayers) : out;
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
        translated.uniformBlockBindings = layout.uniformBlockBindings;
        translated.usesFlatInterpolation = Array.from(layout.varyingInterpolations.values())
            .some((interpolation) => /(?:^|\s)flat(?:\s|$)/.test(interpolation));
        if (vertexShader) {
            translated.vertex = this.translateShader(vertexShader, "vertex", layout);
        }
        if (fragmentShader) {
            translated.fragment = this.translateShader(fragmentShader, "fragment", layout);
        }
        return translated;
    }

    private metadataFor(shader: ShaderLike): InitShaderInfoType {
        return shader.shader_info || makeShaderMetadata(compiledShaderSource(shader), shader.type);
    }

    private makeLayout(vertexShader?: ShaderLike, fragmentShader?: ShaderLike, boundAttributeLocations: Map<string, number> = new Map()): ProgramTranslationLayout {
        const vertexMetadata = vertexShader ? this.metadataFor(vertexShader) : undefined;
        const fragmentMetadata = fragmentShader ? this.metadataFor(fragmentShader) : undefined;
        const vertexVaryings = vertexShader
            ? scanGlslDeclarations(
                lowerInlineInterfaceStructs(compiledShaderSource(vertexShader)),
                "vertex",
            ).varyings
            : [];
        const fragmentVaryings = fragmentShader
            ? scanGlslDeclarations(
                lowerInlineInterfaceStructs(compiledShaderSource(fragmentShader)),
                "fragment",
            ).varyings
            : [];
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
        const uniformBlockBindings = new Map<string, number>();
        let nextResourceBinding = samplerOffset + samplers.length * 2;
        for (const shader of [vertexShader, fragmentShader]) {
            if (!shader) continue;
            for (const block of scanGlslUniformBlocks(compiledShaderSource(shader))) {
                const names = block.isArray
                    ? Array.from({ length: block.arraySize }, (_, index) => `${block.blockName}[${index}]`)
                    : [block.blockName];
                for (const name of names) {
                    if (!uniformBlockBindings.has(name)) {
                        uniformBlockBindings.set(name, nextResourceBinding++);
                    }
                }
            }
        }

        const attributeLocations = assignLocations(
            vertexMetadata ? vertexMetadata.attributes : [],
            boundAttributeLocations,
            attributeLocationSpan,
        );
        const varyingLocations = assignLocations(
            uniqueByName([...vertexVaryings, ...fragmentVaryings]),
            new Map(),
            attributeLocationSpan,
        );
        const varyingInterpolations = new Map<string, string>();
        for (const varying of uniqueByName([...vertexVaryings, ...fragmentVaryings])) {
            const interpolation = linkedVaryingInterpolation(
                vertexVaryings.find((candidate) => candidate.name === varying.name),
                fragmentVaryings.find((candidate) => candidate.name === varying.name),
            );
            if (interpolation) varyingInterpolations.set(varying.name, interpolation);
        }

        return {
            attributeLocations,
            varyingLocations,
            varyingInterpolations,
            samplerBindings,
            uniformBlockBindings,
            cacheKey: [
                Array.from(attributeLocations).map(([name, location]) => `${name}:${location}`).join(","),
                Array.from(varyingLocations).map(([name, location]) => `${name}:${location}`).join(","),
                Array.from(varyingInterpolations).map(([name, interpolation]) => `${name}:${interpolation}`).join(","),
                Array.from(samplerBindings).map(([name, binding]) => `${name}:${binding}`).join(","),
                Array.from(uniformBlockBindings).map(([name, binding]) => `${name}:${binding}`).join(","),
            ].join("|"),
        };
    }

    private translateShader(shader: ShaderLike, stage: ShaderStage, layout: ProgramTranslationLayout): InitShaderInfoType {
        const key = compiledShaderSource(shader);
        const preserveImplicitTextureLod = this.options.preserveImplicitTextureLod !== false;
        const shouldOptimizeTintWgsl = this.options.optimizeTintWgsl !== false;
        const webglVersion = shader.webglVersion || 1;
        const runtimeKey = [
            stage,
            layout.cacheKey,
            `lod=${preserveImplicitTextureLod ? 1 : 0}`,
            `opt=${shouldOptimizeTintWgsl ? 1 : 0}`,
            `legacyTexCoord=${this.options.legacyTextureCoordinateFixups ? 1 : 0}`,
            `webgl=${webglVersion}`,
            key,
        ].join(":");
        const cachedRuntime = this.runtimeCache.get(runtimeKey);
        if (cachedRuntime) {
            return cachedRuntime;
        }

        const metadata = makeShaderMetadata(key, shader.type);
        if (!this.runtimeTranslationAvailable) {
            throw new Error(`Runtime shader translator is unavailable (${stage}).`);
        }

        let glslangSource = "";
        const timingsMs: Record<string, number> = {};
        const compatibilityFallbacks: string[] = [];
        try {
            const buildStart = nowMs();
            glslangSource = buildGlslangSource(key, stage, metadata, layout, {
                preserveImplicitTextureLod,
                webglVersion,
            });
            timingsMs.glslPreprocess = nowMs() - buildStart;

            const compileStart = nowMs();
            let spirvWords: Uint32Array;
            this.glslang.clearDiagnostics?.();
            try {
                spirvWords = this.glslang.compileGLSL(glslangSource, stage, false);
            } catch (error) {
                const firstDiagnostics = this.glslang.getDiagnostics?.() || [];
                const relaxedConstSource = demoteConstDeclarationsForVulkanGlsl(glslangSource);
                if (relaxedConstSource === glslangSource) {
                    throw glslangFailure(error, firstDiagnostics);
                }
                this.glslang.clearDiagnostics?.();
                try {
                    spirvWords = this.glslang.compileGLSL(relaxedConstSource, stage, false);
                } catch (fallbackError) {
                    throw glslangFailure(fallbackError, this.glslang.getDiagnostics?.() || firstDiagnostics);
                }
                glslangSource = relaxedConstSource;
                compatibilityFallbacks.push("demote-es100-const-initializers");
            }
            const spirv = patchGlslangSampledTextureVariables(spirvWords, metadata.samplers);
            timingsMs.glslang = nowMs() - compileStart;

            const tintStart = nowMs();
            const tintWgsl = this.tint.spirvToWgsl(spirv);
            timingsMs.tint = nowMs() - tintStart;

            const normalizeStart = nowMs();
            let wgsl = normalizeTintWgsl(tintWgsl, metadata, layout);
            const flatVaryings = preserveFlatFloatVaryingBits(wgsl, stage);
            wgsl = flatVaryings.wgsl;
            if (flatVaryings.encodedVaryings > 0) {
                compatibilityFallbacks.push(`flat-float-bits:${flatVaryings.encodedVaryings}`);
            }
            if (stage === "fragment") {
                const outputWidths = normalizeWebGlFragmentOutputWidths(wgsl);
                wgsl = outputWidths.wgsl;
                if (outputWidths.expanded > 0) {
                    compatibilityFallbacks.push(`fragment-output-width:${outputWidths.expanded}`);
                }
            }
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
                splitDeepExpressions: 0,
                skippedPasses: [],
            };
            if (shouldOptimizeTintWgsl) {
                const optimizeStart = nowMs();
                const optimized = optimizeTintWgsl(wgsl);
                wgsl = optimized.wgsl;
                optimizerStats = optimized.stats;
                timingsMs.wgslOptimize = nowMs() - optimizeStart;
            }
            const robustnessStart = nowMs();
            const dimensionQueries = normalizeWebGlTextureDimensionQueries(wgsl, metadata.samplers);
            wgsl = dimensionQueries.wgsl;
            if (dimensionQueries.rewrittenQueries > 0) {
                compatibilityFallbacks.push(`texture-dimensions:${dimensionQueries.rewrittenQueries}`);
            }
            const robustness = enforceWebGlTextureLoadBounds(wgsl, metadata.samplers);
            wgsl = robustness.wgsl;
            if (robustness.rewrittenLoads > 0) {
                timingsMs.wgslRobustness = nowMs() - robustnessStart;
                compatibilityFallbacks.push(`texture-load-bounds:${robustness.rewrittenLoads}`);
            }
            const samplerOriginStart = nowMs();
            wgsl = normalizeSamplerOriginCoordinates(wgsl, metadata);
            timingsMs.samplerOrigin = nowMs() - samplerOriginStart;
            if (this.options.legacyTextureCoordinateFixups) {
                const legacyFixupStart = nowMs();
                metadata.wgsl = normalizeWebGlTextureCoordinates(wgsl, metadata, stage, key);
                timingsMs.legacyTextureCoordinateFixups = nowMs() - legacyFixupStart;
            } else {
                metadata.wgsl = wgsl;
            }
            const resourcePrune = pruneUnusedShaderResources(metadata, metadata.wgsl);
            const shaderId = `${stage}:${stableHashString(key)}:${layout.cacheKey}`;
            const capture: ShaderCaptureRecord = {
                kind: "shader-stage",
                stage,
                shaderId,
                source: "runtime",
                optimizer: optimizerStats,
                timingsMs,
                compatibilityFallbacks,
                glsl: sourceCapture(key),
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
                compatibilityFallbacks,
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
            if (this.options.captureShaders) {
                emitShaderCapture({
                    kind: "shader-failure",
                    stage,
                    shaderId: `${stage}:${stableHashString(key)}:${layout.cacheKey}`,
                    source: "runtime",
                    timingsMs,
                    compatibilityFallbacks,
                    glsl: sourceCapture(key),
                    normalizedGlsl: sourceCapture(glslangSource),
                    diagnostics: [message],
                });
            }
            throw new Error(`Runtime shader translation failed for ${stage} shader: ${message}\n--- original GLSL ---\n${key}\n--- normalized GLSL ---\n${glslangSource}`);
        }
    }
}
