#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const releaseRoot = path.join(repoRoot, "dist", "release");
const outputRoot = path.join(repoRoot, "output", "spark-gl2gpu-tint-benchmark");
const depsRoot = path.join(repoRoot, "output", "spark-gl2gpu-tint-benchmark-deps");
const sparkRepoRoot = process.env.SPARK_REPO_ROOT || "/Volumes/Code/spark";
const defaultSparkRoot = process.env.SPARK_ROOT || "/Volumes/Code/spark-worktrees/v2.1.0";
const sceneRoot = process.env.WEBSPLATTER_SCENE_ROOT || "/Volumes/Code/WebSplatter-Evaluation/WebSplatter/public/scenes";
const sparkCommit = "f22236f95fdd8078f0c12e3aab479523d401daf6";

const sceneDefinitions = [
  {
    name: "van_gogh_room",
    file: path.join(sceneRoot, "van_gogh_room", "van_gogh_room.ply"),
    camera: path.join(sceneRoot, "van_gogh_room", "cameras_test.json"),
  },
  {
    name: "bicycle_30000_cleaned",
    file: path.join(sceneRoot, "bicycle", "bicycle_30000.cleaned.ply"),
    camera: path.join(sceneRoot, "bicycle", "cameras_test.json"),
  },
  {
    name: "garden_30000",
    file: path.join(sceneRoot, "garden", "garden_30000.ply"),
    camera: path.join(sceneRoot, "garden", "cameras_test.json"),
  },
  {
    name: "bicycle_30000",
    file: path.join(sceneRoot, "bicycle", "bicycle_30000.ply"),
    camera: path.join(sceneRoot, "bicycle", "cameras_test.json"),
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

const selectedSceneNames = parseList(argv.get("scenes") || "van_gogh_room,bicycle_30000_cleaned,garden_30000");
const selectedModes = parseList(argv.get("modes") || "webgl,gl2gpu-tint");
const trials = Number(argv.get("trials") || 3);
const maxTrials = Number(argv.get("max-trials") || 5);
const warmupFrames = Number(argv.get("warmup-frames") || 120);
const measureFrames = Number(argv.get("frames") || 180);
const preflightWarmupFrames = Number(argv.get("preflight-warmup-frames") || 30);
const preflightFrames = Number(argv.get("preflight-frames") || 60);
const timeoutMs = Number(argv.get("timeout-ms") || 900000);
const downscale = Number(argv.get("downscale") || 4);
const varianceThreshold = Number(argv.get("variance-threshold") || 0.05);
const rmseThreshold = Number(argv.get("rmse-threshold") || 0.02);
const captureShaders = argv.get("capture-shaders") === "true";
const debugState = argv.get("debug-state") === "true";
const optimizeTintWgsl = argv.get("optimize-tint-wgsl") !== "false";
const preflightOnly = argv.get("preflight-only") === "true";
const skipPreflight = argv.get("skip-preflight") === "true";
const allowInstallDeps = argv.get("install-deps") !== "false";
const cameraTransformCandidates = parseList(argv.get("camera-transforms") || "opencv-column");
const cameraFileOverride = argv.get("camera-file") ? path.resolve(argv.get("camera-file")) : null;

function parseList(value) {
  if (value === "all") return ["all"];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function selectedScenes() {
  const scenes = selectedSceneNames.includes("all") ? sceneDefinitions : sceneDefinitions.filter((scene) => new Set(selectedSceneNames).has(scene.name));
  if (cameraFileOverride) {
    if (scenes.length !== 1) throw new Error("--camera-file can only be used with a single --scenes value");
    return scenes.map((scene) => ({ ...scene, camera: cameraFileOverride }));
  }
  return scenes;
}

function assertReadable(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

function sanitizeName(value) {
  return String(value).replace(/[^A-Za-z0-9_.-]+/g, "_");
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
    ".map": "application/json; charset=utf-8",
    ".ply": "application/octet-stream",
    ".spz": "application/octet-stream",
    ".splat": "application/octet-stream",
    ".ksplat": "application/octet-stream",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
  }[ext] || "application/octet-stream";
}

function safeStaticPath(root, pathname) {
  const relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  const fullPath = path.resolve(root, relative);
  const resolvedRoot = path.resolve(root);
  if (!fullPath.startsWith(resolvedRoot + path.sep) && fullPath !== resolvedRoot) {
    return null;
  }
  return fullPath;
}

function sendBuffer(response, status, buffer, type, extraHeaders = {}) {
  response.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-embedder-policy": "require-corp",
    ...extraHeaders,
  });
  response.end(buffer);
}

function spawnChecked(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.stdio || "pipe",
    maxBuffer: options.maxBuffer || 10 * 1024 * 1024,
    ...options,
  });
  if (result.status !== 0) {
    const stdout = result.stdout ? `\nstdout:\n${result.stdout}` : "";
    const stderr = result.stderr ? `\nstderr:\n${result.stderr}` : "";
    throw new Error(`${command} ${args.join(" ")} failed with ${result.status}${stdout}${stderr}`);
  }
  return result;
}

function ensureSparkRoot() {
  const explicit = argv.get("spark-root") || process.env.SPARK_ROOT;
  const root = explicit ? path.resolve(explicit) : defaultSparkRoot;
  const packageFile = path.join(root, "package.json");
  const distFile = path.join(root, "dist", "spark.module.js");
  if (fs.existsSync(packageFile) && fs.existsSync(distFile)) {
    const pkg = JSON.parse(fs.readFileSync(packageFile, "utf8"));
    if (pkg.version === "2.1.0") return root;
  }
  if (explicit) {
    throw new Error(`Explicit Spark root is not Spark v2.1.0 with dist artifacts: ${root}`);
  }
  assertReadable(path.join(sparkRepoRoot, ".git"));
  fs.mkdirSync(path.dirname(root), { recursive: true });
  spawnChecked("git", ["-C", sparkRepoRoot, "fetch", "origin", "tag", "v2.1.0"], { stdio: "inherit" });
  if (!fs.existsSync(root)) {
    spawnChecked("git", ["-C", sparkRepoRoot, "worktree", "add", "--detach", root, "v2.1.0"], { stdio: "inherit" });
  }
  assertReadable(path.join(root, "dist", "spark.module.js"));
  return root;
}

function findThreeRoot(sparkRoot) {
  const candidates = [
    argv.get("three-root"),
    path.join(sparkRoot, "node_modules", "three"),
    path.join(sparkRepoRoot, "node_modules", "three"),
    path.join(repoRoot, "node_modules", "three"),
    path.join(depsRoot, "node_modules", "three"),
  ].filter(Boolean).map((candidate) => path.resolve(candidate));
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "build", "three.module.js")) &&
        fs.existsSync(path.join(candidate, "examples", "jsm", "postprocessing", "Pass.js"))) {
      return candidate;
    }
  }
  if (!allowInstallDeps) {
    throw new Error("three@0.180.0 is unavailable and --install-deps=false was set");
  }
  fs.mkdirSync(depsRoot, { recursive: true });
  spawnChecked("npm", [
    "install",
    "--prefix",
    depsRoot,
    "--ignore-scripts",
    "--package-lock=false",
    "three@0.180.0",
  ], { stdio: "inherit" });
  const installed = path.join(depsRoot, "node_modules", "three");
  assertReadable(path.join(installed, "build", "three.module.js"));
  assertReadable(path.join(installed, "examples", "jsm", "postprocessing", "Pass.js"));
  return installed;
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

function readCamera(scene) {
  const cameras = JSON.parse(fs.readFileSync(scene.camera, "utf8"));
  if (!Array.isArray(cameras) || !cameras[0]) {
    throw new Error(`No cameras[0] in ${scene.camera}`);
  }
  return cameras[0];
}

function canvasSize(camera) {
  return {
    width: Math.max(1, Math.floor(camera.width / downscale)),
    height: Math.max(1, Math.floor(camera.height / downscale)),
  };
}

function sceneByNameMap(scenes = sceneDefinitions) {
  return new Map(scenes.map((scene) => [scene.name, scene]));
}

