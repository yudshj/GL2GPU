#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const reportBase = "three-device-gl2gpu-tint-experiment-2026-07-15";
const markdownPath = path.join(repoRoot, "reports", "three-device-gl2gpu-tint-experiment-2026-07-15.md");
const cssPath = path.join(repoRoot, "reports", "three-device-gl2gpu-tint-experiment.css");
const outputRoot = path.join(repoRoot, "output", "pdf");
const htmlPath = path.join(outputRoot, `${reportBase}.html`);
const pdfPath = path.join(outputRoot, `${reportBase}.pdf`);
const trackedPdfPath = path.join(repoRoot, "reports", `${reportBase}.pdf`);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`${command} failed (${result.status})\n${result.stdout || ""}${result.stderr || ""}`);
  }
}

function printPdf(chrome, args, targetPath) {
  fs.rmSync(targetPath, { force: true });
  return new Promise((resolve, reject) => {
    const child = spawn(chrome, args, {
      cwd: repoRoot,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    let lastSize = -1;
    let stableChecks = 0;
    let settled = false;
    let stopping = false;
    let stopError = null;
    let forceKill = null;
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 1024 * 1024) stderr = stderr.slice(-1024 * 1024);
    });
    const complete = (error) => {
      if (settled) return;
      settled = true;
      clearInterval(poll);
      clearTimeout(deadline);
      if (forceKill) clearTimeout(forceKill);
      if (error) reject(error);
      else resolve();
    };
    const stop = (error) => {
      if (stopping || settled) return;
      stopping = true;
      stopError = error;
      clearInterval(poll);
      clearTimeout(deadline);
      if (child.exitCode !== null || child.signalCode !== null) {
        complete(error);
        return;
      }
      child.kill("SIGTERM");
      forceKill = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      }, 2000);
    };
    const poll = setInterval(() => {
      const size = fs.existsSync(targetPath) ? fs.statSync(targetPath).size : 0;
      stableChecks = size > 0 && size === lastSize ? stableChecks + 1 : 0;
      lastSize = size;
      if (stableChecks >= 3) stop(null);
    }, 500);
    const deadline = setTimeout(() => {
      stop(new Error(`Chrome did not produce a stable PDF within 90 seconds\n${stderr}`));
    }, 90000);
    child.on("error", (error) => complete(error));
    child.on("exit", (code, signal) => {
      const hasPdf = fs.existsSync(targetPath) && fs.statSync(targetPath).size > 0;
      if (stopping) complete(stopError || (hasPdf ? null : new Error(`Chrome PDF process exited (${code ?? signal})\n${stderr}`)));
      else complete(hasPdf ? null : new Error(`Chrome PDF process exited (${code ?? signal})\n${stderr}`));
    });
  });
}

for (const filePath of [markdownPath, cssPath]) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing report source: ${filePath}`);
}
fs.mkdirSync(outputRoot, { recursive: true });
run(process.env.PANDOC_PATH || "pandoc", [
  markdownPath,
  "--from=gfm",
  "--standalone",
  "--embed-resources",
  `--resource-path=${path.join(repoRoot, "reports")}`,
  `--css=${cssPath}`,
  "--metadata",
  "pagetitle=GL2GPU Tint 三设备正确性与 Spark 性能复现实验",
  `--output=${htmlPath}`,
]);

const chromeCandidates = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);
const chrome = chromeCandidates.find((candidate) => fs.existsSync(candidate));
if (!chrome) throw new Error("Google Chrome is required to print the report PDF");
const profilePath = path.join(outputRoot, "three-device-report-chrome-profile");
const removeProfile = () => fs.rmSync(profilePath, {
  recursive: true,
  force: true,
  maxRetries: 20,
  retryDelay: 100,
});
removeProfile();
printPdf(chrome, [
  "--headless=new",
  "--disable-background-networking",
  "--no-pdf-header-footer",
  `--user-data-dir=${profilePath}`,
  `--print-to-pdf=${pdfPath}`,
  `file://${htmlPath}`,
], pdfPath).then(() => {
  removeProfile();
  fs.copyFileSync(pdfPath, trackedPdfPath);
  console.log(pdfPath);
  console.log(trackedPdfPath);
}).catch((error) => {
  removeProfile();
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
