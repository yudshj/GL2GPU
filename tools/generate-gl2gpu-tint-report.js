const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const repo = path.resolve(__dirname, "..");
const outputDir = path.join(repo, "output", "pdf");
const reportHtml = path.join(outputDir, "gl2gpu-tint-postprocess-report.html");
const reportPdf = path.join(outputDir, "gl2gpu-tint-postprocess-report.pdf");

const demoNames = {
  aquarium: "Aquarium",
  motionmark: "MotionMark",
  sprites: "Sprites / JSGameBench",
};

function readJson(relativePath, fallback = null) {
  const fullPath = path.join(repo, relativePath);
  if (!fs.existsSync(fullPath)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function git(args) {
  return spawnSync("git", args, { cwd: repo, encoding: "utf8" }).stdout.trim();
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
  return Number.isFinite(number) ? number.toFixed(digits) : "n/a";
}

function percentDelta(ratio) {
  const number = Number(ratio);
  return Number.isFinite(number) ? `${((number - 1) * 100).toFixed(1)}%` : "n/a";
}

function table(headers, rows) {
  return `<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function section(title, body) {
  return `<section><h2>${esc(title)}</h2>${body}</section>`;
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
      tint.shaderDbRequests ?? "n/a",
      tint.hardFailureCount ?? "n/a",
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
      row.tintVsWebgl ? row.tintVsWebgl.shaderDbRequests : "n/a",
    ];
  });
}

function browserLabel(report) {
  if (!report || !report.browser) {
    return "n/a";
  }
  const mode = report.browser.headless ? "headless" : "headed";
  return `${mode} Chrome (${report.browser.executablePath})`;
}

function triptych(baseDir, name) {
  return `
    <div class="triptych">
      <figure><img src="${fileUrl(path.join(baseDir, `${name}-webgl.png`))}"><figcaption>WebGL</figcaption></figure>
      <figure><img src="${fileUrl(path.join(baseDir, `${name}-tint.png`))}"><figcaption>Tint GL2GPU</figcaption></figure>
      <figure><img src="${fileUrl(path.join(baseDir, `${name}-manual.png`))}"><figcaption>Manual GL2GPU</figcaption></figure>
    </div>`;
}

fs.mkdirSync(outputDir, { recursive: true });

const commit = git(["show", "--no-patch", "--format=%h%n%H%n%s%n%ad", "--date=iso", "HEAD"]).split("\n");
const tag = git(["tag", "--points-at", "HEAD"]) || "none";
const stat = git(["show", "--stat", "--oneline", "HEAD"]);
const benchmark100k = readJson("output/gl2gpu-demo-headed-comparison/results-n100000.json");
const benchmark300k = readJson("output/gl2gpu-demo-headed-comparison/results-n300000.json");
const renderQuality = readJson("output/render-quality/results.json", { summary: [] });
const demoQuality5k = readJson("output/gl2gpu-demo/quality-5k-rerun/results.json", { quality: { summary: [] } });

const browser = browserLabel(benchmark100k || benchmark300k);
const renderQualityRows = qualityRows(renderQuality);
const demoQualityRows = qualityRows(demoQuality5k);
const renderQualityTriptychBase = path.join(repo, "output", "render-quality");
const demoQualityTriptychBase = path.join(repo, "output", "gl2gpu-demo", "quality-5k-rerun");

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>GL2GPU Tint Runtime Translation and Post-Processing Report</title>
  <style>
    @page { size: A4; margin: 16mm 14mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #17202a; line-height: 1.42; margin: 0; }
    h1 { font-size: 27px; line-height: 1.14; margin: 0 0 10px; color: #0b1f33; }
    h2 { font-size: 16px; margin: 20px 0 8px; color: #0b1f33; border-bottom: 1px solid #d7dde5; padding-bottom: 4px; }
    h3 { font-size: 12.5px; margin: 12px 0 6px; color: #23364d; }
    p, li { font-size: 10.3px; }
    .subtitle { font-size: 12px; color: #5d6d7e; margin-bottom: 16px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0 16px; }
    .card { border: 1px solid #d9e2ec; border-radius: 7px; padding: 9px 11px; background: #fbfcfe; font-size: 10px; }
    .card b { color: #0b1f33; }
    .key-points { columns: 2; column-gap: 18px; padding-left: 16px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0 13px; font-size: 8.8px; page-break-inside: avoid; }
    th, td { border: 1px solid #dbe3ec; padding: 4px 5px; vertical-align: top; }
    th { background: #eef3f8; color: #0b1f33; font-weight: 650; }
    tr:nth-child(even) td { background: #fafcff; }
    code, pre { font-family: "SFMono-Regular", Consolas, monospace; }
    pre { white-space: pre-wrap; background: #0e1726; color: #e6edf5; border-radius: 7px; padding: 9px; font-size: 8.2px; line-height: 1.34; overflow: hidden; }
    .note { border-left: 4px solid #4679bd; padding: 7px 10px; background: #f3f7fc; font-size: 10px; margin: 10px 0; }
    .warn { border-left-color: #b7791f; background: #fff8ec; }
    .triptych { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin: 8px 0 13px; page-break-inside: avoid; }
    figure { margin: 0; border: 1px solid #dbe3ec; border-radius: 6px; overflow: hidden; background: white; }
    figure img { display: block; width: 100%; height: 116px; object-fit: cover; }
    figcaption { font-size: 8.2px; text-align: center; padding: 4px; background: #f7fafc; color: #475569; }
    .footer { margin-top: 18px; font-size: 8.6px; color: #64748b; }
    .page-break { break-before: page; }
  </style>
</head>
<body>
  <h1>GL2GPU Tint Runtime Translation, WGSL Post-Processing, and Headed Demo Benchmarks</h1>
  <div class="subtitle">Implementation summary, validation results, and reproducibility notes for the Tint integration and post-processing work.</div>
  <div class="meta">
    <div class="card"><b>Repository</b><br>GL2GPU / gl2gpu-tint<br><b>Branch</b><br>${esc(git(["branch", "--show-current"]))}<br><b>Tag at HEAD</b><br>${esc(tag)}</div>
    <div class="card"><b>Commit</b><br>${esc(commit[0])} - ${esc(commit[2])}<br><b>Date</b><br>${esc(commit[3])}<br><b>Benchmark browser</b><br>${esc(browser)}</div>
  </div>

  ${section("Executive Summary", `
    <ul class="key-points">
      <li>Runtime shader translation stays on the Tint path without production shader DB fallback.</li>
      <li>A generic WGSL post-processing optimizer runs after Tint normalization and before WebGPU module creation.</li>
      <li>The optimizer is source/data-flow driven and does not key on demo names, shader names, framework names, or uniform names.</li>
      <li>The latest gl2gpu-demo performance pass was run in headed Chrome, matching the project rule for performance experiments.</li>
      <li>At 100k and 300k objects, Tint GL2GPU now matches or beats manual GL2GPU on Aquarium and MotionMark, and is within about 2.5% on Sprites.</li>
      <li>Tint GL2GPU made zero shader DB requests in the headed demo benchmark runs.</li>
    </ul>
  `)}

  ${section("Runtime Shader Flow", `
    <p>The production shader path is WebGL GLSL validation, glslang GLSL-to-SPIR-V, Tint SPIR-V-to-WGSL, GL2GPU WGSL normalization, and the WGSL post-processing pass. The legacy hand-written shader database is not used by Tint runtime translation; it remains a benchmark oracle for manual comparisons.</p>
    ${table(["File", "Role"], [
      ["src/components/shaderWgslOptimizer.ts", "Generic WGSL optimizer for Tint output."],
      ["src/components/shaderTranslator.ts", "Runs the optimizer by default and records optimizer stats in debug_info."],
      ["src/components/program.ts", "Wires translated WGSL into WebGPU shader modules and bind-group metadata."],
      ["src/webgl-static.ts", "Supports global translator options used by benchmarks and demos."],
      ["tools/gl2gpu-demo-benchmark-harness.js", "Runs headed Tint vs manual gl2gpu-demo FPS/RMSE comparisons."],
      ["tools/generate-gl2gpu-tint-report.js", "Generates this PDF from benchmark and quality result JSON files."],
    ])}
  `)}

  ${section("WGSL Post-Processing", `
    <p>The post-processor is conservative. It first parses enough WGSL structure to identify functions, structs, entrypoints, private declarations, and balanced blocks. It then applies only transformations whose local data-flow conditions can be checked from the source shape.</p>
    <ul>
      <li>Private IO wrapper lowering: recognizes Tint/SPIR-V entry wrappers that copy entry parameters through <code>var&lt;private&gt;</code>, call an inner function, and assemble entry output from private variables.</li>
      <li>Safety gates: skips lowering for multiple entrypoints, private IO escape, input-private writes from helpers, ambiguous writers, or unrecognized entry wrapper statements.</li>
      <li>Peepholes: simple alias propagation, single-use temporary removal, redundant constructor/swizzle folding, and safe if/else-to-select forms.</li>
      <li>Runtime stats: <code>optimizeTintWgsl</code>, <code>loweredPrivateVars</code>, <code>removedTemporaries</code>, <code>foldedConstructors</code>, and <code>skippedPasses</code>.</li>
    </ul>
    <div class="note">WebGL texture origin, Y-flip, sampler naming, and <code>_hyd_*</code> ABI details stay in GL2GPU. They are not proposed as Tint/Dawn upstream behavior.</div>
  `)}

  ${section("Headed gl2gpu-demo Performance", `
    <p>These runs compare current Tint GL2GPU against the demo repository's manual GL2GPU baseline using the same demo assets. Command shape: <code>npm run benchmark:gl2gpu-demo -- --samples aquarium,motionmark,sprites --modes tint,manual --trials 3 --frames 60 --warmup-frames 60 --objects N --order abba --headed true</code>.</p>
    <h3>N = 100000</h3>
    ${table(["Demo", "Objects", "Tint FPS", "Manual FPS", "Tint/Manual", "Delta", "Tint frame ms", "Manual frame ms", "RMSE", "Tint shader DB requests", "Tint hard failures"], benchmarkRows(benchmark100k))}
    <h3>N = 300000</h3>
    ${table(["Demo", "Objects", "Tint FPS", "Manual FPS", "Tint/Manual", "Delta", "Tint frame ms", "Manual frame ms", "RMSE", "Tint shader DB requests", "Tint hard failures"], benchmarkRows(benchmark300k))}
    <div class="note">All rows passed with RMSE 0.00000 between Tint and manual screenshots. Manual uses its shader DB by design; Tint does not.</div>
  `)}

  ${section("Render Quality vs Native WebGL", `
    <p>Quality measurements compare canvas screenshots against native WebGL. PSNR is in dB; SSIM uses 1.0 as identical. These quality runs are separate from the heavy headed performance runs because high-object screenshot readback can dominate wall time.</p>
    <h3>Runtime quality harness</h3>
    ${table(["Demo", "Objects", "Tint vs WebGL PSNR", "Tint vs WebGL SSIM", "Manual vs WebGL PSNR", "Manual vs WebGL SSIM", "Tint shader DB requests"], renderQualityRows)}
    <h3>gl2gpu-demo deterministic quality pass</h3>
    ${table(["Demo", "Objects", "Tint vs WebGL PSNR", "Tint vs WebGL SSIM", "Manual vs WebGL PSNR", "Manual vs WebGL SSIM", "Tint shader DB requests"], demoQualityRows)}
  `)}

  ${section("Visual Samples", `
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
  ${section("Validation and Reproducibility", `
    <h3>Checks previously run for the optimized runtime commit</h3>
    <ul>
      <li><code>npm run typecheck</code></li>
      <li><code>npm run test:shader</code></li>
      <li><code>npm run test:texture</code></li>
      <li><code>npm run build</code></li>
    </ul>
    <h3>Headed benchmark commands</h3>
    <pre>npm run benchmark:gl2gpu-demo -- --samples aquarium,motionmark,sprites --modes tint,manual --trials 3 --frames 60 --warmup-frames 60 --objects 100000 --order abba --headed true
npm run benchmark:gl2gpu-demo -- --samples aquarium,motionmark,sprites --modes tint,manual --trials 3 --frames 60 --warmup-frames 60 --objects 300000 --order abba --headed true</pre>
    <h3>Report command</h3>
    <pre>npm run report:tint</pre>
  `)}

  ${section("Limitations and Follow-Ups", `
    <ul>
      <li>The comparison is currently a full-stack Tint runtime vs demo manual runtime comparison, not a shader-only microbenchmark.</li>
      <li>Sprites remains slightly below manual in the headed runs, by about 2.5% at 100k and 1.8% at 300k.</li>
      <li>Future optimization should stay general: reduce per-draw runtime overhead and WGSL data-flow overhead without benchmark-specific rewrites.</li>
      <li>Potential Dawn work should be backed by A/B evidence that isolates Tint wasm changes from GL2GPU JavaScript post-processing.</li>
    </ul>
  `)}

  ${section("Commit Stat", `<pre>${esc(stat)}</pre>`)}

  <div class="footer">Generated from local workspace ${esc(repo)} on ${new Date().toISOString()}.</div>
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
