// import {HydSampler} from "./hydSampler";
import { ProgramAttribute, ProgramUniformBuffer, ProgramUniformSampler } from "./hydProgram";
// import shaderInfo from "./shaders/shaders_info.json";
// export const shaderMap_legacy: Map<string, InitShaderInfoType> = new Map(
//     shaderInfo.map((info) => {
//         return [
//             hydTrim(info.glsl),
//             info
//         ];
//     })
// );

export function hydTrim(s: string) {
    return s.trim().replace(/\r\n/g, "\n");
}

interface NameAndType {
    name: string;
    glsl_type: string;
    wgsl_type: string;
}

interface TextureNameAndType {
    name: string;
    glsl_type: string;
    wgsl_texture_type: string;
    wgsl_sampler_type: string;
}

export interface ShaderInfoType {
    uniforms: Array<NameAndType>;
    attributes: Array<NameAndType>;
    samplers: Array<TextureNameAndType>;
}

export interface InitShaderInfoType {
    uniforms: Array<NameAndType>;
    attributes: Array<NameAndType>;
    samplers: Array<TextureNameAndType>;
    wgsl: string;
    glsl: string;
    debug_info: string;
}

const Type2Constant: Map<string, number> = new Map([
    ["float", WebGL2RenderingContext.FLOAT],
    ["vec2", WebGL2RenderingContext.FLOAT_VEC2],
    ["vec3", WebGL2RenderingContext.FLOAT_VEC3],
    ["vec4", WebGL2RenderingContext.FLOAT_VEC4],
    ["mat2", WebGL2RenderingContext.FLOAT_MAT2],
    ["mat3", WebGL2RenderingContext.FLOAT_MAT3],
    ["mat4", WebGL2RenderingContext.FLOAT_MAT4],
    ["sampler2D", WebGL2RenderingContext.SAMPLER_2D],
    ["samplerCube", WebGL2RenderingContext.SAMPLER_CUBE],
]);

export function MergeShaderInfo(shaderInfo: Array<ShaderInfoType | InitShaderInfoType>): ShaderInfoType {
    let uniformMap: Map<string, NameAndType> = new Map();    // (name: type), throw error when type conflict
    let shaderMap: Map<string, TextureNameAndType> = new Map();     // (name: type), throw error when type conflict
    for (const info of shaderInfo) {
        for (const uniform of info.uniforms) {
            if (uniformMap.has(uniform.name)) {
                if (uniformMap.get(uniform.name).glsl_type !== uniform.glsl_type) {
                    throw new Error(`uniform ${uniform.name} type conflict`);
                }
            } else {
                uniformMap.set(uniform.name, uniform);
            }
        }
        for (const sampler of info.samplers) {
            if (shaderMap.has(sampler.name)) {
                if (shaderMap.get(sampler.name).glsl_type !== sampler.glsl_type) {
                    throw new Error(`sampler ${sampler.name} type conflict`);
                }
            } else {
                shaderMap.set(sampler.name, sampler);
            }
        }
    }
    return {
        attributes: shaderInfo[0].attributes,
        uniforms: Array.from(uniformMap).map((pair) => pair[1]),
        samplers: Array.from(shaderMap).map((pair) => pair[1]),
    };
}

export function ShaderInfo2HydAus(shaderInfo: ShaderInfoType): { attributes: Array<ProgramAttribute>, uniforms: Array<ProgramUniformBuffer>, samplers: Array<ProgramUniformSampler> } {
    //     [hydTrim(test3RenderWGSLVert), {
    //         attributes: [
    //             { name: 'vertexPosition', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
    //             { name: 'vertexNormal', location: 1, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
    //             { name: 'vertexColor', location: 2, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
    //         ],
    //         uniforms: [
    //             new ProgramUniformBuffer('modelView', WebGL2RenderingContext.FLOAT_MAT4, 1),
    //             new ProgramUniformBuffer('lightProjection', WebGL2RenderingContext.FLOAT_MAT4, 1),
    //             new ProgramUniformBuffer('cameraProjection', WebGL2RenderingContext.FLOAT_MAT4, 1),
    //         ],
    //         samplers: [
    //             new ProgramUniformSampler('shadowMap', true, 'depth', '2d'),
    //         ],
    //     }
    return {
        attributes: shaderInfo.attributes.map((attr, idx) => {
            return {
                name: attr.name,
                location: idx,
                type: Type2Constant.get(attr.glsl_type),
                size: 1,
            };
        }),
        uniforms: shaderInfo.uniforms.map((uniform) => {
            return new ProgramUniformBuffer(uniform.name, Type2Constant.get(uniform.glsl_type), 1);
        }),
        samplers: shaderInfo.samplers.map((sampler) => {
            // switch (sampler.glsl_type) {
            //     case "sampler2D":
            //         return new ProgramUniformSampler(sampler.name, WebGL2RenderingContext.SAMPLER_2D, false, "float", "2d");
            //     case "samplerCube":
            //         return new ProgramUniformSampler(sampler.name, WebGL2RenderingContext.SAMPLER_CUBE, false, "float", "cube");
            //     default:
            //         throw new Error(`unknown sampler type ${sampler.glsl_type}`);
            // }
            switch (sampler.wgsl_texture_type) {
                case "texture_2d<f32>":
                    return new ProgramUniformSampler(sampler.name, WebGL2RenderingContext.SAMPLER_2D, "2d");
                case "texture_cube<f32>":
                    return new ProgramUniformSampler(sampler.name, WebGL2RenderingContext.SAMPLER_CUBE, "cube");
                default:
                    throw new Error(`unknown sampler type ${sampler.wgsl_texture_type}`);
            }
        }),
    };
}

export function ShaderInfo2String(shaderInfo: ShaderInfoType): string {
    let res = "";
    let offset = 0;
    if (shaderInfo.uniforms.length > 0) {
        res += "struct HydUniformObject {\n";
        for (const uniform of shaderInfo.uniforms) {
            res += `  ${uniform.name}: ${uniform.wgsl_type},\n`;
        }
        res += "};\n\n";
        res += "@binding(0) @group(0) var<uniform> _hyd_uniforms_ : HydUniformObject;\n\n";
        offset = 1;
    }
    for (let i = 0; i < shaderInfo.samplers.length; i++) {
        const sampler = shaderInfo.samplers[i];
        res += `@binding(${i * 2 + offset + 0}) @group(0) var ${sampler.name}S: ${sampler.wgsl_sampler_type};\n`;
        res += `@binding(${i * 2 + offset + 1}) @group(0) var ${sampler.name}T: ${sampler.wgsl_texture_type};\n`;
    }
    return res;
}

