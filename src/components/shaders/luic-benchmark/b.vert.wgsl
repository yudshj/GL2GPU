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

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) uv : vec2<f32>,
};

@vertex
fn main(
    @location(0) position : vec2<f32>,
    @location(1) uv : vec2<f32>,
    @builtin(vertex_index) vertexIndex : u32,
    @builtin(instance_index) instanceIndex : u32,
    // @builtin(position) stage_out : vec4<f32>
) -> VertexOutput {
    var uvCoord : vec2<f32> = u_Uniforms.uvOffset + uv * u_Uniforms.uvScale;
    var alignedPosition : vec2<f32> = position + u_Uniforms.alignment;

    var rotatedPosition : vec2<f32>;
    rotatedPosition.x = (cos(u_Uniforms.rotation) * alignedPosition.x - sin(u_Uniforms.rotation) * alignedPosition.y) * u_Uniforms.scale.x;
    rotatedPosition.y = (sin(u_Uniforms.rotation) * alignedPosition.x + cos(u_Uniforms.rotation) * alignedPosition.y) * u_Uniforms.scale.y;

    var finalPosition : vec4<f32>;

    if (u_Uniforms.useScreenCoordinates != 0) {
        finalPosition = vec4<f32>(u_Uniforms.screenPosition.xy + rotatedPosition, u_Uniforms.screenPosition.z, 1.0);
    } else {
        var tmpFinalPosition = u_Uniforms.projectionMatrix * u_Uniforms.modelViewMatrix * vec4<f32>(0.0, 0.0, 0.0, 1.0);
        var attenuation : f32 = tmpFinalPosition.z;
        if (u_Uniforms.sizeAttenuation == 1) {
            attenuation = 1.0;
        }
        // finalPosition.xy += rotatedPosition * attenuation;
        finalPosition = vec4<f32>(tmpFinalPosition.xy + rotatedPosition * attenuation, tmpFinalPosition.z, tmpFinalPosition.w);
    }

    var output : VertexOutput;
    output.position = finalPosition;
    output.uv = uvCoord;
    return output;
}
