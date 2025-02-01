struct Uniforms {
    renderType : i32,
    screenPosition : vec3<f32>,
    scale : vec2<f32>,
    rotation : f32,
    opacity : f32,
    color : vec4<f32>,
};

struct VertexOutput {
    @builtin(position) stage_out : vec4<f32>,
    @location(0) vUV: vec2<f32>,
    @location(1) vVisibility: f32,
};

@binding(0) @group(0)
var<uniform> u_Uniforms : Uniforms;

@binding(1) @group(0)
var occlusionMapSampler : sampler;

@binding(2) @group(0)
var occlusionMap : texture_2d<f32>;

@vertex
fn main(
    @location(0) position : vec2<f32>,
    @location(1) uv : vec2<f32>,
    @builtin(vertex_index) vertexIndex : u32,
    @builtin(instance_index) instanceIndex : u32,
) -> VertexOutput {
    var renderType : i32 = u_Uniforms.renderType;
    var screenPosition : vec3<f32> = u_Uniforms.screenPosition;
    var scale : vec2<f32> = u_Uniforms.scale;
    var rotation : f32 = u_Uniforms.rotation;

    var vUV : vec2<f32> = uv;
    var vVisibility : f32 = 1.0;

    var pos : vec2<f32> = position;

    if (renderType == 2) {
        // var visibility : vec4<f32> = textureSample(occlusionMap, occlusionMapSampler, vec2<f32>(0.1, 0.1)) +
        //                              textureSample(occlusionMap, occlusionMapSampler, vec2<f32>(0.5, 0.1)) +
        //                              textureSample(occlusionMap, occlusionMapSampler, vec2<f32>(0.9, 0.1)) +
        //                              textureSample(occlusionMap, occlusionMapSampler, vec2<f32>(0.9, 0.5)) +
        //                              textureSample(occlusionMap, occlusionMapSampler, vec2<f32>(0.9, 0.9)) +
        //                              textureSample(occlusionMap, occlusionMapSampler, vec2<f32>(0.5, 0.9)) +
        //                              textureSample(occlusionMap, occlusionMapSampler, vec2<f32>(0.1, 0.9)) +
        //                              textureSample(occlusionMap, occlusionMapSampler, vec2<f32>(0.1, 0.5)) +
        //                              textureSample(occlusionMap, occlusionMapSampler, vec2<f32>(0.5, 0.5));

        var visibility = vec4<f32>(0.0, 0.0, 0.0, 0.0);

        vVisibility = (visibility.r / 9.0) *
                      (1.0 - visibility.g / 9.0) *
                      (visibility.b / 9.0) *
                      (1.0 - visibility.a / 9.0);

        pos.x = cos(rotation) * position.x - sin(rotation) * position.y;
        pos.y = sin(rotation) * position.x + cos(rotation) * position.y;
    }

    vUV = uv;
    var ret: VertexOutput;
    ret.vUV = vUV;
    ret.vVisibility = vVisibility;
    ret.stage_out = vec4<f32>((pos * scale + screenPosition.xy).xy, screenPosition.z, 1.0);
    return ret;
}
