import { HydBuffer } from "./hydBuffer";
import { HydProgram, ProgramUniformBuffer, uniformMatrixDimensions } from "./hydProgram";
import { HydTransformFeedback } from "./hydTransformFeedback";
import { HydVertexArray } from "./hydVertexArray";
import { bridgeGlslDunderIdentifier, bridgeGlslDunderIdentifiers } from "./shaderGlslIdentifiers";
import { normalizeWebGl2BuiltinLimits } from "./shaderGlslCompatibility";

interface NativeBufferMirror {
    buffer: WebGLBuffer;
    size: number;
    version: number;
}

interface NativeProgramMirror {
    program: WebGLProgram;
    generation: number;
}

export interface TransformFeedbackDraw {
    mode: GLenum;
    first?: number;
    count: number;
    instanceCount: number;
    elementBuffer?: HydBuffer;
    elementType?: GLenum;
    elementOffset?: number;
    feedbackByteLengths?: number[];
}

export class HydTransformFeedbackExecutor {
    private readonly otherBuffers = new WeakMap<HydBuffer, NativeBufferMirror>();
    private readonly elementBuffers = new WeakMap<HydBuffer, NativeBufferMirror>();
    private readonly programs = new WeakMap<HydProgram, NativeProgramMirror>();
    private readonly feedback: WebGLTransformFeedback;

    constructor(private readonly gl: WebGL2RenderingContext) {
        this.feedback = gl.createTransformFeedback();
        if (!this.feedback) throw new Error("Unable to create native transform feedback object.");
    }

    private ensureBuffer(buffer: HydBuffer, element: boolean = false): NativeBufferMirror {
        const cache = element ? this.elementBuffers : this.otherBuffers;
        const target = element ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER;
        let mirror = cache.get(buffer);
        if (!mirror) {
            const nativeBuffer = this.gl.createBuffer();
            if (!nativeBuffer) throw new Error("Unable to create native transform feedback buffer.");
            mirror = { buffer: nativeBuffer, size: -1, version: -1 };
            cache.set(buffer, mirror);
        }
        if (mirror.version !== buffer.version || mirror.size !== buffer.webglSize) {
            this.gl.bindBuffer(target, mirror.buffer);
            this.gl.bufferData(target, buffer.shadowData, this.gl.DYNAMIC_COPY);
            mirror.version = buffer.version;
            mirror.size = buffer.webglSize;
        }
        return mirror;
    }

