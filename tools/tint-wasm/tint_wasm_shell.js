export default (() => {
  const initialize = (opts = {}) => {
    return new Promise((resolve, reject) => {
      const ModuleFactory = globalThis.createHydTintWasmModule;
      if (!ModuleFactory) {
        reject(new Error("createHydTintWasmModule is missing from generated Tint WASM wrapper"));
        return;
      }

      const moduleConfig = {
        wasmBinary: opts.wasmBinary,
        locateFile(path) {
          if (opts.locateFile) {
            return opts.locateFile(path);
          }
          const i = import.meta.url.lastIndexOf("/");
          return import.meta.url.substring(0, i) + "/" + path;
        },
        printErr(text) {
          console.error(text);
        },
      };

      ModuleFactory(moduleConfig)
        .then((module) => {
          resolve({
            spirvToWgsl(spirv) {
              const bytes = spirv.length * 4;
              const ptr = module._malloc(bytes);
              module.HEAPU32.set(spirv, ptr >> 2);
              const out = module._HYD_SPV_TO_WGSL(ptr, spirv.length);
              module._free(ptr);
              if (!out) {
                const errPtr = module._HYD_LAST_ERROR();
                const reason = errPtr ? module.UTF8ToString(errPtr) : "unknown Tint failure";
                throw new Error(reason);
              }
              return module.UTF8ToString(out);
            },
          });
        })
        .catch(reject);
    });
  };

  let instance;
  return (opts = {}) => {
    if (!instance) {
      instance = initialize(opts);
    }
    return instance;
  };
})();