// aquariumInfo: Array<ShaderInfoType>



// ----------------- aquarium -----------------

// import test10VertWgsl from "./shaders/test10/a.wgsl";
// import test10FragWgsl from "./shaders/test10/b.wgsl";
// import test10VertGlsl from "./shaders/test10/a.glsl";
// import test10FragGlsl from "./shaders/test10/b.glsl";
// import test1GLSLVert from "./shaders/test1/test1.vs";
// import test1GLSLFrag from "./shaders/test1/test1.fs";
// import test1WGSLVert from "./shaders/test1/test1Vert.wgsl";
// import test1WGSLFrag from "./shaders/test1/test1Frag.wgsl";

// import test3RenderGLSLVert from "./shaders/vsTest3/glsl/render.vert.glsl";
// import test3RenderGLSLFrag from "./shaders/vsTest3/glsl/render.frag.glsl";
// import test3RenderWGSLVert from "./shaders/vsTest3/wgsl/render.vert.wgsl";
// import test3RenderWGSLFrag from "./shaders/vsTest3/wgsl/render.frag.wgsl";
// import test3ShadowGLSLVert from "./shaders/vsTest3/glsl/shadow.vert.glsl";
// import test3ShadowGLSLFrag from "./shaders/vsTest3/glsl/shadow.frag.glsl";
// import test3ShadowWGSLVert from "./shaders/vsTest3/wgsl/shadow.vert.wgsl";
// import test3ShadowWGSLFrag from "./shaders/vsTest3/wgsl/shadow.frag.wgsl";

// import test2GLSLVert from "./shaders/vsTest2/gl_shader.vert.glsl";
// import test2GLSLFrag from "./shaders/vsTest2/gl_shader.frag.glsl";
// import test2WGSLVert from "./shaders/vsTest2/vert.wgsl";
// import test2WGSLFrag from "./shaders/vsTest2/frag.wgsl";

// import test11GLSLVert from "./shaders/test11/vert.glsl";
// import test11GLSLFrag from "./shaders/test11/frag.glsl";
// import test11WGSLVert from "./shaders/test11/vert.wgsl";
// import test11WGSLFrag from "./shaders/test11/frag.wgsl";

// import test20GLSLVert from "./shaders/test20/vert.glsl";
// import test20GLSLFrag from "./shaders/test20/frag.glsl";
// import test20WGSLVert from "./shaders/test20/vert.wgsl";
// import test20WGSLFrag from "./shaders/test20/frag.wgsl";

// import threejs1GLSLVert from "./shaders/threejs1/a.vert.glsl";
// import threejs1WGSLVert from "./shaders/threejs1/a.vert.wgsl";
// import threejs1GLSLFrag from "./shaders/threejs1/b.frag.glsl";
// import threejs1WGSLFrag from "./shaders/threejs1/b.frag.wgsl";

// import test3GLSLVert from "./shaders/test3/a.vert.glsl";
// import test3WGSLVert from "./shaders/test3/a.vert.wgsl";
// import test3GLSLFrag from "./shaders/test3/b.frag.glsl";
// import test3WGSLFrag from "./shaders/test3/b.frag.wgsl";
// import { GPUFS1 } from "./shaders/tmp/test1_frag_wgsl";
// import { GPUVS1 } from "./shaders/tmp/test1_vert_wgsl";
// import {
//     GLFS0,
//     GLFS1,
//     GLFS4,
//     GLFS5,
//     GLFS7,
//     GLVS0,
//     GLVS1,
//     GLVS4,
//     GLVS5,
//     GLVS7,
//     GPUFS0,
//     GPUFS4,
//     GPUFS5,
//     GPUFS7,
//     GPUVS0,
//     GPUVS4,
//     GPUVS5,
//     GPUVS7
// } from "./shaders/tmp/test147";

// import luic_a_frag_glsl from "./shaders/luic-benchmark/a.frag.glsl";
// import luic_a_frag_wgsl from "./shaders/luic-benchmark/a.frag.wgsl";
// import luic_b_vert_glsl from "./shaders/luic-benchmark/b.vert.glsl";
// import luic_b_vert_wgsl from "./shaders/luic-benchmark/b.vert.wgsl";
// import luic_c_frag_glsl from "./shaders/luic-benchmark/c.frag.glsl";
// import luic_c_frag_wgsl from "./shaders/luic-benchmark/c.frag.wgsl";
// import luic_d_vert_glsl from "./shaders/luic-benchmark/d.vert.glsl";
// import luic_d_vert_wgsl from "./shaders/luic-benchmark/d.vert.wgsl";
// import luic_e_frag_glsl from "./shaders/luic-benchmark/e.frag.glsl";
// import luic_e_frag_wgsl from "./shaders/luic-benchmark/e.frag.wgsl";
// import luic_f_vert_glsl from "./shaders/luic-benchmark/f.vert.glsl";
// import luic_f_vert_wgsl from "./shaders/luic-benchmark/f.vert.wgsl";

