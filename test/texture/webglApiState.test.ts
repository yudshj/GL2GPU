import { equal, notEqual } from "node:assert/strict";

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

const { FramebufferAttributes } = require("../../src/components/hydFramebuffer") as typeof import("../../src/components/hydFramebuffer");
const { HydTexture } = require("../../src/components/hydTexture") as typeof import("../../src/components/hydTexture");
const { HydBuffer } = require("../../src/components/hydBuffer") as typeof import("../../src/components/hydBuffer");
const { HydFramebuffer } = require("../../src/components/hydFramebuffer") as typeof import("../../src/components/hydFramebuffer");
const { HydGlobalStateHashed } = require("../../src/components/hydGlobalState") as typeof import("../../src/components/hydGlobalState");
const { HydProgram } = require("../../src/components/hydProgram") as typeof import("../../src/components/hydProgram");
const { HydShader } = require("../../src/components/hydShader") as typeof import("../../src/components/hydShader");
const { HydVertexArray } = require("../../src/components/hydVertexArray") as typeof import("../../src/components/hydVertexArray");

const renderbuffer = new HydTexture({} as GPUDevice);
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

console.log("webgl api state tests passed");
