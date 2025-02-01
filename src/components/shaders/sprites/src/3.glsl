// Slow variant of fragment shader for comparison purposes only.
precision mediump float;

// Arrays of uniform samplers are currently problematic on some platforms.
// For now, convert them to individual uniforms.
uniform sampler2D u_texture0;
uniform sampler2D u_texture1;
uniform sampler2D u_texture2;
uniform sampler2D u_texture3;

varying vec2 v_texCoord;
varying vec4 v_textureWeights;

void main() {
  gl_FragColor = (texture2D(u_texture0, v_texCoord) * v_textureWeights.x +
                  texture2D(u_texture1, v_texCoord) * v_textureWeights.y +
                  texture2D(u_texture2, v_texCoord) * v_textureWeights.z +
                  texture2D(u_texture3, v_texCoord) * v_textureWeights.w);
}