(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("GL2GPU", [], factory);
	else if(typeof exports === 'object')
		exports["GL2GPU"] = factory();
	else
		root["GL2GPU"] = factory();
})(self, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 197
(__unused_webpack_module, exports) {

var __webpack_unused_export__;

__webpack_unused_export__ = ({ value: true });
__webpack_unused_export__ = void 0;
// Adding options parameter to allow to change the behavior of the function (should be compatible with the first version of the function)
/**
 * Generate a hash from a string, simple and fast.
 * reference: https://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
 * @version 2.1.0
 * @param {string} str Input string
 * @param {Object} options Options
 * @param {boolean} options.forcePositive If true, the hash will be forcePositive.
 * @param {boolean} options.caseSensitive Case sensitive
 * @param {boolean} options.seed Seed for the hash
 */
function fastHashCode(str, options = {}) {
    const { forcePositive = false, caseSensitive = true, seed = 0 } = options;
    if (!caseSensitive) {
        str = str.toLowerCase();
    }
    let hash = seed;
    let i;
    for (i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    if (forcePositive) {
        hash = hash & 0x7fffffff;
    }
    return hash;
}
__webpack_unused_export__ = fastHashCode;
exports.Ay = fastHashCode;


/***/ },

/***/ 464
(module, __webpack_exports__, __webpack_require__) {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   A: () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* module decorator */ module = __webpack_require__.hmd(module);

var Module = (function() {
  var _scriptDir = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : undefined;
  
  return (
function(Module) {
  Module = Module || {};

var c;c||(c=typeof Module !== 'undefined' ? Module : {});
c.compileGLSLZeroCopy=function(a,b,d,e){d=!!d;switch(b){case "vertex":var g=0;break;case "fragment":g=4;break;case "compute":g=5;break;default:throw Error("shader_stage must be 'vertex', 'fragment', or 'compute'.");}switch(e||"1.0"){case "1.0":var f=65536;break;case "1.1":f=65792;break;case "1.2":f=66048;break;case "1.3":f=66304;break;case "1.4":f=66560;break;case "1.5":f=66816;break;default:throw Error("spirv_version must be '1.0' ~ '1.5'.");}e=c._malloc(4);b=c._malloc(4);var h=aa([a,g,d,f,e,b]);
d=k(e);a=k(b);c._free(e);c._free(b);if(0===h)throw Error("GLSL compilation failed");e={};d/=4;e.data=c.HEAPU32.subarray(d,d+a);e.free=function(){c._destroy_output_buffer(h)};return e};c.compileGLSL=function(a,b,d,e){a=c.compileGLSLZeroCopy(a,b,d,e);b=a.data.slice();a.free();return b};var p={},q;for(q in c)c.hasOwnProperty(q)&&(p[q]=c[q]);var r="./this.program",t=!1,u=!1;t="object"===typeof window;u="function"===typeof importScripts;var v="",w;
if(t||u)u?v=self.location.href:document.currentScript&&(v=document.currentScript.src),_scriptDir&&(v=_scriptDir),0!==v.indexOf("blob:")?v=v.substr(0,v.lastIndexOf("/")+1):v="",u&&(w=function(a){var b=new XMLHttpRequest;b.open("GET",a,!1);b.responseType="arraybuffer";b.send(null);return new Uint8Array(b.response)});var x=c.print||console.log.bind(console),y=c.printErr||console.warn.bind(console);for(q in p)p.hasOwnProperty(q)&&(c[q]=p[q]);p=null;c.thisProgram&&(r=c.thisProgram);var A;
c.wasmBinary&&(A=c.wasmBinary);"object"!==typeof WebAssembly&&y("no native wasm support detected");function k(a){var b="i32";"*"===b.charAt(b.length-1)&&(b="i32");switch(b){case "i1":return B[a>>0];case "i8":return B[a>>0];case "i16":return ba[a>>1];case "i32":return C[a>>2];case "i64":return C[a>>2];case "float":return ca[a>>2];case "double":return da[a>>3];default:D("invalid type for getValue: "+b)}return null}var E,ea=new WebAssembly.Table({initial:755,maximum:755,element:"anyfunc"}),fa=!1;
function ha(){var a=c._convert_glsl_to_spirv;a||D("Assertion failed: Cannot call unknown function convert_glsl_to_spirv, make sure it is exported");return a}
function aa(a){var b="string number boolean number number number".split(" "),d={string:function(a){var b=0;if(null!==a&&void 0!==a&&0!==a){var d=(a.length<<2)+1;b=G(d);ia(a,H,b,d)}return b},array:function(a){var b=G(a.length);B.set(a,b);return b}},e=ha(),g=[],f=0;if(a)for(var h=0;h<a.length;h++){var n=d[b[h]];n?(0===f&&(f=ja()),g[h]=n(a[h])):g[h]=a[h]}a=e.apply(null,g);0!==f&&ka(f);return a}var la="undefined"!==typeof TextDecoder?new TextDecoder("utf8"):void 0;
function I(a,b,d){var e=b+d;for(d=b;a[d]&&!(d>=e);)++d;if(16<d-b&&a.subarray&&la)return la.decode(a.subarray(b,d));for(e="";b<d;){var g=a[b++];if(g&128){var f=a[b++]&63;if(192==(g&224))e+=String.fromCharCode((g&31)<<6|f);else{var h=a[b++]&63;g=224==(g&240)?(g&15)<<12|f<<6|h:(g&7)<<18|f<<12|h<<6|a[b++]&63;65536>g?e+=String.fromCharCode(g):(g-=65536,e+=String.fromCharCode(55296|g>>10,56320|g&1023))}}else e+=String.fromCharCode(g)}return e}
function ia(a,b,d,e){if(0<e){e=d+e-1;for(var g=0;g<a.length;++g){var f=a.charCodeAt(g);if(55296<=f&&57343>=f){var h=a.charCodeAt(++g);f=65536+((f&1023)<<10)|h&1023}if(127>=f){if(d>=e)break;b[d++]=f}else{if(2047>=f){if(d+1>=e)break;b[d++]=192|f>>6}else{if(65535>=f){if(d+2>=e)break;b[d++]=224|f>>12}else{if(d+3>=e)break;b[d++]=240|f>>18;b[d++]=128|f>>12&63}b[d++]=128|f>>6&63}b[d++]=128|f&63}}b[d]=0}}"undefined"!==typeof TextDecoder&&new TextDecoder("utf-16le");var J,B,H,ba,C,ca,da;
function ma(a){J=a;c.HEAP8=B=new Int8Array(a);c.HEAP16=ba=new Int16Array(a);c.HEAP32=C=new Int32Array(a);c.HEAPU8=H=new Uint8Array(a);c.HEAPU16=new Uint16Array(a);c.HEAPU32=new Uint32Array(a);c.HEAPF32=ca=new Float32Array(a);c.HEAPF64=da=new Float64Array(a)}var na=c.TOTAL_MEMORY||16777216;c.wasmMemory?E=c.wasmMemory:E=new WebAssembly.Memory({initial:na/65536});E&&(J=E.buffer);na=J.byteLength;ma(J);C[27096]=5351424;
function K(a){for(;0<a.length;){var b=a.shift();if("function"==typeof b)b();else{var d=b.J;"number"===typeof d?void 0===b.H?c.dynCall_v(d):c.dynCall_vi(d,b.H):d(void 0===b.H?null:b.H)}}}var oa=[],pa=[],qa=[],ra=[];function sa(){var a=c.preRun.shift();oa.unshift(a)}var L=0,M=null,N=null;c.preloadedImages={};c.preloadedAudios={};function D(a){if(c.onAbort)c.onAbort(a);x(a);y(a);fa=!0;throw new WebAssembly.RuntimeError("abort("+a+"). Build with -s ASSERTIONS=1 for more info.");}
function ta(){var a=O;return String.prototype.startsWith?a.startsWith("data:application/octet-stream;base64,"):0===a.indexOf("data:application/octet-stream;base64,")}var O="glslang.wasm";if(!ta()){var ua=O;O=c.locateFile?c.locateFile(ua,v):v+ua}function wa(){try{if(A)return new Uint8Array(A);if(w)return w(O);throw"both async and sync fetching of the wasm failed";}catch(a){D(a)}}
function xa(){return A||!t&&!u||"function"!==typeof fetch?new Promise(function(a){a(wa())}):fetch(O,{credentials:"same-origin"}).then(function(a){if(!a.ok)throw"failed to load wasm binary file at '"+O+"'";return a.arrayBuffer()}).catch(function(){return wa()})}pa.push({J:function(){ya()}});var za=[null,[],[]],P=0;function Aa(){P+=4;return C[P-4>>2]}var Q={},Ba={};
function Ca(){if(!R){var a={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:("object"===typeof navigator&&navigator.languages&&navigator.languages[0]||"C").replace("-","_")+".UTF-8",_:r},b;for(b in Ba)a[b]=Ba[b];var d=[];for(b in a)d.push(b+"="+a[b]);R=d}return R}var R;function S(a){return 0===a%4&&(0!==a%100||0===a%400)}function T(a,b){for(var d=0,e=0;e<=b;d+=a[e++]);return d}var U=[31,29,31,30,31,30,31,31,30,31,30,31],W=[31,28,31,30,31,30,31,31,30,31,30,31];
function X(a,b){for(a=new Date(a.getTime());0<b;){var d=a.getMonth(),e=(S(a.getFullYear())?U:W)[d];if(b>e-a.getDate())b-=e-a.getDate()+1,a.setDate(1),11>d?a.setMonth(d+1):(a.setMonth(0),a.setFullYear(a.getFullYear()+1));else{a.setDate(a.getDate()+b);break}}return a}
function Da(a,b,d,e){function g(a,b,d){for(a="number"===typeof a?a.toString():a||"";a.length<b;)a=d[0]+a;return a}function f(a,b){return g(a,b,"0")}function h(a,b){function V(a){return 0>a?-1:0<a?1:0}var d;0===(d=V(a.getFullYear()-b.getFullYear()))&&0===(d=V(a.getMonth()-b.getMonth()))&&(d=V(a.getDate()-b.getDate()));return d}function n(a){switch(a.getDay()){case 0:return new Date(a.getFullYear()-1,11,29);case 1:return a;case 2:return new Date(a.getFullYear(),0,3);case 3:return new Date(a.getFullYear(),
0,2);case 4:return new Date(a.getFullYear(),0,1);case 5:return new Date(a.getFullYear()-1,11,31);case 6:return new Date(a.getFullYear()-1,11,30)}}function z(a){a=X(new Date(a.A+1900,0,1),a.G);var b=n(new Date(a.getFullYear()+1,0,4));return 0>=h(n(new Date(a.getFullYear(),0,4)),a)?0>=h(b,a)?a.getFullYear()+1:a.getFullYear():a.getFullYear()-1}var m=C[e+40>>2];e={N:C[e>>2],M:C[e+4>>2],D:C[e+8>>2],C:C[e+12>>2],B:C[e+16>>2],A:C[e+20>>2],F:C[e+24>>2],G:C[e+28>>2],X:C[e+32>>2],L:C[e+36>>2],O:m?m?I(H,m,void 0):
"":""};d=d?I(H,d,void 0):"";m={"%c":"%a %b %d %H:%M:%S %Y","%D":"%m/%d/%y","%F":"%Y-%m-%d","%h":"%b","%r":"%I:%M:%S %p","%R":"%H:%M","%T":"%H:%M:%S","%x":"%m/%d/%y","%X":"%H:%M:%S","%Ec":"%c","%EC":"%C","%Ex":"%m/%d/%y","%EX":"%H:%M:%S","%Ey":"%y","%EY":"%Y","%Od":"%d","%Oe":"%e","%OH":"%H","%OI":"%I","%Om":"%m","%OM":"%M","%OS":"%S","%Ou":"%u","%OU":"%U","%OV":"%V","%Ow":"%w","%OW":"%W","%Oy":"%y"};for(var l in m)d=d.replace(new RegExp(l,"g"),m[l]);var F="Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(" "),
va="January February March April May June July August September October November December".split(" ");m={"%a":function(a){return F[a.F].substring(0,3)},"%A":function(a){return F[a.F]},"%b":function(a){return va[a.B].substring(0,3)},"%B":function(a){return va[a.B]},"%C":function(a){return f((a.A+1900)/100|0,2)},"%d":function(a){return f(a.C,2)},"%e":function(a){return g(a.C,2," ")},"%g":function(a){return z(a).toString().substring(2)},"%G":function(a){return z(a)},"%H":function(a){return f(a.D,2)},
"%I":function(a){a=a.D;0==a?a=12:12<a&&(a-=12);return f(a,2)},"%j":function(a){return f(a.C+T(S(a.A+1900)?U:W,a.B-1),3)},"%m":function(a){return f(a.B+1,2)},"%M":function(a){return f(a.M,2)},"%n":function(){return"\n"},"%p":function(a){return 0<=a.D&&12>a.D?"AM":"PM"},"%S":function(a){return f(a.N,2)},"%t":function(){return"\t"},"%u":function(a){return a.F||7},"%U":function(a){var b=new Date(a.A+1900,0,1),d=0===b.getDay()?b:X(b,7-b.getDay());a=new Date(a.A+1900,a.B,a.C);return 0>h(d,a)?f(Math.ceil((31-
d.getDate()+(T(S(a.getFullYear())?U:W,a.getMonth()-1)-31)+a.getDate())/7),2):0===h(d,b)?"01":"00"},"%V":function(a){var b=n(new Date(a.A+1900,0,4)),d=n(new Date(a.A+1901,0,4)),e=X(new Date(a.A+1900,0,1),a.G);return 0>h(e,b)?"53":0>=h(d,e)?"01":f(Math.ceil((b.getFullYear()<a.A+1900?a.G+32-b.getDate():a.G+1-b.getDate())/7),2)},"%w":function(a){return a.F},"%W":function(a){var b=new Date(a.A,0,1),d=1===b.getDay()?b:X(b,0===b.getDay()?1:7-b.getDay()+1);a=new Date(a.A+1900,a.B,a.C);return 0>h(d,a)?f(Math.ceil((31-
d.getDate()+(T(S(a.getFullYear())?U:W,a.getMonth()-1)-31)+a.getDate())/7),2):0===h(d,b)?"01":"00"},"%y":function(a){return(a.A+1900).toString().substring(2)},"%Y":function(a){return a.A+1900},"%z":function(a){a=a.L;var b=0<=a;a=Math.abs(a)/60;return(b?"+":"-")+String("0000"+(a/60*100+a%60)).slice(-4)},"%Z":function(a){return a.O},"%%":function(){return"%"}};for(l in m)0<=d.indexOf(l)&&(d=d.replace(new RegExp(l,"g"),m[l](e)));l=Ea(d);if(l.length>b)return 0;B.set(l,a);return l.length-1}
function Ea(a){for(var b=0,d=0;d<a.length;++d){var e=a.charCodeAt(d);55296<=e&&57343>=e&&(e=65536+((e&1023)<<10)|a.charCodeAt(++d)&1023);127>=e?++b:b=2047>=e?b+2:65535>=e?b+3:b+4}b=Array(b+1);ia(a,b,0,b.length);return b}
var Ga={f:function(){},c:function(){c.___errno_location&&(C[c.___errno_location()>>2]=63);return-1},n:function(a,b){P=b;try{var d=Aa();var e=Aa();if(-1===d||0===e)var g=-28;else{var f=Q.K[d];if(f&&e===f.U){var h=(void 0).T(f.S);Q.R(d,h,e,f.flags,f.offset);(void 0).W(h);Q.K[d]=null;f.P&&Fa(f.V)}g=0}return g}catch(n){return D(n),-n.I}},a:function(){},b:function(){D()},k:function(a,b,d){H.set(H.subarray(b,b+d),a)},l:function(a){var b=B.length;if(2147418112<a)return!1;for(var d=1;4>=d;d*=2){var e=b*(1+
.2/d);e=Math.min(e,a+100663296);e=Math.max(16777216,a,e);0<e%65536&&(e+=65536-e%65536);a:{try{E.grow(Math.min(2147418112,e)-J.byteLength+65535>>16);ma(E.buffer);var g=1;break a}catch(f){}g=void 0}if(g)return!0}return!1},d:function(a,b){var d=0;Ca().forEach(function(e,g){var f=b+d;g=C[a+4*g>>2]=f;for(f=0;f<e.length;++f)B[g++>>0]=e.charCodeAt(f);B[g>>0]=0;d+=e.length+1});return 0},e:function(a,b){var d=Ca();C[a>>2]=d.length;var e=0;d.forEach(function(a){e+=a.length+1});C[b>>2]=e;return 0},h:function(){return 0},
j:function(){return 0},g:function(a,b,d,e){try{for(var g=0,f=0;f<d;f++){for(var h=C[b+8*f>>2],n=C[b+(8*f+4)>>2],z=0;z<n;z++){var m=H[h+z],l=za[a];0===m||10===m?((1===a?x:y)(I(l,0)),l.length=0):l.push(m)}g+=n}C[e>>2]=g;return 0}catch(F){return D(F),F.I}},memory:E,o:function(){},i:function(){},m:function(a,b,d,e){return Da(a,b,d,e)},table:ea},Ha=function(){function a(a){c.asm=a.exports;L--;c.monitorRunDependencies&&c.monitorRunDependencies(L);0==L&&(null!==M&&(clearInterval(M),M=null),N&&(a=N,N=null,
a()))}function b(b){a(b.instance)}function d(a){return xa().then(function(a){return WebAssembly.instantiate(a,e)}).then(a,function(a){y("failed to asynchronously prepare wasm: "+a);D(a)})}var e={env:Ga,wasi_snapshot_preview1:Ga};L++;c.monitorRunDependencies&&c.monitorRunDependencies(L);if(c.instantiateWasm)try{return c.instantiateWasm(e,a)}catch(g){return y("Module.instantiateWasm callback failed with error: "+g),!1}(function(){if(A||"function"!==typeof WebAssembly.instantiateStreaming||ta()||"function"!==
typeof fetch)return d(b);fetch(O,{credentials:"same-origin"}).then(function(a){return WebAssembly.instantiateStreaming(a,e).then(b,function(a){y("wasm streaming compile failed: "+a);y("falling back to ArrayBuffer instantiation");d(b)})})})();return{}}();c.asm=Ha;var ya=c.___wasm_call_ctors=function(){return(ya=c.___wasm_call_ctors=c.asm.p).apply(null,arguments)};c._convert_glsl_to_spirv=function(){return(c._convert_glsl_to_spirv=c.asm.q).apply(null,arguments)};
c._destroy_output_buffer=function(){return(c._destroy_output_buffer=c.asm.r).apply(null,arguments)};c._malloc=function(){return(c._malloc=c.asm.s).apply(null,arguments)};var Fa=c._free=function(){return(Fa=c._free=c.asm.t).apply(null,arguments)},ja=c.stackSave=function(){return(ja=c.stackSave=c.asm.u).apply(null,arguments)},G=c.stackAlloc=function(){return(G=c.stackAlloc=c.asm.v).apply(null,arguments)},ka=c.stackRestore=function(){return(ka=c.stackRestore=c.asm.w).apply(null,arguments)};
c.dynCall_vi=function(){return(c.dynCall_vi=c.asm.x).apply(null,arguments)};c.dynCall_v=function(){return(c.dynCall_v=c.asm.y).apply(null,arguments)};c.asm=Ha;var Y;c.then=function(a){if(Y)a(c);else{var b=c.onRuntimeInitialized;c.onRuntimeInitialized=function(){b&&b();a(c)}}return c};N=function Ia(){Y||Z();Y||(N=Ia)};
function Z(){function a(){if(!Y&&(Y=!0,!fa)){K(pa);K(qa);if(c.onRuntimeInitialized)c.onRuntimeInitialized();if(c.postRun)for("function"==typeof c.postRun&&(c.postRun=[c.postRun]);c.postRun.length;){var a=c.postRun.shift();ra.unshift(a)}K(ra)}}if(!(0<L)){if(c.preRun)for("function"==typeof c.preRun&&(c.preRun=[c.preRun]);c.preRun.length;)sa();K(oa);0<L||(c.setStatus?(c.setStatus("Running..."),setTimeout(function(){setTimeout(function(){c.setStatus("")},1);a()},1)):a())}}c.run=Z;
if(c.preInit)for("function"==typeof c.preInit&&(c.preInit=[c.preInit]);0<c.preInit.length;)c.preInit.pop()();Z();


  return Module
}
);
})();
if (typeof exports === 'object' && "object" === 'object')
      module.exports = Module;
    else if (typeof define === 'function' && __webpack_require__.amdO)
      define([], function() { return Module; });
    else if (typeof exports === 'object')
      exports["Module"] = Module;
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((() => {
    const initialize = (opts = {}) => {
        return new Promise(resolve => {
            Module({
                wasmBinary: opts.wasmBinary,
                locateFile() {
                    if (opts.locateFile) {
                        return opts.locateFile('glslang.wasm');
                    }
                    const i = "file:///Volumes/Code/gl2gpu-tint/src/vendor/glslang/glslang.js".lastIndexOf('/')
                    return "file:///Volumes/Code/gl2gpu-tint/src/vendor/glslang/glslang.js".substring(0, i) + '/glslang.wasm';
                },
                onRuntimeInitialized() {
                    resolve({
                        compileGLSLZeroCopy: this.compileGLSLZeroCopy,
                        compileGLSL: this.compileGLSL,
                    });
                },
            });
        });
    };

    let instance;
    return (opts = {}) => {
        if (!instance) {
            instance = initialize(opts);
        }
        return instance;
    };
})());


/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			loaded: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/amd options */
/******/ 	(() => {
/******/ 		__webpack_require__.amdO = {};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/harmony module decorator */
/******/ 	(() => {
/******/ 		__webpack_require__.hmd = (module) => {
/******/ 			module = Object.create(module);
/******/ 			if (!module.children) module.children = [];
/******/ 			Object.defineProperty(module, 'exports', {
/******/ 				enumerable: true,
/******/ 				set: () => {
/******/ 					throw new Error('ES Modules may not assign module.exports or exports.*, Use ESM export syntax, instead: ' + module.id);
/******/ 				}
/******/ 			});
/******/ 			return module;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  beginFrame: () => (/* reexport */ beginFrame),
  endFrame: () => (/* reexport */ endFrame),
  gl2gpuGetContext: () => (/* binding */ hydGetContext),
  hydGetContext: () => (/* binding */ hydGetContext)
});

;// ./src/components/hydRenderPassCache.ts
class GPURenderBundleTransition {
    renderBundle = null;
    jumpTable = new Map();
    opName;
    opArgs;
    father;
    onceHash = null;
    onceNext;
    bindGroupOffset = null;
    onceNumericPrefix = null;
    onceNumericHash = NaN;
    constructor(opName, opArgs, father) {
        this.opName = opName;
        this.opArgs = opArgs;
        this.father = father;
    }
    goto(hash, opName, ...opArgs) {
        if (hash === this.onceHash) {
            return this.onceNext;
        }
        this.onceHash = hash;
        const transition = this.jumpTable.get(hash);
        if (!transition) {
            const newTransition = new GPURenderBundleTransition(opName, opArgs, this);
            this.jumpTable.set(hash, newTransition);
            return this.onceNext = newTransition;
        }
        return this.onceNext = transition;
    }
    gotoBindGroup(bindGroup, do0) {
        if (this.bindGroupOffset === do0 && this.onceHash == bindGroup) {
            return this.onceNext;
        }
        this.onceHash = bindGroup;
        this.bindGroupOffset = do0;
        const hash = 'b0' + bindGroup.label + (do0 === null ? 'none' : do0);
        const transition = this.jumpTable.get(hash);
        if (!transition) {
            const newTransition = new GPURenderBundleTransition('setBindGroup', [0, bindGroup, do0], this);
            this.jumpTable.set(hash, newTransition);
            return this.onceNext = newTransition;
        }
        return this.onceNext = transition;
    }
    gotoNumeric(prefix, numericHash, opName, ...opArgs) {
        if (this.onceNumericPrefix === prefix && this.onceNumericHash === numericHash) {
            return this.onceNext;
        }
        this.onceNumericPrefix = prefix;
        this.onceNumericHash = numericHash;
        return this.goto(prefix + numericHash, opName, ...opArgs);
    }
}
class HydRenderPassEncoder {
    static initBundleCache = new Map();
    bundleCache;
    device;
    renderBundleEncoderDescriptor;
    constructor(device, renderBundleEncoderDescriptor) {
        this.device = device;
        this.renderBundleEncoderDescriptor = renderBundleEncoderDescriptor;
        const initKey = renderBundleEncoderDescriptor.colorFormats.join(',') + renderBundleEncoderDescriptor.depthStencilFormat;
        this.bundleCache = HydRenderPassEncoder.initBundleCache.get(initKey);
        if (!this.bundleCache) {
            this.bundleCache = new GPURenderBundleTransition(null, null, null);
            HydRenderPassEncoder.initBundleCache.set(initKey, this.bundleCache);
        }
    }
    setPipeline(opHash, pipeline) {
        this.bundleCache = this.bundleCache.goto(opHash, 'setPipeline', pipeline);
    }
    setBindGroup(bindGroup, do0) {
        this.bundleCache = this.bundleCache.gotoBindGroup(bindGroup, do0);
    }
    setVertexBuffer(opHash, slot, buffer, offset) {
        this.bundleCache = this.bundleCache.goto(opHash, 'setVertexBuffer', slot, buffer, offset);
    }
    setIndexBuffer(opHash, buffer, format) {
        this.bundleCache = this.bundleCache.goto(opHash, 'setIndexBuffer', buffer, format);
    }
    draw(vertexCount, instanceCount, firstVertex, firstInstance) {
        this.bundleCache = this.bundleCache.gotoNumeric('d', vertexCount * 839 ^ instanceCount * 853 ^ firstVertex * 857 ^ firstInstance * 859, 'draw', vertexCount, instanceCount, firstVertex, firstInstance);
    }
    drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance) {
        this.bundleCache = this.bundleCache.gotoNumeric('i', indexCount * 977 ^ instanceCount * 983 ^ firstIndex * 991 ^ baseVertex * 997 ^ firstInstance * 1009, 'drawIndexed', indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
    }
    generateBundle() {
        if (!this.bundleCache.renderBundle) {
            console.log('[HYD] create bundle');
            const bundleEncoder = this.device.createRenderBundleEncoder(this.renderBundleEncoderDescriptor);
            const tmp = [0];
            const operators = [];
            let cur = this.bundleCache;
            while (cur) {
                operators.push([cur.opName, cur.opArgs]);
                cur = cur.father;
            }
            for (let i = operators.length - 2; i >= 0; i--) {
                const [opName, opArgs] = operators[i];
                if (opName === 'setBindGroup') {
                    if (opArgs[2] === null || opArgs[2] === undefined) {
                        bundleEncoder.setBindGroup(opArgs[0], opArgs[1]);
                    }
                    else {
                        tmp[0] = opArgs[2];
                        bundleEncoder.setBindGroup(opArgs[0], opArgs[1], tmp);
                    }
                }
                else {
                    bundleEncoder[opName].apply(bundleEncoder, opArgs);
                }
            }
            this.bundleCache.renderBundle = bundleEncoder.finish();
        }
        return this.bundleCache.renderBundle;
    }
}
class HydRenderPassCache {
    renderBundleGenerator = null;
    renderPassEncoder = null;
    device;
    _commandEncoder = null;
    renderPassDescriptorCacheKey = null;
    renderPassDescriptor = null;
    renderPassPipelineCacheKey = null;
    renderPassBindGroupCacheKey = null;
    renderPassVertexBufferCacheKeys = [];
    renderPassVertexBufferCacheKey = null;
    renderPassIndexBufferCacheKey = null;
    viewPortInfo = [0, 0, 0, 0, 0, 0];
    scissorInfo = [0, 0, 0, 0];
    stencilReferenceInfo = 0;
    colorInfo = [0, 0, 0, 0];
    __commandEncoderCount = 0;
    bundleNum;
    constructor(device) {
        this.device = device;
    }
    resetbundleNum() {
        this.bundleNum = [];
    }
    CeSubmitAndReset() {
        this.RpEnd();
        if (this._commandEncoder !== null) {
            this.device.queue.submit([this._commandEncoder.finish({ label: this._commandEncoder.label + '.finish()' })]);
            this._commandEncoder = null;
        }
    }
    get commandEncoder() {
        return this._commandEncoder = this._commandEncoder || this.device.createCommandEncoder({
            label: `commandEncoder-${this.__commandEncoderCount++}`,
        });
    }
    resetCache() {
        this.renderPassEncoder = null;
        this.renderBundleGenerator = null;
        this.renderPassDescriptorCacheKey = null;
        this.renderPassDescriptor = null;
        this.renderPassPipelineCacheKey = null;
        this.renderPassBindGroupCacheKey = null;
        this.renderPassVertexBufferCacheKey = null;
        this.renderPassVertexBufferCacheKeys = [];
        this.renderPassIndexBufferCacheKey = null;
        this.viewPortInfo = [0, 0, 0, 0, 0, 0];
        this.scissorInfo = [0, 0, 0, 0];
        this.stencilReferenceInfo = 0;
        this.colorInfo = [0, 0, 0, 0];
    }
    RpEnd() {
        if (this.renderPassEncoder) {
            const bundle = this.renderBundleGenerator.generateBundle();
            this.renderPassEncoder.executeBundles([bundle]);
            this.renderPassEncoder.end();
            this.resetCache();
        }
    }
    RpSetStencilReference(reference) {
        if (this.stencilReferenceInfo !== reference) {
            this.stencilReferenceInfo = reference;
            this.renderPassEncoder.setStencilReference(reference);
        }
    }
    RpSetBlendConstant4(r, g, b, a) {
        if (this.colorInfo[0] !== r || this.colorInfo[1] !== g || this.colorInfo[2] !== b || this.colorInfo[3] !== a) {
            this.colorInfo[0] = r;
            this.colorInfo[1] = g;
            this.colorInfo[2] = b;
            this.colorInfo[3] = a;
            this.renderPassEncoder.setBlendConstant(this.colorInfo);
        }
    }
    RpSetDescriptor(hash, renderBundleEncoderDescriptor, callback) {
        if (this.renderPassDescriptorCacheKey !== hash) {
            this.RpEnd();
            this.renderPassDescriptorCacheKey = hash;
            this.renderPassDescriptor = callback();
            this.renderPassEncoder = this.commandEncoder.beginRenderPass(this.renderPassDescriptor);
            this.renderBundleGenerator = new HydRenderPassEncoder(this.device, renderBundleEncoderDescriptor);
            return true;
        }
        return false;
    }
    RpClear(callback) {
        this.RpEnd();
        const renderPassEncoder = this.commandEncoder.beginRenderPass(callback());
        renderPassEncoder.end();
        this.resetCache();
    }
    hasActiveRenderPass() {
        return this.renderPassEncoder !== null;
    }
    RpSetPipeline(hash, pipeline) {
        if (this.renderPassPipelineCacheKey !== hash) {
            this.renderPassPipelineCacheKey = hash;
            this.renderBundleGenerator.setPipeline(hash, pipeline);
        }
    }
    RpSetBindGroup(bindGroup, dynamicOffset0) {
        this.renderBundleGenerator.setBindGroup(bindGroup, dynamicOffset0);
    }
    RpSetVertexBuffer(hash, loc, vertexBuffer, offset) {
        if (this.renderPassVertexBufferCacheKeys[loc] !== hash) {
            this.renderPassVertexBufferCacheKeys[loc] = hash;
            this.renderBundleGenerator.setVertexBuffer(hash, loc, vertexBuffer, offset);
        }
    }
    RpSetVertexBuffers(hash, hashes, vertexBuffers, offsets) {
        if (this.renderPassVertexBufferCacheKey !== hash) {
            this.renderPassVertexBufferCacheKey = hash;
            const n = vertexBuffers.length;
            for (let i = 0; i < n; i++) {
                this.RpSetVertexBuffer(hashes[i], i, vertexBuffers[i], offsets[i]);
            }
        }
    }
    RpSetIndexBuffer(indexBuffer, indexFormat) {
        if (this.renderPassIndexBufferCacheKey !== indexBuffer.label) {
            this.renderPassIndexBufferCacheKey = indexBuffer.label;
            this.renderBundleGenerator.setIndexBuffer(indexBuffer.label, indexBuffer, indexFormat);
        }
    }
    RpSetViewportValues(x, y, width, height, minDepth, maxDepth) {
        if (this.viewPortInfo[0] !== x ||
            this.viewPortInfo[1] !== y ||
            this.viewPortInfo[2] !== width ||
            this.viewPortInfo[3] !== height ||
            this.viewPortInfo[4] !== minDepth ||
            this.viewPortInfo[5] !== maxDepth) {
            this.viewPortInfo[0] = x;
            this.viewPortInfo[1] = y;
            this.viewPortInfo[2] = width;
            this.viewPortInfo[3] = height;
            this.viewPortInfo[4] = minDepth;
            this.viewPortInfo[5] = maxDepth;
            this.renderPassEncoder.setViewport(x, y, width, height, minDepth, maxDepth);
        }
    }
    RpSetScissorRectValues(x, y, width, height) {
        if (this.scissorInfo[0] !== x ||
            this.scissorInfo[1] !== y ||
            this.scissorInfo[2] !== width ||
            this.scissorInfo[3] !== height) {
            this.scissorInfo[0] = x;
            this.scissorInfo[1] = y;
            this.scissorInfo[2] = width;
            this.scissorInfo[3] = height;
            this.renderPassEncoder.setScissorRect(x, y, width, height);
        }
    }
    RpDraw(vertexCount, instanceCount, firstVertex, firstInstance) {
        this.renderBundleGenerator.draw(vertexCount, instanceCount, firstVertex, firstInstance);
    }
    RpDrawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance) {
        this.renderBundleGenerator.drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
    }
}

;// ./src/components/hydFramebuffer.ts
class FramebufferAttributes {
    attachmentPoint;
    level;
    face;
    layer;
    attachment;
    constructor(attachmentPoint, level, face, attachment, layer) {
        this.attachmentPoint = attachmentPoint;
        this.level = level;
        this.face = face;
        this.layer = layer;
        this.attachment = attachment;
    }
    get hash() {
        return `${this.attachmentPoint}-${this.level}-${this.face}-${this.layer}-${this.attachment.hash}`;
    }
    get view() {
        return this.attachment.getFramebufferView(this.face, this.level, this.layer);
    }
    get format() {
        return this.attachment.format;
    }
    get width() {
        return this.attachment.width;
    }
    get height() {
        return this.attachment.height;
    }
}
class HydFramebuffer {
    attachments = new Map();
    drawBuffers = [
        WebGL2RenderingContext.COLOR_ATTACHMENT0
    ];
    _hash = null;
    get hash() {
        if (!this._hash) {
            this._hash = '';
            const sortedKeys = Array.from(this.attachments.keys()).sort();
            for (const key of sortedKeys) {
                const value = this.attachments.get(key);
                this._hash += key.toString() + '-' + value.hash.toString() + '|';
            }
            for (const drawBuffer of this.drawBuffers) {
                this._hash += drawBuffer.toString() + '|';
            }
        }
        return this._hash;
    }
    resetHash() {
        this._hash = null;
    }
}

;// ./src/components/hydTexture.ts
const DEFAULT_PIXEL_UNPACK_STATE = {
    flipY: false,
    alignment: 4,
};
const targetToOrigin = new Map([
    [WebGL2RenderingContext.TEXTURE_2D, { x: 0, y: 0, z: 0 }],
    [WebGL2RenderingContext.TEXTURE_3D, { x: 0, y: 0, z: 0 }],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP, { x: 0, y: 0, z: 0 }],
    [WebGL2RenderingContext.TEXTURE_2D_ARRAY, { x: 0, y: 0, z: 0 }],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X, { x: 0, y: 0, z: 0 }],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_X, { x: 0, y: 0, z: 1 }],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Y, { x: 0, y: 0, z: 2 }],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Y, { x: 0, y: 0, z: 3 }],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Z, { x: 0, y: 0, z: 4 }],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z, { x: 0, y: 0, z: 5 }],
]);
const targetViewDimensionMap = new Map([
    [WebGL2RenderingContext.TEXTURE_2D, "2d"],
    [WebGL2RenderingContext.TEXTURE_3D, "3d"],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP, "cube"],
    [WebGL2RenderingContext.TEXTURE_2D_ARRAY, "2d-array"],
]);
const parameterToString = new Map([
    [WebGL2RenderingContext.LINEAR, "linear"],
    [WebGL2RenderingContext.NEAREST, "nearest"],
    [WebGL2RenderingContext.REPEAT, "repeat"],
    [WebGL2RenderingContext.CLAMP_TO_EDGE, "clamp-to-edge"],
    [WebGL2RenderingContext.MIRRORED_REPEAT, "mirror-repeat"],
    [WebGL2RenderingContext.LINEAR_MIPMAP_LINEAR, "linear"],
]);
const pnameToString = new Map([
    [WebGL2RenderingContext.TEXTURE_MIN_FILTER, "minFilter"],
    [WebGL2RenderingContext.TEXTURE_MAG_FILTER, "magFilter"],
    [WebGL2RenderingContext.TEXTURE_WRAP_S, "wrapS"],
    [WebGL2RenderingContext.TEXTURE_WRAP_T, "wrapT"],
    [WebGL2RenderingContext.TEXTURE_WRAP_R, "wrapR"],
]);
function textureFormatLookup(internalFormat, format, type) {
    if ((internalFormat === WebGL2RenderingContext.RGBA || internalFormat === WebGL2RenderingContext.RGBA8) && format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "rgba8unorm";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA && format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.FLOAT) {
        return "rgba32float";
    }
    if (internalFormat === WebGL2RenderingContext.LUMINANCE && format === WebGL2RenderingContext.LUMINANCE && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "r8unorm";
    }
    if (internalFormat === WebGL2RenderingContext.DEPTH_COMPONENT32F && format === WebGL2RenderingContext.DEPTH_COMPONENT && type === WebGL2RenderingContext.FLOAT) {
        return "depth32float";
    }
    if ((internalFormat === WebGL2RenderingContext.DEPTH_COMPONENT ||
        internalFormat === WebGL2RenderingContext.DEPTH_COMPONENT16 ||
        internalFormat === WebGL2RenderingContext.DEPTH_COMPONENT24) &&
        format === WebGL2RenderingContext.DEPTH_COMPONENT &&
        (type === WebGL2RenderingContext.UNSIGNED_INT || type === WebGL2RenderingContext.UNSIGNED_SHORT)) {
        return "depth24plus";
    }
    if (internalFormat === WebGL2RenderingContext.RGB && format === WebGL2RenderingContext.RGB && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "rgba8unorm";
    }
    if ((internalFormat === WebGL2RenderingContext.ALPHA && format === WebGL2RenderingContext.ALPHA && type === WebGL2RenderingContext.UNSIGNED_BYTE) ||
        (internalFormat === WebGL2RenderingContext.LUMINANCE_ALPHA && format === WebGL2RenderingContext.LUMINANCE_ALPHA && type === WebGL2RenderingContext.UNSIGNED_BYTE)) {
        return "rgba8unorm";
    }
    throw new Error(`Unsupported texture format: ${internalFormat}, ${format}, ${type}`);
}
function alignTo(value, alignment) {
    return Math.ceil(value / alignment) * alignment;
}
function byteView(data) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}
function bytesPerPixel(format, type) {
    if (type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        switch (format) {
            case WebGL2RenderingContext.RGBA:
                return 4;
            case WebGL2RenderingContext.RGB:
                return 3;
            case WebGL2RenderingContext.LUMINANCE:
            case WebGL2RenderingContext.ALPHA:
                return 1;
            case WebGL2RenderingContext.LUMINANCE_ALPHA:
                return 2;
        }
    }
    if (format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.FLOAT) {
        return 16;
    }
    if (format === WebGL2RenderingContext.DEPTH_COMPONENT && type === WebGL2RenderingContext.FLOAT) {
        return 4;
    }
    if (format === WebGL2RenderingContext.DEPTH_COMPONENT && type === WebGL2RenderingContext.UNSIGNED_INT) {
        return 4;
    }
    if (format === WebGL2RenderingContext.DEPTH_COMPONENT && type === WebGL2RenderingContext.UNSIGNED_SHORT) {
        return 2;
    }
    throw new Error(`Unsupported texture upload format: ${format}, ${type}`);
}
function getSourceBytesPerRow(byteLength, width, height, sourceBytesPerPixel, alignment) {
    const aligned = alignTo(width * sourceBytesPerPixel, alignment);
    const minimumRequired = aligned * (height - 1) + width * sourceBytesPerPixel;
    if (byteLength >= minimumRequired) {
        return aligned;
    }
    const tight = width * sourceBytesPerPixel;
    if (byteLength >= tight * height) {
        return tight;
    }
    throw new Error(`Texture upload data is too small: ${byteLength} bytes for ${width}x${height}`);
}
function prepareTypedTextureUpload(data, width, height, internalformat, format, type, unpack) {
    const sourceBytes = byteView(data);
    const sourceBytesPerPixel = bytesPerPixel(format, type);
    const sourceBytesPerRow = getSourceBytesPerRow(sourceBytes.byteLength, width, height, sourceBytesPerPixel, unpack.alignment);
    const needsRgbaExpansion = type === WebGL2RenderingContext.UNSIGNED_BYTE &&
        (format === WebGL2RenderingContext.RGB ||
            format === WebGL2RenderingContext.LUMINANCE ||
            format === WebGL2RenderingContext.ALPHA ||
            format === WebGL2RenderingContext.LUMINANCE_ALPHA);
    const uploadInternalformat = needsRgbaExpansion ? WebGL2RenderingContext.RGBA : internalformat;
    const uploadFormat = needsRgbaExpansion ? WebGL2RenderingContext.RGBA : format;
    const uploadType = type;
    const destinationBytesPerPixel = needsRgbaExpansion ? 4 : sourceBytesPerPixel;
    const destinationBytesPerRow = width * destinationBytesPerPixel;
    if (!unpack.flipY && !needsRgbaExpansion && sourceBytesPerRow === destinationBytesPerRow) {
        return {
            data,
            bytesPerRow: sourceBytesPerRow,
            internalformat: uploadInternalformat,
            format: uploadFormat,
            type: uploadType,
        };
    }
    const uploadBytes = new Uint8Array(destinationBytesPerRow * height);
    for (let y = 0; y < height; y++) {
        const sourceY = unpack.flipY ? height - 1 - y : y;
        const sourceOffset = sourceY * sourceBytesPerRow;
        const destinationOffset = y * destinationBytesPerRow;
        if (!needsRgbaExpansion) {
            uploadBytes.set(sourceBytes.subarray(sourceOffset, sourceOffset + destinationBytesPerRow), destinationOffset);
            continue;
        }
        for (let x = 0; x < width; x++) {
            const src = sourceOffset + x * sourceBytesPerPixel;
            const dst = destinationOffset + x * 4;
            if (format === WebGL2RenderingContext.LUMINANCE) {
                const luminance = sourceBytes[src];
                uploadBytes[dst] = luminance;
                uploadBytes[dst + 1] = luminance;
                uploadBytes[dst + 2] = luminance;
                uploadBytes[dst + 3] = 255;
            }
            else if (format === WebGL2RenderingContext.ALPHA) {
                uploadBytes[dst] = 0;
                uploadBytes[dst + 1] = 0;
                uploadBytes[dst + 2] = 0;
                uploadBytes[dst + 3] = sourceBytes[src];
            }
            else if (format === WebGL2RenderingContext.LUMINANCE_ALPHA) {
                const luminance = sourceBytes[src];
                uploadBytes[dst] = luminance;
                uploadBytes[dst + 1] = luminance;
                uploadBytes[dst + 2] = luminance;
                uploadBytes[dst + 3] = sourceBytes[src + 1];
            }
            else {
                uploadBytes[dst] = sourceBytes[src];
                uploadBytes[dst + 1] = sourceBytes[src + 1];
                uploadBytes[dst + 2] = sourceBytes[src + 2];
                uploadBytes[dst + 3] = 255;
            }
        }
    }
    return {
        data: uploadBytes,
        bytesPerRow: destinationBytesPerRow,
        internalformat: uploadInternalformat,
        format: uploadFormat,
        type: uploadType,
    };
}
function shouldApplyExternalFlipY(data, unpack) {
    return unpack.flipY && !(typeof ImageBitmap !== "undefined" && data instanceof ImageBitmap);
}
function sampleTypeLookup(internalFormat, format, type) {
    if (internalFormat === WebGL2RenderingContext.RGBA && format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "uint";
    }
    if (internalFormat === WebGL2RenderingContext.LUMINANCE && format === WebGL2RenderingContext.LUMINANCE && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "uint";
    }
    if (internalFormat === WebGL2RenderingContext.DEPTH_COMPONENT32F && format === WebGL2RenderingContext.DEPTH_COMPONENT && type === WebGL2RenderingContext.FLOAT) {
        return "depth";
    }
    throw new Error(`Unsupported texture format: ${internalFormat}, ${format}, ${type}`);
}
class HydTexture {
    onDestroy = [];
    static __total__ = 0;
    static isDestroyedTexture = false;
    label;
    _texture = null;
    _textureDescriptor = {
        size: {
            width: undefined,
            height: undefined,
            depthOrArrayLayers: undefined,
        },
        usage: undefined,
        format: undefined,
        dimension: undefined,
        isDepthStencil: false,
    };
    _sampler = null;
    _view = null;
    _attachmentViews = new Map();
    _hash;
    sourceOrigin = "uninitialized";
    get isDepthStencil() {
        return this._textureDescriptor.isDepthStencil;
    }
    _currentTextureDescriptor = {
        size: {
            width: undefined,
            height: undefined,
            depthOrArrayLayers: undefined,
        },
        usage: undefined,
        format: undefined,
        dimension: undefined,
        isDepthStencil: false,
    };
    _viewDimension = undefined;
    state = {
        minFilter: "nearest",
        magFilter: "linear",
        wrapS: "repeat",
        wrapT: "repeat",
        wrapR: "repeat",
        maxAnisotropy: 1,
    };
    device;
    static __samplerCount = 0;
    static __viewCount = 0;
    get isConfigured() {
        return Boolean(this._textureDescriptor.format &&
            this._textureDescriptor.dimension &&
            this._textureDescriptor.usage &&
            this._textureDescriptor.size.width &&
            this._textureDescriptor.size.height &&
            this._textureDescriptor.size.depthOrArrayLayers);
    }
    get format() {
        return this._textureDescriptor.format;
    }
    get width() {
        return Number(this._textureDescriptor.size.width) || 0;
    }
    get height() {
        return Number(this._textureDescriptor.size.height) || 0;
    }
    set viewDimension(viewDimension) {
        if (this._viewDimension === viewDimension) {
            return;
        }
        this._viewDimension = viewDimension;
        this._view = null;
        this._hash = null;
    }
    get viewDimension() {
        return this._viewDimension;
    }
    get view() {
        if (!this._view) {
            this._view = this.texture.createView({
                dimension: this._viewDimension,
                format: this.format,
                label: "view_" + (HydTexture.__viewCount++) + "@" + this.label,
            });
        }
        return this._view;
    }
    get sampler() {
        if (!this._sampler) {
            const desc = {
                minFilter: this.state.minFilter,
                magFilter: this.state.magFilter,
                addressModeU: this.state.wrapS,
                addressModeV: this.state.wrapT,
                addressModeW: this.state.wrapR,
                maxAnisotropy: this.state.maxAnisotropy,
                label: "sampler-" + (HydTexture.__samplerCount++),
            };
            this._sampler = this.device.createSampler(desc);
        }
        return this._sampler;
    }
    get hash() {
        if (!this._view) {
            return this.state.minFilter +
                this.state.magFilter +
                this.state.wrapS +
                this.state.wrapT +
                this.state.wrapR +
                this.state.compare +
                this.state.maxAnisotropy +
                'uninitialized ' +
                this._viewDimension +
                this._textureDescriptor.format +
                this._textureDescriptor.dimension +
                this._textureDescriptor.usage +
                this._textureDescriptor.isDepthStencil +
                this._textureDescriptor.size.width +
                this._textureDescriptor.size.height +
                this._textureDescriptor.size.depthOrArrayLayers;
        }
        if (!this._hash) {
            this._hash = this.state.minFilter +
                this.state.magFilter +
                this.state.wrapS +
                this.state.wrapT +
                this.state.wrapR +
                this.state.compare +
                this.state.maxAnisotropy +
                this.view.label;
        }
        return this._hash;
    }
    destroy() {
        if (this._texture) {
            this._texture.destroy();
        }
        this._texture = null;
        this._view = null;
        this._attachmentViews.clear();
        this._sampler = null;
        this._hash = null;
        HydTexture.isDestroyedTexture = true;
        for (const callback of this.onDestroy) {
            callback();
        }
        this.onDestroy = [];
    }
    get texture() {
        if (this._texture && (this._textureDescriptor.size.width !== this._currentTextureDescriptor.size.width
            || this._textureDescriptor.size.height !== this._currentTextureDescriptor.size.height
            || this._textureDescriptor.size.depthOrArrayLayers !== this._currentTextureDescriptor.size.depthOrArrayLayers
            || this._textureDescriptor.format !== this._currentTextureDescriptor.format
            || this._textureDescriptor.dimension !== this._currentTextureDescriptor.dimension
            || this._textureDescriptor.usage !== this._currentTextureDescriptor.usage)) {
            this.destroy();
        }
        if (!this._texture) {
            this._texture = this.device.createTexture({
                label: this.label,
                size: this._textureDescriptor.size,
                format: this._textureDescriptor.format,
                usage: this._textureDescriptor.usage,
                dimension: this._textureDescriptor.dimension,
            });
            this._currentTextureDescriptor = Object.assign({}, this._textureDescriptor);
        }
        return this._texture;
    }
    constructor(device) {
        this.device = device;
        this.label = `HydTexture${HydTexture.__total__++}`;
    }
    ensureSampleable(viewDimension = "2d") {
        if (this.isConfigured) {
            if (!this._viewDimension) {
                this._viewDimension = viewDimension;
            }
            return;
        }
        this._viewDimension = viewDimension;
        this.configureTexture({
            size: {
                width: 1,
                height: 1,
                depthOrArrayLayers: viewDimension === "cube" ? 6 : 1,
            },
            format: "rgba8unorm",
            dimension: "2d",
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING,
            isDepthStencil: false,
        });
        const layers = viewDimension === "cube" ? 6 : 1;
        for (let layer = 0; layer < layers; layer++) {
            this.device.queue.writeTexture({ texture: this.texture, origin: { x: 0, y: 0, z: layer } }, new Uint8Array([0, 0, 0, 255]), { offset: 0 }, [1, 1]);
        }
        this.sourceOrigin = "uninitialized";
    }
    static getDepthOrArrayLayers(target) {
        if (target === WebGL2RenderingContext.TEXTURE_2D) {
            return 1;
        }
        else if (target === WebGL2RenderingContext.TEXTURE_CUBE_MAP) {
            return 6;
        }
        else if (target === WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X
            || target === WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_X
            || target === WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Y
            || target === WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Y
            || target === WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Z
            || target === WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z) {
            return 6;
        }
        else {
            throw new Error(`Unsupported texture target: ${target}`);
        }
    }
    static getArrayLayer(target) {
        return targetToOrigin.get(target)?.z || 0;
    }
    markFramebufferRenderTarget() {
        this.sourceOrigin = "render-target";
        this._hash = null;
    }
    markCopyDestination() {
        this.sourceOrigin = "copy";
        this._hash = null;
    }
    getFramebufferView(target, mipLevel = 0, layer) {
        const baseMipLevel = mipLevel || 0;
        const baseArrayLayer = layer === undefined ? HydTexture.getArrayLayer(target) : layer;
        const key = `${baseMipLevel}:${baseArrayLayer}`;
        let view = this._attachmentViews.get(key);
        if (!view) {
            view = this.texture.createView({
                dimension: "2d",
                format: this.format,
                baseMipLevel,
                mipLevelCount: 1,
                baseArrayLayer,
                arrayLayerCount: 1,
                label: `attachment_view_${HydTexture.__viewCount++}@${this.label}:${key}`,
            });
            this._attachmentViews.set(key, view);
        }
        return view;
    }
    texImage2D(data, target, mipLevel, internalformat, width, height, border, format, type, unpack = DEFAULT_PIXEL_UNPACK_STATE) {
        this.label += ' 2D';
        let uploadData = data;
        let uploadBytesPerRow = undefined;
        if (data !== null && "byteLength" in data) {
            const prepared = prepareTypedTextureUpload(data, width, height, internalformat, format, type, unpack);
            uploadData = prepared.data;
            uploadBytesPerRow = prepared.bytesPerRow;
            internalformat = prepared.internalformat;
            format = prepared.format;
            type = prepared.type;
        }
        this.configureTexture({
            size: { width, height, depthOrArrayLayers: HydTexture.getDepthOrArrayLayers(target) },
            format: textureFormatLookup(internalformat, format, type),
            dimension: "2d",
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            isDepthStencil: format === WebGL2RenderingContext.DEPTH_COMPONENT,
        });
        if (uploadData === null) {
            this.sourceOrigin = "typed-upload";
            return;
        }
        if (uploadData instanceof HTMLImageElement ||
            (typeof ImageBitmap !== "undefined" && uploadData instanceof ImageBitmap) ||
            uploadData instanceof ImageData ||
            uploadData instanceof HTMLCanvasElement ||
            uploadData instanceof HTMLVideoElement ||
            (typeof OffscreenCanvas !== "undefined" && uploadData instanceof OffscreenCanvas)) {
            this.device.queue.copyExternalImageToTexture({ source: uploadData, flipY: shouldApplyExternalFlipY(uploadData, unpack) }, { texture: this.texture, origin: targetToOrigin.get(target) }, [width, height]);
            this.sourceOrigin = "external-upload";
        }
        else if ("byteLength" in uploadData) {
            this.device.queue.writeTexture({ texture: this.texture, origin: targetToOrigin.get(target) }, uploadData, {
                offset: 0,
                bytesPerRow: uploadBytesPerRow,
                rowsPerImage: height,
            }, [width, height]);
            this.sourceOrigin = "typed-upload";
        }
    }
    texSubImage2D(data, target, mipLevel, xoffset, yoffset, width, height, format, type, unpack = DEFAULT_PIXEL_UNPACK_STATE) {
        let uploadData = data;
        let uploadBytesPerRow = undefined;
        if (data !== null && "byteLength" in data) {
            const prepared = prepareTypedTextureUpload(data, width, height, format, format, type, unpack);
            uploadData = prepared.data;
            uploadBytesPerRow = prepared.bytesPerRow;
            format = prepared.format;
            type = prepared.type;
        }
        const baseOrigin = targetToOrigin.get(target) || { x: 0, y: 0, z: 0 };
        const origin = {
            x: (baseOrigin.x || 0) + xoffset,
            y: (baseOrigin.y || 0) + yoffset,
            z: baseOrigin.z || 0,
        };
        const destination = {
            texture: this.texture,
            mipLevel,
            origin,
        };
        if (uploadData instanceof HTMLImageElement ||
            (typeof ImageBitmap !== "undefined" && uploadData instanceof ImageBitmap) ||
            uploadData instanceof ImageData ||
            uploadData instanceof HTMLCanvasElement ||
            uploadData instanceof HTMLVideoElement ||
            (typeof OffscreenCanvas !== "undefined" && uploadData instanceof OffscreenCanvas)) {
            this.device.queue.copyExternalImageToTexture({ source: uploadData, flipY: shouldApplyExternalFlipY(uploadData, unpack) }, destination, [width, height]);
            this.sourceOrigin = "external-upload";
        }
        else if (uploadData && "byteLength" in uploadData) {
            this.device.queue.writeTexture(destination, uploadData, {
                offset: 0,
                bytesPerRow: uploadBytesPerRow,
                rowsPerImage: height,
            }, [width, height]);
            this.sourceOrigin = "typed-upload";
        }
    }
    texImage3D(data, target, mipLevel, internalformat, width, height, depth, border, format, type, offset) {
        this.label += ' 3D';
        this.configureTexture({
            size: { width, height, depthOrArrayLayers: depth },
            format: textureFormatLookup(internalformat, format, type),
            dimension: "3d",
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            isDepthStencil: format === WebGL2RenderingContext.DEPTH_COMPONENT,
        });
        if (data === null) {
            this.sourceOrigin = "typed-upload";
            return;
        }
        if (data instanceof HTMLImageElement) {
            createImageBitmap(data).then((bitmap) => {
                this.device.queue.copyExternalImageToTexture({ source: bitmap }, { texture: this.texture }, [width, height, depth]);
            });
            this.sourceOrigin = "external-upload";
        }
        else if (data instanceof ImageBitmap ||
            data instanceof HTMLCanvasElement ||
            data instanceof OffscreenCanvas) {
            this.device.queue.copyExternalImageToTexture({ source: data }, { texture: this.texture }, [width, height, depth]);
            this.sourceOrigin = "external-upload";
        }
        else if (data instanceof ImageData) {
            this.device.queue.writeTexture({ texture: this.texture }, data.data, {
                offset: 0,
                bytesPerRow: data.data.length / height,
                rowsPerImage: height,
            }, [width, height, depth]);
            this.sourceOrigin = "external-upload";
        }
        else if ("byteLength" in data) {
            this.device.queue.writeTexture({ texture: this.texture }, data, {
                offset: 0,
                bytesPerRow: data.byteLength / height,
                rowsPerImage: height,
            }, [width, height, depth]);
            this.sourceOrigin = "typed-upload";
        }
        else if (data instanceof HTMLVideoElement) {
            throw new Error("Not implemented");
        }
    }
    texParameteri(pname, param) {
        console.assert(pnameToString.has(pname) && parameterToString.has(param));
        this.state[pnameToString.get(pname)] = parameterToString.get(param);
        this._sampler = null;
        this._hash = null;
    }
    renderbufferStorage(format, width, height) {
        this.configureTexture({
            size: { width, height, depthOrArrayLayers: 1 },
            format,
            dimension: "2d",
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            isDepthStencil: format.startsWith("depth") || format === "stencil8",
        });
        this.sourceOrigin = "render-target";
    }
    configureTexture(descriptor) {
        const descriptorChanged = this._textureDescriptor.dimension !== descriptor.dimension ||
            this._textureDescriptor.format !== descriptor.format ||
            this._textureDescriptor.usage !== descriptor.usage ||
            this._textureDescriptor.isDepthStencil !== descriptor.isDepthStencil ||
            this._textureDescriptor.size.width !== descriptor.size.width ||
            this._textureDescriptor.size.height !== descriptor.size.height ||
            this._textureDescriptor.size.depthOrArrayLayers !== descriptor.size.depthOrArrayLayers;
        if (descriptorChanged && this._texture) {
            this.destroy();
        }
        this._textureDescriptor.dimension = descriptor.dimension;
        this._textureDescriptor.format = descriptor.format;
        this._textureDescriptor.size = descriptor.size;
        this._textureDescriptor.usage = descriptor.usage;
        this._textureDescriptor.isDepthStencil = descriptor.isDepthStencil;
        if (descriptorChanged) {
            this._view = null;
            this._attachmentViews.clear();
            this._hash = null;
            this.sourceOrigin = "uninitialized";
        }
    }
}

;// ./src/components/hydShader.ts
window.hydTmp = new Set();
class HydShader {
    shaderTranslator;
    glsl_shader;
    shader_info;
    translated_glsl_shader;
    device;
    deleted = false;
    compiled = false;
    type;
    sourceLength;
    static errorShaderCount = 0;
    constructor(device, target, shaderTranslator) {
        this.type = target;
        this.device = device;
        this.shaderTranslator = shaderTranslator;
    }
    compileShader() {
        this.shader_info = this.shaderTranslator.inspectShader(this.type, this.glsl_shader);
        if (!this.shader_info.wgsl) {
            console.warn("[HYD] shader WGSL deferred to runtime translator.");
        }
        this.compiled = true;
    }
}

;// ./src/types.ts

class HydVertexArrayAttribute {
    __hash__ = '';
    __layoutHash__ = '';
    enabled = false;
    size;
    type;
    int;
    normalized = false;
    stride = 0;
    offset = 0;
    divisor = 0;
    buffer;
    shaderLocation;
    format;
    updateHash() {
        const bufferHash = this.buffer ? this.buffer.hash : '-_-';
        const tmp = `${this.size}_${this.type}_${this.int}_${this.normalized}_${this.stride}_${this.offset}_${this.divisor}`;
        this.__layoutHash__ = this.enabled ? tmp : './.';
        this.__hash__ = `${this.__layoutHash__}@${bufferHash}`;
    }
    get hash() {
        return this.__hash__;
    }
    get layoutHash() {
        return this.__layoutHash__;
    }
}
const OriginWebGLShader = WebGLShader;
WebGLShader = new Proxy(OriginWebGLShader, {
    get: function (target, p, receiver) {
        if (p === Symbol.hasInstance) {
            return (instance) => {
                return (instance instanceof HydShader) || (instance instanceof OriginWebGLShader);
            };
        }
        else {
            return target[p];
        }
    }
});

;// ./src/components/hydVertexArray.ts

class HydVertexArray {
    __hash__;
    attributes = [
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
        new HydVertexArrayAttribute(),
    ];
    elementArrayBufferBinding = null;
    get hash() {
        let ret = this.elementArrayBufferBinding ? this.elementArrayBufferBinding.hash : 'null';
        for (const attribute of this.attributes) {
            ret += attribute.hash;
        }
        return ret;
    }
}

// EXTERNAL MODULE: ./node_modules/fast-hash-code/dist/index.js
var dist = __webpack_require__(197);
;// ./src/components/hydGlobalState.ts




const CURRENT_VERTEX_ATTRIB_BUFFER_ELEMENTS = 4096;
const TEXTURE_UNIT_BINDING_ORDER = ["2d", "cube", "3d", "2d-array", "cube-array"];
function programAttributeTypeToVertexFormat(type) {
    switch (type) {
        case WebGL2RenderingContext.FLOAT:
            return 'float32';
        case WebGL2RenderingContext.FLOAT_VEC2:
            return 'float32x2';
        case WebGL2RenderingContext.FLOAT_VEC3:
            return 'float32x3';
        case WebGL2RenderingContext.FLOAT_VEC4:
            return 'float32x4';
        default:
            return 'float32x4';
    }
}
class CommonState {
    activeTextureUnit;
    viewport;
    arrayBufferBinding;
    currentProgram;
    vertexArrayBinding;
    renderbufferBinding;
    drawFramebufferBinding;
    readFramebufferBinding;
    get hash() {
        let ret = this.activeTextureUnit.toString()
            + this.viewport.join(',')
            + this.vertexArrayBinding.hash
            + this.drawFramebufferBinding.hash
            + this.readFramebufferBinding.hash;
        if (this.arrayBufferBinding) {
            ret += this.arrayBufferBinding.hash;
        }
        if (this.renderbufferBinding) {
            ret += this.renderbufferBinding.hash;
        }
        if (this.currentProgram) {
            ret += this.currentProgram.hash;
            ret += this.currentProgram.hydSamplers.map((sampler) => `${sampler.name}:${sampler.textureUnit}`).join('|');
        }
        return ret;
    }
    constructor(activeTextureUnit, viewport, arrayBufferBinding, currentProgram, vertexArrayBinding, drawFramebufferBinding, readFramebufferBinding, renderbufferBinding) {
        this.activeTextureUnit = activeTextureUnit;
        this.viewport = viewport;
        this.arrayBufferBinding = arrayBufferBinding;
        this.currentProgram = currentProgram;
        this.vertexArrayBinding = vertexArrayBinding;
        this.renderbufferBinding = renderbufferBinding;
        this.drawFramebufferBinding = drawFramebufferBinding;
        this.readFramebufferBinding = readFramebufferBinding;
    }
}
class DepthState {
    enabled;
    func;
    range;
    writeMask;
    get hash() {
        return this.enabled.toString() + this.func.toString() + this.range.toString() + this.writeMask.toString();
    }
    constructor() {
        this.enabled = false;
        this.func = 'less';
        this.range = [0, 1];
        this.writeMask = true;
    }
}
class PolygonState {
    cullFace;
    cullFaceMode;
    frontFace;
    polygonOffsetFill;
    polygonOffsetUnits;
    polygonOffsetFactor;
    get hash() {
        return this.cullFace.toString() + this.cullFaceMode.toString() + this.frontFace.toString() + this.polygonOffsetFill.toString() + this.polygonOffsetUnits.toString() + this.polygonOffsetFactor.toString();
    }
    constructor() {
        this.cullFace = false;
        this.cullFaceMode = 'back';
        this.frontFace = 'ccw';
        this.polygonOffsetFill = false;
        this.polygonOffsetUnits = 0;
        this.polygonOffsetFactor = 0;
    }
}
class ClearState {
    color;
    depth;
    stencil;
    target;
    get hash() {
        return this.color.toString() + this.depth.toString() + this.stencil.toString();
    }
    constructor() {
        this.color = [0.0, 0.0, 0.0, 0.0];
        this.depth = 1;
        this.stencil = 0x00;
        this.target = WebGL2RenderingContext.COLOR_BUFFER_BIT | WebGL2RenderingContext.DEPTH_BUFFER_BIT;
    }
}
class BlendState {
    enabled;
    color;
    dstRGB;
    srcRGB;
    dstAlpha;
    srcAlpha;
    equationRGB;
    equationAlpha;
    get hash() {
        return this.enabled.toString() + this.color.toString() + this.dstRGB.toString() + this.srcRGB.toString() + this.dstAlpha.toString() + this.srcAlpha.toString() + this.equationRGB.toString() + this.equationAlpha.toString();
    }
    constructor() {
        this.enabled = false;
        this.dstRGB = 'zero';
        this.dstAlpha = 'zero';
        this.srcRGB = 'one';
        this.srcAlpha = 'one';
        this.color = [0.0, 0.0, 0.0, 0.0];
        this.equationRGB = 'add';
        this.equationAlpha = 'add';
    }
}
class MiscState {
    scissorTest;
    scissorBox;
    colorWriteMask;
    unpackFlipYWebGL;
    unpackAlignment;
    packAlignment;
    get unpackState() {
        return {
            flipY: this.unpackFlipYWebGL,
            alignment: this.unpackAlignment,
        };
    }
    get hash() {
        return this.scissorTest.toString() + this.scissorBox.toString() + this.colorWriteMask.toString() + this.unpackFlipYWebGL.toString() + this.unpackAlignment.toString() + this.packAlignment.toString();
    }
    constructor() {
        this.scissorTest = false;
        this.scissorBox = [0, 0, 0, 0];
        this.colorWriteMask = [true, true, true, true];
        this.unpackFlipYWebGL = false;
        this.unpackAlignment = 4;
        this.packAlignment = 4;
    }
}
class StencilState {
    enabled;
    frontFunc;
    frontFail;
    frontPassDepthFail;
    frontPassDepthPass;
    frontRef;
    frontValueMask;
    frontWriteMask;
    backFunc;
    backFail;
    backPassDepthFail;
    backPassDepthPass;
    backRef;
    backValueMask;
    backWriteMask;
    get hash() {
        return this.enabled.toString() + this.frontFunc.toString() + this.frontFail.toString() + this.frontPassDepthFail.toString() + this.frontPassDepthPass.toString() + this.frontRef.toString() + this.frontValueMask.toString() + this.frontWriteMask.toString() + this.backFunc.toString() + this.backFail.toString() + this.backPassDepthFail.toString() + this.backPassDepthPass.toString() + this.backRef.toString() + this.backValueMask.toString() + this.backWriteMask.toString();
    }
    constructor() {
        this.enabled = false;
        this.frontFunc = 'always';
        this.frontFail = 'keep';
        this.frontPassDepthFail = 'keep';
        this.frontPassDepthPass = 'keep';
        this.frontRef = 0;
        this.frontValueMask = 0x7FFFFFFF;
        this.frontWriteMask = 0x7FFFFFFF;
        this.backFunc = 'always';
        this.backFail = 'keep';
        this.backPassDepthPass = 'keep';
        this.backPassDepthFail = 'keep';
        this.backRef = 0;
        this.backValueMask = 0x7FFFFFFF;
        this.backWriteMask = 0x7FFFFFFF;
    }
}
class HydGlobalState {
    glError = WebGL2RenderingContext.NO_ERROR;
    contextAttributes;
    commonState;
    depthState = new DepthState();
    polygonState = new PolygonState();
    clearState = new ClearState();
    blendState = new BlendState();
    miscState = new MiscState();
    stencilState = new StencilState();
    textureUnits = [];
    topology = null;
    currentVertexAttribValues = Array.from({ length: 16 }, () => new Float32Array([0, 0, 0, 1]));
    defaultVertexArrayBinding = new HydVertexArray();
    defaultFramebuffer;
    __canvasView;
    device;
    __bindGroupCount = 0;
    __pipelineCount = 0;
    uniformBuffer;
    defaultSampleTextures = new Map();
    constructor(attributes, uniform, device) {
        this.contextAttributes = attributes;
        this.defaultFramebuffer = new HydFramebuffer();
        this.defaultFramebuffer.drawBuffers = [WebGL2RenderingContext.BACK];
        this.defaultFramebuffer.attachments = new Map();
        this.device = device;
        this.commonState = new CommonState(0, [0, 0, -1, -1, 0, 1], null, null, this.defaultVertexArrayBinding, this.defaultFramebuffer, this.defaultFramebuffer, null);
        this.uniformBuffer = uniform;
    }
    getDefaultSampleTexture(viewDimension) {
        let texture = this.defaultSampleTextures.get(viewDimension);
        if (!texture) {
            texture = new HydTexture(this.device);
            texture.label = `HydDefaultSampleTexture-${viewDimension}`;
            texture.ensureSampleable(viewDimension);
            this.defaultSampleTextures.set(viewDimension, texture);
        }
        return texture;
    }
    getTextureUnitBinding(textureUnit, viewDimension) {
        return this.textureUnits[textureUnit]?.[viewDimension] || null;
    }
    setTextureUnitBinding(textureUnit, viewDimension, texture) {
        let bindings = this.textureUnits[textureUnit];
        if (!bindings) {
            bindings = {};
            this.textureUnits[textureUnit] = bindings;
        }
        if (texture) {
            bindings[viewDimension] = texture;
        }
        else {
            delete bindings[viewDimension];
        }
    }
    deleteTextureBinding(texture) {
        for (const bindings of this.textureUnits) {
            if (!bindings)
                continue;
            for (const viewDimension of TEXTURE_UNIT_BINDING_ORDER) {
                if (bindings[viewDimension] === texture) {
                    delete bindings[viewDimension];
                }
            }
        }
    }
    getSamplerTexture(textureUnit, viewDimension) {
        const texture = this.getTextureUnitBinding(textureUnit, viewDimension);
        if (!texture) {
            return this.getDefaultSampleTexture(viewDimension);
        }
        texture.ensureSampleable(viewDimension);
        return texture;
    }
    getColorWriteMask() {
        const [r, g, b, a] = this.miscState.colorWriteMask;
        return (r ? GPUColorWrite.RED : 0) |
            (g ? GPUColorWrite.GREEN : 0) |
            (b ? GPUColorWrite.BLUE : 0) |
            (a ? GPUColorWrite.ALPHA : 0);
    }
    getPipelineDescriptor(topology, vertexBufferLayout) {
        const haveFragmentState = this.commonState.drawFramebufferBinding.drawBuffers.some((value) => value === WebGL2RenderingContext.BACK || (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15));
        const vertexState = {
            module: this.commonState.currentProgram.vertexModule,
            entryPoint: 'main',
            buffers: vertexBufferLayout,
        };
        const pipelineDescriptor = {
            layout: 'auto',
            vertex: vertexState,
            primitive: {
                topology: topology,
                cullMode: this.polygonState.cullFace ? this.polygonState.cullFaceMode : undefined,
                frontFace: this.polygonState.frontFace,
            },
        };
        let cacheKey = this.commonState.currentProgram.hash + this.polygonState.cullFace.toString() + this.polygonState.cullFaceMode.toString() + this.polygonState.frontFace.toString() + this.polygonState.polygonOffsetFill.toString() + this.polygonState.polygonOffsetUnits.toString() + this.polygonState.polygonOffsetFactor.toString() + this.topology.toString();
        if (haveFragmentState) {
            const blend = this.blendState.enabled ? {
                color: {
                    srcFactor: this.blendState.srcRGB,
                    dstFactor: this.blendState.dstRGB,
                    operation: this.blendState.equationRGB,
                },
                alpha: {
                    srcFactor: this.blendState.srcAlpha,
                    dstFactor: this.blendState.dstAlpha,
                    operation: this.blendState.equationAlpha,
                },
            } : undefined;
            cacheKey += this.blendState.enabled ? 'true' + this.blendState.srcRGB + this.blendState.dstRGB + this.blendState.equationRGB + this.blendState.srcAlpha + this.blendState.dstAlpha + this.blendState.equationAlpha : 'false';
            cacheKey += this.miscState.colorWriteMask.join(',');
            pipelineDescriptor.fragment = {
                module: this.commonState.currentProgram.fragmentModule,
                entryPoint: 'main',
                targets: this.commonState.drawFramebufferBinding.drawBuffers
                    .filter((value) => value === WebGL2RenderingContext.BACK || (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15))
                    .map((value) => {
                    cacheKey += value.toString();
                    if (value === WebGL2RenderingContext.BACK) {
                        return { format: 'bgra8unorm', blend, writeMask: this.getColorWriteMask() };
                    }
                    else if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                        return { format: this.commonState.drawFramebufferBinding.attachments.get(value).format, blend, writeMask: this.getColorWriteMask() };
                    }
                    else {
                        return null;
                    }
                }),
            };
        }
        if (this.depthState.enabled || this.stencilState.enabled) {
            pipelineDescriptor.depthStencil = {
                format: this.getDepthStencilAttachment().format,
                depthWriteEnabled: this.depthState.enabled && this.depthState.writeMask,
                depthCompare: this.depthState.enabled ? this.depthState.func : 'always',
                stencilFront: {
                    compare: this.stencilState.frontFunc,
                    failOp: this.stencilState.frontFail,
                    depthFailOp: this.stencilState.frontPassDepthFail,
                    passOp: this.stencilState.frontPassDepthPass,
                },
                stencilBack: {
                    compare: this.stencilState.backFunc,
                    failOp: this.stencilState.backFail,
                    depthFailOp: this.stencilState.backPassDepthFail,
                    passOp: this.stencilState.backPassDepthPass,
                },
                stencilWriteMask: this.stencilState.frontWriteMask,
                stencilReadMask: this.stencilState.frontValueMask,
                depthBias: this.polygonState.polygonOffsetFill ? this.polygonState.polygonOffsetUnits : undefined,
                depthBiasSlopeScale: this.polygonState.polygonOffsetFill ? this.polygonState.polygonOffsetFactor : undefined,
            };
            cacheKey += this.depthState.hash + this.stencilState.hash;
        }
        return [(0,dist/* default */.Ay)(cacheKey).toString(), pipelineDescriptor];
    }
    getRenderBundleEncoderDescriptor() {
        let ret = {
            colorFormats: this.commonState.drawFramebufferBinding.drawBuffers.map((value) => {
                if (value === WebGL2RenderingContext.BACK) {
                    return 'bgra8unorm';
                }
                else if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                    return this.commonState.drawFramebufferBinding.attachments.get(value).format;
                }
                else {
                    return null;
                }
            }),
        };
        if (this.depthState.enabled || this.stencilState.enabled) {
            ret['depthStencilFormat'] = this.getDepthStencilAttachment().format;
        }
        return ret;
    }
    getRenderPassDescriptorCacheKey() {
        let cacheKey = ((this.clearState.target & WebGL2RenderingContext.COLOR_BUFFER_BIT) ? 'clear' : 'load') +
            this.clearState.color[0] + this.clearState.color[1] + this.clearState.color[2] + this.clearState.color[3];
        this.commonState.drawFramebufferBinding.drawBuffers
            .forEach((value) => {
            if (value === WebGL2RenderingContext.BACK) {
                cacheKey += 'CV';
            }
            else if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                cacheKey += this.commonState.drawFramebufferBinding.attachments.get(value).view.label;
            }
            else {
                cacheKey += 'null';
            }
        });
        if (this.depthState.enabled || this.stencilState.enabled) {
            const dsa = this.getDepthStencilAttachment();
            cacheKey += '$' +
                dsa.view.label +
                (this.depthState.enabled ? ((this.clearState.target & WebGL2RenderingContext.DEPTH_BUFFER_BIT) ? 'clear' : 'load') : undefined) +
                (this.depthState.enabled ? 'store' : undefined) +
                this.clearState.depth +
                (this.stencilState.enabled ? ((this.clearState.target & WebGL2RenderingContext.STENCIL_BUFFER_BIT) ? 'clear' : 'load') : undefined) +
                (this.stencilState.enabled ? 'store' : undefined) +
                this.clearState.stencil;
        }
        return cacheKey;
    }
    getRenderPassDescriptor() {
        const renderPassDescriptor = {
            colorAttachments: this.commonState.drawFramebufferBinding.drawBuffers
                .map((value) => {
                if (value === WebGL2RenderingContext.BACK) {
                    return {
                        view: this.__canvasView,
                        label: this.__canvasView.label,
                        loadOp: (this.clearState.target & WebGL2RenderingContext.COLOR_BUFFER_BIT) ? 'clear' : 'load',
                        storeOp: 'store',
                        clearValue: this.clearState.color,
                    };
                }
                else if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                    const view = this.commonState.drawFramebufferBinding.attachments.get(value).view;
                    return {
                        view,
                        label: view.label,
                        loadOp: (this.clearState.target & WebGL2RenderingContext.COLOR_BUFFER_BIT) ? 'clear' : 'load',
                        storeOp: 'store',
                        clearValue: this.clearState.color,
                    };
                }
                else {
                    return null;
                }
            }),
        };
        if (this.depthState.enabled || this.stencilState.enabled) {
            const dsa = this.getDepthStencilAttachment();
            renderPassDescriptor.depthStencilAttachment = {
                view: dsa.view,
                depthClearValue: this.clearState.depth,
                depthLoadOp: (this.depthState.enabled ? ((this.clearState.target & WebGL2RenderingContext.DEPTH_BUFFER_BIT) ? 'clear' : 'load') : undefined),
                depthStoreOp: (this.depthState.enabled ? 'store' : undefined),
                depthReadOnly: false,
                stencilClearValue: this.clearState.stencil,
                stencilLoadOp: (this.stencilState.enabled ? ((this.clearState.target & WebGL2RenderingContext.STENCIL_BUFFER_BIT) ? 'clear' : 'load') : undefined),
                stencilStoreOp: (this.stencilState.enabled ? 'store' : undefined),
                stencilReadOnly: false,
            };
        }
        return renderPassDescriptor;
    }
    _bindGroupCache = new Map();
    _bindGroupLayoutCache = new Map();
    _pipelineLayoutCache = new Map();
    _pipelineCache = new Map();
    _currentVertexAttribBuffers = [];
    _currentVertexAttribBufferKeys = [];
    getCurrentVertexAttribBuffer(index) {
        if (!this._currentVertexAttribBuffers[index]) {
            this._currentVertexAttribBuffers[index] = this.device.createBuffer({
                label: `currentVertexAttrib${index}`,
                size: CURRENT_VERTEX_ATTRIB_BUFFER_ELEMENTS * 16,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            });
        }
        const values = this.currentVertexAttribValues[index] || this.currentVertexAttribValues[0];
        const key = `${index}:${values[0]},${values[1]},${values[2]},${values[3]}`;
        if (this._currentVertexAttribBufferKeys[index] !== key) {
            const repeated = new Float32Array(CURRENT_VERTEX_ATTRIB_BUFFER_ELEMENTS * 4);
            for (let i = 0; i < CURRENT_VERTEX_ATTRIB_BUFFER_ELEMENTS; i++) {
                repeated[i * 4] = values[0];
                repeated[i * 4 + 1] = values[1];
                repeated[i * 4 + 2] = values[2];
                repeated[i * 4 + 3] = values[3];
            }
            this.device.queue.writeBuffer(this._currentVertexAttribBuffers[index], 0, repeated.buffer, repeated.byteOffset, repeated.byteLength);
            this._currentVertexAttribBufferKeys[index] = key;
        }
        return [this._currentVertexAttribBuffers[index], key];
    }
    getPBV() {
        const [vertexBufferHashes, vertexBuffers, vertexBufferOffsets, vertexBufferLayoutHash, vertexBufferLayout] = this.getVertexBuffer();
        const [bindGroupHash, bindGroupEntries, bindGroupLayoutHash, bindGroupLayoutEntries, bindGroupTextures] = this.getBindGroup();
        const pipelineLayoutHash = bindGroupLayoutHash;
        const [_pipelineHash, pipelineDescriptor] = this.getPipelineDescriptor(this.topology, vertexBufferLayout);
        const pipelineHash = _pipelineHash + '|' + bindGroupLayoutHash + '|' + vertexBufferLayoutHash;
        let bindGroupLayout = this._bindGroupLayoutCache.get(bindGroupLayoutHash);
        if (!bindGroupLayout) {
            bindGroupLayout = this.device.createBindGroupLayout({
                entries: bindGroupLayoutEntries,
            });
            this._bindGroupLayoutCache.set(bindGroupLayoutHash, bindGroupLayout);
        }
        pipelineDescriptor.layout = this._pipelineLayoutCache.get(pipelineLayoutHash);
        if (!pipelineDescriptor.layout) {
            pipelineDescriptor.layout = this.device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout],
                label: 'pipelineLayout' + pipelineDescriptor.label,
            });
            this._pipelineLayoutCache.set(pipelineLayoutHash, pipelineDescriptor.layout);
        }
        let pipeline = this._pipelineCache.get(pipelineHash);
        if (!pipeline) {
            console.log('[HYD] create Pipeline');
            pipelineDescriptor.label = 'ppl' + this.__pipelineCount++;
            pipeline = this.device.createRenderPipeline(pipelineDescriptor);
            this._pipelineCache.set(pipelineHash, pipeline);
        }
        let bindGroup = this._bindGroupCache.get(bindGroupHash);
        if (!bindGroup) {
            console.log('[HYD] create BindGroup');
            bindGroup = this.device.createBindGroup({
                layout: bindGroupLayout,
                entries: bindGroupEntries,
                label: "bg" + this.__bindGroupCount++,
            });
            this._bindGroupCache.set(bindGroupHash, bindGroup);
            for (const textureAttachment of bindGroupTextures) {
                textureAttachment.onDestroy.push(() => {
                    const cachedBindGroup = this._bindGroupCache.get(bindGroupHash);
                    if (cachedBindGroup) {
                        if (typeof cachedBindGroup.onDestroy === 'function') {
                            cachedBindGroup.onDestroy();
                        }
                        this._bindGroupCache.delete(bindGroupHash);
                    }
                });
            }
        }
        const vertexBuffersHash = (0,dist/* default */.Ay)(vertexBufferHashes.join('%')).toString();
        return {
            pipelineHash,
            pipeline,
            bindGroupHash,
            bindGroup,
            vertexBuffersHash,
            vertexBufferHashes,
            vertexBuffers,
            vertexBufferOffsets,
            renderPassHash: (0,dist/* default */.Ay)(this.getRenderPassDescriptorCacheKey()).toString(),
            renderBundleEncoderDescriptor: this.getRenderBundleEncoderDescriptor(),
        };
    }
    getDepthStencilAttachment() {
        if (this.depthState.enabled && this.stencilState.enabled) {
            const attachment = this.commonState.drawFramebufferBinding.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT);
            return { view: attachment.view, format: attachment.format };
        }
        if (this.depthState.enabled) {
            const attachment = this.commonState.drawFramebufferBinding.attachments.get(WebGL2RenderingContext.DEPTH_ATTACHMENT);
            return { view: attachment.view, format: attachment.format };
        }
        if (this.stencilState.enabled) {
            const attachment = this.commonState.drawFramebufferBinding.attachments.get(WebGL2RenderingContext.STENCIL_ATTACHMENT);
            return { view: attachment.view, format: attachment.format };
        }
        throw new Error("getDepthStencilAttachment failed");
    }
    getBindGroup() {
        const program = this.commonState.currentProgram;
        const bindGroupEntry = [];
        const bindGroupLayoutEntry = [];
        const textureAttachments = [];
        if (program.alignedUniformSize > 0) {
            bindGroupEntry.push({
                binding: 0,
                resource: {
                    buffer: this.uniformBuffer,
                    size: program.alignedUniformSize,
                    label: 'ub' + program.hash,
                },
            });
            bindGroupLayoutEntry.push({
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: {
                    type: 'uniform',
                    hasDynamicOffset: true,
                    minBindingSize: program.alignedUniformSize,
                },
            });
        }
        let bindGroupKey = program.hash;
        let bindGroupLayoutKey = '0-du-' + program.alignedUniformSize;
        for (const sampler of program.hydSamplers) {
            const textureAttachment = this.getSamplerTexture(sampler.textureUnit, sampler.viewDimension);
            textureAttachments.push(textureAttachment);
            bindGroupLayoutEntry.push({
                binding: bindGroupLayoutEntry.length,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: {
                    type: textureAttachment.isDepthStencil ? 'non-filtering' : 'filtering',
                },
            });
            bindGroupLayoutEntry.push({
                binding: bindGroupLayoutEntry.length,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: textureAttachment.isDepthStencil ? 'unfilterable-float' : 'float',
                    viewDimension: sampler.viewDimension,
                    multisampled: false,
                },
            });
            bindGroupLayoutKey += bindGroupLayoutEntry.length + '-t-' + textureAttachment.isDepthStencil + sampler.viewDimension;
            bindGroupEntry.push({
                binding: bindGroupEntry.length,
                resource: textureAttachment.sampler,
            });
            bindGroupEntry.push({
                binding: bindGroupEntry.length,
                resource: textureAttachment.view,
            });
            bindGroupKey += textureAttachment.hash;
        }
        return [(0,dist/* default */.Ay)(bindGroupKey).toString(), bindGroupEntry, bindGroupLayoutKey, bindGroupLayoutEntry, textureAttachments];
    }
    getVertexBuffer() {
        const bufferAttributeMap = new Map();
        const vao = this.commonState.vertexArrayBinding;
        const activeAttributeLocations = this.commonState.currentProgram.hydAttributeLocations;
        const buffers = [];
        const layouts = [];
        const offsets = [];
        const vbKeys = [];
        for (let location = 0; location < vao.attributes.length; location++) {
            if (!activeAttributeLocations.has(location))
                continue;
            const attribute = vao.attributes[location];
            if (attribute.enabled) {
                if (!attribute.buffer) {
                    this.glError = WebGL2RenderingContext.INVALID_OPERATION;
                    return;
                }
                const stepMode = attribute.divisor > 0 ? 'instance' : 'vertex';
                let hash = attribute.buffer.hash + '|' + attribute.stride + '|' + stepMode + '|' + Math.floor(attribute.offset / 2048);
                if (bufferAttributeMap.has(hash)) {
                    bufferAttributeMap.get(hash)[3].push({
                        shaderLocation: attribute.shaderLocation,
                        offset: attribute.offset,
                        format: attribute.format,
                    });
                }
                else {
                    bufferAttributeMap.set(hash, [attribute.buffer.buffer, attribute.stride, stepMode, [{
                                shaderLocation: attribute.shaderLocation,
                                offset: attribute.offset,
                                format: attribute.format,
                            }]]);
                }
            }
        }
        for (const programAttribute of this.commonState.currentProgram.hydAttributes) {
            const location = programAttribute.location;
            const attribute = vao.attributes[location];
            if (attribute && !attribute.enabled) {
                const [buffer, key] = this.getCurrentVertexAttribBuffer(location);
                const hash = `current-vertex-attrib-${key}`;
                bufferAttributeMap.set(hash, [buffer, 16, 'instance', [{
                            shaderLocation: location,
                            offset: 0,
                            format: programAttributeTypeToVertexFormat(programAttribute.type),
                        }]]);
            }
        }
        let layoutKey = '';
        for (const [bufferHash, [buffer, arrayStride, stepMode, attributes]] of bufferAttributeMap) {
            buffers.push(buffer);
            const offset = Math.min.apply(null, attributes.map(a => a.offset));
            for (let i = 0; i < attributes.length; i++) {
                attributes[i].offset -= offset;
            }
            offsets.push(offset);
            layouts.push({
                arrayStride,
                attributes,
                stepMode,
            });
            layoutKey += attributes.toString() + arrayStride + stepMode + '|';
            vbKeys.push(bufferHash + '|' + offset);
        }
        return [vbKeys, buffers, offsets, layoutKey, layouts];
    }
}
class HydHashPbv {
    hash;
    generated = false;
    pipelineHash = null;
    bindGroupHash = null;
    vertexBuffersHash = null;
    vertexBufferHashes = null;
    pipeline = null;
    bindGroup = null;
    vertexBuffers = null;
    vertexBufferOffsets = null;
    renderBundleEncoderDescriptor = null;
    renderPassHash = null;
    jumpTable = new Map();
    __last_visit_hash = null;
    __last_visit_pbv = null;
    constructor(hash) {
        this.hash = hash;
    }
}
class HydGlobalStateHashed extends HydGlobalState {
    _hashPbvCur = new HydHashPbv(null);
    _hashPbvCache = new Map();
    recordTransition(glFunc, ...glArgs) {
        this.recordTransitionOne(glFunc + '$' + glArgs.join(','));
    }
    recordTransitionOne(glOpHash) {
        if (glOpHash === this._hashPbvCur.__last_visit_hash) {
            this._hashPbvCur = this._hashPbvCur.__last_visit_pbv;
            return;
        }
        let jumpToHashPbv;
        if (!(jumpToHashPbv = this._hashPbvCur.jumpTable.get(glOpHash))) {
            const newHash = this.hash;
            if (!this._hashPbvCache.has(newHash)) {
                jumpToHashPbv = new HydHashPbv(newHash);
                this._hashPbvCache.set(newHash, jumpToHashPbv);
            }
            else {
                jumpToHashPbv = this._hashPbvCache.get(newHash);
            }
            this._hashPbvCur.jumpTable.set(glOpHash, jumpToHashPbv);
        }
        this._hashPbvCur.__last_visit_hash = glOpHash;
        this._hashPbvCur.__last_visit_pbv = jumpToHashPbv;
        this._hashPbvCur = jumpToHashPbv;
    }
    get hash() {
        const textureUnitHash = this.textureUnits.map((bindings) => {
            if (!bindings)
                return "null";
            return TEXTURE_UNIT_BINDING_ORDER
                .map((viewDimension) => `${viewDimension}:${bindings[viewDimension]?.hash || "null"}`)
                .join(',');
        }).join('|');
        return this.commonState.hash
            + this.depthState.hash
            + this.polygonState.hash
            + this.clearState.hash
            + this.blendState.hash
            + this.miscState.hash
            + this.stencilState.hash
            + textureUnitHash
            + this.clearState.target.toString()
            + this.topology;
    }
    getPBV() {
        const pbv = this._hashPbvCur;
        if (!pbv.generated) {
            Object.assign(pbv, super.getPBV());
            pbv.generated = true;
            pbv.bindGroup.onDestroy = () => {
                pbv.generated = false;
            };
        }
        return pbv;
    }
}

;// ./src/components/hydConstants.ts
const vertexFormatList = [
    [WebGL2RenderingContext.FLOAT, 1, undefined, 'float32'],
    [WebGL2RenderingContext.FLOAT, 2, undefined, 'float32x2'],
    [WebGL2RenderingContext.FLOAT, 3, undefined, 'float32x3'],
    [WebGL2RenderingContext.FLOAT, 4, undefined, 'float32x4'],
    [WebGL2RenderingContext.HALF_FLOAT, 2, undefined, 'float16x2'],
    [WebGL2RenderingContext.HALF_FLOAT, 4, undefined, 'float16x4'],
    [WebGL2RenderingContext.BYTE, 2, false, 'sint8x2'],
    [WebGL2RenderingContext.BYTE, 4, false, 'sint8x4'],
    [WebGL2RenderingContext.UNSIGNED_BYTE, 2, false, 'uint8x2'],
    [WebGL2RenderingContext.UNSIGNED_BYTE, 4, false, 'uint8x4'],
    [WebGL2RenderingContext.SHORT, 2, false, 'sint16x2'],
    [WebGL2RenderingContext.SHORT, 4, false, 'sint16x4'],
    [WebGL2RenderingContext.UNSIGNED_SHORT, 2, false, 'uint16x2'],
    [WebGL2RenderingContext.UNSIGNED_SHORT, 4, false, 'uint16x4'],
    [WebGL2RenderingContext.INT, 1, false, 'sint32'],
    [WebGL2RenderingContext.INT, 2, false, 'sint32x2'],
    [WebGL2RenderingContext.INT, 3, false, 'sint32x3'],
    [WebGL2RenderingContext.INT, 4, false, 'sint32x4'],
    [WebGL2RenderingContext.UNSIGNED_INT, 1, false, 'uint32'],
    [WebGL2RenderingContext.UNSIGNED_INT, 2, false, 'uint32x2'],
    [WebGL2RenderingContext.UNSIGNED_INT, 3, false, 'uint32x3'],
    [WebGL2RenderingContext.UNSIGNED_INT, 4, false, 'uint32x4'],
    [WebGL2RenderingContext.BYTE, 2, true, 'snorm8x2'],
    [WebGL2RenderingContext.BYTE, 4, true, 'snorm8x4'],
    [WebGL2RenderingContext.UNSIGNED_BYTE, 2, true, 'unorm8x2'],
    [WebGL2RenderingContext.UNSIGNED_BYTE, 4, true, 'unorm8x4'],
    [WebGL2RenderingContext.SHORT, 2, true, 'snorm16x2'],
    [WebGL2RenderingContext.SHORT, 4, true, 'snorm16x4'],
    [WebGL2RenderingContext.UNSIGNED_SHORT, 2, true, 'unorm16x2'],
    [WebGL2RenderingContext.UNSIGNED_SHORT, 4, true, 'unorm16x4'],
];
const enumToCullFace = new Map([
    [WebGL2RenderingContext.FRONT, 'front'],
    [WebGL2RenderingContext.BACK, 'back'],
    [WebGL2RenderingContext.FRONT_AND_BACK, 'none'],
]);
const enumToFrontFace = new Map([
    [WebGL2RenderingContext.CW, 'cw'],
    [WebGL2RenderingContext.CCW, 'ccw'],
]);
const enumToViewDimension = new Map([
    [WebGL2RenderingContext.TEXTURE_2D, '2d'],
    [WebGL2RenderingContext.TEXTURE_2D_ARRAY, '2d-array'],
    [WebGL2RenderingContext.TEXTURE_3D, '3d'],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP, 'cube'],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X, 'cube'],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_X, 'cube'],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Y, 'cube'],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Y, 'cube'],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Z, 'cube'],
    [WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z, 'cube'],
]);
const enumToConstant = new Map([
    [WebGL2RenderingContext.MAX_COMBINED_TEXTURE_IMAGE_UNITS, 16],
    [WebGL2RenderingContext.MAX_CUBE_MAP_TEXTURE_SIZE, 4096],
    [WebGL2RenderingContext.MAX_FRAGMENT_UNIFORM_VECTORS, 1024],
    [WebGL2RenderingContext.MAX_RENDERBUFFER_SIZE, 4096],
    [WebGL2RenderingContext.MAX_TEXTURE_IMAGE_UNITS, 16],
    [WebGL2RenderingContext.MAX_TEXTURE_SIZE, 4096],
    [WebGL2RenderingContext.MAX_VARYING_VECTORS, 32],
    [WebGL2RenderingContext.MAX_VERTEX_ATTRIBS, 16],
    [WebGL2RenderingContext.MAX_VERTEX_TEXTURE_IMAGE_UNITS, 16],
    [WebGL2RenderingContext.MAX_VERTEX_UNIFORM_VECTORS, 1024],
    [WebGL2RenderingContext.MAX_VIEWPORT_DIMS, [4096, 4096]],
    [WebGL2RenderingContext.MAX_3D_TEXTURE_SIZE, 256],
    [WebGL2RenderingContext.MAX_ARRAY_TEXTURE_LAYERS, 256],
    [WebGL2RenderingContext.MAX_CLIENT_WAIT_TIMEOUT_WEBGL, 0],
    [WebGL2RenderingContext.MAX_COLOR_ATTACHMENTS, 4],
    [WebGL2RenderingContext.MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS, 65536],
    [WebGL2RenderingContext.MAX_COMBINED_UNIFORM_BLOCKS, 72],
    [WebGL2RenderingContext.MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS, 65536],
    [WebGL2RenderingContext.MAX_DRAW_BUFFERS, 4],
    [WebGL2RenderingContext.MAX_ELEMENT_INDEX, 4294967295],
    [WebGL2RenderingContext.MAX_ELEMENTS_INDICES, 4294967295],
    [WebGL2RenderingContext.MAX_ELEMENTS_VERTICES, 1048576],
    [WebGL2RenderingContext.MAX_FRAGMENT_INPUT_COMPONENTS, 128],
    [WebGL2RenderingContext.MAX_FRAGMENT_UNIFORM_BLOCKS, 12],
    [WebGL2RenderingContext.MAX_FRAGMENT_UNIFORM_COMPONENTS, 4096],
    [WebGL2RenderingContext.MAX_PROGRAM_TEXEL_OFFSET, 7],
    [WebGL2RenderingContext.MAX_SAMPLES, 4],
    [WebGL2RenderingContext.MAX_SERVER_WAIT_TIMEOUT, 0],
    [WebGL2RenderingContext.MAX_TEXTURE_LOD_BIAS, 16],
    [WebGL2RenderingContext.MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS, 64],
    [WebGL2RenderingContext.MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS, 4],
    [WebGL2RenderingContext.MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS, 4],
    [WebGL2RenderingContext.MAX_UNIFORM_BLOCK_SIZE, 16384],
    [WebGL2RenderingContext.MAX_UNIFORM_BUFFER_BINDINGS, 72],
    [WebGL2RenderingContext.MAX_VARYING_COMPONENTS, 60],
    [WebGL2RenderingContext.MAX_VERTEX_OUTPUT_COMPONENTS, 64],
    [WebGL2RenderingContext.MAX_VERTEX_UNIFORM_BLOCKS, 12],
    [WebGL2RenderingContext.MAX_VERTEX_UNIFORM_COMPONENTS, 4096],
    [WebGL2RenderingContext.VERSION, "WebGL 2.0 (OpenGL ES 3.0 Chromium)"],
]);
const enumToIndexFormat = new Map([
    [WebGL2RenderingContext.UNSIGNED_SHORT, 'uint16'],
    [WebGL2RenderingContext.UNSIGNED_INT, 'uint32'],
]);
const indexEnumToBytes = new Map([
    [WebGL2RenderingContext.UNSIGNED_SHORT, 2],
    [WebGL2RenderingContext.UNSIGNED_INT, 4],
]);
const enum2PT = ["point-list", "line-list", undefined, "line-strip", "triangle-list", "triangle-strip", undefined];
const enumToBlendFactors = new Map([
    [WebGL2RenderingContext.ZERO, 'zero'],
    [WebGL2RenderingContext.ONE, 'one'],
    [WebGL2RenderingContext.SRC_COLOR, 'src'],
    [WebGL2RenderingContext.ONE_MINUS_SRC_COLOR, 'one-minus-src'],
    [WebGL2RenderingContext.DST_COLOR, 'dst'],
    [WebGL2RenderingContext.ONE_MINUS_DST_COLOR, 'one-minus-dst'],
    [WebGL2RenderingContext.SRC_ALPHA, 'src-alpha'],
    [WebGL2RenderingContext.ONE_MINUS_SRC_ALPHA, 'one-minus-src-alpha'],
    [WebGL2RenderingContext.DST_ALPHA, 'dst-alpha'],
    [WebGL2RenderingContext.ONE_MINUS_DST_ALPHA, 'one-minus-dst-alpha'],
    [WebGL2RenderingContext.CONSTANT_COLOR, 'constant'],
    [WebGL2RenderingContext.ONE_MINUS_CONSTANT_COLOR, 'one-minus-constant'],
    [WebGL2RenderingContext.CONSTANT_ALPHA, 'constant'],
    [WebGL2RenderingContext.ONE_MINUS_CONSTANT_ALPHA, 'one-minus-constant'],
    [WebGL2RenderingContext.SRC_ALPHA_SATURATE, 'src-alpha-saturated'],
]);
const enumToCompareFunction = new Map([
    [WebGL2RenderingContext.NEVER, 'never'],
    [WebGL2RenderingContext.LESS, 'less'],
    [WebGL2RenderingContext.EQUAL, 'equal'],
    [WebGL2RenderingContext.LEQUAL, 'less-equal'],
    [WebGL2RenderingContext.GREATER, 'greater'],
    [WebGL2RenderingContext.NOTEQUAL, 'not-equal'],
    [WebGL2RenderingContext.GEQUAL, 'greater-equal'],
    [WebGL2RenderingContext.ALWAYS, 'always'],
]);
const enumToBlendOperations = new Map([
    [WebGL2RenderingContext.FUNC_ADD, 'add'],
    [WebGL2RenderingContext.FUNC_SUBTRACT, 'subtract'],
    [WebGL2RenderingContext.FUNC_REVERSE_SUBTRACT, 'reverse-subtract'],
    [WebGL2RenderingContext.MIN, 'min'],
    [WebGL2RenderingContext.MAX, 'max'],
]);
const enumToStencilOperation = new Map([
    [WebGL2RenderingContext.KEEP, 'keep'],
    [WebGL2RenderingContext.ZERO, 'zero'],
    [WebGL2RenderingContext.REPLACE, 'replace'],
    [WebGL2RenderingContext.INCR, 'increment-clamp'],
    [WebGL2RenderingContext.DECR, 'decrement-clamp'],
    [WebGL2RenderingContext.INVERT, 'invert'],
    [WebGL2RenderingContext.INCR_WRAP, 'increment-wrap'],
    [WebGL2RenderingContext.DECR_WRAP, 'decrement-wrap'],
]);
function getVertexFormat(type, size, normalized) {
    const result = vertexFormatList.find(([t, s, n]) => t === type && s === size && (n === undefined || n === normalized));
    if (result) {
        return result[3];
    }
    throw new Error(`Unsupported vertex format: ${type}, ${size}, ${normalized}`);
}

;// ./src/components/shaderDB.ts



function samplerFlipYUniformName(samplerName) {
    return `_hyd_samplerFlipY_${samplerName}`;
}
const Type2Constant = new Map([
    ["float", WebGL2RenderingContext.FLOAT],
    ["int", WebGL2RenderingContext.INT],
    ["uint", WebGL2RenderingContext.UNSIGNED_INT],
    ["bool", WebGL2RenderingContext.BOOL],
    ["vec2", WebGL2RenderingContext.FLOAT_VEC2],
    ["vec3", WebGL2RenderingContext.FLOAT_VEC3],
    ["vec4", WebGL2RenderingContext.FLOAT_VEC4],
    ["ivec2", WebGL2RenderingContext.INT_VEC2],
    ["ivec3", WebGL2RenderingContext.INT_VEC3],
    ["ivec4", WebGL2RenderingContext.INT_VEC4],
    ["uvec2", WebGL2RenderingContext.UNSIGNED_INT_VEC2],
    ["uvec3", WebGL2RenderingContext.UNSIGNED_INT_VEC3],
    ["uvec4", WebGL2RenderingContext.UNSIGNED_INT_VEC4],
    ["bvec2", WebGL2RenderingContext.BOOL_VEC2],
    ["bvec3", WebGL2RenderingContext.BOOL_VEC3],
    ["bvec4", WebGL2RenderingContext.BOOL_VEC4],
    ["mat2", WebGL2RenderingContext.FLOAT_MAT2],
    ["mat3", WebGL2RenderingContext.FLOAT_MAT3],
    ["mat4", WebGL2RenderingContext.FLOAT_MAT4],
    ["mat2x3", WebGL2RenderingContext.FLOAT_MAT2x3],
    ["mat2x4", WebGL2RenderingContext.FLOAT_MAT2x4],
    ["mat3x2", WebGL2RenderingContext.FLOAT_MAT3x2],
    ["mat3x4", WebGL2RenderingContext.FLOAT_MAT3x4],
    ["mat4x2", WebGL2RenderingContext.FLOAT_MAT4x2],
    ["mat4x3", WebGL2RenderingContext.FLOAT_MAT4x3],
    ["sampler2D", WebGL2RenderingContext.SAMPLER_2D],
    ["samplerCube", WebGL2RenderingContext.SAMPLER_CUBE],
    ["sampler2DArray", WebGL2RenderingContext.SAMPLER_2D_ARRAY],
    ["sampler3D", WebGL2RenderingContext.SAMPLER_3D],
]);
function MergeShaderInfo(shaderInfo) {
    let uniformMap = new Map();
    let samplerMap = new Map();
    for (const info of shaderInfo) {
        for (const uniform of info.uniforms) {
            if (uniformMap.has(uniform.name)) {
                if (uniformMap.get(uniform.name).glsl_type !== uniform.glsl_type) {
                    throw new Error(`uniform ${uniform.name} type conflict`);
                }
            }
            else {
                uniformMap.set(uniform.name, uniform);
            }
        }
        for (const sampler of info.samplers) {
            if (samplerMap.has(sampler.name)) {
                if (samplerMap.get(sampler.name).glsl_type !== sampler.glsl_type) {
                    throw new Error(`sampler ${sampler.name} type conflict`);
                }
            }
            else {
                samplerMap.set(sampler.name, sampler);
            }
        }
    }
    return {
        attributes: shaderInfo[0].attributes,
        uniforms: Array.from(uniformMap).map((pair) => pair[1]),
        samplers: Array.from(samplerMap).map((pair) => pair[1]),
    };
}
function ShaderInfo2HydAus(shaderInfo) {
    return {
        attributes: shaderInfo.attributes.map((attr, idx) => {
            return {
                name: attr.name,
                location: idx,
                type: Type2Constant.get(attr.glsl_type),
                size: 1,
            };
        }),
        uniforms: shaderInfo.uniforms.map((uniform) => {
            return new ProgramUniformBuffer(uniform.name, Type2Constant.get(uniform.glsl_type), 1, !!uniform.internal);
        }),
        samplers: shaderInfo.samplers.map((sampler) => {
            switch (sampler.wgsl_texture_type) {
                case "texture_2d<f32>":
                    return new ProgramUniformSampler(sampler.name, WebGL2RenderingContext.SAMPLER_2D, "2d");
                case "texture_cube<f32>":
                    return new ProgramUniformSampler(sampler.name, WebGL2RenderingContext.SAMPLER_CUBE, "cube");
                case "texture_2d_array<f32>":
                    return new ProgramUniformSampler(sampler.name, WebGL2RenderingContext.SAMPLER_2D_ARRAY, "2d-array");
                case "texture_3d<f32>":
                    return new ProgramUniformSampler(sampler.name, WebGL2RenderingContext.SAMPLER_3D, "3d");
                default:
                    throw new Error(`unknown sampler type ${sampler.wgsl_texture_type}`);
            }
        }),
    };
}
function ShaderInfo2String(shaderInfo) {
    let res = "";
    let offset = 0;
    if (shaderInfo.uniforms.length > 0) {
        res += "struct HydUniformObject {\n";
        for (const uniform of shaderInfo.uniforms) {
            res += `  ${uniform.name}: ${uniform.wgsl_type},\n`;
        }
        res += "};\n\n";
        res += "@binding(0) @group(0) var<uniform> _hyd_uniforms_ : HydUniformObject;\n\n";
        offset = 1;
    }
    for (let i = 0; i < shaderInfo.samplers.length; i++) {
        const sampler = shaderInfo.samplers[i];
        res += `@binding(${i * 2 + offset + 0}) @group(0) var ${sampler.name}S: ${sampler.wgsl_sampler_type};\n`;
        res += `@binding(${i * 2 + offset + 1}) @group(0) var ${sampler.name}T: ${sampler.wgsl_texture_type};\n`;
    }
    return res;
}

;// ./src/components/shaderCapture.ts

function countMatches(source, pattern) {
    pattern.lastIndex = 0;
    let count = 0;
    while (pattern.exec(source) !== null) {
        count++;
    }
    return count;
}
function stableHashString(source) {
    return (0,dist/* default */.Ay)(source).toString();
}
function stableHashU32(words) {
    let hash = 2166136261;
    for (let i = 0; i < words.length; i++) {
        let word = words[i] >>> 0;
        for (let j = 0; j < 4; j++) {
            hash ^= word & 0xff;
            hash = Math.imul(hash, 16777619) >>> 0;
            word >>>= 8;
        }
    }
    return hash.toString(16).padStart(8, "0");
}
function sourceCapture(code, includeStats = true) {
    return {
        code,
        hash: stableHashString(code),
        stats: includeStats ? computeShaderShapeStats(code) : undefined,
    };
}
function computeShaderShapeStats(source) {
    const lines = source.length === 0 ? 0 : source.split(/\r\n|\r|\n/).length;
    return {
        bytes: source.length,
        lines,
        varPrivate: countMatches(source, /\bvar<\s*private\s*>/g),
        varFunction: countMatches(source, /\bvar<\s*function\s*>/g),
        varUniform: countMatches(source, /\bvar<\s*uniform\s*>/g),
        functions: countMatches(source, /\bfn\s+[A-Za-z_]\w*\s*\(/g),
        entrypoints: countMatches(source, /@(vertex|fragment|compute)\b/g),
        structs: countMatches(source, /\bstruct\s+[A-Za-z_]\w*\s*\{/g),
        bindings: countMatches(source, /@binding\s*\(/g),
        locations: countMatches(source, /@location\s*\(/g),
        lets: countMatches(source, /\blet\s+[A-Za-z_]\w*\b/g),
        tempLets: countMatches(source, /\blet\s+x_\d+\b/g),
        assignments: countMatches(source, /(?:^|[;\n]\s*)[A-Za-z_]\w*(?:\s*(?:\.|->)\s*[A-Za-z_]\w*|\s*\[[^\]]+\])*\s*=(?!=)/g),
        storeLikeAssignments: countMatches(source, /(?:^|[;\n]\s*)(?:[A-Za-z_]\w*(?:\s*(?:\.|->)\s*[A-Za-z_]\w*|\s*\[[^\]]+\])*)\s*=(?!=)/g),
        vectorConstructors: countMatches(source, /\bvec[234](?:[fiu]|<[^>]+>)?\s*\(/g),
        matrixConstructors: countMatches(source, /\bmat[234](?:x[234])?(?:<[^>]+>)?\s*\(/g),
        swizzles: countMatches(source, /\.\s*[xyzwrgba]{1,4}\b/g),
        textureSample: countMatches(source, /\btextureSample\s*\(/g),
        textureSampleLevel: countMatches(source, /\btextureSampleLevel\s*\(/g),
        textureSampleBias: countMatches(source, /\btextureSampleBias\s*\(/g),
        textureSampleGrad: countMatches(source, /\btextureSampleGrad\s*\(/g),
        textureLoad: countMatches(source, /\btextureLoad\s*\(/g),
        selects: countMatches(source, /\bselect\s*\(/g),
        ifs: countMatches(source, /\bif\s*\(/g),
        loops: countMatches(source, /\b(for|while|loop)\b/g),
        powCalls: countMatches(source, /\bpow\s*\(/g),
        sinCalls: countMatches(source, /\bsin\s*\(/g),
        cosCalls: countMatches(source, /\bcos\s*\(/g),
        pointerLike: countMatches(source, /\bptr\s*</g) + countMatches(source, /(?:^|[^\w])&\s*[A-Za-z_]\w*/g),
    };
}
function emitShaderCapture(record) {
    if (typeof window === "undefined" || typeof window.__HYD_SHADER_CAPTURE !== "function") {
        return;
    }
    try {
        window.__HYD_SHADER_CAPTURE(record);
    }
    catch (error) {
        console.warn("[HYD] shader capture hook failed:", error);
    }
}

;// ./src/components/hydProgram.ts



const ALIGNMENT_BLOCK_SIZE = 256;
const glSizeToBytes = new Map([
    [WebGL2RenderingContext.FLOAT, 4],
    [WebGL2RenderingContext.INT, 4],
    [WebGL2RenderingContext.UNSIGNED_INT, 4],
    [WebGL2RenderingContext.BOOL, 4],
    [WebGL2RenderingContext.FLOAT_VEC2, 2 * 4],
    [WebGL2RenderingContext.FLOAT_VEC3, 3 * 4],
    [WebGL2RenderingContext.FLOAT_VEC4, 4 * 4],
    [WebGL2RenderingContext.INT_VEC2, 2 * 4],
    [WebGL2RenderingContext.INT_VEC3, 3 * 4],
    [WebGL2RenderingContext.INT_VEC4, 4 * 4],
    [WebGL2RenderingContext.UNSIGNED_INT_VEC2, 2 * 4],
    [WebGL2RenderingContext.UNSIGNED_INT_VEC3, 3 * 4],
    [WebGL2RenderingContext.UNSIGNED_INT_VEC4, 4 * 4],
    [WebGL2RenderingContext.BOOL_VEC2, 2 * 4],
    [WebGL2RenderingContext.BOOL_VEC3, 3 * 4],
    [WebGL2RenderingContext.BOOL_VEC4, 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT2, 2 * 2 * 4],
    [WebGL2RenderingContext.FLOAT_MAT3, 3 * 3 * 4],
    [WebGL2RenderingContext.FLOAT_MAT4, 4 * 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT2x3, 2 * 3 * 4],
    [WebGL2RenderingContext.FLOAT_MAT2x4, 2 * 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT3x2, 3 * 2 * 4],
    [WebGL2RenderingContext.FLOAT_MAT3x4, 3 * 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT4x2, 4 * 2 * 4],
    [WebGL2RenderingContext.FLOAT_MAT4x3, 4 * 3 * 4],
]);
const glSizeToAlignedBytes = new Map([
    [WebGL2RenderingContext.FLOAT, 4],
    [WebGL2RenderingContext.INT, 4],
    [WebGL2RenderingContext.UNSIGNED_INT, 4],
    [WebGL2RenderingContext.BOOL, 4],
    [WebGL2RenderingContext.FLOAT_VEC2, 2 * 4],
    [WebGL2RenderingContext.FLOAT_VEC3, 4 * 4],
    [WebGL2RenderingContext.FLOAT_VEC4, 4 * 4],
    [WebGL2RenderingContext.INT_VEC2, 2 * 4],
    [WebGL2RenderingContext.INT_VEC3, 4 * 4],
    [WebGL2RenderingContext.INT_VEC4, 4 * 4],
    [WebGL2RenderingContext.UNSIGNED_INT_VEC2, 2 * 4],
    [WebGL2RenderingContext.UNSIGNED_INT_VEC3, 4 * 4],
    [WebGL2RenderingContext.UNSIGNED_INT_VEC4, 4 * 4],
    [WebGL2RenderingContext.BOOL_VEC2, 2 * 4],
    [WebGL2RenderingContext.BOOL_VEC3, 4 * 4],
    [WebGL2RenderingContext.BOOL_VEC4, 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT2, 2 * 4],
    [WebGL2RenderingContext.FLOAT_MAT3, 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT4, 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT2x3, 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT2x4, 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT3x2, 2 * 4],
    [WebGL2RenderingContext.FLOAT_MAT3x4, 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT4x2, 2 * 4],
    [WebGL2RenderingContext.FLOAT_MAT4x3, 4 * 4],
]);
class ProgramUniformBuffer {
    name;
    size;
    webgl_type;
    offset;
    byteLength;
    alignedByteLength;
    internal;
    dataView;
    float32View;
    int32View;
    wordOffset;
    constructor(name, type, size, internal = false) {
        this.name = name;
        this.size = size;
        this.webgl_type = type;
        this.internal = internal;
        this.byteLength = glSizeToBytes.get(type);
        this.alignedByteLength = glSizeToAlignedBytes.get(type);
    }
}
class ProgramUniformSampler {
    name;
    size;
    webgl_type;
    textureUnit;
    viewDimension;
    originFlipUniform;
    originFlipValue;
    constructor(name, webgl_type, viewDimension) {
        this.name = name;
        this.size = 1;
        this.webgl_type = webgl_type;
        this.textureUnit = 0;
        this.viewDimension = viewDimension;
    }
}
function cloneShaderInfo(info) {
    return {
        attributes: info.attributes.map((attribute) => ({ ...attribute })),
        uniforms: info.uniforms.map((uniform) => ({ ...uniform })),
        samplers: info.samplers.map((sampler) => ({ ...sampler })),
    };
}
function addSamplerFlipUniforms(info) {
    for (const sampler of info.samplers) {
        if (sampler.glsl_type !== "sampler2D") {
            continue;
        }
        const name = samplerFlipYUniformName(sampler.name);
        if (!info.uniforms.some((uniform) => uniform.name === name)) {
            info.uniforms.push({
                name,
                glsl_type: "float",
                wgsl_type: "f32",
                internal: true,
            });
        }
    }
}
function findMatchingParen(source, openIndex) {
    let depth = 0;
    for (let i = openIndex; i < source.length; i++) {
        const ch = source[i];
        if (ch === "(") {
            depth++;
        }
        else if (ch === ")") {
            depth--;
            if (depth === 0) {
                return i;
            }
        }
    }
    return -1;
}
function splitTopLevelCallArguments(source) {
    const args = [];
    let start = 0;
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    for (let i = 0; i < source.length; i++) {
        const ch = source[i];
        if (ch === "(") {
            parenDepth++;
        }
        else if (ch === ")") {
            parenDepth--;
        }
        else if (ch === "[") {
            bracketDepth++;
        }
        else if (ch === "]") {
            bracketDepth--;
        }
        else if (ch === "{") {
            braceDepth++;
        }
        else if (ch === "}") {
            braceDepth--;
        }
        else if (ch === "," && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
            args.push(source.slice(start, i).trim());
            start = i + 1;
        }
    }
    args.push(source.slice(start).trim());
    return args.filter((arg) => arg.length > 0);
}
function replaceSamplerOriginCalls(wgsl, samplerName, flip) {
    const uniformName = samplerFlipYUniformName(samplerName);
    const callee = "_hyd_samplerOriginCoord";
    let replacements = 0;
    let out = "";
    let last = 0;
    let searchStart = 0;
    while (true) {
        const index = wgsl.indexOf(callee, searchStart);
        if (index < 0) {
            break;
        }
        const before = wgsl.slice(Math.max(0, index - 4), index);
        const openParen = index + callee.length;
        if (/\bfn\s+$/.test(before) || wgsl[openParen] !== "(") {
            searchStart = index + callee.length;
            continue;
        }
        const closeParen = findMatchingParen(wgsl, openParen);
        if (closeParen < 0) {
            break;
        }
        const args = splitTopLevelCallArguments(wgsl.slice(openParen + 1, closeParen));
        if (args.length === 2 && args[1] === `_hyd_uniforms_.${uniformName}`) {
            const expression = args[0];
            out += wgsl.slice(last, index);
            out += flip ? `_hyd_samplerOriginCoordFlip(${expression})` : `(${expression})`;
            last = closeParen + 1;
            replacements++;
        }
        searchStart = closeParen + 1;
    }
    out += wgsl.slice(last);
    return { wgsl: out, replacements, needsFlipHelper: flip && replacements > 0 };
}
function insertSamplerOriginFlipHelper(wgsl) {
    if (wgsl.includes("fn _hyd_samplerOriginCoordFlip")) {
        return wgsl;
    }
    const helper = `fn _hyd_samplerOriginCoordFlip(texCoord: vec2<f32>) -> vec2<f32> {\n    return vec2<f32>(texCoord.x, 1.0 - texCoord.y);\n}\n\n`;
    const fragmentIndex = wgsl.indexOf("@fragment");
    if (fragmentIndex < 0) {
        return helper + wgsl;
    }
    return wgsl.slice(0, fragmentIndex) + helper + wgsl.slice(fragmentIndex);
}
function hasSamplerOriginCall(wgsl) {
    const callee = "_hyd_samplerOriginCoord";
    let searchStart = 0;
    while (true) {
        const index = wgsl.indexOf(callee, searchStart);
        if (index < 0) {
            return false;
        }
        const before = wgsl.slice(Math.max(0, index - 4), index);
        const openParen = index + callee.length;
        if (!/\bfn\s+$/.test(before) && wgsl[openParen] === "(") {
            return true;
        }
        searchStart = index + callee.length;
    }
}
function stripUnusedSamplerOriginHelper(wgsl) {
    if (hasSamplerOriginCall(wgsl)) {
        return wgsl;
    }
    return wgsl.replace(/fn\s+_hyd_samplerOriginCoord\s*\([^)]*\)\s*->\s*vec2\s*<\s*f32\s*>\s*\{\s*return\s+vec2\s*<\s*f32\s*>\s*\([^;]+;\s*\}\s*\n*/m, "");
}
function specializeSamplerOriginWgsl(wgsl, samplerOriginFlips) {
    let out = wgsl;
    let needsFlipHelper = false;
    for (const [samplerName, flip] of samplerOriginFlips) {
        const result = replaceSamplerOriginCalls(out, samplerName, flip);
        out = result.wgsl;
        needsFlipHelper = needsFlipHelper || result.needsFlipHelper;
    }
    if (needsFlipHelper) {
        out = insertSamplerOriginFlipHelper(out);
    }
    return stripUnusedSamplerOriginHelper(out);
}
class HydProgram {
    static linkedPrograms = 0;
    _hash;
    uniformArrayBufferTempView;
    get hash() {
        if (!this.samplerOriginVariantKey) {
            return this._hash;
        }
        return `${this._hash}origin:${this.samplerOriginVariantKey}:${this.fragmentModule?.label || ""}|`;
    }
    vertexShader;
    fragmentShader;
    shaderTranslator;
    vertexModule;
    fragmentModule;
    fragmentWgsl = "";
    samplerOriginVariants = new Map();
    samplerOriginVariantKey = "";
    device;
    deleted = false;
    linked = false;
    hydAttributes = [];
    hydAttributeLocations = new Set();
    hydUniforms = [];
    hydSamplers = [];
    hydSampler2D = [];
    originUniformStateVersion = -1;
    originVariantStateVersion = -1;
    staticSamplerOriginVariants = true;
    boundAttributeLocations = new Map();
    activeUniform;
    activeUniformFloat32;
    activeUniformInt32;
    alignedUniformSize;
    constructor(device, shaderTranslator) {
        this.device = device;
        this.shaderTranslator = shaderTranslator;
    }
    write_uniform_i(dstOffset, num, value) {
        const view = this.activeUniformInt32;
        const wordOffset = dstOffset >> 2;
        for (let i = 0; i < num; i++) {
            view[wordOffset + i] = value[i];
        }
    }
    write_uniform_f(dstOffset, num, value) {
        const view = this.activeUniformFloat32;
        const wordOffset = dstOffset >> 2;
        for (let i = 0; i < num; i++) {
            view[wordOffset + i] = value[i];
        }
    }
    write_uniform_f1(dstOffset, value) {
        this.activeUniformFloat32[dstOffset >> 2] = value;
    }
    getFragmentState(format, entryPoint = 'main') {
        return {
            module: this.fragmentModule,
            entryPoint: entryPoint,
            targets: [{
                    format,
                }],
        };
    }
    attachShader(shader) {
        if (shader.type === WebGLRenderingContext.VERTEX_SHADER) {
            this.vertexShader = shader;
        }
        else if (shader.type === WebGLRenderingContext.FRAGMENT_SHADER) {
            this.fragmentShader = shader;
        }
    }
    bindAttribLocation(index, name) {
        this.boundAttributeLocations.set(name, index);
    }
    linkProgram() {
        const translatedProgram = this.shaderTranslator.translateProgram(this.vertexShader, this.fragmentShader, this.boundAttributeLocations);
        if (this.vertexShader && translatedProgram.vertex) {
            this.vertexShader.shader_info = translatedProgram.vertex;
        }
        if (this.fragmentShader && translatedProgram.fragment) {
            this.fragmentShader.shader_info = translatedProgram.fragment;
        }
        HydProgram.linkedPrograms++;
        this._hash = HydProgram.linkedPrograms.toString();
        this.linked = true;
        let shaders = [];
        let tmpOutput = "";
        if (this.vertexShader) {
            tmpOutput += this.vertexShader.shader_info.debug_info + " ";
            shaders.push(this.vertexShader.shader_info);
        }
        if (this.fragmentShader) {
            tmpOutput += this.fragmentShader.shader_info.debug_info + " ";
            shaders.push(this.fragmentShader.shader_info);
        }
        console.warn('[HYD] linkProgram:', tmpOutput);
        const baseShaderInfo = MergeShaderInfo(shaders);
        const dynamicShaderInfo = cloneShaderInfo(baseShaderInfo);
        addSamplerFlipUniforms(dynamicShaderInfo);
        this.staticSamplerOriginVariants = globalThis.__HYD_STATIC_SAMPLER_ORIGIN_VARIANTS !== false;
        const runtimeShaderInfo = this.staticSamplerOriginVariants ? baseShaderInfo : dynamicShaderInfo;
        const code = ShaderInfo2String(runtimeShaderInfo);
        const dynamicCode = this.staticSamplerOriginVariants ? ShaderInfo2String(dynamicShaderInfo) : code;
        if (this.vertexShader) {
            const vs = code + this.vertexShader.shader_info.wgsl;
            console.debug('[HYD] linkProgram vertex:\n\n', vs);
            if (this.vertexShader.shader_info.shader_capture) {
                emitShaderCapture({
                    ...this.vertexShader.shader_info.shader_capture,
                    kind: "shader-final",
                    programId: this._hash,
                    finalWgsl: sourceCapture(vs),
                });
            }
            this.vertexModule = this.device.createShaderModule({ code: vs, label: (0,dist/* default */.Ay)(vs).toString() });
            this._hash += this.vertexModule.label + '|';
        }
        if (this.fragmentShader) {
            this.fragmentWgsl = code + this.fragmentShader.shader_info.wgsl;
            let fs = this.fragmentWgsl;
            if (this.staticSamplerOriginVariants) {
                const defaultFlips = new Map();
                for (const sampler of runtimeShaderInfo.samplers) {
                    if (sampler.glsl_type === "sampler2D") {
                        defaultFlips.set(sampler.name, false);
                    }
                }
                fs = specializeSamplerOriginWgsl(this.fragmentWgsl, defaultFlips);
                if (fs.includes("_hyd_samplerFlipY_")) {
                    this.staticSamplerOriginVariants = false;
                    fs = dynamicCode + this.fragmentShader.shader_info.wgsl;
                    this.fragmentWgsl = fs;
                }
            }
            this.samplerOriginVariants.clear();
            this.samplerOriginVariantKey = "";
            console.debug('[HYD] linkProgram fragment:\n\n', fs);
            if (this.fragmentShader.shader_info.shader_capture) {
                emitShaderCapture({
                    ...this.fragmentShader.shader_info.shader_capture,
                    kind: "shader-final",
                    programId: this._hash,
                    finalWgsl: sourceCapture(fs),
                });
            }
            this.fragmentModule = this.device.createShaderModule({ code: fs, label: (0,dist/* default */.Ay)(fs).toString() });
            this._hash += this.fragmentModule.label + '|';
        }
        const aus = ShaderInfo2HydAus(this.staticSamplerOriginVariants ? runtimeShaderInfo : dynamicShaderInfo);
        this.hydAttributes = aus.attributes;
        for (const attribute of this.hydAttributes) {
            const location = translatedProgram.attributeLocations?.get(attribute.name);
            if (location !== undefined) {
                attribute.location = location;
            }
        }
        this.hydAttributeLocations = new Set(this.hydAttributes.map((attribute) => attribute.location));
        this.hydUniforms = aus.uniforms;
        this.hydSamplers = aus.samplers;
        this.hydSampler2D = [];
        for (const sampler of this.hydSamplers) {
            if (sampler.webgl_type === WebGL2RenderingContext.SAMPLER_2D) {
                this.hydSampler2D.push(sampler);
                sampler.originFlipUniform = this.hydUniforms.find((uniform) => uniform.name === samplerFlipYUniformName(sampler.name));
            }
        }
        let currentOffset = 0;
        for (let i = 0; i < this.hydUniforms.length; i++) {
            const uniform = this.hydUniforms[i];
            currentOffset = (currentOffset + uniform.alignedByteLength - 1) & ~(uniform.alignedByteLength - 1);
            uniform.offset = currentOffset;
            currentOffset += uniform.byteLength;
        }
        let uniformBufferLength = currentOffset;
        this.alignedUniformSize = (uniformBufferLength + ALIGNMENT_BLOCK_SIZE - 1) & ~(ALIGNMENT_BLOCK_SIZE - 1);
        this.activeUniform = new Uint8Array(uniformBufferLength);
        this.activeUniformFloat32 = new Float32Array(this.activeUniform.buffer);
        this.activeUniformInt32 = new Int32Array(this.activeUniform.buffer);
        this.uniformArrayBufferTempView = new DataView(this.activeUniform.buffer);
        for (const uniform of this.hydUniforms) {
            uniform.dataView = this.uniformArrayBufferTempView;
            uniform.float32View = this.activeUniformFloat32;
            uniform.int32View = this.activeUniformInt32;
            uniform.wordOffset = uniform.offset >> 2;
        }
    }
    setUniform(array, offset) {
        array.set(this.activeUniform, offset);
        return offset + this.alignedUniformSize;
    }
    applySamplerOriginVariant(samplerOriginFlips) {
        if (!this.fragmentShader || this.fragmentWgsl.length === 0 || samplerOriginFlips.size === 0) {
            this.samplerOriginVariantKey = "";
            return;
        }
        if (this.hydSampler2D.length === 0) {
            this.samplerOriginVariantKey = "";
            return;
        }
        let key;
        if (this.hydSampler2D.length <= 30) {
            let bits = 0;
            for (let i = 0; i < this.hydSampler2D.length; i++) {
                if (samplerOriginFlips.get(this.hydSampler2D[i].name)) {
                    bits |= 1 << i;
                }
            }
            key = `b${bits.toString(36)}`;
        }
        else {
            key = this.hydSampler2D
                .map((sampler) => samplerOriginFlips.get(sampler.name) ? "1" : "0")
                .join("");
        }
        if (this.samplerOriginVariantKey === key) {
            return;
        }
        let variant = this.samplerOriginVariants.get(key);
        if (!variant) {
            const wgsl = specializeSamplerOriginWgsl(this.fragmentWgsl, samplerOriginFlips);
            variant = {
                wgsl,
                module: this.device.createShaderModule({ code: wgsl, label: (0,dist/* default */.Ay)(wgsl).toString() }),
            };
            this.samplerOriginVariants.set(key, variant);
            if (this.fragmentShader.shader_info.shader_capture) {
                emitShaderCapture({
                    ...this.fragmentShader.shader_info.shader_capture,
                    kind: "shader-final",
                    source: "runtime-origin-variant",
                    programId: this._hash,
                    shaderId: `${this.fragmentShader.shader_info.shader_capture.shaderId}:origin:${key}`,
                    finalWgsl: sourceCapture(wgsl),
                });
            }
        }
        this.fragmentModule = variant.module;
        this.samplerOriginVariantKey = key;
    }
}

;// ./src/components/hydBuffer.ts
class HydBuffer {
    static __total__ = 0;
    __buffer__;
    device;
    descriptor = {
        size: undefined,
        usage: GPUBufferUsage.COPY_DST,
    };
    constructor(device) {
        this.device = device;
        this.descriptor.label = `buffer ${HydBuffer.__total__++}`;
    }
    write(data = null, dstOffset = 0) {
        if (this.__buffer__ && (this.__buffer__.size !== this.descriptor.size)) {
            this.__buffer__.destroy();
            this.__buffer__ = null;
        }
        if (!this.__buffer__) {
            this.descriptor.label += this.descriptor.size.toString() + this.descriptor.usage.toString();
            this.__buffer__ = this.device.createBuffer(this.descriptor);
        }
        if (data !== null) {
            const secondLength = data.byteLength & 3;
            const firstLength = data.byteLength - secondLength;
            const source = data instanceof ArrayBuffer
                ? new Uint8Array(data)
                : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
            this.device.queue.writeBuffer(this.__buffer__, dstOffset, source.subarray(0, firstLength));
            if (secondLength > 0) {
                const tmpUint8Array = new Uint8Array(4);
                tmpUint8Array.set(source.subarray(firstLength));
                this.device.queue.writeBuffer(this.__buffer__, dstOffset + firstLength, tmpUint8Array);
            }
        }
    }
    get buffer() {
        return this.__buffer__;
    }
    get hash() {
        return this.__buffer__ ? this.__buffer__.label : this.descriptor.label;
    }
}

;// ./src/components/hydWebGLConstants.ts
const hydWebGLConstants = {
    ACTIVE_ATTRIBUTES: 35721,
    ACTIVE_TEXTURE: 34016,
    ACTIVE_UNIFORMS: 35718,
    ACTIVE_UNIFORM_BLOCKS: 35382,
    ALIASED_LINE_WIDTH_RANGE: 33902,
    ALIASED_POINT_SIZE_RANGE: 33901,
    ALPHA: 6406,
    ALPHA_BITS: 3413,
    ALREADY_SIGNALED: 37146,
    ALWAYS: 519,
    ANY_SAMPLES_PASSED: 35887,
    ANY_SAMPLES_PASSED_CONSERVATIVE: 36202,
    ARRAY_BUFFER: 34962,
    ARRAY_BUFFER_BINDING: 34964,
    ATTACHED_SHADERS: 35717,
    BACK: 1029,
    BLEND: 3042,
    BLEND_COLOR: 32773,
    BLEND_DST_ALPHA: 32970,
    BLEND_DST_RGB: 32968,
    BLEND_EQUATION: 32777,
    BLEND_EQUATION_ALPHA: 34877,
    BLEND_EQUATION_RGB: 32777,
    BLEND_SRC_ALPHA: 32971,
    BLEND_SRC_RGB: 32969,
    BLUE_BITS: 3412,
    BOOL: 35670,
    BOOL_VEC2: 35671,
    BOOL_VEC3: 35672,
    BOOL_VEC4: 35673,
    BROWSER_DEFAULT_WEBGL: 37444,
    BUFFER_SIZE: 34660,
    BUFFER_USAGE: 34661,
    BYTE: 5120,
    CCW: 2305,
    CLAMP_TO_EDGE: 33071,
    COLOR: 6144,
    COLOR_ATTACHMENT0: 36064,
    COLOR_ATTACHMENT1: 36065,
    COLOR_ATTACHMENT2: 36066,
    COLOR_ATTACHMENT3: 36067,
    COLOR_ATTACHMENT4: 36068,
    COLOR_ATTACHMENT5: 36069,
    COLOR_ATTACHMENT6: 36070,
    COLOR_ATTACHMENT7: 36071,
    COLOR_ATTACHMENT8: 36072,
    COLOR_ATTACHMENT9: 36073,
    COLOR_ATTACHMENT10: 36074,
    COLOR_ATTACHMENT11: 36075,
    COLOR_ATTACHMENT12: 36076,
    COLOR_ATTACHMENT13: 36077,
    COLOR_ATTACHMENT14: 36078,
    COLOR_ATTACHMENT15: 36079,
    COLOR_BUFFER_BIT: 16384,
    COLOR_CLEAR_VALUE: 3106,
    COLOR_WRITEMASK: 3107,
    COMPARE_REF_TO_TEXTURE: 34894,
    COMPILE_STATUS: 35713,
    COMPRESSED_TEXTURE_FORMATS: 34467,
    CONDITION_SATISFIED: 37148,
    CONSTANT_ALPHA: 32771,
    CONSTANT_COLOR: 32769,
    CONTEXT_LOST_WEBGL: 37442,
    COPY_READ_BUFFER: 36662,
    COPY_READ_BUFFER_BINDING: 36662,
    COPY_WRITE_BUFFER: 36663,
    COPY_WRITE_BUFFER_BINDING: 36663,
    CULL_FACE: 2884,
    CULL_FACE_MODE: 2885,
    CURRENT_PROGRAM: 35725,
    CURRENT_QUERY: 34917,
    CURRENT_VERTEX_ATTRIB: 34342,
    CW: 2304,
    DECR: 7683,
    DECR_WRAP: 34056,
    DELETE_STATUS: 35712,
    DEPTH: 6145,
    DEPTH24_STENCIL8: 35056,
    DEPTH32F_STENCIL8: 36013,
    DEPTH_ATTACHMENT: 36096,
    DEPTH_BITS: 3414,
    DEPTH_BUFFER_BIT: 256,
    DEPTH_CLEAR_VALUE: 2931,
    DEPTH_COMPONENT: 6402,
    DEPTH_COMPONENT16: 33189,
    DEPTH_COMPONENT24: 33190,
    DEPTH_COMPONENT32F: 36012,
    DEPTH_FUNC: 2932,
    DEPTH_RANGE: 2928,
    DEPTH_STENCIL: 34041,
    DEPTH_STENCIL_ATTACHMENT: 33306,
    DEPTH_TEST: 2929,
    DEPTH_WRITEMASK: 2930,
    DITHER: 3024,
    DONT_CARE: 4352,
    DRAW_BUFFER0: 34853,
    DRAW_BUFFER1: 34854,
    DRAW_BUFFER2: 34855,
    DRAW_BUFFER3: 34856,
    DRAW_BUFFER4: 34857,
    DRAW_BUFFER5: 34858,
    DRAW_BUFFER6: 34859,
    DRAW_BUFFER7: 34860,
    DRAW_BUFFER8: 34861,
    DRAW_BUFFER9: 34862,
    DRAW_BUFFER10: 34863,
    DRAW_BUFFER11: 34864,
    DRAW_BUFFER12: 34865,
    DRAW_BUFFER13: 34866,
    DRAW_BUFFER14: 34867,
    DRAW_BUFFER15: 34868,
    DRAW_FRAMEBUFFER: 36009,
    DRAW_FRAMEBUFFER_BINDING: 36006,
    DST_ALPHA: 772,
    DST_COLOR: 774,
    DYNAMIC_COPY: 35050,
    DYNAMIC_DRAW: 35048,
    DYNAMIC_READ: 35049,
    ELEMENT_ARRAY_BUFFER: 34963,
    ELEMENT_ARRAY_BUFFER_BINDING: 34965,
    EQUAL: 514,
    FASTEST: 4353,
    FLOAT: 5126,
    FLOAT_32_UNSIGNED_INT_24_8_REV: 36269,
    FLOAT_MAT2: 35674,
    FLOAT_MAT2x3: 35685,
    FLOAT_MAT2x4: 35686,
    FLOAT_MAT3: 35675,
    FLOAT_MAT3x2: 35687,
    FLOAT_MAT3x4: 35688,
    FLOAT_MAT4: 35676,
    FLOAT_MAT4x2: 35689,
    FLOAT_MAT4x3: 35690,
    FLOAT_VEC2: 35664,
    FLOAT_VEC3: 35665,
    FLOAT_VEC4: 35666,
    FRAGMENT_SHADER: 35632,
    FRAGMENT_SHADER_DERIVATIVE_HINT: 35723,
    FRAMEBUFFER: 36160,
    FRAMEBUFFER_ATTACHMENT_ALPHA_SIZE: 33301,
    FRAMEBUFFER_ATTACHMENT_BLUE_SIZE: 33300,
    FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING: 33296,
    FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE: 33297,
    FRAMEBUFFER_ATTACHMENT_DEPTH_SIZE: 33302,
    FRAMEBUFFER_ATTACHMENT_GREEN_SIZE: 33299,
    FRAMEBUFFER_ATTACHMENT_OBJECT_NAME: 36049,
    FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE: 36048,
    FRAMEBUFFER_ATTACHMENT_RED_SIZE: 33298,
    FRAMEBUFFER_ATTACHMENT_STENCIL_SIZE: 33303,
    FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE: 36051,
    FRAMEBUFFER_ATTACHMENT_TEXTURE_LAYER: 36052,
    FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL: 36050,
    FRAMEBUFFER_BINDING: 36006,
    FRAMEBUFFER_COMPLETE: 36053,
    FRAMEBUFFER_DEFAULT: 33304,
    FRAMEBUFFER_INCOMPLETE_ATTACHMENT: 36054,
    FRAMEBUFFER_INCOMPLETE_DIMENSIONS: 36057,
    FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT: 36055,
    FRAMEBUFFER_INCOMPLETE_MULTISAMPLE: 36182,
    FRAMEBUFFER_UNSUPPORTED: 36061,
    FRONT: 1028,
    FRONT_AND_BACK: 1032,
    FRONT_FACE: 2886,
    FUNC_ADD: 32774,
    FUNC_REVERSE_SUBTRACT: 32779,
    FUNC_SUBTRACT: 32778,
    GENERATE_MIPMAP_HINT: 33170,
    GEQUAL: 518,
    GREATER: 516,
    GREEN_BITS: 3411,
    HALF_FLOAT: 5131,
    HIGH_FLOAT: 36338,
    HIGH_INT: 36341,
    IMPLEMENTATION_COLOR_READ_FORMAT: 35739,
    IMPLEMENTATION_COLOR_READ_TYPE: 35738,
    INCR: 7682,
    INCR_WRAP: 34055,
    INT: 5124,
    INTERLEAVED_ATTRIBS: 35980,
    INT_2_10_10_10_REV: 36255,
    INT_SAMPLER_2D: 36298,
    INT_SAMPLER_2D_ARRAY: 36303,
    INT_SAMPLER_3D: 36299,
    INT_SAMPLER_CUBE: 36300,
    INT_VEC2: 35667,
    INT_VEC3: 35668,
    INT_VEC4: 35669,
    INVALID_ENUM: 1280,
    INVALID_FRAMEBUFFER_OPERATION: 1286,
    INVALID_INDEX: 4294967295,
    INVALID_OPERATION: 1282,
    INVALID_VALUE: 1281,
    INVERT: 5386,
    KEEP: 7680,
    LEQUAL: 515,
    LESS: 513,
    LINEAR: 9729,
    LINEAR_MIPMAP_LINEAR: 9987,
    LINEAR_MIPMAP_NEAREST: 9985,
    LINES: 1,
    LINE_LOOP: 2,
    LINE_STRIP: 3,
    LINE_WIDTH: 2849,
    LINK_STATUS: 35714,
    LOW_FLOAT: 36336,
    LOW_INT: 36339,
    LUMINANCE: 6409,
    LUMINANCE_ALPHA: 6410,
    MAX: 32776,
    MAX_3D_TEXTURE_SIZE: 32883,
    MAX_ARRAY_TEXTURE_LAYERS: 35071,
    MAX_CLIENT_WAIT_TIMEOUT_WEBGL: 37447,
    MAX_COLOR_ATTACHMENTS: 36063,
    MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS: 35379,
    MAX_COMBINED_TEXTURE_IMAGE_UNITS: 35661,
    MAX_COMBINED_UNIFORM_BLOCKS: 35374,
    MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS: 35377,
    MAX_CUBE_MAP_TEXTURE_SIZE: 34076,
    MAX_DRAW_BUFFERS: 34852,
    MAX_ELEMENTS_INDICES: 33001,
    MAX_ELEMENTS_VERTICES: 33000,
    MAX_ELEMENT_INDEX: 36203,
    MAX_FRAGMENT_INPUT_COMPONENTS: 37157,
    MAX_FRAGMENT_UNIFORM_BLOCKS: 35373,
    MAX_FRAGMENT_UNIFORM_COMPONENTS: 35657,
    MAX_FRAGMENT_UNIFORM_VECTORS: 36349,
    MAX_PROGRAM_TEXEL_OFFSET: 35077,
    MAX_RENDERBUFFER_SIZE: 34024,
    MAX_SAMPLES: 36183,
    MAX_SERVER_WAIT_TIMEOUT: 37137,
    MAX_TEXTURE_IMAGE_UNITS: 34930,
    MAX_TEXTURE_LOD_BIAS: 34045,
    MAX_TEXTURE_SIZE: 3379,
    MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS: 35978,
    MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS: 35979,
    MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS: 35968,
    MAX_UNIFORM_BLOCK_SIZE: 35376,
    MAX_UNIFORM_BUFFER_BINDINGS: 35375,
    MAX_VARYING_COMPONENTS: 35659,
    MAX_VARYING_VECTORS: 36348,
    MAX_VERTEX_ATTRIBS: 34921,
    MAX_VERTEX_OUTPUT_COMPONENTS: 37154,
    MAX_VERTEX_TEXTURE_IMAGE_UNITS: 35660,
    MAX_VERTEX_UNIFORM_BLOCKS: 35371,
    MAX_VERTEX_UNIFORM_COMPONENTS: 35658,
    MAX_VERTEX_UNIFORM_VECTORS: 36347,
    MAX_VIEWPORT_DIMS: 3386,
    MEDIUM_FLOAT: 36337,
    MEDIUM_INT: 36340,
    MIN: 32775,
    MIN_PROGRAM_TEXEL_OFFSET: 35076,
    MIRRORED_REPEAT: 33648,
    NEAREST: 9728,
    NEAREST_MIPMAP_LINEAR: 9986,
    NEAREST_MIPMAP_NEAREST: 9984,
    NEVER: 512,
    NICEST: 4354,
    NONE: 0,
    NOTEQUAL: 517,
    NO_ERROR: 0,
    OBJECT_TYPE: 37138,
    ONE: 1,
    ONE_MINUS_CONSTANT_ALPHA: 32772,
    ONE_MINUS_CONSTANT_COLOR: 32770,
    ONE_MINUS_DST_ALPHA: 773,
    ONE_MINUS_DST_COLOR: 775,
    ONE_MINUS_SRC_ALPHA: 771,
    ONE_MINUS_SRC_COLOR: 769,
    OUT_OF_MEMORY: 1285,
    PACK_ALIGNMENT: 3333,
    PACK_ROW_LENGTH: 3330,
    PACK_SKIP_PIXELS: 3332,
    PACK_SKIP_ROWS: 3331,
    PIXEL_PACK_BUFFER: 35051,
    PIXEL_PACK_BUFFER_BINDING: 35053,
    PIXEL_UNPACK_BUFFER: 35052,
    PIXEL_UNPACK_BUFFER_BINDING: 35055,
    POINTS: 0,
    POLYGON_OFFSET_FACTOR: 32824,
    POLYGON_OFFSET_FILL: 32823,
    POLYGON_OFFSET_UNITS: 10752,
    QUERY_RESULT: 34918,
    QUERY_RESULT_AVAILABLE: 34919,
    R8: 33321,
    R8I: 33329,
    R8UI: 33330,
    R8_SNORM: 36756,
    R11F_G11F_B10F: 35898,
    R16F: 33325,
    R16I: 33331,
    R16UI: 33332,
    R32F: 33326,
    R32I: 33333,
    R32UI: 33334,
    RASTERIZER_DISCARD: 35977,
    READ_BUFFER: 3074,
    READ_FRAMEBUFFER: 36008,
    READ_FRAMEBUFFER_BINDING: 36010,
    RED: 6403,
    RED_BITS: 3410,
    RED_INTEGER: 36244,
    RENDERBUFFER: 36161,
    RENDERBUFFER_ALPHA_SIZE: 36179,
    RENDERBUFFER_BINDING: 36007,
    RENDERBUFFER_BLUE_SIZE: 36178,
    RENDERBUFFER_DEPTH_SIZE: 36180,
    RENDERBUFFER_GREEN_SIZE: 36177,
    RENDERBUFFER_HEIGHT: 36163,
    RENDERBUFFER_INTERNAL_FORMAT: 36164,
    RENDERBUFFER_RED_SIZE: 36176,
    RENDERBUFFER_SAMPLES: 36011,
    RENDERBUFFER_STENCIL_SIZE: 36181,
    RENDERBUFFER_WIDTH: 36162,
    RENDERER: 7937,
    REPEAT: 10497,
    REPLACE: 7681,
    RG: 33319,
    RG8: 33323,
    RG8I: 33335,
    RG8UI: 33336,
    RG8_SNORM: 36757,
    RG16F: 33327,
    RG16I: 33337,
    RG16UI: 33338,
    RG32F: 33328,
    RG32I: 33339,
    RG32UI: 33340,
    RGB: 6407,
    RGB5_A1: 32855,
    RGB8: 32849,
    RGB8I: 36239,
    RGB8UI: 36221,
    RGB8_SNORM: 36758,
    RGB9_E5: 35901,
    RGB10_A2: 32857,
    RGB10_A2UI: 36975,
    RGB16F: 34843,
    RGB16I: 36233,
    RGB16UI: 36215,
    RGB32F: 34837,
    RGB32I: 36227,
    RGB32UI: 36209,
    RGB565: 36194,
    RGBA: 6408,
    RGBA4: 32854,
    RGBA8: 32856,
    RGBA8I: 36238,
    RGBA8UI: 36220,
    RGBA8_SNORM: 36759,
    RGBA16F: 34842,
    RGBA16I: 36232,
    RGBA16UI: 36214,
    RGBA32F: 34836,
    RGBA32I: 36226,
    RGBA32UI: 36208,
    RGBA_INTEGER: 36249,
    RGB_INTEGER: 36248,
    RG_INTEGER: 33320,
    SAMPLER_2D: 35678,
    SAMPLER_2D_ARRAY: 36289,
    SAMPLER_2D_ARRAY_SHADOW: 36292,
    SAMPLER_2D_SHADOW: 35682,
    SAMPLER_3D: 35679,
    SAMPLER_BINDING: 35097,
    SAMPLER_CUBE: 35680,
    SAMPLER_CUBE_SHADOW: 36293,
    SAMPLES: 32937,
    SAMPLE_ALPHA_TO_COVERAGE: 32926,
    SAMPLE_BUFFERS: 32936,
    SAMPLE_COVERAGE: 32928,
    SAMPLE_COVERAGE_INVERT: 32939,
    SAMPLE_COVERAGE_VALUE: 32938,
    SCISSOR_BOX: 3088,
    SCISSOR_TEST: 3089,
    SEPARATE_ATTRIBS: 35981,
    SHADER_TYPE: 35663,
    SHADING_LANGUAGE_VERSION: 35724,
    SHORT: 5122,
    SIGNALED: 37145,
    SIGNED_NORMALIZED: 36764,
    SRC_ALPHA: 770,
    SRC_ALPHA_SATURATE: 776,
    SRC_COLOR: 768,
    SRGB: 35904,
    SRGB8: 35905,
    SRGB8_ALPHA8: 35907,
    STATIC_COPY: 35046,
    STATIC_DRAW: 35044,
    STATIC_READ: 35045,
    STENCIL: 6146,
    STENCIL_ATTACHMENT: 36128,
    STENCIL_BACK_FAIL: 34817,
    STENCIL_BACK_FUNC: 34816,
    STENCIL_BACK_PASS_DEPTH_FAIL: 34818,
    STENCIL_BACK_PASS_DEPTH_PASS: 34819,
    STENCIL_BACK_REF: 36003,
    STENCIL_BACK_VALUE_MASK: 36004,
    STENCIL_BACK_WRITEMASK: 36005,
    STENCIL_BITS: 3415,
    STENCIL_BUFFER_BIT: 1024,
    STENCIL_CLEAR_VALUE: 2961,
    STENCIL_FAIL: 2964,
    STENCIL_FUNC: 2962,
    STENCIL_INDEX8: 36168,
    STENCIL_PASS_DEPTH_FAIL: 2965,
    STENCIL_PASS_DEPTH_PASS: 2966,
    STENCIL_REF: 2967,
    STENCIL_TEST: 2960,
    STENCIL_VALUE_MASK: 2963,
    STENCIL_WRITEMASK: 2968,
    STREAM_COPY: 35042,
    STREAM_DRAW: 35040,
    STREAM_READ: 35041,
    SUBPIXEL_BITS: 3408,
    SYNC_CONDITION: 37139,
    SYNC_FENCE: 37142,
    SYNC_FLAGS: 37141,
    SYNC_FLUSH_COMMANDS_BIT: 1,
    SYNC_GPU_COMMANDS_COMPLETE: 37143,
    SYNC_STATUS: 37140,
    TEXTURE: 5890,
    TEXTURE0: 33984,
    TEXTURE1: 33985,
    TEXTURE2: 33986,
    TEXTURE3: 33987,
    TEXTURE4: 33988,
    TEXTURE5: 33989,
    TEXTURE6: 33990,
    TEXTURE7: 33991,
    TEXTURE8: 33992,
    TEXTURE9: 33993,
    TEXTURE10: 33994,
    TEXTURE11: 33995,
    TEXTURE12: 33996,
    TEXTURE13: 33997,
    TEXTURE14: 33998,
    TEXTURE15: 33999,
    TEXTURE16: 34000,
    TEXTURE17: 34001,
    TEXTURE18: 34002,
    TEXTURE19: 34003,
    TEXTURE20: 34004,
    TEXTURE21: 34005,
    TEXTURE22: 34006,
    TEXTURE23: 34007,
    TEXTURE24: 34008,
    TEXTURE25: 34009,
    TEXTURE26: 34010,
    TEXTURE27: 34011,
    TEXTURE28: 34012,
    TEXTURE29: 34013,
    TEXTURE30: 34014,
    TEXTURE31: 34015,
    TEXTURE_2D: 3553,
    TEXTURE_2D_ARRAY: 35866,
    TEXTURE_3D: 32879,
    TEXTURE_BASE_LEVEL: 33084,
    TEXTURE_BINDING_2D: 32873,
    TEXTURE_BINDING_2D_ARRAY: 35869,
    TEXTURE_BINDING_3D: 32874,
    TEXTURE_BINDING_CUBE_MAP: 34068,
    TEXTURE_COMPARE_FUNC: 34893,
    TEXTURE_COMPARE_MODE: 34892,
    TEXTURE_CUBE_MAP: 34067,
    TEXTURE_CUBE_MAP_NEGATIVE_X: 34070,
    TEXTURE_CUBE_MAP_NEGATIVE_Y: 34072,
    TEXTURE_CUBE_MAP_NEGATIVE_Z: 34074,
    TEXTURE_CUBE_MAP_POSITIVE_X: 34069,
    TEXTURE_CUBE_MAP_POSITIVE_Y: 34071,
    TEXTURE_CUBE_MAP_POSITIVE_Z: 34073,
    TEXTURE_IMMUTABLE_FORMAT: 37167,
    TEXTURE_IMMUTABLE_LEVELS: 33503,
    TEXTURE_MAG_FILTER: 10240,
    TEXTURE_MAX_LEVEL: 33085,
    TEXTURE_MAX_LOD: 33083,
    TEXTURE_MIN_FILTER: 10241,
    TEXTURE_MIN_LOD: 33082,
    TEXTURE_WRAP_R: 32882,
    TEXTURE_WRAP_S: 10242,
    TEXTURE_WRAP_T: 10243,
    TIMEOUT_EXPIRED: 37147,
    TIMEOUT_IGNORED: -1,
    TRANSFORM_FEEDBACK: 36386,
    TRANSFORM_FEEDBACK_ACTIVE: 36388,
    TRANSFORM_FEEDBACK_BINDING: 36389,
    TRANSFORM_FEEDBACK_BUFFER: 35982,
    TRANSFORM_FEEDBACK_BUFFER_BINDING: 35983,
    TRANSFORM_FEEDBACK_BUFFER_MODE: 35967,
    TRANSFORM_FEEDBACK_BUFFER_SIZE: 35973,
    TRANSFORM_FEEDBACK_BUFFER_START: 35972,
    TRANSFORM_FEEDBACK_PAUSED: 36387,
    TRANSFORM_FEEDBACK_PRIMITIVES_WRITTEN: 35976,
    TRANSFORM_FEEDBACK_VARYINGS: 35971,
    TRIANGLES: 4,
    TRIANGLE_FAN: 6,
    TRIANGLE_STRIP: 5,
    UNIFORM_ARRAY_STRIDE: 35388,
    UNIFORM_BLOCK_ACTIVE_UNIFORMS: 35394,
    UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES: 35395,
    UNIFORM_BLOCK_BINDING: 35391,
    UNIFORM_BLOCK_DATA_SIZE: 35392,
    UNIFORM_BLOCK_INDEX: 35386,
    UNIFORM_BLOCK_REFERENCED_BY_FRAGMENT_SHADER: 35398,
    UNIFORM_BLOCK_REFERENCED_BY_VERTEX_SHADER: 35396,
    UNIFORM_BUFFER: 35345,
    UNIFORM_BUFFER_BINDING: 35368,
    UNIFORM_BUFFER_OFFSET_ALIGNMENT: 35380,
    UNIFORM_BUFFER_SIZE: 35370,
    UNIFORM_BUFFER_START: 35369,
    UNIFORM_IS_ROW_MAJOR: 35390,
    UNIFORM_MATRIX_STRIDE: 35389,
    UNIFORM_OFFSET: 35387,
    UNIFORM_SIZE: 35384,
    UNIFORM_TYPE: 35383,
    UNPACK_ALIGNMENT: 3317,
    UNPACK_COLORSPACE_CONVERSION_WEBGL: 37443,
    UNPACK_FLIP_Y_WEBGL: 37440,
    UNPACK_IMAGE_HEIGHT: 32878,
    UNPACK_PREMULTIPLY_ALPHA_WEBGL: 37441,
    UNPACK_ROW_LENGTH: 3314,
    UNPACK_SKIP_IMAGES: 32877,
    UNPACK_SKIP_PIXELS: 3316,
    UNPACK_SKIP_ROWS: 3315,
    UNSIGNALED: 37144,
    UNSIGNED_BYTE: 5121,
    UNSIGNED_INT: 5125,
    UNSIGNED_INT_2_10_10_10_REV: 33640,
    UNSIGNED_INT_5_9_9_9_REV: 35902,
    UNSIGNED_INT_10F_11F_11F_REV: 35899,
    UNSIGNED_INT_24_8: 34042,
    UNSIGNED_INT_SAMPLER_2D: 36306,
    UNSIGNED_INT_SAMPLER_2D_ARRAY: 36311,
    UNSIGNED_INT_SAMPLER_3D: 36307,
    UNSIGNED_INT_SAMPLER_CUBE: 36308,
    UNSIGNED_INT_VEC2: 36294,
    UNSIGNED_INT_VEC3: 36295,
    UNSIGNED_INT_VEC4: 36296,
    UNSIGNED_NORMALIZED: 35863,
    UNSIGNED_SHORT: 5123,
    UNSIGNED_SHORT_4_4_4_4: 32819,
    UNSIGNED_SHORT_5_5_5_1: 32820,
    UNSIGNED_SHORT_5_6_5: 33635,
    VALIDATE_STATUS: 35715,
    VENDOR: 7936,
    VERSION: 7938,
    VERTEX_ARRAY_BINDING: 34229,
    VERTEX_ATTRIB_ARRAY_BUFFER_BINDING: 34975,
    VERTEX_ATTRIB_ARRAY_DIVISOR: 35070,
    VERTEX_ATTRIB_ARRAY_ENABLED: 34338,
    VERTEX_ATTRIB_ARRAY_INTEGER: 35069,
    VERTEX_ATTRIB_ARRAY_NORMALIZED: 34922,
    VERTEX_ATTRIB_ARRAY_POINTER: 34373,
    VERTEX_ATTRIB_ARRAY_SIZE: 34339,
    VERTEX_ATTRIB_ARRAY_STRIDE: 34340,
    VERTEX_ATTRIB_ARRAY_TYPE: 34341,
    VERTEX_SHADER: 35633,
    VIEWPORT: 2978,
    WAIT_FAILED: 37149,
    ZERO: 0,
};

;// ./src/components/hydWebGLStatic.ts










const GLOB_GL_CTX = document.createElement('canvas').getContext('webgl2');
const frameBeginFuncLst = [];
const frameEndFuncList = [];
const VALID_PIXEL_ALIGNMENT = new Set([1, 2, 4, 8]);
let frameDepth = 0;
let autoFrameScheduled = false;
function beginFrame() {
    if (frameDepth++ === 0) {
        frameBeginFuncLst.forEach((func) => func());
    }
}
function endFrame() {
    if (frameDepth === 0)
        return;
    frameDepth--;
    if (frameDepth === 0) {
        frameEndFuncList.forEach((func) => func());
    }
}
function scheduleMicrotask(callback) {
    if (typeof queueMicrotask === 'function') {
        queueMicrotask(callback);
    }
    else {
        Promise.resolve().then(callback);
    }
}
function ensureAutoFrame() {
    if (frameDepth > 0)
        return;
    beginFrame();
    if (autoFrameScheduled)
        return;
    autoFrameScheduled = true;
    scheduleMicrotask(() => {
        autoFrameScheduled = false;
        endFrame();
    });
}
class HydWebGLStatic {
    hydLastCanvasSize = [-1, -1];
    hydMaxUniSize;
    hydCanvas;
    hydGpuctx;
    hydDevice;
    hydUniArr;
    hydUniBuf;
    hydUniOff = 0;
    hydWrapper;
    hydGlobalState;
    bindedGetRenderPassDesc;
    hydRpCache;
    shaderTranslator;
    triangleFanIndexBuffers = new Map();
    hydTextureObjects = new WeakMap();
    hydBufferObjects = new WeakMap();
    maskedClearPipelines = new Map();
    maskedClearUniformBuffer = null;
    samplerOriginStateVersion = 0;
    gpuViewportDirty = true;
    gpuScissorDirty = true;
    lastDrawPbv = null;
    increaseOk() {
    }
    decreaseOk() {
    }
    get wrapperContext() {
        return this.hydWrapper;
    }
    regenerateDS(label, format, compareFunc, bindPoint, width, height) {
        const texture = new HydTexture(this.hydDevice);
        texture.label = label;
        texture.state.compare = compareFunc;
        texture.renderbufferStorage(format, width, height);
        texture.viewDimension = '2d';
        this.hydGlobalState.defaultFramebuffer.attachments.set(bindPoint, new FramebufferAttributes(bindPoint, undefined, undefined, texture));
        this.hydGlobalState.defaultFramebuffer.resetHash();
    }
    updateCanvasSize() {
        const width = this.hydCanvas.width;
        const height = this.hydCanvas.height;
        if (this.hydLastCanvasSize[0] === width && this.hydLastCanvasSize[1] === height) {
            return;
        }
        if (width <= 0 || height <= 0) {
            return;
        }
        if (this.hydRpCache) {
            this._der_flush();
        }
        this.hydGlobalState.miscState.scissorBox = [0, 0, width, height];
        this.hydGlobalState.commonState.viewport = [0, 0, width, height, 0, 1];
        this.gpuViewportDirty = true;
        this.gpuScissorDirty = true;
        this['drawingBufferWidth'] = width;
        this['drawingBufferHeight'] = height;
        try {
            this.hydGlobalState.defaultFramebuffer.attachments.get(WebGL2RenderingContext.DEPTH_ATTACHMENT).attachment.destroy();
            this.hydGlobalState.defaultFramebuffer.attachments.get(WebGL2RenderingContext.STENCIL_ATTACHMENT).attachment.destroy();
            this.hydGlobalState.defaultFramebuffer.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT).attachment.destroy();
        }
        catch (error) {
        }
        this.hydLastCanvasSize = [width, height];
        this.regenerateDS(`defaultDepthBuffer ${width} ${height}`, 'depth32float', this.hydGlobalState.depthState.func, WebGL2RenderingContext.DEPTH_ATTACHMENT, width, height);
        this.regenerateDS(`defaultStencilBuffer ${width} ${height}`, 'stencil8', this.hydGlobalState.stencilState.frontFunc, WebGL2RenderingContext.STENCIL_ATTACHMENT, width, height);
        this.regenerateDS(`defaultDepthStencilBuffer ${width} ${height}`, 'depth24plus-stencil8', this.hydGlobalState.depthState.func, WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT, width, height);
        this.hydGlobalState.__canvasView = this.hydGpuctx.getCurrentTexture().createView({ label: 'canvasView resized' });
    }
    constructor(_canvas, _gpuctx, _attributes, _device, _maxUniformSize, _replay, shaderTranslator) {
        this.shaderTranslator = shaderTranslator;
        this.hydMaxUniSize = _maxUniformSize;
        this.hydCanvas = _canvas;
        this.hydGpuctx = _gpuctx;
        this.hydDevice = _device;
        this.hydUniArr = new Uint8Array(this.hydMaxUniSize);
        this.hydUniBuf = this.hydDevice.createBuffer({
            label: 'GU',
            size: this.hydMaxUniSize + 65536,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.hydCanvas.onresize = () => {
            this.updateCanvasSize();
        };
        for (const propertyName in hydWebGLConstants) {
            this[propertyName] = hydWebGLConstants[propertyName];
        }
        this['canvas'] = _canvas;
        this['drawingBufferWidth'] = _canvas.width;
        this['drawingBufferHeight'] = _canvas.height;
        this['drawingBufferColorSpace'] = 'srgb';
        this.hydWrapper = this;
        this.hydGlobalState = new HydGlobalStateHashed(_attributes, this.hydUniBuf, _device);
        this.hydGlobalState.__canvasView = this.hydGpuctx.getCurrentTexture().createView({ label: 'initial canvasView' });
        frameBeginFuncLst.push(this._frameStart.bind(this));
        frameEndFuncList.push(this._frameEnd.bind(this));
        this.hydRpCache = new HydRenderPassCache(this.hydDevice);
        this.updateCanvasSize();
        this.bindedGetRenderPassDesc = this.hydGlobalState.getRenderPassDescriptor.bind(this.hydGlobalState);
    }
    flushUniforms() {
        if (this.hydUniOff > 0) {
            this.hydDevice.queue.writeBuffer(this.hydUniBuf, 0, this.hydUniArr.buffer, 0, this.hydUniOff);
            this.hydUniOff = 0;
        }
    }
    _der_flush() {
        this.flushUniforms();
        this.hydRpCache.CeSubmitAndReset();
    }
    _frameEnd() {
        this._der_flush();
        this.hydGlobalState.__canvasView = null;
    }
    _frameStart() {
        this.hydUniOff = 0;
        this.updateCanvasSize();
        this.hydGlobalState.__canvasView = this.hydGpuctx.getCurrentTexture().createView({ label: 'canvasView' });
    }
    bindAttribLocation(program, index, name) {
        program.bindAttribLocation(index, name);
        this.hydGlobalState.recordTransition("bindAttribLocation", program.hash || "unlinked", index, name);
    }
    getError() {
        const error = this.hydGlobalState.glError;
        this.hydGlobalState.glError = WebGL2RenderingContext.NO_ERROR;
        return error;
    }
    detachShader() {
        console.warn("skipping detachShader");
    }
    deleteShader(s) {
        s.deleted = true;
    }
    deleteProgram(p) {
        p.deleted = true;
    }
    deleteFramebuffer(framebuffer) {
        if (!framebuffer)
            return;
        this._der_flush();
        if (this.hydGlobalState.commonState.drawFramebufferBinding === framebuffer) {
            this.hydGlobalState.commonState.drawFramebufferBinding = this.hydGlobalState.defaultFramebuffer;
        }
        if (this.hydGlobalState.commonState.readFramebufferBinding === framebuffer) {
            this.hydGlobalState.commonState.readFramebufferBinding = this.hydGlobalState.defaultFramebuffer;
        }
        framebuffer.attachments.clear();
        framebuffer.resetHash();
        this.hydGlobalState.recordTransition("deleteFramebuffer", "framebuffer");
    }
    deleteRenderbuffer(renderbuffer) {
        if (!renderbuffer)
            return;
        this._der_flush();
        if (this.hydGlobalState.commonState.renderbufferBinding === renderbuffer) {
            this.hydGlobalState.commonState.renderbufferBinding = null;
        }
        renderbuffer.destroy();
        this.hydGlobalState.recordTransition("deleteRenderbuffer", "renderbuffer");
    }
    lookupTexture(texture) {
        if (texture === null) {
            return null;
        }
        if (texture instanceof HydTexture && typeof texture.texImage2D === "function") {
            return texture;
        }
        if (typeof texture !== "object") {
            return null;
        }
        const tagged = texture.__hydTexture;
        if (tagged instanceof HydTexture) {
            return tagged;
        }
        const mapped = this.hydTextureObjects.get(texture);
        if (mapped) {
            return mapped;
        }
        const wrapped = texture.texture;
        if (wrapped instanceof HydTexture) {
            this.hydTextureObjects.set(texture, wrapped);
            return wrapped;
        }
        return null;
    }
    normalizeTexture(texture) {
        const knownTexture = this.lookupTexture(texture);
        if (knownTexture || texture === null || typeof texture !== "object") {
            return knownTexture;
        }
        const hydTexture = new HydTexture(this.hydDevice);
        this.hydTextureObjects.set(texture, hydTexture);
        try {
            Object.defineProperty(texture, "__hydTexture", {
                configurable: false,
                enumerable: false,
                value: hydTexture,
            });
        }
        catch (_) {
        }
        return hydTexture;
    }
    deleteTexture(texture) {
        const hydTexture = this.lookupTexture(texture);
        if (!hydTexture)
            return;
        this._der_flush();
        this.hydGlobalState.deleteTextureBinding(hydTexture);
        hydTexture.destroy();
        this.hydGlobalState.recordTransition("deleteTexture", "texture");
    }
    lookupBuffer(buffer) {
        if (buffer === null) {
            return null;
        }
        if (buffer instanceof HydBuffer && typeof buffer.write === "function") {
            return buffer;
        }
        if (typeof buffer !== "object") {
            return null;
        }
        const tagged = buffer.__hydBuffer;
        if (tagged instanceof HydBuffer) {
            return tagged;
        }
        const mapped = this.hydBufferObjects.get(buffer);
        if (mapped) {
            return mapped;
        }
        const wrapped = buffer.buffer;
        if (wrapped instanceof HydBuffer) {
            this.hydBufferObjects.set(buffer, wrapped);
            return wrapped;
        }
        return null;
    }
    normalizeBuffer(buffer) {
        const knownBuffer = this.lookupBuffer(buffer);
        if (knownBuffer || buffer === null || typeof buffer !== "object") {
            return knownBuffer;
        }
        const hydBuffer = new HydBuffer(this.hydDevice);
        this.hydBufferObjects.set(buffer, hydBuffer);
        try {
            Object.defineProperty(buffer, "__hydBuffer", {
                configurable: false,
                enumerable: false,
                value: hydBuffer,
            });
        }
        catch (_) {
        }
        return hydBuffer;
    }
    deleteBuffer(buffer) {
        const hydBuffer = this.lookupBuffer(buffer);
        if (!hydBuffer)
            return;
        this._der_flush();
        if (this.hydGlobalState.commonState.arrayBufferBinding === hydBuffer) {
            this.hydGlobalState.commonState.arrayBufferBinding = null;
        }
        if (this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding === hydBuffer) {
            this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding = null;
        }
        this.hydGlobalState.recordTransition("deleteBuffer", "buffer");
    }
    getShaderInfoLog(x) {
        return "fake shader info log";
    }
    getProgramInfoLog(p) {
        return "fake program info log";
    }
    getParameter(pname) {
        if (enumToConstant.has(pname)) {
            return enumToConstant.get(pname);
        }
        else {
            switch (pname) {
                case WebGL2RenderingContext.ACTIVE_TEXTURE:
                    return this.hydGlobalState.commonState.activeTextureUnit + WebGL2RenderingContext.TEXTURE0;
                case WebGL2RenderingContext.ARRAY_BUFFER_BINDING:
                    return this.hydGlobalState.commonState.arrayBufferBinding;
                case WebGL2RenderingContext.BLEND:
                    return this.hydGlobalState.blendState.enabled;
                case WebGL2RenderingContext.BLEND_COLOR:
                    return new Float32Array(this.hydGlobalState.blendState.color);
                case WebGL2RenderingContext.BLEND_SRC_RGB:
                    return this.hydGlobalState.blendState.srcRGB;
                case WebGL2RenderingContext.BLEND_SRC_ALPHA:
                    return this.hydGlobalState.blendState.srcAlpha;
                case WebGL2RenderingContext.BLEND_DST_RGB:
                    return this.hydGlobalState.blendState.dstRGB;
                case WebGL2RenderingContext.BLEND_DST_ALPHA:
                    return this.hydGlobalState.blendState.dstAlpha;
                case WebGL2RenderingContext.COLOR_CLEAR_VALUE:
                    return new Float32Array(this.hydGlobalState.clearState.color);
                case WebGL2RenderingContext.COLOR_WRITEMASK:
                    return this.hydGlobalState.miscState.colorWriteMask.slice();
                case WebGL2RenderingContext.CULL_FACE:
                    return this.hydGlobalState.polygonState.cullFace;
                case WebGL2RenderingContext.CULL_FACE_MODE:
                    return this.hydGlobalState.polygonState.cullFaceMode;
                case WebGL2RenderingContext.FRONT_FACE:
                    return this.hydGlobalState.polygonState.frontFace;
                case WebGL2RenderingContext.DEPTH_TEST:
                    return this.hydGlobalState.depthState.enabled;
                case WebGL2RenderingContext.DEPTH_WRITEMASK:
                    return this.hydGlobalState.depthState.writeMask;
                case WebGL2RenderingContext.DEPTH_CLEAR_VALUE:
                    return this.hydGlobalState.clearState.depth;
                case WebGL2RenderingContext.SCISSOR_BOX:
                    return new Int32Array(this.hydGlobalState.miscState.scissorBox);
                case WebGL2RenderingContext.SCISSOR_TEST:
                    return this.hydGlobalState.miscState.scissorTest;
                case WebGL2RenderingContext.UNPACK_FLIP_Y_WEBGL:
                    return this.hydGlobalState.miscState.unpackFlipYWebGL;
                case WebGL2RenderingContext.UNPACK_ALIGNMENT:
                    return this.hydGlobalState.miscState.unpackAlignment;
                case WebGL2RenderingContext.PACK_ALIGNMENT:
                    return this.hydGlobalState.miscState.packAlignment;
                case WebGL2RenderingContext.STENCIL_TEST:
                    return this.hydGlobalState.stencilState.enabled;
                case WebGL2RenderingContext.STENCIL_WRITEMASK:
                    return this.hydGlobalState.stencilState.frontWriteMask;
                case WebGL2RenderingContext.STENCIL_BACK_WRITEMASK:
                    return this.hydGlobalState.stencilState.backWriteMask;
                case WebGL2RenderingContext.STENCIL_VALUE_MASK:
                    return this.hydGlobalState.stencilState.frontValueMask;
                case WebGL2RenderingContext.STENCIL_BACK_VALUE_MASK:
                    return this.hydGlobalState.stencilState.backValueMask;
                case WebGL2RenderingContext.STENCIL_REF:
                    return this.hydGlobalState.stencilState.frontRef;
                case WebGL2RenderingContext.STENCIL_BACK_REF:
                    return this.hydGlobalState.stencilState.backRef;
                case WebGL2RenderingContext.STENCIL_FUNC:
                    return this.hydGlobalState.stencilState.frontFunc;
                case WebGL2RenderingContext.STENCIL_BACK_FUNC:
                    return this.hydGlobalState.stencilState.backFunc;
                case WebGL2RenderingContext.STENCIL_FAIL:
                    return this.hydGlobalState.stencilState.frontFail;
                case WebGL2RenderingContext.STENCIL_BACK_FAIL:
                    return this.hydGlobalState.stencilState.backFail;
                case WebGL2RenderingContext.STENCIL_PASS_DEPTH_FAIL:
                    return this.hydGlobalState.stencilState.frontPassDepthFail;
                case WebGL2RenderingContext.STENCIL_BACK_PASS_DEPTH_FAIL:
                    return this.hydGlobalState.stencilState.backPassDepthFail;
                case WebGL2RenderingContext.STENCIL_PASS_DEPTH_PASS:
                    return this.hydGlobalState.stencilState.frontPassDepthPass;
                case WebGL2RenderingContext.STENCIL_BACK_PASS_DEPTH_PASS:
                    return this.hydGlobalState.stencilState.backPassDepthPass;
                case WebGL2RenderingContext.STENCIL_CLEAR_VALUE:
                    return this.hydGlobalState.clearState.stencil;
                case WebGL2RenderingContext.VIEWPORT:
                    const [x, y, width, height, minDepth, maxDepth] = this.hydGlobalState.commonState.viewport;
                    return new Int32Array([x, y, width, height]);
                case WebGL2RenderingContext.FRAMEBUFFER_BINDING:
                case WebGL2RenderingContext.DRAW_FRAMEBUFFER_BINDING:
                    return this.hydGlobalState.commonState.drawFramebufferBinding === this.hydGlobalState.defaultFramebuffer ? null : this.hydGlobalState.commonState.drawFramebufferBinding;
                case WebGL2RenderingContext.READ_FRAMEBUFFER_BINDING:
                    return this.hydGlobalState.commonState.readFramebufferBinding === this.hydGlobalState.defaultFramebuffer ? null : this.hydGlobalState.commonState.readFramebufferBinding;
                case WebGL2RenderingContext.RENDERBUFFER_BINDING:
                    return this.hydGlobalState.commonState.renderbufferBinding;
            }
            throw new Error("unhandled getParameter: " + pname);
        }
    }
    getContextAttributes() {
        return this.hydGlobalState.contextAttributes;
    }
    isContextLost() {
        return false;
    }
    getShaderParameter(shader, pname) {
        switch (pname) {
            case WebGL2RenderingContext.DELETE_STATUS:
                return shader.deleted;
            case WebGL2RenderingContext.COMPILE_STATUS:
                return shader.compiled;
            case WebGL2RenderingContext.SHADER_TYPE:
                return shader.type;
        }
        throw new Error("unhandled getShaderParameter: " + pname);
    }
    getProgramParameter(program, pname) {
        switch (pname) {
            case WebGL2RenderingContext.DELETE_STATUS:
                return program.deleted;
            case WebGL2RenderingContext.LINK_STATUS:
                return program.linked;
            case WebGL2RenderingContext.ATTACHED_SHADERS:
                return 2;
            case WebGL2RenderingContext.ACTIVE_ATTRIBUTES:
                return program.hydAttributes.length;
            case WebGL2RenderingContext.ACTIVE_UNIFORMS:
                return program.hydUniforms.filter((uniform) => !uniform.internal).length + program.hydSamplers.length;
            case WebGL2RenderingContext.ACTIVE_UNIFORM_BLOCKS:
                return 0;
        }
        throw new Error("unhandled getProgramParameter: " + pname);
    }
    getExtension(extensionName) {
        if (extensionName === 'OES_vertex_array_object') {
            return {
                createVertexArrayOES: () => {
                    return this.createVertexArray();
                },
                deleteVertexArrayOES: (vertexArray) => {
                    console.warn("deleteVertexArrayOES is not implemented");
                },
                bindVertexArrayOES: (vertexArray) => {
                    return this.bindVertexArray(vertexArray);
                },
                isVertexArrayOES: (vertexArray) => {
                    return vertexArray instanceof HydVertexArray;
                },
            };
        }
        if (extensionName === 'ANGLE_instanced_arrays') {
            return {
                VERTEX_ATTRIB_ARRAY_DIVISOR_ANGLE: WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_DIVISOR,
                drawArraysInstancedANGLE: this.drawArraysInstanced.bind(this),
                drawElementsInstancedANGLE: this.drawElementsInstanced.bind(this),
                vertexAttribDivisorANGLE: this.vertexAttribDivisor.bind(this),
            };
        }
        if (extensionName === 'OES_texture_float' ||
            extensionName === 'OES_texture_float_linear' ||
            extensionName === 'OES_element_index_uint' ||
            extensionName === 'OES_standard_derivatives' ||
            extensionName === 'EXT_shader_texture_lod' ||
            extensionName === 'WEBGL_depth_texture' ||
            extensionName === 'EXT_color_buffer_float' ||
            extensionName === 'WEBGL_color_buffer_float' ||
            extensionName === 'EXT_blend_minmax') {
            return {};
        }
        console.warn("extension required: " + extensionName);
        return null;
    }
    getBufferParameter(target, pname) {
        let buffer = null;
        switch (target) {
            case WebGL2RenderingContext.ARRAY_BUFFER:
                buffer = this.hydGlobalState.commonState.arrayBufferBinding;
                break;
            case WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER:
                buffer = this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
                break;
            default:
                throw new Error("unsupported target: " + target);
        }
        switch (pname) {
            case WebGL2RenderingContext.BUFFER_SIZE:
                return buffer.buffer.size;
            case WebGL2RenderingContext.BUFFER_USAGE:
                return buffer.buffer.usage;
            default:
                throw new Error("unsupported pname: " + pname);
        }
    }
    getRenderbufferParameter(target, pname) {
        if (target !== WebGL2RenderingContext.RENDERBUFFER || !this.hydGlobalState.commonState.renderbufferBinding) {
            this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_OPERATION;
            return null;
        }
        const renderbuffer = this.hydGlobalState.commonState.renderbufferBinding;
        switch (pname) {
            case WebGL2RenderingContext.RENDERBUFFER_WIDTH:
                return renderbuffer.width;
            case WebGL2RenderingContext.RENDERBUFFER_HEIGHT:
                return renderbuffer.height;
            case WebGL2RenderingContext.RENDERBUFFER_INTERNAL_FORMAT:
                return renderbuffer.format;
            default:
                throw new Error("unsupported getRenderbufferParameter: " + pname);
        }
    }
    getFramebufferAttachmentParameter(target, attachment, pname) {
        const framebuffer = this.getFramebufferForTarget(target);
        const attrib = framebuffer.attachments.get(attachment);
        if (!attrib) {
            return pname === WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE ? WebGL2RenderingContext.NONE : null;
        }
        switch (pname) {
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE:
                return WebGL2RenderingContext.TEXTURE;
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME:
                return attrib.attachment;
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL:
                return attrib.level || 0;
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE:
                return attrib.face || 0;
            default:
                throw new Error("unsupported getFramebufferAttachmentParameter: " + pname);
        }
    }
    getAttribLocation(program, attribName) {
        const attrib = program.hydAttributes.find((item) => item.name === attribName);
        return attrib ? attrib.location : -1;
    }
    getUniformLocation(program, uniformName) {
        const ret = program.hydUniforms.find((uniform) => !uniform.internal && uniform.name === uniformName) || program.hydSamplers.find((sampler) => sampler.name === uniformName);
        if (ret) {
            return ret;
        }
        else {
            return null;
        }
    }
    isTexture(texture) {
        return Boolean(this.lookupTexture(texture));
    }
    isBuffer(buffer) {
        return Boolean(this.lookupBuffer(buffer));
    }
    isFramebuffer(framebuffer) {
        return framebuffer instanceof HydFramebuffer;
    }
    isRenderbuffer(renderbuffer) {
        return renderbuffer instanceof HydTexture;
    }
    isProgram(program) {
        return program instanceof HydProgram;
    }
    isShader(shader) {
        return shader instanceof HydShader;
    }
    isVertexArray(vertexArray) {
        return vertexArray instanceof HydVertexArray;
    }
    polygonOffset(x, y) {
        this.hydGlobalState.polygonState.polygonOffsetFactor = x;
        this.hydGlobalState.polygonState.polygonOffsetUnits = y;
    }
    shaderSource(shader, source) {
        shader.sourceLength = source.length;
        shader.glsl_shader = source.trim();
    }
    uniform1f(pub, x0) {
        pub.float32View[pub.wordOffset] = x0;
    }
    uniform2f(pub, x0, x1) {
        const a = pub.float32View;
        const offset = pub.wordOffset;
        a[offset] = x0;
        a[offset + 1] = x1;
    }
    uniform3f(pub, x0, x1, x2) {
        const a = pub.float32View;
        const offset = pub.wordOffset;
        a[offset] = x0;
        a[offset + 1] = x1;
        a[offset + 2] = x2;
    }
    uniform4f(pub, x0, x1, x2, x3) {
        const a = pub.float32View;
        const offset = pub.wordOffset;
        a[offset] = x0;
        a[offset + 1] = x1;
        a[offset + 2] = x2;
        a[offset + 3] = x3;
    }
    uniform1i(uniform, x0) {
        if (uniform instanceof ProgramUniformSampler) {
            if (uniform.textureUnit !== x0) {
                uniform.textureUnit = x0;
                this.samplerOriginStateVersion++;
                this.hydGlobalState.recordTransition("uniformSampler", uniform.name, x0);
            }
            return;
        }
        const offset = uniform.wordOffset;
        uniform.int32View[offset] = x0;
    }
    uniform2i(pub, x0, x1) {
        const a = pub.int32View;
        const offset = pub.wordOffset;
        a[offset] = x0;
        a[offset + 1] = x1;
    }
    uniform3i(pub, x0, x1, x2) {
        const a = pub.int32View;
        const offset = pub.wordOffset;
        a[offset] = x0;
        a[offset + 1] = x1;
        a[offset + 2] = x2;
    }
    uniform4i(pub, x0, x1, x2, x3) {
        const a = pub.int32View;
        const offset = pub.wordOffset;
        a[offset] = x0;
        a[offset + 1] = x1;
        a[offset + 2] = x2;
        a[offset + 3] = x3;
    }
    uniform1fv(pub, v) {
        pub.float32View.set(v, pub.wordOffset);
    }
    uniform2fv(pub, v) {
        pub.float32View.set(v, pub.wordOffset);
    }
    uniform3fv(pub, v) {
        pub.float32View.set(v, pub.wordOffset);
    }
    uniform4fv(pub, v) {
        pub.float32View.set(v, pub.wordOffset);
    }
    uniform1iv(pub, v) {
        pub.int32View.set(v, pub.wordOffset);
    }
    uniform2iv(pub, v) {
        pub.int32View.set(v, pub.wordOffset);
    }
    uniform3iv(pub, v) {
        pub.int32View.set(v, pub.wordOffset);
    }
    uniform4iv(pub, v) {
        pub.int32View.set(v, pub.wordOffset);
    }
    uniformMatrix2fv(pub, transpose, v) {
        pub.float32View.set(v, pub.wordOffset);
    }
    uniformMatrix3fv(pub, transpose, v) {
        pub.float32View.set(v, pub.wordOffset);
    }
    uniformMatrix4fv(pub, transpose, v) {
        pub.float32View.set(v, pub.wordOffset);
    }
    createProgram() {
        return new HydProgram(this.hydDevice, this.shaderTranslator);
    }
    createShader(type) {
        return new HydShader(this.hydDevice, type, this.shaderTranslator);
    }
    createBuffer() {
        return new HydBuffer(this.hydDevice);
    }
    createTexture() {
        return new HydTexture(this.hydDevice);
    }
    createFramebuffer() {
        return new HydFramebuffer();
    }
    createRenderbuffer() {
        return new HydTexture(this.hydDevice);
    }
    createVertexArray() {
        return new HydVertexArray();
    }
    currentTexture(target) {
        const viewDimension = enumToViewDimension.get(target);
        const texture = viewDimension
            ? this.hydGlobalState.getTextureUnitBinding(this.hydGlobalState.commonState.activeTextureUnit, viewDimension)
            : null;
        if (!texture) {
            this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_OPERATION;
            throw new Error("No texture bound to active texture unit");
        }
        return texture;
    }
    isSupportedTextureUploadFormat(internalformat, format, type) {
        return ((internalformat === WebGL2RenderingContext.RGBA || internalformat === WebGL2RenderingContext.RGBA8) && format === WebGL2RenderingContext.RGBA && (type === WebGL2RenderingContext.UNSIGNED_BYTE || type === WebGL2RenderingContext.FLOAT))
            || (internalformat === WebGL2RenderingContext.DEPTH_COMPONENT32F && format === WebGL2RenderingContext.DEPTH_COMPONENT && type === WebGL2RenderingContext.FLOAT)
            || ((internalformat === WebGL2RenderingContext.DEPTH_COMPONENT ||
                internalformat === WebGL2RenderingContext.DEPTH_COMPONENT16 ||
                internalformat === WebGL2RenderingContext.DEPTH_COMPONENT24) &&
                format === WebGL2RenderingContext.DEPTH_COMPONENT &&
                (type === WebGL2RenderingContext.UNSIGNED_INT || type === WebGL2RenderingContext.UNSIGNED_SHORT))
            || (internalformat === WebGL2RenderingContext.LUMINANCE && format === WebGL2RenderingContext.LUMINANCE && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (internalformat === WebGL2RenderingContext.ALPHA && format === WebGL2RenderingContext.ALPHA && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (internalformat === WebGL2RenderingContext.LUMINANCE_ALPHA && format === WebGL2RenderingContext.LUMINANCE_ALPHA && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (internalformat === WebGL2RenderingContext.RGB && format === WebGL2RenderingContext.RGB && type === WebGL2RenderingContext.UNSIGNED_BYTE);
    }
    getFramebufferForTarget(target) {
        if (target === WebGL2RenderingContext.FRAMEBUFFER || target === WebGL2RenderingContext.DRAW_FRAMEBUFFER) {
            return this.hydGlobalState.commonState.drawFramebufferBinding;
        }
        if (target === WebGL2RenderingContext.READ_FRAMEBUFFER) {
            return this.hydGlobalState.commonState.readFramebufferBinding;
        }
        throw new Error("unsupported framebuffer target: " + target);
    }
    getDrawFramebufferHeight() {
        const framebuffer = this.hydGlobalState.commonState.drawFramebufferBinding;
        if (framebuffer === this.hydGlobalState.defaultFramebuffer || framebuffer.drawBuffers.includes(WebGL2RenderingContext.BACK)) {
            return this.hydCanvas.height;
        }
        for (const attachment of framebuffer.attachments.values()) {
            if (attachment.height > 0) {
                return attachment.height;
            }
        }
        return this.hydCanvas.height;
    }
    toGpuViewport() {
        const [x, y, width, height, minDepth, maxDepth] = this.hydGlobalState.commonState.viewport;
        const framebufferHeight = this.getDrawFramebufferHeight();
        return [x, framebufferHeight - y - height, width, height, minDepth, maxDepth];
    }
    toGpuScissorRect() {
        const [x, y, width, height] = this.hydGlobalState.miscState.scissorBox;
        const framebufferHeight = this.getDrawFramebufferHeight();
        return [x, framebufferHeight - y - height, width, height];
    }
    setGpuViewport() {
        const viewport = this.hydGlobalState.commonState.viewport;
        const framebufferHeight = this.getDrawFramebufferHeight();
        this.hydRpCache.RpSetViewportValues(viewport[0], framebufferHeight - viewport[1] - viewport[3], viewport[2], viewport[3], viewport[4], viewport[5]);
    }
    setGpuScissorRect() {
        const scissorBox = this.hydGlobalState.miscState.scissorBox;
        const framebufferHeight = this.getDrawFramebufferHeight();
        this.hydRpCache.RpSetScissorRectValues(scissorBox[0], framebufferHeight - scissorBox[1] - scissorBox[3], scissorBox[2], scissorBox[3]);
    }
    blendUsesConstantFactor() {
        const blend = this.hydGlobalState.blendState;
        return blend.srcRGB === "constant" ||
            blend.dstRGB === "constant" ||
            blend.srcAlpha === "constant" ||
            blend.dstAlpha === "constant" ||
            blend.srcRGB === "one-minus-constant" ||
            blend.dstRGB === "one-minus-constant" ||
            blend.srcAlpha === "one-minus-constant" ||
            blend.dstAlpha === "one-minus-constant";
    }
    samplerNeedsOriginFlip(texture) {
        return !!texture && (texture.sourceOrigin === "render-target" || texture.sourceOrigin === "copy");
    }
    getColorWriteMask() {
        const [r, g, b, a] = this.hydGlobalState.miscState.colorWriteMask;
        return (r ? GPUColorWrite.RED : 0) |
            (g ? GPUColorWrite.GREEN : 0) |
            (b ? GPUColorWrite.BLUE : 0) |
            (a ? GPUColorWrite.ALPHA : 0);
    }
    getMaskedClearTargets() {
        return this.hydGlobalState.commonState.drawFramebufferBinding.drawBuffers.flatMap((value) => {
            if (value === WebGL2RenderingContext.BACK) {
                return this.hydGlobalState.__canvasView ? [{ view: this.hydGlobalState.__canvasView, format: "bgra8unorm" }] : [];
            }
            if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                const attachment = this.hydGlobalState.commonState.drawFramebufferBinding.attachments.get(value);
                return attachment ? [{ view: attachment.view, format: attachment.format }] : [];
            }
            return [];
        });
    }
    getMaskedClearPipeline(targets, writeMask) {
        const key = `${targets.map((target) => target.format).join(",")}|${writeMask}`;
        let pipeline = this.maskedClearPipelines.get(key);
        if (!pipeline) {
            const outputs = targets.map((_, index) => `    @location(${index}) color${index}: vec4<f32>,`).join("\n");
            const assignments = targets.map((_, index) => `    out.color${index} = _hyd_clear_.color;`).join("\n");
            const module = this.hydDevice.createShaderModule({
                label: `masked-clear-shader-${key}`,
                code: `
struct ClearUniforms {
    color: vec4<f32>,
};
struct FragmentOutput {
${outputs}
};
@group(0) @binding(0) var<uniform> _hyd_clear_: ClearUniforms;
@vertex
fn vs(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4<f32> {
    let positions = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(3.0, -1.0),
        vec2<f32>(-1.0, 3.0)
    );
    return vec4<f32>(positions[vertex_index], 0.0, 1.0);
}
@fragment
fn fs() -> FragmentOutput {
    var out: FragmentOutput;
${assignments}
    return out;
}
`,
            });
            pipeline = this.hydDevice.createRenderPipeline({
                label: `masked-clear-pipeline-${key}`,
                layout: "auto",
                vertex: { module, entryPoint: "vs" },
                fragment: {
                    module,
                    entryPoint: "fs",
                    targets: targets.map((target) => ({ format: target.format, writeMask })),
                },
                primitive: { topology: "triangle-list" },
            });
            this.maskedClearPipelines.set(key, pipeline);
        }
        return pipeline;
    }
    clearColorWithMask() {
        const writeMask = this.getColorWriteMask();
        if (writeMask === 0) {
            return;
        }
        const targets = this.getMaskedClearTargets();
        if (targets.length === 0) {
            return;
        }
        if (!this.maskedClearUniformBuffer) {
            this.maskedClearUniformBuffer = this.hydDevice.createBuffer({
                label: "masked-clear-uniforms",
                size: 16,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
            });
        }
        this.hydDevice.queue.writeBuffer(this.maskedClearUniformBuffer, 0, new Float32Array(this.hydGlobalState.clearState.color));
        const pipeline = this.getMaskedClearPipeline(targets, writeMask);
        const bindGroup = this.hydDevice.createBindGroup({
            label: "masked-clear-bind-group",
            layout: pipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: { buffer: this.maskedClearUniformBuffer } }],
        });
        const commandEncoder = this.hydDevice.createCommandEncoder({ label: "masked-clear-commandEncoder" });
        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: targets.map((target) => ({
                view: target.view,
                loadOp: "load",
                storeOp: "store",
            })),
        });
        if (this.hydGlobalState.miscState.scissorTest) {
            renderPass.setScissorRect(...this.toGpuScissorRect());
        }
        renderPass.setPipeline(pipeline);
        renderPass.setBindGroup(0, bindGroup);
        renderPass.draw(3);
        renderPass.end();
        this.hydDevice.queue.submit([commandEncoder.finish()]);
    }
    bindRenderbuffer(target, renderbuffer) {
        if (target === WebGL2RenderingContext.RENDERBUFFER) {
            this.hydGlobalState.commonState.renderbufferBinding = renderbuffer;
        }
        else {
            console.warn("unknown target: " + target);
        }
        this.hydGlobalState.recordTransition("bindRenderbuffer", target, renderbuffer ? renderbuffer.hash : "null");
    }
    renderbufferStorage(target, internalFormat, width, height) {
        if (target === WebGL2RenderingContext.RENDERBUFFER) {
            const renderbuffer = this.hydGlobalState.commonState.renderbufferBinding;
            if (!renderbuffer) {
                this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_OPERATION;
                throw new Error("renderbufferStorage called with no renderbuffer bound");
            }
            switch (internalFormat) {
                case WebGL2RenderingContext.DEPTH_COMPONENT16:
                    renderbuffer.renderbufferStorage('depth16unorm', width, height);
                    break;
                case WebGL2RenderingContext.DEPTH_COMPONENT24:
                    renderbuffer.renderbufferStorage('depth24plus', width, height);
                    break;
                case WebGL2RenderingContext.DEPTH24_STENCIL8:
                case WebGL2RenderingContext.DEPTH_STENCIL:
                    renderbuffer.renderbufferStorage('depth24plus-stencil8', width, height);
                    break;
                case WebGL2RenderingContext.DEPTH_COMPONENT32F:
                    renderbuffer.renderbufferStorage('depth32float', width, height);
                    break;
                case WebGL2RenderingContext.STENCIL_INDEX8:
                    renderbuffer.renderbufferStorage('stencil8', width, height);
                    break;
                case WebGL2RenderingContext.RGBA32F:
                    renderbuffer.renderbufferStorage('rgba32float', width, height);
                    break;
                case WebGL2RenderingContext.RGBA4:
                case WebGL2RenderingContext.RGB565:
                case WebGL2RenderingContext.RGB5_A1:
                    renderbuffer.renderbufferStorage('rgba8unorm', width, height);
                    break;
                default:
                    throw new Error("unsupported internalFormat: " + internalFormat);
            }
        }
        else {
            console.warn("unknown target: " + target);
        }
        this.hydGlobalState.recordTransition("renderbufferStorage", target, internalFormat, width, height);
    }
    enableVertexAttribArray(index) {
        const attribute = this.hydGlobalState.commonState.vertexArrayBinding.attributes[index];
        if (!attribute.enabled) {
            attribute.enabled = true;
            attribute.updateHash();
            this.hydGlobalState.recordTransition("enableVertexAttribArray", index);
        }
    }
    disableVertexAttribArray(index) {
        const attribute = this.hydGlobalState.commonState.vertexArrayBinding.attributes[index];
        if (attribute.enabled) {
            attribute.enabled = false;
            attribute.updateHash();
            this.hydGlobalState.recordTransition("disableVertexAttribArray", index);
        }
    }
    setCurrentVertexAttrib(index, x, y, z, w) {
        const values = this.hydGlobalState.currentVertexAttribValues[index];
        values[0] = x;
        values[1] = y;
        values[2] = z;
        values[3] = w;
        this.hydGlobalState.recordTransition("vertexAttrib", index, x, y, z, w);
    }
    vertexAttrib1f(index, x) {
        this.setCurrentVertexAttrib(index, x, 0, 0, 1);
    }
    vertexAttrib2f(index, x, y) {
        this.setCurrentVertexAttrib(index, x, y, 0, 1);
    }
    vertexAttrib3f(index, x, y, z) {
        this.setCurrentVertexAttrib(index, x, y, z, 1);
    }
    vertexAttrib4f(index, x, y, z, w) {
        this.setCurrentVertexAttrib(index, x, y, z, w);
    }
    vertexAttrib1fv(index, values) {
        this.vertexAttrib1f(index, values[0]);
    }
    vertexAttrib2fv(index, values) {
        this.vertexAttrib2f(index, values[0], values[1]);
    }
    vertexAttrib3fv(index, values) {
        this.vertexAttrib3f(index, values[0], values[1], values[2]);
    }
    vertexAttrib4fv(index, values) {
        this.vertexAttrib4f(index, values[0], values[1], values[2], values[3]);
    }
    clearColor(r, g, b, a) {
        const [r1, g1, b1, a1] = this.hydGlobalState.clearState.color;
        if (r !== r1 || g !== g1 || b !== b1 || a !== a1) {
            this.hydGlobalState.clearState.color = [r, g, b, a];
            this.hydGlobalState.recordTransition("clearColor", r, g, b, a);
        }
    }
    clearDepth(depth) {
        if (this.hydGlobalState.clearState.depth !== depth) {
            this.hydGlobalState.clearState.depth = depth;
            this.hydGlobalState.recordTransition("clearDepth", depth);
        }
    }
    clearStencil(stencil) {
        if (this.hydGlobalState.clearState.stencil !== stencil) {
            this.hydGlobalState.clearState.stencil = stencil;
            this.hydGlobalState.recordTransition("clearStencil", stencil);
        }
    }
    clear(mask) {
        ensureAutoFrame();
        let effectiveMask = mask;
        let needsMaskedColorClear = false;
        if (mask & WebGL2RenderingContext.COLOR_BUFFER_BIT) {
            const writeMask = this.getColorWriteMask();
            const fullWriteMask = GPUColorWrite.RED | GPUColorWrite.GREEN | GPUColorWrite.BLUE | GPUColorWrite.ALPHA;
            if (writeMask === 0) {
                effectiveMask &= ~WebGL2RenderingContext.COLOR_BUFFER_BIT;
            }
            else if (writeMask !== fullWriteMask || this.hydGlobalState.miscState.scissorTest) {
                effectiveMask &= ~WebGL2RenderingContext.COLOR_BUFFER_BIT;
                needsMaskedColorClear = true;
            }
        }
        if ((mask & WebGL2RenderingContext.DEPTH_BUFFER_BIT) && !this.hydGlobalState.depthState.writeMask) {
            effectiveMask &= ~WebGL2RenderingContext.DEPTH_BUFFER_BIT;
        }
        const canUseLoadOpClear = effectiveMask !== 0 &&
            !needsMaskedColorClear &&
            !this.hydGlobalState.miscState.scissorTest &&
            !this.hydRpCache.hasActiveRenderPass();
        if (canUseLoadOpClear) {
            if (this.hydGlobalState.clearState.target !== effectiveMask) {
                this.hydGlobalState.clearState.target = effectiveMask;
                this.hydGlobalState.recordTransition("clear", effectiveMask);
            }
            return;
        }
        this.updateCanvasSize();
        this._der_flush();
        if (needsMaskedColorClear) {
            this.clearColorWithMask();
        }
        if (effectiveMask === 0) {
            return;
        }
        if (this.hydGlobalState.miscState.scissorTest) {
            this.hydGlobalState.recordTransition("clear", 0);
            return;
        }
        const previousTarget = this.hydGlobalState.clearState.target;
        this.hydGlobalState.clearState.target = effectiveMask;
        this.hydRpCache.RpClear(this.bindedGetRenderPassDesc);
        this.hydGlobalState.clearState.target = previousTarget;
        this.hydGlobalState.recordTransition("clear", effectiveMask);
    }
    depthFunc(func) {
        const tmp = enumToCompareFunction.get(func);
        if (this.hydGlobalState.depthState.func !== tmp) {
            this.hydGlobalState.depthState.func = tmp;
            this.hydGlobalState.recordTransition("depthFunc", func);
        }
    }
    depthMask(flag) {
        if (this.hydGlobalState.depthState.writeMask !== flag) {
            this.hydGlobalState.depthState.writeMask = flag;
            this.hydGlobalState.recordTransition("depthMask", flag);
        }
    }
    colorMask(r, g, b, a) {
        const [r1, g1, b1, a1] = this.hydGlobalState.miscState.colorWriteMask;
        if (r !== r1 || g !== g1 || b !== b1 || a !== a1) {
            this.hydGlobalState.miscState.colorWriteMask = [r, g, b, a];
            this.hydGlobalState.recordTransition("colorMask", r, g, b, a);
        }
    }
    frontFace(mode) {
        let tmp = enumToFrontFace.get(mode);
        if (this.hydGlobalState.polygonState.frontFace !== tmp) {
            this.hydGlobalState.polygonState.frontFace = tmp;
            this.hydGlobalState.recordTransition("frontFace", mode);
        }
    }
    cullFace(mode) {
        let tmp = enumToCullFace.get(mode);
        if (this.hydGlobalState.polygonState.cullFaceMode !== tmp) {
            this.hydGlobalState.polygonState.cullFaceMode = tmp;
            this.hydGlobalState.recordTransition("cullFace", mode);
        }
    }
    bindBuffer(target, buffer) {
        const hydBuffer = buffer instanceof HydBuffer ? buffer : this.normalizeBuffer(buffer);
        if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER) {
            if (this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding !== hydBuffer) {
                this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding = hydBuffer;
                this.hydGlobalState.recordTransition("bindBuffer", target, hydBuffer ? hydBuffer.hash : "null");
            }
        }
        else if (target === WebGL2RenderingContext.ARRAY_BUFFER) {
            if (this.hydGlobalState.commonState.arrayBufferBinding !== hydBuffer) {
                this.hydGlobalState.commonState.arrayBufferBinding = hydBuffer;
            }
        }
        else {
            throw new Error("unsupported buffer target: " + target);
        }
    }
    bufferData(target, data, usage) {
        this._der_flush();
        let buffer;
        if (target === WebGL2RenderingContext.ARRAY_BUFFER) {
            buffer = this.hydGlobalState.commonState.arrayBufferBinding;
            if (!buffer) {
                this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_OPERATION;
                throw new Error("bufferData called with no ARRAY_BUFFER bound");
            }
            buffer.descriptor.usage |= GPUBufferUsage.VERTEX;
        }
        else if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER) {
            buffer = this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
            if (!buffer) {
                this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_OPERATION;
                throw new Error("bufferData called with no ELEMENT_ARRAY_BUFFER bound");
            }
            buffer.descriptor.usage |= GPUBufferUsage.INDEX;
        }
        else {
            throw new Error("unsupported buffer target: " + target);
        }
        if (typeof data === 'number') {
            buffer.descriptor.size = (data + 3) & (~3);
            buffer.write();
        }
        else {
            buffer.descriptor.size = (data.byteLength + 3) & (~3);
            buffer.write(data, 0);
        }
        if (usage !== WebGL2RenderingContext.STATIC_DRAW && usage !== WebGL2RenderingContext.DYNAMIC_DRAW && usage !== WebGL2RenderingContext.STREAM_DRAW) {
            throw new Error("unsupported buffer usage: " + usage);
        }
    }
    bufferSubData(target, dstOffset, data) {
        let buffer;
        if (target === WebGL2RenderingContext.ARRAY_BUFFER) {
            buffer = this.hydGlobalState.commonState.arrayBufferBinding;
            if (!buffer) {
                this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_OPERATION;
                throw new Error("bufferSubData called with no ARRAY_BUFFER bound");
            }
        }
        else if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER) {
            buffer = this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
            if (!buffer) {
                this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_OPERATION;
                throw new Error("bufferSubData called with no ELEMENT_ARRAY_BUFFER bound");
            }
        }
        else {
            throw new Error("unsupported buffer target: " + target);
        }
        buffer.write(data, dstOffset);
    }
    getActiveUniform(program, index) {
        const publicUniforms = program.hydUniforms.filter((uniform) => !uniform.internal);
        if (index < publicUniforms.length) {
            return {
                name: publicUniforms[index].name,
                size: publicUniforms[index].size,
                type: publicUniforms[index].webgl_type,
            };
        }
        else {
            return {
                name: program.hydSamplers[index - publicUniforms.length].name,
                size: program.hydSamplers[index - publicUniforms.length].size,
                type: program.hydSamplers[index - publicUniforms.length].webgl_type,
            };
        }
    }
    getUniformIndices(program, uniformNames) {
        const publicUniforms = program.hydUniforms.filter((uniform) => !uniform.internal);
        return uniformNames.map((name) => {
            const uniformIndex = publicUniforms.findIndex((uniform) => uniform.name === name);
            if (uniformIndex >= 0) {
                return uniformIndex;
            }
            const samplerIndex = program.hydSamplers.findIndex((sampler) => sampler.name === name);
            if (samplerIndex >= 0) {
                return publicUniforms.length + samplerIndex;
            }
            return 0xffffffff;
        });
    }
    getActiveUniforms(program, uniformIndices, pname) {
        const publicUniforms = program.hydUniforms.filter((uniform) => !uniform.internal);
        const entries = [...publicUniforms, ...program.hydSamplers];
        return uniformIndices.map((index) => {
            const entry = entries[index];
            if (!entry) {
                return null;
            }
            switch (pname) {
                case WebGL2RenderingContext.UNIFORM_TYPE:
                    return entry.webgl_type;
                case WebGL2RenderingContext.UNIFORM_SIZE:
                    return entry.size;
                case WebGL2RenderingContext.UNIFORM_BLOCK_INDEX:
                    return -1;
                case WebGL2RenderingContext.UNIFORM_OFFSET:
                    return entry instanceof ProgramUniformBuffer ? entry.offset : -1;
                case WebGL2RenderingContext.UNIFORM_ARRAY_STRIDE:
                case WebGL2RenderingContext.UNIFORM_MATRIX_STRIDE:
                    return 0;
                case WebGL2RenderingContext.UNIFORM_IS_ROW_MAJOR:
                    return false;
                default:
                    this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_ENUM;
                    return null;
            }
        });
    }
    getActiveAttrib(program, index) {
        return {
            name: program.hydAttributes[index].name,
            size: program.hydAttributes[index].size,
            type: program.hydAttributes[index].type,
        };
    }
    attachShader(program, shader) {
        program.attachShader(shader);
    }
    compileShader(s) {
        const shader = GLOB_GL_CTX.createShader(s.type);
        GLOB_GL_CTX.shaderSource(shader, s.glsl_shader);
        GLOB_GL_CTX.compileShader(shader);
        s.translated_glsl_shader = GLOB_GL_CTX.getExtension('WEBGL_debug_shaders').getTranslatedShaderSource(shader);
        s.compileShader();
    }
    useProgram(program) {
        if (this.hydGlobalState.commonState.currentProgram !== program) {
            this.hydGlobalState.commonState.currentProgram = program;
            this.hydGlobalState.recordTransition("useProgram", program.hash);
        }
    }
    linkProgram(program) {
        program.linkProgram();
    }
    bindVertexArray(vertexArray) {
        const target = vertexArray || this.hydGlobalState.defaultVertexArrayBinding;
        if (this.hydGlobalState.commonState.vertexArrayBinding !== target) {
            this.hydGlobalState.commonState.vertexArrayBinding = target;
            this.hydGlobalState.recordTransition("bindVertexArray", target.hash);
        }
    }
    activeTexture(texture) {
        const target = texture - WebGL2RenderingContext.TEXTURE0;
        if (this.hydGlobalState.commonState.activeTextureUnit !== target) {
            this.hydGlobalState.commonState.activeTextureUnit = target;
        }
    }
    bindTexture(target, texture) {
        const vd = enumToViewDimension.get(target);
        if (!vd) {
            this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_ENUM;
            return;
        }
        const hydTexture = texture instanceof HydTexture ? texture : this.normalizeTexture(texture);
        const textureUnit = this.hydGlobalState.commonState.activeTextureUnit;
        const previous = this.hydGlobalState.getTextureUnitBinding(textureUnit, vd);
        if (hydTexture === null) {
            if (previous === null) {
                return;
            }
            if (this.samplerNeedsOriginFlip(previous) !== false) {
                this.samplerOriginStateVersion++;
            }
            this.hydGlobalState.setTextureUnitBinding(textureUnit, vd, null);
            this.hydGlobalState.recordTransition("bindTexture", target, "null");
            return;
        }
        if (previous === hydTexture && hydTexture.viewDimension === vd) {
            return;
        }
        hydTexture.viewDimension = vd;
        if (this.samplerNeedsOriginFlip(previous) !== this.samplerNeedsOriginFlip(hydTexture)) {
            this.samplerOriginStateVersion++;
        }
        this.hydGlobalState.setTextureUnitBinding(textureUnit, vd, hydTexture);
        this.hydGlobalState.recordTransitionOne(hydTexture.hash);
    }
    texImage2D(...args) {
        this._der_flush();
        console.assert(args.length === 9 || args.length === 6);
        const target = args.at(0);
        const level = args.at(1);
        const internalformat = args.at(2);
        let width;
        let height;
        const border = 0;
        const format = args.at(-3);
        const type = args.at(-2);
        const pixels = args.at(-1);
        if (args.length === 6) {
            if (pixels instanceof HTMLVideoElement) {
                width = pixels.videoWidth;
                height = pixels.videoHeight;
            }
            else if (pixels !== null && "width" in pixels && "height" in pixels) {
                width = pixels.width;
                height = pixels.height;
            }
            else {
                throw new Error("unsupported texImage2D: " + args);
            }
        }
        else {
            width = args.at(3);
            height = args.at(4);
        }
        if (!this.isSupportedTextureUploadFormat(internalformat, format, type)) {
            throw new Error("unsupported texImage2D: " + args);
        }
        const unpack = this.hydGlobalState.miscState.unpackState;
        this.currentTexture(target).texImage2D(pixels, target, level, internalformat, width, height, border, format, type, unpack);
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("texImage2D", target, level, internalformat, width, height, border, format, type);
    }
    texSubImage2D(...args) {
        this._der_flush();
        console.assert(args.length === 7 || args.length === 9);
        const target = args.at(0);
        const level = args.at(1);
        const xoffset = args.at(2);
        const yoffset = args.at(3);
        let width;
        let height;
        let format;
        let type;
        let pixels;
        if (args.length === 7) {
            format = args.at(4);
            type = args.at(5);
            pixels = args.at(6);
            if (pixels instanceof HTMLVideoElement) {
                width = pixels.videoWidth;
                height = pixels.videoHeight;
            }
            else if (pixels && "width" in pixels && "height" in pixels) {
                width = pixels.width;
                height = pixels.height;
            }
            else {
                throw new Error("unsupported texSubImage2D: " + args);
            }
        }
        else {
            width = args.at(4);
            height = args.at(5);
            format = args.at(6);
            type = args.at(7);
            pixels = args.at(8);
        }
        if (!this.isSupportedTextureUploadFormat(format, format, type)) {
            throw new Error("unsupported texSubImage2D: " + args);
        }
        const unpack = this.hydGlobalState.miscState.unpackState;
        this.currentTexture(target).texSubImage2D(pixels, target, level, xoffset, yoffset, width, height, format, type, unpack);
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("texSubImage2D", target, level, xoffset, yoffset, width, height, format, type);
    }
    texImage3D(...args) {
        this._der_flush();
        if (args.length === 10) {
            args.push(0);
        }
        console.assert(args.length === 11);
        const [target, level, internalformat, width, height, depth, border, format, type, pixels, offset] = args;
        if (pixels instanceof HTMLVideoElement
            || border !== 0) {
            throw new Error("unsupported texImage3D: " + args);
        }
        this.currentTexture(target).texImage3D(pixels, target, level, internalformat, width, height, depth, border, format, type, offset);
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("texImage3D", target, level, internalformat, width, height, depth, border, format, type, offset);
    }
    texParameteri(target, pname, param) {
        const texture = this.currentTexture(target);
        console.assert(enumToViewDimension.get(target) === texture.viewDimension);
        texture.texParameteri(pname, param);
        this.hydGlobalState.recordTransition("texParameteri", target, pname, param);
    }
    generateMipmap(target) {
        console.assert(target === WebGL2RenderingContext.TEXTURE_2D || target === WebGL2RenderingContext.TEXTURE_CUBE_MAP);
        this.currentTexture(target);
        this.hydGlobalState.recordTransition("generateMipmap", target);
    }
    getTexParameter(target, pname) {
        const texture = this.currentTexture(target);
        const state = texture.state;
        switch (pname) {
            case WebGL2RenderingContext.TEXTURE_MIN_FILTER:
                return state.minFilter;
            case WebGL2RenderingContext.TEXTURE_MAG_FILTER:
                return state.magFilter;
            case WebGL2RenderingContext.TEXTURE_WRAP_S:
                return state.wrapS;
            case WebGL2RenderingContext.TEXTURE_WRAP_T:
                return state.wrapT;
            case WebGL2RenderingContext.TEXTURE_WRAP_R:
                return state.wrapR;
            default:
                throw new Error("unsupported getTexParameter: " + target + ", " + pname);
        }
    }
    viewport(x, y, width, height) {
        const viewport = this.hydGlobalState.commonState.viewport;
        if (viewport[0] !== x || viewport[1] !== y || viewport[2] !== width || viewport[3] !== height) {
            this._der_flush();
            this.gpuViewportDirty = true;
        }
        this.hydGlobalState.commonState.viewport[0] = x;
        this.hydGlobalState.commonState.viewport[1] = y;
        this.hydGlobalState.commonState.viewport[2] = width;
        this.hydGlobalState.commonState.viewport[3] = height;
        this.hydGlobalState.recordTransition("viewport", x, y, width, height);
    }
    scissor(x, y, width, height) {
        const scissorBox = this.hydGlobalState.miscState.scissorBox;
        if (scissorBox[0] !== x || scissorBox[1] !== y || scissorBox[2] !== width || scissorBox[3] !== height) {
            this._der_flush();
            this.gpuScissorDirty = true;
        }
        this.hydGlobalState.miscState.scissorBox = [x, y, width, height];
        this.hydGlobalState.recordTransition("scissor", x, y, width, height);
    }
    depthRange(zNear, zFar) {
        const viewport = this.hydGlobalState.commonState.viewport;
        if (viewport[4] !== zNear || viewport[5] !== zFar) {
            this._der_flush();
            this.gpuViewportDirty = true;
        }
        this.hydGlobalState.commonState.viewport[4] = zNear;
        this.hydGlobalState.commonState.viewport[5] = zFar;
        this.hydGlobalState.recordTransition("depthRange", zNear, zFar);
    }
    vertexAttribDivisor(index, divisor) {
        const buffer = this.hydGlobalState.commonState.arrayBufferBinding;
        buffer.descriptor.usage |= GPUBufferUsage.VERTEX;
        const attribute = this.hydGlobalState.commonState.vertexArrayBinding.attributes[index];
        attribute.divisor = divisor;
        attribute.updateHash();
        this.hydGlobalState.recordTransition("vertexAttribDivisor", index, divisor);
    }
    vertexAttribPointer(index, size, type, normalized, _stride, offset) {
        const buffer = this.hydGlobalState.commonState.arrayBufferBinding;
        const attribute = this.hydGlobalState.commonState.vertexArrayBinding.attributes[index];
        const stride = _stride || size * 4;
        if (attribute.size !== size || attribute.type !== type || attribute.normalized !== normalized || attribute.stride !== stride || attribute.offset !== offset || attribute.buffer !== buffer) {
            const formatChanged = attribute.size !== size || attribute.type !== type || attribute.normalized !== normalized;
            attribute.size = size;
            attribute.type = type;
            attribute.normalized = normalized;
            attribute.int = false;
            attribute.stride = stride;
            attribute.offset = offset;
            attribute.buffer = buffer;
            attribute.shaderLocation = index;
            if (formatChanged || !attribute.format) {
                attribute.format = getVertexFormat(type, size, normalized);
            }
            attribute.updateHash();
            this.hydGlobalState.recordTransition("vertexAttribPointer", index, size, type, normalized, stride, offset);
        }
    }
    xxable(cap, value) {
        switch (cap) {
            case WebGL2RenderingContext.DEPTH_TEST:
                this.hydGlobalState.depthState.enabled = value;
                break;
            case WebGL2RenderingContext.STENCIL_TEST:
                this.hydGlobalState.stencilState.enabled = value;
                break;
            case WebGL2RenderingContext.CULL_FACE:
                this.hydGlobalState.polygonState.cullFace = value;
                break;
            case WebGL2RenderingContext.BLEND:
                this.hydGlobalState.blendState.enabled = value;
                break;
            case WebGL2RenderingContext.SCISSOR_TEST:
                if (this.hydGlobalState.miscState.scissorTest !== value) {
                    this._der_flush();
                    this.hydGlobalState.miscState.scissorTest = value;
                    this.gpuScissorDirty = true;
                }
                break;
            case WebGL2RenderingContext.POLYGON_OFFSET_FILL:
                this.hydGlobalState.polygonState.polygonOffsetFill = value;
                break;
            case WebGL2RenderingContext.SAMPLE_ALPHA_TO_COVERAGE:
                console.error("unimplemented: SAMPLE_ALPHA_TO_COVERAGE");
                break;
            default:
                throw new Error("unsupported enable: " + cap);
        }
    }
    enable(cap) {
        this.xxable(cap, true);
        this.hydGlobalState.recordTransition("enable", cap);
    }
    disable(cap) {
        this.xxable(cap, false);
        this.hydGlobalState.recordTransition("disable", cap);
    }
    blendFunc(sfactor, dfactor) {
        const src = enumToBlendFactors.get(sfactor);
        const dst = enumToBlendFactors.get(dfactor);
        this.hydGlobalState.blendState.srcRGB = src;
        this.hydGlobalState.blendState.srcAlpha = src;
        this.hydGlobalState.blendState.dstRGB = dst;
        this.hydGlobalState.blendState.dstAlpha = dst;
        this.hydGlobalState.recordTransition("blendFunc", sfactor, dfactor);
    }
    blendColor(r, g, b, a) {
        this.hydGlobalState.blendState.color = [r, g, b, a];
        this.hydGlobalState.recordTransition("blendColor", r, g, b, a);
    }
    blendFuncSeparate(srcRGB, dstRGB, srcAlpha, dstAlpha) {
        const srcRGB1 = enumToBlendFactors.get(srcRGB);
        const dstRGB1 = enumToBlendFactors.get(dstRGB);
        const srcAlpha1 = enumToBlendFactors.get(srcAlpha);
        const dstAlpha1 = enumToBlendFactors.get(dstAlpha);
        this.hydGlobalState.blendState.srcRGB = srcRGB1;
        this.hydGlobalState.blendState.srcAlpha = srcAlpha1;
        this.hydGlobalState.blendState.dstRGB = dstRGB1;
        this.hydGlobalState.blendState.dstAlpha = dstAlpha1;
        this.hydGlobalState.recordTransition("blendFuncSeparate", srcRGB, dstRGB, srcAlpha, dstAlpha);
    }
    blendEquation(mode) {
        const op = enumToBlendOperations.get(mode);
        this.hydGlobalState.blendState.equationRGB = op;
        this.hydGlobalState.blendState.equationAlpha = op;
        this.hydGlobalState.recordTransition("blendEquation", mode);
    }
    blendEquationSeparate(modeRGB, modeAlpha) {
        const rgbOp = enumToBlendOperations.get(modeRGB);
        const alphaOp = enumToBlendOperations.get(modeAlpha);
        this.hydGlobalState.blendState.equationRGB = rgbOp;
        this.hydGlobalState.blendState.equationAlpha = alphaOp;
        this.hydGlobalState.recordTransition("blendEquationSeparate", modeRGB, modeAlpha);
    }
    stencilFunc(func, ref, mask) {
        this.hydGlobalState.stencilState.frontFunc = enumToCompareFunction.get(func);
        this.hydGlobalState.stencilState.frontRef = ref;
        this.hydGlobalState.stencilState.frontValueMask = mask;
        this.hydGlobalState.stencilState.backFunc = enumToCompareFunction.get(func);
        this.hydGlobalState.stencilState.backRef = ref;
        this.hydGlobalState.stencilState.backValueMask = mask;
        this.hydGlobalState.recordTransition("stencilFunc", func, ref, mask);
    }
    stencilOp(fail, zfail, zpass) {
        this.hydGlobalState.stencilState.frontFail = enumToStencilOperation.get(fail);
        this.hydGlobalState.stencilState.frontPassDepthFail = enumToStencilOperation.get(zfail);
        this.hydGlobalState.stencilState.frontPassDepthPass = enumToStencilOperation.get(zpass);
        this.hydGlobalState.stencilState.backFail = enumToStencilOperation.get(fail);
        this.hydGlobalState.stencilState.backPassDepthFail = enumToStencilOperation.get(zfail);
        this.hydGlobalState.stencilState.backPassDepthPass = enumToStencilOperation.get(zpass);
        this.hydGlobalState.recordTransition("stencilOp", fail, zfail, zpass);
    }
    bindFramebuffer(target, framebuffer) {
        this._der_flush();
        this.gpuViewportDirty = true;
        this.gpuScissorDirty = true;
        if (framebuffer === null) {
            framebuffer = this.hydGlobalState.defaultFramebuffer;
        }
        if (target === WebGL2RenderingContext.FRAMEBUFFER) {
            this.hydGlobalState.commonState.drawFramebufferBinding = framebuffer;
            this.hydGlobalState.commonState.readFramebufferBinding = framebuffer;
        }
        else if (target === WebGL2RenderingContext.DRAW_FRAMEBUFFER) {
            this.hydGlobalState.commonState.drawFramebufferBinding = framebuffer;
        }
        else if (target === WebGL2RenderingContext.READ_FRAMEBUFFER) {
            this.hydGlobalState.commonState.readFramebufferBinding = framebuffer;
        }
        else {
            throw new Error("unsupported bindFramebuffer: " + target);
        }
        this.hydGlobalState.recordTransition("bindFramebuffer", target, framebuffer.hash);
    }
    framebufferTexture2D(target, attachment, texTarget, texture, level) {
        this._der_flush();
        const framebuffer = this.getFramebufferForTarget(target);
        if (texture === null) {
            framebuffer.attachments.delete(attachment);
            framebuffer.resetHash();
            this.gpuViewportDirty = true;
            this.gpuScissorDirty = true;
            this.hydGlobalState.recordTransition("framebufferTexture2D", target, attachment, texTarget, "null", level);
            return;
        }
        texture.markFramebufferRenderTarget();
        this.samplerOriginStateVersion++;
        const attrib = new FramebufferAttributes(attachment, level, texTarget, texture);
        switch (attachment) {
            case WebGL2RenderingContext.DEPTH_ATTACHMENT:
                texture.state.compare = this.hydGlobalState.depthState.func;
                break;
            case WebGL2RenderingContext.STENCIL_ATTACHMENT:
                texture.state.compare = this.hydGlobalState.stencilState.frontFunc;
                break;
            case WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT:
                texture.state.compare = this.hydGlobalState.depthState.func;
                break;
        }
        framebuffer.attachments.set(attachment, attrib);
        framebuffer.resetHash();
        this.gpuViewportDirty = true;
        this.gpuScissorDirty = true;
        this.hydGlobalState.recordTransition("framebufferTexture2D", target, attachment, texTarget, texture.hash, level);
    }
    framebufferTextureLayer(target, attachment, texture, level, layer) {
        this._der_flush();
        const framebuffer = this.getFramebufferForTarget(target);
        if (texture === null) {
            framebuffer.attachments.delete(attachment);
            framebuffer.resetHash();
            this.gpuViewportDirty = true;
            this.gpuScissorDirty = true;
            this.hydGlobalState.recordTransition("framebufferTextureLayer", target, attachment, "null", level, layer);
            return;
        }
        texture.markFramebufferRenderTarget();
        this.samplerOriginStateVersion++;
        const attrib = new FramebufferAttributes(attachment, level, undefined, texture, layer);
        framebuffer.attachments.set(attachment, attrib);
        framebuffer.resetHash();
        this.gpuViewportDirty = true;
        this.gpuScissorDirty = true;
        this.hydGlobalState.recordTransition("framebufferTextureLayer", target, attachment, texture.hash, level, layer);
    }
    framebufferRenderbuffer(target, attachment, renderbufferTarget, renderbuffer) {
        this._der_flush();
        console.assert(renderbufferTarget === WebGL2RenderingContext.RENDERBUFFER);
        const framebuffer = this.getFramebufferForTarget(target);
        if (renderbuffer === null) {
            framebuffer.attachments.delete(attachment);
            framebuffer.resetHash();
            this.gpuViewportDirty = true;
            this.gpuScissorDirty = true;
            this.hydGlobalState.recordTransition("framebufferRenderbuffer", target, attachment, renderbufferTarget, "null");
            return;
        }
        renderbuffer.markFramebufferRenderTarget();
        this.samplerOriginStateVersion++;
        const attrib = new FramebufferAttributes(attachment, undefined, undefined, renderbuffer);
        framebuffer.attachments.set(attachment, attrib);
        framebuffer.resetHash();
        this.gpuViewportDirty = true;
        this.gpuScissorDirty = true;
        this.hydGlobalState.recordTransition("framebufferRenderbuffer", target, attachment, renderbufferTarget, renderbuffer.hash);
    }
    blitFramebuffer(srcX0, srcY0, srcX1, srcY1, dstX0, dstY0, dstX1, dstY1, mask, filter) {
        this._der_flush();
        this.hydGlobalState.recordTransition("blitFramebuffer", srcX0, srcY0, srcX1, srcY1, dstX0, dstY0, dstX1, dstY1, mask, filter);
    }
    copyTexImage2D(target, level, internalformat, x, y, width, height, border) {
        this._der_flush();
        const texture = this.currentTexture(target);
        texture.texImage2D(null, target, level, internalformat, width, height, border, WebGL2RenderingContext.RGBA, WebGL2RenderingContext.UNSIGNED_BYTE);
        texture.markCopyDestination();
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("copyTexImage2D", target, level, internalformat, x, y, width, height, border);
    }
    copyTexSubImage2D(target, level, xoffset, yoffset, x, y, width, height) {
        this._der_flush();
        this.currentTexture(target).markCopyDestination();
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("copyTexSubImage2D", target, level, xoffset, yoffset, x, y, width, height);
    }
    readPixels(x, y, width, height, format, type, pixels) {
        this._der_flush();
        if (pixels && "byteLength" in pixels) {
            new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength).fill(0);
        }
        this.hydGlobalState.recordTransition("readPixels", x, y, width, height, format, type);
    }
    drawBuffers(buffers) {
        this.hydGlobalState.commonState.drawFramebufferBinding.drawBuffers = buffers;
        this.hydGlobalState.commonState.drawFramebufferBinding.resetHash();
        this.gpuViewportDirty = true;
        this.gpuScissorDirty = true;
        this.hydGlobalState.recordTransition("drawBuffers", ...buffers);
    }
    pixelStorei(pname, param) {
        const value = typeof param === "boolean" ? (param ? 1 : 0) : param;
        switch (pname) {
            case WebGL2RenderingContext.UNPACK_FLIP_Y_WEBGL:
                this.hydGlobalState.miscState.unpackFlipYWebGL = value !== 0;
                this.hydGlobalState.recordTransition("pixelStorei", pname, value);
                return;
            case WebGL2RenderingContext.UNPACK_ALIGNMENT:
                if (!VALID_PIXEL_ALIGNMENT.has(value)) {
                    this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_VALUE;
                    return;
                }
                this.hydGlobalState.miscState.unpackAlignment = value;
                this.hydGlobalState.recordTransition("pixelStorei", pname, value);
                return;
            case WebGL2RenderingContext.PACK_ALIGNMENT:
                if (!VALID_PIXEL_ALIGNMENT.has(value)) {
                    this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_VALUE;
                    return;
                }
                this.hydGlobalState.miscState.packAlignment = value;
                this.hydGlobalState.recordTransition("pixelStorei", pname, value);
                return;
            default:
                console.warn("pixelStorei not implemented. Args:", pname, param);
        }
    }
    checkFramebufferStatus() {
        return WebGL2RenderingContext.FRAMEBUFFER_COMPLETE;
    }
    updateSamplerOriginUniforms(program, collectFlips) {
        if (collectFlips && program.originVariantStateVersion === this.samplerOriginStateVersion) {
            return null;
        }
        if (!collectFlips && program.originUniformStateVersion === this.samplerOriginStateVersion) {
            return null;
        }
        const samplerOriginFlips = collectFlips ? new Map() : null;
        for (const sampler of program.hydSamplers) {
            if (!collectFlips && !sampler.originFlipUniform) {
                continue;
            }
            const texture = this.hydGlobalState.getTextureUnitBinding(sampler.textureUnit, sampler.viewDimension);
            const shouldFlipY = this.samplerNeedsOriginFlip(texture);
            if (samplerOriginFlips) {
                samplerOriginFlips.set(sampler.name, shouldFlipY);
            }
            if (sampler.originFlipUniform && sampler.originFlipValue !== shouldFlipY) {
                sampler.originFlipValue = shouldFlipY;
                program.write_uniform_f1(sampler.originFlipUniform.offset, shouldFlipY ? 1 : 0);
            }
        }
        if (collectFlips) {
            program.originVariantStateVersion = this.samplerOriginStateVersion;
        }
        else {
            program.originUniformStateVersion = this.samplerOriginStateVersion;
        }
        return samplerOriginFlips;
    }
    setPBV() {
        if (frameDepth === 0) {
            ensureAutoFrame();
        }
        const program = this.hydGlobalState.commonState.currentProgram;
        const useSamplerOriginVariants = program.staticSamplerOriginVariants;
        if ((useSamplerOriginVariants ? program.hydSampler2D.length : program.hydSamplers.length) > 0) {
            const samplerOriginFlips = this.updateSamplerOriginUniforms(program, useSamplerOriginVariants);
            if (useSamplerOriginVariants && samplerOriginFlips) {
                program.applySamplerOriginVariant(samplerOriginFlips);
            }
        }
        const pbv = this.hydGlobalState.getPBV();
        const { pipelineHash, pipeline, bindGroup, vertexBuffersHash, vertexBufferHashes, vertexBuffers, vertexBufferOffsets, renderPassHash, renderBundleEncoderDescriptor } = pbv;
        const canReuseDrawState = pbv === this.lastDrawPbv &&
            this.hydRpCache.hasActiveRenderPass() &&
            !this.gpuViewportDirty &&
            !(this.hydGlobalState.miscState.scissorTest && this.gpuScissorDirty);
        if (!canReuseDrawState) {
            const passChanged = this.hydRpCache.RpSetDescriptor(renderPassHash, renderBundleEncoderDescriptor, this.bindedGetRenderPassDesc);
            if (passChanged || this.gpuViewportDirty) {
                this.setGpuViewport();
                this.gpuViewportDirty = false;
            }
            if (this.hydGlobalState.miscState.scissorTest && (passChanged || this.gpuScissorDirty)) {
                this.setGpuScissorRect();
                this.gpuScissorDirty = false;
            }
            if (this.hydGlobalState.stencilState.enabled) {
                this.hydRpCache.RpSetStencilReference(this.hydGlobalState.stencilState.frontRef);
            }
            if (this.hydGlobalState.blendState.enabled && this.blendUsesConstantFactor()) {
                const color = this.hydGlobalState.blendState.color;
                this.hydRpCache.RpSetBlendConstant4(color[0], color[1], color[2], color[3]);
            }
            this.hydRpCache.RpSetPipeline(pipelineHash, pipeline);
            this.hydRpCache.RpSetVertexBuffers(vertexBuffersHash, vertexBufferHashes, vertexBuffers, vertexBufferOffsets);
        }
        this.hydRpCache.RpSetBindGroup(bindGroup, program.alignedUniformSize > 0 ? this.hydUniOff : null);
        this.lastDrawPbv = pbv;
        if (program.alignedUniformSize > 0) {
            this.hydUniOff = program.setUniform(this.hydUniArr, this.hydUniOff);
        }
    }
    getTriangleFanIndexBuffer(vertexCount) {
        let buffer = this.triangleFanIndexBuffers.get(vertexCount);
        if (buffer)
            return buffer;
        const indexCount = Math.max(0, vertexCount - 2) * 3;
        const indices = new Uint32Array(indexCount);
        for (let i = 0; i < vertexCount - 2; i++) {
            indices[i * 3] = 0;
            indices[i * 3 + 1] = i + 1;
            indices[i * 3 + 2] = i + 2;
        }
        buffer = this.hydDevice.createBuffer({
            label: `triangleFanIndexBuffer-${vertexCount}`,
            size: Math.max(4, indices.byteLength),
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        if (indices.byteLength > 0) {
            this.hydDevice.queue.writeBuffer(buffer, 0, indices.buffer, indices.byteOffset, indices.byteLength);
        }
        this.triangleFanIndexBuffers.set(vertexCount, buffer);
        return buffer;
    }
    drawArrays(mode, first, count) {
        if (mode === WebGL2RenderingContext.TRIANGLE_FAN) {
            const topology = "triangle-list";
            if (this.hydGlobalState.topology !== topology) {
                this.hydGlobalState.topology = topology;
                this.hydGlobalState.recordTransitionOne(topology);
            }
            this.setPBV();
            this.hydRpCache.RpSetIndexBuffer(this.getTriangleFanIndexBuffer(count), "uint32");
            this.hydRpCache.RpDrawIndexed(Math.max(0, count - 2) * 3, 1, 0, first, 0);
            if (this.hydUniOff >= this.hydMaxUniSize) {
                this._der_flush();
            }
            if (this.hydGlobalState.clearState.target !== 0) {
                this.hydGlobalState.clearState.target = 0;
                this.hydGlobalState.recordTransitionOne('!!d0');
            }
            return;
        }
        const topology = enum2PT[mode];
        if (this.hydGlobalState.topology !== topology) {
            this.hydGlobalState.topology = topology;
            this.hydGlobalState.recordTransitionOne(topology);
        }
        this.setPBV();
        this.hydRpCache.RpDraw(count, 1, first, 0);
        if (this.hydUniOff >= this.hydMaxUniSize) {
            this._der_flush();
        }
        if (this.hydGlobalState.clearState.target !== 0) {
            this.hydGlobalState.clearState.target = 0;
            this.hydGlobalState.recordTransitionOne('!!d0');
        }
    }
    drawArraysInstanced(mode, first, count, instanceCount) {
        const topology = enum2PT[mode];
        if (this.hydGlobalState.topology !== topology) {
            this.hydGlobalState.topology = topology;
            this.hydGlobalState.recordTransitionOne(topology);
        }
        this.setPBV();
        this.hydRpCache.RpDraw(count, instanceCount, first, 0);
        if (this.hydUniOff >= this.hydMaxUniSize) {
            this._der_flush();
        }
        if (this.hydGlobalState.clearState.target !== 0) {
            this.hydGlobalState.clearState.target = 0;
            this.hydGlobalState.recordTransitionOne('!!d0');
        }
    }
    drawElements(mode, count, type, offset) {
        const topology = enum2PT[mode];
        if (this.hydGlobalState.topology !== topology) {
            this.hydGlobalState.topology = topology;
            this.hydGlobalState.recordTransitionOne(topology);
        }
        const elementArrayBuffer = this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
        if (!elementArrayBuffer || !elementArrayBuffer.buffer) {
            this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_OPERATION;
            return;
        }
        this.setPBV();
        this.hydRpCache.RpSetIndexBuffer(elementArrayBuffer.buffer, enumToIndexFormat.get(type));
        this.hydRpCache.RpDrawIndexed(count, 1, Math.floor(offset / indexEnumToBytes.get(type)), 0, 0);
        if (this.hydUniOff >= this.hydMaxUniSize) {
            this._der_flush();
        }
        if (this.hydGlobalState.clearState.target !== 0) {
            this.hydGlobalState.clearState.target = 0;
            this.hydGlobalState.recordTransitionOne('!!d0');
        }
    }
    drawElementsInstanced(mode, count, type, offset, instanceCount) {
        const topology = enum2PT[mode];
        if (this.hydGlobalState.topology !== topology) {
            this.hydGlobalState.topology = topology;
            this.hydGlobalState.recordTransitionOne(topology);
        }
        const elementArrayBuffer = this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
        if (!elementArrayBuffer || !elementArrayBuffer.buffer) {
            this.hydGlobalState.glError = WebGL2RenderingContext.INVALID_OPERATION;
            return;
        }
        this.setPBV();
        this.hydRpCache.RpSetIndexBuffer(elementArrayBuffer.buffer, enumToIndexFormat.get(type));
        this.hydRpCache.RpDrawIndexed(count, instanceCount, Math.floor(offset / indexEnumToBytes.get(type)), 0, 0);
        if (this.hydUniOff >= this.hydMaxUniSize) {
            this._der_flush();
        }
        if (this.hydGlobalState.clearState.target !== 0) {
            this.hydGlobalState.clearState.target = 0;
            this.hydGlobalState.recordTransitionOne('!!d0');
        }
    }
}

// EXTERNAL MODULE: ./src/vendor/glslang/glslang.js
var glslang_glslang = __webpack_require__(464);
;// ./src/vendor/tint-wasm/tint_wasm.js
async function Module(moduleArg={}){var moduleRtn;var Module=moduleArg;var ENVIRONMENT_IS_WEB=true;var ENVIRONMENT_IS_WORKER=false;var arguments_=[];var thisProgram="./this.program";var _scriptName="file:///Volumes/Code/gl2gpu-tint/src/vendor/tint-wasm/tint_wasm.js";var scriptDirectory="";function locateFile(path){if(Module["locateFile"]){return Module["locateFile"](path,scriptDirectory)}return scriptDirectory+path}var readAsync,readBinary;if(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER){try{scriptDirectory=new URL(".",_scriptName).href}catch{}{readAsync=async url=>{var response=await fetch(url,{credentials:"same-origin"});if(response.ok){return response.arrayBuffer()}throw new Error(response.status+" : "+response.url)}}}else{}var out=console.log.bind(console);var err=console.error.bind(console);var wasmBinary;var ABORT=false;class EmscriptenEH{}class EmscriptenSjLj extends EmscriptenEH{}var readyPromiseResolve,readyPromiseReject;var runtimeInitialized=false;function updateMemoryViews(){var b=wasmMemory.buffer;HEAP8=new Int8Array(b);HEAP16=new Int16Array(b);HEAPU8=new Uint8Array(b);HEAPU16=new Uint16Array(b);HEAP32=new Int32Array(b);Module["HEAPU32"]=HEAPU32=new Uint32Array(b);HEAPF32=new Float32Array(b);HEAPF64=new Float64Array(b);HEAP64=new BigInt64Array(b);HEAPU64=new BigUint64Array(b)}function preRun(){if(Module["preRun"]){if(typeof Module["preRun"]=="function")Module["preRun"]=[Module["preRun"]];while(Module["preRun"].length){addOnPreRun(Module["preRun"].shift())}}callRuntimeCallbacks(onPreRuns)}function initRuntime(){runtimeInitialized=true;if(!Module["noFSInit"]&&!FS.initialized)FS.init();TTY.init();wasmExports["l"]();FS.ignorePermissions=false}function postRun(){if(Module["postRun"]){if(typeof Module["postRun"]=="function")Module["postRun"]=[Module["postRun"]];while(Module["postRun"].length){addOnPostRun(Module["postRun"].shift())}}callRuntimeCallbacks(onPostRuns)}function abort(what){Module["onAbort"]?.(what);what=`Aborted(${what})`;err(what);ABORT=true;what+=". Build with -sASSERTIONS for more info.";var e=new WebAssembly.RuntimeError(what);readyPromiseReject?.(e);throw e}var wasmBinaryFile;function findWasmBinary(){if(Module["locateFile"]){return locateFile("tint_wasm.wasm")}return scriptDirectory+"tint_wasm.wasm"}function getBinarySync(file){if(file==wasmBinaryFile&&wasmBinary){return new Uint8Array(wasmBinary)}if(readBinary){return readBinary(file)}throw"both async and sync fetching of the wasm failed"}async function getWasmBinary(binaryFile){if(!wasmBinary){try{var response=await readAsync(binaryFile);return new Uint8Array(response)}catch{}}return getBinarySync(binaryFile)}async function instantiateArrayBuffer(binaryFile,imports){try{var binary=await getWasmBinary(binaryFile);var instance=await WebAssembly.instantiate(binary,imports);return instance}catch(reason){err(`failed to asynchronously prepare wasm: ${reason}`);abort(reason)}}async function instantiateAsync(binary,binaryFile,imports){if(!binary){try{var response=fetch(binaryFile,{credentials:"same-origin"});var instantiationResult=await WebAssembly.instantiateStreaming(response,imports);return instantiationResult}catch(reason){err(`wasm streaming compile failed: ${reason}`);err("falling back to ArrayBuffer instantiation")}}return instantiateArrayBuffer(binaryFile,imports)}function getWasmImports(){var imports={a:wasmImports};return imports}async function createWasm(){function receiveInstance(instance,module){wasmExports=instance.exports;assignWasmExports(wasmExports);updateMemoryViews();return wasmExports}function receiveInstantiationResult(result){return receiveInstance(result["instance"])}var info=getWasmImports();if(Module["instantiateWasm"]){return new Promise((resolve,reject)=>{Module["instantiateWasm"](info,(inst,mod)=>{resolve(receiveInstance(inst,mod))})})}wasmBinaryFile??=findWasmBinary();var result=await instantiateAsync(wasmBinary,wasmBinaryFile,info);var exports=receiveInstantiationResult(result);return exports}class ExitStatus{name="ExitStatus";constructor(status){this.message=`Program terminated with exit(${status})`;this.status=status}}var HEAP16;var HEAP32;var HEAP64;var HEAP8;var HEAPF32;var HEAPF64;var HEAPU16;var HEAPU32;var HEAPU64;var HEAPU8;var callRuntimeCallbacks=callbacks=>{while(callbacks.length>0){callbacks.shift()(Module)}};var onPostRuns=[];var addOnPostRun=cb=>onPostRuns.push(cb);var onPreRuns=[];var addOnPreRun=cb=>onPreRuns.push(cb);var noExitRuntime=true;class ExceptionInfo{constructor(excPtr){this.excPtr=excPtr;this.ptr=excPtr-24}set_type(type){HEAPU32[this.ptr+4>>2]=type}get_type(){return HEAPU32[this.ptr+4>>2]}set_destructor(destructor){HEAPU32[this.ptr+8>>2]=destructor}get_destructor(){return HEAPU32[this.ptr+8>>2]}set_caught(caught){caught=caught?1:0;HEAP8[this.ptr+12]=caught}get_caught(){return HEAP8[this.ptr+12]!=0}set_rethrown(rethrown){rethrown=rethrown?1:0;HEAP8[this.ptr+13]=rethrown}get_rethrown(){return HEAP8[this.ptr+13]!=0}init(type,destructor){this.set_adjusted_ptr(0);this.set_type(type);this.set_destructor(destructor)}set_adjusted_ptr(adjustedPtr){HEAPU32[this.ptr+16>>2]=adjustedPtr}get_adjusted_ptr(){return HEAPU32[this.ptr+16>>2]}}var uncaughtExceptionCount=0;var ___cxa_throw=(ptr,type,destructor)=>{var info=new ExceptionInfo(ptr);info.init(type,destructor);uncaughtExceptionCount++;abort()};var __abort_js=()=>abort("");var stringToUTF8Array=(str,heap,outIdx,maxBytesToWrite)=>{if(!(maxBytesToWrite>0))return 0;var startIdx=outIdx;var endIdx=outIdx+maxBytesToWrite-1;for(var i=0;i<str.length;++i){var u=str.codePointAt(i);if(u<=127){if(outIdx>=endIdx)break;heap[outIdx++]=u}else if(u<=2047){if(outIdx+1>=endIdx)break;heap[outIdx++]=192|u>>6;heap[outIdx++]=128|u&63}else if(u<=65535){if(outIdx+2>=endIdx)break;heap[outIdx++]=224|u>>12;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63}else{if(outIdx+3>=endIdx)break;heap[outIdx++]=240|u>>18;heap[outIdx++]=128|u>>12&63;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63;i++}}heap[outIdx]=0;return outIdx-startIdx};var stringToUTF8=(str,outPtr,maxBytesToWrite)=>stringToUTF8Array(str,HEAPU8,outPtr,maxBytesToWrite);var __tzset_js=(timezone,daylight,std_name,dst_name)=>{var currentYear=(new Date).getFullYear();var winter=new Date(currentYear,0,1);var summer=new Date(currentYear,6,1);var winterOffset=winter.getTimezoneOffset();var summerOffset=summer.getTimezoneOffset();var stdTimezoneOffset=Math.max(winterOffset,summerOffset);HEAPU32[timezone>>2]=stdTimezoneOffset*60;HEAP32[daylight>>2]=Number(winterOffset!=summerOffset);var extractZone=timezoneOffset=>{var sign=timezoneOffset>=0?"-":"+";var absOffset=Math.abs(timezoneOffset);var hours=String(Math.floor(absOffset/60)).padStart(2,"0");var minutes=String(absOffset%60).padStart(2,"0");return`UTC${sign}${hours}${minutes}`};var winterName=extractZone(winterOffset);var summerName=extractZone(summerOffset);if(summerOffset<winterOffset){stringToUTF8(winterName,std_name,17);stringToUTF8(summerName,dst_name,17)}else{stringToUTF8(winterName,dst_name,17);stringToUTF8(summerName,std_name,17)}};var getHeapMax=()=>2147483648;var alignMemory=(size,alignment)=>Math.ceil(size/alignment)*alignment;var growMemory=size=>{var oldHeapSize=wasmMemory.buffer.byteLength;var pages=(size-oldHeapSize+65535)/65536|0;try{wasmMemory.grow(pages);updateMemoryViews();return 1}catch(e){}};var _emscripten_resize_heap=requestedSize=>{var oldSize=HEAPU8.length;requestedSize>>>=0;var maxHeapSize=getHeapMax();if(requestedSize>maxHeapSize){return false}for(var cutDown=1;cutDown<=4;cutDown*=2){var overGrownHeapSize=oldSize*(1+.2/cutDown);overGrownHeapSize=Math.min(overGrownHeapSize,requestedSize+100663296);var newSize=Math.min(maxHeapSize,alignMemory(Math.max(requestedSize,overGrownHeapSize),65536));var replacement=growMemory(newSize);if(replacement){return true}}return false};var ENV={};var getExecutableName=()=>thisProgram||"./this.program";var getEnvStrings=()=>{if(!getEnvStrings.strings){var lang=(globalThis.navigator?.language??"C").replace("-","_")+".UTF-8";var env={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:lang,_:getExecutableName()};for(var x in ENV){if(ENV[x]===undefined)delete env[x];else env[x]=ENV[x]}var strings=[];for(var x in env){strings.push(`${x}=${env[x]}`)}getEnvStrings.strings=strings}return getEnvStrings.strings};var _environ_get=(__environ,environ_buf)=>{var bufSize=0;var envp=0;for(var string of getEnvStrings()){var ptr=environ_buf+bufSize;HEAPU32[__environ+envp>>2]=ptr;bufSize+=stringToUTF8(string,ptr,Infinity)+1;envp+=4}return 0};var lengthBytesUTF8=str=>{var len=0;for(var i=0;i<str.length;++i){var c=str.charCodeAt(i);if(c<=127){len++}else if(c<=2047){len+=2}else if(c>=55296&&c<=57343){len+=4;++i}else{len+=3}}return len};var _environ_sizes_get=(penviron_count,penviron_buf_size)=>{var strings=getEnvStrings();HEAPU32[penviron_count>>2]=strings.length;var bufSize=0;for(var string of strings){bufSize+=lengthBytesUTF8(string)+1}HEAPU32[penviron_buf_size>>2]=bufSize;return 0};var PATH={isAbs:path=>path.charAt(0)==="/",splitPath:filename=>{var splitPathRe=/^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;return splitPathRe.exec(filename).slice(1)},normalizeArray:(parts,allowAboveRoot)=>{var up=0;for(var i=parts.length-1;i>=0;i--){var last=parts[i];if(last==="."){parts.splice(i,1)}else if(last===".."){parts.splice(i,1);up++}else if(up){parts.splice(i,1);up--}}if(allowAboveRoot){for(;up;up--){parts.unshift("..")}}return parts},normalize:path=>{var isAbsolute=PATH.isAbs(path),trailingSlash=path.slice(-1)==="/";path=PATH.normalizeArray(path.split("/").filter(p=>!!p),!isAbsolute).join("/");if(!path&&!isAbsolute){path="."}if(path&&trailingSlash){path+="/"}return(isAbsolute?"/":"")+path},dirname:path=>{var result=PATH.splitPath(path),root=result[0],dir=result[1];if(!root&&!dir){return"."}if(dir){dir=dir.slice(0,-1)}return root+dir},basename:path=>path&&path.match(/([^\/]+|\/)\/*$/)[1],join:(...paths)=>PATH.normalize(paths.join("/")),join2:(l,r)=>PATH.normalize(l+"/"+r)};var initRandomFill=()=>view=>(crypto.getRandomValues(view),0);var randomFill=view=>(randomFill=initRandomFill())(view);var PATH_FS={resolve:(...args)=>{var resolvedPath="",resolvedAbsolute=false;for(var i=args.length-1;i>=-1&&!resolvedAbsolute;i--){var path=i>=0?args[i]:FS.cwd();if(typeof path!="string"){throw new TypeError("Arguments to path.resolve must be strings")}else if(!path){return""}resolvedPath=path+"/"+resolvedPath;resolvedAbsolute=PATH.isAbs(path)}resolvedPath=PATH.normalizeArray(resolvedPath.split("/").filter(p=>!!p),!resolvedAbsolute).join("/");return(resolvedAbsolute?"/":"")+resolvedPath||"."},relative:(from,to)=>{from=PATH_FS.resolve(from).slice(1);to=PATH_FS.resolve(to).slice(1);function trim(arr){var start=0;for(;start<arr.length;start++){if(arr[start]!=="")break}var end=arr.length-1;for(;end>=0;end--){if(arr[end]!=="")break}if(start>end)return[];return arr.slice(start,end-start+1)}var fromParts=trim(from.split("/"));var toParts=trim(to.split("/"));var length=Math.min(fromParts.length,toParts.length);var samePartsLength=length;for(var i=0;i<length;i++){if(fromParts[i]!==toParts[i]){samePartsLength=i;break}}var outputParts=[];for(var i=samePartsLength;i<fromParts.length;i++){outputParts.push("..")}outputParts=outputParts.concat(toParts.slice(samePartsLength));return outputParts.join("/")}};var UTF8Decoder=globalThis.TextDecoder&&new TextDecoder;var findStringEnd=(heapOrArray,idx,maxBytesToRead,ignoreNul)=>{var maxIdx=idx+maxBytesToRead;if(ignoreNul)return maxIdx;while(heapOrArray[idx]&&!(idx>=maxIdx))++idx;return idx};var UTF8ArrayToString=(heapOrArray,idx=0,maxBytesToRead,ignoreNul)=>{var endPtr=findStringEnd(heapOrArray,idx,maxBytesToRead,ignoreNul);if(endPtr-idx>16&&heapOrArray.buffer&&UTF8Decoder){return UTF8Decoder.decode(heapOrArray.subarray(idx,endPtr))}var str="";while(idx<endPtr){var u0=heapOrArray[idx++];if(!(u0&128)){str+=String.fromCharCode(u0);continue}var u1=heapOrArray[idx++]&63;if((u0&224)==192){str+=String.fromCharCode((u0&31)<<6|u1);continue}var u2=heapOrArray[idx++]&63;if((u0&240)==224){u0=(u0&15)<<12|u1<<6|u2}else{u0=(u0&7)<<18|u1<<12|u2<<6|heapOrArray[idx++]&63}if(u0<65536){str+=String.fromCharCode(u0)}else{var ch=u0-65536;str+=String.fromCharCode(55296|ch>>10,56320|ch&1023)}}return str};var FS_stdin_getChar_buffer=[];var intArrayFromString=(stringy,dontAddNull,length)=>{var len=length>0?length:lengthBytesUTF8(stringy)+1;var u8array=new Array(len);var numBytesWritten=stringToUTF8Array(stringy,u8array,0,u8array.length);if(dontAddNull)u8array.length=numBytesWritten;return u8array};var FS_stdin_getChar=()=>{if(!FS_stdin_getChar_buffer.length){var result=null;if(globalThis.window?.prompt){result=window.prompt("Input: ");if(result!==null){result+="\n"}}else{}if(!result){return null}FS_stdin_getChar_buffer=intArrayFromString(result,true)}return FS_stdin_getChar_buffer.shift()};var TTY={ttys:[],init(){},shutdown(){},register(dev,ops){TTY.ttys[dev]={input:[],output:[],ops};FS.registerDevice(dev,TTY.stream_ops)},stream_ops:{open(stream){var tty=TTY.ttys[stream.node.rdev];if(!tty){throw new FS.ErrnoError(43)}stream.tty=tty;stream.seekable=false},close(stream){stream.tty.ops.fsync(stream.tty)},fsync(stream){stream.tty.ops.fsync(stream.tty)},read(stream,buffer,offset,length,pos){if(!stream.tty||!stream.tty.ops.get_char){throw new FS.ErrnoError(60)}var bytesRead=0;for(var i=0;i<length;i++){var result;try{result=stream.tty.ops.get_char(stream.tty)}catch(e){throw new FS.ErrnoError(29)}if(result===undefined&&bytesRead===0){throw new FS.ErrnoError(6)}if(result===null||result===undefined)break;bytesRead++;buffer[offset+i]=result}if(bytesRead){stream.node.atime=Date.now()}return bytesRead},write(stream,buffer,offset,length,pos){if(!stream.tty||!stream.tty.ops.put_char){throw new FS.ErrnoError(60)}try{for(var i=0;i<length;i++){stream.tty.ops.put_char(stream.tty,buffer[offset+i])}}catch(e){throw new FS.ErrnoError(29)}if(length){stream.node.mtime=stream.node.ctime=Date.now()}return i}},default_tty_ops:{get_char(tty){return FS_stdin_getChar()},put_char(tty,val){if(val===null||val===10){out(UTF8ArrayToString(tty.output));tty.output=[]}else{if(val!=0)tty.output.push(val)}},fsync(tty){if(tty.output?.length>0){out(UTF8ArrayToString(tty.output));tty.output=[]}},ioctl_tcgets(tty){return{c_iflag:25856,c_oflag:5,c_cflag:191,c_lflag:35387,c_cc:[3,28,127,21,4,0,1,0,17,19,26,0,18,15,23,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}},ioctl_tcsets(tty,optional_actions,data){return 0},ioctl_tiocgwinsz(tty){return[24,80]}},default_tty1_ops:{put_char(tty,val){if(val===null||val===10){err(UTF8ArrayToString(tty.output));tty.output=[]}else{if(val!=0)tty.output.push(val)}},fsync(tty){if(tty.output?.length>0){err(UTF8ArrayToString(tty.output));tty.output=[]}}}};var mmapAlloc=size=>{abort()};var MEMFS={ops_table:null,mount(mount){return MEMFS.createNode(null,"/",16895,0)},createNode(parent,name,mode,dev){if(FS.isBlkdev(mode)||FS.isFIFO(mode)){throw new FS.ErrnoError(63)}MEMFS.ops_table||={dir:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr,lookup:MEMFS.node_ops.lookup,mknod:MEMFS.node_ops.mknod,rename:MEMFS.node_ops.rename,unlink:MEMFS.node_ops.unlink,rmdir:MEMFS.node_ops.rmdir,readdir:MEMFS.node_ops.readdir,symlink:MEMFS.node_ops.symlink},stream:{llseek:MEMFS.stream_ops.llseek}},file:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr},stream:{llseek:MEMFS.stream_ops.llseek,read:MEMFS.stream_ops.read,write:MEMFS.stream_ops.write,mmap:MEMFS.stream_ops.mmap,msync:MEMFS.stream_ops.msync}},link:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr,readlink:MEMFS.node_ops.readlink},stream:{}},chrdev:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr},stream:FS.chrdev_stream_ops}};var node=FS.createNode(parent,name,mode,dev);if(FS.isDir(node.mode)){node.node_ops=MEMFS.ops_table.dir.node;node.stream_ops=MEMFS.ops_table.dir.stream;node.contents={}}else if(FS.isFile(node.mode)){node.node_ops=MEMFS.ops_table.file.node;node.stream_ops=MEMFS.ops_table.file.stream;node.usedBytes=0;node.contents=MEMFS.emptyFileContents??=new Uint8Array(0)}else if(FS.isLink(node.mode)){node.node_ops=MEMFS.ops_table.link.node;node.stream_ops=MEMFS.ops_table.link.stream}else if(FS.isChrdev(node.mode)){node.node_ops=MEMFS.ops_table.chrdev.node;node.stream_ops=MEMFS.ops_table.chrdev.stream}node.atime=node.mtime=node.ctime=Date.now();if(parent){parent.contents[name]=node;parent.atime=parent.mtime=parent.ctime=node.atime}return node},getFileDataAsTypedArray(node){return node.contents.subarray(0,node.usedBytes)},expandFileStorage(node,newCapacity){var prevCapacity=node.contents.length;if(prevCapacity>=newCapacity)return;var CAPACITY_DOUBLING_MAX=1024*1024;newCapacity=Math.max(newCapacity,prevCapacity*(prevCapacity<CAPACITY_DOUBLING_MAX?2:1.125)>>>0);if(prevCapacity)newCapacity=Math.max(newCapacity,256);var oldContents=MEMFS.getFileDataAsTypedArray(node);node.contents=new Uint8Array(newCapacity);node.contents.set(oldContents)},resizeFileStorage(node,newSize){if(node.usedBytes==newSize)return;var oldContents=node.contents;node.contents=new Uint8Array(newSize);node.contents.set(oldContents.subarray(0,Math.min(newSize,node.usedBytes)));node.usedBytes=newSize},node_ops:{getattr(node){var attr={};attr.dev=FS.isChrdev(node.mode)?node.id:1;attr.ino=node.id;attr.mode=node.mode;attr.nlink=1;attr.uid=0;attr.gid=0;attr.rdev=node.rdev;if(FS.isDir(node.mode)){attr.size=4096}else if(FS.isFile(node.mode)){attr.size=node.usedBytes}else if(FS.isLink(node.mode)){attr.size=node.link.length}else{attr.size=0}attr.atime=new Date(node.atime);attr.mtime=new Date(node.mtime);attr.ctime=new Date(node.ctime);attr.blksize=4096;attr.blocks=Math.ceil(attr.size/attr.blksize);return attr},setattr(node,attr){for(const key of["mode","atime","mtime","ctime"]){if(attr[key]!=null){node[key]=attr[key]}}if(attr.size!==undefined){MEMFS.resizeFileStorage(node,attr.size)}},lookup(parent,name){if(!MEMFS.doesNotExistError){MEMFS.doesNotExistError=new FS.ErrnoError(44);MEMFS.doesNotExistError.stack="<generic error, no stack>"}throw MEMFS.doesNotExistError},mknod(parent,name,mode,dev){return MEMFS.createNode(parent,name,mode,dev)},rename(old_node,new_dir,new_name){var new_node;try{new_node=FS.lookupNode(new_dir,new_name)}catch(e){}if(new_node){if(FS.isDir(old_node.mode)){for(var i in new_node.contents){throw new FS.ErrnoError(55)}}FS.hashRemoveNode(new_node)}delete old_node.parent.contents[old_node.name];new_dir.contents[new_name]=old_node;old_node.name=new_name;new_dir.ctime=new_dir.mtime=old_node.parent.ctime=old_node.parent.mtime=Date.now()},unlink(parent,name){delete parent.contents[name];parent.ctime=parent.mtime=Date.now()},rmdir(parent,name){var node=FS.lookupNode(parent,name);for(var i in node.contents){throw new FS.ErrnoError(55)}delete parent.contents[name];parent.ctime=parent.mtime=Date.now()},readdir(node){return[".","..",...Object.keys(node.contents)]},symlink(parent,newname,oldpath){var node=MEMFS.createNode(parent,newname,511|40960,0);node.link=oldpath;return node},readlink(node){if(!FS.isLink(node.mode)){throw new FS.ErrnoError(28)}return node.link}},stream_ops:{read(stream,buffer,offset,length,position){var contents=stream.node.contents;if(position>=stream.node.usedBytes)return 0;var size=Math.min(stream.node.usedBytes-position,length);buffer.set(contents.subarray(position,position+size),offset);return size},write(stream,buffer,offset,length,position,canOwn){if(buffer.buffer===HEAP8.buffer){canOwn=false}if(!length)return 0;var node=stream.node;node.mtime=node.ctime=Date.now();if(canOwn){node.contents=buffer.subarray(offset,offset+length);node.usedBytes=length}else if(node.usedBytes===0&&position===0){node.contents=buffer.slice(offset,offset+length);node.usedBytes=length}else{MEMFS.expandFileStorage(node,position+length);node.contents.set(buffer.subarray(offset,offset+length),position);node.usedBytes=Math.max(node.usedBytes,position+length)}return length},llseek(stream,offset,whence){var position=offset;if(whence===1){position+=stream.position}else if(whence===2){if(FS.isFile(stream.node.mode)){position+=stream.node.usedBytes}}if(position<0){throw new FS.ErrnoError(28)}return position},mmap(stream,length,position,prot,flags){if(!FS.isFile(stream.node.mode)){throw new FS.ErrnoError(43)}var ptr;var allocated;var contents=stream.node.contents;if(!(flags&2)&&contents.buffer===HEAP8.buffer){allocated=false;ptr=contents.byteOffset}else{allocated=true;ptr=mmapAlloc(length);if(!ptr){throw new FS.ErrnoError(48)}if(contents){if(position>0||position+length<contents.length){if(contents.subarray){contents=contents.subarray(position,position+length)}else{contents=Array.prototype.slice.call(contents,position,position+length)}}HEAP8.set(contents,ptr)}}return{ptr,allocated}},msync(stream,buffer,offset,length,mmapFlags){MEMFS.stream_ops.write(stream,buffer,0,length,offset,false);return 0}}};var FS_modeStringToFlags=str=>{if(typeof str!="string")return str;var flagModes={r:0,"r+":2,w:512|64|1,"w+":512|64|2,a:1024|64|1,"a+":1024|64|2};var flags=flagModes[str];if(typeof flags=="undefined"){throw new Error(`Unknown file open mode: ${str}`)}return flags};var FS_fileDataToTypedArray=data=>{if(typeof data=="string"){data=intArrayFromString(data,true)}if(!data.subarray){data=new Uint8Array(data)}return data};var FS_getMode=(canRead,canWrite)=>{var mode=0;if(canRead)mode|=292|73;if(canWrite)mode|=146;return mode};var asyncLoad=async url=>{var arrayBuffer=await readAsync(url);return new Uint8Array(arrayBuffer)};var FS_createDataFile=(...args)=>FS.createDataFile(...args);var getUniqueRunDependency=id=>id;var runDependencies=0;var dependenciesFulfilled=null;var removeRunDependency=id=>{runDependencies--;Module["monitorRunDependencies"]?.(runDependencies);if(runDependencies==0){if(dependenciesFulfilled){var callback=dependenciesFulfilled;dependenciesFulfilled=null;callback()}}};var addRunDependency=id=>{runDependencies++;Module["monitorRunDependencies"]?.(runDependencies)};var preloadPlugins=[];var FS_handledByPreloadPlugin=async(byteArray,fullname)=>{if(typeof Browser!="undefined")Browser.init();for(var plugin of preloadPlugins){if(plugin["canHandle"](fullname)){return plugin["handle"](byteArray,fullname)}}return byteArray};var FS_preloadFile=async(parent,name,url,canRead,canWrite,dontCreateFile,canOwn,preFinish)=>{var fullname=name?PATH_FS.resolve(PATH.join2(parent,name)):parent;var dep=getUniqueRunDependency(`cp ${fullname}`);addRunDependency(dep);try{var byteArray=url;if(typeof url=="string"){byteArray=await asyncLoad(url)}byteArray=await FS_handledByPreloadPlugin(byteArray,fullname);preFinish?.();if(!dontCreateFile){FS_createDataFile(parent,name,byteArray,canRead,canWrite,canOwn)}}finally{removeRunDependency(dep)}};var FS_createPreloadedFile=(parent,name,url,canRead,canWrite,onload,onerror,dontCreateFile,canOwn,preFinish)=>{FS_preloadFile(parent,name,url,canRead,canWrite,dontCreateFile,canOwn,preFinish).then(onload).catch(onerror)};var FS={root:null,mounts:[],devices:{},streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,filesystems:null,syncFSRequests:0,ErrnoError:class{name="ErrnoError";constructor(errno){this.errno=errno}},FSStream:class{shared={};get object(){return this.node}set object(val){this.node=val}get isRead(){return(this.flags&2097155)!==1}get isWrite(){return(this.flags&2097155)!==0}get isAppend(){return this.flags&1024}get flags(){return this.shared.flags}set flags(val){this.shared.flags=val}get position(){return this.shared.position}set position(val){this.shared.position=val}},FSNode:class{node_ops={};stream_ops={};readMode=292|73;writeMode=146;mounted=null;constructor(parent,name,mode,rdev){if(!parent){parent=this}this.parent=parent;this.mount=parent.mount;this.id=FS.nextInode++;this.name=name;this.mode=mode;this.rdev=rdev;this.atime=this.mtime=this.ctime=Date.now()}get read(){return(this.mode&this.readMode)===this.readMode}set read(val){val?this.mode|=this.readMode:this.mode&=~this.readMode}get write(){return(this.mode&this.writeMode)===this.writeMode}set write(val){val?this.mode|=this.writeMode:this.mode&=~this.writeMode}get isFolder(){return FS.isDir(this.mode)}get isDevice(){return FS.isChrdev(this.mode)}},lookupPath(path,opts={}){if(!path){throw new FS.ErrnoError(44)}opts.follow_mount??=true;if(!PATH.isAbs(path)){path=FS.cwd()+"/"+path}linkloop:for(var nlinks=0;nlinks<40;nlinks++){var parts=path.split("/").filter(p=>!!p);var current=FS.root;var current_path="/";for(var i=0;i<parts.length;i++){var islast=i===parts.length-1;if(islast&&opts.parent){break}if(parts[i]==="."){continue}if(parts[i]===".."){current_path=PATH.dirname(current_path);if(FS.isRoot(current)){path=current_path+"/"+parts.slice(i+1).join("/");nlinks--;continue linkloop}else{current=current.parent}continue}current_path=PATH.join2(current_path,parts[i]);try{current=FS.lookupNode(current,parts[i])}catch(e){if(e?.errno===44&&islast&&opts.noent_okay){return{path:current_path}}throw e}if(FS.isMountpoint(current)&&(!islast||opts.follow_mount)){current=current.mounted.root}if(FS.isLink(current.mode)&&(!islast||opts.follow)){if(!current.node_ops.readlink){throw new FS.ErrnoError(52)}var link=current.node_ops.readlink(current);if(!PATH.isAbs(link)){link=PATH.dirname(current_path)+"/"+link}path=link+"/"+parts.slice(i+1).join("/");continue linkloop}}return{path:current_path,node:current}}throw new FS.ErrnoError(32)},getPath(node){var path;while(true){if(FS.isRoot(node)){var mount=node.mount.mountpoint;if(!path)return mount;return mount[mount.length-1]!=="/"?`${mount}/${path}`:mount+path}path=path?`${node.name}/${path}`:node.name;node=node.parent}},hashName(parentid,name){var hash=0;for(var i=0;i<name.length;i++){hash=(hash<<5)-hash+name.charCodeAt(i)|0}return(parentid+hash>>>0)%FS.nameTable.length},hashAddNode(node){var hash=FS.hashName(node.parent.id,node.name);node.name_next=FS.nameTable[hash];FS.nameTable[hash]=node},hashRemoveNode(node){var hash=FS.hashName(node.parent.id,node.name);if(FS.nameTable[hash]===node){FS.nameTable[hash]=node.name_next}else{var current=FS.nameTable[hash];while(current){if(current.name_next===node){current.name_next=node.name_next;break}current=current.name_next}}},lookupNode(parent,name){var errCode=FS.mayLookup(parent);if(errCode){throw new FS.ErrnoError(errCode)}var hash=FS.hashName(parent.id,name);for(var node=FS.nameTable[hash];node;node=node.name_next){var nodeName=node.name;if(node.parent.id===parent.id&&nodeName===name){return node}}return FS.lookup(parent,name)},createNode(parent,name,mode,rdev){var node=new FS.FSNode(parent,name,mode,rdev);FS.hashAddNode(node);return node},destroyNode(node){FS.hashRemoveNode(node)},isRoot(node){return node===node.parent},isMountpoint(node){return!!node.mounted},isFile(mode){return(mode&61440)===32768},isDir(mode){return(mode&61440)===16384},isLink(mode){return(mode&61440)===40960},isChrdev(mode){return(mode&61440)===8192},isBlkdev(mode){return(mode&61440)===24576},isFIFO(mode){return(mode&61440)===4096},isSocket(mode){return(mode&49152)===49152},flagsToPermissionString(flag){var perms=["r","w","rw"][flag&3];if(flag&512){perms+="w"}return perms},nodePermissions(node,perms){if(FS.ignorePermissions){return 0}if(perms.includes("r")&&!(node.mode&292)){return 2}if(perms.includes("w")&&!(node.mode&146)){return 2}if(perms.includes("x")&&!(node.mode&73)){return 2}return 0},mayLookup(dir){if(!FS.isDir(dir.mode))return 54;var errCode=FS.nodePermissions(dir,"x");if(errCode)return errCode;if(!dir.node_ops.lookup)return 2;return 0},mayCreate(dir,name){if(!FS.isDir(dir.mode)){return 54}try{var node=FS.lookupNode(dir,name);return 20}catch(e){}return FS.nodePermissions(dir,"wx")},mayDelete(dir,name,isdir){var node;try{node=FS.lookupNode(dir,name)}catch(e){return e.errno}var errCode=FS.nodePermissions(dir,"wx");if(errCode){return errCode}if(isdir){if(!FS.isDir(node.mode)){return 54}if(FS.isRoot(node)||FS.getPath(node)===FS.cwd()){return 10}}else if(FS.isDir(node.mode)){return 31}return 0},mayOpen(node,flags){if(!node){return 44}if(FS.isLink(node.mode)){return 32}var mode=FS.flagsToPermissionString(flags);if(FS.isDir(node.mode)){if(mode!=="r"||flags&(512|64)){return 31}}return FS.nodePermissions(node,mode)},checkOpExists(op,err){if(!op){throw new FS.ErrnoError(err)}return op},MAX_OPEN_FDS:4096,nextfd(){for(var fd=0;fd<=FS.MAX_OPEN_FDS;fd++){if(!FS.streams[fd]){return fd}}throw new FS.ErrnoError(33)},getStreamChecked(fd){var stream=FS.getStream(fd);if(!stream){throw new FS.ErrnoError(8)}return stream},getStream:fd=>FS.streams[fd],createStream(stream,fd=-1){stream=Object.assign(new FS.FSStream,stream);if(fd==-1){fd=FS.nextfd()}stream.fd=fd;FS.streams[fd]=stream;return stream},closeStream(fd){FS.streams[fd]=null},dupStream(origStream,fd=-1){var stream=FS.createStream(origStream,fd);stream.stream_ops?.dup?.(stream);return stream},doSetAttr(stream,node,attr){var setattr=stream?.stream_ops.setattr;var arg=setattr?stream:node;setattr??=node.node_ops.setattr;FS.checkOpExists(setattr,63);try{setattr(arg,attr)}catch(e){if(e instanceof RangeError){throw new FS.ErrnoError(22)}throw e}},chrdev_stream_ops:{open(stream){var device=FS.getDevice(stream.node.rdev);stream.stream_ops=device.stream_ops;stream.stream_ops.open?.(stream)},llseek(){throw new FS.ErrnoError(70)}},major:dev=>dev>>8,minor:dev=>dev&255,makedev:(ma,mi)=>ma<<8|mi,registerDevice(dev,ops){FS.devices[dev]={stream_ops:ops}},getDevice:dev=>FS.devices[dev],getMounts(mount){var mounts=[];var check=[mount];while(check.length){var m=check.pop();mounts.push(m);check.push(...m.mounts)}return mounts},syncfs(populate,callback){if(typeof populate=="function"){callback=populate;populate=false}FS.syncFSRequests++;if(FS.syncFSRequests>1){err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`)}var mounts=FS.getMounts(FS.root.mount);var completed=0;function doCallback(errCode){FS.syncFSRequests--;return callback(errCode)}function done(errCode){if(errCode){if(!done.errored){done.errored=true;return doCallback(errCode)}return}if(++completed>=mounts.length){doCallback(null)}}for(var mount of mounts){if(mount.type.syncfs){mount.type.syncfs(mount,populate,done)}else{done(null)}}},mount(type,opts,mountpoint){var root=mountpoint==="/";var pseudo=!mountpoint;var node;if(root&&FS.root){throw new FS.ErrnoError(10)}else if(!root&&!pseudo){var lookup=FS.lookupPath(mountpoint,{follow_mount:false});mountpoint=lookup.path;node=lookup.node;if(FS.isMountpoint(node)){throw new FS.ErrnoError(10)}if(!FS.isDir(node.mode)){throw new FS.ErrnoError(54)}}var mount={type,opts,mountpoint,mounts:[]};var mountRoot=type.mount(mount);mountRoot.mount=mount;mount.root=mountRoot;if(root){FS.root=mountRoot}else if(node){node.mounted=mount;if(node.mount){node.mount.mounts.push(mount)}}return mountRoot},unmount(mountpoint){var lookup=FS.lookupPath(mountpoint,{follow_mount:false});if(!FS.isMountpoint(lookup.node)){throw new FS.ErrnoError(28)}var node=lookup.node;var mount=node.mounted;var mounts=FS.getMounts(mount);for(var[hash,current]of Object.entries(FS.nameTable)){while(current){var next=current.name_next;if(mounts.includes(current.mount)){FS.destroyNode(current)}current=next}}node.mounted=null;var idx=node.mount.mounts.indexOf(mount);node.mount.mounts.splice(idx,1)},lookup(parent,name){return parent.node_ops.lookup(parent,name)},mknod(path,mode,dev){var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;var name=PATH.basename(path);if(!name){throw new FS.ErrnoError(28)}if(name==="."||name===".."){throw new FS.ErrnoError(20)}var errCode=FS.mayCreate(parent,name);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.mknod){throw new FS.ErrnoError(63)}return parent.node_ops.mknod(parent,name,mode,dev)},statfs(path){return FS.statfsNode(FS.lookupPath(path,{follow:true}).node)},statfsStream(stream){return FS.statfsNode(stream.node)},statfsNode(node){var rtn={bsize:4096,frsize:4096,blocks:1e6,bfree:5e5,bavail:5e5,files:FS.nextInode,ffree:FS.nextInode-1,fsid:42,flags:2,namelen:255};if(node.node_ops.statfs){Object.assign(rtn,node.node_ops.statfs(node.mount.opts.root))}return rtn},create(path,mode=438){mode&=4095;mode|=32768;return FS.mknod(path,mode,0)},mkdir(path,mode=511){mode&=511|512;mode|=16384;return FS.mknod(path,mode,0)},mkdirTree(path,mode){var dirs=path.split("/");var d="";for(var dir of dirs){if(!dir)continue;if(d||PATH.isAbs(path))d+="/";d+=dir;try{FS.mkdir(d,mode)}catch(e){if(e.errno!=20)throw e}}},mkdev(path,mode,dev){if(typeof dev=="undefined"){dev=mode;mode=438}mode|=8192;return FS.mknod(path,mode,dev)},symlink(oldpath,newpath){if(!PATH_FS.resolve(oldpath)){throw new FS.ErrnoError(44)}var lookup=FS.lookupPath(newpath,{parent:true});var parent=lookup.node;if(!parent){throw new FS.ErrnoError(44)}var newname=PATH.basename(newpath);var errCode=FS.mayCreate(parent,newname);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.symlink){throw new FS.ErrnoError(63)}return parent.node_ops.symlink(parent,newname,oldpath)},rename(old_path,new_path){var old_dirname=PATH.dirname(old_path);var new_dirname=PATH.dirname(new_path);var old_name=PATH.basename(old_path);var new_name=PATH.basename(new_path);var lookup,old_dir,new_dir;lookup=FS.lookupPath(old_path,{parent:true});old_dir=lookup.node;lookup=FS.lookupPath(new_path,{parent:true});new_dir=lookup.node;if(!old_dir||!new_dir)throw new FS.ErrnoError(44);if(old_dir.mount!==new_dir.mount){throw new FS.ErrnoError(75)}var old_node=FS.lookupNode(old_dir,old_name);var relative=PATH_FS.relative(old_path,new_dirname);if(relative.charAt(0)!=="."){throw new FS.ErrnoError(28)}relative=PATH_FS.relative(new_path,old_dirname);if(relative.charAt(0)!=="."){throw new FS.ErrnoError(55)}var new_node;try{new_node=FS.lookupNode(new_dir,new_name)}catch(e){}if(old_node===new_node){return}var isdir=FS.isDir(old_node.mode);var errCode=FS.mayDelete(old_dir,old_name,isdir);if(errCode){throw new FS.ErrnoError(errCode)}errCode=new_node?FS.mayDelete(new_dir,new_name,isdir):FS.mayCreate(new_dir,new_name);if(errCode){throw new FS.ErrnoError(errCode)}if(!old_dir.node_ops.rename){throw new FS.ErrnoError(63)}if(FS.isMountpoint(old_node)||new_node&&FS.isMountpoint(new_node)){throw new FS.ErrnoError(10)}if(new_dir!==old_dir){errCode=FS.nodePermissions(old_dir,"w");if(errCode){throw new FS.ErrnoError(errCode)}}FS.hashRemoveNode(old_node);try{old_dir.node_ops.rename(old_node,new_dir,new_name);old_node.parent=new_dir}catch(e){throw e}finally{FS.hashAddNode(old_node)}},rmdir(path){var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;var name=PATH.basename(path);var node=FS.lookupNode(parent,name);var errCode=FS.mayDelete(parent,name,true);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.rmdir){throw new FS.ErrnoError(63)}if(FS.isMountpoint(node)){throw new FS.ErrnoError(10)}parent.node_ops.rmdir(parent,name);FS.destroyNode(node)},readdir(path){var lookup=FS.lookupPath(path,{follow:true});var node=lookup.node;var readdir=FS.checkOpExists(node.node_ops.readdir,54);return readdir(node)},unlink(path){var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;if(!parent){throw new FS.ErrnoError(44)}var name=PATH.basename(path);var node=FS.lookupNode(parent,name);var errCode=FS.mayDelete(parent,name,false);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.unlink){throw new FS.ErrnoError(63)}if(FS.isMountpoint(node)){throw new FS.ErrnoError(10)}parent.node_ops.unlink(parent,name);FS.destroyNode(node)},readlink(path){var lookup=FS.lookupPath(path);var link=lookup.node;if(!link){throw new FS.ErrnoError(44)}if(!link.node_ops.readlink){throw new FS.ErrnoError(28)}return link.node_ops.readlink(link)},stat(path,dontFollow){var lookup=FS.lookupPath(path,{follow:!dontFollow});var node=lookup.node;var getattr=FS.checkOpExists(node.node_ops.getattr,63);return getattr(node)},fstat(fd){var stream=FS.getStreamChecked(fd);var node=stream.node;var getattr=stream.stream_ops.getattr;var arg=getattr?stream:node;getattr??=node.node_ops.getattr;FS.checkOpExists(getattr,63);return getattr(arg)},lstat(path){return FS.stat(path,true)},doChmod(stream,node,mode,dontFollow){FS.doSetAttr(stream,node,{mode:mode&4095|node.mode&~4095,ctime:Date.now(),dontFollow})},chmod(path,mode,dontFollow){var node;if(typeof path=="string"){var lookup=FS.lookupPath(path,{follow:!dontFollow});node=lookup.node}else{node=path}FS.doChmod(null,node,mode,dontFollow)},lchmod(path,mode){FS.chmod(path,mode,true)},fchmod(fd,mode){var stream=FS.getStreamChecked(fd);FS.doChmod(stream,stream.node,mode,false)},doChown(stream,node,dontFollow){FS.doSetAttr(stream,node,{timestamp:Date.now(),dontFollow})},chown(path,uid,gid,dontFollow){var node;if(typeof path=="string"){var lookup=FS.lookupPath(path,{follow:!dontFollow});node=lookup.node}else{node=path}FS.doChown(null,node,dontFollow)},lchown(path,uid,gid){FS.chown(path,uid,gid,true)},fchown(fd,uid,gid){var stream=FS.getStreamChecked(fd);FS.doChown(stream,stream.node,false)},doTruncate(stream,node,len){if(FS.isDir(node.mode)){throw new FS.ErrnoError(31)}if(!FS.isFile(node.mode)){throw new FS.ErrnoError(28)}var errCode=FS.nodePermissions(node,"w");if(errCode){throw new FS.ErrnoError(errCode)}FS.doSetAttr(stream,node,{size:len,timestamp:Date.now()})},truncate(path,len){if(len<0){throw new FS.ErrnoError(28)}var node;if(typeof path=="string"){var lookup=FS.lookupPath(path,{follow:true});node=lookup.node}else{node=path}FS.doTruncate(null,node,len)},ftruncate(fd,len){var stream=FS.getStreamChecked(fd);if(len<0||(stream.flags&2097155)===0){throw new FS.ErrnoError(28)}FS.doTruncate(stream,stream.node,len)},utime(path,atime,mtime){var lookup=FS.lookupPath(path,{follow:true});var node=lookup.node;var setattr=FS.checkOpExists(node.node_ops.setattr,63);setattr(node,{atime,mtime})},open(path,flags,mode=438){if(path===""){throw new FS.ErrnoError(44)}flags=FS_modeStringToFlags(flags);if(flags&64){mode=mode&4095|32768}else{mode=0}var node;var isDirPath;if(typeof path=="object"){node=path}else{isDirPath=path.endsWith("/");var lookup=FS.lookupPath(path,{follow:!(flags&131072),noent_okay:true});node=lookup.node;path=lookup.path}var created=false;if(flags&64){if(node){if(flags&128){throw new FS.ErrnoError(20)}}else if(isDirPath){throw new FS.ErrnoError(31)}else{node=FS.mknod(path,mode|511,0);created=true}}if(!node){throw new FS.ErrnoError(44)}if(FS.isChrdev(node.mode)){flags&=~512}if(flags&65536&&!FS.isDir(node.mode)){throw new FS.ErrnoError(54)}if(!created){var errCode=FS.mayOpen(node,flags);if(errCode){throw new FS.ErrnoError(errCode)}}if(flags&512&&!created){FS.truncate(node,0)}flags&=~(128|512|131072);var stream=FS.createStream({node,path:FS.getPath(node),flags,seekable:true,position:0,stream_ops:node.stream_ops,ungotten:[],error:false});if(stream.stream_ops.open){stream.stream_ops.open(stream)}if(created){FS.chmod(node,mode&511)}return stream},close(stream){if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if(stream.getdents)stream.getdents=null;try{if(stream.stream_ops.close){stream.stream_ops.close(stream)}}catch(e){throw e}finally{FS.closeStream(stream.fd)}stream.fd=null},isClosed(stream){return stream.fd===null},llseek(stream,offset,whence){if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if(!stream.seekable||!stream.stream_ops.llseek){throw new FS.ErrnoError(70)}if(whence!=0&&whence!=1&&whence!=2){throw new FS.ErrnoError(28)}stream.position=stream.stream_ops.llseek(stream,offset,whence);stream.ungotten=[];return stream.position},read(stream,buffer,offset,length,position){if(length<0||position<0){throw new FS.ErrnoError(28)}if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if((stream.flags&2097155)===1){throw new FS.ErrnoError(8)}if(FS.isDir(stream.node.mode)){throw new FS.ErrnoError(31)}if(!stream.stream_ops.read){throw new FS.ErrnoError(28)}var seeking=typeof position!="undefined";if(!seeking){position=stream.position}else if(!stream.seekable){throw new FS.ErrnoError(70)}var bytesRead=stream.stream_ops.read(stream,buffer,offset,length,position);if(!seeking)stream.position+=bytesRead;return bytesRead},write(stream,buffer,offset,length,position,canOwn){if(length<0||position<0){throw new FS.ErrnoError(28)}if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if((stream.flags&2097155)===0){throw new FS.ErrnoError(8)}if(FS.isDir(stream.node.mode)){throw new FS.ErrnoError(31)}if(!stream.stream_ops.write){throw new FS.ErrnoError(28)}if(stream.seekable&&stream.flags&1024){FS.llseek(stream,0,2)}var seeking=typeof position!="undefined";if(!seeking){position=stream.position}else if(!stream.seekable){throw new FS.ErrnoError(70)}var bytesWritten=stream.stream_ops.write(stream,buffer,offset,length,position,canOwn);if(!seeking)stream.position+=bytesWritten;return bytesWritten},mmap(stream,length,position,prot,flags){if((prot&2)!==0&&(flags&2)===0&&(stream.flags&2097155)!==2){throw new FS.ErrnoError(2)}if((stream.flags&2097155)===1){throw new FS.ErrnoError(2)}if(!stream.stream_ops.mmap){throw new FS.ErrnoError(43)}if(!length){throw new FS.ErrnoError(28)}return stream.stream_ops.mmap(stream,length,position,prot,flags)},msync(stream,buffer,offset,length,mmapFlags){if(!stream.stream_ops.msync){return 0}return stream.stream_ops.msync(stream,buffer,offset,length,mmapFlags)},ioctl(stream,cmd,arg){if(!stream.stream_ops.ioctl){throw new FS.ErrnoError(59)}return stream.stream_ops.ioctl(stream,cmd,arg)},readFile(path,opts={}){opts.flags=opts.flags||0;opts.encoding=opts.encoding||"binary";if(opts.encoding!=="utf8"&&opts.encoding!=="binary"){abort(`Invalid encoding type "${opts.encoding}"`)}var stream=FS.open(path,opts.flags);var stat=FS.stat(path);var length=stat.size;var buf=new Uint8Array(length);FS.read(stream,buf,0,length,0);if(opts.encoding==="utf8"){buf=UTF8ArrayToString(buf)}FS.close(stream);return buf},writeFile(path,data,opts={}){opts.flags=opts.flags||577;var stream=FS.open(path,opts.flags,opts.mode);data=FS_fileDataToTypedArray(data);FS.write(stream,data,0,data.byteLength,undefined,opts.canOwn);FS.close(stream)},cwd:()=>FS.currentPath,chdir(path){var lookup=FS.lookupPath(path,{follow:true});if(lookup.node===null){throw new FS.ErrnoError(44)}if(!FS.isDir(lookup.node.mode)){throw new FS.ErrnoError(54)}var errCode=FS.nodePermissions(lookup.node,"x");if(errCode){throw new FS.ErrnoError(errCode)}FS.currentPath=lookup.path},createDefaultDirectories(){FS.mkdir("/tmp");FS.mkdir("/home");FS.mkdir("/home/web_user")},createDefaultDevices(){FS.mkdir("/dev");FS.registerDevice(FS.makedev(1,3),{read:()=>0,write:(stream,buffer,offset,length,pos)=>length,llseek:()=>0});FS.mkdev("/dev/null",FS.makedev(1,3));TTY.register(FS.makedev(5,0),TTY.default_tty_ops);TTY.register(FS.makedev(6,0),TTY.default_tty1_ops);FS.mkdev("/dev/tty",FS.makedev(5,0));FS.mkdev("/dev/tty1",FS.makedev(6,0));var randomBuffer=new Uint8Array(1024),randomLeft=0;var randomByte=()=>{if(randomLeft===0){randomFill(randomBuffer);randomLeft=randomBuffer.byteLength}return randomBuffer[--randomLeft]};FS.createDevice("/dev","random",randomByte);FS.createDevice("/dev","urandom",randomByte);FS.mkdir("/dev/shm");FS.mkdir("/dev/shm/tmp")},createSpecialDirectories(){FS.mkdir("/proc");var proc_self=FS.mkdir("/proc/self");FS.mkdir("/proc/self/fd");FS.mount({mount(){var node=FS.createNode(proc_self,"fd",16895,73);node.stream_ops={llseek:MEMFS.stream_ops.llseek};node.node_ops={lookup(parent,name){var fd=+name;var stream=FS.getStreamChecked(fd);var ret={parent:null,mount:{mountpoint:"fake"},node_ops:{readlink:()=>stream.path},id:fd+1};ret.parent=ret;return ret},readdir(){return Array.from(FS.streams.entries()).filter(([k,v])=>v).map(([k,v])=>k.toString())}};return node}},{},"/proc/self/fd")},createStandardStreams(input,output,error){if(input){FS.createDevice("/dev","stdin",input)}else{FS.symlink("/dev/tty","/dev/stdin")}if(output){FS.createDevice("/dev","stdout",null,output)}else{FS.symlink("/dev/tty","/dev/stdout")}if(error){FS.createDevice("/dev","stderr",null,error)}else{FS.symlink("/dev/tty1","/dev/stderr")}var stdin=FS.open("/dev/stdin",0);var stdout=FS.open("/dev/stdout",1);var stderr=FS.open("/dev/stderr",1)},staticInit(){FS.nameTable=new Array(4096);FS.mount(MEMFS,{},"/");FS.createDefaultDirectories();FS.createDefaultDevices();FS.createSpecialDirectories();FS.filesystems={MEMFS}},init(input,output,error){FS.initialized=true;input??=Module["stdin"];output??=Module["stdout"];error??=Module["stderr"];FS.createStandardStreams(input,output,error)},quit(){FS.initialized=false;for(var stream of FS.streams){if(stream){FS.close(stream)}}},findObject(path,dontResolveLastLink){var ret=FS.analyzePath(path,dontResolveLastLink);if(!ret.exists){return null}return ret.object},analyzePath(path,dontResolveLastLink){try{var lookup=FS.lookupPath(path,{follow:!dontResolveLastLink});path=lookup.path}catch(e){}var ret={isRoot:false,exists:false,error:0,name:null,path:null,object:null,parentExists:false,parentPath:null,parentObject:null};try{var lookup=FS.lookupPath(path,{parent:true});ret.parentExists=true;ret.parentPath=lookup.path;ret.parentObject=lookup.node;ret.name=PATH.basename(path);lookup=FS.lookupPath(path,{follow:!dontResolveLastLink});ret.exists=true;ret.path=lookup.path;ret.object=lookup.node;ret.name=lookup.node.name;ret.isRoot=lookup.path==="/"}catch(e){ret.error=e.errno}return ret},createPath(parent,path,canRead,canWrite){parent=typeof parent=="string"?parent:FS.getPath(parent);var parts=path.split("/").reverse();while(parts.length){var part=parts.pop();if(!part)continue;var current=PATH.join2(parent,part);try{FS.mkdir(current)}catch(e){if(e.errno!=20)throw e}parent=current}return current},createFile(parent,name,properties,canRead,canWrite){var path=PATH.join2(typeof parent=="string"?parent:FS.getPath(parent),name);var mode=FS_getMode(canRead,canWrite);return FS.create(path,mode)},createDataFile(parent,name,data,canRead,canWrite,canOwn){var path=name;if(parent){parent=typeof parent=="string"?parent:FS.getPath(parent);path=name?PATH.join2(parent,name):parent}var mode=FS_getMode(canRead,canWrite);var node=FS.create(path,mode);if(data){data=FS_fileDataToTypedArray(data);FS.chmod(node,mode|146);var stream=FS.open(node,577);FS.write(stream,data,0,data.length,0,canOwn);FS.close(stream);FS.chmod(node,mode)}},createDevice(parent,name,input,output){var path=PATH.join2(typeof parent=="string"?parent:FS.getPath(parent),name);var mode=FS_getMode(!!input,!!output);FS.createDevice.major??=64;var dev=FS.makedev(FS.createDevice.major++,0);FS.registerDevice(dev,{open(stream){stream.seekable=false},close(stream){if(output?.buffer?.length){output(10)}},read(stream,buffer,offset,length,pos){var bytesRead=0;for(var i=0;i<length;i++){var result;try{result=input()}catch(e){throw new FS.ErrnoError(29)}if(result===undefined&&bytesRead===0){throw new FS.ErrnoError(6)}if(result===null||result===undefined)break;bytesRead++;buffer[offset+i]=result}if(bytesRead){stream.node.atime=Date.now()}return bytesRead},write(stream,buffer,offset,length,pos){for(var i=0;i<length;i++){try{output(buffer[offset+i])}catch(e){throw new FS.ErrnoError(29)}}if(length){stream.node.mtime=stream.node.ctime=Date.now()}return i}});return FS.mkdev(path,mode,dev)},forceLoadFile(obj){if(obj.isDevice||obj.isFolder||obj.link||obj.contents)return true;if(globalThis.XMLHttpRequest){abort("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.")}else{try{obj.contents=readBinary(obj.url)}catch(e){throw new FS.ErrnoError(29)}}},createLazyFile(parent,name,url,canRead,canWrite){class LazyUint8Array{lengthKnown=false;chunks=[];get(idx){if(idx>this.length-1||idx<0){return undefined}var chunkOffset=idx%this.chunkSize;var chunkNum=idx/this.chunkSize|0;return this.getter(chunkNum)[chunkOffset]}setDataGetter(getter){this.getter=getter}cacheLength(){var xhr=new XMLHttpRequest;xhr.open("HEAD",url,false);xhr.send(null);if(!(xhr.status>=200&&xhr.status<300||xhr.status===304))abort("Couldn't load "+url+". Status: "+xhr.status);var datalength=Number(xhr.getResponseHeader("Content-length"));var header;var hasByteServing=(header=xhr.getResponseHeader("Accept-Ranges"))&&header==="bytes";var usesGzip=(header=xhr.getResponseHeader("Content-Encoding"))&&header==="gzip";var chunkSize=1024*1024;if(!hasByteServing)chunkSize=datalength;var doXHR=(from,to)=>{if(from>to)abort("invalid range ("+from+", "+to+") or no bytes requested!");if(to>datalength-1)abort("only "+datalength+" bytes available! programmer error!");var xhr=new XMLHttpRequest;xhr.open("GET",url,false);if(datalength!==chunkSize)xhr.setRequestHeader("Range","bytes="+from+"-"+to);xhr.responseType="arraybuffer";if(xhr.overrideMimeType){xhr.overrideMimeType("text/plain; charset=x-user-defined")}xhr.send(null);if(!(xhr.status>=200&&xhr.status<300||xhr.status===304))abort("Couldn't load "+url+". Status: "+xhr.status);if(xhr.response!==undefined){return new Uint8Array(xhr.response||[])}return intArrayFromString(xhr.responseText||"",true)};var lazyArray=this;lazyArray.setDataGetter(chunkNum=>{var start=chunkNum*chunkSize;var end=(chunkNum+1)*chunkSize-1;end=Math.min(end,datalength-1);if(typeof lazyArray.chunks[chunkNum]=="undefined"){lazyArray.chunks[chunkNum]=doXHR(start,end)}if(typeof lazyArray.chunks[chunkNum]=="undefined")abort("doXHR failed!");return lazyArray.chunks[chunkNum]});if(usesGzip||!datalength){chunkSize=datalength=1;datalength=this.getter(0).length;chunkSize=datalength;out("LazyFiles on gzip forces download of the whole file when length is accessed")}this._length=datalength;this._chunkSize=chunkSize;this.lengthKnown=true}get length(){if(!this.lengthKnown){this.cacheLength()}return this._length}get chunkSize(){if(!this.lengthKnown){this.cacheLength()}return this._chunkSize}}if(globalThis.XMLHttpRequest){if(!ENVIRONMENT_IS_WORKER)abort("Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc");var lazyArray=new LazyUint8Array;var properties={isDevice:false,contents:lazyArray}}else{var properties={isDevice:false,url}}var node=FS.createFile(parent,name,properties,canRead,canWrite);if(properties.contents){node.contents=properties.contents}else if(properties.url){node.contents=null;node.url=properties.url}Object.defineProperties(node,{usedBytes:{get:function(){return this.contents.length}}});var stream_ops={};for(const[key,fn]of Object.entries(node.stream_ops)){stream_ops[key]=(...args)=>{FS.forceLoadFile(node);return fn(...args)}}function writeChunks(stream,buffer,offset,length,position){var contents=stream.node.contents;if(position>=contents.length)return 0;var size=Math.min(contents.length-position,length);if(contents.slice){for(var i=0;i<size;i++){buffer[offset+i]=contents[position+i]}}else{for(var i=0;i<size;i++){buffer[offset+i]=contents.get(position+i)}}return size}stream_ops.read=(stream,buffer,offset,length,position)=>{FS.forceLoadFile(node);return writeChunks(stream,buffer,offset,length,position)};stream_ops.mmap=(stream,length,position,prot,flags)=>{FS.forceLoadFile(node);var ptr=mmapAlloc(length);if(!ptr){throw new FS.ErrnoError(48)}writeChunks(stream,HEAP8,ptr,length,position);return{ptr,allocated:true}};node.stream_ops=stream_ops;return node}};var UTF8ToString=(ptr,maxBytesToRead,ignoreNul)=>ptr?UTF8ArrayToString(HEAPU8,ptr,maxBytesToRead,ignoreNul):"";var SYSCALLS={currentUmask:18,calculateAt(dirfd,path,allowEmpty){if(PATH.isAbs(path)){return path}var dir;if(dirfd===-100){dir=FS.cwd()}else{var dirstream=SYSCALLS.getStreamFromFD(dirfd);dir=dirstream.path}if(path.length==0){if(!allowEmpty){throw new FS.ErrnoError(44)}return dir}return dir+"/"+path},writeStat(buf,stat){HEAPU32[buf>>2]=stat.dev;HEAPU32[buf+4>>2]=stat.mode;HEAPU32[buf+8>>2]=stat.nlink;HEAPU32[buf+12>>2]=stat.uid;HEAPU32[buf+16>>2]=stat.gid;HEAPU32[buf+20>>2]=stat.rdev;HEAP64[buf+24>>3]=BigInt(stat.size);HEAP32[buf+32>>2]=4096;HEAP32[buf+36>>2]=stat.blocks;var atime=stat.atime.getTime();var mtime=stat.mtime.getTime();var ctime=stat.ctime.getTime();HEAP64[buf+40>>3]=BigInt(Math.floor(atime/1e3));HEAPU32[buf+48>>2]=atime%1e3*1e3*1e3;HEAP64[buf+56>>3]=BigInt(Math.floor(mtime/1e3));HEAPU32[buf+64>>2]=mtime%1e3*1e3*1e3;HEAP64[buf+72>>3]=BigInt(Math.floor(ctime/1e3));HEAPU32[buf+80>>2]=ctime%1e3*1e3*1e3;HEAP64[buf+88>>3]=BigInt(stat.ino);return 0},writeStatFs(buf,stats){HEAPU32[buf+4>>2]=stats.bsize;HEAPU32[buf+60>>2]=stats.bsize;HEAP64[buf+8>>3]=BigInt(stats.blocks);HEAP64[buf+16>>3]=BigInt(stats.bfree);HEAP64[buf+24>>3]=BigInt(stats.bavail);HEAP64[buf+32>>3]=BigInt(stats.files);HEAP64[buf+40>>3]=BigInt(stats.ffree);HEAPU32[buf+48>>2]=stats.fsid;HEAPU32[buf+64>>2]=stats.flags;HEAPU32[buf+56>>2]=stats.namelen},doMsync(addr,stream,len,flags,offset){if(!FS.isFile(stream.node.mode)){throw new FS.ErrnoError(43)}if(flags&2){return 0}var buffer=HEAPU8.slice(addr,addr+len);FS.msync(stream,buffer,offset,len,flags)},getStreamFromFD(fd){var stream=FS.getStreamChecked(fd);return stream},varargs:undefined,getStr(ptr){var ret=UTF8ToString(ptr);return ret}};function _fd_close(fd){try{var stream=SYSCALLS.getStreamFromFD(fd);FS.close(stream);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}var doReadv=(stream,iov,iovcnt,offset)=>{var ret=0;for(var i=0;i<iovcnt;i++){var ptr=HEAPU32[iov>>2];var len=HEAPU32[iov+4>>2];iov+=8;var curr=FS.read(stream,HEAP8,ptr,len,offset);if(curr<0)return-1;ret+=curr;if(curr<len)break;if(typeof offset!="undefined"){offset+=curr}}return ret};function _fd_read(fd,iov,iovcnt,pnum){try{var stream=SYSCALLS.getStreamFromFD(fd);var num=doReadv(stream,iov,iovcnt);HEAPU32[pnum>>2]=num;return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}var INT53_MAX=9007199254740992;var INT53_MIN=-9007199254740992;var bigintToI53Checked=num=>num<INT53_MIN||num>INT53_MAX?NaN:Number(num);function _fd_seek(fd,offset,whence,newOffset){offset=bigintToI53Checked(offset);try{if(isNaN(offset))return 22;var stream=SYSCALLS.getStreamFromFD(fd);FS.llseek(stream,offset,whence);HEAP64[newOffset>>3]=BigInt(stream.position);if(stream.getdents&&offset===0&&whence===0)stream.getdents=null;return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}var doWritev=(stream,iov,iovcnt,offset)=>{var ret=0;for(var i=0;i<iovcnt;i++){var ptr=HEAPU32[iov>>2];var len=HEAPU32[iov+4>>2];iov+=8;var curr=FS.write(stream,HEAP8,ptr,len,offset);if(curr<0)return-1;ret+=curr;if(curr<len){break}if(typeof offset!="undefined"){offset+=curr}}return ret};function _fd_write(fd,iov,iovcnt,pnum){try{var stream=SYSCALLS.getStreamFromFD(fd);var num=doWritev(stream,iov,iovcnt);HEAPU32[pnum>>2]=num;return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}FS.createPreloadedFile=FS_createPreloadedFile;FS.preloadFile=FS_preloadFile;FS.staticInit();{if(Module["noExitRuntime"])noExitRuntime=Module["noExitRuntime"];if(Module["preloadPlugins"])preloadPlugins=Module["preloadPlugins"];if(Module["print"])out=Module["print"];if(Module["printErr"])err=Module["printErr"];if(Module["wasmBinary"])wasmBinary=Module["wasmBinary"];if(Module["arguments"])arguments_=Module["arguments"];if(Module["thisProgram"])thisProgram=Module["thisProgram"];if(Module["preInit"]){if(typeof Module["preInit"]=="function")Module["preInit"]=[Module["preInit"]];while(Module["preInit"].length>0){Module["preInit"].shift()()}}}Module["UTF8ToString"]=UTF8ToString;var _HYD_LAST_ERROR,_HYD_SPV_TO_WGSL,_malloc,_free,memory,__indirect_function_table,wasmMemory;function assignWasmExports(wasmExports){_HYD_LAST_ERROR=Module["_HYD_LAST_ERROR"]=wasmExports["m"];_HYD_SPV_TO_WGSL=Module["_HYD_SPV_TO_WGSL"]=wasmExports["n"];_malloc=Module["_malloc"]=wasmExports["o"];_free=Module["_free"]=wasmExports["p"];memory=wasmMemory=wasmExports["k"];__indirect_function_table=wasmExports["__indirect_function_table"]}var wasmImports={a:___cxa_throw,j:__abort_js,c:__tzset_js,e:_emscripten_resize_heap,g:_environ_get,h:_environ_sizes_get,i:_fd_close,f:_fd_read,d:_fd_seek,b:_fd_write};function run(){if(runDependencies>0){dependenciesFulfilled=run;return}preRun();if(runDependencies>0){dependenciesFulfilled=run;return}function doRun(){Module["calledRun"]=true;if(ABORT)return;initRuntime();readyPromiseResolve?.(Module);Module["onRuntimeInitialized"]?.();postRun()}if(Module["setStatus"]){Module["setStatus"]("Running...");setTimeout(()=>{setTimeout(()=>Module["setStatus"](""),1);doRun()},1)}else{doRun()}}var wasmExports;wasmExports=await (createWasm());run();if(runtimeInitialized){moduleRtn=Module}else{moduleRtn=new Promise((resolve,reject)=>{readyPromiseResolve=resolve;readyPromiseReject=reject})}
;return moduleRtn}globalThis.createHydTintWasmModule = Module;


/* harmony default export */ const tint_wasm = ((() => {
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
          const i = "file:///Volumes/Code/gl2gpu-tint/src/vendor/tint-wasm/tint_wasm.js".lastIndexOf("/");
          return "file:///Volumes/Code/gl2gpu-tint/src/vendor/tint-wasm/tint_wasm.js".substring(0, i) + "/" + path;
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
})());

;// ./src/components/shaderSource.ts
function hydTrim(s) {
    return s.trim().replace(/\r\n/g, "\n");
}

;// ./src/components/shaderMetadata.ts

const TYPE_MAP = new Map([
    ["float", "f32"],
    ["int", "i32"],
    ["uint", "u32"],
    ["bool", "bool"],
    ["vec2", "vec2<f32>"],
    ["vec3", "vec3<f32>"],
    ["vec4", "vec4<f32>"],
    ["ivec2", "vec2<i32>"],
    ["ivec3", "vec3<i32>"],
    ["ivec4", "vec4<i32>"],
    ["uvec2", "vec2<u32>"],
    ["uvec3", "vec3<u32>"],
    ["uvec4", "vec4<u32>"],
    ["bvec2", "vec2<bool>"],
    ["bvec3", "vec3<bool>"],
    ["bvec4", "vec4<bool>"],
    ["mat2", "mat2x2<f32>"],
    ["mat3", "mat3x3<f32>"],
    ["mat4", "mat4x4<f32>"],
    ["mat2x2", "mat2x2<f32>"],
    ["mat2x3", "mat2x3<f32>"],
    ["mat2x4", "mat2x4<f32>"],
    ["mat3x2", "mat3x2<f32>"],
    ["mat3x3", "mat3x3<f32>"],
    ["mat3x4", "mat3x4<f32>"],
    ["mat4x2", "mat4x2<f32>"],
    ["mat4x3", "mat4x3<f32>"],
    ["mat4x4", "mat4x4<f32>"],
]);
const SAMPLER_TEXTURE_MAP = new Map([
    ["sampler2D", "texture_2d<f32>"],
    ["samplerCube", "texture_cube<f32>"],
    ["sampler2DArray", "texture_2d_array<f32>"],
    ["sampler3D", "texture_3d<f32>"],
]);
function stripComments(source) {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
}
function normalizeIdentifierName(raw) {
    return raw.replace(/\[[^\]]*\]$/, "").replace(/;$/, "").trim();
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function isIdentifierReferenced(source, name) {
    return new RegExp(`\\b${escapeRegExp(name)}\\b`).test(source);
}
function toWgslType(glslType) {
    const mapped = TYPE_MAP.get(glslType);
    if (!mapped) {
        throw new Error(`unsupported GLSL type: ${glslType}`);
    }
    return mapped;
}
function declarationFrom(glslType, name) {
    return {
        name,
        glsl_type: glslType,
        wgsl_type: toWgslType(glslType),
    };
}
function scanGlslDeclarations(source, stage) {
    const cleaned = stripComments(source);
    const declarations = {
        attributes: [],
        uniforms: [],
        samplers: [],
        varyings: [],
    };
    const seen = new Set();
    const declarationPattern = /(?:^|[;\n])\s*(?:(?:layout\s*\([^)]*\)\s*)?)(?:(?:lowp|mediump|highp)\s+)?(attribute|uniform|varying|in|out)\s+(?:(?:lowp|mediump|highp)\s+)?([A-Za-z_]\w*)\s+([^;]+)\s*;/g;
    const bodyWithoutGlobalDeclarations = cleaned.replace(declarationPattern, "\n");
    const declarationRegex = new RegExp(declarationPattern);
    let match;
    while ((match = declarationRegex.exec(cleaned)) !== null) {
        const qualifier = match[1];
        const glslType = match[2];
        const names = match[3].split(",");
        for (const rawName of names) {
            const name = normalizeIdentifierName(rawName);
            if (!name)
                continue;
            const key = `${qualifier}:${glslType}:${name}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            if (qualifier === "uniform") {
                const textureType = SAMPLER_TEXTURE_MAP.get(glslType);
                if (textureType) {
                    declarations.samplers.push({
                        name,
                        glsl_type: glslType,
                        wgsl_texture_type: textureType,
                        wgsl_sampler_type: "sampler",
                    });
                }
                else {
                    declarations.uniforms.push(declarationFrom(glslType, name));
                }
                continue;
            }
            if (qualifier === "attribute" || (qualifier === "in" && stage === "vertex")) {
                if (!isIdentifierReferenced(bodyWithoutGlobalDeclarations, name)) {
                    continue;
                }
                declarations.attributes.push(declarationFrom(glslType, name));
                continue;
            }
            if (qualifier === "varying" || (qualifier === "out" && stage === "vertex") || (qualifier === "in" && stage === "fragment")) {
                declarations.varyings.push(declarationFrom(glslType, name));
            }
        }
    }
    return declarations;
}
function makeShaderMetadata(source, type, wgsl = "") {
    const stage = type === WebGLRenderingContext.VERTEX_SHADER ? "vertex" : "fragment";
    const declarations = scanGlslDeclarations(source, stage);
    return {
        attributes: stage === "vertex" ? declarations.attributes : [],
        uniforms: declarations.uniforms,
        samplers: declarations.samplers,
        glsl: hydTrim(source),
        wgsl,
        debug_info: JSON.stringify({
            source: "runtime",
            stage,
            translated: wgsl.length > 0,
        }),
    };
}

;// ./src/components/shaderTexCoord.ts
const TEXCOORD_HELPER = "_hyd_glTexCoordToGpu";
const TEXTURE_SAMPLE_CALL = /\b(textureSample(?:Level|Bias|Grad)?)\s*\(/g;
function shaderTexCoord_findMatchingParen(source, openIndex) {
    let depth = 0;
    for (let i = openIndex; i < source.length; i++) {
        const ch = source[i];
        if (ch === "(") {
            depth++;
        }
        else if (ch === ")") {
            depth--;
            if (depth === 0) {
                return i;
            }
        }
    }
    return -1;
}
function splitTopLevelArguments(source) {
    const args = [];
    let start = 0;
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    for (let i = 0; i < source.length; i++) {
        const ch = source[i];
        if (ch === "(") {
            parenDepth++;
        }
        else if (ch === ")") {
            parenDepth--;
        }
        else if (ch === "[") {
            bracketDepth++;
        }
        else if (ch === "]") {
            bracketDepth--;
        }
        else if (ch === "{") {
            braceDepth++;
        }
        else if (ch === "}") {
            braceDepth--;
        }
        else if (ch === "," && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
            args.push(source.slice(start, i));
            start = i + 1;
        }
    }
    args.push(source.slice(start));
    return args;
}
function isTextureArgForSampler(textureArg, samplerArg, samplerName) {
    const texture = textureArg.trim();
    const sampler = samplerArg.trim();
    return ((texture === `${samplerName}T` || texture === `${samplerName}_texture`) &&
        (sampler === `${samplerName}S` || sampler === `${samplerName}_sampler`));
}
function isSpriteStyleShader(source, metadata) {
    const names = [
        ...metadata.attributes.map((item) => item.name),
        ...metadata.uniforms.map((item) => item.name),
        ...metadata.samplers.map((item) => item.name),
    ].join(" ");
    const haystack = `${source}\n${names}`.toLowerCase();
    return /sprite_texture|u_texture[0-3]|textureweights|spritetexturesize|spritesperrow|perspriteframeoffset|sprite_tex_transform/.test(haystack);
}
function isTexCoordExpression(expression) {
    const compact = expression.replace(/\s+/g, "");
    if (compact.includes(`${TEXCOORD_HELPER}(`)) {
        return false;
    }
    return /(texcoord|tex_coord|\bv_?uv\b|\.uv\b|\buv\b)/i.test(compact);
}
function getIdentifiers(expression) {
    return expression.match(/\b[A-Za-z_]\w*\b/g) ?? [];
}
function expressionUsesTexCoord(expression, aliases) {
    if (isTexCoordExpression(expression)) {
        return true;
    }
    return getIdentifiers(expression).some((identifier) => aliases.has(identifier));
}
function buildTexCoordAliases(wgsl) {
    const aliases = new Set();
    const privateVarRegex = /\bvar<private>\s+([A-Za-z_]\w*)\s*:/g;
    for (let match = privateVarRegex.exec(wgsl); match !== null; match = privateVarRegex.exec(wgsl)) {
        if (isTexCoordExpression(match[1])) {
            aliases.add(match[1]);
        }
    }
    let changed = true;
    while (changed) {
        changed = false;
        const declarationRegex = /\b(?:let|var)\s+([A-Za-z_]\w*)(?:\s*:\s*[^=;]+)?\s*=\s*([^;]+);/g;
        for (let match = declarationRegex.exec(wgsl); match !== null; match = declarationRegex.exec(wgsl)) {
            if (!aliases.has(match[1]) && expressionUsesTexCoord(match[2], aliases)) {
                aliases.add(match[1]);
                changed = true;
            }
        }
        const assignmentRegex = /\b([A-Za-z_]\w*)\s*=\s*([^;]+);/g;
        for (let match = assignmentRegex.exec(wgsl); match !== null; match = assignmentRegex.exec(wgsl)) {
            if (!aliases.has(match[1]) && expressionUsesTexCoord(match[2], aliases)) {
                aliases.add(match[1]);
                changed = true;
            }
        }
    }
    return aliases;
}
function addTexCoordHelper(wgsl) {
    if (wgsl.includes(`fn ${TEXCOORD_HELPER}`)) {
        return wgsl;
    }
    const helper = `fn ${TEXCOORD_HELPER}(texCoord: vec2<f32>) -> vec2<f32> {\n    return vec2<f32>(texCoord.x, 1.0 - texCoord.y);\n}\n\n`;
    const fragmentIndex = wgsl.search(/^\s*@fragment\b/m);
    if (fragmentIndex < 0) {
        return helper + wgsl;
    }
    return wgsl.slice(0, fragmentIndex) + helper + wgsl.slice(fragmentIndex);
}
function normalizeFragmentTextureCoordinates(wgsl, metadata, source) {
    const sampler2DNames = metadata.samplers
        .filter((sampler) => sampler.glsl_type === "sampler2D")
        .map((sampler) => sampler.name);
    if (sampler2DNames.length === 0 || isSpriteStyleShader(source, metadata)) {
        return wgsl;
    }
    let changed = false;
    let result = "";
    let cursor = 0;
    const texCoordAliases = buildTexCoordAliases(wgsl);
    TEXTURE_SAMPLE_CALL.lastIndex = 0;
    for (let match = TEXTURE_SAMPLE_CALL.exec(wgsl); match !== null; match = TEXTURE_SAMPLE_CALL.exec(wgsl)) {
        const openParen = TEXTURE_SAMPLE_CALL.lastIndex - 1;
        const closeParen = shaderTexCoord_findMatchingParen(wgsl, openParen);
        if (closeParen < 0) {
            break;
        }
        const args = splitTopLevelArguments(wgsl.slice(openParen + 1, closeParen));
        if (args.length >= 3) {
            const samplerName = sampler2DNames.find((name) => isTextureArgForSampler(args[0], args[1], name));
            if (samplerName && expressionUsesTexCoord(args[2], texCoordAliases)) {
                const rewrittenArgs = args.slice();
                rewrittenArgs[2] = `${TEXCOORD_HELPER}(${args[2].trim()})`;
                result += wgsl.slice(cursor, openParen + 1) + rewrittenArgs.map((arg) => arg.trim()).join(", ") + ")";
                cursor = closeParen + 1;
                changed = true;
            }
        }
        TEXTURE_SAMPLE_CALL.lastIndex = closeParen + 1;
    }
    if (!changed) {
        return wgsl;
    }
    result += wgsl.slice(cursor);
    return addTexCoordHelper(result);
}
function normalizeParticleVertexTexCoord(wgsl, metadata, source) {
    if (isSpriteStyleShader(source, metadata) ||
        !/\buvLifeTimeFrameStart\b/.test(source) ||
        !/\boutputTexcoord\b/.test(source) ||
        !/\borientation\b/.test(source)) {
        return wgsl;
    }
    const privateFields = new Set();
    const privateRegex = /\bvar<private>\s+([A-Za-z_]\w*)\s*:\s*vec2[<f\d>]*\s*;/g;
    for (let match = privateRegex.exec(wgsl); match !== null; match = privateRegex.exec(wgsl)) {
        if (/texcoord/i.test(match[1])) {
            privateFields.add(match[1]);
        }
    }
    if (privateFields.size > 0) {
        const assignableFields = Array.from(privateFields).filter((field) => new RegExp(`\\b${field}\\s*=`).test(wgsl));
        if (assignableFields.length > 0 &&
            !assignableFields.some((field) => new RegExp(`\\b${field}\\s*\\.\\s*y\\s*=\\s*1\\.0\\s*-`, "i").test(wgsl))) {
            const flips = assignableFields.map((field) => `  ${field}.y = 1.0 - ${field}.y;`).join("\n");
            return wgsl.replace(/\breturn\s*;/, `${flips}\n  return;`);
        }
    }
    const returnMatch = /\breturn\s+([A-Za-z_]\w*)\s*;/.exec(wgsl);
    if (!returnMatch) {
        return wgsl;
    }
    const outputName = returnMatch[1];
    const fieldRegex = new RegExp(`\\b${outputName}\\s*\\.\\s*([A-Za-z_]\\w*)\\s*=`, "g");
    const fields = new Set();
    for (let match = fieldRegex.exec(wgsl); match !== null; match = fieldRegex.exec(wgsl)) {
        if (/texcoord/i.test(match[1])) {
            fields.add(match[1]);
        }
    }
    if (fields.size === 0) {
        return wgsl;
    }
    const existingFlipRegex = new RegExp(`\\b${outputName}\\s*\\.\\s*[A-Za-z_]\\w*\\s*\\.\\s*y\\s*=\\s*1\\.0\\s*-`, "i");
    if (existingFlipRegex.test(wgsl)) {
        return wgsl;
    }
    const flips = Array.from(fields)
        .map((field) => `    ${outputName}.${field}.y = 1.0 - ${outputName}.${field}.y;`)
        .join("\n");
    return wgsl.replace(returnMatch[0], `${flips}\n    ${returnMatch[0]}`);
}
function normalizeWebGlTextureCoordinates(wgsl, metadata, stage, source) {
    if (stage === "fragment") {
        return normalizeFragmentTextureCoordinates(wgsl, metadata, source);
    }
    if (stage === "vertex") {
        return normalizeParticleVertexTexCoord(wgsl, metadata, source);
    }
    return wgsl;
}

;// ./src/components/shaderWgslOptimizer.ts
function shaderWgslOptimizer_escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function wordBoundaryReplace(source, from, to) {
    return source.replace(new RegExp(`\\b${shaderWgslOptimizer_escapeRegExp(from)}\\b`, "g"), to);
}
function countIdentifier(source, name) {
    return source.match(new RegExp(`\\b${shaderWgslOptimizer_escapeRegExp(name)}\\b`, "g"))?.length ?? 0;
}
function findMatching(source, openIndex, openChar, closeChar) {
    let depth = 0;
    for (let i = openIndex; i < source.length; i++) {
        const ch = source[i];
        if (ch === openChar) {
            depth++;
        }
        else if (ch === closeChar) {
            depth--;
            if (depth === 0) {
                return i;
            }
        }
    }
    return -1;
}
function shaderWgslOptimizer_splitTopLevelArguments(source) {
    const args = [];
    let start = 0;
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    for (let i = 0; i < source.length; i++) {
        const ch = source[i];
        if (ch === "(") {
            parenDepth++;
        }
        else if (ch === ")") {
            parenDepth--;
        }
        else if (ch === "[") {
            bracketDepth++;
        }
        else if (ch === "]") {
            bracketDepth--;
        }
        else if (ch === "{") {
            braceDepth++;
        }
        else if (ch === "}") {
            braceDepth--;
        }
        else if (ch === "," && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
            args.push(source.slice(start, i));
            start = i + 1;
        }
    }
    args.push(source.slice(start));
    return args.map((arg) => arg.trim()).filter((arg) => arg.length > 0);
}
function splitTopLevelParameters(source) {
    const params = [];
    let start = 0;
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    let angleDepth = 0;
    for (let i = 0; i < source.length; i++) {
        const ch = source[i];
        if (ch === "(") {
            parenDepth++;
        }
        else if (ch === ")") {
            parenDepth--;
        }
        else if (ch === "[") {
            bracketDepth++;
        }
        else if (ch === "]") {
            bracketDepth--;
        }
        else if (ch === "{") {
            braceDepth++;
        }
        else if (ch === "}") {
            braceDepth--;
        }
        else if (ch === "<") {
            angleDepth++;
        }
        else if (ch === ">" && angleDepth > 0) {
            angleDepth--;
        }
        else if (ch === "," && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0 && angleDepth === 0) {
            params.push(source.slice(start, i));
            start = i + 1;
        }
    }
    params.push(source.slice(start));
    return params.map((param) => param.trim()).filter((param) => param.length > 0);
}
function parseFunctions(source) {
    const functions = [];
    const regex = /((?:@[A-Za-z_]\w*(?:\([^)]*\))?\s*)*)fn\s+([A-Za-z_]\w*)\s*\(/g;
    for (let match = regex.exec(source); match !== null; match = regex.exec(source)) {
        const openParen = regex.lastIndex - 1;
        const closeParen = findMatching(source, openParen, "(", ")");
        if (closeParen < 0) {
            continue;
        }
        const bodyOpen = source.indexOf("{", closeParen + 1);
        if (bodyOpen < 0) {
            continue;
        }
        const bodyClose = findMatching(source, bodyOpen, "{", "}");
        if (bodyClose < 0) {
            continue;
        }
        const attributes = match[1] || "";
        const fnStart = match.index + attributes.length;
        functions.push({
            name: match[2],
            start: match.index,
            end: bodyClose + 1,
            fnStart,
            openParen,
            closeParen,
            bodyOpen,
            bodyClose,
            attributes,
            params: source.slice(openParen + 1, closeParen),
            returnType: source.slice(closeParen + 1, bodyOpen).trimEnd(),
            body: source.slice(bodyOpen + 1, bodyClose),
        });
        regex.lastIndex = bodyClose + 1;
    }
    return functions;
}
function parsePrivateDeclarations(source) {
    const declarations = [];
    const regex = /\bvar<private>\s+([A-Za-z_]\w*)\s*:\s*[^;]+;\s*/g;
    for (let match = regex.exec(source); match !== null; match = regex.exec(source)) {
        declarations.push({
            name: match[1],
            start: match.index,
            end: regex.lastIndex,
        });
    }
    return declarations;
}
function parseStructs(source) {
    const structs = [];
    const regex = /\bstruct\s+([A-Za-z_]\w*)\s*\{/g;
    for (let match = regex.exec(source); match !== null; match = regex.exec(source)) {
        const bodyOpen = regex.lastIndex - 1;
        const bodyClose = findMatching(source, bodyOpen, "{", "}");
        if (bodyClose < 0) {
            continue;
        }
        const body = source.slice(bodyOpen + 1, bodyClose);
        const fields = [];
        const fieldRegex = /(?:@[A-Za-z_]\w*(?:\([^)]*\))?\s*)*([A-Za-z_]\w*)\s*:\s*[^,]+,/g;
        for (let field = fieldRegex.exec(body); field !== null; field = fieldRegex.exec(body)) {
            fields.push(field[1]);
        }
        structs.push({ name: match[1], fields });
        regex.lastIndex = bodyClose + 1;
    }
    return structs;
}
function parseParamNames(params) {
    const names = new Set();
    for (const param of shaderWgslOptimizer_splitTopLevelArguments(params)) {
        const cleaned = param.replace(/@[A-Za-z_]\w*(?:\([^)]*\))?/g, " ").trim();
        const match = cleaned.match(/\b([A-Za-z_]\w*)\s*:\s*[^:]+$/);
        if (match) {
            names.add(match[1]);
        }
    }
    return names;
}
function stripRecognizedEntryStatements(body, assignments, helperName, returnStatement) {
    let out = body;
    for (const assignment of assignments) {
        out = out.replace(new RegExp(`^\\s*${shaderWgslOptimizer_escapeRegExp(assignment.target)}\\s*=\\s*${shaderWgslOptimizer_escapeRegExp(assignment.value)}\\s*;\\s*$`, "m"), "");
    }
    out = out.replace(new RegExp(`^\\s*${shaderWgslOptimizer_escapeRegExp(helperName)}\\s*\\(\\s*\\)\\s*;\\s*$`, "m"), "");
    out = out.replace(new RegExp(`^\\s*${shaderWgslOptimizer_escapeRegExp(returnStatement)}\\s*$`, "m"), "");
    return out.replace(/\/\/.*$/gm, "").trim();
}
function removeRanges(source, ranges) {
    let out = source;
    const sorted = ranges.slice().sort((a, b) => b.start - a.start);
    for (const range of sorted) {
        out = out.slice(0, range.start) + range.replacement + out.slice(range.end);
    }
    return out;
}
function assignmentCount(source, name) {
    const regex = new RegExp(`\\b${shaderWgslOptimizer_escapeRegExp(name)}\\s*(?:[+\\-*/%&|^]?=)`, "g");
    return source.match(regex)?.length ?? 0;
}
function directAssignmentCount(source, name) {
    const regex = new RegExp(`(?:^|[;\\n]\\s*)${shaderWgslOptimizer_escapeRegExp(name)}\\s*=`, "g");
    return source.match(regex)?.length ?? 0;
}
function fieldOrIndexAssignmentCount(source, name) {
    const regex = new RegExp(`(?:^|[;\\n]\\s*)${shaderWgslOptimizer_escapeRegExp(name)}\\s*(?:\\.|\\[[^\\]]+\\])[^=;\\n]*=`, "g");
    return source.match(regex)?.length ?? 0;
}
function applyIdentifierMap(source, replacements) {
    let out = source;
    const names = Array.from(replacements.keys()).sort((a, b) => b.length - a.length);
    for (const name of names) {
        out = wordBoundaryReplace(out, name, replacements.get(name));
    }
    return out;
}
function lowerEntryWrapper(source) {
    const functions = parseFunctions(source);
    const entries = functions.filter((fn) => /@(vertex|fragment)\b/.test(fn.attributes));
    if (entries.length !== 1) {
        return { wgsl: source, loweredPrivateVars: 0, skipped: entries.length === 0 ? "no-entry-wrapper" : "multiple-entrypoints" };
    }
    const entry = entries[0];
    const privateDeclarations = parsePrivateDeclarations(source);
    if (privateDeclarations.length === 0) {
        return { wgsl: source, loweredPrivateVars: 0, skipped: "no-private-io" };
    }
    const privateNames = new Set(privateDeclarations.map((declaration) => declaration.name));
    const params = parseParamNames(entry.params);
    const entryAssignments = [];
    const assignmentRegex = /^\s*([A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*)\s*;\s*$/gm;
    for (let match = assignmentRegex.exec(entry.body); match !== null; match = assignmentRegex.exec(entry.body)) {
        if (privateNames.has(match[1]) && params.has(match[2])) {
            entryAssignments.push({ target: match[1], value: match[2] });
        }
    }
    const helperCallMatch = /^\s*([A-Za-z_]\w*)\s*\(\s*\)\s*;\s*$/m.exec(entry.body);
    if (!helperCallMatch) {
        return { wgsl: source, loweredPrivateVars: 0, skipped: "entry-helper-call-not-found" };
    }
    const helper = functions.find((fn) => fn.name === helperCallMatch[1] && fn !== entry && !/@(vertex|fragment)\b/.test(fn.attributes));
    if (!helper) {
        return { wgsl: source, loweredPrivateVars: 0, skipped: "helper-function-not-found" };
    }
    const returnMatch = /^\s*return\s+([A-Za-z_]\w*)\s*\(([\s\S]*?)\)\s*;\s*$/m.exec(entry.body);
    if (!returnMatch) {
        return { wgsl: source, loweredPrivateVars: 0, skipped: "entry-return-constructor-not-found" };
    }
    const outputStructName = returnMatch[1];
    const outputStruct = parseStructs(source).find((item) => item.name === outputStructName);
    if (!outputStruct) {
        return { wgsl: source, loweredPrivateVars: 0, skipped: "entry-output-struct-not-found" };
    }
    const returnArgs = shaderWgslOptimizer_splitTopLevelArguments(returnMatch[2]);
    if (returnArgs.length !== outputStruct.fields.length) {
        return { wgsl: source, loweredPrivateVars: 0, skipped: "entry-output-arity-mismatch" };
    }
    const inputMap = new Map();
    for (const assignment of entryAssignments) {
        inputMap.set(assignment.target, assignment.value);
    }
    const outputMap = new Map();
    for (let i = 0; i < returnArgs.length; i++) {
        const arg = returnArgs[i].trim();
        if (/^[A-Za-z_]\w*$/.test(arg) && privateNames.has(arg)) {
            outputMap.set(arg, `_hyd_output.${outputStruct.fields[i]}`);
        }
    }
    const mappedPrivateNames = new Set([...inputMap.keys(), ...outputMap.keys()]);
    if (mappedPrivateNames.size === 0) {
        return { wgsl: source, loweredPrivateVars: 0, skipped: "no-mapped-private-io" };
    }
    const recognizedRemainder = stripRecognizedEntryStatements(entry.body, entryAssignments, helper.name, returnMatch[0]);
    if (recognizedRemainder.length > 0) {
        return { wgsl: source, loweredPrivateVars: 0, skipped: "entry-body-has-extra-statements" };
    }
    const outsideHelperAndEntry = removeRanges(source, [
        { start: helper.start, end: helper.end, replacement: "" },
        { start: entry.start, end: entry.end, replacement: "" },
        ...privateDeclarations.map((declaration) => ({ start: declaration.start, end: declaration.end, replacement: "" })),
    ]);
    for (const name of mappedPrivateNames) {
        if (countIdentifier(outsideHelperAndEntry, name) > 0) {
            return { wgsl: source, loweredPrivateVars: 0, skipped: "private-io-escapes-wrapper" };
        }
    }
    for (const name of inputMap.keys()) {
        if (assignmentCount(helper.body, name) > 0) {
            return { wgsl: source, loweredPrivateVars: 0, skipped: "input-private-written-in-helper" };
        }
    }
    for (const name of outputMap.keys()) {
        if (assignmentCount(helper.body, name) + fieldOrIndexAssignmentCount(helper.body, name) < 1) {
            return { wgsl: source, loweredPrivateVars: 0, skipped: "output-private-never-written" };
        }
    }
    const replacements = new Map([...inputMap, ...outputMap]);
    let loweredBody = applyIdentifierMap(helper.body, replacements)
        .replace(/^\s*return\s*;\s*$/gm, "")
        .trim();
    loweredBody = loweredBody.split("\n").map((line) => `  ${line}`).join("\n");
    const newEntry = `${entry.attributes}fn ${entry.name}(${entry.params})${entry.returnType} {\n  var _hyd_output: ${outputStructName};\n${loweredBody}\n  return _hyd_output;\n}`;
    const mappedDeclarations = privateDeclarations
        .filter((declaration) => mappedPrivateNames.has(declaration.name))
        .map((declaration) => ({ start: declaration.start, end: declaration.end, replacement: "" }));
    const wgsl = removeRanges(source, [
        { start: entry.start, end: entry.end, replacement: newEntry },
        { start: helper.start, end: helper.end, replacement: "" },
        ...mappedDeclarations,
    ]).replace(/\n{3,}/g, "\n\n");
    return {
        wgsl,
        loweredPrivateVars: mappedPrivateNames.size,
    };
}
function parsePointerParams(params) {
    const pointerParams = [];
    const parsed = splitTopLevelParameters(params);
    parsed.forEach((param, index) => {
        const match = /^\s*([A-Za-z_]\w*)\s*:\s*([\s\S]+?)\s*$/.exec(param);
        if (!match) {
            return;
        }
        const pointerType = /^ptr\s*<\s*function\s*,\s*([\s\S]+?)(?:,\s*(?:read|read_write|write))?\s*>\s*$/.exec(match[2].trim());
        if (!pointerType) {
            return;
        }
        pointerParams.push({
            index,
            name: match[1],
            valueType: pointerType[1].trim(),
        });
    });
    return pointerParams;
}
function dereferenceCount(source, name) {
    return source.match(new RegExp(`\\*\\s*\\(\\s*${shaderWgslOptimizer_escapeRegExp(name)}\\s*\\)`, "g"))?.length ?? 0;
}
function replacePointerDereferences(source, name) {
    return source.replace(new RegExp(`\\*\\s*\\(\\s*${shaderWgslOptimizer_escapeRegExp(name)}\\s*\\)`, "g"), name);
}
function unwrapAddressOfArgument(arg) {
    const paren = /^&\s*\(\s*([\s\S]+?)\s*\)$/.exec(arg);
    if (paren) {
        return paren[1].trim();
    }
    const bare = /^&\s*([A-Za-z_]\w*(?:\s*(?:\.|->)\s*[A-Za-z_]\w*|\s*\[[^\]]+\])*)\s*$/.exec(arg);
    return bare ? bare[1].trim() : undefined;
}
function findCallArgumentRanges(source, name, exclude) {
    const ranges = [];
    const regex = new RegExp(`\\b${shaderWgslOptimizer_escapeRegExp(name)}\\s*\\(`, "g");
    for (let match = regex.exec(source); match !== null; match = regex.exec(source)) {
        const before = source.slice(Math.max(0, match.index - 4), match.index);
        if (/\bfn\s*$/.test(before)) {
            continue;
        }
        if (match.index >= exclude.start && match.index < exclude.end) {
            continue;
        }
        const openParen = regex.lastIndex - 1;
        const closeParen = findMatching(source, openParen, "(", ")");
        if (closeParen < 0) {
            continue;
        }
        ranges.push({
            start: openParen + 1,
            end: closeParen,
            args: shaderWgslOptimizer_splitTopLevelArguments(source.slice(openParen + 1, closeParen)),
        });
        regex.lastIndex = closeParen + 1;
    }
    return ranges;
}
function lowerReadOnlyPointerParamsOnce(source) {
    const functions = parseFunctions(source);
    for (const fn of functions) {
        const pointerParams = parsePointerParams(fn.params);
        if (pointerParams.length === 0) {
            continue;
        }
        let safe = true;
        for (const param of pointerParams) {
            if (countIdentifier(fn.body, param.name) !== dereferenceCount(fn.body, param.name)) {
                safe = false;
                break;
            }
            if (assignmentCount(fn.body, param.name) > 0 || assignmentCount(fn.body, `*(${param.name})`) > 0) {
                safe = false;
                break;
            }
        }
        if (!safe) {
            continue;
        }
        const calls = findCallArgumentRanges(source, fn.name, { start: fn.start, end: fn.end });
        if (calls.length === 0) {
            continue;
        }
        const pointerByIndex = new Map(pointerParams.map((param) => [param.index, param]));
        const callReplacements = [];
        for (const call of calls) {
            if (call.args.length < splitTopLevelParameters(fn.params).length) {
                safe = false;
                break;
            }
            const args = call.args.slice();
            for (const param of pointerParams) {
                const replacement = unwrapAddressOfArgument(args[param.index]);
                if (replacement === undefined) {
                    safe = false;
                    break;
                }
                args[param.index] = replacement;
            }
            if (!safe) {
                break;
            }
            callReplacements.push({
                start: call.start,
                end: call.end,
                replacement: args.join(", "),
            });
        }
        if (!safe) {
            continue;
        }
        let newBody = fn.body;
        for (const param of pointerParams) {
            newBody = replacePointerDereferences(newBody, param.name);
        }
        const newParams = splitTopLevelParameters(fn.params).map((param, index) => {
            const pointerParam = pointerByIndex.get(index);
            return pointerParam ? `${pointerParam.name} : ${pointerParam.valueType}` : param;
        }).join(", ");
        const wgsl = removeRanges(source, [
            ...callReplacements,
            { start: fn.bodyOpen + 1, end: fn.bodyClose, replacement: newBody },
            { start: fn.openParen + 1, end: fn.closeParen, replacement: newParams },
        ]);
        return {
            wgsl,
            loweredPointerParams: pointerParams.length,
        };
    }
    return { wgsl: source, loweredPointerParams: 0, skipped: "no-readonly-pointer-params" };
}
function lowerReadOnlyPointerParams(source) {
    let out = source;
    let loweredPointerParams = 0;
    for (let i = 0; i < 32; i++) {
        const lowered = lowerReadOnlyPointerParamsOnce(out);
        if (lowered.loweredPointerParams === 0) {
            return { wgsl: out, loweredPointerParams, skipped: lowered.skipped };
        }
        out = lowered.wgsl;
        loweredPointerParams += lowered.loweredPointerParams;
    }
    return { wgsl: out, loweredPointerParams, skipped: "pointer-param-iteration-limit" };
}
function foldVectorConstructors(source) {
    let folded = 0;
    let out = source.replace(/\bvec2f\s*\(\s*([A-Za-z_]\w*)\.x\s*,\s*\1\.y\s*\)/g, (_match, value) => {
        folded++;
        return value;
    });
    out = out.replace(/\bvec3f\s*\(\s*([A-Za-z_]\w*)\.x\s*,\s*\1\.y\s*,\s*\1\.z\s*\)/g, (_match, value) => {
        folded++;
        return value;
    });
    out = out.replace(/\bvec4f\s*\(\s*([A-Za-z_]\w*)\.x\s*,\s*\1\.y\s*,\s*\1\.z\s*,\s*\1\.w\s*\)/g, (_match, value) => {
        folded++;
        return value;
    });
    out = out.replace(/\bvec4f\s*\(\s*([A-Za-z_]\w*)\.x\s*,\s*\1\.y\s*,\s*\1\.z\s*,\s*([^,)]+?)\s*\)/g, (_match, value, scalar) => {
        folded++;
        return `vec4f(${value}, ${scalar.trim()})`;
    });
    return { wgsl: out, folded };
}
function foldSimpleIfElseSelect(source) {
    let folded = 0;
    const out = source.replace(/if\s*\(\s*([\s\S]*?)\s*\)\s*\{\s*([A-Za-z_]\w*)\s*=\s*([^;{}]+?)\s*;\s*\}\s*else\s*\{\s*\2\s*=\s*([^;{}]+?)\s*;\s*\}/g, (_match, condition, target, whenTrue, whenFalse) => {
        folded++;
        return `${target} = select(${whenFalse.trim()}, ${whenTrue.trim()}, ${condition.trim()});`;
    });
    return { wgsl: out, folded };
}
function removeSingleUseLets(source) {
    let out = source;
    let removed = 0;
    let changed = true;
    while (changed) {
        changed = false;
        const regex = /^([ \t]*)let\s+(x_\d+)(?:\s*:\s*[^=]+?)?\s*=\s*([^;{}]+);\s*\n/gm;
        for (let match = regex.exec(out); match !== null; match = regex.exec(out)) {
            const full = match[0];
            const name = match[2];
            const expression = match[3].trim();
            const after = out.slice(match.index + full.length);
            const useCount = countIdentifier(after, name);
            const isSimpleAlias = /^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?$/.test(expression);
            if (useCount === 0 || (!isSimpleAlias && useCount !== 1)) {
                continue;
            }
            out = out.slice(0, match.index) + out.slice(match.index + full.length);
            const replacement = isSimpleAlias ? expression : `(${expression})`;
            out = out.slice(0, match.index) + wordBoundaryReplace(out.slice(match.index), name, replacement);
            removed++;
            changed = true;
            break;
        }
    }
    return { wgsl: out, removed };
}
function expressionContainsExpensivePureCall(expression) {
    return /\bpow\s*\(/.test(expression);
}
function isZeroLiteralExpression(expression) {
    return /^\(?\s*0(?:\.0+)?f?\s*\)?$/.test(stripBalancedOuterParens(expression));
}
function findMatchingInLine(source, openIndex) {
    let depth = 0;
    for (let i = openIndex; i < source.length; i++) {
        const ch = source[i];
        if (ch === "(") {
            depth++;
        }
        else if (ch === ")") {
            depth--;
            if (depth === 0) {
                return i;
            }
        }
    }
    return -1;
}
function findLazyPowSelect(line) {
    let searchFrom = 0;
    while (searchFrom < line.length) {
        const selectStart = line.indexOf("select", searchFrom);
        if (selectStart < 0) {
            return undefined;
        }
        const before = selectStart === 0 ? "" : line[selectStart - 1];
        const after = line[selectStart + "select".length] || "";
        if ((before && /[A-Za-z0-9_]/.test(before)) || after !== "(") {
            searchFrom = selectStart + "select".length;
            continue;
        }
        const selectOpen = selectStart + "select".length;
        const selectClose = findMatchingInLine(line, selectOpen);
        if (selectClose < 0) {
            return undefined;
        }
        const args = shaderWgslOptimizer_splitTopLevelArguments(line.slice(selectOpen + 1, selectClose));
        if (args.length !== 3) {
            searchFrom = selectClose + 1;
            continue;
        }
        const [whenFalse, whenTrue, condition] = args;
        if (isZeroLiteralExpression(whenFalse) && expressionContainsExpensivePureCall(whenTrue)) {
            return { start: selectStart, end: selectClose + 1, powExpression: whenTrue.trim(), zeroWhenTrue: false, condition: condition.trim() };
        }
        if (isZeroLiteralExpression(whenTrue) && expressionContainsExpensivePureCall(whenFalse)) {
            return { start: selectStart, end: selectClose + 1, powExpression: whenFalse.trim(), zeroWhenTrue: true, condition: condition.trim() };
        }
        searchFrom = selectClose + 1;
    }
    return undefined;
}
function branchifyLazyPowSelects(source) {
    const lines = source.split("\n");
    let branchified = 0;
    let tempCounter = 0;
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (!/\bselect\s*\(/.test(line) || !/\bpow\s*\(/.test(line) || !/;\s*$/.test(line)) {
            continue;
        }
        const indent = /^(\s*)/.exec(line)?.[1] ?? "";
        const prelude = [];
        let select;
        while ((select = findLazyPowSelect(line)) !== undefined) {
            const tempName = `_hyd_lazy_pow_select_${tempCounter++}`;
            const condition = select.zeroWhenTrue ? `!(${select.condition})` : select.condition;
            prelude.push(`${indent}var ${tempName} : f32 = 0.0f;`, `${indent}if (${condition}) {`, `${indent}  ${tempName} = ${select.powExpression};`, `${indent}}`);
            line = line.slice(0, select.start) + tempName + line.slice(select.end);
            branchified++;
        }
        if (prelude.length > 0) {
            lines[i] = `${prelude.join("\n")}\n${line}`;
        }
    }
    return { wgsl: lines.join("\n"), branchified };
}
function branchifyExpensiveSelects(source) {
    const lines = source.split("\n");
    let branchified = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const letMatch = /^(\s*)let\s+([A-Za-z_]\w*)\s*:\s*([^=]+?)\s*=\s*select\s*\(/.exec(line);
        const assignMatch = letMatch ? null : /^(\s*)([A-Za-z_]\w*)\s*=\s*select\s*\(/.exec(line);
        const match = letMatch || assignMatch;
        if (!match) {
            continue;
        }
        const selectStart = line.indexOf("select", Math.max(0, match[0].length - 16));
        if (selectStart < 0) {
            continue;
        }
        const selectOpen = line.indexOf("(", selectStart + "select".length);
        if (selectOpen < 0) {
            continue;
        }
        const selectClose = findMatchingInLine(line, selectOpen);
        if (selectClose < 0 || !/^\s*;\s*$/.test(line.slice(selectClose + 1))) {
            continue;
        }
        const args = shaderWgslOptimizer_splitTopLevelArguments(line.slice(selectOpen + 1, selectClose));
        if (args.length !== 3) {
            continue;
        }
        const [whenFalse, whenTrue, condition] = args;
        if (!expressionContainsExpensivePureCall(whenFalse) && !expressionContainsExpensivePureCall(whenTrue)) {
            continue;
        }
        const indent = match[1];
        const name = match[2];
        if (letMatch) {
            const type = letMatch[3].trim();
            lines[i] = [
                `${indent}var ${name} : ${type};`,
                `${indent}if (${condition}) {`,
                `${indent}  ${name} = ${whenTrue};`,
                `${indent}} else {`,
                `${indent}  ${name} = ${whenFalse};`,
                `${indent}}`,
            ].join("\n");
        }
        else {
            lines[i] = [
                `${indent}if (${condition}) {`,
                `${indent}  ${name} = ${whenTrue};`,
                `${indent}} else {`,
                `${indent}  ${name} = ${whenFalse};`,
                `${indent}}`,
            ].join("\n");
        }
        branchified++;
    }
    return { wgsl: lines.join("\n"), branchified };
}
function stripBalancedOuterParens(expression) {
    let out = expression.trim();
    while (out.startsWith("(") && out.endsWith(")")) {
        const close = findMatching(out, 0, "(", ")");
        if (close !== out.length - 1) {
            break;
        }
        out = out.slice(1, -1).trim();
    }
    return out;
}
function normalizeExpressionForCompare(expression) {
    return stripBalancedOuterParens(expression).replace(/\s+/g, "");
}
function splitTopLevelOperator(expression, operator) {
    let parenDepth = 0;
    let bracketDepth = 0;
    for (let i = expression.length - 1; i >= 0; i--) {
        const ch = expression[i];
        if (ch === ")") {
            parenDepth++;
        }
        else if (ch === "(") {
            parenDepth--;
        }
        else if (ch === "]") {
            bracketDepth++;
        }
        else if (ch === "[") {
            bracketDepth--;
        }
        else if (ch === operator && parenDepth === 0 && bracketDepth === 0) {
            if (operator === "-" && (i === 0 || /[+\-*/(<>=,]/.test(expression[i - 1]))) {
                continue;
            }
            return [expression.slice(0, i).trim(), expression.slice(i + 1).trim()];
        }
    }
    return undefined;
}
function unwrapFunctionCall(expression, name) {
    const trimmed = expression.trim();
    if (!trimmed.startsWith(`${name}(`) || !trimmed.endsWith(")")) {
        return undefined;
    }
    const open = name.length;
    const close = findMatching(trimmed, open, "(", ")");
    if (close !== trimmed.length - 1) {
        return undefined;
    }
    return trimmed.slice(open + 1, close).trim();
}
function matchGlslModExpansion(expression) {
    const expr = stripBalancedOuterParens(expression);
    const topMinus = splitTopLevelOperator(expr, "-");
    if (!topMinus) {
        return undefined;
    }
    const value = stripBalancedOuterParens(topMinus[0]);
    const right = stripBalancedOuterParens(topMinus[1]);
    const multiply = splitTopLevelOperator(right, "*");
    if (!multiply) {
        return undefined;
    }
    const divisor = stripBalancedOuterParens(multiply[0]);
    const floorArg = unwrapFunctionCall(stripBalancedOuterParens(multiply[1]), "floor");
    if (!floorArg) {
        return undefined;
    }
    const division = splitTopLevelOperator(stripBalancedOuterParens(floorArg), "/");
    if (!division) {
        return undefined;
    }
    if (normalizeExpressionForCompare(division[0]) !== normalizeExpressionForCompare(value)) {
        return undefined;
    }
    if (normalizeExpressionForCompare(division[1]) !== normalizeExpressionForCompare(divisor)) {
        return undefined;
    }
    return { value, divisor };
}
function hoistRepeatedModOperands(source) {
    const lines = source.split("\n");
    let hoisted = 0;
    let counter = 0;
    for (let i = 0; i < lines.length; i++) {
        const match = /^(\s*)let\s+([A-Za-z_]\w*)\s*:\s*([^=]+?)\s*=\s*([\s\S]+);\s*$/.exec(lines[i]);
        if (!match) {
            continue;
        }
        const mod = matchGlslModExpansion(match[4]);
        if (!mod) {
            continue;
        }
        if (/^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?$/.test(stripBalancedOuterParens(mod.value))) {
            continue;
        }
        const indent = match[1];
        const type = match[3].trim();
        const tempName = `_hyd_mod_${counter++}`;
        lines[i] = [
            `${indent}let ${tempName} : ${type} = ${mod.value};`,
            `${indent}let ${match[2]} : ${type} = (${tempName} - (${mod.divisor} * floor((${tempName} / ${mod.divisor}))));`,
        ].join("\n");
        hoisted++;
    }
    return { wgsl: lines.join("\n"), hoisted };
}
function isOneLiteralExpression(expression) {
    return /^\(?\s*1(?:\.0+)?f?\s*\)?$/.test(stripBalancedOuterParens(expression));
}
function foldModByOneToFract(source) {
    const lines = source.split("\n");
    let folded = 0;
    for (let i = 0; i < lines.length; i++) {
        const match = /^(\s*(?:(?:let|var)\s+[A-Za-z_]\w*\s*:\s*[^=]+?=|[A-Za-z_]\w*\s*=)\s*)([\s\S]+?)(;\s*)$/.exec(lines[i]);
        if (!match) {
            continue;
        }
        const mod = matchGlslModExpansion(match[2]);
        if (!mod || !isOneLiteralExpression(mod.divisor)) {
            continue;
        }
        lines[i] = `${match[1]}fract(${stripBalancedOuterParens(mod.value)})${match[3]}`;
        folded++;
    }
    return { wgsl: lines.join("\n"), folded };
}
function elideRedundantRangeClamps(source) {
    let elided = 0;
    const out = source.replace(/^([ \t]*)([A-Za-z_]\w*)\s*=\s*select\s*\(\s*\2\s*,\s*0\.0f?\s*,\s*\(\(?\s*([A-Za-z_]\w*)\s*<\s*0\.0f?\s*\)?\s*\|\s*\(?\s*\3\s*>\s*1\.0f?\s*\)?\)\s*\)\s*;\s*$/gm, () => {
        elided++;
        return "";
    });
    return { wgsl: out, elided };
}
function shouldElideRangeClamps() {
    return typeof globalThis !== "undefined" && globalThis.__HYD_ASSUME_LIFE_RANGE_CLAMP_REDUNDANT === true;
}
function promoteSingleAssignmentVarsInBody(body) {
    let out = body;
    let promoted = 0;
    let changed = true;
    while (changed) {
        changed = false;
        const declarationRegex = /^([ \t]*)var\s+([A-Za-z_]\w*)\s*:\s*([^;=]+);\s*\n/gm;
        for (let declaration = declarationRegex.exec(out); declaration !== null; declaration = declarationRegex.exec(out)) {
            const fullDeclaration = declaration[0];
            const name = declaration[2];
            const type = declaration[3].trim();
            if (name === "_hyd_output") {
                continue;
            }
            if (directAssignmentCount(out, name) !== 1 || fieldOrIndexAssignmentCount(out, name) !== 0) {
                continue;
            }
            if (new RegExp(`&\\s*\\(?\\s*${shaderWgslOptimizer_escapeRegExp(name)}\\b`).test(out)) {
                continue;
            }
            const assignmentRegex = new RegExp(`^([ \\t]*)${shaderWgslOptimizer_escapeRegExp(name)}\\s*=\\s*([^;{}]+);\\s*$`, "m");
            const assignment = assignmentRegex.exec(out);
            if (!assignment) {
                continue;
            }
            if (assignment.index < declaration.index) {
                continue;
            }
            const between = out.slice(declaration.index + fullDeclaration.length, assignment.index);
            if (countIdentifier(between, name) > 0) {
                continue;
            }
            const replacement = `${assignment[1]}let ${name} : ${type} = ${assignment[2].trim()};`;
            out = out.slice(0, declaration.index) + out.slice(declaration.index + fullDeclaration.length);
            const adjustedAssignmentIndex = assignment.index - fullDeclaration.length;
            out = out.slice(0, adjustedAssignmentIndex) + replacement + out.slice(adjustedAssignmentIndex + assignment[0].length);
            promoted++;
            changed = true;
            break;
        }
    }
    return { body: out, promoted };
}
function promoteSingleAssignmentVars(source) {
    let out = source;
    let promoted = 0;
    let changed = true;
    while (changed) {
        changed = false;
        const functions = parseFunctions(out);
        for (const fn of functions) {
            const result = promoteSingleAssignmentVarsInBody(fn.body);
            if (result.promoted === 0) {
                continue;
            }
            out = out.slice(0, fn.bodyOpen + 1) + result.body + out.slice(fn.bodyClose);
            promoted += result.promoted;
            changed = true;
            break;
        }
    }
    return { wgsl: out, promoted };
}
function runPeepholes(source) {
    let out = source;
    let promotedLocalVars = 0;
    let branchifiedSelects = 0;
    let hoistedModOperands = 0;
    let foldedModByOne = 0;
    let elidedRangeClamps = 0;
    let removedTemporaries = 0;
    let foldedConstructors = 0;
    const constructors = foldVectorConstructors(out);
    out = constructors.wgsl;
    foldedConstructors += constructors.folded;
    const promoted = promoteSingleAssignmentVars(out);
    out = promoted.wgsl;
    promotedLocalVars += promoted.promoted;
    const modOperands = hoistRepeatedModOperands(out);
    out = modOperands.wgsl;
    hoistedModOperands += modOperands.hoisted;
    const modByOne = foldModByOneToFract(out);
    out = modByOne.wgsl;
    foldedModByOne += modByOne.folded;
    if (shouldElideRangeClamps()) {
        const clamps = elideRedundantRangeClamps(out);
        out = clamps.wgsl;
        elidedRangeClamps += clamps.elided;
    }
    const lazyPowSelects = branchifyLazyPowSelects(out);
    out = lazyPowSelects.wgsl;
    branchifiedSelects += lazyPowSelects.branchified;
    const enableExpensiveSelectBranchification = false;
    if (enableExpensiveSelectBranchification) {
        const branchified = branchifyExpensiveSelects(out);
        out = branchified.wgsl;
        branchifiedSelects += branchified.branchified;
    }
    const lets = removeSingleUseLets(out);
    out = lets.wgsl;
    removedTemporaries += lets.removed;
    const constructorsAfterLets = foldVectorConstructors(out);
    out = constructorsAfterLets.wgsl;
    foldedConstructors += constructorsAfterLets.folded;
    return { wgsl: out, promotedLocalVars, branchifiedSelects, hoistedModOperands, foldedModByOne, elidedRangeClamps, removedTemporaries, foldedConstructors };
}
function optimizeTintWgsl(wgsl) {
    const stats = {
        optimizeTintWgsl: true,
        loweredPrivateVars: 0,
        loweredPointerParams: 0,
        promotedLocalVars: 0,
        branchifiedSelects: 0,
        hoistedModOperands: 0,
        foldedModByOne: 0,
        elidedRangeClamps: 0,
        removedTemporaries: 0,
        foldedConstructors: 0,
        skippedPasses: [],
    };
    const lowered = lowerEntryWrapper(wgsl);
    let out = lowered.wgsl;
    stats.loweredPrivateVars = lowered.loweredPrivateVars;
    if (lowered.skipped && !["no-entry-wrapper", "no-private-io"].includes(lowered.skipped)) {
        stats.skippedPasses.push(`entry-wrapper:${lowered.skipped}`);
    }
    const pointerParams = lowerReadOnlyPointerParams(out);
    out = pointerParams.wgsl;
    stats.loweredPointerParams = pointerParams.loweredPointerParams;
    if (pointerParams.skipped && !["no-readonly-pointer-params"].includes(pointerParams.skipped)) {
        stats.skippedPasses.push(`pointer-params:${pointerParams.skipped}`);
    }
    const peepholes = runPeepholes(out);
    out = peepholes.wgsl;
    stats.promotedLocalVars = peepholes.promotedLocalVars;
    stats.branchifiedSelects = peepholes.branchifiedSelects;
    stats.hoistedModOperands = peepholes.hoistedModOperands;
    stats.foldedModByOne = peepholes.foldedModByOne;
    stats.elidedRangeClamps = peepholes.elidedRangeClamps;
    stats.removedTemporaries = peepholes.removedTemporaries;
    stats.foldedConstructors = peepholes.foldedConstructors;
    return {
        wgsl: out.trim() + "\n",
        stats,
    };
}

;// ./src/components/shaderTranslator.ts







const DEFAULT_WASM_BASE_URL = (() => {
    if (typeof document !== "undefined") {
        const currentScript = document.currentScript;
        if (currentScript && currentScript.src) {
            return new URL(".", currentScript.src).href;
        }
        const scripts = Array.from(document.getElementsByTagName("script"));
        for (let i = scripts.length - 1; i >= 0; i--) {
            const src = scripts[i].src;
            if (src && /(^|\/)gl2gpu(?:\.[^/]*)?\.js(?:[?#].*)?$/.test(src)) {
                return new URL(".", src).href;
            }
        }
    }
    if (typeof location !== "undefined" && location.href) {
        return new URL(".", location.href).href;
    }
    return "";
})();
function locateBundledWasm(path) {
    return DEFAULT_WASM_BASE_URL ? new URL(path, DEFAULT_WASM_BASE_URL).href : path;
}
const GLOBAL_DECLARATION_REGEX = /(^|[;\n])(\s*(?:layout\s*\([^)]*\)\s*)?(?:(?:lowp|mediump|highp)\s+)?(?:(?:flat|smooth|noperspective|centroid|sample)\s+)*(attribute|uniform|varying|in|out)\s+(?:(?:lowp|mediump|highp)\s+)?([A-Za-z_]\w*)\s+([^;]+)\s*;)/g;
const SPV_OP_NAME = 5;
const SPV_OP_TYPE_SAMPLED_IMAGE = 27;
const SPV_OP_TYPE_POINTER = 32;
const SPV_OP_FUNCTION_PARAMETER = 55;
const SPV_OP_VARIABLE = 59;
const SPV_OP_LOAD = 61;
const SPV_OP_DECORATE = 71;
const SPV_OP_MEMBER_DECORATE = 72;
const SPV_STORAGE_CLASS_UNIFORM_CONSTANT = 0;
const SPV_DECORATION_RELAXED_PRECISION = 0;
function shaderTranslator_escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function nowMs() {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
        return performance.now();
    }
    return Date.now();
}
function shaderTranslator_wordBoundaryReplace(source, from, to) {
    return source.replace(new RegExp(`\\b${shaderTranslator_escapeRegExp(from)}\\b`, "g"), to);
}
function referencesIdentifier(source, name) {
    return new RegExp(`\\b${shaderTranslator_escapeRegExp(name)}\\b`).test(source);
}
function pruneUnusedShaderResources(metadata, wgsl) {
    const removedUniforms = [];
    const removedSamplers = [];
    metadata.uniforms = metadata.uniforms.filter((uniform) => {
        const keep = referencesIdentifier(wgsl, `_hyd_uniforms_.${uniform.name}`) || referencesIdentifier(wgsl, uniform.name);
        if (!keep) {
            removedUniforms.push(uniform.name);
        }
        return keep;
    });
    metadata.samplers = metadata.samplers.filter((sampler) => {
        const keep = referencesIdentifier(wgsl, `${sampler.name}S`) || referencesIdentifier(wgsl, `${sampler.name}T`);
        if (!keep) {
            removedSamplers.push(sampler.name);
        }
        return keep;
    });
    return { removedUniforms, removedSamplers };
}
function uniqueByName(items) {
    const seen = new Set();
    const out = [];
    for (const item of items) {
        if (!seen.has(item.name)) {
            seen.add(item.name);
            out.push(item);
        }
    }
    return out;
}
function assignLocations(items, boundLocations = new Map()) {
    const locations = new Map();
    const usedLocations = new Set();
    for (const item of items) {
        const boundLocation = boundLocations.get(item.name);
        if (boundLocation !== undefined && !locations.has(item.name)) {
            locations.set(item.name, boundLocation);
            usedLocations.add(boundLocation);
        }
    }
    let nextLocation = 0;
    for (const item of items) {
        if (locations.has(item.name))
            continue;
        while (usedLocations.has(nextLocation)) {
            nextLocation++;
        }
        locations.set(item.name, nextLocation);
        usedLocations.add(nextLocation);
    }
    return locations;
}
function parseDeclarationNames(rawNames) {
    const names = [];
    for (const rawName of rawNames.split(",")) {
        const match = rawName.trim().replace(/\s*=.*$/, "").match(/^([A-Za-z_]\w*)\s*((?:\[[^\]]*\]\s*)*)/);
        if (match) {
            names.push({
                name: match[1],
                arraySuffix: match[2] ? match[2].replace(/\s+/g, "") : "",
            });
        }
    }
    return names;
}
function declarationArraySuffix(declarations, name) {
    const declaration = declarations.find((item) => item.name === name);
    return declaration ? declaration.arraySuffix : "";
}
function isFragmentOutput(declaration, stage) {
    return stage === "fragment" && declaration.qualifier === "out";
}
function prepareSourceAndDeclarations(source) {
    const preamble = ["#version 310 es"];
    const seenPreamble = new Set(preamble);
    let body = source.replace(/^\s*#version[^\n]*(?:\n|$)/gm, "");
    body = body.replace(/^\s*(#extension[^\n]*|#define[^\n]*|precision\s+(?:lowp|mediump|highp)\s+\w+\s*;)\s*$/gm, (line) => {
        const trimmed = line.trim();
        if (!seenPreamble.has(trimmed)) {
            seenPreamble.add(trimmed);
            preamble.push(trimmed);
        }
        return "";
    });
    if (!preamble.some((line) => /^precision\s+(?:lowp|mediump|highp)\s+float\s*;/.test(line))) {
        const defaultFloatPrecision = "precision highp float;";
        preamble.splice(1, 0, defaultFloatPrecision);
        seenPreamble.add(defaultFloatPrecision);
    }
    const declarations = [];
    body = body.replace(GLOBAL_DECLARATION_REGEX, (full, prefix, _declaration, qualifier, glslType, rawNames) => {
        for (const parsed of parseDeclarationNames(rawNames)) {
            declarations.push({
                qualifier,
                glslType,
                name: parsed.name,
                arraySuffix: parsed.arraySuffix,
            });
        }
        return prefix;
    });
    return {
        declarations,
        source: `${preamble.join("\n")}\n`,
    };
}
function normalizeLegacyFragmentBuiltins(source) {
    let out = source;
    const usesFragColor = /\bgl_FragColor\b/.test(out);
    out = shaderTranslator_wordBoundaryReplace(out, "gl_FragColor", "_hyd_fragColor");
    out = shaderTranslator_wordBoundaryReplace(out, "texture2D", "texture");
    out = shaderTranslator_wordBoundaryReplace(out, "textureCube", "texture");
    out = shaderTranslator_wordBoundaryReplace(out, "texture2DProj", "textureProj");
    out = shaderTranslator_wordBoundaryReplace(out, "texture2DProjLodEXT", "textureProjLod");
    out = shaderTranslator_wordBoundaryReplace(out, "texture2DLodEXT", "textureLod");
    out = shaderTranslator_wordBoundaryReplace(out, "textureCubeLodEXT", "textureLod");
    return { source: out, usesFragColor };
}
function makeSamplerBindingDeclarations(metadata, layout) {
    const lines = [];
    metadata.samplers.forEach((sampler, fallback) => {
        const binding = layout.samplerBindings.get(sampler.name);
        const textureType = samplerGlslTextureType(sampler.glsl_type);
        const baseBinding = binding === undefined ? fallback * 2 : binding;
        lines.push(`layout(set = 0, binding = ${baseBinding}) uniform highp sampler ${sampler.name}S;`);
        lines.push(`layout(set = 0, binding = ${baseBinding + 1}) uniform highp ${textureType} ${sampler.name}T;`);
    });
    return lines;
}
function makeUniformBlockDeclarations(metadata, declarations) {
    if (metadata.uniforms.length === 0) {
        return [];
    }
    const lines = ["layout(std140, set = 0, binding = 0) uniform HydUniformObject {"];
    for (const uniform of metadata.uniforms) {
        lines.push(`  ${uniform.glsl_type} ${uniform.name}${declarationArraySuffix(declarations, uniform.name)};`);
    }
    lines.push("};");
    return lines;
}
function samplerGlslTextureType(glslType) {
    switch (glslType) {
        case "sampler2D":
            return "texture2D";
        case "samplerCube":
            return "textureCube";
        case "sampler2DArray":
            return "texture2DArray";
        case "sampler3D":
            return "texture3D";
        default:
            throw new Error(`unsupported sampler type: ${glslType}`);
    }
}
function addSamplerPrecisionDeclarations(lines, metadata) {
    const seen = new Set();
    for (const sampler of metadata.samplers) {
        const separateSamplerPrecision = "precision highp sampler;";
        const samplerPrecision = `precision highp ${sampler.glsl_type};`;
        const texturePrecision = `precision highp ${samplerGlslTextureType(sampler.glsl_type)};`;
        if (!seen.has(separateSamplerPrecision)) {
            seen.add(separateSamplerPrecision);
            lines.push(separateSamplerPrecision);
        }
        if (!seen.has(samplerPrecision)) {
            seen.add(samplerPrecision);
            lines.push(samplerPrecision);
        }
        if (!seen.has(texturePrecision)) {
            seen.add(texturePrecision);
            lines.push(texturePrecision);
        }
    }
}
function rewriteSamplerExpressions(source, metadata) {
    return rewriteSamplerExpressionsForSamplers(source, metadata.samplers);
}
function rewriteSamplerExpressionsForSamplers(source, samplers) {
    let out = source;
    const sampleFunctions = [
        "texture",
        "textureProj",
        "textureLod",
        "textureGrad",
        "textureOffset",
        "textureProjOffset",
        "textureLodOffset",
        "textureProjLod",
        "textureProjLodOffset",
        "textureGradOffset",
    ];
    for (const sampler of samplers) {
        const name = shaderTranslator_escapeRegExp(sampler.name);
        const constructor = sampler.glsl_type;
        out = out.replace(new RegExp(`\\b(${sampleFunctions.join("|")})\\s*\\(\\s*${name}\\s*,`, "g"), `$1(${constructor}(${sampler.name}T, ${sampler.name}S),`);
        out = out.replace(new RegExp(`\\btextureSize\\s*\\(\\s*${name}\\s*,`, "g"), `textureSize(${sampler.name}T,`);
        out = out.replace(new RegExp(`\\btextureQueryLevels\\s*\\(\\s*${name}\\s*\\)`, "g"), `textureQueryLevels(${sampler.name}T)`);
        out = out.replace(new RegExp(`\\btexelFetch\\s*\\(\\s*${name}\\s*,`, "g"), `texelFetch(${sampler.name}T,`);
    }
    return out;
}
function shaderTranslator_findMatchingParen(source, openIndex) {
    let depth = 0;
    for (let i = openIndex; i < source.length; i++) {
        const ch = source[i];
        if (ch === "(") {
            depth++;
        }
        else if (ch === ")") {
            depth--;
            if (depth === 0) {
                return i;
            }
        }
    }
    return -1;
}
function shaderTranslator_splitTopLevelArguments(source) {
    const args = [];
    let start = 0;
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    for (let i = 0; i < source.length; i++) {
        const ch = source[i];
        if (ch === "(") {
            parenDepth++;
        }
        else if (ch === ")") {
            parenDepth--;
        }
        else if (ch === "[") {
            bracketDepth++;
        }
        else if (ch === "]") {
            bracketDepth--;
        }
        else if (ch === "{") {
            braceDepth++;
        }
        else if (ch === "}") {
            braceDepth--;
        }
        else if (ch === "," && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
            args.push(source.slice(start, i));
            start = i + 1;
        }
    }
    args.push(source.slice(start));
    return args;
}
const FUNCTION_SIGNATURE_WITH_PAREN_ARGS_REGEX = /((?:^|[;\n{}])\s*(?:[A-Za-z_]\w*\s+)+([A-Za-z_]\w*)\s*)\(([^()]*)\)(\s*[;{])/gm;
function parseSamplerFunctionParameter(raw) {
    const normalized = raw.trim()
        .replace(/^(?:const|in|out|inout)\s+/, "")
        .replace(/^(?:lowp|mediump|highp)\s+/, "");
    const match = normalized.match(/^(sampler(?:2D|Cube|2DArray|3D))\s+([A-Za-z_]\w*)\s*(?:\[[^\]]*\])?$/);
    return match ? { glslType: match[1], name: match[2] } : null;
}
function expandSamplerArgument(expr) {
    const trimmed = expr.trim();
    const constructor = trimmed.match(/^sampler(?:2D|Cube|2DArray|3D)\s*\(([\s\S]*)\)$/);
    if (constructor) {
        const args = shaderTranslator_splitTopLevelArguments(constructor[1]);
        if (args.length === 2) {
            return [args[0].trim(), args[1].trim()];
        }
    }
    const identifier = trimmed.match(/^([A-Za-z_]\w*)$/);
    if (identifier) {
        return [`${identifier[1]}T`, `${identifier[1]}S`];
    }
    return [`${trimmed}T`, `${trimmed}S`];
}
function rewriteSamplerFunctionCalls(source, lowerings) {
    let out = source;
    for (const lowering of lowerings) {
        let result = "";
        let cursor = 0;
        const callRegex = new RegExp(`\\b${shaderTranslator_escapeRegExp(lowering.name)}\\s*\\(`, "g");
        for (let match = callRegex.exec(out); match !== null; match = callRegex.exec(out)) {
            const openParen = callRegex.lastIndex - 1;
            const closeParen = shaderTranslator_findMatchingParen(out, openParen);
            if (closeParen < 0)
                break;
            const next = out.slice(closeParen + 1).match(/^\s*([;{])/);
            const statementStart = Math.max(out.lastIndexOf(";", match.index - 1), out.lastIndexOf("{", match.index - 1), out.lastIndexOf("}", match.index - 1), out.lastIndexOf("\n", match.index - 1)) + 1;
            const prefix = out.slice(statementStart, match.index);
            const isPrototype = !!(next && next[1] === ";" && /^\s*(?:[A-Za-z_]\w*\s+)+$/.test(prefix));
            if ((next && next[1] === "{") || isPrototype) {
                callRegex.lastIndex = closeParen + 1;
                continue;
            }
            const args = shaderTranslator_splitTopLevelArguments(out.slice(openParen + 1, closeParen));
            const samplerByIndex = new Map(lowering.params.map((param) => [param.index, param]));
            const rewrittenArgs = [];
            for (let i = 0; i < args.length; i++) {
                if (samplerByIndex.has(i)) {
                    rewrittenArgs.push(...expandSamplerArgument(args[i]));
                }
                else {
                    rewrittenArgs.push(args[i].trim());
                }
            }
            result += out.slice(cursor, match.index);
            result += `${lowering.name}(${rewrittenArgs.join(", ")})`;
            cursor = closeParen + 1;
            callRegex.lastIndex = closeParen + 1;
        }
        if (cursor !== 0) {
            out = result + out.slice(cursor);
        }
    }
    return out;
}
function lowerSamplerFunctionParameters(source) {
    const loweringByName = new Map();
    let out = source.replace(FUNCTION_SIGNATURE_WITH_PAREN_ARGS_REGEX, (full, prefix, functionName, rawParams, suffix) => {
        const params = shaderTranslator_splitTopLevelArguments(rawParams);
        const samplerParams = [];
        const rewrittenParams = [];
        for (let index = 0; index < params.length; index++) {
            const parsed = parseSamplerFunctionParameter(params[index]);
            if (!parsed) {
                rewrittenParams.push(params[index].trim());
                continue;
            }
            samplerParams.push({ index, glslType: parsed.glslType, name: parsed.name });
            rewrittenParams.push(`${samplerGlslTextureType(parsed.glslType)} ${parsed.name}T`);
            rewrittenParams.push(`sampler ${parsed.name}S`);
        }
        if (samplerParams.length === 0) {
            return full;
        }
        if (!loweringByName.has(functionName)) {
            loweringByName.set(functionName, { name: functionName, params: samplerParams });
        }
        return `${prefix}(${rewrittenParams.join(", ")})${suffix}`;
    });
    const lowerings = Array.from(loweringByName.values());
    if (lowerings.length === 0) {
        return source;
    }
    for (const lowering of lowerings) {
        out = rewriteSamplerExpressionsForSamplers(out, lowering.params.map((param) => ({
            name: param.name,
            glsl_type: param.glslType,
        })));
    }
    return rewriteSamplerFunctionCalls(out, lowerings);
}
function rewriteFragmentImplicitTextureLod(source) {
    let result = "";
    let cursor = 0;
    const callRegex = /\btexture\s*\(/g;
    for (let match = callRegex.exec(source); match !== null; match = callRegex.exec(source)) {
        const openParen = callRegex.lastIndex - 1;
        const closeParen = shaderTranslator_findMatchingParen(source, openParen);
        if (closeParen < 0) {
            break;
        }
        const args = shaderTranslator_splitTopLevelArguments(source.slice(openParen + 1, closeParen));
        if (args.length >= 2 && /^sampler(?:2D|Cube|2DArray|3D)\s*\(/.test(args[0].trim())) {
            result += source.slice(cursor, match.index);
            result += `textureLod(${args[0].trim()}, ${args[1].trim()}, 0.0)`;
            cursor = closeParen + 1;
        }
        callRegex.lastIndex = closeParen + 1;
    }
    if (cursor === 0) {
        return source;
    }
    return result + source.slice(cursor);
}
function decodeSpirvString(words, start, end) {
    const bytes = [];
    for (let i = start; i < end; i++) {
        const word = words[i];
        for (let shift = 0; shift < 32; shift += 8) {
            const byte = (word >> shift) & 0xff;
            if (byte === 0) {
                return String.fromCharCode(...bytes);
            }
            bytes.push(byte);
        }
    }
    return String.fromCharCode(...bytes);
}
function patchGlslangSampledTextureVariables(spirv, samplers) {
    const filteredWords = Array.from(spirv.slice(0, 5));
    let strippedDecorations = false;
    for (let offset = 5; offset < spirv.length;) {
        const firstWord = spirv[offset];
        const wordCount = firstWord >>> 16;
        const op = firstWord & 0xffff;
        if (wordCount === 0) {
            throw new Error("invalid SPIR-V instruction with word count 0");
        }
        const isRelaxedPrecisionDecorate = (op === SPV_OP_DECORATE && wordCount >= 3 && spirv[offset + 2] === SPV_DECORATION_RELAXED_PRECISION) ||
            (op === SPV_OP_MEMBER_DECORATE && wordCount >= 4 && spirv[offset + 3] === SPV_DECORATION_RELAXED_PRECISION);
        if (!isRelaxedPrecisionDecorate) {
            for (let i = 0; i < wordCount; i++) {
                filteredWords.push(spirv[offset + i]);
            }
        }
        else {
            strippedDecorations = true;
        }
        offset += wordCount;
    }
    const filtered = strippedDecorations ? new Uint32Array(filteredWords) : spirv;
    if (samplers.length === 0) {
        return filtered;
    }
    const textureVariableNames = new Set(samplers.map((sampler) => `${sampler.name}T`));
    const names = new Map();
    const sampledImageTypes = new Map();
    const pointerTypes = new Map();
    const pointerTypeOffsets = new Map();
    const variables = new Map();
    const pointerValues = new Map();
    const offsets = [];
    for (let offset = 5; offset < filtered.length;) {
        const firstWord = filtered[offset];
        const wordCount = firstWord >>> 16;
        const op = firstWord & 0xffff;
        if (wordCount === 0) {
            throw new Error("invalid SPIR-V instruction with word count 0");
        }
        offsets.push(offset);
        if (op === SPV_OP_NAME && wordCount >= 2) {
            names.set(filtered[offset + 1], decodeSpirvString(filtered, offset + 2, offset + wordCount));
        }
        else if (op === SPV_OP_TYPE_SAMPLED_IMAGE && wordCount >= 3) {
            sampledImageTypes.set(filtered[offset + 1], filtered[offset + 2]);
        }
        else if (op === SPV_OP_TYPE_POINTER && wordCount >= 4) {
            pointerTypes.set(filtered[offset + 1], {
                storageClass: filtered[offset + 2],
                pointeeType: filtered[offset + 3],
            });
            pointerTypeOffsets.set(filtered[offset + 1], offset);
        }
        else if (op === SPV_OP_VARIABLE && wordCount >= 4) {
            variables.set(filtered[offset + 2], filtered[offset + 1]);
        }
        else if (op === SPV_OP_FUNCTION_PARAMETER && wordCount >= 3) {
            pointerValues.set(filtered[offset + 2], filtered[offset + 1]);
        }
        offset += wordCount;
    }
    const textureVariables = new Map();
    const pointerPatches = new Map();
    for (const [variableId, pointerTypeId] of variables) {
        const variableName = names.get(variableId);
        const pointerType = pointerTypes.get(pointerTypeId);
        if (!variableName || !textureVariableNames.has(variableName) || !pointerType || pointerType.storageClass !== SPV_STORAGE_CLASS_UNIFORM_CONSTANT) {
            continue;
        }
        const imageType = sampledImageTypes.get(pointerType.pointeeType);
        if (imageType === undefined) {
            continue;
        }
        textureVariables.set(variableId, imageType);
        pointerPatches.set(pointerTypeId, imageType);
    }
    if (textureVariables.size === 0) {
        return filtered;
    }
    for (const [valueId, pointerTypeId] of variables) {
        const imageType = pointerPatches.get(pointerTypeId);
        if (imageType !== undefined) {
            pointerValues.set(valueId, pointerTypeId);
        }
    }
    const patched = new Uint32Array(filtered);
    for (const [pointerTypeId, imageType] of pointerPatches) {
        const pointerOffset = pointerTypeOffsets.get(pointerTypeId);
        if (pointerOffset !== undefined) {
            patched[pointerOffset + 3] = imageType;
        }
    }
    for (const offset of offsets) {
        const op = patched[offset] & 0xffff;
        if (op !== SPV_OP_LOAD) {
            continue;
        }
        const pointerId = patched[offset + 3];
        let imageType = textureVariables.get(pointerId);
        const pointerTypeId = pointerValues.get(pointerId);
        if (imageType === undefined && pointerTypeId !== undefined) {
            imageType = pointerPatches.get(pointerTypeId);
        }
        if (imageType !== undefined) {
            patched[offset + 1] = imageType;
        }
    }
    return patched;
}
function buildGlslangSource(source, stage, metadata, layout, options = {}) {
    const prepared = prepareSourceAndDeclarations(source);
    const lines = [prepared.source.trimEnd()];
    const declarations = prepared.declarations;
    const bodyStart = source
        .replace(/^\s*#version[^\n]*(?:\n|$)/gm, "")
        .replace(/^\s*(#extension[^\n]*|#define[^\n]*|precision\s+(?:lowp|mediump|highp)\s+\w+\s*;)\s*$/gm, "")
        .replace(GLOBAL_DECLARATION_REGEX, (full, prefix) => prefix);
    let body = bodyStart;
    addSamplerPrecisionDeclarations(lines, metadata);
    if (stage === "vertex") {
        for (const attribute of metadata.attributes) {
            const location = layout.attributeLocations.get(attribute.name);
            lines.push(`layout(location = ${location === undefined ? 0 : location}) in ${attribute.glsl_type} ${attribute.name};`);
        }
    }
    const stageVaryings = uniqueByName(scanGlslDeclarations(source, stage).varyings);
    for (const varying of stageVaryings) {
        const location = layout.varyingLocations.get(varying.name);
        const direction = stage === "vertex" ? "out" : "in";
        lines.push(`layout(location = ${location === undefined ? 0 : location}) ${direction} ${varying.glsl_type} ${varying.name}${declarationArraySuffix(declarations, varying.name)};`);
    }
    let fragmentOutputLocation = 0;
    for (const declaration of declarations) {
        if (isFragmentOutput(declaration, stage)) {
            lines.push(`layout(location = ${fragmentOutputLocation++}) out ${declaration.glslType} ${declaration.name}${declaration.arraySuffix};`);
        }
    }
    const normalized = stage === "fragment" ? normalizeLegacyFragmentBuiltins(body) : { source: body, usesFragColor: false };
    body = lowerSamplerFunctionParameters(normalized.source);
    body = rewriteSamplerExpressions(body, metadata);
    if (stage === "fragment" && options.preserveImplicitTextureLod === false) {
        body = rewriteFragmentImplicitTextureLod(body);
    }
    if (stage === "fragment" && normalized.usesFragColor) {
        lines.push("layout(location = 0) out vec4 _hyd_fragColor;");
    }
    lines.push(...makeUniformBlockDeclarations(metadata, declarations));
    lines.push(...makeSamplerBindingDeclarations(metadata, layout));
    lines.push("");
    lines.push(body.trim());
    return `${lines.filter((line) => line.length > 0).join("\n")}\n`;
}
function stripResourceDeclarations(wgsl) {
    return wgsl
        .replace(/^\s*@group\([^)]*\)\s*@binding\([^)]*\)\s*var(?:<[^>]+>)?\s+\w+\s*:\s*[^;]+;\s*$/gm, "")
        .replace(/^\s*@binding\([^)]*\)\s*@group\([^)]*\)\s*var(?:<[^>]+>)?\s+\w+\s*:\s*[^;]+;\s*$/gm, "")
        .replace(/^\s*struct\s+\w*Uniform\w*\s*\{[\s\S]*?^\s*\}\s*;?\s*$/gm, "");
}
function normalizeTintWgsl(wgsl, metadata) {
    let out = stripResourceDeclarations(wgsl);
    const uniformPlaceholders = [];
    for (const uniform of metadata.uniforms) {
        const placeholder = `__HYD_UNIFORM_${uniformPlaceholders.length}__`;
        uniformPlaceholders.push([placeholder, `_hyd_uniforms_.${uniform.name}`]);
        out = out.replace(new RegExp(`\\b[A-Za-z_]\\w*\\s*\\.\\s*${shaderTranslator_escapeRegExp(uniform.name)}\\b`, "g"), placeholder);
        out = shaderTranslator_wordBoundaryReplace(out, uniform.name, placeholder);
    }
    for (const sampler of metadata.samplers) {
        out = out.replace(new RegExp(`textureSample\\s*\\(\\s*${sampler.name}\\s*,`, "g"), `textureSample(${sampler.name}T, ${sampler.name}S,`);
        out = shaderTranslator_wordBoundaryReplace(out, `${sampler.name}_sampler`, `${sampler.name}S`);
        out = shaderTranslator_wordBoundaryReplace(out, `${sampler.name}_texture`, `${sampler.name}T`);
    }
    for (const [placeholder, value] of uniformPlaceholders) {
        out = shaderTranslator_wordBoundaryReplace(out, placeholder, value);
    }
    out = out.replace(/\barr_to_mat\d+x\d+_stride_\d+\s*\(\s*(_hyd_uniforms_\.[A-Za-z_]\w*)\s*\)/g, "$1");
    return normalizeSamplerOriginCoordinates(out.trim() + "\n", metadata);
}
const WGSL_TEXTURE_SAMPLE_CALL = /\b(textureSample(?:Level|Bias|Grad)?)\s*\(/g;
function addSamplerOriginHelper(wgsl) {
    if (wgsl.includes("fn _hyd_samplerOriginCoord")) {
        return wgsl;
    }
    const helper = `fn _hyd_samplerOriginCoord(texCoord: vec2<f32>, flipY: f32) -> vec2<f32> {\n    return vec2<f32>(texCoord.x, select(texCoord.y, 1.0 - texCoord.y, flipY > 0.5));\n}\n\n`;
    const fragmentIndex = wgsl.search(/^\s*@fragment\b/m);
    if (fragmentIndex < 0) {
        return helper + wgsl;
    }
    return wgsl.slice(0, fragmentIndex) + helper + wgsl.slice(fragmentIndex);
}
function normalizeSamplerOriginCoordinates(wgsl, metadata) {
    const sampler2DNames = metadata.samplers
        .filter((sampler) => sampler.glsl_type === "sampler2D")
        .map((sampler) => sampler.name);
    if (sampler2DNames.length === 0) {
        return wgsl;
    }
    let changed = false;
    let result = "";
    let cursor = 0;
    WGSL_TEXTURE_SAMPLE_CALL.lastIndex = 0;
    for (let match = WGSL_TEXTURE_SAMPLE_CALL.exec(wgsl); match !== null; match = WGSL_TEXTURE_SAMPLE_CALL.exec(wgsl)) {
        const openParen = WGSL_TEXTURE_SAMPLE_CALL.lastIndex - 1;
        const closeParen = shaderTranslator_findMatchingParen(wgsl, openParen);
        if (closeParen < 0) {
            break;
        }
        const args = shaderTranslator_splitTopLevelArguments(wgsl.slice(openParen + 1, closeParen));
        if (args.length >= 3) {
            const samplerName = sampler2DNames.find((name) => {
                return args[0].trim() === `${name}T` && args[1].trim() === `${name}S`;
            });
            if (samplerName && !args[2].includes("_hyd_samplerOriginCoord")) {
                const rewrittenArgs = args.slice();
                rewrittenArgs[2] = `_hyd_samplerOriginCoord(${args[2].trim()}, _hyd_uniforms_.${samplerFlipYUniformName(samplerName)})`;
                result += wgsl.slice(cursor, openParen + 1) + rewrittenArgs.map((arg) => arg.trim()).join(", ") + ")";
                cursor = closeParen + 1;
                changed = true;
            }
        }
        WGSL_TEXTURE_SAMPLE_CALL.lastIndex = closeParen + 1;
    }
    if (!changed) {
        return wgsl;
    }
    result += wgsl.slice(cursor);
    return addSamplerOriginHelper(result);
}
class ShaderTranslator {
    glslang;
    tint;
    options;
    runtimeCache = new Map();
    constructor(glslang, tint, options) {
        this.glslang = glslang;
        this.tint = tint;
        this.options = options;
    }
    static async create(options = {}) {
        let glslang = null;
        let tint = null;
        try {
            glslang = await (0,glslang_glslang/* default */.A)({
                locateFile: options.glslangLocateFile || locateBundledWasm,
                wasmBinary: options.glslangWasmBinary,
            });
        }
        catch (error) {
            console.warn("[HYD] glslang WASM unavailable, runtime shader translation disabled:", error);
        }
        try {
            tint = await tint_wasm({
                locateFile: options.tintLocateFile || locateBundledWasm,
                wasmBinary: options.tintWasmBinary,
            });
        }
        catch (error) {
            console.warn("[HYD] Tint WASM unavailable, runtime shader translation disabled:", error);
        }
        return new ShaderTranslator(glslang, tint, options);
    }
    get runtimeTranslationAvailable() {
        return !!this.glslang && !!this.tint;
    }
    inspectShader(type, source) {
        return makeShaderMetadata(source, type);
    }
    translateProgram(vertexShader, fragmentShader, boundAttributeLocations = new Map()) {
        const layout = this.makeLayout(vertexShader, fragmentShader, boundAttributeLocations);
        const translated = {};
        translated.attributeLocations = layout.attributeLocations;
        if (vertexShader) {
            translated.vertex = this.translateShader(vertexShader, "vertex", layout);
        }
        if (fragmentShader) {
            translated.fragment = this.translateShader(fragmentShader, "fragment", layout);
        }
        return translated;
    }
    metadataFor(shader) {
        return shader.shader_info || makeShaderMetadata(shader.glsl_shader, shader.type);
    }
    makeLayout(vertexShader, fragmentShader, boundAttributeLocations = new Map()) {
        const vertexMetadata = vertexShader ? this.metadataFor(vertexShader) : undefined;
        const fragmentMetadata = fragmentShader ? this.metadataFor(fragmentShader) : undefined;
        const vertexVaryings = vertexShader ? scanGlslDeclarations(vertexShader.glsl_shader, "vertex").varyings : [];
        const fragmentVaryings = fragmentShader ? scanGlslDeclarations(fragmentShader.glsl_shader, "fragment").varyings : [];
        const samplers = uniqueByName([
            ...(vertexMetadata ? vertexMetadata.samplers : []),
            ...(fragmentMetadata ? fragmentMetadata.samplers : []),
        ]);
        const uniforms = uniqueByName([
            ...(vertexMetadata ? vertexMetadata.uniforms : []),
            ...(fragmentMetadata ? fragmentMetadata.uniforms : []),
        ]);
        const hasHydUniformBlock = uniforms.length > 0 || samplers.some((sampler) => sampler.glsl_type === "sampler2D");
        const samplerOffset = hasHydUniformBlock ? 1 : 0;
        const samplerBindings = new Map();
        samplers.forEach((sampler, index) => {
            samplerBindings.set(sampler.name, samplerOffset + index * 2);
        });
        const attributeLocations = assignLocations(vertexMetadata ? vertexMetadata.attributes : [], boundAttributeLocations);
        const varyingLocations = assignLocations(uniqueByName([...vertexVaryings, ...fragmentVaryings]));
        return {
            attributeLocations,
            varyingLocations,
            samplerBindings,
            cacheKey: [
                Array.from(attributeLocations).map(([name, location]) => `${name}:${location}`).join(","),
                Array.from(varyingLocations).map(([name, location]) => `${name}:${location}`).join(","),
                Array.from(samplerBindings).map(([name, binding]) => `${name}:${binding}`).join(","),
            ].join("|"),
        };
    }
    translateShader(shader, stage, layout) {
        const key = shader.glsl_shader;
        const preserveImplicitTextureLod = this.options.preserveImplicitTextureLod !== false;
        const shouldOptimizeTintWgsl = this.options.optimizeTintWgsl !== false;
        const runtimeKey = [
            stage,
            layout.cacheKey,
            `lod=${preserveImplicitTextureLod ? 1 : 0}`,
            `opt=${shouldOptimizeTintWgsl ? 1 : 0}`,
            `legacyTexCoord=${this.options.legacyTextureCoordinateFixups ? 1 : 0}`,
            key,
        ].join(":");
        const cachedRuntime = this.runtimeCache.get(runtimeKey);
        if (cachedRuntime) {
            return cachedRuntime;
        }
        const metadata = makeShaderMetadata(shader.glsl_shader, shader.type);
        if (!this.runtimeTranslationAvailable) {
            throw new Error(`Runtime shader translator is unavailable (${stage}).`);
        }
        let glslangSource = "";
        const timingsMs = {};
        try {
            const buildStart = nowMs();
            glslangSource = buildGlslangSource(shader.glsl_shader, stage, metadata, layout, {
                preserveImplicitTextureLod,
            });
            timingsMs.glslPreprocess = nowMs() - buildStart;
            const compileStart = nowMs();
            const spirv = patchGlslangSampledTextureVariables(this.glslang.compileGLSL(glslangSource, stage, false), metadata.samplers);
            timingsMs.glslang = nowMs() - compileStart;
            const tintStart = nowMs();
            const tintWgsl = this.tint.spirvToWgsl(spirv);
            timingsMs.tint = nowMs() - tintStart;
            const normalizeStart = nowMs();
            let wgsl = normalizeTintWgsl(tintWgsl, metadata);
            const normalizedWgsl = wgsl;
            timingsMs.wgslNormalize = nowMs() - normalizeStart;
            let optimizerStats = {
                optimizeTintWgsl: shouldOptimizeTintWgsl,
                loweredPrivateVars: 0,
                loweredPointerParams: 0,
                promotedLocalVars: 0,
                branchifiedSelects: 0,
                hoistedModOperands: 0,
                foldedModByOne: 0,
                elidedRangeClamps: 0,
                removedTemporaries: 0,
                foldedConstructors: 0,
                skippedPasses: [],
            };
            if (shouldOptimizeTintWgsl) {
                const optimizeStart = nowMs();
                const optimized = optimizeTintWgsl(wgsl);
                wgsl = optimized.wgsl;
                optimizerStats = optimized.stats;
                timingsMs.wgslOptimize = nowMs() - optimizeStart;
            }
            if (this.options.legacyTextureCoordinateFixups) {
                const legacyFixupStart = nowMs();
                metadata.wgsl = normalizeWebGlTextureCoordinates(wgsl, metadata, stage, shader.glsl_shader);
                timingsMs.legacyTextureCoordinateFixups = nowMs() - legacyFixupStart;
            }
            else {
                metadata.wgsl = wgsl;
            }
            const resourcePrune = pruneUnusedShaderResources(metadata, metadata.wgsl);
            const shaderId = `${stage}:${stableHashString(shader.glsl_shader)}:${layout.cacheKey}`;
            const capture = {
                kind: "shader-stage",
                stage,
                shaderId,
                source: "runtime",
                optimizer: optimizerStats,
                timingsMs,
                glsl: sourceCapture(shader.glsl_shader),
                normalizedGlsl: sourceCapture(glslangSource),
                spirv: {
                    hash: stableHashU32(spirv),
                    wordCount: spirv.length,
                    byteLength: spirv.byteLength,
                },
                tintWgsl: sourceCapture(tintWgsl),
                normalizedWgsl: sourceCapture(normalizedWgsl),
                postProcessWgsl: sourceCapture(metadata.wgsl),
            };
            metadata.shader_capture = capture;
            metadata.debug_info = JSON.stringify({
                source: "runtime",
                stage,
                translated: true,
                glsl: "310es",
                legacyTextureCoordinateFixups: !!this.options.legacyTextureCoordinateFixups,
                preserveImplicitTextureLod,
                optimizer: optimizerStats,
                resourcePrune,
                shaderId,
                spirv: capture.spirv,
                shapeStats: {
                    tintWgsl: capture.tintWgsl.stats,
                    normalizedWgsl: capture.normalizedWgsl.stats,
                    postProcessWgsl: capture.postProcessWgsl.stats,
                },
            });
            this.runtimeCache.set(runtimeKey, metadata);
            return metadata;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Runtime shader translation failed for ${stage} shader: ${message}\n--- original GLSL ---\n${shader.glsl_shader}\n--- normalized GLSL ---\n${glslangSource}`);
        }
    }
}

;// ./src/webgl-static.ts


const hydWebGLTypes = ["experimental-webgl", "webgl", "webgl2"];
function normalizeContextAttributes(attributes = {}) {
    return {
        alpha: attributes.alpha !== undefined ? attributes.alpha : true,
        antialias: attributes.antialias !== undefined ? attributes.antialias : true,
        depth: attributes.depth !== undefined ? attributes.depth : true,
        desynchronized: attributes.desynchronized !== undefined ? attributes.desynchronized : false,
        failIfMajorPerformanceCaveat: attributes.failIfMajorPerformanceCaveat !== undefined ? attributes.failIfMajorPerformanceCaveat : false,
        powerPreference: attributes.powerPreference || "default",
        premultipliedAlpha: attributes.premultipliedAlpha !== undefined ? attributes.premultipliedAlpha : true,
        preserveDrawingBuffer: attributes.preserveDrawingBuffer !== undefined ? attributes.preserveDrawingBuffer : false,
        stencil: attributes.stencil !== undefined ? attributes.stencil : false,
    };
}
function makeReplacementCanvas(element) {
    const replacement = document.createElement("canvas");
    replacement.width = element.width || element.clientWidth || 1;
    replacement.height = element.height || element.clientHeight || 1;
    replacement.className = element.className;
    replacement.style.cssText = element.style.cssText;
    for (const attr of Array.from(element.attributes)) {
        if (attr.name === "id" || attr.name === "class" || attr.name === "style" || attr.name === "width" || attr.name === "height") {
            continue;
        }
        replacement.setAttribute(attr.name, attr.value);
    }
    if (element.id) {
        replacement.id = element.id;
        element.removeAttribute("id");
    }
    element.parentNode?.replaceChild(replacement, element);
    return replacement;
}
async function hydGetContext(element, _shader_info_url, arg0, arg1, translatorOptions = {}) {
    let [contextType, contextAttributes] = arg0;
    contextAttributes = normalizeContextAttributes(contextAttributes || {});
    let [uniform_size, replay_delay] = arg1;
    const defaultTranslatorOptions = (globalThis.__HYD_TRANSLATOR_OPTIONS || {});
    const shaderTranslator = await ShaderTranslator.create({
        ...defaultTranslatorOptions,
        ...translatorOptions,
    });
    if (!hydWebGLTypes.includes(contextType)) {
        throw new Error("Invalid context type");
    }
    const hydAdapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
    const hydDevice = await hydAdapter.requestDevice({ label: "hydDevice" });
    hydDevice.addEventListener("uncapturederror", (event) => {
        console.error("[HYD] WebGPU uncaptured error:", event.error && event.error.message);
    });
    hydDevice.lost.then((info) => {
        console.error("[HYD] WebGPU device lost:", info.reason, info.message);
    });
    const hydWebGLContexts = {};
    for (const type of hydWebGLTypes) {
        const canvas = document.createElement("canvas");
        hydWebGLContexts[type] = canvas.getContext(type);
    }
    let targetElement = element;
    let gpuctx = targetElement.getContext("webgpu");
    if (!gpuctx) {
        targetElement = makeReplacementCanvas(element);
        gpuctx = targetElement.getContext("webgpu");
    }
    if (!gpuctx) {
        throw new Error("Unable to create WebGPU canvas context");
    }
    gpuctx.configure({
        device: hydDevice,
        format: 'bgra8unorm',
        alphaMode: contextAttributes.alpha === false ? 'opaque' : 'premultiplied',
    });
    return new HydWebGLStatic(targetElement, gpuctx, contextAttributes, hydDevice, uniform_size, replay_delay, shaderTranslator);
}
;


/******/ 	return __webpack_exports__;
/******/ })()
;
});