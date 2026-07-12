import {
    DEPTH_RANGE_DIFF_UNIFORM_NAME,
    DEPTH_RANGE_FAR_UNIFORM_NAME,
    DEPTH_RANGE_NEAR_UNIFORM_NAME,
} from "./shaderInternalUniforms";

function maskComments(source: string): string {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\r\n]/g, " "))
        .replace(/\/\/.*$/gm, (comment) => " ".repeat(comment.length));
}

function replaceMaskedToken(source: string, masked: string, token: RegExp, replacement: string): string {
    let out = "";
    let cursor = 0;
    token.lastIndex = 0;
    for (let match = token.exec(masked); match !== null; match = token.exec(masked)) {
        out += source.slice(cursor, match.index) + replacement;
        cursor = match.index + match[0].length;
    }
    return out + source.slice(cursor);
}

function updateBlockCommentState(line: string, initiallyInComment: boolean): boolean {
    let inComment = initiallyInComment;
    for (let index = 0; index < line.length; index++) {
        if (inComment) {
            if (line[index] === "*" && line[index + 1] === "/") {
                inComment = false;
                index++;
            }
            continue;
        }
        if (line[index] === "/" && line[index + 1] === "/") break;
        if (line[index] === "/" && line[index + 1] === "*") {
            inComment = true;
            index++;
        }
    }
    return inComment;
}

/**
 * glslang's Vulkan preprocessor expands __LINE__ in macro arguments at the
 * outer expansion site. GLSL ES requires argument tokens to be expanded first.
 * Materialize source-level uses while leaving directive replacement lists for
 * the real preprocessor, and preserve #line's logical line numbering.
 */
export function materializeWebGlLineMacros(source: string): string {
    const sourceLines = source.split(/(?<=\n)/);
    const maskedLines = maskComments(source).split(/(?<=\n)/);
    const objectLineMacros = new Map<string, number>();
    let logicalLine: number | null = 1;
    let inBlockComment = false;
    let defineContinuation = false;

    return sourceLines.map((line, index) => {
        const masked = maskedLines[index] || "";
        const directive = defineContinuation
            ? null
            : /^\s*#\s*([A-Za-z_]\w*)\b([^\r\n]*)/.exec(masked);
        let out = line;
        if (!defineContinuation && !directive && logicalLine !== null) {
            out = replaceMaskedToken(line, masked, /\b__LINE__\b/g, String(logicalLine));
        }

        if (directive?.[1] === "define") {
            const definition = /^\s+([A-Za-z_]\w*)(?!\s*\()\s+([0-9]+)\s*$/.exec(directive[2]);
            if (definition) objectLineMacros.set(definition[1], Number(definition[2]));
        } else if (directive?.[1] === "undef") {
            const name = /^\s+([A-Za-z_]\w*)\s*$/.exec(directive[2])?.[1];
            if (name) objectLineMacros.delete(name);
        }

        let nextLogicalLine = logicalLine === null ? null : logicalLine + 1;
        if (directive?.[1] === "line") {
            const argument = /^\s+([A-Za-z_]\w*|[0-9]+)(?:\s+(?:[A-Za-z_]\w*|[0-9]+))?\s*$/.exec(directive[2])?.[1];
            const value = argument && (/^\d+$/.test(argument)
                ? Number(argument)
                : objectLineMacros.get(argument));
            nextLogicalLine = value === undefined ? null : value;
        }

        const currentDefine = defineContinuation || directive?.[1] === "define";
        inBlockComment = updateBlockCommentState(line, inBlockComment);
        const lineContinuation = /\\\s*(?:\r?\n)?$/.test(masked);
        defineContinuation = currentDefine && (inBlockComment || lineContinuation);
        logicalLine = nextLogicalLine;
        return out;
    }).join("");
}

export function stripGlslVersionDirectives(source: string): string {
    const sourceLines = source.split(/(?<=\n)/);
    const maskedLines = maskComments(source).split(/(?<=\n)/);
    return sourceLines.map((line, index) =>
        /^\s*#\s*version\b/.test(maskedLines[index] || "")
            ? line.replace(/[^\r\n]/g, " ")
            : line,
    ).join("");
}

export const WEBGL1_GLSL_BUILTIN_LIMITS: Readonly<Record<string, number>> = {
    gl_MaxVertexAttribs: 16,
    gl_MaxVertexUniformVectors: 1024,
    gl_MaxVaryingVectors: 32,
    gl_MaxVertexTextureImageUnits: 16,
    gl_MaxCombinedTextureImageUnits: 16,
    gl_MaxTextureImageUnits: 16,
    gl_MaxFragmentUniformVectors: 1024,
    gl_MaxDrawBuffers: 1,
};

export function normalizeWebGl1BuiltinLimits(source: string): string {
    let out = source;
    for (const [name, value] of Object.entries(WEBGL1_GLSL_BUILTIN_LIMITS)) {
        out = out.replace(new RegExp(`\\b${name}\\b`, "g"), String(value));
    }
    return out;
}

function staticallyKnownPreprocessorCondition(
    expression: string,
    webglVersion: 1 | 2,
): boolean | undefined {
    const version = webglVersion === 2 ? 300 : 100;
    const normalized = expression
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/\/\/.*$/g, " ")
        .replace(/\b__VERSION__\b/g, String(version))
        .replace(/\bdefined\s*\(\s*GL_ES\s*\)/g, "1")
        .replace(/\bdefined\s+GL_ES\b/g, "1")
        .trim()
        .replace(/^\((.*)\)$/s, "$1")
        .trim();
    if (normalized === "0") return false;
    if (normalized === "1") return true;
    const comparison = /^(\d+)\s*(==|!=|<=|>=|<|>)\s*(\d+)$/.exec(normalized);
    if (!comparison) return undefined;
    const left = Number(comparison[1]);
    const right = Number(comparison[3]);
    switch (comparison[2]) {
        case "==": return left === right;
        case "!=": return left !== right;
        case "<=": return left <= right;
        case ">=": return left >= right;
        case "<": return left < right;
        case ">": return left > right;
        default: return undefined;
    }
}

