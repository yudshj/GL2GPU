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
    var diffuseColor : vec4<f32> = textureSample(diffuseT, diffuseS, glTexCoordToGpu(input.v_texCoord));
    var tangentToWorld : mat3x3<f32> = mat3x3<f32>(
        input.v_tangent,
        input.v_binormal,
        input.v_normal
    );
    var normalSpec : vec4<f32> = textureSample(normalMapT, normalMapS, glTexCoordToGpu(input.v_texCoord));

    var reflection : vec4<f32> = textureSample(reflectionMapT, reflectionMapS, glTexCoordToGpu(input.v_texCoord));
    var tangentNormal : vec3<f32> = normalSpec.xyz - vec3<f32>(0.5, 0.5, 0.5);
    var normal : vec3<f32> = normalize(tangentToWorld * tangentNormal);

    var surfaceToView : vec3<f32> = normalize(input.v_surfaceToView);

    var skyColor : vec4<f32> = textureSample(skyboxT, skyboxS, -reflect(surfaceToView, normal));

    var fudgeAmount : f32 = 1.1;
    var fudge : vec3<f32> = skyColor.rgb * vec3<f32>(fudgeAmount, fudgeAmount, fudgeAmount);
    var bright : f32 = min(1.0, fudge.r * fudge.g * fudge.b);
    var reflectColor : vec4<f32> = mix(
        vec4<f32>(skyColor.rgb, bright),
        diffuseColor,
        (1.0 - reflection.r)
    );

    var r : f32 = abs(dot(surfaceToView, normal));
    var fragColor : vec4<f32> = vec4<f32>(mix(
        skyColor,
        reflectColor,
        ((r + 0.3) * reflection.r)).rgb, 1.0 - r);

    return fragColor;
}
