struct VertexIn {
    position_arr: array<vec4<f32>>
};

struct ColorIn {
    color_arr: array<vec4<f32>>
};

struct UniformBufferObject {
    objPosition: vec4<f32>,
    objColor: vec4<f32>,
}
@binding(0) @group(0) var<uniform> ubo: UniformBufferObject;

struct Fragment {
    @builtin(position) Position : vec4<f32>,
    @location(0) Color : vec4<f32>
};

@vertex
fn main(
    @builtin(instance_index) id: u32,
    @location(0) vertexPosition: vec4<f32>,
    // @location(1) vertexColor: vec4<f32>
) -> Fragment {

    var output : Fragment;
    output.Position = vec4<f32>((vertexPosition * 0.01 + ubo.objPosition).xy, 0.0, 1.0);
    // output.Color = vec4<f32>(vertexColor, 1.0);
    // output.Color = vec4<f32>(1.0, 1.0, 1.0, 1.0);
//    output.Color = vec4<f32>((color_in.color_arr[id].xyz * vertex_in.position_arr[id].z + 1.0) / 2.0, 1.0);
    output.Color = ubo.objColor;

    return output;
}