    private compileShader(type: GLenum, source: string): WebGLShader {
        const shader = this.gl.createShader(type);
        if (!shader) throw new Error("Unable to create native transform feedback shader.");
        this.gl.shaderSource(shader, bridgeGlslDunderIdentifiers(source));
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const log = this.gl.getShaderInfoLog(shader) || "unknown shader compilation error";
            this.gl.deleteShader(shader);
            throw new Error(log);
        }
        return shader;
    }

    private ensureProgram(program: HydProgram): WebGLProgram {
        const cached = this.programs.get(program);
        if (cached?.generation === program.linkGeneration) return cached.program;
        if (cached) this.gl.deleteProgram(cached.program);
        const vertexSource = program.attachedVertexShader?.glsl_shader;
        const hasFragmentShader = program.getAttachedShaders().some((shader) =>
            shader.type === WebGL2RenderingContext.FRAGMENT_SHADER);
        if (!vertexSource || !hasFragmentShader) throw new Error("Transform feedback program has no linked shader pair.");
        const vertex = this.compileShader(
            this.gl.VERTEX_SHADER,
            normalizeWebGl2BuiltinLimits(vertexSource),
        );
        // The executor always discards rasterization and only mirrors vertex-stage
        // transform-feedback writes. Shader versions still have to match at link
        // time, so use an ES 1.00 or ES 3.00 neutral fragment shader as needed.
        const fragmentSource = /#version\s+300\s+es\b/.test(vertexSource)
            ? `#version 300 es
precision mediump float;
out vec4 hydTransformFeedbackColor;
void main() { hydTransformFeedbackColor = vec4(0.0); }`
            : `#version 100
precision mediump float;
void main() { gl_FragColor = vec4(0.0); }`;
        const fragment = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSource);
        const nativeProgram = this.gl.createProgram();
        if (!nativeProgram) throw new Error("Unable to create native transform feedback program.");
        this.gl.attachShader(nativeProgram, vertex);
        this.gl.attachShader(nativeProgram, fragment);
        for (const attribute of program.hydAttributes) {
            this.gl.bindAttribLocation(nativeProgram, attribute.location, bridgeGlslDunderIdentifier(attribute.name));
        }
        this.gl.transformFeedbackVaryings(
            nativeProgram,
            program.transformFeedbackVaryingNames.map(bridgeGlslDunderIdentifier),
            program.transformFeedbackBufferMode || this.gl.INTERLEAVED_ATTRIBS,
        );
        this.gl.linkProgram(nativeProgram);
        this.gl.deleteShader(vertex);
        this.gl.deleteShader(fragment);
        if (!this.gl.getProgramParameter(nativeProgram, this.gl.LINK_STATUS)) {
            const log = this.gl.getProgramInfoLog(nativeProgram) || "unknown program link error";
            this.gl.deleteProgram(nativeProgram);
            throw new Error(log);
        }
        for (const block of program.hydUniformBlocks) {
            const blockIndex = this.gl.getUniformBlockIndex(nativeProgram, bridgeGlslDunderIdentifier(block.name));
            if (blockIndex !== this.gl.INVALID_INDEX) {
                this.gl.uniformBlockBinding(nativeProgram, blockIndex, block.binding);
            }
        }
        this.programs.set(program, { program: nativeProgram, generation: program.linkGeneration });
        return nativeProgram;
    }

    private uniformValues(uniform: ProgramUniformBuffer): Float32Array | Int32Array | Uint32Array {
        const matrix = uniformMatrixDimensions(uniform.webgl_type);
        if (matrix) {
            const values = new Float32Array(matrix.columns * matrix.rows * uniform.size);
            for (let element = 0; element < uniform.size; element++) {
                const sourceBase = uniform.wordOffset + element * (uniform.arrayStrideWords || matrix.columns * 4);
                const targetBase = element * matrix.columns * matrix.rows;
                for (let column = 0; column < matrix.columns; column++) {
                    for (let row = 0; row < matrix.rows; row++) {
                        values[targetBase + column * matrix.rows + row] = uniform.float32View[sourceBase + column * 4 + row];
                    }
                }
            }
            return values;
        }
        const components = uniform.elementByteLength / 4;
        const words = new (uniform.webgl_type === this.gl.UNSIGNED_INT ||
            (uniform.webgl_type >= this.gl.UNSIGNED_INT_VEC2 && uniform.webgl_type <= this.gl.UNSIGNED_INT_VEC4)
            ? Uint32Array
            : uniform.webgl_type === this.gl.INT || uniform.webgl_type === this.gl.BOOL ||
                (uniform.webgl_type >= this.gl.INT_VEC2 && uniform.webgl_type <= this.gl.BOOL_VEC4)
                ? Int32Array
                : Float32Array)(components * uniform.size);
        const source = words instanceof Float32Array ? uniform.float32View :
            words instanceof Uint32Array ? uniform.uint32View : uniform.int32View;
        for (let element = 0; element < uniform.size; element++) {
            const sourceBase = uniform.wordOffset + element * (uniform.arrayStrideWords || uniform.elementStride / 4);
            for (let component = 0; component < components; component++) {
                words[element * components + component] = source[sourceBase + component];
            }
        }
        return words;
    }

    private uploadUniforms(program: HydProgram, nativeProgram: WebGLProgram) {
        for (const uniform of program.hydUniforms) {
            if (uniform.internal) continue;
            const location = this.gl.getUniformLocation(
                nativeProgram,
                bridgeGlslDunderIdentifier(uniform.sourceName || uniform.name),
            );
            if (!location) continue;
            const values = this.uniformValues(uniform);
            const matrix = uniformMatrixDimensions(uniform.webgl_type);
            if (matrix) {
                const method = `uniformMatrix${matrix.columns}${matrix.columns === matrix.rows ? "" : `x${matrix.rows}`}fv`;
                (this.gl as any)[method](location, false, values);
                continue;
            }
            const components = uniform.elementByteLength / 4;
            const suffix = values instanceof Float32Array ? "fv" : values instanceof Uint32Array ? "uiv" : "iv";
            (this.gl as any)[`uniform${components}${suffix}`](location, values);
        }
        for (const sampler of program.hydSamplers) {
            const location = this.gl.getUniformLocation(
                nativeProgram,
                bridgeGlslDunderIdentifier(sampler.sourceName || sampler.name),
            );
            if (location) this.gl.uniform1i(location, sampler.textureUnit);
        }
    }

    private configureAttributes(
        vao: HydVertexArray,
        values: number[][],
        valueTypes: Array<"float" | "int" | "uint">,
    ) {
        for (let index = 0; index < vao.attributes.length; index++) {
            const attribute = vao.attributes[index];
            if (attribute.enabled && attribute.buffer) {
                const mirror = this.ensureBuffer(attribute.buffer);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mirror.buffer);
                if (attribute.int) {
                    this.gl.vertexAttribIPointer(
                        index,
                        attribute.size,
                        attribute.type,
                        attribute.webglStride,
                        attribute.offset,
                    );
                } else {
                    this.gl.vertexAttribPointer(
                        index,
                        attribute.size,
                        attribute.type,
                        attribute.normalized,
                        attribute.webglStride,
                        attribute.offset,
                    );
                }
                this.gl.enableVertexAttribArray(index);
                this.gl.vertexAttribDivisor(index, attribute.divisor);
            } else {
                this.gl.disableVertexAttribArray(index);
                const value = values[index] || [0, 0, 0, 1];
                if (valueTypes[index] === "int") this.gl.vertexAttribI4iv(index, new Int32Array(value));
                else if (valueTypes[index] === "uint") this.gl.vertexAttribI4uiv(index, new Uint32Array(value));
                else this.gl.vertexAttrib4fv(index, new Float32Array(value));
            }
        }
    }

    private bindUniformBuffers(program: HydProgram) {
        for (const block of program.hydUniformBlocks) {
            const indexed = block.bufferBinding;
            if (!indexed) continue;
            const mirror = this.ensureBuffer(indexed.buffer);
            if (indexed.wholeBuffer) {
                this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, block.binding, mirror.buffer);
            } else {
                this.gl.bindBufferRange(
                    this.gl.UNIFORM_BUFFER,
                    block.binding,
                    mirror.buffer,
                    indexed.offset,
                    indexed.size,
                );
            }
        }
    }

    private bindFeedbackBuffers(feedback: HydTransformFeedback): HydBuffer[] {
        const outputs: HydBuffer[] = [];
        for (let index = 0; index < feedback.bufferBindings.length; index++) {
            const indexed = feedback.bufferBindings[index];
            if (!indexed) {
                this.gl.bindBufferBase(this.gl.TRANSFORM_FEEDBACK_BUFFER, index, null);
                continue;
            }
            const mirror = this.ensureBuffer(indexed.buffer);
            const writeOffset = feedback.writeOffsets[index] || 0;
            if (indexed.wholeBuffer && writeOffset === 0) {
                this.gl.bindBufferBase(this.gl.TRANSFORM_FEEDBACK_BUFFER, index, mirror.buffer);
            } else {
                const availableSize = indexed.wholeBuffer
                    ? indexed.buffer.webglSize - indexed.offset
                    : indexed.size;
                this.gl.bindBufferRange(
                    this.gl.TRANSFORM_FEEDBACK_BUFFER,
                    index,
                    mirror.buffer,
                    indexed.offset + writeOffset,
                    availableSize - writeOffset,
                );
            }
            outputs.push(indexed.buffer);
        }
        return outputs;
    }

    private synchronizeOutputs(outputs: HydBuffer[]) {
        for (const output of new Set(outputs)) {
            const mirror = this.ensureBuffer(output);
            const bytes = new Uint8Array(output.webglSize);
            this.gl.bindBuffer(this.gl.COPY_READ_BUFFER, mirror.buffer);
            if (bytes.byteLength > 0) this.gl.getBufferSubData(this.gl.COPY_READ_BUFFER, 0, bytes);
            output.write(bytes);
            mirror.version = output.version;
            mirror.size = output.webglSize;
        }
    }

    execute(
        program: HydProgram,
        vao: HydVertexArray,
        currentValues: number[][],
        currentValueTypes: Array<"float" | "int" | "uint">,
        feedback: HydTransformFeedback,
        draw: TransformFeedbackDraw,
    ): GLenum {
        try {
            while (this.gl.getError() !== this.gl.NO_ERROR) { /* clear stale native errors */ }
            const nativeProgram = this.ensureProgram(program);
            this.gl.useProgram(nativeProgram);
            this.uploadUniforms(program, nativeProgram);
            this.configureAttributes(vao, currentValues, currentValueTypes);
            this.bindUniformBuffers(program);
            this.gl.bindTransformFeedback(this.gl.TRANSFORM_FEEDBACK, this.feedback);
            const outputs = this.bindFeedbackBuffers(feedback);
            // Vertex pointers and indexed UBO bindings retain their objects;
            // generic bindings must not alias a transform-feedback output.
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
            this.gl.bindBuffer(this.gl.COPY_READ_BUFFER, null);
            this.gl.bindBuffer(this.gl.COPY_WRITE_BUFFER, null);
            this.gl.bindBuffer(this.gl.PIXEL_PACK_BUFFER, null);
            this.gl.bindBuffer(this.gl.PIXEL_UNPACK_BUFFER, null);
            this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);
            if (!draw.elementBuffer) this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
            this.gl.enable(this.gl.RASTERIZER_DISCARD);
            this.gl.beginTransformFeedback(feedback.primitiveMode);
            if (draw.elementBuffer) {
                const element = this.ensureBuffer(draw.elementBuffer, true);
                this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, element.buffer);
                if (draw.instanceCount === 1) {
                    this.gl.drawElements(draw.mode, draw.count, draw.elementType!, draw.elementOffset || 0);
                } else {
                    this.gl.drawElementsInstanced(
                        draw.mode,
                        draw.count,
                        draw.elementType!,
                        draw.elementOffset || 0,
                        draw.instanceCount,
                    );
                }
            } else if (draw.instanceCount === 1) {
                this.gl.drawArrays(draw.mode, draw.first || 0, draw.count);
            } else {
                this.gl.drawArraysInstanced(draw.mode, draw.first || 0, draw.count, draw.instanceCount);
            }
            this.gl.endTransformFeedback();
            this.gl.disable(this.gl.RASTERIZER_DISCARD);
            const error = this.gl.getError();
            if (error !== this.gl.NO_ERROR) return error;
            for (let index = 0; index < feedback.bufferBindings.length; index++) {
                this.gl.bindBufferBase(this.gl.TRANSFORM_FEEDBACK_BUFFER, index, null);
            }
            this.gl.bindTransformFeedback(this.gl.TRANSFORM_FEEDBACK, null);
            this.synchronizeOutputs(outputs);
            for (let index = 0; index < feedback.writeOffsets.length; index++) {
                feedback.writeOffsets[index] += draw.feedbackByteLengths?.[index] || 0;
            }
            return this.gl.NO_ERROR;
        } catch (error) {
            console.error("[HYD] transform feedback execution failed:", error);
            try {
                if (this.gl.getParameter(this.gl.TRANSFORM_FEEDBACK_ACTIVE)) this.gl.endTransformFeedback();
                this.gl.disable(this.gl.RASTERIZER_DISCARD);
                this.gl.bindTransformFeedback(this.gl.TRANSFORM_FEEDBACK, null);
            } catch (_) {
                // Keep the public context alive even if the native compatibility path failed.
            }
            return this.gl.INVALID_OPERATION;
        }
    }
}
