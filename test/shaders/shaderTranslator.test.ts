import { deepEqual } from "node:assert/strict";

import { scanGlslDeclarations } from "../../src/components/shaderMetadata";
import { normalizeWebGlTextureCoordinates } from "../../src/components/shaderTexCoord";
import { optimizeTintWgsl } from "../../src/components/shaderWgslOptimizer";
import type { InitShaderInfoType } from "../../src/components/shaderDB";

const vertex = `
attribute vec3 aPos;
attribute vec2 aUv;
uniform mat4 uModel;
uniform highp vec4 uTint;
varying vec2 vUv;
void main() {
  vUv = aUv;
  gl_Position = uModel * vec4(aPos, 1.0);
}
`;

const fragment = `
precision mediump float;
uniform sampler2D diffuse;
uniform samplerCube skybox;
uniform float exposure;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(diffuse, vUv) * exposure;
}
`;

const vertexDecls = scanGlslDeclarations(vertex, "vertex");
deepEqual(vertexDecls.attributes.map((item) => item.name), ["aPos", "aUv"]);
deepEqual(vertexDecls.attributes.map((item) => item.wgsl_type), ["vec3<f32>", "vec2<f32>"]);
deepEqual(vertexDecls.uniforms.map((item) => item.name), ["uModel", "uTint"]);
deepEqual(vertexDecls.varyings.map((item) => item.name), ["vUv"]);

const fragmentDecls = scanGlslDeclarations(fragment, "fragment");
deepEqual(fragmentDecls.uniforms.map((item) => item.name), ["exposure"]);
deepEqual(fragmentDecls.samplers.map((item) => [item.name, item.wgsl_texture_type]), [
    ["diffuse", "texture_2d<f32>"],
    ["skybox", "texture_cube<f32>"],
]);
deepEqual(fragmentDecls.varyings.map((item) => item.name), ["vUv"]);

const aquariumMetadata: InitShaderInfoType = {
    attributes: [],
    uniforms: [],
    samplers: [
        {
            name: "diffuse",
            glsl_type: "sampler2D",
            wgsl_texture_type: "texture_2d<f32>",
            wgsl_sampler_type: "sampler",
        },
        {
            name: "skybox",
            glsl_type: "samplerCube",
            wgsl_texture_type: "texture_cube<f32>",
            wgsl_sampler_type: "sampler",
        },
    ],
    glsl: "",
    wgsl: "",
    debug_info: "",
};

const aquariumWgsl = normalizeWebGlTextureCoordinates(`
@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
    let diffuseColor = textureSample(diffuseT, diffuseS, input.v_texCoord);
    let skyColor = textureSample(skyboxT, skyboxS, input.reflectionVec);
    return diffuseColor + skyColor;
}
`, aquariumMetadata, "fragment", fragment);
if (!aquariumWgsl.includes("fn _hyd_glTexCoordToGpu")) {
    throw new Error("expected Aquarium-style 2D texture sample to add texcoord helper");
}
if (!aquariumWgsl.includes("textureSample(diffuseT, diffuseS, _hyd_glTexCoordToGpu(input.v_texCoord))")) {
    throw new Error("expected Aquarium-style 2D texture sample to flip texcoord");
}
if (!aquariumWgsl.includes("textureSample(skyboxT, skyboxS, input.reflectionVec)")) {
    throw new Error("expected cube texture sample to stay unchanged");
}

const aquariumTintAliasWgsl = normalizeWebGlTextureCoordinates(`
var<private> v_texCoord : vec2f;

fn main_1() {
    let x_23 = v_texCoord;
    let diffuseColor = textureSample(diffuseT, diffuseS, x_23);
    let skyColor = textureSample(skyboxT, skyboxS, input.reflectionVec);
}

@fragment
fn main(@location(0) v_texCoord_param : vec2f) -> @location(0) vec4<f32> {
    v_texCoord = v_texCoord_param;
    main_1();
    return vec4<f32>();
}
`, aquariumMetadata, "fragment", fragment);
if (!aquariumTintAliasWgsl.includes("textureSample(diffuseT, diffuseS, _hyd_glTexCoordToGpu(x_23))")) {
    throw new Error("expected Tint texcoord alias to flip");
}

