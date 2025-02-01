#version 450
layout(location = 0) out vec4 _upc_fragColor;
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
vec3 _upackNormalToRGB(const vec3 _unormal){
  return ((normalize(_unormal) * 0.5) + 0.5);
}
layout(location = 0) in vec3 _uvNormal;
void main(){
  (_upc_fragColor = vec4(0.0, 0.0, 0.0, 0.0));
  vec3 _unormal = normalize(_uvNormal);
  (_upc_fragColor = vec4(_upackNormalToRGB(_unormal), _uopacity));
  (_upc_fragColor.w = 1.0);
}