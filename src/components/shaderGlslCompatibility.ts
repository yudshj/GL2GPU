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

function replaceGlslBuiltin(source: string, name: string, replacement: string): string {
    return replaceMaskedToken(
        source,
        maskComments(source),
        new RegExp(`\\b${name}\\b`, "g"),
        replacement,
    );
}

export function lowerUnsupportedFloatBuiltins(source: string): string {
    const helpers: string[] = [];
    let out = source;
    if (/\bisinf\s*\(/.test(maskComments(out))) {
        out = replaceGlslBuiltin(out, "isinf", "_hyd_isinf");
        helpers.push(
            "bool _hyd_isinf(float value) { return abs(value) >= 3.4028234663852886e38; }",
            "bvec2 _hyd_isinf(vec2 value) { return greaterThanEqual(abs(value), vec2(3.4028234663852886e38)); }",
            "bvec3 _hyd_isinf(vec3 value) { return greaterThanEqual(abs(value), vec3(3.4028234663852886e38)); }",
            "bvec4 _hyd_isinf(vec4 value) { return greaterThanEqual(abs(value), vec4(3.4028234663852886e38)); }",
        );
    }
    if (/\bisnan\s*\(/.test(maskComments(out))) {
        out = replaceGlslBuiltin(out, "isnan", "_hyd_isnan");
        helpers.push(
            "bool _hyd_isnan(float value) { uint bits = floatBitsToUint(value) & 0x7fffffffu; return bits > 0x7f800000u; }",
            "bvec2 _hyd_isnan(vec2 value) { uvec2 bits = floatBitsToUint(value) & uvec2(0x7fffffffu); return greaterThan(bits, uvec2(0x7f800000u)); }",
            "bvec3 _hyd_isnan(vec3 value) { uvec3 bits = floatBitsToUint(value) & uvec3(0x7fffffffu); return greaterThan(bits, uvec3(0x7f800000u)); }",
            "bvec4 _hyd_isnan(vec4 value) { uvec4 bits = floatBitsToUint(value) & uvec4(0x7fffffffu); return greaterThan(bits, uvec4(0x7f800000u)); }",
        );
    }
    if (/\bmodf\s*\(/.test(maskComments(out))) {
        out = replaceGlslBuiltin(out, "modf", "_hyd_modf");
        helpers.push(
            "float _hyd_modf(float value, out float whole) { whole = trunc(value); return value - whole; }",
            "vec2 _hyd_modf(vec2 value, out vec2 whole) { whole = trunc(value); return value - whole; }",
            "vec3 _hyd_modf(vec3 value, out vec3 whole) { whole = trunc(value); return value - whole; }",
            "vec4 _hyd_modf(vec4 value, out vec4 whole) { whole = trunc(value); return value - whole; }",
        );
    }
    if (/\basinh\s*\(/.test(maskComments(out))) {
        out = replaceGlslBuiltin(out, "asinh", "_hyd_asinh");
        helpers.push(
            "float _hyd_asinh(float value) { float magnitude = abs(value); float result = magnitude > 4096.0 ? log(magnitude) + 0.6931471805599453 : log(magnitude + sqrt(magnitude * magnitude + 1.0)); return value < 0.0 ? -result : result; }",
            "vec2 _hyd_asinh(vec2 value) { return vec2(_hyd_asinh(value.x), _hyd_asinh(value.y)); }",
            "vec3 _hyd_asinh(vec3 value) { return vec3(_hyd_asinh(value.x), _hyd_asinh(value.y), _hyd_asinh(value.z)); }",
            "vec4 _hyd_asinh(vec4 value) { return vec4(_hyd_asinh(value.x), _hyd_asinh(value.y), _hyd_asinh(value.z), _hyd_asinh(value.w)); }",
        );
    }
    if (/\bacosh\s*\(/.test(maskComments(out))) {
        out = replaceGlslBuiltin(out, "acosh", "_hyd_acosh");
        helpers.push(
            "float _hyd_acosh(float value) { return value > 4096.0 ? log(value) + 0.6931471805599453 : log(value + sqrt((value - 1.0) * (value + 1.0))); }",
            "vec2 _hyd_acosh(vec2 value) { return vec2(_hyd_acosh(value.x), _hyd_acosh(value.y)); }",
            "vec3 _hyd_acosh(vec3 value) { return vec3(_hyd_acosh(value.x), _hyd_acosh(value.y), _hyd_acosh(value.z)); }",
            "vec4 _hyd_acosh(vec4 value) { return vec4(_hyd_acosh(value.x), _hyd_acosh(value.y), _hyd_acosh(value.z), _hyd_acosh(value.w)); }",
        );
    }
    if (/\batanh\s*\(/.test(maskComments(out))) {
        out = replaceGlslBuiltin(out, "atanh", "_hyd_atanh");
        helpers.push(
            "float _hyd_atanh(float value) { float magnitude = abs(value); float result = 0.5 * log((1.0 + magnitude) / (1.0 - magnitude)); return value < 0.0 ? -result : result; }",
            "vec2 _hyd_atanh(vec2 value) { return vec2(_hyd_atanh(value.x), _hyd_atanh(value.y)); }",
            "vec3 _hyd_atanh(vec3 value) { return vec3(_hyd_atanh(value.x), _hyd_atanh(value.y), _hyd_atanh(value.z)); }",
            "vec4 _hyd_atanh(vec4 value) { return vec4(_hyd_atanh(value.x), _hyd_atanh(value.y), _hyd_atanh(value.z), _hyd_atanh(value.w)); }",
        );
    }
    return helpers.length > 0 ? `${helpers.join("\n")}\n${out}` : out;
}

/** Match WebGL's bottom-left window-coordinate derivative orientation. */
export function normalizeWebGlDerivativeOrientation(source: string): string {
    if (!/\bdFdy\s*\(/.test(maskComments(source))) return source;
    const out = replaceGlslBuiltin(source, "dFdy", "_hyd_dFdy");
    return [
        "float _hyd_dFdy(float value) { return -dFdy(value); }",
        "vec2 _hyd_dFdy(vec2 value) { return -dFdy(value); }",
        "vec3 _hyd_dFdy(vec3 value) { return -dFdy(value); }",
        "vec4 _hyd_dFdy(vec4 value) { return -dFdy(value); }",
        out,
    ].join("\n");
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

function splitTopLevelDeclarators(source: string): string[] {
    const parts: string[] = [];
    let start = 0;
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    for (let index = 0; index < source.length; index++) {
        const char = source[index];
        if (char === "(") parenDepth++;
        else if (char === ")") parenDepth--;
        else if (char === "[") bracketDepth++;
        else if (char === "]") bracketDepth--;
        else if (char === "{") braceDepth++;
        else if (char === "}") braceDepth--;
        else if (char === "," && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
            parts.push(source.slice(start, index));
            start = index + 1;
        }
    }
    parts.push(source.slice(start));
    return parts;
}

/** Move GLSL ES array type suffixes onto each interface declarator for glslang. */
export function normalizeGlslInterfaceTypeArrays(source: string): string {
    const masked = maskComments(source);
    const pattern = /\b(?:layout\s*\([^)]*\)\s*)?(?:invariant\s+)?(?:(?:flat|smooth|noperspective|centroid|sample)\s+)*(?:attribute|uniform|varying|in|out)\s+(?:(?:lowp|mediump|highp)\s+)?[A-Za-z_]\w*\s*(?:\[[^\]\r\n]*\]\s*)+[^;]*;/g;
    const replacements: Array<{ start: number, end: number, value: string }> = [];
    for (let match = pattern.exec(masked); match !== null; match = pattern.exec(masked)) {
        const declaration = source.slice(match.index, match.index + match[0].length);
        const parsed = /^([\s\S]*?\b(?:attribute|uniform|varying|in|out)\s+(?:(?:lowp|mediump|highp)\s+)?)([A-Za-z_]\w*)\s*((?:\[[^\]\r\n]*\]\s*)+)([\s\S]*);$/.exec(declaration);
        if (!parsed) continue;
        const arraySuffix = parsed[3].trim();
        const declarators = splitTopLevelDeclarators(parsed[4]);
        const rewritten = declarators.map((declarator) => {
            const item = /^(\s*[A-Za-z_]\w*)((?:\s*\[[^\]]*\])*)([\s\S]*)$/.exec(declarator);
            return item ? `${item[1]}${item[2]}${arraySuffix}${item[3]}` : declarator;
        });
        replacements.push({
            start: match.index,
            end: match.index + match[0].length,
            value: `${parsed[1]}${parsed[2]} ${rewritten.join(",")};`,
        });
    }
    let out = source;
    for (let index = replacements.length - 1; index >= 0; index--) {
        const replacement = replacements[index];
        out = out.slice(0, replacement.start) + replacement.value + out.slice(replacement.end);
    }
    return out;
}

/** GLSL ES 3 requires an explicit version directive to be on the first line. */
export function hasMisplacedGlslEs3VersionDirective(source: string): boolean {
    const directive = /#\s*version\s+300\s+es\b/.exec(source);
    return !!directive && !/^[\t ]*#\s*version\s+300\s+es\b/.test(source);
}

/**
 * glslang applies C-style line splicing before removing comments, while WebGL
 * accepts backslashes as ordinary text in a `//` comment. Blank comment-only
 * backslashes so the following source line cannot be swallowed.
 */
export function sanitizeGlslangLineComments(source: string): string {
    const chars = source.split("");
    let lineComment = false;
    let blockComment = false;
    for (let index = 0; index < source.length; index++) {
        const ch = source[index];
        const next = source[index + 1];
        if (lineComment) {
            if (ch === "\n" || ch === "\r") {
                const previous = ch === "\n" && source[index - 1] === "\r"
                    ? source[index - 2]
                    : source[index - 1];
                lineComment = previous === "\\";
            } else {
                // This also blanks physical continuation lines that do not
                // begin with their own // marker.
                chars[index] = " ";
            }
            continue;
        }
        if (blockComment) {
            if (ch === "*" && next === "/") {
                blockComment = false;
                index++;
            }
            continue;
        }
        if (ch === "/" && next === "/") {
            chars[index] = " ";
            chars[index + 1] = " ";
            lineComment = true;
            index++;
        } else if (ch === "/" && next === "*") {
            blockComment = true;
            index++;
        }
    }
    return chars.join("");
}

function matchingOpenParenBackward(source: string, closeIndex: number): number {
    let depth = 0;
    for (let index = closeIndex; index >= 0; index--) {
        if (source[index] === ")") depth++;
        else if (source[index] === "(" && --depth === 0) return index;
    }
    return -1;
}

function matchingForward(source: string, openIndex: number, open: string, close: string): number {
    let depth = 0;
    for (let index = openIndex; index < source.length; index++) {
        if (source[index] === open) depth++;
        else if (source[index] === close && --depth === 0) return index;
    }
    return -1;
}

/** Lower do-while when no continue can bypass the explicit tail condition. */
export function lowerDoWhileLoops(source: string): string {
    const replacements: Array<{ start: number, end: number, value: string }> = [];
    const startPattern = /\bdo\s*\{/g;
    for (let match = startPattern.exec(source); match !== null; match = startPattern.exec(source)) {
        const bodyOpen = source.indexOf("{", match.index);
        const bodyClose = matchingForward(source, bodyOpen, "{", "}");
        if (bodyClose < 0) break;
        const suffix = /^\s*while\s*\(/.exec(source.slice(bodyClose + 1));
        if (!suffix) {
            startPattern.lastIndex = bodyClose + 1;
            continue;
        }
        const conditionOpen = bodyClose + 1 + suffix[0].lastIndexOf("(");
        const conditionClose = matchingForward(source, conditionOpen, "(", ")");
        if (conditionClose < 0 || !/^\s*;/.test(source.slice(conditionClose + 1))) break;
        const semicolonOffset = /^\s*;/.exec(source.slice(conditionClose + 1))![0].length;
        const body = source.slice(bodyOpen + 1, bodyClose);
        if (/\bcontinue\s*;/.test(body)) {
            startPattern.lastIndex = conditionClose + 1 + semicolonOffset;
            continue;
        }
        const condition = source.slice(conditionOpen + 1, conditionClose).trim();
        replacements.push({
            start: match.index,
            end: conditionClose + 1 + semicolonOffset,
            value: `while (true) {${body}\nif (!(${condition})) { break; }\n}`,
        });
        startPattern.lastIndex = conditionClose + 1 + semicolonOffset;
    }
    let out = source;
    for (const replacement of replacements.reverse()) {
        out = out.slice(0, replacement.start) + replacement.value + out.slice(replacement.end);
    }
    return out;
}

interface SwitchCase {
    value?: string;
    statements: string;
}

function switchCaseCanFallThrough(statements: string): boolean {
    const trimmed = statements.trim();
    if (trimmed.length === 0) return true;
    if (/\b(?:return(?:\s+[^;]+)?|discard)\s*;\s*$/.test(trimmed)) return false;
    const trailingBreak = /\bbreak\s*;\s*$/.exec(trimmed);
    if (!trailingBreak) return true;
    const prefix = trimmed.slice(0, trailingBreak.index).trimEnd();
    // An unbraced conditional break does not prevent fallthrough on the
    // condition's false path.
    return /\bif\s*\([^;{}]*\)\s*$/.test(prefix);
}

function topLevelSwitchCases(body: string): SwitchCase[] | null {
    const labels: Array<{ start: number, end: number, value?: string }> = [];
    const label = /\bcase\s+([^:]+):|\bdefault\s*:/g;
    for (let match = label.exec(body); match !== null; match = label.exec(body)) {
        let depth = 0;
        for (let index = 0; index < match.index; index++) {
            if (body[index] === "{") depth++;
            else if (body[index] === "}") depth--;
        }
        if (depth === 0) labels.push({ start: match.index, end: label.lastIndex, value: match[1]?.trim() });
    }
    if (labels.length === 0 || body.slice(0, labels[0].start).trim().length > 0) return null;
    return labels.map((item, index) => ({
        value: item.value,
        statements: body.slice(item.end, labels[index + 1]?.start ?? body.length),
    }));
}

/** Lower switch fallthrough to an explicit matched-state sequence. */
export function lowerFallthroughSwitches(source: string): string {
    let counter = 0;
    let out = source;
    const pattern = /\bswitch\s*\(/g;
    for (let match = pattern.exec(out); match !== null; match = pattern.exec(out)) {
        const conditionOpen = out.indexOf("(", match.index);
        const conditionClose = matchingForward(out, conditionOpen, "(", ")");
        if (conditionClose < 0) break;
        const bodyOpen = out.slice(conditionClose + 1).search(/\S/) + conditionClose + 1;
        if (out[bodyOpen] !== "{") continue;
        const bodyClose = matchingForward(out, bodyOpen, "{", "}");
        if (bodyClose < 0) break;
        const body = out.slice(bodyOpen + 1, bodyClose);
        const cases = topLevelSwitchCases(body);
        if (!cases || /\bcontinue\s*;/.test(body)) {
            pattern.lastIndex = bodyClose + 1;
            continue;
        }
        const hasFallthrough = cases.slice(0, -1).some((item) => switchCaseCanFallThrough(item.statements));
        if (!hasFallthrough) {
            pattern.lastIndex = bodyClose + 1;
            continue;
        }
        const id = counter++;
        const selector = `_hyd_switch_selector_${id}`;
        const matched = `_hyd_switch_matched_${id}`;
        const once = `_hyd_switch_once_${id}`;
        const condition = out.slice(conditionOpen + 1, conditionClose).trim();
        const declaredType = new RegExp(`\\b(int|uint)\\s+${condition.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).exec(out.slice(0, match.index))?.[1] || "int";
        const caseValues = cases.filter((item) => item.value !== undefined).map((item) => item.value!);
        const hoisted: string[] = [];
        for (const item of cases) {
            item.statements = item.statements.replace(
                /^\s*([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*;\s*$/gm,
                (_full, type, name) => {
                    const declaration = `${type} ${name};`;
                    if (!hoisted.includes(declaration)) hoisted.push(declaration);
                    return "";
                },
            );
        }
        const noCaseMatch = caseValues.length === 0
            ? "true"
            : caseValues.map((value) => `${selector} != ${declaredType}(${value})`).join(" && ");
        const branches = cases.map((item) => {
            const activate = item.value === undefined
                ? `(${matched} || (${noCaseMatch}))`
                : `(${matched} || ${selector} == ${declaredType}(${item.value}))`;
            return `if (${activate}) {\n  ${matched} = true;${item.statements}\n}`;
        }).join("\n");
        const replacement = `{
${declaredType} ${selector} = ${declaredType}(${condition});
bool ${matched} = false;
${hoisted.join("\n")}
bool ${once} = true;
while (${once}) {
${once} = false;
${branches}
}
}`;
        out = out.slice(0, match.index) + replacement + out.slice(bodyClose + 1);
        pattern.lastIndex = match.index + replacement.length;
    }
    return out;
}

/** Preserve side effects that glslang otherwise drops while folding array length. */
export function preserveComplexArrayLengthSideEffects(source: string): string {
    const arraySizes = new Map<string, number>();
    const arrayDeclaration = /\b[A-Za-z_]\w*\s+([A-Za-z_]\w*)\s*\[\s*(\d+)\s*\]/g;
    for (let match = arrayDeclaration.exec(source); match !== null; match = arrayDeclaration.exec(source)) {
        arraySizes.set(match[1], Number(match[2]));
    }
    const functionArraySizes = new Map<string, number>();
    const functionDeclaration = /\b[A-Za-z_]\w*\s*\[\s*(\d+)\s*\]\s+([A-Za-z_]\w*)\s*\(/g;
    for (let match = functionDeclaration.exec(source); match !== null; match = functionDeclaration.exec(source)) {
        functionArraySizes.set(match[2], Number(match[1]));
    }

    const replacements: Array<{ start: number, end: number, value: string }> = [];
    const lengthCall = /\)\s*\.\s*length\s*\(\s*\)/g;
    for (let match = lengthCall.exec(source); match !== null; match = lengthCall.exec(source)) {
        const close = match.index;
        const open = matchingOpenParenBackward(source, close);
        if (open < 0) continue;
        const expression = source.slice(open + 1, close).trim();
        let size: number | undefined;
        const assignment = /^([A-Za-z_]\w*)\s*=/.exec(expression);
        if (assignment) size = arraySizes.get(assignment[1]);
        const constructor = /^[A-Za-z_]\w*\s*\[\s*(\d+)\s*\]\s*\(/.exec(expression);
        if (size === undefined && constructor) size = Number(constructor[1]);
        const call = /^([A-Za-z_]\w*)\s*\([\s\S]*\)$/.exec(expression);
        if (size === undefined && call) size = functionArraySizes.get(call[1]);
        if (size === undefined) continue;
        replacements.push({ start: open, end: lengthCall.lastIndex, value: `((${expression}), ${size})` });
    }
    let out = source;
    for (const replacement of replacements.reverse()) {
        out = out.slice(0, replacement.start) + replacement.value + out.slice(replacement.end);
    }
    return out;
}

export const WEBGL1_GLSL_BUILTIN_LIMITS: Readonly<Record<string, number>> = {
    gl_MaxVertexAttribs: 16,
    gl_MaxVertexUniformVectors: 1024,
    gl_MaxVaryingVectors: 32,
    gl_MaxVertexTextureImageUnits: 16,
    gl_MaxCombinedTextureImageUnits: 32,
    gl_MaxTextureImageUnits: 16,
    gl_MaxFragmentUniformVectors: 1024,
    gl_MaxDrawBuffers: 1,
};

export const WEBGL2_GLSL_BUILTIN_LIMITS: Readonly<Record<string, number>> = {
    ...WEBGL1_GLSL_BUILTIN_LIMITS,
    gl_MaxDrawBuffers: 4,
    gl_MaxVertexOutputVectors: 16,
    gl_MaxFragmentInputVectors: 32,
    gl_MinProgramTexelOffset: -8,
    gl_MaxProgramTexelOffset: 7,
};

export function normalizeWebGlShaderLanguageVersion(source: string, languageVersion: 1 | 2): string {
    return source.replace(/\b__VERSION__\b/g, languageVersion === 2 ? "300" : "100");
}

export function normalizeWebGl1BuiltinLimits(source: string): string {
    let out = source;
    for (const [name, value] of Object.entries(WEBGL1_GLSL_BUILTIN_LIMITS)) {
        out = out.replace(new RegExp(`\\b${name}\\b`, "g"), String(value));
    }
    return out;
}

export function normalizeWebGl2BuiltinLimits(source: string): string {
    let out = source;
    for (const [name, value] of Object.entries(WEBGL2_GLSL_BUILTIN_LIMITS)) {
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

function splitIntegerConstantArguments(source: string): string[] | null {
    const arguments_: string[] = [];
    let depth = 0;
    let start = 0;
    for (let index = 0; index < source.length; index++) {
        const character = source[index];
        if (character === "(") depth++;
        else if (character === ")") {
            if (depth === 0) return null;
            depth--;
        } else if (character === "," && depth === 0) {
            arguments_.push(source.slice(start, index).trim());
            start = index + 1;
        }
    }
    if (depth !== 0) return null;
    arguments_.push(source.slice(start).trim());
    return arguments_;
}

function evaluateSimpleIntegerConstant(
    expression: string,
    constants: ReadonlyMap<string, number>,
    depth: number = 0,
): number | undefined {
    if (depth > 32) return undefined;
    let value = expression.trim();
    while (value.startsWith("(") && value.endsWith(")")) {
        let balance = 0;
        let enclosesExpression = true;
        for (let index = 0; index < value.length; index++) {
            if (value[index] === "(") balance++;
            else if (value[index] === ")") balance--;
            if (balance === 0 && index !== value.length - 1) {
                enclosesExpression = false;
                break;
            }
        }
        if (!enclosesExpression || balance !== 0) break;
        value = value.slice(1, -1).trim();
    }
    if (/^[+-]?(?:0[xX][0-9a-fA-F]+|\d+)$/.test(value)) {
        const parsed = Number(value);
        return Number.isSafeInteger(parsed) ? parsed : undefined;
    }
    if (/^[A-Za-z_]\w*$/.test(value)) return constants.get(value);

    const call = /^(min|max|clamp)\s*\(([\s\S]*)\)$/.exec(value);
    if (!call) return undefined;
    const args = splitIntegerConstantArguments(call[2]);
    const required = call[1] === "clamp" ? 3 : 2;
    if (!args || args.length !== required) return undefined;
    const evaluated = args.map((argument) =>
        evaluateSimpleIntegerConstant(argument, constants, depth + 1));
    if (evaluated.some((argument) => argument === undefined)) return undefined;
    const numbers = evaluated as number[];
    if (call[1] === "min") return Math.min(numbers[0], numbers[1]);
    if (call[1] === "max") return Math.max(numbers[0], numbers[1]);
    return Math.min(Math.max(numbers[0], numbers[1]), numbers[2]);
}

/**
 * glslang can mis-evaluate otherwise valid integer min/max/clamp case labels.
 * Fold only labels whose value is provable from unique scalar const declarations.
 */
export function foldGlslIntegerBuiltinCaseLabels(source: string): string {
    const masked = maskComments(source);
    const constants = new Map<string, number>();
    const ambiguous = new Set<string>();
    const declaration = /\bconst\s+(?:(?:lowp|mediump|highp)\s+)?int\s+([A-Za-z_]\w*)\s*=\s*([^;]+);/g;
    for (let match = declaration.exec(masked); match !== null; match = declaration.exec(masked)) {
        const name = match[1];
        if (constants.has(name) || ambiguous.has(name)) {
            constants.delete(name);
            ambiguous.add(name);
            continue;
        }
        const evaluated = evaluateSimpleIntegerConstant(match[2], constants);
        if (evaluated !== undefined && evaluated >= -0x80000000 && evaluated <= 0x7fffffff) {
            constants.set(name, evaluated);
        }
    }

    const replacements: Array<{ start: number, end: number, value: string }> = [];
    const caseToken = /\bcase\b/g;
    for (let match = caseToken.exec(masked); match !== null; match = caseToken.exec(masked)) {
        const expressionStart = caseToken.lastIndex;
        let parenDepth = 0;
        let expressionEnd = -1;
        for (let index = expressionStart; index < masked.length; index++) {
            const character = masked[index];
            if (character === "(") parenDepth++;
            else if (character === ")") {
                if (parenDepth === 0) break;
                parenDepth--;
            } else if (character === ":" && parenDepth === 0) {
                expressionEnd = index;
                break;
            } else if (character === "{" || character === "}" || character === ";") {
                break;
            }
        }
        if (expressionEnd < 0) continue;
        const expression = masked.slice(expressionStart, expressionEnd).trim();
        if (!/\b(?:min|max|clamp)\s*\(/.test(expression)) continue;
        const evaluated = evaluateSimpleIntegerConstant(expression, constants);
        if (evaluated === undefined || evaluated < -0x80000000 || evaluated > 0x7fffffff) continue;
        const leading = masked.slice(expressionStart, expressionEnd).search(/\S/);
        const trailing = masked.slice(expressionStart, expressionEnd).match(/\s*$/)?.[0].length || 0;
        replacements.push({
            start: expressionStart + Math.max(0, leading),
            end: expressionEnd - trailing,
            value: String(evaluated),
        });
    }
    let result = source;
    for (const replacement of replacements.reverse()) {
        result = result.slice(0, replacement.start) + replacement.value + result.slice(replacement.end);
    }
    return result;
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
