struct UniformBuffer {
    matrix: mat4x4<f32>,
    color: vec4<f32>,
}

@binding(0) @group(0) var<uniform> uniforms: UniformBuffer;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
}

@vertex
fn main(
    @location(0) position: vec4<f32>,
) -> VertexOutput {
    return VertexOutput(uniforms.matrix * position, uniforms.color);
}