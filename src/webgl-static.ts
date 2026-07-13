import { HydWebGLStatic, beginFrame, endFrame } from "./components/hydWebGLStatic";
import { ShaderTranslator, ShaderTranslatorOptions } from "./components/shaderTranslator";
import { HYD_WEBGL_OBJECT_BRAND, HydWebGlObjectBrand } from "./types";
import { hydWebGLConstants } from "./components/hydWebGLConstants";

const hydWebGLTypes = ["experimental-webgl", "webgl", "webgl2"];
const NATIVE_CANVAS_GET_CONTEXT = HTMLCanvasElement.prototype.getContext;
const nativeEnumerableApiNames = new Map<string, Set<string>>();

function getNativeEnumerableApiNames(contextType: string): Set<string> {
    const normalizedType = contextType === "webgl2" ? "webgl2" : "webgl";
    const cached = nativeEnumerableApiNames.get(normalizedType);
    if (cached) return cached;
    const names = new Set<string>(["canvas"]);
    const canvas = document.createElement("canvas");
    const context = (NATIVE_CANVAS_GET_CONTEXT.call(canvas, normalizedType, { antialias: false }) ||
        (normalizedType === "webgl"
            ? NATIVE_CANVAS_GET_CONTEXT.call(canvas, "experimental-webgl", { antialias: false })
            : null)) as WebGLRenderingContext | WebGL2RenderingContext | null;
    if (context) {
        for (const name in context) names.add(name);
        context.getExtension("WEBGL_lose_context")?.loseContext();
    }
    nativeEnumerableApiNames.set(normalizedType, names);
    return names;
}

type WebIdlArgument = "bool" | "f32" | "i32" | "string" | "u32" |
    { brand: HydWebGlObjectBrand, nullable: boolean };

const requiredObject = (brand: HydWebGlObjectBrand): WebIdlArgument => ({ brand, nullable: false });
const nullableObject = (brand: HydWebGlObjectBrand): WebIdlArgument => ({ brand, nullable: true });

