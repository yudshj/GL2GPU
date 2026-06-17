#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const demoRoot = path.resolve(process.env.GL2GPU_DEMO_ROOT || "/Users/hanyd/Code/gl2gpu-demo");
const releaseRoot = path.join(repoRoot, "dist", "release");
const outputRoot = path.join(repoRoot, "output", "gl2gpu-demo-benchmark");

const benchmarks = [
  {
    name: "aquarium",
    objectsOption: "aquarium-objects",
    defaultObjects: 100000,
    webglRoute: "/webgl/aquarium/",
    webgpuRoute: "/webgpu/aquarium/",
  },
  {
    name: "motionmark",
    objectsOption: "motionmark-objects",
    defaultObjects: 100000,
    webglRoute: "/webgl/motionmark/",
    webgpuRoute: "/webgpu/motionmark/",
  },
  {
    name: "sprites",
    objectsOption: "sprites-objects",
    defaultObjects: 100000,
    webglRoute: "/webgl/jsgamesbench/",
    webgpuRoute: "/webgpu/jsgamesbench/",
  },
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

const selectedModes = parseList(argv.get("modes") || "tint,manual");
const selectedBenchmarks = selectBenchmarks(argv.get("samples") || "aquarium,motionmark,sprites");
const trials = Number(argv.get("trials") || 3);
const runOrder = argv.get("order") || "mode-major";
const maxFrames = Number(argv.get("frames") || 120);
const warmupFrames = Number(argv.get("warmup-frames") || 30);
const timeoutMs = Number(argv.get("timeout-ms") || 300000);
const rmseThreshold = Number(argv.get("rmse-threshold") || 0.02);
const fpsThreshold = Number(argv.get("threshold") || 0.90);
const captureScreenshots = argv.get("screenshots") !== "false";
const captureShaders = argv.get("capture-shaders") === "true";
const staticSamplerOriginVariants = argv.has("static-sampler-origin-variants")
  ? argv.get("static-sampler-origin-variants") !== "false"
  : null;
const optimizeTintWgsl = argv.has("optimize-tint-wgsl")
  ? argv.get("optimize-tint-wgsl") !== "false"
  : null;

function parseList(value) {
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function selectBenchmarks(value) {
  if (value === "all") return benchmarks;
  const wanted = new Set(parseList(value));
  return benchmarks.filter((benchmark) => wanted.has(benchmark.name));
}

function makeTrialPlan(benchmark) {
  const plan = [];
  if (runOrder === "trial-major" || runOrder === "interleave") {
    for (let trial = 1; trial <= trials; trial++) {
      for (const mode of selectedModes) {
        plan.push({ benchmark, mode, trial });
      }
    }
    return plan;
  }
  if (runOrder === "abba") {
    if (selectedModes.length !== 2) {
      throw new Error("--order abba requires exactly two modes");
    }
    const [a, b] = selectedModes;
    const sequence = [a, b, b, a];
    const counts = new Map(selectedModes.map((mode) => [mode, 0]));
    let step = 0;
    while (selectedModes.some((mode) => counts.get(mode) < trials)) {
      const mode = sequence[step++ % sequence.length];
      const count = counts.get(mode);
      if (count >= trials) {
        continue;
      }
      counts.set(mode, count + 1);
      plan.push({ benchmark, mode, trial: count + 1 });
    }
    return plan;
  }
  if (runOrder !== "mode-major") {
    throw new Error(`Unsupported --order ${runOrder}`);
  }
  for (const mode of selectedModes) {
    for (let trial = 1; trial <= trials; trial++) {
      plan.push({ benchmark, mode, trial });
    }
  }
  return plan;
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

function sanitizeName(value) {
  return String(value).replace(/[^A-Za-z0-9_.-]+/g, "_");
}

function safeStaticPath(root, pathname) {
  let relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (!relative || relative.endsWith("/")) {
    relative += "index.html";
  }
  const fullPath = path.resolve(root, relative);
  const resolvedRoot = path.resolve(root);
  if (!fullPath.startsWith(resolvedRoot + path.sep) && fullPath !== resolvedRoot) {
    return null;
  }
  return fullPath;
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
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function startServer(mode) {
  const state = {
    mode,
    shaderDbRequests: 0,
    uploads: [],
    missing: [],
  };

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

      if (pathname === "/js/gl2gpu.js" && mode === "tint") {
        buffer = fs.readFileSync(path.join(releaseRoot, "gl2gpu.js"));
      } else if ((pathname === "/js/glslang.wasm" || pathname === "/js/tint_wasm.wasm") && mode === "tint") {
        buffer = fs.readFileSync(path.join(releaseRoot, path.basename(pathname)));
      } else if (pathname === "/js/shaders_info.json" && mode === "tint") {
        state.shaderDbRequests++;
        state.missing.push(pathname);
        sendBuffer(response, 404, Buffer.from("shader DB disabled for Tint mode"), "text/plain; charset=utf-8");
        return;
      } else {
        const file = safeStaticPath(demoRoot, pathname);
        if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
          buffer = fs.readFileSync(file);
          type = contentType(file);
          if (pathname === "/js/shaders_info.json") {
            state.shaderDbRequests++;
          }
        }
      }

      if (!buffer) {
        state.missing.push(pathname);
        sendBuffer(response, 404, Buffer.from(`not found: ${pathname}`), "text/plain; charset=utf-8");
        return;
      }

      sendBuffer(response, 200, buffer, type);
    } catch (error) {
      const message = error instanceof Error ? error.stack || error.message : String(error);
      sendBuffer(response, 500, Buffer.from(message), "text/plain; charset=utf-8");
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    server,
    state,
    baseURL: `http://127.0.0.1:${address.port}`,
  };
}

function benchmarkObjects(benchmark) {
  return Number(argv.get(benchmark.objectsOption) || argv.get("objects") || benchmark.defaultObjects);
}

function benchmarkURL(baseURL, benchmark, mode, trial) {
  const route = mode === "webgl" ? benchmark.webglRoute : benchmark.webgpuRoute;
  const url = new URL(route, baseURL);
  url.searchParams.set("numObjects", String(benchmarkObjects(benchmark)));
  url.searchParams.set("maxFrames", String(maxFrames));
  url.searchParams.set("id", `gl2gpu-demo-${mode}-${benchmark.name}-${trial}`);
  return url.href;
}

function benchmarkInitScript(options) {
  return `
(() => {
  const state = {
    frameTimes: [],
    maxFrames: ${Number(options.maxFrames)},
    warmupFrames: ${Number(options.warmupFrames)},
    seenFrames: 0,
    done: false,
    rafCallbacks: 0,
    alerts: [],
  };
  window.__GL2GPU_DEMO_BENCH = state;
  window.alert = (message) => state.alerts.push(String(message));
  window.addEventListener("unhandledrejection", (event) => {
    console.error("[unhandledrejection]", event.reason && (event.reason.stack || event.reason.message || event.reason));
  });

  const nativeRAF = window.requestAnimationFrame.bind(window);
  let lastTimestamp = -1;
  let lastMeasureTime = 0;
  window.requestAnimationFrame = (callback) => nativeRAF((timestamp) => {
    state.rafCallbacks++;
    let result;
    try {
      result = callback(timestamp);
    } finally {
      const now = performance.now();
      if (timestamp !== lastTimestamp) {
        if (lastMeasureTime > 0) {
          if (state.seenFrames >= state.warmupFrames) {
            if (state.frameTimes.length < state.maxFrames) {
              state.frameTimes.push(now - lastMeasureTime);
              if (state.frameTimes.length >= state.maxFrames) {
                state.done = true;
              }
            }
          }
          state.seenFrames++;
        }
        lastTimestamp = timestamp;
        lastMeasureTime = now;
      }
    }
    return result;
  });
})();`;
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

function writeShaderCaptures(mode, benchmark, trial, shaderCaptures) {
  if (shaderCaptures.length === 0) return null;
  const dir = path.join(outputRoot, "shader-captures");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${sanitizeName(mode)}-${sanitizeName(benchmark.name)}-trial-${trial}.json`);
  fs.writeFileSync(file, JSON.stringify(shaderCaptures, null, 2));
  return file;
}

function summarizeFrameTimes(frameTimes) {
  const values = frameTimes.filter((value) => Number.isFinite(value) && value > 0);
  if (values.length === 0) {
    return { count: 0, averageMs: null, medianMs: null, minMs: null, maxMs: null, fps: null };
  }
  const sorted = values.slice().sort((a, b) => a - b);
  const averageMs = values.reduce((sum, value) => sum + value, 0) / values.length;
  const middle = Math.floor(sorted.length / 2);
  const medianMs = sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
  return {
    count: values.length,
    averageMs,
    medianMs,
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
    fps: 1000 / averageMs,
  };
}

async function captureCanvasImage(page) {
  return page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll("canvas"))
      .filter((canvas) => canvas.width > 0 && canvas.height > 0)
      .sort((a, b) => (b.width * b.height) - (a.width * a.height));
    const canvas = canvases[0];
    if (!canvas) return { error: "no canvas" };
    const width = canvas.width;
    const height = canvas.height;
    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;
    const context = offscreen.getContext("2d", { willReadFrequently: true });
    if (!context) return { error: "2d context unavailable" };
    context.drawImage(canvas, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < pixels.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, pixels.subarray(i, i + chunkSize));
    }
    return { width, height, data: btoa(binary) };
  }).catch((error) => ({ error: error.message || String(error) }));
}

function decodeImageData(image) {
  if (!image || image.error || !image.data) return null;
  return {
    width: image.width,
    height: image.height,
    bytes: Buffer.from(image.data, "base64"),
  };
}

function compareImages(aImage, bImage) {
  const a = decodeImageData(aImage);
  const b = decodeImageData(bImage);
  if (!a || !b) return { rmse: null, psnr: null };
  if (a.width !== b.width || a.height !== b.height || a.bytes.length !== b.bytes.length) {
    return { rmse: null, psnr: null };
  }
  let sum = 0;
  let count = 0;
  for (let i = 0; i < a.bytes.length; i += 4) {
    const dr = a.bytes[i] - b.bytes[i];
    const dg = a.bytes[i + 1] - b.bytes[i + 1];
    const db = a.bytes[i + 2] - b.bytes[i + 2];
    sum += dr * dr + dg * dg + db * db;
    count += 3;
  }
  const mse = sum / count;
  const rmse = Math.sqrt(mse) / 255;
  const psnr = mse === 0 ? Infinity : 20 * Math.log10(255 / Math.sqrt(mse));
  return { rmse, psnr };
}

async function runTrial(browser, benchmark, mode, trial) {
  const { server, baseURL, state } = await startServer(mode);
  const context = await browser.newContext({
    viewport: { width: 1024, height: 1024 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const messages = [];
  const pageErrors = [];
  const requestFailures = [];
  const badResponses = [];
  const dialogs = [];
  const shaderCaptures = [];
  const hardFailurePatterns = [
    /validation error/i,
    /shader translation failed/i,
    /Shader not found in shaderDB/i,
    /Runtime shader translation failed/i,
  ];
  const tintOnlyHardFailurePatterns = [
    /not implemented/i,
    /unsupported/i,
  ];

  page.on("console", (message) => {
    if (messages.length < 300) {
      messages.push({ type: message.type(), text: message.text().slice(0, 2000) });
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.stack || error.message || String(error)));
  page.on("requestfailed", (request) => {
    requestFailures.push({
      url: request.url(),
      failure: request.failure() ? request.failure().errorText : "unknown",
    });
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      badResponses.push({ url: response.url(), status: response.status() });
    }
  });
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss().catch(() => {});
  });

  if (captureShaders && mode === "tint") {
    await installShaderCapture(page, shaderCaptures);
  }
  await page.addInitScript(benchmarkInitScript({ maxFrames, warmupFrames }));
  if (mode === "tint" && staticSamplerOriginVariants !== null) {
    await page.addInitScript((enabled) => {
      window.__HYD_STATIC_SAMPLER_ORIGIN_VARIANTS = enabled;
    }, staticSamplerOriginVariants);
  }
  if (mode === "tint" && optimizeTintWgsl !== null) {
    await page.addInitScript((enabled) => {
      window.__HYD_TRANSLATOR_OPTIONS = {
        ...(window.__HYD_TRANSLATOR_OPTIONS || {}),
        optimizeTintWgsl: enabled,
      };
    }, optimizeTintWgsl);
  }

  const url = benchmarkURL(baseURL, benchmark, mode, trial);
  let timeout = false;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.waitForFunction(() => window.__GL2GPU_DEMO_BENCH && window.__GL2GPU_DEMO_BENCH.done, null, { timeout: timeoutMs });
    await page.waitForTimeout(250);
  } catch (error) {
    timeout = true;
    pageErrors.push(error.message || String(error));
  }

  const benchData = await page.evaluate(() => window.__GL2GPU_DEMO_BENCH || null)
    .catch((error) => ({ error: error.message || String(error), frameTimes: [] }));
  const image = captureScreenshots ? await captureCanvasImage(page) : null;
  const screenshot = captureScreenshots
    ? path.join(outputRoot, `${mode}-${benchmark.name}-trial-${trial}.png`)
    : null;
  if (screenshot) {
    await page.screenshot({ path: screenshot }).catch((error) => {
      pageErrors.push(`screenshot: ${error.message || error}`);
    });
  }
  const shaderCaptureFile = captureShaders ? writeShaderCaptures(mode, benchmark, trial, shaderCaptures) : null;

  await page.close().catch(() => {});
  await context.close().catch(() => {});
  await new Promise((resolve) => server.close(resolve));

  const frameSummary = summarizeFrameTimes((benchData && benchData.frameTimes) || []);
  const hardFailures = [
    ...(mode === "tint" && state.shaderDbRequests > 0 ? [`shaderDbRequests=${state.shaderDbRequests}`] : []),
    ...(frameSummary.count === 0 ? ["0 frameTimes captured"] : []),
    ...pageErrors.filter((text) => !/Cannot read properties of undefined \(reading 'width'\)/.test(text)),
    ...messages.map((message) => message.text).filter((text) => {
      if (hardFailurePatterns.some((pattern) => pattern.test(text))) return true;
      return mode === "tint" && tintOnlyHardFailurePatterns.some((pattern) => pattern.test(text));
    }),
  ];

  return {
    benchmark: benchmark.name,
    mode,
    trial,
    objects: benchmarkObjects(benchmark),
    url,
    timeout,
    frameSummary,
    benchData,
    shaderDbRequests: state.shaderDbRequests,
    uploadCount: state.uploads.length,
    missingRequests: state.missing.slice(0, 50),
    pageErrors,
    requestFailures,
    badResponses,
    dialogs,
    hardFailures: hardFailures.slice(0, 50),
    messages,
    screenshot,
    image,
    shaderCaptureFile,
    shaderCaptureCount: shaderCaptures.length,
  };
}

function median(values) {
  const filtered = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (filtered.length === 0) return null;
  const middle = Math.floor(filtered.length / 2);
  return filtered.length % 2 === 0 ? (filtered[middle - 1] + filtered[middle]) / 2 : filtered[middle];
}

function createSummary(results) {
  const rows = [];
  for (const benchmark of selectedBenchmarks) {
    const perBenchmark = results.filter((result) => result.benchmark === benchmark.name);
    const row = {
      benchmark: benchmark.name,
      objects: benchmarkObjects(benchmark),
      modes: {},
      tintVsManualFpsRatio: null,
      tintVsManualRmse: null,
      tintVsManualPsnr: null,
      pass: true,
      reasons: [],
    };

    for (const mode of selectedModes) {
      const perMode = perBenchmark.filter((result) => result.mode === mode);
      const medianFps = median(perMode.map((result) => result.frameSummary.fps));
      const medianFrameMs = median(perMode.map((result) => result.frameSummary.medianMs));
      const shaderDbRequests = perMode.reduce((sum, result) => sum + result.shaderDbRequests, 0);
      const hardFailures = perMode.flatMap((result) => result.hardFailures);
      const timeouts = perMode.filter((result) => result.timeout).length;
      row.modes[mode] = {
        medianFps,
        medianFrameMs,
        shaderDbRequests,
        hardFailureCount: hardFailures.length,
        timeouts,
      };
      if (mode === "tint" && shaderDbRequests !== 0) {
        row.pass = false;
        row.reasons.push("Tint requested shader DB");
      }
      if (hardFailures.length > 0 || timeouts > 0 || !Number.isFinite(medianFps)) {
        row.pass = false;
        row.reasons.push(`${mode} hard failure/timeout/no fps`);
      }
    }

    const tintFps = row.modes.tint && row.modes.tint.medianFps;
    const manualFps = row.modes.manual && row.modes.manual.medianFps;
    if (Number.isFinite(tintFps) && Number.isFinite(manualFps) && manualFps > 0) {
      row.tintVsManualFpsRatio = tintFps / manualFps;
      if (row.tintVsManualFpsRatio < fpsThreshold) {
        row.pass = false;
        row.reasons.push(`Tint FPS ratio ${row.tintVsManualFpsRatio.toFixed(3)} < ${fpsThreshold}`);
      }
    }

    const rmses = [];
    const psnrs = [];
    for (let trial = 1; trial <= trials; trial++) {
      const tint = perBenchmark.find((result) => result.mode === "tint" && result.trial === trial);
      const manual = perBenchmark.find((result) => result.mode === "manual" && result.trial === trial);
      if (!tint || !manual) continue;
      const metrics = compareImages(tint.image, manual.image);
      if (Number.isFinite(metrics.rmse)) rmses.push(metrics.rmse);
      if (Number.isFinite(metrics.psnr) || metrics.psnr === Infinity) psnrs.push(metrics.psnr);
    }
    row.tintVsManualRmse = median(rmses);
    row.tintVsManualPsnr = median(psnrs);
    if (selectedModes.includes("tint") && selectedModes.includes("manual") && captureScreenshots) {
      if (!Number.isFinite(row.tintVsManualRmse)) {
        row.pass = false;
        row.reasons.push("Tint/manual RMSE unavailable");
      } else if (row.tintVsManualRmse > rmseThreshold) {
        row.pass = false;
        row.reasons.push(`Tint/manual RMSE ${row.tintVsManualRmse.toFixed(4)} > ${rmseThreshold}`);
      }
    }

    rows.push(row);
  }
  return rows;
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
      const browser = await chromium.launch({ ...attempt, args });
      browser.__gl2gpuLaunchInfo = {
        executablePath: attempt.executablePath,
        headless: attempt.headless,
      };
      console.log(`[browser] ${attempt.headless ? "headless" : "headed"} ${attempt.executablePath}`);
      return browser;
    } catch (error) {
      lastError = error;
      console.warn(`[launch] ${attempt.executablePath} ${attempt.headless ? "headless" : "headed"} failed: ${error.message || error}`);
    }
  }
  throw lastError || new Error("No usable Chromium executable found");
}

function printSummary(summary) {
  for (const row of summary) {
    const tint = row.modes.tint || {};
    const manual = row.modes.manual || {};
    const webgl = row.modes.webgl || {};
    const tintFps = Number.isFinite(tint.medianFps) ? tint.medianFps.toFixed(3) : "n/a";
    const manualFps = Number.isFinite(manual.medianFps) ? manual.medianFps.toFixed(3) : "n/a";
    const webglFps = Number.isFinite(webgl.medianFps) ? webgl.medianFps.toFixed(3) : "n/a";
    const ratio = Number.isFinite(row.tintVsManualFpsRatio) ? row.tintVsManualFpsRatio.toFixed(3) : "n/a";
    const rmse = Number.isFinite(row.tintVsManualRmse) ? row.tintVsManualRmse.toFixed(5) : "n/a";
    const psnr = row.tintVsManualPsnr === Infinity ? "Infinity" : Number.isFinite(row.tintVsManualPsnr) ? row.tintVsManualPsnr.toFixed(3) : "n/a";
    console.log(`${row.pass ? "PASS" : "FAIL"} ${row.benchmark}: tint=${tintFps}fps manual=${manualFps}fps webgl=${webglFps}fps ratio=${ratio} rmse=${rmse} psnr=${psnr}`);
    for (const reason of row.reasons) {
      console.log(`  - ${reason}`);
    }
  }
}

async function main() {
  assertReadable(demoRoot);
  assertReadable(path.join(demoRoot, "js", "gl2gpu.js"));
  assertReadable(path.join(demoRoot, "js", "shaders_info.json"));
  assertReadable(path.join(releaseRoot, "gl2gpu.js"));
  assertReadable(path.join(releaseRoot, "glslang.wasm"));
  assertReadable(path.join(releaseRoot, "tint_wasm.wasm"));

  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });

  const browser = await launchBrowser();
  const browserInfo = browser.__gl2gpuLaunchInfo || {};
  const results = [];
  try {
    for (const benchmark of selectedBenchmarks) {
      for (const item of makeTrialPlan(benchmark)) {
        console.log(`[${item.mode}] ${item.benchmark.name} trial ${item.trial}/${trials} objects=${benchmarkObjects(item.benchmark)} frames=${maxFrames} warmup=${warmupFrames}`);
        const result = await runTrial(browser, item.benchmark, item.mode, item.trial);
        results.push(result);
        const fps = Number.isFinite(result.frameSummary.fps) ? result.frameSummary.fps.toFixed(3) : "n/a";
        const frameMs = Number.isFinite(result.frameSummary.medianMs) ? result.frameSummary.medianMs.toFixed(3) : "n/a";
        console.log(`  fps=${fps} medianFrameMs=${frameMs} frames=${result.frameSummary.count} shaderDbRequests=${result.shaderDbRequests} hardFailures=${result.hardFailures.length}`);
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const summary = createSummary(results);
  const report = {
    generatedAt: new Date().toISOString(),
    demoRoot,
    modes: selectedModes,
    benchmarks: selectedBenchmarks.map((benchmark) => ({
      name: benchmark.name,
      objects: benchmarkObjects(benchmark),
      webglRoute: benchmark.webglRoute,
      webgpuRoute: benchmark.webgpuRoute,
    })),
    runOrder,
    trials,
    maxFrames,
    warmupFrames,
    browser: browserInfo,
    captureShaders,
    staticSamplerOriginVariants,
    optimizeTintWgsl,
    fpsThreshold,
    rmseThreshold,
    summary,
    results,
  };
  fs.writeFileSync(path.join(outputRoot, "results.json"), JSON.stringify(report, null, 2));
  printSummary(summary);

  if (summary.some((row) => !row.pass)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error && (error.stack || error.message || error));
  process.exitCode = 1;
});
