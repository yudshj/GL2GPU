fn webgl_position_to_webgpu(position: vec4<f32>) -> vec4<f32> {
  return vec4<f32>(position.xy, position.z * 0.5 + 0.5, position.w);
}

@binding(0) @group(0) var<uniform> u_matrix: mat4x4<f32>;

struct VertexOutput {
    @builtin(position) gl_Position: vec4<f32>,
    @location(0) v_normal: vec3<f32>,
}

@vertex
fn main(@location(0) a_position: vec4<f32>) -> VertexOutput {
    return VertexOutput(webgl_position_to_webgpu(u_matrix * a_position), normalize(a_position.xyz));
    // return VertexOutput((u_matrix * a_position), normalize(a_position.xyz));
}