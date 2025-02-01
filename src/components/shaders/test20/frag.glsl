#version 300 es
precision highp float;

// Passed in from the vertex shader.
in vec3 v_normal;

// The texture.
uniform samplerCube u_texture;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
   outColor = texture(u_texture, normalize(v_normal));
}