import fastHashCode from 'fast-hash-code';

import {HydShader} from "./hydShader";
import {
    MergeShaderInfo,
    SamplerOriginCoordinateKind,
    samplerOriginCoordinateKind,
    ShaderInfo2HydAus,
    ShaderInfo2String,
    hydTrim,
} from "./shaderDB";
import {
    DEPTH_RANGE_DIFF_UNIFORM_NAME,
    DEPTH_RANGE_FAR_UNIFORM_NAME,
    DEPTH_RANGE_NEAR_UNIFORM_NAME,
    FRAG_COORD_HEIGHT_UNIFORM_NAME,
    samplerFlipYUniformName,
} from "./shaderInternalUniforms";
import { HydHashable } from './base/hydHashable';
import { ShaderTranslator } from './shaderTranslator';
import {
    integerSamplerOverrideNames,
    IntegerSamplerOverrideNames,
} from './shaderGlslIntegerSampling';
import {
    samplerCoordinateScaleOverrideNames,
    SamplerCoordinateScaleOverrideNames,
} from './shaderSamplerState';
import { emitShaderCapture, sourceCapture } from './shaderCapture';
import { composeShaderModuleWgsl } from './shaderWgslTypes';
import {
    lowerBooleanUniformSpecializations,
    selectBooleanUniformSpecializations,
} from './shaderWgslUniformSpecialization';
import type { HydBuffer } from './hydBuffer';

export const ALIGNMENT_BLOCK_SIZE: number = 256;

const glSizeToBytes: Map<GLenum, number> = new Map([
    [WebGL2RenderingContext.FLOAT, 4],
    [WebGL2RenderingContext.INT, 4],
    [WebGL2RenderingContext.UNSIGNED_INT, 4],
    [WebGL2RenderingContext.BOOL, 4],

    [WebGL2RenderingContext.FLOAT_VEC2, 2 * 4],
    [WebGL2RenderingContext.FLOAT_VEC3, 3 * 4],
    [WebGL2RenderingContext.FLOAT_VEC4, 4 * 4],
    [WebGL2RenderingContext.INT_VEC2, 2 * 4],
    [WebGL2RenderingContext.INT_VEC3, 3 * 4],
    [WebGL2RenderingContext.INT_VEC4, 4 * 4],
    [WebGL2RenderingContext.UNSIGNED_INT_VEC2, 2 * 4],
    [WebGL2RenderingContext.UNSIGNED_INT_VEC3, 3 * 4],
    [WebGL2RenderingContext.UNSIGNED_INT_VEC4, 4 * 4],
    [WebGL2RenderingContext.BOOL_VEC2, 2 * 4],
    [WebGL2RenderingContext.BOOL_VEC3, 3 * 4],
    [WebGL2RenderingContext.BOOL_VEC4, 4 * 4],

    [WebGL2RenderingContext.FLOAT_MAT2, 2 * 2 * 4],
    [WebGL2RenderingContext.FLOAT_MAT3, 3 * 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT4, 4 * 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT2x3, 2 * 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT2x4, 2 * 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT3x2, 3 * 2 * 4],
    [WebGL2RenderingContext.FLOAT_MAT3x4, 3 * 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT4x2, 4 * 2 * 4],
    [WebGL2RenderingContext.FLOAT_MAT4x3, 4 * 4 * 4],
]);
const glSizeToAlignedBytes: Map<GLenum, number> = new Map([
    [WebGL2RenderingContext.FLOAT, 4],
    [WebGL2RenderingContext.INT, 4],
    [WebGL2RenderingContext.UNSIGNED_INT, 4],
    [WebGL2RenderingContext.BOOL, 4],

    [WebGL2RenderingContext.FLOAT_VEC2, 2 * 4],
    [WebGL2RenderingContext.FLOAT_VEC3, 4 * 4],
    [WebGL2RenderingContext.FLOAT_VEC4, 4 * 4],
    [WebGL2RenderingContext.INT_VEC2, 2 * 4],
    [WebGL2RenderingContext.INT_VEC3, 4 * 4],
    [WebGL2RenderingContext.INT_VEC4, 4 * 4],
    [WebGL2RenderingContext.UNSIGNED_INT_VEC2, 2 * 4],
    [WebGL2RenderingContext.UNSIGNED_INT_VEC3, 4 * 4],
    [WebGL2RenderingContext.UNSIGNED_INT_VEC4, 4 * 4],
    [WebGL2RenderingContext.BOOL_VEC2, 2 * 4],
    [WebGL2RenderingContext.BOOL_VEC3, 4 * 4],
    [WebGL2RenderingContext.BOOL_VEC4, 4 * 4],

    [WebGL2RenderingContext.FLOAT_MAT2, 2 * 4],
    [WebGL2RenderingContext.FLOAT_MAT3, 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT4, 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT2x3, 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT2x4, 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT3x2, 2 * 4],
    [WebGL2RenderingContext.FLOAT_MAT3x4, 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT4x2, 2 * 4],
    [WebGL2RenderingContext.FLOAT_MAT4x3, 4 * 4],
]);

const glMatrixDimensions: Map<GLenum, { columns: number, rows: number }> = new Map([
    [WebGL2RenderingContext.FLOAT_MAT2, { columns: 2, rows: 2 }],
    [WebGL2RenderingContext.FLOAT_MAT3, { columns: 3, rows: 3 }],
    [WebGL2RenderingContext.FLOAT_MAT4, { columns: 4, rows: 4 }],
    [WebGL2RenderingContext.FLOAT_MAT2x3, { columns: 2, rows: 3 }],
    [WebGL2RenderingContext.FLOAT_MAT2x4, { columns: 2, rows: 4 }],
    [WebGL2RenderingContext.FLOAT_MAT3x2, { columns: 3, rows: 2 }],
    [WebGL2RenderingContext.FLOAT_MAT3x4, { columns: 3, rows: 4 }],
    [WebGL2RenderingContext.FLOAT_MAT4x2, { columns: 4, rows: 2 }],
    [WebGL2RenderingContext.FLOAT_MAT4x3, { columns: 4, rows: 3 }],
]);

