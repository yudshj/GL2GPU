import fastHashCode from 'fast-hash-code';

import {HydShader} from "./hydShader";
import {MergeShaderInfo, samplerFlipYUniformName, ShaderInfo2HydAus, ShaderInfo2String, hydTrim} from "./shaderDB";
import { HydHashable } from './base/hydHashable';
import { ShaderTranslator } from './shaderTranslator';
import { emitShaderCapture, sourceCapture } from './shaderCapture';

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
    [WebGL2RenderingContext.FLOAT_MAT3, 3 * 3 * 4],
    [WebGL2RenderingContext.FLOAT_MAT4, 4 * 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT2x3, 2 * 3 * 4],
    [WebGL2RenderingContext.FLOAT_MAT2x4, 2 * 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT3x2, 3 * 2 * 4],
    [WebGL2RenderingContext.FLOAT_MAT3x4, 3 * 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT4x2, 4 * 2 * 4],
    [WebGL2RenderingContext.FLOAT_MAT4x3, 4 * 3 * 4],
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

export class ProgramUniformBuffer {
    public name: string;
    public size: number;
    public webgl_type: GLenum;
    
    public offset: number;
    public byteLength: number;
    public alignedByteLength: number;
    public internal: boolean;
    public dataView: DataView;
    public float32View: Float32Array;
    public int32View: Int32Array;
    public wordOffset: number;

    constructor(name: string, type: GLenum, size: GLsizei, internal: boolean = false) {
        this.name = name;
        this.size = size;
        this.webgl_type = type;
        this.internal = internal;
        // TODO: 考虑size
        this.byteLength = glSizeToBytes.get(type);
        this.alignedByteLength = glSizeToAlignedBytes.get(type);
    }
}

export class ProgramUniformSampler {
    name: string;
    size: number;
    webgl_type: GLenum;
    textureUnit: number;   // TODO: 这个变量的设置可能出错了。

    // isCompare: boolean;    // TODO: is compare 应该跟着texture的format走?
    // sampleType: GPUTextureSampleType;
    viewDimension: GPUTextureViewDimension;
    originFlipUniform?: ProgramUniformBuffer;
    originFlipValue?: boolean;
    constructor(name: string, webgl_type: GLenum, viewDimension: GPUTextureViewDimension) {
        this.name = name;
        this.size = 1;
        this.webgl_type = webgl_type;
        this.textureUnit = 0;

        // this.isCompare = isCompare;
        // this.sampleType = sampleType;
        this.viewDimension = viewDimension;
    }
}

interface SamplerOriginVariant {
    module: GPUShaderModule;
    wgsl: string;
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
): { wgsl: string, replacements: number, needsFlipHelper: boolean } {
    const uniformName = samplerFlipYUniformName(samplerName);
    const callee = "_hyd_samplerOriginCoord";
    let replacements = 0;
    let out = "";
    let last = 0;
    let searchStart = 0;
    while (true) {
        const index = wgsl.indexOf(callee, searchStart);
        if (index < 0) {
            break;
        }
        const before = wgsl.slice(Math.max(0, index - 4), index);
        const openParen = index + callee.length;
        if (/\bfn\s+$/.test(before) || wgsl[openParen] !== "(") {
            searchStart = index + callee.length;
            continue;
        }
        const closeParen = findMatchingParen(wgsl, openParen);
        if (closeParen < 0) {
            break;
        }
        const args = splitTopLevelCallArguments(wgsl.slice(openParen + 1, closeParen));
        if (args.length === 2 && args[1] === `_hyd_uniforms_.${uniformName}`) {
            const expression = args[0];
            out += wgsl.slice(last, index);
            out += flip ? `_hyd_samplerOriginCoordFlip(${expression})` : `(${expression})`;
            last = closeParen + 1;
            replacements++;
        }
        searchStart = closeParen + 1;
    }
    out += wgsl.slice(last);
    return { wgsl: out, replacements, needsFlipHelper: flip && replacements > 0 };
}

function insertSamplerOriginFlipHelper(wgsl: string): string {
    if (wgsl.includes("fn _hyd_samplerOriginCoordFlip")) {
        return wgsl;
    }
    const helper = `fn _hyd_samplerOriginCoordFlip(texCoord: vec2<f32>) -> vec2<f32> {\n    return vec2<f32>(texCoord.x, 1.0 - texCoord.y);\n}\n\n`;
    const fragmentIndex = wgsl.indexOf("@fragment");
    if (fragmentIndex < 0) {
        return helper + wgsl;
    }
    return wgsl.slice(0, fragmentIndex) + helper + wgsl.slice(fragmentIndex);
}