const particleMetadata: InitShaderInfoType = {
    attributes: [],
    uniforms: [],
    samplers: [
        {
            name: "rampSampler",
            glsl_type: "sampler2D",
            wgsl_texture_type: "texture_2d<f32>",
            wgsl_sampler_type: "sampler",
        },
        {
            name: "colorSampler",
            glsl_type: "sampler2D",
            wgsl_texture_type: "texture_2d<f32>",
            wgsl_sampler_type: "sampler",
        },
    ],
    glsl: "",
    wgsl: "",
    debug_info: "",
};
const particleWgsl = normalizeWebGlTextureCoordinates(`
@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
    let colorMult = textureSample(rampSamplerT, rampSamplerS, vec2<f32>(input.PercentLife, 0.5));
    let colorSample = textureSample(colorSamplerT, colorSamplerS, input.Texcoord);
    return colorSample * colorMult;
}
`, particleMetadata, "fragment", `
uniform sampler2D rampSampler;
uniform sampler2D colorSampler;
varying vec2 outputTexcoord;
varying float outputPercentLife;
void main() {
  gl_FragColor = texture2D(colorSampler, outputTexcoord);
}
`);
if (!particleWgsl.includes("textureSample(rampSamplerT, rampSamplerS, vec2<f32>(input.PercentLife, 0.5))")) {
    throw new Error("expected non-texcoord particle ramp lookup to stay unchanged");
}
if (!particleWgsl.includes("textureSample(colorSamplerT, colorSamplerS, _hyd_glTexCoordToGpu(input.Texcoord))")) {
    throw new Error("expected particle color lookup to flip texcoord");
}

const spriteMetadata: InitShaderInfoType = {
    attributes: [],
    uniforms: [],
    samplers: [
        {
            name: "u_texture0",
            glsl_type: "sampler2D",
            wgsl_texture_type: "texture_2d<f32>",
            wgsl_sampler_type: "sampler",
        },
    ],
    glsl: "",
    wgsl: "",
    debug_info: "",
};
const spriteWgsl = normalizeWebGlTextureCoordinates(`
@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
    return textureSampleLevel(u_texture0T, u_texture0S, input.texCoord, 0.0);
}
`, spriteMetadata, "fragment", `
attribute vec2 spriteTextureSize;
attribute vec4 textureWeights;
uniform sampler2D u_texture0;
varying vec2 v_texCoord;
`);
if (spriteWgsl.includes("_hyd_glTexCoordToGpu")) {
    throw new Error("expected Sprite/JSGamesBench texture samples to stay unflipped");
}

const particleVertexWgsl = normalizeWebGlTextureCoordinates(`
@vertex
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.Texcoord = vec2<f32>(u, uv.y + 0.5);
    return output;
}
`, { ...particleMetadata, samplers: [] }, "vertex", `
attribute vec4 uvLifeTimeFrameStart;
attribute vec4 orientation;
varying vec2 outputTexcoord;
void main() {
  outputTexcoord = vec2(0.0, uvLifeTimeFrameStart.y + 0.5);
}
`);
if (!particleVertexWgsl.includes("output.Texcoord.y = 1.0 - output.Texcoord.y;")) {
    throw new Error("expected Aquarium particle vertex texcoord to flip before return");
}

