precision highp float;


#define MAX_DIR_LIGHTS 0
#define MAX_POINT_LIGHTS 0
#define MAX_SPOT_LIGHTS 0
#define MAX_HEMI_LIGHTS 0
#define MAX_SHADOWS 0






















uniform mat4 viewMatrix;
uniform vec3 cameraPosition;
uniform vec3 diffuse;
uniform float opacity;
#ifdef USE_COLOR
varying vec3 vColor;
#endif
#if defined( USE_MAP ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP )
varying vec2 vUv;
#endif
#ifdef USE_MAP
uniform sampler2D map;
#endif
#ifdef USE_LIGHTMAP
varying vec2 vUv2;
uniform sampler2D lightMap;
#endif
#ifdef USE_ENVMAP
uniform float reflectivity;
uniform samplerCube envMap;
uniform float flipEnvMap;
uniform int combine;
#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP )
uniform bool useRefract;
uniform float refractionRatio;
#else
varying vec3 vReflect;
#endif
#endif
#ifdef USE_FOG
uniform vec3 fogColor;
#ifdef FOG_EXP2
uniform float fogDensity;
#else
uniform float fogNear;
uniform float fogFar;
#endif
#endif
#ifdef USE_SHADOWMAP
uniform sampler2D shadowMap[ MAX_SHADOWS ];
uniform vec2 shadowMapSize[ MAX_SHADOWS ];
uniform float shadowDarkness[ MAX_SHADOWS ];
uniform float shadowBias[ MAX_SHADOWS ];
varying vec4 vShadowCoord[ MAX_SHADOWS ];
float unpackDepth( const in vec4 rgba_depth ) {
const vec4 bit_shift = vec4( 1.0 / ( 256.0 * 256.0 * 256.0 ), 1.0 / ( 256.0 * 256.0 ), 1.0 / 256.0, 1.0 );
float depth = dot( rgba_depth, bit_shift );
return depth;
}
#endif
#ifdef USE_SPECULARMAP
uniform sampler2D specularMap;
#endif
void main() {
gl_FragColor = vec4( diffuse, opacity );
#ifdef USE_MAP
vec4 texelColor = texture2D( map, vUv );
#ifdef GAMMA_INPUT
texelColor.xyz *= texelColor.xyz;
#endif
gl_FragColor = gl_FragColor * texelColor;
#endif
#ifdef ALPHATEST
if ( gl_FragColor.a < ALPHATEST ) discard;
#endif
float specularStrength;
#ifdef USE_SPECULARMAP
vec4 texelSpecular = texture2D( specularMap, vUv );
specularStrength = texelSpecular.r;
#else
specularStrength = 1.0;
#endif
#ifdef USE_LIGHTMAP
gl_FragColor = gl_FragColor * texture2D( lightMap, vUv2 );
#endif
#ifdef USE_COLOR
gl_FragColor = gl_FragColor * vec4( vColor, opacity );
#endif
#ifdef USE_ENVMAP
vec3 reflectVec;
#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP )
vec3 cameraToVertex = normalize( vWorldPosition - cameraPosition );
if ( useRefract ) {
reflectVec = refract( cameraToVertex, normal, refractionRatio );
} else { 
reflectVec = reflect( cameraToVertex, normal );
}
#else
reflectVec = vReflect;
#endif
#ifdef DOUBLE_SIDED
float flipNormal = ( -1.0 + 2.0 * float( gl_FrontFacing ) );
vec4 cubeColor = textureCube( envMap, flipNormal * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
#else
vec4 cubeColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
#endif
#ifdef GAMMA_INPUT
cubeColor.xyz *= cubeColor.xyz;
#endif
if ( combine == 1 ) {
gl_FragColor.xyz = mix( gl_FragColor.xyz, cubeColor.xyz, specularStrength * reflectivity );
} else if ( combine == 2 ) {
gl_FragColor.xyz += cubeColor.xyz * specularStrength * reflectivity;
} else {
gl_FragColor.xyz = mix( gl_FragColor.xyz, gl_FragColor.xyz * cubeColor.xyz, specularStrength * reflectivity );
}
#endif
#ifdef USE_SHADOWMAP
#ifdef SHADOWMAP_DEBUG
vec3 frustumColors[3];
frustumColors[0] = vec3( 1.0, 0.5, 0.0 );
frustumColors[1] = vec3( 0.0, 1.0, 0.8 );
frustumColors[2] = vec3( 0.0, 0.5, 1.0 );
#endif
#ifdef SHADOWMAP_CASCADE
int inFrustumCount = 0;
#endif
float fDepth;
vec3 shadowColor = vec3( 1.0 );
for( int i = 0; i < MAX_SHADOWS; i ++ ) {
vec3 shadowCoord = vShadowCoord[ i ].xyz / vShadowCoord[ i ].w;
bvec4 inFrustumVec = bvec4 ( shadowCoord.x >= 0.0, shadowCoord.x <= 1.0, shadowCoord.y >= 0.0, shadowCoord.y <= 1.0 );
bool inFrustum = all( inFrustumVec );
#ifdef SHADOWMAP_CASCADE
inFrustumCount += int( inFrustum );
bvec3 frustumTestVec = bvec3( inFrustum, inFrustumCount == 1, shadowCoord.z <= 1.0 );
#else
bvec2 frustumTestVec = bvec2( inFrustum, shadowCoord.z <= 1.0 );
#endif
bool frustumTest = all( frustumTestVec );
if ( frustumTest ) {
shadowCoord.z += shadowBias[ i ];
#if defined( SHADOWMAP_TYPE_PCF )
float shadow = 0.0;
const float shadowDelta = 1.0 / 9.0;
float xPixelOffset = 1.0 / shadowMapSize[ i ].x;
float yPixelOffset = 1.0 / shadowMapSize[ i ].y;
float dx0 = -1.25 * xPixelOffset;
float dy0 = -1.25 * yPixelOffset;
float dx1 = 1.25 * xPixelOffset;
float dy1 = 1.25 * yPixelOffset;
fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, dy0 ) ) );
if ( fDepth < shadowCoord.z ) shadow += shadowDelta;
fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( 0.0, dy0 ) ) );
if ( fDepth < shadowCoord.z ) shadow += shadowDelta;
fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, dy0 ) ) );
if ( fDepth < shadowCoord.z ) shadow += shadowDelta;
fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, 0.0 ) ) );
if ( fDepth < shadowCoord.z ) shadow += shadowDelta;
fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy ) );
if ( fDepth < shadowCoord.z ) shadow += shadowDelta;
fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, 0.0 ) ) );
if ( fDepth < shadowCoord.z ) shadow += shadowDelta;
fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, dy1 ) ) );
if ( fDepth < shadowCoord.z ) shadow += shadowDelta;
fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( 0.0, dy1 ) ) );
if ( fDepth < shadowCoord.z ) shadow += shadowDelta;
fDepth = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, dy1 ) ) );
if ( fDepth < shadowCoord.z ) shadow += shadowDelta;
shadowColor = shadowColor * vec3( ( 1.0 - shadowDarkness[ i ] * shadow ) );
#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
float shadow = 0.0;
float xPixelOffset = 1.0 / shadowMapSize[ i ].x;
float yPixelOffset = 1.0 / shadowMapSize[ i ].y;
float dx0 = -1.0 * xPixelOffset;
float dy0 = -1.0 * yPixelOffset;
float dx1 = 1.0 * xPixelOffset;
float dy1 = 1.0 * yPixelOffset;
mat3 shadowKernel;
mat3 depthKernel;
depthKernel[0][0] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, dy0 ) ) );
if ( depthKernel[0][0] < shadowCoord.z ) shadowKernel[0][0] = 0.25;
else shadowKernel[0][0] = 0.0;
depthKernel[0][1] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx0, 0.0 ) ) );
if ( depthKernel[0][1] < shadowCoord.z ) shadowKernel[0][1] = 0.25;
else shadowKernel[0][1] = 0.0;
depthKernel[0][2] = unpackDepth( texture2D( shadowMap[ i], shadowCoord.xy + vec2( dx0, dy1 ) ) );
if ( depthKernel[0][2] < shadowCoord.z ) shadowKernel[0][2] = 0.25;
else shadowKernel[0][2] = 0.0;
depthKernel[1][0] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( 0.0, dy0 ) ) );
if ( depthKernel[1][0] < shadowCoord.z ) shadowKernel[1][0] = 0.25;
else shadowKernel[1][0] = 0.0;
depthKernel[1][1] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy ) );
if ( depthKernel[1][1] < shadowCoord.z ) shadowKernel[1][1] = 0.25;
else shadowKernel[1][1] = 0.0;
depthKernel[1][2] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( 0.0, dy1 ) ) );
if ( depthKernel[1][2] < shadowCoord.z ) shadowKernel[1][2] = 0.25;
else shadowKernel[1][2] = 0.0;
depthKernel[2][0] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, dy0 ) ) );
if ( depthKernel[2][0] < shadowCoord.z ) shadowKernel[2][0] = 0.25;
else shadowKernel[2][0] = 0.0;
depthKernel[2][1] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, 0.0 ) ) );
if ( depthKernel[2][1] < shadowCoord.z ) shadowKernel[2][1] = 0.25;
else shadowKernel[2][1] = 0.0;
depthKernel[2][2] = unpackDepth( texture2D( shadowMap[ i ], shadowCoord.xy + vec2( dx1, dy1 ) ) );
if ( depthKernel[2][2] < shadowCoord.z ) shadowKernel[2][2] = 0.25;
else shadowKernel[2][2] = 0.0;
vec2 fractionalCoord = 1.0 - fract( shadowCoord.xy * shadowMapSize[i].xy );
shadowKernel[0] = mix( shadowKernel[1], shadowKernel[0], fractionalCoord.x );
shadowKernel[1] = mix( shadowKernel[2], shadowKernel[1], fractionalCoord.x );
vec4 shadowValues;
shadowValues.x = mix( shadowKernel[0][1], shadowKernel[0][0], fractionalCoord.y );
shadowValues.y = mix( shadowKernel[0][2], shadowKernel[0][1], fractionalCoord.y );
shadowValues.z = mix( shadowKernel[1][1], shadowKernel[1][0], fractionalCoord.y );
shadowValues.w = mix( shadowKernel[1][2], shadowKernel[1][1], fractionalCoord.y );
shadow = dot( shadowValues, vec4( 1.0 ) );
shadowColor = shadowColor * vec3( ( 1.0 - shadowDarkness[ i ] * shadow ) );
#else
vec4 rgbaDepth = texture2D( shadowMap[ i ], shadowCoord.xy );
float fDepth = unpackDepth( rgbaDepth );
if ( fDepth < shadowCoord.z )
shadowColor = shadowColor * vec3( 1.0 - shadowDarkness[ i ] );
#endif
}
#ifdef SHADOWMAP_DEBUG
#ifdef SHADOWMAP_CASCADE
if ( inFrustum && inFrustumCount == 1 ) gl_FragColor.xyz *= frustumColors[ i ];
#else
if ( inFrustum ) gl_FragColor.xyz *= frustumColors[ i ];
#endif
#endif
}
#ifdef GAMMA_OUTPUT
shadowColor *= shadowColor;
#endif
gl_FragColor.xyz = gl_FragColor.xyz * shadowColor;
#endif
#ifdef GAMMA_OUTPUT
gl_FragColor.xyz = sqrt( gl_FragColor.xyz );
#endif
#ifdef USE_FOG
float depth = gl_FragCoord.z / gl_FragCoord.w;
#ifdef FOG_EXP2
const float LOG2 = 1.442695;
float fogFactor = exp2( - fogDensity * fogDensity * depth * depth * LOG2 );
fogFactor = 1.0 - clamp( fogFactor, 0.0, 1.0 );
#else
float fogFactor = smoothstep( fogNear, fogFar, depth );
#endif
gl_FragColor = mix( gl_FragColor, vec4( fogColor, gl_FragColor.w ), fogFactor );
#endif
}