function benchmarkHtml(scene, mode, transform, frames, warmup) {
  const camera = readCamera(scene);
  const size = canvasSize(camera);
  const config = {
    sceneName: scene.name,
    sceneUrl: `/scenes/${scene.name}/${path.basename(scene.file)}`,
    mode,
    transform,
    camera,
    downscale,
    width: size.width,
    height: size.height,
    frames,
    warmup,
    captureShaders,
    debugState,
    optimizeTintWgsl,
  };
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Spark GL2GPU Tint Benchmark</title>
  <style>
    html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #2b2928; }
    canvas { display: block; width: ${size.width}px; height: ${size.height}px; }
  </style>
  <script type="importmap">
  {
    "imports": {
      "three": "/three/build/three.module.js",
      "three/addons/": "/three/examples/jsm/",
      "@sparkjsdev/spark": "/spark/dist/spark.module.js"
    }
  }
  </script>
  ${mode === "gl2gpu-tint" ? '<script src="/js/gl2gpu.js"></script>' : ""}
</head>
<body>
  <canvas id="spark-canvas" width="${size.width}" height="${size.height}"></canvas>
  <script type="module">
    import * as THREE from "three";
    import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";

    const config = ${JSON.stringify(config)};
    const bench = {
      status: "booting",
      sceneName: config.sceneName,
      mode: config.mode,
      transform: config.transform,
      frameTimes: [],
      renderDurations: [],
      warmupFrames: config.warmup,
      maxFrames: config.frames,
      seenFrames: 0,
      measuredFrames: 0,
      loadStartMs: performance.now(),
      loadEndMs: null,
      settleStartMs: null,
      settleEndMs: null,
      settleStableFrames: 0,
      firstFrameMs: null,
      doneMs: null,
      errors: [],
      progress: [],
      canvas: { width: config.width, height: config.height },
      gl2gpuStats: null,
      gl2gpuDebug: null,
      adapterInfo: null,
      numSplats: null,
      activeSplats: null,
      finalDataUrl: null,
    };
    window.__SPARK_BENCH = bench;
    const textureDebugIds = new WeakMap();
    let nextTextureDebugId = 1;
    function textureDebugId(texture) {
      if (!texture || (typeof texture !== "object" && typeof texture !== "function")) return null;
      if (!textureDebugIds.has(texture)) textureDebugIds.set(texture, nextTextureDebugId++);
      return textureDebugIds.get(texture);
    }

    function digestUint32Array(value, count) {
      if (!value || typeof value.length !== "number") return null;
      const length = Math.min(value.length, Math.max(0, Number(count) || value.length));
      let fnv1a = 0x811c9dc5;
      let sum = 0;
      let xor = 0;
      for (let index = 0; index < length; index++) {
        const item = Number(value[index]) >>> 0;
        fnv1a = Math.imul(fnv1a ^ item, 0x01000193) >>> 0;
        sum = (sum + item) >>> 0;
        xor = (xor ^ item) >>> 0;
      }
      const slice = (start, end) => Array.from(value.subarray
        ? value.subarray(start, end)
        : Array.prototype.slice.call(value, start, end));
      return {
        length,
        fnv1a: fnv1a.toString(16).padStart(8, "0"),
        sum,
        xor,
        head: slice(0, Math.min(16, length)),
        tail: slice(Math.max(0, length - 16), length),
      };
    }

    window.addEventListener("error", (event) => {
      bench.errors.push(String(event.error && (event.error.stack || event.error.message) || event.message || event));
      bench.status = "error";
    });
    window.addEventListener("unhandledrejection", (event) => {
      bench.errors.push(String(event.reason && (event.reason.stack || event.reason.message) || event.reason || event));
      bench.status = "error";
    });

    function installGl2gpuStats(context) {
      if (!window.GL2GPU || !context) return;
      const stats = {
        beginFrame: 0,
        endFrame: 0,
        drawArrays: 0,
        drawElements: 0,
        drawArraysInstanced: 0,
        drawElementsInstanced: 0,
        activeTexture: 0,
        bindTexture: 0,
        texImage2D: 0,
        texSubImage2D: 0,
        texImage3D: 0,
        texSubImage3D: 0,
        readPixels: 0,
        submit: 0,
      };
      bench.gl2gpuStats = stats;
      if (config.debugState) {
        bench.gl2gpuDebug = {
          draws: [],
          readbacks: [],
          uploads: [],
          textureBinds: [],
          syncs: [],
          uniforms: [],
        };
      }

      function enumName(value) {
        const names = {
          1028: "FRONT",
          1029: "BACK",
          34853: "COLOR_ATTACHMENT0",
          36064: "COLOR_ATTACHMENT0",
          36065: "COLOR_ATTACHMENT1",
          36066: "COLOR_ATTACHMENT2",
          36067: "COLOR_ATTACHMENT3",
          36068: "COLOR_ATTACHMENT4",
          36069: "COLOR_ATTACHMENT5",
          36070: "COLOR_ATTACHMENT6",
          36071: "COLOR_ATTACHMENT7",
          36072: "COLOR_ATTACHMENT8",
          36073: "COLOR_ATTACHMENT9",
          36074: "COLOR_ATTACHMENT10",
          36075: "COLOR_ATTACHMENT11",
          36076: "COLOR_ATTACHMENT12",
          36077: "COLOR_ATTACHMENT13",
          36078: "COLOR_ATTACHMENT14",
          36079: "COLOR_ATTACHMENT15",
          36160: "FRAMEBUFFER",
          36008: "READ_FRAMEBUFFER",
          36009: "DRAW_FRAMEBUFFER",
        };
        return names[value] || String(value);
      }

      function sampleBytes(bytes, byteOffset = 0, byteLength = 64) {
        if (!bytes) return null;
        const view = bytes instanceof Uint8Array
          ? bytes
          : new Uint8Array(bytes.buffer, bytes.byteOffset || 0, bytes.byteLength || 0);
        const start = Math.max(0, Math.min(view.byteLength, byteOffset));
        const end = Math.max(start, Math.min(view.byteLength, start + byteLength));
        const slice = view.subarray(start, end);
        let nonZero = 0;
        let checksum = 0;
        for (let i = 0; i < slice.length; i++) {
          if (slice[i] !== 0) nonZero++;
          checksum = (checksum + ((i + 1) * slice[i])) >>> 0;
        }
        const u32 = [];
        const dv = new DataView(slice.buffer, slice.byteOffset, slice.byteLength);
        for (let i = 0; i + 4 <= slice.byteLength && u32.length < 16; i += 4) {
          u32.push(dv.getUint32(i, true));
        }
        return {
          byteOffset: start,
          byteLength: slice.byteLength,
          nonZero,
          checksum,
          firstBytes: Array.from(slice.subarray(0, Math.min(32, slice.length))),
          firstU32: u32,
        };
      }

      function summarizeArg(value) {
        if (value === null || value === undefined) return value;
        if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") return value;
        if (ArrayBuffer.isView(value)) {
          return {
            type: value.constructor ? value.constructor.name : "TypedArray",
            byteLength: value.byteLength,
            length: value.length,
            sample: sampleBytes(new Uint8Array(value.buffer, value.byteOffset, Math.min(value.byteLength, 64))),
          };
        }
        if (value instanceof ArrayBuffer) {
          return { type: "ArrayBuffer", byteLength: value.byteLength };
        }
        return {
          type: value.constructor ? value.constructor.name : typeof value,
          string: String(value),
        };
      }

      function attachmentSummary(framebuffer) {
        if (!framebuffer) return null;
        const attachments = [];
        try {
          for (const [point, attachment] of framebuffer.attachments || []) {
            attachments.push({
              point,
              pointName: enumName(point),
              level: attachment.level ?? null,
              layer: attachment.layer ?? null,
              face: attachment.face ?? null,
              width: attachment.width ?? null,
              height: attachment.height ?? null,
              format: attachment.format ?? null,
              textureHash: attachment.attachment ? attachment.attachment.hash : null,
              textureOrigin: attachment.attachment ? attachment.attachment.sourceOrigin : null,
            });
          }
        } catch (error) {
          attachments.push({ error: String(error && (error.message || error)) });
        }
        return {
          drawBuffers: Array.from(framebuffer.drawBuffers || []).map((value) => ({ value, name: enumName(value) })),
          readBuffer: framebuffer.readBuffer,
          readBufferName: enumName(framebuffer.readBuffer),
          attachments,
        };
      }

      function programSummary(program) {
        if (!program) return null;
        const uniforms = [];
        try {
          for (const uniform of program.hydUniforms || []) {
            if (uniforms.length >= 80) break;
            const start = uniform.wordOffset || 0;
            const words = Math.min(16, Math.max(1, Math.ceil((uniform.byteLength || 4) / 4)));
            uniforms.push({
              name: uniform.name,
              type: uniform.webgl_type,
              size: uniform.size,
              offset: uniform.offset,
              byteLength: uniform.byteLength,
              alignedByteLength: uniform.alignedByteLength,
              valuesF32: uniform.float32View ? Array.from(uniform.float32View.subarray(start, start + words)) : null,
              valuesU32: uniform.uint32View ? Array.from(uniform.uint32View.subarray(start, start + words)) : null,
            });
          }
        } catch (error) {
          uniforms.push({ error: String(error && (error.message || error)) });
        }
        return {
          hash: program.hash,
          alignedUniformSize: program.alignedUniformSize,
          fragCoordHeightUniform: program.fragCoordHeightUniform ? {
            name: program.fragCoordHeightUniform.name,
            offset: program.fragCoordHeightUniform.offset,
          } : null,
          fragCoordHeightValue: Number.isFinite(program.fragCoordHeightValue)
            ? program.fragCoordHeightValue
            : null,
          fragmentOutputLocations: program.fragmentOutputLocations
            ? Array.from(program.fragmentOutputLocations.entries())
            : [],
          fragmentOutputTypes: program.fragmentOutputTypes
            ? Array.from(program.fragmentOutputTypes.entries())
            : [],
          uniforms,
          samplers: (program.hydSamplers || []).map((sampler) => ({
            name: sampler.name,
            textureUnit: sampler.textureUnit,
            webglType: sampler.webgl_type,
            sampleType: sampler.sampleType,
            samplerBindingType: sampler.samplerBindingType,
            viewDimension: sampler.viewDimension,
          })),
        };
      }

      function textureUnitSummary(globalState, samplers) {
        const units = [];
        for (const sampler of samplers || []) {
          const binding = globalState.textureUnits && globalState.textureUnits[sampler.textureUnit];
          const texture = binding && binding[sampler.viewDimension];
          units.push({
            sampler: sampler.name,
            textureUnit: sampler.textureUnit,
            viewDimension: sampler.viewDimension,
            hasTexture: !!texture,
            textureHash: texture ? texture.hash : null,
            width: texture ? texture.width : null,
            height: texture ? texture.height : null,
            depth: texture ? texture.depth : null,
            format: texture ? texture.format : null,
            sourceOrigin: texture ? texture.sourceOrigin : null,
          });
        }
        return units;
      }

      function vertexAttribSummary(index) {
        try {
          return {
            enabled: context.getVertexAttrib(index, context.VERTEX_ATTRIB_ARRAY_ENABLED),
            size: context.getVertexAttrib(index, context.VERTEX_ATTRIB_ARRAY_SIZE),
            type: context.getVertexAttrib(index, context.VERTEX_ATTRIB_ARRAY_TYPE),
            normalized: context.getVertexAttrib(index, context.VERTEX_ATTRIB_ARRAY_NORMALIZED),
            stride: context.getVertexAttrib(index, context.VERTEX_ATTRIB_ARRAY_STRIDE),
            divisor: context.getVertexAttrib(index, context.VERTEX_ATTRIB_ARRAY_DIVISOR),
            integer: context.getVertexAttrib(index, context.VERTEX_ATTRIB_ARRAY_INTEGER),
            offset: context.getVertexAttribOffset(index, context.VERTEX_ATTRIB_ARRAY_POINTER),
            buffer: summarizeArg(context.getVertexAttrib(index, context.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING)),
            current: summarizeArg(context.getVertexAttrib(index, context.CURRENT_VERTEX_ATTRIB)),
          };
        } catch (error) {
          return { error: String(error && (error.message || error)) };
        }
      }

      function stateSnapshot(reason, name, args) {
        if (!bench.gl2gpuDebug) return null;
        const gs = context.hydGlobalState || {};
        const common = gs.commonState || {};
        const apiProgram = context.getParameter(context.CURRENT_PROGRAM);
        const apiDrawFramebuffer = context.getParameter(context.DRAW_FRAMEBUFFER_BINDING);
        const apiReadFramebuffer = context.getParameter(context.READ_FRAMEBUFFER_BINDING);
        let drawFramebufferStatus = null;
        let readFramebufferStatus = null;
        try {
          drawFramebufferStatus = context.checkFramebufferStatus(context.DRAW_FRAMEBUFFER);
          readFramebufferStatus = context.checkFramebufferStatus(context.READ_FRAMEBUFFER);
        } catch (_) {}
        return {
          timeMs: performance.now(),
          frame: bench.seenFrames,
          reason,
          call: name,
          args: Array.from(args || []).map(summarizeArg),
          topology: gs.topology,
          viewport: common.viewport ? Array.from(common.viewport) : Array.from(context.getParameter(context.VIEWPORT) || []),
          scissor: gs.miscState && gs.miscState.scissorBox ? Array.from(gs.miscState.scissorBox) : null,
          scissorTest: gs.miscState ? !!gs.miscState.scissorTest : context.isEnabled(context.SCISSOR_TEST),
          blendEnabled: gs.blendState ? !!gs.blendState.enabled : context.isEnabled(context.BLEND),
          blendState: gs.blendState ? {
            srcRGB: gs.blendState.srcRGB,
            dstRGB: gs.blendState.dstRGB,
            srcAlpha: gs.blendState.srcAlpha,
            dstAlpha: gs.blendState.dstAlpha,
            equationRGB: gs.blendState.equationRGB,
            equationAlpha: gs.blendState.equationAlpha,
          } : null,
          depthEnabled: gs.depthState ? !!gs.depthState.enabled : context.isEnabled(context.DEPTH_TEST),
          depthWrite: gs.depthState ? !!gs.depthState.writeMask : context.getParameter(context.DEPTH_WRITEMASK),
          depthFunc: gs.depthState ? gs.depthState.func : context.getParameter(context.DEPTH_FUNC),
          clearTarget: gs.clearState ? gs.clearState.target : null,
          clearDepth: gs.clearState ? gs.clearState.depth : null,
          colorWriteMask: gs.miscState && gs.miscState.colorWriteMask
            ? Array.from(gs.miscState.colorWriteMask)
            : Array.from(context.getParameter(context.COLOR_WRITEMASK) || []),
          vertexAttrib0: vertexAttribSummary(0),
          drawFramebuffer: attachmentSummary(common.drawFramebufferBinding || apiDrawFramebuffer),
          readFramebuffer: attachmentSummary(common.readFramebufferBinding || apiReadFramebuffer),
          drawFramebufferStatus,
          drawFramebufferStatusName: enumName(drawFramebufferStatus),
          readFramebufferStatus,
          readFramebufferStatusName: enumName(readFramebufferStatus),
          program: programSummary(common.currentProgram || apiProgram),
          fragCoordHeightValue: apiProgram && Number.isFinite(apiProgram.fragCoordHeightValue)
            ? apiProgram.fragCoordHeightValue
            : null,
          textureUnits: textureUnitSummary(gs, common.currentProgram && common.currentProgram.hydSamplers),
          pixelPackBytes: sampleBytes(common.pixelPackBufferBinding && common.pixelPackBufferBinding.shadowData),
        };
      }

      function uploadBindingSummary(target) {
        const bindingEnums = {
          [context.TEXTURE_2D]: context.TEXTURE_BINDING_2D,
          [context.TEXTURE_3D]: context.TEXTURE_BINDING_3D,
          [context.TEXTURE_2D_ARRAY]: context.TEXTURE_BINDING_2D_ARRAY,
          [context.TEXTURE_CUBE_MAP]: context.TEXTURE_BINDING_CUBE_MAP,
        };
        const bindingEnum = bindingEnums[target];
        const texture = bindingEnum === undefined ? null : context.getParameter(bindingEnum);
        return {
          activeTexture: context.getParameter(context.ACTIVE_TEXTURE),
          textureId: textureDebugId(texture),
          hasTexture: !!texture,
        };
      }

      for (const name of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced", "activeTexture", "bindTexture", "texImage2D", "texSubImage2D", "texImage3D", "texSubImage3D", "readPixels", "clear", "enable", "disable", "depthFunc", "depthMask", "blendFunc", "blendFuncSeparate", "blendEquation", "blendEquationSeparate"]) {
        if (typeof context[name] !== "function") continue;
        const original = context[name].bind(context);
        context[name] = function(...args) {
          stats[name]++;
          if (bench.gl2gpuDebug && (/^draw/.test(name) || ["clear", "enable", "disable", "depthFunc", "depthMask"].includes(name)) && bench.gl2gpuDebug.draws.length < 120) {
            bench.gl2gpuDebug.draws.push(stateSnapshot("before", name, args));
          }
          const result = original(...args);
          if (bench.gl2gpuDebug && /^draw/.test(name) && bench.gl2gpuDebug.draws.length < 120) {
            const snapshot = stateSnapshot("after", name, args);
            snapshot.webglError = context.getError();
            snapshot.webglErrorName = enumName(snapshot.webglError);
            bench.gl2gpuDebug.draws.push(snapshot);
          }
          if (bench.gl2gpuDebug && name === "readPixels" && bench.gl2gpuDebug.readbacks.length < 20) {
            const entry = stateSnapshot("after-readPixels-call", name, args);
            bench.gl2gpuDebug.readbacks.push(entry);
            window.setTimeout(() => {
              bench.gl2gpuDebug.readbacks.push(stateSnapshot("after-readPixels-timeout", name, args));
            }, 250);
          }
          if (bench.gl2gpuDebug && /^texSubImage/.test(name) && bench.gl2gpuDebug.uploads.length < 40) {
            const entry = stateSnapshot("after-upload", name, args);
            entry.uploadBinding = uploadBindingSummary(args[0]);
            bench.gl2gpuDebug.uploads.push(entry);
          }
          if (bench.gl2gpuDebug && (name === "activeTexture" || name === "bindTexture") && bench.gl2gpuDebug.textureBinds.length < 240) {
            bench.gl2gpuDebug.textureBinds.push({
              timeMs: performance.now(),
              call: name,
              activeTexture: context.getParameter(context.ACTIVE_TEXTURE),
              target: name === "bindTexture" ? args[0] : null,
              textureId: name === "bindTexture" ? textureDebugId(args[1]) : null,
            });
          }
          return result;
        };
      }
      for (const name of ["fenceSync", "clientWaitSync", "getBufferSubData"]) {
        if (!bench.gl2gpuDebug || typeof context[name] !== "function") continue;
        const original = context[name].bind(context);
        context[name] = function(...args) {
          const result = original(...args);
          if (bench.gl2gpuDebug.syncs.length < 80) {
            bench.gl2gpuDebug.syncs.push({
              ...stateSnapshot("after-sync-call", name, args),
              result: typeof result === "number" ? result : String(result),
            });
          }
          return result;
        };
      }
      if (bench.gl2gpuDebug && typeof context.getUniformLocation === "function") {
        const originalGetUniformLocation = context.getUniformLocation.bind(context);
        context.getUniformLocation = function(program, uniformName) {
          const result = originalGetUniformLocation(program, uniformName);
          if (bench.gl2gpuDebug.uniforms.length < 400) {
            bench.gl2gpuDebug.uniforms.push({
              timeMs: performance.now(),
              call: "getUniformLocation",
              programHash: program && program.hash,
              uniformName,
              found: !!result,
              resultName: result && result.name,
              resultType: result && result.constructor && result.constructor.name,
            });
          }
          return result;
        };
      }
      for (const name of ["uniform1f", "uniform2f", "uniform3f", "uniform4f", "uniform1i", "uniform2i", "uniform3i", "uniform4i", "uniform1ui", "uniform2ui", "uniform3ui", "uniform4ui", "uniform1fv", "uniform2fv", "uniform3fv", "uniform4fv", "uniform1iv", "uniform2iv", "uniform3iv", "uniform4iv", "uniform1uiv", "uniform2uiv", "uniform3uiv", "uniform4uiv", "uniformMatrix2fv", "uniformMatrix3fv", "uniformMatrix4fv"]) {
        if (!bench.gl2gpuDebug || typeof context[name] !== "function") continue;
        const originalUniform = context[name].bind(context);
        context[name] = function(location, ...args) {
          if (bench.gl2gpuDebug.uniforms.length < 400) {
            bench.gl2gpuDebug.uniforms.push({
              timeMs: performance.now(),
              call: name,
              locationName: location && location.name,
              locationType: location && location.constructor && location.constructor.name,
              args: args.map(summarizeArg),
            });
          }
          return originalUniform(location, ...args);
        };
      }
      if (context.hydDevice && context.hydDevice.queue && typeof context.hydDevice.queue.submit === "function") {
        const originalSubmit = context.hydDevice.queue.submit.bind(context.hydDevice.queue);
        context.hydDevice.queue.submit = function(...args) {
          stats.submit++;
          return originalSubmit(...args);
        };
      }
    }

    async function getAdapterInfo() {
      if (!navigator.gpu || !navigator.gpu.requestAdapter) return null;
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) return null;
        if (typeof adapter.requestAdapterInfo === "function") {
          return await adapter.requestAdapterInfo();
        }
        return {
          features: Array.from(adapter.features || []),
          limits: adapter.limits ? {
            maxTextureDimension2D: adapter.limits.maxTextureDimension2D,
            maxTextureArrayLayers: adapter.limits.maxTextureArrayLayers,
          } : null,
        };
      } catch (error) {
        return { error: String(error && (error.message || error)) };
      }
    }

    function applyCamera(camera, cameraJson, transform) {
      const scaledFy = cameraJson.fy / config.downscale;
      camera.fov = 2 * Math.atan(config.height / (2 * scaledFy)) * 180 / Math.PI;
      camera.aspect = config.width / config.height;
      camera.near = 0.01;
      camera.far = 1000;
      const position = new THREE.Vector3().fromArray(cameraJson.position);
      const r = cameraJson.rotation;
      const worldToCameraRotation = new THREE.Matrix4();
      worldToCameraRotation.set(
        r[0][0], r[0][1], r[0][2], 0,
        r[1][0], r[1][1], r[1][2], 0,
        r[2][0], r[2][1], r[2][2], 0,
        0, 0, 0, 1
      );
      const matrix = new THREE.Matrix4();
      if (transform === "inverse") {
        matrix.copy(worldToCameraRotation).transpose();
        camera.position.copy(position);
      } else if (transform === "direct") {
        matrix.copy(worldToCameraRotation);
        camera.position.copy(position);
      } else if (transform === "opencv-column" || transform === "opencv-column-mesh-x") {
        const cvToThreeCamera = new THREE.Matrix4().makeScale(1, -1, -1);
        matrix.copy(worldToCameraRotation).multiply(cvToThreeCamera);
        camera.position.copy(position);
        if (transform === "opencv-column-mesh-x") {
          const meshWorld = new THREE.Matrix4().makeRotationX(Math.PI);
          matrix.premultiply(meshWorld);
          camera.position.applyMatrix4(meshWorld);
        }
      } else if (transform === "opencv" || transform === "opencv-mesh-x") {
        const cvToThreeCamera = new THREE.Matrix4().makeScale(1, -1, -1);
        matrix.copy(worldToCameraRotation).transpose().multiply(cvToThreeCamera);
        camera.position.copy(position);
        if (transform === "opencv-mesh-x") {
          const meshWorld = new THREE.Matrix4().makeRotationX(Math.PI);
          matrix.premultiply(meshWorld);
          camera.position.applyMatrix4(meshWorld);
        }
      } else if (transform === "websplatter" || transform === "websplatter-mesh-x") {
        const view = new THREE.Matrix4();
        const translateNegativePosition = new THREE.Matrix4().makeTranslation(-position.x, -position.y, -position.z);
        view.copy(worldToCameraRotation).multiply(translateNegativePosition);
        const world = view.clone().invert();
        if (transform === "websplatter-mesh-x") {
          world.premultiply(new THREE.Matrix4().makeRotationX(Math.PI));
        }
        matrix.extractRotation(world);
        camera.position.setFromMatrixPosition(world);
      } else {
        matrix.copy(worldToCameraRotation).transpose();
        camera.position.copy(position);
      }
      camera.quaternion.setFromRotationMatrix(matrix);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
    }

    async function createRenderer(canvas) {
      const attrs = {
        antialias: false,
        alpha: true,
        depth: true,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
      };
      if (config.mode !== "gl2gpu-tint") {
        return new THREE.WebGLRenderer({ canvas, ...attrs });
      }
      if (!window.GL2GPU) throw new Error("GL2GPU script did not load");
      window.__HYD_STATIC_SAMPLER_ORIGIN_VARIANTS = true;
      window.__HYD_TRANSLATOR_OPTIONS = {
        ...(window.__HYD_TRANSLATOR_OPTIONS || {}),
        optimizeTintWgsl: config.optimizeTintWgsl,
        captureShaders: config.captureShaders,
      };
      const context = await GL2GPU.gl2gpuGetContext(
        canvas,
        null,
        ["webgl2", attrs],
        [1 << 23, 0],
        { legacyTextureCoordinateFixups: false, optimizeTintWgsl: config.optimizeTintWgsl, captureShaders: config.captureShaders }
      );
      installGl2gpuStats(context);
      const originalGetContext = canvas.getContext.bind(canvas);
      const webglNames = new Set(["webgl", "experimental-webgl", "webgl2"]);
      canvas.getContext = function(type, options) {
        if (webglNames.has(type)) return context;
        return originalGetContext(type, options);
      };
      return new THREE.WebGLRenderer({ canvas, context, ...attrs });
    }

    try {
      bench.adapterInfo = await getAdapterInfo();
      const canvas = document.getElementById("spark-canvas");
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x2b2928);
      const camera = new THREE.PerspectiveCamera(60, config.width / config.height, 0.01, 1000);
      applyCamera(camera, config.camera, config.transform);
      const renderer = await createRenderer(canvas);
      const gl = renderer.getContext();
      renderer.setPixelRatio(1);
      renderer.setSize(config.width, config.height, false);
      const spark = new SparkRenderer({ renderer });
      scene.add(spark);
      const mesh = new SplatMesh({
        url: config.sceneUrl,
        onProgress: (event) => {
          if (bench.progress.length < 100) {
            bench.progress.push({ loaded: event.loaded, total: event.total, timeMs: performance.now() });
          }
        },
      });
      if (config.transform.endsWith("-mesh-x")) {
        mesh.quaternion.set(1, 0, 0, 0);
      } else {
        mesh.quaternion.identity();
      }
      scene.add(mesh);
      bench.status = "loading";
      mesh.initialized.then(() => {
        bench.loadEndMs = performance.now();
        bench.settleStartMs = bench.loadEndMs;
        bench.numSplats = mesh.numSplats;
        bench.status = "settling";
      }).catch((error) => {
        bench.errors.push(String(error && (error.stack || error.message) || error));
        bench.status = "error";
      });

      let lastRafTimestamp = null;
      function probeIntegerTexture(textureUnit, target) {
        const previousActiveTexture = gl.getParameter(gl.ACTIVE_TEXTURE);
        const previousReadFramebuffer = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
        const previousDrawFramebuffer = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING);
        const previousProgram = gl.getParameter(gl.CURRENT_PROGRAM);
        const previousViewport = gl.getParameter(gl.VIEWPORT);
        const bindingName = target === gl.TEXTURE_2D_ARRAY ? gl.TEXTURE_BINDING_2D_ARRAY : gl.TEXTURE_BINDING_2D;
        gl.activeTexture(gl.TEXTURE0 + textureUnit);
        const sourceTexture = gl.getParameter(bindingName);
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, [
          "#version 300 es",
          "void main() {",
          "  vec2 positions[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));",
          "  gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);",
          "}",
        ].join("\\n"));
        gl.compileShader(vertexShader);
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        const samplerType = target === gl.TEXTURE_2D_ARRAY ? "usampler2DArray" : "usampler2D";
        const coordinate = target === gl.TEXTURE_2D_ARRAY ? "ivec3(0, 0, 0)" : "ivec2(0, 0)";
        gl.shaderSource(fragmentShader, [
          "#version 300 es",
          "precision highp float;",
          "precision highp " + samplerType + ";",
          "uniform " + samplerType + " sourceTexture;",
          "layout(location = 0) out vec4 outColor;",
          "void main() {",
          "  uvec4 value = texelFetch(sourceTexture, " + coordinate + ", 0);",
          "  outColor = vec4(value & uvec4(255u)) / 255.0;",
          "}",
        ].join("\\n"));
        gl.compileShader(fragmentShader);
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        const shaderLogs = [gl.getShaderInfoLog(vertexShader), gl.getShaderInfoLog(fragmentShader), gl.getProgramInfoLog(program)].filter(Boolean);
        gl.useProgram(program);
        gl.uniform1i(gl.getUniformLocation(program, "sourceTexture"), textureUnit);
        gl.activeTexture(gl.TEXTURE7);
        const outputTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, outputTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        const framebuffer = gl.createFramebuffer();
        const pixels = new Uint8Array(4);
        let status = null;
        let error = null;
        try {
          gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outputTexture, 0);
          gl.readBuffer(gl.COLOR_ATTACHMENT0);
          status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
          if (status === gl.FRAMEBUFFER_COMPLETE) {
            gl.viewport(0, 0, 1, 1);
            gl.disable(gl.BLEND);
            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.CULL_FACE);
            gl.disable(gl.SCISSOR_TEST);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          }
        } catch (probeError) {
          error = String(probeError && (probeError.stack || probeError.message) || probeError);
        } finally {
          gl.bindFramebuffer(gl.READ_FRAMEBUFFER, previousReadFramebuffer);
          gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, previousDrawFramebuffer);
          gl.useProgram(previousProgram);
          gl.viewport(previousViewport[0], previousViewport[1], previousViewport[2], previousViewport[3]);
          gl.activeTexture(previousActiveTexture);
          gl.deleteFramebuffer(framebuffer);
          gl.deleteTexture(outputTexture);
          gl.deleteProgram(program);
          gl.deleteShader(vertexShader);
          gl.deleteShader(fragmentShader);
        }
        return {
          textureUnit,
          target,
          hasTexture: !!sourceTexture,
          textureId: textureDebugId(sourceTexture),
          status,
          pixels: Array.from(pixels),
          shaderLogs,
          error,
        };
      }

      window.__SPARK_RUN_DEBUG_PROBES = function() {
        if (!config.debugState || bench.textureProbes) return;
        bench.textureProbes = [
          probeIntegerTexture(0, gl.TEXTURE_2D),
          probeIntegerTexture(0, gl.TEXTURE_2D_ARRAY),
          probeIntegerTexture(1, gl.TEXTURE_2D_ARRAY),
          probeIntegerTexture(2, gl.TEXTURE_2D_ARRAY),
        ];
      };

      function animate(timestamp) {
        const shouldRender = bench.status !== "done" && bench.status !== "error";
        if (!shouldRender) return;
        const renderStart = performance.now();
        if (window.GL2GPU) {
          if (bench.gl2gpuStats) bench.gl2gpuStats.beginFrame++;
          GL2GPU.beginFrame();
        }
        try {
          renderer.render(scene, camera);
        } finally {
          if (window.GL2GPU) {
            GL2GPU.endFrame();
            if (bench.gl2gpuStats) bench.gl2gpuStats.endFrame++;
          }
        }
        const renderEnd = performance.now();
        if (bench.firstFrameMs === null) bench.firstFrameMs = renderEnd;
        bench.activeSplats = spark.activeSplats;
        bench.sorting = spark.sorting;
        bench.sortDirty = spark.sortDirty;
        if (bench.status === "settling") {
          const settled = spark.activeSplats > 0 && !spark.sorting && !spark.sortDirty;
          bench.settleStableFrames = settled ? bench.settleStableFrames + 1 : 0;
          if (bench.settleStableFrames >= 5) {
            bench.sortReadbackDigest = digestUint32Array(spark.readback32, spark.activeSplats);
            bench.orderingDigest = digestUint32Array(
              spark.orderingTexture && spark.orderingTexture.image && spark.orderingTexture.image.data,
              spark.activeSplats,
            );
            bench.settleEndMs = performance.now();
            bench.status = "running";
            bench.seenFrames = 0;
            lastRafTimestamp = null;
          }
        }
        if (bench.status === "running") {
          if (lastRafTimestamp !== null) {
            if (bench.seenFrames >= bench.warmupFrames && bench.frameTimes.length < bench.maxFrames) {
              bench.frameTimes.push(timestamp - lastRafTimestamp);
              bench.renderDurations.push(renderEnd - renderStart);
              bench.measuredFrames = bench.frameTimes.length;
              if (bench.frameTimes.length >= bench.maxFrames) {
                try {
                  bench.finalDataUrl = canvas.toDataURL("image/png");
                } catch (error) {
                  bench.errors.push(String(error && (error.message || error)));
                }
                bench.status = "done";
                bench.doneMs = performance.now();
                renderer.setAnimationLoop(null);
                return;
              }
            }
            bench.seenFrames++;
          }
          lastRafTimestamp = timestamp;
        }
      }
      renderer.setAnimationLoop(animate);
    } catch (error) {
      bench.errors.push(String(error && (error.stack || error.message) || error));
      bench.status = "error";
    }
  </script>
