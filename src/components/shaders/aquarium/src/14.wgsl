struct VertexInput {
    @location(0) v_position : vec4<f32>,
    @location(1) v_texCoord : vec2<f32>,
    @location(2) v_tangent : vec3<f32>,  // #normalMap
    @location(3) v_binormal : vec3<f32>,  // #normalMap
    @location(4) v_normal : vec3<f32>,
    @location(5) v_surfaceToLight : vec3<f32>,
    @location(6) v_surfaceToView : vec3<f32>,
};

fn glTexCoordToGpu(texCoord: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(texCoord.x, 1.0 - texCoord.y);
}

@fragment
fn main(input : VertexInput) -> @location(0) vec4<f32> {
    var diffuseColor : vec4<f32> = textureSample(diffuseT, diffuseS, glTexCoordToGpu(input.v_texCoord)) +
                                  vec4<f32>(_hyd_uniforms_.tankColorFudge, _hyd_uniforms_.tankColorFudge, _hyd_uniforms_.tankColorFudge, 1.0);

    var normalSpec : vec4<f32> = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    var refraction : vec4<f32> = textureSample(reflectionMapT, reflectionMapS, glTexCoordToGpu(input.v_texCoord));

    var normal : vec3<f32> = normalize(input.v_normal);
    var surfaceToLight : vec3<f32> = normalize(input.v_surfaceToLight);
    var surfaceToView : vec3<f32> = normalize(input.v_surfaceToView);

    var refractionVec : vec3<f32> = refract(surfaceToView, normal, _hyd_uniforms_.eta);

    var skyColor : vec4<f32> = textureSample(skyboxT, skyboxS, refractionVec);

    var outColor : vec4<f32> = vec4<f32>(
        mix(skyColor * diffuseColor, diffuseColor, refraction.r).rgb,
        diffuseColor.a
    );

    var fogFactor : f32 = pow((input.v_position.z / input.v_position.w), _hyd_uniforms_.fogPower) * _hyd_uniforms_.fogMult - _hyd_uniforms_.fogOffset;
    fogFactor = clamp(fogFactor, 0.0, 1.0);
    outColor = mix(outColor, _hyd_uniforms_.fogColor, fogFactor);

    return outColor;
}
