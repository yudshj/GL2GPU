const VALUE_TYPES = new Set([
    "float", "int", "uint", "bool",
    "vec2", "vec3", "vec4", "ivec2", "ivec3", "ivec4", "uvec2", "uvec3", "uvec4",
    "bvec2", "bvec3", "bvec4",
    "mat2", "mat3", "mat4", "mat2x2", "mat2x3", "mat2x4", "mat3x2", "mat3x3", "mat3x4",
    "mat4x2", "mat4x3", "mat4x4",
]);

interface StructField {
    name: string;
    glslType: string;
    size: number;
    isArray: boolean;
}

interface StructDefinition {
    name: string;
    fields: StructField[];
}

export interface ValueStructUniformLeaf {
    rootName: string;
    sourceName: string;
    name: string;
    glslType: string;
    size: number;
    isArray: boolean;
}

export interface ValueStructUniformRoot {
    name: string;
    glslType: string;
    size: number;
    isArray: boolean;
    aggregateRead: boolean;
}

export interface ValueStructUniformPlan {
    definitions: Map<string, StructDefinition>;
    roots: ValueStructUniformRoot[];
    leaves: ValueStructUniformLeaf[];
    aggregates: Array<{ sourceName: string, glslType: string }>;
}

export interface DynamicStructUniformRewrite {
    source: string;
    helpers: string[];
}

function integerDefines(source: string): Map<string, number> {
    const defines = new Map<string, number>();
    const pattern = /^\s*#define\s+([A-Za-z_]\w*)\s+(\d+)\s*$/gm;
    for (let match = pattern.exec(source); match !== null; match = pattern.exec(source)) {
        defines.set(match[1], Math.max(1, Number(match[2])));
    }
    return defines;
}

function arrayInfo(rawName: string, defines: Map<string, number>): { name: string, size: number, isArray: boolean } {
    const compact = rawName.replace(/\s+/g, "");
    const match = /^([A-Za-z_]\w*)(?:\[([A-Za-z_]\w*|\d+)\])?$/.exec(compact);
    if (!match) return { name: compact, size: 1, isArray: false };
    const size = match[2]
        ? (/^\d+$/.test(match[2]) ? Math.max(1, Number(match[2])) : defines.get(match[2]) || 1)
        : 1;
    return { name: match[1], size, isArray: !!match[2] };
}

function stableHash(value: string): string {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index++) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36);
}

