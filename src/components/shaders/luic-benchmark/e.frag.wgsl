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

@fragment
fn main() -> @location(0)  vec4<f32> {
    var webgl_FragColor = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    webgl_FragColor = vec4<f32>(u_Uniforms.diffuse, u_Uniforms.opacity);
    var _uspecularStrength : f32 = 0.0;
    _uspecularStrength = 1.0;
    return webgl_FragColor;
}
