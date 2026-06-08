import { deepEqual } from "node:assert/strict";

import { scanGlslDeclarations } from "../../src/components/shaderMetadata";

const vertex = `
attribute vec3 aPos;
attribute vec2 aUv;
uniform mat4 uModel;
uniform highp vec4 uTint;
varying vec2 vUv;
void main() {
  vUv = aUv;
  gl_Position = uModel * vec4(aPos, 1.0);
}
`;

const fragment = `
precision mediump float;
uniform sampler2D diffuse;
uniform samplerCube skybox;
uniform float exposure;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(diffuse, vUv) * exposure;
}
`;

const vertexDecls = scanGlslDeclarations(vertex, "vertex");
deepEqual(vertexDecls.attributes.map((item) => item.name), ["aPos", "aUv"]);
deepEqual(vertexDecls.attributes.map((item) => item.wgsl_type), ["vec3<f32>", "vec2<f32>"]);
deepEqual(vertexDecls.uniforms.map((item) => item.name), ["uModel", "uTint"]);
deepEqual(vertexDecls.varyings.map((item) => item.name), ["vUv"]);

const fragmentDecls = scanGlslDeclarations(fragment, "fragment");
deepEqual(fragmentDecls.uniforms.map((item) => item.name), ["exposure"]);
deepEqual(fragmentDecls.samplers.map((item) => [item.name, item.wgsl_texture_type]), [
    ["diffuse", "texture_2d<f32>"],
    ["skybox", "texture_cube<f32>"],
]);
deepEqual(fragmentDecls.varyings.map((item) => item.name), ["vUv"]);

console.log("shader metadata tests passed");
