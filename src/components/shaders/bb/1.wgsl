struct VertexInput {
    @location(0) position: vec4<f32>,
    @location(1) color: vec4<f32>,
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
};

@vertex
fn main(input: VertexInput) -> VertexOutput {
    var fade: f32 = fract(_hyd_uniforms_.scalarOffset + _hyd_uniforms_.time * _hyd_uniforms_.scalar / 10.0);

    if (fade < 0.5) {
        fade = fade * 2.0;
    } else {
        fade = (1.0 - fade) * 2.0;
    }

    var xpos: f32 = input.position.x * _hyd_uniforms_.scale;
    var ypos: f32 = input.position.y * _hyd_uniforms_.scale;

    var angle: f32 = 3.14159 * 2.0 * fade;
    var xrot: f32 = xpos * cos(angle) - ypos * sin(angle);
    var yrot: f32 = xpos * sin(angle) + ypos * cos(angle);

    xpos = xrot + _hyd_uniforms_.offsetX;
    ypos = yrot + _hyd_uniforms_.offsetY;

    var v_color: vec4<f32> = vec4<f32>(fade, 1.0 - fade, 0.0, 1.0) + input.color;
    
    return VertexOutput(vec4<f32>(xpos, ypos, 0.0, 1.0), v_color);
}
