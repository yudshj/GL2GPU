#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TINT_SRC="${TINT_SRC:-/Volumes/Code/dawn}"
BUILD_DIR="${TINT_BUILD_DIR:-${TINT_SRC}/out/gl2gpu_em}"
VENDOR_DIR="${ROOT_DIR}/src/vendor/tint-wasm"

if ! command -v gclient >/dev/null 2>&1; then
  echo "gclient is required. Install depot_tools and add it to PATH." >&2
  exit 1
fi
if ! command -v emcmake >/dev/null 2>&1 || ! command -v em++ >/dev/null 2>&1; then
  echo "Emscripten is required. Install/activate emsdk or run: brew install emscripten" >&2
  exit 1
fi
if ! command -v cmake >/dev/null 2>&1 || ! command -v ninja >/dev/null 2>&1; then
  echo "cmake and ninja are required." >&2
  exit 1
fi

cd "${TINT_SRC}"
if [ "${TINT_SYNC:-1}" != "0" ]; then
  if [ ! -f .gclient ] && [ -f standalone.gclient ]; then
    cp standalone.gclient .gclient
  fi
  gclient sync
fi

mkdir -p "${BUILD_DIR}"
cd "${BUILD_DIR}"
emcmake cmake "${ROOT_DIR}/tools/tint-wasm/cmake" -GNinja \
  -DDAWN_SOURCE_DIR="${TINT_SRC}" \
  -DDAWN_BUILD_SAMPLES=OFF \
  -DDAWN_BUILD_TESTS=OFF \
  -DDAWN_BUILD_NODE_BINDINGS=OFF \
  -DDAWN_ENABLE_NULL=OFF \
  -DDAWN_ENABLE_DESKTOP_GL=OFF \
  -DDAWN_ENABLE_OPENGLES=OFF \
  -DDAWN_ENABLE_VULKAN=OFF \
  -DDAWN_ENABLE_METAL=OFF \
  -DTINT_BUILD_SPV_READER=ON \
  -DTINT_BUILD_WGSL_WRITER=ON \
  -DTINT_BUILD_GLSL_WRITER=OFF \
  -DTINT_BUILD_HLSL_WRITER=OFF \
  -DTINT_BUILD_MSL_WRITER=OFF \
  -DTINT_BUILD_SPV_WRITER=OFF \
  -DTINT_BUILD_WGSL_READER=OFF \
  -DTINT_BUILD_CMD_TOOLS=OFF \
  -DTINT_BUILD_TESTS=OFF \
  -DTINT_BUILD_BENCHMARKS=OFF \
  -DTINT_BUILD_IR_BINARY=OFF \
  -DTINT_BUILD_DOCS=OFF \
  -DTINT_BUILD_AS_OTHER_OS=ON \
  -DTINT_BUILD_REMOTE_COMPILE=OFF \
  -DTINT_WERROR=OFF \
  -DTINT_ENABLE_IR_DUMPING=OFF \
  -DTINT_ENABLE_IR_VALIDATION_ASSERTS=OFF \
  -DDAWN_BUILD_PROTOBUF=OFF \
  -DCMAKE_CXX_FLAGS="-Wno-c2y-extensions -Wno-error=c2y-extensions -Wno-deprecated-pragma -Wno-error=deprecated-pragma -Wno-lifetime-safety -Wno-lifetime-safety-intra-tu-suggestions -Wno-lifetime-safety-cross-tu-suggestions -Wno-switch-default -Wno-nrvo" \
  -DCMAKE_BUILD_TYPE=Release
ninja tint_api tint_lang_spirv_reader tint_lang_wgsl_writer

TMP_OBJS="$(mktemp -d)"
trap 'rm -rf "${TMP_OBJS}"' EXIT
find . -name '*.o' | grep -Ev '(_test|mock)' | while read -r obj; do
  cp "${obj}" "${TMP_OBJS}/$(echo "${obj}" | sed 's#[/.]#_#g').o"
done
emar rcs "${TMP_OBJS}/libtint.a" "${TMP_OBJS}"/*.o

mkdir -p "${VENDOR_DIR}"
em++ "${ROOT_DIR}/tools/tint-wasm/tint_wasm.cpp" \
  -I"${TINT_SRC}" \
  -Wl,--whole-archive "${TMP_OBJS}/libtint.a" -Wl,--no-whole-archive \
  -std=c++20 \
  -O3 \
  -sMODULARIZE=1 \
  -sEXPORT_ES6=1 \
  -sENVIRONMENT=web \
  -sALLOW_MEMORY_GROWTH=1 \
  -sINITIAL_MEMORY=67108864 \
  -sSTACK_SIZE=5242880 \
  -sEXPORTED_FUNCTIONS='["_HYD_SPV_TO_WGSL","_HYD_LAST_ERROR","_malloc","_free"]' \
  -sEXPORTED_RUNTIME_METHODS='["UTF8ToString","HEAPU32"]' \
  -o "${VENDOR_DIR}/tint_wasm_raw.js"

python3 "${ROOT_DIR}/tools/tint-wasm/wrap_emscripten.py" \
  "${VENDOR_DIR}/tint_wasm_raw.js" \
  "${ROOT_DIR}/tools/tint-wasm/tint_wasm_shell.js" \
  "${VENDOR_DIR}/tint_wasm.js"
mv "${VENDOR_DIR}/tint_wasm_raw.wasm" "${VENDOR_DIR}/tint_wasm.wasm"
rm "${VENDOR_DIR}/tint_wasm_raw.js"
