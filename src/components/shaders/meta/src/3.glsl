attribute vec3 vposition;
attribute vec2 vtexcoord;
attribute vec3 vnormal;
uniform vec4 modelviewproj0;
uniform vec4 modelviewproj1;
uniform vec4 modelviewproj2;
uniform vec4 modelviewproj3;
void main() {
  vec4 hpos = vec4(vposition, 1);
  gl_Position.x = dot(modelviewproj0, hpos);
  gl_Position.y = dot(modelviewproj1, hpos);
  gl_Position.z = dot(modelviewproj2, hpos);
  gl_Position.w = dot(modelviewproj3, hpos);
}