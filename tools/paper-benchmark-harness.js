#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const webgpuRoot = path.join(repoRoot, "dist", "webgpu");
const jsRoot = path.join(repoRoot, "dist", "js");
const imagesRoot = path.join(repoRoot, "dist", "images");
const releaseRoot = path.join(repoRoot, "dist", "release");
const outputRoot = path.join(repoRoot, "output", "paper-benchmark");

const benchmarkDefinitions = [
  { name: "aquarium", route: "/aquarium/", objectsOption: "aquarium-objects", defaultObjects: 500000 },
  { name: "motionmark", route: "/motionmark/", objectsOption: "motionmark-objects", defaultObjects: 500000 },
  { name: "sprites", route: "/jsgamesbench/", objectsOption: "sprites-objects", defaultObjects: 500000 },
  { name: "sprites-100k", route: "/jsgamesbench/", objectsOption: "sprites100k-objects", defaultObjects: 100000 },
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
const selectedBenchmarks = selectBenchmarks(argv.get("samples") || "aquarium,motionmark,sprites,sprites-100k");
const trials = Number(argv.get("trials") || 3);
const maxFrames = Number(argv.get("frames") || 100);
const turbo = Number(argv.get("turbo") || -1);
const timeoutMs = Number(argv.get("timeout-ms") || 300000);
const threshold = Number(argv.get("threshold") || 0.90);
const rmseThreshold = Number(argv.get("rmse-threshold") || 0.02);
const manualRef = argv.get("manual-ref") || "3dec70b";
const manualRoot = argv.get("manual-root") || "";

const textTypes = new Set([
  "text/html; charset=utf-8",
  "text/javascript; charset=utf-8",
  "application/json; charset=utf-8",
  "text/css; charset=utf-8",
]);

function parseList(value) {
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function selectBenchmarks(value) {
  if (value === "all") return benchmarkDefinitions;
  const wanted = new Set(parseList(value));
  return benchmarkDefinitions.filter((benchmark) => wanted.has(benchmark.name));
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

const gitBlobCache = new Map();

function readGitBlob(ref, file) {
  const key = `${ref}:${file}`;
  if (gitBlobCache.has(key)) {
    return gitBlobCache.get(key);
  }
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
        const body = await collectRequestBody(request);
        state.uploads.push(body);
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
        buffer = mode === "manual"
          ? readManualAsset("dist/js/gl2gpu.js")
          : fs.readFileSync(path.join(releaseRoot, "gl2gpu.js"));
      } else if (pathname === "/js/shaders_info.json") {
        state.shaderDbRequests++;
        if (mode !== "manual") {
          state.missing.push(pathname);
          sendBuffer(response, 404, Buffer.from("shader DB disabled for tint mode"), "text/plain; charset=utf-8");
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
        }
      } else if (pathname.startsWith("/images/")) {
        const file = safeStaticPath(imagesRoot, pathname.slice("/images/".length));
        if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
          buffer = fs.readFileSync(file);
          type = contentType(file);
        }
      } else {
        const file = safeStaticPath(webgpuRoot, pathname);
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
  return {
    server,
    state,
    baseURL: `http://127.0.0.1:${address.port}`,
  };
}

function benchmarkObjects(benchmark) {
  const globalOverride = argv.get("objects");
  const specificOverride = argv.get(benchmark.objectsOption);
  return Number(specificOverride || globalOverride || benchmark.defaultObjects);
}

function benchmarkURL(baseURL, benchmark, mode, trial) {
  const url = new URL(benchmark.route, baseURL);
  url.searchParams.set("numObjects", String(benchmarkObjects(benchmark)));
  url.searchParams.set("maxFrames", String(maxFrames));
  url.searchParams.set("turbo", String(turbo));
  url.searchParams.set("id", `paper-${mode}-${benchmark.name}-${trial}`);
  return url.href;
}

function extractJsonObjects(text) {
  const objects = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "{") continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let j = i; j < text.length; j++) {
      const ch = text[j];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === "\\") {
          escaped = true;
        } else if (ch === "\"") {
          inString = false;
        }
        continue;
      }
      if (ch === "\"") {
        inString = true;
      } else if (ch === "{") {
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0) {
          try {
            objects.push(JSON.parse(text.slice(i, j + 1)));
          } catch (_) {
          }
          i = j;
          break;
        }
      }
    }
  }
  return objects;
}

