#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const path = require("path");
const { execFileSync } = require("child_process");

const EXPECTED_CTS_COMMIT = "064aaf18207438d4f6dd10c98b02b25778257b7f";
const repoRoot = path.resolve(__dirname, "..");
const distRoot = path.join(repoRoot, "dist", "release");
const defaultTestsFile = path.join(__dirname, "webgl-cts-smoke-tests.txt");
const outputRoot = path.join(repoRoot, "output", "webgl-cts-smoke");

const argv = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const argument = process.argv[i];
  if (!argument.startsWith("--")) continue;
  const key = argument.slice(2);
  const value = process.argv[i + 1];
  if (value && !value.startsWith("--")) {
    argv.set(key, value);
    i++;
  } else {
    argv.set(key, "true");
  }
}

if (argv.get("headless") === "true") {
  throw new Error("The WebGL CTS harness only runs in headed Chrome.");
}

function loadPlaywright() {
  for (const candidate of [
    () => require("playwright"),
    () => require("/Volumes/Code/2-9.playwright/node_modules/playwright"),
  ]) {
    try {
      return candidate();
    } catch (_) {
    }
  }
  throw new Error("Playwright is unavailable.");
}

function contentType(filePath) {
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".wasm": "application/wasm",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".txt": "text/plain; charset=utf-8",
  }[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function parseScriptType(attributes) {
  const match = /\btype\s*=\s*(["'])([^"']+)\1/i.exec(attributes);
  return match ? match[2].toLowerCase() : "";
}

function isExecutableScript(attributes) {
  const type = parseScriptType(attributes);
  const languageMatch = /\blanguage\s*=\s*(["'])([^"']+)\1/i.exec(attributes);
  const language = languageMatch ? languageMatch[2].toLowerCase() : "";
  if (language && !/^(?:java|ecma)script$/.test(language)) return false;
  return !type || [
    "text/javascript",
    "application/javascript",
    "text/ecmascript",
    "application/ecmascript",
    "module",
  ].includes(type);
}

function escapeAttribute(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function delayedBodyScripts(html) {
  const body = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  if (!body) return { html, dynamicContexts: 0, dynamicCanvases: 0 };
  let dynamicContexts = 0;
  let dynamicCanvases = 0;
  const rewrittenBody = body[1].replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (full, attributes, source) => {
    if (!isExecutableScript(attributes)) return full;
    const srcMatch = /\bsrc\s*=\s*(["'])([^"']+)\1/i.exec(attributes);
    let code = srcMatch ? "" : source;
    dynamicContexts += (code.match(/\bcreate3DContext\s*\(\s*\)/g) || []).length;
    code = code.replace(/\bdocument\.createElement\s*\(\s*(["'])canvas\1\s*\)/g, () => {
      dynamicCanvases++;
      return "window.__GL2GPU_CTS_CREATE_CANVAS()";
    });
    const src = srcMatch ? ` data-gl2gpu-src="${escapeAttribute(srcMatch[2])}"` : "";
    return `<script type="application/x-gl2gpu-delayed"${src}>${code}</script>`;
  });
  return {
    html: html.slice(0, body.index) + body[0].replace(body[1], rewrittenBody) + html.slice(body.index + body[0].length),
    dynamicContexts,
    dynamicCanvases,
  };
}

function bootScript(dynamicContexts, dynamicCanvases) {
  return `
<script>
window.__GL2GPU_CTS_RESULT = { ready: false, finished: false, passes: [], failures: [], bootError: null };
window.addEventListener("DOMContentLoaded", async () => {
  const result = window.__GL2GPU_CTS_RESULT;
  try {
    if (!window.GL2GPU) throw new Error("GL2GPU bundle was not loaded");
    const nativeGetContext = HTMLCanvasElement.prototype.getContext;
    const contextMap = new WeakMap();
    const contexts = [];
    async function prepare(canvas) {
      const context = await GL2GPU.gl2gpuGetContext(
        canvas,
        null,
        ["webgl", {}],
        [1 << 21, 0],
        { optimizeTintWgsl: true, legacyTextureCoordinateFixups: false }
      );
      contextMap.set(canvas, context);
      if (context.canvas && context.canvas !== canvas) contextMap.set(context.canvas, context);
      contexts.push(context);
      return context;
    }
    const declaredCanvases = Array.from(document.querySelectorAll("canvas"));
    await Promise.all(declaredCanvases.map(prepare));
    const contextPool = [];
    for (let i = 0; i < ${Math.min(8, Math.max(4, dynamicContexts))}; i++) {
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      canvas.style.display = "none";
      document.body.appendChild(canvas);
      contextPool.push(await prepare(canvas));
    }
    const canvasPool = [];
    for (let i = 0; i < ${dynamicCanvases > 0 ? 8 : 0}; i++) {
      const canvas = document.createElement("canvas");
      canvas.style.display = "none";
      document.body.appendChild(canvas);
      await prepare(canvas);
      canvasPool.push(canvas);
    }
    window.__GL2GPU_CTS_CREATE_CANVAS = function() {
      const canvas = canvasPool.shift();
      if (!canvas) throw new Error("CTS dynamic canvas pool exhausted");
      return canvas;
    };
    HTMLCanvasElement.prototype.getContext = function(type, attributes) {
      if (type === "webgl" || type === "experimental-webgl" || type === "webgl2") {
        const context = contextMap.get(this);
        if (!context) throw new Error("CTS requested an unprepared WebGL canvas");
        return context;
      }
      return nativeGetContext.call(this, type, attributes);
    };
    const originalCreate3DContext = window.WebGLTestUtils && WebGLTestUtils.create3DContext;
    if (originalCreate3DContext) {
      WebGLTestUtils.create3DContext = function(canvas, attributes, version) {
        if (canvas === undefined || canvas === null) {
          return contextPool.shift() || null;
        }
        return originalCreate3DContext.call(this, canvas, attributes, version);
      };
    }
    const originalPassed = window.testPassed;
    const originalFailed = window.testFailed;
    const originalFinished = window.notifyFinishedToHarness;
    window.testPassed = function(message) {
      result.passes.push(String(message));
      return originalPassed.apply(this, arguments);
    };
    window.testFailed = function(message) {
      result.failures.push(String(message));
      return originalFailed.apply(this, arguments);
    };
    window.notifyFinishedToHarness = function() {
      result.finished = true;
      return originalFinished.apply(this, arguments);
    };
    window.addEventListener("error", (event) => {
      result.failures.push("Uncaught test error: " + (event.error && (event.error.stack || event.error.message) || event.message));
      result.finished = true;
    });
    window.addEventListener("unhandledrejection", (event) => {
      result.failures.push("Unhandled test rejection: " + (event.reason && (event.reason.stack || event.reason.message) || event.reason));
      result.finished = true;
    });
    result.ready = true;
    for (const script of document.querySelectorAll('script[type="application/x-gl2gpu-delayed"]')) {
      const executable = document.createElement("script");
      const src = script.getAttribute("data-gl2gpu-src");
      if (src) {
        executable.src = new URL(src, location.href).href;
        executable.async = false;
        const loaded = new Promise((resolve, reject) => {
          executable.addEventListener("load", resolve, { once: true });
          executable.addEventListener("error", () => reject(new Error("Unable to load delayed script: " + executable.src)), { once: true });
        });
        document.body.appendChild(executable);
        await loaded;
      } else {
        executable.textContent = script.textContent || "";
        document.body.appendChild(executable);
      }
    }
  } catch (error) {
    result.bootError = String(error && (error.stack || error.message) || error);
    result.finished = true;
  }
}, { once: true });
</script>`;
}

function transformHtml(source) {
  const clean = source.replace(/<meta[^>]+http-equiv\s*=\s*(["'])Content-Security-Policy\1[^>]*>/gi, "");
  const delayed = delayedBodyScripts(clean);
  const bundle = '<script src="/__gl2gpu/gl2gpu.js"></script>';
  let html = /<head\b[^>]*>/i.test(delayed.html)
    ? delayed.html.replace(/<head([^>]*)>/i, `<head$1>\n${bundle}`)
    : `${bundle}\n${delayed.html}`;
  const boot = bootScript(delayed.dynamicContexts, delayed.dynamicCanvases);
  html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${boot}\n</body>`) : `${html}\n${boot}`;
  return html;
}

function safePath(root, pathname) {
  const relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  const resolved = path.resolve(root, relative);
  return resolved === root || resolved.startsWith(`${root}${path.sep}`) ? resolved : null;
}

async function startServer(ctsTestsRoot) {
  const localAssets = new Map([
    ["/__gl2gpu/gl2gpu.js", path.join(distRoot, "gl2gpu.js")],
    ["/__gl2gpu/glslang.wasm", path.join(distRoot, "glslang.wasm")],
    ["/__gl2gpu/tint_wasm.wasm", path.join(distRoot, "tint_wasm.wasm")],
  ]);
  const server = http.createServer((request, response) => {
    try {
      const url = new URL(request.url, "http://127.0.0.1");
      let filePath = localAssets.get(url.pathname) || safePath(ctsTestsRoot, url.pathname);
      if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }
      let body = fs.readFileSync(filePath);
      if (path.extname(filePath).toLowerCase() === ".html") {
        body = Buffer.from(transformHtml(body.toString("utf8")), "utf8");
      }
      response.writeHead(200, { "content-type": contentType(filePath), "cache-control": "no-store" });
      response.end(body);
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end(error.stack || error.message || String(error));
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

async function launchHeadedChrome(chromium) {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Users/hanyd/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  ].filter((candidate, index, all) => candidate && fs.existsSync(candidate) && all.indexOf(candidate) === index);
  let lastError;
  for (const executablePath of candidates) {
    try {
      const browser = await chromium.launch({
        executablePath,
        headless: false,
        args: ["--enable-unsafe-webgpu", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
      });
      return { browser, executablePath };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("No headed Chrome executable is available");
}

function loadTests() {
  if (argv.has("tests")) {
    return argv.get("tests").split(",").map((value) => value.trim()).filter(Boolean);
  }
  const testsFile = path.resolve(argv.get("tests-file") || defaultTestsFile);
  return fs.readFileSync(testsFile, "utf8")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter((value) => value && !value.startsWith("#"));
}

async function main() {
  const ctsRoot = path.resolve(argv.get("cts-root") || process.env.WEBGL_CTS_ROOT || "/tmp/gl2gpu-webgl-cts");
  const ctsTestsRoot = path.join(ctsRoot, "sdk", "tests");
  if (!fs.existsSync(ctsTestsRoot)) {
    throw new Error(`WebGL CTS checkout not found at ${ctsRoot}`);
  }
  const ctsCommit = execFileSync("git", ["-C", ctsRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  if (ctsCommit !== EXPECTED_CTS_COMMIT && argv.get("allow-cts-commit") !== ctsCommit) {
    throw new Error(`Expected WebGL CTS ${EXPECTED_CTS_COMMIT}, found ${ctsCommit}. Pass --allow-cts-commit ${ctsCommit} to run intentionally.`);
  }
  fs.mkdirSync(outputRoot, { recursive: true });
  const tests = loadTests();
  const timeoutMs = Number(argv.get("timeout-ms") || 45000);
  const { chromium } = loadPlaywright();
  const launched = await launchHeadedChrome(chromium);
  const server = await startServer(ctsTestsRoot);
  const results = [];
  try {
    for (const test of tests) {
      const page = await launched.browser.newPage({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 });
      const consoleErrors = [];
      const pageErrors = [];
      page.on("console", (message) => {
        const text = message.text();
        if (message.type() === "error" || /GPUValidationError|Runtime shader translation failed|unsupported|not implemented/i.test(text)) {
          consoleErrors.push(text.slice(0, 4000));
        }
      });
      page.on("pageerror", (error) => pageErrors.push(String(error.stack || error.message || error).slice(0, 4000)));
      const started = Date.now();
      let state;
      let timedOut = false;
      try {
        await page.goto(`${server.baseUrl}/${test}`, { waitUntil: "load", timeout: timeoutMs });
        await page.waitForFunction(() => window.__GL2GPU_CTS_RESULT && window.__GL2GPU_CTS_RESULT.finished, null, { timeout: timeoutMs });
        state = await page.evaluate(() => window.__GL2GPU_CTS_RESULT);
      } catch (error) {
        timedOut = /Timeout/i.test(String(error));
        state = await page.evaluate(() => window.__GL2GPU_CTS_RESULT || null).catch(() => null);
        pageErrors.push(String(error.stack || error.message || error).slice(0, 4000));
      }
      const name = test.replace(/[^A-Za-z0-9_.-]+/g, "_");
      await page.screenshot({ path: path.join(outputRoot, `${name}.png`), fullPage: true }).catch(() => {});
      const result = {
        test,
        valid: Boolean(state && state.finished && !state.bootError && state.failures.length === 0 && pageErrors.length === 0),
        durationMs: Date.now() - started,
        timedOut,
        state,
        consoleErrors,
        pageErrors,
      };
      results.push(result);
      console.log(`[cts] ${result.valid ? "PASS" : "FAIL"} ${test} (${result.durationMs} ms, ${state ? state.failures.length : "no"} failures)`);
      await page.close();
    }
  } finally {
    await launched.browser.close();
    await new Promise((resolve) => server.server.close(resolve));
  }
  const report = {
    generatedAt: new Date().toISOString(),
    headed: true,
    chrome: launched.executablePath,
    ctsRoot,
    ctsCommit,
    expectedCtsCommit: EXPECTED_CTS_COMMIT,
    gl2gpuCommit: execFileSync("git", ["-C", repoRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    summary: {
      total: results.length,
      passed: results.filter((result) => result.valid).length,
      failed: results.filter((result) => !result.valid).length,
    },
    results,
  };
  fs.writeFileSync(path.join(outputRoot, "results.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[cts] ${report.summary.passed}/${report.summary.total} passed; ${path.join(outputRoot, "results.json")}`);
  process.exitCode = report.summary.failed === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