const WEBGL_METHOD_ARGUMENTS: Readonly<Record<string, WebIdlArgument[]>> = {
    attachShader: [requiredObject("program"), requiredObject("shader")],
    bindAttribLocation: [requiredObject("program"), "u32", "string"],
    bindBuffer: ["u32", nullableObject("buffer")],
    bindBufferBase: ["u32", "u32", nullableObject("buffer")],
    bindBufferRange: ["u32", "u32", nullableObject("buffer")],
    bindFramebuffer: ["u32", nullableObject("framebuffer")],
    bindRenderbuffer: ["u32", nullableObject("renderbuffer")],
    bindSampler: ["u32", nullableObject("sampler")],
    bindTexture: ["u32", nullableObject("texture")],
    bindTransformFeedback: ["u32", nullableObject("transform-feedback")],
    bindVertexArray: [nullableObject("vertex-array")],
    beginQuery: ["u32", requiredObject("query")],
    blendColor: ["f32", "f32", "f32", "f32"],
    bufferSubData: ["u32", "i32"],
    clear: ["u32"],
    clearBufferfi: ["u32", "i32", "f32", "i32"],
    clearBufferfv: ["u32", "i32"],
    clearBufferiv: ["u32", "i32"],
    clearBufferuiv: ["u32", "i32"],
    clearColor: ["f32", "f32", "f32", "f32"],
    clearDepth: ["f32"],
    clearStencil: ["i32"],
    clientWaitSync: [requiredObject("sync"), "u32"],
    compileShader: [requiredObject("shader")],
    copyTexImage2D: ["u32", "i32", "u32", "i32", "i32", "i32", "i32", "i32"],
    copyTexSubImage2D: ["u32", "i32", "i32", "i32", "i32", "i32", "i32", "i32"],
    copyBufferSubData: ["u32", "u32"],
    deleteBuffer: [nullableObject("buffer")],
    deleteFramebuffer: [nullableObject("framebuffer")],
    deleteProgram: [nullableObject("program")],
    deleteQuery: [nullableObject("query")],
    deleteRenderbuffer: [nullableObject("renderbuffer")],
    deleteSampler: [nullableObject("sampler")],
    deleteShader: [nullableObject("shader")],
    deleteSync: [nullableObject("sync")],
    deleteTexture: [nullableObject("texture")],
    deleteTransformFeedback: [nullableObject("transform-feedback")],
    deleteVertexArray: [nullableObject("vertex-array")],
    depthMask: ["bool"],
    depthRange: ["f32", "f32"],
    detachShader: [requiredObject("program"), requiredObject("shader")],
    drawingBufferStorage: ["u32", "i32", "i32"],
    disableVertexAttribArray: ["u32"],
    drawArrays: ["u32", "i32", "i32"],
    drawRangeElements: ["u32", "u32", "u32", "i32", "u32"],
    enableVertexAttribArray: ["u32"],
    framebufferRenderbuffer: ["u32", "u32", "u32", nullableObject("renderbuffer")],
    framebufferTexture2D: ["u32", "u32", "u32", nullableObject("texture"), "i32"],
    getActiveAttrib: [requiredObject("program"), "u32"],
    getActiveUniformBlockName: [requiredObject("program"), "u32"],
    getActiveUniformBlockParameter: [requiredObject("program"), "u32", "u32"],
    getActiveUniform: [requiredObject("program"), "u32"],
    getActiveUniforms: [requiredObject("program")],
    getAttachedShaders: [requiredObject("program")],
    getAttribLocation: [requiredObject("program"), "string"],
    getFragDataLocation: [requiredObject("program"), "string"],
    getParameter: ["u32"],
    getIndexedParameter: ["u32", "u32"],
    getProgramInfoLog: [requiredObject("program")],
    getProgramParameter: [requiredObject("program"), "u32"],
    getQuery: ["u32", "u32"],
    getQueryParameter: [requiredObject("query"), "u32"],
    getSamplerParameter: [requiredObject("sampler"), "u32"],
    getShaderInfoLog: [requiredObject("shader")],
    getShaderParameter: [requiredObject("shader"), "u32"],
    getShaderSource: [requiredObject("shader")],
    getSyncParameter: [requiredObject("sync"), "u32"],
    getUniform: [requiredObject("program"), requiredObject("uniform-location")],
    getUniformBlockIndex: [requiredObject("program"), "string"],
    getUniformIndices: [requiredObject("program")],
    getUniformLocation: [requiredObject("program"), "string"],
    getTransformFeedbackVarying: [requiredObject("program"), "u32"],
    getVertexAttrib: ["u32", "u32"],
    getVertexAttribOffset: ["u32", "u32"],
    isBuffer: [nullableObject("buffer")],
    isFramebuffer: [nullableObject("framebuffer")],
    isProgram: [nullableObject("program")],
    isQuery: [nullableObject("query")],
    isRenderbuffer: [nullableObject("renderbuffer")],
    isSampler: [nullableObject("sampler")],
    isShader: [nullableObject("shader")],
    isSync: [nullableObject("sync")],
    isTexture: [nullableObject("texture")],
    isTransformFeedback: [nullableObject("transform-feedback")],
    isVertexArray: [nullableObject("vertex-array")],
    lineWidth: ["f32"],
    linkProgram: [requiredObject("program")],
    endQuery: ["u32"],
    polygonOffset: ["f32", "f32"],
    pixelStorei: ["u32", "i32"],
    sampleCoverage: ["f32", "bool"],
    samplerParameterf: [requiredObject("sampler"), "u32", "f32"],
    samplerParameteri: [requiredObject("sampler"), "u32", "i32"],
    scissor: ["i32", "i32", "i32", "i32"],
    shaderSource: [requiredObject("shader"), "string"],
    stencilFunc: ["u32", "i32", "u32"],
    stencilMask: ["u32"],
    texImage3D: ["u32", "i32", "i32", "i32", "i32", "i32", "i32", "u32", "u32"],
    texSubImage3D: ["u32", "i32", "i32", "i32", "i32", "i32", "i32", "i32", "u32", "u32"],
    transformFeedbackVaryings: [requiredObject("program")],
    uniform1f: [nullableObject("uniform-location"), "f32"],
    uniform1fv: [nullableObject("uniform-location")],
    uniform1i: [nullableObject("uniform-location"), "i32"],
    uniform1iv: [nullableObject("uniform-location")],
    uniform1ui: [nullableObject("uniform-location"), "u32"],
    uniform1uiv: [nullableObject("uniform-location")],
    uniform2f: [nullableObject("uniform-location"), "f32", "f32"],
    uniform2fv: [nullableObject("uniform-location")],
    uniform2i: [nullableObject("uniform-location"), "i32", "i32"],
    uniform2iv: [nullableObject("uniform-location")],
    uniform2ui: [nullableObject("uniform-location"), "u32", "u32"],
    uniform2uiv: [nullableObject("uniform-location")],
    uniform3f: [nullableObject("uniform-location"), "f32", "f32", "f32"],
    uniform3fv: [nullableObject("uniform-location")],
    uniform3i: [nullableObject("uniform-location"), "i32", "i32", "i32"],
    uniform3iv: [nullableObject("uniform-location")],
    uniform3ui: [nullableObject("uniform-location"), "u32", "u32", "u32"],
    uniform3uiv: [nullableObject("uniform-location")],
    uniform4f: [nullableObject("uniform-location"), "f32", "f32", "f32", "f32"],
    uniform4fv: [nullableObject("uniform-location")],
    uniform4i: [nullableObject("uniform-location"), "i32", "i32", "i32", "i32"],
    uniform4iv: [nullableObject("uniform-location")],
    uniform4ui: [nullableObject("uniform-location"), "u32", "u32", "u32", "u32"],
    uniform4uiv: [nullableObject("uniform-location")],
    uniformBlockBinding: [requiredObject("program"), "u32", "u32"],
    uniformMatrix2fv: [nullableObject("uniform-location"), "bool"],
    uniformMatrix2x3fv: [nullableObject("uniform-location"), "bool"],
    uniformMatrix2x4fv: [nullableObject("uniform-location"), "bool"],
    uniformMatrix3fv: [nullableObject("uniform-location"), "bool"],
    uniformMatrix3x2fv: [nullableObject("uniform-location"), "bool"],
    uniformMatrix3x4fv: [nullableObject("uniform-location"), "bool"],
    uniformMatrix4fv: [nullableObject("uniform-location"), "bool"],
    uniformMatrix4x2fv: [nullableObject("uniform-location"), "bool"],
    uniformMatrix4x3fv: [nullableObject("uniform-location"), "bool"],
    useProgram: [nullableObject("program")],
    waitSync: [requiredObject("sync"), "u32"],
    vertexAttribI4i: ["u32", "i32", "i32", "i32", "i32"],
    vertexAttribI4ui: ["u32", "u32", "u32", "u32", "u32"],
    vertexAttribI4iv: ["u32"],
    vertexAttribI4uiv: ["u32"],
    vertexAttribIPointer: ["u32", "i32", "u32", "i32"],
    vertexAttribDivisor: ["u32", "u32"],
};

