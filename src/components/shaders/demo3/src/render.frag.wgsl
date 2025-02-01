fn webgl_texcoord_to_webgpu(tex_coord: vec2<f32>) -> vec2<f32> {
//    return vec2<f32>(tex_coord.x, 1.0 - tex_coord.y);
    return vec2<f32>(tex_coord.x * 0.5 + 0.5, - tex_coord.y * 0.5 + 0.5);
}

// @group(0) @binding(1) var shadowMapS: sampler;
// @group(0) @binding(2) var shadowMapT: texture_2d<f32>;


@fragment
fn main(
//    @builtin(position) gl_FragCoord: vec4<f32>,
    @location(0) color: vec4<f32>,
    @location(1) normal: vec4<f32>,
    @location(2) shadow_pos: vec4<f32>,
    ) -> @location(0) vec4<f32> {

    var shadow_percentage: f32 = 0.0;

    const bias: f32 = 0.01;
    let size = vec2<f32>(textureDimensions(shadowMapT).xy);

     const L = -10;
     const R = 10;

    for (var x: i32 = L; x <= R; x++) {
        for (var y: i32 = L; y <= R; y++) {
            let offset = vec2<f32>(f32(x), f32(y)) / size;
            let currentDepth = textureSample(
                shadowMapT,
                shadowMapS,
                webgl_texcoord_to_webgpu(shadow_pos.xy + offset),
            // (shadow_pos.xy + offset),
            // shadow_pos.z - bias
            );
            shadow_percentage += select(1.0, 0.0, currentDepth.r < shadow_pos.z - bias);
        }
    }

    shadow_percentage = shadow_percentage / f32((R-L+1) * (R-L+1));
    let visibility: f32 = mix(1.0, shadow_percentage, 0.5);
    return vec4<f32>(visibility * color.rgb, color.a);
}
