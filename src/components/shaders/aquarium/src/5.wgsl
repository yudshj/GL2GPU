struct FragmentInput {
    @location(0) Texcoord : vec2<f32>,
    @location(1) PercentLife : f32,
    @location(2) ColorMult : vec4<f32>,
};

fn glTexCoordToGpu(texCoord: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(texCoord.x, 1.0 - texCoord.y);
}

@fragment
fn main(input : FragmentInput) -> @location(0) vec4<f32> {
    // return vec4<f32>(1.0, 0.0, 0.0, 1.0);
    let colorMult : vec4<f32> = textureSample(rampSamplerT, rampSamplerS, vec2<f32>(input.PercentLife, 0.5)) * input.ColorMult;
    let colorSample : vec4<f32> = textureSample(colorSamplerT, colorSamplerS, glTexCoordToGpu(input.Texcoord));

    return colorSample * colorMult;
}