import { deepEqual, equal, notEqual } from "node:assert/strict";

(globalThis as any).WebGL2RenderingContext = {
    LINEAR: 0x2601,
    NEAREST: 0x2600,
    REPEAT: 0x2901,
    CLAMP_TO_EDGE: 0x812F,
    MIRRORED_REPEAT: 0x8370,
    LINEAR_MIPMAP_LINEAR: 0x2703,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    TEXTURE_WRAP_R: 0x8072,
    TEXTURE_BASE_LEVEL: 0x813C,
    TEXTURE_MAX_LEVEL: 0x813D,
    TEXTURE_MIN_LOD: 0x813A,
    TEXTURE_MAX_LOD: 0x813B,
    TEXTURE_COMPARE_MODE: 0x884C,
    TEXTURE_COMPARE_FUNC: 0x884D,
    NO_ERROR: 0,
    INVALID_ENUM: 0x0500,
    INVALID_VALUE: 0x0501,
    INVALID_OPERATION: 0x0502,
    ZERO: 0,
    ONE: 1,
    LESS: 0x0201,
    ALWAYS: 0x0207,
    KEEP: 0x1E00,
    FUNC_ADD: 0x8006,
    CCW: 0x0901,
    DONT_CARE: 0x1100,
    COLOR_BUFFER_BIT: 0x4000,
    DEPTH_BUFFER_BIT: 0x0100,
    STENCIL_BUFFER_BIT: 0x0400,
    BACK: 0x0405,
    COLOR_ATTACHMENT0: 0x8CE0,
    COLOR_ATTACHMENT15: 0x8CEF,
    POINTS: 0x0000,
    LINES: 0x0001,
    LINE_LOOP: 0x0002,
    LINE_STRIP: 0x0003,
    TRIANGLES: 0x0004,
    TRIANGLE_STRIP: 0x0005,
    TRIANGLE_FAN: 0x0006,
    DEPTH_ATTACHMENT: 0x8D00,
    STENCIL_ATTACHMENT: 0x8D20,
    DEPTH_STENCIL_ATTACHMENT: 0x821A,
    RGBA4: 0x8056,
    FLOAT_MAT2: 0x8B5A,
    FLOAT_MAT3: 0x8B5B,
    FLOAT_MAT4: 0x8B5C,
    BROWSER_DEFAULT_WEBGL: 0x9244,
    VERTEX_SHADER: 0x8B31,
    FRAGMENT_SHADER: 0x8B30,
};
(globalThis as any).WebGLRenderingContext = (globalThis as any).WebGL2RenderingContext;
(globalThis as any).WebGLShader = class WebGLShader {};
(globalThis as any).window = globalThis;
(globalThis as any).GPUTextureUsage = {
    COPY_DST: 1,
    COPY_SRC: 2,
    TEXTURE_BINDING: 4,
    RENDER_ATTACHMENT: 8,
};
(globalThis as any).GPUBufferUsage = {
    COPY_DST: 1,
};
(globalThis as any).GPUColorWrite = {
    RED: 1,
    GREEN: 2,
    BLUE: 4,
    ALPHA: 8,
};

const {
    FramebufferAttributes,
    webGlReadPixelsCopyLayout,
} = require("../../src/components/hydFramebuffer") as typeof import("../../src/components/hydFramebuffer");
const {
    HydTexture,
    resolveWebGlTextureMipRange,
} = require("../../src/components/hydTexture") as typeof import("../../src/components/hydTexture");
const { resolveWebGpuSamplerLodClamps } = require("../../src/components/hydSampler") as typeof import("../../src/components/hydSampler");
const {
    HydBuffer,
    lowerFixedRestartIndices,
    physicalWebGlBufferSize,
} = require("../../src/components/hydBuffer") as typeof import("../../src/components/hydBuffer");

