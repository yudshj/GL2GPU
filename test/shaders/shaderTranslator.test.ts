import { deepEqual } from "node:assert/strict";

import {
    makeShaderMetadata,
    scanGlslDeclarations,
    scanGlslFragmentOutputScalarTypes,
} from "../../src/components/shaderMetadata";
import { normalizeWebGlTextureCoordinates } from "../../src/components/shaderTexCoord";
import {
    normalizeWebGlFragmentOutputWidths,
    optimizeTintWgsl,
    splitDeepAssociativeExpressions,
} from "../../src/components/shaderWgslOptimizer";
import { computeShaderShapeStats } from "../../src/components/shaderCapture";
import {
    enforceWebGlTextureLoadBounds,
    normalizeWebGlTextureDimensionQueries,
} from "../../src/components/shaderWgslRobustness";
import { preserveFlatFloatVaryingBits } from "../../src/components/shaderWgslFlatVaryings";
import { buildSplatVertexPrecomputeSources } from "../../src/components/shaderSplatVertexPrecompute";
import {
    lowerBooleanUniformSpecializations,
    selectBooleanUniformSpecializations,
} from "../../src/components/shaderWgslUniformSpecialization";
import {
    composeShaderModuleWgsl,
    renameReservedWgslIdentifiers,
    replaceBareWgslIdentifier,
    replaceWgslMemberAccess,
    synchronizeTintUniformTypes,
    wgslUniformMemberDeclaration,
    wgslUniformVariableNames,
} from "../../src/components/shaderWgslTypes";
import {
    makeMatrixArrayLoaders,
    matrixArrayStorageDeclaration,
    rewriteMatrixArrayUniformReads,
} from "../../src/components/shaderGlslUniforms";
import {
    lowerDynamicSamplerArrayTextureCalls,
    lowerSamplerStructFunctionParameters,
    lowerTexelFetchOffsetCalls,
    replaceGlslSourcePath,
} from "../../src/components/shaderGlslSamplers";
import type { InitShaderInfoType } from "../../src/components/shaderDB";
import {
    DEPTH_RANGE_DIFF_UNIFORM_NAME,
    DEPTH_RANGE_FAR_UNIFORM_NAME,
    DEPTH_RANGE_NEAR_UNIFORM_NAME,
    FRAG_COORD_HEIGHT_UNIFORM_NAME,
} from "../../src/components/shaderInternalUniforms";
import {
    lowerEs100GlobalInitializers,
    lowerDoWhileLoops,
    lowerFallthroughSwitches,
    lowerUnsupportedFloatBuiltins,
    foldGlslIntegerBuiltinCaseLabels,
    lowerWebGlPointSizeToPrivateState,
    materializeWebGlLineMacros,
    maskGlslPreprocessorDirectives,
    maskStaticallyInactivePreprocessorBranches,
    normalizeGlslInterfaceTypeArrays,
    normalizeWebGlDerivativeOrientation,
    normalizeWebGlDepthRange,
    normalizeWebGl1BuiltinLimits,
    normalizeWebGl2BuiltinLimits,
    normalizeWebGlShaderLanguageVersion,
    normalizeEs100SequenceArrayDimensions,
    preserveComplexArrayLengthSideEffects,
    hasMisplacedGlslEs3VersionDirective,
    sanitizeGlslangLineComments,
    stripGlslVersionDirectives,
    stripProvablyEmptyTopLevelMacroInvocations,
    wrapVertexMainForWebGpuClipSpace,
} from "../../src/components/shaderGlslCompatibility";
import {
    bridgeGlslEs100Identifiers,
    bridgeGlslDunderIdentifiers,
    bridgeGlslIdentifier,
    renameUserDefinedFunctions,
} from "../../src/components/shaderGlslIdentifiers";
import {
    lowerInlineInterfaceStructs,
    normalizeAnonymousUniformStructs,
    planValueStructUniforms,
    rewriteDynamicStructUniformReads,
    rewriteStructUniformAggregateReads,
} from "../../src/components/shaderGlslStructs";
import {
    injectGlslUniformBlockBindings,
    lowerGlslUniformBlockArrays,
    scanGlslUniformBlocks,
} from "../../src/components/shaderGlslUniformBlocks";
import { lowerRowMajorUniformBlocks } from "../../src/components/shaderGlslRowMajor";
import {
    integerSamplerOverrideNames,
    lowerIntegerTextureSampling,
} from "../../src/components/shaderGlslIntegerSampling";
import {
    samplerCoordinateScaleOverrideNames,
    webGlArrayLayerExpression,
} from "../../src/components/shaderSamplerState";

const macroInterfaceSource = `#version 300 es
#define attribute in
#define varying out
#define DECLARE_POSITION \\
  attribute vec3 position;
precision highp float;
attribute vec3 position;
void main() { gl_Position = vec4(position, 1.0); }
`;
const maskedMacroInterface = maskGlslPreprocessorDirectives(macroInterfaceSource);
if (/\b(?:attribute|varying)\b/.test(maskedMacroInterface.split("precision highp float;")[0]) ||
    !maskedMacroInterface.includes("precision highp float;") ||
    !maskedMacroInterface.includes("attribute vec3 position;")) {
    throw new Error(`failed to mask GLSL preprocessor directives:\n${maskedMacroInterface}`);
}

