#ifdef GL_ES
  precision mediump float;
#endif
uniform sampler2D sprite_texture0;
uniform sampler2D sprite_texture1;
uniform sampler2D sprite_texture2;
uniform sampler2D sprite_texture3;
varying vec3 v_Texcoord;
void main() {
  if (v_Texcoord.z < 1.0) {
    gl_FragColor = texture2D(sprite_texture0, v_Texcoord.xy);
  } else if (v_Texcoord.z < 2.0) {
    gl_FragColor = texture2D(sprite_texture1, v_Texcoord.xy);
  } else if (v_Texcoord.z < 3.0) {
    gl_FragColor = texture2D(sprite_texture2, v_Texcoord.xy);
  } else {
    gl_FragColor = texture2D(sprite_texture3, v_Texcoord.xy);
  }
}