deepEqual(resolveWebGpuSamplerLodClamps(-1000, 1000), {
    lodMinClamp: 0,
    lodMaxClamp: 1000,
});
deepEqual(resolveWebGpuSamplerLodClamps(-1000, -999), {
    lodMinClamp: 0,
    lodMaxClamp: 0,
});
deepEqual(resolveWebGpuSamplerLodClamps(100, 1000), {
    lodMinClamp: 100,
    lodMaxClamp: 1000,
});
deepEqual(webGlReadPixelsCopyLayout(2048, 0, 2048), {
    sourceY: 0,
    reverseRows: true,
});
deepEqual(webGlReadPixelsCopyLayout(2048, 0, 802), {
    sourceY: 1246,
    reverseRows: true,
});
deepEqual(webGlReadPixelsCopyLayout(2048, 100, 200), {
    sourceY: 1748,
    reverseRows: true,
});
const { HydFramebuffer } = require("../../src/components/hydFramebuffer") as typeof import("../../src/components/hydFramebuffer");
const { HydGlobalStateHashed } = require("../../src/components/hydGlobalState") as typeof import("../../src/components/hydGlobalState");
const {
    HydProgram,
    ProgramUniformBlock,
    specializeSamplerOriginWgsl,
} = require("../../src/components/hydProgram") as typeof import("../../src/components/hydProgram");
const {
    ShaderInfo2HydAus,
    samplerOriginCoordinateDimension,
} = require("../../src/components/shaderDB") as typeof import("../../src/components/shaderDB");
const {
    resolveSamplerCoordinateScale,
} = require("../../src/components/shaderSamplerState") as typeof import("../../src/components/shaderSamplerState");
const { HydShader } = require("../../src/components/hydShader") as typeof import("../../src/components/hydShader");
const { HydVertexArray } = require("../../src/components/hydVertexArray") as typeof import("../../src/components/hydVertexArray");
const {
    transformFeedbackOutputVertexCount,
} = require("../../src/components/hydTransformFeedback") as typeof import("../../src/components/hydTransformFeedback");

const renderbuffer = new HydTexture({} as GPUDevice);
equal(renderbuffer.renderbufferInternalFormat, WebGL2RenderingContext.RGBA4);
renderbuffer.renderbufferStorage("depth16unorm", 32, 64);
const attachment = new FramebufferAttributes(0x8D00, 0, undefined, renderbuffer);
equal(attachment.format, "depth16unorm");
equal(attachment.width, 32);
equal(attachment.height, 64);

const texture = new HydTexture({} as GPUDevice);
const before = texture.hash;
texture.texParameteri(WebGL2RenderingContext.TEXTURE_MIN_FILTER, WebGL2RenderingContext.LINEAR);
notEqual(texture.hash, before);
equal(texture.sourceOrigin, "uninitialized");
equal(texture.markFramebufferRenderTarget(), true);
equal(texture.sourceOrigin, "render-target");
equal(texture.markFramebufferRenderTarget(), false);

deepEqual(
    resolveWebGlTextureMipRange(3, 10000, 3, 2, 2, 1, true, false),
    { baseLevel: 2, maxLevel: 2, q: 2, sampledLastLevel: 2 },
);
deepEqual(
    resolveWebGlTextureMipRange(1, 0, 3, 5, 5, 1, true, false),
    { baseLevel: 1, maxLevel: 1, q: 1, sampledLastLevel: 1 },
);
deepEqual(
    resolveWebGlTextureMipRange(2, 1, 0, 2, 2, 1, true, false),
    { baseLevel: 2, maxLevel: 1, q: 1, sampledLastLevel: 1 },
);
deepEqual(resolveSamplerCoordinateScale(51, 51, 52, 52), [51 / 52, 51 / 52]);
deepEqual(resolveSamplerCoordinateScale(64, 64, 64, 64), [1, 1]);
deepEqual(resolveSamplerCoordinateScale(0, 0, 52, 52), [1, 1]);
equal(transformFeedbackOutputVertexCount(WebGL2RenderingContext.POINTS, 13), 13);
equal(transformFeedbackOutputVertexCount(WebGL2RenderingContext.LINES, 13), 12);
equal(transformFeedbackOutputVertexCount(WebGL2RenderingContext.LINE_STRIP, 5), 8);
equal(transformFeedbackOutputVertexCount(WebGL2RenderingContext.LINE_LOOP, 5), 10);
equal(transformFeedbackOutputVertexCount(WebGL2RenderingContext.TRIANGLES, 64), 63);
equal(transformFeedbackOutputVertexCount(WebGL2RenderingContext.TRIANGLE_STRIP, 5), 9);
equal(transformFeedbackOutputVertexCount(WebGL2RenderingContext.TRIANGLE_FAN, 5), 9);

