#version 300 es
#ifdef GL_ES
precision mediump float;
#endif

in vec4 vColor;
out vec4 fColor;

void main()
{
    fColor = vColor;
}