#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const outputPath = path.join(repoRoot, "reports", "data", "three-device-experiment-summary.json");
const sceneArtifacts = {
  van_gogh_room: {
    file: "van_gogh_room/van_gogh_room.ply",
    sha256: "3c52f6f5fbc4d7ccd59e2dca8f50d25ce4297b53efa68421d7ab6f3ffba1e7f5",
  },
  bicycle_30000_cleaned: {
    file: "bicycle/bicycle_30000.cleaned.ply",
    sha256: "b62d95023ae1c4107d7d66bcb37864656a7842057c9c8e60353dc0e5c5378641",
  },
  bicycle_30000: {
    file: "bicycle/bicycle_30000.ply",
    sha256: "64d357cb25bd85f710f8551a18d830f8497277fbd8c5805adfd72ffe9ca78227",
  },
};
const devices = [
  {
    id: "echo-m4",
    label: "Echo M4",
    soc: "Apple M4 (10-core GPU)",
    memoryGiB: 32,
    macOS: "26.3.1 (25D771280a)",
    ctsChromeVersion: "150.0.7871.115",
    cts: "output/webgl-cts-20260715-local-serial/summary.json",
    spark: "output/multidevice-20260715/local/spark-requested-scenes/results.json",
  },
  {
    id: "mac-mini-m4",
    label: "Mac mini M4",
    soc: "Apple M4 (10-core GPU)",
    memoryGiB: 16,
    macOS: "26.2 (25C56)",
    ctsChromeVersion: "150.0.7871.124",
    cts: "output/multidevice-20260715/mac-mini-m4/cts-summary.json",
    spark: "output/multidevice-20260715/mac-mini-m4/spark-requested-scenes/results.json",
  },
  {
    id: "genesis-m1",
    label: "Genesis M1",
    soc: "Apple M1 (8-core GPU)",
    memoryGiB: 16,
    macOS: "26.2 (25C56)",
    ctsChromeVersion: "150.0.7871.102",
    cts: "output/multidevice-20260715/genesis-m1/cts-summary.json",
    spark: "output/multidevice-20260715/genesis-m1/spark-requested-scenes/results.json",
  },
];

function readJson(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) throw new Error(`Missing report input: ${relativePath}`);
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function coefficientOfVariation(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
  return Math.sqrt(variance) / mean;
}

function expectedSparkTrials(report, sceneName) {
  const initialByMode = report.modes.map((mode) => report.results
    .filter((result) => result.scene === sceneName && result.mode === mode &&
      result.trial >= 1 && result.trial <= report.trials && result.valid)
    .sort((left, right) => left.trial - right.trial)
    .map((result) => result.frameSummary.medianMs));
  assert(initialByMode.every((values) => values.length === report.trials),
    `${sceneName}: incomplete initial Spark trials`);
  const initialCvByMode = Object.fromEntries(report.modes.map((mode, index) =>
    [mode, coefficientOfVariation(initialByMode[index])]));
  const extended = Object.values(initialCvByMode).some((cv) => cv > report.varianceThreshold);
  return {
    count: extended ? report.maxTrials : report.trials,
    initialCvByMode,
    extended,
  };
}

function compactCts(device, report) {
  assert(report.complete === true, `${device.label}: CTS summary is incomplete`);
  assert(report.expectedTotal === 2864, `${device.label}: unexpected CTS denominator`);
  assert(report.reportCount === 15, `${device.label}: expected 15 diagnostic CTS reports`);
  assert(report.uniqueTests === 2864, `${device.label}: expected 2864 unique CTS pages`);
  assert(report.passed === 2864 && report.failed === 0, `${device.label}: CTS failures remain`);
  assert(report.timedOut === 0, `${device.label}: CTS timeouts remain`);
  assert(report.duplicates.length === 0, `${device.label}: duplicate CTS attempts remain`);
  assert(report.ctsUpstreamFixesApplied === true, `${device.label}: audited CTS fixture patch missing`);
  return {
    chromeVersion: device.ctsChromeVersion,
    reportCount: report.reportCount,
    uniqueTests: report.uniqueTests,
    passed: report.passed,
    failed: report.failed,
    timedOut: report.timedOut,
    duplicates: report.duplicates.length,
    complete: report.complete,
    conformanceEligible: false,
    evidenceRole: "diagnostic local-patch run",
    conformanceExclusionReason:
      "The run used a locally modified CTS input. The 2864/2864 count is retained for diagnostic lineage and is not presented as a WebGL conformance-pass result.",
    ctsCommit: report.ctsCommits[0],
    ctsFixtureDiffSha256: report.ctsDiffSha256[0],
    gl2gpuBundleSha256: report.artifacts.gl2gpuBundleSha256,
    ctsHarnessSha256: report.artifacts.ctsHarnessSha256,
  };
}

