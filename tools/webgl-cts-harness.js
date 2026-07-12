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
const captureConsole = argv.get("capture-console") === "true";
const suiteName = argv.get("suite") || "manifest";
const officialVersion = argv.get("version") || "2.0.1";

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
    ".svg": "image/svg+xml",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".ogv": "video/ogg",
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
  const body = /<body\b([^>]*)>([\s\S]*?)<\/body>/i.exec(html);
  if (!body) return { html, bodyOnload: "" };
  const onloadMatch = /\sonload\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(body[1]);
  const bodyOnload = onloadMatch ? (onloadMatch[1] || onloadMatch[2] || onloadMatch[3] || "") : "";
  const bodyAttributes = onloadMatch
    ? body[1].slice(0, onloadMatch.index) + body[1].slice(onloadMatch.index + onloadMatch[0].length)
    : body[1];
  const rewriteScripts = (sourceHtml) => sourceHtml.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (full, attributes, source) => {
    if (!isExecutableScript(attributes)) return full;
    const srcMatch = /\bsrc\s*=\s*(["'])([^"']+)\1/i.exec(attributes);
    const code = srcMatch ? "" : source;
    const src = srcMatch ? ` data-gl2gpu-src="${escapeAttribute(srcMatch[2])}"` : "";
    return `<script type="application/x-gl2gpu-delayed"${src}>${code}</script>`;
  });
  const rewrittenBody = rewriteScripts(body[2]);
  const rewritten = `<body${bodyAttributes}>${rewrittenBody}</body>`;
  const tailStart = body.index + body[0].length;
  const head = html.slice(0, body.index);
  const delayHeadScripts = /<script\b[^>]*\bsrc\s*=\s*(["'])[^"']*unit\.js(?:[?#][^"']*)?\1/i.test(head);
  return {
    html: (delayHeadScripts ? rewriteScripts(head) : head) + rewritten + rewriteScripts(html.slice(tailStart)),
    bodyOnload,
  };
}