function convertWebIdlArgument(method: string, index: number, value: unknown, argument: WebIdlArgument): unknown {
    if (typeof argument === "object") {
        if (value === null || value === undefined) {
            if (argument.nullable) return null;
            throw new TypeError(`${method} argument ${index + 1} is not nullable`);
        }
        if (typeof value !== "object" || (value as any)[HYD_WEBGL_OBJECT_BRAND] !== argument.brand) {
            throw new TypeError(`${method} argument ${index + 1} is not a WebGL ${argument.brand}`);
        }
        return value;
    }
    switch (argument) {
        case "bool": return Boolean(value);
        case "f32": return Math.fround(Number(value));
        case "i32": return Number(value) >> 0;
        case "u32": return Number(value) >>> 0;
        case "string": return String(value);
    }
}

function convertWebIdlArguments(method: string, values: unknown[]): unknown[] {
    const signature = WEBGL_METHOD_ARGUMENTS[method];
    if (!signature) return values;
    const converted = values.slice();
    for (let index = 0; index < signature.length; index++) {
        converted[index] = convertWebIdlArgument(method, index, values[index], signature[index]);
    }
    return converted;
}

type WebIdlConverter = (value: unknown) => unknown;
const identityWebIdlArgument: WebIdlConverter = (value) => value;

function createWebIdlConverter(method: string, index: number, argument: WebIdlArgument): WebIdlConverter {
    if (typeof argument === "object") {
        if (argument.nullable) {
            return (value) => {
                if (value === null || value === undefined) return null;
                if (typeof value !== "object" || (value as any)[HYD_WEBGL_OBJECT_BRAND] !== argument.brand) {
                    throw new TypeError(`${method} argument ${index + 1} is not a WebGL ${argument.brand}`);
                }
                return value;
            };
        }
        return (value) => {
            if (value === null || value === undefined) {
                throw new TypeError(`${method} argument ${index + 1} is not nullable`);
            }
            if (typeof value !== "object" || (value as any)[HYD_WEBGL_OBJECT_BRAND] !== argument.brand) {
                throw new TypeError(`${method} argument ${index + 1} is not a WebGL ${argument.brand}`);
            }
            return value;
        };
    }
    switch (argument) {
        case "bool": return Boolean;
        case "f32": return (value) => Math.fround(Number(value));
        case "i32": return (value) => Number(value) >> 0;
        case "u32": return (value) => Number(value) >>> 0;
        case "string": return String;
    }
}

