#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawnSync } = require("child_process");

const origin = "https://webglsamples.org";
const repoRoot = path.resolve(__dirname, "..");
const distRoot = path.join(repoRoot, "dist", "release");
const outputRoot = path.join(repoRoot, "output", "webglsamples");

const samples = [
  ["aquarium", "/aquarium/aquarium.html"],
  ["blob", "/blob/blob.html"],
  ["caves", "/caves/caves.html"],
  ["color-adjust", "/color-adjust/color-adjust.html"],
  ["city", "/city/city.html"],
  ["collectibles", "/collectibles/index.html"],
  ["dynamic-cubemap", "/dynamic-cubemap/dynamic-cubemap.html"],
  ["electricflower", "/electricflower/electricflower.html"],
  ["field", "/field/field.html"],
  ["fishtank", "/fishtank/fishtank.html"],
  ["halo", "/halo/halo.html"],
  ["imagesphere", "/imagesphere/imagesphere.html"],
  ["lots-o-images", "/lots-o-images/index.html"],
  ["lots-o-objects", "/lots-o-objects/index.html"],
  ["multiple-views", "/multiple-views/multiple-views.html"],
  ["persistence", "/persistence/persistence.html"],
  ["spacerocks", "/spacerocks/spacerocks.html"],
  ["sprites", "/sprites/index.html"],
  ["toon-shading", "/toon-shading/toon-shading.html"],
  ["book", "/book/book.html"],
  ["google-io-2011", "/google-io/2011/index.html"],
  ["video", "/video/video.html"],
  ["electroshock", "/electroShock/application.html"],
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

const requestedSamples = argv.get("samples") || "all";
const waitMs = Number(argv.get("wait-ms") || 8000);
const resourceWaitMs = Number(argv.get("resource-wait-ms") || 30000);
const frameCount = Number(argv.get("frames") || 60);
const threshold = Number(argv.get("threshold") || 0.02);

function selectedSamples() {
  if (requestedSamples === "all") return samples;
  const wanted = new Set(requestedSamples.split(",").map((item) => item.trim()).filter(Boolean));
  return samples.filter(([name]) => wanted.has(name));
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

const localAssets = new Map([
  ["/js/gl2gpu.js", path.join(distRoot, "gl2gpu.js")],
  ["/js/glslang.wasm", path.join(distRoot, "glslang.wasm")],
  ["/js/tint_wasm.wasm", path.join(distRoot, "tint_wasm.wasm")],
]);

function deterministicScript() {
  return `
(() => {
  let now = 1000;
  let seed = 0x12345678;
  Math.random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const fixedEpoch = 1700000000000;
  const NativeDate = Date;
  function HarnessDate(...args) {
    if (new.target) {
      return args.length > 0 ? new NativeDate(...args) : new NativeDate(fixedEpoch + Math.floor(now));
    }
    return new NativeDate(fixedEpoch + Math.floor(now)).toString();
  }
  HarnessDate.now = () => fixedEpoch + Math.floor(now);
  HarnessDate.UTC = NativeDate.UTC;
  HarnessDate.parse = NativeDate.parse;
  HarnessDate.prototype = NativeDate.prototype;
  window.Date = HarnessDate;
  if (performance && performance.now) {
    performance.now = () => now;
  }
  const harnessImages = [];
  function trackHarnessImage(image) {
    if (image && !harnessImages.includes(image)) {
      harnessImages.push(image);
      image.addEventListener("error", () => {
        image.__HARNESS_LOAD_ERROR = true;
        const contexts = [];
        if (window.gl && window.gl.tdl && window.gl.tdl.textures) {
          contexts.push(window.gl);
        }
        if (Array.isArray(window.__GL2GPU_HARNESS_CONTEXTS)) {
          contexts.push(...window.__GL2GPU_HARNESS_CONTEXTS);
        }
        for (const context of contexts) {
          const loadingImages = context && context.tdl && context.tdl.textures && context.tdl.textures.loadingImages;
          if (!Array.isArray(loadingImages)) continue;
          const index = loadingImages.indexOf(image);
          if (index >= 0) loadingImages.splice(index, 1);
        }
      });
    }
    return image;
  }
  if (typeof Image === "function") {
    const NativeImage = Image;
    window.Image = function(width, height) {
      return trackHarnessImage(width === undefined ? new NativeImage() : new NativeImage(width, height));
    };
    window.Image.prototype = NativeImage.prototype;
    Object.setPrototypeOf(window.Image, NativeImage);
  }
  const originalCreateElement = Document.prototype.createElement;
  Document.prototype.createElement = function(name, options) {
    const element = options === undefined ?
      originalCreateElement.call(this, name) :
      originalCreateElement.call(this, name, options);
    return String(name).toLowerCase() === "img" ? trackHarnessImage(element) : element;
  };
  window.__HARNESS_PENDING_IMAGES = () => harnessImages
    .filter((image) => !image.__HARNESS_LOAD_ERROR && (!image.complete || image.naturalWidth === 0))
    .map((image) => image.currentSrc || image.src || "")
    .slice(0, 80);
  const originalSetTimeout = window.setTimeout.bind(window);
  const rafCallbacks = new Map();
  let nextRafId = 1;
  window.requestAnimationFrame = (callback) => {
    const id = nextRafId++;
    rafCallbacks.set(id, callback);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    rafCallbacks.delete(id);
  };
  window.__HARNESS_STEP_FRAMES = async (count = 1) => {
    for (let frame = 0; frame < count; frame++) {
      now += 1000 / 60;
      const callbacks = Array.from(rafCallbacks.entries()).sort((a, b) => a[0] - b[0]);
      rafCallbacks.clear();
      for (const [, callback] of callbacks) {
        callback(now);
      }
      await Promise.resolve();
      await new Promise((resolve) => originalSetTimeout(resolve, 0));
    }
    return now;
  };
  window.__HARNESS_PENDING_RAFS = () => rafCallbacks.size;
})();`;
}

function discoveryScript() {
  return `
${deterministicScript()}
(() => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const webglNames = new Set(["webgl", "experimental-webgl", "webgl2"]);
  window.__WEBGL_CONTEXT_REQUESTS = [];
  HTMLCanvasElement.prototype.getContext = function(type, attrs) {
    if (webglNames.has(type)) {
      const canvases = Array.from(document.querySelectorAll("canvas"));
      let index = canvases.indexOf(this);
      if (index < 0) {
        index = canvases.length;
      }
      window.__WEBGL_CONTEXT_REQUESTS.push({
        index,
        type,
        attrs: attrs ? { ...attrs } : null,
        width: this.width,
        height: this.height,
        clientWidth: this.clientWidth,
        clientHeight: this.clientHeight,
      });
    }
    return originalGetContext.call(this, type, attrs);
  };
})();`;
}

function gl2gpuBootScript(discoveredRequests) {
  const webglIndexes = Array.from(new Set(discoveredRequests.map((request) => request.index))).sort((a, b) => a - b);
  const requestConfigs = webglIndexes.map((index) => {
    const request = discoveredRequests.find((item) => item.index === index) || {};
    return [index, {
      type: request.type || "webgl",
      attrs: request.attrs || {},
    }];
  });
  return `
<script src="/js/gl2gpu.js"></script>
<script>
${deterministicScript()}
(() => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalWindowAddEventListener = window.addEventListener.bind(window);
  const originalDocumentAddEventListener = document.addEventListener.bind(document);
  const originalRequestAnimationFrame = window.requestAnimationFrame.bind(window);
  const originalGl2gpuGetContext = GL2GPU.gl2gpuGetContext.bind(GL2GPU);
  const hydContexts = new WeakMap();
  const webglNames = new Set(["webgl", "experimental-webgl", "webgl2"]);
  const webglCanvasIndexes = new Set(${JSON.stringify(webglIndexes)});
  const webglRequestConfigs = new Map(${JSON.stringify(requestConfigs)});
  const queuedDomContentLoaded = [];
  const queuedLoad = [];
  const calledLoadHandlers = new Set();
  let windowOnload = null;
  let loadReplayed = false;
  window.__GL2GPU_HARNESS_STATS = {
    beginFrame: 0,
    endFrame: 0,
    precreated: 0,
    getContext: 0,
    nativeWebglGetContext: 0,
    clear: 0,
    drawArrays: 0,
    drawElements: 0,
    frameStart: 0,
    frameEnd: 0,
    flush: 0,
    submit: 0,
    loadReplayCalls: 0,
    nativeLoadBlocked: 0,
    textureUploads: [],
  };
  window.__GL2GPU_HARNESS_CONTEXTS = [];

  const originalBeginFrame = GL2GPU.beginFrame.bind(GL2GPU);
  const originalEndFrame = GL2GPU.endFrame.bind(GL2GPU);
  GL2GPU.beginFrame = function() {
    window.__GL2GPU_HARNESS_STATS.beginFrame++;
    return originalBeginFrame();
  };
  GL2GPU.endFrame = function() {
    window.__GL2GPU_HARNESS_STATS.endFrame++;
    return originalEndFrame();
  };

  function callQueued(target, listener, event) {
    if (typeof listener === "function") {
      listener.call(target, event);
    } else if (listener && typeof listener.handleEvent === "function") {
      listener.handleEvent.call(listener, event);
    }
  }

  function callLoadOnce(target, listener, event) {
    if (!listener) return;
    const key = typeof listener === "function" ? listener : listener.handleEvent || listener;
    if (calledLoadHandlers.has(key)) return;
    calledLoadHandlers.add(key);
    window.__GL2GPU_HARNESS_STATS.loadReplayCalls++;
    callQueued(target, listener, event);
  }

  async function prepareCanvas(canvas) {
    if (hydContexts.has(canvas)) return hydContexts.get(canvas);
    const canvases = Array.from(document.querySelectorAll("canvas"));
    const index = canvases.indexOf(canvas);
    const requestConfig = webglRequestConfigs.get(index) || { type: "webgl", attrs: {} };
    const context = await originalGl2gpuGetContext(
      canvas,
      null,
      [requestConfig.type || "webgl", requestConfig.attrs || {}],
      [1 << 21, 0],
      { legacyTextureCoordinateFixups: false }
    );
    for (const name of ["_frameStart", "_frameEnd", "_der_flush"]) {
      const original = context[name] && context[name].bind(context);
      if (!original) continue;
      const statName = name === "_frameStart" ? "frameStart" : name === "_frameEnd" ? "frameEnd" : "flush";
      context[name] = function(...args) {
        window.__GL2GPU_HARNESS_STATS[statName]++;
        return original(...args);
      };
    }
    if (context.hydDevice && context.hydDevice.queue && context.hydDevice.queue.submit) {
      const originalSubmit = context.hydDevice.queue.submit.bind(context.hydDevice.queue);
      context.hydDevice.queue.submit = function(...args) {
        window.__GL2GPU_HARNESS_STATS.submit++;
        return originalSubmit(...args);
      };
    }
    window.__GL2GPU_HARNESS_CONTEXTS.push(context);
    for (const name of ["clear", "drawArrays", "drawElements"]) {
      const original = context[name] && context[name].bind(context);
      if (!original) continue;
      context[name] = function(...args) {
        window.__GL2GPU_HARNESS_STATS[name]++;
        return original(...args);
      };
    }
    for (const name of ["texImage2D", "texSubImage2D", "texImage3D"]) {
      const original = context[name] && context[name].bind(context);
      if (!original) continue;
      context[name] = function(...args) {
        let entry = null;
        if (window.__GL2GPU_HARNESS_STATS.textureUploads.length < 200) {
          const source = args[args.length - 1];
          entry = {
            op: name,
            target: args[0],
            level: args[1],
            width: args.length === 6 || args.length === 7 ? (source && (source.videoWidth || source.width)) : args[3],
            height: args.length === 6 || args.length === 7 ? (source && (source.videoHeight || source.height)) : args[4],
            source: source === null ? "null" : source && source.constructor ? source.constructor.name : typeof source,
            activeTextureUnit: context.hydGlobalState && context.hydGlobalState.commonState.activeTextureUnit,
          };
          window.__GL2GPU_HARNESS_STATS.textureUploads.push(entry);
        }
        const result = original(...args);
        if (entry && context.hydGlobalState && context.hydGlobalState.getTextureUnitBinding) {
          const target = args[0];
          const viewDimension =
            target === 34069 || target === 34070 || target === 34071 || target === 34072 || target === 34073 || target === 34074 || target === 34067 ? "cube" :
            target === 3553 ? "2d" :
            target === 32879 ? "3d" :
            target === 35866 ? "2d-array" : undefined;
          const texture = viewDimension && context.hydGlobalState.getTextureUnitBinding(entry.activeTextureUnit, viewDimension);
          if (texture) {
            entry.textureLabel = texture.label;
            entry.textureWidthAfter = texture.width;
            entry.textureHeightAfter = texture.height;
            entry.textureViewDimension = texture.viewDimension;
          }
        }
        return result;
      };
    }
    window.__GL2GPU_HARNESS_STATS.precreated++;
    hydContexts.set(canvas, context);
    if (context.hydCanvas && context.hydCanvas !== canvas) {
      hydContexts.set(context.hydCanvas, context);
    }
    return context;
  }

  GL2GPU.gl2gpuGetContext = async function(canvas, shaderInfoUrl, arg0, arg1, translatorOptions) {
    if (hydContexts.has(canvas)) {
      return hydContexts.get(canvas);
    }
    if (canvas instanceof HTMLCanvasElement) {
      return prepareCanvas(canvas);
    }
    return originalGl2gpuGetContext(canvas, shaderInfoUrl, arg0, arg1, translatorOptions);
  };

  function installFrameHooks() {
    window.requestAnimationFrame = function(callback) {
      return originalRequestAnimationFrame(function(timestamp) {
        GL2GPU.beginFrame();
        try {
          callback(timestamp);
        } finally {
          GL2GPU.endFrame();
        }
      });
    };
  }
  installFrameHooks();

  window.addEventListener = function(type, listener, options) {
    if (type === "DOMContentLoaded") {
      queuedDomContentLoaded.push({ target: window, listener });
      return;
    }
    if (type === "load") {
      queuedLoad.push(listener);
      return;
    }
    return originalWindowAddEventListener(type, listener, options);
  };
  document.addEventListener = function(type, listener, options) {
    if (type === "DOMContentLoaded") {
      queuedDomContentLoaded.push({ target: document, listener });
      return;
    }
    return originalDocumentAddEventListener(type, listener, options);
  };
  Object.defineProperty(window, "onload", {
    configurable: true,
    get() { return windowOnload; },
    set(listener) { windowOnload = listener; },
  });
  originalWindowAddEventListener("load", (event) => {
    window.__GL2GPU_HARNESS_STATS.nativeLoadBlocked++;
    event.stopImmediatePropagation();
    event.preventDefault();
  }, true);

  window.__GL2GPU_BOOT_PROMISE = new Promise((resolve, reject) => {
    originalDocumentAddEventListener("DOMContentLoaded", async () => {
      try {
        if (!window.GL2GPU) throw new Error("GL2GPU was not loaded");
        const canvases = Array.from(document.querySelectorAll("canvas"));
        const targets = canvases.filter((_, index) => webglCanvasIndexes.has(index));
        if (targets.length === 0 && canvases.length === 1) {
          targets.push(canvases[0]);
        }
        if (targets.length === 0 && canvases.length === 0 && webglCanvasIndexes.has(0)) {
          const canvas = document.createElement("canvas");
          canvas.width = window.innerWidth || 800;
          canvas.height = window.innerHeight || 600;
          document.body.appendChild(canvas);
          targets.push(canvas);
        }
        await Promise.all(targets.map(prepareCanvas));
        HTMLCanvasElement.prototype.getContext = function(type, attrs) {
          if (webglNames.has(type)) {
            window.__GL2GPU_HARNESS_STATS.getContext++;
            const context = hydContexts.get(this);
            if (!context) {
              window.__GL2GPU_HARNESS_STATS.nativeWebglGetContext++;
              throw new Error("GL2GPU context was not precreated for requested WebGL canvas");
            }
            return context;
          }
          return originalGetContext.call(this, type, attrs);
        };
        const domEvent = new Event("DOMContentLoaded", { bubbles: true });
        try {
          for (const entry of queuedDomContentLoaded) {
            callQueued(entry.target, entry.listener, domEvent);
            // Legacy ready implementations often schedule callbacks from
            // inside their DOMContentLoaded listener. Yield between replayed
            // listeners so those callbacks can run before later native
            // listeners, which is closer to browser event ordering.
            await new Promise((resolveNextListener) => setTimeout(resolveNextListener, 0));
          }
          const loadEvent = new Event("load");
          for (const listener of queuedLoad) callLoadOnce(window, listener, loadEvent);
          const bodyOnload = document.body && typeof document.body.onload === "function" ? document.body.onload : null;
          if (document.body && typeof document.body.onload === "function") {
            document.body.onload = null;
            callLoadOnce(document.body, bodyOnload, loadEvent);
          } else {
            callLoadOnce(window, windowOnload, loadEvent);
          }
          windowOnload = null;
          loadReplayed = true;
        } finally {
        }
        resolve(true);
      } catch (error) {
        console.error("[GL2GPU harness]", error && (error.stack || error.message || error));
        reject(error);
      }
    }, { once: true });
  });
})();
</script>`;
}

function delayPostBodyInlineScripts(html) {
  const bodyClose = /<\/body>/i.exec(html);
  if (!bodyClose) return html;
  const splitAt = bodyClose.index + bodyClose[0].length;
  const head = html.slice(0, splitAt);
  const tail = html.slice(splitAt);
  return head + tail.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, code) => {
    if (/\bsrc\s*=/i.test(attrs)) {
      return match;
    }
    const typeMatch = /\btype\s*=\s*(['"]?)([^'">\s]+)\1/i.exec(attrs);
    const type = typeMatch ? typeMatch[2].toLowerCase() : "";
    if (type && !["text/javascript", "application/javascript", "text/ecmascript", "application/ecmascript"].includes(type)) {
      return match;
    }
    return `<script${attrs}>
window.__GL2GPU_BOOT_PROMISE.then(() => {
${code}
}).catch((error) => console.error("[GL2GPU harness delayed script]", error && (error.stack || error.message || error)));
</script>`;
  });
}

function transformHtml(html, mode, discoveredRequests) {
  if (mode !== "gl2gpu") return html;
  let withoutCsp = html
    .replace(/<meta[^>]+http-equiv\s*=\s*(['"])Content-Security-Policy\1[^>]*>/gi, "")
    .replace(/<script\b[^>]*\bsrc\s*=\s*(['"])[^'"]*\/js\/gl2gpu(?:\.[^'"]*)?\.js(?:[?#][^'"]*)?\1[^>]*>\s*<\/script>/gi, "");
  withoutCsp = delayPostBodyInlineScripts(withoutCsp);
  const boot = gl2gpuBootScript(discoveredRequests);
  if (/<head[^>]*>/i.test(withoutCsp)) {
    return withoutCsp.replace(/<head([^>]*)>/i, `<head$1>\n${boot}`);
  }
  return `${boot}\n${withoutCsp}`;
}

async function fetchOrigin(pathname, method = "GET") {
  const response = await fetch(new URL(pathname, origin).href, { method, redirect: "follow" });
  const arrayBuffer = await response.arrayBuffer();
  return {
    status: response.status,
    headers: response.headers,
    body: Buffer.from(arrayBuffer),
  };
}

async function startServer(mode, discoveredByRoute) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (mode === "gl2gpu" && localAssets.has(url.pathname)) {
        const filePath = localAssets.get(url.pathname);
        res.writeHead(200, { "content-type": contentType(filePath), "cache-control": "no-store" });
        res.end(fs.readFileSync(filePath));
        return;
      }
      const fetched = await fetchOrigin(url.pathname + url.search, req.method);
      let body = fetched.body;
      let type = fetched.headers.get("content-type") || contentType(url.pathname);
      if (type.includes("text/html")) {
        const discovered = discoveredByRoute.get(url.pathname) || [];
        body = Buffer.from(transformHtml(body.toString("utf8"), mode, discovered), "utf8");
        type = "text/html; charset=utf-8";
      }
      res.writeHead(fetched.status, {
        "content-type": type,
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
      });
      res.end(body);
    } catch (error) {
      res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      res.end(error.stack || error.message || String(error));
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, baseURL: `http://127.0.0.1:${server.address().port}` };
}

function relevantConsole(message) {
  const text = message.text();
  if (/Failed to load resource:.*404/i.test(text)) return false;
  return message.type() === "error" ||
    /Runtime shader translation failed|Shader not found|GPUValidationError|uncapturederror|unsupported|not implemented|unhandled|getContext|GL2GPU harness|Error compiling/i.test(text);
}

function compactText(value, maxLength = 2400) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function pushUnique(list, value, limit = 20) {
  if (list.length >= limit) return;
  const text = compactText(value);
  if (!list.includes(text)) list.push(text);
}

async function discoverSample(context, baseURL, sample) {
  const [name, route] = sample;
  const page = await context.newPage();
  await page.addInitScript(discoveryScript());
  const failures = [];
  try {
    await page.goto(`${baseURL}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(Math.min(waitMs, 2500));
    await page.evaluate((frames) => window.__HARNESS_STEP_FRAMES && window.__HARNESS_STEP_FRAMES(frames), Math.min(frameCount, 10)).catch(() => {});
  } catch (error) {
    failures.push(error.message || String(error));
  }
  const requests = await page.evaluate(() => window.__WEBGL_CONTEXT_REQUESTS || []).catch(() => []);
  await page.close();
  return { name, route, requests, failures };
}

async function waitForPageResources(page) {
  await page.waitForFunction(() => {
    const pendingDocumentImages = Array.from(document.images || [])
      .filter((image) => !image.__HARNESS_LOAD_ERROR && (!image.complete || image.naturalWidth === 0)).length;
    const pendingHarnessImages = typeof window.__HARNESS_PENDING_IMAGES === "function" ?
      window.__HARNESS_PENDING_IMAGES().length : 0;
    const contexts = [];
    if (window.gl && window.gl.tdl && window.gl.tdl.textures) {
      contexts.push(window.gl);
    }
    if (Array.isArray(window.__GL2GPU_HARNESS_CONTEXTS)) {
      contexts.push(...window.__GL2GPU_HARNESS_CONTEXTS);
    }
    const pendingTdlImages = contexts.reduce((count, context) => {
      return Math.max(count, context && context.tdl && context.tdl.textures && context.tdl.textures.loadingImages ?
        context.tdl.textures.loadingImages.filter((image) => image && !image.__HARNESS_LOAD_ERROR).length : 0);
    }, 0);
    return pendingDocumentImages === 0 && pendingHarnessImages === 0 && pendingTdlImages === 0;
  }, null, { timeout: resourceWaitMs, polling: 250 });
}

async function triggerStartControls(page) {
  await page.evaluate(() => {
    const candidates = [
      document.getElementById("start"),
      ...Array.from(document.querySelectorAll("button, [role=button], input[type=button], input[type=submit], a"))
        .filter((element) => /^(start|play|run)$/i.test((element.textContent || element.value || "").trim())),
    ].filter(Boolean);
    for (const element of candidates) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (rect.width <= 0 || rect.height <= 0 || style.visibility === "hidden" || style.display === "none") {
        continue;
      }
      element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      if (typeof element.click === "function") {
        element.click();
      }
      break;
    }
  }).catch(() => {});
}

async function capture(context, baseURL, sample, mode, discoveredRequests) {
  const [name, route] = sample;
  const page = await context.newPage();
  if (mode === "webgl") {
    await page.addInitScript(deterministicScript());
  }
  const messages = [];
  const failures = [];
  const shaderDbRequests = [];
  page.on("console", (message) => {
    if (relevantConsole(message)) pushUnique(messages, `${message.type()}: ${message.text()}`, 50);
  });
  page.on("request", (request) => {
    if (/shaders?_info\.json/i.test(request.url())) {
      shaderDbRequests.push(request.url());
      pushUnique(failures, `legacy shader DB request: ${request.url()}`);
    }
  });
  page.on("pageerror", (error) => pushUnique(failures, `pageerror: ${error.stack || error.message}`));
  page.on("requestfailed", (request) => {
    const ignoredResourceTypes = new Set(["image", "media", "font"]);
    if (ignoredResourceTypes.has(request.resourceType()) || /(?:googleads|doubleclick)\.net/i.test(request.url())) {
      return;
    }
    pushUnique(failures, `requestfailed: ${request.url()} ${request.failure()?.errorText || ""}`);
  });
  page.on("response", (response) => {
    const ignoredResourceTypes = new Set(["image", "media", "font"]);
    if (response.status() >= 400 && !ignoredResourceTypes.has(response.request().resourceType()) && !/\/favicon\.ico(?:[?#]|$)/i.test(response.url())) {
      pushUnique(failures, `http ${response.status()}: ${response.url()}`);
    }
  });
  try {
    await page.goto(`${baseURL}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    if (mode === "gl2gpu") {
      await page.evaluate(() => window.__GL2GPU_BOOT_PROMISE).catch((error) => {
        pushUnique(failures, `boot: ${error.message || error}`);
      });
    }
    await triggerStartControls(page);
    await page.waitForTimeout(waitMs);
    await waitForPageResources(page).catch(() => {});
    await page.evaluate((frames) => window.__HARNESS_STEP_FRAMES && window.__HARNESS_STEP_FRAMES(frames), frameCount).catch((error) => {
      pushUnique(failures, `frame step: ${error.message || error}`);
    });
    await page.waitForTimeout(100);
  } catch (error) {
    pushUnique(failures, `goto: ${error.message || error}`);
  }

  const canvasState = await page.evaluate((requests) => {
    const canvases = Array.from(document.querySelectorAll("canvas"));
    return canvases.map((canvas, index) => {
      const rect = canvas.getBoundingClientRect();
      return {
        index,
        width: canvas.width,
        height: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
        rectWidth: rect.width,
        rectHeight: rect.height,
        requestedWebgl: requests.some((request) => request.index === index),
      };
    });
  }, discoveredRequests).catch(() => []);

  const requestedIndexes = new Set(discoveredRequests.map((request) => request.index));
  const preferred = canvasState
    .filter((canvas) => requestedIndexes.has(canvas.index))
    .sort((a, b) => (b.rectWidth * b.rectHeight || b.width * b.height) - (a.rectWidth * a.rectHeight || a.width * a.height))[0] ||
    canvasState
      .slice()
      .sort((a, b) => (b.rectWidth * b.rectHeight || b.width * b.height) - (a.rectWidth * a.rectHeight || a.width * a.height))[0];

  let screenshot = null;
  if (preferred) {
    screenshot = path.join(outputRoot, `${name}-${mode}.png`);
    const locator = page.locator("canvas").nth(preferred.index);
    await locator.screenshot({ path: screenshot, timeout: 30000 }).catch(async (error) => {
      const canvasError = error.message || String(error);
      await page.screenshot({ path: screenshot, fullPage: false }).catch((fallbackError) => {
        pushUnique(failures, `canvas screenshot: ${canvasError}`);
        pushUnique(failures, `page screenshot: ${fallbackError.message || fallbackError}`);
      });
    });
  }

  const state = await page.evaluate(() => ({
    title: document.title,
    bodyText: document.body ? document.body.innerText.slice(0, 240) : "",
    gl2gpuStats: window.__GL2GPU_HARNESS_STATS || null,
    gl2gpuRuntime: (window.__GL2GPU_HARNESS_CONTEXTS || []).map((context) => ({
      canvasWidth: context.hydCanvas && context.hydCanvas.width,
      canvasHeight: context.hydCanvas && context.hydCanvas.height,
      lastCanvasSize: context.hydLastCanvasSize,
      drawingBufferWidth: context.drawingBufferWidth,
      drawingBufferHeight: context.drawingBufferHeight,
      viewport: context.hydGlobalState && context.hydGlobalState.commonState.viewport,
      scissorBox: context.hydGlobalState && context.hydGlobalState.miscState.scissorBox,
      scissorTest: context.hydGlobalState && context.hydGlobalState.miscState.scissorTest,
      clearColor: context.hydGlobalState && context.hydGlobalState.clearState.color,
      clearTarget: context.hydGlobalState && context.hydGlobalState.clearState.target,
      colorWriteMask: context.hydGlobalState && context.hydGlobalState.miscState.colorWriteMask,
      drawBuffers: context.hydGlobalState && context.hydGlobalState.commonState.drawFramebufferBinding.drawBuffers,
      defaultFramebuffer: context.hydGlobalState && context.hydGlobalState.commonState.drawFramebufferBinding === context.hydGlobalState.defaultFramebuffer,
      canvasViewLabel: context.hydGlobalState && context.hydGlobalState.__canvasView && context.hydGlobalState.__canvasView.label,
      depthEnabled: context.hydGlobalState && context.hydGlobalState.depthState.enabled,
      cullFace: context.hydGlobalState && context.hydGlobalState.polygonState.cullFace,
      blendEnabled: context.hydGlobalState && context.hydGlobalState.blendState.enabled,
      glError: context.hydGlobalState && context.hydGlobalState.glError,
      tdlLoadingImages: context.tdl && context.tdl.textures && context.tdl.textures.loadingImages ?
        context.tdl.textures.loadingImages.filter((image) => image && !image.__HARNESS_LOAD_ERROR).map((image) => image && image.src).slice(0, 40) : null,
      tdlLoadingImageCount: context.tdl && context.tdl.textures && context.tdl.textures.loadingImages ?
        context.tdl.textures.loadingImages.filter((image) => image && !image.__HARNESS_LOAD_ERROR).length : null,
      harnessPendingImages: typeof window.__HARNESS_PENDING_IMAGES === "function" ?
        window.__HARNESS_PENDING_IMAGES() : null,
      arrayBufferHash: context.hydGlobalState && context.hydGlobalState.commonState.arrayBufferBinding && context.hydGlobalState.commonState.arrayBufferBinding.hash,
      elementArrayBufferHash: context.hydGlobalState && context.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding && context.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding.hash,
      elementArrayBufferReady: Boolean(context.hydGlobalState && context.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding && context.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding.buffer),
      samplers: context.hydGlobalState && context.hydGlobalState.commonState.currentProgram &&
        context.hydGlobalState.commonState.currentProgram.hydSamplers.map((sampler) => ({
          name: sampler.name,
          textureUnit: sampler.textureUnit,
          viewDimension: sampler.viewDimension,
          originFlip: sampler.originFlipUniform && context.hydGlobalState.commonState.currentProgram.uniformArrayBufferTempView ?
            context.hydGlobalState.commonState.currentProgram.uniformArrayBufferTempView.getFloat32(sampler.originFlipUniform.offset, true) : null,
        })),
      textureUnits: context.hydGlobalState && context.hydGlobalState.textureUnits.flatMap((bindings, index) => {
        if (!bindings) return [];
        return Object.keys(bindings).map((viewDimension) => {
          const texture = bindings[viewDimension];
          return texture && ({
            index,
            hash: texture.hash,
            width: texture.width,
            height: texture.height,
            format: texture.format,
            viewDimension,
            textureViewDimension: texture.viewDimension,
            sourceOrigin: texture.sourceOrigin,
          });
        }).filter(Boolean);
      }),
    })),
  })).catch((error) => ({ error: error.message || String(error) }));
  await page.close();
  return { name, route, mode, screenshot, state, canvases: canvasState, selectedCanvas: preferred, messages, failures, shaderDbRequests };
}

function imageMetric(metric, a, b) {
  const result = spawnSync("magick", ["compare", "-metric", metric, a, b, "null:"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = `${result.stderr || ""}${result.stdout || ""}`.trim();
  if (output) return output;
  if (result.status === 0) return "0 (0)";
  if (result.error) return `error: ${result.error.message}`;
  return null;
}

function normalizedMetric(metricText) {
  if (!metricText) return null;
  const match = /\(([0-9.]+)\)/.exec(String(metricText));
  return match ? Number(match[1]) : null;
}

function makeMontage(summary) {
  const pairs = [];
  for (const row of summary) {
    if (row.webglScreenshot && row.gl2gpuScreenshot && fs.existsSync(row.webglScreenshot) && fs.existsSync(row.gl2gpuScreenshot)) {
      pairs.push(row.webglScreenshot, row.gl2gpuScreenshot);
    }
  }
  if (pairs.length === 0) return null;
  const montage = path.join(outputRoot, "montage.png");
  const result = spawnSync("magick", ["montage", ...pairs, "-tile", "2x", "-geometry", "320x240+8+8", montage], { encoding: "utf8" });
  return result.status === 0 ? montage : null;
}

async function runMode(browser, mode, discoveredByRoute) {
  const { server, baseURL } = await startServer(mode, discoveredByRoute);
  const context = await browser.newContext({
    viewport: { width: 800, height: 600 },
    deviceScaleFactor: 1,
  });
  try {
    const results = [];
    for (const sample of selectedSamples()) {
      console.log(`[${mode}] ${sample[0]}`);
      const discoveredRequests = discoveredByRoute.get(sample[1]) || [];
      results.push(await capture(context, baseURL, sample, mode, discoveredRequests));
    }
    return { baseURL, results };
  } finally {
    await context.close();
    await new Promise((resolve) => server.close(resolve));
  }
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
  let lastError;
  for (const attempt of attempts) {
    try {
      return await chromium.launch({ ...attempt, args });
    } catch (error) {
      lastError = error;
      console.warn(`[launch] ${attempt.executablePath} ${attempt.headless ? "headless" : "headed"} failed: ${error.message || error}`);
    }
  }
  throw lastError;
}

async function main() {
  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });
  const browser = await launchBrowser();
  try {
    const emptyDiscovery = new Map();
    const discoveryServer = await startServer("webgl", emptyDiscovery);
    const discoveryContext = await browser.newContext({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
    const discoveredByRoute = new Map();
    const discoveries = [];
    try {
      for (const sample of selectedSamples()) {
        console.log(`[discover] ${sample[0]}`);
        const discovery = await discoverSample(discoveryContext, discoveryServer.baseURL, sample);
        discoveredByRoute.set(sample[1], discovery.requests);
        discoveries.push(discovery);
      }
    } finally {
      await discoveryContext.close();
      await new Promise((resolve) => discoveryServer.server.close(resolve));
    }

    const webgl = await runMode(browser, "webgl", discoveredByRoute);
    const gl2gpu = await runMode(browser, "gl2gpu", discoveredByRoute);
    const byName = new Map();
    for (const result of webgl.results) byName.set(result.name, { webgl: result });
    for (const result of gl2gpu.results) {
      const record = byName.get(result.name) || {};
      record.gl2gpu = result;
      if (record.webgl?.screenshot && result.screenshot && fs.existsSync(record.webgl.screenshot) && fs.existsSync(result.screenshot)) {
        record.rmse = imageMetric("RMSE", record.webgl.screenshot, result.screenshot);
        record.mae = imageMetric("MAE", record.webgl.screenshot, result.screenshot);
      }
      byName.set(result.name, record);
    }

    const summary = Array.from(byName.entries()).map(([name, record]) => {
      const rmseNormalized = normalizedMetric(record.rmse);
      const hasScreenshotPair = Boolean(record.webgl?.screenshot && record.gl2gpu?.screenshot &&
        fs.existsSync(record.webgl.screenshot) && fs.existsSync(record.gl2gpu.screenshot));
      const metricPass = hasScreenshotPair ? rmseNormalized !== null && rmseNormalized <= threshold : true;
      return {
        name,
        route: record.webgl?.route || record.gl2gpu?.route,
        webglFailures: record.webgl?.failures || [],
        gl2gpuFailures: record.gl2gpu?.failures || [],
        gl2gpuMessages: record.gl2gpu?.messages || [],
        gl2gpuShaderDbRequests: record.gl2gpu?.shaderDbRequests || [],
        gl2gpuStats: record.gl2gpu?.state?.gl2gpuStats || null,
        gl2gpuRuntime: record.gl2gpu?.state?.gl2gpuRuntime || null,
        selectedCanvas: record.gl2gpu?.selectedCanvas || record.webgl?.selectedCanvas || null,
        rmse: record.rmse || null,
        mae: record.mae || null,
        rmseNormalized,
        hasScreenshotPair,
        pass: (record.gl2gpu?.failures || []).length === 0 &&
          (record.gl2gpu?.shaderDbRequests || []).length === 0 &&
          !(record.gl2gpu?.messages || []).some((message) => /Runtime shader translation failed|GPUValidationError|unsupported|not implemented|unhandled/i.test(message)) &&
          metricPass,
        webglScreenshot: record.webgl?.screenshot || null,
        gl2gpuScreenshot: record.gl2gpu?.screenshot || null,
      };
    });
    const montage = makeMontage(summary);
    const report = { outputRoot, origin, threshold, samples: selectedSamples(), discoveries, webgl, gl2gpu, summary, montage };
    fs.writeFileSync(path.join(outputRoot, "results.json"), JSON.stringify(report, null, 2));
    const consoleSummary = summary.map((row) => ({
      name: row.name,
      pass: row.pass,
      rmseNormalized: row.rmseNormalized,
      shaderDbRequests: row.gl2gpuShaderDbRequests.length,
      failures: row.gl2gpuFailures.length,
      messages: row.gl2gpuMessages.length,
      draws: `${row.gl2gpuStats?.drawArrays || 0}/${row.gl2gpuStats?.drawElements || 0}`,
      pendingImages: row.gl2gpuRuntime?.[0]?.tdlLoadingImageCount ?? null,
    }));
    console.log(JSON.stringify({ outputRoot, threshold, montage, summary: consoleSummary }, null, 2));
    if (summary.some((row) => !row.pass)) {
      process.exitCode = 2;
    }
  } finally {
    const closed = await Promise.race([
      browser.close().then(() => true).catch(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 5000)),
    ]);
    if (!closed && typeof browser.process === "function") {
      const child = browser.process();
      if (child && !child.killed) {
        child.kill("SIGKILL");
      }
    }
  }
}

main().then(() => {
  process.exit(process.exitCode || 0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
