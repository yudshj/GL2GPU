import type { NameAndType } from "./shaderDB";

export interface GlslMatrixDimensions {
    columns: number;
    rows: number;
}

export function glslMatrixDimensions(glslType: string): GlslMatrixDimensions | null {
    const square = /^mat([234])$/.exec(glslType);
    if (square) {
        const size = Number(square[1]);
        return { columns: size, rows: size };
    }
    const rectangular = /^mat([234])x([234])$/.exec(glslType);
    return rectangular ? { columns: Number(rectangular[1]), rows: Number(rectangular[2]) } : null;
}

function matrixArrayLoaderName(name: string): string {
    return `_hyd_load_matrix_array_${name}`;
}

export function matrixArrayStorageDeclaration(uniform: NameAndType): string | null {
    const dimensions = glslMatrixDimensions(uniform.glsl_type);
    const size = uniform.size || 1;
    if (!dimensions || !uniform.is_array) return null;
    return `vec${dimensions.rows} ${uniform.name}[${size * dimensions.columns}];`;
}

export function makeMatrixArrayLoaders(uniforms: NameAndType[]): string[] {
    const loaders: string[] = [];
    for (const uniform of uniforms) {
        const dimensions = glslMatrixDimensions(uniform.glsl_type);
        if (!dimensions || !uniform.is_array) continue;
        const columns: string[] = [];
        for (let column = 0; column < dimensions.columns; column++) {
            columns.push(`${uniform.name}[(index * ${dimensions.columns}) + ${column}]`);
        }
        loaders.push([
            `${uniform.glsl_type} ${matrixArrayLoaderName(uniform.name)}(int index) {`,
            `  return ${uniform.glsl_type}(${columns.join(", ")});`,
            "}",
        ].join("\n"));
    }
    return loaders;
}

function findMatchingBracket(source: string, openIndex: number): number {
    let depth = 0;
    let lineComment = false;
    let blockComment = false;
    for (let i = openIndex; i < source.length; i++) {
        const ch = source[i];
        const next = source[i + 1];
        if (lineComment) {
            if (ch === "\n") lineComment = false;
            continue;
        }
        if (blockComment) {
            if (ch === "*" && next === "/") {
                blockComment = false;
                i++;
            }
            continue;
        }
        if (ch === "/" && next === "/") {
            lineComment = true;
            i++;
            continue;
        }
        if (ch === "/" && next === "*") {
            blockComment = true;
            i++;
            continue;
        }
        if (ch === "[") {
            depth++;
        } else if (ch === "]") {
            depth--;
            if (depth === 0) return i;
        }
    }
    return -1;
}

function rewriteMatrixArrayUniform(source: string, uniform: NameAndType): string {
    const size = uniform.size || 1;
    const name = uniform.name;
    const loader = matrixArrayLoaderName(name);
    let out = "";
    let cursor = 0;
    let index = 0;
    let lineComment = false;
    let blockComment = false;
    while (index < source.length) {
        const ch = source[index];
        const next = source[index + 1];
        if (lineComment) {
            if (ch === "\n") lineComment = false;
            index++;
            continue;
        }
        if (blockComment) {
            if (ch === "*" && next === "/") {
                blockComment = false;
                index += 2;
            } else {
                index++;
            }
            continue;
        }
        if (ch === "/" && next === "/") {
            lineComment = true;
            index += 2;
            continue;
        }
        if (ch === "/" && next === "*") {
            blockComment = true;
            index += 2;
            continue;
        }
        if (source.startsWith(name, index) &&
            (index === 0 || !/[A-Za-z0-9_]/.test(source[index - 1])) &&
            !/[A-Za-z0-9_]/.test(source[index + name.length] || "")) {
            let suffix = index + name.length;
            while (/\s/.test(source[suffix] || "")) suffix++;
            if (source[suffix] === "[") {
                const close = findMatchingBracket(source, suffix);
                if (close < 0) throw new Error(`unterminated matrix array access for ${name}`);
                const expression = source.slice(suffix + 1, close).trim();
                if (!expression) throw new Error(`empty matrix array index for ${name}`);
                out += source.slice(cursor, index) + `${loader}(int(${expression}))`;
                cursor = close + 1;
                index = cursor;
                continue;
            }
            const lengthCall = source.slice(suffix).match(/^\.\s*length\s*\(\s*\)/);
            if (lengthCall) {
                out += source.slice(cursor, index) + `${size}`;
                cursor = suffix + lengthCall[0].length;
                index = cursor;
                continue;
            }
            if (source[suffix] === ";") {
                let previous = index - 1;
                while (previous >= 0 && /\s/.test(source[previous])) previous--;
                if (previous < 0 || source[previous] === ";" || source[previous] === "{" || source[previous] === "}") {
                    out += source.slice(cursor, index);
                    cursor = suffix;
                    index = cursor;
                    continue;
                }
            }
            throw new Error(`unsupported whole-array use of matrix uniform ${name}`);
        }
        index++;
    }
    return out + source.slice(cursor);
}

export function rewriteMatrixArrayUniformReads(source: string, uniforms: NameAndType[]): string {
    let out = source;
    for (const uniform of uniforms) {
        if (glslMatrixDimensions(uniform.glsl_type) && uniform.is_array) {
            out = rewriteMatrixArrayUniform(out, uniform);
        }
    }
    return out;
}
