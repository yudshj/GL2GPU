import { deepEqual } from "node:assert/strict";

import { scanGlslDeclarations } from "../../src/components/shaderMetadata";
import { normalizeWebGlTextureCoordinates } from "../../src/components/shaderTexCoord";
import { optimizeTintWgsl } from "../../src/components/shaderWgslOptimizer";
import { computeShaderShapeStats } from "../../src/components/shaderCapture";
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
deepEqual(vertexDecls.uniforms.map((item) => item.name), ["uModel"]);
if (vertexDecls.uniforms.some((item) => item.name === "uTint")) {
    throw new Error("expected unused uniforms to be filtered from active metadata");
}
deepEqual(vertexDecls.varyings.map((item) => item.name), ["vUv"]);

const sameLineDeclarations = scanGlslDeclarations(
    "attribute vec4 aVertex; attribute vec4 aColor; varying vec4 vColor; void main() { vColor = aColor; gl_Position = aVertex; }",
    "vertex",
);
deepEqual(sameLineDeclarations.attributes.map((item) => item.name), ["aVertex", "aColor"]);
deepEqual(sameLineDeclarations.varyings.map((item) => item.name), ["vColor"]);

const fragmentDecls = scanGlslDeclarations(fragment, "fragment");
deepEqual(fragmentDecls.uniforms.map((item) => item.name), ["exposure"]);
deepEqual(fragmentDecls.samplers.map((item) => [item.name, item.wgsl_texture_type]), [
    ["diffuse", "texture_2d<f32>"],
]);
if (fragmentDecls.samplers.some((item) => item.name === "skybox")) {
    throw new Error("expected unused samplers to be filtered from active metadata");
}
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
    throw new Error("expected multi-field output to keep a local output struct");
}
if (!optimizedWrapper.wgsl.includes("_hyd_output.v_color_1 = a_pos_param;") || !optimizedWrapper.wgsl.includes("_hyd_output.gl_Position_1 = a_pos_param;")) {
    throw new Error("expected input private and redundant constructor to fold into direct output assignments");
}
if (optimizedWrapper.stats.loweredPrivateVars !== 3) {
    throw new Error(`expected 3 lowered private vars, got ${optimizedWrapper.stats.loweredPrivateVars}`);
}
if (optimizedWrapper.stats.removedTemporaries < 1 || optimizedWrapper.stats.foldedConstructors < 1) {
    throw new Error("expected peephole optimizer to remove a temp and fold a constructor");
}

