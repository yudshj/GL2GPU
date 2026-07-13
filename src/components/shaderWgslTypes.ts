import type { InitShaderInfoType, NameAndType } from "./shaderDB";

export function wgslUniformMemberDeclaration(uniform: NameAndType): string {
    const attributes = uniform.is_array ? "@align(16) " : "";
    return `${attributes}${uniform.name}: ${uniform.wgsl_type},`;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function replaceBareWgslIdentifier(source: string, from: string, to: string): string {
    const escaped = escapeRegExp(from);
    return source.replace(new RegExp(`\\b${escaped}\\b`, "g"), (match, offset: number) => {
        let previous = offset - 1;
        while (previous >= 0 && /\s/.test(source[previous])) previous--;
        if (previous >= 0 && source[previous] === ".") return match;

        const openParen = source.lastIndexOf("(", offset);
        const closeParen = source.lastIndexOf(")", offset);
        if (openParen > closeParen) {
            const attributePrefix = source.slice(Math.max(0, openParen - 64), openParen);
            if (/@[A-Za-z_]\w*\s*$/.test(attributePrefix)) return match;
        }
        return to;
    });
}

// Kept in sync with Dawn's src/tint/lang/wgsl/reserved_words.cc.
const WGSL_RESERVED_IDENTIFIERS = new Set(`
NULL Self abstract active alignas alignof as asm asm_fragment async attribute auto await become cast catch class
co_await co_return co_yield coherent column_major common compile compile_fragment concept const_cast consteval
constexpr constinit crate debugger decltype delete demote demote_to_helper do dynamic_cast enum explicit export
extends extern external fallthrough filter final finally friend from fxgroup get goto groupshared highp impl
implements import inline instanceof interface layout lowp macro macro_rules match mediump meta mod module move mut
mutable namespace new nil noexcept noinline nointerpolation non_coherent noncoherent noperspective null nullptr of
operator package packoffset partition pass patch pixelfragment precise precision premerge priv protected pub public
readonly ref regardless register reinterpret_cast require resource restrict self set shared sizeof smooth snorm static
static_assert static_cast std subroutine super target template this thread_local throw trait try type typedef typeid
typename typeof union unless unorm unsafe unsized use using varying virtual volatile wgsl where with writeonly yield
`.trim().split(/\s+/));

const WGSL_LANGUAGE_KEYWORDS = new Set(`
alias break case const const_assert continue continuing default diagnostic discard else enable false fn for if let
loop override requires return struct switch true var while
`.trim().split(/\s+/));

export function isReservedWgslIdentifier(name: string): boolean {
    return WGSL_RESERVED_IDENTIFIERS.has(name);
}

export function renameReservedWgslIdentifiers(wgsl: string): string {
    const memberReplacements = new Map<string, string>();
    const structs = Array.from(parseStructs(wgsl).values()).sort((a, b) => b.start - a.start);
    for (const struct of structs) {
        for (const field of struct.fields) {
            if (!WGSL_LANGUAGE_KEYWORDS.has(field.name) || memberReplacements.has(field.name)) continue;
            let replacement = `${field.name}_`;
            while (new RegExp(`\\b${escapeRegExp(replacement)}\\b`).test(wgsl)) replacement += "_";
            memberReplacements.set(field.name, replacement);
        }
    }

    let out = wgsl;
    for (const struct of structs) {
        let declaration = out.slice(struct.start, struct.end);
        for (const field of struct.fields) {
            const replacement = memberReplacements.get(field.name);
            if (!replacement) continue;
            declaration = declaration.replace(
                new RegExp(`\\b${escapeRegExp(field.name)}\\s*(?=:)`, "g"),
                replacement,
            );
        }
        out = out.slice(0, struct.start) + declaration + out.slice(struct.end);
    }
    for (const [name, replacement] of memberReplacements) {
        out = out.replace(
            new RegExp(`(\\.\\s*)${escapeRegExp(name)}\\b`, "g"),
            `$1${replacement}`,
        );
    }

    const declaredNames = new Set<string>();
    const declarationPatterns = [
        /\b(?:alias|const|let|override|struct|fn)\s+([A-Za-z_]\w*)/g,
        /\bvar(?:\s*<[^>]+>)?\s+([A-Za-z_]\w*)/g,
        /(?:^|[({,])\s*(?:@[A-Za-z_]\w*(?:\([^)]*\))?\s*)*([A-Za-z_]\w*)\s*:/gm,
    ];
    for (const pattern of declarationPatterns) {
        for (let match = pattern.exec(out); match !== null; match = pattern.exec(out)) {
            if (WGSL_RESERVED_IDENTIFIERS.has(match[1])) declaredNames.add(match[1]);
        }
    }

    for (const name of declaredNames) {
        let replacement = `${name}_`;
        while (new RegExp(`\\b${escapeRegExp(replacement)}\\b`).test(out)) replacement += "_";
        out = out.replace(new RegExp(`\\b${escapeRegExp(name)}\\b`, "g"), replacement);
    }
    return out;
}

export function wgslUniformVariableNames(source: string, bindings?: ReadonlySet<number>): string[] {
    const names: string[] = [];
    if (bindings) {
        const attributedPattern = /((?:(?:@group|@binding)\([^)]*\)\s*)+)var\s*<\s*uniform\s*>\s+([A-Za-z_]\w*)\s*:/g;
        for (let match = attributedPattern.exec(source); match !== null; match = attributedPattern.exec(source)) {
            const binding = /@binding\(\s*(\d+)u?\s*\)/.exec(match[1]);
            if (binding && bindings.has(Number(binding[1]))) names.push(match[2]);
        }
        return names;
    }
    const pattern = /\bvar\s*<\s*uniform\s*>\s+([A-Za-z_]\w*)\s*:/g;
    for (let match = pattern.exec(source); match !== null; match = pattern.exec(source)) {
        names.push(match[1]);
    }
    return names;
}

export function replaceWgslMemberAccess(
    source: string,
    objectNames: string[],
    member: string,
    to: string,
): string {
    let out = source;
    for (const objectName of objectNames) {
        out = out.replace(
            new RegExp(`\\b${escapeRegExp(objectName)}\\s*\\.\\s*${escapeRegExp(member)}\\b`, "g"),
            to,
        );
    }
    return out;
}

interface ParsedStructField {
    attributes: string;
    name: string;
    type: string;
}

interface ParsedStruct {
    fields: ParsedStructField[];
    start: number;
    end: number;
}

interface ParsedAlias {
    type: string;
    start: number;
    end: number;
}

function stableIdentifierHash(value: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36);
}

