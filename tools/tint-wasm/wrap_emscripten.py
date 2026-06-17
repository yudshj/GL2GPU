#!/usr/bin/env python3
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 4:
        print("usage: wrap_emscripten.py <raw-js> <shell-js> <out-js>", file=sys.stderr)
        return 2

    raw = Path(sys.argv[1]).read_text()
    shell = Path(sys.argv[2]).read_text()
    raw = raw.replace("export default", "globalThis.createHydTintWasmModule =")
    raw = raw.replace("tint_wasm_raw.wasm", "tint_wasm.wasm")
    raw = raw.replace(
        'new URL("tint_wasm.wasm",import.meta.url).href',
        'scriptDirectory+"tint_wasm.wasm"',
    )
    Path(sys.argv[3]).write_text(raw + "\n\n" + shell)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
