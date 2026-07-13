import type { TextureNameAndType } from "./shaderDB";
import type { ShaderStage } from "./shaderMetadata";

export interface IntegerSamplerOverrideNames {
    wrapS: string;
    wrapT: string;
    wrapR: string;
    mipmapped: string;
    minLod: string;
    maxLod: string;
    levels: string;
    flipY: string;
}

interface IntegerSamplerShape {
    prefix: "i" | "u";
    dimension: "2D" | "Cube" | "2DArray" | "3D";
    resultType: "ivec4" | "uvec4";
    textureType: string;
    coordinateType: "vec2" | "vec3";
    offsetType: "ivec2" | "ivec3";
}

interface IntegerTextureOperation {
    projected: boolean;
    lod: "implicit" | "explicit" | "grad";
    offset: boolean;
}

const INTEGER_TEXTURE_OPERATIONS: Record<string, IntegerTextureOperation> = {
    textureProjGradOffset: { projected: true, lod: "grad", offset: true },
    textureProjLodOffset: { projected: true, lod: "explicit", offset: true },
    textureProjOffset: { projected: true, lod: "implicit", offset: true },
    textureGradOffset: { projected: false, lod: "grad", offset: true },
    textureLodOffset: { projected: false, lod: "explicit", offset: true },
    textureProjGrad: { projected: true, lod: "grad", offset: false },
    textureProjLod: { projected: true, lod: "explicit", offset: false },
    textureOffset: { projected: false, lod: "implicit", offset: true },
    textureProj: { projected: true, lod: "implicit", offset: false },
    textureGrad: { projected: false, lod: "grad", offset: false },
    textureLod: { projected: false, lod: "explicit", offset: false },
    texture: { projected: false, lod: "implicit", offset: false },
};

const INTEGER_TEXTURE_CALL = new RegExp(
    `\\b(${Object.keys(INTEGER_TEXTURE_OPERATIONS).join("|")})\\s*\\(`,
    "g",
);

function sanitizeIdentifier(value: string): string {
    return value.replace(/[^A-Za-z0-9_]/g, "_");
}

export function integerSamplerOverrideNames(samplerName: string): IntegerSamplerOverrideNames {
    const suffix = sanitizeIdentifier(samplerName);
    return {
        wrapS: `hydgl2gpu_integer_wrap_s_${suffix}`,
        wrapT: `hydgl2gpu_integer_wrap_t_${suffix}`,
        wrapR: `hydgl2gpu_integer_wrap_r_${suffix}`,
        mipmapped: `hydgl2gpu_integer_mipmapped_${suffix}`,
        minLod: `hydgl2gpu_integer_min_lod_${suffix}`,
        maxLod: `hydgl2gpu_integer_max_lod_${suffix}`,
        levels: `hydgl2gpu_integer_levels_${suffix}`,
        flipY: `hydgl2gpu_integer_flip_y_${suffix}`,
    };
}

function integerSamplerShape(glslType: string): IntegerSamplerShape | null {
    const match = /^([iu])sampler(2D|Cube|2DArray|3D)$/.exec(glslType);
    if (!match) return null;
    const prefix = match[1] as "i" | "u";
    const dimension = match[2] as IntegerSamplerShape["dimension"];
    const texturePrefix = prefix === "i" ? "i" : "u";
    const textureType = dimension === "Cube"
        ? `${texturePrefix}texture2DArray`
        : `${texturePrefix}texture${dimension}`;
    return {
        prefix,
        dimension,
        resultType: prefix === "i" ? "ivec4" : "uvec4",
        textureType,
        coordinateType: dimension === "2D" ? "vec2" : "vec3",
        offsetType: dimension === "3D" ? "ivec3" : "ivec2",
    };
}

function findMatchingParen(source: string, openIndex: number): number {
    let depth = 0;
    for (let index = openIndex; index < source.length; index++) {
        if (source[index] === "(") depth++;
        else if (source[index] === ")" && --depth === 0) return index;
    }
    return -1;
}