function bootScript(bodyOnload) {
  return `
<script>
window.__GL2GPU_CTS_RESULT = { ready: false, finished: false, passes: [], failures: [], shaders: [], bootError: null };
window.__HYD_DEBUG_READBACK = ${argv.get("debug-readback") === "true"};
window.__HYD_DEBUG_TEXTURE_UPLOAD = ${argv.get("debug-texture-upload") === "true"};
if (${argv.get("capture-shaders") === "true"}) {
  window.__HYD_SHADER_CAPTURE = function(record) {
    window.__GL2GPU_CTS_RESULT.shaders.push(record);
  };
}
window.addEventListener("DOMContentLoaded", async () => {
  const result = window.__GL2GPU_CTS_RESULT;
  try {
    if (!window.GL2GPU) throw new Error("GL2GPU bundle was not loaded");
    const nativeGetContext = HTMLCanvasElement.prototype.getContext;
    const runtime = await GL2GPU.gl2gpuCreateRuntime({
      optimizeTintWgsl: true,
      legacyTextureCoordinateFixups: false
    });
    const contextMap = new WeakMap();
    const contextTypes = new WeakMap();
    HTMLCanvasElement.prototype.getContext = function(type, attributes) {
      if (type === "webgl" || type === "experimental-webgl" || type === "webgl2") {
        const normalizedType = type === "webgl2" ? "webgl2" : "webgl";
        const existing = contextMap.get(this);
        if (existing) return contextTypes.get(this) === normalizedType ? existing : null;
        const gpuContext = nativeGetContext.call(this, "webgpu");
        if (!gpuContext) return null;
        const context = GL2GPU.gl2gpuCreateContext(
          runtime,
          this,
          null,
          [normalizedType, attributes || {}],
          [1 << 21, 0],
          gpuContext
        );
        if (${argv.get("debug-api") === "true"}) {
          result.apiDebug = {
            keys: Object.keys(context).slice(0, 400),
            colorBufferBit: context.COLOR_BUFFER_BIT,
            activeTextureType: typeof context.activeTexture,
            canvasMatches: context.canvas === this
          };
        }
        contextMap.set(this, context);
        contextTypes.set(this, normalizedType);
        if (context.canvas && context.canvas !== this) {
          contextMap.set(context.canvas, context);
          contextTypes.set(context.canvas, normalizedType);
        }
        return context;
      }
      return nativeGetContext.call(this, type, attributes);
    };
    const installResultHooks = () => {
      const wrap = (name, callback) => {
        const original = window[name];
        if (typeof original !== "function" || original.__gl2gpuResultHook) return;
        const wrapped = function() {
          callback(arguments);
          return original.apply(this, arguments);
        };
        wrapped.__gl2gpuResultHook = true;
        window[name] = wrapped;
      };
      wrap("testPassed", args => result.passes.push(Array.from(args, String).join(" | ")));
      wrap("testFailed", args => result.failures.push(Array.from(args, String).join(" | ")));
      wrap("notifyFinishedToHarness", () => { result.finished = true; });
    };
    installResultHooks();
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
      installResultHooks();
    }
    installResultHooks();
    const bodyOnload = ${JSON.stringify(bodyOnload)};
    if (bodyOnload) {
      Function(bodyOnload).call(document.body);
    }
    window.dispatchEvent(new Event("load"));
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
  const boot = bootScript(delayed.bodyOnload);
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

function versionAtLeast(have, want) {
  const haveParts = String(have).split(" ")[0].split(".").map(Number);
  const wantParts = String(want).split(" ")[0].split(".").map(Number);
  for (let index = 0; index < wantParts.length; index++) {
    const havePart = haveParts[index] || 0;
    const wantPart = wantParts[index] || 0;
    if (havePart !== wantPart) return havePart > wantPart;
  }
  return true;
}

function loadOfficialTests(ctsTestsRoot) {
  const tests = [];
  const visit = (relativeListPath, inherited = { minVersion: "1.0", maxVersion: null, slow: false }) => {
    const listPath = path.join(ctsTestsRoot, relativeListPath);
    const prefix = path.posix.dirname(relativeListPath);
    const lines = fs.readFileSync(listPath, "utf8").split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#") || line.startsWith(";") || line.startsWith("//")) continue;
      const tokens = line.split(/\s+/);
      const options = { ...inherited };
      const paths = [];
      for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];
        if (token === "--slow") {
          options.slow = true;
        } else if (token === "--min-version") {
          options.minVersion = tokens[++index];
        } else if (token === "--max-version") {
          options.maxVersion = tokens[++index];
        } else if (token.startsWith("--")) {
          throw new Error(`Unsupported CTS list option ${token} in ${relativeListPath}`);
        } else {
          paths.push(token);
        }
      }
      const relativePath = path.posix.normalize(path.posix.join(prefix === "." ? "" : prefix, paths.join(" ")));
      if (relativePath.endsWith(".txt")) {
        visit(relativePath, options);
        continue;
      }
      const included = versionAtLeast(officialVersion, options.minVersion || "1.0") &&
        (!options.maxVersion || versionAtLeast(options.maxVersion, officialVersion));
      if (included) tests.push(relativePath);
    }
  };
  visit("00_test_list.txt");
  return tests;
}

function selectTestRange(tests) {
  const shardCount = Math.max(1, Number(argv.get("shard-count") || 1));
  const shardIndex = Number(argv.get("shard-index") || 0);
  if (!Number.isInteger(shardIndex) || shardIndex < 0 || shardIndex >= shardCount) {
    throw new Error(`Invalid shard ${shardIndex}/${shardCount}`);
  }
  let selected = shardCount === 1 ? tests : tests.filter((_, index) => index % shardCount === shardIndex);
  const start = Math.max(0, Number(argv.get("start") || 0));
  const limit = argv.has("limit") ? Math.max(0, Number(argv.get("limit"))) : selected.length;
  selected = selected.slice(start, start + limit);
  return selected;
}

function loadTests(ctsTestsRoot) {
  if (argv.has("tests")) {
    return argv.get("tests").split(",").map((value) => value.trim()).filter(Boolean);
  }
  if (suiteName === "official") {
    return selectTestRange(loadOfficialTests(ctsTestsRoot));
  }
  if (suiteName !== "manifest") throw new Error(`Unsupported suite ${suiteName}`);
  const testsFile = path.resolve(argv.get("tests-file") || defaultTestsFile);
  return fs.readFileSync(testsFile, "utf8")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter((value) => value && !value.startsWith("#"));
}

function isBenignConsoleError(message) {
  return /^Failed to load resource: the server responded with a status of 404 \(Not Found\)$/i.test(message);
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
  const tests = loadTests(ctsTestsRoot);
  if (argv.get("list-only") === "true") {
    console.log(JSON.stringify({ suite: suiteName, version: officialVersion, total: tests.length, tests }, null, 2));
    return;
  }
  const timeoutMs = Number(argv.get("timeout-ms") || 45000);
  const restartEvery = Math.max(0, Number(argv.get("restart-every") || 100));
  const { chromium } = loadPlaywright();
  let launched = await launchHeadedChrome(chromium);
  const chromeExecutablePath = launched.executablePath;
  const server = await startServer(ctsTestsRoot);
  const results = [];
  try {
    for (let testIndex = 0; testIndex < tests.length; testIndex++) {
      if (testIndex > 0 && restartEvery > 0 && testIndex % restartEvery === 0) {
        await launched.browser.close();
        launched = await launchHeadedChrome(chromium);
      }
      const test = tests[testIndex];
      const page = await launched.browser.newPage({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 });
      const consoleErrors = [];
      const consoleMessages = [];
      const pageErrors = [];
      page.on("console", (message) => {
        const text = message.text();
        if (captureConsole && consoleMessages.length < 1000) {
          consoleMessages.push({ type: message.type(), text: text.slice(0, 12000) });
        }
        if (message.type() === "error" || /GPUValidationError|Runtime shader translation failed|\[HYD\] WebGPU uncaptured error|not implemented/i.test(text)) {
          consoleErrors.push(text.slice(0, 4000));
        }
      });
      page.on("pageerror", (error) => pageErrors.push(String(error.stack || error.message || error).slice(0, 4000)));
      const started = Date.now();
      let state;
      let timedOut = false;
      const captureState = () => page.evaluate(() => {
        const state = window.__GL2GPU_CTS_RESULT;
        if (!state) return null;
        const testLog = document.getElementById("console")?.innerText || "";
        const harnessResults = window.RESULTS;
        const failureLines = testLog
          .split(/\r?\n/)
          .filter((line) => line.startsWith("FAIL "))
          .map((line) => line.slice(5));
        const failures = state.failures.length > 0
          ? state.failures
          : failureLines.length > 0
            ? failureLines
            : harnessResults && harnessResults.fail > 0
              ? [`${harnessResults.fail} Khronos harness failure(s)`]
              : [];
        return {
          ...state,
          finished: Boolean(state.finished || window._didNotifyFinishedToHarness || /(?:^|\n)TEST COMPLETE(?:\n|$)/.test(testLog)),
          failures,
          testLog,
        };
      });
      try {
        const testUrl = new URL(`${server.baseUrl}/${test}`);
        if (suiteName === "official") {
          testUrl.searchParams.set("webglVersion", String(Math.max(1, Number.parseInt(officialVersion, 10) || 1)));
          testUrl.searchParams.set("quiet", "0");
        }
        await page.goto(testUrl.href, { waitUntil: "load", timeout: timeoutMs });
        await page.waitForFunction(() => {
          const state = window.__GL2GPU_CTS_RESULT;
          if (!state) return false;
          const testLog = document.getElementById("console")?.innerText || "";
          return state.finished || window._didNotifyFinishedToHarness || /(?:^|\n)TEST COMPLETE(?:\n|$)/.test(testLog);
        }, null, { timeout: timeoutMs });
        state = await captureState();
      } catch (error) {
        timedOut = /Timeout/i.test(String(error));
        state = await captureState().catch(() => null);
        pageErrors.push(String(error.stack || error.message || error).slice(0, 4000));
      }
      const name = test.replace(/[^A-Za-z0-9_.-]+/g, "_");
      await page.screenshot({ path: path.join(outputRoot, `${name}.png`), fullPage: true }).catch(() => {});
      const hardConsoleErrors = consoleErrors.filter((message) => !isBenignConsoleError(message));
      const result = {
        test,
        valid: Boolean(state && state.finished && !state.bootError && state.failures.length === 0 &&
          pageErrors.length === 0 && hardConsoleErrors.length === 0),
        durationMs: Date.now() - started,
        timedOut,
        state,
        consoleErrors,
        hardConsoleErrors,
        consoleMessages,
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
    suite: suiteName,
    version: suiteName === "official" ? officialVersion : null,
    headed: true,
    chrome: chromeExecutablePath,
    browserRestartEvery: restartEvery,
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
