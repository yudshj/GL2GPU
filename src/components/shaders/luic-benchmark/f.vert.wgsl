struct Uniforms {
    modelMatrix : mat4x4<f32>,
    modelViewMatrix : mat4x4<f32>,
    projectionMatrix : mat4x4<f32>,
    viewMatrix : mat4x4<f32>,
    normalMatrix : mat3x3<f32>,
    cameraPosition : vec3<f32>,

    diffuse : vec3<f32>,
    opacity : f32,
};

@group(0) @binding(0) var<uniform> u_Uniforms : Uniforms;

@vertex
fn main(
        @location(0) position : vec3<f32>,
        @location(1) normal : vec3<f32>,
        @location(2) uv : vec2<f32>,
        @location(3) uv2 : vec2<f32>
    ) -> @builtin(position) vec4<f32> {
    var gl_Position : vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    var mvPosition : vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    mvPosition = u_Uniforms.modelViewMatrix * vec4<f32>(position, 1.0);
    gl_Position = u_Uniforms.projectionMatrix * mvPosition;
    return gl_Position;
}