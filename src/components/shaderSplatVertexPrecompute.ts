export interface SplatVertexPrecomputeSources {
    renderWgsl: string;
    computeWgsl: string;
    bindings: {
        clip: number;
        axes: number;
        rgba: number;
        adjustedStdDev: number;
    };
    locations: {
        clip: number;
        axes: number;
        rgba: number;
        adjustedStdDev: number;
    };
}

function matchingBrace(source: string, open: number): number {
    let depth = 0;
    for (let index = open; index < source.length; index++) {
        if (source[index] === "{") depth++;
        if (source[index] === "}") {
            depth--;
            if (depth === 0) return index;
        }
    }
    return -1;
}

function vertexMainRange(source: string): { start: number, bodyStart: number, end: number } | null {
    const match = /@vertex\s+fn\s+main\s*\(/m.exec(source);
    if (!match) return null;
    const bodyStart = source.indexOf("{", match.index);
    if (bodyStart < 0) return null;
    const bodyEnd = matchingBrace(source, bodyStart);
    if (bodyEnd < 0) return null;
    return { start: match.index, bodyStart, end: bodyEnd + 1 };
}

function insertModuleDeclarations(source: string, declarations: string): string {
    const diagnostic = /^diagnostic\([^\n]*\);\s*/.exec(source);
    const offset = diagnostic ? diagnostic[0].length : 0;
    return source.slice(0, offset) + declarations + "\n" + source.slice(offset);
}

export function buildSplatVertexPrecomputeSources(
    source: string,
    options: { alphaCutoff?: number, maxStdDev?: number } = {},
): SplatVertexPrecomputeSources | null {
    const requiredMarkers = [
        "fn v_2(gl_InstanceIndex : i32, position : vec3<f32>)",
        "let orderingCoord : vec2<i32>",
        "let splatIndex : u32",
        "let clipCenter : vec4<f32>",
        "let eigenVec1 : vec2<f32>",
        "let eigenVec2 : vec2<f32>",
        "let scale1 : f32",
        "let scale2 : f32",
        "let pixelOffset : vec2<f32>",
        "_hyd_uniforms_.renderSize",
        "_hyd_uniforms_.focalAdjustment",
    ];
    if (requiredMarkers.some((marker) => !source.includes(marker))) return null;

    const mainRange = vertexMainRange(source);
    if (!mainRange) return null;
    const signature = source.slice(mainRange.start, mainRange.bodyStart + 1);
    const instance = /@builtin\(instance_index\)\s+([A-Za-z_]\w*)\s*:\s*u32/.exec(signature)?.[1];
    const position = /@location\(0u?\)\s+([A-Za-z_]\w*)\s*:\s*vec3<f32>/.exec(signature)?.[1];
    if (!instance || !position) return null;
    const originalBody = source.slice(mainRange.bodyStart + 1, mainRange.end - 1);
    const returnStart = originalBody.lastIndexOf("return ");
    const returnEnd = returnStart < 0 ? -1 : originalBody.indexOf(";", returnStart);
    if (returnStart < 0 || returnEnd < 0) return null;
    const returnStatement = originalBody.slice(returnStart, returnEnd + 1).trim();

    const bindings = { clip: 7, axes: 8, rgba: 9, adjustedStdDev: 10 };
    const locations = { clip: 8, axes: 9, rgba: 10, adjustedStdDev: 11 };
    const readDeclarations = [
        `@group(0) @binding(${bindings.clip}) var<storage, read> _hyd_pre_clip: array<vec4f>;`,
        `@group(0) @binding(${bindings.axes}) var<storage, read> _hyd_pre_axes: array<vec4f>;`,
        `@group(0) @binding(${bindings.rgba}) var<storage, read> _hyd_pre_rgba: array<vec4f>;`,
        `@group(0) @binding(${bindings.adjustedStdDev}) var<storage, read> _hyd_pre_adjusted: array<f32>;`,
    ].join("\n");
    const writeDeclarations = readDeclarations.replace(/var<storage, read>/g, "var<storage, read_write>");

    const parameterEnd = signature.lastIndexOf(")");
    if (parameterEnd < 0) return null;
    const renderSignature = signature.slice(0, parameterEnd) +
        `, @location(${locations.clip}u) hyd_pre_clip_input: vec4f` +
        `, @location(${locations.axes}u) hyd_pre_axes_input: vec4f` +
        `, @location(${locations.rgba}u) hyd_pre_rgba_input: vec4f` +
        `, @location(${locations.adjustedStdDev}u) hyd_pre_adjusted_input: f32` +
        signature.slice(parameterEnd);
    const renderBody = `
  let hyd_pre_index = ${instance};
  gl_Position = vec4f(0.0f, 0.0f, 2.0f, 1.0f);
  adjustedStdDev = hyd_pre_adjusted_input;
  vRgba = vec4f(0.0f);
  vSplatUv = vec2f(0.0f);
  vSplatIndex = 0u;
  vNdc = vec3f(0.0f);
  vFragDepth = 0.0f;
  vIsPerspective = 0.0f;
  if (adjustedStdDev > 0.0f) {
    let hyd_clip_center = hyd_pre_clip_input;
    let hyd_axes = hyd_pre_axes_input;
    vRgba = hyd_pre_rgba_input;
    vSplatUv = ${position}.xy * adjustedStdDev;
    let hyd_pixel_offset = hyd_axes.xy * ${position}.x + hyd_axes.zw * ${position}.y;
    let hyd_scaled_render_size = _hyd_uniforms_.renderSize * _hyd_uniforms_.focalAdjustment;
    let hyd_ndc_offset = (vec2f(2.0f) / hyd_scaled_render_size) * hyd_pixel_offset;
    let hyd_ndc_center = hyd_clip_center.xyz / hyd_clip_center.w;
    vNdc = vec3f(hyd_ndc_center.xy + hyd_ndc_offset, hyd_ndc_center.z);
    gl_Position = vec4f(vNdc.xy * hyd_clip_center.w, hyd_clip_center.z, hyd_clip_center.w);
  }
  gl_Position.z = (gl_Position.z + gl_Position.w) * 0.5f;
  ${returnStatement}
`;
    const renderMain = renderSignature + renderBody + "}";
    let renderWgsl = source.slice(0, mainRange.start) + renderMain + source.slice(mainRange.end);

    const pixelOffset = /\n\s*let pixelOffset\s*:\s*vec2<f32>\s*=/m.exec(source);
    if (!pixelOffset) return null;
    const storeOutputs = `
  let hyd_pre_index = u32(gl_InstanceIndex);
  var hyd_effective_stddev = min(adjustedStdDev, ${
      Number.isFinite(options.maxStdDev) && options.maxStdDev! > 0
          ? `${options.maxStdDev!.toFixed(9)}f`
          : "adjustedStdDev"
  });
  let hyd_peak_alpha = vRgba.w;
  let hyd_min_alpha = max(_hyd_uniforms_.minAlpha, ${
      Number.isFinite(options.alphaCutoff) && options.alphaCutoff! > 0
          ? `${options.alphaCutoff!.toFixed(9)}f`
          : "0.0f"
  });
  let hyd_falloff = clamp(_hyd_uniforms_.falloff, 0.0f, 1.0f);
  var hyd_required_gaussian = 0.0f;
  if (hyd_falloff > 0.0f && hyd_min_alpha > 0.0f && hyd_peak_alpha > 0.0f) {
    if (hyd_peak_alpha <= 1.0f) {
      let hyd_floor_alpha = hyd_peak_alpha * (1.0f - hyd_falloff);
      if (hyd_floor_alpha < hyd_min_alpha) {
        hyd_required_gaussian = clamp(
          ((hyd_min_alpha / hyd_peak_alpha) - (1.0f - hyd_falloff)) / hyd_falloff,
          0.0f,
          1.0f);
      }
    } else {
      let hyd_target_alpha = (hyd_min_alpha - (1.0f - hyd_falloff)) / hyd_falloff;
      if (hyd_target_alpha > 0.0f) {
        let hyd_alpha_power = exp(((hyd_peak_alpha * hyd_peak_alpha) - 1.0f) / 2.71828174591064453125f);
        hyd_required_gaussian = clamp(
          1.0f - pow(max(0.0f, 1.0f - hyd_target_alpha), 1.0f / hyd_alpha_power),
          0.0f,
          1.0f);
      }
    }
  }
  if (hyd_required_gaussian > 0.0f) {
    hyd_effective_stddev = min(
      hyd_effective_stddev,
      sqrt(max(0.0f, -2.0f * log(hyd_required_gaussian))));
  }
  if (hyd_effective_stddev <= 0.0f) { return; }
  let hyd_stddev_ratio = hyd_effective_stddev / adjustedStdDev;
  _hyd_pre_clip[hyd_pre_index] = clipCenter;
  _hyd_pre_axes[hyd_pre_index] = vec4f(
    eigenVec1 * scale1 * hyd_stddev_ratio,
    eigenVec2 * scale2 * hyd_stddev_ratio);
  _hyd_pre_rgba[hyd_pre_index] = vRgba;
  _hyd_pre_adjusted[hyd_pre_index] = hyd_effective_stddev;
  return;
`;
    let computeWgsl = source.slice(0, pixelOffset.index) + storeOutputs + source.slice(pixelOffset.index);
    const computeMainRange = vertexMainRange(computeWgsl);
    if (!computeMainRange) return null;
    computeWgsl = computeWgsl.slice(0, computeMainRange.start) + computeWgsl.slice(computeMainRange.end);
    computeWgsl = insertModuleDeclarations(computeWgsl, writeDeclarations);
    computeWgsl += `
@compute @workgroup_size(256)
fn hyd_precompute_main(@builtin(global_invocation_id) global_id: vec3u) {
  let index = global_id.x;
  if (index >= arrayLength(&_hyd_pre_adjusted)) { return; }
  _hyd_pre_adjusted[index] = 0.0f;
  v_2(i32(index), vec3f(0.0f));
}
`;
    return { renderWgsl, computeWgsl, bindings, locations };
}
