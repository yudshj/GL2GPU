struct Uniforms {
    renderType : i32,
    screenPosition : vec3<f32>,
    scale : vec2<f32>,
    rotation : f32,
    opacity : f32,
    color : vec4<f32>,
};

@binding(0) @group(0) var<uniform> u_Uniforms : Uniforms;

@binding(1) @group(0) var map_sampler : sampler;
@binding(2) @group(0) var map_texture : texture_2d<f32>;

@fragment
fn main(
    @location(0) vUV : vec2<f32>,
    @location(1) vVisibility : f32,
) -> @location(0) vec4<f32> {
    var renderType : i32 = u_Uniforms.renderType;

    if (renderType == 0) {
        return vec4<f32>(1.0, 0.0, 1.0, 0.0);
    } else if (renderType == 1) {
        return textureSample(map_texture, map_sampler, vUV);
    } else {
        var texture : vec4<f32> = textureSample(map_texture, map_sampler, vUV);
        texture.a *= u_Uniforms.opacity * vVisibility;
        return texture * u_Uniforms.color;
    }
}
