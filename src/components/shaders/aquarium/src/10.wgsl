struct VertexOutput {
    @builtin(position) Position : vec4<f32>,
    @location(0) v_position : vec4<f32>,
    @location(1) v_texCoord : vec2<f32>,
    @location(2) v_tangent : vec3<f32>,
    @location(3) v_binormal : vec3<f32>,
    @location(4) v_normal : vec3<f32>,
    @location(5) v_surfaceToLight : vec3<f32>,
    @location(6) v_surfaceToView : vec3<f32>,
};

struct VertexInput {
    @location(0) position : vec4<f32>,
    @location(1) normal : vec3<f32>,
    @location(2) texCoord : vec2<f32>,
    @location(3) tangent : vec3<f32>,
    @location(4) binormal : vec3<f32>,
};

@vertex
fn main(input : VertexInput) -> VertexOutput {
    var output : VertexOutput;

    output.v_texCoord = input.texCoord;
    output.v_position = _hyd_uniforms_.viewProjection * _hyd_uniforms_.world * input.position;
    output.v_normal = (_hyd_uniforms_.worldInverseTranspose * vec4<f32>(input.normal, 0.0)).xyz;
    output.v_surfaceToLight = _hyd_uniforms_.lightWorldPos - (_hyd_uniforms_.world * input.position).xyz;
    output.v_surfaceToView = (_hyd_uniforms_.viewInverse[3] - (_hyd_uniforms_.world * input.position)).xyz;
    output.v_binormal = (_hyd_uniforms_.worldInverseTranspose * vec4<f32>(input.binormal, 0.0)).xyz;
    output.v_tangent = (_hyd_uniforms_.worldInverseTranspose * vec4<f32>(input.tangent, 0.0)).xyz;

    output.Position = output.v_position;
    return output;
}
