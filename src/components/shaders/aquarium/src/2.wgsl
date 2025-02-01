struct VertexOutput {
    @builtin(position) gl_Position: vec4<f32>,
    @location(0) v_position: vec4<f32>,
    @location(1) v_texCoord: vec2<f32>,
    @location(2) v_tangent: vec3<f32>,
    @location(3) v_binormal: vec3<f32>,
    @location(4) v_normal: vec3<f32>,
    @location(5) v_surfaceToLight: vec3<f32>,
    @location(6) v_surfaceToView: vec3<f32>,
}

@vertex
fn main(
    @location(0) position: vec4<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) texCoord: vec2<f32>,
    @location(3) tangent: vec3<f32>,
    @location(4) binormal: vec3<f32>,
) -> VertexOutput {
    var output: VertexOutput;
    let vz: vec3<f32> = normalize(_hyd_uniforms_.worldPosition - _hyd_uniforms_.nextPosition);
    let vx: vec3<f32> = normalize(cross(vec3<f32>(0.0, 1.0, 0.0), vz));
    let vy: vec3<f32> = cross(vz, vx);
    let orientMat: mat4x4<f32> = mat4x4<f32>(
        vec4<f32>(vx, 0.0),
        vec4<f32>(vy, 0.0),
        vec4<f32>(vz, 0.0),
        vec4<f32>(_hyd_uniforms_.worldPosition, 1.0)
    );
    let scaleMat: mat4x4<f32> = mat4x4<f32>(
        vec4<f32>(_hyd_uniforms_.scale, 0.0, 0.0, 0.0),
        vec4<f32>(0.0, _hyd_uniforms_.scale, 0.0, 0.0),
        vec4<f32>(0.0, 0.0, _hyd_uniforms_.scale, 0.0),
        vec4<f32>(0.0, 0.0, 0.0, 1.0)
    );
    let world: mat4x4<f32> = orientMat * scaleMat;
    let worldInverseTranspose: mat4x4<f32> = world;

    output.v_texCoord = texCoord; // Flip Y-axis

    // NOTE: If you change this you need to change the laser code to match!
    let mult: f32 = select(
        -position.z / _hyd_uniforms_.fishLength * 2.0,
        position.z / _hyd_uniforms_.fishLength,
        position.z > 0.0
    );

    let s: f32 = sin(_hyd_uniforms_.time + mult * _hyd_uniforms_.fishWaveLength);
    let a: f32 = sign(s);
    let offset: f32 = pow(mult, 2.0) * s * _hyd_uniforms_.fishBendAmount;

    output.v_position = _hyd_uniforms_.viewProjection * world * (position + vec4<f32>(offset, 0.0, 0.0, 0.0));
    output.v_normal = (worldInverseTranspose * vec4<f32>(normal, 0.0)).xyz;
    output.v_surfaceToLight = _hyd_uniforms_.lightWorldPos - (world * position).xyz;
    output.v_surfaceToView = (_hyd_uniforms_.viewInverse[3] - (world * position)).xyz;
    output.v_binormal = (worldInverseTranspose * vec4<f32>(binormal, 0.0)).xyz;
    output.v_tangent = (worldInverseTranspose * vec4<f32>(tangent, 0.0)).xyz;
    output.gl_Position = output.v_position;

    return output;
}
