#version 300 es
#ifdef GL_ES
precision mediump float;
#endif

layout(location = 0) in vec4 vertexPosition;

uniform mat4 modelView;
uniform mat4 lightProjection;

void main()
{
    gl_Position = lightProjection * modelView * vertexPosition;
}