function aggregateOptimizerStats(stats) {
  const aggregate = {
    optimizeTintWgsl: stats.some((item) => item && item.optimizeTintWgsl),
    loweredPrivateVars: 0,
    removedTemporaries: 0,
    foldedConstructors: 0,
    skippedPasses: [],
  };
  const skipped = new Set();
  for (const item of stats) {
    if (!item) continue;
    aggregate.loweredPrivateVars += Number(item.loweredPrivateVars || 0);
    aggregate.removedTemporaries += Number(item.removedTemporaries || 0);
    aggregate.foldedConstructors += Number(item.foldedConstructors || 0);
    for (const reason of item.skippedPasses || []) {
      skipped.add(reason);
    }
  }
  aggregate.skippedPasses = Array.from(skipped).sort();
  return aggregate;
}

function summarizeFrameTimes(frameTimes) {
  const values = frameTimes.filter((value) => Number.isFinite(value) && value > 0);
  if (values.length === 0) {
    return { count: 0, averageMs: null, medianMs: null, fps: null };
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
    fps: 1000 / averageMs,
  };
}

async function captureCanvasImage(page) {
  return page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll("canvas"))
      .filter((canvas) => canvas.width > 0 && canvas.height > 0)
      .sort((a, b) => (b.width * b.height) - (a.width * a.height));
    const canvas = canvases[0];
    if (!canvas) {
      return { error: "no canvas" };
    }
    const width = canvas.width;
    const height = canvas.height;
    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;
    const context = offscreen.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return { error: "2d context unavailable" };
    }
    context.drawImage(canvas, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < pixels.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, pixels.subarray(i, i + chunkSize));
    }
    return {
      width,
      height,
      data: btoa(binary),
    };
  }).catch((error) => ({ error: error.message || String(error) }));
}

function decodeImageData(image) {
  if (!image || image.error || !image.data) {
    return null;
  }
  return {
    width: image.width,
    height: image.height,
    bytes: Buffer.from(image.data, "base64"),
  };
}

