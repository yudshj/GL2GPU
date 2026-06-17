import {
    InitShaderInfoType,
} from "./shaderDB";
import { ShaderTranslator } from "./shaderTranslator";

// @ts-ignore
window.hydTmp = new Set();

export class HydShader {
    private shaderTranslator: ShaderTranslator;
    // public shader: string;
    public glsl_shader: string;
    public shader_info: InitShaderInfoType;
    public translated_glsl_shader: string;
    private device: GPUDevice;
    public deleted: boolean = false;
    public compiled: boolean = false;
    public type: GLenum;
    public sourceLength: number;

    static errorShaderCount: number = 0;

    constructor(device: GPUDevice, target: GLenum, shaderTranslator: ShaderTranslator) {
        this.type = target;
        this.device = device;
        this.shaderTranslator = shaderTranslator;
    }

    public compileShader() {
        this.shader_info = this.shaderTranslator.inspectShader(this.type, this.glsl_shader);
        if (!this.shader_info.wgsl) {
            console.warn("[HYD] shader WGSL deferred to runtime translator.");
        }
        this.compiled = true;
    }
}