function internalLeafName(sourceName: string): string {
    const readable = sourceName.replace(/[^A-Za-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    // Flattened paths may originate from a legal 1024-character WebGL uniform
    // location. Bound the generated Vulkan GLSL identifier and retain the hash
    // as the collision-resistant identity.
    return `hydgl2gpu_uniform_${readable.slice(0, 96)}_${stableHash(sourceName)}`;
}

interface InlineInterfaceField {
    type: string;
    name: string;
    arraySuffix: string;
}

function parseInlineInterfaceFields(body: string): InlineInterfaceField[] | null {
    const fields: InlineInterfaceField[] = [];
    const fieldPattern = /(?:^|;)\s*(?:(?:lowp|mediump|highp)\s+)?([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*((?:\[[^\]]+\]\s*)*)\s*(?=;|$)/g;
    let cursor = 0;
    for (let match = fieldPattern.exec(body); match !== null; match = fieldPattern.exec(body)) {
        if (body.slice(cursor, match.index).replace(/^\s*;?\s*/, "").trim().length > 0) return null;
        fields.push({ type: match[1], name: match[2], arraySuffix: match[3].replace(/\s+/g, "") });
        cursor = fieldPattern.lastIndex;
    }
    if (body.slice(cursor).replace(/^\s*;?\s*/, "").trim().length > 0) return null;
    return fields.length > 0 ? fields : null;
}

/**
 * Lower WebGL inline struct interface declarations to ordinary interface
 * fields. Generated names are stage-independent, so separately translated
 * vertex and fragment shaders retain identical linkage.
 */
export function lowerInlineInterfaceStructs(source: string): string {
    const declaration = /\b((?:(?:flat|smooth|noperspective|centroid|sample)\s+)*)(attribute|varying|in|out)\s+(?:(?:lowp|mediump|highp)\s+)?struct\s+([A-Za-z_]\w*)\s*\{([\s\S]*?)\}\s*([A-Za-z_]\w*)\s*;/g;
    const replacements: Array<{ instance: string, field: string, name: string }> = [];
    let out = source.replace(declaration, (full, interpolation, qualifier, structName, body, instance, offset) => {
        if (!isTopLevelAt(source, offset)) return full;
        const fields = parseInlineInterfaceFields(body);
        if (!fields) return full;
        const structDefinition = `struct ${structName} {${body}};`;
        const declarations = fields.map((field) => {
            const name = `hydgl2gpu_io_${instance}_${field.name}_${stableHash(`${instance}.${field.name}`)}`;
            replacements.push({ instance, field: field.name, name });
            return `${interpolation || ""}${qualifier} ${field.type} ${name}${field.arraySuffix};`;
        });
        return `${structDefinition}\n${declarations.join("\n")}`;
    });
    const definitions = parseDefinitions(out, integerDefines(out));
    const namedDeclaration = /\b((?:(?:flat|smooth|noperspective|centroid|sample)\s+)*)(attribute|varying|in|out)\s+(?:(?:lowp|mediump|highp)\s+)?([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*;/g;
    out = out.replace(namedDeclaration, (full, interpolation, qualifier, structType, instance, offset) => {
        if (!isTopLevelAt(out, offset) || !definitions.has(structType)) return full;
        const declarations: string[] = [];
        const flatten = (type: string, sourcePath: string, generatedPath: string, arraySuffix: string = "") => {
            if (VALUE_TYPES.has(type)) {
                const name = `hydgl2gpu_io_${generatedPath}_${stableHash(sourcePath)}`;
                replacements.push({ instance, field: sourcePath.slice(instance.length + 1), name });
                declarations.push(`${interpolation || ""}${qualifier} ${type} ${name}${arraySuffix};`);
                return;
            }
            const definition = definitions.get(type);
            if (!definition || arraySuffix) return;
            for (const field of definition.fields) {
                flatten(
                    field.glslType,
                    `${sourcePath}.${field.name}`,
                    `${generatedPath}_${field.name}`,
                    field.isArray ? `[${field.size}]` : "",
                );
            }
        };
        flatten(structType, instance, instance);
        return declarations.length > 0 ? declarations.join("\n") : full;
    });
    for (const replacement of replacements.sort((left, right) => right.field.length - left.field.length)) {
        out = out.replace(
            new RegExp(`\\b${escapeRegExp(replacement.instance)}\\s*\\.\\s*${escapeRegExp(replacement.field)}\\b`, "g"),
            replacement.name,
        );
    }
    return out;
}

function isTopLevelAt(source: string, index: number): boolean {
    let depth = 0;
    for (let cursor = 0; cursor < index; cursor++) {
        if (source[cursor] === "{") depth++;
        else if (source[cursor] === "}") depth--;
    }
    return depth === 0;
}

export function normalizeAnonymousUniformStructs(source: string): string {
    let index = 0;
    return source.replace(
        /\buniform\s+struct(?:\s+([A-Za-z_]\w*))?\s*\{([\s\S]*?)\}\s*([A-Za-z_]\w*(?:\s*\[[^\]]+\])?)\s*;/g,
        (_full, declaredTypeName, fields, rawName) => {
            const typeName = declaredTypeName || `hydgl2gpu_anon_uniform_${index++}`;
            return `struct ${typeName} {${fields}};\nuniform ${typeName} ${rawName};`;
        },
    );
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readsAggregate(body: string, sourceName: string): boolean {
    return new RegExp(`(^|[^A-Za-z0-9_])${escapeRegExp(sourceName)}(?![A-Za-z0-9_])(?!\\s*[.\\[])`, "m").test(body);
}

function parseDefinitions(source: string, defines: Map<string, number>): Map<string, StructDefinition> {
    const definitions = new Map<string, StructDefinition>();
    const structPattern = /\bstruct\s+([A-Za-z_]\w*)\s*\{([\s\S]*?)\}\s*;/g;
    for (let match = structPattern.exec(source); match !== null; match = structPattern.exec(source)) {
        const fields: StructField[] = [];
        const fieldPattern = /(?:^|;)\s*(?:(?:lowp|mediump|highp)\s+)?([A-Za-z_]\w*)\s+([A-Za-z_]\w*(?:\s*\[[^\]]+\])?)\s*(?=;|$)/g;
        for (let field = fieldPattern.exec(match[2]); field !== null; field = fieldPattern.exec(match[2])) {
            const info = arrayInfo(field[2], defines);
            fields.push({ name: info.name, glslType: field[1], size: info.size, isArray: info.isArray });
        }
        definitions.set(match[1], { name: match[1], fields });
    }
    return definitions;
}

function blankRanges(source: string, ranges: Array<{ start: number, end: number }>): string {
    const chars = source.split("");
    for (const range of ranges) {
        for (let index = range.start; index < range.end; index++) {
            if (chars[index] !== "\n" && chars[index] !== "\r") chars[index] = " ";
        }
    }
    return chars.join("");
}

interface ParsedStructUniformAccess {
    start: number;
    end: number;
    root: ValueStructUniformRoot;
    fields: StructField[];
    glslType: string;
    selectionIndices: Array<{ expression: string, size: number }>;
    terminalArrayIndex?: { expression: string, size: number };
}

function skipWhitespace(source: string, start: number): number {
    let cursor = start;
    while (cursor < source.length && /\s/.test(source[cursor])) cursor++;
    return cursor;
}

function parseBracketExpression(source: string, start: number): { expression: string, end: number } | null {
    const open = skipWhitespace(source, start);
    if (source[open] !== "[") return null;
    let bracketDepth = 0;
    let parenDepth = 0;
    for (let cursor = open; cursor < source.length; cursor++) {
        const character = source[cursor];
        if (character === "[") bracketDepth++;
        else if (character === "]") {
            bracketDepth--;
            if (bracketDepth === 0 && parenDepth === 0) {
                return {
                    expression: source.slice(open + 1, cursor).trim(),
                    end: cursor + 1,
                };
            }
        } else if (character === "(") parenDepth++;
        else if (character === ")") parenDepth--;
    }
    return null;
}

function maskComments(source: string): string {
    const chars = source.split("");
    let lineComment = false;
    let blockComment = false;
    for (let index = 0; index < chars.length; index++) {
        const character = source[index];
        const next = source[index + 1];
        if (lineComment) {
            if (character === "\n") lineComment = false;
            else chars[index] = " ";
            continue;
        }
        if (blockComment) {
            if (character === "*" && next === "/") {
                chars[index] = " ";
                chars[index + 1] = " ";
                blockComment = false;
                index++;
            } else if (character !== "\n" && character !== "\r") chars[index] = " ";
            continue;
        }
        if (character === "/" && next === "/") {
            chars[index] = " ";
            chars[index + 1] = " ";
            lineComment = true;
            index++;
        } else if (character === "/" && next === "*") {
            chars[index] = " ";
            chars[index + 1] = " ";
            blockComment = true;
            index++;
        }
    }
    return chars.join("");
}

function parseStructUniformAccesses(
    source: string,
    definitions: Map<string, StructDefinition>,
    roots: ValueStructUniformRoot[],
): ParsedStructUniformAccess[] {
    const masked = maskComments(source);
    const accesses: ParsedStructUniformAccess[] = [];
    for (const root of roots) {
        const pattern = new RegExp(`\\b${escapeRegExp(root.name)}\\b`, "g");
        for (let match = pattern.exec(masked); match !== null; match = pattern.exec(masked)) {
            const previous = skipWhitespace(masked, match.index) - 1;
            if (previous >= 0 && masked[previous] === ".") continue;
            let cursor = match.index + root.name.length;
            let currentType = root.glslType;
            const fields: StructField[] = [];
            const selectionIndices: Array<{ expression: string, size: number }> = [];
            let terminalArrayIndex: { expression: string, size: number } | undefined;
            if (root.isArray) {
                const bracket = parseBracketExpression(masked, cursor);
                if (!bracket || bracket.expression.length === 0) continue;
                selectionIndices.push({ expression: bracket.expression, size: root.size });
                cursor = bracket.end;
            }
            let valid = true;
            while (!VALUE_TYPES.has(currentType)) {
                const definition = definitions.get(currentType);
                cursor = skipWhitespace(masked, cursor);
                if (!definition || masked[cursor] !== ".") {
                    valid = false;
                    break;
                }
                cursor = skipWhitespace(masked, cursor + 1);
                const fieldMatch = /^[A-Za-z_]\w*/.exec(masked.slice(cursor));
                if (!fieldMatch) {
                    valid = false;
                    break;
                }
                const field = definition.fields.find((candidate) => candidate.name === fieldMatch[0]);
                if (!field) {
                    valid = false;
                    break;
                }
                fields.push(field);
                cursor += field.name.length;
                if (field.isArray) {
                    const bracket = parseBracketExpression(masked, cursor);
                    if (!bracket || bracket.expression.length === 0) {
                        valid = false;
                        break;
                    }
                    const expression = bracket.expression;
                    if (VALUE_TYPES.has(field.glslType)) {
                        terminalArrayIndex = { expression, size: field.size };
                    } else {
                        selectionIndices.push({ expression, size: field.size });
                    }
                    cursor = bracket.end;
                }
                currentType = field.glslType;
            }
            if (!valid || !VALUE_TYPES.has(currentType) || fields.length === 0) continue;
            accesses.push({
                start: match.index,
                end: cursor,
                root,
                fields,
                glslType: currentType,
                selectionIndices,
                terminalArrayIndex,
            });
        }
    }
    return accesses.sort((left, right) => left.start - right.start || right.end - left.end);
}

function accessLeafSourceName(access: ParsedStructUniformAccess, indices: number[]): string {
    let path = access.root.name;
    let selection = 0;
    if (access.root.isArray) path += `[${indices[selection++]}]`;
    for (const field of access.fields) {
        path += `.${field.name}`;
        if (field.isArray && !VALUE_TYPES.has(field.glslType)) {
            path += `[${indices[selection++]}]`;
        }
    }
    return path;
}

function enumerateSelectionIndices(sizes: number[]): number[][] {
    const values: number[][] = [];
    const visit = (dimension: number, current: number[]) => {
        if (dimension === sizes.length) {
            values.push([...current]);
            return;
        }
        for (let value = 0; value < sizes[dimension]; value++) {
            current.push(value);
            visit(dimension + 1, current);
            current.pop();
        }
    };
    visit(0, []);
    return values;
}

function isLiteralArrayIndex(expression: string): boolean {
    return /^\s*\d+\s*$/.test(expression);
}

export function planValueStructUniforms(rawSource: string): ValueStructUniformPlan {
    const source = normalizeAnonymousUniformStructs(rawSource);
    const defines = integerDefines(source);
    const definitions = parseDefinitions(source, defines);
    const parsedRoots: Array<Omit<ValueStructUniformRoot, "aggregateRead">> = [];
    const declarationRanges: Array<{ start: number, end: number }> = [];
    const uniformPattern = /\buniform\s+(?:(?:lowp|mediump|highp)\s+)?([A-Za-z_]\w*)\s+([A-Za-z_]\w*(?:\s*\[[^\]]+\])?)\s*;/g;
    for (let match = uniformPattern.exec(source); match !== null; match = uniformPattern.exec(source)) {
        if (!isTopLevelAt(source, match.index) || !definitions.has(match[1])) continue;
        const info = arrayInfo(match[2], defines);
        parsedRoots.push({ name: info.name, glslType: match[1], size: info.size, isArray: info.isArray });
        declarationRanges.push({ start: match.index, end: uniformPattern.lastIndex });
    }
    const body = blankRanges(source, declarationRanges);
    const roots: ValueStructUniformRoot[] = parsedRoots.map((root) => ({
        ...root,
        aggregateRead: !root.isArray && readsAggregate(body, root.name),
    }));
    const allLeaves: ValueStructUniformLeaf[] = [];
    const aggregates: Array<{ sourceName: string, glslType: string }> = [];

    const expand = (rootName: string, glslType: string, sourceName: string) => {
        if (VALUE_TYPES.has(glslType)) {
            allLeaves.push({
                rootName,
                sourceName,
                name: internalLeafName(sourceName),
                glslType,
                size: 1,
                isArray: false,
            });
            return;
        }
        const definition = definitions.get(glslType);
        if (!definition) return;
        if (readsAggregate(body, sourceName)) aggregates.push({ sourceName, glslType });
        for (const field of definition.fields) {
            const fieldPath = `${sourceName}.${field.name}`;
            if (field.isArray && VALUE_TYPES.has(field.glslType)) {
                allLeaves.push({
                    rootName,
                    sourceName: fieldPath,
                    name: internalLeafName(fieldPath),
                    glslType: field.glslType,
                    size: field.size,
                    isArray: true,
                });
            } else if (field.isArray) {
                for (let index = 0; index < field.size; index++) expand(rootName, field.glslType, `${fieldPath}[${index}]`);
            } else {
                expand(rootName, field.glslType, fieldPath);
            }
        }
    };

    for (const root of roots) {
        if (root.isArray) {
            for (let index = 0; index < root.size; index++) expand(root.name, root.glslType, `${root.name}[${index}]`);
        } else {
            expand(root.name, root.glslType, root.name);
        }
    }
    const dynamicallySelectedLeaves = new Set<string>();
    for (const access of parseStructUniformAccesses(body, definitions, roots)) {
        if (!access.selectionIndices.some((index) => !isLiteralArrayIndex(index.expression))) continue;
        for (const indices of enumerateSelectionIndices(access.selectionIndices.map((index) => index.size))) {
            dynamicallySelectedLeaves.add(accessLeafSourceName(access, indices));
        }
    }
    const leaves = allLeaves.filter((leaf) => {
        const root = roots.find((item) => item.name === leaf.rootName);
        return !!root && (root.aggregateRead || dynamicallySelectedLeaves.has(leaf.sourceName) ||
            body.includes(leaf.sourceName) ||
            aggregates.some((aggregate) => leaf.sourceName.startsWith(`${aggregate.sourceName}.`)));
    });
    return { definitions, roots, leaves, aggregates };
}

function constructorFor(
    plan: ValueStructUniformPlan,
    glslType: string,
    sourceName: string,
): string | null {
    const definition = plan.definitions.get(glslType);
    if (!definition) return null;
    const args: string[] = [];
    for (const field of definition.fields) {
        if (field.isArray) return null;
        const fieldPath = `${sourceName}.${field.name}`;
        if (VALUE_TYPES.has(field.glslType)) {
            const leaf = plan.leaves.find((item) => item.sourceName === fieldPath);
            if (!leaf) return null;
            args.push(leaf.name);
        } else {
            const nested = constructorFor(plan, field.glslType, fieldPath);
            if (!nested) return null;
            args.push(nested);
        }
    }
    return `${glslType}(${args.join(", ")})`;
}

export function rewriteDynamicStructUniformReads(
    source: string,
    plan: ValueStructUniformPlan,
): DynamicStructUniformRewrite {
    const leafBySourceName = new Map(plan.leaves.map((leaf) => [leaf.sourceName, leaf]));
    const replacements: Array<{ start: number, end: number, text: string }> = [];
    let coveredUntil = -1;
    for (const access of parseStructUniformAccesses(source, plan.definitions, plan.roots)) {
        if (access.start < coveredUntil ||
            !access.selectionIndices.some((index) => !isLiteralArrayIndex(index.expression))) {
            continue;
        }
        const selectionSizes = access.selectionIndices.map((index) => index.size);
        const indexSets = enumerateSelectionIndices(selectionSizes);
        const values: string[] = [];
        for (const indices of indexSets) {
            const leaf = leafBySourceName.get(accessLeafSourceName(access, indices));
            if (!leaf) {
                values.length = 0;
                break;
            }
            if (access.terminalArrayIndex) {
                for (let index = 0; index < access.terminalArrayIndex.size; index++) {
                    values.push(`${leaf.name}[${index}]`);
                }
            } else {
                values.push(leaf.name);
            }
        }
        if (values.length === 0) continue;
        const dimensions = [
            ...access.selectionIndices,
            ...(access.terminalArrayIndex ? [access.terminalArrayIndex] : []),
        ];
        const linearTerms = dimensions.map((dimension, index) => {
            const stride = dimensions.slice(index + 1)
                .reduce((product, later) => product * later.size, 1);
            const expression = `(${dimension.expression})`;
            return stride === 1 ? expression : `${expression} * ${stride}`;
        });
        const linearIndex = linearTerms.join(" + ");
        replacements.push({
            start: access.start,
            end: access.end,
            text: `${access.glslType}[${values.length}](${values.join(", ")})[${linearIndex}]`,
        });
        coveredUntil = access.end;
    }
    let out = source;
    for (const replacement of replacements.sort((left, right) => right.start - left.start)) {
        out = out.slice(0, replacement.start) + replacement.text + out.slice(replacement.end);
    }
    return {
        source: out,
        helpers: [],
    };
}

function rewriteOutsideStructDefinitions(
    source: string,
    rewrite: (segment: string) => string,
): string {
    const structPattern = /\bstruct\s+[A-Za-z_]\w*\s*\{[\s\S]*?\}\s*;/g;
    let result = "";
    let cursor = 0;
    for (let match = structPattern.exec(source); match !== null; match = structPattern.exec(source)) {
        result += rewrite(source.slice(cursor, match.index));
        result += match[0];
        cursor = structPattern.lastIndex;
    }
    return result + rewrite(source.slice(cursor));
}

export function rewriteStructUniformAggregateReads(source: string, plan: ValueStructUniformPlan): string {
    let out = source;
    for (const aggregate of [...plan.aggregates].sort((left, right) => right.sourceName.length - left.sourceName.length)) {
        const constructor = constructorFor(plan, aggregate.glslType, aggregate.sourceName);
        if (!constructor) continue;
        out = rewriteOutsideStructDefinitions(out, (segment) => segment.replace(
            new RegExp(`(^|[^A-Za-z0-9_])${escapeRegExp(aggregate.sourceName)}(?![A-Za-z0-9_])(?!\\s*[.\\[])`, "gm"),
            (_match, prefix) => `${prefix}${constructor}`,
        ));
    }
    return out;
}
