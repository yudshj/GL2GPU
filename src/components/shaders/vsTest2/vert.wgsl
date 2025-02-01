struct Fragment {
    @builtin(position) Position : vec4<f32>,
    @location(0) Color : vec4<f32>,
}

@binding(0) @group(0) var<uniform> mvp : mat4x4<f32>;

fn getHeightColor(ht: f32) -> vec4<f32> {
    if (ht < 0.0) { return vec4<f32>(0.0, 0.0, 1.0, 1.0); }
    else if (ht < 8.0) { return vec4<f32>(0.0, ht / 8.0, 0.0, 1.0);}
    else if (ht < 16.0) { return vec4<f32>(ht / 8.0 - 1.0, 1.0, 0.0, 1.0);}
    else if (ht < 32.0) { return vec4<f32>(1.0, 2.0 - ht / 16.0, 0.0, 1.0);}
    else { return vec4<f32>(1.0, 1.0, 1.0, 1.0); };
}

@vertex
fn main(@location(0) input_position : vec4<f32>) -> Fragment {
    let ret = Fragment(
        mvp * input_position,
        getHeightColor(input_position.y)
    );
    return ret;
}