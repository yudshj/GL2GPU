import glslangInit from "../vendor/glslang/glslang.js";
import tintInit from "../vendor/tint-wasm/tint_wasm.js";
import type { TintWasmModule } from "../vendor/tint-wasm/tint_wasm.js";
import {
    hydTrim,
    InitShaderInfoType,
    NameAndType,
    TextureNameAndType,
} from "./shaderDB";
import { makeShaderMetadata, scanGlslDeclarations, ShaderStage } from "./shaderMetadata";

interface GlslangModule {
    compileGLSL(glsl: string, shaderType: ShaderStage, genDebug: boolean, spirvVersion?: "1.0" | "1.1" | "1.2" | "1.3" | "1.4" | "1.5"): Uint32Array;
}

export interface ShaderTranslatorOptions {
    cacheOnly?: boolean;
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
}

interface ProgramTranslationLayout {
    attributeLocations: Map<string, number>;
    varyingLocations: Map<string, number>;
    samplerBindings: Map<string, number>;
    cacheKey: string;
}

interface ParsedGlslDeclaration {
    qualifier: "attribute" | "uniform" | "varying" | "in" | "out";
    glslType: string;
    name: string;
    arraySuffix: string;
}

interface PreparedGlslSource {
    source: string;
    declarations: ParsedGlslDeclaration[];
}

