struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) v_Texcoord: vec2<f32>,
};

@vertex
fn main(
    @location(0) vposition: vec2<f32>,
) -> VertexOutput {
    var output: VertexOutput;

    let pre_rot: vec2<f32> = vposition * _hyd_uniforms_.sprite_sizerot.xy;
    let tdir: vec2<f32> = vec2<f32>(sin(_hyd_uniforms_.sprite_sizerot.z), cos(_hyd_uniforms_.sprite_sizerot.z));
    let dir: vec2<f32> = vec2<f32>(tdir.y, -tdir.x);

    output.position = vec4<f32>(
        (dot(dir, pre_rot) + _hyd_uniforms_.sprite_pos.x) * _hyd_uniforms_.screen_dims.x + _hyd_uniforms_.screen_dims.z,
        (dot(tdir, pre_rot) + _hyd_uniforms_.sprite_pos.y) * _hyd_uniforms_.screen_dims.y + _hyd_uniforms_.screen_dims.w,
        _hyd_uniforms_.sprite_pos.z,
        1.0
    );
    output.v_Texcoord = vec2<f32>(
        vposition.x * _hyd_uniforms_.sprite_tex_transform.x + _hyd_uniforms_.sprite_tex_transform.z,
        vposition.y * _hyd_uniforms_.sprite_tex_transform.y + _hyd_uniforms_.sprite_tex_transform.w,
    );

    return output;
}
