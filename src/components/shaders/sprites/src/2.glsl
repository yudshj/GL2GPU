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
  // Note: this fragment shader was originally written as:
  //  gl_FragColor = (texture2D(u_texture0, v_texCoord) * v_textureWeights.x +
  //                  texture2D(u_texture1, v_texCoord) * v_textureWeights.y +
  //                  texture2D(u_texture2, v_texCoord) * v_textureWeights.z +
  //                  texture2D(u_texture3, v_texCoord) * v_textureWeights.w);
  //
  // in order to avoid using the if-statement, under the supposition
  // that using branches would perform worse than a straight-line
  // statement. (Using an array of samplers is not an option for this
  // use case in OpenGL ES SL and therefore WebGL shaders.) It turns
  // out that at least on an NVIDIA GeForce 8000 series card, the
  // if-statements are massively faster, because the untaken texture
  // fetches can be eliminated, so a huge amount of texture bandwidth
  // is saved. Many thanks to Nat Duca for this suggestion.

  vec4 color;
  if (v_textureWeights.x > 0.0)
    color = texture2D(u_texture0, v_texCoord);
  else if (v_textureWeights.y > 0.0)
    color = texture2D(u_texture1, v_texCoord);
  else if (v_textureWeights.z > 0.0)
    color = texture2D(u_texture2, v_texCoord);
  else // v_textureWeights.w > 0.0
    color = texture2D(u_texture3, v_texCoord);
  gl_FragColor = color;
}