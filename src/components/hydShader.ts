import {
    InitShaderInfoType,
    hydTrim,
    // shaderMap_legacy,
} from "./shaderDB";

// @ts-ignore
window.hydTmp = new Set();

// export class HydShader {
//     // public shader: string;
//     public glsl_shader: string;
//     public shader_info: InitShaderInfoType;
//     public translated_glsl_shader: string;
//     private device: GPUDevice;
//     public deleted: boolean = false;
//     public compiled: boolean = false;
//     public type: GLenum;
//     public sourceLength: number;

//     static errorShaderCount: number = 0;

//     constructor(device: GPUDevice, target: GLenum) {
//         this.type = target;
//         this.device = device;
//         // Object.setPrototypeOf(this, WebGLShader.prototype);
//     }

//     public compileShader() {
//         this.shader_info = shaderMap_legacy.get(hydTrim(this.glsl_shader));
//         if (!this.shader_info) {
//             console.warn(this.glsl_shader);
//             console.warn("DEBUG ONLY, DONOT USE THIS!!", this.translated_glsl_shader);
//             // @ts-ignore
//             window.hydTmp.add(this.glsl_shader);
//             HydShader.errorShaderCount++;
//             throw new Error("Shader not found in shaderDB. Total error count: " + HydShader.errorShaderCount);
//         }
//         this.compiled = true;
//     }
// }

export class HydShader {
    private shaderMap: Map<string, InitShaderInfoType>;
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

    constructor(device: GPUDevice, target: GLenum, shaderMap: Map<string, InitShaderInfoType>) {
        this.type = target;
        this.device = device;
        this.shaderMap = shaderMap;
    }

    // 生成了shader info
    // {
    //     "attributes": [
    //         {
    //             "name": "position",
    //             "glsl_type": "vec4",
    //             "wgsl_type": "vec4<f32>"
    //         },
    //         {
    //             "name": "texCoord",
    //             "glsl_type": "vec2",
    //             "wgsl_type": "vec2<f32>"
    //         }
    //     ],
    //     "uniforms": [
    //         {
    //             "name": "world",
    //             "glsl_type": "mat4",
    //             "wgsl_type": "mat4x4<f32>"
    //         },
    //         {
    //             "name": "viewProjection",
    //             "glsl_type": "mat4",
    //             "wgsl_type": "mat4x4<f32>"
    //         }
    //     ],
    //     "samplers": [],
    //     "glsl": "attribute vec4 position;\nattribute vec2 texCoord;\nvarying vec2 v_texCoord;\nuniform mat4 world;\nuniform mat4 viewProjection;\nvoid main() {\n  v_texCoord = texCoord;\n  gl_Position = (viewProjection * world * position);\n}",
    //     "wgsl": "// struct Uniforms {\n//     world : mat4x4<f32>,\n//     viewProjection : mat4x4<f32>,\n//     colorMult : vec4<f32>,\n// };\n// @group(0) @binding(0) var<uniform> _hyd_uniforms_ : Uniforms;\n\nstruct VertexOutput {\n    @builtin(position) gl_Position: vec4<f32>,\n    @location(0) v_texCoord: vec2<f32>,\n}\n\n@vertex\nfn main(\n    @location(0) position : vec4<f32>,\n    @location(1) texCoord : vec2<f32>,\n) -> VertexOutput {\n    var v_texCoord = texCoord;\n    var gl_Position = _hyd_uniforms_.viewProjection * _hyd_uniforms_.world * position;\n    return VertexOutput(\n        gl_Position,\n        v_texCoord\n    );\n}\n",
    //     "debug_info": "{\"glsl_path\": \"aquarium/src/1.glsl\", \"wgsl_path\": \"aquarium/src/1.wgsl\"}"
    // }
    public compileShader() {
        // TODO: 从tint生成的WGSL代码中分析得到ShaderInfo
        this.shader_info = this.shaderMap.get(hydTrim(this.glsl_shader));
        if (!this.shader_info) {
            console.warn(this.glsl_shader);
            console.warn("DEBUG ONLY, DONOT USE THIS!!", this.translated_glsl_shader);
            // @ts-ignore
            window.hydTmp.add(this.glsl_shader);
            HydShader.errorShaderCount++;
            throw new Error("Shader not found in shaderDB. Total error count: " + HydShader.errorShaderCount);
        }
        this.compiled = true;
    }
}