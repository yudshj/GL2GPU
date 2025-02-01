export const vertexFormatList: [GLenum, number, GLboolean, GPUVertexFormat][] = [
    [WebGL2RenderingContext.FLOAT, 1, undefined, 'float32'],
    [WebGL2RenderingContext.FLOAT, 2, undefined, 'float32x2'],
    [WebGL2RenderingContext.FLOAT, 3, undefined, 'float32x3'],
    [WebGL2RenderingContext.FLOAT, 4, undefined, 'float32x4'],
    [WebGL2RenderingContext.HALF_FLOAT, 2, undefined, 'float16x2'],
    [WebGL2RenderingContext.HALF_FLOAT, 4, undefined, 'float16x4'],

    [WebGL2RenderingContext.BYTE, 2, false, 'sint8x2'],
    [WebGL2RenderingContext.BYTE, 4, false, 'sint8x4'],
    [WebGL2RenderingContext.UNSIGNED_BYTE, 2, false, 'uint8x2'],
    [WebGL2RenderingContext.UNSIGNED_BYTE, 4, false, 'uint8x4'],

    [WebGL2RenderingContext.SHORT, 2, false, 'sint16x2'],
    [WebGL2RenderingContext.SHORT, 4, false, 'sint16x4'],
    [WebGL2RenderingContext.UNSIGNED_SHORT, 2, false, 'uint16x2'],
    [WebGL2RenderingContext.UNSIGNED_SHORT, 4, false, 'uint16x4'],

    [WebGL2RenderingContext.INT, 1, false, 'sint32'],
    [WebGL2RenderingContext.INT, 2, false, 'sint32x2'],
    [WebGL2RenderingContext.INT, 3, false, 'sint32x3'],
    [WebGL2RenderingContext.INT, 4, false, 'sint32x4'],
    [WebGL2RenderingContext.UNSIGNED_INT, 1, false, 'uint32'],
    [WebGL2RenderingContext.UNSIGNED_INT, 2, false, 'uint32x2'],
    [WebGL2RenderingContext.UNSIGNED_INT, 3, false, 'uint32x3'],
    [WebGL2RenderingContext.UNSIGNED_INT, 4, false, 'uint32x4'],


    [WebGL2RenderingContext.BYTE, 2, true, 'snorm8x2'],
    [WebGL2RenderingContext.BYTE, 4, true, 'snorm8x4'],
    [WebGL2RenderingContext.UNSIGNED_BYTE, 2, true, 'unorm8x2'],
    [WebGL2RenderingContext.UNSIGNED_BYTE, 4, true, 'unorm8x4'],

    [WebGL2RenderingContext.SHORT, 2, true, 'snorm16x2'],
    [WebGL2RenderingContext.SHORT, 4, true, 'snorm16x4'],
    [WebGL2RenderingContext.UNSIGNED_SHORT, 2, true, 'unorm16x2'],
    [WebGL2RenderingContext.UNSIGNED_SHORT, 4, true, 'unorm16x4'],
];export const enumToCullFace: Map<GLenum, GPUCullMode> = new Map([
    [WebGL2RenderingContext.FRONT, 'front'],
    [WebGL2RenderingContext.BACK, 'back'],
    [WebGL2RenderingContext.FRONT_AND_BACK, 'none'],
]);
export const enumToFrontFace: Map<GLenum, GPUFrontFace> = new Map([
    [WebGL2RenderingContext.CW, 'cw'],
    [WebGL2RenderingContext.CCW, 'ccw'],
]);
export const enumToViewDimension: Map<GLenum, GPUTextureViewDimension> = new Map([
    [WebGL2RenderingContext.TEXTURE_2D, '2d'],
    [WebGL2RenderingContext.TEXTURE_2D_ARRAY, '2d-array'],
    [WebGL2RenderingContext.TEXTURE_3D, '3d'],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP, 'cube'],
]);
export const enumToConstant: Map<number, any> = new Map([
    [WebGL2RenderingContext.MAX_COMBINED_TEXTURE_IMAGE_UNITS, 16],
    [WebGL2RenderingContext.MAX_CUBE_MAP_TEXTURE_SIZE, 4096],
    [WebGL2RenderingContext.MAX_FRAGMENT_UNIFORM_VECTORS, 1024],
    [WebGL2RenderingContext.MAX_RENDERBUFFER_SIZE, 4096],
    [WebGL2RenderingContext.MAX_TEXTURE_IMAGE_UNITS, 16],
    [WebGL2RenderingContext.MAX_TEXTURE_SIZE, 4096],
    [WebGL2RenderingContext.MAX_VARYING_VECTORS, 32],
    [WebGL2RenderingContext.MAX_VERTEX_ATTRIBS, 16],
    [WebGL2RenderingContext.MAX_VERTEX_TEXTURE_IMAGE_UNITS, 16],
    [WebGL2RenderingContext.MAX_VERTEX_UNIFORM_VECTORS, 1024],
    [WebGL2RenderingContext.MAX_VIEWPORT_DIMS, [4096, 4096]],

    [WebGL2RenderingContext.MAX_3D_TEXTURE_SIZE, 256],
    [WebGL2RenderingContext.MAX_ARRAY_TEXTURE_LAYERS, 256],
    [WebGL2RenderingContext.MAX_CLIENT_WAIT_TIMEOUT_WEBGL, 0],
    [WebGL2RenderingContext.MAX_COLOR_ATTACHMENTS, 4],
    [WebGL2RenderingContext.MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS, 65536],
    [WebGL2RenderingContext.MAX_COMBINED_UNIFORM_BLOCKS, 72],
    [WebGL2RenderingContext.MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS, 65536],
    [WebGL2RenderingContext.MAX_DRAW_BUFFERS, 4],
    [WebGL2RenderingContext.MAX_ELEMENT_INDEX, 4294967295],
    [WebGL2RenderingContext.MAX_ELEMENTS_INDICES, 4294967295],
    [WebGL2RenderingContext.MAX_ELEMENTS_VERTICES, 1048576],
    [WebGL2RenderingContext.MAX_FRAGMENT_INPUT_COMPONENTS, 128],
    [WebGL2RenderingContext.MAX_FRAGMENT_UNIFORM_BLOCKS, 12],
    [WebGL2RenderingContext.MAX_FRAGMENT_UNIFORM_COMPONENTS, 4096],
    [WebGL2RenderingContext.MAX_PROGRAM_TEXEL_OFFSET, 7],
    [WebGL2RenderingContext.MAX_SAMPLES, 4],
    [WebGL2RenderingContext.MAX_SERVER_WAIT_TIMEOUT, 0],
    [WebGL2RenderingContext.MAX_TEXTURE_LOD_BIAS, 16],
    [WebGL2RenderingContext.MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS, 64],
    [WebGL2RenderingContext.MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS, 4],
    [WebGL2RenderingContext.MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS, 4],
    [WebGL2RenderingContext.MAX_UNIFORM_BLOCK_SIZE, 16384],
    [WebGL2RenderingContext.MAX_UNIFORM_BUFFER_BINDINGS, 72],
    [WebGL2RenderingContext.MAX_VARYING_COMPONENTS, 60],
    [WebGL2RenderingContext.MAX_VERTEX_OUTPUT_COMPONENTS, 64],
    [WebGL2RenderingContext.MAX_VERTEX_UNIFORM_BLOCKS, 12],
    [WebGL2RenderingContext.MAX_VERTEX_UNIFORM_COMPONENTS, 4096],

    [WebGL2RenderingContext.VERSION, "WebGL 2.0 (OpenGL ES 3.0 Chromium)"],
] as Array<[number, any]>);
// const USE_CACHE = true;
export const enumToIndexFormat: Map<GLenum, GPUIndexFormat> = new Map([
    [WebGL2RenderingContext.UNSIGNED_SHORT, 'uint16'],
    [WebGL2RenderingContext.UNSIGNED_INT, 'uint32'],
]);
export const indexEnumToBytes: Map<GLenum, number> = new Map([
    [WebGL2RenderingContext.UNSIGNED_SHORT, 2],
    [WebGL2RenderingContext.UNSIGNED_INT, 4],
]);
// export const enum2PT: Map<GLenum, GPUPrimitiveTopology> = new Map([
    // [WebGL2RenderingContext.POINTS, "point-list"],
    // [WebGL2RenderingContext.LINES, "line-list"],
    // [WebGL2RenderingContext.LINE_LOOP, undefined],
    // [WebGL2RenderingContext.LINE_STRIP, "line-strip"],
    // [WebGL2RenderingContext.TRIANGLES, "triangle-list"],
    // [WebGL2RenderingContext.TRIANGLE_STRIP, "triangle-strip"],
    // [WebGL2RenderingContext.TRIANGLE_FAN, undefined],