// import aquarium_1_glsl from "./shaders/aquarium/1.glsl";
// import aquarium_1_wgsl from "./shaders/aquarium/1.wgsl";
// import aquarium_2_glsl from "./shaders/aquarium/2.glsl";
// import aquarium_2_wgsl from "./shaders/aquarium/2.wgsl";
// import aquarium_3_glsl from "./shaders/aquarium/3.glsl";
// import aquarium_3_wgsl from "./shaders/aquarium/3.wgsl";
// import aquarium_4_glsl from "./shaders/aquarium/4.glsl";
// import aquarium_4_wgsl from "./shaders/aquarium/4.wgsl";
// import aquarium_5_glsl from "./shaders/aquarium/5.glsl";
// import aquarium_5_wgsl from "./shaders/aquarium/5.wgsl";
// import aquarium_6_glsl from "./shaders/aquarium/6.glsl";
// import aquarium_6_wgsl from "./shaders/aquarium/6.wgsl";
// import aquarium_7_glsl from "./shaders/aquarium/7.glsl";
// import aquarium_7_wgsl from "./shaders/aquarium/7.wgsl";
// import aquarium_8_glsl from "./shaders/aquarium/8.glsl";
// import aquarium_8_wgsl from "./shaders/aquarium/8.wgsl";
// import aquarium_9_glsl from "./shaders/aquarium/9.glsl";
// import aquarium_9_wgsl from "./shaders/aquarium/9.wgsl";
// import aquarium_10_glsl from "./shaders/aquarium/10.glsl";
// import aquarium_10_wgsl from "./shaders/aquarium/10.wgsl";
// import aquarium_11_glsl from "./shaders/aquarium/11.glsl";
// import aquarium_11_wgsl from "./shaders/aquarium/11.wgsl";
// import aquarium_12_glsl from "./shaders/aquarium/12.glsl";
// import aquarium_12_wgsl from "./shaders/aquarium/12.wgsl";
// import aquarium_13_glsl from "./shaders/aquarium/13.glsl";
// import aquarium_13_wgsl from "./shaders/aquarium/13.wgsl";
// import aquarium_14_glsl from "./shaders/aquarium/14.glsl";
// import aquarium_14_wgsl from "./shaders/aquarium/14.wgsl";
// import aquarium_15_glsl from "./shaders/aquarium/15.glsl";
// import aquarium_15_wgsl from "./shaders/aquarium/15.wgsl";
// import aquarium_16_glsl from "./shaders/aquarium/16.glsl";
// import aquarium_16_wgsl from "./shaders/aquarium/16.wgsl";
// import aquarium_17_glsl from "./shaders/aquarium/17.glsl";
// import aquarium_17_wgsl from "./shaders/aquarium/17.wgsl";
// import aquarium_18_glsl from "./shaders/aquarium/18.glsl";
// import aquarium_18_wgsl from "./shaders/aquarium/18.wgsl";

// import aquarium_19_glsl from "./shaders/aquarium/19.glsl";
// import aquarium_19_wgsl from "./shaders/aquarium/19.wgsl";
// import aquarium_20_glsl from "./shaders/aquarium/20.glsl";
// import aquarium_20_wgsl from "./shaders/aquarium/20.wgsl";
// import aquarium_21_glsl from "./shaders/aquarium/21.glsl";
// import aquarium_21_wgsl from "./shaders/aquarium/21.wgsl";
// import aquarium_22_glsl from "./shaders/aquarium/22.glsl";
// import aquarium_22_wgsl from "./shaders/aquarium/22.wgsl";
// import aquarium_23_glsl from "./shaders/aquarium/23.glsl";
// import aquarium_23_wgsl from "./shaders/aquarium/23.wgsl";


// export const shaderMap: Map<string, string> = new Map([
//     [hydTrim(aquarium_1_glsl), hydTrim(aquarium_1_wgsl)],
//     [hydTrim(aquarium_2_glsl), hydTrim(aquarium_2_wgsl)],
//     [hydTrim(aquarium_3_glsl), hydTrim(aquarium_3_wgsl)],
//     [hydTrim(aquarium_4_glsl), hydTrim(aquarium_4_wgsl)],
//     [hydTrim(aquarium_5_glsl), hydTrim(aquarium_5_wgsl)],
//     [hydTrim(aquarium_6_glsl), hydTrim(aquarium_6_wgsl)],
//     [hydTrim(aquarium_7_glsl), hydTrim(aquarium_7_wgsl)],
//     [hydTrim(aquarium_8_glsl), hydTrim(aquarium_8_wgsl)],
//     [hydTrim(aquarium_9_glsl), hydTrim(aquarium_9_wgsl)],
//     [hydTrim(aquarium_10_glsl), hydTrim(aquarium_10_wgsl)],
//     [hydTrim(aquarium_11_glsl), hydTrim(aquarium_11_wgsl)],
//     [hydTrim(aquarium_12_glsl), hydTrim(aquarium_12_wgsl)],
//     [hydTrim(aquarium_13_glsl), hydTrim(aquarium_13_wgsl)],
//     [hydTrim(aquarium_14_glsl), hydTrim(aquarium_14_wgsl)],
//     [hydTrim(aquarium_15_glsl), hydTrim(aquarium_15_wgsl)],
//     [hydTrim(aquarium_16_glsl), hydTrim(aquarium_16_wgsl)],
//     [hydTrim(aquarium_17_glsl), hydTrim(aquarium_17_wgsl)],
//     [hydTrim(aquarium_18_glsl), hydTrim(aquarium_18_wgsl)],
//     [hydTrim(aquarium_19_glsl), hydTrim(aquarium_19_wgsl)],
//     [hydTrim(aquarium_20_glsl), hydTrim(aquarium_20_wgsl)],
//     [hydTrim(aquarium_21_glsl), hydTrim(aquarium_21_wgsl)],
//     [hydTrim(aquarium_22_glsl), hydTrim(aquarium_22_wgsl)],
//     [hydTrim(aquarium_23_glsl), hydTrim(aquarium_23_wgsl)],

