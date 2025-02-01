attribute vec4 position;
attribute vec4 color;

uniform float scale;
uniform float time;
uniform float offsetX;
uniform float offsetY;
uniform float scalar;
uniform float scalarOffset;

varying vec4 v_color;

void main() {

    float fade = mod(scalarOffset + time * scalar / 10.0, 1.0);

    if (fade < 0.5) {
        fade = fade * 2.0;
    } else {
        fade = (1.0 - fade) * 2.0;
    }

    float xpos = position.x * scale;
    float ypos = position.y * scale;

    float angle = 3.14159 * 2.0 * fade;
    float xrot = xpos * cos(angle) - ypos * sin(angle);
    float yrot = xpos * sin(angle) + ypos * cos(angle);

    xpos = xrot + offsetX;
    ypos = yrot + offsetY;

    v_color = vec4(fade, 1.0 - fade, 0.0, 1.0) + color;
    gl_Position = vec4(xpos, ypos, 0.0, 1.0);
}