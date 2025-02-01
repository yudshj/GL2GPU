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

uniform vec4 ambient;
uniform sampler2D diffuse;
uniform vec4 specular;
uniform sampler2D normalMap;
uniform sampler2D reflectionMap; // #reflection
uniform samplerCube skybox; // #reflecton
uniform float shininess;
uniform float specularFactor;
uniform float fogPower;
uniform float fogMult;
uniform float fogOffset;
uniform vec4 fogColor;


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

  vec4 reflection = texture2D(reflectionMap, v_texCoord.xy); // #reflection

  vec3 tangentNormal = normalSpec.xyz - vec3(0.5, 0.5, 0.5);  // #normalMap
  vec3 normal = (tangentToWorld * tangentNormal);  // #normalMap
  normal = normalize(normal);  // #normalMap

  vec3 surfaceToLight = normalize(v_surfaceToLight);
  vec3 surfaceToView = normalize(v_surfaceToView);
  vec4 skyColor = textureCube(skybox, -reflect(surfaceToView, normal));  // #reflection


  vec3 halfVector = normalize(surfaceToLight + surfaceToView);
  vec4 litR = lit(dot(normal, surfaceToLight),
                    dot(normal, halfVector), shininess);
  vec4 outColor = vec4(mix(
      skyColor,
      lightColor * (diffuseColor * litR.y + diffuseColor * ambient +
                    specular * litR.z * specularFactor * normalSpec.a),
      1.0 - reflection.r).rgb,
      diffuseColor.a);
  outColor = mix(outColor, vec4(fogColor.rgb, diffuseColor.a),
   clamp(pow((v_position.z / v_position.w), fogPower) * fogMult - fogOffset,0.0,1.0));

  gl_FragColor = outColor;
}