const spriteOutputStoreWgsl = `
struct main_out {
  @builtin(position)
  gl_Position_1 : vec4f,
  @location(0)
  v_Texcoord_1 : vec2f,
}

@vertex
fn main(@location(0) vposition_param : vec2f) -> main_out {
  var _hyd_output: main_out;
  let pre_rot : vec2f = (vposition_param * _hyd_uniforms_.sprite_sizerot.xy);
  let tdir : vec2f = vec2f(sin(_hyd_uniforms_.sprite_sizerot.z), cos(_hyd_uniforms_.sprite_sizerot.z));
  let dir : vec2f = vec2f(tdir.y, -(tdir.x));
  _hyd_output.gl_Position_1.x = dot(dir, pre_rot);
  _hyd_output.gl_Position_1.y = dot(tdir, pre_rot);
  _hyd_output.gl_Position_1 = vec4f(((((_hyd_output.gl_Position_1.xy + _hyd_uniforms_.sprite_pos.xy) * _hyd_uniforms_.screen_dims.xy) + _hyd_uniforms_.screen_dims.zw)).xy, _hyd_output.gl_Position_1.zw);
  _hyd_output.gl_Position_1.z = _hyd_uniforms_.sprite_pos.z;
  _hyd_output.gl_Position_1.w = 1.0f;
  _hyd_output.v_Texcoord_1 = ((vposition_param * _hyd_uniforms_.sprite_tex_transform.xy) + _hyd_uniforms_.sprite_tex_transform.zw);
  return _hyd_output;
}
`;
const spriteOutputStoreOptimized = optimizeTintWgsl(spriteOutputStoreWgsl);
if (!spriteOutputStoreOptimized.wgsl.includes("var _hyd_output: main_out;")) {
    throw new Error("expected Sprite-like multi-field output local to stay in manual-like form");
}
if (spriteOutputStoreOptimized.wgsl.includes("_hyd_output.gl_Position_1.x")) {
    throw new Error("expected Sprite-like position component stores to be folded");
}
if (!spriteOutputStoreOptimized.wgsl.includes("_hyd_output.gl_Position_1 = vec4f(")
    || !spriteOutputStoreOptimized.wgsl.includes("(((dot(dir, pre_rot) + _hyd_uniforms_.sprite_pos.x) * _hyd_uniforms_.screen_dims.x) + _hyd_uniforms_.screen_dims.z)")
    || !spriteOutputStoreOptimized.wgsl.includes("(((dot(tdir, pre_rot) + _hyd_uniforms_.sprite_pos.y) * _hyd_uniforms_.screen_dims.y) + _hyd_uniforms_.screen_dims.w)")) {
    throw new Error("expected Sprite-like position output to use a full scalarized field assignment");
}
if (!spriteOutputStoreOptimized.wgsl.includes("_hyd_output.v_Texcoord_1 = vec2f((((vposition_param.x) * _hyd_uniforms_.sprite_tex_transform.x) + _hyd_uniforms_.sprite_tex_transform.z), (((vposition_param.y) * _hyd_uniforms_.sprite_tex_transform.y) + _hyd_uniforms_.sprite_tex_transform.w));")) {
    throw new Error("expected Sprite-like texcoord vec2 affine expression to scalarize");
}
if (spriteOutputStoreOptimized.stats.foldedOutputStores < 2) {
    throw new Error(`expected Sprite-like output store cleanup, got ${spriteOutputStoreOptimized.stats.foldedOutputStores}`);
}

const singleFieldFragmentOutputWgsl = `
struct main_out {
  @location(0)
  x_hyd_fragColor_1 : vec4f,
}

@fragment
fn main(@location(0) v_Texcoord_param : vec2f) -> main_out {
  var _hyd_output: main_out;
  _hyd_output.x_hyd_fragColor_1 = textureSample(sprite_textureT, sprite_textureS, v_Texcoord_param);
  return _hyd_output;
}
`;
const singleFieldFragmentOutputOptimized = optimizeTintWgsl(singleFieldFragmentOutputWgsl);
if (!singleFieldFragmentOutputOptimized.wgsl.includes("fn main(@location(0) v_Texcoord_param : vec2f) -> @location(0) vec4f")) {
    throw new Error("expected single-field fragment output struct to collapse to direct location return");
}
if (!singleFieldFragmentOutputOptimized.wgsl.includes("return textureSample(sprite_textureT, sprite_textureS, v_Texcoord_param);")) {
    throw new Error("expected single-field fragment output to return texture sample directly");
}
if (singleFieldFragmentOutputOptimized.stats.collapsedOutputStructs !== 1) {
    throw new Error(`expected one collapsed output struct, got ${singleFieldFragmentOutputOptimized.stats.collapsedOutputStructs}`);
}

const multiReturnSingleFieldOutputWgsl = `
struct main_out {
  @location(0)
  value : f32,
}

@fragment
fn main(@location(0) condition : f32) -> main_out {
  if (condition > 0.0f) {
    return main_out(1.0f);
  }
  return main_out(2.0f);
}
`;
const multiReturnSingleFieldOutputOptimized = optimizeTintWgsl(multiReturnSingleFieldOutputWgsl);
if (!multiReturnSingleFieldOutputOptimized.wgsl.includes("-> main_out") ||
    multiReturnSingleFieldOutputOptimized.stats.collapsedOutputStructs !== 0) {
    throw new Error("expected a single-field output with multiple returns to stay uncollapsed");
}