export function uniformMatrixDimensions(type: GLenum): { columns: number, rows: number } | null {
    return glMatrixDimensions.get(type) || null;
}

export interface ProgramUniformReflection {
    name: string;
    size: number;
    type: GLenum;
    blockIndex: number;
    offset: number;
    arrayStride: number;
    matrixStride: number;
    rowMajor: boolean;
}

export interface ProgramTransformFeedbackVarying {
    name: string;
    size: number;
    type: GLenum;
}

export interface HydIndexedBufferBinding {
    buffer: HydBuffer;
    offset: number;
    size: number;
    wholeBuffer?: boolean;
}

export class ProgramUniformBlock {
    public binding: number = 0;
    public resourceBinding: number = -1;
    public bufferBinding: HydIndexedBufferBinding | null = null;

    constructor(
        public readonly name: string,
        public readonly index: number,
        public readonly dataSize: number,
        public readonly activeUniformIndices: number[],
        public readonly referencedByVertex: boolean,
        public readonly referencedByFragment: boolean,
    ) {}

    public get wgslBindingSize(): number {
        // WebGL block data size may omit the final base-alignment padding.
        // WGSL host-shareable uniform structs include that trailing padding.
        return Math.max(16, Math.ceil(this.dataSize / 16) * 16);
    }
}

export class ProgramUniformBuffer {
    public name: string;
    public size: number;
    public webgl_type: GLenum;
    
    public offset: number;
    public byteLength: number;
    public alignedByteLength: number;
    public elementByteLength: number;
    public elementStride: number;
    public internal: boolean;
    public sourceName?: string;
    public dataView: DataView;
    public float32View: Float32Array;
    public int32View: Int32Array;
    public uint32View: Uint32Array;
    public writeFloat32View: Float32Array | null = null;
    public writeInt32View: Int32Array | null = null;
    public writeUint32View: Uint32Array | null = null;
    public writeUniform1fFloatView: Float32Array | null = null;
    public writeUniform2fFloatView: Float32Array | null = null;
    public writeUniform3fFloatView: Float32Array | null = null;
    public writeUniform4fFloatView: Float32Array | null = null;
    public writeUniform1fBooleanView: Int32Array | null = null;
    public writeUniform2fBooleanView: Int32Array | null = null;
    public writeUniform3fBooleanView: Int32Array | null = null;
    public writeUniform4fBooleanView: Int32Array | null = null;
    public wordOffset: number;
    public arrayStrideWords: number = 0;
    public remainingArrayElements: number = 1;
    public isArray: boolean;
    public ownerToken: object;
    public program: HydProgram;
    public linkGeneration: number;

    constructor(name: string, type: GLenum, size: GLsizei, internal: boolean = false, sourceName?: string, isArray: boolean = false) {
        this.name = name;
        this.size = size;
        this.webgl_type = type;
        this.internal = internal;
        this.sourceName = sourceName;
        this.isArray = isArray;
        const matrix = uniformMatrixDimensions(type);
        this.elementByteLength = matrix ? matrix.columns * 16 : glSizeToBytes.get(type);
        const elementAlignment = matrix ? 16 : glSizeToAlignedBytes.get(type);
        this.elementStride = isArray
            ? Math.ceil(this.elementByteLength / Math.max(16, elementAlignment)) * Math.max(16, elementAlignment)
            : this.elementByteLength;
        this.byteLength = isArray ? this.elementStride * size : this.elementByteLength;
        this.alignedByteLength = isArray ? Math.max(16, elementAlignment) : elementAlignment;
    }
}

export class ProgramUniformSampler {
    name: string;
    size: number;
    webgl_type: GLenum;
    textureUnit: number;   // TODO: 这个变量的设置可能出错了。

    sampleType: GPUTextureSampleType;
    samplerBindingType: GPUSamplerBindingType;
    viewDimension: GPUTextureViewDimension;
    bindingViewDimension: GPUTextureViewDimension;
    sourceName?: string;
    originFlipUniform?: ProgramUniformBuffer;
    originFlipValue?: boolean;
    ownerToken: object;
    program: HydProgram;
    linkGeneration: number;
    activeForUniformUpdates: boolean = false;
    storage?: ProgramUniformSampler;
    arrayName?: string;
    arrayIndex?: number;
    arrayElements?: ProgramUniformSampler[];
    remainingArrayElements: number = 1;
    isArray: boolean;
    constructor(
        name: string,
        webgl_type: GLenum,
        viewDimension: GPUTextureViewDimension,
        sampleType: GPUTextureSampleType = "float",
        samplerBindingType: GPUSamplerBindingType = "filtering",
        sourceName?: string,
        size: number = 1,
        arrayName?: string,
        arrayIndex?: number,
        isArray: boolean = false,
        bindingViewDimension: GPUTextureViewDimension = viewDimension,
    ) {
        this.name = name;
        this.size = size;
        this.webgl_type = webgl_type;
        this.textureUnit = 0;

        this.sampleType = sampleType;
        this.samplerBindingType = samplerBindingType;
        this.viewDimension = viewDimension;
        this.bindingViewDimension = bindingViewDimension;
        this.sourceName = sourceName;
        this.arrayName = arrayName;
        this.arrayIndex = arrayIndex;
        this.isArray = isArray;
    }
}

interface SamplerOriginVariant {
    vertexModule: GPUShaderModule;
    fragmentModule: GPUShaderModule;
    vertexWgsl: string;
    fragmentWgsl: string;
}