function splitTopLevelArguments(source: string): string[] {
    const args: string[] = [];
    let start = 0;
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    for (let index = 0; index < source.length; index++) {
        const character = source[index];
        if (character === "(") parenDepth++;
        else if (character === ")") parenDepth--;
        else if (character === "[") bracketDepth++;
        else if (character === "]") bracketDepth--;
        else if (character === "{") braceDepth++;
        else if (character === "}") braceDepth--;
        else if (character === "," && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
            args.push(source.slice(start, index));
            start = index + 1;
        }
    }
    args.push(source.slice(start));
    return args;
}

function projectCoordinate(shape: IntegerSamplerShape, expression: string): string {
    if (shape.dimension === "2D") {
        return `hydgl2gpu_integer_project_2d(${expression})`;
    }
    return `hydgl2gpu_integer_project_3d(${expression})`;
}

function helperName(shape: IntegerSamplerShape, samplerName: string): string {
    return `_hyd_integer_texture_${shape.prefix}_${shape.dimension.toLowerCase()}_${sanitizeIdentifier(samplerName)}`;
}

function rewriteSamplerCalls(
    source: string,
    samplerName: string,
    shape: IntegerSamplerShape,
    stage: ShaderStage,
): { source: string, used: boolean } {
    let result = "";
    let cursor = 0;
    INTEGER_TEXTURE_CALL.lastIndex = 0;
    for (let match = INTEGER_TEXTURE_CALL.exec(source); match !== null; match = INTEGER_TEXTURE_CALL.exec(source)) {
        const openParen = INTEGER_TEXTURE_CALL.lastIndex - 1;
        const closeParen = findMatchingParen(source, openParen);
        if (closeParen < 0) break;
        const args = splitTopLevelArguments(source.slice(openParen + 1, closeParen));
        if (args[0]?.trim() !== samplerName) {
            INTEGER_TEXTURE_CALL.lastIndex = closeParen + 1;
            continue;
        }

        const operation = INTEGER_TEXTURE_OPERATIONS[match[1]];
        if (!operation || args.length < 2 || (operation.projected &&
            (shape.dimension === "Cube" || shape.dimension === "2DArray"))) {
            INTEGER_TEXTURE_CALL.lastIndex = closeParen + 1;
            continue;
        }

        const baseHelper = helperName(shape, samplerName);
        const texture = `${samplerName}T`;
        const coordinate = operation.projected
            ? projectCoordinate(shape, args[1].trim())
            : args[1].trim();
        const zeroOffset = `${shape.offsetType}(0)`;
        let replacement = "";
        if (operation.lod === "implicit") {
            const offsetIndex = operation.offset ? 2 : -1;
            const biasIndex = operation.offset ? 3 : 2;
            const offset = offsetIndex >= 0 && args[offsetIndex]
                ? args[offsetIndex].trim()
                : zeroOffset;
            const bias = args[biasIndex]?.trim() || "0.0";
            replacement = stage === "fragment"
                ? `${baseHelper}_implicit(${texture}, ${coordinate}, ${bias}, ${offset})`
                : `${baseHelper}(${texture}, ${coordinate}, 0.0, ${offset})`;
        } else if (operation.lod === "explicit") {
            if (args.length < (operation.offset ? 4 : 3)) {
                INTEGER_TEXTURE_CALL.lastIndex = closeParen + 1;
                continue;
            }
            const offset = operation.offset ? args[3].trim() : zeroOffset;
            replacement = `${baseHelper}(${texture}, ${coordinate}, ${args[2].trim()}, ${offset})`;
        } else {
            if (args.length < (operation.offset ? 5 : 4)) {
                INTEGER_TEXTURE_CALL.lastIndex = closeParen + 1;
                continue;
            }
            const offset = operation.offset ? args[4].trim() : zeroOffset;
            const lod = `${baseHelper}_lod(${texture}, ${coordinate}, ${args[2].trim()}, ${args[3].trim()})`;
            replacement = `${baseHelper}(${texture}, ${coordinate}, ${lod}, ${offset})`;
        }

        result += source.slice(cursor, match.index) + replacement;
        cursor = closeParen + 1;
        INTEGER_TEXTURE_CALL.lastIndex = closeParen + 1;
    }
    return cursor === 0
        ? { source, used: false }
        : { source: result + source.slice(cursor), used: true };
}

