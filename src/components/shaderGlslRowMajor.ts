interface AccessSegment {
    name: string;
    storageName: string;
    array: boolean;
}

interface RowMajorAccess {
    segments: AccessSegment[];
}

interface StructField {
    prefix: string;
    type: string;
    name: string;
    arraySuffix: string;
}

interface StructDefinition {
    name: string;
    body: string;
}

interface LoweredStruct {
    name: string;
    declaration: string;
    leaves: AccessSegment[][];
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stableHash(value: string): string {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index++) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36);
}

function transposeMatrixType(type: string): string | null {
    const square = /^mat([234])$/.exec(type);
    if (square) return type;
    const rectangular = /^mat([234])x([234])$/.exec(type);
    return rectangular ? `mat${rectangular[2]}x${rectangular[1]}` : null;
}

function stripLayoutToken(layouts: string, token: string): string {
    return layouts.replace(/layout\s*\(([^)]*)\)\s*/g, (_full, body) => {
        const entries = body.split(",").map((entry: string) => entry.trim()).filter(Boolean);
        const kept = entries.filter((entry: string) => entry !== token);
        return kept.length > 0 ? `layout(${kept.join(", ")}) ` : "";
    });
}

function findMatchingBracket(source: string, openIndex: number): number {
    let depth = 0;
    for (let index = openIndex; index < source.length; index++) {
        if (source[index] === "[") depth++;
        else if (source[index] === "]" && --depth === 0) return index;
    }
    return -1;
}

function parseStructDefinitions(source: string): Map<string, StructDefinition> {
    const definitions = new Map<string, StructDefinition>();
    const pattern = /\bstruct\s+([A-Za-z_]\w*)\s*\{([\s\S]*?)\}\s*;/g;
    for (let match = pattern.exec(source); match !== null; match = pattern.exec(source)) {
        definitions.set(match[1], { name: match[1], body: match[2] });
    }
    return definitions;
}

const FIELD_PATTERN = /((?:(?:layout\s*\([^)]*\)\s*)*)(?:(?:lowp|mediump|highp)\s+)?)([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*((?:\[[^\]]+\]\s*)*)\s*;/g;

function parseStructFields(body: string): StructField[] | null {
    const fields: StructField[] = [];
    let cursor = 0;
    FIELD_PATTERN.lastIndex = 0;
    for (let match = FIELD_PATTERN.exec(body); match !== null; match = FIELD_PATTERN.exec(body)) {
        const between = body.slice(cursor, match.index).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n\r]*/g, "");
        if (between.trim().length > 0) return null;
        fields.push({
            prefix: match[1],
            type: match[2],
            name: match[3],
            arraySuffix: match[4],
        });
        cursor = FIELD_PATTERN.lastIndex;
    }
    const tail = body.slice(cursor).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n\r]*/g, "");
    return fields.length > 0 && tail.trim().length === 0 ? fields : null;
}

function explicitMatrixLayout(prefix: string): "row" | "column" | null {
    if (/\brow_major\b/.test(prefix)) return "row";
    if (/\bcolumn_major\b/.test(prefix)) return "column";
    return null;
}

function withoutMatrixLayout(prefix: string): string {
    return stripLayoutToken(stripLayoutToken(prefix, "row_major"), "column_major");
}

interface GlslFunctionScope {
    bodyStart: number;
    bodyEnd: number;
    parameters: string;
    body: string;
}

function previousNonWhitespace(source: string, index: number): number {
    while (index >= 0 && /\s/.test(source[index])) index--;
    return index;
}

function matchingOpenParen(source: string, closeIndex: number): number {
    let depth = 0;
    for (let index = closeIndex; index >= 0; index--) {
        if (source[index] === ")") depth++;
        else if (source[index] === "(" && --depth === 0) return index;
    }
    return -1;
}

function matchingCloseBrace(source: string, openIndex: number): number {
    let depth = 0;
    for (let index = openIndex; index < source.length; index++) {
        if (source[index] === "{") depth++;
        else if (source[index] === "}" && --depth === 0) return index;
    }
    return -1;
}

function glslFunctionScopes(source: string): GlslFunctionScope[] {
    const scopes: GlslFunctionScope[] = [];
    let braceDepth = 0;
    for (let index = 0; index < source.length; index++) {
        if (source[index] === "}") {
            braceDepth = Math.max(0, braceDepth - 1);
            continue;
        }
        if (source[index] !== "{") continue;
        if (braceDepth !== 0) {
            braceDepth++;
            continue;
        }
        const closeParen = previousNonWhitespace(source, index - 1);
        if (source[closeParen] !== ")") {
            braceDepth++;
            continue;
        }
        const openParen = matchingOpenParen(source, closeParen);
        const nameEnd = previousNonWhitespace(source, openParen - 1);
        let nameStart = nameEnd;
        while (nameStart >= 0 && /[A-Za-z0-9_]/.test(source[nameStart])) nameStart--;
        const name = source.slice(nameStart + 1, nameEnd + 1);
        if (openParen < 0 || !/^[A-Za-z_]\w*$/.test(name)) {
            braceDepth++;
            continue;
        }
        const bodyEnd = matchingCloseBrace(source, index);
        if (bodyEnd < 0) break;
        scopes.push({
            bodyStart: index + 1,
            bodyEnd,
            parameters: source.slice(openParen + 1, closeParen),
            body: source.slice(index + 1, bodyEnd),
        });
        index = bodyEnd;
    }
    return scopes;
}