const paddedTexture = new HydTexture({} as GPUDevice);
(paddedTexture as any)._textureDescriptor.size = {
    width: 52,
    height: 52,
    depthOrArrayLayers: 6,
};
(paddedTexture as any).imageStates.set("0:0", {
    level: 0,
    layer: 0,
    width: 51,
    height: 51,
    depth: 1,
    internalFormat: 0,
    format: 0,
    type: 0,
    sourceOrigin: "typed-upload",
    generation: 1,
});
deepEqual(paddedTexture.getSamplingCoordinateScale("cube", 2), [51 / 52, 51 / 52]);

equal(samplerOriginCoordinateDimension("sampler2DArray"), 2);
equal(samplerOriginCoordinateDimension("sampler3D"), 3);
equal(samplerOriginCoordinateDimension("samplerCube"), null);
const sampler3dDynamic = `
fn _hyd_samplerOriginCoord3(texCoord: vec3<f32>, flipY: f32) -> vec3<f32> {
  return vec3<f32>(texCoord.x, select(texCoord.y, 1.0 - texCoord.y, flipY > 0.5), texCoord.z);
}
fn sample(coord: vec3f) -> vec4f {
  return textureSample(volumeT, volumeS,
    _hyd_samplerOriginCoord3(coord, _hyd_uniforms_._hyd_samplerFlipY_volume));
}`;
const sampler3dStatic = specializeSamplerOriginWgsl(sampler3dDynamic, new Map([["volume", true]]));
if (!sampler3dStatic.includes("fn _hyd_samplerOriginCoordFlip3") ||
    !sampler3dStatic.includes("vec3<f32>(texCoord.x, 1.0 - texCoord.y, texCoord.z)") ||
    sampler3dStatic.includes("_hyd_samplerFlipY_volume")) {
    throw new Error(`expected static sampler3D Y-only origin specialization:\n${sampler3dStatic}`);
}
const texelLoadDynamic = `
fn load(coord: vec2i, level: i32) -> vec4u {
  return _hyd_webgl_robust_load_2d_u32(
    pixelsT, coord, level, _hyd_uniforms_._hyd_samplerFlipY_pixels);
}`;
const texelLoadFlipped = specializeSamplerOriginWgsl(texelLoadDynamic, new Map([["pixels", true]]));
const texelLoadUnflipped = specializeSamplerOriginWgsl(texelLoadDynamic, new Map([["pixels", false]]));
if (!texelLoadFlipped.includes("pixelsT, coord, level, 1.0f") ||
    !texelLoadUnflipped.includes("pixelsT, coord, level, 0.0f") ||
    texelLoadFlipped.includes("_hyd_samplerFlipY_pixels") ||
    texelLoadUnflipped.includes("_hyd_samplerFlipY_pixels")) {
    throw new Error(
        `expected static texel-load origin specialization:\n${texelLoadFlipped}\n${texelLoadUnflipped}`,
    );
}
const prefixedTexelLoads = specializeSamplerOriginWgsl(`
fn loadBoth(coord: vec2i, level: i32) -> vec4u {
  return _hyd_webgl_robust_load_2d_u32(
    pixelsT, coord, level, _hyd_uniforms_._hyd_samplerFlipY_pixels) +
    _hyd_webgl_robust_load_2d_u32(
      pixels2T, coord, level, _hyd_uniforms_._hyd_samplerFlipY_pixels2);
}`, new Map([["pixels", false], ["pixels2", true]]));
if (!prefixedTexelLoads.includes("pixelsT, coord, level, 0.0f") ||
    !prefixedTexelLoads.includes("pixels2T, coord, level, 1.0f") ||
    /(?:_hyd_samplerFlipY_|[01]\.0f2)/.test(prefixedTexelLoads)) {
    throw new Error(`sampler-origin specialization must respect identifier boundaries:\n${prefixedTexelLoads}`);
}
const samplerCubeDynamic = `
fn _hyd_samplerCubeCoordScale(direction: vec3<f32>, scale: vec2<f32>) -> vec3<f32> {
  return direction;
}
fn _hyd_samplerOriginCubeCoord(direction: vec3<f32>, flipY: f32, scale: vec2<f32>) -> vec3<f32> {
  return _hyd_samplerCubeCoordScale(direction, scale);
}
fn sample(coord: vec3f) -> vec4f {
  return textureSample(cubeT, cubeS, _hyd_samplerOriginCubeCoord(
    coord,
    _hyd_uniforms_._hyd_samplerFlipY_cube,
    vec2<f32>(hydgl2gpu_sampler_scale_x_cube, hydgl2gpu_sampler_scale_y_cube)));
}`;
const samplerCubeStatic = specializeSamplerOriginWgsl(samplerCubeDynamic, new Map([["cube", true]]));
if (!samplerCubeStatic.includes("fn _hyd_samplerOriginCubeCoordFlip") ||
    !samplerCubeStatic.includes("_hyd_samplerCubeCoordScale(_hyd_samplerOriginCubeCoordFlip(coord), vec2<f32>(hydgl2gpu_sampler_scale_x_cube, hydgl2gpu_sampler_scale_y_cube))") ||
    samplerCubeStatic.includes("_hyd_samplerFlipY_cube")) {
    throw new Error(`expected static cube origin specialization to retain logical coordinate scale:\n${samplerCubeStatic}`);
}