function hasSamplerOriginCall(wgsl: string): boolean {
    const callee = "_hyd_samplerOriginCoord";
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
    if (hasSamplerOriginCall(wgsl)) {
        return wgsl;
    }
    return wgsl.replace(
        /fn\s+_hyd_samplerOriginCoord\s*\([^)]*\)\s*->\s*vec2\s*<\s*f32\s*>\s*\{\s*return\s+vec2\s*<\s*f32\s*>\s*\([^;]+;\s*\}\s*\n*/m,
        "",
    );
}

export function specializeSamplerOriginWgsl(wgsl: string, samplerOriginFlips: Map<string, boolean>): string {
    let out = wgsl;
    let needsFlipHelper = false;
    for (const [samplerName, flip] of samplerOriginFlips) {
        const result = replaceSamplerOriginCalls(out, samplerName, flip);
        out = result.wgsl;
        needsFlipHelper = needsFlipHelper || result.needsFlipHelper;
    }
    if (needsFlipHelper) {
        out = insertSamplerOriginFlipHelper(out);
    }
    return stripUnusedSamplerOriginHelper(out);
}

export interface ProgramAttribute {
    name: string;
    size: number;
    type: GLenum;
    location: number;
}

export class HydProgram implements HydHashable {
    static linkedPrograms: number = 0;

    private _hash: string;
    uniformArrayBufferTempView: DataView;
    public get hash(): string {
        if (!this.samplerOriginVariantKey) {
            return this._hash;
        }
        return `${this._hash}origin:${this.samplerOriginVariantKey}:${this.fragmentModule?.label || ""}|`;
    }
    private vertexShader: HydShader;
    private fragmentShader: HydShader;
    private readonly shaderTranslator: ShaderTranslator;
    public vertexModule: GPUShaderModule;
    public fragmentModule: GPUShaderModule;
    private fragmentWgsl: string = "";
    private readonly samplerOriginVariants: Map<string, SamplerOriginVariant> = new Map();
    private samplerOriginVariantKey: string = "";
    private readonly device: GPUDevice;

    public deleted: boolean = false;
    public linked: boolean = false;

    public hydAttributes: Array<ProgramAttribute> = [];
    public hydAttributeLocations: Set<number> = new Set();
    public hydUniforms: Array<ProgramUniformBuffer> = [];
    public hydSamplers: Array<ProgramUniformSampler> = [];
    public originUniformStateVersion: number = -1;
    public originVariantStateVersion: number = -1;
    public readonly boundAttributeLocations: Map<string, number> = new Map();
    
    // public uniformMergedBuffer: Uint8Array;
    // public uniformArrayBufferView: DataView;

    public activeUniform: Uint8Array;
    public activeUniformFloat32: Float32Array;
    public activeUniformInt32: Int32Array;
    // // public uniformTempBufferFloat32: Float32Array;
    // // public uniformTempBufferUint32: Uint32Array;
    // // public uniformTempBufferInt32: Int32Array;

    // public uniformGPUBuffer: GPUBuffer;
    // public uniformOffset: number = 0;
    // public uniformBufferLength: number;
    public alignedUniformSize: number;
    // private uniformToFlush: number;

