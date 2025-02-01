export const GPUVS1 = `
struct Uniforms {
    u_Matrix: mat4x4<f32>,
}

struct VertexOutput {
    @builtin(position) member: vec4<f32>,
    @location(0) v_Color: vec4<f32>,
}

@group(0) @binding(0) var<uniform> global: Uniforms;

@vertex
fn main(@location(0) position: vec4<f32>,
        @location(1) color: vec4<f32>
    ) -> VertexOutput {
    let tmp = global.u_Matrix * position;
    return VertexOutput(vec4<f32>(tmp.xy, tmp.z / 2 + 0.5, 1), color);
}
`;