const errorState = new HydGlobalStateHashed({} as WebGLContextAttributes, {} as GPUBuffer, {} as GPUDevice);
equal(errorState.depthState.funcEnum, WebGL2RenderingContext.LESS);
equal(errorState.polygonState.cullFaceModeEnum, WebGL2RenderingContext.BACK);
equal(errorState.polygonState.frontFaceEnum, WebGL2RenderingContext.CCW);
equal(errorState.blendState.srcRGBEnum, WebGL2RenderingContext.ONE);
equal(errorState.blendState.dstRGBEnum, WebGL2RenderingContext.ZERO);
equal(errorState.blendState.equationRGBEnum, WebGL2RenderingContext.FUNC_ADD);
equal(errorState.stencilState.frontFuncEnum, WebGL2RenderingContext.ALWAYS);
equal(errorState.stencilState.frontFailEnum, WebGL2RenderingContext.KEEP);
equal(errorState.miscState.dither, true);
equal(errorState.miscState.sampleCoverageValue, 1);
equal(errorState.miscState.generateMipmapHint, WebGL2RenderingContext.DONT_CARE);
deepEqual(errorState.depthState.range, [0, 1]);

const squareMatrixAliases = ShaderInfo2HydAus({
    attributes: [
        { name: "m2", glsl_type: "mat2x2", wgsl_type: "mat2x2<f32>" },
        { name: "m3", glsl_type: "mat3x3", wgsl_type: "mat3x3<f32>" },
        { name: "m4", glsl_type: "mat4x4", wgsl_type: "mat4x4<f32>" },
    ],
    uniforms: [],
    samplers: [],
}).attributes;
deepEqual(squareMatrixAliases.map(({ type, locationSpan }) => [type, locationSpan]), [
    [WebGL2RenderingContext.FLOAT_MAT2, 2],
    [WebGL2RenderingContext.FLOAT_MAT3, 3],
    [WebGL2RenderingContext.FLOAT_MAT4, 4],
]);

