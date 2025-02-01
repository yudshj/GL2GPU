#ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
#else
  precision mediump float;
#endif

uniform vec4 lightColor;
varying vec4 v_position;
varying vec2 v_texCoord;
varying vec3 v_tangent;  // #normalMap
varying vec3 v_binormal;  // #normalMap
varying vec3 v_normal;
varying vec3 v_surfaceToLight;
varying vec3 v_surfaceToView;

uniform sampler2D diffuse;
uniform vec4 specular;
uniform sampler2D normalMap;  // #normalMap
uniform sampler2D reflectionMap;
uniform samplerCube skybox;
uniform float shininess;
uniform float specularFactor;

vec4 lit(float l ,float h, float m) {
  return vec4(1.0,
              max(l, 0.0),
              (l > 0.0) ? pow(max(0.0, h), m) : 0.0,
              1.0);
}
void main() {
  vec4 diffuseColor = texture2D(diffuse, v_texCoord);
  mat3 tangentToWorld = mat3(v_tangent,  // #normalMap
                             v_binormal,  // #normalMap
                             v_normal);  // #normalMap
  vec4 normalSpec = texture2D(normalMap, v_texCoord.xy);  // #normalMap

  vec4 reflection = texture2D(reflectionMap, v_texCoord.xy);
  vec3 tangentNormal = normalSpec.xyz - vec3(0.5, 0.5, 0.5);  // #normalMap
//  tangentNormal = normalize(tangentNormal + vec3(0,0,refractionFudge));
  vec3 normal = (tangentToWorld * tangentNormal);  // #normalMap
  normal = normalize(normal);  // #normalMap


  vec3 surfaceToLight = normalize(v_surfaceToLight);
  vec3 surfaceToView = normalize(v_surfaceToView);

  vec4 skyColor = textureCube(skybox, -reflect(surfaceToView, normal));
  float fudgeAmount = 1.1;
  vec3 fudge = skyColor.rgb * vec3(fudgeAmount, fudgeAmount, fudgeAmount);
  float bright = min(1.0, fudge.r * fudge.g * fudge.b);
  vec4 reflectColor =
      mix(vec4(skyColor.rgb, bright),
          diffuseColor,
          (1.0 - reflection.r));
  float r = abs(dot(surfaceToView, normal));
  gl_FragColor = vec4(mix(
      skyColor,
      reflectColor,
      ((r + 0.3) * (reflection.r))).rgb, 1.0 - r);
}