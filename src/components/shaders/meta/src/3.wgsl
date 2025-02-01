// struct Uniforms {
//     modelviewproj0: vec4<f32>,
//     modelviewproj1: vec4<f32>,
//     modelviewproj2: vec4<f32>,
//     modelviewproj3: vec4<f32>,
// };

// @group(0) @binding(0) var<uniform> _hyd_uniforms_: Uniforms;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
};

@vertex
fn main(
    @location(0) vposition: vec3<f32>,
    @location(1) vtexcoord: vec2<f32>,
    @location(2) vnormal: vec3<f32>
) -> VertexOutput {
    var output: VertexOutput;

    let hpos: vec4<f32> = vec4<f32>(vposition, 1.0);

    output.position.x = dot(_hyd_uniforms_.modelviewproj0, hpos);
    output.position.y = dot(_hyd_uniforms_.modelviewproj1, hpos);
    output.position.z = dot(_hyd_uniforms_.modelviewproj2, hpos);
    output.position.w = dot(_hyd_uniforms_.modelviewproj3, hpos);

    return output;
}