deepEqual(
    Array.from(lowerFixedRestartIndices(
        WebGL2RenderingContext.LINES,
        [0, 0xff, 1, 2, 0xff, 3, 4, 5, 0xff, 0xff, 6, 7],
        0xff,
    )),
    [1, 2, 3, 4, 6, 7],
);
deepEqual(
    Array.from(lowerFixedRestartIndices(
        WebGL2RenderingContext.TRIANGLES,
        [0xff, 0xff, 1, 2, 3, 4, 0xff, 5, 6, 7, 8, 0xff],
        0xff,
    )),
    [1, 2, 3, 5, 6, 7],
);

const depthStencilFramebuffer = new HydFramebuffer();
depthStencilFramebuffer.drawBuffers = [];
const sharedDepthStencilAttachment = {
    view: {} as GPUTextureView,
    format: "depth24plus-stencil8" as GPUTextureFormat,
    sampleCount: 1,
};
depthStencilFramebuffer.attachments.set(
    WebGL2RenderingContext.DEPTH_ATTACHMENT,
    sharedDepthStencilAttachment as any,
);
depthStencilFramebuffer.attachments.set(
    WebGL2RenderingContext.STENCIL_ATTACHMENT,
    sharedDepthStencilAttachment as any,
);
errorState.commonState.drawFramebufferBinding = depthStencilFramebuffer;
errorState.commonState.currentProgram = {
    hash: "stencil-state-test",
    fragmentOutputLocations: new Map(),
    vertexModule: {} as GPUShaderModule,
    fragmentModule: {} as GPUShaderModule,
    booleanUniformPipelineConstants: () => ({ constants: {}, key: "" }),
} as any;
errorState.depthState.enabled = true;
errorState.topology = "triangle-list";
errorState.stencilState.frontFunc = "equal";
errorState.stencilState.backFunc = "equal";
errorState.stencilState.enabled = false;
let stencilPipeline = errorState.getPipelineDescriptor("triangle-list", [])[1];
equal(stencilPipeline.depthStencil?.stencilFront?.compare, "always");
equal(stencilPipeline.depthStencil?.stencilFront?.passOp, "keep");
equal(stencilPipeline.depthStencil?.stencilBack?.compare, "always");
equal(stencilPipeline.depthStencil?.stencilWriteMask, 0);
errorState.stencilState.enabled = true;
stencilPipeline = errorState.getPipelineDescriptor("triangle-list", [])[1];
equal(stencilPipeline.depthStencil?.stencilFront?.compare, "equal");
equal(stencilPipeline.depthStencil?.stencilBack?.compare, "equal");

const multisampleFramebuffer = new HydFramebuffer();
multisampleFramebuffer.drawBuffers = [WebGL2RenderingContext.COLOR_ATTACHMENT0];
multisampleFramebuffer.attachments.set(WebGL2RenderingContext.COLOR_ATTACHMENT0, {
    view: {} as GPUTextureView,
    format: "rgba8unorm" as GPUTextureFormat,
    sampleCount: 4,
    colorBits: [8, 8, 8, 8],
} as any);
errorState.commonState.drawFramebufferBinding = multisampleFramebuffer;
errorState.commonState.currentProgram.fragmentOutputLocations = new Map([["color", 0]]);
equal(errorState.getFramebufferSampleCount(), 4);
errorState.miscState.sampleCoverage = true;
errorState.miscState.sampleCoverageValue = 0.5;
errorState.miscState.sampleCoverageInvert = false;
let [coveragePipelineKey, coveragePipeline] = errorState.getPipelineDescriptor("triangle-list", []);
equal(coveragePipeline.multisample?.count, 4);
equal(coveragePipeline.multisample?.mask, 0b0011);
errorState.miscState.sampleCoverageInvert = true;
let [invertedCoveragePipelineKey, invertedCoveragePipeline] = errorState.getPipelineDescriptor("triangle-list", []);
equal(invertedCoveragePipeline.multisample?.mask, 0b1100);
notEqual(invertedCoveragePipelineKey, coveragePipelineKey);
errorState.miscState.sampleCoverageInvert = false;
errorState.miscState.sampleCoverageValue = 0;
equal(errorState.getPipelineDescriptor("triangle-list", [])[1].multisample?.mask, 0);
errorState.miscState.sampleCoverageValue = 1;
equal(errorState.getPipelineDescriptor("triangle-list", [])[1].multisample?.mask, 0b1111);
errorState.miscState.sampleAlphaToCoverage = true;
equal(errorState.getPipelineDescriptor("triangle-list", [])[1].multisample?.alphaToCoverageEnabled, true);
const integerAttachment = multisampleFramebuffer.attachments.get(WebGL2RenderingContext.COLOR_ATTACHMENT0)!;
multisampleFramebuffer.attachments.set(WebGL2RenderingContext.COLOR_ATTACHMENT0, {
    ...integerAttachment,
    format: "rgba8uint" as GPUTextureFormat,
} as any);
equal(errorState.getPipelineDescriptor("triangle-list", [])[1].multisample?.alphaToCoverageEnabled, false);