function createFacadeMethod(
    facade: HydWebGLStatic,
    context: HydWebGLStatic,
    property: string,
    method: Function,
): Function {
    const signature = WEBGL_METHOD_ARGUMENTS[property];
    const header = Function.prototype.toString.call(method).split("{", 1)[0];
    const needsVariableArguments = header.includes("...") || header.includes("=");
    const arity = Math.max(method.length, signature?.length || 0);
    const invoke = method.bind(context);

    if (!needsVariableArguments && arity <= 10) {
        if (!signature) {
            switch (arity) {
                case 0: return function(this: unknown) { if (this !== facade && this !== context) throw new TypeError("Illegal invocation"); return invoke(); };
                case 1: return function(this: unknown, a0: unknown) { if (this !== facade && this !== context) throw new TypeError("Illegal invocation"); return invoke(a0); };
                case 2: return function(this: unknown, a0: unknown, a1: unknown) { if (this !== facade && this !== context) throw new TypeError("Illegal invocation"); return invoke(a0, a1); };
                case 3: return function(this: unknown, a0: unknown, a1: unknown, a2: unknown) { if (this !== facade && this !== context) throw new TypeError("Illegal invocation"); return invoke(a0, a1, a2); };
                case 4: return function(this: unknown, a0: unknown, a1: unknown, a2: unknown, a3: unknown) { if (this !== facade && this !== context) throw new TypeError("Illegal invocation"); return invoke(a0, a1, a2, a3); };
                case 5: return function(this: unknown, a0: unknown, a1: unknown, a2: unknown, a3: unknown, a4: unknown) { if (this !== facade && this !== context) throw new TypeError("Illegal invocation"); return invoke(a0, a1, a2, a3, a4); };
                case 6: return function(this: unknown, a0: unknown, a1: unknown, a2: unknown, a3: unknown, a4: unknown, a5: unknown) { if (this !== facade && this !== context) throw new TypeError("Illegal invocation"); return invoke(a0, a1, a2, a3, a4, a5); };
                case 7: return function(this: unknown, a0: unknown, a1: unknown, a2: unknown, a3: unknown, a4: unknown, a5: unknown, a6: unknown) { if (this !== facade && this !== context) throw new TypeError("Illegal invocation"); return invoke(a0, a1, a2, a3, a4, a5, a6); };
                case 8: return function(this: unknown, a0: unknown, a1: unknown, a2: unknown, a3: unknown, a4: unknown, a5: unknown, a6: unknown, a7: unknown) { if (this !== facade && this !== context) throw new TypeError("Illegal invocation"); return invoke(a0, a1, a2, a3, a4, a5, a6, a7); };
                case 9: return function(this: unknown, a0: unknown, a1: unknown, a2: unknown, a3: unknown, a4: unknown, a5: unknown, a6: unknown, a7: unknown, a8: unknown) { if (this !== facade && this !== context) throw new TypeError("Illegal invocation"); return invoke(a0, a1, a2, a3, a4, a5, a6, a7, a8); };
                case 10: return function(this: unknown, a0: unknown, a1: unknown, a2: unknown, a3: unknown, a4: unknown, a5: unknown, a6: unknown, a7: unknown, a8: unknown, a9: unknown) { if (this !== facade && this !== context) throw new TypeError("Illegal invocation"); return invoke(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9); };
            }
        }
        const converters = Array.from({ length: arity }, (_, index) =>
            index < signature.length
                ? createWebIdlConverter(property, index, signature[index])
                : identityWebIdlArgument);
        const [c0, c1, c2, c3, c4, c5, c6, c7, c8, c9] = converters;
        switch (arity) {
            case 0: return function(this: unknown) { if (this !== facade && this !== context) throw new TypeError("Illegal invocation"); return invoke(); };
            case 1: return function(this: unknown, a0: unknown) { if (this !== facade && this !== context) throw new TypeError("Illegal invocation"); return invoke(c0(a0)); };
            case 2: return function(this: unknown, a0: unknown, a1: unknown) { if (this !== facade && this !== context) throw new TypeError("Illegal invocation"); return invoke(c0(a0), c1(a1)); };
            case 3: return function(this: unknown, a0: unknown, a1: unknown, a2: unknown) { if (this !== facade && this !== context) throw new TypeError("Illegal invocation"); return invoke(c0(a0), c1(a1), c2(a2)); };
            case 4: return function(this: unknown, a0: unknown, a1: unknown, a2: unknown, a3: unknown) { if (this !== facade && this !== context) throw new TypeError("Illegal invocation"); return invoke(c0(a0), c1(a1), c2(a2), c3(a3)); };
            case 5: return function(this: unknown, a0: unknown, a1: unknown, a2: unknown, a3: unknown, a4: unknown) { if (this !== facade && this !== context) throw new TypeError("Illegal invocation"); return invoke(c0(a0), c1(a1), c2(a2), c3(a3), c4(a4)); };
            case 6: return function(this: unknown, a0: unknown, a1: unknown, a2: unknown, a3: unknown, a4: unknown, a5: unknown) { if (this !== facade && this !== context) throw new TypeError("Illegal invocation"); return invoke(c0(a0), c1(a1), c2(a2), c3(a3), c4(a4), c5(a5)); };
            case 7: return function(this: unknown, a0: unknown, a1: unknown, a2: unknown, a3: unknown, a4: unknown, a5: unknown, a6: unknown) { if (this !== facade && this !== context) throw new TypeError("Illegal invocation"); return invoke(c0(a0), c1(a1), c2(a2), c3(a3), c4(a4), c5(a5), c6(a6)); };
            case 8: return function(this: unknown, a0: unknown, a1: unknown, a2: unknown, a3: unknown, a4: unknown, a5: unknown, a6: unknown, a7: unknown) { if (this !== facade && this !== context) throw new TypeError("Illegal invocation"); return invoke(c0(a0), c1(a1), c2(a2), c3(a3), c4(a4), c5(a5), c6(a6), c7(a7)); };
            case 9: return function(this: unknown, a0: unknown, a1: unknown, a2: unknown, a3: unknown, a4: unknown, a5: unknown, a6: unknown, a7: unknown, a8: unknown) { if (this !== facade && this !== context) throw new TypeError("Illegal invocation"); return invoke(c0(a0), c1(a1), c2(a2), c3(a3), c4(a4), c5(a5), c6(a6), c7(a7), c8(a8)); };
            case 10: return function(this: unknown, a0: unknown, a1: unknown, a2: unknown, a3: unknown, a4: unknown, a5: unknown, a6: unknown, a7: unknown, a8: unknown, a9: unknown) { if (this !== facade && this !== context) throw new TypeError("Illegal invocation"); return invoke(c0(a0), c1(a1), c2(a2), c3(a3), c4(a4), c5(a5), c6(a6), c7(a7), c8(a8), c9(a9)); };
        }
    }

    return function(this: unknown, ...args: unknown[]) {
        if (this !== facade && this !== context) throw new TypeError("Illegal invocation");
        return Reflect.apply(invoke, undefined, convertWebIdlArguments(property, args));
    };
}

