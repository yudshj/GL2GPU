export interface WgslOptimizerStats {
    optimizeTintWgsl: boolean;
    loweredPrivateVars: number;
    loweredPointerParams: number;
    promotedLocalVars: number;
    branchifiedSelects: number;
    hoistedModOperands: number;
    foldedModByOne: number;
    elidedRangeClamps: number;
    foldedOutputStores: number;
    collapsedOutputStructs: number;
    removedTemporaries: number;
    foldedConstructors: number;
    splitDeepExpressions: number;
    skippedPasses: string[];
}

export interface WgslOptimizerResult {
    wgsl: string;
    stats: WgslOptimizerStats;
}

interface SourceRange {
    start: number;
    end: number;
    replacement: string;
}

interface ParsedFunction {
    name: string;
    start: number;
    end: number;
    fnStart: number;
    openParen: number;
    closeParen: number;
    bodyOpen: number;
    bodyClose: number;
    attributes: string;
    params: string;
    returnType: string;
    body: string;
}

interface ParsedStruct {
    name: string;
    fields: string[];
    fieldDetails: ParsedStructField[];
    start: number;
    end: number;
}

interface ParsedStructField {
    attributes: string;
    name: string;
    type: string;
}

interface PrivateDeclaration {
    name: string;
    start: number;
    end: number;
}

interface EntryLowering {
    wgsl: string;
    loweredPrivateVars: number;
    skipped?: string;
}