interface PreprocessorBranchState {
    parentActive: boolean;
    conditionKnown: boolean;
    branchTaken: boolean;
    active: boolean;
}

/**
 * Masks only branches whose condition is provable from the WebGL language
 * version. Line lengths and directives are preserved so later source offsets
 * and the real GLSL preprocessor remain valid.
 */
export function maskStaticallyInactivePreprocessorBranches(
    source: string,
    webglVersion: 1 | 2,
): string {
    const lines = source.split(/(?<=\n)/);
    const stack: PreprocessorBranchState[] = [];
    const effectiveActive = () => stack.length === 0 || stack[stack.length - 1].active;

    return lines.map((line) => {
        const directive = /^\s*#\s*(if|ifdef|ifndef|elif|else|endif)\b([\s\S]*?)(?:\r?\n)?$/i.exec(line);
        if (directive) {
            const kind = directive[1].toLowerCase();
            const expression = directive[2].trim();
            if (kind === "if" || kind === "ifdef" || kind === "ifndef") {
                const parentActive = effectiveActive();
                let condition: boolean | undefined;
                if (kind === "ifdef" && expression === "GL_ES") condition = true;
                else if (kind === "ifndef" && expression === "GL_ES") condition = false;
                else if (kind === "if") condition = staticallyKnownPreprocessorCondition(expression, webglVersion);
                stack.push({
                    parentActive,
                    conditionKnown: condition !== undefined,
                    branchTaken: condition === true,
                    active: parentActive && condition !== false,
                });
            } else if (kind === "elif" && stack.length > 0) {
                const frame = stack[stack.length - 1];
                const condition = staticallyKnownPreprocessorCondition(expression, webglVersion);
                if (frame.conditionKnown && condition !== undefined) {
                    frame.active = frame.parentActive && !frame.branchTaken && condition;
                    frame.branchTaken ||= condition;
                } else {
                    frame.conditionKnown = false;
                    frame.active = frame.parentActive;
                }
            } else if (kind === "else" && stack.length > 0) {
                const frame = stack[stack.length - 1];
                frame.active = frame.conditionKnown
                    ? frame.parentActive && !frame.branchTaken
                    : frame.parentActive;
                frame.branchTaken = true;
            } else if (kind === "endif") {
                stack.pop();
            }
            return line;
        }
        return effectiveActive() ? line : line.replace(/[^\r\n]/g, " ");
    }).join("");
}

