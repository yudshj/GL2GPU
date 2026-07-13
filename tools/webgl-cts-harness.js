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
window.__GL2GPU_CTS_RESULT = { ready: false, finished: false, passes: [], failures: [], shaders: [], bootError: null, lastActivity: performance.now() };
window.__HYD_DEBUG_READBACK = ${argv.get("debug-readback") === "true"};
window.__HYD_DEBUG_TEXTURE_UPLOAD = ${argv.get("debug-texture-upload") === "true"};
window.__HYD_DEBUG_GL_ERRORS = ${argv.get("debug-errors") === "true"};
window.__HYD_STATIC_SAMPLER_ORIGIN_VARIANTS = ${argv.get("static-origin-variants") !== "false"};
window.__HYD_DISABLE_STATE_CACHE = ${argv.get("state-cache") === "false"};
window.__HYD_DISABLE_BUNDLE_CACHE = ${argv.get("bundle-cache") === "false"};
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
    const useNativeBackend = ${argv.get("backend") === "native"};
    const runtime = useNativeBackend ? null : await GL2GPU.gl2gpuCreateRuntime({
        optimizeTintWgsl: ${argv.get("optimize-tint-wgsl") !== "false"},
        legacyTextureCoordinateFixups: false
      });
    const contextMap = new WeakMap();
    const contextTypes = new WeakMap();
    HTMLCanvasElement.prototype.getContext = function(type, attributes) {
      if (type === "webgl" || type === "experimental-webgl" || type === "webgl2") {
        const normalizedType = type === "webgl2" ? "webgl2" : "webgl";
        const existing = contextMap.get(this);
        if (existing) return contextTypes.get(this) === normalizedType ? existing : null;
        let context;
        if (useNativeBackend) {
          context = nativeGetContext.call(this, normalizedType, attributes || {});
          if (!context) return null;
        } else {
          const gpuContext = nativeGetContext.call(this, "webgpu");
          if (!gpuContext) return null;
          context = GL2GPU.gl2gpuCreateContext(
            runtime,
            this,
            null,
            [normalizedType, attributes || {}],
            [1 << 21, 0],
            gpuContext
          );
        }
        if (${argv.get("trace-buffer-copy") === "true"}) {
          result.bufferCopies = result.bufferCopies || [];
          const bindingPname = target => new Map([
            [context.ARRAY_BUFFER, context.ARRAY_BUFFER_BINDING],
            [context.ELEMENT_ARRAY_BUFFER, context.ELEMENT_ARRAY_BUFFER_BINDING],
            [context.COPY_READ_BUFFER, context.COPY_READ_BUFFER_BINDING],
            [context.COPY_WRITE_BUFFER, context.COPY_WRITE_BUFFER_BINDING],
            [context.PIXEL_PACK_BUFFER, context.PIXEL_PACK_BUFFER_BINDING],
            [context.PIXEL_UNPACK_BUFFER, context.PIXEL_UNPACK_BUFFER_BINDING],
            [context.TRANSFORM_FEEDBACK_BUFFER, context.TRANSFORM_FEEDBACK_BUFFER_BINDING],
            [context.UNIFORM_BUFFER, context.UNIFORM_BUFFER_BINDING],
          ]).get(target);
          const hashBytes = bytes => {
            let hash = 2166136261;
            for (let index = 0; index < bytes.length; index++) {
              hash = Math.imul(hash ^ bytes[index], 16777619);
            }
            return (hash >>> 0).toString(16);
          };
          const snapshotBuffer = buffer => buffer ? {
            label: buffer.label,
            webglSize: buffer.webglSize,
            version: buffer.version,
            derivedVertexGeneration: buffer.derivedVertexGeneration,
            convertedVertexBuffers: buffer.convertedVertexBuffers?.size,
            divisorVertexBuffers: buffer.divisorVertexBuffers?.size,
            shadowHash: hashBytes(buffer.shadowData || []),
          } : null;
          const traceDerivedBuilds = buffer => {
            if (!buffer || buffer.__hydCtsTracesDerivedBuilds) return;
            buffer.__hydCtsTracesDerivedBuilds = true;
            for (const method of ["getFloatVertexBuffer", "getIntegerVertexBuffer", "getDivisorVertexBuffer"]) {
              const original = buffer[method];
              if (typeof original !== "function") continue;
              buffer[method] = function(...args) {
                const value = original.apply(this, args);
                result.bufferCopies.push({
                  derivedBuild: method,
                  args,
                  buffer: snapshotBuffer(buffer),
                  derivedKey: value?.key,
                });
                return value;
              };
            }
          };
          const copyBufferSubData = context.copyBufferSubData;
          context.copyBufferSubData = function(readTarget, writeTarget, readOffset, writeOffset, size) {
            const source = context.getParameter(bindingPname(readTarget));
            const destination = context.getParameter(bindingPname(writeTarget));
            traceDerivedBuilds(source);
            traceDerivedBuilds(destination);
            const trace = {
              readTarget, writeTarget, readOffset, writeOffset, size,
              sourceBefore: snapshotBuffer(source),
              destinationBefore: snapshotBuffer(destination),
            };
            const returned = copyBufferSubData.apply(this, arguments);
            trace.sourceAfter = snapshotBuffer(source);
            trace.destinationAfter = snapshotBuffer(destination);
            result.bufferCopies.push(trace);
            return returned;
          };
        }
        if (${argv.get("trace-vertex-input") === "true"}) {
          result.vertexInputTrace = result.vertexInputTrace || [];
          const snapshotVertexInputs = (drawName, drawArgs) => {
            const state = context.hydGlobalState;
            const program = state?.commonState?.currentProgram || context.getParameter(context.CURRENT_PROGRAM);
            const vao = state?.commonState?.vertexArrayBinding;
            const activeLocations = Array.from(program?.hydAttributeLocations || []).sort((a, b) => a - b);
            const attributes = activeLocations.map(location => {
              const attribute = vao?.attributes?.[location] || {
                enabled: context.getVertexAttrib(location, context.VERTEX_ATTRIB_ARRAY_ENABLED),
                size: context.getVertexAttrib(location, context.VERTEX_ATTRIB_ARRAY_SIZE),
                type: context.getVertexAttrib(location, context.VERTEX_ATTRIB_ARRAY_TYPE),
                normalized: context.getVertexAttrib(location, context.VERTEX_ATTRIB_ARRAY_NORMALIZED),
                stride: context.getVertexAttrib(location, context.VERTEX_ATTRIB_ARRAY_STRIDE),
                webglStride: context.getVertexAttrib(location, context.VERTEX_ATTRIB_ARRAY_STRIDE),
                offset: context.getVertexAttribOffset(location, context.VERTEX_ATTRIB_ARRAY_POINTER),
                buffer: context.getVertexAttrib(location, context.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING),
                format: null,
              };
              const buffer = attribute?.buffer;
              const shadow = buffer?.shadowData;
              const records = [];
              if (attribute?.enabled && shadow instanceof Uint8Array) {
                const view = new DataView(shadow.buffer, shadow.byteOffset, shadow.byteLength);
                const componentBytes = attribute.type === context.BYTE || attribute.type === context.UNSIGNED_BYTE ? 1 :
                  attribute.type === context.SHORT || attribute.type === context.UNSIGNED_SHORT || attribute.type === context.HALF_FLOAT ? 2 : 4;
                const stride = attribute.stride || attribute.size * componentBytes;
                const recordCount = Math.min(128, Math.max(0,
                  Math.floor((shadow.byteLength - attribute.offset) / Math.max(1, stride))));
                for (let record = 0; record < recordCount; record++) {
                  const byteOffset = attribute.offset + record * stride;
                  if (byteOffset + componentBytes > view.byteLength) break;
                  if (attribute.type === context.FLOAT) {
                    records.push({
                      f32: view.getFloat32(byteOffset, true),
                      u32: view.getUint32(byteOffset, true),
                    });
                  } else {
                    records.push({ byteOffset });
                  }
                }
              }
              return {
                location,
                programAttribute: program?.hydAttributes?.find(item =>
                  location >= item.location && location < item.location + item.locationSpan),
                enabled: attribute?.enabled,
                size: attribute?.size,
                type: attribute?.type,
                integer: attribute?.int ?? context.getVertexAttrib(location, context.VERTEX_ATTRIB_ARRAY_INTEGER),
                normalized: attribute?.normalized,
                stride: attribute?.stride,
                webglStride: attribute?.webglStride,
                offset: attribute?.offset,
                format: attribute?.format,
                buffer: buffer ? {
                  label: buffer.label,
                  webglSize: buffer.webglSize,
                  version: buffer.version,
                  shadowByteLength: shadow?.byteLength,
                } : null,
                records,
              };
            });
            let vertexBuffers = null;
            try {
              const resolved = state?.getVertexBuffer?.();
              if (resolved) {
                vertexBuffers = {
                  keys: resolved[0],
                  offsets: resolved[2],
                  layoutHash: resolved[3],
                  layouts: resolved[4].map(layout => ({
                    arrayStride: layout.arrayStride,
                    stepMode: layout.stepMode,
                    attributes: Array.from(layout.attributes),
                  })),
                };
              }
            } catch (error) {
              vertexBuffers = { error: String(error && (error.stack || error.message) || error) };
            }
            result.vertexInputTrace.push({ drawName, drawArgs, attributes, vertexBuffers });
          };
          for (const name of ["drawArrays", "drawArraysInstanced", "drawElements", "drawElementsInstanced"]) {
            const original = context[name];
            if (typeof original !== "function") continue;
            context[name] = function(...args) {
              snapshotVertexInputs(name, args);
              return original.apply(this, args);
            };
          }
        }
        if (${argv.get("trace-uniforms") === "true"}) {
          result.uniformTrace = result.uniformTrace || [];
          const summarizeLocation = location => location ? {
            name: location.name,
            sourceName: location.sourceName,
            type: location.webgl_type,
            wordOffset: location.wordOffset,
            isArray: location.isArray,
          } : null;
          const originalGetUniformLocation = context.getUniformLocation;
          context.getUniformLocation = function(program, name) {
            const location = originalGetUniformLocation.call(this, program, name);
            result.uniformTrace.push({ kind: "location", requested: String(name), location: summarizeLocation(location) });
            return location;
          };
          for (const name of [
            "uniform1f", "uniform2f", "uniform3f", "uniform4f",
            "uniform1i", "uniform2i", "uniform3i", "uniform4i",
            "uniform1ui", "uniform2ui", "uniform3ui", "uniform4ui",
            "uniform1fv", "uniform2fv", "uniform3fv", "uniform4fv",
            "uniform1iv", "uniform2iv", "uniform3iv", "uniform4iv",
            "uniform1uiv", "uniform2uiv", "uniform3uiv", "uniform4uiv",
          ]) {
            const original = context[name];
            if (typeof original !== "function") continue;
            context[name] = function(location, ...values) {
              const returned = original.call(this, location, ...values);
              const storage = location ? {
                f32: location.float32View?.[location.wordOffset],
                i32: location.int32View?.[location.wordOffset],
                u32: location.uint32View?.[location.wordOffset],
              } : null;
              result.uniformTrace.push({
                kind: "write",
                method: name,
                location: summarizeLocation(location),
                values: values.map(value => value && typeof value !== "string" && typeof value.length === "number"
                  ? Array.from(value).slice(0, 32)
                  : value),
                storage,
              });
              return returned;
            };
          }
        }
        if (${argv.get("trace-read-pixels") === "true"}) {
          result.readPixelsTrace = result.readPixelsTrace || [];
          const originalReadPixels = context.readPixels;
          context.readPixels = function(...args) {
            const returned = originalReadPixels.apply(this, args);
            const pixels = args[6];
            if (pixels && ArrayBuffer.isView(pixels)) {
              const bytes = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength);
              const width = Number(args[2]) || 0;
              const height = Number(args[3]) || 0;
              const destinationOffset = Number(args[7]) || 0;
              const pixel = (x, y) => {
                const offset = destinationOffset + (y * width + x) * 4;
                return Array.from(bytes.slice(offset, offset + 4));
              };
              let hash = 2166136261;
              for (let index = destinationOffset; index < bytes.length; index++) {
                hash = Math.imul(hash ^ bytes[index], 16777619);
              }
              result.readPixelsTrace.push({
                x: args[0], y: args[1], width, height,
                format: args[4], type: args[5], byteLength: bytes.length,
                hash: (hash >>> 0).toString(16),
                first: Array.from(bytes.slice(destinationOffset, destinationOffset + 16)),
                center: width > 0 && height > 0 ? pixel(Math.floor(width / 2), Math.floor(height / 2)) : [],
                last: width > 0 && height > 0 ? pixel(width - 1, height - 1) : [],
              });
            }
            return returned;
          };
        }
        if (${argv.get("trace-api-state") === "true"}) {
          result.apiStateTrace = result.apiStateTrace || [];
          const objectIds = new WeakMap();
          let nextObjectId = 1;
          const objectId = value => {
            if (!value || (typeof value !== "object" && typeof value !== "function")) return value;
            let id = objectIds.get(value);
            if (!id) {
              id = nextObjectId++;
              objectIds.set(value, id);
            }
            return id;
          };
          const query = (pname, fallback = null) => {
            try { return context.getParameter(pname); } catch (_) { return fallback; }
          };
          const enabled = cap => {
            try { return context.isEnabled(cap); } catch (_) { return false; }
          };
          const attachmentObject = point => {
            try {
              return context.getFramebufferAttachmentParameter(
                context.DRAW_FRAMEBUFFER,
                point,
                context.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME,
              );
            } catch (_) {
              return null;
            }
          };
          const snapshot = () => {
            const drawFramebuffer = query(context.DRAW_FRAMEBUFFER_BINDING);
            const colorAttachment = drawFramebuffer ? attachmentObject(context.COLOR_ATTACHMENT0) : null;
            const depthAttachment = drawFramebuffer ? attachmentObject(context.DEPTH_ATTACHMENT) : null;
            const stencilAttachment = drawFramebuffer ? attachmentObject(context.STENCIL_ATTACHMENT) : null;
            return {
              drawFramebuffer: {
                id: objectId(drawFramebuffer),
                color: { id: objectId(colorAttachment), label: colorAttachment?.label },
                depth: { id: objectId(depthAttachment), label: depthAttachment?.label },
                stencil: { id: objectId(stencilAttachment), label: stencilAttachment?.label },
              },
              readFramebuffer: objectId(query(context.READ_FRAMEBUFFER_BINDING)),
              program: objectId(query(context.CURRENT_PROGRAM)),
              activeTexture: query(context.ACTIVE_TEXTURE),
              texture2d: query(context.TEXTURE_BINDING_2D)?.label,
              viewport: Array.from(query(context.VIEWPORT, [])),
              clear: {
                color: Array.from(query(context.COLOR_CLEAR_VALUE, [])),
                depth: query(context.DEPTH_CLEAR_VALUE),
                stencil: query(context.STENCIL_CLEAR_VALUE),
              },
              depth: {
                enabled: enabled(context.DEPTH_TEST),
                writeMask: query(context.DEPTH_WRITEMASK),
                func: query(context.DEPTH_FUNC),
              },
              stencil: {
                enabled: enabled(context.STENCIL_TEST),
                ref: query(context.STENCIL_REF),
                func: query(context.STENCIL_FUNC),
                valueMask: query(context.STENCIL_VALUE_MASK),
                writeMask: query(context.STENCIL_WRITEMASK),
                fail: query(context.STENCIL_FAIL),
                depthFail: query(context.STENCIL_PASS_DEPTH_FAIL),
                pass: query(context.STENCIL_PASS_DEPTH_PASS),
              },
              scissor: {
                enabled: enabled(context.SCISSOR_TEST),
                box: Array.from(query(context.SCISSOR_BOX, [])),
              },
            };
          };
          const traceMethods = new Set([
            "bindFramebuffer", "framebufferTexture2D", "framebufferRenderbuffer",
            "clear", "clearColor", "clearDepth", "clearStencil",
            "enable", "disable", "viewport", "scissor", "stencilFunc",
            "bindTexture", "useProgram", "drawArrays", "drawElements", "readPixels",
          ]);
          for (const name of traceMethods) {
            const original = context[name];
            if (typeof original !== "function") continue;
            context[name] = function(...args) {
              const before = snapshot();
              const returned = original.apply(this, args);
              const consoleText = document.getElementById("console")?.innerText || "";
              const testCase = Array.from(consoleText.matchAll(/Start testcase:\\s*([^\\n]+)/g)).at(-1)?.[1] || "";
              result.apiStateTrace.push({
                index: result.apiStateTrace.length,
                testCase,
                name,
                args: args.map(value => typeof value === "object" && value !== null
                  ? { id: objectId(value), label: value.label }
                  : value),
                before,
                after: snapshot(),
              });
              return returned;
            };
          }
        }
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
      const recordActivity = () => { result.lastActivity = performance.now(); };
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
      wrap("testPassed", args => { recordActivity(); result.passes.push(Array.from(args, String).join(" | ")); });
      wrap("testFailed", args => { recordActivity(); result.failures.push(Array.from(args, String).join(" | ")); });
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
    const hasStandardPostScript = Array.from(document.scripts).some(script =>
      new RegExp("(?:^|/)js-test-post[.]js(?:[?#]|$)").test(
        script.src || script.getAttribute("data-gl2gpu-src") || ""));
    if (!hasStandardPostScript) {
      result.lastActivity = performance.now();
      const consoleElement = document.getElementById("console");
      const observer = consoleElement ? new MutationObserver(() => {
        result.lastActivity = performance.now();
      }) : null;
      observer?.observe(consoleElement, { childList: true, subtree: true, characterData: true });
      const finishWhenQuiescent = () => {
        if (result.finished) {
          observer?.disconnect();
          return;
        }
        if (window.successfullyParsed === true && performance.now() - result.lastActivity >= 2000) {
          result.finished = true;
          result.completionFallback = "quiescent-without-js-test-post";
          observer?.disconnect();
          return;
        }
        setTimeout(finishWhenQuiescent, 100);
      };
      setTimeout(finishWhenQuiescent, 100);
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

function writeJsonAtomic(filePath, value) {
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporaryPath, filePath);
}

function buildReport({
  results,
  selectedTotal,
  complete,
  chromeExecutablePath,
  restartEvery,
  ctsRoot,
  ctsCommit,
  gl2gpuCommit,
}) {
  return {
    generatedAt: new Date().toISOString(),
    suite: suiteName,
    version: suiteName === "official" ? officialVersion : null,
    headed: true,
    complete,
    selectedTotal,
    chrome: chromeExecutablePath,
    browserRestartEvery: restartEvery,
    ctsRoot,
    ctsCommit,
    expectedCtsCommit: EXPECTED_CTS_COMMIT,
    gl2gpuCommit,
    summary: {
      total: results.length,
      passed: results.filter((result) => result.valid).length,
      failed: results.filter((result) => !result.valid).length,
      remaining: Math.max(0, selectedTotal - results.length),
    },
    results,
  };
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
  const gl2gpuCommit = execFileSync("git", ["-C", repoRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const partialReportPath = path.join(outputRoot, "results.partial.json");
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
          consoleMessages.push({ type: message.type(), text: text.slice(0, 100000) });
        }
        if (message.type() === "error" || /GPUValidationError|Runtime shader translation failed|\[HYD\] WebGPU uncaptured error|not implemented/i.test(text)) {
          consoleErrors.push(text.slice(0, 100000));
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
      await page.screenshot({
        path: path.join(outputRoot, `${name}.png`),
        fullPage: argv.get("full-page-screenshot") === "true",
        timeout: Math.min(timeoutMs, 5000),
      }).catch(() => {});
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
      writeJsonAtomic(partialReportPath, buildReport({
        results,
        selectedTotal: tests.length,
        complete: false,
        chromeExecutablePath,
        restartEvery,
        ctsRoot,
        ctsCommit,
        gl2gpuCommit,
      }));
      await page.close();
    }
  } finally {
    await launched.browser.close();
    await new Promise((resolve) => server.server.close(resolve));
  }
  const report = buildReport({
    results,
    selectedTotal: tests.length,
    complete: true,
    chromeExecutablePath,
    restartEvery,
    ctsRoot,
    ctsCommit,
    gl2gpuCommit,
  });
  writeJsonAtomic(path.join(outputRoot, "results.json"), report);
  fs.rmSync(partialReportPath, { force: true });
  console.log(`[cts] ${report.summary.passed}/${report.summary.total} passed; ${path.join(outputRoot, "results.json")}`);
  process.exitCode = report.summary.failed === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
