(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("GL2GPU", [], factory);
	else if(typeof exports === 'object')
		exports["GL2GPU"] = factory();
	else
		root["GL2GPU"] = factory();
})(self, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 197:
/***/ ((__unused_webpack_module, exports) => {

var __webpack_unused_export__;

__webpack_unused_export__ = ({ value: true });
__webpack_unused_export__ = void 0;
// Adding options parameter to allow to change the behavior of the function (should be compatible with the first version of the function)
/**
 * Generate a hash from a string, simple and fast.
 * reference: https://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
 * @version 2.1.0
 * @param {string} str Input string
 * @param {Object} options Options
 * @param {boolean} options.forcePositive If true, the hash will be forcePositive.
 * @param {boolean} options.caseSensitive Case sensitive
 * @param {boolean} options.seed Seed for the hash
 */
function fastHashCode(str, options = {}) {
    const { forcePositive = false, caseSensitive = true, seed = 0 } = options;
    if (!caseSensitive) {
        str = str.toLowerCase();
    }
    let hash = seed;
    let i;
    for (i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    if (forcePositive) {
        hash = hash & 0x7fffffff;
    }
    return hash;
}
__webpack_unused_export__ = fastHashCode;
exports.Ay = fastHashCode;


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  beginFrame: () => (/* reexport */ beginFrame),
  endFrame: () => (/* reexport */ endFrame),
  gl2gpuGetContext: () => (/* binding */ gl2gpuGetContext)
});

;// ./src/components/gl2gpuRenderPassCache.ts
class GPURenderBundleTransition {
    renderBundle = null;
    jumpTable = new Map();
    opName;
    opArgs;
    father;
    onceHash = null;
    onceNext;
    bindGroupOffset = -1;
    constructor(opName, opArgs, father) {
        this.opName = opName;
        this.opArgs = opArgs;
        this.father = father;
    }
    goto(hash, opName, ...opArgs) {
        if (hash === this.onceHash) {
            return this.onceNext;
        }
        this.onceHash = hash;
        const transition = this.jumpTable.get(hash);
        if (!transition) {
            const newTransition = new GPURenderBundleTransition(opName, opArgs, this);
            this.jumpTable.set(hash, newTransition);
            return this.onceNext = newTransition;
        }
        return this.onceNext = transition;
    }
    gotoBindGroup(bindGroup, do0) {
        // console.log(bindGroup.label);
        if (this.bindGroupOffset === do0 && this.onceHash == bindGroup) {
            return this.onceNext;
        }
        this.onceHash = bindGroup;
        this.bindGroupOffset = do0;
        const hash = 'b0' + bindGroup.label + do0;
        const transition = this.jumpTable.get(hash);
        if (!transition) {
            const newTransition = new GPURenderBundleTransition('setBindGroup', [0, bindGroup, do0], this);
            this.jumpTable.set(hash, newTransition);
            return this.onceNext = newTransition;
        }
        return this.onceNext = transition;
    }
}
class Gl2gpuRenderPassEncoder {
    static initBundleCache = new Map();
    bundleCache;
    device;
    renderBundleEncoderDescriptor;
    constructor(device, renderBundleEncoderDescriptor) {
        this.device = device;
        this.renderBundleEncoderDescriptor = renderBundleEncoderDescriptor;
        const initKey = renderBundleEncoderDescriptor.colorFormats.join(',') + renderBundleEncoderDescriptor.depthStencilFormat;
        this.bundleCache = Gl2gpuRenderPassEncoder.initBundleCache.get(initKey);
        if (!this.bundleCache) {
            this.bundleCache = new GPURenderBundleTransition(null, null, null);
            Gl2gpuRenderPassEncoder.initBundleCache.set(initKey, this.bundleCache);
        }
    }
    setPipeline(opHash, pipeline) {
        this.bundleCache = this.bundleCache.goto(opHash, 'setPipeline', pipeline);
    }
    setBindGroup(bindGroup, do0) {
        this.bundleCache = this.bundleCache.gotoBindGroup(bindGroup, do0);
    }
    setVertexBuffer(opHash, slot, buffer, offset) {
        this.bundleCache = this.bundleCache.goto(opHash, 'setVertexBuffer', slot, buffer, offset);
    }
    setIndexBuffer(opHash, buffer, format) {
        this.bundleCache = this.bundleCache.goto(opHash, 'setIndexBuffer', buffer, format);
    }
    draw(vertexCount, instanceCount, firstVertex, firstInstance) {
        this.bundleCache = this.bundleCache.goto('d' + (vertexCount * 839 ^ instanceCount * 853 ^ firstVertex * 857 ^ firstInstance * 859), 'draw', vertexCount, instanceCount, firstVertex, firstInstance);
    }
    drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance) {
        this.bundleCache = this.bundleCache.goto('i' + (indexCount * 977 ^ instanceCount * 983 ^ firstIndex * 991 ^ baseVertex * 997 ^ firstInstance * 1009), 'drawIndexed', indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
    }
    generateBundle() {
        if (!this.bundleCache.renderBundle) {
            console.log('[GL2GPU] create bundle');
            const bundleEncoder = this.device.createRenderBundleEncoder(this.renderBundleEncoderDescriptor);
            const tmp = [0];
            const operators = [];
            let cur = this.bundleCache;
            while (cur) {
                operators.push([cur.opName, cur.opArgs]);
                cur = cur.father;
            }
            for (let i = operators.length - 2; i >= 0; i--) {
                const [opName, opArgs] = operators[i];
                if (opName === 'setBindGroup') {
                    tmp[0] = opArgs[2];
                    bundleEncoder.setBindGroup(opArgs[0], opArgs[1], tmp);
                }
                else {
                    bundleEncoder[opName].apply(bundleEncoder, opArgs);
                }
            }
            this.bundleCache.renderBundle = bundleEncoder.finish();
        }
        return this.bundleCache.renderBundle;
    }
}
class Gl2gpuRenderPassCache {
    renderBundleGenerator = null;
    renderPassEncoder = null;
    device;
    _commandEncoder = null;
    renderPassDescriptorCacheKey = null;
    renderPassDescriptor = null;
    renderPassPipelineCacheKey = null;
    renderPassBindGroupCacheKey = null;
    renderPassVertexBufferCacheKeys = [];
    renderPassVertexBufferCacheKey = null;
    renderPassIndexBufferCacheKey = null;
    viewPortInfo = [0, 0, 0, 0, 0, 0];
    scissorInfo = [0, 0, 0, 0];
    stencilReferenceInfo = 0;
    colorInfo = [0, 0, 0, 0];
    __commandEncoderCount = 0;
    bundleNum;
    constructor(device) {
        this.device = device;
    }
    resetbundleNum() {
        this.bundleNum = [];
    }
    CeSubmitAndReset() {
        this.RpEnd();
        if (this._commandEncoder !== null) {
            this.device.queue.submit([this._commandEncoder.finish({ label: this._commandEncoder.label + '.finish()' })]);
            this._commandEncoder = null;
        }
    }
    get commandEncoder() {
        return this._commandEncoder = this._commandEncoder || this.device.createCommandEncoder({
            label: `commandEncoder-${this.__commandEncoderCount++}`,
        });
    }
    resetCache() {
        this.renderPassEncoder = null;
        this.renderBundleGenerator = null;
        this.renderPassDescriptorCacheKey = null;
        this.renderPassDescriptor = null;
        this.renderPassPipelineCacheKey = null;
        this.renderPassBindGroupCacheKey = null;
        this.renderPassVertexBufferCacheKey = null;
        this.renderPassVertexBufferCacheKeys = [];
        this.renderPassIndexBufferCacheKey = null;
        this.viewPortInfo = [0, 0, 0, 0, 0, 0];
        this.scissorInfo = [0, 0, 0, 0];
        this.stencilReferenceInfo = 0;
        this.colorInfo = [0, 0, 0, 0];
    }
    RpEnd() {
        if (this.renderPassEncoder) {
            const bundle = this.renderBundleGenerator.generateBundle();
            this.renderPassEncoder.executeBundles([bundle]);
            this.renderPassEncoder.end();
            this.resetCache();
        }
    }
    RpSetDescriptor(hash, renderBundleEncoderDescriptor, callback) {
        if (this.renderPassDescriptorCacheKey !== hash) {
            this.RpEnd();
            this.renderPassDescriptorCacheKey = hash;
            this.renderPassDescriptor = callback();
            this.renderPassEncoder = this.commandEncoder.beginRenderPass(this.renderPassDescriptor);
            this.renderBundleGenerator = new Gl2gpuRenderPassEncoder(this.device, renderBundleEncoderDescriptor);
        }
    }
    RpSetPipeline(hash, pipeline) {
        if (this.renderPassPipelineCacheKey !== hash) {
            this.renderPassPipelineCacheKey = hash;
            this.renderBundleGenerator.setPipeline(hash, pipeline);
        }
    }
    RpSetBindGroup(bindGroup, dynamicOffset0) {
        this.renderBundleGenerator.setBindGroup(bindGroup, dynamicOffset0);
    }
    RpSetVertexBuffer(hash, loc, vertexBuffer, offset) {
        if (this.renderPassVertexBufferCacheKeys[loc] !== hash) {
            this.renderPassVertexBufferCacheKeys[loc] = hash;
            this.renderBundleGenerator.setVertexBuffer(hash, loc, vertexBuffer, offset);
        }
    }
    RpSetVertexBuffers(hash, hashes, vertexBuffers, offsets) {
        if (this.renderPassVertexBufferCacheKey !== hash) {
            this.renderPassVertexBufferCacheKey = hash;
            const n = vertexBuffers.length;
            for (let i = 0; i < n; i++) {
                this.RpSetVertexBuffer(hashes[i], i, vertexBuffers[i], offsets[i]);
            }
        }
    }
    RpSetIndexBuffer(indexBuffer, indexFormat) {
        if (this.renderPassIndexBufferCacheKey !== indexBuffer.label) {
            this.renderPassIndexBufferCacheKey = indexBuffer.label;
            this.renderBundleGenerator.setIndexBuffer(indexBuffer.label, indexBuffer, indexFormat);
        }
    }
    RpSetViewport(viewPort) {
        if (this.viewPortInfo.join(',') !== viewPort.join(',')) {
            this.viewPortInfo = viewPort;
            this.renderPassEncoder.setViewport(viewPort[0], viewPort[1], viewPort[2], viewPort[3], viewPort[4], viewPort[5]);
        }
    }
    RpDraw(vertexCount, instanceCount, firstVertex, firstInstance) {
        this.renderBundleGenerator.draw(vertexCount, instanceCount, firstVertex, firstInstance);
    }
    RpDrawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance) {
        this.renderBundleGenerator.drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
    }
}

;// ./src/components/gl2gpuFramebuffer.ts
class FramebufferAttributes {
    attachmentPoint;
    level;
    face;
    attachment;
    constructor(attachmentPoint, level, face, attachment) {
        this.attachmentPoint = attachmentPoint;
        this.level = level;
        this.face = face;
        this.attachment = attachment;
    }
    get hash() {
        return `${this.attachmentPoint}-${this.level}-${this.face}-${this.attachment.label}`;
    }
}
class Gl2gpuFramebuffer {
    attachments = new Map();
    drawBuffers = [
        WebGL2RenderingContext.COLOR_ATTACHMENT0
    ];
    _hash = null;
    get hash() {
        if (!this._hash) {
            this._hash = '';
            const sortedKeys = Array.from(this.attachments.keys()).sort();
            for (const key of sortedKeys) {
                const value = this.attachments.get(key);
                this._hash += key.toString() + '-' + value.hash.toString() + '|';
            }
            for (const drawBuffer of this.drawBuffers) {
                this._hash += drawBuffer.toString() + '|';
            }
        }
        return this._hash;
    }
    resetHash() {
        this._hash = null;
    }
}

// EXTERNAL MODULE: ./node_modules/fast-hash-code/dist/index.js
var dist = __webpack_require__(197);
;// ./src/components/gl2gpuProgram.ts


const ALIGNMENT_BLOCK_SIZE = 256;
const glSizeToBytes = new Map([
    [WebGL2RenderingContext.FLOAT, 4],
    [WebGL2RenderingContext.INT, 4],
    [WebGL2RenderingContext.UNSIGNED_INT, 4],
    [WebGL2RenderingContext.BOOL, 4],
    [WebGL2RenderingContext.FLOAT_VEC2, 2 * 4],
    [WebGL2RenderingContext.FLOAT_VEC3, 3 * 4],
    [WebGL2RenderingContext.FLOAT_VEC4, 4 * 4],
    [WebGL2RenderingContext.INT_VEC2, 2 * 4],
    [WebGL2RenderingContext.INT_VEC3, 3 * 4],
    [WebGL2RenderingContext.INT_VEC4, 4 * 4],
    [WebGL2RenderingContext.UNSIGNED_INT_VEC2, 2 * 4],
    [WebGL2RenderingContext.UNSIGNED_INT_VEC3, 3 * 4],
    [WebGL2RenderingContext.UNSIGNED_INT_VEC4, 4 * 4],
    [WebGL2RenderingContext.BOOL_VEC2, 2 * 4],
    [WebGL2RenderingContext.BOOL_VEC3, 3 * 4],
    [WebGL2RenderingContext.BOOL_VEC4, 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT2, 2 * 2 * 4],
    [WebGL2RenderingContext.FLOAT_MAT3, 3 * 3 * 4],
    [WebGL2RenderingContext.FLOAT_MAT4, 4 * 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT2x3, 2 * 3 * 4],
    [WebGL2RenderingContext.FLOAT_MAT2x4, 2 * 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT3x2, 3 * 2 * 4],
    [WebGL2RenderingContext.FLOAT_MAT3x4, 3 * 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT4x2, 4 * 2 * 4],
    [WebGL2RenderingContext.FLOAT_MAT4x3, 4 * 3 * 4],
]);
const glSizeToAlignedBytes = new Map([
    [WebGL2RenderingContext.FLOAT, 4],
    [WebGL2RenderingContext.INT, 4],
    [WebGL2RenderingContext.UNSIGNED_INT, 4],
    [WebGL2RenderingContext.BOOL, 4],
    [WebGL2RenderingContext.FLOAT_VEC2, 2 * 4],
    [WebGL2RenderingContext.FLOAT_VEC3, 4 * 4],
    [WebGL2RenderingContext.FLOAT_VEC4, 4 * 4],
    [WebGL2RenderingContext.INT_VEC2, 2 * 4],
    [WebGL2RenderingContext.INT_VEC3, 4 * 4],
    [WebGL2RenderingContext.INT_VEC4, 4 * 4],
    [WebGL2RenderingContext.UNSIGNED_INT_VEC2, 2 * 4],
    [WebGL2RenderingContext.UNSIGNED_INT_VEC3, 4 * 4],
    [WebGL2RenderingContext.UNSIGNED_INT_VEC4, 4 * 4],
    [WebGL2RenderingContext.BOOL_VEC2, 2 * 4],
    [WebGL2RenderingContext.BOOL_VEC3, 4 * 4],
    [WebGL2RenderingContext.BOOL_VEC4, 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT2, 2 * 4],
    [WebGL2RenderingContext.FLOAT_MAT3, 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT4, 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT2x3, 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT2x4, 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT3x2, 2 * 4],
    [WebGL2RenderingContext.FLOAT_MAT3x4, 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT4x2, 2 * 4],
    [WebGL2RenderingContext.FLOAT_MAT4x3, 4 * 4],
]);
class ProgramUniformBuffer {
    name;
    size;
    webgl_type;
    offset;
    byteLength;
    alignedByteLength;
    constructor(name, type, size) {
        this.name = name;
        this.size = size;
        this.webgl_type = type;
        this.byteLength = glSizeToBytes.get(type);
        this.alignedByteLength = glSizeToAlignedBytes.get(type);
    }
}
class ProgramUniformSampler {
    name;
    size;
    webgl_type;
    textureUnit;
    viewDimension;
    constructor(name, webgl_type, viewDimension) {
        this.name = name;
        this.size = 1;
        this.webgl_type = webgl_type;
        this.textureUnit = 0;
        this.viewDimension = viewDimension;
    }
}
class Gl2gpuProgram {
    static linkedPrograms = 0;
    _hash;
    uniformArrayBufferTempView;
    get hash() {
        return this._hash;
    }
    vertexShader;
    fragmentShader;
    vertexModule;
    fragmentModule;
    device;
    deleted = false;
    linked = false;
    gl2gpuAttributes = [];
    gl2gpuUniforms = [];
    gl2gpuSamplers = [];
    activeUniform;
    alignedUniformSize;
    constructor(device) {
        this.device = device;
    }
    write_uniform_i(dstOffset, num, value) {
        for (let i = 0; i < num; i++) {
            this.uniformArrayBufferTempView.setInt32(dstOffset + i * 4, value[i], true);
        }
    }
    write_uniform_f(dstOffset, num, value) {
        for (let i = 0; i < num; i++) {
            this.uniformArrayBufferTempView.setFloat32(dstOffset + i * 4, value[i], true);
        }
    }
    getFragmentState(format, entryPoint = 'main') {
        return {
            module: this.fragmentModule,
            entryPoint: entryPoint,
            targets: [{
                    format,
                }],
        };
    }
    attachShader(shader) {
        if (shader.type === WebGLRenderingContext.VERTEX_SHADER) {
            this.vertexShader = shader;
        }
        else if (shader.type === WebGLRenderingContext.FRAGMENT_SHADER) {
            this.fragmentShader = shader;
        }
    }
    linkProgram() {
        Gl2gpuProgram.linkedPrograms++;
        this._hash = Gl2gpuProgram.linkedPrograms.toString();
        this.linked = true;
        let shaders = [];
        let tmpOutput = "";
        if (this.vertexShader) {
            tmpOutput += this.vertexShader.shader_info.debug_info + " ";
            shaders.push(this.vertexShader.shader_info);
        }
        if (this.fragmentShader) {
            tmpOutput += this.fragmentShader.shader_info.debug_info + " ";
            shaders.push(this.fragmentShader.shader_info);
        }
        console.warn('[GL2GPU] linkProgram:', tmpOutput);
        const mergedShaderInfo = MergeShaderInfo(shaders);
        const code = ShaderInfo2String(mergedShaderInfo);
        if (this.vertexShader) {
            const vs = code + this.vertexShader.shader_info.wgsl;
            console.debug('[GL2GPU] linkProgram vertex:\n\n', vs);
            const label = (0,dist/* default */.Ay)(vs).toString();
            this.vertexModule = this.device.createShaderModule({ code: vs, label: label });
            this.vertexModule.label = label;
            this._hash += this.vertexModule.label + '|';
        }
        if (this.fragmentShader) {
            const fs = code + this.fragmentShader.shader_info.wgsl;
            console.debug('[GL2GPU] linkProgram fragment:\n\n', fs);
            const label = (0,dist/* default */.Ay)(fs).toString();
            this.fragmentModule = this.device.createShaderModule({ code: fs, label: label });
            this.fragmentModule.label = label;
            this._hash += this.fragmentModule.label + '|';
        }
        const aus = ShaderInfo2Gl2gpuAus(mergedShaderInfo);
        this.gl2gpuAttributes = aus.attributes;
        this.gl2gpuUniforms = aus.uniforms;
        this.gl2gpuSamplers = aus.samplers;
        let currentOffset = 0;
        for (let i = 0; i < this.gl2gpuUniforms.length; i++) {
            const uniform = this.gl2gpuUniforms[i];
            currentOffset = (currentOffset + uniform.alignedByteLength - 1) & ~(uniform.alignedByteLength - 1);
            uniform.offset = currentOffset;
            currentOffset += uniform.byteLength;
        }
        let uniformBufferLength = currentOffset;
        this.alignedUniformSize = (uniformBufferLength + ALIGNMENT_BLOCK_SIZE - 1) & ~(ALIGNMENT_BLOCK_SIZE - 1);
        this.activeUniform = new Uint8Array(uniformBufferLength);
        this.uniformArrayBufferTempView = new DataView(this.activeUniform.buffer);
    }
    setUniform(array, offset) {
        array.set(this.activeUniform, offset);
        return offset + this.alignedUniformSize;
    }
}

;// ./src/components/shaderDB.ts

function gl2gpuTrim(s) {
    return s.trim().replace(/\r\n/g, "\n");
}
const Type2Constant = new Map([
    ["float", WebGL2RenderingContext.FLOAT],
    ["vec2", WebGL2RenderingContext.FLOAT_VEC2],
    ["vec3", WebGL2RenderingContext.FLOAT_VEC3],
    ["vec4", WebGL2RenderingContext.FLOAT_VEC4],
    ["mat2", WebGL2RenderingContext.FLOAT_MAT2],
    ["mat3", WebGL2RenderingContext.FLOAT_MAT3],
    ["mat4", WebGL2RenderingContext.FLOAT_MAT4],
    ["sampler2D", WebGL2RenderingContext.SAMPLER_2D],
    ["samplerCube", WebGL2RenderingContext.SAMPLER_CUBE],
]);
function MergeShaderInfo(shaderInfo) {
    let uniformMap = new Map();
    let shaderMap = new Map();
    for (const info of shaderInfo) {
        for (const uniform of info.uniforms) {
            if (uniformMap.has(uniform.name)) {
                if (uniformMap.get(uniform.name).glsl_type !== uniform.glsl_type) {
                    throw new Error(`uniform ${uniform.name} type conflict`);
                }
            }
            else {
                uniformMap.set(uniform.name, uniform);
            }
        }
        for (const sampler of info.samplers) {
            if (shaderMap.has(sampler.name)) {
                if (shaderMap.get(sampler.name).glsl_type !== sampler.glsl_type) {
                    throw new Error(`sampler ${sampler.name} type conflict`);
                }
            }
            else {
                shaderMap.set(sampler.name, sampler);
            }
        }
    }
    return {
        attributes: shaderInfo[0].attributes,
        uniforms: Array.from(uniformMap).map((pair) => pair[1]),
        samplers: Array.from(shaderMap).map((pair) => pair[1]),
    };
}
function ShaderInfo2Gl2gpuAus(shaderInfo) {
    return {
        attributes: shaderInfo.attributes.map((attr, idx) => {
            return {
                name: attr.name,
                location: idx,
                type: Type2Constant.get(attr.glsl_type),
                size: 1,
            };
        }),
        uniforms: shaderInfo.uniforms.map((uniform) => {
            return new ProgramUniformBuffer(uniform.name, Type2Constant.get(uniform.glsl_type), 1);
        }),
        samplers: shaderInfo.samplers.map((sampler) => {
            switch (sampler.wgsl_texture_type) {
                case "texture_2d<f32>":
                    return new ProgramUniformSampler(sampler.name, WebGL2RenderingContext.SAMPLER_2D, "2d");
                case "texture_cube<f32>":
                    return new ProgramUniformSampler(sampler.name, WebGL2RenderingContext.SAMPLER_CUBE, "cube");
                default:
                    throw new Error(`unknown sampler type ${sampler.wgsl_texture_type}`);
            }
        }),
    };
}
function ShaderInfo2String(shaderInfo) {
    let res = "";
    let offset = 0;
    if (shaderInfo.uniforms.length > 0) {
        res += "struct Gl2gpuUniformObject {\n";
        for (const uniform of shaderInfo.uniforms) {
            res += `  ${uniform.name}: ${uniform.wgsl_type},\n`;
        }
        res += "};\n\n";
        res += "@binding(0) @group(0) var<uniform> _gl2gpu_uniforms_ : Gl2gpuUniformObject;\n\n";
        offset = 1;
    }
    for (let i = 0; i < shaderInfo.samplers.length; i++) {
        const sampler = shaderInfo.samplers[i];
        res += `@binding(${i * 2 + offset + 0}) @group(0) var ${sampler.name}S: ${sampler.wgsl_sampler_type};\n`;
        res += `@binding(${i * 2 + offset + 1}) @group(0) var ${sampler.name}T: ${sampler.wgsl_texture_type};\n`;
    }
    return res;
}

;// ./src/components/gl2gpuShader.ts

window.gl2gpuTmp = new Set();
class Gl2gpuShader {
    shaderMap;
    glsl_shader;
    shader_info;
    translated_glsl_shader;
    device;
    deleted = false;
    compiled = false;
    type;
    sourceLength;
    static errorShaderCount = 0;
    constructor(device, target, shaderMap) {
        this.type = target;
        this.device = device;
        this.shaderMap = shaderMap;
    }
    compileShader() {
        this.shader_info = this.shaderMap.get(gl2gpuTrim(this.glsl_shader));
        if (!this.shader_info) {
            console.warn(this.glsl_shader);
            console.warn("DEBUG ONLY, DONOT USE THIS!!", this.translated_glsl_shader);
            window.gl2gpuTmp.add(this.glsl_shader);
            Gl2gpuShader.errorShaderCount++;
            throw new Error("Shader not found in shaderDB. Total error count: " + Gl2gpuShader.errorShaderCount);
        }
        this.compiled = true;
    }
}

;// ./src/types.ts

class Gl2gpuVertexArrayAttribute {
    __hash__ = '';
    __layoutHash__ = '';
    enabled = false;
    size;
    type;
    int;
    normalized = false;
    stride = 0;
    offset = 0;
    divisor = 0;
    buffer;
    shaderLocation;
    format;
    updateHash() {
        const bufferHash = this.buffer ? this.buffer.hash : '-_-';
        const tmp = `${this.size}_${this.type}_${this.int}_${this.normalized}_${this.stride}_${this.offset}_${this.divisor}`;
        this.__layoutHash__ = this.enabled ? tmp : './.';
        this.__hash__ = `${this.__layoutHash__}@${bufferHash}`;
    }
    get hash() {
        return this.__hash__;
    }
    get layoutHash() {
        return this.__layoutHash__;
    }
}
const OriginWebGLShader = WebGLShader;
WebGLShader = new Proxy(OriginWebGLShader, {
    get: function (target, p, receiver) {
        if (p === Symbol.hasInstance) {
            return (instance) => {
                return (instance instanceof Gl2gpuShader) || (instance instanceof OriginWebGLShader);
            };
        }
        else {
            return target[p];
        }
    }
});

;// ./src/components/gl2gpuVertexArray.ts

class Gl2gpuVertexArray {
    attributes = [
        new Gl2gpuVertexArrayAttribute(),
        new Gl2gpuVertexArrayAttribute(),
        new Gl2gpuVertexArrayAttribute(),
        new Gl2gpuVertexArrayAttribute(),
        new Gl2gpuVertexArrayAttribute(),
        new Gl2gpuVertexArrayAttribute(),
        new Gl2gpuVertexArrayAttribute(),
        new Gl2gpuVertexArrayAttribute(),
        new Gl2gpuVertexArrayAttribute(),
        new Gl2gpuVertexArrayAttribute(),
        new Gl2gpuVertexArrayAttribute(),
        new Gl2gpuVertexArrayAttribute(),
        new Gl2gpuVertexArrayAttribute(),
        new Gl2gpuVertexArrayAttribute(),
        new Gl2gpuVertexArrayAttribute(),
        new Gl2gpuVertexArrayAttribute(),
    ];
    elementArrayBufferBinding = null;
    get hash() {
        let ret = this.elementArrayBufferBinding ? this.elementArrayBufferBinding.hash : 'null';
        for (const attribute of this.attributes) {
            ret += attribute.hash;
        }
        return ret;
    }
}

;// ./src/components/gl2gpuGlobalState.ts



class CommonState {
    activeTextureUnit;
    viewport;
    arrayBufferBinding;
    currentProgram;
    vertexArrayBinding;
    renderbufferBinding;
    drawFramebufferBinding;
    readFramebufferBinding;
    get hash() {
        let ret = this.activeTextureUnit.toString()
            + this.viewport.join(',')
            + this.vertexArrayBinding.hash
            + this.drawFramebufferBinding.hash
            + this.readFramebufferBinding.hash;
        if (this.arrayBufferBinding) {
            ret += this.arrayBufferBinding.hash;
        }
        if (this.renderbufferBinding) {
            ret += this.renderbufferBinding.label;
        }
        if (this.currentProgram) {
            ret += this.currentProgram.hash;
        }
        return ret;
    }
    constructor(activeTextureUnit, viewport, arrayBufferBinding, currentProgram, vertexArrayBinding, drawFramebufferBinding, readFramebufferBinding, renderbufferBinding) {
        this.activeTextureUnit = activeTextureUnit;
        this.viewport = viewport;
        this.arrayBufferBinding = arrayBufferBinding;
        this.currentProgram = currentProgram;
        this.vertexArrayBinding = vertexArrayBinding;
        this.renderbufferBinding = renderbufferBinding;
        this.drawFramebufferBinding = drawFramebufferBinding;
        this.readFramebufferBinding = readFramebufferBinding;
    }
}
class DepthState {
    enabled;
    func;
    range;
    writeMask;
    get hash() {
        return this.enabled.toString() + this.func.toString() + this.range.toString() + this.writeMask.toString();
    }
    constructor() {
        this.enabled = false;
        this.func = 'less';
        this.range = [0, 1];
        this.writeMask = true;
    }
}
class PolygonState {
    cullFace;
    cullFaceMode;
    frontFace;
    polygonOffsetFill;
    polygonOffsetUnits;
    polygonOffsetFactor;
    get hash() {
        return this.cullFace.toString() + this.cullFaceMode.toString() + this.frontFace.toString() + this.polygonOffsetFill.toString() + this.polygonOffsetUnits.toString() + this.polygonOffsetFactor.toString();
    }
    constructor() {
        this.cullFace = false;
        this.cullFaceMode = 'back';
        this.frontFace = 'ccw';
        this.polygonOffsetFill = false;
        this.polygonOffsetUnits = 0;
        this.polygonOffsetFactor = 0;
    }
}
class ClearState {
    color;
    depth;
    stencil;
    target;
    get hash() {
        return this.color.toString() + this.depth.toString() + this.stencil.toString();
    }
    constructor() {
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.depth = 1;
        this.stencil = 0x00;
        this.target = WebGL2RenderingContext.COLOR_BUFFER_BIT | WebGL2RenderingContext.DEPTH_BUFFER_BIT;
    }
}
class BlendState {
    enabled;
    color;
    dstRGB;
    srcRGB;
    dstAlpha;
    srcAlpha;
    equationRGB;
    equationAlpha;
    get hash() {
        return this.enabled.toString() + this.color.toString() + this.dstRGB.toString() + this.srcRGB.toString() + this.dstAlpha.toString() + this.srcAlpha.toString() + this.equationRGB.toString() + this.equationAlpha.toString();
    }
    constructor() {
        this.enabled = false;
        this.dstRGB = 'zero';
        this.dstAlpha = 'zero';
        this.srcRGB = 'one';
        this.srcAlpha = 'one';
        this.color = [0.0, 0.0, 0.0, 0.0];
        this.equationRGB = 'add';
        this.equationAlpha = 'add';
    }
}
class MiscState {
    scissorTest;
    scissorBox;
    colorWriteMask;
    unpackAlignment;
    packAlignment;
    get hash() {
        return this.scissorTest.toString() + this.scissorBox.toString() + this.colorWriteMask.toString() + this.unpackAlignment.toString() + this.packAlignment.toString();
    }
    constructor() {
        this.scissorTest = false;
        this.scissorBox = undefined;
        this.colorWriteMask = [true, true, true, true];
        this.unpackAlignment = 4;
        this.packAlignment = 4;
    }
}
class StencilState {
    enabled;
    frontFunc;
    frontFail;
    frontPassDepthFail;
    frontPassDepthPass;
    frontRef;
    frontValueMask;
    frontWriteMask;
    backFunc;
    backFail;
    backPassDepthFail;
    backPassDepthPass;
    backRef;
    backValueMask;
    backWriteMask;
    get hash() {
        return this.enabled.toString() + this.frontFunc.toString() + this.frontFail.toString() + this.frontPassDepthFail.toString() + this.frontPassDepthPass.toString() + this.frontRef.toString() + this.frontValueMask.toString() + this.frontWriteMask.toString() + this.backFunc.toString() + this.backFail.toString() + this.backPassDepthFail.toString() + this.backPassDepthPass.toString() + this.backRef.toString() + this.backValueMask.toString() + this.backWriteMask.toString();
    }
    constructor() {
        this.enabled = false;
        this.frontFunc = 'always';
        this.frontFail = 'keep';
        this.frontPassDepthFail = 'keep';
        this.frontPassDepthPass = 'keep';
        this.frontRef = 0;
        this.frontValueMask = 0x7FFFFFFF;
        this.frontWriteMask = 0x7FFFFFFF;
        this.backFunc = 'always';
        this.backFail = 'keep';
        this.backPassDepthPass = 'keep';
        this.backPassDepthFail = 'keep';
        this.backRef = 0;
        this.backValueMask = 0x7FFFFFFF;
        this.backWriteMask = 0x7FFFFFFF;
    }
}
class Gl2gpuGlobalState {
    glError = WebGL2RenderingContext.NO_ERROR;
    contextAttributes;
    commonState;
    depthState = new DepthState();
    polygonState = new PolygonState();
    clearState = new ClearState();
    blendState = new BlendState();
    miscState = new MiscState();
    stencilState = new StencilState();
    textureUnits = [];
    topology = null;
    defaultVertexArrayBinding = new Gl2gpuVertexArray();
    defaultFramebuffer;
    __canvasView;
    device;
    __bindGroupCount = 0;
    __pipelineCount = 0;
    uniformBuffer;
    constructor(attributes, uniform, device) {
        this.contextAttributes = attributes;
        this.defaultFramebuffer = new Gl2gpuFramebuffer();
        this.defaultFramebuffer.drawBuffers = [WebGL2RenderingContext.BACK];
        this.defaultFramebuffer.attachments = new Map();
        this.device = device;
        this.commonState = new CommonState(0, [0, 0, -1, -1, 0, 1], null, null, this.defaultVertexArrayBinding, this.defaultFramebuffer, this.defaultFramebuffer, null);
        this.uniformBuffer = uniform;
    }
    getPipelineDescriptor(topology, vertexBufferLayout) {
        const haveFragmentState = this.commonState.drawFramebufferBinding.drawBuffers.some((value) => value === WebGL2RenderingContext.BACK || (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15));
        const vertexState = {
            module: this.commonState.currentProgram.vertexModule,
            entryPoint: 'main',
            buffers: vertexBufferLayout,
        };
        const pipelineDescriptor = {
            layout: 'auto',
            vertex: vertexState,
            primitive: {
                topology: topology,
                cullMode: this.polygonState.cullFace ? this.polygonState.cullFaceMode : undefined,
                frontFace: this.polygonState.frontFace,
            },
        };
        let cacheKey = this.commonState.currentProgram.hash + this.polygonState.cullFace.toString() + this.polygonState.cullFaceMode.toString() + this.polygonState.frontFace.toString() + this.polygonState.polygonOffsetFill.toString() + this.polygonState.polygonOffsetUnits.toString() + this.polygonState.polygonOffsetFactor.toString() + this.topology.toString();
        if (haveFragmentState) {
            const blend = this.blendState.enabled ? {
                color: {
                    srcFactor: this.blendState.srcRGB,
                    dstFactor: this.blendState.dstRGB,
                    operation: this.blendState.equationRGB,
                },
                alpha: {
                    srcFactor: this.blendState.srcAlpha,
                    dstFactor: this.blendState.dstAlpha,
                    operation: this.blendState.equationAlpha,
                },
            } : undefined;
            cacheKey += this.blendState.enabled ? 'true' + this.blendState.srcRGB + this.blendState.dstRGB + this.blendState.equationRGB + this.blendState.srcAlpha + this.blendState.dstAlpha + this.blendState.equationAlpha : 'false';
            pipelineDescriptor.fragment = {
                module: this.commonState.currentProgram.fragmentModule,
                entryPoint: 'main',
                targets: this.commonState.drawFramebufferBinding.drawBuffers
                    .filter((value) => value === WebGL2RenderingContext.BACK || (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15))
                    .map((value) => {
                    cacheKey += value.toString();
                    if (value === WebGL2RenderingContext.BACK) {
                        return { format: 'bgra8unorm', blend };
                    }
                    else if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                        return { format: this.commonState.drawFramebufferBinding.attachments.get(value).attachment.texture.format, blend };
                    }
                    else {
                        return null;
                    }
                }),
            };
        }
        if (this.depthState.enabled || this.stencilState.enabled) {
            pipelineDescriptor.depthStencil = {
                format: this.getDepthStencilAttachment().format,
                depthWriteEnabled: this.depthState.enabled,
                depthCompare: this.depthState.enabled ? this.depthState.func : 'always',
                stencilFront: {
                    compare: this.stencilState.frontFunc,
                    failOp: this.stencilState.frontFail,
                    depthFailOp: this.stencilState.frontPassDepthFail,
                    passOp: this.stencilState.frontPassDepthPass,
                },
                stencilBack: {
                    compare: this.stencilState.backFunc,
                    failOp: this.stencilState.backFail,
                    depthFailOp: this.stencilState.backPassDepthFail,
                    passOp: this.stencilState.backPassDepthPass,
                },
                stencilWriteMask: this.stencilState.frontWriteMask,
                stencilReadMask: this.stencilState.frontValueMask,
                depthBias: this.polygonState.polygonOffsetFill ? this.polygonState.polygonOffsetUnits : undefined,
                depthBiasSlopeScale: this.polygonState.polygonOffsetFill ? this.polygonState.polygonOffsetFactor : undefined,
            };
            cacheKey += pipelineDescriptor.depthStencil;
        }
        return [(0,dist/* default */.Ay)(cacheKey).toString(), pipelineDescriptor];
    }
    getRenderBundleEncoderDescriptor() {
        let ret = {
            colorFormats: this.commonState.drawFramebufferBinding.drawBuffers.map((value) => {
                if (value === WebGL2RenderingContext.BACK) {
                    return 'bgra8unorm';
                }
                else if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                    return this.commonState.drawFramebufferBinding.attachments.get(value).attachment.texture.format;
                }
                else {
                    return null;
                }
            }),
        };
        if (this.depthState.enabled || this.stencilState.enabled) {
            ret['depthStencilFormat'] = this.getDepthStencilAttachment().format;
        }
        return ret;
    }
    getRenderPassDescriptorCacheKey() {
        let cacheKey = (this.clearState.target & WebGL2RenderingContext.COLOR_BUFFER_BIT) ? 'clear' : 'load' +
            this.clearState.color[0] + this.clearState.color[1] + this.clearState.color[2] + this.clearState.color[3];
        this.commonState.drawFramebufferBinding.drawBuffers
            .forEach((value) => {
            if (value === WebGL2RenderingContext.BACK) {
                cacheKey += 'CV';
            }
            else if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                cacheKey += this.commonState.drawFramebufferBinding.attachments.get(value).attachment.view.label;
            }
            else {
                cacheKey += 'null';
            }
        });
        if (this.depthState.enabled || this.stencilState.enabled) {
            const dsa = this.getDepthStencilAttachment();
            cacheKey += '$' +
                dsa.view.label +
                (this.depthState.enabled ? ((this.clearState.target & WebGL2RenderingContext.DEPTH_BUFFER_BIT) ? 'clear' : 'load') : undefined) +
                (this.depthState.enabled ? 'store' : undefined) +
                this.clearState.depth +
                (this.stencilState.enabled ? ((this.clearState.target & WebGL2RenderingContext.STENCIL_BUFFER_BIT) ? 'clear' : 'load') : undefined) +
                (this.stencilState.enabled ? 'store' : undefined) +
                this.clearState.stencil;
        }
        return cacheKey;
    }
    getRenderPassDescriptor() {
        const renderPassDescriptor = {
            colorAttachments: this.commonState.drawFramebufferBinding.drawBuffers
                .map((value) => {
                if (value === WebGL2RenderingContext.BACK) {
                    return {
                        view: this.__canvasView,
                        label: this.__canvasView.label,
                        loadOp: (this.clearState.target & WebGL2RenderingContext.COLOR_BUFFER_BIT) ? 'clear' : 'load',
                        storeOp: 'store',
                        clearValue: this.clearState.color,
                    };
                }
                else if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                    const view = this.commonState.drawFramebufferBinding.attachments.get(value).attachment.view;
                    return {
                        view,
                        label: view.label,
                        loadOp: (this.clearState.target & WebGL2RenderingContext.COLOR_BUFFER_BIT) ? 'clear' : 'load',
                        storeOp: 'store',
                        clearValue: this.clearState.color,
                    };
                }
                else {
                    return null;
                }
            }),
        };
        if (this.depthState.enabled || this.stencilState.enabled) {
            const dsa = this.getDepthStencilAttachment();
            renderPassDescriptor.depthStencilAttachment = {
                view: dsa.view,
                depthClearValue: this.clearState.depth,
                depthLoadOp: (this.depthState.enabled ? ((this.clearState.target & WebGL2RenderingContext.DEPTH_BUFFER_BIT) ? 'clear' : 'load') : undefined),
                depthStoreOp: (this.depthState.enabled ? 'store' : undefined),
                depthReadOnly: false,
                stencilClearValue: this.clearState.stencil,
                stencilLoadOp: (this.stencilState.enabled ? ((this.clearState.target & WebGL2RenderingContext.STENCIL_BUFFER_BIT) ? 'clear' : 'load') : undefined),
                stencilStoreOp: (this.stencilState.enabled ? 'store' : undefined),
                stencilReadOnly: false,
            };
        }
        return renderPassDescriptor;
    }
    _bindGroupCache = new Map();
    _bindGroupLayoutCache = new Map();
    _pipelineLayoutCache = new Map();
    _pipelineCache = new Map();
    getPBV() {
        const [vertexBufferHashes, vertexBuffers, vertexBufferOffsets, vertexBufferLayoutHash, vertexBufferLayout] = this.getVertexBuffer();
        const [bindGroupHash, bindGroupEntries, bindGroupLayoutHash, bindGroupLayoutEntries] = this.getBindGroup();
        const pipelineLayoutHash = bindGroupLayoutHash;
        const [_pipelineHash, pipelineDescriptor] = this.getPipelineDescriptor(this.topology, vertexBufferLayout);
        const pipelineHash = _pipelineHash + '|' + bindGroupLayoutHash + '|' + vertexBufferLayoutHash;
        let bindGroupLayout = this.device.createBindGroupLayout({
                entries: bindGroupLayoutEntries,
            });
        pipelineDescriptor.layout = this._pipelineLayoutCache.get(pipelineLayoutHash);
        pipelineDescriptor.layout = this.device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout],
            label: 'pipelineLayout' + pipelineDescriptor.label,
        });
        // pipelineDescriptor.layout.label = label;    // DEBUG: REMOVE
        console.log('[GL2GPU] create Pipeline');
        pipelineDescriptor.label = 'ppl' + this.__pipelineCount++;
        let pipeline = this.device.createRenderPipeline(pipelineDescriptor);
        let bindGroup = this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: bindGroupEntries,
            label: 'bg' + this.__bindGroupCount++
        });
        const vertexBuffersHash = (0,dist/* default */.Ay)(vertexBufferHashes.join('%')).toString();
        return {
            pipelineHash,
            pipeline,
            bindGroupHash,
            bindGroup,
            vertexBuffersHash,
            vertexBufferHashes,
            vertexBuffers,
            vertexBufferOffsets,
            renderPassHash: (0,dist/* default */.Ay)(this.getRenderPassDescriptorCacheKey()).toString(),
            renderBundleEncoderDescriptor: this.getRenderBundleEncoderDescriptor(),
        };
    }
    getDepthStencilAttachment() {
        if (this.depthState.enabled && this.stencilState.enabled) {
            return this.commonState.drawFramebufferBinding.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT).attachment;
        }
        if (this.depthState.enabled) {
            return this.commonState.drawFramebufferBinding.attachments.get(WebGL2RenderingContext.DEPTH_ATTACHMENT).attachment;
        }
        if (this.stencilState.enabled) {
            return this.commonState.drawFramebufferBinding.attachments.get(WebGL2RenderingContext.STENCIL_ATTACHMENT).attachment;
        }
        throw new Error("getDepthStencilAttachment failed");
    }
    getBindGroup() {
        const program = this.commonState.currentProgram;
        const bindGroupEntry = [];
        const bindGroupLayoutEntry = [];
        if (program.alignedUniformSize > 0) {
            bindGroupEntry.push({
                binding: 0,
                resource: {
                    buffer: this.uniformBuffer,
                    size: program.alignedUniformSize,
                    label: 'ub' + program.hash,
                },
            });
            bindGroupLayoutEntry.push({
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: {
                    type: 'uniform',
                    hasDynamicOffset: true,
                    minBindingSize: program.alignedUniformSize,
                },
            });
        }
        let bindGroupKey_unhashed = program.hash;
        let bindGroupLayoutKey = '0-du-' + program.alignedUniformSize;
        for (const sampler of program.gl2gpuSamplers) {
            const textureAttachment = this.textureUnits[sampler.textureUnit];
            bindGroupLayoutEntry.push({
                binding: bindGroupLayoutEntry.length,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: {
                    type: textureAttachment.isDepthStencil ? 'non-filtering' : 'filtering',
                },
            });
            bindGroupLayoutEntry.push({
                binding: bindGroupLayoutEntry.length,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: textureAttachment.isDepthStencil ? 'unfilterable-float' : 'float',
                    viewDimension: sampler.viewDimension,
                    multisampled: false,
                },
            });
            bindGroupLayoutKey += bindGroupLayoutEntry.length + '-t-' + textureAttachment.isDepthStencil + sampler.viewDimension;
            bindGroupEntry.push({
                binding: bindGroupEntry.length,
                resource: textureAttachment.sampler,
            });
            bindGroupEntry.push({
                binding: bindGroupEntry.length,
                resource: textureAttachment.view,
            });
            bindGroupKey_unhashed += this.textureUnits[sampler.textureUnit].label;
        }
        const bindGroupKey = (0,dist/* default */.Ay)(bindGroupKey_unhashed).toString();
        return [bindGroupKey, bindGroupEntry, bindGroupLayoutKey, bindGroupLayoutEntry];
    }
    getVertexBuffer() {
        const bufferAttributeMap = new Map();
        const vao = this.commonState.vertexArrayBinding;
        const buffers = [];
        const layouts = [];
        const offsets = [];
        const vbKeys = [];
        for (const attribute of vao.attributes) {
            if (attribute.enabled) {
                if (!attribute.buffer) {
                    this.glError = WebGL2RenderingContext.INVALID_OPERATION;
                    return;
                }
                let hash = attribute.buffer.hash + '|' + attribute.stride + '|' + Math.floor(attribute.offset / 2048);
                if (bufferAttributeMap.has(hash)) {
                    bufferAttributeMap.get(hash)[2].push({
                        shaderLocation: attribute.shaderLocation,
                        offset: attribute.offset,
                        format: attribute.format,
                    });
                }
                else {
                    bufferAttributeMap.set(hash, [attribute.buffer.buffer, attribute.stride, [{
                                shaderLocation: attribute.shaderLocation,
                                offset: attribute.offset,
                                format: attribute.format,
                            }]]);
                }
            }
        }
        let layoutKey = '';
        for (const [bufferHash, [buffer, arrayStride, attributes]] of bufferAttributeMap) {
            buffers.push(buffer);
            const offset = Math.min.apply(null, attributes.map(a => a.offset));
            for (let i = 0; i < attributes.length; i++) {
                attributes[i].offset -= offset;
            }
            offsets.push(offset);
            layouts.push({
                arrayStride,
                attributes,
                stepMode: 'vertex',
            });
            layoutKey += attributes.__layoutHash__ + arrayStride + '|';
            vbKeys.push(bufferHash + '|' + offset);
        }
        return [vbKeys, buffers, offsets, layoutKey, layouts];
    }
}
class Gl2gpuHashPbv {
    hash;
    generated = false;
    pipelineHash = null;
    bindGroupHash = null;
    vertexBuffersHash = null;
    vertexBufferHashes = null;
    pipeline = null;
    bindGroup = null;
    vertexBuffers = null;
    vertexBufferOffsets = null;
    renderBundleEncoderDescriptor = null;
    renderPassHash = null;
    jumpTable = new Map();
    __last_visit_hash = null;
    __last_visit_pbv = null;
    constructor(hash) {
        this.hash = hash;
    }
}
class Gl2gpuGlobalStateHashed extends Gl2gpuGlobalState {
    _hashPbvCur = new Gl2gpuHashPbv(null);
    _hashPbvCache = new Map();
    recordTransition(glFunc, ...glArgs) {
        // this.recordTransitionOne(glFunc + '$' + glArgs.join(','));
    }
    recordTransitionOne(glOpHash) {
        // if (glOpHash === this._hashPbvCur.__last_visit_hash) {
        //     this._hashPbvCur = this._hashPbvCur.__last_visit_pbv;
        //     return;
        // }
        // let jumpToHashPbv;
        // if (!(jumpToHashPbv = this._hashPbvCur.jumpTable.get(glOpHash))) {
        //     const newHash = this.hash;
        //     if (!this._hashPbvCache.has(newHash)) {
        //         jumpToHashPbv = new Gl2gpuHashPbv(newHash);
        //         this._hashPbvCache.set(newHash, jumpToHashPbv);
        //     }
        //     else {
        //         jumpToHashPbv = this._hashPbvCache.get(newHash);
        //     }
        //     this._hashPbvCur.jumpTable.set(glOpHash, jumpToHashPbv);
        // }
        // this._hashPbvCur.__last_visit_hash = glOpHash;
        // this._hashPbvCur.__last_visit_pbv = jumpToHashPbv;
        // this._hashPbvCur = jumpToHashPbv;
    }
    get hash() {
        return this.commonState.hash
            + this.depthState.hash
            + this.polygonState.hash
            + this.clearState.hash
            + this.blendState.hash
            + this.miscState.hash
            + this.stencilState.hash
            + this.textureUnits.map((texture) => texture.label).join('|')
            + this.clearState.target.toString()
            + this.topology;
    }
    getPBV() {
        // ablation study
        // if (!this._hashPbvCur.generated)
        Object.assign(this._hashPbvCur, super.getPBV());
        this._hashPbvCur.generated = true;

        for (const sampler of this.commonState.currentProgram.gl2gpuSamplers) {
            this.textureUnits[sampler.textureUnit].onDestroy.push(() => {
                this._hashPbvCur.generated = false;
            });
        }
        return this._hashPbvCur;
    }
}

