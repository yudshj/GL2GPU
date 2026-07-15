#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { createHash } = require("crypto");

const repoRoot = path.resolve(__dirname, "..");
const argv = new Map();
for (let index = 2; index < process.argv.length; index++) {
  const argument = process.argv[index];
  if (!argument.startsWith("--")) continue;
  const key = argument.slice(2);
  const value = process.argv[index + 1];
  if (value && !value.startsWith("--")) {
    argv.set(key, value);
    index++;
  } else {
    argv.set(key, "true");
  }
}

const inputRoot = path.resolve(argv.get("input") || path.join(repoRoot, "output", "webgl-cts"));
const outputPath = path.resolve(argv.get("output") || path.join(inputRoot, "summary.json"));
const expectedTotal = Number(argv.get("expected-total") || 2864);

function sha256(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function findReports(directory) {
  const reports = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (!entry.isDirectory()) continue;
    const reportPath = path.join(entryPath, "results.json");
    if (fs.existsSync(reportPath)) reports.push(reportPath);
    else reports.push(...findReports(entryPath));
  }
  return reports.sort();
}

if (!fs.existsSync(inputRoot)) throw new Error(`CTS result root not found: ${inputRoot}`);
const reportPaths = findReports(inputRoot);
if (reportPaths.length === 0) throw new Error(`No complete results.json files under ${inputRoot}`);

const reports = reportPaths.map((reportPath) => ({
  reportPath,
  report: JSON.parse(fs.readFileSync(reportPath, "utf8")),
}));
const attempts = new Map();
for (const { reportPath, report } of reports) {
  if (report.complete === false) throw new Error(`Incomplete CTS report: ${reportPath}`);
  for (const result of report.results || []) {
    const values = attempts.get(result.test) || [];
    values.push({ reportPath, result });
    attempts.set(result.test, values);
  }
}

const duplicates = Array.from(attempts)
  .filter(([, values]) => values.length !== 1)
  .map(([test, values]) => ({ test, count: values.length }));
const results = Array.from(attempts)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([test, [{ reportPath, result }]]) => ({
    test,
    valid: Boolean(result.valid),
    timedOut: Boolean(result.timedOut),
    durationMs: result.durationMs,
    source: path.relative(inputRoot, reportPath),
    failures: result.state?.failures || [],
    pageErrors: result.pageErrors || [],
    hardConsoleErrors: result.hardConsoleErrors || [],
  }));
const failed = results.filter((result) => !result.valid);
const timedOut = results.filter((result) => result.timedOut);
const values = (selector) => Array.from(new Set(reports.map(({ report }) => selector(report)).filter(Boolean)));
const summary = {
  generatedAt: new Date().toISOString(),
  inputRoot,
  expectedTotal,
  reportCount: reports.length,
  totalAttempts: reports.reduce((sum, { report }) => sum + (report.results?.length || 0), 0),
  uniqueTests: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  timedOut: timedOut.length,
  duplicates,
  complete: results.length === expectedTotal && duplicates.length === 0 && failed.length === 0,
  chromeExecutables: values((report) => report.chrome),
  ctsCommits: values((report) => report.ctsCommit),
  gl2gpuCommits: values((report) => report.gl2gpuCommit),
  ctsDiffSha256: values((report) => report.ctsWorktree?.diffSha256),
  ctsUpstreamFixesApplied: reports.every(({ report }) => report.ctsWorktree?.upstreamFixesApplied === true),
  artifacts: {
    gl2gpuBundleSha256: sha256(path.join(repoRoot, "dist", "release", "gl2gpu.js")),
    ctsHarnessSha256: sha256(path.join(repoRoot, "tools", "webgl-cts-harness.js")),
  },
  results,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({
  output: outputPath,
  reportCount: summary.reportCount,
  uniqueTests: summary.uniqueTests,
  passed: summary.passed,
  failed: summary.failed,
  timedOut: summary.timedOut,
  duplicates: summary.duplicates.length,
  complete: summary.complete,
}, null, 2));
if (!summary.complete) process.exitCode = 1;