function cloneShaderInfo(info: ReturnType<typeof MergeShaderInfo>): ReturnType<typeof MergeShaderInfo> {
    return {
        attributes: info.attributes.map((attribute) => ({ ...attribute })),
        uniforms: info.uniforms.map((uniform) => ({ ...uniform })),
        samplers: info.samplers.map((sampler) => ({ ...sampler })),
    };
}

function addSamplerFlipUniforms(info: ReturnType<typeof MergeShaderInfo>) {
    for (const sampler of info.samplers) {
        if (samplerOriginCoordinateKind(sampler.glsl_type) === null) {
            continue;
        }
        const name = samplerFlipYUniformName(sampler.name);
        if (!info.uniforms.some((uniform) => uniform.name === name)) {
            info.uniforms.push({
                name,
                glsl_type: "float",
                wgsl_type: "f32",
                internal: true,
            });
        }
    }
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

function splitTopLevelCallArguments(source: string): string[] {
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
            args.push(source.slice(start, i).trim());
            start = i + 1;
        }
    }
    args.push(source.slice(start).trim());
    return args.filter((arg) => arg.length > 0);
}

function replaceSamplerOriginCalls(
    wgsl: string,
    samplerName: string,
    flip: boolean,
): { wgsl: string, replacements: number, flipDimensions: Set<SamplerOriginCoordinateKind> } {
    const uniformName = samplerFlipYUniformName(samplerName);
    let replacements = 0;
    const flipDimensions = new Set<SamplerOriginCoordinateKind>();
    let out = wgsl;
    for (const [callee, dimension, flipHelper] of [
        ["_hyd_samplerOriginCubeCoord", "cube", "_hyd_samplerOriginCubeCoordFlip"],
        ["_hyd_samplerOriginCoord3", 3, "_hyd_samplerOriginCoordFlip3"],
        ["_hyd_samplerOriginCoord", 2, "_hyd_samplerOriginCoordFlip"],
    ] as const) {
        let rewritten = "";
        let last = 0;
        let searchStart = 0;
        while (true) {
            const index = out.indexOf(callee, searchStart);
            if (index < 0) break;
            const before = out.slice(Math.max(0, index - 4), index);
            const openParen = index + callee.length;
            if (/\bfn\s+$/.test(before) || out[openParen] !== "(") {
                searchStart = index + callee.length;
                continue;
            }
            const closeParen = findMatchingParen(out, openParen);
            if (closeParen < 0) break;
            const args = splitTopLevelCallArguments(out.slice(openParen + 1, closeParen));
            const expectedArgumentCount = dimension === "cube" ? 3 : 2;
            if (args.length === expectedArgumentCount && args[1] === `_hyd_uniforms_.${uniformName}`) {
                rewritten += out.slice(last, index);
                const coordinate = flip ? `${flipHelper}(${args[0]})` : `(${args[0]})`;
                rewritten += dimension === "cube"
                    ? `_hyd_samplerCubeCoordScale(${coordinate}, ${args[2]})`
                    : coordinate;
                last = closeParen + 1;
                replacements++;
                if (flip) flipDimensions.add(dimension);
            }
            searchStart = closeParen + 1;
        }
        rewritten += out.slice(last);
        out = rewritten;
    }
    const dynamicUniform = `_hyd_uniforms_.${uniformName}`;
    const escapedDynamicUniform = dynamicUniform.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const dynamicUniformPattern = new RegExp(`${escapedDynamicUniform}\\b`, "g");
    const dynamicUniformMatches = out.match(dynamicUniformPattern);
    if (dynamicUniformMatches) {
        replacements += dynamicUniformMatches.length;
        out = out.replace(dynamicUniformPattern, flip ? "1.0f" : "0.0f");
    }
    return { wgsl: out, replacements, flipDimensions };
}

function insertSamplerOriginFlipHelpers(wgsl: string, dimensions: Set<SamplerOriginCoordinateKind>): string {
    const helpers: string[] = [];
    if (dimensions.has(2) && !wgsl.includes("fn _hyd_samplerOriginCoordFlip(")) {
        helpers.push(`fn _hyd_samplerOriginCoordFlip(texCoord: vec2<f32>) -> vec2<f32> {\n    return vec2<f32>(texCoord.x, 1.0 - texCoord.y);\n}`);
    }
    if (dimensions.has(3) && !wgsl.includes("fn _hyd_samplerOriginCoordFlip3(")) {
        helpers.push(`fn _hyd_samplerOriginCoordFlip3(texCoord: vec3<f32>) -> vec3<f32> {\n    return vec3<f32>(texCoord.x, 1.0 - texCoord.y, texCoord.z);\n}`);
    }
    if (dimensions.has("cube") && !wgsl.includes("fn _hyd_samplerOriginCubeCoordFlip(")) {
        helpers.push(`fn _hyd_samplerOriginCubeCoordFlip(direction: vec3<f32>) -> vec3<f32> {
    let magnitude = abs(direction);
    if (magnitude.x >= magnitude.y && magnitude.x >= magnitude.z) {
        return vec3<f32>(direction.x, -direction.y, direction.z);
    }
    if (magnitude.y >= magnitude.z) {
        return vec3<f32>(direction.x, direction.y, -direction.z);
    }
    return vec3<f32>(direction.x, -direction.y, direction.z);
}`);
    }
    if (helpers.length === 0) return wgsl;
    const directivePrefix = wgsl.match(
        /^\s*(?:(?:(?:enable|requires)\s+[^;]+;|diagnostic\s*\([^;]+\)\s*;)\s*)+/,
    );
    const insertion = directivePrefix ? directivePrefix[0].length : 0;
    return wgsl.slice(0, insertion) + helpers.join("\n\n") + "\n\n" + wgsl.slice(insertion);
}