function compactSpark(device, report) {
  assert(report.browser?.headless === false, `${device.label}: Spark did not use headed Chrome`);
  assert(report.measurementMode === "gpu-throughput", `${device.label}: unexpected Spark measurement mode`);
  assert(report.specializeBooleanUniforms === false, `${device.label}: boolean specialization was enabled`);
  assert(report.trials === 3 && report.maxTrials === 5, `${device.label}: unexpected Spark trial bounds`);
  assert(report.varianceThreshold === 0.05, `${device.label}: unexpected Spark CV threshold`);
  assert(report.summary?.length === 3, `${device.label}: expected three Spark scenes`);
  assert(Object.keys(sceneArtifacts).every((scene) => report.summary.some((row) => row.scene === scene)),
    `${device.label}: requested Spark scene set is incomplete`);
  const tintResults = report.results.filter((result) => result.mode === "gl2gpu-tint");
  const gpuSplatVertexPrecompute = tintResults.length > 0 && tintResults.every((result) =>
    result.bench?.gpuSplatVertexPrecompute?.requested === true &&
    result.bench?.gpuSplatVertexPrecompute?.applied === true);
  assert(gpuSplatVertexPrecompute, `${device.label}: vertex precompute was not applied to every Tint run`);
  return {
    chromeVersion: report.browser.version,
    headed: true,
    measurementMode: report.measurementMode,
    initialTrialsPerMode: report.trials,
    maxTrialsPerMode: report.maxTrials,
    varianceThreshold: report.varianceThreshold,
    throughputWarmupBatches: report.throughputWarmupBatches,
    throughputBatches: report.throughputBatches,
    framesPerBatch: report.throughputFramesPerBatch,
    gpuSplatVertexPrecompute,
    specializeBooleanUniforms: report.specializeBooleanUniforms,
    scenes: report.summary.map((scene) => {
      const webgl = scene.modes.webgl;
      const tint = scene.modes["gl2gpu-tint"];
      const expectedTrials = expectedSparkTrials(report, scene.scene);
      assert(scene.pass === true, `${device.label}/${scene.scene}: quality gate failed`);
      assert(webgl.validTrials === expectedTrials.count && tint.validTrials === expectedTrials.count,
        `${device.label}/${scene.scene}: expected ${expectedTrials.count} valid Spark trials`);
      assert(webgl.totalTrials === expectedTrials.count && tint.totalTrials === expectedTrials.count,
        `${device.label}/${scene.scene}: invalid Spark trials present`);
      assert(tint.shaderDbRequests === 0, `${device.label}/${scene.scene}: shader DB request detected`);
      assert(scene.medianSsim >= 0.9999, `${device.label}/${scene.scene}: SSIM below gate`);
      return {
        scene: scene.scene,
        fileSizeBytes: scene.fileSizeBytes,
        cameraFile: path.basename(scene.cameraFile),
        trialsPerMode: expectedTrials.count,
        varianceExtended: expectedTrials.extended,
        initialCvByMode: expectedTrials.initialCvByMode,
        webgl: {
          medianFps: webgl.medianFps,
          medianFrameMs: webgl.medianFrameMs,
          p99FrameMs: webgl.p99FrameMs,
          medianLoadMs: webgl.medianLoadMs,
        },
        gl2gpuTint: {
          medianFps: tint.medianFps,
          medianFrameMs: tint.medianFrameMs,
          p99FrameMs: tint.p99FrameMs,
          medianLoadMs: tint.medianLoadMs,
          shaderDbRequests: tint.shaderDbRequests,
        },
        tintVsWebglFpsRatio: scene.tintVsWebglFpsRatio,
        tintFrameTimeReduction: scene.tintFrameTimeReduction,
        tintVsWebglLoadTimeRatio: tint.medianLoadMs / webgl.medianLoadMs,
        rmseNormalized: scene.medianRmseNormalized,
        psnrDb: scene.medianPsnr,
        ssim: scene.medianSsim,
      };
    }),
  };
}

const output = {
  schemaVersion: 1,
  experimentWindow: "2026-07-14/2026-07-15",
  sceneArtifacts,
  devices: devices.map((device) => {
    const cts = readJson(device.cts);
    const spark = readJson(device.spark);
    return {
      id: device.id,
      label: device.label,
      soc: device.soc,
      memoryGiB: device.memoryGiB,
      macOS: device.macOS,
      cts: compactCts(device, cts),
      spark: compactSpark(device, spark),
      sources: { cts: device.cts, spark: device.spark },
    };
  }),
};

const bundleHashes = new Set(output.devices.map((device) => device.cts.gl2gpuBundleSha256));
const harnessHashes = new Set(output.devices.map((device) => device.cts.ctsHarnessSha256));
assert(bundleHashes.size === 1, "CTS devices used different GL2GPU bundles");
assert(harnessHashes.size === 1, "CTS devices used different harnesses");

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(outputPath);