export interface HydRuntime {
    readonly device: GPUDevice;
    readonly shaderTranslator: ShaderTranslator;
}

function normalizeContextAttributes(attributes: WebGLContextAttributes = {}): WebGLContextAttributes {
    return {
        alpha: attributes.alpha !== undefined ? attributes.alpha : true,
        antialias: attributes.antialias !== undefined ? attributes.antialias : true,
        depth: attributes.depth !== undefined ? attributes.depth : true,
        desynchronized: attributes.desynchronized !== undefined ? attributes.desynchronized : false,
        failIfMajorPerformanceCaveat: attributes.failIfMajorPerformanceCaveat !== undefined ? attributes.failIfMajorPerformanceCaveat : false,
        powerPreference: attributes.powerPreference || "default",
        premultipliedAlpha: attributes.premultipliedAlpha !== undefined ? attributes.premultipliedAlpha : true,
        preserveDrawingBuffer: attributes.preserveDrawingBuffer !== undefined ? attributes.preserveDrawingBuffer : false,
        stencil: attributes.stencil !== undefined ? attributes.stencil : false,
    };
}

function makeReplacementCanvas(element: HTMLCanvasElement): HTMLCanvasElement {
    const replacement = document.createElement("canvas");
    replacement.width = element.width || element.clientWidth || 1;
    replacement.height = element.height || element.clientHeight || 1;
    replacement.className = element.className;
    replacement.style.cssText = element.style.cssText;
    for (const attr of Array.from(element.attributes)) {
        if (attr.name === "id" || attr.name === "class" || attr.name === "style" || attr.name === "width" || attr.name === "height") {
            continue;
        }
        replacement.setAttribute(attr.name, attr.value);
    }
    if (element.id) {
        replacement.id = element.id;
        element.removeAttribute("id");
    }
    element.parentNode?.replaceChild(replacement, element);
    return replacement;
}

