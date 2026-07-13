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
    RED: 0x1903,
    RG: 0x8227,
    RED_INTEGER: 0x8D94,
    RG_INTEGER: 0x8228,
    RGB_INTEGER: 0x8D98,
    RGBA_INTEGER: 0x8D99,
    LUMINANCE: 0x1909,
    ALPHA: 0x1906,
    LUMINANCE_ALPHA: 0x190A,
    UNSIGNED_SHORT_5_6_5: 0x8363,
    UNSIGNED_SHORT_4_4_4_4: 0x8033,
    UNSIGNED_SHORT_5_5_5_1: 0x8034,
    UNSIGNED_INT_10F_11F_11F_REV: 0x8C3B,
    UNSIGNED_INT_5_9_9_9_REV: 0x8C3E,
    HALF_FLOAT: 0x140B,
    R11F_G11F_B10F: 0x8C3A,
    RGB9_E5: 0x8C3D,
    RGB16F: 0x881B,
    R8UI: 0x8232,
    RGB8UI: 0x8D7D,
    RGB32F: 0x8815,
    SRGB8: 0x8C41,
    SRGB8_ALPHA8: 0x8C43,
    DEPTH_COMPONENT32F: 0x8CAC,
    DEPTH_COMPONENT: 0x1902,
    UNSIGNED_BYTE: 0x1401,
    FLOAT: 0x1406,
    BROWSER_DEFAULT_WEBGL: 0x9244,
};

const {
    externalSourceUvTransform,
    externalVideoFrameDisplayExtent,
    isWebGlTextureSamplingFilterable,
    packedPixelLayout,
    packedPixelLayout3D,
    prepareExternalRgba8TextureUpload,
    prepareExternalRgba8TextureUploadLayers,
    prepareTypedTextureUpload,
    requiresPreparedExternalUpload,
    resolveExternalCopyLayout,
    resolveMutableTextureBaseDimension,
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

deepEqual(externalSourceUvTransform(4, 8, 2, 3, 1, 4), {
    scaleX: 0.5,
    scaleY: 0.375,
    offsetX: 0.25,
    offsetY: 0.5,
});
deepEqual(externalVideoFrameDisplayExtent({
    codedWidth: 96,
    codedHeight: 128,
    visibleRect: { width: 96, height: 128 },
    displayWidth: 128,
    displayHeight: 96,
}), { width: 128, height: 96 });
deepEqual(externalVideoFrameDisplayExtent({
    codedWidth: 1920,
    codedHeight: 1088,
    visibleRect: { width: 1920, height: 1080 },
    displayWidth: 1920,
    displayHeight: 1112,
}), { width: 1920, height: 1080 });

equal(resolveMutableTextureBaseDimension(1, 1, 2, true, true, 1), 4);
equal(resolveMutableTextureBaseDimension(4, 1, 3, true, true, 4), 4);
equal(resolveMutableTextureBaseDimension(4, 1, 3, true, true, 3), 8);
equal(resolveMutableTextureBaseDimension(8, 1, 3, true, true, 4), 8);
equal(resolveMutableTextureBaseDimension(4, 2, 3, true), 16);
equal(resolveMutableTextureBaseDimension(4, 1, 3, false), 8);
equal(resolveMutableTextureBaseDimension(7, 7, 3, true, false), 7);
equal(requiresPreparedExternalUpload("rgba8unorm", GL.RGBA), false);
equal(requiresPreparedExternalUpload("rgb10a2unorm", GL.RGBA), false);
equal(requiresPreparedExternalUpload("rgb10a2unorm", GL.RGB), true);
equal(requiresPreparedExternalUpload("rgb10a2unorm", GL.RGBA, false), true);
equal(requiresPreparedExternalUpload("rgba16float", GL.RGBA), false);
equal(requiresPreparedExternalUpload("rgba16float", GL.RGB), true);
equal(requiresPreparedExternalUpload("rgba32float", GL.RGBA), true);
deepEqual(resolveExternalCopyLayout(1, 2, 1, 1, 0, 0, false), {
    origin: { x: 0, y: 0 },
    flipY: false,
});
deepEqual(resolveExternalCopyLayout(1, 2, 1, 1, 0, 0, true), {
    origin: { x: 0, y: 1 },
    flipY: true,
});
deepEqual(resolveExternalCopyLayout(4, 4, 2, 2, 1, 1, true), {
    origin: { x: 1, y: 1 },
    flipY: true,
});
equal(isWebGlTextureSamplingFilterable("float", false), true);
equal(isWebGlTextureSamplingFilterable("float", true), false);
equal(isWebGlTextureSamplingFilterable("sint", false), false);
equal(isWebGlTextureSamplingFilterable("uint", false), false);
equal(isWebGlTextureSamplingFilterable("depth", false), false);
equal(isWebGlTextureSamplingFilterable("depth", false, true), true);

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

const expandedSrgb = prepareTypedTextureUpload(
    new Uint8Array([127, 127, 127]),
    1,
    1,
    GL.SRGB8,
    GL.RGB,
    GL.UNSIGNED_BYTE,
    unpack(false, 1),
);
deepEqual(Array.from(expandedSrgb.data as Uint8Array), [127, 127, 127, 255]);
equal(expandedSrgb.bytesPerRow, 4);
equal(expandedSrgb.internalformat, GL.SRGB8);
equal(expandedSrgb.format, GL.RGB);

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
    dataOffset: 0,
    requiredBytes: 12,
});
deepEqual(packedPixelLayout(3, 2, 4, 8), {
    rowBytes: 12,
    rowStride: 16,
    dataOffset: 0,
    requiredBytes: 28,
});
deepEqual(packedPixelLayout(5, 1, 4, 8), {
    rowBytes: 20,
    rowStride: 24,
    dataOffset: 0,
    requiredBytes: 20,
});
deepEqual(packedPixelLayout(2, 2, 3, 4, 5, 1, 2), {
    rowBytes: 6,
    rowStride: 16,
    dataOffset: 35,
    requiredBytes: 57,
});
deepEqual(packedPixelLayout3D(2, 2, 2, 3, 4, 4, 3, 1, 1, 1), {
    rowBytes: 6,
    rowStride: 12,
    imageStride: 36,
    dataOffset: 51,
    requiredBytes: 105,
});

