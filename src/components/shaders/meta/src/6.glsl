#ifdef GL_ES
  precision mediump float;
#endif
uniform sampler2D sprite_texture;
varying vec2 v_Texcoord;
void main() {
  gl_FragColor = texture2D(sprite_texture, v_Texcoord);
}