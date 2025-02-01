precision highp float;
uniform lowp int renderType;
uniform sampler2D map;
uniform float opacity;
uniform vec3 color;
varying vec2 vUV;
varying float vVisibility;
void main() {
if( renderType == 0 ) {
gl_FragColor = vec4( 1.0, 0.0, 1.0, 0.0 );
} else if( renderType == 1 ) {
gl_FragColor = texture2D( map, vUV );
} else {
vec4 texture = texture2D( map, vUV );
texture.a *= opacity * vVisibility;
gl_FragColor = texture;
gl_FragColor.rgb *= color;
}
}