function hasFunctionCall(wgsl: string, callee: string): boolean {
    let searchStart = 0;
    while (true) {
        const index = wgsl.indexOf(callee, searchStart);
        if (index < 0) {
            return false;
        }
        const before = wgsl.slice(Math.max(0, index - 4), index);
        const openParen = index + callee.length;
        if (!/\bfn\s+$/.test(before) && wgsl[openParen] === "(") {
            return true;
        }
        searchStart = index + callee.length;
    }
}

function stripUnusedSamplerOriginHelper(wgsl: string): string {
    let out = wgsl;
    if (!hasFunctionCall(out, "_hyd_samplerOriginCoord")) {
        out = out.replace(
            /fn\s+_hyd_samplerOriginCoord\s*\([^)]*\)\s*->\s*vec2\s*<\s*f32\s*>\s*\{\s*return\s+vec2\s*<\s*f32\s*>\s*\([^;]+;\s*\}\s*\n*/m,
            "",
        );
    }
    if (!hasFunctionCall(out, "_hyd_samplerOriginCoord3")) {
        out = out.replace(
            /fn\s+_hyd_samplerOriginCoord3\s*\([^)]*\)\s*->\s*vec3\s*<\s*f32\s*>\s*\{\s*return\s+vec3\s*<\s*f32\s*>\s*\([^;]+;\s*\}\s*\n*/m,
            "",
        );
    }
    return out;
}

export function specializeSamplerOriginWgsl(wgsl: string, samplerOriginFlips: Map<string, boolean>): string {
    let out = wgsl;
    const flipDimensions = new Set<SamplerOriginCoordinateKind>();
    for (const [samplerName, flip] of samplerOriginFlips) {
        const result = replaceSamplerOriginCalls(out, samplerName, flip);
        out = result.wgsl;
        for (const dimension of result.flipDimensions) flipDimensions.add(dimension);
    }
    if (flipDimensions.size > 0) {
        out = insertSamplerOriginFlipHelpers(out, flipDimensions);
    }
    return stripUnusedSamplerOriginHelper(out);
}

export interface ProgramAttribute {
    name: string;
    shaderName: string;
    size: number;
    type: GLenum;
    location: number;
    locationSpan: number;
}

export class HydProgram implements HydHashable {
    static linkedPrograms: number = 0;

    private _hash: string;
    uniformArrayBufferTempView: DataView;
    public get hash(): string {
        let hash = this._hash;
        if (this.samplerOriginVariantKey) {
            hash += `origin:${this.samplerOriginVariantKey}:` +
                `${this.vertexModule?.label || ""}:${this.fragmentModule?.label || ""}|`;
        }
        const booleanKey = this.booleanUniformVariantKey();
        return booleanKey ? `${hash}bool:${booleanKey}|` : hash;
    }
    private vertexShader: HydShader;
    private fragmentShader: HydShader;
    private readonly attachedShaders: HydShader[] = [];
    private readonly shaderTranslator: ShaderTranslator;
    public vertexModule: GPUShaderModule;
    public fragmentModule: GPUShaderModule;
    private vertexWgsl: string = "";
    private fragmentWgsl: string = "";
    private readonly samplerOriginVariants: Map<string, SamplerOriginVariant> = new Map();
    private samplerOriginVariantKey: string = "";
    private readonly vertexIntegerSamplerOverrides = new Map<string, IntegerSamplerOverrideNames>();
    private readonly fragmentIntegerSamplerOverrides = new Map<string, IntegerSamplerOverrideNames>();
    private readonly vertexSamplerCoordinateScaleOverrides =
        new Map<string, SamplerCoordinateScaleOverrideNames>();
    private readonly fragmentSamplerCoordinateScaleOverrides =
        new Map<string, SamplerCoordinateScaleOverrideNames>();
    private readonly vertexBooleanUniformOverrides = new Map<string, string>();
    private readonly fragmentBooleanUniformOverrides = new Map<string, string>();
    private readonly booleanUniformLocations = new Map<string, ProgramUniformBuffer>();
    private readonly device: GPUDevice;

    public deleted: boolean = false;
    public destroyed: boolean = false;
    public linked: boolean = false;
    public infoLog: string = "";
    public readonly ownerToken: object;
    public linkGeneration: number = 0;
    public validated: boolean = false;

    public hydAttributes: Array<ProgramAttribute> = [];
    public activeBuiltInAttributes: Array<ProgramAttribute> = [];
    public hydAttributeLocations: Set<number> = new Set();
    public hydUniforms: Array<ProgramUniformBuffer> = [];
    public fragCoordHeightUniform: ProgramUniformBuffer = null;
    public fragCoordHeightValue: number = Number.NaN;
    public depthRangeUniforms: ProgramUniformBuffer[] = [];
    public depthRangeValue: [number, number] = [Number.NaN, Number.NaN];
    public hydSamplers: Array<ProgramUniformSampler> = [];
    public uniformBufferLocations: Array<ProgramUniformBuffer> = [];
    public uniformSamplerLocations: Array<ProgramUniformSampler> = [];
    public hydOriginSamplers: Array<ProgramUniformSampler> = [];
    public originUniformStateVersion: number = -1;
    public originVariantStateVersion: number = -1;
    public staticSamplerOriginVariants: boolean = true;
    public readonly boundAttributeLocations: Map<string, number> = new Map();
    public transformFeedbackVaryingNames: string[] = [];
    public transformFeedbackBufferMode: GLenum = 0;
    public pendingTransformFeedbackVaryingNames: string[] = [];
    public pendingTransformFeedbackBufferMode: GLenum = 0;
    public transformFeedbackVaryingInfo: ProgramTransformFeedbackVarying[] = [];
    public uniformReflection: ProgramUniformReflection[] = [];
    public hydUniformBlocks: ProgramUniformBlock[] = [];
    public fragmentOutputLocations: Map<string, number> = new Map();
    public fragmentOutputTypes: Map<number, "float" | "sint" | "uint"> = new Map();
    public usesFlatInterpolation: boolean = false;

