export const GPUFS1 = `
struct FragmentOutput {
    @location(0) outColor: vec4<f32>,
}

@fragment
fn main(@location(0) color: vec4<f32>) -> FragmentOutput {
    return FragmentOutput(color);
}
`;