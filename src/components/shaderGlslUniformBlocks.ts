export interface GlslUniformBlockDeclaration {
    blockName: string;
    instanceName?: string;
    arraySize: number;
    isArray: boolean;
    uniformOffset: number;
    declarationEnd: number;
    bodyStart: number;
    bodyEnd: number;
}

interface GlslToken {
    value: string;
    start: number;
    end: number;
}

function tokenizeTopLevelGlsl(source: string): GlslToken[] {
    const tokens: GlslToken[] = [];
    let lineStart = true;
    for (let index = 0; index < source.length;) {
        const ch = source[index];
        const next = source[index + 1];
        if (ch === "\n" || ch === "\r") {
            lineStart = true;
            index++;
            continue;
        }
        if (/\s/.test(ch)) {
            index++;
            continue;
        }
        if (lineStart && ch === "#") {
            index++;
            while (index < source.length) {
                if (source[index] === "\n" && source[index - 1] !== "\\") break;
                index++;
            }
            continue;
        }
        lineStart = false;
        if (ch === "/" && next === "/") {
            index += 2;
            while (index < source.length && source[index] !== "\n") index++;
            continue;
        }
        if (ch === "/" && next === "*") {
            index += 2;
            while (index + 1 < source.length && !(source[index] === "*" && source[index + 1] === "/")) index++;
            index = Math.min(source.length, index + 2);
            continue;
        }
        if (/[A-Za-z_]/.test(ch)) {
            const start = index++;
            while (index < source.length && /[A-Za-z0-9_]/.test(source[index])) index++;
            tokens.push({ value: source.slice(start, index), start, end: index });
            continue;
        }
        if (/[0-9]/.test(ch)) {
            const start = index++;
            while (index < source.length && /[A-Za-z0-9_.]/.test(source[index])) index++;
            tokens.push({ value: source.slice(start, index), start, end: index });
            continue;
        }
        tokens.push({ value: ch, start: index, end: index + 1 });
        index++;
    }
    return tokens;
}

export function scanGlslUniformBlocks(source: string): GlslUniformBlockDeclaration[] {
    const tokens = tokenizeTopLevelGlsl(source);
    const blocks: GlslUniformBlockDeclaration[] = [];
    let braceDepth = 0;
    for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];
        if (token.value === "{") {
            braceDepth++;
            continue;
        }
        if (token.value === "}") {
            braceDepth = Math.max(0, braceDepth - 1);
            continue;
        }
        if (braceDepth !== 0 || token.value !== "uniform") continue;
        const name = tokens[index + 1];
        const open = tokens[index + 2];
        if (!name || !/^[A-Za-z_]\w*$/.test(name.value) || open?.value !== "{") continue;

        let blockDepth = 1;
        let cursor = index + 3;
        while (cursor < tokens.length && blockDepth > 0) {
            if (tokens[cursor].value === "{") blockDepth++;
            else if (tokens[cursor].value === "}") blockDepth--;
            cursor++;
        }
        if (blockDepth !== 0) continue;
        const close = tokens[cursor - 1];

        let instanceName: string | undefined;
        let arraySize = 1;
        let isArray = false;
        if (tokens[cursor] && /^[A-Za-z_]\w*$/.test(tokens[cursor].value)) {
            instanceName = tokens[cursor].value;
            cursor++;
        }
        if (tokens[cursor]?.value === "[") {
            isArray = true;
            const sizeToken = tokens[cursor + 1];
            const parsedSize = sizeToken && /^\d+$/.test(sizeToken.value) ? Number(sizeToken.value) : 0;
            arraySize = parsedSize > 0 ? parsedSize : 0;
            while (cursor < tokens.length && tokens[cursor].value !== "]") cursor++;
            if (tokens[cursor]?.value === "]") cursor++;
        }
        while (cursor < tokens.length && tokens[cursor].value !== ";") cursor++;
        if (tokens[cursor]?.value !== ";") continue;
        blocks.push({
            blockName: name.value,
            instanceName,
            arraySize,
            isArray,
            uniformOffset: token.start,
            declarationEnd: tokens[cursor].end,
            bodyStart: open.end,
            bodyEnd: close.start,
        });
        index = cursor;
    }
    return blocks;
}