    public get attachedVertexShader(): HydShader | undefined {
        return this.vertexShader;
    }

    public setUniformBlockReflection(
        uniforms: ProgramUniformReflection[],
        blocks: ProgramUniformBlock[],
    ) {
        this.uniformReflection = uniforms;
        this.hydUniformBlocks = blocks;
    }

    public integerSamplerOverrides(stage: "vertex" | "fragment"): ReadonlyMap<string, IntegerSamplerOverrideNames> {
        return stage === "vertex"
            ? this.vertexIntegerSamplerOverrides
            : this.fragmentIntegerSamplerOverrides;
    }

    public samplerCoordinateScaleOverrides(
        stage: "vertex" | "fragment",
    ): ReadonlyMap<string, SamplerCoordinateScaleOverrideNames> {
        return stage === "vertex"
            ? this.vertexSamplerCoordinateScaleOverrides
            : this.fragmentSamplerCoordinateScaleOverrides;
    }

    public booleanUniformPipelineConstants(stage: "vertex" | "fragment"): {
        constants: Record<string, number>,
        key: string,
    } {
        const overrides = stage === "vertex"
            ? this.vertexBooleanUniformOverrides
            : this.fragmentBooleanUniformOverrides;
        const constants: Record<string, number> = {};
        const keyParts: string[] = [];
        for (const [uniformName, overrideName] of overrides) {
            const value = this.booleanUniformValue(uniformName);
            constants[overrideName] = value;
            keyParts.push(`${overrideName}=${value}`);
        }
        return { constants, key: keyParts.join(",") };
    }

    public hasBooleanUniformSpecialization(uniform: ProgramUniformBuffer): boolean {
        return this.booleanUniformLocations.get(uniform.name) === uniform;
    }

    private booleanUniformValue(uniformName: string): number {
        const uniform = this.booleanUniformLocations.get(uniformName);
        if (!uniform || !uniform.int32View) return 0;
        return uniform.int32View[uniform.wordOffset] !== 0 ? 1 : 0;
    }

    private booleanUniformVariantKey(): string {
        if (this.booleanUniformLocations.size === 0) return "";
        return Array.from(this.booleanUniformLocations.keys())
            .sort()
            .map((uniformName) => `${uniformName}=${this.booleanUniformValue(uniformName)}`)
            .join(",");
    }

    public resolveUniformBlockBindings(bindings: Array<HydIndexedBufferBinding | null>) {
        for (const block of this.hydUniformBlocks) {
            block.bufferBinding = bindings[block.binding] || null;
        }
    }

    public commitTransformFeedbackVaryings(info: ProgramTransformFeedbackVarying[]) {
        this.transformFeedbackVaryingNames = [...this.pendingTransformFeedbackVaryingNames];
        this.transformFeedbackBufferMode = this.pendingTransformFeedbackBufferMode ||
            WebGL2RenderingContext.INTERLEAVED_ATTRIBS;
        this.transformFeedbackVaryingInfo = info;
    }
    
    // public uniformMergedBuffer: Uint8Array;
    // public uniformArrayBufferView: DataView;

    public activeUniform: Uint8Array;
    public activeUniformFloat32: Float32Array;
    public activeUniformInt32: Int32Array;
    public activeUniformUint32: Uint32Array;
    // // public uniformTempBufferFloat32: Float32Array;
    // // public uniformTempBufferUint32: Uint32Array;
    // // public uniformTempBufferInt32: Int32Array;

    // public uniformGPUBuffer: GPUBuffer;
    // public uniformOffset: number = 0;
    // public uniformBufferLength: number;
    public alignedUniformSize: number;
    // private uniformToFlush: number;

    constructor(device: GPUDevice, shaderTranslator: ShaderTranslator, ownerToken?: object) {
        this.device = device;
        this.shaderTranslator = shaderTranslator;
        this.ownerToken = ownerToken;
    }

    public write_uniform_i(dstOffset: number, num: number, value: ArrayLike<number>) {
        const view = this.activeUniformInt32;
        const wordOffset = dstOffset >> 2;
        for (let i = 0; i < num; i++) {
            view[wordOffset + i] = value[i];
        }
        // this.commonState.currentthis.uniformTempBufferInt32.set(value, uniform.offset / 4);
    }

    public write_uniform_f(dstOffset: number, num: number, value: ArrayLike<number>) {
        const view = this.activeUniformFloat32;
        const wordOffset = dstOffset >> 2;
        for (let i = 0; i < num; i++) {
            view[wordOffset + i] = value[i];
        }
        // this.commonState.currentthis.uniformTempBufferFloat32.set(value, uniform.offset / 4);
    }

    public write_uniform_f1(dstOffset: number, value: number) {
        this.activeUniformFloat32[dstOffset >> 2] = value;
    }

    public getFragmentState(format: GPUTextureFormat, entryPoint: string = 'main'): GPUFragmentState {
        return {
            module: this.fragmentModule,
            entryPoint: entryPoint,
            targets: [{
                format,
            }],
        }
    }

    public attachShader(shader: HydShader): boolean {
        if (this.attachedShaders.includes(shader) || this.attachedShaders.some((attached) => attached.type === shader.type)) {
            return false;
        }
        this.attachedShaders.push(shader);
        shader.attachmentCount++;
        if (shader.type === WebGLRenderingContext.VERTEX_SHADER) {
            this.vertexShader = shader;
        } else if (shader.type === WebGLRenderingContext.FRAGMENT_SHADER) {
            this.fragmentShader = shader;
        }
        return true;
    }