</body>
</html>`;
}

async function startServer({ sparkRoot, threeRoot }) {
  const scenes = sceneByNameMap(selectedScenes());
  const state = {
    shaderDbRequests: 0,
    missing: [],
    requests: [],
  };
  const server = http.createServer((request, response) => {
    try {
      const url = new URL(request.url, "http://127.0.0.1");
      const pathname = url.pathname;
      state.requests.push(pathname);
      if (/shaders?_info\.json$/i.test(pathname)) {
        state.shaderDbRequests++;
        sendBuffer(response, 404, Buffer.from("manual shader DB disabled"), "text/plain; charset=utf-8");
        return;
      }
      if (pathname === "/benchmark.html") {
        const scene = scenes.get(url.searchParams.get("scene") || "");
        if (!scene) {
          sendBuffer(response, 400, Buffer.from(`unknown scene: ${url.searchParams.get("scene")}`), "text/plain; charset=utf-8");
          return;
        }
        const mode = url.searchParams.get("mode") || "webgl";
        const transform = url.searchParams.get("transform") || "direct";
        const frames = Number(url.searchParams.get("frames") || measureFrames);
        const warmup = Number(url.searchParams.get("warmup") || warmupFrames);
        sendBuffer(response, 200, Buffer.from(benchmarkHtml(scene, mode, transform, frames, warmup), "utf8"), "text/html; charset=utf-8");
        return;
      }
      if (pathname === "/js/gl2gpu.js") {
        sendBuffer(response, 200, fs.readFileSync(path.join(releaseRoot, "gl2gpu.js")), contentType(pathname));
        return;
      }
      if (pathname === "/js/glslang.wasm" || pathname === "/js/tint_wasm.wasm") {
        sendBuffer(response, 200, fs.readFileSync(path.join(releaseRoot, path.basename(pathname))), contentType(pathname));
        return;
      }
      if (pathname.startsWith("/spark/")) {
        const file = safeStaticPath(sparkRoot, pathname.slice("/spark/".length));
        if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
          sendBuffer(response, 200, fs.readFileSync(file), contentType(file));
          return;
        }
      }
      if (pathname.startsWith("/three/")) {
        const file = safeStaticPath(threeRoot, pathname.slice("/three/".length));
        if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
          sendBuffer(response, 200, fs.readFileSync(file), contentType(file));
          return;
        }
      }
      if (pathname.startsWith("/scenes/")) {
        const parts = pathname.split("/").filter(Boolean);
        const scene = scenes.get(parts[1]);
        if (scene && parts.length === 3) {
          const requested = parts[2];
          let file = null;
          if (requested === path.basename(scene.file)) file = scene.file;
          if (requested === "cameras.json") file = scene.camera;
          if (file && fs.existsSync(file)) {
            const headers = {};
            if (path.extname(file).toLowerCase() === ".ply") {
              headers["accept-ranges"] = "bytes";
            }
            sendBuffer(response, 200, fs.readFileSync(file), contentType(file), headers);
            return;
          }
        }
      }
      if (pathname === "/favicon.ico") {
        response.writeHead(204);
        response.end();
        return;
      }
      state.missing.push(pathname);
      sendBuffer(response, 404, Buffer.from(`not found: ${pathname}`), "text/plain; charset=utf-8");
    } catch (error) {
      sendBuffer(response, 500, Buffer.from(error.stack || error.message || String(error)), "text/plain; charset=utf-8");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    server,
    state,
    baseURL: `http://127.0.0.1:${server.address().port}`,
  };
}

