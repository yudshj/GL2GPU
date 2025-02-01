fn webgl_texcoord_to_webgpu(tex_coord: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(tex_coord.x, 1.0 - tex_coord.y);
}
struct UniformBuffer {
    projection: mat4x4<f32>,
    modelView: mat4x4<f32>,
    lightDir: vec3<f32>,
}

@binding(0) @group(0) var<uniform> uniforms: UniformBuffer;
@binding(1) @group(0) var diffuse_sampler: sampler;
@binding(2) @group(0) var diffuse_texture: texture_2d<f32>;

@fragment
fn main(
    @location(0) v_normal: vec3<f32>,
    @location(1) v_texcoord: vec2<f32>,
) -> @location(0) vec4<f32> {
    let normal = normalize(v_normal);
    let light = dot(normal, uniforms.lightDir) * 0.5 + 0.5;
    let color = textureSample(diffuse_texture, diffuse_sampler, webgl_texcoord_to_webgpu(v_texcoord));
//    let color = textureSample(diffuse_texture, diffuse_sampler, v_texcoord);
    return vec4<f32>(color.rgb * light, color.a);
}