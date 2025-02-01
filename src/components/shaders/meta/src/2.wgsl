@fragment
fn main(
    @location(0) v_Texcoord: vec3<f32>
) -> @location(0) vec4<f32> {
    var color: vec4<f32>;

    if (v_Texcoord.z < 1.0) {
        color = textureSampleLevel(sprite_texture0T, sprite_texture0S, v_Texcoord.xy, 0.0);
    } else if (v_Texcoord.z < 2.0) {
        color = textureSampleLevel(sprite_texture1T, sprite_texture1S, v_Texcoord.xy, 0.0);
    } else if (v_Texcoord.z < 3.0) {
        color = textureSampleLevel(sprite_texture2T, sprite_texture2S, v_Texcoord.xy, 0.0);
    } else {
        color = textureSampleLevel(sprite_texture3T, sprite_texture3S, v_Texcoord.xy, 0.0);
    }

    return color;
}
