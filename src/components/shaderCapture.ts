import fastHashCode from "fast-hash-code";

import type { ShaderStage } from "./shaderMetadata";

export interface ShaderShapeStats {
    bytes: number;
    lines: number;
    varPrivate: number;
    varFunction: number;
    varUniform: number;
    functions: number;
    entrypoints: number;
    structs: number;
    bindings: number;
    locations: number;
    lets: number;
    tempLets: number;
    assignments: number;
    storeLikeAssignments: number;
    vectorConstructors: number;
    matrixConstructors: number;
    swizzles: number;
    textureSample: number;
    textureSampleLevel: number;
    textureSampleBias: number;
    textureSampleGrad: number;
    textureLoad: number;
    selects: number;
    ifs: number;
    loops: number;
    powCalls: number;
    sinCalls: number;
    cosCalls: number;
    pointerLike: number;
}

export interface ShaderSourceCapture {
    code: string;
    hash: string;
    stats?: ShaderShapeStats;
}

export interface ShaderCaptureRecord {
    kind: "shader-stage" | "shader-final" | "shader-failure";
    stage: ShaderStage;
    shaderId: string;
    programId?: string;
    source: "runtime" | "cache" | "manual" | string;
    optimizer?: unknown;
    timingsMs?: Record<string, number>;
    compatibilityFallbacks?: string[];
    glsl?: ShaderSourceCapture;
    normalizedGlsl?: ShaderSourceCapture;
    spirv?: {
        hash: string;
        wordCount: number;
        byteLength: number;
    };
    tintWgsl?: ShaderSourceCapture;
    normalizedWgsl?: ShaderSourceCapture;
    postProcessWgsl?: ShaderSourceCapture;
    finalWgsl?: ShaderSourceCapture;
    diagnostics?: string[];
}

declare global {
    interface Window {
        __HYD_SHADER_CAPTURE?: (record: ShaderCaptureRecord) => void;
    }
}

function countMatches(source: string, pattern: RegExp): number {
    pattern.lastIndex = 0;
    let count = 0;
    while (pattern.exec(source) !== null) {
        count++;
    }
    return count;
}

export function stableHashString(source: string): string {
    return fastHashCode(source).toString();
}

export function stableHashU32(words: Uint32Array): string {
    let hash = 2166136261;
    for (let i = 0; i < words.length; i++) {
        let word = words[i] >>> 0;
        for (let j = 0; j < 4; j++) {
            hash ^= word & 0xff;
            hash = Math.imul(hash, 16777619) >>> 0;
            word >>>= 8;
        }
    }
    return hash.toString(16).padStart(8, "0");
}

export function sourceCapture(code: string, includeStats: boolean = true): ShaderSourceCapture {
    return {
        code,
        hash: stableHashString(code),
        stats: includeStats ? computeShaderShapeStats(code) : undefined,
    };
}

export function computeShaderShapeStats(source: string): ShaderShapeStats {
    const lines = source.length === 0 ? 0 : source.split(/\r\n|\r|\n/).length;
    return {
        bytes: source.length,
        lines,
        varPrivate: countMatches(source, /\bvar<\s*private\s*>/g),
        varFunction: countMatches(source, /\bvar<\s*function\s*>/g),
        varUniform: countMatches(source, /\bvar<\s*uniform\s*>/g),
        functions: countMatches(source, /\bfn\s+[A-Za-z_]\w*\s*\(/g),
        entrypoints: countMatches(source, /@(vertex|fragment|compute)\b/g),
        structs: countMatches(source, /\bstruct\s+[A-Za-z_]\w*\s*\{/g),
        bindings: countMatches(source, /@binding\s*\(/g),
        locations: countMatches(source, /@location\s*\(/g),
        lets: countMatches(source, /\blet\s+[A-Za-z_]\w*\b/g),
        tempLets: countMatches(source, /\blet\s+x_\d+\b/g),
        assignments: countMatches(source, /(?:^|[;\n]\s*)[A-Za-z_]\w*(?:\s*(?:\.|->)\s*[A-Za-z_]\w*|\s*\[[^\]]+\])*\s*=(?!=)/g),
        storeLikeAssignments: countMatches(source, /(?:^|[;\n]\s*)(?:[A-Za-z_]\w*(?:\s*(?:\.|->)\s*[A-Za-z_]\w*|\s*\[[^\]]+\])*)\s*=(?!=)/g),
        vectorConstructors: countMatches(source, /\bvec[234](?:[fiu]|<[^>]+>)?\s*\(/g),
        matrixConstructors: countMatches(source, /\bmat[234](?:x[234])?(?:<[^>]+>)?\s*\(/g),
        swizzles: countMatches(source, /\.\s*[xyzwrgba]{1,4}\b/g),
        textureSample: countMatches(source, /\btextureSample\s*\(/g),
        textureSampleLevel: countMatches(source, /\btextureSampleLevel\s*\(/g),
        textureSampleBias: countMatches(source, /\btextureSampleBias\s*\(/g),
        textureSampleGrad: countMatches(source, /\btextureSampleGrad\s*\(/g),
        textureLoad: countMatches(source, /\btextureLoad\s*\(/g),
        selects: countMatches(source, /\bselect\s*\(/g),
        ifs: countMatches(source, /\bif\s*\(/g),
        loops: countMatches(source, /\b(for|while|loop)\b/g),
        powCalls: countMatches(source, /\bpow\s*\(/g),
        sinCalls: countMatches(source, /\bsin\s*\(/g),
        cosCalls: countMatches(source, /\bcos\s*\(/g),
        pointerLike: countMatches(source, /\bptr\s*</g) + countMatches(source, /(?:^|[^\w])&\s*[A-Za-z_]\w*/g),
    };
}

export function emitShaderCapture(record: ShaderCaptureRecord): void {
    if (typeof window === "undefined" || typeof window.__HYD_SHADER_CAPTURE !== "function") {
        return;
    }
    try {
        window.__HYD_SHADER_CAPTURE(record);
    } catch (error) {
        console.warn("[HYD] shader capture hook failed:", error);
    }
}
