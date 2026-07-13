import type { HydIndexedBufferBinding } from "./hydProgram";
import type { HydProgram } from "./hydProgram";

export function transformFeedbackOutputVertexCount(mode: GLenum, count: number): number {
    if (mode === WebGL2RenderingContext.POINTS) return count;
    if (mode === WebGL2RenderingContext.LINES) return count - count % 2;
    if (mode === WebGL2RenderingContext.LINE_STRIP) return Math.max(0, count - 1) * 2;
    if (mode === WebGL2RenderingContext.LINE_LOOP) return count > 1 ? count * 2 : 0;
    if (mode === WebGL2RenderingContext.TRIANGLES) return count - count % 3;
    if (mode === WebGL2RenderingContext.TRIANGLE_STRIP ||
        mode === WebGL2RenderingContext.TRIANGLE_FAN) {
        return Math.max(0, count - 2) * 3;
    }
    return 0;
}

export class HydTransformFeedback {
    public readonly ownerToken: object;
    public deleted: boolean = false;
    public initialized: boolean = false;
    public active: boolean = false;
    public paused: boolean = false;
    public primitiveMode: GLenum = 0;
    public activeProgram: HydProgram | null = null;
    public readonly bufferBindings: Array<HydIndexedBufferBinding | null> =
        Array.from({ length: 4 }, () => null);
    public readonly writeOffsets: number[] = Array.from({ length: 4 }, () => 0);

    constructor(ownerToken?: object) {
        this.ownerToken = ownerToken;
    }
}
