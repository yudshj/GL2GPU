export interface FlatVaryingBitPreservationResult {
    wgsl: string;
    encodedVaryings: number;
}

interface Replacement {
    start: number;
    end: number;
    value: string;
}

function matchingDelimiter(source: string, openIndex: number, open: string, close: string): number {
    let depth = 0;
    for (let index = openIndex; index < source.length; index++) {
        if (source[index] === open) depth++;
        else if (source[index] === close && --depth === 0) return index;
    }
    return -1;
}

function splitTopLevel(source: string): string[] {
    const parts: string[] = [];
    let start = 0;
    let parens = 0;
    let angles = 0;
    for (let index = 0; index < source.length; index++) {
        const char = source[index];
        if (char === "(") parens++;
        else if (char === ")") parens--;
        else if (char === "<") angles++;
        else if (char === ">") angles--;
        else if (char === "," && parens === 0 && angles === 0) {
            parts.push(source.slice(start, index));
            start = index + 1;
        }
    }
    parts.push(source.slice(start));
    return parts;
}

function unsignedBitType(type: string): string | null {
    const normalized = type.replace(/\s+/g, "");
    if (normalized === "f32") return "u32";
    const vector = /^vec([2-4])(?:<f32>|f)$/.exec(normalized);
    return vector ? `vec${vector[1]}<u32>` : null;
}

function isFlatLocation(segment: string): boolean {
    return /@location\s*\(/.test(segment) && /@interpolate\s*\(\s*flat\b/.test(segment);
}

function applyReplacements(source: string, replacements: Replacement[]): string {
    let out = source;
    replacements.sort((left, right) => right.start - left.start);
    for (const replacement of replacements) {
        out = out.slice(0, replacement.start) + replacement.value + out.slice(replacement.end);
    }
    return out;
}

function encodeVertexOutputs(wgsl: string): FlatVaryingBitPreservationResult {
    const replacements: Replacement[] = [];
    const encodedStructs = new Map<string, Array<{ index: number, type: string }>>();
    const structPattern = /\bstruct\s+([A-Za-z_]\w*)\s*\{/g;
    for (let match = structPattern.exec(wgsl); match !== null; match = structPattern.exec(wgsl)) {
        const open = structPattern.lastIndex - 1;
        const close = matchingDelimiter(wgsl, open, "{", "}");
        if (close < 0) break;
        const body = wgsl.slice(open + 1, close);
        const fields = splitTopLevel(body);
        const encoded: Array<{ index: number, type: string }> = [];
        const rewritten = fields.map((field, index) => {
            if (!isFlatLocation(field)) return field;
            const declaration = /([A-Za-z_]\w*)\s*:\s*([^,]+?)\s*$/.exec(field);
            if (!declaration) return field;
            const type = unsignedBitType(declaration[2]);
            if (!type) return field;
            encoded.push({ index, type });
            return field.slice(0, declaration.index) +
                `${declaration[1]} : ${type}` +
                field.slice(declaration.index + declaration[0].length);
        });
        if (encoded.length > 0) {
            encodedStructs.set(match[1], encoded);
            replacements.push({ start: open + 1, end: close, value: rewritten.join(",") });
        }
        structPattern.lastIndex = close + 1;
    }

    for (const [structName, fields] of encodedStructs) {
        const constructor = new RegExp(`\\b${structName}\\s*\\(`, "g");
        for (let match = constructor.exec(wgsl); match !== null; match = constructor.exec(wgsl)) {
            const prefix = wgsl.slice(Math.max(0, match.index - 16), match.index);
            if (/\bstruct\s+$/.test(prefix)) continue;
            const open = constructor.lastIndex - 1;
            const close = matchingDelimiter(wgsl, open, "(", ")");
            if (close < 0) break;
            const args = splitTopLevel(wgsl.slice(open + 1, close));
            if (fields.some((field) => field.index >= args.length)) {
                constructor.lastIndex = close + 1;
                continue;
            }
            for (const field of fields) {
                args[field.index] = `bitcast<${field.type}>(${args[field.index].trim()})`;
            }
            replacements.push({ start: open + 1, end: close, value: args.join(", ") });
            constructor.lastIndex = close + 1;
        }
    }

    return {
        wgsl: applyReplacements(wgsl, replacements),
        encodedVaryings: Array.from(encodedStructs.values()).reduce((sum, fields) => sum + fields.length, 0),
    };
}

function decodeFragmentInputs(wgsl: string): FlatVaryingBitPreservationResult {
    const replacements: Replacement[] = [];
    let encodedVaryings = 0;
    const entryPattern = /@fragment\b[\s\S]*?\bfn\s+([A-Za-z_]\w*)\s*\(/g;
    for (let match = entryPattern.exec(wgsl); match !== null; match = entryPattern.exec(wgsl)) {
        const open = entryPattern.lastIndex - 1;
        const close = matchingDelimiter(wgsl, open, "(", ")");
        if (close < 0) break;
        const bodyOpen = wgsl.indexOf("{", close + 1);
        if (bodyOpen < 0) break;
        const params = splitTopLevel(wgsl.slice(open + 1, close));
        const decoders: string[] = [];
        const rewritten = params.map((param) => {
            if (!isFlatLocation(param)) return param;
            const declaration = /([A-Za-z_]\w*)\s*:\s*([^,]+?)\s*$/.exec(param);
            if (!declaration) return param;
            const unsigned = unsignedBitType(declaration[2]);
            if (!unsigned) return param;
            const originalName = declaration[1];
            let bitsName = `_hyd_flat_bits_${originalName}`;
            while (new RegExp(`\\b${bitsName}\\b`).test(wgsl)) bitsName += "_";
            const originalType = declaration[2].trim();
            decoders.push(`\n  let ${originalName} = bitcast<${originalType}>(${bitsName});`);
            encodedVaryings++;
            return param.slice(0, declaration.index) +
                `${bitsName} : ${unsigned}` +
                param.slice(declaration.index + declaration[0].length);
        });
        if (decoders.length > 0) {
            replacements.push({ start: open + 1, end: close, value: rewritten.join(",") });
            replacements.push({ start: bodyOpen + 1, end: bodyOpen + 1, value: decoders.join("") });
        }
        entryPattern.lastIndex = matchingDelimiter(wgsl, bodyOpen, "{", "}") + 1;
    }
    return { wgsl: applyReplacements(wgsl, replacements), encodedVaryings };
}

/** Preserve non-finite bit patterns that native WebGL carries across flat float varyings. */
export function preserveFlatFloatVaryingBits(
    wgsl: string,
    stage: "vertex" | "fragment",
): FlatVaryingBitPreservationResult {
    return stage === "vertex" ? encodeVertexOutputs(wgsl) : decodeFragmentInputs(wgsl);
}
