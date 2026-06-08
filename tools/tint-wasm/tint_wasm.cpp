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
#include "src/tint/lang/spirv/reader/reader.h"
#include "src/tint/lang/wgsl/common/allowed_features.h"
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
    tint::spirv::reader::Options reader_options;
    reader_options.allowed_features = tint::wgsl::AllowedFeatures::Everything();

    auto program = tint::spirv::reader::Read(input, reader_options);
    if (!program.IsValid()) {
        g_error = program.Diagnostics().Str();
        return nullptr;
    }

    auto result = tint::wgsl::writer::Generate(program, tint::wgsl::writer::Options{});
    if (result != tint::Success) {
        g_error = result.Failure().reason.Str();
        return nullptr;
    }

    g_wgsl = result->wgsl;
    return g_wgsl.c_str();
}

}