async function installShaderCapture(page, shaderCaptures) {
  await page.exposeBinding("__hydShaderCapture", (_source, record) => {
    if (record && typeof record === "object") shaderCaptures.push(record);
  });
  await page.addInitScript(() => {
    window.__HYD_SHADER_CAPTURE = (record) => {
      if (typeof window.__hydShaderCapture === "function") {
        window.__hydShaderCapture(record);
      }
    };
  });
}

function summarizeFrameTimes(frameTimes) {
  const values = (frameTimes || []).filter((value) => Number.isFinite(value) && value > 0);
  if (values.length === 0) {
    return { count: 0, medianMs: null, averageMs: null, p90Ms: null, p99Ms: null, minMs: null, maxMs: null, fps: null };
  }
  const sorted = values.slice().sort((a, b) => a - b);
  const averageMs = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    count: values.length,
    medianMs: percentile(sorted, 0.5),
    averageMs,
    p90Ms: percentile(sorted, 0.9),
    p99Ms: percentile(sorted, 0.99),
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
    fps: 1000 / percentile(sorted, 0.5),
  };
}

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
}

function median(values) {
  const filtered = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (filtered.length === 0) return null;
  const mid = Math.floor(filtered.length / 2);
  if (filtered.length % 2 === 1) return filtered[mid];
  return (filtered[mid - 1] + filtered[mid]) / 2;
}