;// ./src/components/gl2gpuConstants.ts
const vertexFormatList = [
    [WebGL2RenderingContext.FLOAT, 1, undefined, 'float32'],
    [WebGL2RenderingContext.FLOAT, 2, undefined, 'float32x2'],
    [WebGL2RenderingContext.FLOAT, 3, undefined, 'float32x3'],
    [WebGL2RenderingContext.FLOAT, 4, undefined, 'float32x4'],
    [WebGL2RenderingContext.HALF_FLOAT, 2, undefined, 'float16x2'],
    [WebGL2RenderingContext.HALF_FLOAT, 4, undefined, 'float16x4'],
    [WebGL2RenderingContext.BYTE, 2, false, 'sint8x2'],
    [WebGL2RenderingContext.BYTE, 4, false, 'sint8x4'],
    [WebGL2RenderingContext.UNSIGNED_BYTE, 2, false, 'uint8x2'],
    [WebGL2RenderingContext.UNSIGNED_BYTE, 4, false, 'uint8x4'],
    [WebGL2RenderingContext.SHORT, 2, false, 'sint16x2'],
    [WebGL2RenderingContext.SHORT, 4, false, 'sint16x4'],
    [WebGL2RenderingContext.UNSIGNED_SHORT, 2, false, 'uint16x2'],
    [WebGL2RenderingContext.UNSIGNED_SHORT, 4, false, 'uint16x4'],
    [WebGL2RenderingContext.INT, 1, false, 'sint32'],
    [WebGL2RenderingContext.INT, 2, false, 'sint32x2'],
    [WebGL2RenderingContext.INT, 3, false, 'sint32x3'],
    [WebGL2RenderingContext.INT, 4, false, 'sint32x4'],
    [WebGL2RenderingContext.UNSIGNED_INT, 1, false, 'uint32'],
    [WebGL2RenderingContext.UNSIGNED_INT, 2, false, 'uint32x2'],
    [WebGL2RenderingContext.UNSIGNED_INT, 3, false, 'uint32x3'],
    [WebGL2RenderingContext.UNSIGNED_INT, 4, false, 'uint32x4'],
    [WebGL2RenderingContext.BYTE, 2, true, 'snorm8x2'],
    [WebGL2RenderingContext.BYTE, 4, true, 'snorm8x4'],
    [WebGL2RenderingContext.UNSIGNED_BYTE, 2, true, 'unorm8x2'],
    [WebGL2RenderingContext.UNSIGNED_BYTE, 4, true, 'unorm8x4'],
    [WebGL2RenderingContext.SHORT, 2, true, 'snorm16x2'],
    [WebGL2RenderingContext.SHORT, 4, true, 'snorm16x4'],
    [WebGL2RenderingContext.UNSIGNED_SHORT, 2, true, 'unorm16x2'],
    [WebGL2RenderingContext.UNSIGNED_SHORT, 4, true, 'unorm16x4'],
];
const enumToCullFace = new Map([
    [WebGL2RenderingContext.FRONT, 'front'],
    [WebGL2RenderingContext.BACK, 'back'],
    [WebGL2RenderingContext.FRONT_AND_BACK, 'none'],
]);
const enumToFrontFace = new Map([
    [WebGL2RenderingContext.CW, 'cw'],
    [WebGL2RenderingContext.CCW, 'ccw'],
]);
const enumToViewDimension = new Map([
    [WebGL2RenderingContext.TEXTURE_2D, '2d'],
    [WebGL2RenderingContext.TEXTURE_2D_ARRAY, '2d-array'],
    [WebGL2RenderingContext.TEXTURE_3D, '3d'],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP, 'cube'],
]);
const enumToConstant = new Map([
    [WebGL2RenderingContext.MAX_COMBINED_TEXTURE_IMAGE_UNITS, 16],
    [WebGL2RenderingContext.MAX_CUBE_MAP_TEXTURE_SIZE, 4096],
    [WebGL2RenderingContext.MAX_FRAGMENT_UNIFORM_VECTORS, 1024],
    [WebGL2RenderingContext.MAX_RENDERBUFFER_SIZE, 4096],
    [WebGL2RenderingContext.MAX_TEXTURE_IMAGE_UNITS, 16],
    [WebGL2RenderingContext.MAX_TEXTURE_SIZE, 4096],
    [WebGL2RenderingContext.MAX_VARYING_VECTORS, 32],
    [WebGL2RenderingContext.MAX_VERTEX_ATTRIBS, 16],
    [WebGL2RenderingContext.MAX_VERTEX_TEXTURE_IMAGE_UNITS, 16],
    [WebGL2RenderingContext.MAX_VERTEX_UNIFORM_VECTORS, 1024],
    [WebGL2RenderingContext.MAX_VIEWPORT_DIMS, [4096, 4096]],
    [WebGL2RenderingContext.MAX_3D_TEXTURE_SIZE, 256],
    [WebGL2RenderingContext.MAX_ARRAY_TEXTURE_LAYERS, 256],
    [WebGL2RenderingContext.MAX_CLIENT_WAIT_TIMEOUT_WEBGL, 0],
    [WebGL2RenderingContext.MAX_COLOR_ATTACHMENTS, 4],
    [WebGL2RenderingContext.MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS, 65536],
    [WebGL2RenderingContext.MAX_COMBINED_UNIFORM_BLOCKS, 72],
    [WebGL2RenderingContext.MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS, 65536],
    [WebGL2RenderingContext.MAX_DRAW_BUFFERS, 4],
    [WebGL2RenderingContext.MAX_ELEMENT_INDEX, 4294967295],
    [WebGL2RenderingContext.MAX_ELEMENTS_INDICES, 4294967295],
    [WebGL2RenderingContext.MAX_ELEMENTS_VERTICES, 1048576],
    [WebGL2RenderingContext.MAX_FRAGMENT_INPUT_COMPONENTS, 128],
    [WebGL2RenderingContext.MAX_FRAGMENT_UNIFORM_BLOCKS, 12],
    [WebGL2RenderingContext.MAX_FRAGMENT_UNIFORM_COMPONENTS, 4096],
    [WebGL2RenderingContext.MAX_PROGRAM_TEXEL_OFFSET, 7],
    [WebGL2RenderingContext.MAX_SAMPLES, 4],
    [WebGL2RenderingContext.MAX_SERVER_WAIT_TIMEOUT, 0],
    [WebGL2RenderingContext.MAX_TEXTURE_LOD_BIAS, 16],
    [WebGL2RenderingContext.MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS, 64],
    [WebGL2RenderingContext.MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS, 4],
    [WebGL2RenderingContext.MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS, 4],
    [WebGL2RenderingContext.MAX_UNIFORM_BLOCK_SIZE, 16384],
    [WebGL2RenderingContext.MAX_UNIFORM_BUFFER_BINDINGS, 72],
    [WebGL2RenderingContext.MAX_VARYING_COMPONENTS, 60],
    [WebGL2RenderingContext.MAX_VERTEX_OUTPUT_COMPONENTS, 64],
    [WebGL2RenderingContext.MAX_VERTEX_UNIFORM_BLOCKS, 12],
    [WebGL2RenderingContext.MAX_VERTEX_UNIFORM_COMPONENTS, 4096],
    [WebGL2RenderingContext.VERSION, "WebGL 2.0 (OpenGL ES 3.0 Chromium)"],
]);
const enumToIndexFormat = new Map([
    [WebGL2RenderingContext.UNSIGNED_SHORT, 'uint16'],
    [WebGL2RenderingContext.UNSIGNED_INT, 'uint32'],
]);
const indexEnumToBytes = new Map([
    [WebGL2RenderingContext.UNSIGNED_SHORT, 2],
    [WebGL2RenderingContext.UNSIGNED_INT, 4],
]);
const enum2PT = ["point-list", "line-list", undefined, "line-strip", "triangle-list", "triangle-strip", undefined];
const enumToBlendFactors = new Map([
    [WebGL2RenderingContext.ONE, 'one'],
    [WebGL2RenderingContext.SRC_ALPHA, 'src-alpha'],
    [WebGL2RenderingContext.ONE_MINUS_SRC_ALPHA, 'one-minus-src-alpha'],
]);
const enumToCompareFunction = new Map([
    [WebGL2RenderingContext.NEVER, 'never'],
    [WebGL2RenderingContext.LESS, 'less'],
    [WebGL2RenderingContext.EQUAL, 'equal'],
    [WebGL2RenderingContext.LEQUAL, 'less-equal'],
    [WebGL2RenderingContext.GREATER, 'greater'],
    [WebGL2RenderingContext.NOTEQUAL, 'not-equal'],
    [WebGL2RenderingContext.GEQUAL, 'greater-equal'],
    [WebGL2RenderingContext.ALWAYS, 'always'],
]);
const enumToBlendOperations = new Map([
    [WebGL2RenderingContext.FUNC_ADD, 'add'],
    [WebGL2RenderingContext.FUNC_SUBTRACT, 'subtract'],
    [WebGL2RenderingContext.FUNC_REVERSE_SUBTRACT, 'reverse-subtract'],
    [WebGL2RenderingContext.MIN, 'min'],
    [WebGL2RenderingContext.MAX, 'max'],
]);
const enumToStencilOperation = new Map([
    [WebGL2RenderingContext.KEEP, 'keep'],
    [WebGL2RenderingContext.ZERO, 'zero'],
    [WebGL2RenderingContext.REPLACE, 'replace'],
    [WebGL2RenderingContext.INCR, 'increment-clamp'],
    [WebGL2RenderingContext.DECR, 'decrement-clamp'],
    [WebGL2RenderingContext.INVERT, 'invert'],
    [WebGL2RenderingContext.INCR_WRAP, 'increment-wrap'],
    [WebGL2RenderingContext.DECR_WRAP, 'decrement-wrap'],
]);
function getVertexFormat(type, size, normalized) {
    const result = vertexFormatList.find(([t, s, n]) => t === type && s === size && (n === undefined || n === normalized));
    if (result) {
        return result[3];
    }
    throw new Error(`Unsupported vertex format: ${type}, ${size}, ${normalized}`);
}

