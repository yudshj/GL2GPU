export interface WgslOptimizerStats {
    optimizeTintWgsl: boolean;
    loweredPrivateVars: number;
    loweredPointerParams: number;
    promotedLocalVars: number;
    branchifiedSelects: number;
    hoistedModOperands: number;
    foldedModByOne: number;
    elidedRangeClamps: number;
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

function directAssignmentCount(source: string, name: string): number {
    const regex = new RegExp(`(?:^|[;\\n]\\s*)${escapeRegExp(name)}\\s*=`, "g");
    return source.match(regex)?.length ?? 0;
}

function fieldOrIndexAssignmentCount(source: string, name: string): number {
    const regex = new RegExp(`(?:^|[;\\n]\\s*)${escapeRegExp(name)}\\s*(?:\\.|\\[[^\\]]+\\])[^=;\\n]*=`, "g");
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
        if (assignmentCount(helper.body, name) + fieldOrIndexAssignmentCount(helper.body, name) < 1) {
            return { wgsl: source, loweredPrivateVars: 0, skipped: "output-private-never-written" };
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
            if (assignmentCount(fn.body, param.name) > 0 || assignmentCount(fn.body, `*(${param.name})`) > 0) {
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
        const regex = /^([ \t]*)let\s+(x_\d+)(?:\s*:\s*[^=]+?)?\s*=\s*([^;{}]+);\s*\n/gm;
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
            if (assignment.index < declaration.index) {
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

function runPeepholes(source: string): { wgsl: string, promotedLocalVars: number, branchifiedSelects: number, hoistedModOperands: number, foldedModByOne: number, elidedRangeClamps: number, removedTemporaries: number, foldedConstructors: number } {
    let out = source;
    let promotedLocalVars = 0;
    let branchifiedSelects = 0;
    let hoistedModOperands = 0;
    let foldedModByOne = 0;
    let elidedRangeClamps = 0;
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

    return { wgsl: out, promotedLocalVars, branchifiedSelects, hoistedModOperands, foldedModByOne, elidedRangeClamps, removedTemporaries, foldedConstructors };
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
    stats.removedTemporaries = peepholes.removedTemporaries;
    stats.foldedConstructors = peepholes.foldedConstructors;

    return {
        wgsl: out.trim() + "\n",
        stats,
    };
}
