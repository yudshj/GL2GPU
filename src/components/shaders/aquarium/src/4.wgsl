struct VertexInput {
    @location(0) uvLifeTimeFrameStart : vec4<f32>,
    @location(1) positionStartTime : vec4<f32>,
    @location(2) velocityStartSize : vec4<f32>,
    @location(3) accelerationEndSize : vec4<f32>,
    @location(4) spinStartSpinSpeed : vec4<f32>,
    @location(5) orientation : vec4<f32>,
    @location(6) colorMult : vec4<f32>,
};

struct VertexOutput {
    @builtin(position) Position : vec4<f32>,
    @location(0) Texcoord : vec2<f32>,
    @location(1) PercentLife : f32,
    @location(2) ColorMult : vec4<f32>,
}

@vertex
fn main(vertexInput : VertexInput) -> VertexOutput {
    var output : VertexOutput;
    
    var uv : vec2<f32> = vertexInput.uvLifeTimeFrameStart.xy;
    var lifeTime : f32 = vertexInput.uvLifeTimeFrameStart.z;
    var frameStart : f32 = vertexInput.uvLifeTimeFrameStart.w;
    var position : vec3<f32> = vertexInput.positionStartTime.xyz;
    var startTime : f32 = vertexInput.positionStartTime.w;
    var velocity : vec3<f32> = (_hyd_uniforms_.world * vec4<f32>(vertexInput.velocityStartSize.xyz, 0.0)).xyz + _hyd_uniforms_.worldVelocity;
    var startSize : f32 = vertexInput.velocityStartSize.w;
    var acceleration : vec3<f32> = (_hyd_uniforms_.world * vec4<f32>(vertexInput.accelerationEndSize.xyz, 0.0)).xyz + _hyd_uniforms_.worldAcceleration;
    var endSize : f32 = vertexInput.accelerationEndSize.w;
    var spinStart : f32 = vertexInput.spinStartSpinSpeed.x;
    var spinSpeed : f32 = vertexInput.spinStartSpinSpeed.y;

    var localTime : f32 = (_hyd_uniforms_.time - _hyd_uniforms_.timeOffset - startTime) % _hyd_uniforms_.timeRange;
    var percentLife : f32 = localTime / lifeTime;

    var frame : f32 = (floor(localTime / _hyd_uniforms_.frameDuration + frameStart) % _hyd_uniforms_.numFrames);
    var uOffset : f32 = frame / _hyd_uniforms_.numFrames;
    var u : f32 = uOffset + (uv.x + 0.5) * (1.0 / _hyd_uniforms_.numFrames);

    output.Texcoord = vec2<f32>(u, uv.y + 0.5);
    output.ColorMult = vertexInput.colorMult;

    var size : f32 = mix(startSize, endSize, percentLife);
    // if (percentLife < 0.0 || percentLife > 1.0) {
    //     size = 0.0;
    // }
    var s : f32 = sin(spinStart + spinSpeed * localTime);
    var c : f32 = cos(spinStart + spinSpeed * localTime);

    var rotatedPoint : vec4<f32> = vec4<f32>((uv.x * c + uv.y * s) * size, 0.0, (uv.x * s - uv.y * c) * size, 1.0);
    var center : vec3<f32> = velocity * localTime + acceleration * localTime * localTime + position;

    var q2 : vec4<f32> = vertexInput.orientation + vertexInput.orientation;
    var qx : vec4<f32> = vertexInput.orientation.xxxw * q2.xyzx;
    var qy : vec4<f32> = vertexInput.orientation.xyyw * q2.xyzy;
    var qz : vec4<f32> = vertexInput.orientation.xxzw * q2.xxzz;

    var localMatrix : mat4x4<f32> = mat4x4<f32>(
        (1.0 - qy.y) - qz.z,
        qx.y + qz.w,
        qx.z - qy.w,
        0.0,

        qx.y - qz.w,
        (1.0 - qx.x) - qz.z,
        qy.z + qx.w,
        0.0,

        qx.z + qy.w,
        qy.z - qx.w,
        (1.0 - qx.x) - qy.y,
        0.0,

        center.x, center.y, center.z, 1.0
    );
    rotatedPoint = localMatrix * rotatedPoint;
    output.PercentLife = percentLife;
    output.Texcoord.y = 1.0 - output.Texcoord.y; // Flip Y-axis
    output.Position = _hyd_uniforms_.viewProjection * _hyd_uniforms_.world * rotatedPoint;

    return output;
}