const GLOBAL_DECLARATION_REGEX = /(^|[;\n])(\s*(?:layout\s*\([^)]*\)\s*)?(?:(?:lowp|mediump|highp)\s+)?(?:(?:flat|smooth|noperspective|centroid|sample)\s+)*(attribute|uniform|varying|in|out)\s+(?:(?:lowp|mediump|highp)\s+)?([A-Za-z_]\w*)\s+([^;]+)\s*;)/g;
const SPV_OP_NAME = 5;
const SPV_OP_TYPE_SAMPLED_IMAGE = 27;
const SPV_OP_TYPE_POINTER = 32;
const SPV_OP_VARIABLE = 59;
const SPV_OP_LOAD = 61;
const SPV_OP_DECORATE = 71;
const SPV_OP_MEMBER_DECORATE = 72;
const SPV_STORAGE_CLASS_UNIFORM_CONSTANT = 0;
const SPV_DECORATION_RELAXED_PRECISION = 0;

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wordBoundaryReplace(source: string, from: string, to: string): string {
    return source.replace(new RegExp(`\\b${escapeRegExp(from)}\\b`, "g"), to);
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

function assignLocations(items: NameAndType[]): Map<string, number> {
    const locations = new Map<string, number>();
    for (const item of items) {
        if (!locations.has(item.name)) {
            locations.set(item.name, locations.size);
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

    const declarations: ParsedGlslDeclaration[] = [];
    body = body.replace(GLOBAL_DECLARATION_REGEX, (full, prefix, _declaration, qualifier, glslType, rawNames) => {
        for (const parsed of parseDeclarationNames(rawNames)) {
            declarations.push({
                qualifier,
                glslType,
                name: parsed.name,
                arraySuffix: parsed.arraySuffix,
            });
        }
        return prefix;
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

function makeSamplerBindingDeclarations(metadata: InitShaderInfoType, layout: ProgramTranslationLayout): string[] {
    const lines: string[] = [];
    metadata.samplers.forEach((sampler, fallback) => {
        const binding = layout.samplerBindings.get(sampler.name);
        const textureType = samplerGlslTextureType(sampler.glsl_type);
        const baseBinding = binding === undefined ? fallback * 2 : binding;
        lines.push(`layout(set = 0, binding = ${baseBinding}) uniform highp sampler ${sampler.name}S;`);
        lines.push(`layout(set = 0, binding = ${baseBinding + 1}) uniform highp ${textureType} ${sampler.name}T;`);
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
        default:
            throw new Error(`unsupported sampler type: ${glslType}`);
    }
}

function addSamplerPrecisionDeclarations(lines: string[], metadata: InitShaderInfoType) {
    const seen = new Set<string>();
    for (const sampler of metadata.samplers) {
        const samplerPrecision = `precision highp ${sampler.glsl_type};`;
        const texturePrecision = `precision highp ${samplerGlslTextureType(sampler.glsl_type)};`;
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

function rewriteSamplerExpressions(source: string, metadata: InitShaderInfoType): string {
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
    for (const sampler of metadata.samplers) {
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

    const patched = new Uint32Array(filtered);
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
        const imageType = textureVariables.get(pointerId);
        if (imageType !== undefined) {
            patched[offset + 1] = imageType;
        }
    }

    return patched;
}

export function buildGlslangSource(source: string, stage: ShaderStage, metadata: InitShaderInfoType, layout: ProgramTranslationLayout): string {
    const prepared = prepareSourceAndDeclarations(source);
    const lines: string[] = [prepared.source.trimEnd()];
    const declarations = prepared.declarations;
    const bodyStart = source
        .replace(/^\s*#version[^\n]*(?:\n|$)/gm, "")
        .replace(/^\s*(#extension[^\n]*|#define[^\n]*|precision\s+(?:lowp|mediump|highp)\s+\w+\s*;)\s*$/gm, "")
        .replace(GLOBAL_DECLARATION_REGEX, (full, prefix) => prefix);
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
        lines.push(`layout(location = ${location === undefined ? 0 : location}) ${direction} ${varying.glsl_type} ${varying.name}${declarationArraySuffix(declarations, varying.name)};`);
    }

    let fragmentOutputLocation = 0;
    for (const declaration of declarations) {
        if (isFragmentOutput(declaration, stage)) {
            lines.push(`layout(location = ${fragmentOutputLocation++}) out ${declaration.glslType} ${declaration.name}${declaration.arraySuffix};`);
        }
    }

    const normalized = stage === "fragment" ? normalizeLegacyFragmentBuiltins(body) : { source: body, usesFragColor: false };
    body = rewriteSamplerExpressions(normalized.source, metadata);
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

function normalizeTintWgsl(wgsl: string, metadata: InitShaderInfoType): string {
    let out = stripResourceDeclarations(wgsl);

    const uniformPlaceholders: Array<[string, string]> = [];
    for (const uniform of metadata.uniforms) {
        const placeholder = `__HYD_UNIFORM_${uniformPlaceholders.length}__`;
        uniformPlaceholders.push([placeholder, `_hyd_uniforms_.${uniform.name}`]);
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

    return out.trim() + "\n";
}

export class ShaderTranslator {
    private readonly shaderMap: Map<string, InitShaderInfoType>;
    private readonly glslang: GlslangModule;
    private readonly tint: TintWasmModule;
    private readonly options: ShaderTranslatorOptions;
    private readonly runtimeCache: Map<string, InitShaderInfoType> = new Map();

    private constructor(
        shaderMap: Map<string, InitShaderInfoType>,
        glslang: GlslangModule,
        tint: TintWasmModule,
        options: ShaderTranslatorOptions,
    ) {
        this.shaderMap = shaderMap;
        this.glslang = glslang;
        this.tint = tint;
        this.options = options;
    }

    static async create(shaderMap: Map<string, InitShaderInfoType>, options: ShaderTranslatorOptions = {}): Promise<ShaderTranslator> {
        let glslang: GlslangModule = null;
        let tint: TintWasmModule = null;

        if (!options.cacheOnly) {
            try {
                glslang = await glslangInit({
                    locateFile: options.glslangLocateFile,
                    wasmBinary: options.glslangWasmBinary,
                });
            } catch (error) {
                console.warn("[HYD] glslang WASM unavailable, runtime shader translation disabled:", error);
            }

            try {
                tint = await tintInit({
                    locateFile: options.tintLocateFile,
                    wasmBinary: options.tintWasmBinary,
                });
            } catch (error) {
                console.warn("[HYD] Tint WASM unavailable, runtime shader translation disabled:", error);
            }
        }

        return new ShaderTranslator(shaderMap, glslang, tint, options);
    }

    inspectShader(type: GLenum, source: string): InitShaderInfoType {
        const key = hydTrim(source);
        return this.shaderMap.get(key) || makeShaderMetadata(source, type);
    }

    translateProgram(vertexShader?: ShaderLike, fragmentShader?: ShaderLike): TranslatedProgram {
        const layout = this.makeLayout(vertexShader, fragmentShader);
        const translated: TranslatedProgram = {};
        if (vertexShader) {
            translated.vertex = this.translateShader(vertexShader, "vertex", layout);
        }
        if (fragmentShader) {
            translated.fragment = this.translateShader(fragmentShader, "fragment", layout);
        }
        return translated;
    }

    private metadataFor(shader: ShaderLike): InitShaderInfoType {
        const key = hydTrim(shader.glsl_shader);
        return shader.shader_info || this.shaderMap.get(key) || makeShaderMetadata(shader.glsl_shader, shader.type);
    }

    private makeLayout(vertexShader?: ShaderLike, fragmentShader?: ShaderLike): ProgramTranslationLayout {
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
        const samplerOffset = uniforms.length > 0 ? 1 : 0;
        const samplerBindings = new Map<string, number>();
        samplers.forEach((sampler, index) => {
            samplerBindings.set(sampler.name, samplerOffset + index * 2);
        });

        const attributeLocations = assignLocations(vertexMetadata ? vertexMetadata.attributes : []);
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
        const key = hydTrim(shader.glsl_shader);
        const cached = this.shaderMap.get(key);
        if (cached) {
            return cached;
        }

        const runtimeKey = `${stage}:${layout.cacheKey}:${key}`;
        const cachedRuntime = this.runtimeCache.get(runtimeKey);
        if (cachedRuntime) {
            return cachedRuntime;
        }

        const metadata = makeShaderMetadata(shader.glsl_shader, shader.type);
        if (this.options.cacheOnly || !this.glslang || !this.tint) {
            throw new Error(`Shader not found in shaderDB and runtime translator is unavailable (${stage}).`);
        }

        try {
            const glslangSource = buildGlslangSource(shader.glsl_shader, stage, metadata, layout);
            const spirv = patchGlslangSampledTextureVariables(
                this.glslang.compileGLSL(glslangSource, stage, false),
                metadata.samplers,
            );
            metadata.wgsl = normalizeTintWgsl(this.tint.spirvToWgsl(spirv), metadata);
            metadata.debug_info = JSON.stringify({
                source: "runtime",
                stage,
                translated: true,
                glsl: "310es",
            });
            this.runtimeCache.set(runtimeKey, metadata);
            return metadata;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Runtime shader translation failed for ${stage} shader: ${message}`);
        }
    }
}
