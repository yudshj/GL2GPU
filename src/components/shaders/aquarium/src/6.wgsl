struct VertexInput {
  @location(0) uvLifeTimeFrameStart : vec4<f32>,
  @location(1) positionStartTime : vec4<f32>,
  @location(2) velocityStartSize : vec4<f32>,
  @location(3) accelerationEndSize : vec4<f32>,
  @location(4) spinStartSpinSpeed : vec4<f32>,
  @location(5) colorMult : vec4<f32>,
};

struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) Texcoord : vec2<f32>,
  @location(1) PercentLife : f32,
  @location(2) ColorMult : vec4<f32>,
};

@vertex
fn main(input : VertexInput) -> VertexOutput {
  var output : VertexOutput;

  var uv : vec2<f32> = input.uvLifeTimeFrameStart.xy;
  var lifeTime : f32 = input.uvLifeTimeFrameStart.z;
  var frameStart : f32 = input.uvLifeTimeFrameStart.w;
  var position : vec3<f32> = input.positionStartTime.xyz;
  var startTime : f32 = input.positionStartTime.w;
  var velocity : vec3<f32> = (_hyd_uniforms_.world * vec4<f32>(input.velocityStartSize.xyz, 0.0)).xyz + _hyd_uniforms_.worldVelocity;
  var startSize : f32 = input.velocityStartSize.w;
  var acceleration : vec3<f32> = (_hyd_uniforms_.world * vec4<f32>(input.accelerationEndSize.xyz, 0.0)).xyz + _hyd_uniforms_.worldAcceleration;
  var endSize : f32 = input.accelerationEndSize.w;
  var spinStart : f32 = input.spinStartSpinSpeed.x;
  var spinSpeed : f32 = input.spinStartSpinSpeed.y;

  var localTime : f32 = (_hyd_uniforms_.time - _hyd_uniforms_.timeOffset - startTime) % _hyd_uniforms_.timeRange;
  var percentLife : f32 = localTime / lifeTime;

  var frame : f32 = floor(localTime / _hyd_uniforms_.frameDuration + frameStart) % _hyd_uniforms_.numFrames;
  var uOffset : f32 = frame / _hyd_uniforms_.numFrames;
  var u : f32 = uOffset + (uv.x + 0.5) * (1.0 / _hyd_uniforms_.numFrames);

  output.Texcoord = vec2<f32>(u, uv.y + 0.5);
  output.ColorMult = input.colorMult;

  var basisX : vec3<f32> = _hyd_uniforms_.viewInverse[0].xyz;
  var basisZ : vec3<f32> = _hyd_uniforms_.viewInverse[1].xyz;

  var size : f32 = mix(startSize, endSize, percentLife);
  // if (percentLife < 0.0 || percentLife > 1.0) {
  //     size = 0.0;
  // }
  var s : f32 = sin(spinStart + spinSpeed * localTime);
  var c : f32 = cos(spinStart + spinSpeed * localTime);

  var rotatedPoint : vec2<f32> = vec2<f32>(uv.x * c + uv.y * s, -uv.x * s + uv.y * c);
  var localPosition : vec3<f32> = vec3<f32>(basisX * rotatedPoint.x + basisZ * rotatedPoint.y) * size + velocity * localTime + acceleration * localTime * localTime + position;

  output.PercentLife = percentLife;
  output.Position = _hyd_uniforms_.viewProjection * vec4<f32>(localPosition + _hyd_uniforms_.world[3].xyz, 1.0);

  return output;
}
