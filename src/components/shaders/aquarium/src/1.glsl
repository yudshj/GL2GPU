attribute vec4 position;
attribute vec2 texCoord;
varying vec2 v_texCoord;
uniform mat4 world;
uniform mat4 viewProjection;
void main() {
  v_texCoord = texCoord;
  gl_Position = (viewProjection * world * position);
}