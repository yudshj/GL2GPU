import TypedArray = NodeJS.TypedArray;
import { HydWebGLWrapperBase } from "./types";

const isTypedArray = (value) => (
    ArrayBuffer.isView(value) && !(value instanceof DataView)
);

// export function ArrayLikeToArrayBuffer(arr: TypedArray | ArrayBuffer | Array<any>, dtype: string) {
//     if (arr instanceof ArrayBuffer) {
//         return arr;
//     } else if (arr instanceof Array) {
//         if (dtype === "i") {
//             return new Int32Array(arr).buffer;
//         } else {
//             return new Float32Array(arr).buffer;
//         }
//     } else if (isTypedArray(arr)) {
//         return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength);
//     }
// }

function makePropertyWrapper(wrapper, original, propertyName) {
    //log("wrap prop: " + propertyName);
    wrapper.__defineGetter__(propertyName, function () {
        return original[propertyName];
    });
    // TODO(gman): this needs to handle properties that take more than one value?
    wrapper.__defineSetter__(propertyName, function (value) {
        //log("set: " + propertyName);
        original[propertyName] = value;
    });
}

function makeFunctionWrapper(helper, name, handler) {
    if (handler) {
        return function (...args) {
            return handler.call(helper, name, args);
        };
    } else {
        console.debug("missing handler for: " + name);
    }
}

export function makeWrapper(helper: HydWebGLWrapperBase) {
    const wrapper = {};
    for (const propertyName in helper.glctx) {
        if (propertyName === 'canvas' || propertyName === 'drawingBufferWidth' || propertyName === 'drawingBufferHeight' || propertyName === 'drawingBufferColorSpace' || propertyName === '_frameEnd' || propertyName === '_frameStart') {
            continue;
        }
        if (typeof helper.glctx[propertyName] === 'function') {
            const handler = helper.constructor.prototype["handle_" + propertyName];
            wrapper[propertyName] = makeFunctionWrapper(helper, propertyName, handler);
        } else {
            if (typeof helper.glctx[propertyName] === 'number') {
                wrapper[propertyName] = helper.glctx[propertyName];
            } else {
                makePropertyWrapper(wrapper, helper.glctx, propertyName);
            }
        }
    }
    wrapper['canvas'] = helper.canvas;
    wrapper['drawingBufferWidth'] = helper.canvas.width;
    wrapper['drawingBufferHeight'] = helper.canvas.height;
    wrapper['drawingBufferColorSpace'] = 'srgb';
    wrapper['_frameEnd'] = helper._frameEnd.bind(helper);
    wrapper['_frameStart'] = helper._frameStart.bind(helper);
    Object.setPrototypeOf(wrapper, helper.glctx.constructor.prototype);
    return wrapper;
}