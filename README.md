# GL2GPU

## DEMO

[gl2gpu-demo-www25-submission-6.webm](https://github.com/user-attachments/assets/89afa4a1-52e7-429a-9e9d-128bffef9cac)

> 如何使用静态的GL2GPU？

Webpack编译。指令 `npm i; npx webpack w`，根据`webpack.config.js`中的配置，静态的GL2GPU将在`dist/`中生成最终代码。`dist/release`, `dist/development`, `dist/release-minimized` 里面的 `gl2gpu.js` 都可以被使用。

翻译shader代码，翻译样例：`src/components/shaders/shaders_info.json`
- 翻译辅助脚本：`src/components/shaders/glsl_to_bindings.py`
- uniform 需要被特殊翻译！(TBW)

```typescript
export function ShaderInfo2String(shaderInfo: ShaderInfoType): string {
    let res = "";
    let offset = 0;
    if (shaderInfo.uniforms.length > 0) {
        res += "struct HydUniformObject {\n";
        for (const uniform of shaderInfo.uniforms) {
            res += `  ${uniform.name}: ${uniform.wgsl_type},\n`;
        }
        res += "};\n\n";
        res += "@binding(0) @group(0) var<uniform> _hyd_uniforms_ : HydUniformObject;\n\n";
        offset = 1;
    }
    for (let i = 0; i < shaderInfo.samplers.length; i++) {
        const sampler = shaderInfo.samplers[i];
        res += `@binding(${i * 2 + offset + 0}) @group(0) var ${sampler.name}S: ${sampler.wgsl_sampler_type};\n`;
        res += `@binding(${i * 2 + offset + 1}) @group(0) var ${sampler.name}T: ${sampler.wgsl_texture_type};\n`;
    }
    return res;
}
```



修改WebGL应用。需要进行5处修改：
1. 引用上一步中得到的 `gl2gpu.js` 文件
2. 将 `getContext("webgl", arg0?)` 修改为 `GL2GPU.getContext(canvas, <shader_json_url>, arg0?, arg1?)`
    - `this._gl = await GL2GPU.hydGetContext(this.element, "../shaders_info.json", ["webgl", { preserveDrawingBuffer: true }], [1<<18, 200]);`
3. 将同步函数修改为异步函数调用 `async`-`await`
4. 将渲染函数 `render()` （通常被 `requestAnimationFrame` 所调用）修改为 `GL2GPU.beginFrame(); render(); GL2GPU.endFrame();`

---

以下是动态GL2GPU文档。

Build Status: [![Build Status](https://github.com/yudshj/GL2GPU/workflows/Webpack/badge.svg)](https://github.com/yudshj/GL2GPU/actions)

# Evaluation 方法

Webpack编译指令 `npm i; npx webpack w`

用Webpack编译完成后，将得到一个 hydWrapper.js 文件。只需要把这个文件以某种合适的方法注入到页面中就能加载GL2GPU。

加载完毕后为了驱动 GL2GPU 执行，还需要调用 `HYD.hydInstrument` 来修改 `canvas` 的 `getContext` 方法。比如我们可以添加以下代码（见 `/extension/inject.js`）：

```javascript
const _GL2GPU_CONFIG = {
    cmbMode: "cmb",
    replayDelay: 5000,
    uniformBatchSize: 262144, // 256KB
};

const proxy = new Proxy(window.requestAnimationFrame, {
    apply: function (target, thisArg, argumentsList) {
        const func = argumentsList[0];
        const funcNew = function (time) {
            HYD.runFrameStartFunctions();
            func(time);
            HYD.runFrameEndFunctions();
        }
        target.apply(thisArg, [funcNew]);
    }
});
window.requestAnimationFrame = proxy;
HYD.hydInstrument( _GL2GPU_CONFIG["cmbMode"], _GL2GPU_CONFIG["replayDelay"], _GL2GPU_CONFIG["uniformBatchSize"] );
```

Extension 的实现中还使用 sessionStorage 来保存GL2GPU开启状态。保存的key名称为 'HYD_LOAD_KEY'，可选项有 'on' 和 'off'。这样可以实现点击浏览器插件栏插件来开启/关闭GL2GPU。

`_GL2GPU_CONFIG` 定义了运行配置。

- `cmbMode` 表示优化开关，可选项有：
    - "cmb": cache + merge uniform + bundle
    - "c1mb": cache (without layer-2 cache) + merge uniform + bundle
    - "mb": merge uniform + bundle
    - "m": merge uniform
    - "cm": cache + merge uniform
- `replayDelay` 表示等待多少毫秒之后开启 replay mode，$-1$ 表示关闭replay mode
- `sessionStorage` 表示 merged uniform size

## 关于 chrome extension

目录为 `/extension`。插件旨在将目录下的 `inject.js` 注入当前页面。

修改 `inject.js` 然后在 chrome://extensions 里面刷新插件即可加载最新的配置。

## 关于 frame times

现在三个 demo 都包含一段代码，可以记录 frameTimes. 记录原理如下: 

```javascript
var frameTimes = [];
function render() {
    const startTime = performance.now();
    // render logic
    const endTime = performance.now();
    frameTimes.push(endTime - startTime);
}

requestAnimationFrame(render);
```

为了方便导出，我设置了获取 2000 个 frameTime 后保存 `frameTimes` 为json并下载。

## Demo

- https://serverless.pku.edu.cn/gl2gpu/aquarium/?numFish=100
- https://serverless.pku.edu.cn/gl2gpu/sprites/?numSprites=100
- https://serverless.pku.edu.cn/gl2gpu/motionmark/?numTriangles=100

# 二次开发

## Shader

WebGL 的 shader 需要在编译项目前单独翻译。翻译shader将得到一个json文件（`src/componenets/shaders/shaders_info.json`）。我们的翻译器会在 `shaderDB.ts` 中import这个 `shaders_info.json`。

目录 `src/componenets/shaders` 存放着与shader有关的所有代码。每个demo的shader代码在`src/componenets/shaders/<demo名称>`目录下。可以用 Python 3 执行 `src/componenets/shaders/glsl_to_bindings.py` 来自动生成 `src/componenets/shaders/shaders_info.json`。

> **由于变量alignment的问题，WebGL的shader无法“一对一”地翻译到WebGPU。**对于同一个 WebGL shader，可能有多种不同的WebGPU shader与之对应。这是因为GLSL（WebGL的shader语法）在开头不需要声明所有的全局变量，而WGSL（WebGPU的shader语法）则需要。不同的vertex和fragment的组合造成了翻译得到的WGSL的不一致。

> 我们在翻译器的运行中解决这个 alignment 的问题。

为了让 `glsl_to_bindings.py` 自动生成shader代码需要在编写每个项目的shader代码时注意以下两点：

1. 把所有的uniform变量用 `_hyd_uniforms_` 给打包起来；
2. 一个WebGL的texture uniform在WGSL中需要用两个bindgroup的变量表示。分别是sampler和texture。命名格式形如 xxxS, xxxT，其中xxx为GLSL中texture的变量名。

编写shader时只需保留运算逻辑，不需要声明 uniform binding group 和 storage binding group. 可以在 `hydProgram.ts` 的 `linkProgram()` 中打印alignment完成后的WGSL shader。

<!--
# Challenge

- 判断每个request animation frame的开始，frame和`clear()`的不对应。
    - 不然createView耗时长。
- **shader的转换**和uniform binding的对齐。
- `mat4` can be a type of a vertex buffer. `in mat4 matrix`.
- 一些小的uniform buffer可能不符合`minBindingSize`的要求。
- WebGPU不支持`gl_PointSize`。
- **mipmaps**.
- WebGPU texture 的实现中 sampler (texture state) 和 内存 (texture data) 的分离
- `gl.LUMINANCE`
- ==坐标变换==
- uniform buffer performance?
- 不支持 $\mathit{type}$ 为`gl.UNSIGNED_BYTE`的`drawElements`.
- `instanceof`
- WebGPU: texture, viewDimension / WebGL: `bindTexture()`
    - WebGL的bindTexture不能bind两次！
- stencil attachments
- 合并uniform buffer？
    - https://stackoverflow.com/questions/33589784/ssbo-as-bigger-ubo
    - https://community.khronos.org/t/uniform-buffer-memory-barriers/6777
- cache开销！

# To-do

## Functionality

### usability

- [ ] [做成插件](https://stackoverflow.com/questions/19191679/chrome-extension-inject-js-before-page-load)

### global state

- [x] Vertex Array Object
- [x] Texture
- [x] test5.html
- [x] shadow mapping
- [x] **framebuffer, renderbuffer (多pipeline？)**
- [x] depth
- [x] stencil
- [x] blend
- [x] cullFace
- [x] CubeMap
- [x] threejs example
- [x] scissor box
- [ ] dithering
- [ ] buffer writemasks
- [ ] multisample?
- [ ] `gl.vertexAttrib4f()`
- [ ] ~~生成 `BindGroupLayout`~~
- [ ] **`RenderPass` Cache**
- [x] fuse `uniforms` into one struct
    - [alignment](https://www.w3.org/TR/WGSL/#alignment-and-size)

### shader

- [ ] GLSL -> WGSL
- [ ] uniform & attribute location

## JS-tricks

- [ ] `instanceof`
- [ ] fake `device.queue`

## Performance

- [ ] cache CommandEncoder&Pipeline&BindGroup&VertexState&VertexBufferLayout?TextureView?
- [ ] performance of `writeUniform, draw, writeUniform, draw` ...


# 优化方向

- `BindGroup` 重用
- `BindGroupLayout` 重用
- 根据更改频率对资源进行分组
    - `BindGroup(0)` 放更改频率最低的
-->
