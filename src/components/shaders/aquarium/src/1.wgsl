// struct Uniforms {
//     world : mat4x4<f32>,
//     viewProjection : mat4x4<f32>,
//     colorMult : vec4<f32>,
// };
// @group(0) @binding(0) var<uniform> _hyd_uniforms_ : Uniforms;

struct VertexOutput {
    @builtin(position) gl_Position: vec4<f32>,
    @location(0) v_texCoord: vec2<f32>,
}

@vertex
fn main(
    @location(0) position : vec4<f32>,
    @location(1) texCoord : vec2<f32>,
) -> VertexOutput {
    var v_texCoord = texCoord;
    var gl_Position = _hyd_uniforms_.viewProjection * _hyd_uniforms_.world * position;
    return VertexOutput(
        gl_Position,
        v_texCoord
    );
}
