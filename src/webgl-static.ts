import { HydWebGLStatic, beginFrame, endFrame } from "./components/hydWebGLStatic";
import { hydTrim, InitShaderInfoType } from "./components/shaderDB";

const hydWebGLTypes = ["experimental-webgl", "webgl", "webgl2"];

async function fetchJSON(url) {
    try {
        // 使用fetch API发出HTTP GET请求
        const response = await fetch(url);
        // 检查响应状态
        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.statusText);
        }
        // 解析响应数据为JSON
        const data = await response.json();
        // 返回解析后的JavaScript对象
        return data;
    } catch (error) {
        // 错误处理
        console.error('Failed to fetch data:', error);
    }
}

async function hydGetContext(element: HTMLCanvasElement, shader_info_url: string, arg0: [string, WebGLContextAttributes], arg1: [number, number]): Promise<HydWebGLStatic> {
    let [contextType, contextAttributes] = arg0;
    let [uniform_size, replay_delay] = arg1;

    // TODO: 删掉下面的 shaderMap
    const shaderInfo: Array<InitShaderInfoType> = await fetchJSON(shader_info_url);
    const shaderMap: Map<string, InitShaderInfoType> = new Map(
        shaderInfo.map((info) => {
            return [
                hydTrim(info.glsl),
                info
            ];
        })
    );

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
    return new HydWebGLStatic(element, gpuctx, contextAttributes, hydDevice, uniform_size, replay_delay, shaderMap);
};

export { hydGetContext, beginFrame, endFrame };