;// ./src/components/gl2gpuTexture.ts
const targetToOrigin = new Map([
    [WebGL2RenderingContext.TEXTURE_2D, { x: 0, y: 0, z: 0 }],
    [WebGL2RenderingContext.TEXTURE_3D, { x: 0, y: 0, z: 0 }],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP, { x: 0, y: 0, z: 0 }],
    [WebGL2RenderingContext.TEXTURE_2D_ARRAY, { x: 0, y: 0, z: 0 }],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X, { x: 0, y: 0, z: 0 }],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_X, { x: 0, y: 0, z: 1 }],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Y, { x: 0, y: 0, z: 2 }],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Y, { x: 0, y: 0, z: 3 }],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Z, { x: 0, y: 0, z: 4 }],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z, { x: 0, y: 0, z: 5 }],
]);
const targetViewDimensionMap = new Map([
    [WebGL2RenderingContext.TEXTURE_2D, "2d"],
    [WebGL2RenderingContext.TEXTURE_3D, "3d"],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP, "cube"],
    [WebGL2RenderingContext.TEXTURE_2D_ARRAY, "2d-array"],
]);
const parameterToString = new Map([
    [WebGL2RenderingContext.LINEAR, "linear"],
    [WebGL2RenderingContext.NEAREST, "nearest"],
    [WebGL2RenderingContext.REPEAT, "repeat"],
    [WebGL2RenderingContext.CLAMP_TO_EDGE, "clamp-to-edge"],
    [WebGL2RenderingContext.MIRRORED_REPEAT, "mirror-repeat"],
    [WebGL2RenderingContext.LINEAR_MIPMAP_LINEAR, "linear"],
]);
const pnameToString = new Map([
    [WebGL2RenderingContext.TEXTURE_MIN_FILTER, "minFilter"],
    [WebGL2RenderingContext.TEXTURE_MAG_FILTER, "magFilter"],
    [WebGL2RenderingContext.TEXTURE_WRAP_S, "wrapS"],
    [WebGL2RenderingContext.TEXTURE_WRAP_T, "wrapT"],
    [WebGL2RenderingContext.TEXTURE_WRAP_R, "wrapR"],
]);
function textureFormatLookup(internalFormat, format, type) {
    if (internalFormat === WebGL2RenderingContext.RGBA && format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "rgba8unorm";
    }
    if (internalFormat === WebGL2RenderingContext.LUMINANCE && format === WebGL2RenderingContext.LUMINANCE && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "r8unorm";
    }
    if (internalFormat === WebGL2RenderingContext.DEPTH_COMPONENT32F && format === WebGL2RenderingContext.DEPTH_COMPONENT && type === WebGL2RenderingContext.FLOAT) {
        return "depth32float";
    }
    if (internalFormat === WebGL2RenderingContext.RGB && format === WebGL2RenderingContext.RGB && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "rgba8unorm";
    }
    throw new Error(`Unsupported texture format: ${internalFormat}, ${format}, ${type}`);
}
function sampleTypeLookup(internalFormat, format, type) {
    if (internalFormat === WebGL2RenderingContext.RGBA && format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "uint";
    }
    if (internalFormat === WebGL2RenderingContext.LUMINANCE && format === WebGL2RenderingContext.LUMINANCE && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "uint";
    }
    if (internalFormat === WebGL2RenderingContext.DEPTH_COMPONENT32F && format === WebGL2RenderingContext.DEPTH_COMPONENT && type === WebGL2RenderingContext.FLOAT) {
        return "depth";
    }
    throw new Error(`Unsupported texture format: ${internalFormat}, ${format}, ${type}`);
}
class Gl2gpuTexture {
    onDestroy = [];
    static __total__ = 0;
    // static isDestroyedTexture = false;
    // label;
    _texture = null;
    _textureDescriptor = {
        size: {
            width: undefined,
            height: undefined,
            depthOrArrayLayers: undefined,
        },
        usage: undefined,
        format: undefined,
        dimension: undefined,
        isDepthStencil: false,
    };
    _sampler = null;
    _view = null;
    _hash;
    get isDepthStencil() {
        return this._textureDescriptor.isDepthStencil;
    }
    _currentTextureDescriptor = {
        size: {
            width: undefined,
            height: undefined,
            depthOrArrayLayers: undefined,
        },
        usage: undefined,
        format: undefined,
        dimension: undefined,
        isDepthStencil: false,
    };
    _viewDimension = undefined;
    state = {
        minFilter: "nearest",
        magFilter: "linear",
        wrapS: "repeat",
        wrapT: "repeat",
        wrapR: "repeat",
        maxAnisotropy: 1,
    };
    device;
    static __samplerCount = 0;
    static __viewCount = 0;
    get format() {
        return this._textureDescriptor.format;
    }
    set viewDimension(viewDimension) {
        this._viewDimension = viewDimension;
    }
    get viewDimension() {
        return this._viewDimension;
    }
    get view() {
        if (!this._view) {
            const label = "view_" + (Gl2gpuTexture.__viewCount++) + "@" + this.label;
            this._view = this.texture.createView({
                dimension: this._viewDimension,
                format: this.format,
                label: label,
            });
            // this._view.label = label;    // DEBUG: REMOVE
        }
        return this._view;
    }
    get sampler() {
        if (!this._sampler) {
            const label = "sampler-" + (Gl2gpuTexture.__samplerCount++);
            this._sampler = this.device.createSampler({
                minFilter: this.state.minFilter,
                magFilter: this.state.magFilter,
                addressModeU: this.state.wrapS,
                addressModeV: this.state.wrapT,
                addressModeW: this.state.wrapR,
                maxAnisotropy: this.state.maxAnisotropy,
                label: label,
            });
            // this._sampler.label = label;    // DEBUG: REMOVE
        }
        return this._sampler;
    }
    get hash() {
        if (!this._view) {
            return this.label + 
                this.state.minFilter +
                this.state.magFilter +
                this.state.wrapS +
                this.state.wrapT +
                this.state.wrapR +
                this.state.compare +
                this.state.maxAnisotropy +
                'uninitialized ' +
                this._viewDimension +
                this._textureDescriptor.format +
                this._textureDescriptor.dimension +
                this._textureDescriptor.usage +
                this._textureDescriptor.isDepthStencil +
                this._textureDescriptor.size.width +
                this._textureDescriptor.size.height +
                this._textureDescriptor.size.depthOrArrayLayers;
        }
        if (!this._hash) {
            this._hash = this.label +
                this.state.minFilter +
                this.state.magFilter +
                this.state.wrapS +
                this.state.wrapT +
                this.state.wrapR +
                this.state.compare +
                this.state.maxAnisotropy +
                this.view.label;
        }
        return this._hash;
    }
    destroy() {
        for (const callback of this.onDestroy) {
            callback();
        }
        this.onDestroy = [];
        this._texture.destroy();
        this._texture = null;
        this._view = null;
        this._sampler = null;
        this._hash = null;
        // Gl2gpuTexture.isDestroyedTexture = true;
        this.label = 'Gl2gpuTex$' + (Gl2gpuTexture.__total__++);
    }
    get texture() {
        if (this._texture && (this._textureDescriptor.size.width !== this._currentTextureDescriptor.size.width
            || this._textureDescriptor.size.height !== this._currentTextureDescriptor.size.height
            || this._textureDescriptor.size.depthOrArrayLayers !== this._currentTextureDescriptor.size.depthOrArrayLayers
            || this._textureDescriptor.format !== this._currentTextureDescriptor.format
            || this._textureDescriptor.dimension !== this._currentTextureDescriptor.dimension
            || this._textureDescriptor.usage !== this._currentTextureDescriptor.usage)) {
            this.destroy();
        }
        if (!this._texture) {
            this._texture = this.device.createTexture({
                label: this.label,
                size: this._textureDescriptor.size,
                format: this._textureDescriptor.format,
                usage: this._textureDescriptor.usage,
                dimension: this._textureDescriptor.dimension,
            });
            // this._texture.label = this.label;    // DEBUG: REMOVE
            this._currentTextureDescriptor = Object.assign({}, this._textureDescriptor);
        }
        return this._texture;
    }
    constructor(device) {
        this.device = device;
        this.label = 'Gl2gpuTex$' + (Gl2gpuTexture.__total__++);
    }
    static getDepthOrArrayLayers(target) {
        if (target === WebGL2RenderingContext.TEXTURE_2D) {
            return 1;
        }
        else if (target === WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X
            || target === WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_X
            || target === WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Y
            || target === WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Y
            || target === WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Z
            || target === WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z) {
            return 6;
        }
        else {
            throw new Error(`Unsupported texture target: ${target}`);
        }
    }
    texImage2D(data, target, mipLevel, internalformat, width, height, border, format, type) {
        this.label += ' 2D';
        if (internalformat === WebGL2RenderingContext.LUMINANCE && format === WebGL2RenderingContext.LUMINANCE && type === WebGL2RenderingContext.UNSIGNED_BYTE && "byteLength" in data) {
            console.warn("LUMINANCE texture is not supported, fallback to RGBA texture");
            internalformat = WebGL2RenderingContext.RGBA;
            format = WebGL2RenderingContext.RGBA;
            type = WebGL2RenderingContext.UNSIGNED_BYTE;
            const originBuffer = data.buffer;
            const newBuffer = new Uint8Array(originBuffer.byteLength * 4);
            for (let i = 0; i < originBuffer.byteLength; i++) {
                for (let j = 0; j < 3; j++) {
                    newBuffer[i * 4 + j] = data[i];
                }
                newBuffer[i * 4 + 3] = 255;
            }
            data = newBuffer;
        }
        this.configureTexture({
            size: { width, height, depthOrArrayLayers: Gl2gpuTexture.getDepthOrArrayLayers(target) },
            format: textureFormatLookup(internalformat, format, type),
            dimension: "2d",
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            isDepthStencil: format === WebGL2RenderingContext.DEPTH_COMPONENT,
        });
        if (data === null) {
            return;
        }
        if (data instanceof HTMLImageElement) {
            createImageBitmap(data).then((bitmap) => {
                this.device.queue.copyExternalImageToTexture({ source: bitmap }, { texture: this.texture, origin: targetToOrigin.get(target) }, [width, height]);
            });
        }
        else if (data instanceof ImageBitmap ||
            data instanceof HTMLCanvasElement ||
            data instanceof OffscreenCanvas) {
            this.device.queue.copyExternalImageToTexture({ source: data }, { texture: this.texture, origin: targetToOrigin.get(target) }, [width, height]);
        }
        else if (data instanceof ImageData) {
            this.device.queue.writeTexture({ texture: this.texture, origin: targetToOrigin.get(target) }, data.data, {
                offset: 0,
                bytesPerRow: data.data.length / height,
                rowsPerImage: height,
            }, [width, height]);
        }
        else if ("byteLength" in data) {
            this.device.queue.writeTexture({ texture: this.texture, origin: targetToOrigin.get(target) }, data, {
                offset: 0,
                bytesPerRow: data.byteLength / height,
                rowsPerImage: height,
            }, [width, height]);
        }
        else if (data instanceof HTMLVideoElement) {
            throw new Error("Not implemented");
        }
    }
    texImage3D(data, target, mipLevel, internalformat, width, height, depth, border, format, type, offset) {
        this.label += ' 3D';
        this.configureTexture({
            size: { width, height, depthOrArrayLayers: depth },
            format: textureFormatLookup(internalformat, format, type),
            dimension: "3d",
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING,
            isDepthStencil: format === WebGL2RenderingContext.DEPTH_COMPONENT,
        });
        if (data === null)
            return;
        if (data instanceof HTMLImageElement) {
            createImageBitmap(data).then((bitmap) => {
                this.device.queue.copyExternalImageToTexture({ source: bitmap }, { texture: this.texture }, [width, height, depth]);
            });
        }
        else if (data instanceof ImageBitmap ||
            data instanceof HTMLCanvasElement ||
            data instanceof OffscreenCanvas) {
            this.device.queue.copyExternalImageToTexture({ source: data }, { texture: this.texture }, [width, height, depth]);
        }
        else if (data instanceof ImageData) {
            this.device.queue.writeTexture({ texture: this.texture }, data.data, {
                offset: 0,
                bytesPerRow: data.data.length / height,
                rowsPerImage: height,
            }, [width, height, depth]);
        }
        else if ("byteLength" in data) {
            this.device.queue.writeTexture({ texture: this.texture }, data, {
                offset: 0,
                bytesPerRow: data.byteLength / height,
                rowsPerImage: height,
            }, [width, height, depth]);
        }
        else if (data instanceof HTMLVideoElement) {
            throw new Error("Not implemented");
        }
    }
    texParameteri(pname, param) {
        console.assert(pnameToString.has(pname) && parameterToString.has(param));
        this.state[pnameToString.get(pname)] = parameterToString.get(param);
    }
    renderbufferStorage(format, width, height) {
        this.configureTexture({
            size: { width, height, depthOrArrayLayers: 1 },
            format,
            dimension: "2d",
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            isDepthStencil: true,
        });
    }
    configureTexture(descriptor) {
        this._textureDescriptor.dimension = descriptor.dimension;
        this._textureDescriptor.format = descriptor.format;
        this._textureDescriptor.size = descriptor.size;
        this._textureDescriptor.usage = descriptor.usage;
        this._textureDescriptor.isDepthStencil = descriptor.isDepthStencil;
    }
}

