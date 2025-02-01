fn webgl_position_to_webgpu(position: vec4<f32>) -> vec4<f32> {
  return vec4<f32>(position.xy, position.z * 0.5 + 0.5, position.w);
}

struct VertexOutput {
    @builtin(position) Position: vec4<f32>,
    @location(0) color: vec4<f32>,
    @location(1) normal: vec4<f32>,
    @location(2) shadow_pos: vec4<f32>,
}

// struct UniformBufferType {
//     modelView: mat4x4<f32>,
//     lightProjection: mat4x4<f32>,
//     cameraProjection: mat4x4<f32>,
// }

// @group(0) @binding(0) var<uniform> _hyd_uniforms_: UniformBufferType;

@vertex
fn main(
    @location(0) position: vec4<f32>,
    @location(1) normal: vec4<f32>,
    @location(2) color: vec4<f32>
    ) -> VertexOutput {

    let camera_pos = _hyd_uniforms_.cameraProjection * _hyd_uniforms_.modelView * position;
    let light_pos = _hyd_uniforms_.lightProjection * _hyd_uniforms_.modelView * position;

    let output = VertexOutput(
        camera_pos,
        // webgl_position_to_webgpu(camera_pos),
        // vec4<f32>(light_pos.xy * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5, 0.5), light_pos.z, 1.0),
        color,
        normal,
        light_pos,
    );
    return output;
}
