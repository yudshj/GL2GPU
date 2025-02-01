#version 450
layout(set = 0, binding = 0) uniform UniformBufferObject {
  mat4 _umodelMatrix;
  mat4 _umodelViewMatrix;
  mat4 _uprojectionMatrix;
  mat4 _uviewMatrix;
  mat3 _unormalMatrix;
  vec3 _ucameraPosition;
  bool _uisOrthographic;
  float _uopacity;
};
layout(location=0) in vec3 _uposition;
layout(location=1) in vec3 _unormal;
layout(location=2) in vec2 _uuv;
layout(location=0) out vec3 _uvNormal;
void main(){
  (gl_Position = vec4(0.0, 0.0, 0.0, 0.0));
  (_uvNormal = vec3(0.0, 0.0, 0.0));
  vec3 _uobjectNormal = vec3(_unormal);
  vec3 _utransformedNormal = _uobjectNormal;
  (_utransformedNormal = (_unormalMatrix * _utransformedNormal));
  (_uvNormal = normalize(_utransformedNormal));
  vec3 _utransformed = vec3(_uposition);
  vec4 _umvPosition = vec4(_utransformed, 1.0);
  (_umvPosition = (_umodelViewMatrix * _umvPosition));
  (gl_Position = (_uprojectionMatrix * _umvPosition));
}