errorState.setError(WebGL2RenderingContext.INVALID_ENUM);
errorState.setError(WebGL2RenderingContext.INVALID_OPERATION);
equal(errorState.consumeError(), WebGL2RenderingContext.INVALID_ENUM);
equal(errorState.consumeError(), WebGL2RenderingContext.NO_ERROR);

const ownerA = {};
const ownerB = {};
const translator = {
    inspectShader: () => ({ attributes: [], uniforms: [], samplers: [], wgsl: "", debug_info: "" }),
    translateProgram: () => { throw new Error("translator should not run for an incomplete program"); },
} as any;
const program = new HydProgram({} as GPUDevice, translator, ownerA);
const vertexShader = new HydShader({} as GPUDevice, WebGL2RenderingContext.VERTEX_SHADER, translator, ownerA);
const secondVertexShader = new HydShader({} as GPUDevice, WebGL2RenderingContext.VERTEX_SHADER, translator, ownerA);
const fragmentShader = new HydShader({} as GPUDevice, WebGL2RenderingContext.FRAGMENT_SHADER, translator, ownerA);
equal(program.attachShader(vertexShader), true);
equal(program.attachShader(vertexShader), false);
equal(program.attachShader(secondVertexShader), false);
equal(program.getAttachedShaders().length, 1);
equal(program.linkProgram(), false);
equal(program.linked, false);
equal(program.detachShader(fragmentShader), false);
equal(program.attachShader(fragmentShader), true);
equal(vertexShader.attachmentCount, 1);
equal(program.detachShader(vertexShader), true);
equal(vertexShader.attachmentCount, 0);

equal(new HydBuffer({} as GPUDevice, ownerA).ownerToken, ownerA);
equal(new HydTexture({} as GPUDevice, ownerA).ownerToken, ownerA);
equal(new HydFramebuffer(ownerA).ownerToken, ownerA);
equal(new HydVertexArray(ownerB).ownerToken, ownerB);

const derivedVertexArray = new HydVertexArray(ownerA);
const derivedAttribute = derivedVertexArray.attributes[0];
const versionedBuffer = { hash: "versioned-buffer", derivedVertexGeneration: 0 } as any;
derivedAttribute.buffer = versionedBuffer;
derivedAttribute.enabled = true;
derivedAttribute.updateHash();
const derivedHashBefore = derivedVertexArray.hash;
versionedBuffer.derivedVertexGeneration = 1;
notEqual(derivedVertexArray.hash, derivedHashBefore);

equal(physicalWebGlBufferSize(0), 16);
equal(physicalWebGlBufferSize(1), 16);
equal(physicalWebGlBufferSize(12), 16);
equal(physicalWebGlBufferSize(16), 16);
equal(physicalWebGlBufferSize(17), 32);
const trailingVec3Block = new ProgramUniformBlock("Block", 0, 12, [0], true, false);
equal(trailingVec3Block.dataSize, 12);
equal(trailingVec3Block.wgslBindingSize, 16);
equal(new ProgramUniformBlock("LargeBlock", 1, 260, [1], true, true).wgslBindingSize, 272);

console.log("webgl api state tests passed");
