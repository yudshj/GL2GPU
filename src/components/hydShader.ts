import {
    InitShaderInfoType,
} from "./shaderDB";
import { ShaderTranslator } from "./shaderTranslator";

// @ts-ignore
window.hydTmp = new Set();

export class HydShader {
    private shaderTranslator: ShaderTranslator;
    // public shader: string;
    public glsl_shader: string = "";
    public compiled_glsl_shader: string = "";
    public shader_info: InitShaderInfoType;
    public translated_glsl_shader: string = "";
    public infoLog: string = "";
    public validationShader: WebGLShader | null = null;
    public validationContext: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    public readonly ownerToken: object;
    private device: GPUDevice;
    public deleted: boolean = false;
    public destroyed: boolean = false;
    public attachmentCount: number = 0;
    public compiled: boolean = false;
    public type: GLenum;
    public readonly webglVersion: 1 | 2;
    public sourceLength: number = 0;

    static errorShaderCount: number = 0;

    constructor(device: GPUDevice, target: GLenum, shaderTranslator: ShaderTranslator, ownerToken?: object, webglVersion: 1 | 2 = 1) {
        this.type = target;
        this.webglVersion = webglVersion;
        this.device = device;
        this.shaderTranslator = shaderTranslator;
        this.ownerToken = ownerToken;
    }

    public compileShader() {
        this.compiled_glsl_shader = this.glsl_shader;
        this.shader_info = this.shaderTranslator.inspectShader(this.type, this.glsl_shader);
        if (!this.shader_info.wgsl) {
            console.warn("[HYD] shader WGSL deferred to runtime translator.");
        }
    }
}
