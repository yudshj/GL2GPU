export interface TintWasmModule {
    spirvToWgsl(spirv: Uint32Array): string;
}

export interface TintWasmInitOptions {
    locateFile?: (path: string) => string;
    wasmBinary?: ArrayBuffer | Uint8Array;
}

export default function initTintWasm(options?: TintWasmInitOptions): Promise<TintWasmModule>;