//     [hydTrim(test3RenderGLSLVert), hydTrim(test3RenderWGSLVert)],
//     [hydTrim(test3RenderGLSLFrag), hydTrim(test3RenderWGSLFrag)],
//     [hydTrim(test3ShadowGLSLVert), hydTrim(test3ShadowWGSLVert)],
//     [hydTrim(test3ShadowGLSLFrag), hydTrim(test3ShadowWGSLFrag)],
//     [hydTrim(GLVS7), hydTrim(GPUVS7)],
//     [hydTrim(GLFS7), hydTrim(GPUFS7)],
//     [hydTrim(test3GLSLVert), hydTrim(test3WGSLVert)],
//     [hydTrim(test3GLSLFrag), hydTrim(test3WGSLFrag)],
//     [hydTrim(GLVS0), hydTrim(GPUVS0)],
//     [hydTrim(GLFS0), hydTrim(GPUFS0)],
//     [hydTrim(GLVS5), hydTrim(GPUVS5)],
//     [hydTrim(GLFS5), hydTrim(GPUFS5)],
//     [hydTrim(GLVS4), hydTrim(GPUVS4)],
//     [hydTrim(GLFS4), hydTrim(GPUFS4)],
//     [hydTrim(GLVS1), hydTrim(GPUVS1)],
//     [hydTrim(GLFS1), hydTrim(GPUFS1)],
//     [hydTrim(test10VertGlsl), hydTrim(test10VertWgsl)],
//     [hydTrim(test10FragGlsl), hydTrim(test10FragWgsl)],
//     [hydTrim(test1GLSLVert), hydTrim(test1WGSLVert)],
//     [hydTrim(test1GLSLFrag), hydTrim(test1WGSLFrag)],
//     [hydTrim(test2GLSLVert), hydTrim(test2WGSLVert)],
//     [hydTrim(test2GLSLFrag), hydTrim(test2WGSLFrag)],
//     [hydTrim(test11GLSLVert), hydTrim(test11WGSLVert)],
//     [hydTrim(test11GLSLFrag), hydTrim(test11WGSLFrag)],
//     [hydTrim(test20GLSLVert), hydTrim(test20WGSLVert)],
//     [hydTrim(test20GLSLFrag), hydTrim(test20WGSLFrag)],
//     [hydTrim(threejs1GLSLVert), hydTrim(threejs1WGSLVert)],
//     [hydTrim(threejs1GLSLFrag), hydTrim(threejs1WGSLFrag)],
//     [hydTrim(luic_a_frag_glsl), hydTrim(luic_a_frag_wgsl)],
//     [hydTrim(luic_b_vert_glsl), hydTrim(luic_b_vert_wgsl)],
//     [hydTrim(luic_c_frag_glsl), hydTrim(luic_c_frag_wgsl)],
//     [hydTrim(luic_d_vert_glsl), hydTrim(luic_d_vert_wgsl)],
//     [hydTrim(luic_e_frag_glsl), hydTrim(luic_e_frag_wgsl)],
//     [hydTrim(luic_f_vert_glsl), hydTrim(luic_f_vert_wgsl)],
// ]);
// export const bindingMap = new Map<string, {
//     attributes: ProgramAttribute[];
//     uniforms: Array<ProgramUniformBuffer>;
//     samplers: Array<ProgramUniformSampler>;
// }>([
//     [
//         hydTrim(aquarium_6_wgsl) + hydTrim(aquarium_5_wgsl), {
//             attributes: [
//                 { name: 'uvLifeTimeFrameStart', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'positionStartTime', location: 1, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'velocityStartSize', location: 2, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'accelerationEndSize', location: 3, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'spinStartSpinSpeed', location: 4, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'colorMult', location: 5, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//             ],
//             uniforms: [
//                 new ProgramUniformBuffer('viewProjection', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('world', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('viewInverse', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('worldVelocity', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('worldAcceleration', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('timeRange', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('time', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('timeOffset', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('frameDuration', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('numFrames', WebGL2RenderingContext.FLOAT, 1),
//             ],
//             samplers: [
//                 new ProgramUniformSampler('rampSampler', false, "float", "2d"),
//                 new ProgramUniformSampler('colorSampler', false, "float", "2d"),
//             ],
//         }
//     ],
//     [
//         hydTrim(aquarium_4_wgsl) + hydTrim(aquarium_5_wgsl), {
//             attributes: [
//                 { name: 'uvLifeTimeFrameStart', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'positionStartTime', location: 1, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'velocityStartSize', location: 2, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'accelerationEndSize', location: 3, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'spinStartSpinSpeed', location: 4, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'orientation', location: 5, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'colorMult', location: 6, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//             ],
//             uniforms: [
//                 new ProgramUniformBuffer('world', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('viewProjection', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('worldVelocity', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('worldAcceleration', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('timeRange', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('time', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('timeOffset', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('frameDuration', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('numFrames', WebGL2RenderingContext.FLOAT, 1),
//             ],
//             samplers: [
//                 new ProgramUniformSampler('rampSampler', false, "float", "2d"),
//                 new ProgramUniformSampler('colorSampler', false, "float", "2d"),
//             ],
//         }
//     ],
//     [
//         hydTrim(aquarium_9_wgsl) + hydTrim(aquarium_14_wgsl), {
//             attributes: [
//                 { name: 'position', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'normal', location: 1, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'texCoord', location: 2, type: WebGL2RenderingContext.FLOAT_VEC2, size: 1 },
//                 { name: 'tangent', location: 3, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'binormal', location: 4, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//             ],
//             uniforms: [
//                 new ProgramUniformBuffer('viewProjection', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('lightWorldPos', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('world', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('viewInverse', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('worldInverseTranspose', WebGL2RenderingContext.FLOAT_MAT4, 1),
//             ],
//             samplers: [
//                 new ProgramUniformSampler('diffuse', false, "float", "2d"),
//                 new ProgramUniformSampler('reflectionMap', false, "float", "2d"),
//                 new ProgramUniformSampler('skybox', false, "float", "cube"),
//             ],
//         }
//     ],
//     [
//         hydTrim(aquarium_9_wgsl) + hydTrim(aquarium_18_wgsl), {
//             attributes: [
//                 { name: 'position', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'normal', location: 1, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'texCoord', location: 2, type: WebGL2RenderingContext.FLOAT_VEC2, size: 1 },
//                 { name: 'tangent', location: 3, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'binormal', location: 4, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//             ],
//             uniforms: [
//                 new ProgramUniformBuffer('viewProjection', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('lightWorldPos', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('world', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('viewInverse', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('worldInverseTranspose', WebGL2RenderingContext.FLOAT_MAT4, 1),
//             ],
//             samplers: [
//                 new ProgramUniformSampler('diffuse', false, "float", "2d"),
//                 new ProgramUniformSampler('reflectionMap', false, "float", "2d"),
//                 new ProgramUniformSampler('skybox', false, "float", "cube"),
//             ],
//         }
//     ],
//     [
//         hydTrim(aquarium_9_wgsl) + hydTrim(aquarium_22_wgsl), {
//             attributes: [
//                 { name: 'position', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'normal', location: 1, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'texCoord', location: 2, type: WebGL2RenderingContext.FLOAT_VEC2, size: 1 },
//                 { name: 'tangent', location: 3, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'binormal', location: 4, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//             ],
//             uniforms: [
//                 new ProgramUniformBuffer('viewProjection', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('lightWorldPos', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('world', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('viewInverse', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('worldInverseTranspose', WebGL2RenderingContext.FLOAT_MAT4, 1),
//             ],
//             samplers: [
//                 new ProgramUniformSampler('diffuse', false, "float", "2d"),
//                 new ProgramUniformSampler('normal', false, "float", "2d"),
//                 new ProgramUniformSampler('reflectionMap', false, "float", "2d"),
//                 new ProgramUniformSampler('skybox', false, "float", "cube"),
//             ],
//         }
//     ],
//     [
//         hydTrim(aquarium_9_wgsl) + hydTrim(aquarium_23_wgsl), {
//             attributes: [
//                 { name: 'position', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'normal', location: 1, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'texCoord', location: 2, type: WebGL2RenderingContext.FLOAT_VEC2, size: 1 },
//                 { name: 'tangent', location: 3, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'binormal', location: 4, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//             ],
//             uniforms: [
//                 new ProgramUniformBuffer('viewProjection', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('lightWorldPos', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('world', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('viewInverse', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('worldInverseTranspose', WebGL2RenderingContext.FLOAT_MAT4, 1),
//             ],
//             samplers: [
//                 new ProgramUniformSampler('diffuse', false, "float", "2d"),
//                 new ProgramUniformSampler('normal', false, "float", "2d"),
//                 new ProgramUniformSampler('reflectionMap', false, "float", "2d"),
//                 new ProgramUniformSampler('skybox', false, "float", "cube"),
//             ],
//         }
//     ],
//     [
//         hydTrim(aquarium_1_wgsl) + hydTrim(aquarium_3_wgsl), {
//             attributes: [
//                 { name: 'position', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'texCoord', location: 1, type: WebGL2RenderingContext.FLOAT_VEC2, size: 1 },
//             ],
//             uniforms: [
//                 new ProgramUniformBuffer('world', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('viewProjection', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('colorMult', WebGL2RenderingContext.FLOAT_VEC4, 1),
//             ],
//             samplers: [
//                 new ProgramUniformSampler('colorMap', false, "float", "2d"),
//             ],
//         },
//     ],
//     [
//         hydTrim(aquarium_11_wgsl) + hydTrim(aquarium_15_wgsl), {
//             attributes: [
//                 { name: 'position', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'normal', location: 1, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'texCoord', location: 2, type: WebGL2RenderingContext.FLOAT_VEC2, size: 1 },
//             ],
//             uniforms: [
//                 new ProgramUniformBuffer('viewProjection', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('lightWorldPos', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('world', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('viewInverse', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('worldInverseTranspose', WebGL2RenderingContext.FLOAT_MAT4, 1),
//             ],
//             samplers: [
//                 new ProgramUniformSampler('diffuse', false, "float", "2d"),
//             ],
//         }
//     ],
//     [
//         hydTrim(aquarium_11_wgsl) + hydTrim(aquarium_17_wgsl), {
//             attributes: [
//                 { name: 'position', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'normal', location: 1, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'texCoord', location: 2, type: WebGL2RenderingContext.FLOAT_VEC2, size: 1 },
//             ],
//             uniforms: [
//                 new ProgramUniformBuffer('viewProjection', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('lightWorldPos', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('world', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('viewInverse', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('worldInverseTranspose', WebGL2RenderingContext.FLOAT_MAT4, 1),
//             ],
//             samplers: [
//                 new ProgramUniformSampler('diffuse', false, "float", "2d"),

