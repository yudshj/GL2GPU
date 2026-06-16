import { HydWebGLStatic, beginFrame, endFrame } from "./components/hydWebGLStatic";
import { ShaderTranslator, ShaderTranslatorOptions } from "./components/shaderTranslator";

const hydWebGLTypes = ["experimental-webgl", "webgl", "webgl2"];

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

async function hydGetContext(element: HTMLCanvasElement, _shader_info_url: string | null | undefined, arg0: [string, WebGLContextAttributes], arg1: [number, number], translatorOptions: ShaderTranslatorOptions = {}): Promise<HydWebGLStatic> {
    let [contextType, contextAttributes] = arg0;
    contextAttributes = normalizeContextAttributes(contextAttributes || {});
    let [uniform_size, replay_delay] = arg1;

    const defaultTranslatorOptions = ((globalThis as any).__HYD_TRANSLATOR_OPTIONS || {}) as ShaderTranslatorOptions;
    const shaderTranslator = await ShaderTranslator.create({
        ...defaultTranslatorOptions,
        ...translatorOptions,
    });

    // uniform_size = uniform_size || 1<<18;
    // replay_delay = replay_delay || 5000;
    if (!hydWebGLTypes.includes(contextType)) {
        throw new Error("Invalid context type");
    }
    const hydAdapter = await navigator.gpu.requestAdapter({powerPreference: "high-performance"});
    const hydDevice = await hydAdapter.requestDevice({label: "hydDevice"});
    hydDevice.addEventListener("uncapturederror", (event: GPUUncapturedErrorEvent) => {
        console.error("[HYD] WebGPU uncaptured error:", event.error && event.error.message);
    });
    hydDevice.lost.then((info) => {
        console.error("[HYD] WebGPU device lost:", info.reason, info.message);
    });

    const hydWebGLContexts = {};
    for (const type of hydWebGLTypes) {
        const canvas = document.createElement("canvas");
        hydWebGLContexts[type] = canvas.getContext(type);
    }
    let targetElement = element;
    let gpuctx = targetElement.getContext("webgpu");
    if (!gpuctx) {
        targetElement = makeReplacementCanvas(element);
        gpuctx = targetElement.getContext("webgpu");
    }
    if (!gpuctx) {
        throw new Error("Unable to create WebGPU canvas context");
    }
    gpuctx.configure({
        device: hydDevice,
        // format: navigator.gpu.getPreferredCanvasFormat(),
        format: 'bgra8unorm',
        alphaMode: contextAttributes.alpha === false ? 'opaque' : 'premultiplied',
    });
    // const wrapper = new HydWebGLWrapper(this, gpuctx, glctx, contextAttributes, hydDevice, uniform_size);
    return new HydWebGLStatic(targetElement, gpuctx, contextAttributes, hydDevice, uniform_size, replay_delay, shaderTranslator);
};

export { hydGetContext, hydGetContext as gl2gpuGetContext, beginFrame, endFrame };