;// ./src/components/gl2gpuBuffer.ts
class Gl2gpuBuffer {
    static __total__ = 0;
    __buffer__;
    device;
    descriptor = {
        size: undefined,
        usage: GPUBufferUsage.COPY_DST,
    };
    constructor(device) {
        this.device = device;
        this.descriptor.label = `buffer ${Gl2gpuBuffer.__total__++}`;
    }
    write(data = null, dstOffset = 0) {
        if (this.__buffer__ && (this.__buffer__.size !== this.descriptor.size)) {
            this.__buffer__.destroy();
            this.__buffer__ = null;
        }
        if (!this.__buffer__) {
            this.descriptor.label += this.descriptor.size.toString() + this.descriptor.usage.toString();
            this.__buffer__ = this.device.createBuffer(this.descriptor);
            // this.__buffer__.label = this.descriptor.label;    // DEBUG: REMOVE
        }
        if (data !== null) {
            const secondLength = data.byteLength & 3;
            const firstLength = data.byteLength - secondLength;
            const dataOffset = 'byteOffset' in data ? data.byteOffset : 0;
            if (!(data instanceof ArrayBuffer)) {
                data = data.buffer;
            }
            this.device.queue.writeBuffer(this.__buffer__, dstOffset, data, dataOffset, firstLength);
            if (secondLength > 0) {
                const tmpUint8Array = new Uint8Array(4);
                tmpUint8Array.set(new Uint8Array(data, dataOffset + firstLength, secondLength));
                this.device.queue.writeBuffer(this.__buffer__, dstOffset + firstLength, tmpUint8Array.buffer);
            }
        }
    }
    get buffer() {
        return this.__buffer__;
    }
    get hash() {
        return this.__buffer__ ? this.__buffer__.label : this.descriptor.label;
    }
}