async function createHydRuntime(
    translatorOptions: ShaderTranslatorOptions = {},
    powerPreference: GPUPowerPreference | undefined = "high-performance",
): Promise<HydRuntime> {
    const defaultTranslatorOptions = ((globalThis as any).__HYD_TRANSLATOR_OPTIONS || {}) as ShaderTranslatorOptions;
    const [shaderTranslator, hydAdapter] = await Promise.all([
        ShaderTranslator.create({
            ...defaultTranslatorOptions,
            ...translatorOptions,
        }),
        navigator.gpu.requestAdapter({ powerPreference }),
    ]);
    if (!hydAdapter) throw new Error("Unable to acquire a WebGPU adapter");
    const optionalFeatures: GPUFeatureName[] = [
        "texture-compression-etc2",
        "texture-formats-tier1",
        "depth32float-stencil8",
    ];
    const requiredFeatures = optionalFeatures.filter((feature) => hydAdapter.features.has(feature));
    const requiredLimits: Record<string, number> = {};
    const maxColorAttachmentBytesPerSample = Number(hydAdapter.limits.maxColorAttachmentBytesPerSample);
    if (Number.isFinite(maxColorAttachmentBytesPerSample)) {
        requiredLimits.maxColorAttachmentBytesPerSample = maxColorAttachmentBytesPerSample;
    }
    const hydDevice = await hydAdapter.requestDevice({
        label: "hydDevice",
        requiredFeatures,
        requiredLimits,
    });
    hydDevice.addEventListener("uncapturederror", (event: GPUUncapturedErrorEvent) => {
        console.error("[HYD] WebGPU uncaptured error:", event.error && event.error.message);
    });
    hydDevice.lost.then((info) => {
        console.error("[HYD] WebGPU device lost:", info.reason, info.message);
    });
    return { device: hydDevice, shaderTranslator };
}

function createHydContextFacade(context: HydWebGLStatic, contextType: string): HydWebGLStatic {
    const webgl2 = contextType === "webgl2";
    const contextPrototype = webgl2
        ? WebGL2RenderingContext.prototype
        : WebGLRenderingContext.prototype;
    const webgl1Names = new Set(Object.getOwnPropertyNames(WebGLRenderingContext.prototype));
    const publicApiCandidates = [
        ...getNativeEnumerableApiNames(contextType),
        ...webgl1Names,
        ...(webgl2 ? Object.getOwnPropertyNames(WebGL2RenderingContext.prototype) : []),
        ...Object.keys(hydWebGLConstants),
        "canvas",
    ];
    const publicEnumerableNames = new Set<string>(
        publicApiCandidates.filter((name) => name === "canvas" || Reflect.has(context, name)),
    );
    publicEnumerableNames.delete("constructor");
    // Keep the native prototype in the chain for instanceof, but expose the
    // facade methods on the direct prototype as WebGL does. Some applications
    // intentionally call WebGLRenderingContext prototype methods with the
    // context as the receiver.
    const facadePrototype = Object.create(contextPrototype);
    const facade = Object.create(facadePrototype) as HydWebGLStatic;
    const prototypeOnlyApiNames = new Set(["drawingBufferStorage"]);
    const nativeDescriptor = (property: string): PropertyDescriptor | undefined => {
        for (let prototype: object | null = contextPrototype; prototype; prototype = Object.getPrototypeOf(prototype)) {
            const descriptor = Object.getOwnPropertyDescriptor(prototype, property);
            if (descriptor) return descriptor;
        }
        return undefined;
    };

    for (const property of publicEnumerableNames) {
        let value = Reflect.get(context, property, context);
        if (value === undefined && property in hydWebGLConstants) {
            value = hydWebGLConstants[property as keyof typeof hydWebGLConstants];
        }
        if (typeof value === "function") {
            const method = value;
            const facadeMethod = createFacadeMethod(facade, context, property, method);
            if (!prototypeOnlyApiNames.has(property)) {
                Object.defineProperty(facade, property, {
                    configurable: true,
                    enumerable: true,
                    writable: true,
                    value: facadeMethod,
                });
            }
            Object.defineProperty(facadePrototype, property, {
                configurable: true,
                enumerable: true,
                writable: true,
                value: facadeMethod,
            });
            continue;
        }
        if (property in hydWebGLConstants) {
            Object.defineProperty(facade, property, {
                configurable: true,
                enumerable: true,
                writable: false,
                value,
            });
            continue;
        }
        const descriptor = nativeDescriptor(property);
        Object.defineProperty(facade, property, {
            configurable: true,
            enumerable: true,
            get: () => Reflect.get(context, property, context),
            ...(descriptor?.set ? {
                set: (nextValue: unknown) => {
                    Reflect.set(context, property, nextValue, context);
                },
            } : {}),
        });
    }
    Object.defineProperties(facade, {
        hydContextType: {
            configurable: false,
            enumerable: false,
            get: () => context.hydContextType,
        },
        [Symbol.toStringTag]: {
            configurable: true,
            enumerable: false,
            value: webgl2 ? "WebGL2RenderingContext" : "WebGLRenderingContext",
        },
    });
    return facade;
}