function coefficientOfVariation(values) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (filtered.length < 2) return 0;
  const mean = filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
  if (mean === 0) return 0;
  const variance = filtered.reduce((sum, value) => sum + (value - mean) ** 2, 0) / filtered.length;
  return Math.sqrt(variance) / mean;
}

function writeShaderCaptures(scene, mode, trial, shaderCaptures) {
  if (shaderCaptures.length === 0) return null;
  const dir = path.join(outputRoot, "shader-captures");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${sanitizeName(scene.name)}-${sanitizeName(mode)}-${sanitizeName(trial)}.json`);
  fs.writeFileSync(file, JSON.stringify(shaderCaptures, null, 2));
  return file;
}

function imageStats(file) {
  if (!file || !fs.existsSync(file)) return null;
  const identify = spawnSync("magick", ["identify", "-format", "%w %h", file], { encoding: "utf8" });
  if (identify.status !== 0) return { error: identify.stderr || identify.error?.message || "identify failed" };
  const [width, height] = identify.stdout.trim().split(/\s+/).map(Number);
  const raw = spawnSync("magick", [file, "-depth", "8", "rgba:-"], {
    encoding: "buffer",
    maxBuffer: Math.max(64 * 1024 * 1024, width * height * 4 + 1024),
  });
  if (raw.status !== 0) return { error: raw.stderr ? raw.stderr.toString("utf8") : raw.error?.message || "raw conversion failed" };
  const bytes = raw.stdout;
  const corner = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];
  const bg = [0, 0, 0];
  for (const [x, y] of corner) {
    const index = (y * width + x) * 4;
    bg[0] += bytes[index];
    bg[1] += bytes[index + 1];
    bg[2] += bytes[index + 2];
  }
  bg[0] /= 4;
  bg[1] /= 4;
  bg[2] /= 4;
  let nonBackground = 0;
  let alphaPositive = 0;
  let sum = 0;
  let sumSq = 0;
  const pixels = width * height;
  const step = Math.max(1, Math.floor(pixels / 250000));
  let samples = 0;
  for (let pixel = 0; pixel < pixels; pixel += step) {
    const index = pixel * 4;
    const r = bytes[index];
    const g = bytes[index + 1];
    const b = bytes[index + 2];
    const a = bytes[index + 3];
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const dist = Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]);
    if (dist > 12) nonBackground++;
    if (a > 0) alphaPositive++;
    sum += luma;
    sumSq += luma * luma;
    samples++;
  }
  const mean = sum / samples;
  const variance = Math.max(0, sumSq / samples - mean * mean);
  return {
    width,
    height,
    samples,
    backgroundRgb: bg,
    nonBackgroundFraction: nonBackground / samples,
    alphaPositiveFraction: alphaPositive / samples,
    lumaMean: mean,
    lumaStddev: Math.sqrt(variance),
    nonBlank: nonBackground / samples > 0.002 || Math.sqrt(variance) > 1.5,
  };
}

function imageMetric(metric, a, b) {
  if (!a || !b || !fs.existsSync(a) || !fs.existsSync(b)) return null;
  const result = spawnSync("magick", ["compare", "-metric", metric, a, b, "null:"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = `${result.stderr || ""}${result.stdout || ""}`.trim();
  if (output) return output;
  if (result.status === 0) return "0";
  if (result.error) return `error: ${result.error.message}`;
  return null;
}

function readRgbaImage(file) {
  if (!file || !fs.existsSync(file)) return null;
  const identify = spawnSync("magick", ["identify", "-format", "%w %h", file], { encoding: "utf8" });
  if (identify.status !== 0) return null;
  const [width, height] = identify.stdout.trim().split(/\s+/).map(Number);
  const raw = spawnSync("magick", [file, "-depth", "8", "rgba:-"], {
    encoding: "buffer",
    maxBuffer: Math.max(64 * 1024 * 1024, width * height * 4 + 1024),
  });
  if (raw.status !== 0) return null;
  return { width, height, bytes: raw.stdout };
}

function imagePairMetrics(a, b) {
  const left = readRgbaImage(a);
  const right = readRgbaImage(b);
  if (!left || !right || left.width !== right.width || left.height !== right.height) return null;
  const pixels = left.width * left.height;
  const step = Math.max(1, Math.floor(pixels / 500000));
  let samples = 0;
  let rgbSquaredError = 0;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumYY = 0;
  let sumXY = 0;
  for (let pixel = 0; pixel < pixels; pixel += step) {
    const index = pixel * 4;
    const lr = left.bytes[index] / 255;
    const lg = left.bytes[index + 1] / 255;
    const lb = left.bytes[index + 2] / 255;
    const rr = right.bytes[index] / 255;
    const rg = right.bytes[index + 1] / 255;
    const rb = right.bytes[index + 2] / 255;
    rgbSquaredError += (lr - rr) ** 2 + (lg - rg) ** 2 + (lb - rb) ** 2;
    const x = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
    const y = 0.2126 * rr + 0.7152 * rg + 0.0722 * rb;
    sumX += x;
    sumY += y;
    sumXX += x * x;
    sumYY += y * y;
    sumXY += x * y;
    samples++;
  }
  const mse = rgbSquaredError / (samples * 3);
  const rmse = Math.sqrt(mse);
  const muX = sumX / samples;
  const muY = sumY / samples;
  const sigmaX = sumXX / samples - muX * muX;
  const sigmaY = sumYY / samples - muY * muY;
  const sigmaXY = sumXY / samples - muX * muY;
  const c1 = 0.01 ** 2;
  const c2 = 0.03 ** 2;
  return {
    samples,
    rmseNormalized: rmse,
    psnrDb: mse === 0 ? 99 : 10 * Math.log10(1 / mse),
    ssim: ((2 * muX * muY + c1) * (2 * sigmaXY + c2)) /
      ((muX * muX + muY * muY + c1) * (sigmaX + sigmaY + c2)),
  };
}

function normalizedMetric(metricText) {
  if (!metricText) return null;
  const parenthesized = /\(([0-9.]+)\)/.exec(String(metricText));
  if (parenthesized) return Number(parenthesized[1]);
  const first = /([0-9.]+)/.exec(String(metricText));
  return first ? Number(first[1]) : null;
}

function classifyFailure(texts) {
  const combined = texts.join("\n");
  if (/shader translation failed|Runtime shader translation failed|tint_wasm|SPIR-V|glslang|Error compiling|WGSL|GLSL/i.test(combined)) {
    return "shader_translation";
  }
  if (/not implemented|unsupported|INVALID_ENUM|extension/i.test(combined)) {
    return "unsupported_webgl_feature";
  }
  if (/texture|texImage|texSubImage|RGBA_INTEGER|sampler|framebuffer|readPixels|copyTex/i.test(combined)) {
    return "texture_or_framebuffer_layout";
  }
  if (/GPUValidationError|pipeline|bind group|render pass|attachment/i.test(combined)) {
    return "pipeline_state";
  }
  if (/getContext|undefined is not a function|is not a function|Cannot read/i.test(combined)) {
    return "runtime_state_missing";
  }
  if (/timeout|0 frame|black|blank/i.test(combined)) {
    return "rendering_or_timeout";
  }
  return texts.length > 0 ? "uncategorized_runtime_failure" : null;
}

async function runTrial(browser, baseURL, serverState, scene, mode, transform, trial, options = {}) {
  const camera = readCamera(scene);
  const size = canvasSize(camera);
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const messages = [];
  const pageErrors = [];
  const screenshotErrors = [];
  const requestFailures = [];
  const badResponses = [];
  const shaderCaptures = [];
  const frames = options.frames || measureFrames;
  const warmup = options.warmup || warmupFrames;
  const label = options.label || `trial-${trial}`;
  const severePatterns = [
    /validation error/i,
    /GPUValidationError/i,
    /shader translation failed/i,
    /Runtime shader translation failed/i,
    /Shader not found in shaderDB/i,
    /not implemented/i,
    /unsupported/i,
    /unhandledrejection/i,
    /\[HYD\].*(?:failed|failure|error)/i,
  ];

  page.on("console", (message) => {
    const text = message.text();
    if (messages.length < 500 && (message.type() === "error" || severePatterns.some((pattern) => pattern.test(text)))) {
      messages.push({ type: message.type(), text: text.slice(0, 4000) });
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.stack || error.message || String(error)));
  page.on("requestfailed", (request) => {
    requestFailures.push({
      url: request.url(),
      resourceType: request.resourceType(),
      failure: request.failure() ? request.failure().errorText : "unknown",
    });
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && !/favicon\.ico/i.test(response.url())) {
      badResponses.push({ url: response.url(), status: response.status(), resourceType: response.request().resourceType() });
    }
  });
  page.on("dialog", async (dialog) => {
    messages.push({ type: "dialog", text: dialog.message().slice(0, 4000) });
    await dialog.dismiss().catch(() => {});
  });
  if (captureShaders && mode === "gl2gpu-tint") {
    await installShaderCapture(page, shaderCaptures);
  }

  const shaderDbBefore = serverState.shaderDbRequests;
  const url = new URL("/benchmark.html", baseURL);
  url.searchParams.set("scene", scene.name);
  url.searchParams.set("mode", mode);
  url.searchParams.set("transform", transform);
  url.searchParams.set("frames", String(frames));
  url.searchParams.set("warmup", String(warmup));
  let timeout = false;
  try {
    await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.waitForFunction(() => {
      const bench = window.__SPARK_BENCH;
      return bench && (bench.status === "done" || bench.status === "error");
    }, null, { timeout: timeoutMs, polling: 500 });
    await page.waitForTimeout(250);
  } catch (error) {
    timeout = true;
    pageErrors.push(error.message || String(error));
  }

  const screenshot = path.join(outputRoot, `${sanitizeName(scene.name)}-${sanitizeName(mode)}-${sanitizeName(label)}.png`);
  let compositorScreenshot = false;
  await page.locator("canvas").first().screenshot({ path: screenshot, timeout: 30000 }).then(() => {
    compositorScreenshot = true;
  }).catch((error) => {
    screenshotErrors.push(`canvas screenshot: ${error.message || error}`);
  });
  if (debugState) {
    await page.evaluate(() => window.__SPARK_RUN_DEBUG_PROBES && window.__SPARK_RUN_DEBUG_PROBES())
      .catch((error) => screenshotErrors.push(`debug probes: ${error.message || error}`));
  }
  const finalDataUrl = await page.evaluate(() => window.__SPARK_BENCH && window.__SPARK_BENCH.finalDataUrl || null)
    .catch(() => null);
  const bench = await page.evaluate(() => {
    const bench = window.__SPARK_BENCH;
    if (!bench) return null;
    return { ...bench, finalDataUrl: undefined };
  })
    .catch((error) => ({ status: "error", errors: [error.message || String(error)], frameTimes: [] }));
  if (!compositorScreenshot && finalDataUrl && finalDataUrl.startsWith("data:image/png;base64,")) {
    fs.writeFileSync(screenshot, Buffer.from(finalDataUrl.split(",")[1], "base64"));
  } else if (!compositorScreenshot) {
    await page.screenshot({ path: screenshot, fullPage: false }).catch((fallbackError) => {
      screenshotErrors.push(`page screenshot: ${fallbackError.message || fallbackError}`);
    });
  }
  const shaderCaptureFile = writeShaderCaptures(scene, mode, label, shaderCaptures);
  await page.close().catch(() => {});
  await context.close().catch(() => {});

  const frameSummary = summarizeFrameTimes(bench && bench.frameTimes);
  const renderSummary = summarizeFrameTimes(bench && bench.renderDurations);
  const stats = imageStats(screenshot);
  const shaderDbRequests = serverState.shaderDbRequests - shaderDbBefore;
  const failureTexts = [
    ...(timeout ? ["timeout"] : []),
    ...pageErrors,
    ...(bench && Array.isArray(bench.errors) ? bench.errors : []),
    ...messages.map((message) => message.text),
    ...(stats ? [] : screenshotErrors),
    ...(mode === "gl2gpu-tint" && shaderDbRequests > 0 ? [`shaderDbRequests=${shaderDbRequests}`] : []),
    ...(frameSummary.count === 0 ? ["0 frameTimes captured"] : []),
    ...(stats && !stats.nonBlank ? ["blank or near-blank screenshot"] : []),
  ].filter(Boolean);
  const hardFailures = failureTexts.filter((text) => {
    if (/Failed to load resource:.*favicon/i.test(text)) return false;
    if (/source map/i.test(text)) return false;
    return true;
  });
  const valid = hardFailures.length === 0 && frameSummary.count > 0 && Boolean(stats && stats.nonBlank);
  return {
    scene: scene.name,
    sceneFile: scene.file,
    cameraFile: scene.camera,
    mode,
    transform,
    trial,
    label,
    url: url.href,
    timeout,
    valid,
    failureClass: valid ? null : classifyFailure(hardFailures),
    hardFailures: hardFailures.slice(0, 80),
    frameSummary,
    renderSummary,
    loadTimeMs: bench && bench.loadEndMs !== null ? bench.loadEndMs - bench.loadStartMs : null,
    settleTimeMs: bench && bench.settleStartMs !== null && bench.settleEndMs !== null
      ? bench.settleEndMs - bench.settleStartMs
      : null,
    firstFrameMs: bench && bench.firstFrameMs !== null ? bench.firstFrameMs - bench.loadStartMs : null,
    doneTimeMs: bench && bench.doneMs !== null ? bench.doneMs - bench.loadStartMs : null,
    numSplats: bench ? bench.numSplats : null,
    activeSplats: bench ? bench.activeSplats : null,
    shaderDbRequests,
    pageErrors,
    screenshotErrors,
    requestFailures: requestFailures.slice(0, 80),
    badResponses: badResponses.slice(0, 80),
    messages,
    bench,
    screenshot,
    imageStats: stats,
    shaderCaptureFile,
    shaderCaptureCount: shaderCaptures.length,
  };
}

async function chooseTransform(browser, baseURL, serverState, scene, transformCache, preflightResults) {
  const cacheKey = scene.camera;
  if (transformCache.has(cacheKey)) return transformCache.get(cacheKey);
  const candidates = [];
  for (const transform of cameraTransformCandidates) {
    console.log(`[preflight-camera] ${scene.name} webgl ${transform}`);
    const result = await runTrial(browser, baseURL, serverState, scene, "webgl", transform, 0, {
      label: `preflight-camera-${transform}`,
      frames: Math.min(preflightFrames, 30),
      warmup: preflightWarmupFrames,
    });
    preflightResults.push(result);
    candidates.push(result);
    console.log(`  valid=${result.valid} nonBackground=${result.imageStats?.nonBackgroundFraction ?? "n/a"} fps=${formatNumber(result.frameSummary.fps)}`);
  }
  candidates.sort((a, b) => {
    const av = a.valid ? 1 : 0;
    const bv = b.valid ? 1 : 0;
    if (av !== bv) return bv - av;
    return ((b.imageStats && b.imageStats.nonBackgroundFraction) || 0) -
      ((a.imageStats && a.imageStats.nonBackgroundFraction) || 0);
  });
  const chosen = candidates[0]?.transform || "direct";
  transformCache.set(cacheKey, chosen);
  return chosen;
}

function formatNumber(value, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : "n/a";
}

function trialPlanForCounts(modes, startTrial, endTrial) {
  if (modes.length !== 2) {
    const plan = [];
    for (const mode of modes) {
      for (let trial = startTrial; trial <= endTrial; trial++) plan.push({ mode, trial });
    }
    return plan;
  }
  const [a, b] = modes;
  const plan = [];
  for (let trial = startTrial; trial <= endTrial; trial += 2) {
    plan.push({ mode: a, trial });
    plan.push({ mode: b, trial });
    plan.push({ mode: b, trial: trial + 1 });
    plan.push({ mode: a, trial: trial + 1 });
  }
  return plan.filter((item) => item.trial <= endTrial);
}

async function runOfficialTrials(browser, baseURL, serverState, scene, transform, preflightByMode) {
  const results = [];
  const modesToRun = selectedModes.filter((mode) => {
    const preflight = preflightByMode.get(mode);
    return preflight && preflight.valid;
  });
  if (modesToRun.length === 0 || preflightOnly) return results;
  for (const item of trialPlanForCounts(modesToRun, 1, trials)) {
    console.log(`[${item.mode}] ${scene.name} trial ${item.trial}/${trials}`);
    const result = await runTrial(browser, baseURL, serverState, scene, item.mode, transform, item.trial);
    results.push(result);
    console.log(`  valid=${result.valid} fps=${formatNumber(result.frameSummary.fps)} medianMs=${formatNumber(result.frameSummary.medianMs)} p99=${formatNumber(result.frameSummary.p99Ms)} failures=${result.hardFailures.length}`);
  }
  const byMode = new Map();
  for (const mode of modesToRun) {
    byMode.set(mode, results.filter((result) => result.mode === mode && result.valid));
  }
  const needsMore = modesToRun.some((mode) => coefficientOfVariation(byMode.get(mode).map((result) => result.frameSummary.medianMs)) > varianceThreshold);
  if (needsMore && maxTrials > trials) {
    for (const item of trialPlanForCounts(modesToRun, trials + 1, maxTrials)) {
      console.log(`[${item.mode}] ${scene.name} variance-extension trial ${item.trial}/${maxTrials}`);
      const result = await runTrial(browser, baseURL, serverState, scene, item.mode, transform, item.trial);
      results.push(result);
      console.log(`  valid=${result.valid} fps=${formatNumber(result.frameSummary.fps)} medianMs=${formatNumber(result.frameSummary.medianMs)} p99=${formatNumber(result.frameSummary.p99Ms)} failures=${result.hardFailures.length}`);
    }
  }
  return results;
}

function compareSceneScreenshots(results) {
  const comparisons = [];
  const scenes = new Set(results.map((result) => result.scene));
  for (const scene of scenes) {
    const webgl = results.filter((result) => result.scene === scene && result.mode === "webgl" && result.valid);
    const tint = results.filter((result) => result.scene === scene && result.mode === "gl2gpu-tint" && result.valid);
    const maxPairs = Math.min(webgl.length, tint.length);
    for (let i = 0; i < maxPairs; i++) {
      const a = webgl[i];
      const b = tint[i];
      const metrics = imagePairMetrics(a.screenshot, b.screenshot);
      comparisons.push({
        scene,
        webglLabel: a.label,
        tintLabel: b.label,
        rmse: metrics ? String(metrics.rmseNormalized) : null,
        rmseNormalized: metrics ? metrics.rmseNormalized : null,
        psnr: metrics ? String(metrics.psnrDb) : null,
        psnrValue: metrics ? metrics.psnrDb : null,
        ssim: metrics ? String(metrics.ssim) : null,
        ssimValue: metrics ? metrics.ssim : null,
        samples: metrics ? metrics.samples : 0,
      });
    }
  }
  return comparisons;
}

function createSummary(results, comparisons) {
  const rows = [];
  for (const scene of selectedScenes()) {
    const perScene = results.filter((result) => result.scene === scene.name);
    const row = {
      scene: scene.name,
      sceneFile: scene.file,
      fileSizeBytes: fs.statSync(scene.file).size,
      cameraFile: scene.camera,
      modes: {},
      tintVsWebglFpsRatio: null,
      tintFrameTimeReduction: null,
      medianRmseNormalized: null,
      medianPsnr: null,
      medianSsim: null,
      pass: true,
      reasons: [],
    };
    for (const mode of selectedModes) {
      const nonCamera = perScene.filter((result) => result.mode === mode && !String(result.label).startsWith("preflight-camera"));
      const official = nonCamera.filter((result) => !String(result.label).startsWith("preflight"));
      const perMode = official.length > 0 ? official : nonCamera;
      const valid = perMode.filter((result) => result.valid);
      const failures = perMode.filter((result) => !result.valid);
      row.modes[mode] = {
        validTrials: valid.length,
        totalTrials: perMode.length,
        medianFps: median(valid.map((result) => result.frameSummary.fps)),
        medianFrameMs: median(valid.map((result) => result.frameSummary.medianMs)),
        p99FrameMs: median(valid.map((result) => result.frameSummary.p99Ms)),
        medianRenderMs: median(valid.map((result) => result.renderSummary.medianMs)),
        medianLoadMs: median(valid.map((result) => result.loadTimeMs)),
        shaderDbRequests: perMode.reduce((sum, result) => sum + result.shaderDbRequests, 0),
        failureClasses: failures.map((result) => result.failureClass).filter(Boolean),
        firstFailure: failures[0] ? failures[0].hardFailures.slice(0, 5) : [],
      };
      if (mode === "gl2gpu-tint" && row.modes[mode].shaderDbRequests !== 0) {
        row.pass = false;
        row.reasons.push("Tint requested shader DB");
      }
      if (perMode.length > 0 && valid.length === 0) {
        row.pass = false;
        row.reasons.push(`${mode} has no valid trials`);
      }
    }
    const webgl = row.modes.webgl;
    const tint = row.modes["gl2gpu-tint"];
    if (webgl && tint && Number.isFinite(webgl.medianFps) && Number.isFinite(tint.medianFps) && webgl.medianFps > 0) {
      row.tintVsWebglFpsRatio = tint.medianFps / webgl.medianFps;
    }
    if (webgl && tint && Number.isFinite(webgl.medianFrameMs) && Number.isFinite(tint.medianFrameMs) && webgl.medianFrameMs > 0) {
      row.tintFrameTimeReduction = (webgl.medianFrameMs - tint.medianFrameMs) / webgl.medianFrameMs;
    }
    const sceneComparisons = comparisons.filter((comparison) => comparison.scene === scene.name);
    row.medianRmseNormalized = median(sceneComparisons.map((comparison) => comparison.rmseNormalized));
    row.medianPsnr = median(sceneComparisons.map((comparison) => comparison.psnrValue));
    row.medianSsim = median(sceneComparisons.map((comparison) => comparison.ssimValue));
    if (sceneComparisons.length > 0 && Number.isFinite(row.medianRmseNormalized) && row.medianRmseNormalized > rmseThreshold) {
      row.pass = false;
      row.reasons.push(`RMSE ${row.medianRmseNormalized.toFixed(5)} > ${rmseThreshold}`);
    }
    rows.push(row);
  }
  return rows;
}

function printSummary(summary) {
  const table = summary.map((row) => ({
    scene: row.scene,
    webgl_fps: formatNumber(row.modes.webgl?.medianFps),
    tint_fps: formatNumber(row.modes["gl2gpu-tint"]?.medianFps),
    fps_ratio: formatNumber(row.tintVsWebglFpsRatio),
    frame_reduction: Number.isFinite(row.tintFrameTimeReduction) ? `${(row.tintFrameTimeReduction * 100).toFixed(1)}%` : "n/a",
    rmse: formatNumber(row.medianRmseNormalized, 5),
    psnr: formatNumber(row.medianPsnr),
    ssim: formatNumber(row.medianSsim, 5),
    pass: row.pass,
    reason: row.reasons.join("; "),
  }));
  console.table(table);
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
  const systemChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const attempts = [
    ...(process.env.CHROME_PATH ? [{ executablePath: process.env.CHROME_PATH, headless: false }] : []),
    { executablePath: chromeForTesting, headless: false },
    { executablePath: systemChrome, headless: false },
  ].filter((candidate, index, all) => fs.existsSync(candidate.executablePath) &&
    all.findIndex((other) => other.executablePath === candidate.executablePath) === index);
  let lastError = null;
  for (const attempt of attempts) {
    try {
      const browser = await chromium.launch({ ...attempt, args });
      browser.__sparkBenchLaunchInfo = {
        executablePath: attempt.executablePath,
        headless: false,
        version: browser.version(),
      };
      console.log(`[browser] headed ${attempt.executablePath}`);
      return browser;
    } catch (error) {
      lastError = error;
      console.warn(`[launch] ${attempt.executablePath} failed: ${error.message || error}`);
    }
  }
  throw lastError || new Error("No usable headed Chrome/Chromium executable found");
}

function systemInfo() {
  const swVers = spawnSync("sw_vers", [], { encoding: "utf8" });
  const gitHead = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" });
  const gitBranch = spawnSync("git", ["branch", "--show-current"], { cwd: repoRoot, encoding: "utf8" });
  return {
    macOS: swVers.status === 0 ? swVers.stdout.trim() : null,
    gl2gpuCommit: gitHead.status === 0 ? gitHead.stdout.trim() : null,
    gl2gpuBranch: gitBranch.status === 0 ? gitBranch.stdout.trim() : null,
  };
}

async function main() {
  for (const file of [
    path.join(releaseRoot, "gl2gpu.js"),
    path.join(releaseRoot, "glslang.wasm"),
    path.join(releaseRoot, "tint_wasm.wasm"),
  ]) {
    assertReadable(file);
  }
  for (const scene of selectedScenes()) {
    assertReadable(scene.file);
    assertReadable(scene.camera);
  }
  const sparkRoot = ensureSparkRoot();
  const threeRoot = findThreeRoot(sparkRoot);
  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });
  const serverInfo = await startServer({ sparkRoot, threeRoot });
  const browser = await launchBrowser();
  const transformCache = new Map();
  const results = [];
  const preflightResults = [];
  try {
    for (const scene of selectedScenes()) {
      const transform = skipPreflight
        ? (cameraTransformCandidates[0] || "direct")
        : await chooseTransform(browser, serverInfo.baseURL, serverInfo.state, scene, transformCache, preflightResults);
      const preflightByMode = new Map();
      if (skipPreflight) {
        for (const mode of selectedModes) preflightByMode.set(mode, { valid: true });
      } else {
        for (const mode of selectedModes) {
          console.log(`[preflight] ${scene.name} ${mode} transform=${transform}`);
          const result = await runTrial(browser, serverInfo.baseURL, serverInfo.state, scene, mode, transform, 0, {
            label: `preflight-${mode}`,
            frames: preflightFrames,
            warmup: preflightWarmupFrames,
          });
          preflightResults.push(result);
          preflightByMode.set(mode, result);
          console.log(`  valid=${result.valid} fps=${formatNumber(result.frameSummary.fps)} medianMs=${formatNumber(result.frameSummary.medianMs)} failures=${result.hardFailures.length} class=${result.failureClass || "none"}`);
        }
      }
      results.push(...await runOfficialTrials(browser, serverInfo.baseURL, serverInfo.state, scene, transform, preflightByMode));
    }
  } finally {
    await browser.close().catch(() => {});
    await new Promise((resolve) => serverInfo.server.close(resolve));
  }
  const allResults = [...preflightResults, ...results];
  const comparisons = compareSceneScreenshots(results);
  const summary = createSummary(allResults, comparisons);
  const report = {
    generatedAt: new Date().toISOString(),
    outputRoot,
    spark: {
      root: sparkRoot,
      requestedVersion: "2.1.0",
      requestedCommit: sparkCommit,
    },
    threeRoot,
    releaseRoot,
    sceneRoot,
    modes: selectedModes,
    trials,
    maxTrials,
    warmupFrames,
    measureFrames,
    preflightWarmupFrames,
    preflightFrames,
    downscale,
    cameraTransformCandidates,
    timeoutMs,
    rmseThreshold,
    browser: browser.__sparkBenchLaunchInfo || null,
    system: systemInfo(),
    server: {
      shaderDbRequests: serverInfo.state.shaderDbRequests,
      missing: serverInfo.state.missing.slice(0, 200),
    },
    summary,
    comparisons,
    results: allResults,
  };
  fs.writeFileSync(path.join(outputRoot, "results.json"), JSON.stringify(report, null, 2));
  printSummary(summary);
  console.log(`results: ${path.join(outputRoot, "results.json")}`);
  if (summary.some((row) => !row.pass)) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error && (error.stack || error.message || error));
  process.exitCode = 1;
});
