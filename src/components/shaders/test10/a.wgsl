fn webgl_position_to_webgpu(position: vec4<f32>) -> vec4<f32> {
  return vec4<f32>(position.xy, position.z * 0.5 + 0.5, position.w);
}

struct UniformBuffer {
    projection: mat4x4<f32>,
    modelView: mat4x4<f32>,
    lightDir: vec3<f32>,
}

@binding(0) @group(0) var<uniform> uniforms: UniformBuffer;

struct VertexOutput {
    @builtin(position) gl_Position: vec4<f32>,
    @location(0) v_normal: vec3<f32>,
    @location(1) v_texcoord: vec2<f32>,
}

@vertex
fn main(
    @location(0) position: vec4<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) texcoord: vec2<f32>,
) -> VertexOutput {
    let projection = uniforms.projection;
    let modelView = uniforms.modelView;

    let gl_Position = projection * modelView * position;
    let v_normal = mat3x3<f32>(modelView[0].xyz, modelView[1].xyz, modelView[2].xyz) * normal;
    let v_texcoord = texcoord;
    return VertexOutput(webgl_position_to_webgpu(gl_Position), v_normal, v_texcoord);
}