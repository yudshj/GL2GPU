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
    return `hydgl2gpu_uniform_${readable}_${stableHash(sourceName)}`;
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
    const leaves = allLeaves.filter((leaf) => {
        const root = roots.find((item) => item.name === leaf.rootName);
        return !!root && (root.aggregateRead || body.includes(leaf.sourceName) ||
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

export function rewriteStructUniformAggregateReads(source: string, plan: ValueStructUniformPlan): string {
    let out = source;
    for (const aggregate of [...plan.aggregates].sort((left, right) => right.sourceName.length - left.sourceName.length)) {
        const constructor = constructorFor(plan, aggregate.glslType, aggregate.sourceName);
        if (!constructor) continue;
        out = out.replace(
            new RegExp(`(^|[^A-Za-z0-9_])${escapeRegExp(aggregate.sourceName)}(?![A-Za-z0-9_])(?!\\s*[.\\[])`, "gm"),
            (_match, prefix) => `${prefix}${constructor}`,
        );
    }
    return out;
}