function findMatchingBrace(source: string, openIndex: number): number {
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
        if (ch === "{") {
            depth++;
        } else if (ch === "}") {
            depth--;
            if (depth === 0) return i;
        }
    }
    return -1;
}

function splitStructFields(body: string): string[] {
    const fields: string[] = [];
    let start = 0;
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    let angleDepth = 0;
    let lineComment = false;
    let blockComment = false;
    for (let i = 0; i < body.length; i++) {
        const ch = body[i];
        const next = body[i + 1];
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
        } else if (ch === "/" && next === "*") {
            blockComment = true;
            i++;
        } else if (ch === "(") {
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
        } else if (ch === "<") {
            angleDepth++;
        } else if (ch === ">" && angleDepth > 0) {
            angleDepth--;
        } else if (ch === "," && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0 && angleDepth === 0) {
            fields.push(body.slice(start, i));
            start = i + 1;
        }
    }
    if (body.slice(start).trim()) fields.push(body.slice(start));
    return fields;
}

function parseStructs(wgsl: string): Map<string, ParsedStruct> {
    const structs = new Map<string, ParsedStruct>();
    const structRegex = /\bstruct\s+([A-Za-z_]\w*)\s*\{/g;
    for (let match = structRegex.exec(wgsl); match !== null; match = structRegex.exec(wgsl)) {
        const bodyOpen = structRegex.lastIndex - 1;
        const bodyClose = findMatchingBrace(wgsl, bodyOpen);
        if (bodyClose < 0) continue;
        const fields: ParsedStructField[] = [];
        for (const rawField of splitStructFields(wgsl.slice(bodyOpen + 1, bodyClose))) {
            const field = rawField
                .replace(/\/\*[\s\S]*?\*\//g, " ")
                .replace(/\/\/.*$/gm, " ")
                .trim();
            const fieldMatch = /^((?:\s*@[A-Za-z_]\w*(?:\([^)]*\))?\s*)*)([A-Za-z_]\w*)\s*:\s*([\s\S]+)$/.exec(field);
            if (!fieldMatch) continue;
            fields.push({
                attributes: fieldMatch[1].replace(/\s+/g, " ").trim(),
                name: fieldMatch[2],
                type: fieldMatch[3].trim(),
            });
        }
        structs.set(match[1], { fields, start: match.index, end: bodyClose + 1 });
        structRegex.lastIndex = bodyClose + 1;
    }
    return structs;
}

function parseAliases(wgsl: string): Map<string, ParsedAlias> {
    const aliases = new Map<string, ParsedAlias>();
    const aliasRegex = /\balias\s+([A-Za-z_]\w*)\s*=\s*([^;]+);/g;
    for (let match = aliasRegex.exec(wgsl); match !== null; match = aliasRegex.exec(wgsl)) {
        aliases.set(match[1], { type: match[2].trim(), start: match.index, end: aliasRegex.lastIndex });
    }
    return aliases;
}

function uniformStructNames(wgsl: string, bindings?: ReadonlySet<number>): Set<string> {
    const names = new Set<string>();
    if (bindings) {
        const attributedRegex = /((?:(?:@group|@binding)\([^)]*\)\s*)+)var\s*<\s*uniform\s*>\s+[A-Za-z_]\w*\s*:\s*([A-Za-z_]\w*)\s*;/g;
        for (let match = attributedRegex.exec(wgsl); match !== null; match = attributedRegex.exec(wgsl)) {
            const binding = /@binding\(\s*(\d+)u?\s*\)/.exec(match[1]);
            if (binding && bindings.has(Number(binding[1]))) names.add(match[2]);
        }
        return names;
    }
    const uniformVarRegex = /\bvar\s*<\s*uniform\s*>\s+[A-Za-z_]\w*\s*:\s*([A-Za-z_]\w*)\s*;/g;
    for (let match = uniformVarRegex.exec(wgsl); match !== null; match = uniformVarRegex.exec(wgsl)) {
        names.add(match[1]);
    }
    return names;
}

