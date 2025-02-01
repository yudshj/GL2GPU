#version 300 es
#ifdef GL_ES
precision mediump float;
#endif

in vec4 vColor;
in vec4 vNormal;
in vec4 vDepthPosition;
out vec4 fColor;

uniform sampler2D shadowMap;

const float bias = 0.005;

float PCF()
{
    float shadowComponent = 0.0;
    vec2 texelSize = 0.5 / vec2(textureSize(shadowMap, 0));

    const int L = -10;
    const int R = 10;

    for (int x = L; x <= R; ++x) {
        for (int y = L; y <= R; ++y) {
            float currentSampleDepth = texture(shadowMap, vDepthPosition.xy + vec2(x, y) * texelSize).r;
            shadowComponent += (vDepthPosition.z - bias > currentSampleDepth) ? 0.0 : 1.0;
        }
    }

    return shadowComponent /= float((R-L+1) * (R-L+1));
}

void main()
{
    float visibility = mix(1.0, PCF(), 0.5);
    fColor = vec4(visibility * vColor.rgb, vColor.a);
}
