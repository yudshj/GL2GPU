fn webgl_position_to_webgpu(position: vec4<f32>) -> vec4<f32> {
  return vec4<f32>(position.xy, position.z * 0.5 + 0.5, position.w);
}

struct VertexOutput {
    @builtin(position) Position: vec4<f32>,
    @location(0) shadow_pos: vec4<f32>,
    @location(1) color: vec4<f32>,
    @location(2) normal: vec4<f32>,
}

struct UniformBufferType {
    model_view: mat4x4<f32>,
    light_projection: mat4x4<f32>,
    camera_projection: mat4x4<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: UniformBufferType;

@vertex
fn main(
    @location(0) position: vec4<f32>,
    @location(1) normal: vec4<f32>,
    @location(2) color: vec4<f32>
    ) -> VertexOutput {

    let camera_pos = uniforms.camera_projection * uniforms.model_view * position;
    let light_pos = uniforms.light_projection * uniforms.model_view * position;

    let output = VertexOutput(
        camera_pos,
        // webgl_position_to_webgpu(camera_pos),
        light_pos,
        // vec4<f32>(light_pos.xy * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5, 0.5), light_pos.z, 1.0),
        color,
        normal,
    );
    return output;
}
