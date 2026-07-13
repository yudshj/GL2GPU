cmake_minimum_required(VERSION 3.22)

project(GL2GPUTintWasmDependencies LANGUAGES C CXX)

if(NOT DEFINED DAWN_SOURCE_DIR)
  message(FATAL_ERROR "DAWN_SOURCE_DIR must point to a synchronized Dawn checkout")
endif()

# Dawn's Emscripten configuration intentionally skips SPIRV-Tools because its
# supported Emscripten product is Dawn itself. GL2GPU builds only Tint's SPIR-V
# reader, so provide the official dependency targets before adding Dawn.
set(SPIRV_HEADERS_SKIP_EXAMPLES ON CACHE BOOL "" FORCE)
set(SPIRV_HEADERS_SKIP_INSTALL ON CACHE BOOL "" FORCE)
add_subdirectory(
  "${DAWN_SOURCE_DIR}/third_party/spirv-headers/src"
  "${CMAKE_CURRENT_BINARY_DIR}/spirv-headers"
  EXCLUDE_FROM_ALL
)

set(SPIRV_SKIP_TESTS ON CACHE BOOL "" FORCE)
set(SPIRV_SKIP_EXECUTABLES ON CACHE BOOL "" FORCE)
set(SKIP_SPIRV_TOOLS_INSTALL ON CACHE BOOL "" FORCE)
set(SPIRV_WERROR OFF CACHE BOOL "" FORCE)
add_subdirectory(
  "${DAWN_SOURCE_DIR}/third_party/spirv-tools/src"
  "${CMAKE_CURRENT_BINARY_DIR}/spirv-tools"
  EXCLUDE_FROM_ALL
)

add_subdirectory("${DAWN_SOURCE_DIR}" "${CMAKE_CURRENT_BINARY_DIR}/dawn")