const unpackedRgb = prepareTypedTextureUpload(
    new Uint8Array([
        0, 0, 0, 1, 2, 3, 4, 5, 6, 0, 0, 0,
        0, 0, 0, 7, 8, 9, 10, 11, 12, 0, 0, 0,
    ]),
    2,
    2,
    GL.RGB,
    GL.RGB,
    GL.UNSIGNED_BYTE,
    { ...unpack(false, 4), rowLength: 4, skipPixels: 1, skipRows: 0 },
);
deepEqual(Array.from(unpackedRgb.data as Uint8Array), [
    1, 2, 3, 255,
    4, 5, 6, 255,
    7, 8, 9, 255,
    10, 11, 12, 255,
]);

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

const packedR11 = prepareTypedTextureUpload(
    new Uint32Array([15 << 6]),
    1,
    1,
    GL.R11F_G11F_B10F,
    GL.RGB,
    GL.UNSIGNED_INT_10F_11F_11F_REV,
    unpack(false, 4),
);
equal((packedR11.data as Uint32Array)[0], 15 << 6);
equal(packedR11.bytesPerRow, 4);

const expandedRgb32f = prepareTypedTextureUpload(
    new Float32Array([1, 2, 3]),
    1,
    1,
    GL.RGB32F,
    GL.RGB,
    GL.FLOAT,
    unpack(false, 4),
);
deepEqual(Array.from(expandedRgb32f.data as Float32Array), [1, 2, 3, 1]);
equal(expandedRgb32f.bytesPerRow, 16);

const packedRgb9e5 = prepareTypedTextureUpload(
    new Float32Array([1, 0.5, 0.25]),
    1,
    1,
    GL.RGB9_E5,
    GL.RGB,
    GL.FLOAT,
    unpack(false, 4),
);
const rgb9Word = (packedRgb9e5.data as Uint32Array)[0];
equal(rgb9Word & 0x1ff, 256);
equal((rgb9Word >>> 9) & 0x1ff, 128);
equal((rgb9Word >>> 18) & 0x1ff, 64);
equal(rgb9Word >>> 27, 16);
equal(packedRgb9e5.bytesPerRow, 4);

const externalRgb16f = prepareExternalRgba8TextureUpload(
    new Uint8Array([127, 0, 0, 128]),
    1,
    1,
    GL.RGB16F,
    GL.RGB,
    GL.FLOAT,
);
ok(externalRgb16f);
equal((externalRgb16f.data as Uint16Array)[3], 0x3c00);
equal(externalRgb16f.bytesPerRow, 8);

const externalR8ui = prepareExternalRgba8TextureUpload(
    new Uint8Array([255, 127, 63, 31]),
    1,
    1,
    GL.R8UI,
    GL.RED_INTEGER,
    GL.UNSIGNED_BYTE,
);
ok(externalR8ui);
deepEqual(Array.from(externalR8ui.data as Uint8Array), [255]);

const externalRgb8ui = prepareExternalRgba8TextureUpload(
    new Uint8Array([255, 127, 63, 31]),
    1,
    1,
    GL.RGB8UI,
    GL.RGB_INTEGER,
    GL.UNSIGNED_BYTE,
);
ok(externalRgb8ui);
deepEqual(Array.from(externalRgb8ui.data as Uint8Array), [255, 127, 63, 1]);

const layeredImageDataSource = new Uint8ClampedArray([
    200, 100, 50, 128,
    10, 20, 30, 0,
    40, 50, 60, 255,
    70, 80, 90, 128,
]);
const layeredImageData = prepareExternalRgba8TextureUploadLayers(
    layeredImageDataSource,
    1,
    4,
    1,
    2,
    2,
    GL.RGBA,
    GL.RGBA,
    GL.UNSIGNED_BYTE,
    unpack(false, 1),
);
ok(layeredImageData);
deepEqual(Array.from(layeredImageData.data as Uint8Array), Array.from(layeredImageDataSource));

const flippedPremultipliedLayeredImageData = prepareExternalRgba8TextureUploadLayers(
    layeredImageDataSource,
    1,
    4,
    1,
    2,
    2,
    GL.RGBA,
    GL.RGBA,
    GL.UNSIGNED_BYTE,
    premultipliedUnpack(true, 1),
);
ok(flippedPremultipliedLayeredImageData);
deepEqual(Array.from(flippedPremultipliedLayeredImageData.data as Uint8Array), [
    35, 40, 45, 128,
    40, 50, 60, 255,
    0, 0, 0, 0,
    100, 50, 25, 128,
]);

console.log("texture upload tests passed");