    constructor(device: GPUDevice, shaderTranslator: ShaderTranslator) {
        this.device = device;
        this.shaderTranslator = shaderTranslator;
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

    public attachShader(shader: HydShader) {
        if (shader.type === WebGLRenderingContext.VERTEX_SHADER) {
            this.vertexShader = shader;
        } else if (shader.type === WebGLRenderingContext.FRAGMENT_SHADER) {
            this.fragmentShader = shader;
        }
    }

    public bindAttribLocation(index: number, name: string) {
        this.boundAttributeLocations.set(name, index);
    }

    public linkProgram() {
        const translatedProgram = this.shaderTranslator.translateProgram(this.vertexShader, this.fragmentShader, this.boundAttributeLocations);
        if (this.vertexShader && translatedProgram.vertex) {
            this.vertexShader.shader_info = translatedProgram.vertex;
        }
        if (this.fragmentShader && translatedProgram.fragment) {
            this.fragmentShader.shader_info = translatedProgram.fragment;
        }

        HydProgram.linkedPrograms++;
        this._hash = HydProgram.linkedPrograms.toString();
        this.linked = true;
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
        const mergedShaderInfo = MergeShaderInfo(shaders);
        for (const sampler of mergedShaderInfo.samplers) {
            if (sampler.glsl_type !== "sampler2D") {
                continue;
            }
            const name = samplerFlipYUniformName(sampler.name);
            if (!mergedShaderInfo.uniforms.some((uniform) => uniform.name === name)) {
                mergedShaderInfo.uniforms.push({
                    name,
                    glsl_type: "float",
                    wgsl_type: "f32",
                    internal: true,
                });
            }
        }
        const code = ShaderInfo2String(mergedShaderInfo);
        if (this.vertexShader) {
            const vs = code + this.vertexShader.shader_info.wgsl;
            console.debug('[HYD] linkProgram vertex:\n\n', vs);
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
            const fs = code + this.fragmentShader.shader_info.wgsl;
            this.fragmentWgsl = fs;
            this.samplerOriginVariants.clear();
            this.samplerOriginVariantKey = "";
            console.debug('[HYD] linkProgram fragment:\n\n', fs);
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
        const aus = ShaderInfo2HydAus(mergedShaderInfo);
        this.hydAttributes = aus.attributes;
        for (const attribute of this.hydAttributes) {
            const location = translatedProgram.attributeLocations?.get(attribute.name);
            if (location !== undefined) {
                attribute.location = location;
            }
        }
        this.hydAttributeLocations = new Set(this.hydAttributes.map((attribute) => attribute.location));
        this.hydUniforms = aus.uniforms;
        this.hydSamplers = aus.samplers;
        for (const sampler of this.hydSamplers) {
            if (sampler.webgl_type === WebGL2RenderingContext.SAMPLER_2D) {
                sampler.originFlipUniform = this.hydUniforms.find((uniform) => uniform.name === samplerFlipYUniformName(sampler.name));
            }
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
        // this.uniformTempBufferFloat32 = new Float32Array(this.uniformTempBufferUint8.buffer);
        // this.uniformTempBufferUint32 = new Uint32Array(this.uniformTempBufferUint8.buffer);
        // this.uniformTempBufferInt32 = new Int32Array(this.uniformTempBufferUint8.buffer);

        this.uniformArrayBufferTempView = new DataView(this.activeUniform.buffer);
        for (const uniform of this.hydUniforms) {
            uniform.dataView = this.uniformArrayBufferTempView;
            uniform.float32View = this.activeUniformFloat32;
            uniform.int32View = this.activeUniformInt32;
            uniform.wordOffset = uniform.offset >> 2;
        }
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
        if (!this.fragmentShader || this.fragmentWgsl.length === 0 || samplerOriginFlips.size === 0) {
            this.samplerOriginVariantKey = "";
            return;
        }
        const key = this.hydSamplers
            .filter((sampler) => sampler.originFlipUniform)
            .map((sampler) => `${sampler.name}=${samplerOriginFlips.get(sampler.name) ? 1 : 0}`)
            .join(",");
        if (key.length === 0) {
            this.samplerOriginVariantKey = "";
            return;
        }
        if (this.samplerOriginVariantKey === key) {
            return;
        }
        let variant = this.samplerOriginVariants.get(key);
        if (!variant) {
            const wgsl = specializeSamplerOriginWgsl(this.fragmentWgsl, samplerOriginFlips);
            variant = {
                wgsl,
                module: this.device.createShaderModule({ code: wgsl, label: fastHashCode(wgsl).toString() }),
            };
            this.samplerOriginVariants.set(key, variant);
            if (this.fragmentShader.shader_info.shader_capture) {
                emitShaderCapture({
                    ...this.fragmentShader.shader_info.shader_capture,
                    kind: "shader-final",
                    source: "runtime-origin-variant",
                    programId: this._hash,
                    shaderId: `${this.fragmentShader.shader_info.shader_capture.shaderId}:origin:${key}`,
                    finalWgsl: sourceCapture(wgsl),
                });
            }
        }
        this.fragmentModule = variant.module;
        this.samplerOriginVariantKey = key;
    }
}
