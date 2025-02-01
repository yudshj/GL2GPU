struct VertexInput {
    @location(0) position : vec4<f32>,
    @location(1) normal : vec3<f32>,
    @location(2) texCoord : vec2<f32>,
};

struct VertexOutput {
    @builtin(position) Position : vec4<f32>,
    @location(0) v_texCoord : vec2<f32>,
    @location(1) v_position : vec4<f32>,
    @location(2) v_normal : vec3<f32>,
    @location(3) v_surfaceToLight : vec3<f32>,
    @location(4) v_surfaceToView : vec3<f32>,
};

@vertex
fn main(input : VertexInput) -> VertexOutput {
    var output : VertexOutput;

    var toCamera : vec3<f32> = normalize(_hyd_uniforms_.viewInverse[3].xyz - _hyd_uniforms_.world[3].xyz);
    var yAxis : vec3<f32> = vec3<f32>(0.0, 1.0, 0.0);
    var xAxis : vec3<f32> = cross(yAxis, toCamera);
    var zAxis : vec3<f32> = cross(xAxis, yAxis);

    var newWorld : mat4x4<f32> = mat4x4<f32>(
        vec4(xAxis, 0.0),
        vec4(yAxis, 0.0),
        vec4(xAxis, 0.0),
        _hyd_uniforms_.world[3]);

    output.v_texCoord = input.texCoord;
    output.v_position = input.position + vec4<f32>(
        sin(_hyd_uniforms_.time * 0.5) * pow(input.position.y * 0.07, 2.0) * 1.0,
        -4.0,  // TODO(gman): remove this hack
        0.0,
        0.0);
    output.v_position = _hyd_uniforms_.viewProjection * newWorld * output.v_position;
    output.v_normal = (newWorld * vec4<f32>(input.normal, 0.0)).xyz;
    output.v_surfaceToLight = _hyd_uniforms_.lightWorldPos - (_hyd_uniforms_.world * input.position).xyz;
    output.v_surfaceToView = (_hyd_uniforms_.viewInverse[3] - (_hyd_uniforms_.world * input.position)).xyz;
    output.Position = output.v_position;

    return output;
}
