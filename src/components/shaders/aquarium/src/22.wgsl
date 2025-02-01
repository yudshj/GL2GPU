struct FragmentInput {
    @location(0) v_position : vec4<f32>,
    @location(1) v_texCoord : vec2<f32>,
    @location(2) v_tangent : vec3<f32>,
    @location(3) v_binormal : vec3<f32>,
    @location(4) v_normal : vec3<f32>,
    @location(5) v_surfaceToLight : vec3<f32>,
    @location(6) v_surfaceToView : vec3<f32>,
};

fn lit(l: f32, h: f32, m: f32) -> vec4<f32> {
    // return vec4<f32>(1.0, max(l, 0.0), (l > 0.0) ? pow(max(0.0, h), m) : 0.0, 1.0);
    if l > 0.0 {
        return vec4<f32>(1.0, l, pow(max(0.0, h), m), 1.0);
    } else {
        return vec4<f32>(1.0, 0.0, 0.0, 1.0);
    }
}

fn glTexCoordToGpu(texCoord: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(texCoord.x, 1.0 - texCoord.y);
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
    var diffuseColor : vec4<f32> = textureSample(diffuseT, diffuseS, glTexCoordToGpu(input.v_texCoord)) +
        vec4<f32>(_hyd_uniforms_.tankColorFudge, _hyd_uniforms_.tankColorFudge, _hyd_uniforms_.tankColorFudge, 1);

    var tangentToWorld : mat3x3<f32> = mat3x3<f32>(
        input.v_tangent,
        input.v_binormal,
        input.v_normal
    );
    var normalSpec : vec4<f32> = textureSample(normalMapT, normalMapS, glTexCoordToGpu(input.v_texCoord));

    var refraction : vec4<f32> = textureSample(reflectionMapT, reflectionMapS, glTexCoordToGpu(input.v_texCoord));
    var tangentNormal : vec3<f32> = normalSpec.xyz - vec3<f32>(0.5, 0.5, 0.5);
    tangentNormal = normalize(tangentNormal + vec3<f32>(0.0, 0.0, _hyd_uniforms_.refractionFudge));
    var normal : vec3<f32> = normalize(tangentToWorld * tangentNormal);

    var surfaceToLight : vec3<f32> = normalize(input.v_surfaceToLight);
    var surfaceToView : vec3<f32> = normalize(input.v_surfaceToView);

    var refractionVec : vec3<f32> = refract(surfaceToView, normal, _hyd_uniforms_.eta);

    var skyColor : vec4<f32> = textureSample(skyboxT, skyboxS, refractionVec);

    var outColor : vec4<f32> = vec4<f32>(
        mix(skyColor * diffuseColor, diffuseColor, refraction.r).rgb,
        diffuseColor.a
    );
    outColor = mix(outColor, vec4<f32>(_hyd_uniforms_.fogColor.rgb, diffuseColor.a),
                   clamp(pow((input.v_position.z / input.v_position.w), _hyd_uniforms_.fogPower) * _hyd_uniforms_.fogMult - _hyd_uniforms_.fogOffset, 0.0, 1.0));

    return outColor;
}
