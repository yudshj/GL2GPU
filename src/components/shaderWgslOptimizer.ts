export interface WgslOptimizerStats {
    optimizeTintWgsl: boolean;
    loweredPrivateVars: number;
    removedTemporaries: number;
    foldedConstructors: number;
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
        const fieldRegex = /(?:@[A-Za-z_]\w*(?:\([^)]*\))?\s*)*([A-Za-z_]\w*)\s*:\s*[^,]+,/g;
        for (let field = fieldRegex.exec(body); field !== null; field = fieldRegex.exec(body)) {
            fields.push(field[1]);
        }
        structs.push({ name: match[1], fields });
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

function assignmentCount(source: string, name: string): number {
    const regex = new RegExp(`\\b${escapeRegExp(name)}\\s*(?:[+\\-*/%&|^]?=)`, "g");
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
    for (let i = 0; i < returnArgs.length; i++) {
        const arg = returnArgs[i].trim();
        if (/^[A-Za-z_]\w*$/.test(arg) && privateNames.has(arg)) {
            outputMap.set(arg, `_hyd_output.${outputStruct.fields[i]}`);
        }
    }

    const mappedPrivateNames = new Set([...inputMap.keys(), ...outputMap.keys()]);
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
        if (assignmentCount(helper.body, name) !== 1) {
            return { wgsl: source, loweredPrivateVars: 0, skipped: "output-private-not-single-writer" };
        }
    }

    const replacements = new Map<string, string>([...inputMap, ...outputMap]);
    let loweredBody = applyIdentifierMap(helper.body, replacements)
        .replace(/^\s*return\s*;\s*$/gm, "")
        .trim();
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

function foldVectorConstructors(source: string): { wgsl: string, folded: number } {
    let folded = 0;
    let out = source.replace(/\bvec2f\s*\(\s*([A-Za-z_]\w*)\.x\s*,\s*\1\.y\s*\)/g, (_match, value) => {
        folded++;
        return value;
    });
    out = out.replace(/\bvec3f\s*\(\s*([A-Za-z_]\w*)\.x\s*,\s*\1\.y\s*,\s*\1\.z\s*\)/g, (_match, value) => {
        folded++;
        return value;
    });
    out = out.replace(/\bvec4f\s*\(\s*([A-Za-z_]\w*)\.x\s*,\s*\1\.y\s*,\s*\1\.z\s*,\s*\1\.w\s*\)/g, (_match, value) => {
        folded++;
        return value;
    });
    out = out.replace(/\bvec4f\s*\(\s*([A-Za-z_]\w*)\.x\s*,\s*\1\.y\s*,\s*\1\.z\s*,\s*([^,)]+?)\s*\)/g, (_match, value, scalar) => {
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

function removeSingleUseLets(source: string): { wgsl: string, removed: number } {
    let out = source;
    let removed = 0;
    let changed = true;
    while (changed) {
        changed = false;
        const regex = /^([ \t]*)let\s+(x_\d+)\s*=\s*([^;{}]+);\s*\n/gm;
        for (let match = regex.exec(out); match !== null; match = regex.exec(out)) {
            const full = match[0];
            const name = match[2];
            const expression = match[3].trim();
            const after = out.slice(match.index + full.length);
            const useCount = countIdentifier(after, name);
            const isSimpleAlias = /^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?$/.test(expression);
            if (useCount === 0 || (!isSimpleAlias && useCount !== 1)) {
                continue;
            }
            out = out.slice(0, match.index) + out.slice(match.index + full.length);
            const replacement = isSimpleAlias ? expression : `(${expression})`;
            out = out.slice(0, match.index) + wordBoundaryReplace(out.slice(match.index), name, replacement);
            removed++;
            changed = true;
            break;
        }
    }
    return { wgsl: out, removed };
}

function runPeepholes(source: string): { wgsl: string, removedTemporaries: number, foldedConstructors: number } {
    let out = source;
    let removedTemporaries = 0;
    let foldedConstructors = 0;

    const select = foldSimpleIfElseSelect(out);
    out = select.wgsl;
    foldedConstructors += select.folded;

    const constructors = foldVectorConstructors(out);
    out = constructors.wgsl;
    foldedConstructors += constructors.folded;

    const lets = removeSingleUseLets(out);
    out = lets.wgsl;
    removedTemporaries += lets.removed;

    const constructorsAfterLets = foldVectorConstructors(out);
    out = constructorsAfterLets.wgsl;
    foldedConstructors += constructorsAfterLets.folded;

    return { wgsl: out, removedTemporaries, foldedConstructors };
}

export function optimizeTintWgsl(wgsl: string): WgslOptimizerResult {
    const stats: WgslOptimizerStats = {
        optimizeTintWgsl: true,
        loweredPrivateVars: 0,
        removedTemporaries: 0,
        foldedConstructors: 0,
        skippedPasses: [],
    };

    const lowered = lowerEntryWrapper(wgsl);
    let out = lowered.wgsl;
    stats.loweredPrivateVars = lowered.loweredPrivateVars;
    if (lowered.skipped && !["no-entry-wrapper", "no-private-io"].includes(lowered.skipped)) {
        stats.skippedPasses.push(`entry-wrapper:${lowered.skipped}`);
    }

    const peepholes = runPeepholes(out);
    out = peepholes.wgsl;
    stats.removedTemporaries = peepholes.removedTemporaries;
    stats.foldedConstructors = peepholes.foldedConstructors;

    return {
        wgsl: out.trim() + "\n",
        stats,
    };
}
