fn webgl_position_to_webgpu(position: vec4<f32>) -> vec4<f32> {
  return vec4<f32>(position.xy, position.z * 0.5 + 0.5, position.w);
}

struct UniformBufferType {
    model_view: mat4x4<f32>,
    light_projection: mat4x4<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: UniformBufferType;

@vertex
fn main(
    @location(0) position: vec4<f32>,
    @location(1) normal: vec4<f32>,
    @location(2) color: vec4<f32>
    ) -> @builtin(position) vec4<f32> {

    // light position
//    return (light_projection * model_view * position).zzzz;
    return (uniforms.light_projection * uniforms.model_view * position);
}