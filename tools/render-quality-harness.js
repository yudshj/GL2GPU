#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const webglRoot = path.join(repoRoot, "dist", "webgl");
const webgpuRoot = path.join(repoRoot, "dist", "webgpu");
const jsRoot = path.join(repoRoot, "dist", "js");
const imagesRoot = path.join(repoRoot, "dist", "images");
const releaseRoot = path.join(repoRoot, "dist", "release");
const outputRoot = path.join(repoRoot, "output", "render-quality");

const benchmarks = [
  { name: "aquarium", route: "/aquarium/", objectsOption: "aquarium-objects", defaultObjects: 5000 },
  { name: "motionmark", route: "/motionmark/", objectsOption: "motionmark-objects", defaultObjects: 5000 },
  { name: "sprites", route: "/jsgamesbench/", objectsOption: "sprites-objects", defaultObjects: 100000 },
];

const argv = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (!arg.startsWith("--")) continue;
  const key = arg.slice(2);
  const next = process.argv[i + 1];
  if (next && !next.startsWith("--")) {
    argv.set(key, next);
    i++;
  } else {
    argv.set(key, "true");
  }
}

const selectedBenchmarks = selectBenchmarks(argv.get("samples") || "aquarium,motionmark,sprites");
const frames = Number(argv.get("frames") || 2);
const warmupFrames = Number(argv.get("warmup-frames") || 1);
const timeoutMs = Number(argv.get("timeout-ms") || 180000);
const manualRef = argv.get("manual-ref") || "3dec70b";
const manualRoot = argv.get("manual-root") || "";

const textTypes = new Set([
  "text/html; charset=utf-8",
  "text/javascript; charset=utf-8",
  "application/json; charset=utf-8",
  "text/css; charset=utf-8",
]);

function parseList(value) {
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function selectBenchmarks(value) {
  if (value === "all") return benchmarks;
  const wanted = new Set(parseList(value));
  return benchmarks.filter((benchmark) => wanted.has(benchmark.name));
}

function loadPlaywright() {
  const candidates = [
    () => require("playwright"),
    () => require("/Volumes/Code/2-9.playwright/node_modules/playwright"),
  ];
  for (const candidate of candidates) {
    try {
      return candidate();
    } catch (_) {
    }
  }
  throw new Error("Playwright is unavailable. Install playwright locally or set up /Volumes/Code/2-9.playwright.");
}

function contentType(pathname) {
  const ext = path.extname(pathname).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".wasm": "application/wasm",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".ogv": "video/ogg",
    ".webm": "video/webm",
    ".obj": "text/plain; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
  }[ext] || "application/octet-stream";
}