    public detachShader(shader: HydShader): boolean {
        const index = this.attachedShaders.indexOf(shader);
        if (index < 0) {
            return false;
        }
        this.attachedShaders.splice(index, 1);
        shader.attachmentCount = Math.max(0, shader.attachmentCount - 1);
        if (shader.deleted && shader.attachmentCount === 0) {
            shader.destroyed = true;
        }
        if (this.vertexShader === shader) {
            this.vertexShader = undefined;
        }
        if (this.fragmentShader === shader) {
            this.fragmentShader = undefined;
        }
        return true;
    }

    public getAttachedShaders(): HydShader[] {
        return this.attachedShaders.slice();
    }

    public detachAllShaders() {
        for (const shader of this.getAttachedShaders()) {
            this.detachShader(shader);
        }
    }

    public bindAttribLocation(index: number, name: string) {
        this.boundAttributeLocations.set(name, index);
    }

    public linkProgram(): boolean {
        this.linked = false;
        this.infoLog = "";
        if (!this.vertexShader || !this.fragmentShader) {
            this.infoLog = "A vertex shader and a fragment shader must both be attached.";
            return false;
        }
        if (!this.vertexShader.compiled || !this.fragmentShader.compiled) {
            this.infoLog = "All attached shaders must compile successfully before linking.";
            return false;
        }

        let translatedProgram: ReturnType<ShaderTranslator["translateProgram"]>;
        try {
            translatedProgram = this.shaderTranslator.translateProgram(this.vertexShader, this.fragmentShader, this.boundAttributeLocations);
        } catch (error) {
            this.infoLog = error instanceof Error ? error.message : String(error);
            return false;
        }
        if (this.vertexShader && translatedProgram.vertex) {
            this.vertexShader.shader_info = translatedProgram.vertex;
        }
        if (this.fragmentShader && translatedProgram.fragment) {
            this.fragmentShader.shader_info = translatedProgram.fragment;
        }
        this.usesFlatInterpolation = translatedProgram.usesFlatInterpolation === true;
        const uniformBlockResourceBindings = translatedProgram.uniformBlockBindings || new Map<string, number>();
        for (const block of this.hydUniformBlocks) {
            const baseName = block.name.replace(/\[\d+\]$/, "");
            block.resourceBinding = uniformBlockResourceBindings.get(block.name) ??
                uniformBlockResourceBindings.get(baseName) ?? -1;
        }

        HydProgram.linkedPrograms++;
        this._hash = HydProgram.linkedPrograms.toString();
        let shaders = [];
        let tmpOutput = "";
        if (this.vertexShader) {
            tmpOutput += this.vertexShader.shader_info.debug_info + " ";
            shaders.push(this.vertexShader.shader_info);
            // this.vertexModule = this.device.createShaderModule({code: this.vertexShader.wgsl_shader, label: fastHashCode(this.vertexShader.wgsl_shader).toString()});
        }
        if (this.fragmentShader) {
            tmpOutput += this.fragmentShader.shader_info.debug_info + " ";
            shaders.push(this.fragmentShader.shader_info);
            // this.fragmentModule = this.device.createShaderModule({code: this.fragmentShader.wgsl_shader, label: fastHashCode(this.fragmentShader.wgsl_shader).toString()});
        }
        console.warn('[HYD] linkProgram:', tmpOutput);
        const baseShaderInfo = MergeShaderInfo(shaders);
        const dynamicShaderInfo = cloneShaderInfo(baseShaderInfo);
        addSamplerFlipUniforms(dynamicShaderInfo);
        this.staticSamplerOriginVariants = (globalThis as any).__HYD_STATIC_SAMPLER_ORIGIN_VARIANTS !== false;
        const runtimeShaderInfo = this.staticSamplerOriginVariants ? baseShaderInfo : dynamicShaderInfo;
        const code = ShaderInfo2String(runtimeShaderInfo);
        const dynamicCode = this.staticSamplerOriginVariants ? ShaderInfo2String(dynamicShaderInfo) : code;
        this.vertexWgsl = composeShaderModuleWgsl(code, this.vertexShader.shader_info.wgsl);
        this.fragmentWgsl = composeShaderModuleWgsl(code, this.fragmentShader.shader_info.wgsl);
        this.vertexIntegerSamplerOverrides.clear();
        this.fragmentIntegerSamplerOverrides.clear();
        this.vertexSamplerCoordinateScaleOverrides.clear();
        this.fragmentSamplerCoordinateScaleOverrides.clear();
        for (const sampler of runtimeShaderInfo.samplers) {
            const overrides = integerSamplerOverrideNames(sampler.name);
            if (Object.values(overrides).some((name) => this.vertexWgsl.includes(name))) {
                this.vertexIntegerSamplerOverrides.set(sampler.name, overrides);
            }
            if (Object.values(overrides).some((name) => this.fragmentWgsl.includes(name))) {
                this.fragmentIntegerSamplerOverrides.set(sampler.name, overrides);
            }
            const coordinateScale = samplerCoordinateScaleOverrideNames(sampler.name);
            if (Object.values(coordinateScale).some((name) => this.vertexWgsl.includes(name))) {
                this.vertexSamplerCoordinateScaleOverrides.set(sampler.name, coordinateScale);
            }
            if (Object.values(coordinateScale).some((name) => this.fragmentWgsl.includes(name))) {
                this.fragmentSamplerCoordinateScaleOverrides.set(sampler.name, coordinateScale);
            }
        }
        let vs = this.vertexWgsl;
        let fs = this.fragmentWgsl;
        let defaultFlips: Map<string, boolean> | null = null;
        if (this.staticSamplerOriginVariants) {
            defaultFlips = new Map<string, boolean>();
            for (const sampler of runtimeShaderInfo.samplers) {
                if (samplerOriginCoordinateKind(sampler.glsl_type) !== null) {
                    defaultFlips.set(sampler.name, false);
                }
            }
            vs = specializeSamplerOriginWgsl(this.vertexWgsl, defaultFlips);
            fs = specializeSamplerOriginWgsl(this.fragmentWgsl, defaultFlips);
            if (vs.includes("_hyd_samplerFlipY_") || fs.includes("_hyd_samplerFlipY_")) {
                this.staticSamplerOriginVariants = false;
                this.vertexWgsl = composeShaderModuleWgsl(dynamicCode, this.vertexShader.shader_info.wgsl);
                this.fragmentWgsl = composeShaderModuleWgsl(dynamicCode, this.fragmentShader.shader_info.wgsl);
                defaultFlips = null;
                vs = this.vertexWgsl;
                fs = this.fragmentWgsl;
            }
        }
        this.vertexBooleanUniformOverrides.clear();
        this.fragmentBooleanUniformOverrides.clear();
        this.booleanUniformLocations.clear();
        if ((globalThis as any).__HYD_STATIC_BOOLEAN_UNIFORM_VARIANTS !== false) {
            const specializations = selectBooleanUniformSpecializations(
                runtimeShaderInfo.uniforms,
                [this.vertexWgsl, this.fragmentWgsl],
            );
            const vertexSpecialization = lowerBooleanUniformSpecializations(
                this.vertexWgsl,
                specializations,
            );
            const fragmentSpecialization = lowerBooleanUniformSpecializations(
                this.fragmentWgsl,
                specializations,
            );
            this.vertexWgsl = vertexSpecialization.wgsl;
            this.fragmentWgsl = fragmentSpecialization.wgsl;
            for (const [uniformName, overrideName] of vertexSpecialization.overrides) {
                this.vertexBooleanUniformOverrides.set(uniformName, overrideName);
            }
            for (const [uniformName, overrideName] of fragmentSpecialization.overrides) {
                this.fragmentBooleanUniformOverrides.set(uniformName, overrideName);
            }
            vs = defaultFlips
                ? specializeSamplerOriginWgsl(this.vertexWgsl, defaultFlips)
                : this.vertexWgsl;
            fs = defaultFlips
                ? specializeSamplerOriginWgsl(this.fragmentWgsl, defaultFlips)
                : this.fragmentWgsl;
        }
        this.samplerOriginVariants.clear();
        this.samplerOriginVariantKey = "";
        if (this.vertexShader) {
            if (typeof window !== "undefined" && (window as any).__HYD_DEBUG_SHADERS) {
                console.debug('[HYD] linkProgram vertex:\n\n', vs);
            }
            if (this.vertexShader.shader_info.shader_capture) {
                emitShaderCapture({
                    ...this.vertexShader.shader_info.shader_capture,
                    kind: "shader-final",
                    programId: this._hash,
                    finalWgsl: sourceCapture(vs),
                });
            }
            this.vertexModule = this.device.createShaderModule({code: vs, label: fastHashCode(vs).toString()});
            this._hash += this.vertexModule.label + '|';
        }
        if (this.fragmentShader) {
            if (typeof window !== "undefined" && (window as any).__HYD_DEBUG_SHADERS) {
                console.debug('[HYD] linkProgram fragment:\n\n', fs);
            }
            if (this.fragmentShader.shader_info.shader_capture) {
                emitShaderCapture({
                    ...this.fragmentShader.shader_info.shader_capture,
                    kind: "shader-final",
                    programId: this._hash,
                    finalWgsl: sourceCapture(fs),
                });
            }
            this.fragmentModule = this.device.createShaderModule({code: fs, label: fastHashCode(fs).toString()});
            this._hash += this.fragmentModule.label + '|';
        }
        const aus = ShaderInfo2HydAus(this.staticSamplerOriginVariants ? runtimeShaderInfo : dynamicShaderInfo);
        this.hydAttributes = aus.attributes;
        for (const attribute of this.hydAttributes) {
            const location = translatedProgram.attributeLocations?.get(attribute.shaderName);
            if (location !== undefined) {
                attribute.location = location;
            }
        }
        this.activeBuiltInAttributes = [];
        const vertexSource = this.vertexShader
            ? this.vertexShader.compiled_glsl_shader || this.vertexShader.glsl_shader
            : "";
        for (const builtIn of ["gl_VertexID", "gl_InstanceID"]) {
            if (new RegExp(`\\b${builtIn}\\b`).test(vertexSource)) {
                this.activeBuiltInAttributes.push({
                    name: builtIn,
                    shaderName: builtIn,
                    size: 1,
                    type: WebGL2RenderingContext.INT,
                    location: -1,
                    locationSpan: 0,
                });
            }
        }
        this.hydAttributeLocations = new Set();
        for (const attribute of this.hydAttributes) {
            for (let offset = 0; offset < attribute.locationSpan; offset++) {
                this.hydAttributeLocations.add(attribute.location + offset);
            }
        }
        this.hydUniforms = aus.uniforms;
        const specializedBooleanNames = new Set([
            ...this.vertexBooleanUniformOverrides.keys(),
            ...this.fragmentBooleanUniformOverrides.keys(),
        ]);
        for (const uniform of this.hydUniforms) {
            if (specializedBooleanNames.has(uniform.name)) {
                this.booleanUniformLocations.set(uniform.name, uniform);
            }
        }
        this.fragCoordHeightUniform = this.hydUniforms.find((uniform) =>
            uniform.name === FRAG_COORD_HEIGHT_UNIFORM_NAME) || null;
        this.fragCoordHeightValue = Number.NaN;
        this.depthRangeUniforms = [
            DEPTH_RANGE_NEAR_UNIFORM_NAME,
            DEPTH_RANGE_FAR_UNIFORM_NAME,
            DEPTH_RANGE_DIFF_UNIFORM_NAME,
        ].map((name) => this.hydUniforms.find((uniform) => uniform.name === name) || null);
        this.depthRangeValue = [Number.NaN, Number.NaN];
        this.hydSamplers = aus.samplers;
        for (const uniform of this.hydUniforms) {
            uniform.ownerToken = this.ownerToken;
            uniform.program = this;
            uniform.linkGeneration = this.linkGeneration;
        }
        for (const sampler of this.hydSamplers) {
            sampler.ownerToken = this.ownerToken;
            sampler.program = this;
            sampler.linkGeneration = this.linkGeneration;
        }
        this.hydOriginSamplers = [];
        for (const sampler of this.hydSamplers) {
            const originFlipUniform = this.hydUniforms.find((uniform) =>
                uniform.name === samplerFlipYUniformName(sampler.name));
            this.hydOriginSamplers.push(sampler);
            sampler.originFlipUniform = originFlipUniform || null;
        }

        // TODO: algorithm: uniform buffer alignment
        let currentOffset = 0;
        for (let i = 0; i < this.hydUniforms.length; i++) {
            const uniform = this.hydUniforms[i];
            currentOffset = (currentOffset + uniform.alignedByteLength - 1) & ~(uniform.alignedByteLength - 1);
            uniform.offset = currentOffset;
            currentOffset += uniform.byteLength;
        }
        let uniformBufferLength = currentOffset;

        // this.uniformBufferLengthAligned = Math.ceil(this.uniformBufferLength / ALIGNMENT_BLOCK_SIZE) * ALIGNMENT_BLOCK_SIZE;
        this.alignedUniformSize = (uniformBufferLength + ALIGNMENT_BLOCK_SIZE - 1) & ~(ALIGNMENT_BLOCK_SIZE - 1);
        
        this.activeUniform = new Uint8Array(uniformBufferLength);
        this.activeUniformFloat32 = new Float32Array(this.activeUniform.buffer);
        this.activeUniformInt32 = new Int32Array(this.activeUniform.buffer);
        this.activeUniformUint32 = new Uint32Array(this.activeUniform.buffer);
        // this.uniformTempBufferFloat32 = new Float32Array(this.uniformTempBufferUint8.buffer);
        // this.uniformTempBufferUint32 = new Uint32Array(this.uniformTempBufferUint8.buffer);
        // this.uniformTempBufferInt32 = new Int32Array(this.uniformTempBufferUint8.buffer);

        this.uniformArrayBufferTempView = new DataView(this.activeUniform.buffer);
        for (const uniform of this.hydUniforms) {
            uniform.dataView = this.uniformArrayBufferTempView;
            uniform.float32View = this.activeUniformFloat32;
            uniform.int32View = this.activeUniformInt32;
            uniform.uint32View = this.activeUniformUint32;
            uniform.wordOffset = uniform.offset >> 2;
        }
        this.linked = true;
        return true;
        // this.uniformArrayBufferView = new DataView(this.uniformArrayBuffer.buffer);
        // this.uniformToFlush = MAX_UNIFORM_SIZE - 2 * this.uniformBufferLengthAligned;
    }

