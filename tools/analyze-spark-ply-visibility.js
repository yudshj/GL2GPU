#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const args = new Map();
for (let index = 2; index < process.argv.length; index++) {
  const key = process.argv[index];
  if (!key.startsWith("--")) continue;
  const next = process.argv[index + 1];
  if (!next || next.startsWith("--")) args.set(key.slice(2), "true");
  else {
    args.set(key.slice(2), next);
    index++;
  }
}

const plyFile = path.resolve(args.get("ply") || "");
const cameraFile = path.resolve(args.get("camera") || "");
const cameraIndex = Number(args.get("camera-index") || 0);
const clipXY = Number(args.get("clip-xy") || 1.4);
const near = Number(args.get("near") || 0.01);
const far = Number(args.get("far") || 1000);
const minAlpha = Number(args.get("min-alpha") || (1 / 510));

for (const file of [plyFile, cameraFile]) {
  if (!file || !fs.existsSync(file)) throw new Error(`missing input: ${file}`);
}

const TYPE_BYTES = {
  char: 1,
  uchar: 1,
  int8: 1,
  uint8: 1,
  short: 2,
  ushort: 2,
  int16: 2,
  uint16: 2,
  int: 4,
  uint: 4,
  int32: 4,
  uint32: 4,
  float: 4,
  float32: 4,
  double: 8,
  float64: 8,
};

function readHeader(fd) {
  const chunkSize = 64 * 1024;
  let bytes = Buffer.alloc(0);
  for (let offset = 0; offset < 4 * 1024 * 1024; offset += chunkSize) {
    const chunk = Buffer.allocUnsafe(chunkSize);
    const count = fs.readSync(fd, chunk, 0, chunkSize, offset);
    bytes = Buffer.concat([bytes, chunk.subarray(0, count)]);
    const marker = bytes.indexOf("end_header\n");
    if (marker >= 0) {
      return {
        text: bytes.subarray(0, marker + "end_header\n".length).toString("ascii"),
        byteLength: marker + "end_header\n".length,
      };
    }
    if (count < chunkSize) break;
  }
  throw new Error("PLY header terminator was not found");
}

function parseVertexLayout(header) {
  const lines = header.text.trim().split(/\r?\n/);
  if (!lines.includes("format binary_little_endian 1.0")) {
    throw new Error("only binary_little_endian PLY is supported");
  }
  let vertexCount = 0;
  let inVertex = false;
  let stride = 0;
  const properties = new Map();
  for (const line of lines) {
    const element = /^element\s+(\S+)\s+(\d+)$/.exec(line);
    if (element) {
      inVertex = element[1] === "vertex";
      if (inVertex) vertexCount = Number(element[2]);
      continue;
    }
    if (!inVertex) continue;
    const property = /^property\s+(\S+)\s+(\S+)$/.exec(line);
    if (!property) continue;
    const type = property[1];
    const bytes = TYPE_BYTES[type];
    if (!bytes) throw new Error(`unsupported PLY property type: ${type}`);
    properties.set(property[2], { type, offset: stride });
    stride += bytes;
  }
  if (!vertexCount || !stride) throw new Error("missing PLY vertex layout");
  for (const required of ["x", "y", "z", "opacity"]) {
    if (!properties.has(required)) throw new Error(`missing PLY property: ${required}`);
  }
  return { vertexCount, stride, properties };
}

function viewPosition(point, camera) {
  const dx = point[0] - camera.position[0];
  const dy = point[1] - camera.position[1];
  const dz = point[2] - camera.position[2];
  const rotation = camera.rotation;
  const rx = rotation[0][0] * dx + rotation[1][0] * dy + rotation[2][0] * dz;
  const ry = rotation[0][1] * dx + rotation[1][1] * dy + rotation[2][1] * dz;
  const rz = rotation[0][2] * dx + rotation[1][2] * dy + rotation[2][2] * dz;
  return [rx, -ry, -rz];
}

function percentage(count, total) {
  return `${(count * 100 / total).toFixed(3)}%`;
}

const fd = fs.openSync(plyFile, "r");
try {
  const header = readHeader(fd);
  const layout = parseVertexLayout(header);
  const cameras = JSON.parse(fs.readFileSync(cameraFile, "utf8"));
  const camera = cameras[cameraIndex];
  if (!camera) throw new Error(`camera[${cameraIndex}] is unavailable`);
  const m00 = 2 * camera.fx / camera.width;
  const m11 = 2 * camera.fy / camera.height;
  const stats = {
    total: 0,
    belowAlpha: 0,
    behindCamera: 0,
    outsideDepth: 0,
    outsideExpandedFrustum: 0,
    centerVisible: 0,
    alphaAndCenterVisible: 0,
  };
  const chunkVertices = 32768;
  const chunk = Buffer.allocUnsafe(layout.stride * chunkVertices);
  const xOffset = layout.properties.get("x").offset;
  const yOffset = layout.properties.get("y").offset;
  const zOffset = layout.properties.get("z").offset;
  const opacityOffset = layout.properties.get("opacity").offset;
  for (let base = 0; base < layout.vertexCount; base += chunkVertices) {
    const vertices = Math.min(chunkVertices, layout.vertexCount - base);
    const byteLength = vertices * layout.stride;
    const fileOffset = header.byteLength + base * layout.stride;
    const read = fs.readSync(fd, chunk, 0, byteLength, fileOffset);
    if (read !== byteLength) throw new Error(`short PLY read at vertex ${base}`);
    for (let index = 0; index < vertices; index++) {
      const offset = index * layout.stride;
      const point = [
        chunk.readFloatLE(offset + xOffset),
        chunk.readFloatLE(offset + yOffset),
        chunk.readFloatLE(offset + zOffset),
      ];
      const opacityLogit = chunk.readFloatLE(offset + opacityOffset);
      const alpha = 1 / (1 + Math.exp(-Math.max(-100, Math.min(100, opacityLogit))));
      const belowAlpha = alpha < minAlpha;
      if (belowAlpha) stats.belowAlpha++;
      const view = viewPosition(point, camera);
      const depth = -view[2];
      let centerVisible = true;
      if (depth <= 0) {
        stats.behindCamera++;
        centerVisible = false;
      } else if (depth < near || depth > far) {
        stats.outsideDepth++;
        centerVisible = false;
      } else if (Math.abs(m00 * view[0]) > clipXY * depth ||
          Math.abs(m11 * view[1]) > clipXY * depth) {
        stats.outsideExpandedFrustum++;
        centerVisible = false;
      }
      if (centerVisible) {
        stats.centerVisible++;
        if (!belowAlpha) stats.alphaAndCenterVisible++;
      }
      stats.total++;
    }
  }
  const result = {
    plyFile,
    cameraFile,
    cameraIndex,
    headerBytes: header.byteLength,
    vertexStride: layout.stride,
    vertexCount: layout.vertexCount,
    clipXY,
    near,
    far,
    minAlpha,
    counts: stats,
    percentages: Object.fromEntries(
      Object.entries(stats).filter(([key]) => key !== "total")
        .map(([key, value]) => [key, percentage(value, stats.total)]),
    ),
  };
  console.log(JSON.stringify(result, null, 2));
} finally {
  fs.closeSync(fd);
}