// ]);
export const enum2PT: GPUPrimitiveTopology[] = ["point-list", "line-list", undefined, "line-strip", "triangle-list", "triangle-strip", undefined];
export const enumToBlendFactors: Map<GLenum, GPUBlendFactor> = new Map([
    [WebGL2RenderingContext.ONE, 'one'],
    [WebGL2RenderingContext.SRC_ALPHA, 'src-alpha'],
    [WebGL2RenderingContext.ONE_MINUS_SRC_ALPHA, 'one-minus-src-alpha'],
]);
export const enumToCompareFunction: Map<GLenum, GPUCompareFunction> = new Map([
    [WebGL2RenderingContext.NEVER, 'never'],
    [WebGL2RenderingContext.LESS, 'less'],
    [WebGL2RenderingContext.EQUAL, 'equal'],
    [WebGL2RenderingContext.LEQUAL, 'less-equal'],
    [WebGL2RenderingContext.GREATER, 'greater'],
    [WebGL2RenderingContext.NOTEQUAL, 'not-equal'],
    [WebGL2RenderingContext.GEQUAL, 'greater-equal'],
    [WebGL2RenderingContext.ALWAYS, 'always'],
]);
export const enumToBlendOperations: Map<GLenum, GPUBlendOperation> = new Map([
    [WebGL2RenderingContext.FUNC_ADD, 'add'],
    [WebGL2RenderingContext.FUNC_SUBTRACT, 'subtract'],
    [WebGL2RenderingContext.FUNC_REVERSE_SUBTRACT, 'reverse-subtract'],
    [WebGL2RenderingContext.MIN, 'min'],
    [WebGL2RenderingContext.MAX, 'max'],
]);
export const enumToStencilOperation: Map<GLenum, GPUStencilOperation> = new Map([
    [WebGL2RenderingContext.KEEP, 'keep'],
    [WebGL2RenderingContext.ZERO, 'zero'],
    [WebGL2RenderingContext.REPLACE, 'replace'],
    [WebGL2RenderingContext.INCR, 'increment-clamp'],
    [WebGL2RenderingContext.DECR, 'decrement-clamp'],
    [WebGL2RenderingContext.INVERT, 'invert'],
    [WebGL2RenderingContext.INCR_WRAP, 'increment-wrap'],
    [WebGL2RenderingContext.DECR_WRAP, 'decrement-wrap'],
]);

export function getVertexFormat(type: GLenum, size: number, normalized: GLboolean): GPUVertexFormat {
    const result = vertexFormatList.find(([t, s, n]) => t === type && s === size && (n === undefined || n === normalized));
    if (result) {
        return result[3];
    }
    throw new Error(`Unsupported vertex format: ${type}, ${size}, ${normalized}`);
}