;// ./src/components/gl2gpuWebGLConstants.ts
const gl2gpuWebGLConstants = {
    ACTIVE_ATTRIBUTES: 35721,
    ACTIVE_TEXTURE: 34016,
    ACTIVE_UNIFORMS: 35718,
    ACTIVE_UNIFORM_BLOCKS: 35382,
    ALIASED_LINE_WIDTH_RANGE: 33902,
    ALIASED_POINT_SIZE_RANGE: 33901,
    ALPHA: 6406,
    ALPHA_BITS: 3413,
    ALREADY_SIGNALED: 37146,
    ALWAYS: 519,
    ANY_SAMPLES_PASSED: 35887,
    ANY_SAMPLES_PASSED_CONSERVATIVE: 36202,
    ARRAY_BUFFER: 34962,
    ARRAY_BUFFER_BINDING: 34964,
    ATTACHED_SHADERS: 35717,
    BACK: 1029,
    BLEND: 3042,
    BLEND_COLOR: 32773,
    BLEND_DST_ALPHA: 32970,
    BLEND_DST_RGB: 32968,
    BLEND_EQUATION: 32777,
    BLEND_EQUATION_ALPHA: 34877,
    BLEND_EQUATION_RGB: 32777,
    BLEND_SRC_ALPHA: 32971,
    BLEND_SRC_RGB: 32969,
    BLUE_BITS: 3412,
    BOOL: 35670,
    BOOL_VEC2: 35671,
    BOOL_VEC3: 35672,
    BOOL_VEC4: 35673,
    BROWSER_DEFAULT_WEBGL: 37444,
    BUFFER_SIZE: 34660,
    BUFFER_USAGE: 34661,
    BYTE: 5120,
    CCW: 2305,
    CLAMP_TO_EDGE: 33071,
    COLOR: 6144,
    COLOR_ATTACHMENT0: 36064,
    COLOR_ATTACHMENT1: 36065,
    COLOR_ATTACHMENT2: 36066,
    COLOR_ATTACHMENT3: 36067,
    COLOR_ATTACHMENT4: 36068,
    COLOR_ATTACHMENT5: 36069,
    COLOR_ATTACHMENT6: 36070,
    COLOR_ATTACHMENT7: 36071,
    COLOR_ATTACHMENT8: 36072,
    COLOR_ATTACHMENT9: 36073,
    COLOR_ATTACHMENT10: 36074,
    COLOR_ATTACHMENT11: 36075,
    COLOR_ATTACHMENT12: 36076,
    COLOR_ATTACHMENT13: 36077,
    COLOR_ATTACHMENT14: 36078,
    COLOR_ATTACHMENT15: 36079,
    COLOR_BUFFER_BIT: 16384,
    COLOR_CLEAR_VALUE: 3106,
    COLOR_WRITEMASK: 3107,
    COMPARE_REF_TO_TEXTURE: 34894,
    COMPILE_STATUS: 35713,
    COMPRESSED_TEXTURE_FORMATS: 34467,
    CONDITION_SATISFIED: 37148,
    CONSTANT_ALPHA: 32771,
    CONSTANT_COLOR: 32769,
    CONTEXT_LOST_WEBGL: 37442,
    COPY_READ_BUFFER: 36662,
    COPY_READ_BUFFER_BINDING: 36662,
    COPY_WRITE_BUFFER: 36663,
    COPY_WRITE_BUFFER_BINDING: 36663,
    CULL_FACE: 2884,
    CULL_FACE_MODE: 2885,
    CURRENT_PROGRAM: 35725,
    CURRENT_QUERY: 34917,
    CURRENT_VERTEX_ATTRIB: 34342,
    CW: 2304,
    DECR: 7683,
    DECR_WRAP: 34056,
    DELETE_STATUS: 35712,
    DEPTH: 6145,
    DEPTH24_STENCIL8: 35056,
    DEPTH32F_STENCIL8: 36013,
    DEPTH_ATTACHMENT: 36096,
    DEPTH_BITS: 3414,
    DEPTH_BUFFER_BIT: 256,
    DEPTH_CLEAR_VALUE: 2931,
    DEPTH_COMPONENT: 6402,
    DEPTH_COMPONENT16: 33189,
    DEPTH_COMPONENT24: 33190,
    DEPTH_COMPONENT32F: 36012,
    DEPTH_FUNC: 2932,
    DEPTH_RANGE: 2928,
    DEPTH_STENCIL: 34041,
    DEPTH_STENCIL_ATTACHMENT: 33306,
    DEPTH_TEST: 2929,
    DEPTH_WRITEMASK: 2930,
    DITHER: 3024,
    DONT_CARE: 4352,
    DRAW_BUFFER0: 34853,
    DRAW_BUFFER1: 34854,
    DRAW_BUFFER2: 34855,
    DRAW_BUFFER3: 34856,
    DRAW_BUFFER4: 34857,
    DRAW_BUFFER5: 34858,
    DRAW_BUFFER6: 34859,
    DRAW_BUFFER7: 34860,
    DRAW_BUFFER8: 34861,
    DRAW_BUFFER9: 34862,
    DRAW_BUFFER10: 34863,
    DRAW_BUFFER11: 34864,
    DRAW_BUFFER12: 34865,
    DRAW_BUFFER13: 34866,
    DRAW_BUFFER14: 34867,
    DRAW_BUFFER15: 34868,
    DRAW_FRAMEBUFFER: 36009,
    DRAW_FRAMEBUFFER_BINDING: 36006,
    DST_ALPHA: 772,
    DST_COLOR: 774,
    DYNAMIC_COPY: 35050,
    DYNAMIC_DRAW: 35048,
    DYNAMIC_READ: 35049,
    ELEMENT_ARRAY_BUFFER: 34963,
    ELEMENT_ARRAY_BUFFER_BINDING: 34965,
    EQUAL: 514,
    FASTEST: 4353,
    FLOAT: 5126,
    FLOAT_32_UNSIGNED_INT_24_8_REV: 36269,
    FLOAT_MAT2: 35674,
    FLOAT_MAT2x3: 35685,
    FLOAT_MAT2x4: 35686,
    FLOAT_MAT3: 35675,
    FLOAT_MAT3x2: 35687,
    FLOAT_MAT3x4: 35688,
    FLOAT_MAT4: 35676,
    FLOAT_MAT4x2: 35689,
    FLOAT_MAT4x3: 35690,
    FLOAT_VEC2: 35664,
    FLOAT_VEC3: 35665,
    FLOAT_VEC4: 35666,
    FRAGMENT_SHADER: 35632,
    FRAGMENT_SHADER_DERIVATIVE_HINT: 35723,
    FRAMEBUFFER: 36160,
    FRAMEBUFFER_ATTACHMENT_ALPHA_SIZE: 33301,
    FRAMEBUFFER_ATTACHMENT_BLUE_SIZE: 33300,
    FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING: 33296,
    FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE: 33297,
    FRAMEBUFFER_ATTACHMENT_DEPTH_SIZE: 33302,
    FRAMEBUFFER_ATTACHMENT_GREEN_SIZE: 33299,
    FRAMEBUFFER_ATTACHMENT_OBJECT_NAME: 36049,
    FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE: 36048,
    FRAMEBUFFER_ATTACHMENT_RED_SIZE: 33298,
    FRAMEBUFFER_ATTACHMENT_STENCIL_SIZE: 33303,
    FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE: 36051,
    FRAMEBUFFER_ATTACHMENT_TEXTURE_LAYER: 36052,
    FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL: 36050,
    FRAMEBUFFER_BINDING: 36006,
    FRAMEBUFFER_COMPLETE: 36053,
    FRAMEBUFFER_DEFAULT: 33304,
    FRAMEBUFFER_INCOMPLETE_ATTACHMENT: 36054,
    FRAMEBUFFER_INCOMPLETE_DIMENSIONS: 36057,
    FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT: 36055,
    FRAMEBUFFER_INCOMPLETE_MULTISAMPLE: 36182,
    FRAMEBUFFER_UNSUPPORTED: 36061,
    FRONT: 1028,
    FRONT_AND_BACK: 1032,
    FRONT_FACE: 2886,
    FUNC_ADD: 32774,
    FUNC_REVERSE_SUBTRACT: 32779,
    FUNC_SUBTRACT: 32778,
    GENERATE_MIPMAP_HINT: 33170,
    GEQUAL: 518,
    GREATER: 516,
    GREEN_BITS: 3411,
    HALF_FLOAT: 5131,
    HIGH_FLOAT: 36338,
    HIGH_INT: 36341,
    IMPLEMENTATION_COLOR_READ_FORMAT: 35739,
    IMPLEMENTATION_COLOR_READ_TYPE: 35738,
    INCR: 7682,
    INCR_WRAP: 34055,
    INT: 5124,
    INTERLEAVED_ATTRIBS: 35980,
    INT_2_10_10_10_REV: 36255,
    INT_SAMPLER_2D: 36298,
    INT_SAMPLER_2D_ARRAY: 36303,
    INT_SAMPLER_3D: 36299,
    INT_SAMPLER_CUBE: 36300,
    INT_VEC2: 35667,
    INT_VEC3: 35668,
    INT_VEC4: 35669,
    INVALID_ENUM: 1280,
    INVALID_FRAMEBUFFER_OPERATION: 1286,
    INVALID_INDEX: 4294967295,
    INVALID_OPERATION: 1282,
    INVALID_VALUE: 1281,
    INVERT: 5386,
    KEEP: 7680,
    LEQUAL: 515,
    LESS: 513,
    LINEAR: 9729,
    LINEAR_MIPMAP_LINEAR: 9987,
    LINEAR_MIPMAP_NEAREST: 9985,
    LINES: 1,
    LINE_LOOP: 2,
    LINE_STRIP: 3,
    LINE_WIDTH: 2849,
    LINK_STATUS: 35714,
    LOW_FLOAT: 36336,
    LOW_INT: 36339,
    LUMINANCE: 6409,
    LUMINANCE_ALPHA: 6410,
    MAX: 32776,
    MAX_3D_TEXTURE_SIZE: 32883,
    MAX_ARRAY_TEXTURE_LAYERS: 35071,
    MAX_CLIENT_WAIT_TIMEOUT_WEBGL: 37447,
    MAX_COLOR_ATTACHMENTS: 36063,
    MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS: 35379,
    MAX_COMBINED_TEXTURE_IMAGE_UNITS: 35661,
    MAX_COMBINED_UNIFORM_BLOCKS: 35374,
    MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS: 35377,
    MAX_CUBE_MAP_TEXTURE_SIZE: 34076,
    MAX_DRAW_BUFFERS: 34852,
    MAX_ELEMENTS_INDICES: 33001,
    MAX_ELEMENTS_VERTICES: 33000,
    MAX_ELEMENT_INDEX: 36203,
    MAX_FRAGMENT_INPUT_COMPONENTS: 37157,
    MAX_FRAGMENT_UNIFORM_BLOCKS: 35373,
    MAX_FRAGMENT_UNIFORM_COMPONENTS: 35657,
    MAX_FRAGMENT_UNIFORM_VECTORS: 36349,
    MAX_PROGRAM_TEXEL_OFFSET: 35077,
    MAX_RENDERBUFFER_SIZE: 34024,
    MAX_SAMPLES: 36183,
    MAX_SERVER_WAIT_TIMEOUT: 37137,
    MAX_TEXTURE_IMAGE_UNITS: 34930,
    MAX_TEXTURE_LOD_BIAS: 34045,
    MAX_TEXTURE_SIZE: 3379,
    MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS: 35978,
    MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS: 35979,
    MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS: 35968,
    MAX_UNIFORM_BLOCK_SIZE: 35376,
    MAX_UNIFORM_BUFFER_BINDINGS: 35375,
    MAX_VARYING_COMPONENTS: 35659,
    MAX_VARYING_VECTORS: 36348,
    MAX_VERTEX_ATTRIBS: 34921,
    MAX_VERTEX_OUTPUT_COMPONENTS: 37154,
    MAX_VERTEX_TEXTURE_IMAGE_UNITS: 35660,
    MAX_VERTEX_UNIFORM_BLOCKS: 35371,
    MAX_VERTEX_UNIFORM_COMPONENTS: 35658,
    MAX_VERTEX_UNIFORM_VECTORS: 36347,
    MAX_VIEWPORT_DIMS: 3386,
    MEDIUM_FLOAT: 36337,
    MEDIUM_INT: 36340,
    MIN: 32775,
    MIN_PROGRAM_TEXEL_OFFSET: 35076,
    MIRRORED_REPEAT: 33648,
    NEAREST: 9728,
    NEAREST_MIPMAP_LINEAR: 9986,
    NEAREST_MIPMAP_NEAREST: 9984,
    NEVER: 512,
    NICEST: 4354,
    NONE: 0,
    NOTEQUAL: 517,
    NO_ERROR: 0,
    OBJECT_TYPE: 37138,
    ONE: 1,
    ONE_MINUS_CONSTANT_ALPHA: 32772,
    ONE_MINUS_CONSTANT_COLOR: 32770,
    ONE_MINUS_DST_ALPHA: 773,
    ONE_MINUS_DST_COLOR: 775,
    ONE_MINUS_SRC_ALPHA: 771,
    ONE_MINUS_SRC_COLOR: 769,
    OUT_OF_MEMORY: 1285,
    PACK_ALIGNMENT: 3333,
    PACK_ROW_LENGTH: 3330,
    PACK_SKIP_PIXELS: 3332,
    PACK_SKIP_ROWS: 3331,
    PIXEL_PACK_BUFFER: 35051,
    PIXEL_PACK_BUFFER_BINDING: 35053,
    PIXEL_UNPACK_BUFFER: 35052,
    PIXEL_UNPACK_BUFFER_BINDING: 35055,
    POINTS: 0,
    POLYGON_OFFSET_FACTOR: 32824,
    POLYGON_OFFSET_FILL: 32823,
    POLYGON_OFFSET_UNITS: 10752,
    QUERY_RESULT: 34918,
    QUERY_RESULT_AVAILABLE: 34919,
    R8: 33321,
    R8I: 33329,
    R8UI: 33330,
    R8_SNORM: 36756,
    R11F_G11F_B10F: 35898,
    R16F: 33325,
    R16I: 33331,
    R16UI: 33332,
    R32F: 33326,
    R32I: 33333,
    R32UI: 33334,
    RASTERIZER_DISCARD: 35977,
    READ_BUFFER: 3074,
    READ_FRAMEBUFFER: 36008,
    READ_FRAMEBUFFER_BINDING: 36010,
    RED: 6403,
    RED_BITS: 3410,
    RED_INTEGER: 36244,
    RENDERBUFFER: 36161,
    RENDERBUFFER_ALPHA_SIZE: 36179,
    RENDERBUFFER_BINDING: 36007,
    RENDERBUFFER_BLUE_SIZE: 36178,
    RENDERBUFFER_DEPTH_SIZE: 36180,
    RENDERBUFFER_GREEN_SIZE: 36177,
    RENDERBUFFER_HEIGHT: 36163,
    RENDERBUFFER_INTERNAL_FORMAT: 36164,
    RENDERBUFFER_RED_SIZE: 36176,
    RENDERBUFFER_SAMPLES: 36011,
    RENDERBUFFER_STENCIL_SIZE: 36181,
    RENDERBUFFER_WIDTH: 36162,
    RENDERER: 7937,
    REPEAT: 10497,
    REPLACE: 7681,
    RG: 33319,
    RG8: 33323,
    RG8I: 33335,
    RG8UI: 33336,
    RG8_SNORM: 36757,
    RG16F: 33327,
    RG16I: 33337,
    RG16UI: 33338,
    RG32F: 33328,
    RG32I: 33339,
    RG32UI: 33340,
    RGB: 6407,
    RGB5_A1: 32855,
    RGB8: 32849,
    RGB8I: 36239,
    RGB8UI: 36221,
    RGB8_SNORM: 36758,
    RGB9_E5: 35901,
    RGB10_A2: 32857,
    RGB10_A2UI: 36975,
    RGB16F: 34843,
    RGB16I: 36233,
    RGB16UI: 36215,
    RGB32F: 34837,
    RGB32I: 36227,
    RGB32UI: 36209,
    RGB565: 36194,
    RGBA: 6408,
    RGBA4: 32854,
    RGBA8: 32856,
    RGBA8I: 36238,
    RGBA8UI: 36220,
    RGBA8_SNORM: 36759,
    RGBA16F: 34842,
    RGBA16I: 36232,
    RGBA16UI: 36214,
    RGBA32F: 34836,
    RGBA32I: 36226,
    RGBA32UI: 36208,
    RGBA_INTEGER: 36249,
    RGB_INTEGER: 36248,
    RG_INTEGER: 33320,
    SAMPLER_2D: 35678,
    SAMPLER_2D_ARRAY: 36289,
    SAMPLER_2D_ARRAY_SHADOW: 36292,
    SAMPLER_2D_SHADOW: 35682,
    SAMPLER_3D: 35679,
    SAMPLER_BINDING: 35097,
    SAMPLER_CUBE: 35680,
    SAMPLER_CUBE_SHADOW: 36293,
    SAMPLES: 32937,
    SAMPLE_ALPHA_TO_COVERAGE: 32926,
    SAMPLE_BUFFERS: 32936,
    SAMPLE_COVERAGE: 32928,
    SAMPLE_COVERAGE_INVERT: 32939,
    SAMPLE_COVERAGE_VALUE: 32938,
    SCISSOR_BOX: 3088,
    SCISSOR_TEST: 3089,
    SEPARATE_ATTRIBS: 35981,
    SHADER_TYPE: 35663,
    SHADING_LANGUAGE_VERSION: 35724,
    SHORT: 5122,
    SIGNALED: 37145,
    SIGNED_NORMALIZED: 36764,
    SRC_ALPHA: 770,
    SRC_ALPHA_SATURATE: 776,
    SRC_COLOR: 768,
    SRGB: 35904,
    SRGB8: 35905,
    SRGB8_ALPHA8: 35907,
    STATIC_COPY: 35046,
    STATIC_DRAW: 35044,
    STATIC_READ: 35045,
    STENCIL: 6146,
    STENCIL_ATTACHMENT: 36128,
    STENCIL_BACK_FAIL: 34817,
    STENCIL_BACK_FUNC: 34816,
    STENCIL_BACK_PASS_DEPTH_FAIL: 34818,
    STENCIL_BACK_PASS_DEPTH_PASS: 34819,
    STENCIL_BACK_REF: 36003,
    STENCIL_BACK_VALUE_MASK: 36004,
    STENCIL_BACK_WRITEMASK: 36005,
    STENCIL_BITS: 3415,
    STENCIL_BUFFER_BIT: 1024,
    STENCIL_CLEAR_VALUE: 2961,
    STENCIL_FAIL: 2964,
    STENCIL_FUNC: 2962,
    STENCIL_INDEX8: 36168,
    STENCIL_PASS_DEPTH_FAIL: 2965,
    STENCIL_PASS_DEPTH_PASS: 2966,
    STENCIL_REF: 2967,
    STENCIL_TEST: 2960,
    STENCIL_VALUE_MASK: 2963,
    STENCIL_WRITEMASK: 2968,
    STREAM_COPY: 35042,
    STREAM_DRAW: 35040,
    STREAM_READ: 35041,
    SUBPIXEL_BITS: 3408,
    SYNC_CONDITION: 37139,
    SYNC_FENCE: 37142,
    SYNC_FLAGS: 37141,
    SYNC_FLUSH_COMMANDS_BIT: 1,
    SYNC_GPU_COMMANDS_COMPLETE: 37143,
    SYNC_STATUS: 37140,
    TEXTURE: 5890,
    TEXTURE0: 33984,
    TEXTURE1: 33985,
    TEXTURE2: 33986,
    TEXTURE3: 33987,
    TEXTURE4: 33988,
    TEXTURE5: 33989,
    TEXTURE6: 33990,
    TEXTURE7: 33991,
    TEXTURE8: 33992,
    TEXTURE9: 33993,
    TEXTURE10: 33994,
    TEXTURE11: 33995,
    TEXTURE12: 33996,
    TEXTURE13: 33997,
    TEXTURE14: 33998,
    TEXTURE15: 33999,
    TEXTURE16: 34000,
    TEXTURE17: 34001,
    TEXTURE18: 34002,
    TEXTURE19: 34003,
    TEXTURE20: 34004,
    TEXTURE21: 34005,
    TEXTURE22: 34006,
    TEXTURE23: 34007,
    TEXTURE24: 34008,
    TEXTURE25: 34009,
    TEXTURE26: 34010,
    TEXTURE27: 34011,
    TEXTURE28: 34012,
    TEXTURE29: 34013,
    TEXTURE30: 34014,
    TEXTURE31: 34015,
    TEXTURE_2D: 3553,
    TEXTURE_2D_ARRAY: 35866,
    TEXTURE_3D: 32879,
    TEXTURE_BASE_LEVEL: 33084,
    TEXTURE_BINDING_2D: 32873,
    TEXTURE_BINDING_2D_ARRAY: 35869,
    TEXTURE_BINDING_3D: 32874,
    TEXTURE_BINDING_CUBE_MAP: 34068,
    TEXTURE_COMPARE_FUNC: 34893,
    TEXTURE_COMPARE_MODE: 34892,
    TEXTURE_CUBE_MAP: 34067,
    TEXTURE_CUBE_MAP_NEGATIVE_X: 34070,
    TEXTURE_CUBE_MAP_NEGATIVE_Y: 34072,
    TEXTURE_CUBE_MAP_NEGATIVE_Z: 34074,
    TEXTURE_CUBE_MAP_POSITIVE_X: 34069,
    TEXTURE_CUBE_MAP_POSITIVE_Y: 34071,
    TEXTURE_CUBE_MAP_POSITIVE_Z: 34073,
    TEXTURE_IMMUTABLE_FORMAT: 37167,
    TEXTURE_IMMUTABLE_LEVELS: 33503,
    TEXTURE_MAG_FILTER: 10240,
    TEXTURE_MAX_LEVEL: 33085,
    TEXTURE_MAX_LOD: 33083,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_MIN_LOD: 33082,
    TEXTURE_WRAP_R: 32882,
    TEXTURE_WRAP_S: 10242,
    TEXTURE_WRAP_T: 10243,
    TIMEOUT_EXPIRED: 37147,
    TIMEOUT_IGNORED: -1,
    TRANSFORM_FEEDBACK: 36386,
    TRANSFORM_FEEDBACK_ACTIVE: 36388,
    TRANSFORM_FEEDBACK_BINDING: 36389,
    TRANSFORM_FEEDBACK_BUFFER: 35982,
    TRANSFORM_FEEDBACK_BUFFER_BINDING: 35983,
    TRANSFORM_FEEDBACK_BUFFER_MODE: 35967,
    TRANSFORM_FEEDBACK_BUFFER_SIZE: 35973,
    TRANSFORM_FEEDBACK_BUFFER_START: 35972,
    TRANSFORM_FEEDBACK_PAUSED: 36387,
    TRANSFORM_FEEDBACK_PRIMITIVES_WRITTEN: 35976,
    TRANSFORM_FEEDBACK_VARYINGS: 35971,
    TRIANGLES: 4,
    TRIANGLE_FAN: 6,
    TRIANGLE_STRIP: 5,
    UNIFORM_ARRAY_STRIDE: 35388,
    UNIFORM_BLOCK_ACTIVE_UNIFORMS: 35394,
    UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES: 35395,
    UNIFORM_BLOCK_BINDING: 35391,
    UNIFORM_BLOCK_DATA_SIZE: 35392,
    UNIFORM_BLOCK_INDEX: 35386,
    UNIFORM_BLOCK_REFERENCED_BY_FRAGMENT_SHADER: 35398,
    UNIFORM_BLOCK_REFERENCED_BY_VERTEX_SHADER: 35396,
    UNIFORM_BUFFER: 35345,
    UNIFORM_BUFFER_BINDING: 35368,
    UNIFORM_BUFFER_OFFSET_ALIGNMENT: 35380,
    UNIFORM_BUFFER_SIZE: 35370,
    UNIFORM_BUFFER_START: 35369,
    UNIFORM_IS_ROW_MAJOR: 35390,
    UNIFORM_MATRIX_STRIDE: 35389,
    UNIFORM_OFFSET: 35387,
    UNIFORM_SIZE: 35384,
    UNIFORM_TYPE: 35383,
    UNPACK_ALIGNMENT: 3317,
    UNPACK_COLORSPACE_CONVERSION_WEBGL: 37443,
    UNPACK_FLIP_Y_WEBGL: 37440,
    UNPACK_IMAGE_HEIGHT: 32878,
    UNPACK_PREMULTIPLY_ALPHA_WEBGL: 37441,
    UNPACK_ROW_LENGTH: 3314,
    UNPACK_SKIP_IMAGES: 32877,
    UNPACK_SKIP_PIXELS: 3316,
    UNPACK_SKIP_ROWS: 3315,
    UNSIGNALED: 37144,
    UNSIGNED_BYTE: 5121,
    UNSIGNED_INT: 5125,
    UNSIGNED_INT_2_10_10_10_REV: 33640,
    UNSIGNED_INT_5_9_9_9_REV: 35902,
    UNSIGNED_INT_10F_11F_11F_REV: 35899,
    UNSIGNED_INT_24_8: 34042,
    UNSIGNED_INT_SAMPLER_2D: 36306,
    UNSIGNED_INT_SAMPLER_2D_ARRAY: 36311,
    UNSIGNED_INT_SAMPLER_3D: 36307,
    UNSIGNED_INT_SAMPLER_CUBE: 36308,
    UNSIGNED_INT_VEC2: 36294,
    UNSIGNED_INT_VEC3: 36295,
    UNSIGNED_INT_VEC4: 36296,
    UNSIGNED_NORMALIZED: 35863,
    UNSIGNED_SHORT: 5123,
    UNSIGNED_SHORT_4_4_4_4: 32819,
    UNSIGNED_SHORT_5_5_5_1: 32820,
    UNSIGNED_SHORT_5_6_5: 33635,
    VALIDATE_STATUS: 35715,
    VENDOR: 7936,
    VERSION: 7938,
    VERTEX_ARRAY_BINDING: 34229,
    VERTEX_ATTRIB_ARRAY_BUFFER_BINDING: 34975,
    VERTEX_ATTRIB_ARRAY_DIVISOR: 35070,
    VERTEX_ATTRIB_ARRAY_ENABLED: 34338,
    VERTEX_ATTRIB_ARRAY_INTEGER: 35069,
    VERTEX_ATTRIB_ARRAY_NORMALIZED: 34922,
    VERTEX_ATTRIB_ARRAY_POINTER: 34373,
    VERTEX_ATTRIB_ARRAY_SIZE: 34339,
    VERTEX_ATTRIB_ARRAY_STRIDE: 34340,
    VERTEX_ATTRIB_ARRAY_TYPE: 34341,
    VERTEX_SHADER: 35633,
    VIEWPORT: 2978,
    WAIT_FAILED: 37149,
    ZERO: 0,
};