const multiWriteOutputPrivateWgsl = `
var<private> a_pos : vec4f;
var<private> gl_Position : vec4f;

fn main_1() {
  gl_Position = a_pos;
  gl_Position = vec4f(gl_Position.xyz, 1.0f);
  return;
}

struct main_out {
  @builtin(position)
  gl_Position_1 : vec4f,
}

@vertex
fn main(@location(0) a_pos_param : vec4f) -> main_out {
  a_pos = a_pos_param;
  main_1();
  return main_out(gl_Position);
}
`;
const multiWriteOutputPrivateOptimized = optimizeTintWgsl(multiWriteOutputPrivateWgsl);
if (multiWriteOutputPrivateOptimized.wgsl.includes("var<private> gl_Position") || multiWriteOutputPrivateOptimized.wgsl.includes("fn main_1")) {
    throw new Error("expected multi-write output private wrapper to be lowered");
}
if (!multiWriteOutputPrivateOptimized.wgsl.includes("_hyd_output.gl_Position_1 = a_pos_param;")) {
    throw new Error("expected first output private write to target local output field");
}
if (!multiWriteOutputPrivateOptimized.wgsl.includes("_hyd_output.gl_Position_1 = vec4f(_hyd_output.gl_Position_1.xyz, 1.0f);")) {
    throw new Error("expected later output private reads/writes to use local output field");
}
if (multiWriteOutputPrivateOptimized.stats.loweredPrivateVars !== 2) {
    throw new Error(`expected 2 lowered private vars for multi-write output, got ${multiWriteOutputPrivateOptimized.stats.loweredPrivateVars}`);
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

const sharedEntryHelperWgsl = `
var<private> input_value : f32;
var<private> output_value : f32;

fn main_1() {
  output_value = input_value;
}

fn other() {
  main_1();
}

struct main_out {
  @location(0)
  output_value_1 : f32,
}

@fragment
fn main(@location(0) input_value_param : f32) -> main_out {
  input_value = input_value_param;
  main_1();
  return main_out(output_value);
}
`;
const sharedEntryHelperOptimized = optimizeTintWgsl(sharedEntryHelperWgsl);
if (!sharedEntryHelperOptimized.wgsl.includes("fn main_1()") ||
    !sharedEntryHelperOptimized.wgsl.includes("fn other()")) {
    throw new Error("expected an entry helper with another callsite to stay intact");
}
if (!sharedEntryHelperOptimized.stats.skippedPasses.some((reason) => reason.includes("helper-has-other-callsites"))) {
    throw new Error("expected shared entry helper skip reason");
}

const pointerParamWgsl = `
fn lit_f1_f1_f1_(l : ptr<function, f32>, h : ptr<function, f32>, m : ptr<function, f32>) -> vec4f {
  var x_22 : f32;
  x_22 = select(0.0f, pow(max(0.0f, *(h)), *(m)), (*(l) > 0.0f));
  return vec4f(1.0f, max(*(l), 0.0f), x_22, 1.0f);
}

@fragment
fn main() -> @location(0) vec4f {
  var param : f32;
  var param_1 : f32;
  var param_2 : f32;
  var litR : vec4f;
  param = 1.0f;
  param_1 = 2.0f;
  param_2 = 3.0f;
  litR = lit_f1_f1_f1_(&(param), &(param_1), &(param_2));
  return litR;
}
`;
const pointerParamOptimized = optimizeTintWgsl(pointerParamWgsl);
if (pointerParamOptimized.wgsl.includes("ptr<function") || pointerParamOptimized.wgsl.includes("&(") || pointerParamOptimized.wgsl.includes("*(l)")) {
    throw new Error("expected readonly pointer params to lower to value params");
}
if (!pointerParamOptimized.wgsl.includes("fn lit_f1_f1_f1_(l : f32, h : f32, m : f32)")) {
    throw new Error("expected pointer helper signature to become value params");
}
if (!pointerParamOptimized.wgsl.includes("let param : f32 = 1.0f;")) {
    throw new Error("expected single-assignment locals to promote to let bindings");
}
if (pointerParamOptimized.stats.loweredPointerParams !== 3 || pointerParamOptimized.stats.promotedLocalVars < 4) {
    throw new Error(`unexpected pointer/local optimizer stats: ${JSON.stringify(pointerParamOptimized.stats)}`);
}

const motionMarkModWgsl = `
@vertex
fn main() -> @builtin(position) vec4f {
  var fade : f32;
  fade = ((_hyd_uniforms_.scalarOffset + ((_hyd_uniforms_.time * _hyd_uniforms_.scalar) / 10.0f)) - (1.0f * floor(((_hyd_uniforms_.scalarOffset + ((_hyd_uniforms_.time * _hyd_uniforms_.scalar) / 10.0f)) / 1.0f))));
  return vec4f(fade);
}
`;
const motionMarkModOptimized = optimizeTintWgsl(motionMarkModWgsl);
if (!motionMarkModOptimized.wgsl.includes("fract(")) {
    throw new Error("expected mod(x, 1.0) expansion to fold to fract(x)");
}
if (motionMarkModOptimized.wgsl.includes("floor(")) {
    throw new Error("expected folded mod(x, 1.0) to remove floor");
}
if (motionMarkModOptimized.stats.foldedModByOne !== 1) {
    throw new Error(`expected one mod-by-one fold, got ${motionMarkModOptimized.stats.foldedModByOne}`);
}

const lazyPowSelectWgsl = `
fn lit(l : f32, h : f32, m : f32) -> vec4f {
  return vec4f(1.0f, max(l, 0.0f), select(0.0f, pow(max(0.0f, h), m), (l > 0.0f)), 1.0f);
}

fn keep_sampler_origin_select(texCoord : vec2f, flipY : f32) -> vec2f {
  return vec2f(texCoord.x, select(texCoord.y, 1.0f - texCoord.y, flipY > 0.5f));
}
`;
const lazyPowSelectOptimized = optimizeTintWgsl(lazyPowSelectWgsl);
if (!lazyPowSelectOptimized.wgsl.includes("var _hyd_lazy_pow_select_0 : f32 = 0.0f;")) {
    throw new Error("expected pow select to lower to a lazy local");
}
if (!lazyPowSelectOptimized.wgsl.includes("if ((l > 0.0f))")) {
    throw new Error("expected pow select condition to become a branch");
}
if (!lazyPowSelectOptimized.wgsl.includes("_hyd_lazy_pow_select_0 = pow(max(0.0f, h), m);")) {
    throw new Error("expected pow arm to be evaluated inside the branch");
}
if (!lazyPowSelectOptimized.wgsl.includes("select(texCoord.y, 1.0f - texCoord.y, flipY > 0.5f)")) {
    throw new Error("expected non-pow sampler-origin select to stay unchanged");
}
if (lazyPowSelectOptimized.stats.branchifiedSelects !== 1) {
    throw new Error(`expected one lazy pow select branchification, got ${lazyPowSelectOptimized.stats.branchifiedSelects}`);
}

const mutableScalarAliasWgsl = `
@fragment
fn main() -> @location(0) f32 {
  var value : f32 = 1.0f;
  let x_90 : f32 = value;
  value = 2.0f;
  return x_90;
}
`;
const mutableScalarAliasOptimized = optimizeTintWgsl(mutableScalarAliasWgsl);
if (!mutableScalarAliasOptimized.wgsl.includes("let x_90 : f32 = value;") ||
    !mutableScalarAliasOptimized.wgsl.includes("return x_90;")) {
    throw new Error("expected alias of a subsequently written scalar to be preserved");
}

const mutableFieldAliasWgsl = `
struct Payload {
  value : f32,
}

@fragment
fn main() -> @location(0) f32 {
  var payload : Payload;
  payload.value = 1.0f;
  let x_91 : f32 = payload.value;
  payload.value = 2.0f;
  return x_91;
}
`;
const mutableFieldAliasOptimized = optimizeTintWgsl(mutableFieldAliasWgsl);
if (!mutableFieldAliasOptimized.wgsl.includes("let x_91 : f32 = payload.value;") ||
    !mutableFieldAliasOptimized.wgsl.includes("return x_91;")) {
    throw new Error("expected alias of a subsequently written struct field to be preserved");
}

const escapedAliasSourceWgsl = `
fn mutate(value : ptr<function, f32>) {
  *(value) = 2.0f;
}

@fragment
fn main() -> @location(0) f32 {
  var value : f32 = 1.0f;
  let x_92 : f32 = value;
  mutate(&(value));
  return x_92;
}
`;
const escapedAliasSourceOptimized = optimizeTintWgsl(escapedAliasSourceWgsl);
if (!escapedAliasSourceOptimized.wgsl.includes("let x_92 : f32 = value;") ||
    !escapedAliasSourceOptimized.wgsl.includes("return x_92;")) {
    throw new Error("expected alias of an address-taken value to be preserved");
}

const repeatedAliasWgsl = `
@fragment
fn main(@location(0) value : f32) -> @location(0) f32 {
  let x_93 : f32 = value;
  return x_93 + x_93;
}
`;
const repeatedAliasOptimized = optimizeTintWgsl(repeatedAliasWgsl);
if (repeatedAliasOptimized.wgsl.includes("let x_93 : f32 = value;") ||
    !repeatedAliasOptimized.wgsl.includes("return value + value;")) {
    throw new Error("expected a repeated alias of an immutable parameter to fold safely");
}

const conditionalAssignmentWgsl = `
@fragment
fn main(@location(0) condition : f32) -> @location(0) f32 {
  var value : f32;
  if (condition > 0.0f) {
    value = 1.0f;
  }
  return value;
}
`;
const conditionalAssignmentOptimized = optimizeTintWgsl(conditionalAssignmentWgsl);
if (!conditionalAssignmentOptimized.wgsl.includes("var value : f32;") ||
    conditionalAssignmentOptimized.wgsl.includes("let value : f32 = 1.0f;")) {
    throw new Error("expected a conditionally assigned var to stay in its dominating scope");
}

const loopAssignmentWgsl = `
@fragment
fn main() -> @location(0) f32 {
  var value : f32;
  loop {
    value = 1.0f;
    break;
  }
  return value;
}
`;
const loopAssignmentOptimized = optimizeTintWgsl(loopAssignmentWgsl);
if (!loopAssignmentOptimized.wgsl.includes("var value : f32;") ||
    loopAssignmentOptimized.wgsl.includes("let value : f32 = 1.0f;")) {
    throw new Error("expected a loop-assigned var to stay in its dominating scope");
}

const shapeStats = computeShaderShapeStats(`
var<private> texCoord : vec2<f32>;
@fragment
fn main() -> @location(0) vec4<f32> {
  let x_1 = vec4<f32>(texCoord.x, texCoord.y, 0.0, 1.0);
  if (x_1.x > 0.0) {
    return textureSampleLevel(diffuseT, diffuseS, texCoord, select(0.0, 1.0, texCoord.y > 0.5));
  }
  return textureSample(diffuseT, diffuseS, texCoord);
}
`);
if (shapeStats.varPrivate !== 1 || shapeStats.tempLets !== 1 || shapeStats.textureSampleLevel !== 1 || shapeStats.textureSample !== 1 || shapeStats.selects !== 1) {
    throw new Error(`unexpected WGSL shape stats: ${JSON.stringify(shapeStats)}`);
}

console.log("shader metadata tests passed");