const particlePrivateVertexWgsl = normalizeWebGlTextureCoordinates(`
var<private> outputTexcoord : vec2f;

fn main_1() {
  outputTexcoord = vec2f(u, uv.y + 0.5f);
  return;
}

@vertex
fn main() -> VertexOutput {
  main_1();
  return VertexOutput(outputTexcoord);
}
`, { ...particleMetadata, samplers: [] }, "vertex", `
attribute vec4 uvLifeTimeFrameStart;
attribute vec4 orientation;
varying vec2 outputTexcoord;
void main() {
  outputTexcoord = vec2(0.0, uvLifeTimeFrameStart.y + 0.5);
}
`);
if (!particlePrivateVertexWgsl.includes("outputTexcoord.y = 1.0 - outputTexcoord.y;")) {
    throw new Error("expected Tint private particle texcoord to flip before return");
}

const particleBillboardVertexWgsl = normalizeWebGlTextureCoordinates(`
@vertex
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.Texcoord = vec2<f32>(u, uv.y + 0.5);
    return output;
}
`, { ...particleMetadata, samplers: [] }, "vertex", `
attribute vec4 uvLifeTimeFrameStart;
varying vec2 outputTexcoord;
void main() {
  outputTexcoord = vec2(0.0, uvLifeTimeFrameStart.y + 0.5);
}
`);
if (particleBillboardVertexWgsl.includes("1.0 - output.Texcoord.y")) {
    throw new Error("expected non-orientation Aquarium particle vertex texcoord to stay unchanged");
}

const tintWrapperWgsl = `
var<private> a_pos : vec4f;
var<private> v_color : vec4f;
var<private> gl_Position : vec4f;

fn main_1() {
  let x_1 = vec4f(a_pos.x, a_pos.y, a_pos.z, a_pos.w);
  v_color = x_1;
  gl_Position = x_1;
  return;
}

struct main_out {
  @location(0)
  v_color_1 : vec4f,
  @builtin(position)
  gl_Position_1 : vec4f,
}

@vertex
fn main(@location(0) a_pos_param : vec4f) -> main_out {
  a_pos = a_pos_param;
  main_1();
  return main_out(v_color, gl_Position);
}
`;
const optimizedWrapper = optimizeTintWgsl(tintWrapperWgsl);
if (optimizedWrapper.wgsl.includes("var<private> a_pos") || optimizedWrapper.wgsl.includes("fn main_1")) {
    throw new Error("expected Tint entry wrapper private IO to be lowered");
}
if (!optimizedWrapper.wgsl.includes("var _hyd_output: main_out;")) {
    throw new Error("expected optimized entry to use a local output struct");
}
if (!optimizedWrapper.wgsl.includes("_hyd_output.v_color_1 = a_pos_param;")) {
    throw new Error("expected input private and redundant constructor to fold into direct output assignment");
}
if (optimizedWrapper.stats.loweredPrivateVars !== 3) {
    throw new Error(`expected 3 lowered private vars, got ${optimizedWrapper.stats.loweredPrivateVars}`);
}
if (optimizedWrapper.stats.removedTemporaries < 1 || optimizedWrapper.stats.foldedConstructors < 1) {
    throw new Error("expected peephole optimizer to remove a temp and fold a constructor");
}

const unsafePrivateEscapeWgsl = `
var<private> a_pos : vec4f;
var<private> v_color : vec4f;

fn helper() -> vec4f {
  return v_color;
}

fn main_1() {
  v_color = a_pos;
  return;
}

struct main_out {
  @location(0) v_color_1 : vec4f,
}

@vertex
fn main(@location(0) a_pos_param : vec4f) -> main_out {
  a_pos = a_pos_param;
  main_1();
  return main_out(v_color);
}
`;
const unsafeOptimized = optimizeTintWgsl(unsafePrivateEscapeWgsl);
if (!unsafeOptimized.wgsl.includes("var<private> v_color")) {
    throw new Error("expected escaped private var shader to stay unlowered");
}
if (!unsafeOptimized.stats.skippedPasses.some((reason) => reason.includes("private-io-escapes-wrapper"))) {
    throw new Error("expected escaped private var skip reason");
}

console.log("shader metadata tests passed");