export function synchronizeTintUniformTypes(
    wgsl: string,
    metadata: InitShaderInfoType,
    bindings?: ReadonlySet<number>,
): string {
    if (metadata.uniforms.length === 0) return wgsl;
    const structs = parseStructs(wgsl);
    const aliases = parseAliases(wgsl);
    const declarations = new Map<string, string>();
    const resolvedNames = new Map<string, string>();
    const resolving = new Set<string>();

    const resolveType = (type: string): string => type.replace(/\b[A-Za-z_]\w*\b/g, (name) => {
        if (!aliases.has(name) && !structs.has(name)) return name;
        const cached = resolvedNames.get(name);
        if (cached) return cached;
        if (resolving.has(name)) return name;
        resolving.add(name);
        let resolved = name;
        const alias = aliases.get(name);
        if (alias !== undefined) {
            resolved = resolveType(alias.type);
        } else {
            const parsed = structs.get(name);
            if (parsed) {
                const fields = parsed.fields.map((field) => ({ ...field, type: resolveType(field.type) }));
                const shape = fields.map((field) => `${field.attributes}|${field.name}:${field.type}`).join(";");
                resolved = `_hyd_uniform_layout_${stableIdentifierHash(shape)}`;
                if (!declarations.has(resolved)) {
                    const fieldLines = fields.map((field) => `  ${field.attributes ? `${field.attributes} ` : ""}${field.name}: ${field.type},`);
                    declarations.set(resolved, `struct ${resolved} {\n${fieldLines.join("\n")}\n};`);
                }
            }
        }
        resolving.delete(name);
        resolvedNames.set(name, resolved);
        return resolved;
    });

    const tintFields = new Map<string, string>();
    for (const structName of uniformStructNames(wgsl, bindings)) {
        const uniformStruct = structs.get(structName);
        if (!uniformStruct) continue;
        for (const field of uniformStruct.fields) tintFields.set(field.name, field.type);
    }
    for (const uniform of metadata.uniforms) {
        const tintType = tintFields.get(uniform.name);
        if (tintType) uniform.wgsl_type = resolveType(tintType);
    }
    const emittedDeclarations = Array.from(declarations.values());
    for (const uniform of metadata.uniforms) {
        uniform.wgsl_declarations = emittedDeclarations;
    }
    const ranges: Array<{ start: number, end: number }> = [];
    for (const name of resolvedNames.keys()) {
        const alias = aliases.get(name);
        if (alias) ranges.push({ start: alias.start, end: alias.end });
        const struct = structs.get(name);
        if (struct) ranges.push({ start: struct.start, end: struct.end });
    }
    let out = wgsl;
    for (const range of ranges.sort((a, b) => b.start - a.start)) {
        out = out.slice(0, range.start) + out.slice(range.end);
    }
    for (const [name, resolved] of Array.from(resolvedNames.entries()).sort((a, b) => b[0].length - a[0].length)) {
        if (name === resolved) continue;
        out = out.replace(new RegExp(`\\b${name}\\b`, "g"), resolved);
    }
    return out;
}

export function composeShaderModuleWgsl(resourceDeclarations: string, shaderWgsl: string): string {
    const directivePrefix = shaderWgsl.match(
        /^\s*((?:(?:enable|requires)\s+[^;]+;\s*|diagnostic\s*\([^;]+\)\s*;\s*)+)/,
    );
    if (!directivePrefix) return resourceDeclarations + shaderWgsl;
    const directives = directivePrefix[1].trim();
    const body = shaderWgsl.slice(directivePrefix[0].length).trimStart();
    return `${directives}\n\n${resourceDeclarations}${body}`;
}