;// ./src/components/gl2gpuWebGLStatic.ts










const GLOB_GL_CTX = document.createElement('canvas').getContext('webgl2');
const frameBeginFuncLst = [];
const frameEndFuncList = [];
function beginFrame() {
    frameBeginFuncLst.forEach((func) => func());
}
function endFrame() {
    frameEndFuncList.forEach((func) => func());
}
class Gl2gpuWebGLStatic {
    gl2gpuLastCanvasSize = [-1, -1];
    gl2gpuMaxUniSize;
    gl2gpuCanvas;
    gl2gpuGpuctx;
    gl2gpuDevice;
    gl2gpuUniArr;
    gl2gpuUniBuf;
    gl2gpuUniOff = 0;
    gl2gpuWrapper;
    gl2gpuGlobalState;
    bindedGetRenderPassDesc;
    gl2gpuRpCache;
    shaderMap;
    increaseOk() {
    }
    decreaseOk() {
    }
    get wrapperContext() {
        return this.gl2gpuWrapper;
    }
    regenerateDS(label, format, compareFunc, bindPoint, width, height) {
        const texture = new Gl2gpuTexture(this.gl2gpuDevice);
        texture.label += label;
        texture.state.compare = compareFunc;
        texture.renderbufferStorage(format, width, height);
        texture.viewDimension = '2d';
        this.gl2gpuGlobalState.defaultFramebuffer.attachments.set(bindPoint, new FramebufferAttributes(bindPoint, undefined, undefined, texture));
        this.gl2gpuGlobalState.defaultFramebuffer.resetHash();
    }
    updateCanvasSize() {
        const width = this.gl2gpuCanvas.width;
        const height = this.gl2gpuCanvas.height;
        if (this.gl2gpuLastCanvasSize[0] === width && this.gl2gpuLastCanvasSize[1] === height) {
            return;
        }
        this.gl2gpuGlobalState.miscState.scissorBox = [0, 0, width, height];
        this.gl2gpuGlobalState.commonState.viewport = [0, 0, width, height, 0, 1];
        try {
            this.gl2gpuGlobalState.defaultFramebuffer.attachments.get(WebGL2RenderingContext.DEPTH_ATTACHMENT).attachment.destroy();
            this.gl2gpuGlobalState.defaultFramebuffer.attachments.get(WebGL2RenderingContext.STENCIL_ATTACHMENT).attachment.destroy();
            this.gl2gpuGlobalState.defaultFramebuffer.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT).attachment.destroy();
        }
        catch (error) {
        }
        this.gl2gpuLastCanvasSize = [width, height];
        this.regenerateDS(`defaultDepthBuffer ${width} ${height}`, 'depth32float', this.gl2gpuGlobalState.depthState.func, WebGL2RenderingContext.DEPTH_ATTACHMENT, width, height);
        this.regenerateDS(`defaultStencilBuffer ${width} ${height}`, 'stencil8', this.gl2gpuGlobalState.stencilState.frontFunc, WebGL2RenderingContext.STENCIL_ATTACHMENT, width, height);
        this.regenerateDS(`defaultDepthStencilBuffer ${width} ${height}`, 'depth24plus-stencil8', this.gl2gpuGlobalState.depthState.func, WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT, width, height);
    }
    constructor(_canvas, _gpuctx, _attributes, _device, _maxUniformSize, _replay, shaderMap) {
        this.shaderMap = shaderMap;
        this.gl2gpuMaxUniSize = _maxUniformSize;
        this.gl2gpuCanvas = _canvas;
        this.gl2gpuGpuctx = _gpuctx;
        this.gl2gpuDevice = _device;
        this.gl2gpuUniArr = new Uint8Array(this.gl2gpuMaxUniSize);
        this.gl2gpuUniBuf = this.gl2gpuDevice.createBuffer({
            label: 'GU',
            size: this.gl2gpuMaxUniSize + 65536,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        // this.gl2gpuUniBuf.label = 'GU';    // DEBUG: REMOVE
        this.gl2gpuCanvas.onresize = () => {
            this.updateCanvasSize();
        };
        for (const propertyName in gl2gpuWebGLConstants) {
            this[propertyName] = gl2gpuWebGLConstants[propertyName];
        }
        this['canvas'] = _canvas;
        this['drawingBufferWidth'] = _canvas.width;
        this['drawingBufferHeight'] = _canvas.height;
        this['drawingBufferColorSpace'] = 'srgb';
        this.gl2gpuWrapper = this;
        this.gl2gpuGlobalState = new Gl2gpuGlobalStateHashed(_attributes, this.gl2gpuUniBuf, _device);
        const label = 'initial canvasView';
        this.gl2gpuGlobalState.__canvasView = this.gl2gpuGpuctx.getCurrentTexture().createView({ label: label });
        // this.gl2gpuGlobalState.__canvasView.label = label;    // DEBUG: REMOVE
        frameBeginFuncLst.push(this._frameStart.bind(this));
        frameEndFuncList.push(this._frameEnd.bind(this));
        this.gl2gpuRpCache = new Gl2gpuRenderPassCache(this.gl2gpuDevice);
        this.updateCanvasSize();
        this.bindedGetRenderPassDesc = this.gl2gpuGlobalState.getRenderPassDescriptor.bind(this.gl2gpuGlobalState);
    }
    flushUniforms() {
        if (this.gl2gpuUniOff > 0) {
            this.gl2gpuDevice.queue.writeBuffer(this.gl2gpuUniBuf, 0, this.gl2gpuUniArr.buffer, 0, this.gl2gpuUniOff);
            this.gl2gpuUniOff = 0;
        }
    }
    _der_flush() {
        this.flushUniforms();
        this.gl2gpuRpCache.CeSubmitAndReset();
    }
    _frameEnd() {
        this._der_flush();
        this.gl2gpuGlobalState.__canvasView = null;
    }
    _frameStart() {
        this.gl2gpuUniOff = 0;
        this.gl2gpuGlobalState.__canvasView = this.gl2gpuGpuctx.getCurrentTexture().createView({ label: 'canvasView' });
        // this.gl2gpuGlobalState.__canvasView.label = 'canvasView';    // DEBUG: REMOVE
    }
    bindAttribLocation() {
        console.warn("skipping bindAttribLocation");
    }
    getError() {
        return this.gl2gpuGlobalState.glError;
    }
    detachShader() {
        console.warn("skipping detachShader");
    }
    deleteShader(s) {
        s.deleted = true;
    }
    deleteProgram(p) {
        p.deleted = true;
    }
    getShaderInfoLog(x) {
        return "fake shader info log";
    }
    getProgramInfoLog(p) {
        return "fake program info log";
    }
    getParameter(pname) {
        if (enumToConstant.has(pname)) {
            return enumToConstant.get(pname);
        }
        else {
            switch (pname) {
                case WebGL2RenderingContext.ACTIVE_TEXTURE:
                    return this.gl2gpuGlobalState.commonState.activeTextureUnit + WebGL2RenderingContext.TEXTURE0;
                case WebGL2RenderingContext.ARRAY_BUFFER_BINDING:
                    return this.gl2gpuGlobalState.commonState.arrayBufferBinding;
                case WebGL2RenderingContext.BLEND:
                    return this.gl2gpuGlobalState.blendState.enabled;
                case WebGL2RenderingContext.BLEND_COLOR:
                    return new Float32Array(this.gl2gpuGlobalState.blendState.color);
                case WebGL2RenderingContext.SCISSOR_BOX:
                    return new Int32Array(this.gl2gpuGlobalState.miscState.scissorBox);
                case WebGL2RenderingContext.SCISSOR_TEST:
                    return this.gl2gpuGlobalState.miscState.scissorTest;
                case WebGL2RenderingContext.STENCIL_TEST:
                    return this.gl2gpuGlobalState.stencilState.enabled;
                case WebGL2RenderingContext.STENCIL_WRITEMASK:
                    return this.gl2gpuGlobalState.stencilState.frontWriteMask;
                case WebGL2RenderingContext.STENCIL_BACK_WRITEMASK:
                    return this.gl2gpuGlobalState.stencilState.backWriteMask;
                case WebGL2RenderingContext.STENCIL_VALUE_MASK:
                    return this.gl2gpuGlobalState.stencilState.frontValueMask;
                case WebGL2RenderingContext.STENCIL_BACK_VALUE_MASK:
                    return this.gl2gpuGlobalState.stencilState.backValueMask;
                case WebGL2RenderingContext.STENCIL_REF:
                    return this.gl2gpuGlobalState.stencilState.frontRef;
                case WebGL2RenderingContext.STENCIL_BACK_REF:
                    return this.gl2gpuGlobalState.stencilState.backRef;
                case WebGL2RenderingContext.STENCIL_FUNC:
                    return this.gl2gpuGlobalState.stencilState.frontFunc;
                case WebGL2RenderingContext.STENCIL_BACK_FUNC:
                    return this.gl2gpuGlobalState.stencilState.backFunc;
                case WebGL2RenderingContext.STENCIL_FAIL:
                    return this.gl2gpuGlobalState.stencilState.frontFail;
                case WebGL2RenderingContext.STENCIL_BACK_FAIL:
                    return this.gl2gpuGlobalState.stencilState.backFail;
                case WebGL2RenderingContext.STENCIL_PASS_DEPTH_FAIL:
                    return this.gl2gpuGlobalState.stencilState.frontPassDepthFail;
                case WebGL2RenderingContext.STENCIL_BACK_PASS_DEPTH_FAIL:
                    return this.gl2gpuGlobalState.stencilState.backPassDepthFail;
                case WebGL2RenderingContext.STENCIL_PASS_DEPTH_PASS:
                    return this.gl2gpuGlobalState.stencilState.frontPassDepthPass;
                case WebGL2RenderingContext.STENCIL_BACK_PASS_DEPTH_PASS:
                    return this.gl2gpuGlobalState.stencilState.backPassDepthPass;
                case WebGL2RenderingContext.STENCIL_CLEAR_VALUE:
                    return this.gl2gpuGlobalState.clearState.stencil;
                case WebGL2RenderingContext.VIEWPORT:
                    const [x, y, width, height, minDepth, maxDepth] = this.gl2gpuGlobalState.commonState.viewport;
                    return new Int32Array([x, y, width, height]);
            }
            throw new Error("unhandled getParameter: " + pname);
        }
    }
    getContextAttributes() {
        return this.gl2gpuGlobalState.contextAttributes;
    }
    getShaderParameter(shader, pname) {
        switch (pname) {
            case WebGL2RenderingContext.DELETE_STATUS:
                return shader.deleted;
            case WebGL2RenderingContext.COMPILE_STATUS:
                return shader.compiled;
            case WebGL2RenderingContext.SHADER_TYPE:
                return shader.type;
        }
        throw new Error("unhandled getShaderParameter: " + pname);
    }
    getProgramParameter(program, pname) {
        switch (pname) {
            case WebGL2RenderingContext.DELETE_STATUS:
                return program.deleted;
            case WebGL2RenderingContext.LINK_STATUS:
                return program.linked;
            case WebGL2RenderingContext.ATTACHED_SHADERS:
                return 2;
            case WebGL2RenderingContext.ACTIVE_ATTRIBUTES:
                return program.gl2gpuAttributes.length;
            case WebGL2RenderingContext.ACTIVE_UNIFORMS:
                return program.gl2gpuUniforms.length + program.gl2gpuSamplers.length;
        }
        throw new Error("unhandled getProgramParameter: " + pname);
    }
    getExtension(extensionName) {
        if (extensionName === 'OES_vertex_array_object') {
            return {
                createVertexArrayOES: () => {
                    return this.createVertexArray();
                },
                deleteVertexArrayOES: (vertexArray) => {
                    console.warn("deleteVertexArrayOES is not implemented");
                },
                bindVertexArrayOES: (vertexArray) => {
                    return this.bindVertexArray(vertexArray);
                },
                isVertexArrayOES: (vertexArray) => {
                    return vertexArray instanceof Gl2gpuVertexArray;
                },
            };
        }
        console.warn("extension required: " + extensionName);
    }
    getBufferParameter(target, pname) {
        let buffer = null;
        switch (target) {
            case WebGL2RenderingContext.ARRAY_BUFFER:
                buffer = this.gl2gpuGlobalState.commonState.arrayBufferBinding;
                break;
            case WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER:
                buffer = this.gl2gpuGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
                break;
            default:
                throw new Error("unsupported target: " + target);
        }
        switch (pname) {
            case WebGL2RenderingContext.BUFFER_SIZE:
                return buffer.buffer.size;
            case WebGL2RenderingContext.BUFFER_USAGE:
                return buffer.buffer.usage;
            default:
                throw new Error("unsupported pname: " + pname);
        }
    }
    getAttribLocation(program, attribName) {
        const ret = program.gl2gpuAttributes.findIndex((attrib) => attrib.name === attribName);
        if (ret === -1) {
            throw new Error("attrib not found: " + attribName + " in program: " + program);
        }
        return ret;
    }
    getUniformLocation(program, uniformName) {
        const ret = program.gl2gpuUniforms.find((uniform) => uniform.name === uniformName) || program.gl2gpuSamplers.find((sampler) => sampler.name === uniformName);
        if (ret) {
            return ret;
        }
        else {
            console.error("uniform not found: " + uniformName);
        }
    }
    polygonOffset(x, y) {
        this.gl2gpuGlobalState.polygonState.polygonOffsetFactor = x;
        this.gl2gpuGlobalState.polygonState.polygonOffsetUnits = y;
    }
    shaderSource(shader, source) {
        shader.sourceLength = source.length;
        shader.glsl_shader = source.trim();
    }
    uniform1f(pub, x0) {
        this.gl2gpuGlobalState.commonState.currentProgram.uniformArrayBufferTempView.setFloat32(pub.offset, x0, true);
    }
    uniform2f(pub, x0, x1) {
        this.gl2gpuGlobalState.commonState.currentProgram.uniformArrayBufferTempView.setFloat32(pub.offset, x0, true);
        this.gl2gpuGlobalState.commonState.currentProgram.uniformArrayBufferTempView.setFloat32(pub.offset + 4, x1, true);
    }
    uniform3f(pub, x0, x1, x2) {
        const a = this.gl2gpuGlobalState.commonState.currentProgram.uniformArrayBufferTempView;
        a.setFloat32(pub.offset, x0, true);
        a.setFloat32(pub.offset + 4, x1, true);
        a.setFloat32(pub.offset + 8, x2, true);
    }
    uniform4f(pub, x0, x1, x2, x3) {
        const a = this.gl2gpuGlobalState.commonState.currentProgram.uniformArrayBufferTempView;
        a.setFloat32(pub.offset, x0, true);
        a.setFloat32(pub.offset + 4, x1, true);
        a.setFloat32(pub.offset + 8, x2, true);
        a.setFloat32(pub.offset + 12, x3, true);
    }
    uniform1i(uniform, x0) {
        if (uniform instanceof ProgramUniformSampler) {
            uniform.textureUnit = x0;
            return;
        }
        this.gl2gpuGlobalState.commonState.currentProgram.uniformArrayBufferTempView.setInt32(uniform.offset, x0, true);
    }
    uniform2i(pub, x0, x1) {
        this.gl2gpuGlobalState.commonState.currentProgram.uniformArrayBufferTempView.setInt32(pub.offset, x0, true);
        this.gl2gpuGlobalState.commonState.currentProgram.uniformArrayBufferTempView.setInt32(pub.offset + 4, x1, true);
    }
    uniform3i(pub, x0, x1, x2) {
        const a = this.gl2gpuGlobalState.commonState.currentProgram.uniformArrayBufferTempView;
        a.setInt32(pub.offset, x0, true);
        a.setInt32(pub.offset + 4, x1, true);
        a.setInt32(pub.offset + 8, x2, true);
    }
    uniform4i(pub, x0, x1, x2, x3) {
        const a = this.gl2gpuGlobalState.commonState.currentProgram.uniformArrayBufferTempView;
        a.setInt32(pub.offset, x0, true);
        a.setInt32(pub.offset + 4, x1, true);
        a.setInt32(pub.offset + 8, x2, true);
        a.setInt32(pub.offset + 12, x3, true);
    }
    uniform1fv(pub, v) {
        this.gl2gpuGlobalState.commonState.currentProgram.write_uniform_f(pub.offset, v.length, v);
    }
    uniform2fv(pub, v) {
        this.gl2gpuGlobalState.commonState.currentProgram.write_uniform_f(pub.offset, v.length, v);
    }
    uniform3fv(pub, v) {
        this.gl2gpuGlobalState.commonState.currentProgram.write_uniform_f(pub.offset, v.length, v);
    }
    uniform4fv(pub, v) {
        this.gl2gpuGlobalState.commonState.currentProgram.write_uniform_f(pub.offset, v.length, v);
    }
    uniform1iv(pub, v) {
        this.gl2gpuGlobalState.commonState.currentProgram.write_uniform_i(pub.offset, v.length, v);
    }
    uniform2iv(pub, v) {
        this.gl2gpuGlobalState.commonState.currentProgram.write_uniform_i(pub.offset, v.length, v);
    }
    uniform3iv(pub, v) {
        this.gl2gpuGlobalState.commonState.currentProgram.write_uniform_i(pub.offset, v.length, v);
    }
    uniform4iv(pub, v) {
        this.gl2gpuGlobalState.commonState.currentProgram.write_uniform_i(pub.offset, v.length, v);
    }
    uniformMatrix2fv(pub, transpose, v) {
        this.gl2gpuGlobalState.commonState.currentProgram.write_uniform_f(pub.offset, v.length, v);
    }
    uniformMatrix3fv(pub, transpose, v) {
        this.gl2gpuGlobalState.commonState.currentProgram.write_uniform_f(pub.offset, v.length, v);
    }
    uniformMatrix4fv(pub, transpose, v) {
        this.gl2gpuGlobalState.commonState.currentProgram.write_uniform_f(pub.offset, v.length, v);
    }
    createProgram() {
        return new Gl2gpuProgram(this.gl2gpuDevice);
    }
    createShader(type) {
        return new Gl2gpuShader(this.gl2gpuDevice, type, this.shaderMap);
    }
    createBuffer() {
        return new Gl2gpuBuffer(this.gl2gpuDevice);
    }
    createTexture() {
        return new Gl2gpuTexture(this.gl2gpuDevice);
    }
    createFramebuffer() {
        return new Gl2gpuFramebuffer();
    }
    createRenderbuffer() {
        return new Gl2gpuTexture(this.gl2gpuDevice);
    }
    createVertexArray() {
        return new Gl2gpuVertexArray();
    }
    bindRenderbuffer(target, renderbuffer) {
        if (target === WebGL2RenderingContext.RENDERBUFFER) {
            this.gl2gpuGlobalState.commonState.renderbufferBinding = renderbuffer;
        }
        else {
            console.warn("unknown target: " + target);
        }
        this.gl2gpuGlobalState.recordTransition("bindRenderbuffer", target, renderbuffer.label);
    }
    renderbufferStorage(target, internalFormat, width, height) {
        if (target === WebGL2RenderingContext.RENDERBUFFER) {
            switch (internalFormat) {
                case WebGL2RenderingContext.DEPTH_COMPONENT16:
                    this.gl2gpuGlobalState.commonState.renderbufferBinding.renderbufferStorage('depth16unorm', width, height);
                    break;
                case WebGL2RenderingContext.DEPTH_COMPONENT24:
                    this.gl2gpuGlobalState.commonState.renderbufferBinding.renderbufferStorage('depth24plus', width, height);
                    break;
                case WebGL2RenderingContext.DEPTH24_STENCIL8:
                    this.gl2gpuGlobalState.commonState.renderbufferBinding.renderbufferStorage('depth24plus-stencil8', width, height);
                    break;
                case WebGL2RenderingContext.DEPTH_COMPONENT32F:
                    this.gl2gpuGlobalState.commonState.renderbufferBinding.renderbufferStorage('depth32float', width, height);
                    break;
                case WebGL2RenderingContext.STENCIL_INDEX8:
                    this.gl2gpuGlobalState.commonState.renderbufferBinding.renderbufferStorage('stencil8', width, height);
                    break;
                case WebGL2RenderingContext.RGBA32F:
                    this.gl2gpuGlobalState.commonState.renderbufferBinding.renderbufferStorage('rgba32float', width, height);
                    break;
                default:
                    throw new Error("unsupported internalFormat: " + internalFormat);
            }
        }
        else {
            console.warn("unknown target: " + target);
        }
        this.gl2gpuGlobalState.recordTransition("renderbufferStorage", target, internalFormat, width, height);
    }
    enableVertexAttribArray(index) {
        const attribute = this.gl2gpuGlobalState.commonState.vertexArrayBinding.attributes[index];
        if (!attribute.enabled) {
            attribute.enabled = true;
            attribute.updateHash();
            this.gl2gpuGlobalState.recordTransition("enableVertexAttribArray", index);
        }
    }
    disableVertexAttribArray(index) {
        const attribute = this.gl2gpuGlobalState.commonState.vertexArrayBinding.attributes[index];
        if (attribute.enabled) {
            attribute.enabled = false;
            attribute.updateHash();
            this.gl2gpuGlobalState.recordTransition("disableVertexAttribArray", index);
        }
    }
    clearColor(r, g, b, a) {
        const [r1, g1, b1, a1] = this.gl2gpuGlobalState.clearState.color;
        if (r !== r1 || g !== g1 || b !== b1 || a !== a1) {
            this.gl2gpuGlobalState.clearState.color = [r, g, b, a];
            this.gl2gpuGlobalState.recordTransition("clearColor", r, g, b, a);
        }
    }
    clearDepth(depth) {
        if (this.gl2gpuGlobalState.clearState.depth !== depth) {
            this.gl2gpuGlobalState.clearState.depth = depth;
            this.gl2gpuGlobalState.recordTransition("clearDepth", depth);
        }
    }
    clearStencil(stencil) {
        if (this.gl2gpuGlobalState.clearState.stencil !== stencil) {
            this.gl2gpuGlobalState.clearState.stencil = stencil;
            this.gl2gpuGlobalState.recordTransition("clearStencil", stencil);
        }
    }
    clear(mask) {
        if (this.gl2gpuGlobalState.clearState.target !== mask) {
            this.gl2gpuGlobalState.clearState.target = mask;
            this.gl2gpuGlobalState.recordTransition("clear", mask);
        }
    }
    depthFunc(func) {
        const tmp = enumToCompareFunction.get(func);
        if (this.gl2gpuGlobalState.depthState.func !== tmp) {
            this.gl2gpuGlobalState.depthState.func = tmp;
            this.gl2gpuGlobalState.recordTransition("depthFunc", func);
        }
    }
    depthMask(flag) {
        if (this.gl2gpuGlobalState.depthState.writeMask !== flag) {
            this.gl2gpuGlobalState.depthState.writeMask = flag;
            this.gl2gpuGlobalState.recordTransition("depthMask", flag);
        }
    }
    colorMask(r, g, b, a) {
        const [r1, g1, b1, a1] = this.gl2gpuGlobalState.miscState.colorWriteMask;
        if (r !== r1 || g !== g1 || b !== b1 || a !== a1) {
            this.gl2gpuGlobalState.miscState.colorWriteMask = [r, g, b, a];
            this.gl2gpuGlobalState.recordTransition("colorMask", r, g, b, a);
        }
    }
    frontFace(mode) {
        let tmp = enumToFrontFace.get(mode);
        if (this.gl2gpuGlobalState.polygonState.frontFace !== tmp) {
            this.gl2gpuGlobalState.polygonState.frontFace = tmp;
            this.gl2gpuGlobalState.recordTransition("frontFace", mode);
        }
    }
    cullFace(mode) {
        let tmp = enumToCullFace.get(mode);
        if (this.gl2gpuGlobalState.polygonState.cullFaceMode !== tmp) {
            this.gl2gpuGlobalState.polygonState.cullFaceMode = tmp;
            this.gl2gpuGlobalState.recordTransition("cullFace", mode);
        }
    }
    bindBuffer(target, buffer) {
        if (buffer === null)
            return;
        if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER) {
            if (this.gl2gpuGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding !== buffer) {
                this.gl2gpuGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding = buffer;
                this.gl2gpuGlobalState.recordTransitionOne(buffer.descriptor.label);
            }
        }
        else if (target === WebGL2RenderingContext.ARRAY_BUFFER) {
            if (this.gl2gpuGlobalState.commonState.arrayBufferBinding !== buffer) {
                this.gl2gpuGlobalState.commonState.arrayBufferBinding = buffer;
                this.gl2gpuGlobalState.recordTransitionOne(buffer.descriptor.label);
            }
        }
        else {
            throw new Error("unsupported buffer target: " + target);
        }
    }
    bufferData(target, data, usage) {
        this._der_flush();
        let buffer;
        if (target === WebGL2RenderingContext.ARRAY_BUFFER) {
            buffer = this.gl2gpuGlobalState.commonState.arrayBufferBinding;
            buffer.descriptor.usage |= GPUBufferUsage.VERTEX;
        }
        else if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER) {
            buffer = this.gl2gpuGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
            buffer.descriptor.usage |= GPUBufferUsage.INDEX;
        }
        else {
            throw new Error("unsupported buffer target: " + target);
        }
        if (typeof data === 'number') {
            buffer.descriptor.size = (data + 3) & (~3);
            buffer.write();
        }
        else {
            buffer.descriptor.size = (data.byteLength + 3) & (~3);
            buffer.write(data, 0);
        }
        if (usage !== WebGL2RenderingContext.STATIC_DRAW && usage !== WebGL2RenderingContext.DYNAMIC_DRAW && usage !== WebGL2RenderingContext.STREAM_DRAW) {
            throw new Error("unsupported buffer usage: " + usage);
        }
    }
    bufferSubData(target, dstOffset, data) {
        let buffer;
        if (target === WebGL2RenderingContext.ARRAY_BUFFER) {
            buffer = this.gl2gpuGlobalState.commonState.arrayBufferBinding;
        }
        else if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER) {
            buffer = this.gl2gpuGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
        }
        else {
            throw new Error("unsupported buffer target: " + target);
        }
        buffer.write(data, dstOffset);
    }
    getActiveUniform(program, index) {
        if (index < program.gl2gpuUniforms.length) {
            return {
                name: program.gl2gpuUniforms[index].name,
                size: program.gl2gpuUniforms[index].size,
                type: program.gl2gpuUniforms[index].webgl_type,
            };
        }
        else {
            return {
                name: program.gl2gpuSamplers[index - program.gl2gpuUniforms.length].name,
                size: program.gl2gpuSamplers[index - program.gl2gpuUniforms.length].size,
                type: program.gl2gpuSamplers[index - program.gl2gpuUniforms.length].webgl_type,
            };
        }
    }
    getActiveAttrib(program, index) {
        return {
            name: program.gl2gpuAttributes[index].name,
            size: program.gl2gpuAttributes[index].size,
            type: program.gl2gpuAttributes[index].type,
        };
    }
    attachShader(program, shader) {
        program.attachShader(shader);
    }
    compileShader(s) {
        const shader = GLOB_GL_CTX.createShader(s.type);
        GLOB_GL_CTX.shaderSource(shader, s.glsl_shader);
        GLOB_GL_CTX.compileShader(shader);
        s.translated_glsl_shader = GLOB_GL_CTX.getExtension('WEBGL_debug_shaders').getTranslatedShaderSource(shader);
        s.compileShader();
    }
    useProgram(program) {
        if (this.gl2gpuGlobalState.commonState.currentProgram !== program) {
            this.gl2gpuGlobalState.commonState.currentProgram = program;
            this.gl2gpuGlobalState.recordTransition("useProgram", program.hash);
        }
    }
    linkProgram(program) {
        program.linkProgram();
    }
    bindVertexArray(vertexArray) {
        const target = vertexArray || this.gl2gpuGlobalState.defaultVertexArrayBinding;
        if (this.gl2gpuGlobalState.commonState.vertexArrayBinding !== target) {
            this.gl2gpuGlobalState.commonState.vertexArrayBinding = target;
            this.gl2gpuGlobalState.recordTransition("bindVertexArray", target.hash);
        }
    }
    activeTexture(texture) {
        const target = texture - WebGL2RenderingContext.TEXTURE0;
        if (this.gl2gpuGlobalState.commonState.activeTextureUnit !== target) {
            this.gl2gpuGlobalState.commonState.activeTextureUnit = target;
            this.gl2gpuGlobalState.recordTransition("activeTexture", target.toString());
        }
    }
    bindTexture(target, texture) {
        if (texture === null)
            return;
        texture.viewDimension = enumToViewDimension.get(target);
        this.gl2gpuGlobalState.textureUnits[this.gl2gpuGlobalState.commonState.activeTextureUnit] = texture;
        this.gl2gpuGlobalState.recordTransitionOne(texture.label);
    }
    texImage2D(...args) {
        this._der_flush();
        console.assert(args.length === 9 || args.length === 6);
        const target = args.at(0);
        const level = args.at(1);
        const internalformat = args.at(2);
        let width;
        let height;
        const border = 0;
        const format = args.at(-3);
        const type = args.at(-2);
        const pixels = args.at(-1);
        if (args.length === 6) {
            if ("width" in pixels && "height" in pixels) {
                width = pixels.width;
                height = pixels.height;
            }
            else {
                throw new Error("unsupported texImage2D: " + args);
            }
        }
        else {
            width = args.at(3);
            height = args.at(4);
        }
        if (pixels instanceof HTMLVideoElement
            || !((internalformat === WebGL2RenderingContext.RGBA && format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.UNSIGNED_BYTE)
                || (internalformat === WebGL2RenderingContext.DEPTH_COMPONENT32F && format === WebGL2RenderingContext.DEPTH_COMPONENT && type === WebGL2RenderingContext.FLOAT)
                || (internalformat === WebGL2RenderingContext.LUMINANCE && format === WebGL2RenderingContext.LUMINANCE && type === WebGL2RenderingContext.UNSIGNED_BYTE)
                || (internalformat === WebGL2RenderingContext.RGB && format === WebGL2RenderingContext.RGB && type === WebGL2RenderingContext.UNSIGNED_BYTE))) {
            throw new Error("unsupported texImage2D: " + args);
        }
        this.gl2gpuGlobalState.textureUnits[this.gl2gpuGlobalState.commonState.activeTextureUnit].texImage2D(pixels, target, level, internalformat, width, height, border, format, type);
        this.gl2gpuGlobalState.recordTransition("texImage2D", target, level, internalformat, width, height, border, format, type);
    }
    texImage3D(...args) {
        this._der_flush();
        if (args.length === 10) {
            args.push(0);
        }
        console.assert(args.length === 11);
        const [target, level, internalformat, width, height, depth, border, format, type, pixels, offset] = args;
        if (pixels instanceof HTMLVideoElement
            || border !== 0) {
            throw new Error("unsupported texImage3D: " + args);
        }
        this.gl2gpuGlobalState.textureUnits[this.gl2gpuGlobalState.commonState.activeTextureUnit].texImage3D(pixels, target, level, internalformat, width, height, depth, border, format, type, offset);
        this.gl2gpuGlobalState.recordTransition("texImage3D", target, level, internalformat, width, height, depth, border, format, type, offset);
    }
    texParameteri(target, pname, param) {
        console.assert(enumToViewDimension.get(target) === this.gl2gpuGlobalState.textureUnits[this.gl2gpuGlobalState.commonState.activeTextureUnit].viewDimension);
        this.gl2gpuGlobalState.textureUnits[this.gl2gpuGlobalState.commonState.activeTextureUnit].texParameteri(pname, param);
        this.gl2gpuGlobalState.recordTransition("texParameteri", target, pname, param);
    }
    generateMipmap(target) {
        console.assert(target === WebGL2RenderingContext.TEXTURE_2D || target === WebGL2RenderingContext.TEXTURE_CUBE_MAP);
        console.warn("generateMipmap is not implemented");
    }
    viewport(x, y, width, height) {
        this.gl2gpuGlobalState.commonState.viewport[0] = x;
        this.gl2gpuGlobalState.commonState.viewport[1] = y;
        this.gl2gpuGlobalState.commonState.viewport[2] = width;
        this.gl2gpuGlobalState.commonState.viewport[3] = height;
        this.gl2gpuGlobalState.recordTransition("viewport", x, y, width, height);
    }
    depthRange(zNear, zFar) {
        this.gl2gpuGlobalState.commonState.viewport[4] = zNear;
        this.gl2gpuGlobalState.commonState.viewport[5] = zFar;
        this.gl2gpuGlobalState.recordTransition("depthRange", zNear, zFar);
    }
    vertexAttribDivisor(index, divisor) {
        const buffer = this.gl2gpuGlobalState.commonState.arrayBufferBinding;
        buffer.descriptor.usage |= GPUBufferUsage.VERTEX;
        const attribute = this.gl2gpuGlobalState.commonState.vertexArrayBinding.attributes[index];
        attribute.divisor = divisor;
        attribute.updateHash();
        this.gl2gpuGlobalState.recordTransition("vertexAttribDivisor", index, divisor);
    }
    vertexAttribPointer(index, size, type, normalized, _stride, offset) {
        const buffer = this.gl2gpuGlobalState.commonState.arrayBufferBinding;
        const attribute = this.gl2gpuGlobalState.commonState.vertexArrayBinding.attributes[index];
        const stride = _stride || size * 4;
        if (attribute.size !== size || attribute.type !== type || attribute.normalized !== normalized || attribute.stride !== stride || attribute.offset !== offset || attribute.buffer !== buffer) {
            const format = getVertexFormat(type, size, normalized);
            attribute.size = size;
            attribute.type = type;
            attribute.normalized = normalized;
            attribute.int = false;
            attribute.stride = stride;
            attribute.offset = offset;
            attribute.buffer = buffer;
            attribute.shaderLocation = index;
            attribute.format = format;
            attribute.updateHash();
            this.gl2gpuGlobalState.recordTransition("vertexAttribPointer", index, size, type, normalized, stride, offset);
        }
    }
    xxable(cap, value) {
        switch (cap) {
            case WebGL2RenderingContext.DEPTH_TEST:
                this.gl2gpuGlobalState.depthState.enabled = value;
                break;
            case WebGL2RenderingContext.STENCIL_TEST:
                this.gl2gpuGlobalState.stencilState.enabled = value;
                break;
            case WebGL2RenderingContext.CULL_FACE:
                this.gl2gpuGlobalState.polygonState.cullFace = value;
                break;
            case WebGL2RenderingContext.BLEND:
                this.gl2gpuGlobalState.blendState.enabled = value;
                break;
            case WebGL2RenderingContext.SCISSOR_TEST:
                this.gl2gpuGlobalState.miscState.scissorTest = value;
                break;
            case WebGL2RenderingContext.POLYGON_OFFSET_FILL:
                this.gl2gpuGlobalState.polygonState.polygonOffsetFill = value;
                break;
            case WebGL2RenderingContext.SAMPLE_ALPHA_TO_COVERAGE:
                console.error("unimplemented: SAMPLE_ALPHA_TO_COVERAGE");
                break;
            default:
                throw new Error("unsupported enable: " + cap);
        }
    }
    enable(cap) {
        this.xxable(cap, true);
        this.gl2gpuGlobalState.recordTransition("enable", cap);
    }
    disable(cap) {
        this.xxable(cap, false);
        this.gl2gpuGlobalState.recordTransition("disable", cap);
    }
    blendFunc(sfactor, dfactor) {
        const src = enumToBlendFactors.get(sfactor);
        const dst = enumToBlendFactors.get(dfactor);
        this.gl2gpuGlobalState.blendState.srcRGB = src;
        this.gl2gpuGlobalState.blendState.srcAlpha = src;
        this.gl2gpuGlobalState.blendState.dstRGB = dst;
        this.gl2gpuGlobalState.blendState.dstAlpha = dst;
        this.gl2gpuGlobalState.recordTransition("blendFunc", sfactor, dfactor);
    }
    blendFuncSeparate(srcRGB, dstRGB, srcAlpha, dstAlpha) {
        const srcRGB1 = enumToBlendFactors.get(srcRGB);
        const dstRGB1 = enumToBlendFactors.get(dstRGB);
        const srcAlpha1 = enumToBlendFactors.get(srcAlpha);
        const dstAlpha1 = enumToBlendFactors.get(dstAlpha);
        this.gl2gpuGlobalState.blendState.srcRGB = srcRGB1;
        this.gl2gpuGlobalState.blendState.srcAlpha = srcAlpha1;
        this.gl2gpuGlobalState.blendState.dstRGB = dstRGB1;
        this.gl2gpuGlobalState.blendState.dstAlpha = dstAlpha1;
        this.gl2gpuGlobalState.recordTransition("blendFuncSeparate", srcRGB, dstRGB, srcAlpha, dstAlpha);
    }
    blendEquation(mode) {
        const op = enumToBlendOperations.get(mode);
        this.gl2gpuGlobalState.blendState.equationRGB = op;
        this.gl2gpuGlobalState.blendState.equationAlpha = op;
        this.gl2gpuGlobalState.recordTransition("blendEquation", mode);
    }
    blendEquationSeparate(modeRGB, modeAlpha) {
        const rgbOp = enumToBlendOperations.get(modeRGB);
        const alphaOp = enumToBlendOperations.get(modeAlpha);
        this.gl2gpuGlobalState.blendState.equationRGB = rgbOp;
        this.gl2gpuGlobalState.blendState.equationAlpha = alphaOp;
        this.gl2gpuGlobalState.recordTransition("blendEquationSeparate", modeRGB, modeAlpha);
    }
    stencilFunc(func, ref, mask) {
        this.gl2gpuGlobalState.stencilState.frontFunc = enumToCompareFunction.get(func);
        this.gl2gpuGlobalState.stencilState.frontRef = ref;
        this.gl2gpuGlobalState.stencilState.frontValueMask = mask;
        this.gl2gpuGlobalState.stencilState.backFunc = enumToCompareFunction.get(func);
        this.gl2gpuGlobalState.stencilState.backRef = ref;
        this.gl2gpuGlobalState.stencilState.backValueMask = mask;
        this.gl2gpuGlobalState.recordTransition("stencilFunc", func, ref, mask);
    }
    stencilOp(fail, zfail, zpass) {
        this.gl2gpuGlobalState.stencilState.frontFail = enumToStencilOperation.get(fail);
        this.gl2gpuGlobalState.stencilState.frontPassDepthFail = enumToStencilOperation.get(zfail);
        this.gl2gpuGlobalState.stencilState.frontPassDepthPass = enumToStencilOperation.get(zpass);
        this.gl2gpuGlobalState.stencilState.backFail = enumToStencilOperation.get(fail);
        this.gl2gpuGlobalState.stencilState.backPassDepthFail = enumToStencilOperation.get(zfail);
        this.gl2gpuGlobalState.stencilState.backPassDepthPass = enumToStencilOperation.get(zpass);
        this.gl2gpuGlobalState.recordTransition("stencilOp", fail, zfail, zpass);
    }
    bindFramebuffer(target, framebuffer) {
        if (framebuffer === null) {
            framebuffer = this.gl2gpuGlobalState.defaultFramebuffer;
        }
        if (target === WebGL2RenderingContext.FRAMEBUFFER) {
            this.gl2gpuGlobalState.commonState.drawFramebufferBinding = framebuffer;
            this.gl2gpuGlobalState.commonState.readFramebufferBinding = framebuffer;
        }
        else if (target === WebGL2RenderingContext.DRAW_FRAMEBUFFER) {
            this.gl2gpuGlobalState.commonState.drawFramebufferBinding = framebuffer;
        }
        else if (target === WebGL2RenderingContext.READ_FRAMEBUFFER) {
            this.gl2gpuGlobalState.commonState.readFramebufferBinding = framebuffer;
        }
        else {
            throw new Error("unsupported bindFramebuffer: " + target);
        }
        this.gl2gpuGlobalState.recordTransition("bindFramebuffer", target, framebuffer.hash);
    }
    framebufferTexture2D(target, attachment, texTarget, texture, level) {
        console.assert(texTarget === WebGL2RenderingContext.TEXTURE_2D);
        console.assert(target === WebGL2RenderingContext.FRAMEBUFFER);
        const attrib = new FramebufferAttributes(attachment, level, undefined, texture);
        switch (attachment) {
            case WebGL2RenderingContext.DEPTH_ATTACHMENT:
                texture.state.compare = this.gl2gpuGlobalState.depthState.func;
                break;
            case WebGL2RenderingContext.STENCIL_ATTACHMENT:
                texture.state.compare = this.gl2gpuGlobalState.stencilState.frontFunc;
                break;
            case WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT:
                texture.state.compare = this.gl2gpuGlobalState.depthState.func;
                break;
        }
        this.gl2gpuGlobalState.commonState.drawFramebufferBinding.attachments.set(attachment, attrib);
        this.gl2gpuGlobalState.defaultFramebuffer.resetHash();
        this.gl2gpuGlobalState.recordTransition("framebufferTexture2D", target, attachment, texTarget, texture.label, level);
    }
    framebufferRenderbuffer(target, attachment, renderbufferTarget, renderbuffer) {
        console.assert(target === WebGL2RenderingContext.FRAMEBUFFER);
        console.assert(renderbufferTarget === WebGL2RenderingContext.RENDERBUFFER);
        const attrib = new FramebufferAttributes(attachment, undefined, undefined, renderbuffer);
        this.gl2gpuGlobalState.commonState.drawFramebufferBinding.attachments.set(attachment, attrib);
        this.gl2gpuGlobalState.defaultFramebuffer.resetHash();
        this.gl2gpuGlobalState.recordTransition("framebufferRenderbuffer", target, attachment, renderbufferTarget, renderbuffer.label);
    }
    drawBuffers(buffers) {
        this.gl2gpuGlobalState.commonState.drawFramebufferBinding.drawBuffers = buffers;
        this.gl2gpuGlobalState.defaultFramebuffer.resetHash();
        this.gl2gpuGlobalState.recordTransition("drawBuffers", ...buffers);
    }
    pixelStorei(pname, param) {
        console.warn("pixelStorei not implemented. Args:", pname, param);
    }
    checkFramebufferStatus() {
        return WebGL2RenderingContext.FRAMEBUFFER_COMPLETE;
    }
    setPBV() {
        const program = this.gl2gpuGlobalState.commonState.currentProgram;
        const { pipelineHash, pipeline, bindGroupHash: _bindGroupHash, bindGroup, vertexBuffersHash, vertexBufferHashes, vertexBuffers, vertexBufferOffsets, renderPassHash, renderBundleEncoderDescriptor } = this.gl2gpuGlobalState.getPBV();
        this.gl2gpuRpCache.RpSetDescriptor(renderPassHash, renderBundleEncoderDescriptor, this.bindedGetRenderPassDesc);
        this.gl2gpuRpCache.RpSetPipeline(pipelineHash, pipeline);
        this.gl2gpuRpCache.RpSetBindGroup(bindGroup, this.gl2gpuUniOff);
        this.gl2gpuRpCache.RpSetVertexBuffers(vertexBuffersHash, vertexBufferHashes, vertexBuffers, vertexBufferOffsets);
        this.gl2gpuUniOff = program.setUniform(this.gl2gpuUniArr, this.gl2gpuUniOff);
    }
    drawArrays(mode, first, count) {
        const topology = enum2PT[mode];
        if (this.gl2gpuGlobalState.topology !== topology) {
            this.gl2gpuGlobalState.topology = topology;
            this.gl2gpuGlobalState.recordTransitionOne(topology);
        }
        this.setPBV();
        this.gl2gpuRpCache.RpDraw(count, 1, first, 0);
        if (this.gl2gpuUniOff >= this.gl2gpuMaxUniSize) {
            this._der_flush();
        }
        if (this.gl2gpuGlobalState.clearState.target !== 0) {
            this.gl2gpuGlobalState.clearState.target = 0;
            this.gl2gpuGlobalState.recordTransitionOne('!!d0');
        }
    }
    drawElements(mode, count, type, offset) {
        const topology = enum2PT[mode];
        if (this.gl2gpuGlobalState.topology !== topology) {
            this.gl2gpuGlobalState.topology = topology;
            this.gl2gpuGlobalState.recordTransitionOne(topology);
        }
        this.setPBV();
        this.gl2gpuRpCache.RpSetIndexBuffer(this.gl2gpuGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding.buffer, enumToIndexFormat.get(type));
        this.gl2gpuRpCache.RpDrawIndexed(count, 1, Math.floor(offset / indexEnumToBytes.get(type)), 0, 0);
        if (this.gl2gpuUniOff >= this.gl2gpuMaxUniSize) {
            this._der_flush();
        }
        if (this.gl2gpuGlobalState.clearState.target !== 0) {
            this.gl2gpuGlobalState.clearState.target = 0;
            this.gl2gpuGlobalState.recordTransitionOne('!!d0');
        }
    }
}