export function wrapVertexMainForWebGpuClipSpace(source: string): string {
    const signature = /\bvoid\s+main\s*\(\s*(?:void\s*)?\)\s*\{/;
    if (!signature.test(source)) return source;
    let innerName = "_hyd_webgl_vertex_main";
    while (new RegExp(`\\b${innerName}\\b`).test(source)) innerName += "_";
    const body = source.replace(signature, (match) => match.replace(/\bmain\b/, innerName));
    return `${body}\n\nvoid main() {\n  ${innerName}();\n  gl_Position.z = (gl_Position.z + gl_Position.w) * 0.5;\n}\n`;
}

/**
 * WebGPU rasterizes points at one pixel and GL2GPU advertises the conformant
 * WebGL point-size range [1, 1]. Keep shader-side reads and writes intact, but
 * lower the unsupported SPIR-V PointSize builtin to invocation-private state.
 */
export function lowerWebGlPointSizeToPrivateState(source: string): string {
    const masked = maskComments(source);
    if (!/\bgl_PointSize\b/.test(masked)) return source;

    let privateName = "_hydWebGlPointSize";
    while (new RegExp(`\\b${privateName}\\b`).test(masked)) privateName += "_";
    const token = /\bgl_PointSize\b/g;
    let out = "";
    let cursor = 0;
    for (let match = token.exec(masked); match !== null; match = token.exec(masked)) {
        out += source.slice(cursor, match.index) + privateName;
        cursor = match.index + match[0].length;
    }
    out += source.slice(cursor);
    return `float ${privateName};\n${out}`;
}

export function normalizeWebGlDepthRange(source: string): string {
    if (!/\bgl_DepthRange\s*\./.test(maskComments(source))) return source;
    return source
        .replace(/\bgl_DepthRange\s*\.\s*near\b/g, DEPTH_RANGE_NEAR_UNIFORM_NAME)
        .replace(/\bgl_DepthRange\s*\.\s*far\b/g, DEPTH_RANGE_FAR_UNIFORM_NAME)
        .replace(/\bgl_DepthRange\s*\.\s*diff\b/g, DEPTH_RANGE_DIFF_UNIFORM_NAME);
}

function isTopLevelAt(source: string, index: number): boolean {
    let braceDepth = 0;
    let parenDepth = 0;
    for (let cursor = 0; cursor < index; cursor++) {
        if (source[cursor] === "{") braceDepth++;
        else if (source[cursor] === "}") braceDepth--;
        else if (source[cursor] === "(") parenDepth++;
        else if (source[cursor] === ")") parenDepth--;
    }
    return braceDepth === 0 && parenDepth === 0;
}

function splitTopLevelArguments(source: string): string[] {
    const parts: string[] = [];
    let start = 0;
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    for (let index = 0; index < source.length; index++) {
        const ch = source[index];
        if (ch === "(") parenDepth++;
        else if (ch === ")") parenDepth--;
        else if (ch === "[") bracketDepth++;
        else if (ch === "]") bracketDepth--;
        else if (ch === "{") braceDepth++;
        else if (ch === "}") braceDepth--;
        else if (ch === "," && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
            parts.push(source.slice(start, index));
            start = index + 1;
        }
    }
    parts.push(source.slice(start));
    return parts;
}

function topLevelAssignmentIndex(source: string): number {
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    for (let index = 0; index < source.length; index++) {
        const ch = source[index];
        if (ch === "(") parenDepth++;
        else if (ch === ")") parenDepth--;
        else if (ch === "[") bracketDepth++;
        else if (ch === "]") bracketDepth--;
        else if (ch === "{") braceDepth++;
        else if (ch === "}") braceDepth--;
        else if (ch === "=" && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
            const previous = source[index - 1] || "";
            const next = source[index + 1] || "";
            if (previous !== "=" && previous !== "!" && previous !== "<" && previous !== ">" && next !== "=") {
                return index;
            }
        }
    }
    return -1;
}

interface SimpleMacroDefinition {
    functionLike: boolean;
    replacement: string;
}

function simpleMacroDefinitions(source: string): Map<string, SimpleMacroDefinition> {
    const macros = new Map<string, SimpleMacroDefinition>();
    for (const line of maskComments(source).split(/\r?\n/)) {
        const match = /^\s*#\s*define\s+([A-Za-z_]\w*)(\([^)]*\))?(?:[ \t]+(.*))?$/.exec(line);
        if (!match || /\\\s*$/.test(line)) continue;
        macros.set(match[1], {
            functionLike: match[2] !== undefined,
            replacement: (match[3] || "").trim(),
        });
    }
    return macros;
}

function matchingParen(source: string, open: number): number {
    let depth = 0;
    for (let index = open; index < source.length; index++) {
        if (source[index] === "(") depth++;
        else if (source[index] === ")" && --depth === 0) return index;
    }
    return -1;
}

function provablyExpandsToEmpty(source: string, macros: Map<string, SimpleMacroDefinition>): boolean {
    let current = source.trim();
    const expandedObjects = new Set<string>();
    for (let step = 0; step < 32 && current; step++) {
        const identifier = /^([A-Za-z_]\w*)/.exec(current);
        if (!identifier) return false;
        const name = identifier[1];
        const macro = macros.get(name);
        if (!macro) return false;
        let suffix = current.slice(identifier[0].length);
        if (!macro.functionLike) {
            if (expandedObjects.has(name)) return false;
            expandedObjects.add(name);
            current = `${macro.replacement}${suffix}`.trim();
            continue;
        }
        if (macro.replacement.length !== 0) return false;
        const open = suffix.search(/\S/);
        if (open < 0 || suffix[open] !== "(") return false;
        const close = matchingParen(suffix, open);
        if (close < 0) return false;
        current = suffix.slice(close + 1).trim();
    }
    return current.length === 0;
}

/**
 * Removes only top-level macro invocation lines that a bounded macro proof can
 * reduce to an empty replacement. This avoids known glslang recursion failures
 * without implementing or approximating general GLSL preprocessing.
 */
export function stripProvablyEmptyTopLevelMacroInvocations(source: string): string {
    const macros = simpleMacroDefinitions(source);
    if (macros.size === 0) return source;
    const maskedLines = maskComments(source).split(/(?<=\n)/);
    const sourceLines = source.split(/(?<=\n)/);
    let braceDepth = 0;
    return sourceLines.map((line, index) => {
        const masked = maskedLines[index] || "";
        const trimmed = masked.trim();
        if (braceDepth === 0 && trimmed && !trimmed.startsWith("#") &&
            provablyExpandsToEmpty(trimmed, macros)) {
            return line.replace(/[^\r\n]/g, " ");
        }
        if (!trimmed.startsWith("#")) {
            for (const ch of masked) {
                if (ch === "{") braceDepth++;
                else if (ch === "}") braceDepth--;
            }
        }
        return line;
    }).join("");
}

export function lowerEs100GlobalInitializers(source: string): string {
    const masked = maskComments(source).replace(
        /^\s*#.*$/gm,
        (line) => line.replace(/[^\r\n]/g, " "),
    );
    const declaration = /((?:(?:const|lowp|mediump|highp)\s+)*[A-Za-z_]\w*)\s+([^;{}]+);/g;
    const assignments: string[] = [];
    const hoistedDeclarations: string[] = [];
    const mainIndex = masked.search(/\bvoid\s+main\s*\(\s*(?:void\s*)?\)\s*\{/);
    let out = "";
    let cursor = 0;
    for (let match = declaration.exec(masked); match !== null; match = declaration.exec(masked)) {
        if (!isTopLevelAt(masked, match.index) || /\bconst\b/.test(match[1])) continue;
        const declaratorOffset = match.index + match[0].indexOf(match[2]);
        const declarators = splitTopLevelArguments(source.slice(declaratorOffset, declaration.lastIndex - 1));
        if (declarators.every((item) => topLevelAssignmentIndex(item) < 0)) continue;

        const loweredDeclarations: string[] = [];
        for (const declarator of declarators) {
            const assignmentIndex = topLevelAssignmentIndex(declarator);
            if (assignmentIndex < 0) {
                loweredDeclarations.push(declarator.trim());
                continue;
            }
            const target = declarator.slice(0, assignmentIndex).trim();
            const initializer = declarator.slice(assignmentIndex + 1).trim();
            const name = /^([A-Za-z_]\w*)/.exec(target)?.[1];
            if (!name || !initializer) {
                loweredDeclarations.push(declarator.trim());
                continue;
            }
            loweredDeclarations.push(target);
            assignments.push(`${name} = ${initializer};`);
        }
        const loweredDeclaration = `${match[1]} ${loweredDeclarations.join(", ")};`;
        out += source.slice(cursor, match.index);
        if (mainIndex >= 0 && match.index > mainIndex) {
            hoistedDeclarations.push(loweredDeclaration);
            out += source.slice(match.index, declaration.lastIndex).replace(/[^\r\n]/g, " ");
        } else {
            out += loweredDeclaration;
        }
        cursor = declaration.lastIndex;
    }
    if (assignments.length === 0) return source;
    out += source.slice(cursor);
    return out.replace(
        /\bvoid\s+main\s*\(\s*(?:void\s*)?\)\s*\{/,
        (signature) => `${hoistedDeclarations.join("\n")}${hoistedDeclarations.length ? "\n" : ""}${signature}\n  ${assignments.join("\n  ")}`,
    );
}

export function normalizeEs100SequenceArrayDimensions(source: string): string {
    return source.replace(/\[\s*\(\s*([^()[\]]*?,[^()[\]]*?)\s*\)\s*\]/g, (full, expression) => {
        const values = splitTopLevelArguments(expression);
        return values.length > 1 ? `[${values[values.length - 1].trim()}]` : full;
    });
}
