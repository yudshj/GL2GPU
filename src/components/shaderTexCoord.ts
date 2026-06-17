import type { InitShaderInfoType } from "./shaderDB";
import type { ShaderStage } from "./shaderMetadata";

const TEXCOORD_HELPER = "_hyd_glTexCoordToGpu";
const TEXTURE_SAMPLE_CALL = /\b(textureSample(?:Level|Bias|Grad)?)\s*\(/g;

function findMatchingParen(source: string, openIndex: number): number {
    let depth = 0;
    for (let i = openIndex; i < source.length; i++) {
        const ch = source[i];
        if (ch === "(") {
            depth++;
        } else if (ch === ")") {
            depth--;
            if (depth === 0) {
                return i;
            }
        }
    }
    return -1;
}

function splitTopLevelArguments(source: string): string[] {
    const args: string[] = [];
    let start = 0;
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;

    for (let i = 0; i < source.length; i++) {
        const ch = source[i];
        if (ch === "(") {
            parenDepth++;
        } else if (ch === ")") {
            parenDepth--;
        } else if (ch === "[") {
            bracketDepth++;
        } else if (ch === "]") {
            bracketDepth--;
        } else if (ch === "{") {
            braceDepth++;
        } else if (ch === "}") {
            braceDepth--;
        } else if (ch === "," && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
            args.push(source.slice(start, i));
            start = i + 1;
        }
    }

    args.push(source.slice(start));
    return args;
}

function isTextureArgForSampler(textureArg: string, samplerArg: string, samplerName: string): boolean {
    const texture = textureArg.trim();
    const sampler = samplerArg.trim();
    return (
        (texture === `${samplerName}T` || texture === `${samplerName}_texture`) &&
        (sampler === `${samplerName}S` || sampler === `${samplerName}_sampler`)
    );
}

function isSpriteStyleShader(source: string, metadata: InitShaderInfoType): boolean {
    const names = [
        ...metadata.attributes.map((item) => item.name),
        ...metadata.uniforms.map((item) => item.name),
        ...metadata.samplers.map((item) => item.name),
    ].join(" ");
    const haystack = `${source}\n${names}`.toLowerCase();
    return /sprite_texture|u_texture[0-3]|textureweights|spritetexturesize|spritesperrow|perspriteframeoffset|sprite_tex_transform/.test(haystack);
}

function isTexCoordExpression(expression: string): boolean {
    const compact = expression.replace(/\s+/g, "");
    if (compact.includes(`${TEXCOORD_HELPER}(`)) {
        return false;
    }
    return /(texcoord|tex_coord|\bv_?uv\b|\.uv\b|\buv\b)/i.test(compact);
}

function getIdentifiers(expression: string): string[] {
    return expression.match(/\b[A-Za-z_]\w*\b/g) ?? [];
}

function expressionUsesTexCoord(expression: string, aliases: Set<string>): boolean {
    if (isTexCoordExpression(expression)) {
        return true;
    }
    return getIdentifiers(expression).some((identifier) => aliases.has(identifier));
}

function buildTexCoordAliases(wgsl: string): Set<string> {
    const aliases = new Set<string>();
    const privateVarRegex = /\bvar<private>\s+([A-Za-z_]\w*)\s*:/g;
    for (let match = privateVarRegex.exec(wgsl); match !== null; match = privateVarRegex.exec(wgsl)) {
        if (isTexCoordExpression(match[1])) {
            aliases.add(match[1]);
        }
    }

    let changed = true;
    while (changed) {
        changed = false;

        const declarationRegex = /\b(?:let|var)\s+([A-Za-z_]\w*)(?:\s*:\s*[^=;]+)?\s*=\s*([^;]+);/g;
        for (let match = declarationRegex.exec(wgsl); match !== null; match = declarationRegex.exec(wgsl)) {
            if (!aliases.has(match[1]) && expressionUsesTexCoord(match[2], aliases)) {
                aliases.add(match[1]);
                changed = true;
            }
        }

        const assignmentRegex = /\b([A-Za-z_]\w*)\s*=\s*([^;]+);/g;
        for (let match = assignmentRegex.exec(wgsl); match !== null; match = assignmentRegex.exec(wgsl)) {
            if (!aliases.has(match[1]) && expressionUsesTexCoord(match[2], aliases)) {
                aliases.add(match[1]);
                changed = true;
            }
        }
    }

    return aliases;
}

function addTexCoordHelper(wgsl: string): string {
    if (wgsl.includes(`fn ${TEXCOORD_HELPER}`)) {
        return wgsl;
    }

    const helper = `fn ${TEXCOORD_HELPER}(texCoord: vec2<f32>) -> vec2<f32> {\n    return vec2<f32>(texCoord.x, 1.0 - texCoord.y);\n}\n\n`;
    const fragmentIndex = wgsl.search(/^\s*@fragment\b/m);
    if (fragmentIndex < 0) {
        return helper + wgsl;
    }
    return wgsl.slice(0, fragmentIndex) + helper + wgsl.slice(fragmentIndex);
}

function normalizeFragmentTextureCoordinates(wgsl: string, metadata: InitShaderInfoType, source: string): string {
    const sampler2DNames = metadata.samplers
        .filter((sampler) => sampler.glsl_type === "sampler2D")
        .map((sampler) => sampler.name);
    if (sampler2DNames.length === 0 || isSpriteStyleShader(source, metadata)) {
        return wgsl;
    }

    let changed = false;
    let result = "";
    let cursor = 0;
    const texCoordAliases = buildTexCoordAliases(wgsl);
    TEXTURE_SAMPLE_CALL.lastIndex = 0;

    for (let match = TEXTURE_SAMPLE_CALL.exec(wgsl); match !== null; match = TEXTURE_SAMPLE_CALL.exec(wgsl)) {
        const openParen = TEXTURE_SAMPLE_CALL.lastIndex - 1;
        const closeParen = findMatchingParen(wgsl, openParen);
        if (closeParen < 0) {
            break;
        }

        const args = splitTopLevelArguments(wgsl.slice(openParen + 1, closeParen));
        if (args.length >= 3) {
            const samplerName = sampler2DNames.find((name) => isTextureArgForSampler(args[0], args[1], name));
            if (samplerName && expressionUsesTexCoord(args[2], texCoordAliases)) {
                const rewrittenArgs = args.slice();
                rewrittenArgs[2] = `${TEXCOORD_HELPER}(${args[2].trim()})`;
                result += wgsl.slice(cursor, openParen + 1) + rewrittenArgs.map((arg) => arg.trim()).join(", ") + ")";
                cursor = closeParen + 1;
                changed = true;
            }
        }

        TEXTURE_SAMPLE_CALL.lastIndex = closeParen + 1;
    }

    if (!changed) {
        return wgsl;
    }

    result += wgsl.slice(cursor);
    return addTexCoordHelper(result);
}

function normalizeParticleVertexTexCoord(wgsl: string, metadata: InitShaderInfoType, source: string): string {
    if (
        isSpriteStyleShader(source, metadata) ||
        !/\buvLifeTimeFrameStart\b/.test(source) ||
        !/\boutputTexcoord\b/.test(source) ||
        !/\borientation\b/.test(source)
    ) {
        return wgsl;
    }

    const privateFields = new Set<string>();
    const privateRegex = /\bvar<private>\s+([A-Za-z_]\w*)\s*:\s*vec2[<f\d>]*\s*;/g;
    for (let match = privateRegex.exec(wgsl); match !== null; match = privateRegex.exec(wgsl)) {
        if (/texcoord/i.test(match[1])) {
            privateFields.add(match[1]);
        }
    }
    if (privateFields.size > 0) {
        const assignableFields = Array.from(privateFields).filter((field) => new RegExp(`\\b${field}\\s*=`).test(wgsl));
        if (
            assignableFields.length > 0 &&
            !assignableFields.some((field) => new RegExp(`\\b${field}\\s*\\.\\s*y\\s*=\\s*1\\.0\\s*-`, "i").test(wgsl))
        ) {
            const flips = assignableFields.map((field) => `  ${field}.y = 1.0 - ${field}.y;`).join("\n");
            return wgsl.replace(/\breturn\s*;/, `${flips}\n  return;`);
        }
    }

    const returnMatch = /\breturn\s+([A-Za-z_]\w*)\s*;/.exec(wgsl);
    if (!returnMatch) {
        return wgsl;
    }

    const outputName = returnMatch[1];
    const fieldRegex = new RegExp(`\\b${outputName}\\s*\\.\\s*([A-Za-z_]\\w*)\\s*=`, "g");
    const fields = new Set<string>();
    for (let match = fieldRegex.exec(wgsl); match !== null; match = fieldRegex.exec(wgsl)) {
        if (/texcoord/i.test(match[1])) {
            fields.add(match[1]);
        }
    }
    if (fields.size === 0) {
        return wgsl;
    }

    const existingFlipRegex = new RegExp(`\\b${outputName}\\s*\\.\\s*[A-Za-z_]\\w*\\s*\\.\\s*y\\s*=\\s*1\\.0\\s*-`, "i");
    if (existingFlipRegex.test(wgsl)) {
        return wgsl;
    }

    const flips = Array.from(fields)
        .map((field) => `    ${outputName}.${field}.y = 1.0 - ${outputName}.${field}.y;`)
        .join("\n");
    return wgsl.replace(returnMatch[0], `${flips}\n    ${returnMatch[0]}`);
}

export function normalizeWebGlTextureCoordinates(wgsl: string, metadata: InitShaderInfoType, stage: ShaderStage, source: string): string {
    if (stage === "fragment") {
        return normalizeFragmentTextureCoordinates(wgsl, metadata, source);
    }
    if (stage === "vertex") {
        return normalizeParticleVertexTexCoord(wgsl, metadata, source);
    }
    return wgsl;
}
