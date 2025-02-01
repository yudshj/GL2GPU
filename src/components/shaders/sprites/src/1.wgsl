// struct Uniforms {
//   frameOffset : f32,

//   // Corrects for screen size.
//   screenDims : vec4,
// };

// @binding(0) @group(0) var<uniform> uniforms : Uniforms;

struct VertexInput {
    @location(0) centerPosition : vec2<f32>,
    @location(1) rotation : f32,
    @location(2) perSpriteFrameOffset : f32,
    @location(3) spriteSize : f32,
    @location(4) cornerOffset : vec2<f32>,
    @location(5) spriteTextureSize : vec2<f32>,
    @location(6) spritesPerRow : f32,
    @location(7) numFrames : f32,
    @location(8) textureWeights : vec4<f32>,
}

// @builtin(position) var<out> Position : vec4<f32>;
// @location(0), interpolate(linear) var<out> texCoord : vec2<f32>;
// @location(1), interpolate(linear) var<out> textureWeightsOut : vec4<f32>;

struct VertexOutput {
    @builtin(position) Position : vec4<f32>,
    @location(0) texCoord : vec2<f32>,
    @location(1) textureWeightsOut : vec4<f32>,
};

@vertex
fn main(input: VertexInput) -> VertexOutput {
  // Compute the frame number
  // let frameNumber : f32 = mod(_hyd_uniforms_.u_frameOffset + input.perSpriteFrameOffset, input.numFrames);
  let frameNumber : f32 = (_hyd_uniforms_.u_frameOffset + input.perSpriteFrameOffset) % input.numFrames;
  // Compute the row
  let row : f32 = floor(frameNumber / input.spritesPerRow);
  // Compute the upper left texture coordinate of the sprite
  let upperLeftTC : vec2<f32> = vec2<f32>(input.spriteTextureSize.x * (frameNumber - (row * input.spritesPerRow)),
                          input.spriteTextureSize.y * row);
  // Compute the texture coordinate of this vertex
  let tc : vec2<f32> = upperLeftTC + input.spriteTextureSize * (input.cornerOffset + vec2<f32>(0.5, 0.5));

  let s : f32 = sin(input.rotation);
  let c : f32 = cos(input.rotation);
  let rotMat : mat2x2<f32> = mat2x2<f32>(c, -s, s, c);
  let scaledOffset : vec2<f32> = input.spriteSize * input.cornerOffset;
  let pos : vec2<f32> = input.centerPosition + rotMat * scaledOffset;
  var output : VertexOutput;
  output.Position = vec4<f32>(pos * _hyd_uniforms_.u_screenDims.xy + _hyd_uniforms_.u_screenDims.zw, 0.5, 1.0);
  // output.Position = vec4<f32>(pos * vec2<f32>(0.0010416666666666667,-0.002257336343115124) + vec2<f32>(-1.0, 1.0), 0.0, 1.0);
  // output.Position = vec4<f32>(pos, 0.5, 1.0);
  output.texCoord = tc;
  output.textureWeightsOut = input.textureWeights;
  return output;
}