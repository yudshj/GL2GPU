#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { createHash } = require("crypto");
const { spawnSync } = require("child_process");

const EXPECTED_CTS_COMMIT = "064aaf18207438d4f6dd10c98b02b25778257b7f";
const EXPECTED_FIX_DIFF_SHA256 = "846c6bea3331eb426d4c706e07734a16f560d07adf837369ddcb111f8002ca56";
const repoRoot = path.resolve(__dirname, "..");
const ctsRoot = path.resolve(process.argv[2] || process.env.WEBGL_CTS_ROOT || "/tmp/gl2gpu-webgl-cts");
const patchPath = path.join(repoRoot, "tools", "webgl-cts-upstream-fixes.patch");

function git(args, options = {}) {
  return spawnSync("git", ["-C", ctsRoot, ...args], {
    encoding: "utf8",
    stdio: options.stdio || "pipe",
  });
}

function verifyAppliedPatch() {
  const diff = git(["diff", "--no-ext-diff", "--binary"]);
  if (diff.status !== 0) throw new Error(diff.stderr || "Unable to inspect WebGL CTS patch");
  const hash = createHash("sha256").update(diff.stdout).digest("hex");
  if (hash !== EXPECTED_FIX_DIFF_SHA256) {
    throw new Error(`Unexpected WebGL CTS diff sha256 ${hash}; expected ${EXPECTED_FIX_DIFF_SHA256}`);
  }
  return hash;
}

if (!fs.existsSync(path.join(ctsRoot, ".git"))) {
  throw new Error(`WebGL CTS checkout not found at ${ctsRoot}`);
}

const commit = git(["rev-parse", "HEAD"]);
if (commit.status !== 0) throw new Error(commit.stderr || "Unable to read WebGL CTS commit");
if (commit.stdout.trim() !== EXPECTED_CTS_COMMIT) {
  throw new Error(`Expected WebGL CTS ${EXPECTED_CTS_COMMIT}, found ${commit.stdout.trim()}`);
}

const reverseCheck = git(["apply", "--check", "--reverse", patchPath]);
if (reverseCheck.status === 0) {
  console.log(`[cts] upstream fixes already applied in ${ctsRoot} (${verifyAppliedPatch()})`);
  process.exit(0);
}

const status = git(["status", "--short"]);
if (status.status !== 0) throw new Error(status.stderr || "Unable to inspect WebGL CTS worktree");
if (status.stdout.trim()) {
  throw new Error(`Refusing to patch a dirty WebGL CTS worktree:\n${status.stdout.trim()}`);
}

const check = git(["apply", "--check", patchPath]);
if (check.status !== 0) throw new Error(check.stderr || "WebGL CTS upstream-fix patch does not apply");
const applied = git(["apply", patchPath]);
if (applied.status !== 0) throw new Error(applied.stderr || "Unable to apply WebGL CTS upstream fixes");
console.log(`[cts] applied ${path.relative(repoRoot, patchPath)} to ${ctsRoot} (${verifyAppliedPatch()})`);
