// uniform sampler2D u_texture0;
// uniform sampler2D u_texture1;
// uniform sampler2D u_texture2;
// uniform sampler2D u_texture3;

struct FragmentInput {
    @location(0) texCoord : vec2<f32>,
    @location(1) textureWeightsOut : vec4<f32>,
};

@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
    return textureSample(u_texture0T, u_texture0S, input.texCoord) * input.textureWeightsOut.x +
        textureSample(u_texture1T, u_texture1S, input.texCoord) * input.textureWeightsOut.y +
        textureSample(u_texture2T, u_texture2S, input.texCoord) * input.textureWeightsOut.z +
        textureSample(u_texture3T, u_texture3S, input.texCoord) * input.textureWeightsOut.w;
}
