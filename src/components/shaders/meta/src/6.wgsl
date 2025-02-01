@fragment
fn main(
    @location(0) v_Texcoord: vec2<f32>
) -> @location(0) vec4<f32> {
    var color: vec4<f32>;
    color = textureSample(sprite_textureT, sprite_textureS, v_Texcoord);
    return color;
}
