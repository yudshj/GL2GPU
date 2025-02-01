struct VertexOutput {
    @builtin(position) gl_Position: vec4<f32>,
}

@group(0) @binding(0) var<uniform> uMVMatrix: mat4x4<f32>;
@group(0) @binding(1) var<uniform> uPMatrix: mat4x4<f32>;

@vertex
fn main(@location(0) aPos: vec3<f32>) -> VertexOutput {
    let gl_Position: vec4<f32> = uPMatrix * uMVMatrix * vec4<f32>(aPos, 1);
    return VertexOutput(gl_Position);
}