import fastHashCode from 'fast-hash-code';

import {HydShader} from "./hydShader";
import {MergeShaderInfo, ShaderInfo2HydAus, ShaderInfo2String, hydTrim} from "./shaderDB";
import { HydHashable } from './base/hydHashable';

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

    constructor(name: string, type: GLenum, size: GLsizei) {
        this.name = name;
        this.size = size;
        this.webgl_type = type;
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
        return this._hash;
    }
    private vertexShader: HydShader;
    private fragmentShader: HydShader;
    public vertexModule: GPUShaderModule;
    public fragmentModule: GPUShaderModule;
    private readonly device: GPUDevice;

    public deleted: boolean = false;
    public linked: boolean = false;

    public hydAttributes: Array<ProgramAttribute> = [];
    public hydUniforms: Array<ProgramUniformBuffer> = [];
    public hydSamplers: Array<ProgramUniformSampler> = [];
    
    // public uniformMergedBuffer: Uint8Array;
    // public uniformArrayBufferView: DataView;

    public activeUniform: Uint8Array;
    // // public uniformTempBufferFloat32: Float32Array;
    // // public uniformTempBufferUint32: Uint32Array;
    // // public uniformTempBufferInt32: Int32Array;

    // public uniformGPUBuffer: GPUBuffer;
    // public uniformOffset: number = 0;
    // public uniformBufferLength: number;
    public alignedUniformSize: number;
    // private uniformToFlush: number;

    constructor(device: GPUDevice) {
        this.device = device;
    }

    public write_uniform_i(dstOffset: number, num: number, value: ArrayLike<number>) {
        // const dstSize = uniform.byteLength;
        // const dstUniformOffset = this.uniformOffset;

        for (let i = 0; i < num; i++) {
            this.uniformArrayBufferTempView.setInt32(dstOffset + i * 4, value[i], true);
        }
        // this.commonState.currentthis.uniformTempBufferInt32.set(value, uniform.offset / 4);
    }

    public write_uniform_f(dstOffset: number, num: number, value: ArrayLike<number>) {
        // const dstSize = uniform.byteLength;
        // const dstUniformOffset = this.uniformWrite * this.uniformBufferLengthAligned;

        for (let i = 0; i < num; i++) {
            this.uniformArrayBufferTempView.setFloat32(dstOffset + i * 4, value[i], true);
        }
        // this.commonState.currentthis.uniformTempBufferFloat32.set(value, uniform.offset / 4);
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

    public linkProgram() {
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
        const code = ShaderInfo2String(mergedShaderInfo);
        if (this.vertexShader) {
            const vs = code + this.vertexShader.shader_info.wgsl;
            console.debug('[HYD] linkProgram vertex:\n\n', vs);
            this.vertexModule = this.device.createShaderModule({code: vs, label: fastHashCode(vs).toString()});
            this._hash += this.vertexModule.label + '|';
        }
        if (this.fragmentShader) {
            const fs = code + this.fragmentShader.shader_info.wgsl;
            console.debug('[HYD] linkProgram fragment:\n\n', fs);
            this.fragmentModule = this.device.createShaderModule({code: fs, label: fastHashCode(fs).toString()});
            this._hash += this.fragmentModule.label + '|';
        }
        const aus = ShaderInfo2HydAus(mergedShaderInfo);
        this.hydAttributes = aus.attributes;
        this.hydUniforms = aus.uniforms;
        this.hydSamplers = aus.samplers;

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
        // this.uniformTempBufferFloat32 = new Float32Array(this.uniformTempBufferUint8.buffer);
        // this.uniformTempBufferUint32 = new Uint32Array(this.uniformTempBufferUint8.buffer);
        // this.uniformTempBufferInt32 = new Int32Array(this.uniformTempBufferUint8.buffer);

        this.uniformArrayBufferTempView = new DataView(this.activeUniform.buffer);
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
}