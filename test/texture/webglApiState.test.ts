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
};
(globalThis as any).GPUTextureUsage = {
    COPY_DST: 1,
    COPY_SRC: 2,
    TEXTURE_BINDING: 4,
    RENDER_ATTACHMENT: 8,
};

const { FramebufferAttributes } = require("../../src/components/hydFramebuffer") as typeof import("../../src/components/hydFramebuffer");
const { HydTexture } = require("../../src/components/hydTexture") as typeof import("../../src/components/hydTexture");

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

console.log("webgl api state tests passed");