function specializationDeclarations(samplerIndex: number, names: IntegerSamplerOverrideNames): string {
    const base = 1000 + samplerIndex * 8;
    return `layout(constant_id = ${base}) const int ${names.wrapS} = 1;
layout(constant_id = ${base + 1}) const int ${names.wrapT} = 1;
layout(constant_id = ${base + 2}) const int ${names.wrapR} = 1;
layout(constant_id = ${base + 3}) const int ${names.mipmapped} = 1;
layout(constant_id = ${base + 4}) const float ${names.minLod} = -1000.0;
layout(constant_id = ${base + 5}) const float ${names.maxLod} = 1000.0;
layout(constant_id = ${base + 6}) const int ${names.levels} = 1;
layout(constant_id = ${base + 7}) const int ${names.flipY} = 0;`;
}

const INTEGER_COMMON_HELPERS = `int hydgl2gpu_integer_wrap_index(int value, int size, int mode) {
  if (mode == 1) {
    int wrapped = value % size;
    return wrapped < 0 ? wrapped + size : wrapped;
  }
  if (mode == 2) {
    int period = size * 2;
    int wrapped = value % period;
    if (wrapped < 0) wrapped += period;
    return wrapped < size ? wrapped : period - wrapped - 1;
  }
  return clamp(value, 0, size - 1);
}

int hydgl2gpu_integer_level(int levels, float lod, int mipmapped, float minLod, float maxLod) {
  if (mipmapped == 0 || levels <= 1) return 0;
  float effectiveLod = clamp(lod, minLod, maxLod);
  return clamp(int(floor(effectiveLod + 0.5)), 0, levels - 1);
}

vec2 hydgl2gpu_integer_project_2d(vec3 coordinate) {
  return coordinate.xy / coordinate.z;
}

vec2 hydgl2gpu_integer_project_2d(vec4 coordinate) {
  return coordinate.xy / coordinate.w;
}

vec3 hydgl2gpu_integer_project_3d(vec4 coordinate) {
  return coordinate.xyz / coordinate.w;
}`;