interface PointerParamLowering {
    wgsl: string;
    loweredPointerParams: number;
    skipped?: string;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wordBoundaryReplace(source: string, from: string, to: string): string {
    return source.replace(new RegExp(`\\b${escapeRegExp(from)}\\b`, "g"), to);
}

function countIdentifier(source: string, name: string): number {
    return source.match(new RegExp(`\\b${escapeRegExp(name)}\\b`, "g"))?.length ?? 0;
}

function findMatching(source: string, openIndex: number, openChar: string, closeChar: string): number {
    let depth = 0;
    for (let i = openIndex; i < source.length; i++) {
        const ch = source[i];
        if (ch === openChar) {
            depth++;
        } else if (ch === closeChar) {
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
    return args.map((arg) => arg.trim()).filter((arg) => arg.length > 0);
}

function splitTopLevelParameters(source: string): string[] {
    const params: string[] = [];
    let start = 0;
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    let angleDepth = 0;

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
        } else if (ch === "<") {
            angleDepth++;
        } else if (ch === ">" && angleDepth > 0) {
            angleDepth--;
        } else if (ch === "," && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0 && angleDepth === 0) {
            params.push(source.slice(start, i));
            start = i + 1;
        }
    }

    params.push(source.slice(start));
    return params.map((param) => param.trim()).filter((param) => param.length > 0);
}

function stripWholeExpressionParentheses(source: string): string {
    let out = source.trim();
    while (out.startsWith("(") && findMatching(out, 0, "(", ")") === out.length - 1) {
        out = out.slice(1, -1).trim();
    }
    return out;
}

function rightmostTopLevelPlus(source: string): number {
    let parenDepth = 0;
    let bracketDepth = 0;
    for (let index = source.length - 1; index >= 0; index--) {
        const ch = source[index];
        if (ch === ")") parenDepth++;
        else if (ch === "(") parenDepth--;
        else if (ch === "]") bracketDepth++;
        else if (ch === "[") bracketDepth--;
        else if (ch === "+" && parenDepth === 0 && bracketDepth === 0) {
            let previous = index - 1;
            let next = index + 1;
            while (previous >= 0 && /\s/.test(source[previous])) previous--;
            while (next < source.length && /\s/.test(source[next])) next++;
            if (previous >= 0 && next < source.length && !/[+\-*/%(<>=!,&|^]/.test(source[previous])) {
                return index;
            }
        }
    }
    return -1;
}

function leftAssociativeAddTerms(source: string): string[] {
    const rightTerms: string[] = [];
    let left = stripWholeExpressionParentheses(source);
    while (true) {
        const plus = rightmostTopLevelPlus(left);
        if (plus < 0) break;
        rightTerms.push(left.slice(plus + 1).trim());
        left = stripWholeExpressionParentheses(left.slice(0, plus));
    }
    return [left, ...rightTerms.reverse()];
}

export function splitDeepAssociativeExpressions(source: string): { wgsl: string, split: number } {
    const lines = source.split("\n");
    let split = 0;
    let temporary = 0;
    const out: string[] = [];
    const assignment = /^(\s*)((?:(?:let|var)\s+[A-Za-z_]\w*(?:\s*:\s*[^=;]+)?|[A-Za-z_]\w*)\s*=\s*)(.+);\s*$/;
    for (const line of lines) {
        const match = assignment.exec(line);
        if (!match) {
            out.push(line);
            continue;
        }
        const terms = leftAssociativeAddTerms(match[3]);
        if (terms.length <= 48) {
            out.push(line);
            continue;
        }
        let expression = terms[0];
        let chunkTerms = 0;
        for (let index = 1; index < terms.length; index++) {
            expression = `(${expression} + ${terms[index]})`;
            chunkTerms++;
            if (chunkTerms === 24 && index < terms.length - 1) {
                const name = `_hyd_add_chain_${temporary++}`;
                out.push(`${match[1]}let ${name} = ${expression};`);
                expression = name;
                chunkTerms = 0;
                split++;
            }
        }
        out.push(`${match[1]}${match[2]}${expression};`);
    }
    return { wgsl: out.join("\n"), split };
}

function parseFunctions(source: string): ParsedFunction[] {
    const functions: ParsedFunction[] = [];
    const regex = /((?:@[A-Za-z_]\w*(?:\([^)]*\))?\s*)*)fn\s+([A-Za-z_]\w*)\s*\(/g;
    for (let match = regex.exec(source); match !== null; match = regex.exec(source)) {
        const openParen = regex.lastIndex - 1;
        const closeParen = findMatching(source, openParen, "(", ")");
        if (closeParen < 0) {
            continue;
        }
        const bodyOpen = source.indexOf("{", closeParen + 1);
        if (bodyOpen < 0) {
            continue;
        }
        const bodyClose = findMatching(source, bodyOpen, "{", "}");
        if (bodyClose < 0) {
            continue;
        }
        const attributes = match[1] || "";
        const fnStart = match.index + attributes.length;
        functions.push({
            name: match[2],
            start: match.index,
            end: bodyClose + 1,
            fnStart,
            openParen,
            closeParen,
            bodyOpen,
            bodyClose,
            attributes,
            params: source.slice(openParen + 1, closeParen),
            returnType: source.slice(closeParen + 1, bodyOpen).trimEnd(),
            body: source.slice(bodyOpen + 1, bodyClose),
        });
        regex.lastIndex = bodyClose + 1;
    }
    return functions;
}

function parsePrivateDeclarations(source: string): PrivateDeclaration[] {
    const declarations: PrivateDeclaration[] = [];
    const regex = /\bvar<private>\s+([A-Za-z_]\w*)\s*:\s*[^;]+;\s*/g;
    for (let match = regex.exec(source); match !== null; match = regex.exec(source)) {
        declarations.push({
            name: match[1],
            start: match.index,
            end: regex.lastIndex,
        });
    }
    return declarations;
}

function parseStructs(source: string): ParsedStruct[] {
    const structs: ParsedStruct[] = [];
    const regex = /\bstruct\s+([A-Za-z_]\w*)\s*\{/g;
    for (let match = regex.exec(source); match !== null; match = regex.exec(source)) {
        const bodyOpen = regex.lastIndex - 1;
        const bodyClose = findMatching(source, bodyOpen, "{", "}");
        if (bodyClose < 0) {
            continue;
        }
        const body = source.slice(bodyOpen + 1, bodyClose);
        const fields: string[] = [];
        const fieldDetails: ParsedStructField[] = [];
        const fieldRegex = /((?:@[A-Za-z_]\w*(?:\([^)]*\))?\s*)*)([A-Za-z_]\w*)\s*:\s*([^,]+),/g;
        for (let field = fieldRegex.exec(body); field !== null; field = fieldRegex.exec(body)) {
            const attributes = (field[1] || "").replace(/\s+/g, " ").trim();
            const name = field[2];
            fields.push(name);
            fieldDetails.push({
                attributes,
                name,
                type: field[3].trim(),
            });
        }
        structs.push({ name: match[1], fields, fieldDetails, start: match.index, end: bodyClose + 1 });
        regex.lastIndex = bodyClose + 1;
    }
    return structs;
}

function parseParamNames(params: string): Set<string> {
    const names = new Set<string>();
    for (const param of splitTopLevelArguments(params)) {
        const cleaned = param.replace(/@[A-Za-z_]\w*(?:\([^)]*\))?/g, " ").trim();
        const match = cleaned.match(/\b([A-Za-z_]\w*)\s*:\s*[^:]+$/);
        if (match) {
            names.add(match[1]);
        }
    }
    return names;
}

function stripRecognizedEntryStatements(
    body: string,
    assignments: Array<{ target: string, value: string }>,
    helperName: string,
    returnStatement: string,
): string {
    let out = body;
    for (const assignment of assignments) {
        out = out.replace(new RegExp(`^\\s*${escapeRegExp(assignment.target)}\\s*=\\s*${escapeRegExp(assignment.value)}\\s*;\\s*$`, "m"), "");
    }
    out = out.replace(new RegExp(`^\\s*${escapeRegExp(helperName)}\\s*\\(\\s*\\)\\s*;\\s*$`, "m"), "");
    out = out.replace(new RegExp(`^\\s*${escapeRegExp(returnStatement)}\\s*$`, "m"), "");
    return out.replace(/\/\/.*$/gm, "").trim();
}

function removeRanges(source: string, ranges: SourceRange[]): string {
    let out = source;
    const sorted = ranges.slice().sort((a, b) => b.start - a.start);
    for (const range of sorted) {
        out = out.slice(0, range.start) + range.replacement + out.slice(range.end);
    }
    return out;
}

interface FragmentOutputWidth {
    scalar: "f32" | "i32" | "u32";
    width: number;
}

function fragmentOutputWidth(type: string): FragmentOutputWidth | null {
    const compact = type.replace(/\s+/g, "");
    if (compact === "f32" || compact === "i32" || compact === "u32") {
        return { scalar: compact, width: 1 };
    }
    const alias = /^vec([234])([fiu])$/.exec(compact);
    if (alias) {
        const scalar = alias[2] === "f" ? "f32" : alias[2] === "i" ? "i32" : "u32";
        return { scalar, width: Number(alias[1]) };
    }
    const generic = /^vec([234])<(f32|i32|u32)>$/.exec(compact);
    return generic ? { scalar: generic[2] as FragmentOutputWidth["scalar"], width: Number(generic[1]) } : null;
}

function expandedFragmentOutputType(output: FragmentOutputWidth): string {
    return output.scalar === "f32" ? "vec4f" : output.scalar === "i32" ? "vec4i" : "vec4u";
}

function expandFragmentOutputExpression(expression: string, output: FragmentOutputWidth): string {
    const constructor = expandedFragmentOutputType(output);
    const zero = output.scalar === "f32" ? "0.0f" : output.scalar === "i32" ? "0i" : "0u";
    const one = output.scalar === "f32" ? "1.0f" : output.scalar === "i32" ? "1i" : "1u";
    if (output.width === 1) return `${constructor}(${expression.trim()}, ${zero}, ${zero}, ${one})`;
    if (output.width === 2) return `${constructor}(${expression.trim()}, ${zero}, ${one})`;
    return `${constructor}(${expression.trim()}, ${one})`;
}

function expandStructConstructorCalls(
    body: string,
    structName: string,
    outputs: Array<FragmentOutputWidth | null>,
): { body: string, replacements: number } {
    const call = new RegExp(`\\b${escapeRegExp(structName)}\\s*\\(`, "g");
    let result = "";
    let cursor = 0;
    let replacements = 0;
    for (let match = call.exec(body); match !== null; match = call.exec(body)) {
        const openParen = body.indexOf("(", match.index);
        const closeParen = findMatching(body, openParen, "(", ")");
        if (closeParen < 0) break;
        const args = splitTopLevelArguments(body.slice(openParen + 1, closeParen));
        if (args.length === outputs.length) {
            const rewritten = args.map((arg, index) => outputs[index]
                ? expandFragmentOutputExpression(arg, outputs[index]!)
                : arg);
            result += body.slice(cursor, openParen + 1) + rewritten.join(", ") + ")";
            cursor = closeParen + 1;
            replacements++;
        }
        call.lastIndex = closeParen + 1;
    }
    if (replacements === 0) return { body, replacements: 0 };
    return { body: result + body.slice(cursor), replacements };
}

/**
 * WebGL fragment colors conceptually supply RGBA values even when the shader
 * declares a scalar or shorter vector output. WebGPU requires the entry-point
 * output width to cover the physical attachment width, so materialize WebGL's
 * missing-channel defaults at the entry boundary.
 */
export function normalizeWebGlFragmentOutputWidths(source: string): { wgsl: string, expanded: number } {
    const fragment = parseFunctions(source).find((fn) => /@fragment\b/.test(fn.attributes));
    if (!fragment) return { wgsl: source, expanded: 0 };

    const directReturn = /^\s*->\s*((?:(?:@[A-Za-z_]\w*(?:\([^)]*\))?)\s*)+)([\s\S]+?)\s*$/.exec(fragment.returnType);
    if (directReturn && /@location\s*\(/.test(directReturn[1])) {
        const output = fragmentOutputWidth(directReturn[2]);
        if (output && output.width < 4) {
            let bodyReplacements = 0;
            const body = fragment.body.replace(/\breturn\s+([^;]+);/g, (_match, expression: string) => {
                bodyReplacements++;
                return `return ${expandFragmentOutputExpression(expression, output)};`;
            });
            if (bodyReplacements > 0) {
                return {
                    wgsl: removeRanges(source, [
                        {
                            start: fragment.closeParen + 1,
                            end: fragment.bodyOpen,
                            replacement: ` -> ${directReturn[1].trim()} ${expandedFragmentOutputType(output)} `,
                        },
                        { start: fragment.bodyOpen + 1, end: fragment.bodyClose, replacement: body },
                    ]),
                    expanded: 1,
                };
            }
        }
        return { wgsl: source, expanded: 0 };
    }

    const structName = returnStructName(fragment.returnType);
    const outputStruct = structName ? parseStructs(source).find((item) => item.name === structName) : undefined;
    if (!outputStruct || outputStruct.fieldDetails.length !== outputStruct.fields.length) {
        return { wgsl: source, expanded: 0 };
    }
    const outputs = outputStruct.fieldDetails.map((field) => {
        if (!/@location\s*\(/.test(field.attributes)) return null;
        const output = fragmentOutputWidth(field.type);
        return output && output.width < 4 ? output : null;
    });
    const expanded = outputs.filter(Boolean).length;
    if (expanded === 0) return { wgsl: source, expanded: 0 };

    let body = expandStructConstructorCalls(fragment.body, outputStruct.name, outputs).body;
    const structVariables = Array.from(body.matchAll(new RegExp(`\\bvar\\s+([A-Za-z_]\\w*)\\s*:\\s*${escapeRegExp(outputStruct.name)}\\b`, "g")))
        .map((match) => match[1]);
    for (const variable of structVariables) {
        outputs.forEach((output, index) => {
            if (!output) return;
            const field = outputStruct.fieldDetails[index];
            body = body.replace(
                new RegExp(`\\b${escapeRegExp(variable)}\\.${escapeRegExp(field.name)}\\s*=\\s*([^;]+);`, "g"),
                (_match, expression: string) => `${variable}.${field.name} = ${expandFragmentOutputExpression(expression, output)};`,
            );
        });
    }

    const structReplacement = `struct ${outputStruct.name} {\n` + outputStruct.fieldDetails.map((field, index) => {
        const attributes = field.attributes ? `${field.attributes}\n  ` : "";
        const type = outputs[index] ? expandedFragmentOutputType(outputs[index]!) : field.type;
        return `  ${attributes}${field.name} : ${type},`;
    }).join("\n") + "\n}";
    return {
        wgsl: removeRanges(source, [
            { start: outputStruct.start, end: outputStruct.end, replacement: structReplacement },
            { start: fragment.bodyOpen + 1, end: fragment.bodyClose, replacement: body },
        ]),
        expanded,
    };
}

function assignmentCount(source: string, name: string): number {
    const regex = new RegExp(`\\b${escapeRegExp(name)}\\s*(?:[+\\-*/%&|^]?=)`, "g");
    return source.match(regex)?.length ?? 0;
}

function directAssignmentCount(source: string, name: string): number {
    const regex = new RegExp(`(?:^|[;\\n]\\s*)${escapeRegExp(name)}\\s*=`, "g");
    return source.match(regex)?.length ?? 0;
}

function fieldOrIndexAssignmentCount(source: string, name: string): number {
    const regex = new RegExp(`(?:^|[;\\n]\\s*)${escapeRegExp(name)}\\s*(?:\\.|\\[[^\\]]+\\])[^=;\\n]*=`, "g");
    return source.match(regex)?.length ?? 0;
}

function pointerAssignmentCount(source: string, name: string): number {
    const deref = `\\*\\s*\\(\\s*${escapeRegExp(name)}\\s*\\)`;
    const maybeParenthesizedDeref = `(?:${deref}|\\(\\s*${deref}\\s*\\))`;
    const regex = new RegExp(`${maybeParenthesizedDeref}\\s*(?:[+\\-*/%&|^]?=|(?:\\.|\\[[^\\]]+\\])[^=;\\n]*=)`, "g");
    return source.match(regex)?.length ?? 0;
}

function applyIdentifierMap(source: string, replacements: Map<string, string>): string {
    let out = source;
    const names = Array.from(replacements.keys()).sort((a, b) => b.length - a.length);
    for (const name of names) {
        out = wordBoundaryReplace(out, name, replacements.get(name));
    }
    return out;
}

function applyExpressionMap(source: string, replacements: Map<string, string>): string {
    let out = source;
    const expressions = Array.from(replacements.keys()).sort((a, b) => b.length - a.length);
    for (const expression of expressions) {
        out = out.replace(
            new RegExp(`\\b${escapeRegExp(expression)}(?=$|[^A-Za-z0-9_])`, "g"),
            replacements.get(expression),
        );
    }
    return out;
}

function exactAssignmentCount(source: string, expression: string): number {
    const regex = new RegExp(`(?:^|[;\\n]\\s*)${escapeRegExp(expression)}\\s*(?:[+\\-*/%&|^]?=)`, "g");
    return source.match(regex)?.length ?? 0;
}

function lowerEntryWrapper(source: string): EntryLowering {
    const functions = parseFunctions(source);
    const entries = functions.filter((fn) => /@(vertex|fragment)\b/.test(fn.attributes));
    if (entries.length !== 1) {
        return { wgsl: source, loweredPrivateVars: 0, skipped: entries.length === 0 ? "no-entry-wrapper" : "multiple-entrypoints" };
    }

    const entry = entries[0];
    const privateDeclarations = parsePrivateDeclarations(source);
    if (privateDeclarations.length === 0) {
        return { wgsl: source, loweredPrivateVars: 0, skipped: "no-private-io" };
    }
    const privateNames = new Set(privateDeclarations.map((declaration) => declaration.name));
    const params = parseParamNames(entry.params);

    const entryAssignments: Array<{ target: string, value: string }> = [];
    const assignmentRegex = /^\s*([A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*)\s*;\s*$/gm;
    for (let match = assignmentRegex.exec(entry.body); match !== null; match = assignmentRegex.exec(entry.body)) {
        if (privateNames.has(match[1]) && params.has(match[2])) {
            entryAssignments.push({ target: match[1], value: match[2] });
        }
    }

    const helperCallMatch = /^\s*([A-Za-z_]\w*)\s*\(\s*\)\s*;\s*$/m.exec(entry.body);
    if (!helperCallMatch) {
        return { wgsl: source, loweredPrivateVars: 0, skipped: "entry-helper-call-not-found" };
    }
    const helper = functions.find((fn) => fn.name === helperCallMatch[1] && fn !== entry && !/@(vertex|fragment)\b/.test(fn.attributes));
    if (!helper) {
        return { wgsl: source, loweredPrivateVars: 0, skipped: "helper-function-not-found" };
    }

    const returnMatch = /^\s*return\s+([A-Za-z_]\w*)\s*\(([\s\S]*?)\)\s*;\s*$/m.exec(entry.body);
    if (!returnMatch) {
        return { wgsl: source, loweredPrivateVars: 0, skipped: "entry-return-constructor-not-found" };
    }
    const outputStructName = returnMatch[1];
    const outputStruct = parseStructs(source).find((item) => item.name === outputStructName);
    if (!outputStruct) {
        return { wgsl: source, loweredPrivateVars: 0, skipped: "entry-output-struct-not-found" };
    }

    const returnArgs = splitTopLevelArguments(returnMatch[2]);
    if (returnArgs.length !== outputStruct.fields.length) {
        return { wgsl: source, loweredPrivateVars: 0, skipped: "entry-output-arity-mismatch" };
    }

    const inputMap = new Map<string, string>();
    for (const assignment of entryAssignments) {
        inputMap.set(assignment.target, assignment.value);
    }

    const outputMap = new Map<string, string>();
    const outputExpressionMap = new Map<string, string>();
    const outputPrivateNames = new Set<string>();
    for (let i = 0; i < returnArgs.length; i++) {
        const arg = returnArgs[i].trim();
        if (/^[A-Za-z_]\w*$/.test(arg) && privateNames.has(arg)) {
            if (outputMap.has(arg)) {
                return { wgsl: source, loweredPrivateVars: 0, skipped: "duplicate-output-expression" };
            }
            outputMap.set(arg, `_hyd_output.${outputStruct.fields[i]}`);
            outputPrivateNames.add(arg);
            continue;
        }
        const indexed = /^([A-Za-z_]\w*)\s*\[\s*([^\]]+)\s*\]$/.exec(arg);
        if (indexed && privateNames.has(indexed[1])) {
            const expression = `${indexed[1]}[${indexed[2].trim()}]`;
            if (outputExpressionMap.has(expression)) {
                return { wgsl: source, loweredPrivateVars: 0, skipped: "duplicate-output-expression" };
            }
            outputExpressionMap.set(expression, `_hyd_output.${outputStruct.fields[i]}`);
            outputPrivateNames.add(indexed[1]);
            continue;
        }
        return { wgsl: source, loweredPrivateVars: 0, skipped: "unsupported-output-expression" };
    }

    const mappedPrivateNames = new Set([...inputMap.keys(), ...outputPrivateNames]);
    if (mappedPrivateNames.size === 0) {
        return { wgsl: source, loweredPrivateVars: 0, skipped: "no-mapped-private-io" };
    }

    const recognizedRemainder = stripRecognizedEntryStatements(
        entry.body,
        entryAssignments,
        helper.name,
        returnMatch[0],
    );
    if (recognizedRemainder.length > 0) {
        return { wgsl: source, loweredPrivateVars: 0, skipped: "entry-body-has-extra-statements" };
    }

    const outsideHelperAndEntry = removeRanges(source, [
        { start: helper.start, end: helper.end, replacement: "" },
        { start: entry.start, end: entry.end, replacement: "" },
        ...privateDeclarations.map((declaration) => ({ start: declaration.start, end: declaration.end, replacement: "" })),
    ]);
    if (countIdentifier(outsideHelperAndEntry, helper.name) > 0) {
        return { wgsl: source, loweredPrivateVars: 0, skipped: "helper-has-other-callsites" };
    }
    for (const name of mappedPrivateNames) {
        if (countIdentifier(outsideHelperAndEntry, name) > 0) {
            return { wgsl: source, loweredPrivateVars: 0, skipped: "private-io-escapes-wrapper" };
        }
    }

    for (const name of inputMap.keys()) {
        if (assignmentCount(helper.body, name) > 0) {
            return { wgsl: source, loweredPrivateVars: 0, skipped: "input-private-written-in-helper" };
        }
    }
    for (const name of outputMap.keys()) {
        if (assignmentCount(helper.body, name) + fieldOrIndexAssignmentCount(helper.body, name) < 1) {
            return { wgsl: source, loweredPrivateVars: 0, skipped: "output-private-never-written" };
        }
    }
    for (const expression of outputExpressionMap.keys()) {
        if (exactAssignmentCount(helper.body, expression) < 1) {
            return { wgsl: source, loweredPrivateVars: 0, skipped: "output-private-never-written" };
        }
    }

    const replacements = new Map<string, string>([...inputMap, ...outputMap]);
    let loweredBody = applyExpressionMap(helper.body, outputExpressionMap);
    loweredBody = applyIdentifierMap(loweredBody, replacements)
        .replace(/^\s*return\s*;\s*$/gm, "")
        .trim();
    for (const name of mappedPrivateNames) {
        if (countIdentifier(loweredBody, name) > 0) {
            return { wgsl: source, loweredPrivateVars: 0, skipped: "private-io-has-unmapped-uses" };
        }
    }
    loweredBody = loweredBody.split("\n").map((line) => `  ${line}`).join("\n");

    const newEntry = `${entry.attributes}fn ${entry.name}(${entry.params})${entry.returnType} {\n  var _hyd_output: ${outputStructName};\n${loweredBody}\n  return _hyd_output;\n}`;
    const mappedDeclarations = privateDeclarations
        .filter((declaration) => mappedPrivateNames.has(declaration.name))
        .map((declaration) => ({ start: declaration.start, end: declaration.end, replacement: "" }));
    const wgsl = removeRanges(source, [
        { start: entry.start, end: entry.end, replacement: newEntry },
        { start: helper.start, end: helper.end, replacement: "" },
        ...mappedDeclarations,
    ]).replace(/\n{3,}/g, "\n\n");

    return {
        wgsl,
        loweredPrivateVars: mappedPrivateNames.size,
    };
}

function parsePointerParams(params: string): Array<{ index: number, name: string, valueType: string }> {
    const pointerParams: Array<{ index: number, name: string, valueType: string }> = [];
    const parsed = splitTopLevelParameters(params);
    parsed.forEach((param, index) => {
        const match = /^\s*([A-Za-z_]\w*)\s*:\s*([\s\S]+?)\s*$/.exec(param);
        if (!match) {
            return;
        }
        const pointerType = /^ptr\s*<\s*function\s*,\s*([\s\S]+?)(?:,\s*(?:read|read_write|write))?\s*>\s*$/.exec(match[2].trim());
        if (!pointerType) {
            return;
        }
        pointerParams.push({
            index,
            name: match[1],
            valueType: pointerType[1].trim(),
        });
    });
    return pointerParams;
}

function dereferenceCount(source: string, name: string): number {
    return source.match(new RegExp(`\\*\\s*\\(\\s*${escapeRegExp(name)}\\s*\\)`, "g"))?.length ?? 0;
}

function replacePointerDereferences(source: string, name: string): string {
    return source.replace(new RegExp(`\\*\\s*\\(\\s*${escapeRegExp(name)}\\s*\\)`, "g"), name);
}

function unwrapAddressOfArgument(arg: string): string | undefined {
    const paren = /^&\s*\(\s*([\s\S]+?)\s*\)$/.exec(arg);
    if (paren) {
        return paren[1].trim();
    }
    const bare = /^&\s*([A-Za-z_]\w*(?:\s*(?:\.|->)\s*[A-Za-z_]\w*|\s*\[[^\]]+\])*)\s*$/.exec(arg);
    return bare ? bare[1].trim() : undefined;
}

function findCallArgumentRanges(source: string, name: string, exclude: { start: number, end: number }): Array<{ start: number, end: number, args: string[] }> {
    const ranges: Array<{ start: number, end: number, args: string[] }> = [];
    const regex = new RegExp(`\\b${escapeRegExp(name)}\\s*\\(`, "g");
    for (let match = regex.exec(source); match !== null; match = regex.exec(source)) {
        const before = source.slice(Math.max(0, match.index - 4), match.index);
        if (/\bfn\s*$/.test(before)) {
            continue;
        }
        if (match.index >= exclude.start && match.index < exclude.end) {
            continue;
        }
        const openParen = regex.lastIndex - 1;
        const closeParen = findMatching(source, openParen, "(", ")");
        if (closeParen < 0) {
            continue;
        }
        ranges.push({
            start: openParen + 1,
            end: closeParen,
            args: splitTopLevelArguments(source.slice(openParen + 1, closeParen)),
        });
        regex.lastIndex = closeParen + 1;
    }
    return ranges;
}

function lowerReadOnlyPointerParamsOnce(source: string): PointerParamLowering {
    const functions = parseFunctions(source);
    for (const fn of functions) {
        const pointerParams = parsePointerParams(fn.params);
        if (pointerParams.length === 0) {
            continue;
        }

        let safe = true;
        for (const param of pointerParams) {
            if (countIdentifier(fn.body, param.name) !== dereferenceCount(fn.body, param.name)) {
                safe = false;
                break;
            }
            if (assignmentCount(fn.body, param.name) > 0 || pointerAssignmentCount(fn.body, param.name) > 0) {
                safe = false;
                break;
            }
        }
        if (!safe) {
            continue;
        }

        const calls = findCallArgumentRanges(source, fn.name, { start: fn.start, end: fn.end });
        if (calls.length === 0) {
            continue;
        }
        const pointerByIndex = new Map(pointerParams.map((param) => [param.index, param]));
        const callReplacements: SourceRange[] = [];
        for (const call of calls) {
            if (call.args.length < splitTopLevelParameters(fn.params).length) {
                safe = false;
                break;
            }
            const args = call.args.slice();
            for (const param of pointerParams) {
                const replacement = unwrapAddressOfArgument(args[param.index]);
                if (replacement === undefined) {
                    safe = false;
                    break;
                }
                args[param.index] = replacement;
            }
            if (!safe) {
                break;
            }
            callReplacements.push({
                start: call.start,
                end: call.end,
                replacement: args.join(", "),
            });
        }
        if (!safe) {
            continue;
        }

        let newBody = fn.body;
        for (const param of pointerParams) {
            newBody = replacePointerDereferences(newBody, param.name);
        }
        const newParams = splitTopLevelParameters(fn.params).map((param, index) => {
            const pointerParam = pointerByIndex.get(index);
            return pointerParam ? `${pointerParam.name} : ${pointerParam.valueType}` : param;
        }).join(", ");

        const wgsl = removeRanges(source, [
            ...callReplacements,
            { start: fn.bodyOpen + 1, end: fn.bodyClose, replacement: newBody },
            { start: fn.openParen + 1, end: fn.closeParen, replacement: newParams },
        ]);
        return {
            wgsl,
            loweredPointerParams: pointerParams.length,
        };
    }

    return { wgsl: source, loweredPointerParams: 0, skipped: "no-readonly-pointer-params" };
}

function lowerReadOnlyPointerParams(source: string): PointerParamLowering {
    let out = source;
    let loweredPointerParams = 0;
    for (let i = 0; i < 32; i++) {
        const lowered = lowerReadOnlyPointerParamsOnce(out);
        if (lowered.loweredPointerParams === 0) {
            return { wgsl: out, loweredPointerParams, skipped: lowered.skipped };
        }
        out = lowered.wgsl;
        loweredPointerParams += lowered.loweredPointerParams;
    }
    return { wgsl: out, loweredPointerParams, skipped: "pointer-param-iteration-limit" };
}

function collectVectorDimensions(source: string): Map<string, number> {
    const dimensions = new Map<string, number>();
    const typePattern = "vec\\s*([234])\\s*(?:f|<\\s*f32\\s*>)";
    const declarationRegex = new RegExp(`\\b(?:var(?:<[^>]+>)?|let)\\s+([A-Za-z_]\\w*)\\s*:\\s*${typePattern}`, "g");
    for (let match = declarationRegex.exec(source); match !== null; match = declarationRegex.exec(source)) {
        dimensions.set(match[1], Number(match[2]));
    }
    const inferredConstructorRegex = /\b(?:var|let)\s+([A-Za-z_]\w*)\s*=\s*vec([234])f\s*\(/g;
    for (let match = inferredConstructorRegex.exec(source); match !== null; match = inferredConstructorRegex.exec(source)) {
        dimensions.set(match[1], Number(match[2]));
    }
    const paramRegex = new RegExp(`\\b([A-Za-z_]\\w*)\\s*:\\s*${typePattern}`, "g");
    for (let match = paramRegex.exec(source); match !== null; match = paramRegex.exec(source)) {
        dimensions.set(match[1], Number(match[2]));
    }
    return dimensions;
}

function foldVectorConstructors(source: string): { wgsl: string, folded: number } {
    let folded = 0;
    const vectorDimensions = collectVectorDimensions(source);
    let out = source.replace(/\bvec2f\s*\(\s*([A-Za-z_]\w*)\.x\s*,\s*\1\.y\s*\)/g, (_match, value) => {
        if (vectorDimensions.get(value) !== 2) {
            return _match;
        }
        folded++;
        return value;
    });
    out = out.replace(/\bvec3f\s*\(\s*([A-Za-z_]\w*)\.x\s*,\s*\1\.y\s*,\s*\1\.z\s*\)/g, (_match, value) => {
        if (vectorDimensions.get(value) !== 3) {
            return _match;
        }
        folded++;
        return value;
    });
    out = out.replace(/\bvec4f\s*\(\s*([A-Za-z_]\w*)\.x\s*,\s*\1\.y\s*,\s*\1\.z\s*,\s*\1\.w\s*\)/g, (_match, value) => {
        if (vectorDimensions.get(value) !== 4) {
            return _match;
        }
        folded++;
        return value;
    });
    out = out.replace(/\bvec4f\s*\(\s*([A-Za-z_]\w*)\.x\s*,\s*\1\.y\s*,\s*\1\.z\s*,\s*([^,)]+?)\s*\)/g, (_match, value, scalar) => {
        if (vectorDimensions.get(value) !== 3) {
            return _match;
        }
        folded++;
        return `vec4f(${value}, ${scalar.trim()})`;
    });
    return { wgsl: out, folded };
}

function foldSimpleIfElseSelect(source: string): { wgsl: string, folded: number } {
    let folded = 0;
    const out = source.replace(
        /if\s*\(\s*([\s\S]*?)\s*\)\s*\{\s*([A-Za-z_]\w*)\s*=\s*([^;{}]+?)\s*;\s*\}\s*else\s*\{\s*\2\s*=\s*([^;{}]+?)\s*;\s*\}/g,
        (_match, condition, target, whenTrue, whenFalse) => {
            folded++;
            return `${target} = select(${whenFalse.trim()}, ${whenTrue.trim()}, ${condition.trim()});`;
        },
    );
    return { wgsl: out, folded };
}

function simpleAliasRoot(expression: string): string | undefined {
    return /^([A-Za-z_]\w*)(?:\.[A-Za-z_]\w*)?$/.exec(expression)?.[1];
}

function aliasSourceMayChange(
    sourceBeforeUse: string,
    sourceBetweenDeclarationAndUse: string,
    root: string,
    privateNames: Set<string>,
): boolean {
    if (privateNames.has(root)) {
        return true;
    }

    const escapedRoot = escapeRegExp(root);
    if (new RegExp(`&\\s*\\(?\\s*${escapedRoot}\\b`).test(sourceBeforeUse)) {
        return true;
    }

    const accessPath = `\\b${escapedRoot}\\b(?:\\s*\\.\\s*[A-Za-z_]\\w*|\\s*\\[[^\\]]+\\])*`;
    const assignment = new RegExp(`${accessPath}\\s*(?:=(?!=)|\\+=|-=|\\*=|/=|%=|&=|\\|=|\\^=|<<=|>>=|\\+\\+|--)`);
    return assignment.test(sourceBetweenDeclarationAndUse);
}

function removeSingleUseLetsInBody(
    body: string,
    privateNames: Set<string>,
    immutableNames: Set<string>,
): { body: string, removed: number } {
    let out = body;
    let removed = 0;
    let changed = true;
    while (changed) {
        changed = false;
        const regex = /^([ \t]*)let\s+((?:x|v)_\d+)(?:\s*:\s*[^=]+?)?\s*=\s*([^;{}]+);\s*\n/gm;
        for (let match = regex.exec(out); match !== null; match = regex.exec(out)) {
            const full = match[0];
            const name = match[2];
            const expression = match[3].trim();
            const after = out.slice(match.index + full.length);
            const useCount = countIdentifier(after, name);
            const root = simpleAliasRoot(expression);
            const immutableSource = root !== undefined && immutableNames.has(root);
            if (useCount === 0 || (!immutableSource && useCount !== 1)) {
                continue;
            }

            const firstUse = after.search(new RegExp(`\\b${escapeRegExp(name)}\\b`));
            if (firstUse < 0) {
                continue;
            }
            const betweenDeclarationAndUse = after.slice(0, firstUse);
            if (root) {
                const sourceBeforeUse = out.slice(0, match.index + full.length + firstUse);
                if (!immutableSource && aliasSourceMayChange(sourceBeforeUse, betweenDeclarationAndUse, root, privateNames)) {
                    continue;
                }
            } else if (betweenDeclarationAndUse.trim().length > 0) {
                const statementPrefix = betweenDeclarationAndUse.trim();
                const afterUse = after.slice(firstUse + name.length);
                const unaryCallAssignment = /^(?:(?:let|var)\s+[A-Za-z_]\w*(?:\s*:\s*[^=;]+)?|[A-Za-z_]\w*)\s*=\s*[A-Za-z_]\w*\(\s*$/.test(statementPrefix) &&
                    /^\s*\)\s*;/.test(afterUse);
                if (!unaryCallAssignment) {
                    continue;
                }
            }

            out = out.slice(0, match.index) + out.slice(match.index + full.length);
            const replacement = root ? expression : `(${expression})`;
            out = out.slice(0, match.index) + wordBoundaryReplace(out.slice(match.index), name, replacement);
            removed++;
            changed = true;
            break;
        }
    }
    return { body: out, removed };
}

function removeSingleUseLets(source: string): { wgsl: string, removed: number } {
    let out = source;
    let removed = 0;
    let changed = true;
    while (changed) {
        changed = false;
        const privateNames = new Set(parsePrivateDeclarations(out).map((declaration) => declaration.name));
        for (const fn of parseFunctions(out)) {
            const immutableNames = parseParamNames(fn.params);
            const letRegex = /\blet\s+([A-Za-z_]\w*)\b/g;
            for (let declaration = letRegex.exec(fn.body); declaration !== null; declaration = letRegex.exec(fn.body)) {
                immutableNames.add(declaration[1]);
            }
            const result = removeSingleUseLetsInBody(fn.body, privateNames, immutableNames);
            if (result.removed === 0) {
                continue;
            }
            out = out.slice(0, fn.bodyOpen + 1) + result.body + out.slice(fn.bodyClose);
            removed += result.removed;
            changed = true;
            break;
        }
    }
    return { wgsl: out, removed };
}

function expressionContainsExpensivePureCall(expression: string): boolean {
    return /\bpow\s*\(/.test(expression);
}

function isZeroLiteralExpression(expression: string): boolean {
    return /^\(?\s*0(?:\.0+)?f?\s*\)?$/.test(stripBalancedOuterParens(expression));
}

function findMatchingInLine(source: string, openIndex: number): number {
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

function findLazyPowSelect(line: string): { start: number, end: number, powExpression: string, zeroWhenTrue: boolean, condition: string } | undefined {
    let searchFrom = 0;
    while (searchFrom < line.length) {
        const selectStart = line.indexOf("select", searchFrom);
        if (selectStart < 0) {
            return undefined;
        }
        const before = selectStart === 0 ? "" : line[selectStart - 1];
        const after = line[selectStart + "select".length] || "";
        if ((before && /[A-Za-z0-9_]/.test(before)) || after !== "(") {
            searchFrom = selectStart + "select".length;
            continue;
        }
        const selectOpen = selectStart + "select".length;
        const selectClose = findMatchingInLine(line, selectOpen);
        if (selectClose < 0) {
            return undefined;
        }
        const args = splitTopLevelArguments(line.slice(selectOpen + 1, selectClose));
        if (args.length !== 3) {
            searchFrom = selectClose + 1;
            continue;
        }
        const [whenFalse, whenTrue, condition] = args;
        if (isZeroLiteralExpression(whenFalse) && expressionContainsExpensivePureCall(whenTrue)) {
            return { start: selectStart, end: selectClose + 1, powExpression: whenTrue.trim(), zeroWhenTrue: false, condition: condition.trim() };
        }
        if (isZeroLiteralExpression(whenTrue) && expressionContainsExpensivePureCall(whenFalse)) {
            return { start: selectStart, end: selectClose + 1, powExpression: whenFalse.trim(), zeroWhenTrue: true, condition: condition.trim() };
        }
        searchFrom = selectClose + 1;
    }
    return undefined;
}

function branchifyLazyPowSelects(source: string): { wgsl: string, branchified: number } {
    const lines = source.split("\n");
    let branchified = 0;
    let tempCounter = 0;
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (!/\bselect\s*\(/.test(line) || !/\bpow\s*\(/.test(line) || !/;\s*$/.test(line)) {
            continue;
        }
        const indent = /^(\s*)/.exec(line)?.[1] ?? "";
        const prelude: string[] = [];
        let select: ReturnType<typeof findLazyPowSelect>;
        while ((select = findLazyPowSelect(line)) !== undefined) {
            const tempName = `_hyd_lazy_pow_select_${tempCounter++}`;
            const condition = select.zeroWhenTrue ? `!(${select.condition})` : select.condition;
            prelude.push(
                `${indent}var ${tempName} : f32 = 0.0f;`,
                `${indent}if (${condition}) {`,
                `${indent}  ${tempName} = ${select.powExpression};`,
                `${indent}}`,
            );
            line = line.slice(0, select.start) + tempName + line.slice(select.end);
            branchified++;
        }
        if (prelude.length > 0) {
            lines[i] = `${prelude.join("\n")}\n${line}`;
        }
    }
    return { wgsl: lines.join("\n"), branchified };
}

function branchifyExpensiveSelects(source: string): { wgsl: string, branchified: number } {
    const lines = source.split("\n");
    let branchified = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const letMatch = /^(\s*)let\s+([A-Za-z_]\w*)\s*:\s*([^=]+?)\s*=\s*select\s*\(/.exec(line);
        const assignMatch = letMatch ? null : /^(\s*)([A-Za-z_]\w*)\s*=\s*select\s*\(/.exec(line);
        const match = letMatch || assignMatch;
        if (!match) {
            continue;
        }
        const selectStart = line.indexOf("select", Math.max(0, match[0].length - 16));
        if (selectStart < 0) {
            continue;
        }
        const selectOpen = line.indexOf("(", selectStart + "select".length);
        if (selectOpen < 0) {
            continue;
        }
        const selectClose = findMatchingInLine(line, selectOpen);
        if (selectClose < 0 || !/^\s*;\s*$/.test(line.slice(selectClose + 1))) {
            continue;
        }
        const args = splitTopLevelArguments(line.slice(selectOpen + 1, selectClose));
        if (args.length !== 3) {
            continue;
        }
        const [whenFalse, whenTrue, condition] = args;
        if (!expressionContainsExpensivePureCall(whenFalse) && !expressionContainsExpensivePureCall(whenTrue)) {
            continue;
        }
        const indent = match[1];
        const name = match[2];
        if (letMatch) {
            const type = letMatch[3].trim();
            lines[i] = [
                `${indent}var ${name} : ${type};`,
                `${indent}if (${condition}) {`,
                `${indent}  ${name} = ${whenTrue};`,
                `${indent}} else {`,
                `${indent}  ${name} = ${whenFalse};`,
                `${indent}}`,
            ].join("\n");
        } else {
            lines[i] = [
                `${indent}if (${condition}) {`,
                `${indent}  ${name} = ${whenTrue};`,
                `${indent}} else {`,
                `${indent}  ${name} = ${whenFalse};`,
                `${indent}}`,
            ].join("\n");
        }
        branchified++;
    }
    return { wgsl: lines.join("\n"), branchified };
}

function stripBalancedOuterParens(expression: string): string {
    let out = expression.trim();
    while (out.startsWith("(") && out.endsWith(")")) {
        const close = findMatching(out, 0, "(", ")");
        if (close !== out.length - 1) {
            break;
        }
        out = out.slice(1, -1).trim();
    }
    return out;
}

function normalizeExpressionForCompare(expression: string): string {
    return stripBalancedOuterParens(expression).replace(/\s+/g, "");
}

function returnStructName(returnType: string): string | undefined {
    const match = /^\s*->\s*([A-Za-z_]\w*)\s*$/.exec(returnType);
    return match ? match[1] : undefined;
}

function replaceOutputSwizzle(expression: string, outputName: string, fieldName: string, swizzle: string, replacement: string): string {
    const pattern = new RegExp(`${escapeRegExp(outputName)}\\.${escapeRegExp(fieldName)}\\.${escapeRegExp(swizzle)}`, "g");
    return expression.replace(pattern, () => replacement);
}

function foldOutputComponentStoresInBody(body: string, outputName: string): { body: string, folded: number } {
    const lines = body.split("\n");
    let folded = 0;
    for (let i = 0; i <= lines.length - 5; i++) {
        const xMatch = new RegExp(`^([ \\t]*)${escapeRegExp(outputName)}\\.([A-Za-z_]\\w*)\\.x\\s*=\\s*([\\s\\S]+);\\s*$`).exec(lines[i]);
        if (!xMatch) {
            continue;
        }
        const indent = xMatch[1];
        const field = xMatch[2];
        const yMatch = new RegExp(`^[ \\t]*${escapeRegExp(outputName)}\\.${escapeRegExp(field)}\\.y\\s*=\\s*([\\s\\S]+);\\s*$`).exec(lines[i + 1]);
        const wholeMatch = new RegExp(`^[ \\t]*${escapeRegExp(outputName)}\\.${escapeRegExp(field)}\\s*=\\s*([\\s\\S]+);\\s*$`).exec(lines[i + 2]);
        const zMatch = new RegExp(`^[ \\t]*${escapeRegExp(outputName)}\\.${escapeRegExp(field)}\\.z\\s*=\\s*([\\s\\S]+);\\s*$`).exec(lines[i + 3]);
        const wMatch = new RegExp(`^[ \\t]*${escapeRegExp(outputName)}\\.${escapeRegExp(field)}\\.w\\s*=\\s*([\\s\\S]+);\\s*$`).exec(lines[i + 4]);
        if (!yMatch || !wholeMatch || !zMatch || !wMatch) {
            continue;
        }

        const constructorArgs = unwrapFunctionCall(wholeMatch[1].trim(), "vec4f") ?? unwrapFunctionCall(wholeMatch[1].trim(), "vec4<f32>");
        if (!constructorArgs) {
            continue;
        }
        const args = splitTopLevelArguments(constructorArgs);
        if (args.length !== 2 || normalizeExpressionForCompare(args[1]) !== `${outputName}.${field}.zw`) {
            continue;
        }

        const xyReplacement = `vec2f(${xMatch[3].trim()}, ${yMatch[1].trim()})`;
        const xyExpression = replaceOutputSwizzle(args[0].trim(), outputName, field, "xy", xyReplacement);
        const xyComponents = splitVec2AffineComponents(xyExpression);
        const constructor = xyComponents
            ? `vec4f(${xyComponents[0]}, ${xyComponents[1]}, ${zMatch[1].trim()}, ${wMatch[1].trim()})`
            : `vec4f(${xyExpression}, ${zMatch[1].trim()}, ${wMatch[1].trim()})`;
        lines.splice(i, 5, `${indent}${outputName}.${field} = ${constructor};`);
        folded++;
    }
    for (let i = 0; i <= lines.length - 4; i++) {
        const xMatch = new RegExp(`^([ \\t]*)${escapeRegExp(outputName)}\\.([A-Za-z_]\\w*)\\.x\\s*=\\s*([\\s\\S]+);\\s*$`).exec(lines[i]);
        if (!xMatch) {
            continue;
        }
        const indent = xMatch[1];
        const field = xMatch[2];
        const yMatch = new RegExp(`^[ \\t]*${escapeRegExp(outputName)}\\.${escapeRegExp(field)}\\.y\\s*=\\s*([\\s\\S]+);\\s*$`).exec(lines[i + 1]);
        const zMatch = new RegExp(`^[ \\t]*${escapeRegExp(outputName)}\\.${escapeRegExp(field)}\\.z\\s*=\\s*([\\s\\S]+);\\s*$`).exec(lines[i + 2]);
        const wMatch = new RegExp(`^[ \\t]*${escapeRegExp(outputName)}\\.${escapeRegExp(field)}\\.w\\s*=\\s*([\\s\\S]+);\\s*$`).exec(lines[i + 3]);
        if (!yMatch || !zMatch || !wMatch) {
            continue;
        }
        lines.splice(i, 4, `${indent}${outputName}.${field} = vec4f(${xMatch[3].trim()}, ${yMatch[1].trim()}, ${zMatch[1].trim()}, ${wMatch[1].trim()});`);
        folded++;
    }
    return { body: lines.join("\n"), folded };
}

function scalarizeVec2OutputAssignmentsInBody(
    body: string,
    outputName: string,
    fieldTypes: Map<string, string>,
    vectorNames: Set<string>,
): { body: string, scalarized: number } {
    const lines = body.split("\n");
    let scalarized = 0;
    for (let i = 0; i < lines.length; i++) {
        const assignment = new RegExp(`^([ \\t]*)${escapeRegExp(outputName)}\\.([A-Za-z_]\\w*)\\s*=\\s*([\\s\\S]+);\\s*$`).exec(lines[i]);
        if (!assignment || !isVec2Type(fieldTypes.get(assignment[2]) || "")) {
            continue;
        }
        const components = splitVec2AffineComponents(assignment[3].trim(), vectorNames);
        if (!components) {
            continue;
        }
        const replacement = `${assignment[1]}${outputName}.${assignment[2]} = vec2f(${components[0]}, ${components[1]});`;
        if (replacement === lines[i]) {
            continue;
        }
        lines[i] = replacement;
        scalarized++;
    }
    return { body: lines.join("\n"), scalarized };
}

function foldOutputComponentStores(source: string): { wgsl: string, folded: number } {
    let out = source;
    let folded = 0;
    let changed = true;
    while (changed) {
        changed = false;
        const functions = parseFunctions(out);
        const structs = parseStructs(out);
        for (const fn of functions) {
            if (!/@(vertex|fragment)\b/.test(fn.attributes)) {
                continue;
            }
            const structName = returnStructName(fn.returnType);
            if (!structName) {
                continue;
            }
            const outputStruct = structs.find((item) => item.name === structName);
            if (!outputStruct) {
                continue;
            }
            const vectorNames = collectVec2ValueNames(fn);
            const fieldTypes = new Map(outputStruct.fieldDetails.map((field) => [field.name, field.type]));
            const varMatch = new RegExp(`^\\s*var\\s+([A-Za-z_]\\w*)\\s*:\\s*${escapeRegExp(structName)}\\s*;`).exec(fn.body);
            if (!varMatch) {
                continue;
            }
            if (/\b(if|for|while|loop|switch|discard|break|continue|return)\b/.test(fn.body.replace(new RegExp(`return\\s+${escapeRegExp(varMatch[1])}\\s*;\\s*$`), ""))) {
                continue;
            }
            const componentResult = foldOutputComponentStoresInBody(fn.body, varMatch[1]);
            const scalarResult = scalarizeVec2OutputAssignmentsInBody(componentResult.body, varMatch[1], fieldTypes, vectorNames);
            const changedCount = componentResult.folded + scalarResult.scalarized;
            if (changedCount === 0) {
                continue;
            }
            out = out.slice(0, fn.bodyOpen + 1) + scalarResult.body + out.slice(fn.bodyClose);
            folded += changedCount;
            changed = true;
            break;
        }
    }
    return { wgsl: out, folded };
}

function isVec2Type(type: string): boolean {
    return /^(?:vec2f|vec2\s*<\s*f32\s*>)$/.test(type.trim().replace(/\s+/g, ""));
}

function collectVec2ValueNames(fn: ParsedFunction): Set<string> {
    const names = new Set<string>();
    for (const param of splitTopLevelParameters(fn.params)) {
        const cleaned = param.replace(/@[A-Za-z_]\w*(?:\([^)]*\))?/g, " ").trim();
        const match = /^([A-Za-z_]\w*)\s*:\s*([\s\S]+)$/.exec(cleaned);
        if (match && isVec2Type(match[2])) {
            names.add(match[1]);
        }
    }
    const declarationRegex = /\b(?:let|var)\s+([A-Za-z_]\w*)\s*:\s*([^=;]+)(?:[=;])/g;
    for (let declaration = declarationRegex.exec(fn.body); declaration !== null; declaration = declarationRegex.exec(fn.body)) {
        if (isVec2Type(declaration[2])) {
            names.add(declaration[1]);
        }
    }
    return names;
}

function constructOutputStructReturnsOnce(source: string): { wgsl: string, constructed: number } {
    const functions = parseFunctions(source);
    const structs = parseStructs(source);
    for (const fn of functions) {
        if (!/@(vertex|fragment)\b/.test(fn.attributes)) {
            continue;
        }
        const structName = returnStructName(fn.returnType);
        if (!structName) {
            continue;
        }
        const outputStruct = structs.find((item) => item.name === structName);
        if (!outputStruct || outputStruct.fields.length === 0) {
            continue;
        }
        if (outputStruct.fields.length !== 1) {
            continue;
        }
        const vectorNames = collectVec2ValueNames(fn);
        const fieldTypes = new Map(outputStruct.fieldDetails.map((field) => [field.name, field.type]));
        const varMatch = new RegExp(`^\\s*var\\s+([A-Za-z_]\\w*)\\s*:\\s*${escapeRegExp(structName)}\\s*;[ \\t]*(?:\\r?\\n)?`).exec(fn.body);
        if (!varMatch) {
            continue;
        }
        const outputName = varMatch[1];
        const afterVar = fn.body.slice(varMatch[0].length);
        const returnMatch = new RegExp(`\\s*return\\s+${escapeRegExp(outputName)}\\s*;\\s*$`).exec(afterVar);
        if (!returnMatch) {
            continue;
        }
        const middle = afterVar.slice(0, returnMatch.index);
        if (/\b(if|for|while|loop|switch|return|discard|break|continue)\b/.test(middle)) {
            continue;
        }

        const assigned = new Map<string, string>();
        const prelude: string[] = [];
        let outputAssignmentsStarted = false;
        let safe = true;
        for (const line of middle.split("\n")) {
            const trimmed = line.trim();
            if (trimmed.length === 0) {
                if (!outputAssignmentsStarted) {
                    prelude.push(line);
                }
                continue;
            }
            const assignment = new RegExp(`^[ \\t]*${escapeRegExp(outputName)}\\.([A-Za-z_]\\w*)\\s*=\\s*([\\s\\S]+);\\s*$`).exec(line);
            if (assignment) {
                outputAssignmentsStarted = true;
                const field = assignment[1];
                let value = assignment[2].trim();
                if (assigned.has(field) || value.includes(`${outputName}.`)) {
                    safe = false;
                    break;
                }
                if (isVec2Type(fieldTypes.get(field) || "")) {
                    const components = splitVec2AffineComponents(value, vectorNames);
                    if (components) {
                        value = `vec2f(${components[0]}, ${components[1]})`;
                    }
                }
                assigned.set(field, value);
                continue;
            }
            if (outputAssignmentsStarted || new RegExp(`\\b${escapeRegExp(outputName)}\\b`).test(line)) {
                safe = false;
                break;
            }
            if (!/^\s*(let|var)\s+[A-Za-z_]\w*\b/.test(line)) {
                safe = false;
                break;
            }
            prelude.push(line);
        }
        if (!safe) {
            continue;
        }
        if (assigned.size !== outputStruct.fields.length || outputStruct.fields.some((field) => !assigned.has(field))) {
            continue;
        }

        const args = outputStruct.fields.map((field) => assigned.get(field)!);
        const preludeBody = prelude.join("\n").replace(/\s+$/g, "");
        const newBody = preludeBody.length > 0
            ? `\n${preludeBody}\n  return ${structName}(${args.join(", ")});\n`
            : `\n  return ${structName}(${args.join(", ")});\n`;
        return {
            wgsl: source.slice(0, fn.bodyOpen + 1) + newBody + source.slice(fn.bodyClose),
            constructed: 1,
        };
    }
    return { wgsl: source, constructed: 0 };
}

function constructOutputStructReturns(source: string): { wgsl: string, constructed: number } {
    let out = source;
    let constructed = 0;
    for (let i = 0; i < 32; i++) {
        const result = constructOutputStructReturnsOnce(out);
        if (result.constructed === 0) {
            return { wgsl: out, constructed };
        }
        out = result.wgsl;
        constructed += result.constructed;
    }
    return { wgsl: out, constructed };
}

function collapseSingleFieldOutputStructsOnce(source: string): { wgsl: string, collapsed: number } {
    const functions = parseFunctions(source);
    const structs = parseStructs(source);
    for (const fn of functions) {
        if (!/@(vertex|fragment)\b/.test(fn.attributes)) {
            continue;
        }
        const structName = returnStructName(fn.returnType);
        if (!structName) {
            continue;
        }
        const outputStruct = structs.find((item) => item.name === structName);
        if (!outputStruct || outputStruct.fieldDetails.length !== 1) {
            continue;
        }
        const field = outputStruct.fieldDetails[0];
        if (!field.attributes) {
            continue;
        }
        if ((fn.body.match(/\breturn\b/g) || []).length !== 1) {
            continue;
        }

        const returnRegex = new RegExp(`return\\s+${escapeRegExp(structName)}\\s*\\(`, "g");
        let returnMatch: RegExpExecArray | null = null;
        for (let match = returnRegex.exec(fn.body); match !== null; match = returnRegex.exec(fn.body)) {
            returnMatch = match;
        }
        if (!returnMatch) {
            continue;
        }
        const bodyReturnStart = returnMatch.index;
        const openParen = fn.body.indexOf("(", bodyReturnStart);
        if (openParen < 0) {
            continue;
        }
        const closeParen = findMatching(fn.body, openParen, "(", ")");
        if (closeParen < 0 || !/^\s*;\s*$/.test(fn.body.slice(closeParen + 1))) {
            continue;
        }
        const args = splitTopLevelArguments(fn.body.slice(openParen + 1, closeParen));
        if (args.length !== 1) {
            continue;
        }

        const absoluteReturnStart = fn.bodyOpen + 1 + bodyReturnStart;
        const absoluteReturnEnd = fn.bodyOpen + 1 + closeParen + 2;
        const replacementReturnType = ` -> ${field.attributes} ${field.type} `;
        let out = removeRanges(source, [
            { start: absoluteReturnStart, end: absoluteReturnEnd, replacement: `return ${args[0]};` },
            { start: fn.closeParen + 1, end: fn.bodyOpen, replacement: replacementReturnType },
        ]);
        out = out.replace(/\n{3,}/g, "\n\n");
        return { wgsl: out, collapsed: 1 };
    }
    return { wgsl: source, collapsed: 0 };
}

function collapseSingleFieldOutputStructs(source: string): { wgsl: string, collapsed: number } {
    let out = source;
    let collapsed = 0;
    for (let i = 0; i < 32; i++) {
        const result = collapseSingleFieldOutputStructsOnce(out);
        if (result.collapsed === 0) {
            return { wgsl: out, collapsed };
        }
        out = result.wgsl;
        collapsed += result.collapsed;
    }
    return { wgsl: out, collapsed };
}

function splitTopLevelOperator(expression: string, operator: string): [string, string] | undefined {
    let parenDepth = 0;
    let bracketDepth = 0;
    for (let i = expression.length - 1; i >= 0; i--) {
        const ch = expression[i];
        if (ch === ")") {
            parenDepth++;
        } else if (ch === "(") {
            parenDepth--;
        } else if (ch === "]") {
            bracketDepth++;
        } else if (ch === "[") {
            bracketDepth--;
        } else if (ch === operator && parenDepth === 0 && bracketDepth === 0) {
            if (operator === "-" && (i === 0 || /[+\-*/(<>=,]/.test(expression[i - 1]))) {
                continue;
            }
            return [expression.slice(0, i).trim(), expression.slice(i + 1).trim()];
        }
    }
    return undefined;
}

function unwrapTrailingSwizzle(expression: string, swizzle: string): string | undefined {
    const trimmed = expression.trim();
    if (!trimmed.endsWith(`.${swizzle}`)) {
        return undefined;
    }
    return stripBalancedOuterParens(trimmed.slice(0, -(swizzle.length + 1)).trim());
}

function splitVec2ConstructorComponents(expression: string): [string, string] | undefined {
    const argsSource = unwrapFunctionCall(stripBalancedOuterParens(expression), "vec2f")
        ?? unwrapFunctionCall(stripBalancedOuterParens(expression), "vec2<f32>");
    if (!argsSource) {
        return undefined;
    }
    const args = splitTopLevelArguments(argsSource);
    return args.length === 2 ? [args[0], args[1]] : undefined;
}

function vectorComponent(expression: string, index: 0 | 1, vectorNames?: Set<string>): string | undefined {
    const expr = stripBalancedOuterParens(expression);
    const constructor = splitVec2ConstructorComponents(expr);
    if (constructor) {
        return constructor[index];
    }
    if (vectorNames?.has(expr)) {
        return `${expr}.${index === 0 ? "x" : "y"}`;
    }
    const swizzle = /^([\s\S]+)\.([xyzw]{2,4})$/.exec(expr);
    if (!swizzle || swizzle[2].length <= index) {
        return undefined;
    }
    return `${stripBalancedOuterParens(swizzle[1].trim())}.${swizzle[2][index]}`;
}

function splitVec2AffineComponents(expression: string, vectorNames?: Set<string>): [string, string] | undefined {
    const expr = unwrapTrailingSwizzle(expression, "xy") ?? stripBalancedOuterParens(expression);
    const addOffset = splitTopLevelOperator(expr, "+");
    if (!addOffset) {
        return splitVec2ConstructorComponents(expr);
    }
    const multiply = splitTopLevelOperator(stripBalancedOuterParens(addOffset[0]), "*");
    if (!multiply) {
        return undefined;
    }
    const addBase = splitTopLevelOperator(stripBalancedOuterParens(multiply[0]), "+");
    if (!addBase) {
        const baseX = vectorComponent(multiply[0], 0, vectorNames);
        const baseY = vectorComponent(multiply[0], 1, vectorNames);
        const scaleX = vectorComponent(multiply[1], 0, vectorNames);
        const scaleY = vectorComponent(multiply[1], 1, vectorNames);
        const offsetX = vectorComponent(addOffset[1], 0, vectorNames);
        const offsetY = vectorComponent(addOffset[1], 1, vectorNames);
        if (!baseX || !baseY || !scaleX || !scaleY || !offsetX || !offsetY) {
            return undefined;
        }
        return [
            `(((${baseX}) * ${scaleX}) + ${offsetX})`,
            `(((${baseY}) * ${scaleY}) + ${offsetY})`,
        ];
    }

    const baseX = vectorComponent(addBase[0], 0, vectorNames);
    const baseY = vectorComponent(addBase[0], 1, vectorNames);
    const addX = vectorComponent(addBase[1], 0, vectorNames);
    const addY = vectorComponent(addBase[1], 1, vectorNames);
    const scaleX = vectorComponent(multiply[1], 0, vectorNames);
    const scaleY = vectorComponent(multiply[1], 1, vectorNames);
    const offsetX = vectorComponent(addOffset[1], 0, vectorNames);
    const offsetY = vectorComponent(addOffset[1], 1, vectorNames);
    if (!baseX || !baseY || !addX || !addY || !scaleX || !scaleY || !offsetX || !offsetY) {
        return undefined;
    }

    return [
        `(((${baseX} + ${addX}) * ${scaleX}) + ${offsetX})`,
        `(((${baseY} + ${addY}) * ${scaleY}) + ${offsetY})`,
    ];
}

function unwrapFunctionCall(expression: string, name: string): string | undefined {
    const trimmed = expression.trim();
    if (!trimmed.startsWith(`${name}(`) || !trimmed.endsWith(")")) {
        return undefined;
    }
    const open = name.length;
    const close = findMatching(trimmed, open, "(", ")");
    if (close !== trimmed.length - 1) {
        return undefined;
    }
    return trimmed.slice(open + 1, close).trim();
}

function matchGlslModExpansion(expression: string): { value: string, divisor: string } | undefined {
    const expr = stripBalancedOuterParens(expression);
    const topMinus = splitTopLevelOperator(expr, "-");
    if (!topMinus) {
        return undefined;
    }
    const value = stripBalancedOuterParens(topMinus[0]);
    const right = stripBalancedOuterParens(topMinus[1]);
    const multiply = splitTopLevelOperator(right, "*");
    if (!multiply) {
        return undefined;
    }
    const divisor = stripBalancedOuterParens(multiply[0]);
    const floorArg = unwrapFunctionCall(stripBalancedOuterParens(multiply[1]), "floor");
    if (!floorArg) {
        return undefined;
    }
    const division = splitTopLevelOperator(stripBalancedOuterParens(floorArg), "/");
    if (!division) {
        return undefined;
    }
    if (normalizeExpressionForCompare(division[0]) !== normalizeExpressionForCompare(value)) {
        return undefined;
    }
    if (normalizeExpressionForCompare(division[1]) !== normalizeExpressionForCompare(divisor)) {
        return undefined;
    }
    return { value, divisor };
}

function hoistRepeatedModOperands(source: string): { wgsl: string, hoisted: number } {
    const lines = source.split("\n");
    let hoisted = 0;
    let counter = 0;
    for (let i = 0; i < lines.length; i++) {
        const match = /^(\s*)let\s+([A-Za-z_]\w*)\s*:\s*([^=]+?)\s*=\s*([\s\S]+);\s*$/.exec(lines[i]);
        if (!match) {
            continue;
        }
        const mod = matchGlslModExpansion(match[4]);
        if (!mod) {
            continue;
        }
        if (/^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?$/.test(stripBalancedOuterParens(mod.value))) {
            continue;
        }
        const indent = match[1];
        const type = match[3].trim();
        const tempName = `_hyd_mod_${counter++}`;
        lines[i] = [
            `${indent}let ${tempName} : ${type} = ${mod.value};`,
            `${indent}let ${match[2]} : ${type} = (${tempName} - (${mod.divisor} * floor((${tempName} / ${mod.divisor}))));`,
        ].join("\n");
        hoisted++;
    }
    return { wgsl: lines.join("\n"), hoisted };
}

function isOneLiteralExpression(expression: string): boolean {
    return /^\(?\s*1(?:\.0+)?f?\s*\)?$/.test(stripBalancedOuterParens(expression));
}

function foldModByOneToFract(source: string): { wgsl: string, folded: number } {
    const lines = source.split("\n");
    let folded = 0;
    for (let i = 0; i < lines.length; i++) {
        const match = /^(\s*(?:(?:let|var)\s+[A-Za-z_]\w*\s*:\s*[^=]+?=|[A-Za-z_]\w*\s*=)\s*)([\s\S]+?)(;\s*)$/.exec(lines[i]);
        if (!match) {
            continue;
        }
        const mod = matchGlslModExpansion(match[2]);
        if (!mod || !isOneLiteralExpression(mod.divisor)) {
            continue;
        }
        lines[i] = `${match[1]}fract(${stripBalancedOuterParens(mod.value)})${match[3]}`;
        folded++;
    }
    return { wgsl: lines.join("\n"), folded };
}

function elideRedundantRangeClamps(source: string): { wgsl: string, elided: number } {
    let elided = 0;
    const out = source.replace(
        /^([ \t]*)([A-Za-z_]\w*)\s*=\s*select\s*\(\s*\2\s*,\s*0\.0f?\s*,\s*\(\(?\s*([A-Za-z_]\w*)\s*<\s*0\.0f?\s*\)?\s*\|\s*\(?\s*\3\s*>\s*1\.0f?\s*\)?\)\s*\)\s*;\s*$/gm,
        () => {
            elided++;
            return "";
        },
    );
    return { wgsl: out, elided };
}

function shouldElideRangeClamps(): boolean {
    return typeof globalThis !== "undefined" && (globalThis as any).__HYD_ASSUME_LIFE_RANGE_CLAMP_REDUNDANT === true;
}

function braceDepthAt(source: string, index: number): number {
    let depth = 0;
    for (let i = 0; i < index; i++) {
        if (source[i] === "{") {
            depth++;
        } else if (source[i] === "}") {
            depth = Math.max(0, depth - 1);
        }
    }
    return depth;
}

function promoteSingleAssignmentVarsInBody(body: string): { body: string, promoted: number } {
    let out = body;
    let promoted = 0;
    let changed = true;
    while (changed) {
        changed = false;
        const declarationRegex = /^([ \t]*)var\s+([A-Za-z_]\w*)\s*:\s*([^;=]+);\s*\n/gm;
        for (let declaration = declarationRegex.exec(out); declaration !== null; declaration = declarationRegex.exec(out)) {
            const fullDeclaration = declaration[0];
            const name = declaration[2];
            const type = declaration[3].trim();
            if (name === "_hyd_output") {
                continue;
            }
            if (directAssignmentCount(out, name) !== 1 || fieldOrIndexAssignmentCount(out, name) !== 0) {
                continue;
            }
            if (new RegExp(`&\\s*\\(?\\s*${escapeRegExp(name)}\\b`).test(out)) {
                continue;
            }
            const assignmentRegex = new RegExp(`^([ \\t]*)${escapeRegExp(name)}\\s*=\\s*([^;{}]+);\\s*$`, "m");
            const assignment = assignmentRegex.exec(out);
            if (!assignment) {
                continue;
            }
            // `var t; t = f(t);` observes the zero-initialized variable on the
            // RHS. Turning it into `let t = f(t)` creates an invalid
            // self-reference and changes GLSL initialization semantics.
            if (countIdentifier(assignment[2], name) > 0) {
                continue;
            }
            if (assignment.index < declaration.index) {
                continue;
            }
            if (braceDepthAt(out, declaration.index) !== braceDepthAt(out, assignment.index)) {
                continue;
            }
            const between = out.slice(declaration.index + fullDeclaration.length, assignment.index);
            if (countIdentifier(between, name) > 0) {
                continue;
            }
            const replacement = `${assignment[1]}let ${name} : ${type} = ${assignment[2].trim()};`;
            out = out.slice(0, declaration.index) + out.slice(declaration.index + fullDeclaration.length);
            const adjustedAssignmentIndex = assignment.index - fullDeclaration.length;
            out = out.slice(0, adjustedAssignmentIndex) + replacement + out.slice(adjustedAssignmentIndex + assignment[0].length);
            promoted++;
            changed = true;
            break;
        }
    }
    return { body: out, promoted };
}

function promoteSingleAssignmentVars(source: string): { wgsl: string, promoted: number } {
    let out = source;
    let promoted = 0;
    let changed = true;
    while (changed) {
        changed = false;
        const functions = parseFunctions(out);
        for (const fn of functions) {
            const result = promoteSingleAssignmentVarsInBody(fn.body);
            if (result.promoted === 0) {
                continue;
            }
            out = out.slice(0, fn.bodyOpen + 1) + result.body + out.slice(fn.bodyClose);
            promoted += result.promoted;
            changed = true;
            break;
        }
    }
    return { wgsl: out, promoted };
}

function runPeepholes(source: string): { wgsl: string, promotedLocalVars: number, branchifiedSelects: number, hoistedModOperands: number, foldedModByOne: number, elidedRangeClamps: number, foldedOutputStores: number, collapsedOutputStructs: number, removedTemporaries: number, foldedConstructors: number } {
    let out = source;
    let promotedLocalVars = 0;
    let branchifiedSelects = 0;
    let hoistedModOperands = 0;
    let foldedModByOne = 0;
    let elidedRangeClamps = 0;
    let foldedOutputStores = 0;
    let collapsedOutputStructs = 0;
    let removedTemporaries = 0;
    let foldedConstructors = 0;

    const constructors = foldVectorConstructors(out);
    out = constructors.wgsl;
    foldedConstructors += constructors.folded;

    const promoted = promoteSingleAssignmentVars(out);
    out = promoted.wgsl;
    promotedLocalVars += promoted.promoted;

    const modOperands = hoistRepeatedModOperands(out);
    out = modOperands.wgsl;
    hoistedModOperands += modOperands.hoisted;

    const modByOne = foldModByOneToFract(out);
    out = modByOne.wgsl;
    foldedModByOne += modByOne.folded;

    if (shouldElideRangeClamps()) {
        const clamps = elideRedundantRangeClamps(out);
        out = clamps.wgsl;
        elidedRangeClamps += clamps.elided;
    }

    const lazyPowSelects = branchifyLazyPowSelects(out);
    out = lazyPowSelects.wgsl;
    branchifiedSelects += lazyPowSelects.branchified;

    const enableExpensiveSelectBranchification = false;
    if (enableExpensiveSelectBranchification) {
        const branchified = branchifyExpensiveSelects(out);
        out = branchified.wgsl;
        branchifiedSelects += branchified.branchified;
    }

    const lets = removeSingleUseLets(out);
    out = lets.wgsl;
    removedTemporaries += lets.removed;

    const constructorsAfterLets = foldVectorConstructors(out);
    out = constructorsAfterLets.wgsl;
    foldedConstructors += constructorsAfterLets.folded;

    const outputComponents = foldOutputComponentStores(out);
    out = outputComponents.wgsl;
    foldedOutputStores += outputComponents.folded;

    const outputReturns = constructOutputStructReturns(out);
    out = outputReturns.wgsl;
    foldedOutputStores += outputReturns.constructed;

    const singleFieldOutputs = collapseSingleFieldOutputStructs(out);
    out = singleFieldOutputs.wgsl;
    collapsedOutputStructs += singleFieldOutputs.collapsed;

    return { wgsl: out, promotedLocalVars, branchifiedSelects, hoistedModOperands, foldedModByOne, elidedRangeClamps, foldedOutputStores, collapsedOutputStructs, removedTemporaries, foldedConstructors };
}

export function optimizeTintWgsl(wgsl: string): WgslOptimizerResult {
    const stats: WgslOptimizerStats = {
        optimizeTintWgsl: true,
        loweredPrivateVars: 0,
        loweredPointerParams: 0,
        promotedLocalVars: 0,
        branchifiedSelects: 0,
        hoistedModOperands: 0,
        foldedModByOne: 0,
        elidedRangeClamps: 0,
        foldedOutputStores: 0,
        collapsedOutputStructs: 0,
        removedTemporaries: 0,
        foldedConstructors: 0,
        splitDeepExpressions: 0,
        skippedPasses: [],
    };

    const initialDepth = splitDeepAssociativeExpressions(wgsl);
    stats.splitDeepExpressions += initialDepth.split;
    const lowered = lowerEntryWrapper(initialDepth.wgsl);
    let out = lowered.wgsl;
    stats.loweredPrivateVars = lowered.loweredPrivateVars;
    if (lowered.skipped && !["no-entry-wrapper", "no-private-io"].includes(lowered.skipped)) {
        stats.skippedPasses.push(`entry-wrapper:${lowered.skipped}`);
    }

    const pointerParams = lowerReadOnlyPointerParams(out);
    out = pointerParams.wgsl;
    stats.loweredPointerParams = pointerParams.loweredPointerParams;
    if (pointerParams.skipped && !["no-readonly-pointer-params"].includes(pointerParams.skipped)) {
        stats.skippedPasses.push(`pointer-params:${pointerParams.skipped}`);
    }

    const peepholes = runPeepholes(out);
    out = peepholes.wgsl;
    stats.promotedLocalVars = peepholes.promotedLocalVars;
    stats.branchifiedSelects = peepholes.branchifiedSelects;
    stats.hoistedModOperands = peepholes.hoistedModOperands;
    stats.foldedModByOne = peepholes.foldedModByOne;
    stats.elidedRangeClamps = peepholes.elidedRangeClamps;
    stats.foldedOutputStores = peepholes.foldedOutputStores;
    stats.collapsedOutputStructs = peepholes.collapsedOutputStructs;
    stats.removedTemporaries = peepholes.removedTemporaries;
    stats.foldedConstructors = peepholes.foldedConstructors;

    const finalDepth = splitDeepAssociativeExpressions(out);
    out = finalDepth.wgsl;
    stats.splitDeepExpressions += finalDepth.split;

    return {
        wgsl: out.trim() + "\n",
        stats,
    };
}