const strippedVersion = stripGlslVersionDirectives(
    "#version 100\n/* #version text\n   #version is still a comment */\nvoid main() {}\n",
);
const normalizedInterfaceTypeArray = normalizeGlslInterfaceTypeArrays(
    "uniform highp float[2] uniformValue;\nflat out vec4[3] first, second[4];\n",
);
const preservedLocalArray = normalizeGlslInterfaceTypeArrays(
    "void main() { structMain newStruct2[2]; newStruct2[0].value = 1.0; }",
);
const flatVertexBits = preserveFlatFloatVaryingBits(`
struct Out {
  @builtin(position) position : vec4<f32>,
  @location(0u) @interpolate(flat) value : f32,
  @location(1u) smooth : vec2<f32>,
}
@vertex fn main() -> Out {
  return Out(vec4<f32>(), value, smooth);
}
`, "vertex");
if (flatVertexBits.encodedVaryings !== 1 ||
    !flatVertexBits.wgsl.includes("value : u32") ||
    !flatVertexBits.wgsl.includes("bitcast<u32>(value)")) {
    throw new Error(`failed to encode flat vertex varying bits:\n${flatVertexBits.wgsl}`);
}
const flatFragmentBits = preserveFlatFloatVaryingBits(`
@fragment
fn main(@location(0u) @interpolate(flat) value : f32) -> @location(0u) vec4<i32> {
  return vec4<i32>(select(0i, 1i, value != value));
}
`, "fragment");
if (flatFragmentBits.encodedVaryings !== 1 ||
    !flatFragmentBits.wgsl.includes("_hyd_flat_bits_value : u32") ||
    !flatFragmentBits.wgsl.includes("let value = bitcast<f32>(_hyd_flat_bits_value);")) {
    throw new Error(`failed to decode flat fragment varying bits:\n${flatFragmentBits.wgsl}`);
}
if (!normalizedInterfaceTypeArray.includes("uniform highp float uniformValue[2];") ||
    !normalizedInterfaceTypeArray.includes("flat out vec4 first[3], second[4][3];")) {
    throw new Error(`failed to normalize GLSL interface type arrays:\n${normalizedInterfaceTypeArray}`);
}
if (!preservedLocalArray.includes("structMain newStruct2[2]")) {
    throw new Error(`interface array normalization changed a local array:\n${preservedLocalArray}`);
}
deepEqual(
    scanGlslDeclarations(
        "#version 300 es\nuniform highp float[2] uniformValue;\nvoid main() { float value = uniformValue[0]; }",
        "fragment",
    )
        .uniforms.map((uniform) => [uniform.name, uniform.size]),
    [["uniformValue", 2]],
);
deepEqual(
    webGlArrayLayerExpression("i32(v_texCoord.z)", "shadowT"),
    "_hyd_webglArrayLayer(v_texCoord.z, textureNumLayers(shadowT))",
);
const loweredRowMajor = lowerRowMajorUniformBlocks(`
layout(std140, row_major) uniform Block {
  mat4x3 matrix;
  layout(row_major) mat4 matrices[2];
} values;
layout(std140, row_major) uniform Globals {
  mat4x2 uniformA;
};
float compare(float uniformA, float b) { return uniformA - b; }
void main() {
  vec4 a = mat4(values.matrix)[0];
  float b = values.matrices[index][2][1] + compare(uniformA[0].x, 2.0);
}`);
if (/\brow_major\b/.test(loweredRowMajor) ||
    !/mat3x4 _hyd_rm_matrix_[a-z0-9]+;/.test(loweredRowMajor) ||
    !/transpose\(values\._hyd_rm_matrix_[a-z0-9]+\)/.test(loweredRowMajor) ||
    !/transpose\(values\._hyd_rm_matrices_[a-z0-9]+\[index\]\)\[2\]\[1\]/.test(loweredRowMajor) ||
    !/float compare\(float uniformA, float b\) \{ return uniformA - b; \}/.test(loweredRowMajor) ||
    !/compare\(transpose\(_hyd_rm_uniformA_[a-z0-9]+\)\[0\]\.x, 2\.0\)/.test(loweredRowMajor)) {
    throw new Error(`unexpected row-major uniform lowering:\n${loweredRowMajor}`);
}
const loweredRowMajorBlockArray = lowerRowMajorUniformBlocks(lowerGlslUniformBlockArrays(`
layout(std140, row_major) uniform Block {
  mat3x2 matrix;
} values[2];
void main() {
  vec2 value = values[1].matrix[2];
}`, new Map([["Block[0]", 0], ["Block[1]", 1]])));
if (/\brow_major\b/.test(loweredRowMajorBlockArray) ||
    !/mat2x3 _hyd_rm_matrix_[a-z0-9]+;/.test(loweredRowMajorBlockArray) ||
    !/transpose\(hydgl2gpu_ubo_values_1\._hyd_rm_matrix_[a-z0-9]+\)\[2\]/.test(loweredRowMajorBlockArray)) {
    throw new Error(`unexpected row-major block-array lowering:\n${loweredRowMajorBlockArray}`);
}
const loweredNestedRowMajor = lowerRowMajorUniformBlocks(`
struct Inner {
  mat3x2 matrix;
};
struct Outer {
  Inner values[2];
  mat4 square;
};
layout(std140, row_major) uniform Block {
  Outer nested;
  mat2x3 direct[2];
} block;
void main() {
  vec2 a = block.nested.values[index].matrix[2];
  vec4 b = block.nested.square[1];
  vec3 c = block.direct[0][1];
}`);
if (/\brow_major\b/.test(loweredNestedRowMajor) ||
    !/struct _hyd_rm_struct_Inner_[a-z0-9]+\s*\{\s*mat2x3 _hyd_rm_matrix_[a-z0-9]+;/.test(loweredNestedRowMajor) ||
    !/struct _hyd_rm_struct_Outer_[a-z0-9]+\s*\{\s*_hyd_rm_struct_Inner_[a-z0-9]+ values\[2\];\s*mat4 _hyd_rm_square_[a-z0-9]+;/.test(loweredNestedRowMajor) ||
    !/transpose\(block\.nested\.values\[index\]\._hyd_rm_matrix_[a-z0-9]+\)\[2\]/.test(loweredNestedRowMajor) ||
    !/transpose\(block\.nested\._hyd_rm_square_[a-z0-9]+\)\[1\]/.test(loweredNestedRowMajor) ||
    !/transpose\(block\._hyd_rm_direct_[a-z0-9]+\[0\]\)\[1\]/.test(loweredNestedRowMajor)) {
    throw new Error(`unexpected nested row-major uniform lowering:\n${loweredNestedRowMajor}`);
}
const loweredNestedRowMajorIndex = lowerRowMajorUniformBlocks(`
layout(std140) uniform Stuff {
  layout(row_major) mat4 values[3];
  layout(row_major) mat4 indices[3];
} stuff;
void main() {
  vec4 row = stuff.values[int(stuff.indices[1][1][3])][2];
}`);
if (!/transpose\(stuff\._hyd_rm_values_[a-z0-9]+\[int\(transpose\(stuff\._hyd_rm_indices_[a-z0-9]+\[1\]\)\[1\]\[3\]\)\]\)\[2\]/.test(
    loweredNestedRowMajorIndex,
)) {
    throw new Error(`unexpected nested row-major index lowering:\n${loweredNestedRowMajorIndex}`);
}
deepEqual(
    lowerTexelFetchOffsetCalls(
        "vec4 color = texelFetchOffset(tex, coord(), lod, ivec2(1, 2));",
        [{ name: "tex", glsl_type: "sampler2D" }],
    ),
    "ivec2 _hyd_texel_fetch_offset_2d(ivec2 coord, ivec2 offset) { return coord + offset; }\n" +
    "vec4 color = texelFetch(tex, _hyd_texel_fetch_offset_2d(coord(), ivec2(1, 2)), lod);",
);
const robustTextureLoad = enforceWebGlTextureLoadBounds(
    "fn load() -> vec4f { return textureLoad(colorT, nextCoord(), nextLevel()); }",
    [{
        name: "color",
        glsl_type: "sampler2D",
        wgsl_texture_type: "texture_2d<f32>",
        wgsl_sampler_type: "sampler",
    }],
);
if (robustTextureLoad.rewrittenLoads !== 1 || robustTextureLoad.helperCount !== 1 ||
    !robustTextureLoad.wgsl.includes(
        "_hyd_webgl_robust_load_2d_f32(colorT, nextCoord(), nextLevel(), " +
        "_hyd_uniforms_._hyd_samplerFlipY_color)") ||
    !robustTextureLoad.wgsl.includes("level >= i32(textureNumLevels(tex))") ||
    !robustTextureLoad.wgsl.includes(
        "select(coord.y, size.y - 1i - coord.y, flipY > 0.5f)") ||
    !robustTextureLoad.wgsl.includes("return vec4f(0.0f);")) {
    throw new Error(`unexpected robust textureLoad lowering:\n${robustTextureLoad.wgsl}`);
}
const robustArrayLoad = enforceWebGlTextureLoadBounds(
    "fn load(tex: texture_2d_array<i32>, coord: vec2i, layer: i32, level: i32) -> vec4i { " +
    "return textureLoad(tex, coord, layer, level); }",
    [],
);
if (robustArrayLoad.rewrittenLoads !== 1 ||
    !robustArrayLoad.wgsl.includes("layer >= i32(textureNumLayers(tex))") ||
    !robustArrayLoad.wgsl.includes("coord, layer, level, 0.0f)") ||
    !robustArrayLoad.wgsl.includes(
        "select(coord.y, size.y - 1i - coord.y, flipY > 0.5f)") ||
    !robustArrayLoad.wgsl.includes("return vec4i(0i);")) {
    throw new Error(`unexpected robust array textureLoad lowering:\n${robustArrayLoad.wgsl}`);
}

const booleanSpecializationSource = `
struct HydUniforms { enabled: u32, enabled2: u32, rare: u32 };
@group(0) @binding(0) var<uniform> _hyd_uniforms_: HydUniforms;
fn choose() -> u32 {
  if (_hyd_uniforms_.enabled != 0u) { return _hyd_uniforms_.enabled; }
  return _hyd_uniforms_.enabled2 + _hyd_uniforms_.rare;
}`;
const booleanSpecializations = selectBooleanUniformSpecializations([
    { name: "enabled", glsl_type: "bool", wgsl_type: "u32" },
    { name: "enabled2", glsl_type: "bool", wgsl_type: "u32" },
    { name: "rare", glsl_type: "bool", wgsl_type: "u32" },
    { name: "internal", glsl_type: "bool", wgsl_type: "u32", internal: true },
    { name: "vector", glsl_type: "bvec2", wgsl_type: "vec2<u32>" },
], [booleanSpecializationSource], 1);
if (booleanSpecializations.length !== 1 || booleanSpecializations[0].uniformName !== "enabled" ||
    booleanSpecializations[0].referenceCount !== 2) {
    throw new Error(`unexpected boolean uniform specialization selection: ${JSON.stringify(booleanSpecializations)}`);
}
const loweredBooleanSpecialization = lowerBooleanUniformSpecializations(
    booleanSpecializationSource,
    booleanSpecializations,
);
const enabledOverride = loweredBooleanSpecialization.overrides.get("enabled");
if (!enabledOverride ||
    !loweredBooleanSpecialization.wgsl.includes(`override ${enabledOverride}: u32 = 0u;`) ||
    loweredBooleanSpecialization.wgsl.includes("_hyd_uniforms_.enabled !=") ||
    !loweredBooleanSpecialization.wgsl.includes("_hyd_uniforms_.enabled2")) {
    throw new Error(`unexpected boolean uniform specialization lowering:\n${loweredBooleanSpecialization.wgsl}`);
}
const preclampedIntegerLoad = enforceWebGlTextureLoadBounds(
    "fn x_hyd_integer_texture_i_2d(tex: texture_2d<i32>, coord: vec2i) -> vec4i { " +
    "return textureLoad(tex, clamp(coord, vec2i(0i), vec2i(3i)), 0i); }",
    [],
);
if (preclampedIntegerLoad.rewrittenLoads !== 0) {
    throw new Error("pre-clamped integer texture helper must not gain a second bounds check");
}
const integerSamplerNames = integerSamplerOverrideNames("u_color");
deepEqual(integerSamplerNames, {
    wrapS: "hydgl2gpu_integer_wrap_s_u_color",
    wrapT: "hydgl2gpu_integer_wrap_t_u_color",
    wrapR: "hydgl2gpu_integer_wrap_r_u_color",
    mipmapped: "hydgl2gpu_integer_mipmapped_u_color",
    minLod: "hydgl2gpu_integer_min_lod_u_color",
    maxLod: "hydgl2gpu_integer_max_lod_u_color",
    levels: "hydgl2gpu_integer_levels_u_color",
    flipY: "hydgl2gpu_integer_flip_y_u_color",
});
const loweredIntegerSampling = lowerIntegerTextureSampling(`
uvec4 a = texture(u_color, uv, bias);
uvec4 b = textureOffset(u_color, uv, ivec2(1), bias);
uvec4 c = textureProj(u_color, projected, bias);
uvec4 d = textureProjOffset(u_color, projected, ivec2(1), bias);
uvec4 e = textureLod(u_color, uv, lod);
uvec4 f = textureLodOffset(u_color, uv, lod, ivec2(1));
uvec4 g = textureProjLod(u_color, projected, lod);
uvec4 h = textureProjLodOffset(u_color, projected, lod, ivec2(1));
uvec4 i = textureGrad(u_color, uv, dx, dy);
uvec4 j = textureGradOffset(u_color, uv, dx, dy, ivec2(1));
uvec4 k = textureProjGrad(u_color, projected, dx, dy);
uvec4 l = textureProjGradOffset(u_color, projected, dx, dy, ivec2(1));
`, [{ name: "u_color", glsl_type: "usampler2D" }], "fragment");
if (!loweredIntegerSampling.includes("layout(constant_id = 1000) const int hydgl2gpu_integer_wrap_s_u_color") ||
    !loweredIntegerSampling.includes("layout(constant_id = 1007) const int hydgl2gpu_integer_flip_y_u_color") ||
    !loweredIntegerSampling.includes("if (hydgl2gpu_integer_flip_y_u_color != 0) sampleCoordinate.y = 1.0 - sampleCoordinate.y") ||
    !loweredIntegerSampling.includes("_hyd_integer_texture_u_2d_u_color_implicit(u_colorT") ||
    !loweredIntegerSampling.includes("hydgl2gpu_integer_project_2d(projected)") ||
    !loweredIntegerSampling.includes("_hyd_integer_texture_u_2d_u_color_lod(u_colorT") ||
    /\btexture(?:Proj|Lod|Grad|Offset)*\s*\(\s*u_color\s*,/.test(loweredIntegerSampling)) {
    throw new Error(`unexpected integer texture operation lowering:\n${loweredIntegerSampling}`);
}
const loweredIntegerArray = lowerIntegerTextureSampling(
    "ivec4 color = textureOffset(u_array, coordinate, ivec2(1));",
    [{ name: "u_array", glsl_type: "isampler2DArray" }],
    "fragment",
);
if (!loweredIntegerArray.includes("dFdx(coordinate.xy)") ||
    !loweredIntegerArray.includes("floor(coordinate.z + 0.5)") ||
    !loweredIntegerArray.includes("sampleCoordinate.y = 1.0 - sampleCoordinate.y")) {
    throw new Error(`unexpected integer array sampling lowering:\n${loweredIntegerArray}`);
}
const loweredIntegerCube = lowerIntegerTextureSampling(
    "uvec4 color = textureGrad(u_cube, direction, gradientX, gradientY);",
    [{ name: "u_cube", glsl_type: "usamplerCube" }],
    "vertex",
);
if (!loweredIntegerCube.includes("face_gradient(vec3 direction, vec3 gradient)") ||
    !loweredIntegerCube.includes("sampleCoordinate.z = -coordinate.z") ||
    loweredIntegerCube.includes("coordinate + gradientX") ||
    /\bdFdx\s*\(/.test(loweredIntegerCube)) {
    throw new Error(`unexpected integer cube gradient lowering:\n${loweredIntegerCube}`);
}
const loweredCollidingIntegerCube = lowerIntegerTextureSampling(
    "uvec4 color = texture(tex, direction);",
    [{ name: "tex", glsl_type: "usamplerCube" }],
    "fragment",
);
if (!loweredCollidingIntegerCube.includes("utexture2DArray _hyd_integer_texture_u_cube_tex_object") ||
    /\butexture2DArray\s+tex\b/.test(loweredCollidingIntegerCube) ||
    /\btextureSize\s*\(\s*tex\s*,/.test(loweredCollidingIntegerCube)) {
    throw new Error(`integer helper parameter collided with sampler name:\n${loweredCollidingIntegerCube}`);
}
const cubeScaleNames = samplerCoordinateScaleOverrideNames("u_cube[0]");
deepEqual(cubeScaleNames, {
    x: "hydgl2gpu_sampler_scale_x_u_cube_0_",
    y: "hydgl2gpu_sampler_scale_y_u_cube_0_",
});
const shiftedTextureDimensions = normalizeWebGlTextureDimensionQueries(
    "fn size(level: i32) -> vec3u { return textureDimensions(volumeT, level); }",
    [{
        name: "volume",
        glsl_type: "sampler3D",
        wgsl_texture_type: "texture_3d<f32>",
        wgsl_sampler_type: "sampler",
    }],
);
if (shiftedTextureDimensions.rewrittenQueries !== 1 ||
    !shiftedTextureDimensions.wgsl.includes("textureDimensions(volumeT) / vec3u(")) {
    throw new Error(`unexpected textureDimensions level normalization:\n${shiftedTextureDimensions.wgsl}`);
}
const shiftedDepthDimensions = normalizeWebGlTextureDimensionQueries(
    "fn size(level: i32) -> vec2u { return textureDimensions(shadowT, level); }",
    [{
        name: "shadow",
        glsl_type: "sampler2DShadow",
        wgsl_texture_type: "texture_depth_2d",
        wgsl_sampler_type: "sampler_comparison",
    }],
);
if (shiftedDepthDimensions.rewrittenQueries !== 1 ||
    !shiftedDepthDimensions.wgsl.includes("textureDimensions(shadowT) / vec2u(")) {
    throw new Error(`unexpected depth textureDimensions normalization:\n${shiftedDepthDimensions.wgsl}`);
}
const shiftedCubeDimensions = normalizeWebGlTextureDimensionQueries(
    "fn size(level: i32) -> vec2u { return textureDimensions(environmentT, level); }",
    [{
        name: "environment",
        glsl_type: "samplerCube",
        wgsl_texture_type: "texture_cube<f32>",
        wgsl_sampler_type: "sampler",
    }],
);
if (shiftedCubeDimensions.rewrittenQueries !== 1 ||
    !shiftedCubeDimensions.wgsl.includes("textureDimensions(environmentT) / vec2u(")) {
    throw new Error(`unexpected cube textureDimensions normalization:\n${shiftedCubeDimensions.wgsl}`);
}
if (strippedVersion.split("\n")[0].trim() !== "" ||
    !strippedVersion.includes("#version is still a comment */")) {
    throw new Error(`unexpected version directive stripping:\n${strippedVersion}`);
}
if (!hasMisplacedGlslEs3VersionDirective("\n#version 300 es\nvoid main() {}") ||
    !hasMisplacedGlslEs3VersionDirective("// comment\n#version 300 es\nvoid main() {}") ||
    hasMisplacedGlslEs3VersionDirective("  #version 300 es\nvoid main() {}")) {
    throw new Error("unexpected GLSL ES 3 version-directive placement validation");
}
deepEqual(
    sanitizeGlslangLineComments("// a \\\nnext\\line\n/* keep \\ */\n"),
    "      \n         \n/* keep \\ */\n",
);

const versionConditionalSource = `
#if __VERSION__ == 300
out vec4 webgl2Color;
#else
#define outputColor gl_FragColor
#endif
void main() { outputColor = vec4(1.0); }
`;
deepEqual(
    preserveComplexArrayLengthSideEffects(`
int[2] func() { int a[2]; return a; }
void main() {
  int a[3]; int b[3];
  int x = (a = b).length();
  int y = (func()).length();
  int z = (int[1](0)).length();
}`),
    `
int[2] func() { int a[2]; return a; }
void main() {
  int a[3]; int b[3];
  int x = ((a = b), 3);
  int y = ((func()), 2);
  int z = ((int[1](0)), 1);
}`,
);
const loweredDoWhile = lowerDoWhileLoops("do { value++; if (value > 4) { break; } } while (left() && right());");
if (!loweredDoWhile.includes("while (true)") ||
    !loweredDoWhile.includes("if (!(left() && right())) { break; }") ||
    /\bdo\b/.test(loweredDoWhile)) {
    throw new Error(`unexpected do-while lowering: ${loweredDoWhile}`);
}
deepEqual(
    lowerDoWhileLoops("do { if (skip) continue; } while (condition);") ,
    "do { if (skip) continue; } while (condition);",
);
const loweredSwitch = lowerFallthroughSwitches(`
int key;
void main() {
  switch (key) {
    case 0:
      ivec2 value;
      value = ivec2(1, 0);
    default:
      outputColor = vec4(value, 0, 1);
  }
}`);
if (/\bswitch\b/.test(loweredSwitch) ||
    !loweredSwitch.includes("ivec2 value;") ||
    !loweredSwitch.includes("_hyd_switch_matched_0")) {
    throw new Error(`unexpected fallthrough switch lowering: ${loweredSwitch}`);
}
const loweredSwitchWithBreaks = lowerFallthroughSwitches(`
int key;
void main() {
  switch (key) {
    case 0: outputColor = vec4(0.0); break;
    case 1: outputColor = vec4(1.0);
    case 2: outputColor *= 0.5; break;
    default: outputColor = vec4(0.25); break;
  }
}`);
if (/\bswitch\b/.test(loweredSwitchWithBreaks) ||
    !loweredSwitchWithBreaks.includes("while (_hyd_switch_once_0)") ||
    !loweredSwitchWithBreaks.includes("outputColor = vec4(0.0); break;") ||
    !loweredSwitchWithBreaks.includes("outputColor *= 0.5; break;")) {
    throw new Error(`unexpected fallthrough switch break lowering: ${loweredSwitchWithBreaks}`);
}
const loweredConditionalSwitch = lowerFallthroughSwitches(`
int key;
void main() {
  switch (key) {
    case 1:
      outputColor = vec4(1.0);
    case 2:
      outputColor *= 0.5;
      if (key != 2)
        break;
    default:
      outputColor += vec4(0.25);
      break;
  }
}`);
if (/\bswitch\b/.test(loweredConditionalSwitch) ||
    !loweredConditionalSwitch.includes("if (key != 2)\n        break;") ||
    !loweredConditionalSwitch.includes("_hyd_switch_matched_0")) {
    throw new Error(`unexpected conditional fallthrough switch lowering: ${loweredConditionalSwitch}`);
}
const unchangedSwitch = `switch (key) { case 0: value = 1; break; default: value = 2; break; }`;
deepEqual(lowerFallthroughSwitches(unchangedSwitch), unchangedSwitch);
const webgl1Conditional = maskStaticallyInactivePreprocessorBranches(versionConditionalSource, 1);
if (/^out vec4 webgl2Color;/m.test(webgl1Conditional) ||
    !webgl1Conditional.includes("#define outputColor gl_FragColor")) {
    throw new Error(`unexpected WebGL 1 preprocessor masking:\n${webgl1Conditional}`);
}
const webgl2Conditional = maskStaticallyInactivePreprocessorBranches(versionConditionalSource, 2);
if (!/^out vec4 webgl2Color;/m.test(webgl2Conditional) ||
    /^#define outputColor gl_FragColor/m.test(webgl2Conditional)) {
    throw new Error(`unexpected WebGL 2 preprocessor masking:\n${webgl2Conditional}`);
}
const webgl2Es100Builtins = normalizeWebGl2BuiltinLimits(normalizeWebGlShaderLanguageVersion(
    "#if __VERSION__ == 100\nint limit = gl_MaxDrawBuffers;\n#endif", 1));
if (!webgl2Es100Builtins.includes("#if 100 == 100") ||
    !webgl2Es100Builtins.includes("int limit = 4;")) {
    throw new Error(`unexpected WebGL 2 / GLSL ES 1.00 builtin normalization:\n${webgl2Es100Builtins}`);
}

deepEqual(
    foldGlslIntegerBuiltinCaseLabels(`
const int limit = min(4, 4);
void main() {
  switch (key) {
    case clamp(limit, 1, 6): break;
    case max(3, 5): break;
    case unknown(value, 2): break;
  }
}`),
    `
const int limit = min(4, 4);
void main() {
  switch (key) {
    case 4: break;
    case 5: break;
    case unknown(value, 2): break;
  }
}`,
);

const lineMacroSource = `#define BBB __LINE__, /*
 */ __LINE__
#define AAA(a, b) BBB, a, b
#define LOGICAL_LINE 40
#line LOGICAL_LINE
vec4 value = vec4(AAA(__LINE__,
                      __LINE__));
`;
const materializedLineMacros = materializeWebGlLineMacros(lineMacroSource);
if (!materializedLineMacros.includes("#define BBB __LINE__, /*\n */ __LINE__") ||
    !materializedLineMacros.includes("vec4 value = vec4(AAA(40,\n                      41));")) {
    throw new Error(`unexpected __LINE__ materialization:\n${materializedLineMacros}`);
}
const delegatedLineExpression = materializeWebGlLineMacros(
    "#line (20 + 1)\nfloat value = float(__LINE__);\n",
);
if (!delegatedLineExpression.includes("float value = float(__LINE__);")) {
    throw new Error(`unproven #line expression was not delegated:\n${delegatedLineExpression}`);
}

const declaredOnlyVertexVarying = "varying float value; void main() { gl_Position = vec4(0.0); }";
deepEqual(scanGlslDeclarations(declaredOnlyVertexVarying, "vertex").varyings, []);
deepEqual(
    scanGlslDeclarations(declaredOnlyVertexVarying, "vertex", { includeUnusedVaryings: true })
        .varyings.map((varying) => varying.name),
    ["value"],
);

const explicitAttributeLocations = scanGlslDeclarations(`#version 300 es
layout(location = 0) in int unusedAttribute;
layout(location = 1) in int instanceOne;
layout(location = 2) in int instanceTwo;
void main() { gl_Position = vec4(float(instanceOne + instanceTwo)); }
`, "vertex").attributes;
deepEqual(
    explicitAttributeLocations.map((attribute) => [attribute.name, attribute.location]),
    [["instanceOne", 1], ["instanceTwo", 2]],
);

const explicitFragmentOutputLocations = scanGlslDeclarations(`#version 300 es
layout(location = 1) out vec4 firstOutput;
layout(location = 3) out uvec4 thirdOutput;
void main() { firstOutput = vec4(0.0); thirdOutput = uvec4(0u); }
`, "fragment").outputs;
deepEqual(
    explicitFragmentOutputLocations.map((output) => [output.name, output.location]),
    [["firstOutput", 1], ["thirdOutput", 3]],
);

const bridgedFragmentOutputTypes = scanGlslFragmentOutputScalarTypes(`#version 300 es
layout(location = 0) out uvec4 target;
layout(location = 1) out ivec4 sample;
layout(location = 2) out vec4 colors[2];
void main() {
  target = uvec4(0u);
  sample = ivec4(0);
  colors[0] = vec4(0.0);
  colors[1] = vec4(1.0);
}
`);
deepEqual(Array.from(bridgedFragmentOutputTypes), [
    ["target", "uint"],
    ["sample", "sint"],
    ["colors", "float"],
    ["colors[0]", "float"],
    ["colors[1]", "float"],
]);

const uniformInterfaceBlockSource = `#version 300 es
precision highp float;
uniform UBOData {
  float red;
  vec4 color;
};
layout(location = 0) out vec4 outputColor;
void main() { outputColor = vec4(red) + color; }
`;
const uniformInterfaceBlockMetadata = makeShaderMetadata(
    uniformInterfaceBlockSource,
    0x8B30,
);
deepEqual(uniformInterfaceBlockMetadata.uniforms, []);
deepEqual(
    scanGlslUniformBlocks(uniformInterfaceBlockSource).map((block) => ({
        blockName: block.blockName,
        instanceName: block.instanceName,
        arraySize: block.arraySize,
        isArray: block.isArray,
    })),
    [{ blockName: "UBOData", instanceName: undefined, arraySize: 1, isArray: false }],
);
const boundUniformInterfaceBlock = injectGlslUniformBlockBindings(
    uniformInterfaceBlockSource,
    new Map([["UBOData", 3]]),
);
if (!boundUniformInterfaceBlock.includes("layout(set = 0, binding = 3) uniform UBOData")) {
    throw new Error(`uniform interface block binding was not injected:\n${boundUniformInterfaceBlock}`);
}
const loweredUniformBlockArray = lowerGlslUniformBlockArrays(`
layout(std140) uniform UBOData { float red; } values[2];
float readValues() { return values[0].red + values[1].red; }
`, new Map([["UBOData[0]", 4], ["UBOData[1]", 5]]));
if (!loweredUniformBlockArray.includes("binding = 4") ||
    !loweredUniformBlockArray.includes("binding = 5") ||
    !loweredUniformBlockArray.includes("hydgl2gpu_ubo_values_0.red + hydgl2gpu_ubo_values_1.red") ||
    /\bvalues\s*\[/.test(loweredUniformBlockArray)) {
    throw new Error(`uniform block array was not lowered:\n${loweredUniformBlockArray}`);
}
const loweredSingleElementUniformBlockArray = lowerGlslUniformBlockArrays(`
layout(std140) uniform UBOData { float red; } values[1];
float readValue() { return values[0].red; }
`, new Map([["UBOData[0]", 6]]));
if (!loweredSingleElementUniformBlockArray.includes("binding = 6") ||
    !loweredSingleElementUniformBlockArray.includes("hydgl2gpu_ubo_values_0.red") ||
    /\bvalues\s*\[/.test(loweredSingleElementUniformBlockArray)) {
    throw new Error(`single-element uniform block array was not lowered:\n${loweredSingleElementUniformBlockArray}`);
}

const renamedFunctions = renameUserDefinedFunctions(`
bool function(bool par[3]);
bool is_all(const in bool array[3], const in bool value);
void set_all(out bool array[3], const in bool value);
void main() {
  bool par[3];
  // Initialize the entire array to true.
  set_all(par, true);
  bool ret = function(par) && is_all(par, true);
  /* A comment ending with another period. */
  set_all(par, ret);
  value.set_all();
}
void set_all(out bool array[3], const in bool value) {
  array[0] = value;
}
`);
if ((renamedFunctions.match(/_hyd_user_set_all\s*\(/g) || []).length !== 4 ||
    !renamedFunctions.includes("_hyd_user_function(par)") ||
    !renamedFunctions.includes("_hyd_user_is_all(par, true)") ||
    !renamedFunctions.includes("value.set_all()") ||
    !renamedFunctions.includes("// Initialize the entire array to true.")) {
    throw new Error(`unexpected user function renaming:\n${renamedFunctions}`);
}

const loweredPointSize = lowerWebGlPointSizeToPrivateState(`
// gl_PointSize in a comment must not trigger a replacement.
void main() {
  gl_PointSize = pointScale * 2.0;
  pointScale = gl_PointSize;
}
`);
if (!/float _hydWebGlPointSize;/.test(loweredPointSize) ||
    (loweredPointSize.match(/_hydWebGlPointSize/g) || []).length !== 3 ||
    !loweredPointSize.includes("// gl_PointSize in a comment")) {
    throw new Error(`unexpected PointSize lowering:\n${loweredPointSize}`);
}

const vertex = `
attribute vec3 aPos;
attribute vec2 aUv;
uniform mat4 uModel;
uniform highp vec4 uTint;
varying vec2 vUv;
void main() {
  vUv = aUv;
  gl_Position = uModel * vec4(aPos, 1.0);
}
`;

const fragment = `
precision mediump float;
uniform sampler2D diffuse;
uniform samplerCube skybox;
uniform float exposure;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(diffuse, vUv) * exposure;
}
`;

const fragCoordSource = `
precision mediump float;
void main() {
  gl_FragColor = vec4(gl_FragCoord.xy, gl_FragCoord.zw);
}
`;
const fragCoordMetadata = makeShaderMetadata(
    fragCoordSource,
    0x8B30,
);
deepEqual(
    fragCoordMetadata.uniforms.filter((uniform) => uniform.internal).map((uniform) => uniform.name),
    [FRAG_COORD_HEIGHT_UNIFORM_NAME],
);

const depthRangeSource = `
void main() {
  gl_Position = vec4(gl_DepthRange.near, gl_DepthRange.far, gl_DepthRange.diff, 1.0);
}
`;
deepEqual(
    makeShaderMetadata(depthRangeSource, 0x8B31).uniforms
        .filter((uniform) => uniform.internal)
        .map((uniform) => uniform.name),
    [DEPTH_RANGE_NEAR_UNIFORM_NAME, DEPTH_RANGE_FAR_UNIFORM_NAME, DEPTH_RANGE_DIFF_UNIFORM_NAME],
);
const normalizedDepthRange = normalizeWebGlDepthRange(depthRangeSource);
if (normalizedDepthRange.includes("gl_DepthRange") ||
    !normalizedDepthRange.includes(DEPTH_RANGE_DIFF_UNIFORM_NAME)) {
    throw new Error(`unexpected depth-range normalization:\n${normalizedDepthRange}`);
}

const vertexDecls = scanGlslDeclarations(vertex, "vertex");
deepEqual(vertexDecls.attributes.map((item) => item.name), ["aPos", "aUv"]);
deepEqual(vertexDecls.attributes.map((item) => item.wgsl_type), ["vec3<f32>", "vec2<f32>"]);
deepEqual(vertexDecls.uniforms.map((item) => item.name), ["uModel"]);
if (vertexDecls.uniforms.some((item) => item.name === "uTint")) {
    throw new Error("expected unused uniforms to be filtered from active metadata");
}
deepEqual(vertexDecls.varyings.map((item) => item.name), ["vUv"]);

const sameLineDeclarations = scanGlslDeclarations(
    "attribute vec4 aVertex; attribute vec4 aColor; varying vec4 vColor; void main() { vColor = aColor; gl_Position = aVertex; }",
    "vertex",
);
deepEqual(sameLineDeclarations.attributes.map((item) => item.name), ["aVertex", "aColor"]);
deepEqual(sameLineDeclarations.varyings.map((item) => item.name), ["vColor"]);

const varyingArrayDeclarations = scanGlslDeclarations(
    "varying vec2 colors[3]; void main() { gl_FragColor = vec4(colors[0], 0.0, 1.0); }",
    "fragment",
);
deepEqual(varyingArrayDeclarations.varyings.map((item) => ({
    name: item.name,
    size: item.size,
    isArray: item.is_array,
})), [{ name: "colors", size: 3, isArray: true }]);

const uniformArrayDeclarations = scanGlslDeclarations(
    "uniform float weights[4]; void main() { gl_Position = vec4(weights[0], weights[1], weights[2], weights[3]); }",
    "vertex",
);
deepEqual(uniformArrayDeclarations.uniforms.map((item) => ({
    name: item.name,
    size: item.size,
    wgslType: item.wgsl_type,
})), [{ name: "weights", size: 4, wgslType: "array<f32, 4>" }]);
const constSizedUniformArray = scanGlslDeclarations(
    "const int base = 1; const int count = (base + 1) * 2; uniform float weights[count]; void main() { gl_Position = vec4(weights[3]); }",
    "vertex",
);
deepEqual(constSizedUniformArray.uniforms.map((item) => ({ name: item.name, size: item.size })), [
    { name: "weights", size: 4 },
]);
const singleElementArrayDeclarations = scanGlslDeclarations(
    "uniform vec4 color[1]; void main() { gl_Position = color[0]; }",
    "vertex",
);
deepEqual(singleElementArrayDeclarations.uniforms.map((item) => ({
    name: item.name,
    size: item.size,
    isArray: item.is_array,
    wgslType: item.wgsl_type,
})), [{ name: "color", size: 1, isArray: true, wgslType: "array<vec4<f32>, 1>" }]);

const samplerArrayDeclarations = scanGlslDeclarations(
    "#define SAMPLER_COUNT 2\nuniform sampler2D textures[SAMPLER_COUNT]; void main() { gl_FragColor = texture2D(textures[1], vec2(0.0)); }",
    "fragment",
);
deepEqual(samplerArrayDeclarations.samplers.map((item) => ({
    name: item.name,
    sourceName: item.source_name,
    size: item.size,
    arrayName: item.array_name,
    arrayIndex: item.array_index,
})), [
    { name: "textures_0", sourceName: "textures[0]", size: 2, arrayName: "textures", arrayIndex: 0 },
    { name: "textures_1", sourceName: "textures[1]", size: 2, arrayName: "textures", arrayIndex: 1 },
]);
const dynamicSamplerLowering = lowerDynamicSamplerArrayTextureCalls(
    "color += texture(textures[i - 1], uv);",
    samplerArrayDeclarations.samplers,
);
deepEqual(dynamicSamplerLowering.source, "color += _hyd_texture_sampler_array_textures_2(int(i - 1), uv);");
if (dynamicSamplerLowering.helpers.length !== 1 ||
    !dynamicSamplerLowering.helpers[0].includes("if (index == 0) return texture(sampler2D(textures_0T, textures_0S), coord);") ||
    !dynamicSamplerLowering.helpers[0].includes("return texture(sampler2D(textures_1T, textures_1S), coord);")) {
    throw new Error("expected dynamic sampler arrays to lower to resource dispatch");
}
const vertexDynamicSamplerLowering = lowerDynamicSamplerArrayTextureCalls(
    "color += texture(textures[i], uv);",
    samplerArrayDeclarations.samplers,
    "vertex",
);
if (!vertexDynamicSamplerLowering.helpers[0].includes(
    "return textureLod(sampler2D(textures_1T, textures_1S), coord, 0.0);",
)) {
    throw new Error("expected vertex-stage dynamic sampler dispatch to use explicit LOD zero");
}

const samplerStructSource = `
struct Samplers {
  sampler2D values[2];
};
uniform Samplers uni;
vec4 readSampler(Samplers arg) {
  return texture2D(arg.values[0], vec2(0.0));
}
void main() {
  gl_FragColor = readSampler(uni);
}
`;
const samplerStructDeclarations = scanGlslDeclarations(samplerStructSource, "fragment");
deepEqual(
    samplerStructDeclarations.samplers.map((sampler) => [sampler.name, sampler.source_name]),
    [["uni_values_0", "uni.values[0]"], ["uni_values_1", "uni.values[1]"]],
);
const rewrittenSamplerStructArray = samplerStructDeclarations.samplers.reduce(
    (source, sampler) => replaceGlslSourcePath(source, sampler.source_name!, sampler.name),
    "color += texture(uni . values [ 0 ], uv) + texture(uni.values[1], uv);",
);
deepEqual(
    rewrittenSamplerStructArray,
    "color += texture(uni_values_0, uv) + texture(uni_values_1, uv);",
);
const samplerStructLowered = lowerSamplerStructFunctionParameters(
    samplerStructSource,
    samplerStructDeclarations.samplers,
);
if (!samplerStructLowered.includes("vec4 readSampler(sampler2D arg_values_0, sampler2D arg_values_1)") ||
    !samplerStructLowered.includes("texture2D(arg_values_0, vec2(0.0))") ||
    !samplerStructLowered.includes("readSampler(uni_values_0, uni_values_1)") ||
    samplerStructLowered.includes("struct Samplers")) {
    throw new Error(`expected sampler-only struct parameters to flatten:\n${samplerStructLowered}`);
}
const nestedSamplerStructDeclarations = scanGlslDeclarations(`
struct Leaf { sampler2D color; samplerCube cubes[2]; };
struct Branch { Leaf leaves[2]; };
uniform Branch resources;
void main() {
  gl_FragColor = texture(resources.leaves[1].color, vec2(0.0));
}
`, "fragment");
deepEqual(
    nestedSamplerStructDeclarations.samplers.map((sampler) => [
        sampler.name,
        sampler.source_name,
        sampler.array_name,
        sampler.array_index,
        sampler.size,
    ]),
    [
        ["resources_leaves_0_color", "resources.leaves[0].color", undefined, undefined, 1],
        ["resources_leaves_0_cubes_0", "resources.leaves[0].cubes[0]", "resources.leaves[0].cubes", 0, 2],
        ["resources_leaves_0_cubes_1", "resources.leaves[0].cubes[1]", "resources.leaves[0].cubes", 1, 2],
        ["resources_leaves_1_color", "resources.leaves[1].color", undefined, undefined, 1],
        ["resources_leaves_1_cubes_0", "resources.leaves[1].cubes[0]", "resources.leaves[1].cubes", 0, 2],
        ["resources_leaves_1_cubes_1", "resources.leaves[1].cubes[1]", "resources.leaves[1].cubes", 1, 2],
    ],
);

const tintUniformMetadata: InitShaderInfoType = {
    attributes: [],
    uniforms: [
        { name: "weights", glsl_type: "float", wgsl_type: "array<f32, 2>", size: 2 },
        { name: "offsets", glsl_type: "vec4", wgsl_type: "array<vec4f, 2>", size: 2 },
    ],
    samplers: [],
    glsl: "",
    wgsl: "",
    debug_info: "",
};
const synchronizedTintUniformWgsl = synchronizeTintUniformTypes(`
struct strided_arr {
  @size(16) el : f32,
}
alias Arr = array<strided_arr, 2u>;
struct HydUniformObject {
  /* @offset(0) */ weights : Arr,
  @align(16) offsets : array<vec4f, 2u>,
}
@group(0) @binding(0) var<uniform> x_26 : HydUniformObject;
`, tintUniformMetadata);
if (!/^array<_hyd_uniform_layout_[a-z0-9]+, 2u>$/.test(tintUniformMetadata.uniforms[0].wgsl_type)) {
    throw new Error(`expected a canonical strided array type, got ${tintUniformMetadata.uniforms[0].wgsl_type}`);
}
deepEqual(tintUniformMetadata.uniforms[1].wgsl_type, "array<vec4f, 2u>");
const tintUniformDeclarations = tintUniformMetadata.uniforms[0].wgsl_declarations || [];
if (tintUniformDeclarations.length !== 1 || !tintUniformDeclarations[0].includes("@size(16) el: f32")) {
    throw new Error("expected the canonical uniform type declaration to preserve Tint's element stride");
}
if (/\b(?:strided_arr|Arr)\b/.test(synchronizedTintUniformWgsl)) {
    throw new Error("expected Tint-local uniform type aliases to be replaced by canonical types");
}
deepEqual(
    wgslUniformMemberDeclaration({
        name: "weights",
        glsl_type: "float",
        wgsl_type: "array<f32, 4>",
        size: 4,
        is_array: true,
    }),
    "@align(16) weights: array<f32, 4>,",
);
deepEqual(
    wgslUniformMemberDeclaration({ name: "count", glsl_type: "int", wgsl_type: "i32" }),
    "count: i32,",
);
const bareXRewritten = replaceBareWgslIdentifier(
    "let selected = x; let expanded = vec4f(value.x, value . x, 0.0f, 0.0f);",
    "x",
    "_hyd_uniforms_.x",
);
deepEqual(
    bareXRewritten,
    "let selected = _hyd_uniforms_.x; let expanded = vec4f(value.x, value . x, 0.0f, 0.0f);",
);
deepEqual(
    replaceBareWgslIdentifier(
        "@builtin(position) gl_Position: vec4f, @location(0) value: f32; let selected = position;",
        "position",
        "_hyd_uniforms_.position",
    ),
    "@builtin(position) gl_Position: vec4f, @location(0) value: f32; let selected = _hyd_uniforms_.position;",
);

deepEqual(bridgeGlslIdentifier("uint"), "hydgl2gpu_id_uint");
deepEqual(bridgeGlslIdentifier("position"), "position");
const bridgedDunder = bridgeGlslDunderIdentifiers("attribute vec4 foo__bar; void main() { gl_Position = foo__bar; }");
if (/\bfoo__bar\b/.test(bridgedDunder) || !/hydgl2gpu_dunder_foo_bar_[a-z0-9]+/.test(bridgedDunder)) {
    throw new Error(`double-underscore identifier was not alpha-renamed: ${bridgedDunder}`);
}
deepEqual(bridgeGlslDunderIdentifiers("#if __VERSION__ == 100\n#endif"), "#if __VERSION__ == 100\n#endif");
for (const name of ["__foo", "foo__", "__foo__"]) {
    const bridged = bridgeGlslIdentifier(name);
    if (bridged === name || bridged.includes("__")) {
        throw new Error(`unsafe double-underscore bridge for ${name}: ${bridged}`);
    }
}
deepEqual(
    bridgeGlslEs100Identifiers(`
struct texture { vec4 sin; };
attribute vec4 uint;
void main() {
  texture value;
  value.sin = sin(uint.x);
  gl_Position = vec4(value.sin);
}
`),
    `
struct hydgl2gpu_id_texture { vec4 hydgl2gpu_id_sin; };
attribute vec4 hydgl2gpu_id_uint;
void main() {
  hydgl2gpu_id_texture value;
  value.hydgl2gpu_id_sin = sin(hydgl2gpu_id_uint.x);
  gl_Position = vec4(value.hydgl2gpu_id_sin);
}
`,
);
const bridgedMetadata = scanGlslDeclarations(
    "attribute vec4 uint; varying vec4 texture; void main() { texture = uint; gl_Position = uint; }",
    "vertex",
);
deepEqual(bridgedMetadata.attributes.map((item) => [item.name, item.source_name]), [["hydgl2gpu_id_uint", "uint"]]);
deepEqual(bridgedMetadata.varyings.map((item) => [item.name, item.source_name]), [["hydgl2gpu_id_texture", "texture"]]);
deepEqual(bridgeGlslIdentifier("coherent"), "hydgl2gpu_id_coherent");
deepEqual(
    bridgeGlslEs100Identifiers(
        "attribute vec4 coherent; void main() { gl_Position = coherent; }",
    ),
    "attribute vec4 hydgl2gpu_id_coherent; void main() { gl_Position = hydgl2gpu_id_coherent; }",
);
deepEqual(
    scanGlslDeclarations("uniform vec4 coherent; void main() { gl_FragColor = coherent; }", "fragment")
        .uniforms.map((item) => [item.name, item.source_name]),
    [["hydgl2gpu_id_coherent", "coherent"]],
);

deepEqual(
    normalizeEs100SequenceArrayDimensions("void main() { float values[(2, 3)]; }") ,
    "void main() { float values[3]; }",
);
deepEqual(
    lowerEs100GlobalInitializers(`
const float keep = 1.0;
float first = keep;
float second = sin(first), third;
void main() {
  gl_Position = vec4(second + third);
}
`),
    `
const float keep = 1.0;
float first;
float second, third;
void main() {
  first = keep;
  second = sin(first);
  gl_Position = vec4(second + third);
}
`,
);
const loweredPostMainGlobals = lowerEs100GlobalInitializers(`
#ifdef GL_ES
#endif
float before = 1.0;
void main() { gl_Position = vec4(before + after); }
float after = 2.0;
`);
if (loweredPostMainGlobals.includes("GL_ES =") ||
    loweredPostMainGlobals.indexOf("float after;") > loweredPostMainGlobals.indexOf("void main") ||
    !/void main\(\) \{\s*before = 1\.0;\s*after = 2\.0;/.test(loweredPostMainGlobals)) {
    throw new Error(`unexpected post-main global lowering:\n${loweredPostMainGlobals}`);
}

const structArraySource = `
struct ColorPair { vec4 color1[2]; vec4 color2[2]; };
uniform ColorPair u_colors[2];
void main() {
  gl_FragColor = u_colors[0].color1[0] + u_colors[1].color2[1];
}
`;
const structArrayPlan = planValueStructUniforms(structArraySource);
deepEqual(
    structArrayPlan.leaves.map((leaf) => [leaf.sourceName, leaf.size, leaf.isArray]),
    [
        ["u_colors[0].color1", 2, true],
        ["u_colors[1].color2", 2, true],
    ],
);
const structArrayMetadata = scanGlslDeclarations(structArraySource, "fragment");
deepEqual(
    structArrayMetadata.uniforms.map((uniform) => [uniform.source_name, uniform.size, uniform.is_array]),
    [
        ["u_colors[0].color1", 2, true],
        ["u_colors[1].color2", 2, true],
    ],
);

const aggregateStructSource = `
struct S { float zero; int one; };
uniform S us;
S value = us;
void main() { gl_FragColor = vec4(float(value.one)); }
`;
const aggregatePlan = planValueStructUniforms(aggregateStructSource);
deepEqual(aggregatePlan.leaves.map((leaf) => leaf.sourceName), ["us.zero", "us.one"]);
const reconstructedAggregate = rewriteStructUniformAggregateReads("S value = us;", aggregatePlan);
if (!/^S value = S\(hydgl2gpu_uniform_us_zero_[a-z0-9]+, hydgl2gpu_uniform_us_one_[a-z0-9]+\);$/.test(reconstructedAggregate)) {
    throw new Error(`unexpected struct aggregate reconstruction: ${reconstructedAggregate}`);
}
const aggregateDefinitionPreserved = rewriteStructUniformAggregateReads(
    "struct S { float a; int b; }; bool equal = us == us;",
    aggregatePlan,
);
if (!aggregateDefinitionPreserved.startsWith("struct S { float a; int b; };") ||
    aggregateDefinitionPreserved.includes("float S(")) {
    throw new Error(`struct definition was modified by aggregate reconstruction: ${aggregateDefinitionPreserved}`);
}
const dynamicStructUniformSource = `
struct Leaf { float scalar; vec2 values[2]; };
struct Root { Leaf leaves[3]; };
uniform Root roots[2];
void main() { float value = roots[rootIndex].leaves[leafIndex].values[valueIndex].x; }
`;
const dynamicStructUniformPlan = planValueStructUniforms(dynamicStructUniformSource);
deepEqual(
    dynamicStructUniformPlan.leaves.map((leaf) => leaf.sourceName),
    [
        "roots[0].leaves[0].values", "roots[0].leaves[1].values", "roots[0].leaves[2].values",
        "roots[1].leaves[0].values", "roots[1].leaves[1].values", "roots[1].leaves[2].values",
    ],
);
const dynamicStructUniformRewrite = rewriteDynamicStructUniformReads(
    dynamicStructUniformSource,
    dynamicStructUniformPlan,
);
if (!/vec2\[12\]\([\s\S]*hydgl2gpu_uniform_roots_1_leaves_2_values_[a-z0-9]+\[1\][\s\S]*\)\[\(rootIndex\) \* 6 \+ \(leafIndex\) \* 2 \+ \(valueIndex\)\]\.x/.test(
    dynamicStructUniformRewrite.source,
) || dynamicStructUniformRewrite.helpers.length !== 0) {
    throw new Error(`unexpected dynamic struct uniform lowering:\n${dynamicStructUniformRewrite.source}\n${dynamicStructUniformRewrite.helpers.join("\n")}`);
}
const longStructPath = `uniform struct { vec4 ${"field".repeat(220)}; } ${"root".repeat(150)};`;
const longStructPlan = planValueStructUniforms(normalizeAnonymousUniformStructs(longStructPath));
if (longStructPlan.leaves.some((leaf) => leaf.name.length > 128)) {
    throw new Error(`flattened uniform identifier was not bounded: ${longStructPlan.leaves[0]?.name.length}`);
}
const inlineInterfaceSource = `
flat out struct S { int field; vec2 uv; } v_s;
void main() { v_s.field = 1; v_s.uv = vec2(0.0); }
`;
const loweredInlineInterface = lowerInlineInterfaceStructs(inlineInterfaceSource);
if (!loweredInlineInterface.includes("struct S { int field; vec2 uv; };") ||
    !/flat out int hydgl2gpu_io_v_s_field_[a-z0-9]+;/.test(loweredInlineInterface) ||
    /\bv_s\s*\./.test(loweredInlineInterface)) {
    throw new Error(`unexpected inline interface struct lowering:\n${loweredInlineInterface}`);
}
const loweredNamedInterface = lowerInlineInterfaceStructs(`
struct S { mediump float scalar; highp vec3 vector; };
centroid out S value;
void main() { value.scalar = 1.0; value.vector = vec3(2.0); }
`);
if (/\bcentroid\s+out\s+S\s+value\b/.test(loweredNamedInterface) ||
    !/centroid out float hydgl2gpu_io_value_scalar_[a-z0-9]+;/.test(loweredNamedInterface) ||
    !/centroid out vec3 hydgl2gpu_io_value_vector_[a-z0-9]+;/.test(loweredNamedInterface) ||
    /\bvalue\s*\.\s*(?:scalar|vector)\b/.test(loweredNamedInterface)) {
    throw new Error(`unexpected named interface struct lowering:\n${loweredNamedInterface}`);
}
deepEqual(
    scanGlslDeclarations(inlineInterfaceSource, "vertex", { includeUnusedVaryings: true }).varyings.map((varying) => varying.source_name || varying.name),
    Array.from(new Set(loweredInlineInterface.match(/hydgl2gpu_io_v_s_(?:field|uv)_[a-z0-9]+/g) || [])),
);
const anonymousStructSource = normalizeAnonymousUniformStructs("uniform struct { float f; vec4 v; } u_struct;");
if (!/struct hydgl2gpu_anon_uniform_0/.test(anonymousStructSource) || !/uniform hydgl2gpu_anon_uniform_0 u_struct;/.test(anonymousStructSource)) {
    throw new Error(`anonymous uniform struct was not normalized: ${anonymousStructSource}`);
}
const uniformObjectSource = `
@group(0) @binding(0) var<uniform> x_13 : HydUniformObject;
let selected = x_13.x;
let expanded = vec4f(value.x, value . x, 0.0f, 0.0f);
`;
deepEqual(wgslUniformVariableNames(uniformObjectSource), ["x_13"]);
deepEqual(
    wgslUniformVariableNames(
        "@group(0u) @binding(0u) var<uniform> x_14 : HydUniformObject;",
        new Set([0]),
    ),
    ["x_14"],
);
deepEqual(
    replaceWgslMemberAccess(uniformObjectSource, ["x_13"], "x", "_hyd_uniforms_.x"),
    `
@group(0) @binding(0) var<uniform> x_13 : HydUniformObject;
let selected = _hyd_uniforms_.x;
let expanded = vec4f(value.x, value . x, 0.0f, 0.0f);
`,
);
deepEqual(
    composeShaderModuleWgsl(
        "@group(0) @binding(0) var tex: texture_2d<f32>;\n",
        "diagnostic(off, derivative_uniformity);\n\n@fragment fn main() {}\n",
    ),
    "diagnostic(off, derivative_uniformity);\n\n@group(0) @binding(0) var tex: texture_2d<f32>;\n@fragment fn main() {}\n",
);

const matrixArrayUniform = { name: "bones", glsl_type: "mat3x2", wgsl_type: "", size: 3, is_array: true };
deepEqual(matrixArrayStorageDeclaration(matrixArrayUniform), "vec2 bones[9];");
deepEqual(makeMatrixArrayLoaders([matrixArrayUniform]), [
    "mat3x2 _hyd_load_matrix_array_bones(int index) {\n" +
    "  return mat3x2(bones[(index * 3) + 0], bones[(index * 3) + 1], bones[(index * 3) + 2]);\n" +
    "}",
]);
deepEqual(
    rewriteMatrixArrayUniformReads("return bones[i + indices[j]][1] + float(bones.length());", [matrixArrayUniform]),
    "return _hyd_load_matrix_array_bones(int(i + indices[j]))[1] + float(3);",
);
const peerMatrixArrayUniform = { ...matrixArrayUniform, name: "otherBones" };
deepEqual(
    rewriteMatrixArrayUniformReads("return bones == otherBones;", [matrixArrayUniform, peerMatrixArrayUniform]),
    "return ((_hyd_load_matrix_array_bones(0) == _hyd_load_matrix_array_otherBones(0)) && " +
    "(_hyd_load_matrix_array_bones(1) == _hyd_load_matrix_array_otherBones(1)) && " +
    "(_hyd_load_matrix_array_bones(2) == _hyd_load_matrix_array_otherBones(2)));",
);
const noOpWholeMatrixArray = rewriteMatrixArrayUniformReads("void f() { bones; }", [matrixArrayUniform]);
if (/\bbones\s*;/.test(noOpWholeMatrixArray)) {
    throw new Error(`expected a side-effect-free whole-array statement to be removed: ${noOpWholeMatrixArray}`);
}

const fragmentDecls = scanGlslDeclarations(fragment, "fragment");
deepEqual(fragmentDecls.uniforms.map((item) => item.name), ["exposure"]);
deepEqual(fragmentDecls.samplers.map((item) => [item.name, item.wgsl_texture_type]), [
    ["diffuse", "texture_2d<f32>"],
]);
if (fragmentDecls.samplers.some((item) => item.name === "skybox")) {
    throw new Error("expected unused samplers to be filtered from active metadata");
}
deepEqual(fragmentDecls.varyings.map((item) => item.name), ["vUv"]);

const aquariumMetadata: InitShaderInfoType = {
    attributes: [],
    uniforms: [],
    samplers: [
        {
            name: "diffuse",
            glsl_type: "sampler2D",
            wgsl_texture_type: "texture_2d<f32>",
            wgsl_sampler_type: "sampler",
        },
        {
            name: "skybox",
            glsl_type: "samplerCube",
            wgsl_texture_type: "texture_cube<f32>",
            wgsl_sampler_type: "sampler",
        },
    ],
    glsl: "",
    wgsl: "",
    debug_info: "",
};

const aquariumWgsl = normalizeWebGlTextureCoordinates(`
@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
    let diffuseColor = textureSample(diffuseT, diffuseS, input.v_texCoord);
    let skyColor = textureSample(skyboxT, skyboxS, input.reflectionVec);
    return diffuseColor + skyColor;
}
`, aquariumMetadata, "fragment", fragment);
if (!aquariumWgsl.includes("fn _hyd_glTexCoordToGpu")) {
    throw new Error("expected Aquarium-style 2D texture sample to add texcoord helper");
}
if (!aquariumWgsl.includes("textureSample(diffuseT, diffuseS, _hyd_glTexCoordToGpu(input.v_texCoord))")) {
    throw new Error("expected Aquarium-style 2D texture sample to flip texcoord");
}
if (!aquariumWgsl.includes("textureSample(skyboxT, skyboxS, input.reflectionVec)")) {
    throw new Error("expected cube texture sample to stay unchanged");
}

const aquariumTintAliasWgsl = normalizeWebGlTextureCoordinates(`
var<private> v_texCoord : vec2f;

fn main_1() {
    let x_23 = v_texCoord;
    let diffuseColor = textureSample(diffuseT, diffuseS, x_23);
    let skyColor = textureSample(skyboxT, skyboxS, input.reflectionVec);
}

@fragment
fn main(@location(0) v_texCoord_param : vec2f) -> @location(0) vec4<f32> {
    v_texCoord = v_texCoord_param;
    main_1();
    return vec4<f32>();
}
`, aquariumMetadata, "fragment", fragment);
if (!aquariumTintAliasWgsl.includes("textureSample(diffuseT, diffuseS, _hyd_glTexCoordToGpu(x_23))")) {
    throw new Error("expected Tint texcoord alias to flip");
}

const particleMetadata: InitShaderInfoType = {
    attributes: [],
    uniforms: [],
    samplers: [
        {
            name: "rampSampler",
            glsl_type: "sampler2D",
            wgsl_texture_type: "texture_2d<f32>",
            wgsl_sampler_type: "sampler",
        },
        {
            name: "colorSampler",
            glsl_type: "sampler2D",
            wgsl_texture_type: "texture_2d<f32>",
            wgsl_sampler_type: "sampler",
        },
    ],
    glsl: "",
    wgsl: "",
    debug_info: "",
};
const particleWgsl = normalizeWebGlTextureCoordinates(`
@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
    let colorMult = textureSample(rampSamplerT, rampSamplerS, vec2<f32>(input.PercentLife, 0.5));
    let colorSample = textureSample(colorSamplerT, colorSamplerS, input.Texcoord);
    return colorSample * colorMult;
}
`, particleMetadata, "fragment", `
uniform sampler2D rampSampler;
uniform sampler2D colorSampler;
varying vec2 outputTexcoord;
varying float outputPercentLife;
void main() {
  gl_FragColor = texture2D(colorSampler, outputTexcoord);
}
`);
if (!particleWgsl.includes("textureSample(rampSamplerT, rampSamplerS, vec2<f32>(input.PercentLife, 0.5))")) {
    throw new Error("expected non-texcoord particle ramp lookup to stay unchanged");
}
if (!particleWgsl.includes("textureSample(colorSamplerT, colorSamplerS, _hyd_glTexCoordToGpu(input.Texcoord))")) {
    throw new Error("expected particle color lookup to flip texcoord");
}

const spriteMetadata: InitShaderInfoType = {
    attributes: [],
    uniforms: [],
    samplers: [
        {
            name: "u_texture0",
            glsl_type: "sampler2D",
            wgsl_texture_type: "texture_2d<f32>",
            wgsl_sampler_type: "sampler",
        },
    ],
    glsl: "",
    wgsl: "",
    debug_info: "",
};
const spriteWgsl = normalizeWebGlTextureCoordinates(`
@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
    return textureSampleLevel(u_texture0T, u_texture0S, input.texCoord, 0.0);
}
`, spriteMetadata, "fragment", `
attribute vec2 spriteTextureSize;
attribute vec4 textureWeights;
uniform sampler2D u_texture0;
varying vec2 v_texCoord;
`);
if (spriteWgsl.includes("_hyd_glTexCoordToGpu")) {
    throw new Error("expected Sprite/JSGamesBench texture samples to stay unflipped");
}

const particleVertexWgsl = normalizeWebGlTextureCoordinates(`
@vertex
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.Texcoord = vec2<f32>(u, uv.y + 0.5);
    return output;
}
`, { ...particleMetadata, samplers: [] }, "vertex", `
attribute vec4 uvLifeTimeFrameStart;
attribute vec4 orientation;
varying vec2 outputTexcoord;
void main() {
  outputTexcoord = vec2(0.0, uvLifeTimeFrameStart.y + 0.5);
}
`);
if (!particleVertexWgsl.includes("output.Texcoord.y = 1.0 - output.Texcoord.y;")) {
    throw new Error("expected Aquarium particle vertex texcoord to flip before return");
}

const particlePrivateVertexWgsl = normalizeWebGlTextureCoordinates(`
var<private> outputTexcoord : vec2f;

fn main_1() {
  outputTexcoord = vec2f(u, uv.y + 0.5f);
  return;
}

@vertex
fn main() -> VertexOutput {
  main_1();
  return VertexOutput(outputTexcoord);
}
`, { ...particleMetadata, samplers: [] }, "vertex", `
attribute vec4 uvLifeTimeFrameStart;
attribute vec4 orientation;
varying vec2 outputTexcoord;
void main() {
  outputTexcoord = vec2(0.0, uvLifeTimeFrameStart.y + 0.5);
}
`);
if (!particlePrivateVertexWgsl.includes("outputTexcoord.y = 1.0 - outputTexcoord.y;")) {
    throw new Error("expected Tint private particle texcoord to flip before return");
}

const particleBillboardVertexWgsl = normalizeWebGlTextureCoordinates(`
@vertex
fn main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.Texcoord = vec2<f32>(u, uv.y + 0.5);
    return output;
}
`, { ...particleMetadata, samplers: [] }, "vertex", `
attribute vec4 uvLifeTimeFrameStart;
varying vec2 outputTexcoord;
void main() {
  outputTexcoord = vec2(0.0, uvLifeTimeFrameStart.y + 0.5);
}
`);
if (particleBillboardVertexWgsl.includes("1.0 - output.Texcoord.y")) {
    throw new Error("expected non-orientation Aquarium particle vertex texcoord to stay unchanged");
}

const tintWrapperWgsl = `
var<private> a_pos : vec4f;
var<private> v_color : vec4f;
var<private> gl_Position : vec4f;

fn main_1() {
  let x_1 = vec4f(a_pos.x, a_pos.y, a_pos.z, a_pos.w);
  v_color = x_1;
  gl_Position = x_1;
  return;
}

struct main_out {
  @location(0)
  v_color_1 : vec4f,
  @builtin(position)
  gl_Position_1 : vec4f,
}

@vertex
fn main(@location(0) a_pos_param : vec4f) -> main_out {
  a_pos = a_pos_param;
  main_1();
  return main_out(v_color, gl_Position);
}
`;
const optimizedWrapper = optimizeTintWgsl(tintWrapperWgsl);
if (optimizedWrapper.wgsl.includes("var<private> a_pos") || optimizedWrapper.wgsl.includes("fn main_1")) {
    throw new Error("expected Tint entry wrapper private IO to be lowered");
}
if (!optimizedWrapper.wgsl.includes("var _hyd_output: main_out;")) {
    throw new Error("expected multi-field output to keep a local output struct");
}
if (!optimizedWrapper.wgsl.includes("_hyd_output.v_color_1 = a_pos_param;") || !optimizedWrapper.wgsl.includes("_hyd_output.gl_Position_1 = a_pos_param;")) {
    throw new Error("expected input private and redundant constructor to fold into direct output assignments");
}
if (optimizedWrapper.stats.loweredPrivateVars !== 3) {
    throw new Error(`expected 3 lowered private vars, got ${optimizedWrapper.stats.loweredPrivateVars}`);
}
if (optimizedWrapper.stats.removedTemporaries < 1 || optimizedWrapper.stats.foldedConstructors < 1) {
    throw new Error("expected peephole optimizer to remove a temp and fold a constructor");
}

const indexedPrivateOutputWgsl = `
var<private> values : array<f32, 2u>;

fn main_1() {
  values[0i] = 1.0f;
  values[1i] = 2.0f;
}

struct main_out {
  @location(0) value_0 : f32,
  @location(1) value_1 : f32,
}

@vertex
fn main() -> main_out {
  main_1();
  return main_out(values[0i], values[1i]);
}
`;
const indexedPrivateOutputOptimized = optimizeTintWgsl(indexedPrivateOutputWgsl);
if (indexedPrivateOutputOptimized.wgsl.includes("var<private> values") ||
    !indexedPrivateOutputOptimized.wgsl.includes("_hyd_output.value_0 = 1.0f;") ||
    !indexedPrivateOutputOptimized.wgsl.includes("_hyd_output.value_1 = 2.0f;")) {
    throw new Error(`expected fixed-index private outputs to lower safely:\n${indexedPrivateOutputOptimized.wgsl}`);
}

const inferredVectorConstructorWgsl = optimizeTintWgsl(`
fn helper(value: vec3f) -> vec4f {
  let expanded = vec4f(value, 1.0f);
  let copied = vec4f(expanded.x, expanded.y, expanded.z, expanded.w);
  return copied;
}
`);
if (inferredVectorConstructorWgsl.wgsl.includes("vec4f(expanded.x")) {
    throw new Error("expected inferred vec4f declarations to participate in constructor folding");
}
if (inferredVectorConstructorWgsl.stats.foldedConstructors < 1) {
    throw new Error("expected inferred vector constructor folding to be counted");
}

const currentTintSingleUseTemporaryWgsl = optimizeTintWgsl(`
fn helper(a: f32, b: f32) -> f32 {
  let v_2 = (a + (b / 10.0f));
  let fade = fract(v_2);
  return fade;
}
`);
if (currentTintSingleUseTemporaryWgsl.wgsl.includes("let v_2") ||
    !/fract\s*\(\s*\(+a\s*\+\s*\(b\s*\/\s*10\.0f\)\)+\s*\)/.test(currentTintSingleUseTemporaryWgsl.wgsl)) {
    throw new Error(`expected current Tint v_N temporary to inline safely:\n${currentTintSingleUseTemporaryWgsl.wgsl}`);
}
if (currentTintSingleUseTemporaryWgsl.stats.removedTemporaries < 1) {
    throw new Error("expected current Tint single-use temporary removal to be counted");
}

const spriteOutputStoreWgsl = `
struct main_out {
  @builtin(position)
  gl_Position_1 : vec4f,
  @location(0)
  v_Texcoord_1 : vec2f,
}

@vertex
fn main(@location(0) vposition_param : vec2f) -> main_out {
  var _hyd_output: main_out;
  let pre_rot : vec2f = (vposition_param * _hyd_uniforms_.sprite_sizerot.xy);
  let tdir : vec2f = vec2f(sin(_hyd_uniforms_.sprite_sizerot.z), cos(_hyd_uniforms_.sprite_sizerot.z));
  let dir : vec2f = vec2f(tdir.y, -(tdir.x));
  _hyd_output.gl_Position_1.x = dot(dir, pre_rot);
  _hyd_output.gl_Position_1.y = dot(tdir, pre_rot);
  _hyd_output.gl_Position_1 = vec4f(((((_hyd_output.gl_Position_1.xy + _hyd_uniforms_.sprite_pos.xy) * _hyd_uniforms_.screen_dims.xy) + _hyd_uniforms_.screen_dims.zw)).xy, _hyd_output.gl_Position_1.zw);
  _hyd_output.gl_Position_1.z = _hyd_uniforms_.sprite_pos.z;
  _hyd_output.gl_Position_1.w = 1.0f;
  _hyd_output.v_Texcoord_1 = ((vposition_param * _hyd_uniforms_.sprite_tex_transform.xy) + _hyd_uniforms_.sprite_tex_transform.zw);
  return _hyd_output;
}
`;
const spriteOutputStoreOptimized = optimizeTintWgsl(spriteOutputStoreWgsl);
if (!spriteOutputStoreOptimized.wgsl.includes("var _hyd_output: main_out;")) {
    throw new Error("expected Sprite-like multi-field output local to stay in manual-like form");
}
if (spriteOutputStoreOptimized.wgsl.includes("_hyd_output.gl_Position_1.x")) {
    throw new Error("expected Sprite-like position component stores to be folded");
}
if (!spriteOutputStoreOptimized.wgsl.includes("_hyd_output.gl_Position_1 = vec4f(")
    || !spriteOutputStoreOptimized.wgsl.includes("(((dot(dir, pre_rot) + _hyd_uniforms_.sprite_pos.x) * _hyd_uniforms_.screen_dims.x) + _hyd_uniforms_.screen_dims.z)")
    || !spriteOutputStoreOptimized.wgsl.includes("(((dot(tdir, pre_rot) + _hyd_uniforms_.sprite_pos.y) * _hyd_uniforms_.screen_dims.y) + _hyd_uniforms_.screen_dims.w)")) {
    throw new Error("expected Sprite-like position output to use a full scalarized field assignment");
}
if (!spriteOutputStoreOptimized.wgsl.includes("_hyd_output.v_Texcoord_1 = vec2f((((vposition_param.x) * _hyd_uniforms_.sprite_tex_transform.x) + _hyd_uniforms_.sprite_tex_transform.z), (((vposition_param.y) * _hyd_uniforms_.sprite_tex_transform.y) + _hyd_uniforms_.sprite_tex_transform.w));")) {
    throw new Error("expected Sprite-like texcoord vec2 affine expression to scalarize");
}
if (spriteOutputStoreOptimized.stats.foldedOutputStores < 2) {
    throw new Error(`expected Sprite-like output store cleanup, got ${spriteOutputStoreOptimized.stats.foldedOutputStores}`);
}

const singleFieldFragmentOutputWgsl = `
struct main_out {
  @location(0)
  x_hyd_fragColor_1 : vec4f,
}

@fragment
fn main(@location(0) v_Texcoord_param : vec2f) -> main_out {
  var _hyd_output: main_out;
  _hyd_output.x_hyd_fragColor_1 = textureSample(sprite_textureT, sprite_textureS, v_Texcoord_param);
  return _hyd_output;
}
`;
const singleFieldFragmentOutputOptimized = optimizeTintWgsl(singleFieldFragmentOutputWgsl);
if (!singleFieldFragmentOutputOptimized.wgsl.includes("fn main(@location(0) v_Texcoord_param : vec2f) -> @location(0) vec4f")) {
    throw new Error("expected single-field fragment output struct to collapse to direct location return");
}
if (!singleFieldFragmentOutputOptimized.wgsl.includes("return textureSample(sprite_textureT, sprite_textureS, v_Texcoord_param);")) {
    throw new Error("expected single-field fragment output to return texture sample directly");
}
if (singleFieldFragmentOutputOptimized.stats.collapsedOutputStructs !== 1) {
    throw new Error(`expected one collapsed output struct, got ${singleFieldFragmentOutputOptimized.stats.collapsedOutputStructs}`);
}

const multiReturnSingleFieldOutputWgsl = `
struct main_out {
  @location(0)
  value : f32,
}

@fragment
fn main(@location(0) condition : f32) -> main_out {
  if (condition > 0.0f) {
    return main_out(1.0f);
  }
  return main_out(2.0f);
}
`;
const multiReturnSingleFieldOutputOptimized = optimizeTintWgsl(multiReturnSingleFieldOutputWgsl);
if (!multiReturnSingleFieldOutputOptimized.wgsl.includes("-> main_out") ||
    multiReturnSingleFieldOutputOptimized.stats.collapsedOutputStructs !== 0) {
    throw new Error("expected a single-field output with multiple returns to stay uncollapsed");
}

const multiWriteOutputPrivateWgsl = `
var<private> a_pos : vec4f;
var<private> gl_Position : vec4f;

fn main_1() {
  gl_Position = a_pos;
  gl_Position = vec4f(gl_Position.xyz, 1.0f);
  return;
}

struct main_out {
  @builtin(position)
  gl_Position_1 : vec4f,
}

@vertex
fn main(@location(0) a_pos_param : vec4f) -> main_out {
  a_pos = a_pos_param;
  main_1();
  return main_out(gl_Position);
}
`;
const multiWriteOutputPrivateOptimized = optimizeTintWgsl(multiWriteOutputPrivateWgsl);
if (multiWriteOutputPrivateOptimized.wgsl.includes("var<private> gl_Position") || multiWriteOutputPrivateOptimized.wgsl.includes("fn main_1")) {
    throw new Error("expected multi-write output private wrapper to be lowered");
}
if (!multiWriteOutputPrivateOptimized.wgsl.includes("_hyd_output.gl_Position_1 = a_pos_param;")) {
    throw new Error("expected first output private write to target local output field");
}
if (!multiWriteOutputPrivateOptimized.wgsl.includes("_hyd_output.gl_Position_1 = vec4f(_hyd_output.gl_Position_1.xyz, 1.0f);")) {
    throw new Error("expected later output private reads/writes to use local output field");
}
if (multiWriteOutputPrivateOptimized.stats.loweredPrivateVars !== 2) {
    throw new Error(`expected 2 lowered private vars for multi-write output, got ${multiWriteOutputPrivateOptimized.stats.loweredPrivateVars}`);
}

const unsafePrivateEscapeWgsl = `
var<private> a_pos : vec4f;
var<private> v_color : vec4f;

fn helper() -> vec4f {
  return v_color;
}

fn main_1() {
  v_color = a_pos;
  return;
}

struct main_out {
  @location(0) v_color_1 : vec4f,
}

@vertex
fn main(@location(0) a_pos_param : vec4f) -> main_out {
  a_pos = a_pos_param;
  main_1();
  return main_out(v_color);
}
`;
const unsafeOptimized = optimizeTintWgsl(unsafePrivateEscapeWgsl);
if (!unsafeOptimized.wgsl.includes("var<private> v_color")) {
    throw new Error("expected escaped private var shader to stay unlowered");
}
if (!unsafeOptimized.stats.skippedPasses.some((reason) => reason.includes("private-io-escapes-wrapper"))) {
    throw new Error("expected escaped private var skip reason");
}

const sharedEntryHelperWgsl = `
var<private> input_value : f32;
var<private> output_value : f32;

fn main_1() {
  output_value = input_value;
}

fn other() {
  main_1();
}

struct main_out {
  @location(0)
  output_value_1 : f32,
}

@fragment
fn main(@location(0) input_value_param : f32) -> main_out {
  input_value = input_value_param;
  main_1();
  return main_out(output_value);
}
`;
const sharedEntryHelperOptimized = optimizeTintWgsl(sharedEntryHelperWgsl);
if (!sharedEntryHelperOptimized.wgsl.includes("fn main_1()") ||
    !sharedEntryHelperOptimized.wgsl.includes("fn other()")) {
    throw new Error("expected an entry helper with another callsite to stay intact");
}
if (!sharedEntryHelperOptimized.stats.skippedPasses.some((reason) => reason.includes("helper-has-other-callsites"))) {
    throw new Error("expected shared entry helper skip reason");
}

const pointerParamWgsl = `
fn lit_f1_f1_f1_(l : ptr<function, f32>, h : ptr<function, f32>, m : ptr<function, f32>) -> vec4f {
  var x_22 : f32;
  x_22 = select(0.0f, pow(max(0.0f, *(h)), *(m)), (*(l) > 0.0f));
  return vec4f(1.0f, max(*(l), 0.0f), x_22, 1.0f);
}

@fragment
fn main() -> @location(0) vec4f {
  var param : f32;
  var param_1 : f32;
  var param_2 : f32;
  var litR : vec4f;
  param = 1.0f;
  param_1 = 2.0f;
  param_2 = 3.0f;
  litR = lit_f1_f1_f1_(&(param), &(param_1), &(param_2));
  return litR;
}
`;
const pointerParamOptimized = optimizeTintWgsl(pointerParamWgsl);
if (pointerParamOptimized.wgsl.includes("ptr<function") || pointerParamOptimized.wgsl.includes("&(") || pointerParamOptimized.wgsl.includes("*(l)")) {
    throw new Error("expected readonly pointer params to lower to value params");
}
if (!pointerParamOptimized.wgsl.includes("fn lit_f1_f1_f1_(l : f32, h : f32, m : f32)")) {
    throw new Error("expected pointer helper signature to become value params");
}
if (!pointerParamOptimized.wgsl.includes("let param : f32 = 1.0f;")) {
    throw new Error("expected single-assignment locals to promote to let bindings");
}
if (pointerParamOptimized.stats.loweredPointerParams !== 3 || pointerParamOptimized.stats.promotedLocalVars < 4) {
    throw new Error(`unexpected pointer/local optimizer stats: ${JSON.stringify(pointerParamOptimized.stats)}`);
}

const motionMarkModWgsl = `
@vertex
fn main() -> @builtin(position) vec4f {
  var fade : f32;
  fade = ((_hyd_uniforms_.scalarOffset + ((_hyd_uniforms_.time * _hyd_uniforms_.scalar) / 10.0f)) - (1.0f * floor(((_hyd_uniforms_.scalarOffset + ((_hyd_uniforms_.time * _hyd_uniforms_.scalar) / 10.0f)) / 1.0f))));
  return vec4f(fade);
}
`;
const motionMarkModOptimized = optimizeTintWgsl(motionMarkModWgsl);
if (!motionMarkModOptimized.wgsl.includes("fract(")) {
    throw new Error("expected mod(x, 1.0) expansion to fold to fract(x)");
}
if (motionMarkModOptimized.wgsl.includes("floor(")) {
    throw new Error("expected folded mod(x, 1.0) to remove floor");
}
if (motionMarkModOptimized.stats.foldedModByOne !== 1) {
    throw new Error(`expected one mod-by-one fold, got ${motionMarkModOptimized.stats.foldedModByOne}`);
}

const lazyPowSelectWgsl = `
fn lit(l : f32, h : f32, m : f32) -> vec4f {
  return vec4f(1.0f, max(l, 0.0f), select(0.0f, pow(max(0.0f, h), m), (l > 0.0f)), 1.0f);
}

fn keep_sampler_origin_select(texCoord : vec2f, flipY : f32) -> vec2f {
  return vec2f(texCoord.x, select(texCoord.y, 1.0f - texCoord.y, flipY > 0.5f));
}
`;
const lazyPowSelectOptimized = optimizeTintWgsl(lazyPowSelectWgsl);
if (!lazyPowSelectOptimized.wgsl.includes("var _hyd_lazy_pow_select_0 : f32 = 0.0f;")) {
    throw new Error("expected pow select to lower to a lazy local");
}
if (!lazyPowSelectOptimized.wgsl.includes("if ((l > 0.0f))")) {
    throw new Error("expected pow select condition to become a branch");
}
if (!lazyPowSelectOptimized.wgsl.includes("_hyd_lazy_pow_select_0 = pow(max(0.0f, h), m);")) {
    throw new Error("expected pow arm to be evaluated inside the branch");
}
if (!lazyPowSelectOptimized.wgsl.includes("select(texCoord.y, 1.0f - texCoord.y, flipY > 0.5f)")) {
    throw new Error("expected non-pow sampler-origin select to stay unchanged");
}
if (lazyPowSelectOptimized.stats.branchifiedSelects !== 1) {
    throw new Error(`expected one lazy pow select branchification, got ${lazyPowSelectOptimized.stats.branchifiedSelects}`);
}

const mutableScalarAliasWgsl = `
@fragment
fn main() -> @location(0) f32 {
  var value : f32 = 1.0f;
  let x_90 : f32 = value;
  value = 2.0f;
  return x_90;
}
`;
const mutableScalarAliasOptimized = optimizeTintWgsl(mutableScalarAliasWgsl);
if (!mutableScalarAliasOptimized.wgsl.includes("let x_90 : f32 = value;") ||
    !mutableScalarAliasOptimized.wgsl.includes("return x_90;")) {
    throw new Error("expected alias of a subsequently written scalar to be preserved");
}

const selfReferentialAssignmentWgsl = `
fn main() -> i32 {
  var t : i32;
  t = (select(0i, 1i, t == t) * 32768i);
  return t;
}
`;
const selfReferentialAssignmentOptimized = optimizeTintWgsl(selfReferentialAssignmentWgsl);
if (!selfReferentialAssignmentOptimized.wgsl.includes("var t : i32;") ||
    !selfReferentialAssignmentOptimized.wgsl.includes("t = (select")) {
    throw new Error("self-referential assignment must not be promoted to let");
}

const mutableFieldAliasWgsl = `
struct Payload {
  value : f32,
}

@fragment
fn main() -> @location(0) f32 {
  var payload : Payload;
  payload.value = 1.0f;
  let x_91 : f32 = payload.value;
  payload.value = 2.0f;
  return x_91;
}
`;
const mutableFieldAliasOptimized = optimizeTintWgsl(mutableFieldAliasWgsl);
if (!mutableFieldAliasOptimized.wgsl.includes("let x_91 : f32 = payload.value;") ||
    !mutableFieldAliasOptimized.wgsl.includes("return x_91;")) {
    throw new Error("expected alias of a subsequently written struct field to be preserved");
}

const escapedAliasSourceWgsl = `
fn mutate(value : ptr<function, f32>) {
  *(value) = 2.0f;
}

@fragment
fn main() -> @location(0) f32 {
  var value : f32 = 1.0f;
  let x_92 : f32 = value;
  mutate(&(value));
  return x_92;
}
`;
const escapedAliasSourceOptimized = optimizeTintWgsl(escapedAliasSourceWgsl);
if (!escapedAliasSourceOptimized.wgsl.includes("let x_92 : f32 = value;") ||
    !escapedAliasSourceOptimized.wgsl.includes("return x_92;")) {
    throw new Error("expected alias of an address-taken value to be preserved");
}

const directScalarFragmentOutput = normalizeWebGlFragmentOutputWidths(`
@fragment
fn main() -> @location(0) f32 {
  return 0.5f;
}
`);
if (directScalarFragmentOutput.expanded !== 1 ||
    !directScalarFragmentOutput.wgsl.includes("-> @location(0) vec4f") ||
    !directScalarFragmentOutput.wgsl.includes("return vec4f(0.5f, 0.0f, 0.0f, 1.0f);")) {
    throw new Error(`unexpected direct fragment output expansion: ${directScalarFragmentOutput.wgsl}`);
}

const structFragmentOutput = normalizeWebGlFragmentOutputWidths(`
struct FragmentOutput {
  @location(0)
  first : vec2i,
  @location(1)
  second : vec3u,
  @builtin(frag_depth)
  depth : f32,
}

@fragment
fn main() -> FragmentOutput {
  var output : FragmentOutput;
  output.first = vec2i(1i, 2i);
  output.second = vec3u(3u, 4u, 5u);
  output.depth = 0.5f;
  return output;
}
`);
if (structFragmentOutput.expanded !== 2 ||
    !structFragmentOutput.wgsl.includes("first : vec4i") ||
    !structFragmentOutput.wgsl.includes("second : vec4u") ||
    !structFragmentOutput.wgsl.includes("output.first = vec4i(vec2i(1i, 2i), 0i, 1i);") ||
    !structFragmentOutput.wgsl.includes("output.second = vec4u(vec3u(3u, 4u, 5u), 1u);") ||
    !structFragmentOutput.wgsl.includes("depth : f32")) {
    throw new Error(`unexpected struct fragment output expansion: ${structFragmentOutput.wgsl}`);
}

const constructorFragmentOutput = normalizeWebGlFragmentOutputWidths(`
struct FragmentOutput {
  @location(0) color : vec2f,
}

@fragment
fn main() -> FragmentOutput {
  return FragmentOutput(vec2f(0.25f, 0.75f));
}
`);
if (constructorFragmentOutput.expanded !== 1 ||
    !constructorFragmentOutput.wgsl.includes("color : vec4f") ||
    !constructorFragmentOutput.wgsl.includes("return FragmentOutput(vec4f(vec2f(0.25f, 0.75f), 0.0f, 1.0f));")) {
    throw new Error(`unexpected constructor fragment output expansion: ${constructorFragmentOutput.wgsl}`);
}

const fullWidthFragmentOutputSource = `
@fragment
fn main() -> @location(0) vec4f {
  return vec4f(1.0f);
}
`;
const fullWidthFragmentOutput = normalizeWebGlFragmentOutputWidths(fullWidthFragmentOutputSource);
if (fullWidthFragmentOutput.expanded !== 0 || fullWidthFragmentOutput.wgsl !== fullWidthFragmentOutputSource) {
    throw new Error("expected full-width fragment output to remain unchanged");
}

const repeatedAliasWgsl = `
@fragment
fn main(@location(0) value : f32) -> @location(0) f32 {
  let x_93 : f32 = value;
  return x_93 + x_93;
}
`;
const repeatedAliasOptimized = optimizeTintWgsl(repeatedAliasWgsl);
if (repeatedAliasOptimized.wgsl.includes("let x_93 : f32 = value;") ||
    !repeatedAliasOptimized.wgsl.includes("return value + value;")) {
    throw new Error("expected a repeated alias of an immutable parameter to fold safely");
}

const reservedWgslNames = renameReservedWgslIdentifiers(`
struct Output {
  pass: f32,
  var: f32,
}
var value: Output;
fn test(pass: f32) -> Output {
  let target = pass;
  let member = value.var;
  return Output(target, member);
}
`);
if (/\b(?:pass|target)\b/.test(reservedWgslNames) ||
    !reservedWgslNames.includes("pass_: f32") ||
    !reservedWgslNames.includes("let target_ = pass_") ||
    !reservedWgslNames.includes("var_: f32") ||
    !reservedWgslNames.includes("value.var_") ||
    !reservedWgslNames.includes("var value: Output")) {
    throw new Error("expected Dawn WGSL reserved identifiers to be renamed consistently");
}

const deepTerms = Array.from({ length: 96 }, (_, index) => `value${index}`);
const deepLeftAssociated = deepTerms.slice(1).reduce((left, right) => `(${left} + ${right})`, deepTerms[0]);
const splitDeepExpression = splitDeepAssociativeExpressions(`fn test() {\n  let sum : f32 = ${deepLeftAssociated};\n}`);
if (splitDeepExpression.split < 1 || !splitDeepExpression.wgsl.includes("let _hyd_add_chain_0 =")) {
    throw new Error("expected a deep left-associative expression to be split into ordered chunks");
}
const flattenedDeepTerms = splitDeepExpression.wgsl.match(/value\d+/g) || [];
deepEqual(flattenedDeepTerms, deepTerms);

const trickyEmptyMacro = `#define m(a)
#define a m((a)
a)

void main() {
  float a = 1.0;
}
`;
const strippedEmptyMacro = stripProvablyEmptyTopLevelMacroInvocations(trickyEmptyMacro);
if (/^a\)$/m.test(strippedEmptyMacro) || !strippedEmptyMacro.includes("float a = 1.0;")) {
    throw new Error("expected only the provably empty top-level macro invocation to be stripped");
}

const normalizedBuiltins = normalizeWebGl1BuiltinLimits(
    "int values[gl_MaxVertexAttribs]; bool ok = gl_MaxVaryingVectors == 32;",
);
if (normalizedBuiltins !== "int values[16]; bool ok = 32 == 32;") {
    throw new Error(`unexpected WebGL 1 GLSL builtin limits: ${normalizedBuiltins}`);
}

const normalizedWebGl2Builtins = normalizeWebGl2BuiltinLimits(
    "bool attributes = gl_MaxVertexAttribs == 16; bool draws = gl_MaxDrawBuffers == 4; " +
    "bool io = gl_MaxVertexOutputVectors == 16 && gl_MaxFragmentInputVectors == 32;",
);
if (normalizedWebGl2Builtins !== "bool attributes = 16 == 16; bool draws = 4 == 4; " +
    "bool io = 16 == 16 && 32 == 32;") {
    throw new Error(`unexpected WebGL 2 GLSL builtin limits: ${normalizedWebGl2Builtins}`);
}

const loweredHyperbolicBuiltins = lowerUnsupportedFloatBuiltins(`
float scalar(float value) { return asinh(value) + acosh(value + 1.0) + atanh(value * 0.5); }
vec4 vector(vec4 value) { return asinh(value) + acosh(value + 1.0) + atanh(value * 0.5); }
`);
for (const builtin of ["asinh", "acosh", "atanh"]) {
    if (new RegExp(`\\b${builtin}\\s*\\(`).test(loweredHyperbolicBuiltins) ||
        !loweredHyperbolicBuiltins.includes(`float _hyd_${builtin}(float value)`) ||
        !loweredHyperbolicBuiltins.includes(`vec4 _hyd_${builtin}(vec4 value)`)) {
        throw new Error(`expected ${builtin} to lower to scalar and vector compatibility helpers`);
    }
}

const loweredNanBuiltins = lowerUnsupportedFloatBuiltins(`
bool scalar(float value) { return isnan(value); }
bvec4 vector(vec4 value) { return isnan(value); }
`);
if (loweredNanBuiltins.includes("value != value") ||
    !loweredNanBuiltins.includes("floatBitsToUint(value) & 0x7fffffffu") ||
    !loweredNanBuiltins.includes("greaterThan(bits, uvec4(0x7f800000u))")) {
    throw new Error("expected isnan to use fast-math-safe IEEE-754 bit classification");
}

const normalizedDerivatives = normalizeWebGlDerivativeOrientation(`
float scalar(float value) { return dFdy(value); }
vec4 vector(vec4 value) { return dFdy(value); }
float horizontal(float value) { return dFdx(value); }
`);
if (!normalizedDerivatives.includes("float _hyd_dFdy(float value) { return -dFdy(value); }") ||
    !normalizedDerivatives.includes("vec4 _hyd_dFdy(vec4 value) { return -dFdy(value); }") ||
    !normalizedDerivatives.includes("return _hyd_dFdy(value);") ||
    !normalizedDerivatives.includes("return dFdx(value);")) {
    throw new Error("expected WebGL dFdy orientation normalization without changing dFdx");
}

const clipSpaceWrapped = wrapVertexMainForWebGpuClipSpace(`
void main() {
  if (enabled) return;
  gl_Position = position;
}
`);
if (!clipSpaceWrapped.includes("void _hyd_webgl_vertex_main()") ||
    !clipSpaceWrapped.includes("_hyd_webgl_vertex_main();") ||
    !clipSpaceWrapped.includes("gl_Position.z = (gl_Position.z + gl_Position.w) * 0.5;")) {
    throw new Error("expected WebGL clip-space depth remapping to wrap the vertex entrypoint");
}

const conditionalAssignmentWgsl = `
@fragment
fn main(@location(0) condition : f32) -> @location(0) f32 {
  var value : f32;
  if (condition > 0.0f) {
    value = 1.0f;
  }
  return value;
}
`;
const conditionalAssignmentOptimized = optimizeTintWgsl(conditionalAssignmentWgsl);
if (!conditionalAssignmentOptimized.wgsl.includes("var value : f32;") ||
    conditionalAssignmentOptimized.wgsl.includes("let value : f32 = 1.0f;")) {
    throw new Error("expected a conditionally assigned var to stay in its dominating scope");
}

const loopAssignmentWgsl = `
@fragment
fn main() -> @location(0) f32 {
  var value : f32;
  loop {
    value = 1.0f;
    break;
  }
  return value;
}
`;
const loopAssignmentOptimized = optimizeTintWgsl(loopAssignmentWgsl);
if (!loopAssignmentOptimized.wgsl.includes("var value : f32;") ||
    loopAssignmentOptimized.wgsl.includes("let value : f32 = 1.0f;")) {
    throw new Error("expected a loop-assigned var to stay in its dominating scope");
}

const shapeStats = computeShaderShapeStats(`
var<private> texCoord : vec2<f32>;
@fragment
fn main() -> @location(0) vec4<f32> {
  let x_1 = vec4<f32>(texCoord.x, texCoord.y, 0.0, 1.0);
  if (x_1.x > 0.0) {
    return textureSampleLevel(diffuseT, diffuseS, texCoord, select(0.0, 1.0, texCoord.y > 0.5));
  }
  return textureSample(diffuseT, diffuseS, texCoord);
}
`);
if (shapeStats.varPrivate !== 1 || shapeStats.tempLets !== 1 || shapeStats.textureSampleLevel !== 1 || shapeStats.textureSample !== 1 || shapeStats.selects !== 1) {
    throw new Error(`unexpected WGSL shape stats: ${JSON.stringify(shapeStats)}`);
}

const splatPrecomputeSource = `
struct HydUniforms {
  renderSize : vec2<f32>,
  focalAdjustment : vec2<f32>,
  minAlpha : f32,
  falloff : f32,
}
struct VertexOutput {
  @builtin(position) position : vec4<f32>,
}
@group(0) @binding(0) var<uniform> _hyd_uniforms_ : HydUniforms;
var<private> gl_Position : vec4<f32>;
var<private> adjustedStdDev : f32;
var<private> vRgba : vec4<f32>;
var<private> vSplatUv : vec2<f32>;
var<private> vSplatIndex : u32;
var<private> vNdc : vec3<f32>;
var<private> vFragDepth : f32;
var<private> vIsPerspective : f32;
fn v_2(gl_InstanceIndex : i32, position : vec3<f32>) {
  let orderingCoord : vec2<i32> = vec2i(gl_InstanceIndex, 0);
  let splatIndex : u32 = u32(orderingCoord.x);
  let clipCenter : vec4<f32> = vec4f(position, 1.0f);
  let eigenVec1 : vec2<f32> = vec2f(1.0f, 0.0f);
  let eigenVec2 : vec2<f32> = vec2f(0.0f, 1.0f);
  let scale1 : f32 = 1.0f;
  let scale2 : f32 = 1.0f;
  adjustedStdDev = 1.0f;
  vRgba = vec4f(1.0f);
  let scaledRenderSize = _hyd_uniforms_.renderSize * _hyd_uniforms_.focalAdjustment;
  let pixelOffset : vec2<f32> = (eigenVec1 * scale1 + eigenVec2 * scale2) / scaledRenderSize;
  gl_Position = clipCenter + vec4f(pixelOffset, 0.0f, 0.0f);
  vSplatIndex = splatIndex;
}
@vertex fn main(
  @builtin(instance_index) instance : u32,
  @location(0u) position : vec3<f32>,
) -> VertexOutput {
  v_2(i32(instance), position);
  gl_Position.z = (gl_Position.z + gl_Position.w) * 0.5f;
  return VertexOutput(gl_Position);
}
`;
const splatPrecompute = buildSplatVertexPrecomputeSources(splatPrecomputeSource);
if (!splatPrecompute ||
    !splatPrecompute.computeWgsl.includes("@compute @workgroup_size(256)") ||
    !splatPrecompute.computeWgsl.includes("v_2(i32(index), vec3f(0.0f))") ||
    !splatPrecompute.computeWgsl.includes("_hyd_pre_adjusted[hyd_pre_index]") ||
    !splatPrecompute.renderWgsl.includes("@location(8u) hyd_pre_clip_input") ||
    !splatPrecompute.renderWgsl.includes("@location(11u) hyd_pre_adjusted_input") ||
    splatPrecompute.renderWgsl.includes("var<storage")) {
    throw new Error("expected Spark splat WGSL to split into compute and lightweight vertex stages");
}
if (buildSplatVertexPrecomputeSources("@vertex fn main() {}") !== null) {
    throw new Error("expected unrelated WGSL to skip splat vertex precomputation");
}

console.log("shader metadata tests passed");