function normalizedRmse(aImage, bImage) {
  const a = decodeImageData(aImage);
  const b = decodeImageData(bImage);
  if (!a || !b) return null;
  if (a.width !== b.width || a.height !== b.height || a.bytes.length !== b.bytes.length) return null;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < a.bytes.length; i += 4) {
    const dr = a.bytes[i] - b.bytes[i];
    const dg = a.bytes[i + 1] - b.bytes[i + 1];
    const db = a.bytes[i + 2] - b.bytes[i + 2];
    sum += dr * dr + dg * dg + db * db;
    count += 3;
  }
  return Math.sqrt(sum / count) / 255;
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
  const optimizerStats = [];
  const hardFailurePatterns = [
    /validation error/i,
    /shader translation failed/i,
    /Shader not found in shaderDB/i,
    /Runtime shader translation failed/i,
  ];
  if (mode === "tint") {
    hardFailurePatterns.push(/not implemented/i, /unsupported/i);
  }

  page.on("console", (message) => {
    const text = message.text();
    if (text.includes("\"optimizer\"")) {
      for (const object of extractJsonObjects(text)) {
        if (object.optimizer) {
          optimizerStats.push(object.optimizer);
        }
      }
    }
    if (messages.length < 300) {
      messages.push({ type: message.type(), text: text.slice(0, 2000) });
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message || String(error)));
  page.on("requestfailed", (request) => {
    requestFailures.push({
      url: request.url(),
      failure: request.failure() ? request.failure().errorText : "unknown",
    });
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400) {
      badResponses.push({ url: response.url(), status });
    }
  });
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss().catch(() => {});
  });

  await page.addInitScript(() => {
    window.__PAPER_BENCH = { alerts: [] };
    window.alert = (message) => {
      window.__PAPER_BENCH.alerts.push(String(message));
    };
    window.addEventListener("unhandledrejection", (event) => {
      console.error("[unhandledrejection]", event.reason && (event.reason.stack || event.reason.message || event.reason));
    });
  });

  const url = benchmarkURL(baseURL, benchmark, mode, trial);
  let timeout = false;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.waitForFunction(() => Array.isArray(window.frameTimes), null, { timeout: 15000 });
    await page.waitForFunction(() => {
      return Array.isArray(window.frameTimes) &&
        Number.isFinite(window.maxFrames) &&
        window.frameTimes.length >= window.maxFrames;
    }, null, { timeout: timeoutMs });
    await page.waitForTimeout(250);
  } catch (error) {
    timeout = true;
    pageErrors.push(error.message || String(error));
  }

  const frameData = await page.evaluate(() => {
    const allFrameTimes = Array.isArray(window.frameTimes) ? window.frameTimes.slice() : [];
    const limit = Number.isFinite(window.maxFrames) ? window.maxFrames : allFrameTimes.length;
    return {
      frameTimes: allFrameTimes.slice(0, limit),
      maxFrames: window.maxFrames || null,
      alerts: window.__PAPER_BENCH ? window.__PAPER_BENCH.alerts : [],
      href: window.location.href,
    };
  }).catch((error) => ({ frameTimes: [], error: error.message || String(error) }));

  const screenshot = path.join(outputRoot, `${mode}-${benchmark.name}-trial-${trial}.png`);
  await page.screenshot({ path: screenshot }).catch((error) => {
    pageErrors.push(`screenshot: ${error.message || error}`);
  });
  const image = await captureCanvasImage(page);

  await page.close().catch(() => {});
  await context.close().catch(() => {});
  await new Promise((resolve) => server.close(resolve));

  const frameSummary = summarizeFrameTimes(frameData.frameTimes || []);
  const hardFailures = [
    ...pageErrors,
    ...messages.map((message) => message.text),
  ].filter((text) => hardFailurePatterns.some((pattern) => pattern.test(text)));

  return {
    benchmark: benchmark.name,
    mode,
    trial,
    objects: benchmarkObjects(benchmark),
    maxFrames,
    timeout,
    url,
    frameSummary,
    shaderDbRequests: state.shaderDbRequests,
    uploadCount: state.uploads.length,
    missingRequests: state.missing.slice(0, 50),
    optimizer: aggregateOptimizerStats(optimizerStats),
    pageErrors,
    requestFailures,
    badResponses,
    dialogs,
    hardFailures: hardFailures.slice(0, 50),
    messages,
    screenshot,
    image,
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
      rmse: null,
      pass: true,
      reasons: [],
    };

    for (const mode of selectedModes) {
      const perMode = perBenchmark.filter((result) => result.mode === mode);
      const medianFps = median(perMode.map((result) => result.frameSummary.fps));
      const shaderDbRequests = perMode.reduce((sum, result) => sum + result.shaderDbRequests, 0);
      const hardFailures = perMode.flatMap((result) => result.hardFailures);
      const timeouts = perMode.filter((result) => result.timeout).length;
      const optimizer = aggregateOptimizerStats(perMode.map((result) => result.optimizer));
      row.modes[mode] = {
        medianFps,
        shaderDbRequests,
        hardFailureCount: hardFailures.length,
        timeouts,
        optimizer,
      };
      if (mode === "tint" && shaderDbRequests !== 0) {
        row.pass = false;
        row.reasons.push("tint requested shader DB");
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
      if (row.tintVsManualFpsRatio < threshold) {
        row.pass = false;
        row.reasons.push(`Tint FPS ratio ${row.tintVsManualFpsRatio.toFixed(3)} < ${threshold}`);
      }
    }

    const rmses = [];
    for (let trial = 1; trial <= trials; trial++) {
      const tint = perBenchmark.find((result) => result.mode === "tint" && result.trial === trial);
      const manual = perBenchmark.find((result) => result.mode === "manual" && result.trial === trial);
      if (!tint || !manual) continue;
      const value = normalizedRmse(tint.image, manual.image);
      if (Number.isFinite(value)) {
        rmses.push(value);
      }
    }
    row.rmse = median(rmses);
    if (selectedModes.includes("tint") && selectedModes.includes("manual")) {
      if (!Number.isFinite(row.rmse)) {
        row.pass = false;
        row.reasons.push("RMSE unavailable");
      } else if (row.rmse > rmseThreshold) {
        row.pass = false;
        row.reasons.push(`RMSE ${row.rmse.toFixed(4)} > ${rmseThreshold}`);
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
      return await chromium.launch({ ...attempt, args });
    } catch (error) {
      lastError = error;
      console.warn(`[launch] ${attempt.executablePath} ${attempt.headless ? "headless" : "headed"} failed: ${error.message || error}`);
    }
  }
  throw lastError || new Error("No usable Chromium executable found");
}

