# GL2GPU Tint WASM bridge

This directory builds the SPIR-V to WGSL backend used by runtime shader translation.

## Prerequisites

- `gclient` from depot_tools on `PATH`
- Emscripten (`em++`, `emcmake`)
- CMake and Ninja
- A Dawn checkout at `/Volumes/Code/dawn` or `TINT_SRC=/path/to/dawn`

## Build

```sh
TINT_SRC=/Volumes/Code/dawn ./tools/tint-wasm/build.sh
```

The script runs `gclient sync`, builds Dawn's current Tint SPIR-V reader and
WGSL writer with Emscripten, and writes:

- `src/vendor/tint-wasm/tint_wasm.js`
- `src/vendor/tint-wasm/tint_wasm.wasm`

The checked-in `src/vendor/tint-wasm/tint_wasm.js` is replaced by this generated wrapper.

Set `TINT_SYNC=0` when building from an already synchronized, pinned checkout.
The GL2GPU CMake driver supplies Dawn's official SPIRV-Tools targets because
Dawn's own Emscripten product configuration intentionally omits them.
