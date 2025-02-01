fn webgl_texcoord_to_webgpu(tex_coord: vec2<f32>) -> vec2<f32> {
   return vec2<f32>(tex_coord.x, 1.0 - tex_coord.y);
}

@fragment
fn main(@builtin(position) frag_coord: vec4<f32>) -> @location(0) f32 {
  return frag_coord.z;
}