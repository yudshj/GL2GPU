export const GLVS0 = `#version 300 es
in vec4 a_position;
uniform mat4 u_matrix;
void main() {
  gl_Position = u_matrix * a_position;
}`;
export var GLFS0 = `#version 300 es
precision highp float;
in vec2 v_texcoord;
out vec4 outColor;

void main() {
  outColor = vec4(1, 0, 0.5, 1);
}`;
export const GPUVS0 = `
fn webgl_position_to_webgpu(position: vec4<f32>) -> vec4<f32> {
  return vec4<f32>(position.xy, position.z * 0.5 + 0.5, position.w);
}

struct Uniforms {
  u_matrix: mat4x4<f32>,
};

@binding(0) @group(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
}

@vertex
fn main(
  @location(0) a_position: vec4<f32>,
) -> VertexOutput {
  return VertexOutput(webgl_position_to_webgpu(uniforms.u_matrix * a_position));
}
`;
export let GPUFS0 = `
@fragment
fn main() -> @location(0) vec4<f32> {
   return vec4<f32>(1.0, 0.0, 0.5, 1.0); 
}
`
export const GLVS7 = `#version 300 es
in vec4 a_position;
in vec2 a_texcoord;
uniform mat4 u_matrix;
out vec2 v_texcoord;
void main() {
  gl_Position = u_matrix * a_position;
  v_texcoord = a_texcoord;
}`;
export var GLFS7 = `#version 300 es
precision highp float;
in vec2 v_texcoord;
uniform sampler2D u_texture;
out vec4 outColor;
void main() {
  outColor = texture(u_texture, v_texcoord);
}`;
export const GPUVS7 = `
fn webgl_position_to_webgpu(position: vec4<f32>) -> vec4<f32> {
  return vec4<f32>(position.xy, position.z * 0.5 + 0.5, position.w);
}

struct Uniforms {
  u_matrix: mat4x4<f32>,
};

@binding(0) @group(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) v_texcoord: vec2<f32>,
}

@vertex
fn main(
  @location(0) a_position: vec4<f32>,
  @location(1) a_texcoord: vec2<f32>,
) -> VertexOutput {
  return VertexOutput(webgl_position_to_webgpu(uniforms.u_matrix * a_position), a_texcoord);
}
`;
export let GPUFS7 = `
@binding(1) @group(0) var outSampler: sampler;
@binding(2) @group(0) var u_texture: texture_2d<f32>;

@fragment
fn main(
    @location(0) v_texcoord: vec2<f32>,
) -> @location(0) vec4<f32> {
   return textureSample(u_texture, outSampler, v_texcoord);
}
`
export let GPUVS5 = `
struct VertexOutput {
    @location(0) member: vec4<f32>,
    @builtin(position) gl_Position: vec4<f32>,
}

@group(0) @binding(0) var<uniform> u_matrix: mat4x4<f32>;

@vertex
fn main(@location(0) a_position: vec2<f32>, @location(1) a_color: vec4<f32>) -> VertexOutput {
    let gl_Position: vec4<f32> = vec4<f32>((u_matrix * vec4<f32>(a_position, 1.0, 0)).xy, 0.5, 1.0);
    return VertexOutput(a_color, gl_Position);
}
`;
export let GPUFS5 = `
@fragment
fn main(@location(0) _uv_color: vec4<f32>) -> @location(0) vec4<f32> {
    return _uv_color;
}
`;
export let GLVS5 = `#version 300 es

in vec2 a_position;
in vec4 a_color;

uniform mat4 u_matrix;

out vec4 v_color;

void main() {
  // Multiply the position by the matrix.
  gl_Position = vec4((u_matrix * vec4(a_position, 1, 0)).xy, 0, 1);

  // Copy the color from the attribute to the varying.
  v_color = a_color;
}`;
export let GLFS5 = `#version 300 es

precision highp float;

in vec4 v_color;

out vec4 outColor;

void main() {
  outColor = v_color;
}`;
export const GLVS4 = `attribute vec4 a_position;
uniform mat4 u_worldViewProjection;

void main() {
   gl_Position = u_worldViewProjection * a_position;
}`;
export const GLFS4 = `void main() {
   gl_FragColor = vec4(0,0,0,1);
}`;
export const GPUVS4 = `struct Uniforms {
  u_worldViewProjection: mat4x4<f32>,
}
@group(0) @binding(0) var<uniform> global: Uniforms;

@vertex
fn main(@location(0) a_position: vec4<f32>) -> @builtin(position) vec4<f32> {
  return global.u_worldViewProjection * a_position;
}`;
export const GPUFS4 = `struct FragmentOutput {
  @location(0) outColor: vec4<f32>,
}

@fragment
fn main() -> FragmentOutput {
  return FragmentOutput(vec4<f32>(0.0, 0.0, 0.0, 1.0));
}`;
export const GLVS1 = `attribute vec4 a_Position;
        attribute vec4 a_Color;
        uniform mat4 u_Matrix;
        varying highp vec4 v_Color;
        void main() {
            gl_Position = u_Matrix * a_Position;
            v_Color = a_Color;
        }`;
export const GLFS1 = `
        varying highp vec4 v_Color;
        void main() {
            gl_FragColor = v_Color;
        }`