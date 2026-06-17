const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const repo = path.resolve(__dirname, "..");
const baseRef = process.env.GL2GPU_REPORT_BASE || "main";
const headRef = process.env.GL2GPU_REPORT_HEAD || "HEAD";
const outputDir = path.join(repo, "output", "pdf");
const reportHtml = path.join(outputDir, "gl2gpu-tint-postprocess-report.html");
const reportPdf = path.join(outputDir, "gl2gpu-tint-postprocess-report.pdf");

const demoNames = {
  aquarium: "Aquarium",
  motionmark: "MotionMark",
  sprites: "Sprites / JSGameBench",
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repo,
    encoding: "utf8",
    ...options,
  });
  if (result.status !== 0 && options.allowFailure !== true) {
    throw new Error(`${command} ${args.join(" ")} failed:\n${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function git(args, options) {
  return run("git", args, options);
}

function readJson(relativePath, fallback = null) {
  const fullPath = path.join(repo, relativePath);
  if (!fs.existsSync(fullPath)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fileUrl(file) {
  return `file://${file}`;
}

function fixed(value, digits = 3) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "无数据";
}

function percentDelta(ratio) {
  const number = Number(ratio);
  return Number.isFinite(number) ? `${((number - 1) * 100).toFixed(1)}%` : "无数据";
}

