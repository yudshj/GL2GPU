precision highp float;

#define VERTEX_TEXTURES



#define MAX_DIR_LIGHTS 0
#define MAX_POINT_LIGHTS 0
#define MAX_SPOT_LIGHTS 0
#define MAX_HEMI_LIGHTS 0
#define MAX_SHADOWS 0
#define MAX_BONES 251






















uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
attribute vec2 uv2;
#ifdef USE_COLOR
attribute vec3 color;
#endif
#ifdef USE_MORPHTARGETS
attribute vec3 morphTarget0;
attribute vec3 morphTarget1;
attribute vec3 morphTarget2;
attribute vec3 morphTarget3;
#ifdef USE_MORPHNORMALS
attribute vec3 morphNormal0;
attribute vec3 morphNormal1;
attribute vec3 morphNormal2;
attribute vec3 morphNormal3;
#else
attribute vec3 morphTarget4;
attribute vec3 morphTarget5;
attribute vec3 morphTarget6;
attribute vec3 morphTarget7;
#endif
#endif
#ifdef USE_SKINNING
attribute vec4 skinIndex;
attribute vec4 skinWeight;
#endif
#if defined( USE_MAP ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP )
varying vec2 vUv;
uniform vec4 offsetRepeat;
#endif
#ifdef USE_LIGHTMAP
varying vec2 vUv2;
#endif
#if defined( USE_ENVMAP ) && ! defined( USE_BUMPMAP ) && ! defined( USE_NORMALMAP )
varying vec3 vReflect;
uniform float refractionRatio;
uniform bool useRefract;
#endif
#ifdef USE_COLOR
varying vec3 vColor;
#endif
#ifdef USE_MORPHTARGETS
#ifndef USE_MORPHNORMALS
uniform float morphTargetInfluences[ 8 ];
#else
uniform float morphTargetInfluences[ 4 ];
#endif
#endif
#ifdef USE_SKINNING
#ifdef BONE_TEXTURE
uniform sampler2D boneTexture;
mat4 getBoneMatrix( const in float i ) {
float j = i * 4.0;
float x = mod( j, N_BONE_PIXEL_X );
float y = floor( j / N_BONE_PIXEL_X );
const float dx = 1.0 / N_BONE_PIXEL_X;
const float dy = 1.0 / N_BONE_PIXEL_Y;
y = dy * ( y + 0.5 );
vec4 v1 = texture2D( boneTexture, vec2( dx * ( x + 0.5 ), y ) );
vec4 v2 = texture2D( boneTexture, vec2( dx * ( x + 1.5 ), y ) );
vec4 v3 = texture2D( boneTexture, vec2( dx * ( x + 2.5 ), y ) );
vec4 v4 = texture2D( boneTexture, vec2( dx * ( x + 3.5 ), y ) );
mat4 bone = mat4( v1, v2, v3, v4 );
return bone;
}
#else
uniform mat4 boneGlobalMatrices[ MAX_BONES ];
mat4 getBoneMatrix( const in float i ) {
mat4 bone = boneGlobalMatrices[ int(i) ];
return bone;
}
#endif
#endif
#ifdef USE_SHADOWMAP
varying vec4 vShadowCoord[ MAX_SHADOWS ];
uniform mat4 shadowMatrix[ MAX_SHADOWS ];
#endif
void main() {
#if defined( USE_MAP ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP )
vUv = uv * offsetRepeat.zw + offsetRepeat.xy;
#endif
#ifdef USE_LIGHTMAP
vUv2 = uv2;
#endif
#ifdef USE_COLOR
#ifdef GAMMA_INPUT
vColor = color * color;
#else
vColor = color;
#endif
#endif
#ifdef USE_SKINNING
mat4 boneMatX = getBoneMatrix( skinIndex.x );
mat4 boneMatY = getBoneMatrix( skinIndex.y );
#endif
#ifdef USE_ENVMAP
#ifdef USE_MORPHNORMALS
vec3 morphedNormal = vec3( 0.0 );
morphedNormal +=  ( morphNormal0 - normal ) * morphTargetInfluences[ 0 ];
morphedNormal +=  ( morphNormal1 - normal ) * morphTargetInfluences[ 1 ];
morphedNormal +=  ( morphNormal2 - normal ) * morphTargetInfluences[ 2 ];
morphedNormal +=  ( morphNormal3 - normal ) * morphTargetInfluences[ 3 ];
morphedNormal += normal;
#endif
#ifdef USE_SKINNING
mat4 skinMatrix = skinWeight.x * boneMatX;
skinMatrix 	+= skinWeight.y * boneMatY;
#ifdef USE_MORPHNORMALS
vec4 skinnedNormal = skinMatrix * vec4( morphedNormal, 0.0 );
#else
vec4 skinnedNormal = skinMatrix * vec4( normal, 0.0 );
#endif
#endif
vec3 objectNormal;
#ifdef USE_SKINNING
objectNormal = skinnedNormal.xyz;
#endif
#if !defined( USE_SKINNING ) && defined( USE_MORPHNORMALS )
objectNormal = morphedNormal;
#endif
#if !defined( USE_SKINNING ) && ! defined( USE_MORPHNORMALS )
objectNormal = normal;
#endif
#ifdef FLIP_SIDED
objectNormal = -objectNormal;
#endif
vec3 transformedNormal = normalMatrix * objectNormal;
#endif
#ifdef USE_MORPHTARGETS
vec3 morphed = vec3( 0.0 );
morphed += ( morphTarget0 - position ) * morphTargetInfluences[ 0 ];
morphed += ( morphTarget1 - position ) * morphTargetInfluences[ 1 ];
morphed += ( morphTarget2 - position ) * morphTargetInfluences[ 2 ];
morphed += ( morphTarget3 - position ) * morphTargetInfluences[ 3 ];
#ifndef USE_MORPHNORMALS
morphed += ( morphTarget4 - position ) * morphTargetInfluences[ 4 ];
morphed += ( morphTarget5 - position ) * morphTargetInfluences[ 5 ];
morphed += ( morphTarget6 - position ) * morphTargetInfluences[ 6 ];
morphed += ( morphTarget7 - position ) * morphTargetInfluences[ 7 ];
#endif
morphed += position;
#endif
#ifdef USE_SKINNING
#ifdef USE_MORPHTARGETS
vec4 skinVertex = vec4( morphed, 1.0 );
#else
vec4 skinVertex = vec4( position, 1.0 );
#endif
vec4 skinned  = boneMatX * skinVertex * skinWeight.x;
skinned 	  += boneMatY * skinVertex * skinWeight.y;
#endif
vec4 mvPosition;
#ifdef USE_SKINNING
mvPosition = modelViewMatrix * skinned;
#endif
#if !defined( USE_SKINNING ) && defined( USE_MORPHTARGETS )
mvPosition = modelViewMatrix * vec4( morphed, 1.0 );
#endif
#if !defined( USE_SKINNING ) && ! defined( USE_MORPHTARGETS )
mvPosition = modelViewMatrix * vec4( position, 1.0 );
#endif
gl_Position = projectionMatrix * mvPosition;
#if defined( USE_ENVMAP ) || defined( PHONG ) || defined( LAMBERT ) || defined ( USE_SHADOWMAP )
#ifdef USE_SKINNING
vec4 worldPosition = modelMatrix * skinned;
#endif
#if defined( USE_MORPHTARGETS ) && ! defined( USE_SKINNING )
vec4 worldPosition = modelMatrix * vec4( morphed, 1.0 );
#endif
#if ! defined( USE_MORPHTARGETS ) && ! defined( USE_SKINNING )
vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
#endif
#endif
#if defined( USE_ENVMAP ) && ! defined( USE_BUMPMAP ) && ! defined( USE_NORMALMAP )
vec3 worldNormal = mat3( modelMatrix[ 0 ].xyz, modelMatrix[ 1 ].xyz, modelMatrix[ 2 ].xyz ) * objectNormal;
worldNormal = normalize( worldNormal );
vec3 cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
if ( useRefract ) {
vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
} else {
vReflect = reflect( cameraToVertex, worldNormal );
}
#endif
#ifdef USE_SHADOWMAP
for( int i = 0; i < MAX_SHADOWS; i ++ ) {
vShadowCoord[ i ] = shadowMatrix[ i ] * worldPosition;
}
#endif
}