//             ],
//         }
//     ],
//     [
//         hydTrim(aquarium_10_wgsl) + hydTrim(aquarium_13_wgsl), {
//             attributes: [
//                 { name: 'position', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'normal', location: 1, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'texCoord', location: 2, type: WebGL2RenderingContext.FLOAT_VEC2, size: 1 },
//                 { name: 'tangent', location: 3, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'binormal', location: 4, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//             ],
//             uniforms: [
//                 new ProgramUniformBuffer('viewProjection', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('lightWorldPos', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('world', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('viewInverse', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('worldInverseTranspose', WebGL2RenderingContext.FLOAT_MAT4, 1),
//             ],
//             samplers: [
//                 new ProgramUniformSampler('diffuse', false, "float", "2d"),
//             ],
//         }
//     ],
//     [
//         hydTrim(aquarium_10_wgsl) + hydTrim(aquarium_21_wgsl), {
//             attributes: [
//                 { name: 'position', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'normal', location: 1, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'texCoord', location: 2, type: WebGL2RenderingContext.FLOAT_VEC2, size: 1 },
//                 { name: 'tangent', location: 3, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'binormal', location: 4, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//             ],
//             uniforms: [
//                 new ProgramUniformBuffer('viewProjection', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('lightWorldPos', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('world', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('viewInverse', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('worldInverseTranspose', WebGL2RenderingContext.FLOAT_MAT4, 1),
//             ],
//             samplers: [
//                 new ProgramUniformSampler('diffuse', false, "float", "2d"),
//                 new ProgramUniformSampler('normalMap', false, "float", "2d"),
//             ],
//         }
//     ],
//     [
//         hydTrim(aquarium_2_wgsl) + hydTrim(aquarium_7_wgsl), {
//             attributes: [
//                 { name: 'position', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'normal', location: 1, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'texCoord', location: 2, type: WebGL2RenderingContext.FLOAT_VEC2, size: 1 },
//                 { name: 'tangent', location: 3, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'binormal', location: 4, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//             ],
//             uniforms: [
//                 new ProgramUniformBuffer('lightWorldPos', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('viewInverse', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('viewProjection', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('worldPosition', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('nextPosition', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('scale', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('time', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('fishLength', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('fishWaveLength', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('fishBendAmount', WebGL2RenderingContext.FLOAT, 1),
//             ],
//             samplers: [
//                 new ProgramUniformSampler('diffuse', false, "float", "2d"),
//             ],
//         }
//     ],
//     [
//         hydTrim(aquarium_2_wgsl) + hydTrim(aquarium_8_wgsl), {
//             attributes: [
//                 { name: 'position', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'normal', location: 1, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'texCoord', location: 2, type: WebGL2RenderingContext.FLOAT_VEC2, size: 1 },
//                 { name: 'tangent', location: 3, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'binormal', location: 4, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//             ],
//             uniforms: [
//                 new ProgramUniformBuffer('lightWorldPos', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('viewInverse', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('viewProjection', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('worldPosition', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('nextPosition', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('scale', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('time', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('fishLength', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('fishWaveLength', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('fishBendAmount', WebGL2RenderingContext.FLOAT, 1),
//             ],
//             samplers: [
//                 new ProgramUniformSampler('diffuse', false, "float", "2d"),
//                 new ProgramUniformSampler('normalMap', false, "float", "2d"),
//                 new ProgramUniformSampler('skybox', false, "float", "cube"),