function table(headers, rows) {
  return `<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function detailBlocks(rows, labels = ["含义", "为什么 Tint runtime path 需要", "落地位置"]) {
  return rows.map(([title, meaning, why, implementation]) => `<div class="detail-block">
    <h3>${esc(title)}</h3>
    <p><b>${esc(labels[0])}：</b>${esc(meaning)}</p>
    <p><b>${esc(labels[1])}：</b>${esc(why)}</p>
    <p><b>${esc(labels[2])}：</b>${esc(implementation)}</p>
  </div>`).join("\n");
}

function section(title, body) {
  return `<section><h2>${esc(title)}</h2>${body}</section>`;
}

function bulletList(items) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function benchmarkRows(report) {
  if (!report || !Array.isArray(report.summary)) {
    return [];
  }
  return report.summary.map((row) => {
    const tint = row.modes && row.modes.tint ? row.modes.tint : {};
    const manual = row.modes && row.modes.manual ? row.modes.manual : {};
    return [
      demoNames[row.benchmark] || row.benchmark,
      row.objects,
      fixed(tint.medianFps),
      fixed(manual.medianFps),
      fixed(row.tintVsManualFpsRatio, 3),
      percentDelta(row.tintVsManualFpsRatio),
      fixed(tint.medianFrameMs, 2),
      fixed(manual.medianFrameMs, 2),
      fixed(row.tintVsManualRmse, 5),
      tint.shaderDbRequests ?? "无数据",
      tint.hardFailureCount ?? "无数据",
    ];
  });
}

function tintMetric(report, benchmark) {
  if (!report || !Array.isArray(report.summary)) {
    return null;
  }
  const row = report.summary.find((item) => item.benchmark === benchmark);
  return row && row.modes ? row.modes.tint : null;
}

function fpsWithFullRatio(metric, fullMetric) {
  const fps = metric && Number(metric.medianFps);
  const fullFps = fullMetric && Number(fullMetric.medianFps);
  if (!Number.isFinite(fps)) {
    return "无数据";
  }
  if (!Number.isFinite(fullFps) || fullFps <= 0) {
    return fixed(fps);
  }
  return `${fixed(fps)} (${(fps / fullFps * 100).toFixed(1)}%)`;
}

function ablationRows(reports) {
  const demos = ["aquarium", "motionmark", "sprites"];
  return demos.map((demo) => {
    const full = tintMetric(reports.full, demo);
    const noWgsl = tintMetric(reports.noWgslOptimizer, demo);
    const noOrigin = tintMetric(reports.noOriginVariants, demo);
    const bothOff = tintMetric(reports.bothOff, demo);
    const issues = [full, noWgsl, noOrigin, bothOff]
      .filter(Boolean)
      .reduce((sum, metric) => sum + (metric.shaderDbRequests || 0) + (metric.hardFailureCount || 0), 0);
    return [
      demoNames[demo] || demo,
      reports.full && reports.full.benchmarks && reports.full.benchmarks.find((item) => item.name === demo)
        ? reports.full.benchmarks.find((item) => item.name === demo).objects
        : "100000",
      fpsWithFullRatio(full, full),
      fpsWithFullRatio(noWgsl, full),
      fpsWithFullRatio(noOrigin, full),
      fpsWithFullRatio(bothOff, full),
      issues,
    ];
  });
}

function qualityRows(report) {
  const summary = report && report.quality && Array.isArray(report.quality.summary)
    ? report.quality.summary
    : report && Array.isArray(report.summary)
      ? report.summary
      : [];
  return summary.map((row) => {
    const sample = row.sample || row.benchmark;
    return [
      demoNames[sample] || sample,
      row.objects,
      fixed(row.tintVsWebgl && row.tintVsWebgl.psnr, 4),
      fixed(row.tintVsWebgl && row.tintVsWebgl.ssim, 6),
      fixed(row.manualVsWebgl && row.manualVsWebgl.psnr, 4),
      fixed(row.manualVsWebgl && row.manualVsWebgl.ssim, 6),
      row.tintVsWebgl ? row.tintVsWebgl.shaderDbRequests : "无数据",
    ];
  });
}

function browserLabel(report) {
  if (!report || !report.browser) {
    return "无数据";
  }
  const mode = report.browser.headless ? "headless Chrome" : "headed Chrome";
  return `${mode} (${report.browser.executablePath})`;
}

function triptych(baseDir, name) {
  return `
    <div class="triptych">
      <figure><img src="${fileUrl(path.join(baseDir, `${name}-webgl.png`))}"><figcaption>WebGL</figcaption></figure>
      <figure><img src="${fileUrl(path.join(baseDir, `${name}-tint.png`))}"><figcaption>Tint GL2GPU</figcaption></figure>
      <figure><img src="${fileUrl(path.join(baseDir, `${name}-manual.png`))}"><figcaption>Manual GL2GPU</figcaption></figure>
    </div>`;
}

function parseNameStatus(text) {
  if (!text) {
    return [];
  }
  return text.split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\t/);
      return { status: parts[0], file: parts[parts.length - 1] };
    });
}

function categoryRows(files) {
  const categories = [
    ["Tint 编译器集成", (file) => /shaderTranslator|shaderMetadata|shaderCapture|shaderSource|shaderDB|hydShader|hydProgram|vendor\/(?:glslang|tint-wasm)|tools\/tint-wasm|glslang\.wasm|tint_wasm|webpack\.config|dist\/release|dist\/js\/gl2gpu\.js/.test(file)],
    ["移除手写 shader DB 依赖", (file) => /shaders_info\.json|glsl_to_bindings\.py|gl2gpu-no_/.test(file)],
    ["WebGL API 和状态机语义", (file) => /hydWebGLStatic|hydTexture|hydGlobalState|hydFramebuffer|hydRenderPassCache|hydConstants|hydBuffer|webgpu\/tdl\/webgl|webgpu_util|textureUpload|webglApiState/.test(file)],
    ["性能和 WGSL post-process", (file) => /shaderWgslOptimizer|gl2gpu-demo-benchmark|paper-benchmark|render-quality|webglsamples-harness/.test(file)],
    ["文档、论文和报告", (file) => /README|WWW25-paper|generate-gl2gpu-tint-report/.test(file)],
  ];
  const claimed = new Set();
  const rows = categories.map(([name, predicate]) => {
    const matched = files.filter((entry) => predicate(entry.file));
    matched.forEach((entry) => claimed.add(entry.file));
    return [name, matched.length, matched.slice(0, 8).map((entry) => `${entry.status} ${entry.file}`).join("\n")];
  });
  const other = files.filter((entry) => !claimed.has(entry.file));
  if (other.length > 0) {
    rows.push(["其他改动文件", other.length, other.slice(0, 8).map((entry) => `${entry.status} ${entry.file}`).join("\n")]);
  }
  return rows;
}

const commitDescriptions = new Map([
  ["Vendor Tint and glslang shader toolchain", "提交 glslang 和 tint-wasm 的 JS/WASM 产物、TypeScript 声明和可复现构建脚本。这个 commit 只解决工具链供应问题，让普通使用者不需要本地安装 Emscripten 或重建 Tint。"],
  ["Add runtime GLSL to WGSL shader translation", "加入 GLSL 元数据扫描、GLSL ES 100 到 glslang 输入的规范化、SPIR-V 到 WGSL 的 Tint 调用、资源声明规范化和 GL2GPU shader 生命周期接线。HydShader 保留 GLSL，HydProgram 在 linkProgram 阶段成对翻译 vertex/fragment 并创建 WebGPU shader module。"],
  ["Converge WebGL API and state semantics", "在 main 已有 WebGL 状态机基础上，补齐 Tint runtime translation 需要的更细粒度 provenance 和边界状态。新增或修正 texture origin、framebuffer read/draw 分离、copy/readback、clear/pass invalidation、默认状态、查询接口、disabled attrib 常量和 instancing 等行为。"],
  ["Add WGSL optimizer and performance harnesses", "加入 Tint WGSL post-process、shader capture 和性能/质量回归 harness。优化器做 private IO wrapper lowering、constructor/swizzle folding、local/temp cleanup、output component-store folding、vec2 affine scalarization 和 single-field output collapse，用于缩小 Tint shader 与手写 shader 的性能差距。"],
  ["Rebuild GL2GPU distribution artifacts", "重建并提交 dist 产物，包括 gl2gpu.js、glslang.wasm、tint_wasm.wasm 和 release bundle，同时删除旧的 no-cache/no-uniform bundle 与手写 shaders_info.json。这个 commit 专门隔离生成文件噪声。"],
  ["Update docs, paper, and report generator", "加入 WWW25 论文 PDF，更新 README 和 toolchain README，并提供本报告生成脚本。报告围绕 main 到当前 HEAD 的完整 diff，回答四个核心问题，记录性能、画质和 Dawn/Tint upstream 结论。这个 commit 故意放在最后，后续只改文档时可以直接 amend 最后一层。"],
]);

function commitRows() {
  const text = git(["log", "--reverse", "--format=%h%x09%s", `${baseRef}..${headRef}`], { allowFailure: true });
  if (!text) {
    return [];
  }
  return text.split(/\r?\n/).filter(Boolean).map((line, index) => {
    const [hash, subject] = line.split("\t");
    return [
      index + 1,
      hash,
      subject,
      commitDescriptions.get(subject) || "此 commit 未在报告脚本中单独归类；请根据 commit message 和 diff 再补充说明。",
    ];
  });
}

fs.mkdirSync(outputDir, { recursive: true });

const baseCommit = git(["show", "--no-patch", "--format=%h%n%H%n%s%n%ad", "--date=iso", baseRef]).split("\n");
const headCommit = git(["show", "--no-patch", "--format=%h%n%H%n%s%n%ad", "--date=iso", headRef]).split("\n");
const headTags = git(["tag", "--points-at", headRef], { allowFailure: true }) || "无";
const diffShortstat = git(["diff", "--shortstat", `${baseRef}...${headRef}`]);
const diffStat = git(["diff", "--stat", `${baseRef}...${headRef}`]);
const changedFiles = parseNameStatus(git(["diff", "--name-status", `${baseRef}...${headRef}`]));
const benchmark100k = readJson("output/gl2gpu-demo-headed-comparison-main-manual/results-n100000.json");
const benchmark300k = readJson("output/gl2gpu-demo-headed-comparison-main-manual/results-n300000.json");
const ablationReports = {
  full: readJson("output/gl2gpu-demo-ablation/full-n100000/results.json"),
  noWgslOptimizer: readJson("output/gl2gpu-demo-ablation/no-wgsl-optimizer-n100000/results.json"),
  noOriginVariants: readJson("output/gl2gpu-demo-ablation/no-origin-variants-n100000/results.json"),
  bothOff: readJson("output/gl2gpu-demo-ablation/both-off-n100000/results.json"),
};
const renderQuality = readJson("output/render-quality/results.json", { summary: [] });
const demoQuality5k = readJson("output/gl2gpu-demo/quality-5k-rerun/results.json", { quality: { summary: [] } });
const browser = browserLabel(benchmark100k || benchmark300k);
const manualDemoRoot = (benchmark100k && benchmark100k.demoRoot) || (benchmark300k && benchmark300k.demoRoot) || "/Volumes/Code/gl2gpu-tint-main-bench/dist";
const renderQualityTriptychBase = path.join(repo, "output", "render-quality");
const demoQualityTriptychBase = path.join(repo, "output", "gl2gpu-demo", "quality-5k-rerun");

const spritesFocusedRows = [
  ["100000", "4 组独立 headed pair", "90 / 45", "1.041, 1.015, 0.983, 0.842", "0.999", "截图 smoke RMSE 0.00000", "第四组受系统/GPU 漂移影响偏低；median 表明基本追平。"],
  ["300000", "4 组独立 headed pair", "60 / 30", "1.084, 1.052, 1.077, 1.015", "1.065", "FPS block 未单独截图", "四组 pair 均显示 Tint 快于 manual。"],
];

const q1Rows = [
  ["和 main 的区别", "main 的 shader path 依赖手写 shaders_info.json：compile/link 后从 DB 找到 WGSL、uniform/sampler/attribute metadata，再拼成 GL2GPU ABI。这个分支保留 HydShader/HydProgram/ShaderInfo 这些核心结构，但把 metadata 和 WGSL 从“人工预生成”改成 linkProgram 时由 GLSL pair runtime 翻译出来。"],
  ["编译器产物", "在 src/vendor/glslang 下提交 glslang WebAssembly 资产，在 src/vendor/tint-wasm 下提交 Tint WebAssembly 资产。release bundle 现在包含 dist/release/gl2gpu.js、glslang.wasm 和 tint_wasm.wasm。"],
  ["可复现构建路径", "tools/tint-wasm/build.sh 会同步本地 Tint checkout，只构建 SPIR-V reader 和 WGSL writer，再用 Emscripten 链接 tools/tint-wasm/tint_wasm.cpp，重新生成 vendored JS/WASM 产物。"],
  ["运行时加载点", "hydGetContext 保持原有 public signature，但在 context 创建期间构造 ShaderTranslator.create(...)。harness 可通过全局 __HYD_TRANSLATOR_OPTIONS 覆盖 WASM URL、capture mode 和 optimizer flags。"],
  ["compile/link 分工", "HydShader.compileShader() 保留 GLSL 和 metadata；HydProgram.linkProgram() 成对翻译 vertex/fragment，分配 deterministic locations，生成 WebGPU shader module，并记录 diagnostics/captures。"],
  ["翻译流水线", "GLSL ES 100 输入会被规范化为 ES 310，legacy builtins 和 texture calls 会被重写；glslang 输出 SPIR-V，Tint 输出 WGSL；GL2GPU 再把资源声明规范化为 _hyd_uniforms_ 和 sampler S/T 命名，然后运行 WGSL optimizer。"],
  ["手写 DB 策略", "shader_info_url 参数仍然保持源码兼容，但生产路径不再依赖 shaders_info.json。main-to-HEAD diff 中删除了 JSON shader DB 和旧 no-cache bundle。"],
];

const q1ConceptRows = [
  [
    "shader lifecycle 迁移",
    "main 中 HydShader/HydProgram 已经是 WebGL shader 生命周期的入口，但真实 WGSL 和 binding metadata 来自手写 DB。这个分支没有推翻生命周期，而是把 DB lookup 挪成 runtime translation：compileShader 仍做 WebGL compile validation 和源码保存，linkProgram 才成对处理 vertex/fragment。",
    "GLSL->WGSL 不能只看单个 shader。varying、attribute location、sampler/resource ABI 都要在 vertex/fragment pair 上决定；这和 WebGL linkProgram 的语义一致，也能自然接住 bindAttribLocation。",
    "HydShader 保存 GLSL、normalized source 和 shader_info；HydProgram.linkProgram 调 ShaderTranslator.translateProgram(vertex, fragment, boundAttributeLocations)，再创建 WebGPU shader modules 并初始化 hydAttributes、hydUniforms、hydSamplers。",
  ],
  [
    "metadata 从手写变成扫描+归一化",
    "main 的 ShaderInfo 是人工整理的事实来源；现在 ShaderTranslator 需要从 GLSL declarations 扫出 attributes、uniforms、samplers、varyings，再把 Tint 产物归一化回 GL2GPU 运行时期望的 ShaderInfo/InitShaderInfoType。",
    "HydGlobalState.getBindGroup/getVertexBuffer 仍然依赖 hydAttributes/hydSamplers/hydUniforms。要让 main 的 PBV、uniform buffer、sampler binding 机制继续工作，就必须让 runtime metadata 与原手写 metadata 等价。",
    "shaderMetadata/shaderSource 负责 declarations 和 legacy GLSL ES 100 预处理；shaderDB 中的 ShaderInfo2String/ShaderInfo2HydAus 继续作为 GL2GPU ABI 适配层；HydProgram 在 link 后把 translator 结果转换成原有 runtime 可消费的数据结构。",
  ],
  [
    "编译器边界",
    "GL2GPU 不直接重写完整 GLSL parser/compiler，而是把 GLSL 编译交给 @webgpu/glslang，SPIR-V 到 WGSL 交给 Tint WASM。GL2GPU 只负责 WebGL ABI、resource naming、layout 和 runtime 语义。",
    "这样可以避免在 GL2GPU 里长期维护一个不完整 shader compiler，同时仍能把 WebGL 特有的语义留在 GL2GPU 层。Tint/Dawn 不应该知道 _hyd_uniforms_、samplerS/samplerT 或 WebGL texture origin。",
    "src/vendor/glslang 和 src/vendor/tint-wasm 提供浏览器可加载的 artifacts；tools/tint-wasm 提供基于本地 Tint checkout 的重建脚本；webgl-static.ts 在 hydGetContext 初始化 translator。",
  ],
  [
    "WGSL ABI normalization",
    "Tint 输出的是通用 WGSL，不会天然符合 GL2GPU main 里手写 shader 的 ABI：uniform struct 名称、sampler/texture 命名、duplicate resource declarations、entry wrappers 和 sampler origin helper 都需要归一化。",
    "如果不归一化，main 的 uniform upload、bind group layout、sampler texture unit、pipeline cache 会全部错位。这个分支的目标是让 runtime shader 看起来像原来的手写 shader 一样被 HydGlobalState 消费。",
    "normalizeTintWgsl 处理 _hyd_uniforms_、samplerS/samplerT、legacy builtin 和 resource 声明；shaderWgslOptimizer 在归一化之后做保守 source-to-source cleanup；HydProgram 最后用 ShaderInfo2String 拼接统一 ABI header。",
  ],
  [
    "诊断和可回放性",
    "main 的手写 DB debug 信息可以直接看到 GLSL/WGSL 对应关系；runtime translation 增加了更多中间态，失败时必须能定位是 GLSL normalize、glslang、Tint、WGSL normalize 还是 WebGPU module 编译出了问题。",
    "没有这些 capture，修新样例会变成浏览器 console 里找一段被截断的 shader，无法复现。这个分支把 shader capture 作为 harness 和诊断路径，而不是生产 fallback。",
    "shaderCapture 记录 original GLSL、normalized GLSL、SPIR-V hash、Tint raw WGSL、post-process WGSL 和 final createShaderModule WGSL；benchmark/quality harness 会把 hard failure、shader DB request、validation error 计入失败。",
  ],
];

const q1ModuleRows = [
  ["HydShader", "compileShader 保留 native WebGL compile validation 和 GLSL/cache metadata，不再要求 compile 阶段就能查到手写 WGSL。", "main 作者可以把它看成“shader object 仍然只负责单 shader 编译状态”，pair 级别工作移到 HydProgram。"],
  ["HydProgram", "linkProgram 变成 runtime translation、ShaderInfo merge、layout assignment、WGSL module creation 和 sampler origin variant 初始化的位置。", "这保持 WebGL linkProgram 语义，也让 bindAttribLocation、varying pair 和 samplers 在同一个地方决策。"],
  ["ShaderTranslator", "封装 glslang+Tint WASM、GLSL ES 100 normalize、SPIR-V/WGSL 转换、WGSL ABI normalize、optimizer 和 diagnostics。", "它是新增的 compiler facade；GL2GPU runtime 其它层不直接依赖 Tint API。"],
  ["shaderDB.ts", "不再作为生产 shader lookup DB，而是保留 ShaderInfo 类型、ABI header 生成和 HydProgram/HydGlobalState 需要的数据转换函数。", "这减少重写 main 运行时的范围：runtime translator 输出仍复用原来的 ShaderInfo 通道。"],
  ["webgl-static.ts / hydGetContext", "保持 hydGetContext(element, shader_info_url, arg0, arg1) 兼容，同时加载 WASM translator；可通过 __HYD_TRANSLATOR_OPTIONS 做 harness-only override。", "外部调用方不用改；shader_info_url 位置仍在，但生产路径不再请求 JSON。"],
];

const q2Rows = [
  ["和 main 的区别", "main 已经显式追踪 WebGL 对象、binding、program、buffer、texture、uniform、vertex attrib 和部分 pipeline state。本分支保留这套设计，但把状态粒度从“手写 shader/metadata 能提前知道大部分 ABI”的模式，扩展成 runtime Tint shader 能在 link/draw 时从 WebGL API 语义推导出 shader layout、sampler origin、render target、readback、clear 和 pass lifetime。"],
  ["Texture origin 状态", "HydTexture 记录 sourceOrigin：typed-upload、external-upload、render-target 或 copy。采样时根据这个 metadata 判断是否需要 Y 转换，而不是根据 demo 名称或注释。"],
  ["Y 轴边界", "viewport 和 scissor 在 WebGL 到 WebGPU 边界按 framebuffer height 转换。render-target/copy 纹理会被标记为 GPU-origin data，采样时使用 static 或 dynamic origin correction。"],
  ["Framebuffer 模型", "draw/read framebuffer binding 被拆开。framebufferTexture2D、framebufferTextureLayer、framebufferRenderbuffer、drawBuffers、copyTexImage2D、copyTexSubImage2D、blitFramebuffer 和 readPixels 现在会更新 GL2GPU 状态，而不是在观测到的 WebGL samples 中 hard fail。"],
  ["Texture upload", "texImage2D 和 texSubImage2D 支持 typed arrays、image/canvas/video sources、UNPACK_FLIP_Y_WEBGL、UNPACK_ALIGNMENT、RGB、RGBA、LUMINANCE、ALPHA、LUMINANCE_ALPHA、depth formats、3D textures 和 renderbuffer storage mappings。"],
  ["默认状态和查询", "补齐/收紧 WebGL 默认 clear color/depth/stencil、blend、cull/front-face、depth/stencil、viewport/scissor、pixel store、current bindings，以及 getParameter/get*Parameter 路径。"],
  ["Draw state", "disabled vertex attributes 通过生成 constant vertex buffers 使用当前 vertexAttrib* 值。WebGL2 和 ANGLE_instanced_arrays 暴露 instancing；shader layout assignment 会尊重 bindAttribLocation。"],
  ["Clear/pass 语义", "clear() 在安全的 full clear 情况下使用 WebGPU loadOp；遇到 color mask/scissor 时 fallback 到 masked-clear pipeline；framebuffer、viewport、scissor 或 attachment 改变时强制 render-pass invalidation。"],
];

const q2ConceptRows = [
  [
    "texture provenance",
    "不是“texture 对象是否存在”，而是每个 HydTexture 当前像素数据从哪里来、采用哪套坐标来源。现在的 sourceOrigin 包括 uninitialized、typed-upload、external-upload、render-target 和 copy。",
    "手写 WGSL 可以把 Aquarium/Sprite 这类 case 的 Y flip 写死；Tint 运行时翻译只看到 GLSL 的 sampler2D 和 texture()，不知道实际绑定的 texture 是 DOM image 上传、typed array 上传、FBO 渲染结果还是 copyTexImage 结果。这个信息只能来自 WebGL API 调用历史。",
    "HydTexture.texImage2D/texSubImage2D/texImage3D 设置 typed-upload 或 external-upload；framebufferTexture2D/framebufferTextureLayer/framebufferRenderbuffer 调 markFramebufferRenderTarget；copyTexImage2D/copyTexSubImage2D 调 markCopyDestination；HydWebGLStatic.samplerNeedsOriginFlip 把 provenance 变成 sampler flip 决策。",
  ],
  [
    "framebuffer write/read/sample 边界",
    "这是三种不同 crossing：draw 写入 drawFramebuffer，copy/readPixels 从 readFramebuffer 或当前 framebuffer 读出，fragment shader 通过 sampler 读取 texture。每个边界都可能改变坐标解释或要求结束当前 WebGPU render pass。",
    "main 的手写 shader DB 已经隐含了不少边界假设；runtime Tint path 不能靠 shader 名猜。尤其 FBO render-to-texture 再 sample、copyTexImage2D 后再 sample、default framebuffer 与 texture attachment 切换时，必须由 API 状态决定何时翻 Y、何时重建 pass、何时更新 viewport/scissor。",
    "HydWebGLStatic 拆出 drawFramebufferBinding/readFramebufferBinding，getDrawFramebufferHeight 用当前 draw target 高度转换 viewport/scissor；attachment change、bindFramebuffer、drawBuffers 会 mark viewport/scissor dirty 并 recordTransition；setPBV 在 draw 前根据当前 sampler 绑定应用 origin variant 或 origin uniform。",
  ],
  [
    "upload/copy/readback 派生状态",
    "派生状态指 texture 或 pack/unpack 行为不是单个 WebGL 对象字段能表达，而是由 pixelStorei、texImage/texSubImage 参数、source 类型、copy/readback API 和格式共同推出。",
    "Tint 生成的 shader ABI 不知道 WebGL upload path。比如 Image/Canvas/Video 与 TypedArray 的来源不同，UNPACK_FLIP_Y_WEBGL 和 UNPACK_ALIGNMENT 影响写入内容；copyTexImage2D 产生的是 framebuffer 坐标系数据。后续 sampling 是否翻转必须依赖这些派生状态。",
    "HydGlobalState.MiscState 保存 unpackFlipYWebGL、unpackAlignment、packAlignment；HydTexture 处理 RGB/RGBA/LUMINANCE/ALPHA/LUMINANCE_ALPHA、depth 和 3D/cube upload；copyTexImage2D/copyTexSubImage2D 标记 copy provenance。readPixels 目前是 state-safe 的 first pass：会 flush 并填充目标 buffer，避免 hard fail 和状态错乱，但还不是完整像素精确 readback。",
  ],
  [
    "shader layout 约束",
    "runtime Tint path 需要在 linkProgram 时从 GLSL 扫描结果和 WebGL API 状态推导 attribute location、uniform buffer layout、sampler binding、sampler2D viewDimension、internal origin uniform 或静态 variant，而不再读取手写 shaders_info.json。",
    "main 的 metadata 里已经给了很多手写 layout。改成 Tint 后，如果 bindAttribLocation、disabled vertex attrib 常量、sampler texture unit、uniform alignment 或资源命名不一致，WebGPU pipeline 会创建失败，或者画面会 silently 错。",
    "HydProgram.linkProgram 调 ShaderTranslator.translateProgram(vertex, fragment, boundAttributeLocations)，合并 ShaderInfo，尊重 bindAttribLocation，生成 _hyd_uniforms_、samplerS/samplerT 和 hydAttributes/hydSamplers；HydGlobalState.getVertexBuffer 只为 activeAttributeLocations 建 layout，并为 disabled attrib 生成 current-value vertex buffer；getBindGroup 按 program.hydSamplers 和实际 texture viewDimension 生成 layout。",
  ],
  [
    "query/error/pass invalidation",
    "query/error 是 WebGL app 观察状态机的读接口；pass invalidation 是 GL2GPU 把 WebGL immediate-mode 调用映射到 WebGPU render pass/bundle/cache 时必须维护的生命周期。",
    "WebGL samples 会用 getParameter、getError、extension object、framebuffer status、binding query 等做 feature/path selection。Tint path 扩大了可运行 demo 范围后，这些查询不能随便 throw。另一方面，WebGPU render pass 不能跨越 attachment/clear/readback/copy/resize 等边界复用。",
    "HydWebGLStatic 增补 getParameter/getError/extension paths，错误写入 HydGlobalState.glError；_der_flush 在 delete/copy/readback/texture upload/framebuffer 操作前结束当前 pass；HydRenderPassCache 以 renderPassDescriptorCacheKey、pipeline/bindGroup/vertexBuffer cache key 复用状态，但在 framebuffer、viewport、scissor、clear target、attachment 和 canvas resize 改变时结束或重设 pass。",
  ],
];

const q2ModuleRows = [
  ["HydTexture", "新增 sourceOrigin 和 attachment view cache；上传路径会区分 typed/external，renderbuffer/attachment/copy 会写 provenance；format 支持扩展到 WebGL samples 用到的 RGB/RGBA/LUMINANCE/ALPHA/LUMINANCE_ALPHA、depth/stencil 和部分 float/depth path。", "它把“这张 texture 应该怎么被 sampler 解释”从 shader 名称问题变成 texture object 的状态问题。"],
  ["HydWebGLStatic", "补齐 WebGL API surface：draw/read framebuffer 目标、framebufferTextureLayer、drawBuffers、copyTexImage2D/copyTexSubImage2D、blitFramebuffer/readPixels first pass、pixelStorei、clear mask/scissor、instancing、current vertexAttrib、extension objects 和更多 getParameter。", "它是 API invocation 到 GL2GPU state transition 的入口；所有会改变 provenance、render target、pass lifetime 或 shader ABI 的调用都在这里记录 transition。"],
  ["HydGlobalState", "CommonState 增加 readFramebufferBinding；MiscState 增加 pixel pack/unpack；currentVertexAttribValues 保存 disabled attrib 常量；getBindGroup/getVertexBuffer/getPipelineDescriptor 从当前 program、texture units、FBO、blend/depth/stencil/mask state 生成 WebGPU layout。", "main 的 PBV/hash 机制仍是核心；新增的是让 hash/PBV 输入覆盖 Tint shader 真正依赖的运行时 state。"],
  ["HydProgram", "linkProgram 变成 runtime pair translation 和 layout assignment 点；bindAttribLocation 在翻译前进入 translator；sampler2D origin correction 支持动态 uniform 和静态 fragment shader variant。", "它把 WebGL link-time ABI 从手写 metadata 转成由 GLSL + WebGL API 状态共同决定。"],
  ["HydRenderPassCache", "render pass、pipeline、bind group、vertex buffer、viewport、scissor、stencil/blend constant 都有 cache key；clear/read/copy/attachment/resize 等边界会结束或重设 pass。", "它保证 WebGPU pass/bundle 复用不会跨越 WebGL 语义边界，同时减少 Tint path 的额外 draw overhead。"],
  ["shaderTexCoord.ts", "仍保留少量 WGSL-level texcoord normalization，主要用于兼容旧手写/fixture 中已经观察到的形态。", "这不是 API 状态机收敛的核心方向；真正可 generalize 的 Y 决策在 texture provenance 和 sampler origin variant。报告把这两者分开，避免把旧 heuristic 误解成最终方案。"],
];

const q3Rows = [
  ["和 main/manual baseline 的区别", "main 的手写 WGSL 是人工把 GLSL 语义映射到 GL2GPU ABI 后的结果，天然避开了 Tint/SPIR-V 常见的 private IO、store/load、constructor expansion 和 per-sample dynamic branch。Tint path 的性能工作不是“恢复手写 DB”，而是把这些人工经验变成通用 WGSL/data-flow 形态优化和 runtime state specialization。"],
  ["WGSL post-process", "shaderWgslOptimizer 移除安全的 Tint private IO wrapper 形态，折叠简单 constructors/swizzles，删除 single-use temporaries，折叠 output component-store chains，标量化 vec2 affine output assignments，折叠 single-field output structs，并记录 optimizer stats。不满足安全条件的 case 会带 reason 跳过。"],
  ["Sprites output cleanup", "Tint 翻译出的 Sprites vertex shader 现在更接近 manual shader：multi-field vertex output 保留 local output struct，但 position 和 texcoord 变成完整的 scalarized field assignments，不再经过 x/y/z/w component stores 和 vector-affine temporaries。fragment shader 直接返回 @location(0) vec4f。"],
  ["Sampler-origin variants", "对于 sampler2D origin correction，HydProgram 按 sampler flip bits 构建 static fragment shader variants。当 texture origin 已知时，hot fragment shader 中不再有 uniform-controlled per-sample Y branch。"],
  ["保留 implicit LOD", "runtime path 在语义需要 derivatives 时保留 implicit texture sampling，而不是无条件改成 textureSampleLevel(..., 0.0)。这避免 minified 或 mipmapped case 的画质/性能损失。"],
  ["Runtime cache 压力", "HydGlobalState 在 cache hit 时避免创建 bind group destroy callbacks，更紧地 hash program/sampler state，并在 program 没有 uniforms 时跳过 uniform buffer/bind-group 工作。"],
  ["Draw hot path", "HydRenderPassCache 和 HydWebGLStatic 缓存 PBV、pipeline、bind group、vertex buffer、viewport、scissor state，使重复 draw 避免冗余 WebGPU state calls。"],
  ["证据", "最新 headed gl2gpu-demo N=100000 和 N=300000 重测使用 main checkout 的 dist 作为 manual GL2GPU baseline。结果显示 Tint 在 MotionMark 上明显超过 main manual，在 Aquarium 上基本持平到略快，在 Sprites 100k 超过 main manual、300k 与 main manual 基本持平。Tint shader DB requests 为 0，100k screenshot RMSE 为 0.00000。Ablation 显示关闭 WGSL optimizer 或 sampler-origin variants 会让 Tint FPS 明显下降。"],
];

const q3ConceptRows = [
  [
    "manual shader 被当作 teacher，而不是 fallback",
    "main/manual shader 的价值在于暴露“更便宜的 operation shape”：少一些局部 store/load、少一些 wrapper/private IO、少一些重复 constructor/swizzle、少一些 uniform-controlled per-sample branch。它不再作为生产 runtime shader 来源。",
    "如果继续把 manual shader 当 fallback，就无法证明 Tint runtime translation 能覆盖未知 WebGL app。性能目标是让自动翻译出的 WGSL 收敛到 manual 的形状，而不是在 benchmark 上偷偷回到手写 DB。",
    "benchmark harness 的 manual mode 在性能表中显式指向 main checkout 的 dist，加载 main 的 gl2gpu.js 和 shaders_info.json；Tint mode 禁止 shader DB request。报告中的 FPS/quality 表同时记录 shaderDbRequests、hardFailures、RMSE/PSNR/SSIM，避免性能提升来自错误渲染或 fallback。",
  ],
  [
    "WGSL optimizer 的保守边界",
    "shaderWgslOptimizer 是 WGSL source-to-source pass，但不是散乱 regex。它先做轻量 tokenizer/top-level/function/block 识别，再只在单 writer、无 pointer escape、无多 entrypoint 冲突、无复杂 alias 的情况下改写。",
    "熟悉 main 的人可以把它理解成“把 Tint 生成的 verbose WGSL 拉回接近手写 WGSL 的局部形状”。它不理解 WebGL demo 名，也不应该根据 Aquarium/MotionMark/Sprites 做分支。",
    "覆盖的形态包括 Tint entry wrapper/private IO lowering、single-use pure temp elimination、constructor/swizzle folding、output component-store folding、vec2 affine scalarization、single-field fragment output collapse。unsafe case 保留原 WGSL 并记录 skippedPasses。",
  ],
  [
    "sampler origin specialization",
    "第二章的 texture provenance 最终也影响性能：如果每次 textureSample 都通过 uniform 判断是否翻 Y，fragment hot path 会多一层 per-sample ALU/branch。manual shader 通常能把这个决策写死。",
    "runtime path 不能靠 sampler 名或 demo 名写死，但在 draw 前已经知道当前 sampler 绑定的 texture provenance。因此可以按当前 texture origin bits 生成 fragment shader variant，把动态 uniform flip 变成静态坐标表达式。",
    "HydWebGLStatic.updateSamplerOriginUniforms 收集 sampler flip bits；HydProgram.applySamplerOriginVariant 用 specializeSamplerOriginWgsl 生成/缓存 fragment module。禁用静态 variant 时仍可回退到 internal origin uniform。",
  ],
  [
    "保留 implicit LOD",
    "main 的手写 shader 可以人工判断 texture2D 是否应该保留 derivative-based implicit LOD。Tint/glslang 路径如果无脑把所有 sample 变成 textureSampleLevel(..., 0.0)，可能既慢又错，尤其 mipmapped/minified texture。",
    "这类优化不能 upstream 成简单的 textureSampleLevel(0)->textureSample rewrite，因为显式 LOD 和隐式 derivative LOD 语义不同。GL2GPU runtime 的正确做法是只在 WebGL 语义允许时保留 implicit sampling。",
    "shader translation normalize 阶段保留 WebGL texture() 对应的 implicit sampling 形态；性能报告把画质指标和 FPS 一起看，避免靠错误 LOD 提速。",
  ],
  [
    "runtime hot path 减压",
    "Tint path 比 manual path多了 shader variants、origin uniforms、更多 samplers/resource declarations 和更复杂的 PBV key。如果每 draw 都重新建 bind group/pipeline 或重复写 uniform，会吞掉 shader 侧优化收益。",
    "main 已经有 HydGlobalStateHashed 和 HydRenderPassCache；本分支扩展的是 cache 输入和 fast path，而不是另建一套 renderer。目标是让 Tint 生成的 program 进入同一条 PBV/cache 热路径。",
    "HydGlobalState 跳过无 uniform program 的 uniform buffer/bind-group动态 offset，bind group destroy callback 只在 cache miss 时注册；HydRenderPassCache 缓存 pipeline/bind group/vertex buffers/viewport/scissor；HydWebGLStatic.setPBV 避免未变状态重复下发。",
  ],
];

const q3ModuleRows = [
  ["shaderWgslOptimizer.ts", "新增 conservative WGSL cleanup pass 和 optimizer stats。", "把 manual shader 暴露的形态差距泛化成 source-level data-flow/peephole pass。"],
  ["HydProgram", "缓存 fragmentWgsl 和 sampler origin variants；program.hash 包含 origin variant key；fragment module 可按 sampler provenance 切换。", "把“是否翻 Y”从 uniform hot path 尽量移到 shader variant。"],
  ["HydGlobalState / HydRenderPassCache", "扩展 PBV、bind group、pipeline、vertex buffer、viewport、scissor cache；优化无 uniform program 和 cache hit 路径。", "让 Tint program 走 main 原有高性能缓存机制，而不是因为 runtime translation 增加每 draw 开销。"],
  ["shaderCapture / harnesses", "捕获 raw/post/final WGSL，benchmark 支持 tint/manual/webgl 模式、headed Chrome、RMSE/PSNR/SSIM、shader DB request 计数和 hard failure 检测。", "性能判断可回放、可对照，不再只靠肉眼或 console。"],
  ["tests/shaders", "增加 wrapper lowering、unsafe skip、output-store folding、vec2 affine、single-field output、implicit LOD 和 known fixture 测试。", "优化器必须证明“不该改的 case 不改”，否则不能替代手写 shader。"],
];

const q4Rows = [
  ["当前建议", "不要把 GL2GPU-specific 改动 upstream 到 Dawn/Tint。Texture origin、Y-flip、_hyd_* resource ABI、sampler naming 和 WebGL state-machine behavior 都属于 GL2GPU runtime 语义。"],
  ["可能的 Dawn/Tint CL", "可以原型化一个小型 core IR cleanup/canonicalization CL：conservative DCE、single-use pure temporary elimination、constructor/swizzle folding，以及 non-escaping values 的 local store-load forwarding。"],
  ["证据门槛", "提交 CL 前需要做隔离 A/B：只替换 tint_wasm.wasm，关闭 GL2GPU JS post-process，跑完整 Tint/Dawn tests，并证明没有渲染回归。如果 FPS 中性，只能宣称 IR/WGSL 更干净且无回归。"],
  ["暂不采用的方向", "只优化 ShaderIO wrapper 的 CL 目前不是最强 upstream 目标。浏览器和 GPU backend 很可能已经消掉大量 wrapper overhead；当前性能证据更指向 sampling ALU、local stores 和 runtime state overhead。"],
  ["下游保留策略", "继续保留 shaderWgslOptimizer 作为 downstream fallback，直到 Dawn/Tint IR pass 明确覆盖同类形态，并且 GL2GPU 能基于该版本重建 tint_wasm。"],
];

const q4ConceptRows = [
  [
    "哪些不应该 upstream",
    "WebGL API 到 WebGPU 的状态语义属于 GL2GPU：texture provenance、Y flip、_hyd_uniforms_、samplerS/samplerT、bindAttribLocation 与 HydGlobalState/PBV 的约定都不是 Tint/Dawn 的通用职责。",
    "这些逻辑依赖 GL2GPU 的 runtime ABI 和 WebGL API invocation history。把它们放进 Dawn/Tint 会污染通用 shader compiler，也很难通过 Dawn reviewer 的设计边界。",
    "继续留在 GL2GPU：HydTexture sourceOrigin、HydWebGLStatic samplerNeedsOriginFlip、HydProgram sampler origin variants、ShaderInfo2String 生成的 _hyd_* ABI。",
  ],
  [
    "哪些可能 upstream",
    "manual shader 与 Tint WGSL 的差距里，有一部分是通用 compiler cleanup：纯表达式 single-use temp、constructor/swizzle folding、死代码删除、non-escaping local store-load forwarding、局部 SROA 和有限 exact CSE。",
    "这些优化不依赖 WebGL、GL2GPU、demo 名或 uniform 名，可以在 Dawn/Tint core IR 层表达。它们的目标不是“让 Aquarium 快”，而是减少 SPIR-V reader 产物中常见的冗余 IR/WGSL 形态。",
    "上游候选应拆小：CL1 做 conservative IR cleanup/canonicalization；CL2 再做 local store-load forwarding/SROA；CL3 可选 exact CSE。GL2GPU 的 WGSL post-process 可作为 prototype/evidence，不直接搬文本 pass。",
  ],
  [
    "为什么不是 ShaderIO wrapper-only CL",
    "entry wrapper/private IO 看起来显眼，但浏览器和 GPU backend 很可能已经消掉大部分 wrapper overhead。当前更有价值的性能来源是采样前额外 ALU、显式 LOD 误用、local var/store-load、constructor/swizzle expansion 和 runtime cache pressure。",
    "如果只提交 wrapper fast path，即使 WGSL 变短，也可能没有可测 FPS 提升。Dawn CL 描述必须诚实地区分“IR/WGSL 更干净”和“实际 GL2GPU FPS 提升”。",
    "报告保留结论：暂停 wrapper-only 作为主线，把 upstream 方向收敛到更通用的 core IR cleanup；GL2GPU 本地下游 optimizer 继续覆盖尚未 upstream 的形态。",
  ],
  [
    "证据门槛",
    "给 Dawn/Tint 提 CL 之前，需要两个层面的证据：官方正确性测试通过，以及隔离 A/B 证明 patch 本身带来形态改善、无画质回归，最好有实际 FPS 改善。",
    "GL2GPU 当前的 production path 叠加了 JS/WGSL post-process、runtime sampler variant 和 API state 修复。要证明 Dawn patch 有贡献，必须只替换 tint_wasm.wasm，关闭下游 optimizer，保持 glslang、demo assets、Chrome、workload 和 harness 不变。",
    "最低 gate：Dawn tint_unittests/SpirvReader tests/git cl presubmit；GL2GPU isolation A/B 中 shaderDbRequests=0、hardFailures=0、validation errors=0、patched vs baseline RMSE <= 0.02；若 FPS 中性，只声明 no-regression/cleaner IR。",
  ],
];

const q4ActionRows = [
  ["GL2GPU 下游继续保留", "texture origin/Y flip、_hyd_* ABI、sampler origin variants、WebGL API/query/error/pass invalidation、shader capture 和 benchmark harness。", "这些依赖 WebGL runtime state，不适合进 Dawn。"],
  ["Dawn/Tint CL1 候选", "core IR cleanup/canonicalization：DCE、single-use pure temp elimination、constructor/swizzle folding。", "小而可 review，最接近当前 WGSL optimizer 中安全性最高的子集。"],
  ["Dawn/Tint CL2 候选", "function-local store-load forwarding/SROA，只处理 non-escaping local、明确 access path、简单 dominance 的 case。", "对应 manual shader 中少 store/load、少临时变量的优势，但需要更强正确性测试。"],
  ["Dawn/Tint CL3 候选", "有限 exact CSE，覆盖重复纯表达式，例如重复 sin/cos、重复矩阵/坐标计算。", "潜在收益大，但 alias/side-effect/precision 风险也更高，应排在后面。"],
  ["CL 描述原则", "不要引用 GL2GPU-specific 名称作为优化条件；可以用 GL2GPU/manual shader 作为 motivating evidence 和外部 A/B，不作为 Dawn 单测依赖。", "保证 reviewer 看到的是通用 compiler 改进，而不是 benchmark 特判。"],
];

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>GL2GPU Tint main-to-HEAD 中文报告</title>
  <style>
    @page { size: A4; margin: 15mm 13mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #17202a; line-height: 1.42; margin: 0; }
    h1 { font-size: 29.1px; line-height: 1.14; margin: 0 0 10px; color: #0b1f33; }
    h2 { font-size: 17.9px; margin: 19px 0 8px; color: #0b1f33; border-bottom: 1px solid #d7dde5; padding-bottom: 4px; }
    h3 { font-size: 13.7px; margin: 12px 0 6px; color: #23364d; }
    p, li { font-size: 11.2px; }
    .subtitle { font-size: 12.9px; color: #5d6d7e; margin-bottom: 15px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 11px 0 15px; }
    .card { border: 1px solid #d9e2ec; border-radius: 7px; padding: 9px 11px; background: #fbfcfe; font-size: 10.8px; }
    .card b { color: #0b1f33; }
    .key-points { columns: 2; column-gap: 18px; padding-left: 16px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0 13px; font-size: 9.2px; page-break-inside: avoid; }
    th, td { border: 1px solid #dbe3ec; padding: 4px 5px; vertical-align: top; white-space: pre-wrap; }
    th { background: #eef3f8; color: #0b1f33; font-weight: 650; }
    tr:nth-child(even) td { background: #fafcff; }
    code, pre { font-family: "SFMono-Regular", Consolas, monospace; }
    pre { white-space: pre-wrap; background: #0e1726; color: #e6edf5; border-radius: 7px; padding: 9px; font-size: 8.7px; line-height: 1.32; overflow: hidden; }
    .note { border-left: 4px solid #4679bd; padding: 7px 10px; background: #f3f7fc; font-size: 11px; margin: 10px 0; }
    .warn { border-left-color: #b7791f; background: #fff8ec; }
    .detail-block { border: 1px solid #dbe3ec; border-left: 4px solid #4679bd; border-radius: 6px; padding: 7px 9px; margin: 7px 0; page-break-inside: avoid; background: #fbfdff; }
    .detail-block h3 { margin-top: 0; }
    .detail-block p { margin: 4px 0; }
    .triptych { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin: 8px 0 13px; page-break-inside: avoid; }
    figure { margin: 0; border: 1px solid #dbe3ec; border-radius: 6px; overflow: hidden; background: white; }
    figure img { display: block; width: 100%; height: 112px; object-fit: cover; }
    figcaption { font-size: 9px; text-align: center; padding: 4px; background: #f7fafc; color: #475569; }
    .footer { margin-top: 16px; font-size: 9.3px; color: #64748b; }
    .page-break { break-before: page; }
  </style>
</head>
<body>
  <h1>GL2GPU Tint 集成报告：main vs 当前 HEAD</h1>
  <div class="subtitle">本报告只比较两个时间点：${esc(baseRef)} 和 ${esc(headRef)}；主要实现历史已经被整理为 6 个功能 squash commit，后续报告维护 commit 也列在表中。</div>
  <div class="meta">
    <div class="card"><b>基线</b><br>${esc(baseCommit[0])} - ${esc(baseCommit[2])}<br>${esc(baseCommit[3])}<br><b>完整 SHA</b><br>${esc(baseCommit[1])}</div>
    <div class="card"><b>当前 HEAD</b><br>${esc(headCommit[0])} - ${esc(headCommit[2])}<br>${esc(headCommit[3])}<br><b>HEAD 标签</b><br>${esc(headTags)}</div>
  </div>

  ${section("快照范围", `
    <p>本报告以 ${esc(baseRef)} 和当前 HEAD 为两个固定时间点，说明从 main 到当前分支的完整代码变化。报告保留原有四个问题，并新增 commit-by-commit 逐项说明。</p>
    <div class="note"><b>Diff shortstat:</b> ${esc(diffShortstat)}</div>
    ${table(["领域", "文件数", "代表文件"], categoryRows(changedFiles))}
    <h3>完整 diff stat</h3>
    <pre>${esc(diffStat)}</pre>
  `)}

  ${section("Squash commit 说明", `
    <p>当前 squashed 分支把原来的 17 个实现 commit 整理为 6 个 reviewable 功能 commit；后续报告维护 commit 按时间顺序列在表末。下表说明每个 commit 的职责。</p>
    ${table(["序号", "commit", "标题", "做了什么"], commitRows())}
  `)}

  ${section("1. Tint shader compiler 是怎么合并进 GL2GPU 的？", `
    <p>给熟悉 main 分支的人看的核心变化：HydShader/HydProgram/ShaderInfo 管线结构没有被推翻。在 main 中，linkProgram 完成 WebGL link 后按 program hash 从 shaders_info.json 取出已有 WGSL 和 binding metadata，直接创建 WebGPU pipeline。在当前分支，linkProgram 拿到 HydShader 保存的原始 GLSL，走以下翻译流水线：GLSL ES100 规范化（legacy builtin/texture call 重写、varying 归一化）→ glslang：GLSL → SPIR-V → Tint：SPIR-V → WGSL → ABI 归一化（_hyd_uniforms_ struct、samplerS/T 命名、resource declaration dedup）→ shaderWgslOptimizer → createShaderModule。翻译必须在 vertex/fragment pair 级别进行：varying 连接、attribute location 分配和 sampler binding 只有同时看两个 shader 才能决定，这和 WebGL linkProgram 的语义一致，也能自然接住 bindAttribLocation。HydGlobalState 消费到的 ShaderInfo 和 PBV key 与 main 接口兼容，public hydGetContext 签名保持不变。</p>
    ${table(["改动", "main-to-HEAD 结果"], q1Rows)}
    <h3>从 main 的 shader flow 看变化</h3>
    ${detailBlocks(q1ConceptRows, ["main 中原来是什么", "为什么这次要变", "这次怎么落地"])}
    <h3>按模块看修改</h3>
    ${table(["模块", "具体修改", "给 main 作者看的重点"], q1ModuleRows)}
    ${bulletList([
      "这个分支之前，GL2GPU 依赖已知 shader 的手写 WGSL metadata/lookup；当前 HEAD 中，runtime translation 是 cache miss 的默认路径。",
      "集成不只是放进 WASM：shader 生命周期也被重新划分。GL2GPU 负责 GLSL declaration scanning、deterministic layout assignment、resource declaration normalization 和 WebGPU module creation。",
      "public hydGetContext(...) 调用保持源码兼容。shader_info_url 参数位置保留，但生产路径不会请求手写 shader JSON。",
    ])}
  `)}

  ${section("2. GL2GPU 的 API 部分做了哪些改变以适应 Tint？", `
    <p>这里的差异不是 main 没有 WebGL 状态机。main 已经显式维护了 texture 对象绑定与格式、framebuffer 绑定、program/shader 生命周期、buffer 绑定与 uniform 上传、vertex attrib location 分配，以及 blend/depth/stencil/cull 等 pipeline state。本分支没有另立一套状态机，而是在这个骨架上把粒度从“手写 shader metadata 已经预知大部分 ABI”扩展到 runtime Tint path 在 draw 前无法绕过的信息：每张 texture 的 sourceOrigin（typed-upload / external-upload / render-target / copy，用于决定采样时是否需要 Y flip）、draw 与 read framebuffer 目标分离（viewport/scissor 按当前 draw target 高度做 Y offset）、copy/readback provenance 标记、disabled vertex attrib 的常量 buffer 填充、instancing draw 语义、完整 pixelStorei/unpack alignment 状态，以及 render pass 在 attachment change/clear/readback/copy/canvas resize 边界的 invalidation 规则。手写 shader DB 时代这些信息可以烧进 WGSL；runtime translation 拿到的只是原始 GLSL，这些信息只能从 WebGL API 调用历史派生。</p>
    ${table(["领域", "main-to-HEAD 结果"], q2Rows)}
    <h3>这些术语具体指什么</h3>
    ${detailBlocks(q2ConceptRows)}
    <h3>按模块看修改</h3>
    ${table(["模块", "具体修改", "给 main 作者看的重点"], q2ModuleRows)}
    <div class="note">关键设计点：Y conversion 不是 shader-name heuristic，也不是手写 WGSL 里的硬编码翻转，而是由 HydTexture.sourceOrigin（texture 如何产生）和当前 framebuffer/sampler 边界（它被如何使用）共同决定。GLSL 里没有这个信息；runtime Tint path 只能依赖 WebGL API 调用历史派生它。</div>
  `)}

  <div class="page-break"></div>
  ${section("3. Tint GL2GPU 性能是如何提升的？", `
    <p>给熟悉 main 分支的人看的核心变化：main 的手写 WGSL 暴露出 Tint/SPIR-V reader 产物与人工写法之间四类具体差距：① private IO entry wrapper——vertex/fragment input/output 经由私有中间变量中转，产生额外 store/load chain；② single-use pure temp——ptr 未逃逸的局部变量展开后仅使用一次；③ constructor/swizzle chain——vec4(v.r, v.g, v.b, v.a) 等可直接折叠的形式；④ output component-store chain——对同一 output struct 字段的多次单分量写入。此外 sampler Y flip 如果走 per-frame uniform branch，会给 fragment hot path 增加额外 ALU。shaderWgslOptimizer 针对以上形态做 WGSL source-to-source pass，只在单 writer、ptr 无逃逸、无多 entry 冲突等安全条件下改写，不满足则带 reason 跳过；sampler origin specialization 把 Y flip 决策从 uniform branch 移到 fragment shader variant；runtime program 走进 main 已有的 PBV/hash/cache 热路径，让 variant 切换和 bind group 复用不引入额外每 draw 开销。</p>
    ${table(["优化", "为什么有效"], q3Rows)}
    <h3>manual baseline 暴露出的性能形态</h3>
    ${detailBlocks(q3ConceptRows, ["main/manual baseline 暴露了什么", "优化为什么有效", "这次怎么落地"])}
    <h3>按模块看修改</h3>
    ${table(["模块", "具体修改", "给 main 作者看的重点"], q3ModuleRows)}
    <h3>headed gl2gpu-demo benchmark 证据</h3>
    <p>性能实验使用 headed Chrome。manual baseline 不是当前分支里的 fallback，而是从 main checkout 的 <code>${esc(manualDemoRoot)}</code> 提供 <code>/js/gl2gpu.js</code> 和 <code>/js/shaders_info.json</code>；Tint mode 只覆盖为当前分支的 release bundle 和 WASM。命令形态：<code>GL2GPU_DEMO_ROOT=${esc(manualDemoRoot)} npm run benchmark:gl2gpu-demo -- --samples aquarium,motionmark,sprites --modes tint,manual --trials 3 --frames 60 --warmup-frames 60 --objects N --order abba --headed true</code>。</p>
    <p><b>浏览器：</b> ${esc(browser)}</p>
    <h3>N = 100000</h3>
    ${table(["Demo", "Objects", "Tint FPS", "Manual FPS", "Tint/Manual", "差异", "Tint frame ms", "Manual frame ms", "RMSE", "Tint shader DB requests", "Tint hard failures"], benchmarkRows(benchmark100k))}
    <h3>N = 300000</h3>
    ${table(["Demo", "Objects", "Tint FPS", "Manual FPS", "Tint/Manual", "差异", "Tint frame ms", "Manual frame ms", "RMSE", "Tint shader DB requests", "Tint hard failures"], benchmarkRows(benchmark300k))}
    <h3>Ablation study：第三章优化开关</h3>
    <p>Ablation 只测 Tint mode，使用 headed Chrome、N=100000、3 trials、60 frames + 60 warmup、关闭截图。括号里的百分比是相对 full Tint path 的 FPS；数值越低表示关闭该优化后的退化越大。</p>
    ${table(["Demo", "Objects", "Full Tint FPS", "No WGSL optimizer", "No sampler-origin variants", "Both off", "DB requests + hard failures"], ablationRows(ablationReports))}
    <div class="note">解释：正式 paired benchmark 说明 Tint 相对 main 分支 manual GL2GPU 已经快或接近；ablation 说明第三章里的两类代码优化不是装饰性改写。关闭 WGSL optimizer 会损失 Aquarium/Sprites 约 10% 左右；关闭 sampler-origin variants 对 Sprites 影响更明显，说明 per-sample uniform-controlled Y flip branch 应该留在 GL2GPU runtime specialization，而不是热 fragment shader。</div>
  `)}

  ${section("渲染质量证据", `
    <p>质量测量把 canvas screenshot 与 native WebGL 对比。PSNR 单位为 dB；SSIM 中 1.0 表示完全一致。这些质量 run 与 heavy headed FPS run 分离，因为高 object count 的 screenshot readback 会主导 wall time。</p>
    <h3>Runtime quality harness</h3>
    ${table(["Demo", "Objects", "Tint vs WebGL PSNR", "Tint vs WebGL SSIM", "Manual vs WebGL PSNR", "Manual vs WebGL SSIM", "Tint shader DB requests"], qualityRows(renderQuality))}
    <h3>gl2gpu-demo deterministic quality pass</h3>
    ${table(["Demo", "Objects", "Tint vs WebGL PSNR", "Tint vs WebGL SSIM", "Manual vs WebGL PSNR", "Manual vs WebGL SSIM", "Tint shader DB requests"], qualityRows(demoQuality5k))}
  `)}

  ${section("4. 是否需要给 Dawn/Tint 提 PR/CL？", `
    <p>给熟悉 main 分支的人看的核心判断：GL2GPU runtime 语义必须留在 GL2GPU——HydTexture sourceOrigin、samplerNeedsOriginFlip 逻辑、_hyd_uniforms_/samplerS/samplerT ABI 命名、sampler origin variant、bindAttribLocation 与 PBV key 的绑定关系，以及 render pass invalidation 的触发条件，全部依赖 WebGL API invocation history，既不是 Tint 的职责，也无法在通用 shader compiler 语境下表达。可以考虑 upstream 到 Dawn/Tint 的，是不依赖上述 ABI 的通用 IR cleanup：conservative DCE、纯表达式 single-use temp 消除、constructor/swizzle 折叠、non-escaping local store-load forwarding。这类 CL 的卖点是"让 SPIR-V reader 产出更干净的 IR/WGSL"，不应以"GL2GPU Aquarium/Sprites 快了 X%"为主论据，因为 GPU driver 和浏览器很可能已在后端消掉大量 wrapper overhead；在没有 isolated tint_wasm A/B 证据（关闭 GL2GPU JS post-process，只替换 wasm）之前，无法将性能收益归因于 Tint IR patch 本身。</p>
    ${table(["判断", "理由"], q4Rows)}
    <h3>upstream 边界怎么划</h3>
    ${detailBlocks(q4ConceptRows, ["边界判断", "为什么这样分", "后续处理"])}
    <h3>建议的后续动作</h3>
    ${table(["方向", "内容", "理由"], q4ActionRows)}
    <div class="note warn">当前结论：可以继续研究 upstreamable optimization，但不能作为 GL2GPU-specific patch，也暂时不能作为性能提升 claim。干净的 upstream 目标应是小型 Dawn/Tint core IR cleanup pass，并带官方测试和隔离 tint_wasm A/B 证据。</div>
  `)}

  ${section("视觉 sanity samples", `
    <h3>Runtime harness captures</h3>
    ${triptych(renderQualityTriptychBase, "aquarium")}
    ${triptych(renderQualityTriptychBase, "motionmark")}
    ${triptych(renderQualityTriptychBase, "sprites")}
    <h3>gl2gpu-demo captures</h3>
    ${triptych(demoQualityTriptychBase, "aquarium")}
    ${triptych(demoQualityTriptychBase, "motionmark")}
    ${triptych(demoQualityTriptychBase, "sprites")}
  `)}

  <div class="page-break"></div>
  ${section("可复现命令", `
    <h3>报告生成命令</h3>
    <pre>npm run report:tint</pre>
    <h3>Headed benchmark 命令</h3>
    <pre>git worktree add /Volumes/Code/gl2gpu-tint-main-bench main
GL2GPU_DEMO_ROOT=/Volumes/Code/gl2gpu-tint-main-bench/dist npm run benchmark:gl2gpu-demo -- --samples aquarium,motionmark,sprites --modes tint,manual --trials 3 --frames 60 --warmup-frames 60 --objects 100000 --order abba --headed true
GL2GPU_DEMO_ROOT=/Volumes/Code/gl2gpu-tint-main-bench/dist npm run benchmark:gl2gpu-demo -- --samples aquarium,motionmark,sprites --modes tint,manual --trials 3 --frames 60 --warmup-frames 60 --objects 300000 --order abba --headed true --screenshots false</pre>
    <h3>Ablation study 命令</h3>
    <pre>for flags in \
  "--optimize-tint-wgsl true --static-sampler-origin-variants true" \
  "--optimize-tint-wgsl false --static-sampler-origin-variants true" \
  "--optimize-tint-wgsl true --static-sampler-origin-variants false" \
  "--optimize-tint-wgsl false --static-sampler-origin-variants false"; do
  npm run benchmark:gl2gpu-demo -- --samples aquarium,motionmark,sprites --modes tint --trials 3 --frames 60 --warmup-frames 60 --objects 100000 --order mode-major --headed true --screenshots false --threshold 0 $flags
done</pre>
    <h3>构建和测试命令</h3>
    <pre>npm run typecheck
npm run test:shader
npm run test:texture
npm run build</pre>
  `)}

  <div class="footer">由本地 workspace ${esc(repo)} 在 ${new Date().toISOString()} 生成。</div>
</body>
</html>`;

fs.writeFileSync(reportHtml, html);

const chrome = fs.existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
  ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  : "/Users/hanyd/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const result = spawnSync(chrome, [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  "--no-pdf-header-footer",
  `--print-to-pdf=${reportPdf}`,
  fileUrl(reportHtml),
], { encoding: "utf8" });

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status || 1);
}

fs.copyFileSync(__filename, path.join(outputDir, "generate_gl2gpu_tint_report.js"));
console.log(reportPdf);
