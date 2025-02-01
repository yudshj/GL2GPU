// #version 300 es
// precision highp float;

// // Passed in from the vertex shader.
// in vec3 v_normal;

// // The texture.
// uniform samplerCube u_texture;

// // we need to declare an output for the fragment shader
// out vec4 outColor;

// void main() {
//    outColor = texture(u_texture, normalize(v_normal));
// }

@binding(1) @group(0) var u_texture_sampler: sampler;
@binding(2) @group(0) var u_texture_texture: texture_cube<f32>;

@fragment
fn main(@location(0) v_normal: vec3<f32>) -> @location(0) vec4<f32> {
    // return textureSample(u_texture_texture, u_texture_sampler, normalize(v_normal));
    return textureSample(u_texture_texture, u_texture_sampler, v_normal);
}