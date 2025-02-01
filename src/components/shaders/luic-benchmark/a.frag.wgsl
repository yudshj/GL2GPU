struct Uniforms {
    useScreenCoordinates : i32,
    sizeAttenuation : i32,
    screenPosition : vec3<f32>,
    modelViewMatrix : mat4x4<f32>,
    projectionMatrix : mat4x4<f32>,
    rotation : f32,
    scale : vec2<f32>,
    alignment : vec2<f32>,
    uvOffset : vec2<f32>,
    uvScale : vec2<f32>,
    
    color : vec3<f32>,
    opacity : f32,
    fogType : i32,
    fogColor : vec3<f32>,
    fogDensity : f32,
    fogNear : f32,
    fogFar : f32,
    alphaTest : f32,
};

@binding(0) @group(0) var<uniform> u_Uniforms : Uniforms;
@binding(1) @group(0) var map_sampler : sampler;
@binding(2) @group(0) var map_texture : texture_2d<f32>;


@fragment
fn main(
    @builtin(position) fragCoord : vec4<f32>,
    @location(0) uv : vec2<f32>,
    @location(1) color : vec4<f32>
) -> @location(0) vec4<f32> {
    var texture : vec4<f32> = textureSample(map_texture, map_sampler, uv);

    if (texture.a < u_Uniforms.alphaTest) {
        return vec4<f32>(0.0, 0.0, 0.0, 0.0);
    }

    var outputColor : vec4<f32> = vec4<f32>(u_Uniforms.color * texture.xyz, texture.a * u_Uniforms.opacity);

    if (u_Uniforms.fogType > 0) {
        var depth : f32 = fragCoord.z / fragCoord.w;
        var fogFactor : f32 = 0.0;

        if (u_Uniforms.fogType == 1) {
            fogFactor = smoothstep(u_Uniforms.fogNear, u_Uniforms.fogFar, depth);
        } else {
            var LOG2 : f32 = 1.442695;
            fogFactor = exp2(-u_Uniforms.fogDensity * u_Uniforms.fogDensity * depth * depth * LOG2);
            fogFactor = 1.0 - clamp(fogFactor, 0.0, 1.0);
        }

        outputColor = mix(outputColor, vec4<f32>(u_Uniforms.fogColor, outputColor.w), fogFactor);
    }

    return outputColor;
}
