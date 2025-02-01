// struct UniformBuffer {
//     world : mat4x4<f32>,
//     viewProjection : mat4x4<f32>,
//     colorMult : vec4<f32>,
// };

// @binding(0) @group(0) var<uniform> _hyd_uniforms_ : UniformBuffer;

// @binding(1) @group(0) var colorMapSamplerS : sampler;
// @binding(2) @group(0) var colorMapSamplerT : texture_2d<f32>;

fn glTexCoordToGpu(texCoord: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(texCoord.x, 1.0 - texCoord.y);
}

@fragment
fn main(
    @location(0) v_texCoord : vec2<f32>
) -> @location(0) vec4<f32> {
    let texColor : vec4<f32> = textureSample(colorMapT, colorMapS, glTexCoordToGpu(v_texCoord));
    return texColor * _hyd_uniforms_.colorMult;
}
