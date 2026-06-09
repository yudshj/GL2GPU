import { HydWebGLStatic, beginFrame, endFrame } from "./components/hydWebGLStatic";
import { ShaderTranslator, ShaderTranslatorOptions } from "./components/shaderTranslator";

const hydWebGLTypes = ["experimental-webgl", "webgl", "webgl2"];

async function hydGetContext(element: HTMLCanvasElement, _shader_info_url: string | null | undefined, arg0: [string, WebGLContextAttributes], arg1: [number, number], translatorOptions: ShaderTranslatorOptions = {}): Promise<HydWebGLStatic> {
    let [contextType, contextAttributes] = arg0;
    let [uniform_size, replay_delay] = arg1;

    const shaderTranslator = await ShaderTranslator.create(translatorOptions);

    // uniform_size = uniform_size || 1<<18;
    // replay_delay = replay_delay || 5000;
    if (!hydWebGLTypes.includes(contextType)) {
        throw new Error("Invalid context type");
    }
    const hydAdapter = await navigator.gpu.requestAdapter({powerPreference: "high-performance"});
    const hydDevice = await hydAdapter.requestDevice({label: "hydDevice"});

    const hydWebGLContexts = {};
    for (const type of hydWebGLTypes) {
        const canvas = document.createElement("canvas");
        hydWebGLContexts[type] = canvas.getContext(type);
    }
    const gpuctx = element.getContext("webgpu");
    gpuctx.configure({
        device: hydDevice,
        // format: navigator.gpu.getPreferredCanvasFormat(),
        format: 'bgra8unorm',
    });
    // const wrapper = new HydWebGLWrapper(this, gpuctx, glctx, contextAttributes, hydDevice, uniform_size);
    return new HydWebGLStatic(element, gpuctx, contextAttributes, hydDevice, uniform_size, replay_delay, shaderTranslator);
};

export { hydGetContext, hydGetContext as gl2gpuGetContext, beginFrame, endFrame };