function blockArrayResourceName(blockName: string, index: number): string {
    return `${blockName}[${index}]`;
}

function loweredBlockInstanceName(instanceName: string, index: number): string {
    return `hydgl2gpu_ubo_${instanceName}_${index}`;
}

function replaceStaticBlockArrayAccesses(
    source: string,
    instanceName: string,
    arraySize: number,
): string {
    const tokens = tokenizeTopLevelGlsl(source);
    const replacements: Array<{ start: number, end: number, value: string }> = [];
    for (let index = 0; index + 3 < tokens.length; index++) {
        if (tokens[index].value !== instanceName || tokens[index + 1].value !== "[" ||
            !/^\d+$/.test(tokens[index + 2].value) || tokens[index + 3].value !== "]") continue;
        const element = Number(tokens[index + 2].value);
        if (element < 0 || element >= arraySize) continue;
        replacements.push({
            start: tokens[index].start,
            end: tokens[index + 3].end,
            value: loweredBlockInstanceName(instanceName, element),
        });
        index += 3;
    }
    let out = source;
    for (const replacement of replacements.sort((left, right) => right.start - left.start)) {
        out = out.slice(0, replacement.start) + replacement.value + out.slice(replacement.end);
    }
    return out;
}

export function lowerGlslUniformBlockArrays(
    source: string,
    bindings: ReadonlyMap<string, number>,
): string {
    const arrays = scanGlslUniformBlocks(source)
        .filter((block) => block.isArray && block.arraySize > 0 && block.instanceName)
        .sort((left, right) => right.uniformOffset - left.uniformOffset);
    let out = source;
    const loweredArrays: Array<{ instanceName: string, arraySize: number }> = [];
    for (const block of arrays) {
        const body = source.slice(block.bodyStart, block.bodyEnd);
        const prefix = source.slice(0, block.uniformOffset).match(/(layout\s*\([^)]*\)\s*)+$/)?.[0] || "";
        const declarations: string[] = [];
        for (let index = 0; index < block.arraySize; index++) {
            const binding = bindings.get(blockArrayResourceName(block.blockName, index)) ??
                (block.arraySize === 1 ? bindings.get(block.blockName) : undefined);
            if (binding === undefined) continue;
            const repeatedLayout = index === 0 ? "" : prefix;
            declarations.push(
                `${repeatedLayout}layout(set = 0, binding = ${binding}) uniform ` +
                `hydgl2gpu_ubo_block_${block.blockName}_${index} {${body}} ` +
                `${loweredBlockInstanceName(block.instanceName!, index)};`,
            );
        }
        out = out.slice(0, block.uniformOffset) + declarations.join("\n") + out.slice(block.declarationEnd);
        loweredArrays.push({ instanceName: block.instanceName!, arraySize: block.arraySize });
    }
    for (const array of loweredArrays) {
        out = replaceStaticBlockArrayAccesses(out, array.instanceName, array.arraySize);
    }
    return out;
}

export function injectGlslUniformBlockBindings(
    source: string,
    bindings: ReadonlyMap<string, number>,
): string {
    const lowered = lowerGlslUniformBlockArrays(source, bindings);
    const insertions = scanGlslUniformBlocks(lowered)
        .filter((block) => !block.isArray)
        .map((block) => ({ block, binding: bindings.get(block.blockName) }))
        .filter((entry): entry is { block: GlslUniformBlockDeclaration, binding: number } => entry.binding !== undefined)
        .sort((left, right) => right.block.uniformOffset - left.block.uniformOffset);
    let out = lowered;
    for (const { block, binding } of insertions) {
        out = out.slice(0, block.uniformOffset) +
            `layout(set = 0, binding = ${binding}) ` +
            out.slice(block.uniformOffset);
    }
    return out;
}
