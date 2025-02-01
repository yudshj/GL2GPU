import {HydBuffer} from "./components/hydBuffer";
import { HydShader } from "./components/hydShader";
import { HydHashable } from "./components/base/hydHashable";
// import { HydGlobalStateHashed as gs0 } from "./components/hydGlobalState";
// import { HydGlobalState as gs1 } from "./components/hydGlobalState";
// import { HydGlobalState as gs2 } from "./components/hydGlobalStateNoC";
// import { HydGlobalState as gs3 } from "./components/hydGlobalStateNoC2";
// import { HydGlobalState as gs4 } from "./components/hydGlobalStateNoCB";
// import { FramebufferAttributes } from "./components/hydFramebuffer";
// import { HydTexture } from "./components/hydTexture";

// export type TTurboMode = 'none' | 'record-in-next-frame' | 'record' | 'replay';

// export class HydWebGLWrapperBase {
//     _lastCanvasSize: [number, number] = [-1, -1];
//     globalState: gs0 | gs1 | gs2 | gs3 | gs4;
//     maxUniformSize: number;
//     canvas: HTMLCanvasElement;
//     gpuctx: GPUCanvasContext;
//     glctx: WebGLRenderingContext | WebGL2RenderingContext;
//     device: GPUDevice;
//     uniformArray: Uint8Array;
//     uniformBuffer: GPUBuffer;
//     uniformOffset: number = 0;
//     wrapper: any;
//     _canvasView: GPUTextureView = null;
//     turboMode: TTurboMode = 'none';
//     turboBundles: [GPURenderPassDescriptor, GPURenderBundleEncoderDescriptor, GPURenderBundle][] = null;

//     /**
//      * Creates an instance of HydWebGLWrapperBase.
//      * @date 2024/3/10 - 14:57:15
//      *
//      * @constructor
//      * @param {HTMLCanvasElement} canvas - canvas element
//      * @param {GPUCanvasContext} gpuctx - webgpu context
//      * @param {(WebGLRenderingContext | WebGL2RenderingContext)} glctx - webgl context
//      * @param {GPUDevice} device - webgpu device
//      * @param {number} maxUniformSize - max uniform size
//      * @param {number} replay - replay time in ms, -1 for no replay
//      */
//     constructor(canvas: HTMLCanvasElement, gpuctx: GPUCanvasContext, glctx: WebGLRenderingContext | WebGL2RenderingContext, device: GPUDevice, maxUniformSize: number, replay: number) {
//         this.maxUniformSize = maxUniformSize;
//         this.canvas = canvas;
//         this.gpuctx = gpuctx;
//         this.glctx = glctx;
//         this.device = device;
//         this.uniformArray = new Uint8Array(this.maxUniformSize);
//         this.uniformBuffer = this.device.createBuffer({
//             label: 'GU',
//             size: this.maxUniformSize + 65536,
//             usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
//         });
//         this._canvasView = this.gpuctx.getCurrentTexture().createView({ label: 'initial canvasView' });
//         if (replay >= 0) {
//             this.increaseOk();
//             setTimeout(() => {
//                 this.enableTurboMode();
//             }, replay);
//         }
//         this.canvas.onresize = () => {
//             this.updateCanvasSize();
//         };
//     }

//     increaseOk() {
//         // // @ts-ignore
//         // if (hydOk !== undefined) { console.log("Replay waited. increase hydOk:", hydOk); hydOk++; }
//     }

//     decreaseOk() {
//         // // @ts-ignore
//         // if (hydOk !== undefined) { console.log("Replay enabled. decrease hydOk:", hydOk); hydOk--; }
//     }

//     enableTurboMode() {
//         console.log("Turbo mode enabled");
//         this.turboMode = 'record-in-next-frame';
//         this.turboBundles = [];
//     }

//     // virtual function _frameStart
//     _frameStart() {
//         throw new Error("Method not implemented.");
//     }

//     // virtual function _frameEnd
//     _frameEnd() {
//         throw new Error("Method not implemented.");
//     }

//     public get wrapperContext() {
//         return this.wrapper;
//     }

