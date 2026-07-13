// GL2GPU Tint WASM bridge.
//
// This wrapper intentionally exposes a tiny C ABI: SPIR-V binary in,
// WGSL string out. JavaScript owns allocation and copies the returned
// string immediately.

#include <cstdint>
#include <cstring>
#include <string>
#include <vector>

#include "src/tint/api/tint.h"
#include "src/tint/lang/wgsl/allowed_features.h"
#include "src/tint/lang/wgsl/writer/writer.h"

static std::string g_wgsl;
static std::string g_error;
static bool g_initialized = false;

void EnsureTintInitialized() {
    if (!g_initialized) {
        tint::Initialize();
        g_initialized = true;
    }
}

extern "C" {

const char* HYD_LAST_ERROR() {
    return g_error.c_str();
}

const char* HYD_SPV_TO_WGSL(const uint32_t* spirv, size_t word_count) {
    g_error.clear();
    g_wgsl.clear();
    EnsureTintInitialized();

    if (spirv == nullptr || word_count == 0) {
        g_error = "empty SPIR-V input";
        return nullptr;
    }

    std::vector<uint32_t> input(spirv, spirv + word_count);
    tint::wgsl::writer::Options writer_options;
    writer_options.allowed_features = tint::wgsl::AllowedFeatures::Everything();
    writer_options.allow_non_uniform_derivatives = true;
    auto result = tint::SpirvToWgsl(input, writer_options);
    if (result != tint::Success) {
        g_error = result.Failure().reason;
        return nullptr;
    }

    g_wgsl = result.Get();
    return g_wgsl.c_str();
}

}