function printSummary(summary) {
  for (const row of summary) {
    const tint = row.modes.tint;
    const manual = row.modes.manual;
    const tintFps = tint && Number.isFinite(tint.medianFps) ? tint.medianFps.toFixed(3) : "n/a";
    const manualFps = manual && Number.isFinite(manual.medianFps) ? manual.medianFps.toFixed(3) : "n/a";
    const ratio = Number.isFinite(row.tintVsManualFpsRatio) ? row.tintVsManualFpsRatio.toFixed(3) : "n/a";
    const rmse = Number.isFinite(row.rmse) ? row.rmse.toFixed(5) : "n/a";
    console.log(`${row.pass ? "PASS" : "FAIL"} ${row.benchmark}: tint=${tintFps}fps manual=${manualFps}fps ratio=${ratio} rmse=${rmse}`);
    if (tint && tint.optimizer) {
      const opt = tint.optimizer;
      console.log(`  optimizer lowered=${opt.loweredPrivateVars} temps=${opt.removedTemporaries} folds=${opt.foldedConstructors} skipped=${opt.skippedPasses.join("|") || "none"}`);
    }
    for (const reason of row.reasons) {
      console.log(`  - ${reason}`);
    }
  }
}

async function main() {
  assertReadable(path.join(releaseRoot, "gl2gpu.js"));
  assertReadable(path.join(releaseRoot, "glslang.wasm"));
  assertReadable(path.join(releaseRoot, "tint_wasm.wasm"));
  assertReadable(path.join(jsRoot, "setup.js"));
  assertReadable(imagesRoot);
  if (selectedModes.includes("manual") && manualRoot) {
    assertReadable(path.join(manualRoot, "dist/js/gl2gpu.js"));
    assertReadable(path.join(manualRoot, "dist/js/shaders_info.json"));
  }

  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });

  const browser = await launchBrowser();
  const results = [];
  try {
    for (const benchmark of selectedBenchmarks) {
      for (const mode of selectedModes) {
        for (let trial = 1; trial <= trials; trial++) {
          console.log(`[${mode}] ${benchmark.name} trial ${trial}/${trials} objects=${benchmarkObjects(benchmark)} frames=${maxFrames}`);
          const result = await runTrial(browser, benchmark, mode, trial);
          results.push(result);
          const fps = Number.isFinite(result.frameSummary.fps) ? result.frameSummary.fps.toFixed(3) : "n/a";
          console.log(`  fps=${fps} frames=${result.frameSummary.count} shaderDbRequests=${result.shaderDbRequests} hardFailures=${result.hardFailures.length}`);
        }
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const summary = createSummary(results);
  const report = {
    generatedAt: new Date().toISOString(),
    modes: selectedModes,
    benchmarks: selectedBenchmarks.map((benchmark) => ({
      name: benchmark.name,
      route: benchmark.route,
      objects: benchmarkObjects(benchmark),
    })),
    trials,
    maxFrames,
    threshold,
    rmseThreshold,
    manualRef: manualRoot ? null : manualRef,
    manualRoot: manualRoot || null,
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