//     regenerateDS(label: string, format: GPUTextureFormat, compareFunc: GPUCompareFunction, bindPoint: GLenum, width: number, height: number) {
//         const texture = new HydTexture(this.device);
//         texture.label = label;
//         texture.state.compare = compareFunc;
//         texture.renderbufferStorage(format, width, height);
//         texture.viewDimension = '2d';
//         this.globalState.defaultFramebuffer.attachments.set(bindPoint, new FramebufferAttributes(bindPoint, undefined, undefined, texture));
//         this.globalState.defaultFramebuffer.resetHash();
//     }

//     updateCanvasSize() {
//         const width: number = this.canvas.width;
//         const height: number = this.canvas.height;
//         if (this._lastCanvasSize[0] === width && this._lastCanvasSize[1] === height) {
//             return;     // skip
//         }

//         // console.log("canvas resized, last:", this._lastCanvasSize, "new:", [width, height]);
//         this.globalState.miscState.scissorBox = [0, 0, width, height];
//         this.globalState.commonState.viewport = [0, 0, width, height, 0, 1];

//         try {
//             this.globalState.defaultFramebuffer.attachments.get(WebGL2RenderingContext.DEPTH_ATTACHMENT).attachment.destroy();
//             this.globalState.defaultFramebuffer.attachments.get(WebGL2RenderingContext.STENCIL_ATTACHMENT).attachment.destroy();
//             this.globalState.defaultFramebuffer.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT).attachment.destroy();
//         } catch (error) {
//         }

//         this._lastCanvasSize = [width, height];
//         this.regenerateDS(`defaultDepthBuffer ${width} ${height}`, 'depth32float', this.globalState.depthState.func, WebGL2RenderingContext.DEPTH_ATTACHMENT, width, height);
//         this.regenerateDS(`defaultStencilBuffer ${width} ${height}`, 'stencil8', this.globalState.stencilState.frontFunc, WebGL2RenderingContext.STENCIL_ATTACHMENT, width, height);
//         this.regenerateDS(`defaultDepthStencilBuffer ${width} ${height}`, 'depth24plus-stencil8', this.globalState.depthState.func, WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT, width, height);
//     }
// }

export class HydVertexArrayAttribute implements HydHashable{
    private __hash__ = '';
    private __layoutHash__ = '';
    public enabled: boolean = false;
    public size: number;
    public type: GLenum;
    public int: boolean;
    public normalized: boolean = false;
    public stride: number = 0;
    public offset: number = 0;
    public divisor: number = 0;
    public buffer: HydBuffer;
    // public GPUAttribute: GPUVertexAttribute;
    public shaderLocation: number;
    public format: GPUVertexFormat;

    public updateHash() {
        const bufferHash = this.buffer ? this.buffer.hash : '-_-';
        const tmp = `${this.size}_${this.type}_${this.int}_${this.normalized}_${this.stride}_${this.offset}_${this.divisor}`;
        this.__layoutHash__ = this.enabled ? tmp : './.';
        this.__hash__ = `${this.__layoutHash__}@${bufferHash}`;
    }

    public get hash() {
        return this.__hash__;
    }

    public get layoutHash() {
        return this.__layoutHash__;
    }
}
export interface HydActiveUniformInfo {
    name: string;
    size: number;
    type: GLenum;
}

// // 让instanceof能够正常工作
// WebGL2RenderingContext.constructor[Symbol.hasInstance] = (instance: any) => {
//     return (instance instanceof HydWebGLWrapper) || (instance instanceof WebGL2RenderingContext);
// }
// WebGLRenderingContext.constructor[Symbol.hasInstance] = (instance: any) => {
//     return (instance instanceof HydWebGLWrapper) || (instance instanceof WebGLRenderingContext);
// }


// // 让instanceof能够正常工作
const OriginWebGLShader = WebGLShader;
WebGLShader = new Proxy(OriginWebGLShader, {
    get: function (target, p, receiver) {
        if (p === Symbol.hasInstance) {
            return (instance: any) => {
                return (instance instanceof HydShader) || (instance instanceof OriginWebGLShader);
            }
        } else {
            return target[p];
        }
    }
}) as any;
