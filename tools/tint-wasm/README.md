# GL2GPU Tint WASM bridge

This directory builds the SPIR-V to WGSL backend used by runtime shader translation.

## Prerequisites

- `gclient` from depot_tools on `PATH`
- Emscripten (`em++`, `emcmake`)
- CMake and Ninja
- A Tint checkout at `/Users/hanyd/Code/tint` or `TINT_SRC=/path/to/tint`

## Build

```sh
TINT_SRC=/Users/hanyd/Code/tint ./tools/tint-wasm/build.sh
```

The script runs `gclient sync`, builds Tint with Emscripten, and writes:

- `src/vendor/tint-wasm/tint_wasm.js`
- `src/vendor/tint-wasm/tint_wasm.wasm`

The checked-in `src/vendor/tint-wasm/tint_wasm.js` is replaced by this generated wrapper.
