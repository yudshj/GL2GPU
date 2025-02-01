fn webgl_position_to_webgpu(position: vec4<f32>) -> vec4<f32> {
  return vec4<f32>(position.xy, position.z * 0.5 + 0.5, position.w);
}

// struct UniformBufferType {
//     modelView: mat4x4<f32>,
//     lightProjection: mat4x4<f32>,
// }

// @group(0) @binding(0) var<uniform> _hyd_uniforms_: UniformBufferType;

@vertex
fn main(
    @location(0) position: vec4<f32>
    ) -> @builtin(position) vec4<f32> {

    // light position
//    return (lightProjection * modelView * position).zzzz;
    return (_hyd_uniforms_.lightProjection * _hyd_uniforms_.modelView * position);
}