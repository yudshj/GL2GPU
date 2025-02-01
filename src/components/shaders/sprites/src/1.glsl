uniform float u_frameOffset;

// Corrects for screen size.
uniform vec4 u_screenDims;

// Center of the sprite in screen coordinates
attribute vec2 centerPosition;

attribute float rotation;

// Per-sprite frame offset.
attribute float perSpriteFrameOffset;

// Sprite size in screen coordinates
attribute float spriteSize;

// Offset of this vertex's corner from the center, in normalized
// coordinates for the sprite. In other words:
//   (-0.5, -0.5) => Upper left corner
//   ( 0.5, -0.5) => Upper right corner
//   (-0.5,  0.5) => Lower left corner
//   ( 0.5,  0.5) => Lower right corner
attribute vec2 cornerOffset;

// Note: we currently assume that all sprite sheets start from the
// upper-left corner (which we define as (0,0)). Simply add another
// attribute float for the Y start of the sheet's upper left corner to
// add support for packing multiple sheets onto a single texture.

// Specified in normalized coordinates (0.0..1.0).
attribute vec2 spriteTextureSize;

attribute float spritesPerRow;
attribute float numFrames;

// For now we fix the number of textures the atlas can handle to 4.
// We could improve this by generating the shader code and passing
// down a varying array. Each element in this vec4 is either 0.0 or
// 1.0, with only one 1.0 entry, and essentially selects which texture
// will be displayed on the sprite.
attribute vec4 textureWeights;

// Output to the fragment shader.
varying vec2 v_texCoord;
varying vec4 v_textureWeights;

void main() {
  // Compute the frame number
  float frameNumber = mod(u_frameOffset + perSpriteFrameOffset, numFrames);
  // Compute the row
  float row = floor(frameNumber / spritesPerRow);
  // Compute the upper left texture coordinate of the sprite
  vec2 upperLeftTC = vec2(spriteTextureSize.x * (frameNumber - (row * spritesPerRow)),
                          spriteTextureSize.y * row);
  // Compute the texture coordinate of this vertex
  vec2 tc = upperLeftTC + spriteTextureSize * (cornerOffset + vec2(0.5, 0.5));
  v_texCoord = tc;
  v_textureWeights = textureWeights;

  float s = sin(rotation);
  float c = cos(rotation);
  mat2 rotMat = mat2(c, -s, s, c);
  vec2 scaledOffset = spriteSize * cornerOffset;
  vec2 pos = centerPosition + rotMat * scaledOffset;
  gl_Position = vec4(pos * u_screenDims.xy + u_screenDims.zw, 0.0, 1.0);
}