//             ],
//         }
//     ],
//     [
//         hydTrim(aquarium_2_wgsl) + hydTrim(aquarium_19_wgsl), {
//             attributes: [
//                 { name: 'position', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'normal', location: 1, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'texCoord', location: 2, type: WebGL2RenderingContext.FLOAT_VEC2, size: 1 },
//                 { name: 'tangent', location: 3, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'binormal', location: 4, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//             ],
//             uniforms: [
//                 new ProgramUniformBuffer('lightWorldPos', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('viewInverse', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('viewProjection', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('worldPosition', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('nextPosition', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('scale', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('time', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('fishLength', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('fishWaveLength', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('fishBendAmount', WebGL2RenderingContext.FLOAT, 1),
//             ],
//             samplers: [
//                 new ProgramUniformSampler('diffuse', false, "float", "2d"),
//                 new ProgramUniformSampler('normalMap', false, "float", "2d"),
//                 new ProgramUniformSampler('reflectionMap', false, "float", "2d"),
//                 new ProgramUniformSampler('skybox', false, "float", "cube"),
//             ],
//         }
//     ],
//     [
//         hydTrim(aquarium_2_wgsl) + hydTrim(aquarium_20_wgsl), {
//             attributes: [
//                 { name: 'position', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'normal', location: 1, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'texCoord', location: 2, type: WebGL2RenderingContext.FLOAT_VEC2, size: 1 },
//                 { name: 'tangent', location: 3, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'binormal', location: 4, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//             ],
//             uniforms: [
//                 new ProgramUniformBuffer('lightWorldPos', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('viewInverse', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('viewProjection', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('worldPosition', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('nextPosition', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('scale', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('time', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('fishLength', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('fishWaveLength', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('fishBendAmount', WebGL2RenderingContext.FLOAT, 1),
//             ],
//             samplers: [
//                 new ProgramUniformSampler('diffuse', false, "float", "2d"),
//                 new ProgramUniformSampler('normalMap', false, "float", "2d"),
//             ],
//         }
//     ],
//     [
//         hydTrim(aquarium_2_wgsl) + hydTrim(aquarium_21_wgsl), {
//             attributes: [
//                 { name: 'position', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'normal', location: 1, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'texCoord', location: 2, type: WebGL2RenderingContext.FLOAT_VEC2, size: 1 },
//                 { name: 'tangent', location: 3, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'binormal', location: 4, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//             ],
//             uniforms: [
//                 new ProgramUniformBuffer('lightWorldPos', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('viewInverse', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('viewProjection', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('worldPosition', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('nextPosition', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('scale', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('time', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('fishLength', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('fishWaveLength', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('fishBendAmount', WebGL2RenderingContext.FLOAT, 1),
//             ],
//             samplers: [
//                 new ProgramUniformSampler('diffuse', false, "float", "2d"),
//                 new ProgramUniformSampler('normalMap', false, "float", "2d"),
//             ],
//         }
//     ],
//     [
//         hydTrim(aquarium_2_wgsl) + hydTrim(aquarium_22_wgsl), {
//             attributes: [
//                 { name: 'position', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'normal', location: 1, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'texCoord', location: 2, type: WebGL2RenderingContext.FLOAT_VEC2, size: 1 },
//                 { name: 'tangent', location: 3, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'binormal', location: 4, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//             ],
//             uniforms: [
//                 new ProgramUniformBuffer('lightWorldPos', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('viewInverse', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('viewProjection', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('worldPosition', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('nextPosition', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('scale', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('time', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('fishLength', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('fishWaveLength', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('fishBendAmount', WebGL2RenderingContext.FLOAT, 1),
//             ],
//             samplers: [
//                 new ProgramUniformSampler('diffuse', false, "float", "2d"),
//                 new ProgramUniformSampler('normalMap', false, "float", "2d"),
//                 new ProgramUniformSampler('reflectionMap', false, "float", "2d"),
//                 new ProgramUniformSampler('skybox', false, "float", "cube"),
//             ],
//         }
//     ],
//     [
//         hydTrim(aquarium_2_wgsl) + hydTrim(aquarium_23_wgsl), {
//             attributes: [
//                 { name: 'position', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'normal', location: 1, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'texCoord', location: 2, type: WebGL2RenderingContext.FLOAT_VEC2, size: 1 },
//                 { name: 'tangent', location: 3, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'binormal', location: 4, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//             ],
//             uniforms: [
//                 new ProgramUniformBuffer('lightWorldPos', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('viewInverse', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('viewProjection', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('worldPosition', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('nextPosition', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('scale', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('time', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('fishLength', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('fishWaveLength', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('fishBendAmount', WebGL2RenderingContext.FLOAT, 1),
//             ],
//             samplers: [
//                 new ProgramUniformSampler('diffuse', false, "float", "2d"),
//                 new ProgramUniformSampler('normalMap', false, "float", "2d"),
//                 new ProgramUniformSampler('reflectionMap', false, "float", "2d"),
//                 new ProgramUniformSampler('skybox', false, "float", "cube"),
//             ],
//         }
//     ],
//     [
//         hydTrim(aquarium_12_wgsl) + hydTrim(aquarium_16_wgsl), {
//             attributes: [
//                 { name: 'position', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//                 { name: 'normal', location: 1, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'texCoord', location: 2, type: WebGL2RenderingContext.FLOAT_VEC2, size: 1 },
//             ],
//             uniforms: [
//                 new ProgramUniformBuffer('world', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('viewProjection', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('lightWorldPos', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('viewInverse', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('worldInverseTranspose', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('time', WebGL2RenderingContext.FLOAT, 1),
//             ],
//             samplers: [
//                 new ProgramUniformSampler('diffuse', false, "float", "2d"),
//             ],
//         }
//     ],
//     [
//         hydTrim(luic_f_vert_wgsl), {
//             attributes: [
//                 { name: 'position', location: 0, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'normal', location: 1, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//                 { name: 'uv', location: 2, type: WebGL2RenderingContext.FLOAT_VEC2, size: 1 },
//                 { name: 'uv2', location: 3, type: WebGL2RenderingContext.FLOAT_VEC2, size: 1 },
//             ],
//             uniforms: [
//                 new ProgramUniformBuffer('modelMatrix', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('modelViewMatrix', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('projectionMatrix', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('viewMatrix', WebGL2RenderingContext.FLOAT_MAT4, 1),
//                 new ProgramUniformBuffer('normalMatrix', WebGL2RenderingContext.FLOAT_MAT3, 1),
//                 new ProgramUniformBuffer('cameraPosition', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('diffuse', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('opacity', WebGL2RenderingContext.FLOAT, 1),
//             ],
//             samplers: [],
//         }
//     ],
//     [
//         hydTrim(luic_d_vert_wgsl), {
//             attributes: [
//                 { name: 'position', location: 0, type: WebGL2RenderingContext.FLOAT_VEC2, size: 1 },
//                 { name: 'uv', location: 1, type: WebGL2RenderingContext.FLOAT_VEC2, size: 1 },
//             ],
//             uniforms: [
//                 new ProgramUniformBuffer('renderType', WebGL2RenderingContext.INT, 1),
//                 new ProgramUniformBuffer('screenPosition', WebGL2RenderingContext.FLOAT_VEC3, 1),
//                 new ProgramUniformBuffer('scale', WebGL2RenderingContext.FLOAT_VEC2, 1),
//                 new ProgramUniformBuffer('rotation', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('opacity', WebGL2RenderingContext.FLOAT, 1),
//                 new ProgramUniformBuffer('color', WebGL2RenderingContext.FLOAT_VEC4, 1),
//             ],
//             samplers: [
//                 new ProgramUniformSampler('occlusionMap', false, "float", "2d"),
//                 new ProgramUniformSampler('map', false, "float", "2d"),
//             ],
//         }
//     ],
//     [hydTrim(luic_b_vert_wgsl), {
//         attributes: [
//             { name: 'position', location: 0, type: WebGL2RenderingContext.FLOAT_VEC2, size: 1 },
//             { name: 'uv', location: 1, type: WebGL2RenderingContext.FLOAT_VEC2, size: 1 },
//         ],
//         uniforms: [
//             new ProgramUniformBuffer('useScreenCoordinates', WebGL2RenderingContext.INT, 1),
//             new ProgramUniformBuffer('sizeAttenuation', WebGL2RenderingContext.INT, 1),
//             new ProgramUniformBuffer('screenPosition', WebGL2RenderingContext.FLOAT_VEC3, 1),
//             new ProgramUniformBuffer('modelViewMatrix', WebGL2RenderingContext.FLOAT_MAT4, 1),
//             new ProgramUniformBuffer('projectionMatrix', WebGL2RenderingContext.FLOAT_MAT4, 1),
//             new ProgramUniformBuffer('rotation', WebGL2RenderingContext.FLOAT, 1),
//             new ProgramUniformBuffer('scale', WebGL2RenderingContext.FLOAT_VEC2, 1),
//             new ProgramUniformBuffer('alignment', WebGL2RenderingContext.FLOAT_VEC2, 1),
//             new ProgramUniformBuffer('uvOffset', WebGL2RenderingContext.FLOAT_VEC2, 1),
//             new ProgramUniformBuffer('uvScale', WebGL2RenderingContext.FLOAT_VEC2, 1),
//             new ProgramUniformBuffer('color', WebGL2RenderingContext.FLOAT_VEC3, 1),
//             new ProgramUniformBuffer('opacity', WebGL2RenderingContext.FLOAT, 1),
//             new ProgramUniformBuffer('fogType', WebGL2RenderingContext.INT, 1),
//             new ProgramUniformBuffer('fogColor', WebGL2RenderingContext.FLOAT_VEC3, 1),
//             new ProgramUniformBuffer('fogDensity', WebGL2RenderingContext.FLOAT, 1),
//             new ProgramUniformBuffer('fogNear', WebGL2RenderingContext.FLOAT, 1),
//             new ProgramUniformBuffer('fogFar', WebGL2RenderingContext.FLOAT, 1),
//             new ProgramUniformBuffer('alphaTest', WebGL2RenderingContext.FLOAT, 1),
//         ],
//         samplers: [
//             new ProgramUniformSampler('map', false, "float", "2d"),
//         ],
//     }],
//     [hydTrim(test11WGSLVert), {
//         attributes: [
//             { name: 'position', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//         ],
//         uniforms: [
//             new ProgramUniformBuffer('matrix', WebGL2RenderingContext.FLOAT_MAT4, 1),
//             new ProgramUniformBuffer('color', WebGL2RenderingContext.FLOAT_VEC4, 1),
//         ],
//         samplers: []
//     }
//     ],
//     [hydTrim(threejs1WGSLVert), {
//         attributes: [
//             { name: 'position', location: 0, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//             { name: 'normal', location: 1, type: WebGL2RenderingContext.FLOAT_VEC3, size: 1 },
//             { name: 'uv', location: 2, type: WebGL2RenderingContext.FLOAT_VEC2, size: 1 },
//         ],
//         uniforms: [
//             new ProgramUniformBuffer('modelMatrix', WebGL2RenderingContext.FLOAT_MAT4, 1),
//             new ProgramUniformBuffer('modelViewMatrix', WebGL2RenderingContext.FLOAT_MAT4, 1),
//             new ProgramUniformBuffer('projectionMatrix', WebGL2RenderingContext.FLOAT_MAT4, 1),
//             new ProgramUniformBuffer('viewMatrix', WebGL2RenderingContext.FLOAT_MAT4, 1),
//             new ProgramUniformBuffer('normalMatrix', WebGL2RenderingContext.FLOAT_MAT3, 1),
//             new ProgramUniformBuffer('cameraPosition', WebGL2RenderingContext.FLOAT_VEC3, 1),
//             new ProgramUniformBuffer('isOrthographic', WebGL2RenderingContext.UNSIGNED_INT, 1),
//             new ProgramUniformBuffer('opacity', WebGL2RenderingContext.FLOAT, 1),
//         ],
//         samplers: []
//     }
//     ],
//     [hydTrim(test20WGSLVert), {
//         attributes: [
//             { name: 'a_position', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//         ],
//         uniforms: [
//             new ProgramUniformBuffer('u_matrix', WebGL2RenderingContext.FLOAT_MAT4, 1),
//         ],
//         samplers: [
//             new ProgramUniformSampler('u_texture', false, "uint", "2d"),
//         ]
//     }
//     ],
//     [hydTrim(test2WGSLVert), {
//         attributes: [
//             { name: 'vertexPosition', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//         ],
//         uniforms: [
//             new ProgramUniformBuffer('MVP', WebGL2RenderingContext.FLOAT_MAT4, 1),
//         ],
//         samplers: [],
//     }
//     ],
//     [hydTrim(test3RenderWGSLVert), {
//         attributes: [
//             { name: 'vertexPosition', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//             { name: 'vertexNormal', location: 1, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//             { name: 'vertexColor', location: 2, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//         ],
//         uniforms: [
//             new ProgramUniformBuffer('modelView', WebGL2RenderingContext.FLOAT_MAT4, 1),
//             new ProgramUniformBuffer('lightProjection', WebGL2RenderingContext.FLOAT_MAT4, 1),
//             new ProgramUniformBuffer('cameraProjection', WebGL2RenderingContext.FLOAT_MAT4, 1),
//         ],
//         samplers: [
//             new ProgramUniformSampler('shadowMap', true, 'depth', '2d'),
//         ],
//     }
//     ],
//     [hydTrim(test3ShadowWGSLVert), {
//         attributes: [
//             { name: 'vertexPosition', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//         ],
//         uniforms: [
//             new ProgramUniformBuffer('modelView', WebGL2RenderingContext.FLOAT_MAT4, 1),
//             new ProgramUniformBuffer('lightProjection', WebGL2RenderingContext.FLOAT_MAT4, 1),
//         ],
//         samplers: [],
//     }
//     ],
//     [
//         hydTrim(test1WGSLVert), {
//             attributes: [
//                 { name: 'vertexPosition', location: 0, type: WebGL2RenderingContext.FLOAT_VEC4, size: 1 },
//             ],
//             uniforms: [
//                 // {name: 'objPosition', buffer: new HydBuffer(device, 'uniform', 4 * 4 * 4)},
//                 // {name: 'objColor', buffer: new HydBuffer(device, 'uniform', 4 * 4 * 4)},
//                 new ProgramUniformBuffer('objPosition', WebGL2RenderingContext.FLOAT_VEC4, 1),
//                 new ProgramUniformBuffer('objColor', WebGL2RenderingContext.FLOAT_VEC4, 1),
//             ],
//             samplers: [],
//         }
//     ],
//     // [hydTrim(GPUVS4), {
//     //         attributes: [{name: "a_position", location: 0,}],
//     //         uniforms: [{
//     //             name: "u_worldViewProjection",
//     //             buffer: new HydBuffer(device, "uniform", 4 * 4 * 4)
//     //         }]
//     //     }
//     // }],
//     // [hydTrim(GPUVS1), {
//     //         attributes: [
//     //             {name: 'a_Position', location: 0},
//     //             {name: 'a_Color', location: 1},
//     //         ],
//     //         uniforms: [
//     //             {name: 'u_Matrix', buffer: new HydBuffer(device, 'uniform', 4 * 4 * 4)},
//     //         ]
//     //     }
//     // }],
//     // [hydTrim(GPUVS5), {
//     //         attributes: [
//     //             {name: "a_position", location: 0},
//     //             {name: "a_color", location: 1}
//     //         ],
//     //         uniforms: [
//     //             {name: "u_matrix", buffer: new HydBuffer(device, "uniform", 4 * 4 * 4)}
//     //         ],
//     //     }
//     // }],
//     // // [hydTrim(GPUVS6), {//     attributes: [
//     // //         {name: "a_position", location: 0},
//     // //         {name: "color", location: 1},
//     // //         {name: "matrix0", location: 2},
//     // //         {name: "matrix1", location: 3},
//     // //         {name: "matrix2", location: 4},
//     // //         {name: "matrix3", location: 5},
//     // //     ],
//     // //     uniforms: [
//     // //         {name: "projection", buffer: new HydBuffer(device, "uniform", 4 * 4 * 4)},
//     // //         {name: "view", buffer: new HydBuffer(device, "uniform", 4 * 4 * 4)},
//     // //     ]
//     // // }],
//     // [hydTrim(GPUVS3), {
//     //         attributes: [
//     //             {name: "aPos", location: 0},
//     //             {name: "aColor", location: 1},
//     //         ],
//     //         uniforms: [
//     //             {name: "uMVMatrix", buffer: new HydBuffer(device, "uniform", 4 * 4 * 4)},
//     //             {name: "uPMatrix", buffer: new HydBuffer(device, "uniform", 4 * 4 * 4)},
//     //         ]
//     //     }
//     // }],
//     // [hydTrim(GPUVS0), {
//     //         attributes: [{name: "a_position", location: 0}],
//     //         uniforms: [
//     //             {name: "u_matrix", buffer: new HydBuffer(device, "uniform", 4 * 4 * 4, 'uniformBuffer')},
//     //         ],
//     //     }
//     // }],
//     // [hydTrim(GPUVS7), {
//     //         attributes: [
//     //             {name: "a_position", location: 0},
//     //             {name: "a_texcoord", location: 1},
//     //         ],
//     //         uniforms: [
//     //             {name: "u_matrix", buffer: new HydBuffer(device, "uniform", 4 * 4 * 4, 'uniformBuffer')},
//     //             {name: "u_texture", sampler: new HydSampler(device)},
//     //         ],
//     //     }
//     // }],
//     [hydTrim(test10VertWgsl), {
//         attributes: [
//             { name: 'position', location: 0, type: undefined, size: 1 },
//             { name: 'normal', location: 1, type: undefined, size: 1 },
//             { name: 'texcoord', location: 2, type: undefined, size: 1 },
//         ],
//         uniforms: [
//             new ProgramUniformBuffer('projection', WebGL2RenderingContext.FLOAT_MAT4, 1),
//             new ProgramUniformBuffer('modelView', WebGL2RenderingContext.FLOAT_MAT4, 1),
//             new ProgramUniformBuffer('lightDir', WebGL2RenderingContext.FLOAT_VEC3, 1),
//         ],
//         samplers: [
//             new ProgramUniformSampler('diffuse', false, 'float', '2d'),
//         ]
//     }
//     ],
// ]);
