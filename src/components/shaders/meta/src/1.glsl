attribute vec2 vposition;
attribute vec4 sprite_pos_tex;
attribute vec3 sprite_sizerot;
attribute vec4 sprite_tex_transform;
uniform vec4 screen_dims;
varying vec3 v_Texcoord;
void main() {
  vec2 pre_rot = vposition * sprite_sizerot.xy;
  vec2 tdir = vec2(sin(sprite_sizerot.z), cos(sprite_sizerot.z));
  vec2 dir = vec2(tdir.y, -tdir.x);
  gl_Position.x = dot(dir, pre_rot);
  gl_Position.y = dot(tdir, pre_rot);
  gl_Position.xy = (gl_Position.xy + sprite_pos_tex.xy) *
                     screen_dims.xy + screen_dims.zw;
  gl_Position.z = sprite_pos_tex.z;
  gl_Position.w = 1.0;
  v_Texcoord.xy = vposition.xy * sprite_tex_transform.xy +
                  sprite_tex_transform.zw;
  v_Texcoord.z = sprite_pos_tex.w;
}