function integerSamplerHelper(
    sampler: TextureNameAndType,
    samplerIndex: number,
    shape: IntegerSamplerShape,
    stage: ShaderStage,
): string {
    const names = integerSamplerOverrideNames(sampler.name);
    const name = helperName(shape, sampler.name);
    const textureParameter = `${name}_object`;
    const bindTextureParameter = (source: string) => source.replace(/\btex\b/g, textureParameter);
    const declarations = specializationDeclarations(samplerIndex, names);
    const derivativeCoordinate = shape.dimension === "2DArray" ? "coordinate.xy" : "coordinate";
    const implicit = stage === "fragment"
        ? `
${shape.resultType} ${name}_implicit(${shape.textureType} tex, ${shape.coordinateType} coordinate, float bias, ${shape.offsetType} offset) {
  return ${name}(tex, coordinate, ${name}_lod(tex, coordinate, dFdx(${derivativeCoordinate}), dFdy(${derivativeCoordinate})) + bias, offset);
}`
        : "";

    if (shape.dimension === "2D") {
        return bindTextureParameter(`${declarations}

float ${name}_lod(${shape.textureType} tex, vec2 coordinate, vec2 gradientX, vec2 gradientY) {
  vec2 size = vec2(textureSize(tex, 0));
  return log2(max(length(gradientX * size), length(gradientY * size)));
}

${shape.resultType} ${name}(${shape.textureType} tex, vec2 coordinate, float lod, ivec2 offset) {
  int level = hydgl2gpu_integer_level(${names.levels}, lod, ${names.mipmapped}, ${names.minLod}, ${names.maxLod});
  ivec2 size = textureSize(tex, level);
  vec2 sampleCoordinate = coordinate;
  if (${names.flipY} != 0) sampleCoordinate.y = 1.0 - sampleCoordinate.y;
  ivec2 texel = ivec2(floor(sampleCoordinate * vec2(size))) + offset;
  texel.x = hydgl2gpu_integer_wrap_index(texel.x, size.x, ${names.wrapS});
  texel.y = hydgl2gpu_integer_wrap_index(texel.y, size.y, ${names.wrapT});
  return texelFetch(tex, texel, level);
}${implicit}`);
    }

    if (shape.dimension === "3D") {
        return bindTextureParameter(`${declarations}

float ${name}_lod(${shape.textureType} tex, vec3 coordinate, vec3 gradientX, vec3 gradientY) {
  vec3 size = vec3(textureSize(tex, 0));
  return log2(max(length(gradientX * size), length(gradientY * size)));
}

${shape.resultType} ${name}(${shape.textureType} tex, vec3 coordinate, float lod, ivec3 offset) {
  int level = hydgl2gpu_integer_level(${names.levels}, lod, ${names.mipmapped}, ${names.minLod}, ${names.maxLod});
  ivec3 size = textureSize(tex, level);
  vec3 sampleCoordinate = coordinate;
  if (${names.flipY} != 0) sampleCoordinate.y = 1.0 - sampleCoordinate.y;
  ivec3 texel = ivec3(floor(sampleCoordinate * vec3(size))) + offset;
  texel.x = hydgl2gpu_integer_wrap_index(texel.x, size.x, ${names.wrapS});
  texel.y = hydgl2gpu_integer_wrap_index(texel.y, size.y, ${names.wrapT});
  texel.z = hydgl2gpu_integer_wrap_index(texel.z, size.z, ${names.wrapR});
  return texelFetch(tex, texel, level);
}${implicit}`);
    }

    if (shape.dimension === "2DArray") {
        return bindTextureParameter(`${declarations}

float ${name}_lod(${shape.textureType} tex, vec3 coordinate, vec2 gradientX, vec2 gradientY) {
  vec2 size = vec2(textureSize(tex, 0).xy);
  return log2(max(length(gradientX * size), length(gradientY * size)));
}

${shape.resultType} ${name}(${shape.textureType} tex, vec3 coordinate, float lod, ivec2 offset) {
  int level = hydgl2gpu_integer_level(${names.levels}, lod, ${names.mipmapped}, ${names.minLod}, ${names.maxLod});
  ivec3 size = textureSize(tex, level);
  vec3 sampleCoordinate = coordinate;
  if (${names.flipY} != 0) sampleCoordinate.y = 1.0 - sampleCoordinate.y;
  ivec2 texel = ivec2(floor(sampleCoordinate.xy * vec2(size.xy))) + offset;
  texel.x = hydgl2gpu_integer_wrap_index(texel.x, size.x, ${names.wrapS});
  texel.y = hydgl2gpu_integer_wrap_index(texel.y, size.y, ${names.wrapT});
  int layer = clamp(int(floor(coordinate.z + 0.5)), 0, size.z - 1);
  return texelFetch(tex, ivec3(texel, layer), level);
}${implicit}`);
    }

    return bindTextureParameter(`${declarations}

vec2 ${name}_face_coordinate(vec3 direction) {
  vec3 magnitude = abs(direction);
  if (magnitude.x >= magnitude.y && magnitude.x >= magnitude.z) {
    return direction.x >= 0.0
      ? vec2(-direction.z, -direction.y) / max(magnitude.x, 1.0e-20) * 0.5 + 0.5
      : vec2(direction.z, -direction.y) / max(magnitude.x, 1.0e-20) * 0.5 + 0.5;
  }
  if (magnitude.y >= magnitude.z) {
    return direction.y >= 0.0
      ? vec2(direction.x, direction.z) / max(magnitude.y, 1.0e-20) * 0.5 + 0.5
      : vec2(direction.x, -direction.z) / max(magnitude.y, 1.0e-20) * 0.5 + 0.5;
  }
  return direction.z >= 0.0
    ? vec2(direction.x, -direction.y) / max(magnitude.z, 1.0e-20) * 0.5 + 0.5
    : vec2(-direction.x, -direction.y) / max(magnitude.z, 1.0e-20) * 0.5 + 0.5;
}

int ${name}_face(vec3 direction) {
  vec3 magnitude = abs(direction);
  if (magnitude.x >= magnitude.y && magnitude.x >= magnitude.z) return direction.x >= 0.0 ? 0 : 1;
  if (magnitude.y >= magnitude.z) return direction.y >= 0.0 ? 2 : 3;
  return direction.z >= 0.0 ? 4 : 5;
}

vec2 ${name}_face_gradient(vec3 direction, vec3 gradient) {
  vec3 magnitude = abs(direction);
  float major;
  float majorGradient;
  vec2 numerator;
  vec2 numeratorGradient;
  if (magnitude.x >= magnitude.y && magnitude.x >= magnitude.z) {
    major = magnitude.x;
    majorGradient = (direction.x >= 0.0 ? 1.0 : -1.0) * gradient.x;
    numerator = direction.x >= 0.0 ? vec2(-direction.z, -direction.y) : vec2(direction.z, -direction.y);
    numeratorGradient = direction.x >= 0.0 ? vec2(-gradient.z, -gradient.y) : vec2(gradient.z, -gradient.y);
  } else if (magnitude.y >= magnitude.z) {
    major = magnitude.y;
    majorGradient = (direction.y >= 0.0 ? 1.0 : -1.0) * gradient.y;
    numerator = direction.y >= 0.0 ? vec2(direction.x, direction.z) : vec2(direction.x, -direction.z);
    numeratorGradient = direction.y >= 0.0 ? vec2(gradient.x, gradient.z) : vec2(gradient.x, -gradient.z);
  } else {
    major = magnitude.z;
    majorGradient = (direction.z >= 0.0 ? 1.0 : -1.0) * gradient.z;
    numerator = direction.z >= 0.0 ? vec2(direction.x, -direction.y) : vec2(-direction.x, -direction.y);
    numeratorGradient = direction.z >= 0.0 ? vec2(gradient.x, -gradient.y) : vec2(-gradient.x, -gradient.y);
  }
  major = max(major, 1.0e-20);
  return (numeratorGradient * major - numerator * majorGradient) / (major * major) * 0.5;
}

float ${name}_lod(${shape.textureType} tex, vec3 coordinate, vec3 gradientX, vec3 gradientY) {
  float size = float(textureSize(tex, 0).x);
  vec2 deltaX = ${name}_face_gradient(coordinate, gradientX) * size;
  vec2 deltaY = ${name}_face_gradient(coordinate, gradientY) * size;
  return log2(max(length(deltaX), length(deltaY)));
}

${shape.resultType} ${name}(${shape.textureType} tex, vec3 coordinate, float lod, ivec2 offset) {
  int level = hydgl2gpu_integer_level(${names.levels}, lod, ${names.mipmapped}, ${names.minLod}, ${names.maxLod});
  ivec3 size = textureSize(tex, level);
  vec3 sampleCoordinate = coordinate;
  if (${names.flipY} != 0) {
    vec3 magnitude = abs(coordinate);
    if (magnitude.x >= magnitude.y && magnitude.x >= magnitude.z) sampleCoordinate.y = -coordinate.y;
    else if (magnitude.y >= magnitude.z) sampleCoordinate.z = -coordinate.z;
    else sampleCoordinate.y = -coordinate.y;
  }
  ivec2 texel = clamp(ivec2(floor(${name}_face_coordinate(sampleCoordinate) * vec2(size.xy))), ivec2(0), size.xy - ivec2(1));
  return texelFetch(tex, ivec3(texel, ${name}_face(sampleCoordinate)), level);
}${implicit}`);
}

export function lowerIntegerTextureSampling(
    source: string,
    samplers: Array<Pick<TextureNameAndType, "name" | "glsl_type">>,
    stage: ShaderStage,
): string {
    let out = source;
    const helpers: string[] = [];
    samplers.forEach((sampler, samplerIndex) => {
        const shape = integerSamplerShape(sampler.glsl_type);
        if (!shape) return;
        const rewritten = rewriteSamplerCalls(out, sampler.name, shape, stage);
        out = rewritten.source;
        if (rewritten.used) {
            helpers.push(integerSamplerHelper(sampler as TextureNameAndType, samplerIndex, shape, stage));
        }
    });
    return helpers.length > 0
        ? `${INTEGER_COMMON_HELPERS}\n\n${helpers.join("\n\n")}\n\n${out}`
        : out;
}