function assertReadable(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

function safeStaticPath(root, pathname) {
  let relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (!relative || relative.endsWith("/")) {
    relative += "index.html";
  }
  const fullPath = path.resolve(root, relative);
  if (!fullPath.startsWith(path.resolve(root) + path.sep) && fullPath !== path.resolve(root)) {
    return null;
  }
  return fullPath;
}

function sanitizeName(value) {
  return String(value).replace(/[^A-Za-z0-9_.-]+/g, "_");
}

async function installShaderCapture(page, shaderCaptures) {
  await page.exposeBinding("__hydShaderCapture", (_source, record) => {
    if (record && typeof record === "object") {
      shaderCaptures.push(record);
    }
  });
  await page.addInitScript(() => {
    window.__HYD_SHADER_CAPTURE = (record) => {
      if (typeof window.__hydShaderCapture === "function") {
        window.__hydShaderCapture(record);
      }
    };
  });
}

function summarizeShaderCaptures(shaderCaptures) {
  const summary = {
    count: shaderCaptures.length,
    byKind: {},
    byStage: {},
    finalShapeTotals: {},
  };
  for (const capture of shaderCaptures) {
    summary.byKind[capture.kind || "unknown"] = (summary.byKind[capture.kind || "unknown"] || 0) + 1;
    summary.byStage[capture.stage || "unknown"] = (summary.byStage[capture.stage || "unknown"] || 0) + 1;
    const stats = capture.finalWgsl?.stats || capture.postProcessWgsl?.stats;
    if (!stats) continue;
    for (const [key, value] of Object.entries(stats)) {
      if (typeof value === "number") {
        summary.finalShapeTotals[key] = (summary.finalShapeTotals[key] || 0) + value;
      }
    }
  }
  return summary;
}

function writeShaderCaptures(benchmark, mode, shaderCaptures) {
  if (shaderCaptures.length === 0) return null;
  const dir = path.join(outputRoot, "shader-captures");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${sanitizeName(benchmark.name)}-${sanitizeName(mode)}.json`);
  fs.writeFileSync(file, JSON.stringify(shaderCaptures, null, 2));
  return file;
}

const gitBlobCache = new Map();

function readGitBlob(ref, file) {
  const key = `${ref}:${file}`;
  if (gitBlobCache.has(key)) return gitBlobCache.get(key);
  const result = spawnSync("git", ["show", key], {
    cwd: repoRoot,
    encoding: "buffer",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    const stderr = result.stderr ? result.stderr.toString("utf8") : "";
    throw new Error(`Unable to read ${key}: ${stderr.trim()}`);
  }
  gitBlobCache.set(key, result.stdout);
  return result.stdout;
}

function readManualAsset(file) {
  if (manualRoot) {
    const fullPath = path.join(manualRoot, file);
    assertReadable(fullPath);
    return fs.readFileSync(fullPath);
  }
  return readGitBlob(manualRef, file);
}

function rewriteManualShaderDbUrl(text) {
  return text.replace(
    /GL2GPU\.gl2gpuGetContext\(([^,\n]+),\s*null\s*,/g,
    "GL2GPU.gl2gpuGetContext($1, \"/js/shaders_info.json\",",
  );
}

function rewriteSetup(text) {
  return text.replace(/var uk7ePook = \d+;/, `var uk7ePook = ${warmupFrames};`);
}

function sendBuffer(response, status, buffer, type) {
  response.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
  });
  response.end(buffer);
}

async function collectRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function startServer(mode) {
  const state = {
    mode,
    shaderDbRequests: 0,
    uploads: [],
    missing: [],
  };
  const root = mode === "webgl" ? webglRoot : webgpuRoot;

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://127.0.0.1");
      const pathname = url.pathname;
      if (pathname === "/api/upload.php") {
        state.uploads.push(await collectRequestBody(request));
        sendBuffer(response, 200, Buffer.from(JSON.stringify({ status: "success", message: "captured" })), "application/json; charset=utf-8");
        return;
      }
      if (pathname === "/favicon.ico") {
        response.writeHead(204);
        response.end();
        return;
      }

      let buffer = null;
      let type = contentType(pathname);
      if (pathname === "/js/gl2gpu.js") {
        if (mode === "webgl") {
          sendBuffer(response, 404, Buffer.from("native webgl mode"), "text/plain; charset=utf-8");
          return;
        }
        buffer = mode === "manual"
          ? readManualAsset("dist/js/gl2gpu.js")
          : fs.readFileSync(path.join(releaseRoot, "gl2gpu.js"));
      } else if (pathname === "/js/shaders_info.json") {
        state.shaderDbRequests++;
        if (mode !== "manual") {
          state.missing.push(pathname);
          sendBuffer(response, 404, Buffer.from("shader DB disabled"), "text/plain; charset=utf-8");
          return;
        }
        buffer = readManualAsset("dist/js/shaders_info.json");
        type = "application/json; charset=utf-8";
      } else if (pathname === "/js/glslang.wasm" || pathname === "/js/tint_wasm.wasm") {
        buffer = fs.readFileSync(path.join(releaseRoot, path.basename(pathname)));
      } else if (pathname.startsWith("/js/")) {
        const file = safeStaticPath(jsRoot, pathname.slice("/js/".length));
        if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
          buffer = fs.readFileSync(file);
          type = contentType(file);
          if (pathname === "/js/setup.js") {
            buffer = Buffer.from(rewriteSetup(buffer.toString("utf8")), "utf8");
          }
        }
      } else if (pathname.startsWith("/images/")) {
        const file = safeStaticPath(imagesRoot, pathname.slice("/images/".length));
        if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
          buffer = fs.readFileSync(file);
          type = contentType(file);
        }
      } else {
        const file = safeStaticPath(root, pathname);
        if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
          buffer = fs.readFileSync(file);
          type = contentType(file);
        }
      }

      if (!buffer) {
        state.missing.push(pathname);
        sendBuffer(response, 404, Buffer.from(`not found: ${pathname}`), "text/plain; charset=utf-8");
        return;
      }
      if (mode === "manual" && textTypes.has(type)) {
        buffer = Buffer.from(rewriteManualShaderDbUrl(buffer.toString("utf8")), "utf8");
      }
      sendBuffer(response, 200, buffer, type);
    } catch (error) {
      const message = error instanceof Error ? error.stack || error.message : String(error);
      sendBuffer(response, 500, Buffer.from(message), "text/plain; charset=utf-8");
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return { server, state, baseURL: `http://127.0.0.1:${address.port}` };
}

function benchmarkObjects(benchmark) {
  return Number(argv.get(benchmark.objectsOption) || argv.get("objects") || benchmark.defaultObjects);
}

function benchmarkURL(baseURL, benchmark, mode) {
  const url = new URL(benchmark.route, baseURL);
  url.searchParams.set("numObjects", String(benchmarkObjects(benchmark)));
  url.searchParams.set("maxFrames", String(frames));
  url.searchParams.set("turbo", "-1");
  url.searchParams.set("id", `quality-${mode}-${benchmark.name}`);
  return url.href;
}

function deterministicTimeScript() {
  return `
(() => {
  let now = 1000;
  const fixedEpoch = 1700000000000;
  const NativeDate = Date;
  function HarnessDate(...args) {
    if (new.target) return args.length ? new NativeDate(...args) : new NativeDate(fixedEpoch + Math.floor(now));
    return new NativeDate(fixedEpoch + Math.floor(now)).toString();
  }
  HarnessDate.now = () => fixedEpoch + Math.floor(now);
  HarnessDate.UTC = NativeDate.UTC;
  HarnessDate.parse = NativeDate.parse;
  HarnessDate.prototype = NativeDate.prototype;
  window.Date = HarnessDate;
  try {
    performance.now = () => now;
  } catch (_) {
  }
  const nativeRAF = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => nativeRAF(() => {
    now += 1000 / 60;
    callback(now);
  });
})();`;
}

function metricValue(metric, a, b) {
  const result = spawnSync("magick", ["compare", "-metric", metric, a, b, "null:"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const text = `${result.stderr || ""}${result.stdout || ""}`.trim();
  if (/^inf(?:inity)?$/i.test(text)) return Infinity;
  if (metric === "SSIM") {
    const normalized = /\(([-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?)\)/i.exec(text);
    if (normalized) return Number(normalized[1]);
  }
  const match = /[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/i.exec(text);
  return match ? Number(match[0]) : null;
}

function ssimValue(a, b) {
  const distortion = metricValue("SSIM", a, b);
  return Number.isFinite(distortion) ? 1 - distortion : distortion;
}

function imageMean(pathname) {
  if (!pathname || !fs.existsSync(pathname)) return null;
  const result = spawnSync("magick", ["identify", "-format", "%[fx:mean]", pathname], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) return null;
  const value = Number(String(result.stdout || result.stderr || "").trim());
  return Number.isFinite(value) ? value : null;
}

async function capture(browser, benchmark, mode) {
  const { server, baseURL, state } = await startServer(mode);
  const context = await browser.newContext({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const pageErrors = [];
  const messages = [];
  const badResponses = [];
  const dialogs = [];
  const shaderCaptures = [];
  page.on("console", (message) => {
    if (messages.length < 200) messages.push({ type: message.type(), text: message.text().slice(0, 1000) });
  });
  page.on("pageerror", (error) => pageErrors.push(error.message || String(error)));
  page.on("response", (response) => {
    if (response.status() >= 400) badResponses.push({ url: response.url(), status: response.status() });
  });
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss().catch(() => {});
  });
  await installShaderCapture(page, shaderCaptures);
  await page.addInitScript(deterministicTimeScript());
  await page.addInitScript(() => {
    window.__QUALITY_CAPTURE = { alerts: [] };
    window.alert = (message) => window.__QUALITY_CAPTURE.alerts.push(String(message));
  });

  let timeout = false;
  try {
    await page.goto(benchmarkURL(baseURL, benchmark, mode), { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.waitForFunction(() => Array.isArray(window.frameTimes), null, { timeout: 15000 });
    await page.waitForFunction(() => Array.isArray(window.frameTimes) && window.frameTimes.length >= window.maxFrames, null, { timeout: timeoutMs });
    await page.waitForTimeout(250);
  } catch (error) {
    timeout = true;
    pageErrors.push(error.message || String(error));
  }

  const canvasInfo = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll("canvas"))
      .filter((item) => item.width > 0 && item.height > 0)
      .map((canvas, index) => ({
        index,
        width: canvas.width,
        height: canvas.height,
        area: canvas.width * canvas.height,
      }))
      .sort((a, b) => b.area - a.area);
    const canvas = canvases[0];
    if (!canvas) return { error: "no canvas" };
    return {
      index: canvas.index,
      width: canvas.width,
      height: canvas.height,
      frameTimes: Array.isArray(window.frameTimes) ? window.frameTimes.slice(0, window.maxFrames) : [],
    };
  }).catch((error) => ({ error: error.message || String(error) }));

  const pngPath = path.join(outputRoot, `${benchmark.name}-${mode}.png`);
  if (canvasInfo && Number.isInteger(canvasInfo.index)) {
    await page.evaluate((index) => {
      const canvas = Array.from(document.querySelectorAll("canvas"))[index];
      if (!canvas) return;
      const keep = new Set();
      for (let node = canvas; node; node = node.parentElement) {
        keep.add(node);
      }
      for (const element of Array.from(document.body.querySelectorAll("*"))) {
        if (!keep.has(element)) {
          element.style.visibility = "hidden";
        }
      }
    }, canvasInfo.index).catch((error) => {
      pageErrors.push(`hide overlays: ${error.message || error}`);
    });
    await page.locator("canvas").nth(canvasInfo.index).screenshot({ path: pngPath, timeout: timeoutMs }).catch((error) => {
      pageErrors.push(`canvas screenshot: ${error.message || error}`);
    });
  }
  const shaderCapturePath = writeShaderCaptures(benchmark, mode, shaderCaptures);
  const frameCount = Array.isArray(canvasInfo.frameTimes) ? canvasInfo.frameTimes.length : 0;
  const mean = imageMean(pngPath);
  const hardFailures = [
    ...pageErrors,
    ...(mode !== "webgl" && state.shaderDbRequests > 0 ? [`shaderDbRequests=${state.shaderDbRequests}`] : []),
    ...(frameCount === 0 ? ["0 frameTimes captured"] : []),
    ...(mean !== null && mean < 0.001 ? [`black frame mean=${mean}`] : []),
    ...messages
      .map((message) => message.text)
      .filter((text) => /validation error|shader translation failed|Shader not found in shaderDB|Runtime shader translation failed|not implemented|unsupported/i.test(text)),
  ];
  await page.close().catch(() => {});
  await context.close().catch(() => {});
  await new Promise((resolve) => server.close(resolve));
  return {
    benchmark: benchmark.name,
    mode,
    objects: benchmarkObjects(benchmark),
    timeout,
    shaderDbRequests: state.shaderDbRequests,
    missing: state.missing.slice(0, 50),
    shaderCaptures: summarizeShaderCaptures(shaderCaptures),
    shaderCapturePath,
    badResponses,
    pageErrors,
    hardFailures: hardFailures.slice(0, 50),
    dialogs,
    messages,
    imageMean: mean,
    image: canvasInfo,
    pngPath,
  };
}

async function launchBrowser() {
  const { chromium } = loadPlaywright();
  const args = [
    "--enable-unsafe-webgpu",
    "--enable-webgpu-developer-features",
    "--disable-gpu-sandbox",
    "--autoplay-policy=no-user-gesture-required",
    "--no-sandbox",
  ];
  const chromeForTesting = "/Users/hanyd/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
  const headlessShell = "/Users/hanyd/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell";
  const systemChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const headless = argv.get("headless") === "true" && argv.get("headed") !== "true";
  const attempts = (headless ? [
    { executablePath: headlessShell, headless: true },
    { executablePath: chromeForTesting, headless: true },
    { executablePath: process.env.CHROME_PATH || systemChrome, headless: true },
  ] : [
    { executablePath: chromeForTesting, headless: false },
    { executablePath: process.env.CHROME_PATH || systemChrome, headless: false },
  ]).filter((candidate, index, all) => fs.existsSync(candidate.executablePath) &&
    all.findIndex((other) => other.executablePath === candidate.executablePath && other.headless === candidate.headless) === index);
  let lastError = null;
  for (const attempt of attempts) {
    try {
      return await chromium.launch({ ...attempt, args });
    } catch (error) {
      lastError = error;
      console.warn(`[launch] ${attempt.executablePath} ${attempt.headless ? "headless" : "headed"} failed: ${error.message || error}`);
    }
  }
  throw lastError || new Error("No usable Chromium executable found");
}

async function main() {
  assertReadable(path.join(releaseRoot, "gl2gpu.js"));
  assertReadable(path.join(releaseRoot, "glslang.wasm"));
  assertReadable(path.join(releaseRoot, "tint_wasm.wasm"));
  assertReadable(path.join(jsRoot, "setup.js"));
  assertReadable(imagesRoot);
  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });

  const browser = await launchBrowser();
  const captures = [];
  try {
    for (const benchmark of selectedBenchmarks) {
      for (const mode of ["webgl", "tint", "manual"]) {
        console.log(`[${mode}] ${benchmark.name} objects=${benchmarkObjects(benchmark)} frames=${frames} warmup=${warmupFrames}`);
        const result = await capture(browser, benchmark, mode);
        captures.push(result);
        const frameCount = result.image && result.image.frameTimes ? result.image.frameTimes.length : 0;
        console.log(`  frames=${frameCount} shaderDbRequests=${result.shaderDbRequests} hardFailures=${result.hardFailures.length}`);
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const summary = [];
  for (const benchmark of selectedBenchmarks) {
    const webgl = captures.find((item) => item.benchmark === benchmark.name && item.mode === "webgl");
    const tint = captures.find((item) => item.benchmark === benchmark.name && item.mode === "tint");
    const manual = captures.find((item) => item.benchmark === benchmark.name && item.mode === "manual");
    summary.push({
      benchmark: benchmark.name,
      objects: benchmarkObjects(benchmark),
      frames,
      warmupFrames,
      tintVsWebgl: {
        psnr: tint && webgl ? metricValue("PSNR", tint.pngPath, webgl.pngPath) : null,
        ssim: tint && webgl ? ssimValue(tint.pngPath, webgl.pngPath) : null,
        shaderDbRequests: tint ? tint.shaderDbRequests : null,
        shaderCaptures: tint ? tint.shaderCaptures : null,
      },
      manualVsWebgl: {
        psnr: manual && webgl ? metricValue("PSNR", manual.pngPath, webgl.pngPath) : null,
        ssim: manual && webgl ? ssimValue(manual.pngPath, webgl.pngPath) : null,
        shaderDbRequests: manual ? manual.shaderDbRequests : null,
        shaderCaptures: manual ? manual.shaderCaptures : null,
      },
      errors: {
        webgl: webgl ? webgl.hardFailures : [],
        tint: tint ? tint.hardFailures : [],
        manual: manual ? manual.hardFailures : [],
      },
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    metricDefinitions: {
      psnr: "ImageMagick PSNR in dB over captured canvas screenshot pixels",
      ssim: "1 - ImageMagick normalized SSIM distortion over captured canvas screenshot pixels; 1.0 is identical",
    },
    summary,
    captures: captures.map((item) => ({
      benchmark: item.benchmark,
      mode: item.mode,
      objects: item.objects,
      timeout: item.timeout,
      shaderDbRequests: item.shaderDbRequests,
      missing: item.missing,
      badResponses: item.badResponses,
      pageErrors: item.pageErrors,
      hardFailures: item.hardFailures,
      dialogs: item.dialogs,
      shaderCaptures: item.shaderCaptures,
      shaderCapturePath: item.shaderCapturePath,
      imageMean: item.imageMean,
      frameCount: item.image && item.image.frameTimes ? item.image.frameTimes.length : 0,
      imageError: item.image && item.image.error,
      png: item.pngPath,
    })),
  };
  fs.writeFileSync(path.join(outputRoot, "results.json"), JSON.stringify(report, null, 2));
  for (const row of summary) {
    const fmt = (value) => value === Infinity ? "Infinity" : Number.isFinite(value) ? value.toFixed(6) : "n/a";
    console.log(`${row.benchmark}: tint-webgl PSNR=${fmt(row.tintVsWebgl.psnr)} SSIM=${fmt(row.tintVsWebgl.ssim)}; manual-webgl PSNR=${fmt(row.manualVsWebgl.psnr)} SSIM=${fmt(row.manualVsWebgl.ssim)}`);
  }
}

main().catch((error) => {
  console.error(error && (error.stack || error.message || error));
  process.exitCode = 1;
});