function functionShadowsName(scope: GlslFunctionScope, name: string): boolean {
    const escaped = escapeRegExp(name);
    const qualifiers = "(?:(?:const|in|out|inout|lowp|mediump|highp|precise|readonly|writeonly|coherent|volatile|restrict)\\s+)*";
    const declaration = new RegExp(
        `(?:^|[,;{(])\\s*${qualifiers}[A-Za-z_]\\w*\\s+${escaped}\\b`,
    );
    return declaration.test(scope.parameters) || declaration.test(scope.body);
}

function matchAccess(
    source: string,
    start: number,
    access: RowMajorAccess,
): { end: number, storage: string } | null {
    let cursor = start;
    let copiedThrough = start;
    let storage = "";
    for (let index = 0; index < access.segments.length; index++) {
        const segment = access.segments[index];
        if (index > 0) {
            while (/\s/.test(source[cursor] || "")) cursor++;
            if (source[cursor] !== ".") return null;
            cursor++;
            while (/\s/.test(source[cursor] || "")) cursor++;
        }
        if (source.slice(cursor, cursor + segment.name.length) !== segment.name ||
            /[A-Za-z0-9_]/.test(source[cursor + segment.name.length] || "")) {
            return null;
        }
        const nameStart = cursor;
        cursor += segment.name.length;
        storage += source.slice(copiedThrough, nameStart) + segment.storageName;
        copiedThrough = cursor;
        if (segment.array) {
            while (/\s/.test(source[cursor] || "")) cursor++;
            if (source[cursor] !== "[") return null;
            const close = findMatchingBracket(source, cursor);
            if (close < 0) return null;
            cursor = close + 1;
        }
    }
    storage += source.slice(copiedThrough, cursor);
    return { end: cursor, storage };
}

function rewriteAccesses(source: string, accesses: RowMajorAccess[]): string {
    let out = source;
    for (const access of accesses) {
        const scopes = glslFunctionScopes(out);
        const replacements: Array<{ start: number, end: number, value: string }> = [];
        const root = access.segments[0].name;
        const pattern = new RegExp(`\\b${escapeRegExp(root)}\\b`, "g");
        for (let match = pattern.exec(out); match !== null; match = pattern.exec(out)) {
            const scope = scopes.find((candidate) =>
                match.index >= candidate.bodyStart && match.index < candidate.bodyEnd);
            if (!scope || functionShadowsName(scope, root)) continue;
            if (access.segments.length === 1) {
                const previous = previousNonWhitespace(out, match.index - 1);
                if (out[previous] === ".") continue;
                let next = pattern.lastIndex;
                while (/\s/.test(out[next] || "")) next++;
                if (out[next] === "(") continue;
            }
            const matched = matchAccess(out, match.index, access);
            if (!matched) continue;
            replacements.push({
                start: match.index,
                end: matched.end,
                value: `transpose(${matched.storage})`,
            });
        }
        const unique = new Map<string, { start: number, end: number, value: string }>();
        for (const replacement of replacements) unique.set(`${replacement.start}:${replacement.end}`, replacement);
        for (const replacement of [...unique.values()].sort((left, right) => right.start - left.start)) {
            out = out.slice(0, replacement.start) + replacement.value + out.slice(replacement.end);
        }
    }
    return out;
}

function appendPath(prefix: AccessSegment[], suffix: AccessSegment[]): AccessSegment[] {
    return [...prefix, ...suffix.map((segment) => ({ ...segment }))];
}

/**
 * Represent row-major matrices as transposed column-major storage. A row-major
 * matCxR and a column-major matRxC have the same std140 byte layout; wrapping
 * each read in transpose() restores the original GLSL value for WGSL/Tint.
 */
