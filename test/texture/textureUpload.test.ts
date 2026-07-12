import { deepEqual, equal, ok } from "node:assert/strict";

(globalThis as any).WebGL2RenderingContext = {
    TEXTURE_2D: 0x0DE1,
    TEXTURE_3D: 0x806F,
    TEXTURE_CUBE_MAP: 0x8513,
    TEXTURE_2D_ARRAY: 0x8C1A,
    TEXTURE_CUBE_MAP_POSITIVE_X: 0x8515,
    TEXTURE_CUBE_MAP_NEGATIVE_X: 0x8516,
    TEXTURE_CUBE_MAP_POSITIVE_Y: 0x8517,
    TEXTURE_CUBE_MAP_NEGATIVE_Y: 0x8518,
    TEXTURE_CUBE_MAP_POSITIVE_Z: 0x8519,
    TEXTURE_CUBE_MAP_NEGATIVE_Z: 0x851A,
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
    RGBA: 0x1908,
    RGB: 0x1907,
    LUMINANCE: 0x1909,
    UNSIGNED_SHORT_5_6_5: 0x8363,
    UNSIGNED_SHORT_4_4_4_4: 0x8033,
    UNSIGNED_SHORT_5_5_5_1: 0x8034,
    DEPTH_COMPONENT32F: 0x8CAC,
    DEPTH_COMPONENT: 0x1902,
    UNSIGNED_BYTE: 0x1401,
    FLOAT: 0x1406,
    BROWSER_DEFAULT_WEBGL: 0x9244,
};

const {
    packedPixelLayout,
    prepareTypedTextureUpload,
} = require("../../src/components/hydTexture") as typeof import("../../src/components/hydTexture");

const GL = WebGL2RenderingContext;
const unpack = (flipY: boolean, alignment: number) => ({
    flipY,
    alignment,
    premultiplyAlpha: false,
    colorspaceConversion: GL.BROWSER_DEFAULT_WEBGL,
    unpackColorSpace: "srgb" as const,
});
const premultipliedUnpack = (flipY: boolean, alignment: number) => ({
    ...unpack(flipY, alignment),
    premultiplyAlpha: true,
});

const rgba = new Uint8Array([
    1, 2, 3, 4,
    5, 6, 7, 8,
    9, 10, 11, 12,
    13, 14, 15, 16,
]);
const flippedRgba = prepareTypedTextureUpload(rgba, 2, 2, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, unpack(true, 4));
deepEqual(Array.from(flippedRgba.data as Uint8Array), [
    9, 10, 11, 12,
    13, 14, 15, 16,
    1, 2, 3, 4,
    5, 6, 7, 8,
]);
equal(flippedRgba.bytesPerRow, 8);

const premultipliedRgba = prepareTypedTextureUpload(
    new Uint8Array([200, 100, 50, 128, 10, 20, 30, 0]),
    2,
    1,
    GL.RGBA,
    GL.RGBA,
    GL.UNSIGNED_BYTE,
    premultipliedUnpack(false, 4),
);
deepEqual(Array.from(premultipliedRgba.data as Uint8Array), [100, 50, 25, 128, 0, 0, 0, 0]);

const paddedRgb = new Uint8Array([
    1, 2, 3, 4, 5, 6, 0, 0,
    7, 8, 9, 10, 11, 12, 0, 0,
]);
const expandedRgb = prepareTypedTextureUpload(paddedRgb, 2, 2, GL.RGB, GL.RGB, GL.UNSIGNED_BYTE, unpack(true, 4));
ok(expandedRgb.data instanceof Uint8Array);
deepEqual(Array.from(expandedRgb.data as Uint8Array), [
    7, 8, 9, 255,
    10, 11, 12, 255,
    1, 2, 3, 255,
    4, 5, 6, 255,
]);
equal(expandedRgb.bytesPerRow, 8);
equal(expandedRgb.internalformat, GL.RGBA);
equal(expandedRgb.format, GL.RGBA);

const tightLuminance = new Uint8Array([
    1, 2, 3,
    4, 5, 6,
]);
const expandedLuminance = prepareTypedTextureUpload(tightLuminance, 3, 2, GL.LUMINANCE, GL.LUMINANCE, GL.UNSIGNED_BYTE, unpack(false, 1));
deepEqual(Array.from(expandedLuminance.data as Uint8Array), [
    1, 1, 1, 255,
    2, 2, 2, 255,
    3, 3, 3, 255,
    4, 4, 4, 255,
    5, 5, 5, 255,
    6, 6, 6, 255,
]);
equal(expandedLuminance.bytesPerRow, 12);

deepEqual(packedPixelLayout(1, 2, 4, 8), {
    rowBytes: 4,
    rowStride: 8,
    requiredBytes: 12,
});
deepEqual(packedPixelLayout(3, 2, 4, 8), {
    rowBytes: 12,
    rowStride: 16,
    requiredBytes: 28,
});
deepEqual(packedPixelLayout(5, 1, 4, 8), {
    rowBytes: 20,
    rowStride: 24,
    requiredBytes: 20,
});

const packed565 = prepareTypedTextureUpload(
    new Uint16Array([0xf800, 0x07e0]),
    2,
    1,
    GL.RGB,
    GL.RGB,
    GL.UNSIGNED_SHORT_5_6_5,
    unpack(false, 1),
);
deepEqual(Array.from(packed565.data as Uint8Array), [255, 0, 0, 255, 0, 255, 0, 255]);
equal(packed565.bytesPerRow, 8);

const premultiplied4444 = prepareTypedTextureUpload(
    new Uint16Array([0xf008]),
    1,
    1,
    GL.RGBA,
    GL.RGBA,
    GL.UNSIGNED_SHORT_4_4_4_4,
    premultipliedUnpack(false, 1),
);
deepEqual(Array.from(premultiplied4444.data as Uint8Array), [136, 0, 0, 136]);

console.log("texture upload tests passed");
