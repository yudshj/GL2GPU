precision mediump float;
uniform sampler2D rampSampler;
uniform sampler2D colorSampler;

// Incoming variables from vertex shader
varying vec2 outputTexcoord;
varying float outputPercentLife;
varying vec4 outputColorMult;

void main() {
  vec4 colorMult = texture2D(rampSampler, 
                             vec2(outputPercentLife, 0.5)) *
                   outputColorMult;
  gl_FragColor = texture2D(colorSampler, outputTexcoord) * colorMult;
}