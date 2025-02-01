const _GL2GPU_CONFIG = {
    cmbMode: "cmb",
    replayDelay: 5000,
    uniformBatchSize: 262144, // 256KB
};

if (sessionStorage.getItem('HYD_LOAD_KEY') === 'on') {
    const proxy = new Proxy(window.requestAnimationFrame, {
        apply: function (target, thisArg, argumentsList) {
            const func = argumentsList[0];
            const funcNew = function (time) {
                HYD.runFrameStartFunctions();
                func(time);
                HYD.runFrameEndFunctions();
            }
            target.apply(thisArg, [funcNew]);
        }
    });
    window.requestAnimationFrame = proxy;
    HYD.hydInstrument( _GL2GPU_CONFIG["cmbMode"], _GL2GPU_CONFIG["replayDelay"], _GL2GPU_CONFIG["uniformBatchSize"] );
}