function createHydContext(
    runtime: HydRuntime,
    element: HTMLCanvasElement,
    _shader_info_url: string | null | undefined,
    arg0: [string, WebGLContextAttributes],
    arg1: [number, number],
    existingGpuContext?: GPUCanvasContext | null,
): HydWebGLStatic {
    let [contextType, contextAttributes] = arg0;
    contextAttributes = normalizeContextAttributes(contextAttributes || {});
    const [uniform_size, replay_delay] = arg1;

    // uniform_size = uniform_size || 1<<18;
    // replay_delay = replay_delay || 5000;
    if (!hydWebGLTypes.includes(contextType)) {
        throw new Error("Invalid context type");
    }

    let targetElement = element;
    let gpuctx = existingGpuContext || targetElement.getContext("webgpu");
    if (!gpuctx) {
        targetElement = makeReplacementCanvas(element);
        gpuctx = targetElement.getContext("webgpu");
    }
    if (!gpuctx) {
        throw new Error("Unable to create WebGPU canvas context");
    }
    const maxDrawingBufferDimension = runtime.device.limits.maxTextureDimension2D;
    if (targetElement.width > maxDrawingBufferDimension) targetElement.width = maxDrawingBufferDimension;
    if (targetElement.height > maxDrawingBufferDimension) targetElement.height = maxDrawingBufferDimension;
    gpuctx.configure({
        device: runtime.device,
        // format: navigator.gpu.getPreferredCanvasFormat(),
        format: 'bgra8unorm',
        alphaMode: contextAttributes.alpha === false ? 'opaque' : 'premultiplied',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
    });
    // const wrapper = new HydWebGLWrapper(this, gpuctx, glctx, contextAttributes, hydDevice, uniform_size);
    const context = new HydWebGLStatic(
        targetElement,
        gpuctx,
        contextAttributes,
        runtime.device,
        uniform_size,
        replay_delay,
        runtime.shaderTranslator,
        contextType,
    );
    return createHydContextFacade(context, contextType);
}

async function hydGetContext(
    element: HTMLCanvasElement,
    shaderInfoUrl: string | null | undefined,
    arg0: [string, WebGLContextAttributes],
    arg1: [number, number],
    translatorOptions: ShaderTranslatorOptions = {},
): Promise<HydWebGLStatic> {
    const contextAttributes = normalizeContextAttributes(arg0[1] || {});
    const powerPreference = contextAttributes.powerPreference === "default"
        ? undefined
        : contextAttributes.powerPreference;
    const runtime = await createHydRuntime(translatorOptions, powerPreference);
    return createHydContext(runtime, element, shaderInfoUrl, [arg0[0], contextAttributes], arg1);
}

export {
    createHydRuntime,
    createHydRuntime as gl2gpuCreateRuntime,
    createHydContext,
    createHydContext as gl2gpuCreateContext,
    hydGetContext,
    hydGetContext as gl2gpuGetContext,
    beginFrame,
    endFrame,
};
