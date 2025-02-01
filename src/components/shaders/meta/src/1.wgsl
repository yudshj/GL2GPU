struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) v_Texcoord: vec3<f32>,
};

@vertex
fn main(
    @location(0) vposition: vec2<f32>,
    @location(1) sprite_pos_tex: vec4<f32>,
    @location(2) sprite_sizerot: vec3<f32>,
    @location(3) sprite_tex_transform: vec4<f32>
) -> VertexOutput {
    var output: VertexOutput;

    let pre_rot: vec2<f32> = vposition * sprite_sizerot.xy;
    let tdir: vec2<f32> = vec2<f32>(sin(sprite_sizerot.z), cos(sprite_sizerot.z));
    let dir: vec2<f32> = vec2<f32>(tdir.y, -tdir.x);

    output.position = vec4<f32>(
        (dot(dir, pre_rot) + sprite_pos_tex.x) * _hyd_uniforms_.screen_dims.x + _hyd_uniforms_.screen_dims.z,
        (dot(tdir, pre_rot) + sprite_pos_tex.y) * _hyd_uniforms_.screen_dims.y + _hyd_uniforms_.screen_dims.w,
        sprite_pos_tex.z,
        1.0
    );
    output.v_Texcoord = vec3<f32>(
        vposition.x * sprite_tex_transform.x + sprite_tex_transform.z,
        vposition.y * sprite_tex_transform.y + sprite_tex_transform.w,
        sprite_pos_tex.w
    );

    return output;
}
