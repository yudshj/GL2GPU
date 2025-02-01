precision mediump float;

varying vec2 v_texCoord;
uniform vec4 colorMult;
uniform sampler2D colorMap;
void main() {
  gl_FragColor = texture2D(colorMap, v_texCoord) * colorMult;
}