    public setUniform(array: Uint8Array, offset: number): number {
        array.set(
            this.activeUniform,
            offset,
        );
        return offset + this.alignedUniformSize;
    }

    public applySamplerOriginVariant(samplerOriginFlips: Map<string, boolean>) {
        if (!this.vertexShader || !this.fragmentShader || this.vertexWgsl.length === 0 ||
            this.fragmentWgsl.length === 0 || samplerOriginFlips.size === 0) {
            this.samplerOriginVariantKey = "";
            return;
        }
        if (this.hydOriginSamplers.length === 0) {
            this.samplerOriginVariantKey = "";
            return;
        }
        let key: string;
        if (this.hydOriginSamplers.length <= 30) {
            let bits = 0;
            for (let i = 0; i < this.hydOriginSamplers.length; i++) {
                if (samplerOriginFlips.get(this.hydOriginSamplers[i].name)) {
                    bits |= 1 << i;
                }
            }
            key = `b${bits.toString(36)}`;
        } else {
            key = this.hydOriginSamplers
                .map((sampler) => samplerOriginFlips.get(sampler.name) ? "1" : "0")
                .join("");
        }
        if (this.samplerOriginVariantKey === key) {
            return;
        }
        let variant = this.samplerOriginVariants.get(key);
        if (!variant) {
            const vertexWgsl = specializeSamplerOriginWgsl(this.vertexWgsl, samplerOriginFlips);
            const fragmentWgsl = specializeSamplerOriginWgsl(this.fragmentWgsl, samplerOriginFlips);
            variant = {
                vertexWgsl,
                fragmentWgsl,
                vertexModule: this.device.createShaderModule({
                    code: vertexWgsl,
                    label: fastHashCode(vertexWgsl).toString(),
                }),
                fragmentModule: this.device.createShaderModule({
                    code: fragmentWgsl,
                    label: fastHashCode(fragmentWgsl).toString(),
                }),
            };
            this.samplerOriginVariants.set(key, variant);
            if (this.vertexShader.shader_info.shader_capture) {
                emitShaderCapture({
                    ...this.vertexShader.shader_info.shader_capture,
                    kind: "shader-final",
                    source: "runtime-origin-variant",
                    programId: this._hash,
                    shaderId: `${this.vertexShader.shader_info.shader_capture.shaderId}:origin:${key}`,
                    finalWgsl: sourceCapture(vertexWgsl),
                });
            }
            if (this.fragmentShader.shader_info.shader_capture) {
                emitShaderCapture({
                    ...this.fragmentShader.shader_info.shader_capture,
                    kind: "shader-final",
                    source: "runtime-origin-variant",
                    programId: this._hash,
                    shaderId: `${this.fragmentShader.shader_info.shader_capture.shaderId}:origin:${key}`,
                    finalWgsl: sourceCapture(fragmentWgsl),
                });
            }
        }
        this.vertexModule = variant.vertexModule;
        this.fragmentModule = variant.fragmentModule;
        this.samplerOriginVariantKey = key;
    }
}