export function lowerRowMajorUniformBlocks(source: string): string {
    const blockPattern = /((?:(?:layout\s*\([^)]*\)\s*)*)uniform\s+([A-Za-z_]\w*)\s*\{)([\s\S]*?)(\}\s*([A-Za-z_]\w*)?\s*;)/g;
    const definitions = parseStructDefinitions(source);
    const accesses: RowMajorAccess[] = [];
    const generatedDeclarations: string[] = [];
    const generatedNames = new Set<string>();
    let result = "";
    let cursor = 0;
    for (let block = blockPattern.exec(source); block !== null; block = blockPattern.exec(source)) {
        const blockLayouts = block[1].slice(0, block[1].lastIndexOf("uniform"));
        const defaultRowMajor = /\brow_major\b/.test(blockLayouts);
        const instance = block[5] || "";
        const cloneCache = new Map<string, LoweredStruct>();
        const cloning = new Set<string>();

        const lowerStruct = (type: string, context: string): LoweredStruct | null => {
            const cacheKey = `${type}:${context}`;
            const cached = cloneCache.get(cacheKey);
            if (cached) return cached;
            if (cloning.has(cacheKey)) return null;
            const definition = definitions.get(type);
            const fields = definition ? parseStructFields(definition.body) : null;
            if (!definition || !fields) return null;
            cloning.add(cacheKey);
            const leaves: AccessSegment[][] = [];
            let failed = false;
            FIELD_PATTERN.lastIndex = 0;
            const body = definition.body.replace(FIELD_PATTERN, (full, prefix, fieldType, name, arraySuffix) => {
                const layout = explicitMatrixLayout(prefix);
                const rowMajor = layout !== "column";
                const matrixStorageType = rowMajor ? transposeMatrixType(fieldType) : null;
                if (matrixStorageType) {
                    const storageName = `_hyd_rm_${name}_${stableHash(`${block[2]}.${type}.${name}`)}`;
                    leaves.push([{
                        name,
                        storageName,
                        array: arraySuffix.trim().length > 0,
                    }]);
                    return `${withoutMatrixLayout(prefix)}${matrixStorageType} ${storageName}${arraySuffix};`;
                }
                if (definitions.has(fieldType) && rowMajor) {
                    const nested = lowerStruct(fieldType, `${context}.${name}`);
                    if (!nested) {
                        failed = true;
                        return full;
                    }
                    const segment: AccessSegment = {
                        name,
                        storageName: name,
                        array: arraySuffix.trim().length > 0,
                    };
                    for (const leaf of nested.leaves) leaves.push(appendPath([segment], leaf));
                    return `${withoutMatrixLayout(prefix)}${nested.name} ${name}${arraySuffix};`;
                }
                return layout ? `${withoutMatrixLayout(prefix)}${fieldType} ${name}${arraySuffix};` : full;
            });
            cloning.delete(cacheKey);
            if (failed) return null;
            const cloneName = `_hyd_rm_struct_${type}_${stableHash(`${block[2]}.${type}`)}`;
            const lowered = { name: cloneName, declaration: `struct ${cloneName} {${body}};`, leaves };
            cloneCache.set(cacheKey, lowered);
            if (!generatedNames.has(cloneName)) {
                generatedNames.add(cloneName);
                generatedDeclarations.push(lowered.declaration);
            }
            return lowered;
        };

        let failed = false;
        FIELD_PATTERN.lastIndex = 0;
        const body = block[3].replace(FIELD_PATTERN, (full, prefix, type, name, arraySuffix) => {
            const layout = explicitMatrixLayout(prefix);
            const memberRowMajor = layout === "row" || (defaultRowMajor && layout !== "column");
            const root: AccessSegment[] = instance
                ? [
                    { name: instance, storageName: instance, array: false },
                    { name, storageName: name, array: arraySuffix.trim().length > 0 },
                ]
                : [{ name, storageName: name, array: arraySuffix.trim().length > 0 }];
            if (memberRowMajor) {
                const storageType = transposeMatrixType(type);
                if (storageType) {
                    const storageName = `_hyd_rm_${name}_${stableHash(`${block[2]}.${name}`)}`;
                    root[root.length - 1].storageName = storageName;
                    accesses.push({ segments: root });
                    return `${withoutMatrixLayout(prefix)}${storageType} ${storageName}${arraySuffix};`;
                }
                if (definitions.has(type)) {
                    const lowered = lowerStruct(type, `${block[2]}.${name}`);
                    if (!lowered) {
                        failed = true;
                        return full;
                    }
                    for (const leaf of lowered.leaves) accesses.push({ segments: appendPath(root, leaf) });
                    return `${withoutMatrixLayout(prefix)}${lowered.name} ${name}${arraySuffix};`;
                }
            }
            return layout ? `${withoutMatrixLayout(prefix)}${type} ${name}${arraySuffix};` : full;
        });
        if (failed) continue;
        const header = defaultRowMajor
            ? stripLayoutToken(block[1], "row_major")
            : block[1];
        const declarations = generatedDeclarations.splice(0).join("\n");
        result += source.slice(cursor, block.index) + (declarations ? `${declarations}\n` : "") + header + body + block[4];
        cursor = blockPattern.lastIndex;
    }
    if (cursor === 0 || accesses.length === 0) return source;
    return rewriteAccesses(result + source.slice(cursor), accesses);
}