;// ./src/webgl-static.ts


const gl2gpuWebGLTypes = ["experimental-webgl", "webgl", "webgl2"];
async function fetchJSON(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.statusText);
        }
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.error('Failed to fetch data:', error);
    }
}
async function gl2gpuGetContext(element, shader_info_url, arg0, arg1) {
    let [contextType, contextAttributes] = arg0;
    let [uniform_size, replay_delay] = arg1;
    const shaderInfo = await fetchJSON(shader_info_url);
    const shaderMap = new Map(shaderInfo.map((info) => {
        return [
            gl2gpuTrim(info.glsl),
            info
        ];
    }));
    if (!gl2gpuWebGLTypes.includes(contextType)) {
        throw new Error("Invalid context type");
    }
    const gl2gpuAdapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
    const gl2gpuDevice = await gl2gpuAdapter.requestDevice({ label: "gl2gpuDevice" });
    const gl2gpuWebGLContexts = {};
    for (const type of gl2gpuWebGLTypes) {
        const canvas = document.createElement("canvas");
        gl2gpuWebGLContexts[type] = canvas.getContext(type);
    }
    const gpuctx = element.getContext("webgpu");
    gpuctx.configure({
        device: gl2gpuDevice,
        format: 'bgra8unorm',
    });
    return new Gl2gpuWebGLStatic(element, gpuctx, contextAttributes, gl2gpuDevice, uniform_size, replay_delay, shaderMap);
}
;


/******/ 	return __webpack_exports__;
/******/ })()
;
});