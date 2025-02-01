#version 300 es
#ifdef GL_ES
precision mediump float;
#endif

in vec4 vertexPosition;
in vec4 vertexNormal;
in vec4 vertexColor;

out vec4 vColor;
out vec4 vNormal;
out vec4 vDepthPosition;

uniform mat4 modelView;
uniform mat4 lightProjection;
uniform mat4 cameraProjection;

const mat4 bias = mat4(
0.5, 0.0, 0.0, 0.0,
0.0, 0.5, 0.0, 0.0,
0.0, 0.0, 0.5, 0.0,
0.5, 0.5, 0.5, 1.0
);

void main()
{
    gl_Position = cameraProjection * modelView * vertexPosition;
    vDepthPosition = bias * lightProjection * modelView * vertexPosition;
    vNormal = vertexNormal;
    vColor = vertexColor;
}
