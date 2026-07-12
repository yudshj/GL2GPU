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
  createHydContext: () => (/* binding */ createHydContext),
  createHydRuntime: () => (/* binding */ createHydRuntime),
  endFrame: () => (/* reexport */ endFrame),
  gl2gpuCreateContext: () => (/* binding */ createHydContext),
  gl2gpuCreateRuntime: () => (/* binding */ createHydRuntime),
  gl2gpuGetContext: () => (/* binding */ hydGetContext),
  hydGetContext: () => (/* binding */ hydGetContext)
});

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
    webglStride = 0;
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
const nativeFunctionHasInstance = Function.prototype[Symbol.hasInstance];
const HYD_WEBGL_OBJECT_BRAND = Symbol.for("gl2gpu.webglObjectBrand");
const WEBGL_OBJECT_TAGS = {
    "active-info": "WebGLActiveInfo",
    buffer: "WebGLBuffer",
    framebuffer: "WebGLFramebuffer",
    program: "WebGLProgram",
    renderbuffer: "WebGLRenderbuffer",
    shader: "WebGLShader",
    "shader-precision-format": "WebGLShaderPrecisionFormat",
    texture: "WebGLTexture",
    "uniform-location": "WebGLUniformLocation",
    "vertex-array": "WebGLVertexArrayObject",
};
function brandHydWebGlObject(instance, brand) {
    Object.defineProperty(instance, HYD_WEBGL_OBJECT_BRAND, {
        configurable: false,
        enumerable: false,
        value: brand,
    });
    Object.defineProperty(instance, Symbol.toStringTag, {
        configurable: true,
        enumerable: false,
        value: WEBGL_OBJECT_TAGS[brand],
    });
    return instance;
}
function installHydHasInstance(constructor, predicate) {
    try {
        Object.defineProperty(constructor, Symbol.hasInstance, {
            configurable: true,
            value(instance) {
                return predicate(instance) || nativeFunctionHasInstance.call(constructor, instance);
            },
        });
    }
    catch (_) {
    }
}
function installHydObjectHasInstance(constructorName, brand) {
    const constructor = globalThis[constructorName];
    if (constructor) {
        installHydHasInstance(constructor, (instance) => instance?.[HYD_WEBGL_OBJECT_BRAND] === brand);
    }
}
installHydObjectHasInstance("WebGLActiveInfo", "active-info");
installHydObjectHasInstance("WebGLBuffer", "buffer");
installHydObjectHasInstance("WebGLFramebuffer", "framebuffer");
installHydObjectHasInstance("WebGLProgram", "program");
installHydObjectHasInstance("WebGLRenderbuffer", "renderbuffer");
installHydObjectHasInstance("WebGLShader", "shader");
installHydObjectHasInstance("WebGLShaderPrecisionFormat", "shader-precision-format");
installHydObjectHasInstance("WebGLTexture", "texture");
installHydObjectHasInstance("WebGLUniformLocation", "uniform-location");
installHydObjectHasInstance("WebGLVertexArrayObject", "vertex-array");
installHydHasInstance(WebGLRenderingContext, (instance) => instance?.hydContextType === "webgl" || instance?.hydContextType === "experimental-webgl");
installHydHasInstance(WebGL2RenderingContext, (instance) => instance?.hydContextType === "webgl2");

;// ./src/components/hydRenderPassCache.ts
class GPURenderBundleTransition {
    renderBundle = null;
    jumpTable = new Map();
    opName;
    opArgs;
    father;
    onceHash = null;
    onceNext;
    onceBindGroup = null;
    onceBindGroupOffset = null;
    onceBindGroupNext = null;
    onceNumericPrefix = null;
    onceNumericHash = NaN;
    onceNumericNext = null;
    onceIndexBuffer = null;
    onceIndexFormat = null;
    onceIndexNext = null;
    indexBufferTransitions = new WeakMap();
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
        if (this.onceBindGroupOffset === do0 && this.onceBindGroup === bindGroup) {
            return this.onceBindGroupNext;
        }
        this.onceBindGroup = bindGroup;
        this.onceBindGroupOffset = do0;
        const hash = 'b0' + bindGroup.label + (do0 === null ? 'none' : do0);
        const transition = this.jumpTable.get(hash);
        if (!transition) {
            const newTransition = new GPURenderBundleTransition('setBindGroup', [0, bindGroup, do0], this);
            this.jumpTable.set(hash, newTransition);
            return this.onceBindGroupNext = newTransition;
        }
        return this.onceBindGroupNext = transition;
    }
    gotoNumeric(prefix, numericHash, opName, ...opArgs) {
        if (this.onceNumericPrefix === prefix && this.onceNumericHash === numericHash) {
            return this.onceNumericNext;
        }
        this.onceNumericPrefix = prefix;
        this.onceNumericHash = numericHash;
        return this.onceNumericNext = this.goto(prefix + numericHash, opName, ...opArgs);
    }
    gotoIndexBuffer(buffer, format) {
        if (this.onceIndexBuffer === buffer && this.onceIndexFormat === format) {
            return this.onceIndexNext;
        }
        this.onceIndexBuffer = buffer;
        this.onceIndexFormat = format;
        let transitions = this.indexBufferTransitions.get(buffer);
        if (!transitions) {
            transitions = {};
            this.indexBufferTransitions.set(buffer, transitions);
        }
        let transition = transitions[format];
        if (!transition) {
            transition = new GPURenderBundleTransition('setIndexBuffer', [buffer, format], this);
            transitions[format] = transition;
        }
        return this.onceIndexNext = transition;
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
    setIndexBuffer(buffer, format) {
        this.bundleCache = this.bundleCache.gotoIndexBuffer(buffer, format);
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
    renderPassIndexBuffer = null;
    renderPassIndexFormat = null;
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
    CeDiscardAndReset() {
        this._commandEncoder = null;
        this.resetCache();
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
        this.renderPassIndexBuffer = null;
        this.renderPassIndexFormat = null;
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
        if (this.renderPassIndexBuffer !== indexBuffer || this.renderPassIndexFormat !== indexFormat) {
            this.renderPassIndexBuffer = indexBuffer;
            this.renderPassIndexFormat = indexFormat;
            this.renderBundleGenerator.setIndexBuffer(indexBuffer, indexFormat);
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

;// ./src/components/hydTexture.ts
const GL_SRGB_EXT = 0x8C40;
const GL_SRGB_ALPHA_EXT = 0x8C42;
const NATIVE_CANVAS_GET_CONTEXT = typeof HTMLCanvasElement === "undefined"
    ? null
    : HTMLCanvasElement.prototype.getContext;
let externalPixelConverter;
function createExternalPixelConverter() {
    if (!NATIVE_CANVAS_GET_CONTEXT || typeof document === "undefined")
        return null;
    const canvas = document.createElement("canvas");
    const gl = (NATIVE_CANVAS_GET_CONTEXT.call(canvas, "webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
    }) || NATIVE_CANVAS_GET_CONTEXT.call(canvas, "experimental-webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
    }));
    if (!gl)
        return null;
    const compile = (type, source) => {
        const shader = gl.createShader(type);
        if (!shader)
            return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, `
attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_position * 0.5 + 0.5;
}`);
    const fragment = compile(gl.FRAGMENT_SHADER, `
precision mediump float;
uniform sampler2D u_texture;
varying vec2 v_texCoord;
void main() {
  gl_FragColor = texture2D(u_texture, v_texCoord);
}`);
    if (!vertex || !fragment)
        return null;
    const program = gl.createProgram();
    if (!program)
        return null;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        return null;
    const texture = gl.createTexture();
    const vertexBuffer = gl.createBuffer();
    const position = gl.getAttribLocation(program, "a_position");
    if (!texture || !vertexBuffer || position < 0)
        return null;
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    gl.useProgram(program);
    gl.uniform1i(gl.getUniformLocation(program, "u_texture"), 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return { canvas, gl, texture, program, position, vertexBuffer };
}
function convertExternalTextureSource(source, width, height, format, type, unpack) {
    if (width <= 0 || height <= 0)
        return new Uint8Array(0);
    if (externalPixelConverter?.gl.isContextLost()) {
        externalPixelConverter = undefined;
    }
    if (externalPixelConverter === undefined) {
        externalPixelConverter = createExternalPixelConverter();
    }
    const converter = externalPixelConverter;
    if (!converter)
        return null;
    const { canvas, gl, texture, program, position, vertexBuffer } = converter;
    try {
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        gl.viewport(0, 0, width, height);
        gl.useProgram(program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, unpack.alignment);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, unpack.flipY);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, unpack.premultiplyAlpha);
        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, unpack.colorspaceConversion);
        if ("unpackColorSpace" in gl) {
            gl.unpackColorSpace = unpack.unpackColorSpace;
        }
        const conversionFormat = format === GL_SRGB_EXT
            ? gl.RGB
            : format === GL_SRGB_ALPHA_EXT
                ? gl.RGBA
                : format;
        for (let pending = gl.getError(), attempts = 0; pending !== gl.NO_ERROR && pending !== gl.CONTEXT_LOST_WEBGL && attempts < 8; pending = gl.getError(), attempts++) {
        }
        gl.texImage2D(gl.TEXTURE_2D, 0, conversionFormat, conversionFormat, type, source);
        if (gl.getError() !== gl.NO_ERROR)
            return null;
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        const pixels = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        const error = gl.getError();
        if (globalThis.__HYD_DEBUG_TEXTURE_UPLOAD) {
            const sample = (u, v) => {
                const x = Math.min(width - 1, Math.max(0, Math.floor(width * u)));
                const y = Math.min(height - 1, Math.max(0, Math.floor(height * v)));
                const offset = (y * width + x) * 4;
                return Array.from(pixels.subarray(offset, offset + 4));
            };
            console.debug("[HYD] external upload conversion", JSON.stringify({
                source: source?.constructor?.name || typeof source,
                width,
                height,
                flipY: unpack.flipY,
                error,
                q25: sample(0.75, 0.25),
                q75: sample(0.75, 0.75),
            }));
        }
        return error === gl.NO_ERROR ? pixels : null;
    }
    catch (error) {
        if (error?.name === "SecurityError")
            throw error;
        return null;
    }
}
function isExternalTextureSource(data) {
    return (typeof HTMLImageElement !== "undefined" && data instanceof HTMLImageElement) ||
        (typeof ImageBitmap !== "undefined" && data instanceof ImageBitmap) ||
        (typeof ImageData !== "undefined" && data instanceof ImageData) ||
        (typeof HTMLCanvasElement !== "undefined" && data instanceof HTMLCanvasElement) ||
        (typeof HTMLVideoElement !== "undefined" && data instanceof HTMLVideoElement) ||
        (typeof OffscreenCanvas !== "undefined" && data instanceof OffscreenCanvas) ||
        (typeof VideoFrame !== "undefined" && data instanceof VideoFrame);
}
const DEFAULT_PIXEL_UNPACK_STATE = {
    flipY: false,
    alignment: 4,
    premultiplyAlpha: false,
    colorspaceConversion: WebGL2RenderingContext.BROWSER_DEFAULT_WEBGL,
    unpackColorSpace: "srgb",
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
const CUBE_FACE_TARGETS = [
    WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X,
    WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_X,
    WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Y,
    WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Y,
    WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_Z,
    WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z,
];
function isWebGlColorRenderableInternalFormat(internalFormat) {
    switch (internalFormat) {
        case GL_SRGB_ALPHA_EXT:
        case WebGL2RenderingContext.RGB:
        case WebGL2RenderingContext.RGBA:
        case WebGL2RenderingContext.RGB565:
        case WebGL2RenderingContext.RGBA4:
        case WebGL2RenderingContext.RGB5_A1:
        case WebGL2RenderingContext.R8:
        case WebGL2RenderingContext.RG8:
        case WebGL2RenderingContext.RGB8:
        case WebGL2RenderingContext.RGBA8:
        case WebGL2RenderingContext.SRGB8_ALPHA8:
        case WebGL2RenderingContext.RGBA8UI:
        case WebGL2RenderingContext.RGBA16UI:
        case WebGL2RenderingContext.RGBA32UI:
        case WebGL2RenderingContext.RGBA32I:
        case WebGL2RenderingContext.RGBA32F:
        case WebGL2RenderingContext.RG32UI:
        case WebGL2RenderingContext.R32UI:
        case WebGL2RenderingContext.RG32F:
        case WebGL2RenderingContext.R32F:
            return true;
        default:
            return false;
    }
}
const parameterToString = new Map([
    [WebGL2RenderingContext.LINEAR, "linear"],
    [WebGL2RenderingContext.NEAREST, "nearest"],
    [WebGL2RenderingContext.REPEAT, "repeat"],
    [WebGL2RenderingContext.CLAMP_TO_EDGE, "clamp-to-edge"],
    [WebGL2RenderingContext.MIRRORED_REPEAT, "mirror-repeat"],
    [WebGL2RenderingContext.LINEAR_MIPMAP_LINEAR, "linear"],
    [WebGL2RenderingContext.LINEAR_MIPMAP_NEAREST, "linear"],
    [WebGL2RenderingContext.NEAREST_MIPMAP_LINEAR, "nearest"],
    [WebGL2RenderingContext.NEAREST_MIPMAP_NEAREST, "nearest"],
]);
const pnameToString = new Map([
    [WebGL2RenderingContext.TEXTURE_MIN_FILTER, "minFilter"],
    [WebGL2RenderingContext.TEXTURE_MAG_FILTER, "magFilter"],
    [WebGL2RenderingContext.TEXTURE_WRAP_S, "wrapS"],
    [WebGL2RenderingContext.TEXTURE_WRAP_T, "wrapT"],
    [WebGL2RenderingContext.TEXTURE_WRAP_R, "wrapR"],
]);
function textureFormatLookup(internalFormat, format, type) {
    if (((internalFormat === GL_SRGB_EXT && format === GL_SRGB_EXT) ||
        (internalFormat === GL_SRGB_ALPHA_EXT && format === GL_SRGB_ALPHA_EXT) ||
        (internalFormat === WebGL2RenderingContext.SRGB8 && format === WebGL2RenderingContext.RGB) ||
        (internalFormat === WebGL2RenderingContext.SRGB8_ALPHA8 && format === WebGL2RenderingContext.RGBA)) &&
        type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "rgba8unorm-srgb";
    }
    if ((internalFormat === WebGL2RenderingContext.RGBA || internalFormat === WebGL2RenderingContext.RGBA8) && format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "rgba8unorm";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA8UI && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "rgba8uint";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA16UI && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.UNSIGNED_SHORT) {
        return "rgba16uint";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA32UI && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT) {
        return "rgba32uint";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA32I && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.INT) {
        return "rgba32sint";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA32F && format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.FLOAT) {
        return "rgba32float";
    }
    if (internalFormat === WebGL2RenderingContext.RG32UI && format === WebGL2RenderingContext.RG_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT) {
        return "rg32uint";
    }
    if (internalFormat === WebGL2RenderingContext.R32UI && format === WebGL2RenderingContext.RED_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT) {
        return "r32uint";
    }
    if (internalFormat === WebGL2RenderingContext.RG32F && format === WebGL2RenderingContext.RG && type === WebGL2RenderingContext.FLOAT) {
        return "rg32float";
    }
    if (internalFormat === WebGL2RenderingContext.R32F && format === WebGL2RenderingContext.RED && type === WebGL2RenderingContext.FLOAT) {
        return "r32float";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA && format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.FLOAT) {
        return "rgba32float";
    }
    if (internalFormat === WebGL2RenderingContext.LUMINANCE && format === WebGL2RenderingContext.LUMINANCE && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        return "rgba8unorm";
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
    if (internalFormat === WebGL2RenderingContext.RGB && format === WebGL2RenderingContext.RGB &&
        type === WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5) {
        return "rgba8unorm";
    }
    if (internalFormat === WebGL2RenderingContext.RGBA && format === WebGL2RenderingContext.RGBA &&
        (type === WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4 ||
            type === WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1)) {
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
function packedPixelLayout(width, height, bytesPerPixel, alignment) {
    const rowBytes = width * bytesPerPixel;
    const rowStride = alignTo(rowBytes, alignment);
    return {
        rowBytes,
        rowStride,
        requiredBytes: width === 0 || height === 0 ? 0 : rowStride * (height - 1) + rowBytes,
    };
}
function byteView(data) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}
function textureUploadBytesPerPixel(format, type) {
    if (type === WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5 ||
        type === WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4 ||
        type === WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1) {
        return 2;
    }
    if (type === WebGL2RenderingContext.UNSIGNED_BYTE) {
        switch (format) {
            case WebGL2RenderingContext.RGBA:
            case GL_SRGB_ALPHA_EXT:
                return 4;
            case WebGL2RenderingContext.RGB:
            case GL_SRGB_EXT:
                return 3;
            case WebGL2RenderingContext.LUMINANCE:
            case WebGL2RenderingContext.ALPHA:
                return 1;
            case WebGL2RenderingContext.LUMINANCE_ALPHA:
                return 2;
        }
    }
    if (type === WebGL2RenderingContext.FLOAT) {
        switch (format) {
            case WebGL2RenderingContext.RGBA:
                return 16;
            case WebGL2RenderingContext.RG:
                return 8;
            case WebGL2RenderingContext.RED:
                return 4;
        }
    }
    if (format === WebGL2RenderingContext.RGBA_INTEGER) {
        switch (type) {
            case WebGL2RenderingContext.UNSIGNED_BYTE:
                return 4;
            case WebGL2RenderingContext.UNSIGNED_SHORT:
                return 8;
            case WebGL2RenderingContext.UNSIGNED_INT:
            case WebGL2RenderingContext.INT:
                return 16;
        }
    }
    if (format === WebGL2RenderingContext.RG_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT) {
        return 8;
    }
    if (format === WebGL2RenderingContext.RED_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT) {
        return 4;
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
    throw new Error(`Texture upload data is too small: ${byteLength} bytes for ${width}x${height}`);
}
function prepareTypedTextureUpload(data, width, height, internalformat, format, type, unpack) {
    const sourceBytes = byteView(data);
    const sourceBytesPerPixel = textureUploadBytesPerPixel(format, type);
    const sourceBytesPerRow = getSourceBytesPerRow(sourceBytes.byteLength, width, height, sourceBytesPerPixel, unpack.alignment);
    const packed16 = type === WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5 ||
        type === WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4 ||
        type === WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1;
    const needsRgbaExpansion = packed16 ||
        type === WebGL2RenderingContext.UNSIGNED_BYTE &&
            (format === WebGL2RenderingContext.RGB ||
                format === GL_SRGB_EXT ||
                format === WebGL2RenderingContext.LUMINANCE ||
                format === WebGL2RenderingContext.ALPHA ||
                format === WebGL2RenderingContext.LUMINANCE_ALPHA);
    const needsPremultiply = unpack.premultiplyAlpha &&
        (format === WebGL2RenderingContext.RGBA ||
            format === GL_SRGB_ALPHA_EXT ||
            format === WebGL2RenderingContext.LUMINANCE_ALPHA);
    const preserveSrgbFormat = internalformat === GL_SRGB_EXT || internalformat === GL_SRGB_ALPHA_EXT;
    const uploadInternalformat = needsRgbaExpansion && !preserveSrgbFormat ? WebGL2RenderingContext.RGBA : internalformat;
    const uploadFormat = needsRgbaExpansion && !preserveSrgbFormat ? WebGL2RenderingContext.RGBA : format;
    const uploadType = needsRgbaExpansion ? WebGL2RenderingContext.UNSIGNED_BYTE : type;
    const destinationBytesPerPixel = needsRgbaExpansion ? 4 : sourceBytesPerPixel;
    const destinationBytesPerRow = width * destinationBytesPerPixel;
    if (!unpack.flipY && !needsRgbaExpansion && !needsPremultiply && sourceBytesPerRow === destinationBytesPerRow) {
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
            if (needsPremultiply && type === WebGL2RenderingContext.UNSIGNED_BYTE) {
                for (let x = 0; x < width; x++) {
                    const dst = destinationOffset + x * 4;
                    const alpha = uploadBytes[dst + 3];
                    uploadBytes[dst] = Math.round(uploadBytes[dst] * alpha / 255);
                    uploadBytes[dst + 1] = Math.round(uploadBytes[dst + 1] * alpha / 255);
                    uploadBytes[dst + 2] = Math.round(uploadBytes[dst + 2] * alpha / 255);
                }
            }
            continue;
        }
        for (let x = 0; x < width; x++) {
            const src = sourceOffset + x * sourceBytesPerPixel;
            const dst = destinationOffset + x * 4;
            if (packed16) {
                const packed = sourceBytes[src] | (sourceBytes[src + 1] << 8);
                const expand = (value, bits) => Math.round(value * 255 / ((1 << bits) - 1));
                if (type === WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5) {
                    uploadBytes[dst] = expand((packed >> 11) & 0x1f, 5);
                    uploadBytes[dst + 1] = expand((packed >> 5) & 0x3f, 6);
                    uploadBytes[dst + 2] = expand(packed & 0x1f, 5);
                    uploadBytes[dst + 3] = 255;
                }
                else if (type === WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4) {
                    uploadBytes[dst] = expand((packed >> 12) & 0xf, 4);
                    uploadBytes[dst + 1] = expand((packed >> 8) & 0xf, 4);
                    uploadBytes[dst + 2] = expand((packed >> 4) & 0xf, 4);
                    uploadBytes[dst + 3] = expand(packed & 0xf, 4);
                }
                else {
                    uploadBytes[dst] = expand((packed >> 11) & 0x1f, 5);
                    uploadBytes[dst + 1] = expand((packed >> 6) & 0x1f, 5);
                    uploadBytes[dst + 2] = expand((packed >> 1) & 0x1f, 5);
                    uploadBytes[dst + 3] = (packed & 1) ? 255 : 0;
                }
            }
            else if (format === WebGL2RenderingContext.LUMINANCE) {
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
            if (needsPremultiply) {
                const alpha = uploadBytes[dst + 3];
                uploadBytes[dst] = Math.round(uploadBytes[dst] * alpha / 255);
                uploadBytes[dst + 1] = Math.round(uploadBytes[dst + 1] * alpha / 255);
                uploadBytes[dst + 2] = Math.round(uploadBytes[dst + 2] * alpha / 255);
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
    onDelete = [];
    onStorageChange = [];
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
    _nonFilteringSampler = null;
    _view = null;
    _attachmentViews = new Map();
    _hash;
    sourceOrigin = "uninitialized";
    imageStates = new Map();
    residentImages = new Set();
    archivedImages = new Map();
    imageGeneration = 0;
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
        mipmapFilter: "linear",
        mipmapped: true,
        magFilter: "linear",
        wrapS: "repeat",
        wrapT: "repeat",
        wrapR: "repeat",
        maxAnisotropy: 1,
    };
    device;
    ownerToken;
    initialized = false;
    deleted = false;
    renderbufferInternalFormat = 0;
    renderbufferSamples = 0;
    webglParameters = new Map();
    static __samplerCount = 0;
    static __viewCount = 0;
    static mipmapPipelines = new WeakMap();
    static mipmapSamplers = new WeakMap();
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
    get mipLevelCount() {
        return this._textureDescriptor.mipLevelCount || 1;
    }
    imageKey(level, layer) {
        return `${level}:${layer}`;
    }
    getImageState(target, level = 0, layer) {
        const imageLayer = layer === undefined ? HydTexture.getArrayLayer(target) : layer;
        return this.imageStates.get(this.imageKey(level, imageLayer)) || null;
    }
    defineImageState(target, level, width, height, depth, internalFormat, format, type, sourceOrigin, layer) {
        const imageLayer = layer === undefined ? HydTexture.getArrayLayer(target) : layer;
        const state = {
            level,
            layer: imageLayer,
            width,
            height,
            depth,
            internalFormat,
            format,
            type,
            sourceOrigin,
            generation: ++this.imageGeneration,
        };
        const key = this.imageKey(level, imageLayer);
        this.imageStates.set(key, state);
        this.residentImages.add(key);
        this._hash = null;
        return state;
    }
    initializeNullImage(target, level, width, height, internalFormat) {
        if (width <= 0 || height <= 0 ||
            (this.format !== "rgba8unorm" && this.format !== "rgba8unorm-srgb"))
            return;
        const pixels = new Uint8Array(width * height * 4);
        if (internalFormat === WebGL2RenderingContext.RGB ||
            internalFormat === GL_SRGB_EXT ||
            internalFormat === WebGL2RenderingContext.LUMINANCE) {
            for (let offset = 3; offset < pixels.length; offset += 4)
                pixels[offset] = 255;
        }
        this.device.queue.writeTexture({
            texture: this.texture,
            mipLevel: level,
            origin: targetToOrigin.get(target) || { x: 0, y: 0, z: 0 },
        }, pixels, { bytesPerRow: width * 4, rowsPerImage: height }, { width, height, depthOrArrayLayers: 1 });
    }
    isCubeCompleteAtLevel(level = 0) {
        const faces = CUBE_FACE_TARGETS.map((target) => this.getImageState(target, level));
        const first = faces[0];
        return Boolean(first && first.width > 0 && first.height > 0 && first.width === first.height &&
            faces.every((face) => face && face.width === first.width && face.height === first.height &&
                face.internalFormat === first.internalFormat && face.type === first.type));
    }
    isSamplingComplete(viewDimension, webglVersion = 1) {
        const layers = viewDimension === "cube" ? 6 : 1;
        const baseImages = Array.from({ length: layers }, (_, layer) => this.imageStates.get(this.imageKey(0, layer)) || null);
        const base = baseImages[0];
        if (!base || base.width <= 0 || base.height <= 0)
            return false;
        if (viewDimension === "cube" && !this.isCubeCompleteAtLevel(0))
            return false;
        const powerOfTwo = (value) => (value & (value - 1)) === 0;
        if (webglVersion === 1 && (!powerOfTwo(base.width) || !powerOfTwo(base.height))) {
            const clamp = WebGL2RenderingContext.CLAMP_TO_EDGE;
            if (this.state.mipmapped ||
                this.webglParameters.get(WebGL2RenderingContext.TEXTURE_WRAP_S) !== clamp ||
                this.webglParameters.get(WebGL2RenderingContext.TEXTURE_WRAP_T) !== clamp) {
                return false;
            }
        }
        if (!this.state.mipmapped)
            return true;
        const requiredLevels = Math.floor(Math.log2(Math.max(base.width, base.height))) + 1;
        for (let level = 1; level < requiredLevels; level++) {
            const expectedWidth = Math.max(1, base.width >> level);
            const expectedHeight = Math.max(1, base.height >> level);
            for (let layer = 0; layer < layers; layer++) {
                const image = this.imageStates.get(this.imageKey(level, layer));
                if (!image || image.width !== expectedWidth || image.height !== expectedHeight ||
                    image.internalFormat !== base.internalFormat || image.type !== base.type) {
                    return false;
                }
            }
        }
        return true;
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
                mipmapFilter: this.state.mipmapFilter,
                addressModeU: this.state.wrapS,
                addressModeV: this.state.wrapT,
                addressModeW: this.state.wrapR,
                maxAnisotropy: this.state.maxAnisotropy,
                label: "sampler-" + (HydTexture.__samplerCount++),
            };
            if (!this.state.mipmapped) {
                desc.lodMinClamp = 0;
                desc.lodMaxClamp = 0;
            }
            this._sampler = this.device.createSampler(desc);
        }
        return this._sampler;
    }
    samplerForBinding(bindingType) {
        if (bindingType !== "non-filtering") {
            return this.sampler;
        }
        if (!this._nonFilteringSampler) {
            this._nonFilteringSampler = this.device.createSampler({
                minFilter: "nearest",
                magFilter: "nearest",
                mipmapFilter: "nearest",
                ...(!this.state.mipmapped ? { lodMinClamp: 0, lodMaxClamp: 0 } : {}),
                addressModeU: this.state.wrapS,
                addressModeV: this.state.wrapT,
                addressModeW: this.state.wrapR,
                label: "sampler-nonfilter-" + (HydTexture.__samplerCount++),
            });
        }
        return this._nonFilteringSampler;
    }
    get hash() {
        if (!this._view) {
            return this.label + '|' +
                this.state.minFilter +
                this.state.mipmapFilter +
                this.state.mipmapped +
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
                this._textureDescriptor.size.depthOrArrayLayers +
                this.imageGeneration;
        }
        if (!this._hash) {
            this._hash = this.state.minFilter +
                this.state.mipmapFilter +
                this.state.mipmapped +
                this.state.magFilter +
                this.state.wrapS +
                this.state.wrapT +
                this.state.wrapR +
                this.state.compare +
                this.state.maxAnisotropy +
                this.imageGeneration +
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
        this._nonFilteringSampler = null;
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
            || this._textureDescriptor.usage !== this._currentTextureDescriptor.usage
            || this._textureDescriptor.mipLevelCount !== this._currentTextureDescriptor.mipLevelCount)) {
            this.destroy();
        }
        if (!this._texture) {
            this._texture = this.device.createTexture({
                label: this.label,
                size: this._textureDescriptor.size,
                format: this._textureDescriptor.format,
                usage: this._textureDescriptor.usage,
                dimension: this._textureDescriptor.dimension,
                mipLevelCount: this._textureDescriptor.mipLevelCount,
                viewFormats: this._textureDescriptor.format === "rgba8unorm-srgb"
                    ? ["rgba8unorm"]
                    : undefined,
            });
            this._currentTextureDescriptor = Object.assign({}, this._textureDescriptor);
        }
        return this._texture;
    }
    constructor(device, ownerToken) {
        this.device = device;
        this.ownerToken = ownerToken;
        this.label = `HydTexture${HydTexture.__total__++}`;
        this.webglParameters.set(WebGL2RenderingContext.TEXTURE_MIN_FILTER, WebGL2RenderingContext.NEAREST_MIPMAP_LINEAR);
        this.webglParameters.set(WebGL2RenderingContext.TEXTURE_MAG_FILTER, WebGL2RenderingContext.LINEAR);
        this.webglParameters.set(WebGL2RenderingContext.TEXTURE_WRAP_S, WebGL2RenderingContext.REPEAT);
        this.webglParameters.set(WebGL2RenderingContext.TEXTURE_WRAP_T, WebGL2RenderingContext.REPEAT);
        this.webglParameters.set(WebGL2RenderingContext.TEXTURE_WRAP_R, WebGL2RenderingContext.REPEAT);
    }
    ensureSampleable(viewDimension = "2d", sampleType = "float") {
        if (this.isConfigured) {
            if (!this._viewDimension) {
                this._viewDimension = viewDimension;
            }
            return;
        }
        this._viewDimension = viewDimension;
        const isUint = sampleType === "uint";
        const isSint = sampleType === "sint";
        this.configureTexture({
            size: {
                width: 1,
                height: 1,
                depthOrArrayLayers: viewDimension === "cube" ? 6 : 1,
            },
            format: isUint ? "rgba32uint" : isSint ? "rgba32sint" : "rgba8unorm",
            dimension: "2d",
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING,
            isDepthStencil: false,
        });
        const layers = viewDimension === "cube" ? 6 : 1;
        const data = isUint
            ? new Uint32Array([0, 0, 0, 1])
            : isSint
                ? new Int32Array([0, 0, 0, 1])
                : new Uint8Array([0, 0, 0, 255]);
        for (let layer = 0; layer < layers; layer++) {
            this.device.queue.writeTexture({ texture: this.texture, origin: { x: 0, y: 0, z: layer } }, data, { offset: 0 }, [1, 1]);
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
        if (this.sourceOrigin === "render-target") {
            return false;
        }
        this.sourceOrigin = "render-target";
        this._hash = null;
        return true;
    }
    markCopyDestination() {
        this.sourceOrigin = "copy";
        this._hash = null;
    }
    mipmapPipeline() {
        if (!this.format || /(?:uint|sint|depth|stencil)/.test(this.format))
            return null;
        let pipelines = HydTexture.mipmapPipelines.get(this.device);
        if (!pipelines) {
            pipelines = new Map();
            HydTexture.mipmapPipelines.set(this.device, pipelines);
        }
        let pipeline = pipelines.get(this.format);
        if (pipeline)
            return pipeline;
        const module = this.device.createShaderModule({
            label: "HydTexture-mipmap-shader",
            code: `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  let positions = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  let position = positions[vertexIndex];
  var output: VertexOutput;
  output.position = vec4f(position, 0.0, 1.0);
  output.uv = position * vec2f(0.5, -0.5) + vec2f(0.5);
  return output;
}

@group(0) @binding(0) var sourceTexture: texture_2d<f32>;
@group(0) @binding(1) var sourceSampler: sampler;

@fragment
fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
  return textureSampleLevel(sourceTexture, sourceSampler, uv, 0.0);
}
`,
        });
        pipeline = this.device.createRenderPipeline({
            label: `HydTexture-mipmap-pipeline-${this.format}`,
            layout: "auto",
            vertex: { module, entryPoint: "vertexMain" },
            fragment: {
                module,
                entryPoint: "fragmentMain",
                targets: [{ format: this.format }],
            },
            primitive: { topology: "triangle-list" },
        });
        pipelines.set(this.format, pipeline);
        return pipeline;
    }
    generateMipmap(target) {
        const pipeline = this.mipmapPipeline();
        if (!pipeline || this.mipLevelCount <= 1 || !this.isConfigured)
            return Boolean(pipeline);
        let sampler = HydTexture.mipmapSamplers.get(this.device);
        if (!sampler) {
            sampler = this.device.createSampler({
                minFilter: "linear",
                magFilter: "linear",
                mipmapFilter: "nearest",
                addressModeU: "clamp-to-edge",
                addressModeV: "clamp-to-edge",
                lodMinClamp: 0,
                lodMaxClamp: 0,
                label: "HydTexture-mipmap-sampler",
            });
            HydTexture.mipmapSamplers.set(this.device, sampler);
        }
        const layers = target === WebGL2RenderingContext.TEXTURE_CUBE_MAP ? 6 : 1;
        const encoder = this.device.createCommandEncoder({ label: `${this.label}-generateMipmap` });
        for (let layer = 0; layer < layers; layer++) {
            for (let level = 1; level < this.mipLevelCount; level++) {
                const sourceView = this.texture.createView({
                    dimension: "2d",
                    baseMipLevel: level - 1,
                    mipLevelCount: 1,
                    baseArrayLayer: layer,
                    arrayLayerCount: 1,
                });
                const destinationView = this.texture.createView({
                    dimension: "2d",
                    baseMipLevel: level,
                    mipLevelCount: 1,
                    baseArrayLayer: layer,
                    arrayLayerCount: 1,
                });
                const bindGroup = this.device.createBindGroup({
                    layout: pipeline.getBindGroupLayout(0),
                    entries: [
                        { binding: 0, resource: sourceView },
                        { binding: 1, resource: sampler },
                    ],
                });
                const pass = encoder.beginRenderPass({
                    colorAttachments: [{
                            view: destinationView,
                            loadOp: "clear",
                            storeOp: "store",
                            clearValue: { r: 0, g: 0, b: 0, a: 0 },
                        }],
                });
                pass.setPipeline(pipeline);
                pass.setBindGroup(0, bindGroup);
                pass.draw(3);
                pass.end();
            }
        }
        this.device.queue.submit([encoder.finish()]);
        const base = this.imageStates.get(this.imageKey(0, 0));
        if (base) {
            for (let layer = 0; layer < layers; layer++) {
                for (let level = 1; level < this.mipLevelCount; level++) {
                    this.defineImageState(target, level, Math.max(1, base.width >> level), Math.max(1, base.height >> level), 1, base.internalFormat, base.format, base.type, base.sourceOrigin, layer);
                }
            }
        }
        this._hash = null;
        return true;
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
        const logicalInternalFormat = internalformat;
        const logicalFormat = format;
        const logicalType = type;
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
        const baseWidth = Math.max(1, width * Math.pow(2, mipLevel));
        const baseHeight = Math.max(1, height * Math.pow(2, mipLevel));
        const mipLevelCount = Math.floor(Math.log2(Math.max(baseWidth, baseHeight))) + 1;
        const gpuFormat = textureFormatLookup(internalformat, format, type);
        this.configureTexture({
            size: { width: baseWidth, height: baseHeight, depthOrArrayLayers: HydTexture.getDepthOrArrayLayers(target) },
            mipLevelCount,
            format: gpuFormat,
            dimension: "2d",
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            isDepthStencil: format === WebGL2RenderingContext.DEPTH_COMPONENT,
        });
        const imageOrigin = uploadData === null || (uploadData && "byteLength" in uploadData)
            ? "typed-upload"
            : "external-upload";
        this.defineImageState(target, mipLevel, width, height, 1, logicalInternalFormat, logicalFormat, logicalType, imageOrigin);
        if (uploadData === null) {
            this.initializeNullImage(target, mipLevel, width, height, logicalInternalFormat);
            this.sourceOrigin = "typed-upload";
            return;
        }
        if (width === 0 || height === 0) {
            this.sourceOrigin = imageOrigin;
            return;
        }
        if (isExternalTextureSource(uploadData)) {
            const converted = gpuFormat === "rgba8unorm" || gpuFormat === "rgba8unorm-srgb"
                ? convertExternalTextureSource(uploadData, width, height, logicalFormat, logicalType, unpack)
                : null;
            if (globalThis.__HYD_DEBUG_TEXTURE_UPLOAD) {
                console.debug("[HYD] external texImage2D", JSON.stringify({
                    mipLevel,
                    width,
                    height,
                    gpuFormat,
                    converted: Boolean(converted),
                }));
            }
            if (converted) {
                this.device.queue.writeTexture({ texture: this.texture, mipLevel, origin: targetToOrigin.get(target) }, converted, { offset: 0, bytesPerRow: width * 4, rowsPerImage: height }, [width, height]);
            }
            else {
                this.device.queue.copyExternalImageToTexture({ source: uploadData, flipY: shouldApplyExternalFlipY(uploadData, unpack) }, { texture: this.texture, mipLevel, origin: targetToOrigin.get(target) }, [width, height]);
            }
            this.sourceOrigin = "external-upload";
        }
        else if ("byteLength" in uploadData) {
            this.device.queue.writeTexture({ texture: this.texture, mipLevel, origin: targetToOrigin.get(target) }, uploadData, {
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
        if (width === 0 || height === 0)
            return;
        if (isExternalTextureSource(uploadData)) {
            const converted = this.format === "rgba8unorm" || this.format === "rgba8unorm-srgb"
                ? convertExternalTextureSource(uploadData, width, height, format, type, unpack)
                : null;
            if (converted) {
                this.device.queue.writeTexture(destination, converted, { offset: 0, bytesPerRow: width * 4, rowsPerImage: height }, [width, height]);
            }
            else {
                this.device.queue.copyExternalImageToTexture({ source: uploadData, flipY: shouldApplyExternalFlipY(uploadData, unpack) }, destination, [width, height]);
            }
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
        const textureDimension = target === WebGL2RenderingContext.TEXTURE_3D ? "3d" : "2d";
        this.configureTexture({
            size: { width, height, depthOrArrayLayers: depth },
            format: textureFormatLookup(internalformat, format, type),
            dimension: textureDimension,
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
            const bytesPerRow = width * textureUploadBytesPerPixel(format, type);
            this.device.queue.writeTexture({ texture: this.texture }, data, {
                offset: 0,
                bytesPerRow,
                rowsPerImage: height,
            }, [width, height, depth]);
            this.sourceOrigin = "typed-upload";
        }
        else if (data instanceof HTMLVideoElement) {
            throw new Error("Not implemented");
        }
    }
    texSubImage3D(data, target, mipLevel, xoffset, yoffset, zoffset, width, height, depth, format, type, unpack = DEFAULT_PIXEL_UNPACK_STATE) {
        const origin = { x: xoffset, y: yoffset, z: zoffset };
        const destination = {
            texture: this.texture,
            mipLevel,
            origin,
        };
        if (data instanceof ImageData) {
            this.device.queue.writeTexture(destination, data.data, {
                offset: 0,
                bytesPerRow: data.data.length / height,
                rowsPerImage: height,
            }, [width, height, depth]);
            this.sourceOrigin = "external-upload";
            return;
        }
        if (data instanceof HTMLImageElement ||
            (typeof ImageBitmap !== "undefined" && data instanceof ImageBitmap) ||
            data instanceof HTMLCanvasElement ||
            data instanceof HTMLVideoElement ||
            (typeof OffscreenCanvas !== "undefined" && data instanceof OffscreenCanvas)) {
            this.device.queue.copyExternalImageToTexture({ source: data, flipY: shouldApplyExternalFlipY(data, unpack) }, destination, [width, height, depth]);
            this.sourceOrigin = "external-upload";
            return;
        }
        if (data && "byteLength" in data) {
            const bytesPerRow = width * textureUploadBytesPerPixel(format, type);
            this.device.queue.writeTexture(destination, data, {
                offset: 0,
                bytesPerRow,
                rowsPerImage: height,
            }, [width, height, depth]);
            this.sourceOrigin = "typed-upload";
        }
    }
    texParameteri(pname, param) {
        console.assert(pnameToString.has(pname) && parameterToString.has(param));
        this.state[pnameToString.get(pname)] = parameterToString.get(param);
        if (pname === WebGL2RenderingContext.TEXTURE_MIN_FILTER) {
            this.state.mipmapFilter = param === WebGL2RenderingContext.LINEAR_MIPMAP_LINEAR ||
                param === WebGL2RenderingContext.NEAREST_MIPMAP_LINEAR
                ? "linear"
                : "nearest";
            this.state.mipmapped = param !== WebGL2RenderingContext.LINEAR &&
                param !== WebGL2RenderingContext.NEAREST;
        }
        this.webglParameters.set(pname, param);
        this._sampler = null;
        this._nonFilteringSampler = null;
        this._hash = null;
    }
    renderbufferStorage(format, width, height) {
        const sameDescriptor = this._textureDescriptor.format === format &&
            this._textureDescriptor.size.width === width &&
            this._textureDescriptor.size.height === height &&
            this._textureDescriptor.size.depthOrArrayLayers === 1;
        if (sameDescriptor && this._texture) {
            this.destroy();
        }
        this.configureTexture({
            size: { width, height, depthOrArrayLayers: 1 },
            format,
            dimension: "2d",
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
            isDepthStencil: format.startsWith("depth") || format === "stencil8",
        });
        if (sameDescriptor) {
            this.onStorageChange.forEach((callback) => callback());
        }
        this.sourceOrigin = "render-target";
        if (width > 0 && height > 0 && typeof this.device.createCommandEncoder === "function") {
            this.initializeRenderbufferStorage();
        }
    }
    initializeRenderbufferStorage() {
        const encoder = this.device.createCommandEncoder({ label: `${this.label}-initialize-renderbuffer` });
        const view = this.getFramebufferView();
        let passDescriptor;
        if (this.format.includes("depth") || this.format.includes("stencil")) {
            const depthStencilAttachment = { view };
            if (this.format.includes("depth")) {
                depthStencilAttachment.depthLoadOp = "clear";
                depthStencilAttachment.depthStoreOp = "store";
                depthStencilAttachment.depthClearValue = 1;
            }
            if (this.format.includes("stencil")) {
                depthStencilAttachment.stencilLoadOp = "clear";
                depthStencilAttachment.stencilStoreOp = "store";
                depthStencilAttachment.stencilClearValue = 0;
            }
            passDescriptor = { colorAttachments: [], depthStencilAttachment };
        }
        else {
            passDescriptor = {
                colorAttachments: [{
                        view,
                        loadOp: "clear",
                        storeOp: "store",
                        clearValue: { r: 0, g: 0, b: 0, a: 0 },
                    }],
            };
        }
        encoder.beginRenderPass(passDescriptor).end();
        this.device.queue.submit([encoder.finish()]);
    }
    migrateTextureStorage(descriptor) {
        const oldTexture = this._texture;
        if (!oldTexture || this.imageStates.size === 0 ||
            this._textureDescriptor.format !== descriptor.format ||
            this._textureDescriptor.dimension !== descriptor.dimension ||
            typeof this.device.createCommandEncoder !== "function") {
            return false;
        }
        const oldWidth = Number(this._textureDescriptor.size.width) || 0;
        const oldHeight = Number(this._textureDescriptor.size.height) || 0;
        const oldLayers = Number(this._textureDescriptor.size.depthOrArrayLayers) || 1;
        const oldMipLevels = this._textureDescriptor.mipLevelCount || 1;
        const newWidth = Number(descriptor.size.width) || 0;
        const newHeight = Number(descriptor.size.height) || 0;
        const newLayers = Number(descriptor.size.depthOrArrayLayers) || 1;
        const newMipLevels = descriptor.mipLevelCount || 1;
        if (newWidth <= 0 || newHeight <= 0)
            return false;
        const replacement = this.device.createTexture({
            label: this.label,
            size: descriptor.size,
            format: descriptor.format,
            usage: descriptor.usage,
            dimension: descriptor.dimension,
            mipLevelCount: descriptor.mipLevelCount,
            viewFormats: descriptor.format === "rgba8unorm-srgb"
                ? ["rgba8unorm"]
                : undefined,
        });
        const encoder = this.device.createCommandEncoder({ label: `${this.label}-migrate-images` });
        const nextResident = new Set();
        const staleArchives = [];
        for (const image of this.imageStates.values()) {
            if (image.width <= 0 || image.height <= 0)
                continue;
            const key = this.imageKey(image.level, image.layer);
            const oldLevelWidth = Math.max(1, oldWidth >> image.level);
            const oldLevelHeight = Math.max(1, oldHeight >> image.level);
            const newLevelWidth = Math.max(1, newWidth >> image.level);
            const newLevelHeight = Math.max(1, newHeight >> image.level);
            const fitsOld = image.layer < oldLayers && image.level < oldMipLevels &&
                image.width <= oldLevelWidth && image.height <= oldLevelHeight;
            const fitsNew = image.layer < newLayers && image.level < newMipLevels &&
                image.width <= newLevelWidth && image.height <= newLevelHeight;
            if (this.residentImages.has(key) && fitsOld) {
                if (fitsNew) {
                    encoder.copyTextureToTexture({ texture: oldTexture, mipLevel: image.level, origin: { x: 0, y: 0, z: image.layer } }, { texture: replacement, mipLevel: image.level, origin: { x: 0, y: 0, z: image.layer } }, { width: image.width, height: image.height, depthOrArrayLayers: 1 });
                    nextResident.add(key);
                }
                else {
                    const archive = this.device.createTexture({
                        label: `${this.label}-archive-${key}`,
                        size: { width: image.width, height: image.height, depthOrArrayLayers: 1 },
                        format: this._textureDescriptor.format,
                        dimension: "2d",
                        usage: GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
                    });
                    encoder.copyTextureToTexture({ texture: oldTexture, mipLevel: image.level, origin: { x: 0, y: 0, z: image.layer } }, { texture: archive }, { width: image.width, height: image.height, depthOrArrayLayers: 1 });
                    const stale = this.archivedImages.get(key);
                    if (stale)
                        staleArchives.push(stale.texture);
                    this.archivedImages.set(key, {
                        texture: archive,
                        width: image.width,
                        height: image.height,
                        format: this._textureDescriptor.format,
                    });
                }
                continue;
            }
            const archive = this.archivedImages.get(key);
            if (archive && archive.format === descriptor.format && fitsNew &&
                archive.width === image.width && archive.height === image.height) {
                encoder.copyTextureToTexture({ texture: archive.texture }, { texture: replacement, mipLevel: image.level, origin: { x: 0, y: 0, z: image.layer } }, { width: image.width, height: image.height, depthOrArrayLayers: 1 });
                nextResident.add(key);
            }
        }
        this.device.queue.submit([encoder.finish()]);
        for (const stale of staleArchives)
            stale.destroy();
        oldTexture.destroy();
        this.residentImages.clear();
        for (const key of nextResident)
            this.residentImages.add(key);
        this._texture = replacement;
        this._currentTextureDescriptor = {
            ...descriptor,
            size: { ...descriptor.size },
        };
        this._view = null;
        this._attachmentViews.clear();
        this._hash = null;
        HydTexture.isDestroyedTexture = true;
        for (const callback of this.onDestroy)
            callback();
        this.onDestroy = [];
        return true;
    }
    configureTexture(descriptor) {
        const descriptorChanged = this._textureDescriptor.dimension !== descriptor.dimension ||
            this._textureDescriptor.format !== descriptor.format ||
            this._textureDescriptor.usage !== descriptor.usage ||
            this._textureDescriptor.isDepthStencil !== descriptor.isDepthStencil ||
            this._textureDescriptor.size.width !== descriptor.size.width ||
            this._textureDescriptor.size.height !== descriptor.size.height ||
            this._textureDescriptor.size.depthOrArrayLayers !== descriptor.size.depthOrArrayLayers ||
            this._textureDescriptor.mipLevelCount !== descriptor.mipLevelCount;
        if (descriptorChanged && this._texture && !this.migrateTextureStorage(descriptor)) {
            this.destroy();
            this.residentImages.clear();
        }
        this._textureDescriptor.dimension = descriptor.dimension;
        this._textureDescriptor.format = descriptor.format;
        this._textureDescriptor.size = descriptor.size;
        this._textureDescriptor.mipLevelCount = descriptor.mipLevelCount;
        this._textureDescriptor.usage = descriptor.usage;
        this._textureDescriptor.isDepthStencil = descriptor.isDepthStencil;
        if (descriptorChanged) {
            this._view = null;
            this._attachmentViews.clear();
            this._hash = null;
            this.sourceOrigin = "uninitialized";
            this.onStorageChange.forEach((callback) => callback());
        }
    }
}

;// ./src/components/hydFramebuffer.ts

class FramebufferAttributes {
    attachmentPoint;
    level;
    face;
    layer;
    attachment;
    objectType;
    constructor(attachmentPoint, level, face, attachment, layer, objectType = WebGL2RenderingContext.TEXTURE) {
        this.attachmentPoint = attachmentPoint;
        this.level = level;
        this.face = face;
        this.layer = layer;
        this.attachment = attachment;
        this.objectType = objectType;
    }
    get hash() {
        return `${this.attachmentPoint}-${this.level}-${this.face}-${this.layer}-${this.objectType}-${this.attachment.hash}`;
    }
    get view() {
        return this.attachment.getFramebufferView(this.face, this.level, this.layer);
    }
    get format() {
        return this.attachment.format;
    }
    get image() {
        if (this.objectType !== WebGL2RenderingContext.TEXTURE)
            return null;
        return this.attachment.getImageState(this.face, this.level || 0, this.layer);
    }
    get isCubeFace() {
        return this.face >= WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X &&
            this.face <= WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z;
    }
    get colorRenderable() {
        if (this.objectType === WebGL2RenderingContext.RENDERBUFFER) {
            return !this.format?.includes("depth") && !this.format?.includes("stencil");
        }
        const image = this.image;
        if (!image || !isWebGlColorRenderableInternalFormat(image.internalFormat))
            return false;
        if (image.internalFormat === WebGL2RenderingContext.RGB565 ||
            image.internalFormat === WebGL2RenderingContext.RGBA4 ||
            image.internalFormat === WebGL2RenderingContext.RGB5_A1)
            return false;
        return image.internalFormat !== WebGL2RenderingContext.RGBA ||
            image.type === WebGL2RenderingContext.UNSIGNED_BYTE;
    }
    get internalFormat() {
        return this.objectType === WebGL2RenderingContext.RENDERBUFFER
            ? this.attachment.renderbufferInternalFormat
            : this.image?.internalFormat || 0;
    }
    get colorBits() {
        switch (this.internalFormat) {
            case WebGL2RenderingContext.RGBA4:
                return [4, 4, 4, 4];
            case WebGL2RenderingContext.RGB565:
                return [5, 6, 5, 0];
            case WebGL2RenderingContext.RGB5_A1:
                return [5, 5, 5, 1];
            case WebGL2RenderingContext.RGB:
            case WebGL2RenderingContext.RGB8:
                return [8, 8, 8, 0];
            case WebGL2RenderingContext.RGBA:
            case WebGL2RenderingContext.RGBA8:
                return [8, 8, 8, 8];
            default:
                return this.colorRenderable ? [8, 8, 8, 8] : [0, 0, 0, 0];
        }
    }
    get depthBits() {
        if (this.format?.includes("depth16"))
            return 16;
        if (this.format?.includes("depth32"))
            return 32;
        return this.format?.includes("depth") ? 24 : 0;
    }
    get stencilBits() {
        return this.format?.includes("stencil") ? 8 : 0;
    }
    get width() {
        return this.image?.width ?? (this.objectType === WebGL2RenderingContext.RENDERBUFFER ? this.attachment.width : 0);
    }
    get height() {
        return this.image?.height ?? (this.objectType === WebGL2RenderingContext.RENDERBUFFER ? this.attachment.height : 0);
    }
}
class HydFramebuffer {
    ownerToken;
    initialized = false;
    deleted = false;
    attachments = new Map();
    drawBuffers = [
        WebGL2RenderingContext.COLOR_ATTACHMENT0
    ];
    readBuffer = WebGL2RenderingContext.COLOR_ATTACHMENT0;
    _hash = null;
    constructor(ownerToken) {
        this.ownerToken = ownerToken;
    }
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
            this._hash += this.readBuffer.toString();
        }
        return this._hash;
    }
    resetHash() {
        this._hash = null;
    }
}

;// ./src/components/hydVertexArray.ts

class HydVertexArray {
    __hash__;
    ownerToken;
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
    constructor(ownerToken) {
        this.ownerToken = ownerToken;
    }
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
    pixelPackBufferBinding;
    pixelUnpackBufferBinding;
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
        if (this.pixelPackBufferBinding) {
            ret += this.pixelPackBufferBinding.hash;
        }
        if (this.pixelUnpackBufferBinding) {
            ret += this.pixelUnpackBufferBinding.hash;
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
        this.pixelPackBufferBinding = null;
        this.pixelUnpackBufferBinding = null;
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
    funcEnum;
    range;
    writeMask;
    get hash() {
        return this.enabled.toString() + this.func.toString() + this.range.toString() + this.writeMask.toString();
    }
    constructor() {
        this.enabled = false;
        this.func = 'less';
        this.funcEnum = WebGL2RenderingContext.LESS;
        this.range = [0, 1];
        this.writeMask = true;
    }
}
class PolygonState {
    cullFace;
    cullFaceMode;
    cullFaceModeEnum;
    frontFace;
    frontFaceEnum;
    polygonOffsetFill;
    polygonOffsetUnits;
    polygonOffsetFactor;
    get hash() {
        return this.cullFace.toString() + this.cullFaceMode.toString() + this.frontFace.toString() + this.polygonOffsetFill.toString() + this.polygonOffsetUnits.toString() + this.polygonOffsetFactor.toString();
    }
    constructor() {
        this.cullFace = false;
        this.cullFaceMode = 'back';
        this.cullFaceModeEnum = WebGL2RenderingContext.BACK;
        this.frontFace = 'ccw';
        this.frontFaceEnum = WebGL2RenderingContext.CCW;
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
    dstRGBEnum;
    srcRGB;
    srcRGBEnum;
    dstAlpha;
    dstAlphaEnum;
    srcAlpha;
    srcAlphaEnum;
    equationRGB;
    equationRGBEnum;
    equationAlpha;
    equationAlphaEnum;
    get hash() {
        return this.enabled.toString() + this.color.toString() + this.dstRGB.toString() + this.srcRGB.toString() + this.dstAlpha.toString() + this.srcAlpha.toString() + this.equationRGB.toString() + this.equationAlpha.toString();
    }
    constructor() {
        this.enabled = false;
        this.dstRGB = 'zero';
        this.dstRGBEnum = WebGL2RenderingContext.ZERO;
        this.dstAlpha = 'zero';
        this.dstAlphaEnum = WebGL2RenderingContext.ZERO;
        this.srcRGB = 'one';
        this.srcRGBEnum = WebGL2RenderingContext.ONE;
        this.srcAlpha = 'one';
        this.srcAlphaEnum = WebGL2RenderingContext.ONE;
        this.color = [0.0, 0.0, 0.0, 0.0];
        this.equationRGB = 'add';
        this.equationRGBEnum = WebGL2RenderingContext.FUNC_ADD;
        this.equationAlpha = 'add';
        this.equationAlphaEnum = WebGL2RenderingContext.FUNC_ADD;
    }
}
class MiscState {
    scissorTest;
    scissorBox;
    colorWriteMask;
    unpackFlipYWebGL;
    unpackPremultiplyAlphaWebGL;
    unpackColorSpaceConversionWebGL;
    unpackColorSpace;
    unpackAlignment;
    packAlignment;
    sampleAlphaToCoverage;
    sampleCoverage;
    sampleCoverageValue;
    sampleCoverageInvert;
    dither;
    lineWidth;
    generateMipmapHint;
    get unpackState() {
        return {
            flipY: this.unpackFlipYWebGL,
            alignment: this.unpackAlignment,
            premultiplyAlpha: this.unpackPremultiplyAlphaWebGL,
            colorspaceConversion: this.unpackColorSpaceConversionWebGL,
            unpackColorSpace: this.unpackColorSpace,
        };
    }
    get hash() {
        return this.scissorTest.toString() + this.scissorBox.toString() + this.colorWriteMask.toString() + this.unpackFlipYWebGL.toString() + this.unpackPremultiplyAlphaWebGL.toString() + this.unpackColorSpaceConversionWebGL.toString() + this.unpackColorSpace + this.unpackAlignment.toString() + this.packAlignment.toString() + this.sampleAlphaToCoverage.toString();
    }
    constructor() {
        this.scissorTest = false;
        this.scissorBox = [0, 0, 0, 0];
        this.colorWriteMask = [true, true, true, true];
        this.unpackFlipYWebGL = false;
        this.unpackPremultiplyAlphaWebGL = false;
        this.unpackColorSpaceConversionWebGL = WebGL2RenderingContext.BROWSER_DEFAULT_WEBGL;
        this.unpackColorSpace = "srgb";
        this.unpackAlignment = 4;
        this.packAlignment = 4;
        this.sampleAlphaToCoverage = false;
        this.sampleCoverage = false;
        this.sampleCoverageValue = 1;
        this.sampleCoverageInvert = false;
        this.dither = true;
        this.lineWidth = 1;
        this.generateMipmapHint = WebGL2RenderingContext.DONT_CARE;
    }
}
class StencilState {
    enabled;
    frontFunc;
    frontFuncEnum;
    frontFail;
    frontFailEnum;
    frontPassDepthFail;
    frontPassDepthFailEnum;
    frontPassDepthPass;
    frontPassDepthPassEnum;
    frontRef;
    frontValueMask;
    frontWriteMask;
    backFunc;
    backFuncEnum;
    backFail;
    backFailEnum;
    backPassDepthFail;
    backPassDepthFailEnum;
    backPassDepthPass;
    backPassDepthPassEnum;
    backRef;
    backValueMask;
    backWriteMask;
    get hash() {
        return this.enabled.toString() + this.frontFunc.toString() + this.frontFail.toString() + this.frontPassDepthFail.toString() + this.frontPassDepthPass.toString() + this.frontRef.toString() + this.frontValueMask.toString() + this.frontWriteMask.toString() + this.backFunc.toString() + this.backFail.toString() + this.backPassDepthFail.toString() + this.backPassDepthPass.toString() + this.backRef.toString() + this.backValueMask.toString() + this.backWriteMask.toString();
    }
    constructor() {
        this.enabled = false;
        this.frontFunc = 'always';
        this.frontFuncEnum = WebGL2RenderingContext.ALWAYS;
        this.frontFail = 'keep';
        this.frontFailEnum = WebGL2RenderingContext.KEEP;
        this.frontPassDepthFail = 'keep';
        this.frontPassDepthFailEnum = WebGL2RenderingContext.KEEP;
        this.frontPassDepthPass = 'keep';
        this.frontPassDepthPassEnum = WebGL2RenderingContext.KEEP;
        this.frontRef = 0;
        this.frontValueMask = 0xFFFFFFFF;
        this.frontWriteMask = 0xFFFFFFFF;
        this.backFunc = 'always';
        this.backFuncEnum = WebGL2RenderingContext.ALWAYS;
        this.backFail = 'keep';
        this.backFailEnum = WebGL2RenderingContext.KEEP;
        this.backPassDepthPass = 'keep';
        this.backPassDepthPassEnum = WebGL2RenderingContext.KEEP;
        this.backPassDepthFail = 'keep';
        this.backPassDepthFailEnum = WebGL2RenderingContext.KEEP;
        this.backRef = 0;
        this.backValueMask = 0xFFFFFFFF;
        this.backWriteMask = 0xFFFFFFFF;
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
    stripIndexFormat;
    drawingBufferGeneration = 0;
    currentVertexAttribValues = Array.from({ length: 16 }, () => new Float32Array([0, 0, 0, 1]));
    defaultVertexArrayBinding = new HydVertexArray();
    defaultFramebuffer;
    __canvasTexture;
    __canvasView;
    device;
    __bindGroupCount = 0;
    __pipelineCount = 0;
    uniformBuffer;
    defaultSampleTextures = new Map();
    webglVersion;
    constructor(attributes, uniform, device, webglVersion = 1) {
        this.contextAttributes = attributes;
        this.defaultFramebuffer = new HydFramebuffer();
        this.defaultFramebuffer.drawBuffers = [WebGL2RenderingContext.BACK];
        this.defaultFramebuffer.readBuffer = WebGL2RenderingContext.BACK;
        this.defaultFramebuffer.attachments = new Map();
        this.device = device;
        this.webglVersion = webglVersion;
        this.commonState = new CommonState(0, [0, 0, -1, -1, 0, 1], null, null, this.defaultVertexArrayBinding, this.defaultFramebuffer, this.defaultFramebuffer, null);
        this.uniformBuffer = uniform;
    }
    setError(error) {
        if (this.glError === WebGL2RenderingContext.NO_ERROR) {
            this.glError = error;
        }
    }
    consumeError() {
        const error = this.glError;
        this.glError = WebGL2RenderingContext.NO_ERROR;
        return error;
    }
    getDefaultSampleTexture(viewDimension, sampleType) {
        const key = `${viewDimension}:${sampleType}`;
        let texture = this.defaultSampleTextures.get(key);
        if (!texture) {
            texture = new HydTexture(this.device);
            texture.label = `HydDefaultSampleTexture-${viewDimension}-${sampleType}`;
            texture.ensureSampleable(viewDimension, sampleType);
            this.defaultSampleTextures.set(key, texture);
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
    getSamplerTexture(textureUnit, viewDimension, sampleType) {
        const texture = this.getTextureUnitBinding(textureUnit, viewDimension);
        if (!texture || !texture.isSamplingComplete(viewDimension, this.webglVersion)) {
            return this.getDefaultSampleTexture(viewDimension, sampleType);
        }
        texture.ensureSampleable(viewDimension, sampleType);
        return texture;
    }
    getColorWriteMask(attachment) {
        const [r, g, b, a] = this.miscState.colorWriteMask;
        const writesDefaultFramebuffer = this.commonState.drawFramebufferBinding === this.defaultFramebuffer;
        const targetHasAlpha = !attachment || attachment.colorBits[3] > 0;
        const writeAlpha = a && targetHasAlpha && !(writesDefaultFramebuffer && this.contextAttributes.alpha === false);
        return (r ? GPUColorWrite.RED : 0) |
            (g ? GPUColorWrite.GREEN : 0) |
            (b ? GPUColorWrite.BLUE : 0) |
            (writeAlpha ? GPUColorWrite.ALPHA : 0);
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
                stripIndexFormat: topology === "line-strip" || topology === "triangle-strip"
                    ? this.stripIndexFormat
                    : undefined,
                cullMode: this.polygonState.cullFace ? this.polygonState.cullFaceMode : undefined,
                frontFace: this.polygonState.frontFace,
            },
        };
        let cacheKey = this.commonState.currentProgram.hash + this.polygonState.cullFace.toString() + this.polygonState.cullFaceMode.toString() + this.polygonState.frontFace.toString() + this.polygonState.polygonOffsetFill.toString() + this.polygonState.polygonOffsetUnits.toString() + this.polygonState.polygonOffsetFactor.toString() + this.topology.toString() + (this.stripIndexFormat || "none");
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
                        const writeMask = this.getColorWriteMask();
                        cacheKey += `:${writeMask}`;
                        return { format: 'bgra8unorm', blend, writeMask };
                    }
                    else if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                        const attachment = this.commonState.drawFramebufferBinding.attachments.get(value);
                        const writeMask = this.getColorWriteMask(attachment);
                        cacheKey += `:${writeMask}`;
                        return { format: attachment.format, blend, writeMask };
                    }
                    else {
                        return null;
                    }
                }),
            };
        }
        const depthStencilAttachment = this.getDepthStencilAttachment();
        if (depthStencilAttachment) {
            cacheKey += depthStencilAttachment.format;
            const hasDepth = depthStencilAttachment.format.startsWith("depth");
            const hasStencil = depthStencilAttachment.format.includes("stencil");
            const depthStencil = {
                format: depthStencilAttachment.format,
            };
            if (hasDepth) {
                depthStencil.depthWriteEnabled = this.depthState.enabled && this.depthState.writeMask;
                depthStencil.depthCompare = this.depthState.enabled ? this.depthState.func : 'always';
            }
            if (hasStencil) {
                depthStencil.stencilFront = {
                    compare: this.stencilState.frontFunc,
                    failOp: this.stencilState.frontFail,
                    depthFailOp: this.stencilState.frontPassDepthFail,
                    passOp: this.stencilState.frontPassDepthPass,
                };
                depthStencil.stencilBack = {
                    compare: this.stencilState.backFunc,
                    failOp: this.stencilState.backFail,
                    depthFailOp: this.stencilState.backPassDepthFail,
                    passOp: this.stencilState.backPassDepthPass,
                };
                depthStencil.stencilWriteMask = this.stencilState.frontWriteMask;
                depthStencil.stencilReadMask = this.stencilState.frontValueMask;
            }
            depthStencil.depthBias = this.polygonState.polygonOffsetFill ? this.polygonState.polygonOffsetUnits : undefined;
            depthStencil.depthBiasSlopeScale = this.polygonState.polygonOffsetFill ? this.polygonState.polygonOffsetFactor : undefined;
            pipelineDescriptor.depthStencil = depthStencil;
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
        const depthStencilAttachment = this.getDepthStencilAttachment();
        if (depthStencilAttachment) {
            ret['depthStencilFormat'] = depthStencilAttachment.format;
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
        const depthStencilAttachment = this.getDepthStencilAttachment();
        if (depthStencilAttachment) {
            const dsa = depthStencilAttachment;
            const clearDepth = Boolean(this.clearState.target & WebGL2RenderingContext.DEPTH_BUFFER_BIT);
            const clearStencil = Boolean(this.clearState.target & WebGL2RenderingContext.STENCIL_BUFFER_BIT);
            const useDepth = this.depthState.enabled || clearDepth;
            const useStencil = this.stencilState.enabled || clearStencil;
            cacheKey += '$' +
                dsa.view.label +
                (useDepth ? (clearDepth ? 'clear' : 'load') : undefined) +
                (useDepth ? 'store' : undefined) +
                this.clearState.depth +
                (useStencil ? (clearStencil ? 'clear' : 'load') : undefined) +
                (useStencil ? 'store' : undefined) +
                this.clearState.stencil;
        }
        return cacheKey;
    }
    getRenderPassDescriptor() {
        const renderPassDescriptor = {
            colorAttachments: this.commonState.drawFramebufferBinding.drawBuffers
                .map((value) => {
                if (value === WebGL2RenderingContext.BACK) {
                    const clearValue = this.contextAttributes.alpha === false
                        ? [this.clearState.color[0], this.clearState.color[1], this.clearState.color[2], 1]
                        : this.clearState.color;
                    return {
                        view: this.__canvasView,
                        label: this.__canvasView.label,
                        loadOp: (this.clearState.target & WebGL2RenderingContext.COLOR_BUFFER_BIT) ? 'clear' : 'load',
                        storeOp: 'store',
                        clearValue,
                    };
                }
                else if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                    const attachment = this.commonState.drawFramebufferBinding.attachments.get(value);
                    const view = attachment.view;
                    const clearValue = attachment.colorBits[3] === 0
                        ? [this.clearState.color[0], this.clearState.color[1], this.clearState.color[2], 1]
                        : this.clearState.color;
                    return {
                        view,
                        label: view.label,
                        loadOp: (this.clearState.target & WebGL2RenderingContext.COLOR_BUFFER_BIT) ? 'clear' : 'load',
                        storeOp: 'store',
                        clearValue,
                    };
                }
                else {
                    return null;
                }
            }),
        };
        const depthStencilAttachment = this.getDepthStencilAttachment();
        if (depthStencilAttachment) {
            const dsa = depthStencilAttachment;
            const clearDepth = Boolean(this.clearState.target & WebGL2RenderingContext.DEPTH_BUFFER_BIT);
            const clearStencil = Boolean(this.clearState.target & WebGL2RenderingContext.STENCIL_BUFFER_BIT);
            const useDepth = this.depthState.enabled || clearDepth;
            const useStencil = this.stencilState.enabled || clearStencil;
            const hasDepth = dsa.format.startsWith("depth");
            const hasStencil = dsa.format.includes("stencil");
            renderPassDescriptor.depthStencilAttachment = {
                view: dsa.view,
                depthClearValue: this.clearState.depth,
                depthLoadOp: hasDepth ? (useDepth && clearDepth ? 'clear' : 'load') : undefined,
                depthStoreOp: hasDepth ? 'store' : undefined,
                depthReadOnly: hasDepth ? false : undefined,
                stencilClearValue: this.clearState.stencil,
                stencilLoadOp: hasStencil ? (useStencil && clearStencil ? 'clear' : 'load') : undefined,
                stencilStoreOp: hasStencil ? 'store' : undefined,
                stencilReadOnly: hasStencil ? false : undefined,
            };
        }
        return renderPassDescriptor;
    }
    getCurrentRenderPassInfo() {
        return {
            hash: (0,dist/* default */.Ay)(this.getRenderPassDescriptorCacheKey()).toString(),
            bundleDescriptor: this.getRenderBundleEncoderDescriptor(),
            passDescriptor: this.getRenderPassDescriptor(),
        };
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
    updateCurrentVertexAttribBuffer(index) {
        this.getCurrentVertexAttribBuffer(index);
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
        const framebuffer = this.commonState.drawFramebufferBinding;
        let needsDepth = this.depthState.enabled || Boolean(this.clearState.target & WebGL2RenderingContext.DEPTH_BUFFER_BIT);
        let needsStencil = this.stencilState.enabled || Boolean(this.clearState.target & WebGL2RenderingContext.STENCIL_BUFFER_BIT);
        if (framebuffer === this.defaultFramebuffer) {
            needsDepth = needsDepth && this.contextAttributes.depth !== false;
            needsStencil = needsStencil && this.contextAttributes.stencil === true;
            if ((needsDepth || needsStencil) && this.contextAttributes.depth !== false && this.contextAttributes.stencil === true) {
                const attachment = framebuffer.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT);
                return attachment ? { view: attachment.view, format: attachment.format } : null;
            }
        }
        if (needsDepth && needsStencil) {
            const attachment = framebuffer.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT);
            if (!attachment)
                return null;
            return { view: attachment.view, format: attachment.format };
        }
        if (needsDepth) {
            const attachment = framebuffer.attachments.get(WebGL2RenderingContext.DEPTH_ATTACHMENT) ||
                framebuffer.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT);
            if (!attachment)
                return null;
            return { view: attachment.view, format: attachment.format };
        }
        if (needsStencil) {
            const attachment = framebuffer.attachments.get(WebGL2RenderingContext.STENCIL_ATTACHMENT) ||
                framebuffer.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT);
            if (!attachment)
                return null;
            return { view: attachment.view, format: attachment.format };
        }
        return null;
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
            const textureAttachment = this.getSamplerTexture(sampler.textureUnit, sampler.viewDimension, sampler.sampleType);
            const samplerBindingType = textureAttachment.isDepthStencil ? 'non-filtering' : sampler.samplerBindingType;
            textureAttachments.push(textureAttachment);
            bindGroupLayoutEntry.push({
                binding: bindGroupLayoutEntry.length,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                sampler: {
                    type: samplerBindingType,
                },
            });
            bindGroupLayoutEntry.push({
                binding: bindGroupLayoutEntry.length,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: textureAttachment.isDepthStencil ? 'unfilterable-float' : sampler.sampleType,
                    viewDimension: sampler.viewDimension,
                    multisampled: false,
                },
            });
            bindGroupLayoutKey += bindGroupLayoutEntry.length + '-t-' + textureAttachment.isDepthStencil + sampler.viewDimension + sampler.sampleType + sampler.samplerBindingType;
            bindGroupEntry.push({
                binding: bindGroupEntry.length,
                resource: textureAttachment.samplerForBinding(samplerBindingType),
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
        const divisorGroupBaseOffsets = new WeakMap();
        const buffers = [];
        const layouts = [];
        const offsets = [];
        const vbKeys = [];
        for (let location = 0; location < vao.attributes.length; location++) {
            if (!activeAttributeLocations.has(location))
                continue;
            const attribute = vao.attributes[location];
            if (!attribute.enabled || !attribute.buffer || !attribute.format || attribute.divisor <= 1)
                continue;
            let offsetsByLayout = divisorGroupBaseOffsets.get(attribute.buffer);
            if (!offsetsByLayout) {
                offsetsByLayout = new Map();
                divisorGroupBaseOffsets.set(attribute.buffer, offsetsByLayout);
            }
            const key = `${attribute.stride}:${attribute.divisor}`;
            offsetsByLayout.set(key, Math.min(offsetsByLayout.get(key) ?? attribute.offset, attribute.offset));
        }
        for (let location = 0; location < vao.attributes.length; location++) {
            if (!activeAttributeLocations.has(location))
                continue;
            const attribute = vao.attributes[location];
            if (attribute.enabled) {
                if (!attribute.buffer) {
                    this.setError(WebGL2RenderingContext.INVALID_OPERATION);
                    return;
                }
                let vertexBuffer = attribute.buffer.buffer;
                let arrayStride = attribute.stride;
                let attributeOffset = attribute.offset;
                let format = attribute.format;
                let bufferHash = attribute.buffer.hash;
                if (!format) {
                    const converted = attribute.buffer.getFloatVertexBuffer(attribute.type, attribute.size, attribute.normalized, attribute.webglStride, attribute.offset, attribute.divisor > 1 ? attribute.divisor : 1);
                    vertexBuffer = converted.buffer;
                    arrayStride = converted.arrayStride;
                    attributeOffset = 0;
                    format = converted.format;
                    bufferHash = converted.key;
                }
                else if (attribute.divisor > 1) {
                    const layoutKey = `${attribute.stride}:${attribute.divisor}`;
                    const sourceOffset = divisorGroupBaseOffsets.get(attribute.buffer)?.get(layoutKey) ?? attribute.offset;
                    const expanded = attribute.buffer.getDivisorVertexBuffer(attribute.stride, attribute.divisor, sourceOffset);
                    vertexBuffer = expanded.buffer;
                    attributeOffset -= sourceOffset;
                    bufferHash = expanded.key;
                }
                const stepMode = attribute.divisor > 0 ? 'instance' : 'vertex';
                let hash = bufferHash + '|' + arrayStride + '|' + stepMode + '|' + Math.floor(attributeOffset / 2048);
                if (bufferAttributeMap.has(hash)) {
                    bufferAttributeMap.get(hash)[3].push({
                        shaderLocation: attribute.shaderLocation,
                        offset: attributeOffset,
                        format,
                    });
                }
                else {
                    bufferAttributeMap.set(hash, [vertexBuffer, arrayStride, stepMode, [{
                                shaderLocation: attribute.shaderLocation,
                                offset: attributeOffset,
                                format,
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
    get stateToken() {
        return this._hashPbvCur;
    }
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
            + this.drawingBufferGeneration.toString()
            + this.topology
            + (this.stripIndexFormat || "none");
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
    [WebGL2RenderingContext.ALIASED_LINE_WIDTH_RANGE, new Float32Array([1, 1])],
    [WebGL2RenderingContext.ALIASED_POINT_SIZE_RANGE, new Float32Array([1, 1])],
    [WebGL2RenderingContext.COMPRESSED_TEXTURE_FORMATS, new Uint32Array(0)],
    [WebGL2RenderingContext.SUBPIXEL_BITS, 4],
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
    [WebGL2RenderingContext.MAX_VIEWPORT_DIMS, new Int32Array([16384, 16384])],
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
]);
const enumToIndexFormat = new Map([
    [WebGL2RenderingContext.UNSIGNED_SHORT, 'uint16'],
    [WebGL2RenderingContext.UNSIGNED_INT, 'uint32'],
]);
const indexEnumToBytes = new Map([
    [WebGL2RenderingContext.UNSIGNED_BYTE, 1],
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

;// ./src/components/hydShader.ts
window.hydTmp = new Set();
class HydShader {
    shaderTranslator;
    glsl_shader = "";
    compiled_glsl_shader = "";
    shader_info;
    translated_glsl_shader = "";
    infoLog = "";
    validationShader = null;
    validationContext = null;
    ownerToken;
    device;
    deleted = false;
    destroyed = false;
    attachmentCount = 0;
    compiled = false;
    type;
    webglVersion;
    sourceLength = 0;
    static errorShaderCount = 0;
    constructor(device, target, shaderTranslator, ownerToken, webglVersion = 1) {
        this.type = target;
        this.webglVersion = webglVersion;
        this.device = device;
        this.shaderTranslator = shaderTranslator;
        this.ownerToken = ownerToken;
    }
    compileShader() {
        this.compiled_glsl_shader = this.glsl_shader;
        this.shader_info = this.shaderTranslator.inspectShader(this.type, this.glsl_shader);
        if (!this.shader_info.wgsl) {
            console.warn("[HYD] shader WGSL deferred to runtime translator.");
        }
    }
}

;// ./src/components/shaderDB.ts



function attributeLocationSpan(glslType) {
    const matrix = /^mat([2-4])(?:x[2-4])?$/.exec(glslType);
    return matrix ? Number(matrix[1]) : 1;
}
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
    ["isampler2D", WebGL2RenderingContext.INT_SAMPLER_2D],
    ["isamplerCube", WebGL2RenderingContext.INT_SAMPLER_CUBE],
    ["isampler2DArray", WebGL2RenderingContext.INT_SAMPLER_2D_ARRAY],
    ["isampler3D", WebGL2RenderingContext.INT_SAMPLER_3D],
    ["usampler2D", WebGL2RenderingContext.UNSIGNED_INT_SAMPLER_2D],
    ["usamplerCube", WebGL2RenderingContext.UNSIGNED_INT_SAMPLER_CUBE],
    ["usampler2DArray", WebGL2RenderingContext.UNSIGNED_INT_SAMPLER_2D_ARRAY],
    ["usampler3D", WebGL2RenderingContext.UNSIGNED_INT_SAMPLER_3D],
]);
function samplerSampleType(wgslTextureType) {
    if (/<u32>\s*$/.test(wgslTextureType)) {
        return "uint";
    }
    if (/<i32>\s*$/.test(wgslTextureType)) {
        return "sint";
    }
    return "float";
}
function samplerBindingType(sampleType) {
    return sampleType === "float" ? "filtering" : "non-filtering";
}
function samplerViewDimension(wgslTextureType) {
    if (/^texture_2d<.+>$/.test(wgslTextureType)) {
        return "2d";
    }
    if (/^texture_cube<.+>$/.test(wgslTextureType)) {
        return "cube";
    }
    if (/^texture_2d_array<.+>$/.test(wgslTextureType)) {
        return "2d-array";
    }
    if (/^texture_3d<.+>$/.test(wgslTextureType)) {
        return "3d";
    }
    throw new Error(`unknown sampler type ${wgslTextureType}`);
}
function MergeShaderInfo(shaderInfo) {
    let uniformMap = new Map();
    let samplerMap = new Map();
    for (const info of shaderInfo) {
        for (const uniform of info.uniforms) {
            if (uniformMap.has(uniform.name)) {
                const existing = uniformMap.get(uniform.name);
                if (existing.glsl_type !== uniform.glsl_type ||
                    existing.size !== uniform.size || existing.is_array !== uniform.is_array) {
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
                name: attr.source_name || attr.name,
                shaderName: attr.name,
                location: idx,
                locationSpan: attributeLocationSpan(attr.glsl_type),
                type: Type2Constant.get(attr.glsl_type),
                size: 1,
            };
        }),
        uniforms: shaderInfo.uniforms.map((uniform) => {
            return new ProgramUniformBuffer(uniform.name, Type2Constant.get(uniform.glsl_type), uniform.size || 1, !!uniform.internal, uniform.source_name, !!uniform.is_array);
        }),
        samplers: shaderInfo.samplers.map((sampler) => {
            const webglType = Type2Constant.get(sampler.glsl_type);
            if (webglType === undefined) {
                throw new Error(`unknown sampler type ${sampler.glsl_type}`);
            }
            const sampleType = samplerSampleType(sampler.wgsl_texture_type);
            return new ProgramUniformSampler(sampler.name, webglType, samplerViewDimension(sampler.wgsl_texture_type), sampleType, samplerBindingType(sampleType), sampler.source_name, sampler.size || 1, sampler.array_name, sampler.array_index, !!sampler.is_array);
        }),
    };
}
function ShaderInfo2String(shaderInfo) {
    let res = "";
    let offset = 0;
    if (shaderInfo.uniforms.length > 0) {
        const declarations = new Set();
        for (const uniform of shaderInfo.uniforms) {
            for (const declaration of uniform.wgsl_declarations || [])
                declarations.add(declaration);
        }
        if (declarations.size > 0) {
            res += `${Array.from(declarations).join("\n\n")}\n\n`;
        }
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

;// ./src/components/shaderInternalUniforms.ts
const FRAG_COORD_HEIGHT_UNIFORM_NAME = "hyd_internal_fragCoordHeight";
const DEPTH_RANGE_NEAR_UNIFORM_NAME = "hyd_internal_depthRangeNear";
const DEPTH_RANGE_FAR_UNIFORM_NAME = "hyd_internal_depthRangeFar";
const DEPTH_RANGE_DIFF_UNIFORM_NAME = "hyd_internal_depthRangeDiff";

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

;// ./src/components/shaderWgslTypes.ts
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function replaceBareWgslIdentifier(source, from, to) {
    const escaped = escapeRegExp(from);
    return source.replace(new RegExp(`\\b${escaped}\\b`, "g"), (match, offset) => {
        let previous = offset - 1;
        while (previous >= 0 && /\s/.test(source[previous]))
            previous--;
        if (previous >= 0 && source[previous] === ".")
            return match;
        const openParen = source.lastIndexOf("(", offset);
        const closeParen = source.lastIndexOf(")", offset);
        if (openParen > closeParen) {
            const attributePrefix = source.slice(Math.max(0, openParen - 64), openParen);
            if (/@[A-Za-z_]\w*\s*$/.test(attributePrefix))
                return match;
        }
        return to;
    });
}
const WGSL_RESERVED_IDENTIFIERS = new Set(`
NULL Self abstract active alignas alignof as asm asm_fragment async attribute auto await become cast catch class
co_await co_return co_yield coherent column_major common compile compile_fragment concept const_cast consteval
constexpr constinit crate debugger decltype delete demote demote_to_helper do dynamic_cast enum explicit export
extends extern external fallthrough filter final finally friend from fxgroup get goto groupshared highp impl
implements import inline instanceof interface layout lowp macro macro_rules match mediump meta mod module move mut
mutable namespace new nil noexcept noinline nointerpolation non_coherent noncoherent noperspective null nullptr of
operator package packoffset partition pass patch pixelfragment precise precision premerge priv protected pub public
readonly ref regardless register reinterpret_cast require resource restrict self set shared sizeof smooth snorm static
static_assert static_cast std subroutine super target template this thread_local throw trait try type typedef typeid
typename typeof union unless unorm unsafe unsized use using varying virtual volatile wgsl where with writeonly yield
`.trim().split(/\s+/));
function isReservedWgslIdentifier(name) {
    return WGSL_RESERVED_IDENTIFIERS.has(name);
}
function renameReservedWgslIdentifiers(wgsl) {
    const declaredNames = new Set();
    const declarationPatterns = [
        /\b(?:alias|const|let|override|struct|fn)\s+([A-Za-z_]\w*)/g,
        /\bvar(?:\s*<[^>]+>)?\s+([A-Za-z_]\w*)/g,
        /(?:^|[({,])\s*(?:@[A-Za-z_]\w*(?:\([^)]*\))?\s*)*([A-Za-z_]\w*)\s*:/gm,
    ];
    for (const pattern of declarationPatterns) {
        for (let match = pattern.exec(wgsl); match !== null; match = pattern.exec(wgsl)) {
            if (WGSL_RESERVED_IDENTIFIERS.has(match[1]))
                declaredNames.add(match[1]);
        }
    }
    let out = wgsl;
    for (const name of declaredNames) {
        let replacement = `${name}_`;
        while (new RegExp(`\\b${escapeRegExp(replacement)}\\b`).test(out))
            replacement += "_";
        out = out.replace(new RegExp(`\\b${escapeRegExp(name)}\\b`, "g"), replacement);
    }
    return out;
}
function wgslUniformVariableNames(source) {
    const names = [];
    const pattern = /\bvar\s*<\s*uniform\s*>\s+([A-Za-z_]\w*)\s*:/g;
    for (let match = pattern.exec(source); match !== null; match = pattern.exec(source)) {
        names.push(match[1]);
    }
    return names;
}
function replaceWgslMemberAccess(source, objectNames, member, to) {
    let out = source;
    for (const objectName of objectNames) {
        out = out.replace(new RegExp(`\\b${escapeRegExp(objectName)}\\s*\\.\\s*${escapeRegExp(member)}\\b`, "g"), to);
    }
    return out;
}
function stableIdentifierHash(value) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36);
}
function findMatchingBrace(source, openIndex) {
    let depth = 0;
    let lineComment = false;
    let blockComment = false;
    for (let i = openIndex; i < source.length; i++) {
        const ch = source[i];
        const next = source[i + 1];
        if (lineComment) {
            if (ch === "\n")
                lineComment = false;
            continue;
        }
        if (blockComment) {
            if (ch === "*" && next === "/") {
                blockComment = false;
                i++;
            }
            continue;
        }
        if (ch === "/" && next === "/") {
            lineComment = true;
            i++;
            continue;
        }
        if (ch === "/" && next === "*") {
            blockComment = true;
            i++;
            continue;
        }
        if (ch === "{") {
            depth++;
        }
        else if (ch === "}") {
            depth--;
            if (depth === 0)
                return i;
        }
    }
    return -1;
}
function splitStructFields(body) {
    const fields = [];
    let start = 0;
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    let angleDepth = 0;
    let lineComment = false;
    let blockComment = false;
    for (let i = 0; i < body.length; i++) {
        const ch = body[i];
        const next = body[i + 1];
        if (lineComment) {
            if (ch === "\n")
                lineComment = false;
            continue;
        }
        if (blockComment) {
            if (ch === "*" && next === "/") {
                blockComment = false;
                i++;
            }
            continue;
        }
        if (ch === "/" && next === "/") {
            lineComment = true;
            i++;
        }
        else if (ch === "/" && next === "*") {
            blockComment = true;
            i++;
        }
        else if (ch === "(") {
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
            fields.push(body.slice(start, i));
            start = i + 1;
        }
    }
    if (body.slice(start).trim())
        fields.push(body.slice(start));
    return fields;
}
function parseStructs(wgsl) {
    const structs = new Map();
    const structRegex = /\bstruct\s+([A-Za-z_]\w*)\s*\{/g;
    for (let match = structRegex.exec(wgsl); match !== null; match = structRegex.exec(wgsl)) {
        const bodyOpen = structRegex.lastIndex - 1;
        const bodyClose = findMatchingBrace(wgsl, bodyOpen);
        if (bodyClose < 0)
            continue;
        const fields = [];
        for (const rawField of splitStructFields(wgsl.slice(bodyOpen + 1, bodyClose))) {
            const field = rawField
                .replace(/\/\*[\s\S]*?\*\//g, " ")
                .replace(/\/\/.*$/gm, " ")
                .trim();
            const fieldMatch = /^((?:\s*@[A-Za-z_]\w*(?:\([^)]*\))?\s*)*)([A-Za-z_]\w*)\s*:\s*([\s\S]+)$/.exec(field);
            if (!fieldMatch)
                continue;
            fields.push({
                attributes: fieldMatch[1].replace(/\s+/g, " ").trim(),
                name: fieldMatch[2],
                type: fieldMatch[3].trim(),
            });
        }
        structs.set(match[1], { fields, start: match.index, end: bodyClose + 1 });
        structRegex.lastIndex = bodyClose + 1;
    }
    return structs;
}
function parseAliases(wgsl) {
    const aliases = new Map();
    const aliasRegex = /\balias\s+([A-Za-z_]\w*)\s*=\s*([^;]+);/g;
    for (let match = aliasRegex.exec(wgsl); match !== null; match = aliasRegex.exec(wgsl)) {
        aliases.set(match[1], { type: match[2].trim(), start: match.index, end: aliasRegex.lastIndex });
    }
    return aliases;
}
function uniformStructNames(wgsl) {
    const names = new Set();
    const uniformVarRegex = /\bvar\s*<\s*uniform\s*>\s+[A-Za-z_]\w*\s*:\s*([A-Za-z_]\w*)\s*;/g;
    for (let match = uniformVarRegex.exec(wgsl); match !== null; match = uniformVarRegex.exec(wgsl)) {
        names.add(match[1]);
    }
    return names;
}
function synchronizeTintUniformTypes(wgsl, metadata) {
    if (metadata.uniforms.length === 0)
        return wgsl;
    const structs = parseStructs(wgsl);
    const aliases = parseAliases(wgsl);
    const declarations = new Map();
    const resolvedNames = new Map();
    const resolving = new Set();
    const resolveType = (type) => type.replace(/\b[A-Za-z_]\w*\b/g, (name) => {
        if (!aliases.has(name) && !structs.has(name))
            return name;
        const cached = resolvedNames.get(name);
        if (cached)
            return cached;
        if (resolving.has(name))
            return name;
        resolving.add(name);
        let resolved = name;
        const alias = aliases.get(name);
        if (alias !== undefined) {
            resolved = resolveType(alias.type);
        }
        else {
            const parsed = structs.get(name);
            if (parsed) {
                const fields = parsed.fields.map((field) => ({ ...field, type: resolveType(field.type) }));
                const shape = fields.map((field) => `${field.attributes}|${field.name}:${field.type}`).join(";");
                resolved = `_hyd_uniform_layout_${stableIdentifierHash(shape)}`;
                if (!declarations.has(resolved)) {
                    const fieldLines = fields.map((field) => `  ${field.attributes ? `${field.attributes} ` : ""}${field.name}: ${field.type},`);
                    declarations.set(resolved, `struct ${resolved} {\n${fieldLines.join("\n")}\n};`);
                }
            }
        }
        resolving.delete(name);
        resolvedNames.set(name, resolved);
        return resolved;
    });
    const tintFields = new Map();
    for (const structName of uniformStructNames(wgsl)) {
        const uniformStruct = structs.get(structName);
        if (!uniformStruct)
            continue;
        for (const field of uniformStruct.fields)
            tintFields.set(field.name, field.type);
    }
    for (const uniform of metadata.uniforms) {
        const tintType = tintFields.get(uniform.name);
        if (tintType)
            uniform.wgsl_type = resolveType(tintType);
    }
    const emittedDeclarations = Array.from(declarations.values());
    for (const uniform of metadata.uniforms) {
        uniform.wgsl_declarations = emittedDeclarations;
    }
    const ranges = [];
    for (const name of resolvedNames.keys()) {
        const alias = aliases.get(name);
        if (alias)
            ranges.push({ start: alias.start, end: alias.end });
        const struct = structs.get(name);
        if (struct)
            ranges.push({ start: struct.start, end: struct.end });
    }
    let out = wgsl;
    for (const range of ranges.sort((a, b) => b.start - a.start)) {
        out = out.slice(0, range.start) + out.slice(range.end);
    }
    for (const [name, resolved] of Array.from(resolvedNames.entries()).sort((a, b) => b[0].length - a[0].length)) {
        if (name === resolved)
            continue;
        out = out.replace(new RegExp(`\\b${name}\\b`, "g"), resolved);
    }
    return out;
}
function composeShaderModuleWgsl(resourceDeclarations, shaderWgsl) {
    const directivePrefix = shaderWgsl.match(/^\s*((?:(?:enable|requires)\s+[^;]+;\s*|diagnostic\s*\([^;]+\)\s*;\s*)+)/);
    if (!directivePrefix)
        return resourceDeclarations + shaderWgsl;
    const directives = directivePrefix[1].trim();
    const body = shaderWgsl.slice(directivePrefix[0].length).trimStart();
    return `${directives}\n\n${resourceDeclarations}${body}`;
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
    [WebGL2RenderingContext.FLOAT_MAT3, 3 * 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT4, 4 * 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT2x3, 2 * 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT2x4, 2 * 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT3x2, 3 * 2 * 4],
    [WebGL2RenderingContext.FLOAT_MAT3x4, 3 * 4 * 4],
    [WebGL2RenderingContext.FLOAT_MAT4x2, 4 * 2 * 4],
    [WebGL2RenderingContext.FLOAT_MAT4x3, 4 * 4 * 4],
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
const glMatrixDimensions = new Map([
    [WebGL2RenderingContext.FLOAT_MAT2, { columns: 2, rows: 2 }],
    [WebGL2RenderingContext.FLOAT_MAT3, { columns: 3, rows: 3 }],
    [WebGL2RenderingContext.FLOAT_MAT4, { columns: 4, rows: 4 }],
    [WebGL2RenderingContext.FLOAT_MAT2x3, { columns: 2, rows: 3 }],
    [WebGL2RenderingContext.FLOAT_MAT2x4, { columns: 2, rows: 4 }],
    [WebGL2RenderingContext.FLOAT_MAT3x2, { columns: 3, rows: 2 }],
    [WebGL2RenderingContext.FLOAT_MAT3x4, { columns: 3, rows: 4 }],
    [WebGL2RenderingContext.FLOAT_MAT4x2, { columns: 4, rows: 2 }],
    [WebGL2RenderingContext.FLOAT_MAT4x3, { columns: 4, rows: 3 }],
]);
function uniformMatrixDimensions(type) {
    return glMatrixDimensions.get(type) || null;
}
class ProgramUniformBuffer {
    name;
    size;
    webgl_type;
    offset;
    byteLength;
    alignedByteLength;
    elementByteLength;
    elementStride;
    internal;
    sourceName;
    dataView;
    float32View;
    int32View;
    uint32View;
    writeFloat32View = null;
    writeInt32View = null;
    writeUint32View = null;
    wordOffset;
    arrayStrideWords = 0;
    remainingArrayElements = 1;
    isArray;
    ownerToken;
    program;
    linkGeneration;
    constructor(name, type, size, internal = false, sourceName, isArray = false) {
        this.name = name;
        this.size = size;
        this.webgl_type = type;
        this.internal = internal;
        this.sourceName = sourceName;
        this.isArray = isArray;
        const matrix = uniformMatrixDimensions(type);
        this.elementByteLength = matrix ? matrix.columns * 16 : glSizeToBytes.get(type);
        const elementAlignment = matrix ? 16 : glSizeToAlignedBytes.get(type);
        this.elementStride = isArray
            ? Math.ceil(this.elementByteLength / Math.max(16, elementAlignment)) * Math.max(16, elementAlignment)
            : this.elementByteLength;
        this.byteLength = isArray ? this.elementStride * size : this.elementByteLength;
        this.alignedByteLength = isArray ? Math.max(16, elementAlignment) : elementAlignment;
    }
}
class ProgramUniformSampler {
    name;
    size;
    webgl_type;
    textureUnit;
    sampleType;
    samplerBindingType;
    viewDimension;
    sourceName;
    originFlipUniform;
    originFlipValue;
    ownerToken;
    program;
    linkGeneration;
    activeForUniformUpdates = false;
    storage;
    arrayName;
    arrayIndex;
    arrayElements;
    remainingArrayElements = 1;
    isArray;
    constructor(name, webgl_type, viewDimension, sampleType = "float", samplerBindingType = "filtering", sourceName, size = 1, arrayName, arrayIndex, isArray = false) {
        this.name = name;
        this.size = size;
        this.webgl_type = webgl_type;
        this.textureUnit = 0;
        this.sampleType = sampleType;
        this.samplerBindingType = samplerBindingType;
        this.viewDimension = viewDimension;
        this.sourceName = sourceName;
        this.arrayName = arrayName;
        this.arrayIndex = arrayIndex;
        this.isArray = isArray;
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
    const directivePrefix = wgsl.match(/^\s*(?:(?:(?:enable|requires)\s+[^;]+;|diagnostic\s*\([^;]+\)\s*;)\s*)+/);
    const insertion = directivePrefix ? directivePrefix[0].length : 0;
    return wgsl.slice(0, insertion) + helper + wgsl.slice(insertion);
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
        return `${this._hash}origin:${this.samplerOriginVariantKey}:${this.vertexModule?.label || ""}:${this.fragmentModule?.label || ""}|`;
    }
    vertexShader;
    fragmentShader;
    attachedShaders = [];
    shaderTranslator;
    vertexModule;
    fragmentModule;
    vertexWgsl = "";
    fragmentWgsl = "";
    samplerOriginVariants = new Map();
    samplerOriginVariantKey = "";
    device;
    deleted = false;
    destroyed = false;
    linked = false;
    infoLog = "";
    ownerToken;
    linkGeneration = 0;
    validated = false;
    hydAttributes = [];
    hydAttributeLocations = new Set();
    hydUniforms = [];
    fragCoordHeightUniform = null;
    fragCoordHeightValue = Number.NaN;
    depthRangeUniforms = [];
    depthRangeValue = [Number.NaN, Number.NaN];
    hydSamplers = [];
    uniformBufferLocations = [];
    uniformSamplerLocations = [];
    hydSampler2D = [];
    originUniformStateVersion = -1;
    originVariantStateVersion = -1;
    staticSamplerOriginVariants = true;
    boundAttributeLocations = new Map();
    activeUniform;
    activeUniformFloat32;
    activeUniformInt32;
    activeUniformUint32;
    alignedUniformSize;
    constructor(device, shaderTranslator, ownerToken) {
        this.device = device;
        this.shaderTranslator = shaderTranslator;
        this.ownerToken = ownerToken;
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
        if (this.attachedShaders.includes(shader) || this.attachedShaders.some((attached) => attached.type === shader.type)) {
            return false;
        }
        this.attachedShaders.push(shader);
        shader.attachmentCount++;
        if (shader.type === WebGLRenderingContext.VERTEX_SHADER) {
            this.vertexShader = shader;
        }
        else if (shader.type === WebGLRenderingContext.FRAGMENT_SHADER) {
            this.fragmentShader = shader;
        }
        return true;
    }
    detachShader(shader) {
        const index = this.attachedShaders.indexOf(shader);
        if (index < 0) {
            return false;
        }
        this.attachedShaders.splice(index, 1);
        shader.attachmentCount = Math.max(0, shader.attachmentCount - 1);
        if (shader.deleted && shader.attachmentCount === 0) {
            shader.destroyed = true;
        }
        if (this.vertexShader === shader) {
            this.vertexShader = undefined;
        }
        if (this.fragmentShader === shader) {
            this.fragmentShader = undefined;
        }
        return true;
    }
    getAttachedShaders() {
        return this.attachedShaders.slice();
    }
    detachAllShaders() {
        for (const shader of this.getAttachedShaders()) {
            this.detachShader(shader);
        }
    }
    bindAttribLocation(index, name) {
        this.boundAttributeLocations.set(name, index);
    }
    linkProgram() {
        this.linked = false;
        this.infoLog = "";
        if (!this.vertexShader || !this.fragmentShader) {
            this.infoLog = "A vertex shader and a fragment shader must both be attached.";
            return false;
        }
        if (!this.vertexShader.compiled || !this.fragmentShader.compiled) {
            this.infoLog = "All attached shaders must compile successfully before linking.";
            return false;
        }
        let translatedProgram;
        try {
            translatedProgram = this.shaderTranslator.translateProgram(this.vertexShader, this.fragmentShader, this.boundAttributeLocations);
        }
        catch (error) {
            this.infoLog = error instanceof Error ? error.message : String(error);
            return false;
        }
        if (this.vertexShader && translatedProgram.vertex) {
            this.vertexShader.shader_info = translatedProgram.vertex;
        }
        if (this.fragmentShader && translatedProgram.fragment) {
            this.fragmentShader.shader_info = translatedProgram.fragment;
        }
        HydProgram.linkedPrograms++;
        this._hash = HydProgram.linkedPrograms.toString();
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
        this.vertexWgsl = composeShaderModuleWgsl(code, this.vertexShader.shader_info.wgsl);
        this.fragmentWgsl = composeShaderModuleWgsl(code, this.fragmentShader.shader_info.wgsl);
        let vs = this.vertexWgsl;
        let fs = this.fragmentWgsl;
        if (this.staticSamplerOriginVariants) {
            const defaultFlips = new Map();
            for (const sampler of runtimeShaderInfo.samplers) {
                if (sampler.glsl_type === "sampler2D") {
                    defaultFlips.set(sampler.name, false);
                }
            }
            vs = specializeSamplerOriginWgsl(this.vertexWgsl, defaultFlips);
            fs = specializeSamplerOriginWgsl(this.fragmentWgsl, defaultFlips);
            if (vs.includes("_hyd_samplerFlipY_") || fs.includes("_hyd_samplerFlipY_")) {
                this.staticSamplerOriginVariants = false;
                this.vertexWgsl = composeShaderModuleWgsl(dynamicCode, this.vertexShader.shader_info.wgsl);
                this.fragmentWgsl = composeShaderModuleWgsl(dynamicCode, this.fragmentShader.shader_info.wgsl);
                vs = this.vertexWgsl;
                fs = this.fragmentWgsl;
            }
        }
        this.samplerOriginVariants.clear();
        this.samplerOriginVariantKey = "";
        if (this.vertexShader) {
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
            const location = translatedProgram.attributeLocations?.get(attribute.shaderName);
            if (location !== undefined) {
                attribute.location = location;
            }
        }
        this.hydAttributeLocations = new Set();
        for (const attribute of this.hydAttributes) {
            for (let offset = 0; offset < attribute.locationSpan; offset++) {
                this.hydAttributeLocations.add(attribute.location + offset);
            }
        }
        this.hydUniforms = aus.uniforms;
        this.fragCoordHeightUniform = this.hydUniforms.find((uniform) => uniform.name === FRAG_COORD_HEIGHT_UNIFORM_NAME) || null;
        this.fragCoordHeightValue = Number.NaN;
        this.depthRangeUniforms = [
            DEPTH_RANGE_NEAR_UNIFORM_NAME,
            DEPTH_RANGE_FAR_UNIFORM_NAME,
            DEPTH_RANGE_DIFF_UNIFORM_NAME,
        ].map((name) => this.hydUniforms.find((uniform) => uniform.name === name) || null);
        this.depthRangeValue = [Number.NaN, Number.NaN];
        this.hydSamplers = aus.samplers;
        for (const uniform of this.hydUniforms) {
            uniform.ownerToken = this.ownerToken;
            uniform.program = this;
            uniform.linkGeneration = this.linkGeneration;
        }
        for (const sampler of this.hydSamplers) {
            sampler.ownerToken = this.ownerToken;
            sampler.program = this;
            sampler.linkGeneration = this.linkGeneration;
        }
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
        this.activeUniformUint32 = new Uint32Array(this.activeUniform.buffer);
        this.uniformArrayBufferTempView = new DataView(this.activeUniform.buffer);
        for (const uniform of this.hydUniforms) {
            uniform.dataView = this.uniformArrayBufferTempView;
            uniform.float32View = this.activeUniformFloat32;
            uniform.int32View = this.activeUniformInt32;
            uniform.uint32View = this.activeUniformUint32;
            uniform.wordOffset = uniform.offset >> 2;
        }
        this.linked = true;
        return true;
    }
    setUniform(array, offset) {
        array.set(this.activeUniform, offset);
        return offset + this.alignedUniformSize;
    }
    applySamplerOriginVariant(samplerOriginFlips) {
        if (!this.vertexShader || !this.fragmentShader || this.vertexWgsl.length === 0 ||
            this.fragmentWgsl.length === 0 || samplerOriginFlips.size === 0) {
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
            const vertexWgsl = specializeSamplerOriginWgsl(this.vertexWgsl, samplerOriginFlips);
            const fragmentWgsl = specializeSamplerOriginWgsl(this.fragmentWgsl, samplerOriginFlips);
            variant = {
                vertexWgsl,
                fragmentWgsl,
                vertexModule: this.device.createShaderModule({
                    code: vertexWgsl,
                    label: (0,dist/* default */.Ay)(vertexWgsl).toString(),
                }),
                fragmentModule: this.device.createShaderModule({
                    code: fragmentWgsl,
                    label: (0,dist/* default */.Ay)(fragmentWgsl).toString(),
                }),
            };
            this.samplerOriginVariants.set(key, variant);
            if (this.vertexShader.shader_info.shader_capture) {
                emitShaderCapture({
                    ...this.vertexShader.shader_info.shader_capture,
                    kind: "shader-final",
                    source: "runtime-origin-variant",
                    programId: this._hash,
                    shaderId: `${this.vertexShader.shader_info.shader_capture.shaderId}:origin:${key}`,
                    finalWgsl: sourceCapture(vertexWgsl),
                });
            }
            if (this.fragmentShader.shader_info.shader_capture) {
                emitShaderCapture({
                    ...this.fragmentShader.shader_info.shader_capture,
                    kind: "shader-final",
                    source: "runtime-origin-variant",
                    programId: this._hash,
                    shaderId: `${this.fragmentShader.shader_info.shader_capture.shaderId}:origin:${key}`,
                    finalWgsl: sourceCapture(fragmentWgsl),
                });
            }
        }
        this.vertexModule = variant.vertexModule;
        this.fragmentModule = variant.fragmentModule;
        this.samplerOriginVariantKey = key;
    }
}

;// ./src/components/hydBuffer.ts
class HydBuffer {
    static __total__ = 0;
    __buffer__;
    device;
    ownerToken;
    initialized = false;
    deleted = false;
    webglSize = 0;
    webglUsage = 0x88E4;
    bindingKind = null;
    descriptor = {
        size: undefined,
        usage: GPUBufferUsage.COPY_DST,
    };
    shadowData = new Uint8Array(0);
    writeVersion = 0;
    uint16IndexBuffer = null;
    uint16IndexBufferVersion = -1;
    indexRangeMaxCache = new Map();
    expandedIndexBuffers = new Map();
    convertedVertexBuffers = new Map();
    divisorVertexBuffers = new Map();
    lastMaxIndexType = 0;
    lastMaxIndexOffset = -1;
    lastMaxIndexCount = -1;
    lastMaxIndexValue = -1;
    constructor(device, ownerToken) {
        this.device = device;
        this.ownerToken = ownerToken;
        this.descriptor.label = `buffer ${HydBuffer.__total__++}`;
    }
    invalidateIndexCaches() {
        this.uint16IndexBuffer?.destroy();
        this.uint16IndexBuffer = null;
        this.uint16IndexBufferVersion = -1;
        for (const expanded of this.expandedIndexBuffers.values()) {
            expanded.buffer.destroy();
        }
        for (const converted of this.convertedVertexBuffers.values()) {
            converted.buffer.destroy();
        }
        for (const expanded of this.divisorVertexBuffers.values()) {
            expanded.buffer.destroy();
        }
        this.expandedIndexBuffers.clear();
        this.convertedVertexBuffers.clear();
        this.divisorVertexBuffers.clear();
        this.indexRangeMaxCache.clear();
        this.lastMaxIndexCount = -1;
    }
    write(data = null, dstOffset = 0) {
        this.writeVersion++;
        this.invalidateIndexCaches();
        if (this.__buffer__ && (this.__buffer__.size !== this.descriptor.size)) {
            this.__buffer__.destroy();
            this.__buffer__ = null;
        }
        if (!this.__buffer__) {
            this.descriptor.label += this.descriptor.size.toString() + this.descriptor.usage.toString();
            this.__buffer__ = this.device.createBuffer(this.descriptor);
        }
        if (this.shadowData.byteLength !== this.descriptor.size) {
            this.shadowData = new Uint8Array(this.descriptor.size);
        }
        else if (data === null) {
            this.shadowData.fill(0);
        }
        if (data !== null) {
            const source = ArrayBuffer.isView(data)
                ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
                : new Uint8Array(data);
            this.shadowData.set(source, dstOffset);
            if (source.byteLength > 0) {
                const alignedStart = dstOffset & ~3;
                const alignedEnd = (dstOffset + source.byteLength + 3) & ~3;
                this.device.queue.writeBuffer(this.__buffer__, alignedStart, this.shadowData.buffer, this.shadowData.byteOffset + alignedStart, alignedEnd - alignedStart);
            }
        }
    }
    get version() {
        return this.writeVersion;
    }
    get hasConvertedVertexBuffers() {
        return this.convertedVertexBuffers.size > 0 || this.divisorVertexBuffers.size > 0;
    }
    readIndex(type, byteOffset) {
        if (type === WebGL2RenderingContext.UNSIGNED_BYTE) {
            return this.shadowData[byteOffset];
        }
        const view = new DataView(this.shadowData.buffer, this.shadowData.byteOffset, this.shadowData.byteLength);
        if (type === WebGL2RenderingContext.UNSIGNED_SHORT) {
            return view.getUint16(byteOffset, true);
        }
        return view.getUint32(byteOffset, true);
    }
    maxIndex(type, byteOffset, count) {
        if (count <= 0)
            return -1;
        if (this.lastMaxIndexType === type &&
            this.lastMaxIndexOffset === byteOffset &&
            this.lastMaxIndexCount === count) {
            return this.lastMaxIndexValue;
        }
        const key = `${type}:${byteOffset}:${count}`;
        const cached = this.indexRangeMaxCache.get(key);
        if (cached !== undefined) {
            this.lastMaxIndexType = type;
            this.lastMaxIndexOffset = byteOffset;
            this.lastMaxIndexCount = count;
            this.lastMaxIndexValue = cached;
            return cached;
        }
        const indexSize = type === WebGL2RenderingContext.UNSIGNED_BYTE ? 1 :
            type === WebGL2RenderingContext.UNSIGNED_SHORT ? 2 : 4;
        let max = -1;
        for (let i = 0; i < count; i++) {
            max = Math.max(max, this.readIndex(type, byteOffset + i * indexSize));
        }
        this.indexRangeMaxCache.set(key, max);
        this.lastMaxIndexType = type;
        this.lastMaxIndexOffset = byteOffset;
        this.lastMaxIndexCount = count;
        this.lastMaxIndexValue = max;
        return max;
    }
    getExpandedIndexBuffer(mode, type, byteOffset, count) {
        const key = `${mode}:${type}:${byteOffset}:${count}`;
        const cached = this.expandedIndexBuffers.get(key);
        if (cached)
            return cached;
        let indices;
        if (mode === WebGL2RenderingContext.TRIANGLE_FAN) {
            indices = new Uint32Array(Math.max(0, count - 2) * 3);
            if (count >= 3) {
                const first = this.readIndex(type, byteOffset);
                for (let i = 0; i < count - 2; i++) {
                    indices[i * 3] = first;
                    indices[i * 3 + 1] = this.readIndex(type, byteOffset + (i + 1) * (type === WebGL2RenderingContext.UNSIGNED_BYTE ? 1 : type === WebGL2RenderingContext.UNSIGNED_SHORT ? 2 : 4));
                    indices[i * 3 + 2] = this.readIndex(type, byteOffset + (i + 2) * (type === WebGL2RenderingContext.UNSIGNED_BYTE ? 1 : type === WebGL2RenderingContext.UNSIGNED_SHORT ? 2 : 4));
                }
            }
        }
        else {
            indices = new Uint32Array(count >= 2 ? count * 2 : 0);
            if (count >= 2) {
                const indexSize = type === WebGL2RenderingContext.UNSIGNED_BYTE ? 1 : type === WebGL2RenderingContext.UNSIGNED_SHORT ? 2 : 4;
                const first = this.readIndex(type, byteOffset);
                let previous = first;
                for (let i = 1; i < count; i++) {
                    const current = this.readIndex(type, byteOffset + i * indexSize);
                    indices[(i - 1) * 2] = previous;
                    indices[(i - 1) * 2 + 1] = current;
                    previous = current;
                }
                indices[(count - 1) * 2] = previous;
                indices[(count - 1) * 2 + 1] = first;
            }
        }
        const buffer = this.device.createBuffer({
            label: `${this.descriptor.label} expanded-${mode}-${type}-${byteOffset}-${count}-v${this.writeVersion}`,
            size: Math.max(4, indices.byteLength),
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        if (indices.byteLength > 0) {
            this.device.queue.writeBuffer(buffer, 0, indices.buffer, indices.byteOffset, indices.byteLength);
        }
        const expanded = { buffer, indexCount: indices.length, format: "uint32" };
        this.expandedIndexBuffers.set(key, expanded);
        return expanded;
    }
    vertexComponent(view, type, byteOffset, normalized) {
        switch (type) {
            case WebGL2RenderingContext.BYTE: {
                const value = view.getInt8(byteOffset);
                return normalized ? Math.max(value / 127, -1) : value;
            }
            case WebGL2RenderingContext.UNSIGNED_BYTE: {
                const value = view.getUint8(byteOffset);
                return normalized ? value / 255 : value;
            }
            case WebGL2RenderingContext.SHORT: {
                const value = view.getInt16(byteOffset, true);
                return normalized ? Math.max(value / 32767, -1) : value;
            }
            case WebGL2RenderingContext.UNSIGNED_SHORT: {
                const value = view.getUint16(byteOffset, true);
                return normalized ? value / 65535 : value;
            }
            case WebGL2RenderingContext.INT:
                return view.getInt32(byteOffset, true);
            case WebGL2RenderingContext.UNSIGNED_INT:
                return view.getUint32(byteOffset, true);
            case WebGL2RenderingContext.HALF_FLOAT: {
                const bits = view.getUint16(byteOffset, true);
                const sign = bits & 0x8000 ? -1 : 1;
                const exponent = (bits >>> 10) & 0x1f;
                const fraction = bits & 0x03ff;
                if (exponent === 0)
                    return sign * Math.pow(2, -14) * (fraction / 1024);
                if (exponent === 0x1f)
                    return fraction ? NaN : sign * Infinity;
                return sign * Math.pow(2, exponent - 15) * (1 + fraction / 1024);
            }
            default:
                return view.getFloat32(byteOffset, true);
        }
    }
    getFloatVertexBuffer(type, size, normalized, webglStride, offset, divisor = 1) {
        const key = `${type}:${size}:${normalized ? 1 : 0}:${webglStride}:${offset}:d${divisor}`;
        const cached = this.convertedVertexBuffers.get(key);
        if (cached)
            return cached;
        const componentBytes = type === WebGL2RenderingContext.BYTE || type === WebGL2RenderingContext.UNSIGNED_BYTE ? 1 :
            type === WebGL2RenderingContext.SHORT || type === WebGL2RenderingContext.UNSIGNED_SHORT || type === WebGL2RenderingContext.HALF_FLOAT ? 2 : 4;
        const elementBytes = size * componentBytes;
        const sourceStride = webglStride || elementBytes;
        const elementCount = this.webglSize < offset + elementBytes
            ? 0
            : Math.floor((this.webglSize - offset - elementBytes) / sourceStride) + 1;
        const repeatCount = Math.max(1, divisor);
        const values = new Float32Array(elementCount * repeatCount * size);
        const sourceView = new DataView(this.shadowData.buffer, this.shadowData.byteOffset, this.shadowData.byteLength);
        for (let element = 0; element < elementCount; element++) {
            const sourceBase = offset + element * sourceStride;
            for (let component = 0; component < size; component++) {
                const value = this.vertexComponent(sourceView, type, sourceBase + component * componentBytes, normalized);
                for (let repeat = 0; repeat < repeatCount; repeat++) {
                    values[(element * repeatCount + repeat) * size + component] = value;
                }
            }
        }
        const format = ["float32", "float32x2", "float32x3", "float32x4"][size - 1];
        const arrayStride = size * 4;
        const buffer = this.device.createBuffer({
            label: `${this.descriptor.label} float-vertex-${key}-v${this.writeVersion}`,
            size: Math.max(4, values.byteLength),
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        if (values.byteLength > 0) {
            this.device.queue.writeBuffer(buffer, 0, values.buffer, values.byteOffset, values.byteLength);
        }
        const converted = { buffer, format, arrayStride, key: `${this.hash}|float:${key}:v${this.writeVersion}` };
        this.convertedVertexBuffers.set(key, converted);
        return converted;
    }
    getDivisorVertexBuffer(arrayStride, divisor, sourceOffset) {
        const key = `${arrayStride}:${divisor}:${sourceOffset}`;
        const cached = this.divisorVertexBuffers.get(key);
        if (cached)
            return cached;
        const sourceByteLength = Math.max(0, this.webglSize - sourceOffset);
        const recordCount = sourceByteLength === 0 ? 0 : Math.ceil(sourceByteLength / arrayStride);
        const expandedByteLength = recordCount * divisor * arrayStride;
        const uploadByteLength = Math.max(4, (expandedByteLength + 3) & ~3);
        const expandedData = new Uint8Array(uploadByteLength);
        for (let record = 0; record < recordCount; record++) {
            const sourceStart = sourceOffset + record * arrayStride;
            const sourceEnd = Math.min(sourceStart + arrayStride, this.webglSize);
            const source = this.shadowData.subarray(sourceStart, sourceEnd);
            for (let repeat = 0; repeat < divisor; repeat++) {
                expandedData.set(source, (record * divisor + repeat) * arrayStride);
            }
        }
        const buffer = this.device.createBuffer({
            label: `${this.descriptor.label} divisor-${divisor}-${arrayStride}-${sourceOffset}-v${this.writeVersion}`,
            size: uploadByteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        if (expandedByteLength > 0) {
            this.device.queue.writeBuffer(buffer, 0, expandedData.buffer, expandedData.byteOffset, uploadByteLength);
        }
        const expanded = {
            buffer,
            key: `${this.hash}|divisor:${arrayStride}:${divisor}:${sourceOffset}:v${this.writeVersion}`,
        };
        this.divisorVertexBuffers.set(key, expanded);
        return expanded;
    }
    getUint16IndexBuffer() {
        if (this.uint16IndexBuffer && this.uint16IndexBufferVersion === this.writeVersion) {
            return this.uint16IndexBuffer;
        }
        const elementCount = this.webglSize;
        const size = Math.max(4, (elementCount * 2 + 3) & ~3);
        const converted = new Uint16Array(size / 2);
        for (let i = 0; i < elementCount; i++) {
            converted[i] = this.shadowData[i];
        }
        this.uint16IndexBuffer = this.device.createBuffer({
            label: `${this.descriptor.label} uint8-to-uint16 v${this.writeVersion}`,
            size,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        if (elementCount > 0) {
            this.device.queue.writeBuffer(this.uint16IndexBuffer, 0, converted.buffer, converted.byteOffset, size);
        }
        this.uint16IndexBufferVersion = this.writeVersion;
        return this.uint16IndexBuffer;
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

;// ./src/components/shaderGlslIdentifiers.ts

const GLSL_310_IDENTIFIER_CONFLICTS = new Set([
    "abs", "acos", "all", "any", "asin", "atan", "ceil", "clamp", "cos", "cosh", "cross",
    "degrees", "determinant", "distance", "dot", "exp", "exp2", "faceforward", "floor", "fwidth",
    "isinf", "isnan", "length", "log", "log2", "max", "min", "modf", "normalize", "pow",
    "radians", "reflect", "refract", "round", "sign", "sin", "sinh", "smoothstep", "sqrt", "step",
    "tan", "tanh", "texture", "transpose", "trunc",
    "layout", "centroid", "smooth", "case", "resource",
    "mat2x2", "mat2x3", "mat2x4", "mat3x2", "mat3x3", "mat3x4", "mat4x2", "mat4x3", "mat4x4",
    "uint", "uvec2", "uvec3", "uvec4",
    "samplerCubeShadow", "sampler2DArray", "sampler2DArrayShadow",
    "isampler2D", "isampler3D", "isamplerCube", "isampler2DArray",
    "usampler2D", "usampler3D", "usamplerCube", "usampler2DArray",
]);
const GLSL_ES100_LANGUAGE_TOKENS = new Set([
    "attribute", "const", "uniform", "varying", "break", "continue", "do", "for", "while",
    "if", "else", "in", "out", "inout", "float", "int", "void", "bool", "true", "false",
    "lowp", "mediump", "highp", "precision", "invariant", "discard", "return", "struct",
    "mat2", "mat3", "mat4", "vec2", "vec3", "vec4", "ivec2", "ivec3", "ivec4",
    "bvec2", "bvec3", "bvec4", "sampler2D", "samplerCube",
]);
const GLSL_PREDEFINED_DUNDER_IDENTIFIERS = new Set([
    "__FILE__",
    "__LINE__",
    "__VERSION__",
]);
function maskComments(source) {
    const masked = source.split("");
    let lineComment = false;
    let blockComment = false;
    for (let index = 0; index < source.length; index++) {
        const ch = source[index];
        const next = source[index + 1];
        if (lineComment) {
            if (ch === "\n")
                lineComment = false;
            else
                masked[index] = " ";
            continue;
        }
        if (blockComment) {
            if (ch === "*" && next === "/") {
                masked[index] = " ";
                masked[index + 1] = " ";
                blockComment = false;
                index++;
            }
            else if (ch !== "\n") {
                masked[index] = " ";
            }
            continue;
        }
        if (ch === "/" && next === "/") {
            masked[index] = " ";
            masked[index + 1] = " ";
            lineComment = true;
            index++;
        }
        else if (ch === "/" && next === "*") {
            masked[index] = " ";
            masked[index + 1] = " ";
            blockComment = true;
            index++;
        }
    }
    return masked.join("");
}
function isTopLevelAt(source, index) {
    let braceDepth = 0;
    let parenDepth = 0;
    for (let cursor = 0; cursor < index; cursor++) {
        if (source[cursor] === "{")
            braceDepth++;
        else if (source[cursor] === "}")
            braceDepth = Math.max(0, braceDepth - 1);
        else if (source[cursor] === "(")
            parenDepth++;
        else if (source[cursor] === ")")
            parenDepth = Math.max(0, parenDepth - 1);
    }
    return braceDepth === 0 && parenDepth === 0;
}
function shaderGlslIdentifiers_escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function renameUserDefinedFunctions(source) {
    const masked = maskComments(source);
    const names = new Set();
    const signature = /(?:^|[;}\n])\s*(?:(?:lowp|mediump|highp)\s+)?[A-Za-z_]\w*\s+([A-Za-z_]\w*)\s*\(/gm;
    for (let match = signature.exec(masked); match !== null; match = signature.exec(masked)) {
        const name = match[1];
        const nameOffset = match.index + match[0].lastIndexOf(name);
        if (name !== "main" && isTopLevelAt(masked, nameOffset))
            names.add(name);
    }
    if (names.size === 0)
        return source;
    const alternatives = Array.from(names)
        .sort((left, right) => right.length - left.length)
        .map(shaderGlslIdentifiers_escapeRegExp)
        .join("|");
    const call = new RegExp(`\\b(?:${alternatives})\\b(?=\\s*\\()`, "g");
    let result = "";
    let cursor = 0;
    for (let match = call.exec(masked); match !== null; match = call.exec(masked)) {
        let previous = match.index - 1;
        while (previous >= 0 && /\s/.test(masked[previous]))
            previous--;
        if (previous >= 0 && masked[previous] === ".")
            continue;
        result += source.slice(cursor, match.index);
        result += `_hyd_user_${match[0]}`;
        cursor = call.lastIndex;
    }
    return cursor === 0 ? source : result + source.slice(cursor);
}
function bridgeGlslIdentifier(name) {
    if (GLSL_310_IDENTIFIER_CONFLICTS.has(name) || isReservedWgslIdentifier(name)) {
        return `hydgl2gpu_id_${name}`;
    }
    return bridgeGlslDunderIdentifier(name);
}
function bridgeGlslDunderIdentifier(name) {
    if (!name.includes("__") || name.startsWith("gl_") || GLSL_PREDEFINED_DUNDER_IDENTIFIERS.has(name))
        return name;
    let hash = 0x811c9dc5;
    for (let index = 0; index < name.length; index++) {
        hash ^= name.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    const readableName = name.replace(/_+/g, "_").replace(/^_+|_+$/g, "") || "identifier";
    return `hydgl2gpu_dunder_${readableName}_${(hash >>> 0).toString(36)}`;
}
function bridgeIdentifiers(source, includeEs310Conflicts) {
    const masked = maskComments(source);
    const structTypes = new Set();
    const structPattern = /\bstruct\s+([A-Za-z_]\w*)/g;
    for (let match = structPattern.exec(masked); match !== null; match = structPattern.exec(masked)) {
        if (bridgeGlslIdentifier(match[1]) !== match[1])
            structTypes.add(match[1]);
    }
    const identifier = /\b[A-Za-z_]\w*\b/g;
    let out = "";
    let cursor = 0;
    for (let match = identifier.exec(masked); match !== null; match = identifier.exec(masked)) {
        const name = match[0];
        const dunder = bridgeGlslDunderIdentifier(name) !== name;
        const versionConflict = includeEs310Conflicts &&
            !GLSL_ES100_LANGUAGE_TOKENS.has(name) &&
            bridgeGlslIdentifier(name) !== name;
        if (!dunder && !versionConflict)
            continue;
        let next = identifier.lastIndex;
        while (next < masked.length && /\s/.test(masked[next]))
            next++;
        if (!dunder && masked[next] === "(" && !structTypes.has(name))
            continue;
        out += source.slice(cursor, match.index);
        out += bridgeGlslIdentifier(name);
        cursor = identifier.lastIndex;
    }
    return cursor === 0 ? source : out + source.slice(cursor);
}
function bridgeGlslEs100Identifiers(source) {
    return bridgeIdentifiers(source, true);
}
function bridgeGlslDunderIdentifiers(source) {
    return bridgeIdentifiers(source, false);
}

;// ./src/components/hydWebGLStatic.ts












const hydWebGLStatic_NATIVE_CANVAS_GET_CONTEXT = HTMLCanvasElement.prototype.getContext;
const hydWebGLStatic_GL_SRGB_EXT = 0x8C40;
const hydWebGLStatic_GL_SRGB_ALPHA_EXT = 0x8C42;
const GL_SRGB8_ALPHA8_EXT = 0x8C43;
const GL_FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING_EXT = 0x8210;
const RENDER_PASS_DESCRIPTOR_CALLBACK = Symbol("renderPassDescriptorCallback");
let validationWebGl1 = null;
let validationWebGl2 = null;
const hydCanvasContexts = new WeakMap();
let canvasReadHooksInstalled = false;
let straightAlphaCanvasScratch;
let synchronousReadbackScratch;
function getSynchronousReadbackScratch() {
    if (synchronousReadbackScratch?.gl.isContextLost())
        synchronousReadbackScratch = undefined;
    if (synchronousReadbackScratch === undefined) {
        const canvas = document.createElement("canvas");
        const gl = hydWebGLStatic_NATIVE_CANVAS_GET_CONTEXT.call(canvas, "webgl2", {
            alpha: true,
            antialias: false,
            premultipliedAlpha: true,
            preserveDrawingBuffer: true,
        });
        const texture = gl?.createTexture() || null;
        const framebuffer = gl?.createFramebuffer() || null;
        synchronousReadbackScratch = gl && texture && framebuffer
            ? { canvas, gl, texture, framebuffer }
            : null;
    }
    return synchronousReadbackScratch;
}
function prepareStraightAlphaCanvas(pixels, width, height) {
    if (straightAlphaCanvasScratch === undefined) {
        const canvas = document.createElement("canvas");
        const gl = hydWebGLStatic_NATIVE_CANVAS_GET_CONTEXT.call(canvas, "webgl2", {
            alpha: true,
            antialias: false,
            premultipliedAlpha: false,
            preserveDrawingBuffer: true,
        });
        const texture = gl?.createTexture() || null;
        const framebuffer = gl?.createFramebuffer() || null;
        straightAlphaCanvasScratch = gl && texture && framebuffer
            ? { canvas, gl, texture, framebuffer }
            : null;
    }
    const scratch = straightAlphaCanvasScratch;
    if (!scratch)
        return null;
    const { canvas, gl, texture, framebuffer } = scratch;
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.finish();
    return gl.getError() === gl.NO_ERROR ? canvas : null;
}
function installCanvasReadHooks() {
    if (canvasReadHooksInstalled)
        return;
    canvasReadHooksInstalled = true;
    if (typeof CanvasRenderingContext2D !== "undefined") {
        const nativeDrawImage = CanvasRenderingContext2D.prototype.drawImage;
        CanvasRenderingContext2D.prototype.drawImage = function (...args) {
            let source = args[0];
            if (typeof HTMLCanvasElement !== "undefined" && source instanceof HTMLCanvasElement) {
                source = hydCanvasContexts.get(source)?.prepareCanvasForExternalRead() || source;
                args[0] = source;
            }
            return nativeDrawImage.apply(this, args);
        };
    }
    const nativeToDataUrl = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (...args) {
        const source = hydCanvasContexts.get(this)?.prepareCanvasForExternalRead() || this;
        return nativeToDataUrl.apply(source, args);
    };
    const nativeToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (...args) {
        const source = hydCanvasContexts.get(this)?.prepareCanvasForExternalRead() || this;
        return nativeToBlob.apply(source, args);
    };
}
function createNativeValidationContext(type) {
    const canvas = document.createElement("canvas");
    const attributes = { alpha: false, antialias: false, depth: false, stencil: false };
    return (hydWebGLStatic_NATIVE_CANVAS_GET_CONTEXT.call(canvas, type, attributes) ||
        (type === "webgl" ? hydWebGLStatic_NATIVE_CANVAS_GET_CONTEXT.call(canvas, "experimental-webgl", attributes) : null));
}
function nativeValidationContext(type) {
    if (type === "webgl2") {
        if (!validationWebGl2 || validationWebGl2.isContextLost()) {
            validationWebGl2 = createNativeValidationContext("webgl2");
        }
        return validationWebGl2;
    }
    if (!validationWebGl1 || validationWebGl1.isContextLost()) {
        validationWebGl1 = createNativeValidationContext("webgl");
    }
    return validationWebGl1;
}
const frameBeginFuncLst = [];
const frameEndFuncList = [];
const VALID_PIXEL_ALIGNMENT = new Set([1, 2, 4, 8]);
const SUPPORTED_EXTENSION_NAMES = [
    "ANGLE_instanced_arrays",
    "OES_element_index_uint",
    "EXT_sRGB",
];
const SUPPORTED_EXTENSION_BY_LOWER_NAME = new Map(SUPPORTED_EXTENSION_NAMES.map((name) => [name.toLowerCase(), name]));
const VALID_DRAW_MODES = new Set([
    WebGL2RenderingContext.POINTS,
    WebGL2RenderingContext.LINES,
    WebGL2RenderingContext.LINE_LOOP,
    WebGL2RenderingContext.LINE_STRIP,
    WebGL2RenderingContext.TRIANGLES,
    WebGL2RenderingContext.TRIANGLE_STRIP,
    WebGL2RenderingContext.TRIANGLE_FAN,
]);
let frameDepth = 0;
let autoFrameScheduled = false;
function isBufferSource(value) {
    if (ArrayBuffer.isView(value))
        return true;
    if (value instanceof ArrayBuffer)
        return true;
    const SharedArrayBufferConstructor = globalThis.SharedArrayBuffer;
    return Boolean(SharedArrayBufferConstructor && value instanceof SharedArrayBufferConstructor);
}
function toWebGlInt32(value) {
    return Number(value) >> 0;
}
function toWebGlInt64(value) {
    const converted = Number(value);
    return Number.isFinite(converted) ? Math.trunc(converted) : 0;
}
function clampWebGlUnitFloat(value) {
    if (Number.isNaN(value))
        return 0;
    return Math.min(1, Math.max(0, value));
}
function isWebGlIdentifierName(name, allowUniformPath = false) {
    if (!allowUniformPath)
        return /^[A-Za-z_]\w*$/.test(name);
    return /^[A-Za-z_]\w*(?:(?:\[\d+\])|(?:\.[A-Za-z_]\w*))*$/.test(name);
}
function isVisibleActiveUniform(uniform) {
    return !uniform.internal || Boolean(uniform.sourceName?.startsWith("gl_"));
}
function mixesConstantColorAndAlpha(first, second) {
    const color = first === WebGL2RenderingContext.CONSTANT_COLOR ||
        first === WebGL2RenderingContext.ONE_MINUS_CONSTANT_COLOR ||
        second === WebGL2RenderingContext.CONSTANT_COLOR ||
        second === WebGL2RenderingContext.ONE_MINUS_CONSTANT_COLOR;
    const alpha = first === WebGL2RenderingContext.CONSTANT_ALPHA ||
        first === WebGL2RenderingContext.ONE_MINUS_CONSTANT_ALPHA ||
        second === WebGL2RenderingContext.CONSTANT_ALPHA ||
        second === WebGL2RenderingContext.ONE_MINUS_CONSTANT_ALPHA;
    return color && alpha;
}
function vertexComponentByteSize(type) {
    switch (type) {
        case WebGL2RenderingContext.BYTE:
        case WebGL2RenderingContext.UNSIGNED_BYTE:
            return 1;
        case WebGL2RenderingContext.SHORT:
        case WebGL2RenderingContext.UNSIGNED_SHORT:
        case WebGL2RenderingContext.HALF_FLOAT:
            return 2;
        case WebGL2RenderingContext.INT:
        case WebGL2RenderingContext.UNSIGNED_INT:
        case WebGL2RenderingContext.FLOAT:
            return 4;
        default:
            return 0;
    }
}
function vertexFormatNeedsFloatConversion(type, size, normalized) {
    if (type === WebGL2RenderingContext.FLOAT)
        return false;
    if (type === WebGL2RenderingContext.HALF_FLOAT)
        return size !== 2 && size !== 4;
    if (type === WebGL2RenderingContext.INT || type === WebGL2RenderingContext.UNSIGNED_INT)
        return true;
    return !normalized || (size !== 2 && size !== 4);
}
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
    [RENDER_PASS_DESCRIPTOR_CALLBACK];
    hydLastCanvasSize = [-1, -1];
    canvasSizeDirty = true;
    maxDrawingBufferDimension;
    hydMaxUniSize;
    hydCanvas;
    hydGpuctx;
    hydDevice;
    hydUniArr;
    hydUniBuf;
    hydUniOff = 0;
    hydWrapper;
    hydContextType;
    hydGlobalState;
    hydRpCache;
    shaderTranslator;
    triangleFanIndexBuffers = new Map();
    lineLoopIndexBuffers = new Map();
    hydTextureObjects = new WeakMap();
    hydBufferObjects = new WeakMap();
    contextToken = {};
    maskedClearPipelines = new Map();
    maskedClearUniformBuffer = null;
    samplerOriginStateVersion = 0;
    gpuViewportDirty = true;
    gpuScissorDirty = true;
    lastDrawPbv = null;
    pendingReadbacks = [];
    activeUniformBuffers = [];
    activeUniformSamplers = [];
    currentProgramValid = false;
    synchronousReadbackCanvas = null;
    synchronousReadbackContext = null;
    synchronousSnapshotCanvas = null;
    synchronousSnapshotContext = null;
    snapshotRgbPipeline = null;
    snapshotAlphaPipeline = null;
    exactExternalReadCanvas = null;
    exactExternalReadContext = null;
    defaultFramebufferBackingTexture = null;
    defaultFramebufferBackingView = null;
    useDefaultFramebufferBacking = true;
    defaultFramebufferBackingNeedsPresentation = false;
    defaultFramebufferNeedsImplicitClear = true;
    canvasPresentationPipeline = null;
    canvasPresentationBindGroup = null;
    enabledExtensions = new Set();
    extensionObjects = new Map();
    drawValidationCache = new WeakMap();
    indexedDrawCache = new WeakMap();
    arrayDrawCache = new WeakMap();
    lastIndexedDraw = null;
    lastArrayDraw = null;
    get unpackColorSpace() {
        return this.hydGlobalState?.miscState.unpackColorSpace || "srgb";
    }
    set unpackColorSpace(value) {
        if ((value === "srgb" || value === "display-p3") && this.hydGlobalState) {
            this.hydGlobalState.miscState.unpackColorSpace = value;
        }
    }
    getSnapshotPipeline(channel) {
        const cached = channel === "rgb" ? this.snapshotRgbPipeline : this.snapshotAlphaPipeline;
        if (cached)
            return cached;
        const module = this.hydDevice.createShaderModule({
            label: "lossless texture snapshot shader",
            code: `
@group(0) @binding(0) var source : texture_2d<f32>;

@vertex
fn vertexMain(@builtin(vertex_index) index : u32) -> @builtin(position) vec4f {
  let positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  return vec4f(positions[index], 0.0, 1.0);
}

@fragment
fn fragmentRgb(@builtin(position) position : vec4f) -> @location(0) vec4f {
  let color = textureLoad(source, vec2i(position.xy), 0);
  return vec4f(color.rgb, 1.0);
}

@fragment
fn fragmentAlpha(@builtin(position) position : vec4f) -> @location(0) vec4f {
  let color = textureLoad(source, vec2i(position.xy), 0);
  return vec4f(color.aaa, 1.0);
}
`,
        });
        const pipeline = this.hydDevice.createRenderPipeline({
            label: `lossless ${channel} texture snapshot pipeline`,
            layout: "auto",
            vertex: { module, entryPoint: "vertexMain" },
            fragment: {
                module,
                entryPoint: channel === "rgb" ? "fragmentRgb" : "fragmentAlpha",
                targets: [{ format: "bgra8unorm" }],
            },
            primitive: { topology: "triangle-list" },
        });
        if (channel === "rgb") {
            this.snapshotRgbPipeline = pipeline;
        }
        else {
            this.snapshotAlphaPipeline = pipeline;
        }
        return pipeline;
    }
    snapshotTextureChannel(texture, width, height, channel, mipLevel = 0, layer = 0, viewFormat) {
        if (typeof OffscreenCanvas === "undefined")
            return null;
        if (!this.synchronousSnapshotCanvas) {
            this.synchronousSnapshotCanvas = new OffscreenCanvas(width, height);
            this.synchronousSnapshotContext = this.synchronousSnapshotCanvas.getContext("webgpu");
        }
        const canvas = this.synchronousSnapshotCanvas;
        const context = this.synchronousSnapshotContext;
        if (!context)
            return null;
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        context.configure({
            device: this.hydDevice,
            format: "bgra8unorm",
            alphaMode: "opaque",
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
        const pipeline = this.getSnapshotPipeline(channel);
        const sourceView = texture.createView({
            dimension: "2d",
            format: viewFormat,
            baseMipLevel: mipLevel,
            mipLevelCount: 1,
            baseArrayLayer: layer,
            arrayLayerCount: 1,
        });
        const bindGroup = this.hydDevice.createBindGroup({
            label: `lossless ${channel} texture snapshot bind group`,
            layout: pipeline.getBindGroupLayout(0),
            entries: [{ binding: 0, resource: sourceView }],
        });
        const encoder = this.hydDevice.createCommandEncoder({ label: `synchronous ${channel} texture snapshot` });
        const pass = encoder.beginRenderPass({
            label: `synchronous ${channel} texture snapshot pass`,
            colorAttachments: [{
                    view: context.getCurrentTexture().createView(),
                    loadOp: "clear",
                    storeOp: "store",
                    clearValue: [0, 0, 0, 1],
                }],
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();
        this.hydDevice.queue.submit([encoder.finish()]);
        return canvas.transferToImageBitmap();
    }
    increaseOk() {
    }
    decreaseOk() {
    }
    get wrapperContext() {
        return this.hydWrapper;
    }
    get drawingBufferWidth() {
        if (this.canvasSizeDirty)
            this.updateCanvasSize();
        return Math.max(1, Math.min(this.hydCanvas.width, this.maxDrawingBufferDimension));
    }
    get drawingBufferHeight() {
        if (this.canvasSizeDirty)
            this.updateCanvasSize();
        return Math.max(1, Math.min(this.hydCanvas.height, this.maxDrawingBufferDimension));
    }
    get drawingBufferFormat() {
        return this.hydGlobalState.contextAttributes.alpha === false
            ? WebGL2RenderingContext.RGB8
            : WebGL2RenderingContext.RGBA8;
    }
    canvasExceedsDrawingBufferLimit() {
        return this.hydCanvas.width > this.maxDrawingBufferDimension ||
            this.hydCanvas.height > this.maxDrawingBufferDimension;
    }
    clampCanvasToDrawingBufferLimit() {
        const canvas = this.hydCanvas;
        for (const property of ["width", "height"]) {
            const value = canvas[property];
            if (value <= this.maxDrawingBufferDimension)
                continue;
            const descriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, property);
            descriptor?.set?.call(canvas, this.maxDrawingBufferDimension);
        }
    }
    installCanvasSizeTracking() {
        const canvas = this.hydCanvas;
        for (const property of ["width", "height"]) {
            const descriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, property);
            if (!descriptor?.get || !descriptor.set)
                continue;
            try {
                Object.defineProperty(canvas, property, {
                    configurable: true,
                    enumerable: descriptor.enumerable,
                    get: () => descriptor.get.call(canvas),
                    set: (value) => {
                        const previous = descriptor.get.call(canvas);
                        if (Number(value) === previous)
                            return;
                        this.discardPendingCanvasCommands();
                        descriptor.set.call(canvas, value);
                        if (descriptor.get.call(canvas) !== previous) {
                            this.canvasSizeDirty = true;
                            if (this.hydGlobalState) {
                                this.hydGlobalState.drawingBufferGeneration++;
                                this.hydGlobalState.recordTransition("canvasResize", this.hydGlobalState.drawingBufferGeneration);
                            }
                        }
                    },
                });
            }
            catch (_) {
            }
        }
    }
    discardPendingCanvasCommands() {
        if (!this.hydRpCache)
            return;
        this.hydRpCache.CeDiscardAndReset();
        this.hydUniOff = 0;
        this.lastDrawPbv = null;
        if (this.hydGlobalState)
            this.hydGlobalState.clearState.target = 0;
    }
    setObjectValidationError(...objects) {
        const foreignObject = objects.some((object) => object && object.ownerToken && object.ownerToken !== this.contextToken);
        const deletedObject = objects.some((object) => object && object.deleted === true);
        this.hydGlobalState.setError(foreignObject || deletedObject
            ? WebGL2RenderingContext.INVALID_OPERATION
            : WebGL2RenderingContext.INVALID_VALUE);
    }
    setShaderProgramValidationError(...objects) {
        const foreignObject = objects.some((object) => object && object.ownerToken && object.ownerToken !== this.contextToken);
        this.hydGlobalState.setError(foreignObject
            ? WebGL2RenderingContext.INVALID_OPERATION
            : WebGL2RenderingContext.INVALID_VALUE);
    }
    regenerateDS(label, format, compareFunc, bindPoint, width, height) {
        const texture = new HydTexture(this.hydDevice);
        texture.label = label;
        texture.state.compare = compareFunc;
        texture.renderbufferStorage(format, width, height);
        texture.viewDimension = '2d';
        this.hydGlobalState.defaultFramebuffer.attachments.set(bindPoint, new FramebufferAttributes(bindPoint, undefined, undefined, texture, undefined, WebGL2RenderingContext.RENDERBUFFER));
        this.hydGlobalState.defaultFramebuffer.resetHash();
    }
    shouldUseDefaultFramebufferBacking() {
        return this.useDefaultFramebufferBacking ||
            this.hydGlobalState.contextAttributes.preserveDrawingBuffer === true ||
            this.hydGlobalState.contextAttributes.premultipliedAlpha === false ||
            !this.hydCanvas.isConnected;
    }
    shouldKeepDefaultFramebufferBackingAcrossResize() {
        return this.useDefaultFramebufferBacking ||
            this.hydGlobalState.contextAttributes.preserveDrawingBuffer === true ||
            this.hydGlobalState.contextAttributes.premultipliedAlpha === false;
    }
    createDefaultFramebufferBacking() {
        const width = this.hydCanvas.width;
        const height = this.hydCanvas.height;
        if (width <= 0 || height <= 0)
            return;
        this.defaultFramebufferBackingTexture?.destroy();
        this.defaultFramebufferBackingTexture = this.hydDevice.createTexture({
            label: `defaultFramebufferBacking ${width}x${height}`,
            size: { width, height, depthOrArrayLayers: 1 },
            format: "bgra8unorm",
            usage: GPUTextureUsage.RENDER_ATTACHMENT |
                GPUTextureUsage.COPY_SRC |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.TEXTURE_BINDING,
        });
        this.defaultFramebufferBackingView = this.defaultFramebufferBackingTexture.createView({
            label: `defaultFramebufferBackingView ${width}x${height}`,
        });
        this.defaultFramebufferBackingNeedsPresentation = false;
        this.canvasPresentationBindGroup = null;
    }
    getCanvasPresentationPipeline() {
        if (this.canvasPresentationPipeline)
            return this.canvasPresentationPipeline;
        const module = this.hydDevice.createShaderModule({
            label: "straight-alpha canvas presentation shader",
            code: `
@group(0) @binding(0) var source : texture_2d<f32>;

@vertex
fn vertexMain(@builtin(vertex_index) index : u32) -> @builtin(position) vec4f {
  let positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  return vec4f(positions[index], 0.0, 1.0);
}

@fragment
fn fragmentMain(@builtin(position) position : vec4f) -> @location(0) vec4f {
  let color = textureLoad(source, vec2i(position.xy), 0);
  return vec4f(color.rgb * color.a, color.a);
}
`,
        });
        this.canvasPresentationPipeline = this.hydDevice.createRenderPipeline({
            label: "straight-alpha canvas presentation pipeline",
            layout: "auto",
            vertex: { module, entryPoint: "vertexMain" },
            fragment: {
                module,
                entryPoint: "fragmentMain",
                targets: [{ format: "bgra8unorm" }],
            },
            primitive: { topology: "triangle-list" },
        });
        return this.canvasPresentationPipeline;
    }
    activateDefaultFramebufferBacking(preserveCurrentContents) {
        if (this.defaultFramebufferBackingTexture) {
            this.useDefaultFramebufferBacking = true;
            this.hydGlobalState.__canvasTexture = this.defaultFramebufferBackingTexture;
            this.hydGlobalState.__canvasView = this.defaultFramebufferBackingView;
            return;
        }
        const currentTexture = this.hydGlobalState.__canvasTexture;
        this.createDefaultFramebufferBacking();
        if (!this.defaultFramebufferBackingTexture)
            return;
        if (preserveCurrentContents && currentTexture && currentTexture !== this.defaultFramebufferBackingTexture) {
            const encoder = this.hydDevice.createCommandEncoder({ label: "preserve default framebuffer" });
            encoder.copyTextureToTexture({ texture: currentTexture }, { texture: this.defaultFramebufferBackingTexture }, {
                width: this.hydCanvas.width,
                height: this.hydCanvas.height,
                depthOrArrayLayers: 1,
            });
            this.hydDevice.queue.submit([encoder.finish()]);
        }
        this.useDefaultFramebufferBacking = true;
        this.hydGlobalState.__canvasTexture = this.defaultFramebufferBackingTexture;
        this.hydGlobalState.__canvasView = this.defaultFramebufferBackingView;
    }
    presentDefaultFramebufferBacking() {
        if (!this.defaultFramebufferBackingTexture || !this.defaultFramebufferBackingNeedsPresentation ||
            this.hydCanvas.width <= 0 || this.hydCanvas.height <= 0)
            return;
        const canvasTexture = this.hydGpuctx.getCurrentTexture();
        const encoder = this.hydDevice.createCommandEncoder({ label: "present default framebuffer backing" });
        const needsPremultiply = this.hydGlobalState.contextAttributes.alpha !== false &&
            this.hydGlobalState.contextAttributes.premultipliedAlpha === false;
        if (needsPremultiply) {
            const pipeline = this.getCanvasPresentationPipeline();
            if (!this.canvasPresentationBindGroup) {
                this.canvasPresentationBindGroup = this.hydDevice.createBindGroup({
                    label: "straight-alpha canvas presentation bind group",
                    layout: pipeline.getBindGroupLayout(0),
                    entries: [{ binding: 0, resource: this.defaultFramebufferBackingView }],
                });
            }
            const pass = encoder.beginRenderPass({
                label: "straight-alpha canvas presentation pass",
                colorAttachments: [{
                        view: canvasTexture.createView(),
                        loadOp: "clear",
                        storeOp: "store",
                        clearValue: [0, 0, 0, 0],
                    }],
            });
            pass.setPipeline(pipeline);
            pass.setBindGroup(0, this.canvasPresentationBindGroup);
            pass.draw(3);
            pass.end();
        }
        else {
            encoder.copyTextureToTexture({ texture: this.defaultFramebufferBackingTexture }, { texture: canvasTexture }, {
                width: this.hydCanvas.width,
                height: this.hydCanvas.height,
                depthOrArrayLayers: 1,
            });
        }
        this.hydDevice.queue.submit([encoder.finish()]);
        this.defaultFramebufferBackingNeedsPresentation = false;
    }
    prepareDefaultFramebufferForExternalRead() {
        if (this.canvasSizeDirty) {
            this.updateCanvasSize();
        }
        const hasGpuSource = Boolean(this.hydGlobalState.__canvasTexture || this.defaultFramebufferBackingTexture);
        this._der_flush();
        if (!hasGpuSource)
            return false;
        this.activateDefaultFramebufferBacking(true);
        this.materializeImplicitDefaultFramebufferClear();
        this._der_flush();
        this.presentDefaultFramebufferBacking();
        return Boolean(this.defaultFramebufferBackingTexture);
    }
    prepareCanvasForExternalRead() {
        if (this.canvasSizeDirty)
            this.updateCanvasSize();
        const hasGpuSource = Boolean(this.hydGlobalState.__canvasTexture || this.defaultFramebufferBackingTexture);
        this._der_flush();
        if (!hasGpuSource)
            return this.hydCanvas;
        this.activateDefaultFramebufferBacking(Boolean(this.hydGlobalState.__canvasTexture));
        this.materializeImplicitDefaultFramebufferClear();
        this._der_flush();
        const snapshot = this.prepareExactExternalReadCanvas();
        if (snapshot)
            return snapshot;
        this.presentDefaultFramebufferBacking();
        return this.hydCanvas;
    }
    prepareCanvasForTextureUpload() {
        if (!this.prepareDefaultFramebufferForExternalRead())
            return this.hydCanvas;
        return this.prepareExactExternalReadCanvas() || this.hydCanvas;
    }
    materializeImplicitDefaultFramebufferClear() {
        if (!this.defaultFramebufferNeedsImplicitClear || !this.defaultFramebufferBackingTexture)
            return;
        this.defaultFramebufferNeedsImplicitClear = false;
        const clearState = this.hydGlobalState.clearState;
        const savedTarget = clearState.target;
        const savedColor = clearState.color;
        const savedDepth = clearState.depth;
        const savedStencil = clearState.stencil;
        clearState.target = WebGL2RenderingContext.COLOR_BUFFER_BIT |
            (this.hydGlobalState.contextAttributes.depth === false ? 0 : WebGL2RenderingContext.DEPTH_BUFFER_BIT) |
            (this.hydGlobalState.contextAttributes.stencil === true ? WebGL2RenderingContext.STENCIL_BUFFER_BIT : 0);
        clearState.color = [0, 0, 0, 0];
        clearState.depth = 1;
        clearState.stencil = 0;
        this.defaultFramebufferBackingNeedsPresentation = true;
        this.hydRpCache.RpClear(this[RENDER_PASS_DESCRIPTOR_CALLBACK]);
        clearState.target = savedTarget;
        clearState.color = savedColor;
        clearState.depth = savedDepth;
        clearState.stencil = savedStencil;
    }
    updateCanvasSize() {
        if (this.canvasExceedsDrawingBufferLimit())
            this.clampCanvasToDrawingBufferLimit();
        const width = this.hydCanvas.width;
        const height = this.hydCanvas.height;
        if (!this.canvasSizeDirty && this.hydLastCanvasSize[0] === width && this.hydLastCanvasSize[1] === height) {
            return;
        }
        if (width <= 0 || height <= 0) {
            this.discardPendingCanvasCommands();
            this.defaultFramebufferBackingTexture?.destroy();
            this.defaultFramebufferBackingTexture = null;
            this.defaultFramebufferBackingView = null;
            this.defaultFramebufferBackingNeedsPresentation = false;
            this.canvasPresentationBindGroup = null;
            this.hydGlobalState.__canvasTexture = null;
            this.hydGlobalState.__canvasView = null;
            this.hydLastCanvasSize = [width, height];
            this.canvasSizeDirty = false;
            return;
        }
        const initialSize = this.hydLastCanvasSize[0] < 0 || this.hydLastCanvasSize[1] < 0;
        if (this.hydRpCache && !initialSize) {
            this.hydRpCache.CeDiscardAndReset();
            this.hydUniOff = 0;
            this.lastDrawPbv = null;
            this.hydGlobalState.clearState.target = 0;
        }
        if (initialSize) {
            this.hydGlobalState.miscState.scissorBox = [0, 0, width, height];
            this.hydGlobalState.commonState.viewport = [0, 0, width, height, 0, 1];
            this.gpuViewportDirty = true;
            this.gpuScissorDirty = true;
        }
        try {
            this.hydGlobalState.defaultFramebuffer.attachments.get(WebGL2RenderingContext.DEPTH_ATTACHMENT).attachment.destroy();
            this.hydGlobalState.defaultFramebuffer.attachments.get(WebGL2RenderingContext.STENCIL_ATTACHMENT).attachment.destroy();
            this.hydGlobalState.defaultFramebuffer.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT).attachment.destroy();
        }
        catch (error) {
        }
        this.defaultFramebufferBackingTexture?.destroy();
        this.defaultFramebufferBackingTexture = null;
        this.defaultFramebufferBackingView = null;
        this.defaultFramebufferBackingNeedsPresentation = false;
        this.canvasPresentationBindGroup = null;
        this.hydLastCanvasSize = [width, height];
        this.canvasSizeDirty = false;
        this.regenerateDS(`defaultDepthBuffer ${width} ${height}`, 'depth32float', this.hydGlobalState.depthState.func, WebGL2RenderingContext.DEPTH_ATTACHMENT, width, height);
        this.regenerateDS(`defaultStencilBuffer ${width} ${height}`, 'stencil8', this.hydGlobalState.stencilState.frontFunc, WebGL2RenderingContext.STENCIL_ATTACHMENT, width, height);
        this.regenerateDS(`defaultDepthStencilBuffer ${width} ${height}`, 'depth24plus-stencil8', this.hydGlobalState.depthState.func, WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT, width, height);
        if (this.shouldKeepDefaultFramebufferBackingAcrossResize()) {
            this.createDefaultFramebufferBacking();
            this.useDefaultFramebufferBacking = true;
            this.hydGlobalState.__canvasTexture = this.defaultFramebufferBackingTexture;
            this.hydGlobalState.__canvasView = this.defaultFramebufferBackingView;
        }
        else {
            this.hydGlobalState.__canvasTexture = this.hydGpuctx.getCurrentTexture();
            this.hydGlobalState.__canvasView = this.hydGlobalState.__canvasTexture.createView({ label: 'canvasView resized' });
        }
        this.defaultFramebufferNeedsImplicitClear = true;
    }
    constructor(_canvas, _gpuctx, _attributes, _device, _maxUniformSize, _replay, shaderTranslator, contextType = "webgl") {
        this.shaderTranslator = shaderTranslator;
        this.hydContextType = contextType;
        this.hydMaxUniSize = _maxUniformSize;
        this.hydCanvas = _canvas;
        this.maxDrawingBufferDimension = _device.limits.maxTextureDimension2D;
        this.installCanvasSizeTracking();
        hydCanvasContexts.set(this.hydCanvas, this);
        installCanvasReadHooks();
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
        const contextPrototype = contextType === "webgl2"
            ? WebGL2RenderingContext.prototype
            : WebGLRenderingContext.prototype;
        for (const propertyName in hydWebGLConstants) {
            if (!(propertyName in contextPrototype))
                continue;
            if (!Object.prototype.hasOwnProperty.call(HydWebGLStatic.prototype, propertyName)) {
                Object.defineProperty(HydWebGLStatic.prototype, propertyName, {
                    configurable: true,
                    enumerable: true,
                    value: hydWebGLConstants[propertyName],
                    writable: false,
                });
            }
            Object.defineProperty(this, propertyName, {
                configurable: true,
                enumerable: true,
                value: hydWebGLConstants[propertyName],
                writable: false,
            });
        }
        this['canvas'] = _canvas;
        this['drawingBufferColorSpace'] = 'srgb';
        this.hydWrapper = this;
        this.hydGlobalState = new HydGlobalStateHashed(_attributes, this.hydUniBuf, _device, this.hydContextType === "webgl2" ? 2 : 1);
        if (!this.shouldUseDefaultFramebufferBacking() && this.hydCanvas.width > 0 && this.hydCanvas.height > 0) {
            this.hydGlobalState.__canvasTexture = this.hydGpuctx.getCurrentTexture();
            this.hydGlobalState.__canvasView = this.hydGlobalState.__canvasTexture.createView({ label: 'initial canvasView' });
        }
        this[RENDER_PASS_DESCRIPTOR_CALLBACK] = this.hydGlobalState.getRenderPassDescriptor.bind(this.hydGlobalState);
        frameBeginFuncLst.push(this._frameStart.bind(this));
        frameEndFuncList.push(this._frameEnd.bind(this));
        this.hydRpCache = new HydRenderPassCache(this.hydDevice);
        this.updateCanvasSize();
        const publicOwnProperties = new Set(["canvas", "drawingBufferColorSpace", "drawingBufferFormat", "unpackColorSpace", ...Object.keys(hydWebGLConstants)]);
        for (const propertyName of Object.keys(this)) {
            if (publicOwnProperties.has(propertyName))
                continue;
            Object.defineProperty(this, propertyName, { enumerable: false });
        }
    }
    flushUniforms() {
        if (this.hydUniOff > 0) {
            this.hydDevice.queue.writeBuffer(this.hydUniBuf, 0, this.hydUniArr.buffer, 0, this.hydUniOff);
            this.hydUniOff = 0;
        }
    }
    materializePendingClear() {
        if (this.hydGlobalState.clearState.target === 0 || this.hydRpCache.hasActiveRenderPass()) {
            return;
        }
        this.ensureDefaultFramebufferRenderTarget();
        this.hydRpCache.RpClear(this[RENDER_PASS_DESCRIPTOR_CALLBACK]);
        this.hydGlobalState.clearState.target = 0;
        this.hydGlobalState.recordTransitionOne('!!d0');
    }
    _der_flush() {
        this.materializePendingClear();
        this.flushUniforms();
        this.hydRpCache.CeSubmitAndReset();
    }
    _frameEnd() {
        if (this.canvasSizeDirty) {
            this.discardPendingCanvasCommands();
            return;
        }
        this._der_flush();
        const renderingToBacking = this.defaultFramebufferBackingTexture &&
            this.hydGlobalState.__canvasTexture === this.defaultFramebufferBackingTexture;
        if (renderingToBacking) {
            if (this.hydCanvas.isConnected) {
                this.presentDefaultFramebufferBacking();
                if (this.hydGlobalState.contextAttributes.preserveDrawingBuffer !== true) {
                    this.defaultFramebufferNeedsImplicitClear = true;
                }
            }
        }
        else {
            this.hydGlobalState.__canvasTexture = null;
            this.hydGlobalState.__canvasView = null;
        }
    }
    _frameStart() {
        this.hydUniOff = 0;
        this.updateCanvasSize();
        if (this.shouldUseDefaultFramebufferBacking()) {
            this.activateDefaultFramebufferBacking(Boolean(this.hydGlobalState.__canvasTexture));
            this.materializeImplicitDefaultFramebufferClear();
        }
        else {
            this.hydGlobalState.__canvasTexture = this.hydGpuctx.getCurrentTexture();
            this.hydGlobalState.__canvasView = this.hydGlobalState.__canvasTexture.createView({ label: 'canvasView' });
        }
    }
    ensureDefaultFramebufferRenderTarget() {
        if (this.hydGlobalState.commonState.drawFramebufferBinding !== this.hydGlobalState.defaultFramebuffer ||
            this.hydGlobalState.__canvasView) {
            return;
        }
        if (this.shouldUseDefaultFramebufferBacking()) {
            this.activateDefaultFramebufferBacking(false);
        }
        else if (this.hydCanvas.width > 0 && this.hydCanvas.height > 0) {
            this.hydGlobalState.__canvasTexture = this.hydGpuctx.getCurrentTexture();
            this.hydGlobalState.__canvasView = this.hydGlobalState.__canvasTexture.createView({
                label: "canvasView after external read",
            });
        }
        this.hydGlobalState.drawingBufferGeneration++;
        this.hydGlobalState.recordTransition("drawingBufferTarget", this.hydGlobalState.drawingBufferGeneration);
        this.lastDrawPbv = null;
    }
    bindAttribLocation(program, index, name) {
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return;
        }
        if (name.startsWith("gl_") || name.startsWith("webgl_") || name.startsWith("_webgl_")) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const maxNameLength = this.hydContextType === "webgl2" ? 1024 : 256;
        if (name.length > maxNameLength || /[^\x00-\x7f]/.test(name) || !isWebGlIdentifierName(name)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        program.bindAttribLocation(index, name);
        this.hydGlobalState.recordTransition("bindAttribLocation", program.hash || "unlinked", index, name);
    }
    getError() {
        return this.hydGlobalState.consumeError();
    }
    getShaderPrecisionFormat(shaderType, precisionType) {
        if (shaderType !== WebGL2RenderingContext.VERTEX_SHADER &&
            shaderType !== WebGL2RenderingContext.FRAGMENT_SHADER) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        switch (precisionType) {
            case WebGL2RenderingContext.LOW_FLOAT:
                return brandHydWebGlObject({ rangeMin: 8, rangeMax: 8, precision: 8 }, "shader-precision-format");
            case WebGL2RenderingContext.MEDIUM_FLOAT:
                return brandHydWebGlObject({ rangeMin: 14, rangeMax: 14, precision: 10 }, "shader-precision-format");
            case WebGL2RenderingContext.HIGH_FLOAT:
                return brandHydWebGlObject({ rangeMin: 127, rangeMax: 127, precision: 23 }, "shader-precision-format");
            case WebGL2RenderingContext.LOW_INT:
                return brandHydWebGlObject({ rangeMin: 8, rangeMax: 8, precision: 0 }, "shader-precision-format");
            case WebGL2RenderingContext.MEDIUM_INT:
                return brandHydWebGlObject({ rangeMin: 16, rangeMax: 16, precision: 0 }, "shader-precision-format");
            case WebGL2RenderingContext.HIGH_INT:
                return brandHydWebGlObject({ rangeMin: 31, rangeMax: 31, precision: 0 }, "shader-precision-format");
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return null;
        }
    }
    detachShader(program, shader) {
        if (!this.isProgram(program) || !this.isShader(shader)) {
            this.setShaderProgramValidationError(program, shader);
            return;
        }
        if (!program.detachShader(shader)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
        }
    }
    deleteShader(s) {
        if (s === null)
            return;
        if (s instanceof HydShader && s.ownerToken === this.contextToken && s.deleted)
            return;
        if (!this.isShader(s)) {
            this.setShaderProgramValidationError(s);
            return;
        }
        s.deleted = true;
        if (s.attachmentCount === 0) {
            s.destroyed = true;
        }
    }
    finalizeProgramDeletion(program) {
        program.detachAllShaders();
        program.destroyed = true;
        program.linked = false;
    }
    deleteProgram(p) {
        if (p === null)
            return;
        if (p instanceof HydProgram && p.ownerToken === this.contextToken && p.deleted)
            return;
        if (!this.isProgram(p)) {
            this.setShaderProgramValidationError(p);
            return;
        }
        p.deleted = true;
        if (this.hydGlobalState.commonState.currentProgram !== p) {
            this.finalizeProgramDeletion(p);
        }
    }
    deleteFramebuffer(framebuffer) {
        if (!framebuffer)
            return;
        if (!(framebuffer instanceof HydFramebuffer) || framebuffer.ownerToken !== this.contextToken) {
            this.setObjectValidationError(framebuffer);
            return;
        }
        framebuffer.deleted = true;
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
        if (!(renderbuffer instanceof HydTexture) || renderbuffer.ownerToken !== this.contextToken) {
            this.setObjectValidationError(renderbuffer);
            return;
        }
        if (renderbuffer.deleted)
            return;
        renderbuffer.deleted = true;
        this._der_flush();
        if (this.hydGlobalState.commonState.renderbufferBinding === renderbuffer) {
            this.hydGlobalState.commonState.renderbufferBinding = null;
        }
        for (const callback of renderbuffer.onDelete.splice(0))
            callback();
        this.hydGlobalState.recordTransition("deleteRenderbuffer", "renderbuffer");
    }
    lookupTexture(texture) {
        if (texture === null) {
            return null;
        }
        if (texture instanceof HydTexture) {
            return texture.ownerToken === this.contextToken && typeof texture.texImage2D === "function" ? texture : null;
        }
        if (typeof texture !== "object") {
            return null;
        }
        const tagged = texture.__hydTexture;
        if (tagged instanceof HydTexture && tagged.ownerToken === this.contextToken) {
            return tagged;
        }
        const mapped = this.hydTextureObjects.get(texture);
        if (mapped) {
            return mapped;
        }
        const wrapped = texture.texture;
        if (wrapped instanceof HydTexture && wrapped.ownerToken === this.contextToken) {
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
        const hydTexture = new HydTexture(this.hydDevice, this.contextToken);
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
        if (texture instanceof HydTexture && texture.ownerToken !== this.contextToken) {
            this.setObjectValidationError(texture);
            return;
        }
        const hydTexture = this.lookupTexture(texture);
        if (!hydTexture)
            return;
        if (hydTexture.deleted)
            return;
        this._der_flush();
        this.hydGlobalState.deleteTextureBinding(hydTexture);
        hydTexture.deleted = true;
        for (const callback of hydTexture.onDelete.splice(0))
            callback();
        this.hydGlobalState.recordTransition("deleteTexture", "texture");
    }
    lookupBuffer(buffer) {
        if (buffer === null) {
            return null;
        }
        if (buffer instanceof HydBuffer) {
            return buffer.ownerToken === this.contextToken && typeof buffer.write === "function" ? buffer : null;
        }
        if (typeof buffer !== "object") {
            return null;
        }
        const tagged = buffer.__hydBuffer;
        if (tagged instanceof HydBuffer && tagged.ownerToken === this.contextToken) {
            return tagged;
        }
        const mapped = this.hydBufferObjects.get(buffer);
        if (mapped) {
            return mapped;
        }
        const wrapped = buffer.buffer;
        if (wrapped instanceof HydBuffer && wrapped.ownerToken === this.contextToken) {
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
        const hydBuffer = new HydBuffer(this.hydDevice, this.contextToken);
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
        if (buffer instanceof HydBuffer && buffer.ownerToken !== this.contextToken) {
            this.setObjectValidationError(buffer);
            return;
        }
        const hydBuffer = this.lookupBuffer(buffer);
        if (!hydBuffer)
            return;
        hydBuffer.deleted = true;
        this._der_flush();
        if (this.hydGlobalState.commonState.arrayBufferBinding === hydBuffer) {
            this.hydGlobalState.commonState.arrayBufferBinding = null;
        }
        if (this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding === hydBuffer) {
            this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding = null;
        }
        if (this.hydGlobalState.commonState.pixelPackBufferBinding === hydBuffer) {
            this.hydGlobalState.commonState.pixelPackBufferBinding = null;
        }
        if (this.hydGlobalState.commonState.pixelUnpackBufferBinding === hydBuffer) {
            this.hydGlobalState.commonState.pixelUnpackBufferBinding = null;
        }
        for (const attribute of this.hydGlobalState.commonState.vertexArrayBinding.attributes) {
            if (attribute.buffer === hydBuffer) {
                attribute.buffer = null;
                attribute.updateHash();
            }
        }
        this.hydGlobalState.recordTransition("deleteBuffer", "buffer");
    }
    getShaderInfoLog(shader) {
        if (!this.isShader(shader)) {
            this.setShaderProgramValidationError(shader);
            return null;
        }
        return shader.infoLog;
    }
    getProgramInfoLog(program) {
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return null;
        }
        return program.infoLog;
    }
    getAttachedShaders(program) {
        if (!(program instanceof HydProgram)) {
            throw new TypeError("getAttachedShaders requires a WebGLProgram");
        }
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return null;
        }
        return program.getAttachedShaders();
    }
    currentFramebufferBits(pname) {
        const framebuffer = this.hydGlobalState.commonState.drawFramebufferBinding;
        if (framebuffer === this.hydGlobalState.defaultFramebuffer) {
            if (pname === WebGL2RenderingContext.DEPTH_BITS) {
                return this.hydGlobalState.contextAttributes.depth ? 24 : 0;
            }
            if (pname === WebGL2RenderingContext.STENCIL_BITS) {
                return this.hydGlobalState.contextAttributes.stencil ? 8 : 0;
            }
            if (pname === WebGL2RenderingContext.ALPHA_BITS) {
                return this.hydGlobalState.contextAttributes.alpha ? 8 : 0;
            }
            return 8;
        }
        if (pname === WebGL2RenderingContext.DEPTH_BITS) {
            return (framebuffer.attachments.get(WebGL2RenderingContext.DEPTH_ATTACHMENT) ||
                framebuffer.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT))?.depthBits || 0;
        }
        if (pname === WebGL2RenderingContext.STENCIL_BITS) {
            return (framebuffer.attachments.get(WebGL2RenderingContext.STENCIL_ATTACHMENT) ||
                framebuffer.attachments.get(WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT))?.stencilBits || 0;
        }
        const color = framebuffer.attachments.get(WebGL2RenderingContext.COLOR_ATTACHMENT0);
        if (!color)
            return 0;
        const channel = pname === WebGL2RenderingContext.RED_BITS ? 0 :
            pname === WebGL2RenderingContext.GREEN_BITS ? 1 :
                pname === WebGL2RenderingContext.BLUE_BITS ? 2 : 3;
        return color.colorBits[channel];
    }
    getParameter(pname) {
        if (this.hydContextType !== "webgl2" &&
            (pname === WebGL2RenderingContext.MAX_COLOR_ATTACHMENTS ||
                pname === WebGL2RenderingContext.MAX_DRAW_BUFFERS) &&
            !this.enabledExtensions.has("WEBGL_DRAW_BUFFERS")) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        switch (pname) {
            case WebGL2RenderingContext.VERSION:
                return this.hydContextType === "webgl2"
                    ? "WebGL 2.0 (GL2GPU)"
                    : "WebGL 1.0 (GL2GPU)";
            case WebGL2RenderingContext.SHADING_LANGUAGE_VERSION:
                return this.hydContextType === "webgl2"
                    ? "WebGL GLSL ES 3.00 (GL2GPU)"
                    : "WebGL GLSL ES 1.0 (GL2GPU)";
            case WebGL2RenderingContext.VENDOR:
                return "GL2GPU";
            case WebGL2RenderingContext.RENDERER:
                return "WebGPU";
            case WebGL2RenderingContext.MAX_VIEWPORT_DIMS:
                return new Int32Array([this.maxDrawingBufferDimension, this.maxDrawingBufferDimension]);
        }
        if (enumToConstant.has(pname)) {
            const value = enumToConstant.get(pname);
            return ArrayBuffer.isView(value) ? value.slice() : value;
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
                    return this.hydGlobalState.blendState.srcRGBEnum;
                case WebGL2RenderingContext.BLEND_SRC_ALPHA:
                    return this.hydGlobalState.blendState.srcAlphaEnum;
                case WebGL2RenderingContext.BLEND_DST_RGB:
                    return this.hydGlobalState.blendState.dstRGBEnum;
                case WebGL2RenderingContext.BLEND_DST_ALPHA:
                    return this.hydGlobalState.blendState.dstAlphaEnum;
                case WebGL2RenderingContext.BLEND_EQUATION_RGB:
                    return this.hydGlobalState.blendState.equationRGBEnum;
                case WebGL2RenderingContext.BLEND_EQUATION_ALPHA:
                    return this.hydGlobalState.blendState.equationAlphaEnum;
                case WebGL2RenderingContext.COLOR_CLEAR_VALUE:
                    return new Float32Array(this.hydGlobalState.clearState.color);
                case WebGL2RenderingContext.COLOR_WRITEMASK:
                    return this.hydGlobalState.miscState.colorWriteMask.slice();
                case WebGL2RenderingContext.CULL_FACE:
                    return this.hydGlobalState.polygonState.cullFace;
                case WebGL2RenderingContext.CULL_FACE_MODE:
                    return this.hydGlobalState.polygonState.cullFaceModeEnum;
                case WebGL2RenderingContext.FRONT_FACE:
                    return this.hydGlobalState.polygonState.frontFaceEnum;
                case WebGL2RenderingContext.DEPTH_TEST:
                    return this.hydGlobalState.depthState.enabled;
                case WebGL2RenderingContext.DEPTH_WRITEMASK:
                    return this.hydGlobalState.depthState.writeMask;
                case WebGL2RenderingContext.DEPTH_CLEAR_VALUE:
                    return this.hydGlobalState.clearState.depth;
                case WebGL2RenderingContext.DEPTH_FUNC:
                    return this.hydGlobalState.depthState.funcEnum;
                case WebGL2RenderingContext.DEPTH_RANGE:
                    return new Float32Array(this.hydGlobalState.depthState.range);
                case WebGL2RenderingContext.DITHER:
                    return this.hydGlobalState.miscState.dither;
                case WebGL2RenderingContext.CURRENT_PROGRAM:
                    return this.hydGlobalState.commonState.currentProgram;
                case WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER_BINDING:
                    return this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
                case WebGL2RenderingContext.GENERATE_MIPMAP_HINT:
                    return this.hydGlobalState.miscState.generateMipmapHint;
                case WebGL2RenderingContext.LINE_WIDTH:
                    return this.hydGlobalState.miscState.lineWidth;
                case WebGL2RenderingContext.POLYGON_OFFSET_FACTOR:
                    return this.hydGlobalState.polygonState.polygonOffsetFactor;
                case WebGL2RenderingContext.POLYGON_OFFSET_FILL:
                    return this.hydGlobalState.polygonState.polygonOffsetFill;
                case WebGL2RenderingContext.POLYGON_OFFSET_UNITS:
                    return this.hydGlobalState.polygonState.polygonOffsetUnits;
                case WebGL2RenderingContext.SAMPLE_ALPHA_TO_COVERAGE:
                    return this.hydGlobalState.miscState.sampleAlphaToCoverage;
                case WebGL2RenderingContext.SAMPLE_COVERAGE:
                    return this.hydGlobalState.miscState.sampleCoverage;
                case WebGL2RenderingContext.SAMPLE_COVERAGE_INVERT:
                    return this.hydGlobalState.miscState.sampleCoverageInvert;
                case WebGL2RenderingContext.SAMPLE_COVERAGE_VALUE:
                    return this.hydGlobalState.miscState.sampleCoverageValue;
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
                    return this.hydGlobalState.stencilState.frontFuncEnum;
                case WebGL2RenderingContext.STENCIL_BACK_FUNC:
                    return this.hydGlobalState.stencilState.backFuncEnum;
                case WebGL2RenderingContext.STENCIL_FAIL:
                    return this.hydGlobalState.stencilState.frontFailEnum;
                case WebGL2RenderingContext.STENCIL_BACK_FAIL:
                    return this.hydGlobalState.stencilState.backFailEnum;
                case WebGL2RenderingContext.STENCIL_PASS_DEPTH_FAIL:
                    return this.hydGlobalState.stencilState.frontPassDepthFailEnum;
                case WebGL2RenderingContext.STENCIL_BACK_PASS_DEPTH_FAIL:
                    return this.hydGlobalState.stencilState.backPassDepthFailEnum;
                case WebGL2RenderingContext.STENCIL_PASS_DEPTH_PASS:
                    return this.hydGlobalState.stencilState.frontPassDepthPassEnum;
                case WebGL2RenderingContext.STENCIL_BACK_PASS_DEPTH_PASS:
                    return this.hydGlobalState.stencilState.backPassDepthPassEnum;
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
                case WebGL2RenderingContext.TEXTURE_BINDING_2D:
                    return this.hydGlobalState.getTextureUnitBinding(this.hydGlobalState.commonState.activeTextureUnit, "2d");
                case WebGL2RenderingContext.TEXTURE_BINDING_CUBE_MAP:
                    return this.hydGlobalState.getTextureUnitBinding(this.hydGlobalState.commonState.activeTextureUnit, "cube");
                case WebGL2RenderingContext.UNPACK_PREMULTIPLY_ALPHA_WEBGL:
                    return this.hydGlobalState.miscState.unpackPremultiplyAlphaWebGL;
                case WebGL2RenderingContext.UNPACK_COLORSPACE_CONVERSION_WEBGL:
                    return this.hydGlobalState.miscState.unpackColorSpaceConversionWebGL;
                case WebGL2RenderingContext.SAMPLE_BUFFERS:
                    return this.hydGlobalState.contextAttributes.antialias ? 1 : 0;
                case WebGL2RenderingContext.SAMPLES:
                    return this.hydGlobalState.contextAttributes.antialias ? 4 : 0;
                case WebGL2RenderingContext.DEPTH_BITS:
                    return this.currentFramebufferBits(pname);
                case WebGL2RenderingContext.RED_BITS:
                case WebGL2RenderingContext.GREEN_BITS:
                case WebGL2RenderingContext.BLUE_BITS:
                case WebGL2RenderingContext.ALPHA_BITS:
                    return this.currentFramebufferBits(pname);
                case WebGL2RenderingContext.STENCIL_BITS:
                    return this.currentFramebufferBits(pname);
            }
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
    }
    getContextAttributes() {
        return this.hydGlobalState.contextAttributes;
    }
    isContextLost() {
        return false;
    }
    getShaderParameter(shader, pname) {
        if (!this.isShader(shader)) {
            this.setShaderProgramValidationError(shader);
            return null;
        }
        switch (pname) {
            case WebGL2RenderingContext.DELETE_STATUS:
                return shader.deleted;
            case WebGL2RenderingContext.COMPILE_STATUS:
                return shader.compiled;
            case WebGL2RenderingContext.SHADER_TYPE:
                return shader.type;
        }
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
        return null;
    }
    getProgramParameter(program, pname) {
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return null;
        }
        switch (pname) {
            case WebGL2RenderingContext.DELETE_STATUS:
                return program.deleted;
            case WebGL2RenderingContext.LINK_STATUS:
                return program.linked;
            case WebGL2RenderingContext.VALIDATE_STATUS:
                return program.validated;
            case WebGL2RenderingContext.ATTACHED_SHADERS:
                return program.getAttachedShaders().length;
            case WebGL2RenderingContext.ACTIVE_ATTRIBUTES:
                return program.hydAttributes.length;
            case WebGL2RenderingContext.ACTIVE_UNIFORMS:
                return program.hydUniforms.filter(isVisibleActiveUniform).length +
                    program.hydSamplers.filter((sampler) => sampler.arrayIndex === undefined || sampler.arrayIndex === 0).length;
            case WebGL2RenderingContext.ACTIVE_UNIFORM_BLOCKS:
                if (this.hydContextType === "webgl2")
                    return 0;
                break;
        }
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
        return null;
    }
    getSupportedExtensions() {
        return [...SUPPORTED_EXTENSION_NAMES];
    }
    getExtension(extensionName) {
        const canonicalName = typeof extensionName === "string"
            ? SUPPORTED_EXTENSION_BY_LOWER_NAME.get(extensionName.toLowerCase())
            : undefined;
        if (!canonicalName) {
            return null;
        }
        this.enabledExtensions.add(canonicalName.toUpperCase());
        const cached = this.extensionObjects.get(canonicalName);
        if (cached)
            return cached;
        let extension = null;
        if (canonicalName === 'ANGLE_instanced_arrays') {
            extension = {
                VERTEX_ATTRIB_ARRAY_DIVISOR_ANGLE: WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_DIVISOR,
                drawArraysInstancedANGLE: HydWebGLStatic.prototype.drawArraysInstanced.bind(this),
                drawElementsInstancedANGLE: HydWebGLStatic.prototype.drawElementsInstanced.bind(this),
                vertexAttribDivisorANGLE: HydWebGLStatic.prototype.vertexAttribDivisor.bind(this),
            };
        }
        else if (canonicalName === 'OES_element_index_uint') {
            extension = {};
        }
        else if (canonicalName === 'EXT_sRGB') {
            extension = {
                SRGB_EXT: hydWebGLStatic_GL_SRGB_EXT,
                SRGB_ALPHA_EXT: hydWebGLStatic_GL_SRGB_ALPHA_EXT,
                SRGB8_ALPHA8_EXT: GL_SRGB8_ALPHA8_EXT,
                FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING_EXT: GL_FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING_EXT,
            };
        }
        if (extension)
            this.extensionObjects.set(canonicalName, extension);
        return extension;
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
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return null;
        }
        if (!buffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        switch (pname) {
            case WebGL2RenderingContext.BUFFER_SIZE:
                return buffer.webglSize;
            case WebGL2RenderingContext.BUFFER_USAGE:
                return buffer.webglUsage;
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return null;
        }
    }
    getRenderbufferParameter(target, pname) {
        if (target !== WebGL2RenderingContext.RENDERBUFFER) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        if (!this.hydGlobalState.commonState.renderbufferBinding) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        const renderbuffer = this.hydGlobalState.commonState.renderbufferBinding;
        const format = renderbuffer.format || "";
        switch (pname) {
            case WebGL2RenderingContext.RENDERBUFFER_WIDTH:
                return renderbuffer.width;
            case WebGL2RenderingContext.RENDERBUFFER_HEIGHT:
                return renderbuffer.height;
            case WebGL2RenderingContext.RENDERBUFFER_INTERNAL_FORMAT:
                return renderbuffer.renderbufferInternalFormat;
            case WebGL2RenderingContext.RENDERBUFFER_RED_SIZE:
            case WebGL2RenderingContext.RENDERBUFFER_GREEN_SIZE:
            case WebGL2RenderingContext.RENDERBUFFER_BLUE_SIZE:
            case WebGL2RenderingContext.RENDERBUFFER_ALPHA_SIZE:
                return format.includes("rgba") || format.includes("bgra") ? 8 : 0;
            case WebGL2RenderingContext.RENDERBUFFER_DEPTH_SIZE:
                if (format.includes("depth16"))
                    return 16;
                if (format.includes("depth32"))
                    return 32;
                return format.includes("depth") ? 24 : 0;
            case WebGL2RenderingContext.RENDERBUFFER_STENCIL_SIZE:
                return format.includes("stencil") ? 8 : 0;
            case WebGL2RenderingContext.RENDERBUFFER_SAMPLES:
                if (this.hydContextType === "webgl2")
                    return renderbuffer.renderbufferSamples;
                break;
            default:
                break;
        }
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
        return null;
    }
    getFramebufferAttachmentParameter(target, attachment, pname) {
        const webgl2Target = this.hydContextType === "webgl2" &&
            (target === WebGL2RenderingContext.DRAW_FRAMEBUFFER || target === WebGL2RenderingContext.READ_FRAMEBUFFER);
        if (target !== WebGL2RenderingContext.FRAMEBUFFER && !webgl2Target) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        const maxColorAttachments = this.hydContextType === "webgl2" ? 16 : 1;
        const colorAttachment = attachment >= WebGL2RenderingContext.COLOR_ATTACHMENT0 &&
            attachment < WebGL2RenderingContext.COLOR_ATTACHMENT0 + maxColorAttachments;
        if (!colorAttachment &&
            attachment !== WebGL2RenderingContext.DEPTH_ATTACHMENT &&
            attachment !== WebGL2RenderingContext.STENCIL_ATTACHMENT &&
            attachment !== WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        const framebuffer = this.getFramebufferForTarget(target);
        if (framebuffer === this.hydGlobalState.defaultFramebuffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        const attrib = framebuffer.attachments.get(attachment);
        if (!attrib) {
            if (pname === WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE) {
                return WebGL2RenderingContext.NONE;
            }
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        switch (pname) {
            case GL_FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING_EXT:
                if (!this.enabledExtensions.has("EXT_SRGB")) {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                    return null;
                }
                return attrib.format?.endsWith("-srgb")
                    ? hydWebGLStatic_GL_SRGB_EXT
                    : WebGL2RenderingContext.LINEAR;
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE:
                return attrib.objectType;
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME:
                return attrib.attachment;
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL:
                return attrib.level || 0;
            case WebGL2RenderingContext.FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE:
                return attrib.face >= WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X &&
                    attrib.face <= WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z
                    ? attrib.face
                    : WebGL2RenderingContext.NONE;
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return null;
        }
    }
    getAttribLocation(program, attribName) {
        if (!this.isProgram(program)) {
            if (program instanceof HydProgram &&
                program.ownerToken === this.contextToken && program.deleted) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            }
            else {
                this.setShaderProgramValidationError(program);
            }
            return -1;
        }
        if (!program.linked) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return -1;
        }
        const maxNameLength = this.hydContextType === "webgl2" ? 1024 : 256;
        if (attribName.length > maxNameLength || /[^\x00-\x7f]/.test(attribName) || !isWebGlIdentifierName(attribName)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return -1;
        }
        const attrib = program.hydAttributes.find((item) => item.name === attribName);
        return attrib ? attrib.location : -1;
    }
    getUniformLocation(program, uniformName) {
        if (!this.isProgram(program)) {
            if (program instanceof HydProgram &&
                program.ownerToken === this.contextToken && program.deleted) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            }
            else {
                this.setShaderProgramValidationError(program);
            }
            return null;
        }
        if (!program.linked) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        const maxNameLength = this.hydContextType === "webgl2" ? 1024 : 256;
        if (uniformName.length > maxNameLength || /[^\x00-\x7f]/.test(uniformName) || !isWebGlIdentifierName(uniformName, true)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return null;
        }
        const arrayMatch = /^(.*)\[\s*(\d+)\s*\]$/.exec(uniformName);
        const lookupName = arrayMatch ? arrayMatch[1] : uniformName;
        const arrayIndex = arrayMatch ? Number(arrayMatch[2]) : 0;
        const safeUniformName = lookupName.replace(/[^A-Za-z0-9_]/g, "_").replace(/_+$/g, "");
        const ret = program.hydUniforms.find((uniform) => !uniform.internal &&
            (uniform.name === lookupName || uniform.name === safeUniformName || uniform.sourceName === lookupName)) ||
            program.hydSamplers.find((sampler) => sampler.name === lookupName || sampler.name === safeUniformName || sampler.sourceName === uniformName ||
                (sampler.arrayName === lookupName && (sampler.arrayIndex || 0) === arrayIndex));
        if (!ret) {
            return null;
        }
        if (arrayMatch && (!ret.isArray || arrayIndex >= ret.size)) {
            return null;
        }
        if (ret instanceof ProgramUniformSampler) {
            const location = brandHydWebGlObject(Object.create(ret), "uniform-location");
            location.activeForUniformUpdates = false;
            location.storage = ret;
            location.arrayElements = ret.arrayName
                ? program.hydSamplers
                    .filter((sampler) => sampler.arrayName === ret.arrayName && (sampler.arrayIndex || 0) >= (ret.arrayIndex || 0))
                    .sort((a, b) => (a.arrayIndex || 0) - (b.arrayIndex || 0))
                : [ret];
            location.remainingArrayElements = location.arrayElements.length;
            program.uniformSamplerLocations.push(location);
            if (this.currentProgramValid && this.hydGlobalState.commonState.currentProgram === program) {
                location.activeForUniformUpdates = true;
            }
            return location;
        }
        const location = brandHydWebGlObject(Object.create(ret), "uniform-location");
        location.wordOffset = ret.wordOffset + (ret.elementStride >> 2) * arrayIndex;
        location.byteLength = ret.elementByteLength;
        location.arrayStrideWords = ret.elementStride >> 2;
        location.remainingArrayElements = ret.size - arrayIndex;
        location.writeFloat32View = null;
        location.writeInt32View = null;
        location.writeUint32View = null;
        program.uniformBufferLocations.push(location);
        if (this.currentProgramValid && this.hydGlobalState.commonState.currentProgram === program) {
            location.writeFloat32View = location.float32View;
            location.writeInt32View = location.int32View;
            location.writeUint32View = location.uint32View;
        }
        return location;
    }
    getUniform(program, location) {
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return null;
        }
        if (location === null ||
            (!(location instanceof ProgramUniformBuffer) && !(location instanceof ProgramUniformSampler)) ||
            location.ownerToken !== this.contextToken ||
            location.program !== program ||
            location.linkGeneration !== program.linkGeneration) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        if (location instanceof ProgramUniformSampler) {
            return (location.storage || location).textureUnit;
        }
        const matrixDimensions = uniformMatrixDimensions(location.webgl_type);
        const componentCount = (() => {
            if (matrixDimensions)
                return matrixDimensions.columns * matrixDimensions.rows;
            switch (location.webgl_type) {
                default: return Math.max(1, location.byteLength / 4);
            }
        })();
        if (location.webgl_type === WebGL2RenderingContext.BOOL)
            return Boolean(location.int32View[location.wordOffset]);
        if (location.webgl_type >= WebGL2RenderingContext.BOOL_VEC2 && location.webgl_type <= WebGL2RenderingContext.BOOL_VEC4) {
            return Array.from(location.int32View.slice(location.wordOffset, location.wordOffset + componentCount), Boolean);
        }
        if (location.webgl_type === WebGL2RenderingContext.FLOAT)
            return location.float32View[location.wordOffset];
        if (location.webgl_type === WebGL2RenderingContext.INT)
            return location.int32View[location.wordOffset];
        if (location.webgl_type === WebGL2RenderingContext.UNSIGNED_INT)
            return location.uint32View[location.wordOffset];
        if (location.webgl_type === WebGL2RenderingContext.UNSIGNED_INT ||
            (WebGL2RenderingContext.UNSIGNED_INT_VEC2 <= location.webgl_type && location.webgl_type <= WebGL2RenderingContext.UNSIGNED_INT_VEC4)) {
            return location.uint32View.slice(location.wordOffset, location.wordOffset + componentCount);
        }
        if (location.webgl_type >= WebGL2RenderingContext.INT_VEC2 && location.webgl_type <= WebGL2RenderingContext.INT_VEC4) {
            return location.int32View.slice(location.wordOffset, location.wordOffset + componentCount);
        }
        if (matrixDimensions) {
            const value = new Float32Array(componentCount);
            for (let column = 0; column < matrixDimensions.columns; column++) {
                value.set(location.float32View.subarray(location.wordOffset + column * 4, location.wordOffset + column * 4 + matrixDimensions.rows), column * matrixDimensions.rows);
            }
            return value;
        }
        return location.float32View.slice(location.wordOffset, location.wordOffset + componentCount);
    }
    getVertexAttrib(index, pname) {
        const attributes = this.hydGlobalState.commonState.vertexArrayBinding.attributes;
        if (index < 0 || index >= attributes.length) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return null;
        }
        const attribute = attributes[index];
        switch (pname) {
            case WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING:
                return attribute.buffer && !attribute.buffer.deleted ? attribute.buffer : null;
            case WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_ENABLED:
                return attribute.enabled;
            case WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_SIZE:
                return attribute.size === undefined ? 4 : attribute.size;
            case WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_STRIDE:
                return attribute.webglStride;
            case WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_TYPE:
                return attribute.type === undefined ? WebGL2RenderingContext.FLOAT : attribute.type;
            case WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_NORMALIZED:
                return attribute.normalized;
            case WebGL2RenderingContext.CURRENT_VERTEX_ATTRIB:
                return new Float32Array(this.hydGlobalState.currentVertexAttribValues[index]);
            case WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_DIVISOR:
                if (this.hydContextType === "webgl2" || this.enabledExtensions.has("ANGLE_INSTANCED_ARRAYS")) {
                    return attribute.divisor;
                }
                break;
            case WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_INTEGER:
                if (this.hydContextType === "webgl2")
                    return Boolean(attribute.int);
                break;
        }
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
        return null;
    }
    getVertexAttribOffset(index, pname) {
        const attributes = this.hydGlobalState.commonState.vertexArrayBinding.attributes;
        if (index < 0 || index >= attributes.length) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return 0;
        }
        if (pname !== WebGL2RenderingContext.VERTEX_ATTRIB_ARRAY_POINTER) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return 0;
        }
        return attributes[index].offset || 0;
    }
    isTexture(texture) {
        const hydTexture = this.lookupTexture(texture);
        return Boolean(hydTexture && hydTexture.initialized && !hydTexture.deleted);
    }
    isBuffer(buffer) {
        const hydBuffer = this.lookupBuffer(buffer);
        return Boolean(hydBuffer && hydBuffer.initialized && !hydBuffer.deleted);
    }
    isFramebuffer(framebuffer) {
        return framebuffer instanceof HydFramebuffer && framebuffer.ownerToken === this.contextToken && framebuffer.initialized && !framebuffer.deleted;
    }
    isRenderbuffer(renderbuffer) {
        return renderbuffer instanceof HydTexture && renderbuffer.ownerToken === this.contextToken && renderbuffer.initialized && !renderbuffer.deleted;
    }
    isProgram(program) {
        return program instanceof HydProgram && program.ownerToken === this.contextToken && !program.destroyed;
    }
    isShader(shader) {
        return shader instanceof HydShader && shader.ownerToken === this.contextToken && !shader.destroyed;
    }
    isVertexArray(vertexArray) {
        return vertexArray instanceof HydVertexArray && vertexArray.ownerToken === this.contextToken;
    }
    polygonOffset(x, y) {
        this.hydGlobalState.polygonState.polygonOffsetFactor = x;
        this.hydGlobalState.polygonState.polygonOffsetUnits = y;
        this.hydGlobalState.recordTransition("polygonOffset", x, y);
    }
    lineWidth(width) {
        if (!Number.isFinite(width) || width <= 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        this.hydGlobalState.miscState.lineWidth = width;
        this.hydGlobalState.recordTransition("lineWidth", width);
    }
    hint(target, mode) {
        if (target !== WebGL2RenderingContext.GENERATE_MIPMAP_HINT) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (mode !== WebGL2RenderingContext.FASTEST &&
            mode !== WebGL2RenderingContext.NICEST &&
            mode !== WebGL2RenderingContext.DONT_CARE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        this.hydGlobalState.miscState.generateMipmapHint = mode;
        this.hydGlobalState.recordTransition("hint", target, mode);
    }
    sampleCoverage(value, invert) {
        this.hydGlobalState.miscState.sampleCoverageValue = clampWebGlUnitFloat(value);
        this.hydGlobalState.miscState.sampleCoverageInvert = Boolean(invert);
        this.hydGlobalState.recordTransition("sampleCoverage", value, invert);
    }
    shaderSource(shader, source) {
        if (!this.isShader(shader)) {
            this.setShaderProgramValidationError(shader);
            return;
        }
        shader.sourceLength = source.length;
        shader.glsl_shader = source.trim();
    }
    getShaderSource(shader) {
        if (!this.isShader(shader)) {
            this.setShaderProgramValidationError(shader);
            return null;
        }
        return shader.glsl_shader;
    }
    activateUniformLocations(program) {
        for (const uniform of this.activeUniformBuffers) {
            uniform.writeFloat32View = null;
            uniform.writeInt32View = null;
            uniform.writeUint32View = null;
        }
        for (const sampler of this.activeUniformSamplers) {
            sampler.activeForUniformUpdates = false;
        }
        this.activeUniformBuffers = program ? program.uniformBufferLocations : [];
        this.activeUniformSamplers = program ? program.uniformSamplerLocations : [];
        for (const uniform of this.activeUniformBuffers) {
            uniform.writeFloat32View = uniform.float32View;
            uniform.writeInt32View = uniform.int32View;
            uniform.writeUint32View = uniform.uint32View;
        }
        for (const sampler of this.activeUniformSamplers) {
            sampler.activeForUniformUpdates = true;
        }
    }
    uniform1f(pub, x0) {
        if (pub === null)
            return;
        const a = pub.writeFloat32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        a[pub.wordOffset] = x0;
    }
    uniform2f(pub, x0, x1) {
        if (pub === null)
            return;
        const a = pub.writeFloat32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = pub.wordOffset;
        a[offset] = x0;
        a[offset + 1] = x1;
    }
    uniform3f(pub, x0, x1, x2) {
        if (pub === null)
            return;
        const a = pub.writeFloat32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = pub.wordOffset;
        a[offset] = x0;
        a[offset + 1] = x1;
        a[offset + 2] = x2;
    }
    uniform4f(pub, x0, x1, x2, x3) {
        if (pub === null)
            return;
        const a = pub.writeFloat32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = pub.wordOffset;
        a[offset] = x0;
        a[offset + 1] = x1;
        a[offset + 2] = x2;
        a[offset + 3] = x3;
    }
    uniform1i(uniform, x0) {
        if (uniform === null)
            return;
        if (uniform instanceof ProgramUniformSampler) {
            if (!uniform.activeForUniformUpdates) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            const maxTextureUnits = enumToConstant.get(WebGL2RenderingContext.MAX_COMBINED_TEXTURE_IMAGE_UNITS) || 0;
            if (!Number.isInteger(x0) || x0 < 0 || x0 >= maxTextureUnits) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                return;
            }
            const storage = uniform.storage || uniform;
            if (storage.textureUnit !== x0) {
                storage.textureUnit = x0;
                this.samplerOriginStateVersion++;
                this.hydGlobalState.recordTransition("uniformSampler", storage.name, x0);
            }
            return;
        }
        const a = uniform.writeInt32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = uniform.wordOffset;
        a[offset] = x0;
    }
    uniform2i(pub, x0, x1) {
        if (pub === null)
            return;
        const a = pub.writeInt32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = pub.wordOffset;
        a[offset] = x0;
        a[offset + 1] = x1;
    }
    uniform3i(pub, x0, x1, x2) {
        if (pub === null)
            return;
        const a = pub.writeInt32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = pub.wordOffset;
        a[offset] = x0;
        a[offset + 1] = x1;
        a[offset + 2] = x2;
    }
    uniform4i(pub, x0, x1, x2, x3) {
        if (pub === null)
            return;
        const a = pub.writeInt32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = pub.wordOffset;
        a[offset] = x0;
        a[offset + 1] = x1;
        a[offset + 2] = x2;
        a[offset + 3] = x3;
    }
    uniform1ui(pub, x0) {
        if (pub === null)
            return;
        const a = pub.writeUint32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        a[pub.wordOffset] = x0 >>> 0;
    }
    uniform2ui(pub, x0, x1) {
        if (pub === null)
            return;
        const a = pub.writeUint32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = pub.wordOffset;
        a[offset] = x0 >>> 0;
        a[offset + 1] = x1 >>> 0;
    }
    uniform3ui(pub, x0, x1, x2) {
        if (pub === null)
            return;
        const a = pub.writeUint32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = pub.wordOffset;
        a[offset] = x0 >>> 0;
        a[offset + 1] = x1 >>> 0;
        a[offset + 2] = x2 >>> 0;
    }
    uniform4ui(pub, x0, x1, x2, x3) {
        if (pub === null)
            return;
        const a = pub.writeUint32View;
        if (!a) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const offset = pub.wordOffset;
        a[offset] = x0 >>> 0;
        a[offset + 1] = x1 >>> 0;
        a[offset + 2] = x2 >>> 0;
        a[offset + 3] = x3 >>> 0;
    }
    uniformArrayLength(value) {
        if ((typeof value !== "object" && typeof value !== "function") || value === null || typeof value.length !== "number") {
            throw new TypeError("uniform vector data must be an array or typed array");
        }
        return Number(value.length);
    }
    writeFloatUniformArray(pub, value, components, expectedType) {
        const length = this.uniformArrayLength(value);
        const target = pub.writeFloat32View;
        if (!target) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (pub.webgl_type !== expectedType) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (length < components || length % components !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const requestedElements = length / components;
        if (!pub.isArray && requestedElements > pub.remainingArrayElements) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const elements = Math.min(requestedElements, pub.remainingArrayElements);
        const stride = pub.arrayStrideWords || components;
        const valueCount = elements * components;
        if (elements === 1) {
            const offset = pub.wordOffset;
            target[offset] = value[0];
            if (components > 1)
                target[offset + 1] = value[1];
            if (components > 2)
                target[offset + 2] = value[2];
            if (components > 3)
                target[offset + 3] = value[3];
            return;
        }
        if (stride === components && valueCount === length && ArrayBuffer.isView(value)) {
            target.set(value, pub.wordOffset);
            return;
        }
        for (let element = 0; element < elements; element++) {
            const sourceOffset = element * components;
            const targetOffset = pub.wordOffset + element * stride;
            for (let component = 0; component < components; component++) {
                target[targetOffset + component] = value[sourceOffset + component];
            }
        }
    }
    writeIntUniformArray(pub, value, components, expectedType, boolType) {
        const length = this.uniformArrayLength(value);
        const target = pub.writeInt32View;
        if (!target) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (pub.webgl_type !== expectedType && pub.webgl_type !== boolType) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (length < components || length % components !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const requestedElements = length / components;
        if (!pub.isArray && requestedElements > pub.remainingArrayElements) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const elements = Math.min(requestedElements, pub.remainingArrayElements);
        const stride = pub.arrayStrideWords || components;
        const valueCount = elements * components;
        if (elements === 1) {
            const offset = pub.wordOffset;
            target[offset] = value[0];
            if (components > 1)
                target[offset + 1] = value[1];
            if (components > 2)
                target[offset + 2] = value[2];
            if (components > 3)
                target[offset + 3] = value[3];
            return;
        }
        if (stride === components && valueCount === length && ArrayBuffer.isView(value)) {
            target.set(value, pub.wordOffset);
            return;
        }
        for (let element = 0; element < elements; element++) {
            const sourceOffset = element * components;
            const targetOffset = pub.wordOffset + element * stride;
            for (let component = 0; component < components; component++) {
                target[targetOffset + component] = value[sourceOffset + component];
            }
        }
    }
    writeUintUniformArray(pub, value, components, expectedType, boolType) {
        const length = this.uniformArrayLength(value);
        const target = pub.writeUint32View;
        if (!target) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (pub.webgl_type !== expectedType && pub.webgl_type !== boolType) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (length < components || length % components !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const requestedElements = length / components;
        if (!pub.isArray && requestedElements > pub.remainingArrayElements) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const elements = Math.min(requestedElements, pub.remainingArrayElements);
        const stride = pub.arrayStrideWords || components;
        const valueCount = elements * components;
        if (elements === 1) {
            const offset = pub.wordOffset;
            target[offset] = value[0] >>> 0;
            if (components > 1)
                target[offset + 1] = value[1] >>> 0;
            if (components > 2)
                target[offset + 2] = value[2] >>> 0;
            if (components > 3)
                target[offset + 3] = value[3] >>> 0;
            return;
        }
        if (stride === components && valueCount === length && ArrayBuffer.isView(value)) {
            target.set(value, pub.wordOffset);
            return;
        }
        for (let element = 0; element < elements; element++) {
            const sourceOffset = element * components;
            const targetOffset = pub.wordOffset + element * stride;
            for (let component = 0; component < components; component++) {
                target[targetOffset + component] = value[sourceOffset + component] >>> 0;
            }
        }
    }
    uniform1fv(pub, v) {
        if (pub === null)
            return;
        this.writeFloatUniformArray(pub, v, 1, WebGL2RenderingContext.FLOAT);
    }
    uniform2fv(pub, v) {
        if (pub === null)
            return;
        this.writeFloatUniformArray(pub, v, 2, WebGL2RenderingContext.FLOAT_VEC2);
    }
    uniform3fv(pub, v) {
        if (pub === null)
            return;
        const target = pub.writeFloat32View;
        if (target && pub.webgl_type === WebGL2RenderingContext.FLOAT_VEC3 &&
            v !== null && (typeof v === "object" || typeof v === "function") && v.length === 3) {
            const offset = pub.wordOffset;
            target[offset] = v[0];
            target[offset + 1] = v[1];
            target[offset + 2] = v[2];
            return;
        }
        this.writeFloatUniformArray(pub, v, 3, WebGL2RenderingContext.FLOAT_VEC3);
    }
    uniform4fv(pub, v) {
        if (pub === null)
            return;
        this.writeFloatUniformArray(pub, v, 4, WebGL2RenderingContext.FLOAT_VEC4);
    }
    uniform1iv(pub, v) {
        if (pub === null)
            return;
        const length = this.uniformArrayLength(v);
        if (length < 1) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (pub instanceof ProgramUniformSampler) {
            if (!pub.activeForUniformUpdates) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            const elements = pub.arrayElements || [pub.storage || pub];
            if (!pub.isArray && length > elements.length) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            const count = Math.min(length, elements.length);
            const maxTextureUnits = enumToConstant.get(WebGL2RenderingContext.MAX_COMBINED_TEXTURE_IMAGE_UNITS) || 0;
            for (let i = 0; i < count; i++) {
                const unit = Number(v[i]);
                if (!Number.isInteger(unit) || unit < 0 || unit >= maxTextureUnits) {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                    return;
                }
            }
            for (let i = 0; i < count; i++) {
                const sampler = elements[i];
                const unit = Number(v[i]);
                if (sampler.textureUnit !== unit) {
                    sampler.textureUnit = unit;
                    this.samplerOriginStateVersion++;
                    this.hydGlobalState.recordTransition("uniformSampler", sampler.name, unit);
                }
            }
            return;
        }
        this.writeIntUniformArray(pub, v, 1, WebGL2RenderingContext.INT, WebGL2RenderingContext.BOOL);
    }
    uniform2iv(pub, v) {
        if (pub === null)
            return;
        this.writeIntUniformArray(pub, v, 2, WebGL2RenderingContext.INT_VEC2, WebGL2RenderingContext.BOOL_VEC2);
    }
    uniform3iv(pub, v) {
        if (pub === null)
            return;
        this.writeIntUniformArray(pub, v, 3, WebGL2RenderingContext.INT_VEC3, WebGL2RenderingContext.BOOL_VEC3);
    }
    uniform4iv(pub, v) {
        if (pub === null)
            return;
        this.writeIntUniformArray(pub, v, 4, WebGL2RenderingContext.INT_VEC4, WebGL2RenderingContext.BOOL_VEC4);
    }
    uniform1uiv(pub, v) {
        if (pub === null)
            return;
        this.writeUintUniformArray(pub, v, 1, WebGL2RenderingContext.UNSIGNED_INT, WebGL2RenderingContext.BOOL);
    }
    uniform2uiv(pub, v) {
        if (pub === null)
            return;
        this.writeUintUniformArray(pub, v, 2, WebGL2RenderingContext.UNSIGNED_INT_VEC2, WebGL2RenderingContext.BOOL_VEC2);
    }
    uniform3uiv(pub, v) {
        if (pub === null)
            return;
        this.writeUintUniformArray(pub, v, 3, WebGL2RenderingContext.UNSIGNED_INT_VEC3, WebGL2RenderingContext.BOOL_VEC3);
    }
    uniform4uiv(pub, v) {
        if (pub === null)
            return;
        this.writeUintUniformArray(pub, v, 4, WebGL2RenderingContext.UNSIGNED_INT_VEC4, WebGL2RenderingContext.BOOL_VEC4);
    }
    writeFloatUniformMatrix(pub, transpose, value, columns, rows, expectedType) {
        const target = pub.writeFloat32View;
        if (!target) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (pub.webgl_type !== expectedType) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (transpose) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const matrixValues = columns * rows;
        const length = this.uniformArrayLength(value);
        if (length < matrixValues || length % matrixValues !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const requestedElements = length / matrixValues;
        if (!pub.isArray && requestedElements > pub.remainingArrayElements) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const elements = Math.min(requestedElements, pub.remainingArrayElements);
        const columnStride = 4;
        const matrixStride = pub.arrayStrideWords || columns * columnStride;
        for (let element = 0; element < elements; element++) {
            const sourceBase = element * matrixValues;
            const targetBase = pub.wordOffset + element * matrixStride;
            for (let column = 0; column < columns; column++) {
                for (let row = 0; row < rows; row++) {
                    const sourceIndex = transpose
                        ? sourceBase + row * columns + column
                        : sourceBase + column * rows + row;
                    target[targetBase + column * columnStride + row] = value[sourceIndex];
                }
            }
        }
    }
    uniformMatrix2fv(pub, transpose, v) {
        if (pub === null)
            return;
        this.writeFloatUniformMatrix(pub, transpose, v, 2, 2, WebGL2RenderingContext.FLOAT_MAT2);
    }
    uniformMatrix3fv(pub, transpose, v) {
        if (pub === null)
            return;
        this.writeFloatUniformMatrix(pub, transpose, v, 3, 3, WebGL2RenderingContext.FLOAT_MAT3);
    }
    uniformMatrix4fv(pub, transpose, v) {
        if (pub === null)
            return;
        this.writeFloatUniformMatrix(pub, transpose, v, 4, 4, WebGL2RenderingContext.FLOAT_MAT4);
    }
    createProgram() {
        return brandHydWebGlObject(new HydProgram(this.hydDevice, this.shaderTranslator, this.contextToken), "program");
    }
    createShader(type) {
        if (type !== WebGL2RenderingContext.VERTEX_SHADER && type !== WebGL2RenderingContext.FRAGMENT_SHADER) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        return brandHydWebGlObject(new HydShader(this.hydDevice, type, this.shaderTranslator, this.contextToken, this.hydContextType === "webgl2" ? 2 : 1), "shader");
    }
    createBuffer() {
        return brandHydWebGlObject(new HydBuffer(this.hydDevice, this.contextToken), "buffer");
    }
    createTexture() {
        return brandHydWebGlObject(new HydTexture(this.hydDevice, this.contextToken), "texture");
    }
    createFramebuffer() {
        return brandHydWebGlObject(new HydFramebuffer(this.contextToken), "framebuffer");
    }
    createRenderbuffer() {
        return brandHydWebGlObject(new HydTexture(this.hydDevice, this.contextToken), "renderbuffer");
    }
    createVertexArray() {
        return brandHydWebGlObject(new HydVertexArray(this.contextToken), "vertex-array");
    }
    currentTexture(target) {
        const viewDimension = enumToViewDimension.get(target);
        const texture = viewDimension
            ? this.hydGlobalState.getTextureUnitBinding(this.hydGlobalState.commonState.activeTextureUnit, viewDimension)
            : null;
        if (!texture) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        return texture;
    }
    isCubeFaceTarget(target) {
        return target >= WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X &&
            target <= WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z;
    }
    validateTexImage2DTarget(target) {
        const valid = target === WebGL2RenderingContext.TEXTURE_2D || this.isCubeFaceTarget(target);
        if (!valid)
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
        return valid;
    }
    validateTexImage2DDimensions(target, level, width, height) {
        const maxSize = enumToConstant.get(this.isCubeFaceTarget(target)
            ? WebGL2RenderingContext.MAX_CUBE_MAP_TEXTURE_SIZE
            : WebGL2RenderingContext.MAX_TEXTURE_SIZE) || 0;
        const maxLevel = Math.floor(Math.log2(maxSize));
        const levelLimit = level <= maxLevel ? Math.max(1, maxSize >> level) : 0;
        const powerOfTwo = (value) => value > 0 && (value & (value - 1)) === 0;
        const invalid = level < 0 || level > maxLevel || width < 0 || height < 0 ||
            width > levelLimit || height > levelLimit ||
            (this.isCubeFaceTarget(target) && width !== height) ||
            (this.hydContextType !== "webgl2" && level > 0 &&
                width > 0 && height > 0 && (!powerOfTwo(width) || !powerOfTwo(height)));
        if (invalid)
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
        return !invalid;
    }
    resolveTexImageSourceExtent(source) {
        if (!source)
            return null;
        if (typeof HTMLVideoElement !== "undefined" && source instanceof HTMLVideoElement) {
            return { width: source.videoWidth, height: source.videoHeight };
        }
        if (typeof HTMLImageElement !== "undefined" && source instanceof HTMLImageElement) {
            const imageUrl = source.currentSrc || source.src || "";
            const isSvg = /^data:image\/svg\+xml(?:[;,]|$)/i.test(imageUrl) || (() => {
                try {
                    return new URL(imageUrl, document.baseURI).pathname.toLowerCase().endsWith(".svg");
                }
                catch {
                    return false;
                }
            })();
            if (isSvg)
                return { width: source.width, height: source.height };
            return { width: source.naturalWidth, height: source.naturalHeight };
        }
        if (Number.isFinite(source.displayWidth) && Number.isFinite(source.displayHeight)) {
            return { width: source.displayWidth, height: source.displayHeight };
        }
        if (Number.isFinite(source.width) && Number.isFinite(source.height)) {
            return { width: source.width, height: source.height };
        }
        return null;
    }
    isKnownTextureFormat(format) {
        return format === WebGL2RenderingContext.ALPHA ||
            format === WebGL2RenderingContext.RGB ||
            format === WebGL2RenderingContext.RGBA ||
            format === WebGL2RenderingContext.LUMINANCE ||
            format === WebGL2RenderingContext.LUMINANCE_ALPHA ||
            format === WebGL2RenderingContext.DEPTH_COMPONENT ||
            format === WebGL2RenderingContext.DEPTH_STENCIL ||
            format === hydWebGLStatic_GL_SRGB_EXT ||
            format === hydWebGLStatic_GL_SRGB_ALPHA_EXT ||
            (this.hydContextType === "webgl2" && (format === WebGL2RenderingContext.RED ||
                format === WebGL2RenderingContext.RG ||
                format === WebGL2RenderingContext.RED_INTEGER ||
                format === WebGL2RenderingContext.RG_INTEGER ||
                format === WebGL2RenderingContext.RGBA_INTEGER));
    }
    isKnownTextureType(type) {
        return type === WebGL2RenderingContext.UNSIGNED_BYTE ||
            type === WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5 ||
            type === WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4 ||
            type === WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1 ||
            type === WebGL2RenderingContext.FLOAT ||
            type === 0x8D61 ||
            (this.hydContextType === "webgl2" && (type === WebGL2RenderingContext.BYTE ||
                type === WebGL2RenderingContext.SHORT ||
                type === WebGL2RenderingContext.UNSIGNED_SHORT ||
                type === WebGL2RenderingContext.INT ||
                type === WebGL2RenderingContext.UNSIGNED_INT ||
                type === WebGL2RenderingContext.HALF_FLOAT ||
                type === WebGL2RenderingContext.UNSIGNED_INT_24_8));
    }
    validateTextureUploadView(pixels, width, height, format, type) {
        if (pixels === null || !ArrayBuffer.isView(pixels))
            return true;
        const compatible = type === WebGL2RenderingContext.UNSIGNED_BYTE
            ? pixels instanceof Uint8Array || pixels instanceof Uint8ClampedArray
            : type === WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5 ||
                type === WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4 ||
                type === WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1 ||
                type === WebGL2RenderingContext.UNSIGNED_SHORT ||
                type === WebGL2RenderingContext.HALF_FLOAT || type === 0x8D61
                ? pixels instanceof Uint16Array
                : type === WebGL2RenderingContext.FLOAT
                    ? pixels instanceof Float32Array
                    : type === WebGL2RenderingContext.UNSIGNED_INT ||
                        type === WebGL2RenderingContext.UNSIGNED_INT_24_8
                        ? pixels instanceof Uint32Array
                        : type === WebGL2RenderingContext.INT
                            ? pixels instanceof Int32Array
                            : type === WebGL2RenderingContext.BYTE
                                ? pixels instanceof Int8Array
                                : type === WebGL2RenderingContext.SHORT
                                    ? pixels instanceof Int16Array
                                    : false;
        if (!compatible) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return false;
        }
        try {
            const bytesPerPixel = textureUploadBytesPerPixel(format, type);
            const required = packedPixelLayout(width, height, bytesPerPixel, this.hydGlobalState.miscState.unpackAlignment).requiredBytes;
            if (pixels.byteLength < required) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return false;
            }
        }
        catch {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return false;
        }
        return true;
    }
    isSupportedTextureUploadFormat(internalformat, format, type) {
        return ((internalformat === WebGL2RenderingContext.RGBA || internalformat === WebGL2RenderingContext.RGBA8) && format === WebGL2RenderingContext.RGBA && (type === WebGL2RenderingContext.UNSIGNED_BYTE || type === WebGL2RenderingContext.FLOAT))
            || (internalformat === WebGL2RenderingContext.RGBA8UI && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (internalformat === WebGL2RenderingContext.RGBA16UI && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.UNSIGNED_SHORT)
            || (internalformat === WebGL2RenderingContext.RGBA32UI && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT)
            || (internalformat === WebGL2RenderingContext.RGBA32I && format === WebGL2RenderingContext.RGBA_INTEGER && type === WebGL2RenderingContext.INT)
            || (internalformat === WebGL2RenderingContext.RGBA32F && format === WebGL2RenderingContext.RGBA && type === WebGL2RenderingContext.FLOAT)
            || (internalformat === WebGL2RenderingContext.RG32UI && format === WebGL2RenderingContext.RG_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT)
            || (internalformat === WebGL2RenderingContext.R32UI && format === WebGL2RenderingContext.RED_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT)
            || (internalformat === WebGL2RenderingContext.RG32F && format === WebGL2RenderingContext.RG && type === WebGL2RenderingContext.FLOAT)
            || (internalformat === WebGL2RenderingContext.R32F && format === WebGL2RenderingContext.RED && type === WebGL2RenderingContext.FLOAT)
            || (internalformat === WebGL2RenderingContext.DEPTH_COMPONENT32F && format === WebGL2RenderingContext.DEPTH_COMPONENT && type === WebGL2RenderingContext.FLOAT)
            || ((internalformat === WebGL2RenderingContext.DEPTH_COMPONENT ||
                internalformat === WebGL2RenderingContext.DEPTH_COMPONENT16 ||
                internalformat === WebGL2RenderingContext.DEPTH_COMPONENT24) &&
                format === WebGL2RenderingContext.DEPTH_COMPONENT &&
                (type === WebGL2RenderingContext.UNSIGNED_INT || type === WebGL2RenderingContext.UNSIGNED_SHORT))
            || (internalformat === WebGL2RenderingContext.LUMINANCE && format === WebGL2RenderingContext.LUMINANCE && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (internalformat === WebGL2RenderingContext.ALPHA && format === WebGL2RenderingContext.ALPHA && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (internalformat === WebGL2RenderingContext.LUMINANCE_ALPHA && format === WebGL2RenderingContext.LUMINANCE_ALPHA && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (((internalformat === hydWebGLStatic_GL_SRGB_EXT && format === hydWebGLStatic_GL_SRGB_EXT) ||
                (internalformat === hydWebGLStatic_GL_SRGB_ALPHA_EXT && format === hydWebGLStatic_GL_SRGB_ALPHA_EXT)) &&
                type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (this.hydContextType === "webgl2" &&
                ((internalformat === WebGL2RenderingContext.SRGB8 && format === WebGL2RenderingContext.RGB) ||
                    (internalformat === WebGL2RenderingContext.SRGB8_ALPHA8 && format === WebGL2RenderingContext.RGBA)) &&
                type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (internalformat === WebGL2RenderingContext.RGB && format === WebGL2RenderingContext.RGB &&
                (type === WebGL2RenderingContext.UNSIGNED_BYTE || type === WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5))
            || (internalformat === WebGL2RenderingContext.RGBA && format === WebGL2RenderingContext.RGBA &&
                (type === WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4 ||
                    type === WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1));
    }
    textureUploadExtensionsAllow(format, type) {
        if (this.hydContextType === "webgl2")
            return true;
        const extensionName = format === hydWebGLStatic_GL_SRGB_EXT || format === hydWebGLStatic_GL_SRGB_ALPHA_EXT
            ? "EXT_SRGB"
            : type === WebGL2RenderingContext.FLOAT
                ? "OES_TEXTURE_FLOAT"
                : type === 0x8D61
                    ? "OES_TEXTURE_HALF_FLOAT"
                    : (format === WebGL2RenderingContext.DEPTH_COMPONENT || format === WebGL2RenderingContext.DEPTH_STENCIL)
                        ? "WEBGL_DEPTH_TEXTURE"
                        : null;
        if (!extensionName || this.enabledExtensions.has(extensionName))
            return true;
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
        return false;
    }
    isSupportedTextureSubUploadFormat(format, type) {
        return this.isSupportedTextureUploadFormat(format, format, type)
            || (format === WebGL2RenderingContext.RGBA_INTEGER &&
                (type === WebGL2RenderingContext.UNSIGNED_BYTE ||
                    type === WebGL2RenderingContext.UNSIGNED_SHORT ||
                    type === WebGL2RenderingContext.UNSIGNED_INT ||
                    type === WebGL2RenderingContext.INT))
            || (format === WebGL2RenderingContext.RG_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT)
            || (format === WebGL2RenderingContext.RED_INTEGER && type === WebGL2RenderingContext.UNSIGNED_INT)
            || (format === WebGL2RenderingContext.RGBA && (type === WebGL2RenderingContext.UNSIGNED_BYTE || type === WebGL2RenderingContext.FLOAT))
            || (format === WebGL2RenderingContext.RG && type === WebGL2RenderingContext.FLOAT)
            || (format === WebGL2RenderingContext.RED && type === WebGL2RenderingContext.FLOAT)
            || (format === WebGL2RenderingContext.RGB && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (format === WebGL2RenderingContext.LUMINANCE && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (format === WebGL2RenderingContext.ALPHA && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (format === WebGL2RenderingContext.LUMINANCE_ALPHA && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || ((format === hydWebGLStatic_GL_SRGB_EXT || format === hydWebGLStatic_GL_SRGB_ALPHA_EXT) && type === WebGL2RenderingContext.UNSIGNED_BYTE)
            || (format === WebGL2RenderingContext.RGB && type === WebGL2RenderingContext.UNSIGNED_SHORT_5_6_5)
            || (format === WebGL2RenderingContext.RGBA &&
                (type === WebGL2RenderingContext.UNSIGNED_SHORT_4_4_4_4 ||
                    type === WebGL2RenderingContext.UNSIGNED_SHORT_5_5_5_1));
    }
    textureStorageUploadFormat(internalformat) {
        switch (internalformat) {
            case WebGL2RenderingContext.RGBA:
            case WebGL2RenderingContext.RGBA8:
                return { format: WebGL2RenderingContext.RGBA, type: WebGL2RenderingContext.UNSIGNED_BYTE };
            case WebGL2RenderingContext.RGBA8UI:
                return { format: WebGL2RenderingContext.RGBA_INTEGER, type: WebGL2RenderingContext.UNSIGNED_BYTE };
            case WebGL2RenderingContext.RGBA16UI:
                return { format: WebGL2RenderingContext.RGBA_INTEGER, type: WebGL2RenderingContext.UNSIGNED_SHORT };
            case WebGL2RenderingContext.RGBA32UI:
                return { format: WebGL2RenderingContext.RGBA_INTEGER, type: WebGL2RenderingContext.UNSIGNED_INT };
            case WebGL2RenderingContext.RGBA32I:
                return { format: WebGL2RenderingContext.RGBA_INTEGER, type: WebGL2RenderingContext.INT };
            case WebGL2RenderingContext.RGBA32F:
                return { format: WebGL2RenderingContext.RGBA, type: WebGL2RenderingContext.FLOAT };
            case WebGL2RenderingContext.RG32UI:
                return { format: WebGL2RenderingContext.RG_INTEGER, type: WebGL2RenderingContext.UNSIGNED_INT };
            case WebGL2RenderingContext.R32UI:
                return { format: WebGL2RenderingContext.RED_INTEGER, type: WebGL2RenderingContext.UNSIGNED_INT };
            case WebGL2RenderingContext.RG32F:
                return { format: WebGL2RenderingContext.RG, type: WebGL2RenderingContext.FLOAT };
            case WebGL2RenderingContext.R32F:
                return { format: WebGL2RenderingContext.RED, type: WebGL2RenderingContext.FLOAT };
            case WebGL2RenderingContext.DEPTH_COMPONENT16:
            case WebGL2RenderingContext.DEPTH_COMPONENT24:
            case WebGL2RenderingContext.DEPTH_COMPONENT:
                return { format: WebGL2RenderingContext.DEPTH_COMPONENT, type: WebGL2RenderingContext.UNSIGNED_INT };
            case WebGL2RenderingContext.DEPTH_COMPONENT32F:
                return { format: WebGL2RenderingContext.DEPTH_COMPONENT, type: WebGL2RenderingContext.FLOAT };
            default:
                throw new Error("unsupported texStorage internalformat: " + internalformat);
        }
    }
    pixelUnpackBufferSlice(byteOffset, width, height, depth, format, type) {
        const buffer = this.hydGlobalState.commonState.pixelUnpackBufferBinding;
        if (!buffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            throw new Error("texture upload offset requires PIXEL_UNPACK_BUFFER binding");
        }
        const bytesPerRow = width * textureUploadBytesPerPixel(format, type);
        const byteLength = bytesPerRow * height * depth;
        const end = byteOffset + byteLength;
        if (end > buffer.shadowData.byteLength) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            throw new Error(`PIXEL_UNPACK_BUFFER upload exceeds buffer size: ${byteOffset}+${byteLength}/${buffer.shadowData.byteLength}`);
        }
        return buffer.shadowData.subarray(byteOffset, end);
    }
    alignReadbackBytesPerRow(bytesPerRow) {
        return Math.ceil(bytesPerRow / 256) * 256;
    }
    getReadColorAttachment() {
        const framebuffer = this.hydGlobalState.commonState.readFramebufferBinding;
        let attachmentPoint = framebuffer.readBuffer;
        if (attachmentPoint === WebGL2RenderingContext.BACK) {
            attachmentPoint = WebGL2RenderingContext.COLOR_ATTACHMENT0;
        }
        return framebuffer.attachments.get(attachmentPoint) || framebuffer.attachments.get(WebGL2RenderingContext.COLOR_ATTACHMENT0) || null;
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
    validateFramebufferTarget(target) {
        const valid = target === WebGL2RenderingContext.FRAMEBUFFER ||
            (this.hydContextType === "webgl2" &&
                (target === WebGL2RenderingContext.DRAW_FRAMEBUFFER ||
                    target === WebGL2RenderingContext.READ_FRAMEBUFFER));
        if (!valid)
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
        return valid;
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
    getDrawFramebufferWidth() {
        const framebuffer = this.hydGlobalState.commonState.drawFramebufferBinding;
        if (framebuffer === this.hydGlobalState.defaultFramebuffer || framebuffer.drawBuffers.includes(WebGL2RenderingContext.BACK)) {
            return this.hydCanvas.width;
        }
        for (const attachment of framebuffer.attachments.values()) {
            if (attachment.width > 0) {
                return attachment.width;
            }
        }
        return this.hydCanvas.width;
    }
    toGpuViewport() {
        const [x, y, width, height, minDepth, maxDepth] = this.hydGlobalState.commonState.viewport;
        const framebufferHeight = this.getDrawFramebufferHeight();
        return [x, framebufferHeight - y - height, width, height, minDepth, maxDepth];
    }
    toGpuScissorRect() {
        const [x, y, width, height] = this.hydGlobalState.miscState.scissorBox;
        const framebufferWidth = this.getDrawFramebufferWidth();
        const framebufferHeight = this.getDrawFramebufferHeight();
        const x0 = Math.min(framebufferWidth, Math.max(0, x));
        const y0 = Math.min(framebufferHeight, Math.max(0, y));
        const x1 = Math.min(framebufferWidth, Math.max(0, x + width));
        const y1 = Math.min(framebufferHeight, Math.max(0, y + height));
        return [x0, framebufferHeight - y1, Math.max(0, x1 - x0), Math.max(0, y1 - y0)];
    }
    setGpuViewport() {
        const viewport = this.hydGlobalState.commonState.viewport;
        const framebufferHeight = this.getDrawFramebufferHeight();
        this.hydRpCache.RpSetViewportValues(viewport[0], framebufferHeight - viewport[1] - viewport[3], viewport[2], viewport[3], viewport[4], viewport[5]);
    }
    setGpuScissorRect() {
        this.hydRpCache.RpSetScissorRectValues(...this.toGpuScissorRect());
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
    markDrawFramebufferAttachmentsAsRenderTargets(mask) {
        const framebuffer = this.hydGlobalState.commonState.drawFramebufferBinding;
        if (framebuffer === this.hydGlobalState.defaultFramebuffer || mask === 0)
            return;
        let changed = false;
        for (const [point, attachment] of framebuffer.attachments) {
            const isColor = point >= WebGL2RenderingContext.COLOR_ATTACHMENT0 &&
                point <= WebGL2RenderingContext.COLOR_ATTACHMENT15;
            const isDepth = point === WebGL2RenderingContext.DEPTH_ATTACHMENT ||
                point === WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT;
            const isStencil = point === WebGL2RenderingContext.STENCIL_ATTACHMENT ||
                point === WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT;
            const isWritten = (isColor && Boolean(mask & WebGL2RenderingContext.COLOR_BUFFER_BIT)) ||
                (isDepth && Boolean(mask & WebGL2RenderingContext.DEPTH_BUFFER_BIT)) ||
                (isStencil && Boolean(mask & WebGL2RenderingContext.STENCIL_BUFFER_BIT));
            if (isWritten) {
                changed = attachment.attachment.markFramebufferRenderTarget() || changed;
            }
        }
        if (changed) {
            this.samplerOriginStateVersion++;
        }
    }
    colorWriteMaskForAttachment(attachment) {
        const [r, g, b, a] = this.hydGlobalState.miscState.colorWriteMask;
        const writesDefaultFramebuffer = this.hydGlobalState.commonState.drawFramebufferBinding === this.hydGlobalState.defaultFramebuffer;
        const targetHasAlpha = !attachment || attachment.colorBits[3] > 0;
        const writeAlpha = targetHasAlpha &&
            (writesDefaultFramebuffer && this.hydGlobalState.contextAttributes.alpha === false ? true : a);
        return (r ? GPUColorWrite.RED : 0) |
            (g ? GPUColorWrite.GREEN : 0) |
            (b ? GPUColorWrite.BLUE : 0) |
            (writeAlpha ? GPUColorWrite.ALPHA : 0);
    }
    getColorWriteMask() {
        const framebuffer = this.hydGlobalState.commonState.drawFramebufferBinding;
        if (framebuffer === this.hydGlobalState.defaultFramebuffer) {
            return this.colorWriteMaskForAttachment();
        }
        return framebuffer.drawBuffers.reduce((mask, point) => {
            const attachment = framebuffer.attachments.get(point);
            return mask | (attachment ? this.colorWriteMaskForAttachment(attachment) : 0);
        }, 0);
    }
    getMaskedClearTargets() {
        return this.hydGlobalState.commonState.drawFramebufferBinding.drawBuffers.flatMap((value) => {
            if (value === WebGL2RenderingContext.BACK) {
                return this.hydGlobalState.__canvasView ? [{
                        view: this.hydGlobalState.__canvasView,
                        format: "bgra8unorm",
                        writeMask: this.colorWriteMaskForAttachment(),
                    }] : [];
            }
            if (WebGL2RenderingContext.COLOR_ATTACHMENT0 <= value && value <= WebGL2RenderingContext.COLOR_ATTACHMENT15) {
                const attachment = this.hydGlobalState.commonState.drawFramebufferBinding.attachments.get(value);
                return attachment ? [{
                        view: attachment.view,
                        format: attachment.format,
                        writeMask: this.colorWriteMaskForAttachment(attachment),
                    }] : [];
            }
            return [];
        });
    }
    getMaskedClearPipeline(targets) {
        const key = targets.map((target) => `${target.format}:${target.writeMask}`).join(",");
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
                    targets: targets.map((target) => ({ format: target.format, writeMask: target.writeMask })),
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
        this.hydDevice.queue.writeBuffer(this.maskedClearUniformBuffer, 0, new Float32Array(this.hydGlobalState.commonState.drawFramebufferBinding === this.hydGlobalState.defaultFramebuffer &&
            this.hydGlobalState.contextAttributes.alpha === false
            ? [...this.hydGlobalState.clearState.color.slice(0, 3), 1]
            : this.hydGlobalState.clearState.color));
        const pipeline = this.getMaskedClearPipeline(targets);
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
        if (renderbuffer?.deleted) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (renderbuffer !== null && (!(renderbuffer instanceof HydTexture) || renderbuffer.ownerToken !== this.contextToken)) {
            this.setObjectValidationError(renderbuffer);
            return;
        }
        if (target === WebGL2RenderingContext.RENDERBUFFER) {
            if (renderbuffer)
                renderbuffer.initialized = true;
            this.hydGlobalState.commonState.renderbufferBinding = renderbuffer;
        }
        else {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        this.hydGlobalState.recordTransition("bindRenderbuffer", target, renderbuffer ? renderbuffer.hash : "null");
    }
    renderbufferStorage(target, internalFormat, width, height) {
        if (target !== WebGL2RenderingContext.RENDERBUFFER) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        const maxSize = Number(enumToConstant.get(WebGL2RenderingContext.MAX_RENDERBUFFER_SIZE)) || 4096;
        if (width < 0 || height < 0 || width > maxSize || height > maxSize) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (target === WebGL2RenderingContext.RENDERBUFFER) {
            const renderbuffer = this.hydGlobalState.commonState.renderbufferBinding;
            if (!renderbuffer) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            this._der_flush();
            renderbuffer.renderbufferInternalFormat = internalFormat;
            renderbuffer.renderbufferSamples = 0;
            switch (internalFormat) {
                case GL_SRGB8_ALPHA8_EXT:
                    if (this.hydContextType !== "webgl2" && !this.enabledExtensions.has("EXT_SRGB")) {
                        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                        return;
                    }
                    renderbuffer.renderbufferStorage('rgba8unorm-srgb', width, height);
                    break;
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
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                    return;
            }
        }
        this.hydGlobalState.recordTransition("renderbufferStorage", target, internalFormat, width, height);
    }
    enableVertexAttribArray(index) {
        index = Number(index) >>> 0;
        const attribute = this.hydGlobalState.commonState.vertexArrayBinding.attributes[index];
        if (!attribute) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (!attribute.enabled) {
            attribute.enabled = true;
            attribute.updateHash();
            this.hydGlobalState.recordTransition("enableVertexAttribArray", index);
        }
    }
    disableVertexAttribArray(index) {
        index = Number(index) >>> 0;
        const attribute = this.hydGlobalState.commonState.vertexArrayBinding.attributes[index];
        if (!attribute) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (attribute.enabled) {
            attribute.enabled = false;
            attribute.updateHash();
            this.hydGlobalState.recordTransition("disableVertexAttribArray", index);
        }
    }
    setCurrentVertexAttrib(index, x, y, z, w) {
        index = Number(index) >>> 0;
        const values = this.hydGlobalState.currentVertexAttribValues[index];
        if (!values) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (values[0] === x && values[1] === y && values[2] === z && values[3] === w)
            return;
        this._der_flush();
        values[0] = x;
        values[1] = y;
        values[2] = z;
        values[3] = w;
        this.hydGlobalState.updateCurrentVertexAttribBuffer(index);
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
        if (!values || values.length < 1) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        this.vertexAttrib1f(index, values[0]);
    }
    vertexAttrib2fv(index, values) {
        if (!values || values.length < 2) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        this.vertexAttrib2f(index, values[0], values[1]);
    }
    vertexAttrib3fv(index, values) {
        if (!values || values.length < 3) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        this.vertexAttrib3f(index, values[0], values[1], values[2]);
    }
    vertexAttrib4fv(index, values) {
        if (!values || values.length < 4) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        this.vertexAttrib4f(index, values[0], values[1], values[2], values[3]);
    }
    clearColor(r, g, b, a) {
        r = clampWebGlUnitFloat(r);
        g = clampWebGlUnitFloat(g);
        b = clampWebGlUnitFloat(b);
        a = clampWebGlUnitFloat(a);
        const [r1, g1, b1, a1] = this.hydGlobalState.clearState.color;
        if (r !== r1 || g !== g1 || b !== b1 || a !== a1) {
            this.hydGlobalState.clearState.color = [r, g, b, a];
            this.hydGlobalState.recordTransition("clearColor", r, g, b, a);
        }
    }
    clearDepth(depth) {
        depth = clampWebGlUnitFloat(depth);
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
        const validMask = WebGL2RenderingContext.COLOR_BUFFER_BIT |
            WebGL2RenderingContext.DEPTH_BUFFER_BIT |
            WebGL2RenderingContext.STENCIL_BUFFER_BIT;
        if ((mask & ~validMask) !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (this.framebufferStatus(this.hydGlobalState.commonState.drawFramebufferBinding) !== WebGL2RenderingContext.FRAMEBUFFER_COMPLETE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_FRAMEBUFFER_OPERATION);
            return;
        }
        ensureAutoFrame();
        if (this.canvasSizeDirty) {
            this.updateCanvasSize();
        }
        this.ensureDefaultFramebufferRenderTarget();
        if (this.hydGlobalState.commonState.drawFramebufferBinding === this.hydGlobalState.defaultFramebuffer &&
            this.defaultFramebufferNeedsImplicitClear) {
            this.materializeImplicitDefaultFramebufferClear();
            this._der_flush();
        }
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
        this.markDrawFramebufferAttachmentsAsRenderTargets(effectiveMask | (needsMaskedColorClear ? WebGL2RenderingContext.COLOR_BUFFER_BIT : 0));
        if ((effectiveMask & WebGL2RenderingContext.COLOR_BUFFER_BIT || needsMaskedColorClear) &&
            this.hydGlobalState.commonState.drawFramebufferBinding === this.hydGlobalState.defaultFramebuffer &&
            this.hydGlobalState.__canvasTexture === this.defaultFramebufferBackingTexture) {
            this.defaultFramebufferBackingNeedsPresentation = true;
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
        this.hydRpCache.RpClear(this[RENDER_PASS_DESCRIPTOR_CALLBACK]);
        this.hydGlobalState.clearState.target = previousTarget;
        this.hydGlobalState.recordTransition("clearMaterialized", effectiveMask, previousTarget);
    }
    depthFunc(func) {
        const tmp = enumToCompareFunction.get(func);
        if (!tmp) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (this.hydGlobalState.depthState.func !== tmp) {
            this.hydGlobalState.depthState.func = tmp;
            this.hydGlobalState.depthState.funcEnum = func;
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
        if (!tmp) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (this.hydGlobalState.polygonState.frontFace !== tmp) {
            this.hydGlobalState.polygonState.frontFace = tmp;
            this.hydGlobalState.polygonState.frontFaceEnum = mode;
            this.hydGlobalState.recordTransition("frontFace", mode);
        }
    }
    cullFace(mode) {
        let tmp = enumToCullFace.get(mode);
        if (!tmp) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (this.hydGlobalState.polygonState.cullFaceMode !== tmp) {
            this.hydGlobalState.polygonState.cullFaceMode = tmp;
            this.hydGlobalState.polygonState.cullFaceModeEnum = mode;
            this.hydGlobalState.recordTransition("cullFace", mode);
        }
    }
    bufferBindingKindForTarget(target) {
        if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER) {
            return "element-array";
        }
        if (target === WebGL2RenderingContext.ARRAY_BUFFER) {
            return "other";
        }
        if (this.hydContextType === "webgl2" &&
            (target === WebGL2RenderingContext.PIXEL_PACK_BUFFER ||
                target === WebGL2RenderingContext.PIXEL_UNPACK_BUFFER)) {
            return "other";
        }
        return null;
    }
    bindBuffer(target, buffer) {
        if (buffer instanceof HydBuffer && buffer.ownerToken === this.contextToken && !buffer.deleted) {
            if (target === WebGL2RenderingContext.ARRAY_BUFFER && buffer.bindingKind === "other") {
                this.hydGlobalState.commonState.arrayBufferBinding = buffer;
                return;
            }
            if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER && buffer.bindingKind === "element-array") {
                if (this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding !== buffer) {
                    this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding = buffer;
                    this.hydGlobalState.recordTransition("bindBuffer", target, buffer.hash);
                }
                return;
            }
        }
        if (target === WebGL2RenderingContext.ARRAY_BUFFER &&
            buffer === this.hydGlobalState.commonState.arrayBufferBinding) {
            return;
        }
        if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER &&
            buffer === this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding) {
            return;
        }
        if (this.hydContextType === "webgl2" && target === WebGL2RenderingContext.PIXEL_PACK_BUFFER &&
            buffer === this.hydGlobalState.commonState.pixelPackBufferBinding) {
            return;
        }
        if (this.hydContextType === "webgl2" && target === WebGL2RenderingContext.PIXEL_UNPACK_BUFFER &&
            buffer === this.hydGlobalState.commonState.pixelUnpackBufferBinding) {
            return;
        }
        if (buffer instanceof HydBuffer &&
            (target === WebGL2RenderingContext.ARRAY_BUFFER || target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER)) {
            if (buffer.ownerToken !== this.contextToken || buffer.deleted) {
                this.setObjectValidationError(buffer);
                return;
            }
            const bindingKind = target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER ? "element-array" : "other";
            if (buffer.bindingKind && buffer.bindingKind !== bindingKind) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            buffer.bindingKind = bindingKind;
            buffer.initialized = true;
            if (target === WebGL2RenderingContext.ARRAY_BUFFER) {
                this.hydGlobalState.commonState.arrayBufferBinding = buffer;
            }
            else {
                this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding = buffer;
                this.hydGlobalState.recordTransition("bindBuffer", target, buffer.hash);
            }
            return;
        }
        const bindingKind = this.bufferBindingKindForTarget(target);
        if (!bindingKind) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        let hydBuffer;
        if (buffer instanceof HydBuffer) {
            if (buffer.ownerToken !== this.contextToken || buffer.deleted) {
                this.setObjectValidationError(buffer);
                return;
            }
            hydBuffer = buffer;
        }
        else {
            hydBuffer = this.normalizeBuffer(buffer);
        }
        if (hydBuffer && hydBuffer.bindingKind && hydBuffer.bindingKind !== bindingKind) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (hydBuffer && !hydBuffer.bindingKind) {
            hydBuffer.bindingKind = bindingKind;
        }
        if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER) {
            if (hydBuffer)
                hydBuffer.initialized = true;
            if (this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding !== hydBuffer) {
                this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding = hydBuffer;
                this.hydGlobalState.recordTransition("bindBuffer", target, hydBuffer ? hydBuffer.hash : "null");
            }
        }
        else if (target === WebGL2RenderingContext.ARRAY_BUFFER) {
            if (hydBuffer)
                hydBuffer.initialized = true;
            if (this.hydGlobalState.commonState.arrayBufferBinding !== hydBuffer) {
                this.hydGlobalState.commonState.arrayBufferBinding = hydBuffer;
            }
        }
        else if (target === WebGL2RenderingContext.PIXEL_PACK_BUFFER) {
            if (hydBuffer)
                hydBuffer.initialized = true;
            if (this.hydGlobalState.commonState.pixelPackBufferBinding !== hydBuffer) {
                this.hydGlobalState.commonState.pixelPackBufferBinding = hydBuffer;
            }
        }
        else if (target === WebGL2RenderingContext.PIXEL_UNPACK_BUFFER) {
            if (hydBuffer)
                hydBuffer.initialized = true;
            if (this.hydGlobalState.commonState.pixelUnpackBufferBinding !== hydBuffer) {
                this.hydGlobalState.commonState.pixelUnpackBufferBinding = hydBuffer;
            }
        }
    }
    getBoundBufferForTarget(target) {
        if (!this.bufferBindingKindForTarget(target)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        if (target === WebGL2RenderingContext.ARRAY_BUFFER) {
            return this.hydGlobalState.commonState.arrayBufferBinding;
        }
        if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER) {
            return this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
        }
        if (target === WebGL2RenderingContext.PIXEL_PACK_BUFFER) {
            return this.hydGlobalState.commonState.pixelPackBufferBinding;
        }
        if (target === WebGL2RenderingContext.PIXEL_UNPACK_BUFFER) {
            return this.hydGlobalState.commonState.pixelUnpackBufferBinding;
        }
        return null;
    }
    bufferData(target, data, usage) {
        const drawUsage = usage === WebGL2RenderingContext.STATIC_DRAW ||
            usage === WebGL2RenderingContext.DYNAMIC_DRAW ||
            usage === WebGL2RenderingContext.STREAM_DRAW;
        const webgl2Usage = usage === WebGL2RenderingContext.STATIC_READ ||
            usage === WebGL2RenderingContext.DYNAMIC_READ ||
            usage === WebGL2RenderingContext.STREAM_READ ||
            usage === WebGL2RenderingContext.STATIC_COPY ||
            usage === WebGL2RenderingContext.DYNAMIC_COPY ||
            usage === WebGL2RenderingContext.STREAM_COPY;
        if (!drawUsage && !(this.hydContextType === "webgl2" && webgl2Usage)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (!this.bufferBindingKindForTarget(target)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        const buffer = this.getBoundBufferForTarget(target);
        if (!buffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        let source = null;
        let size;
        if (data === null || data === undefined) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (isBufferSource(data)) {
            source = data;
            size = data.byteLength;
        }
        else {
            const converted = Number(data);
            size = Number.isFinite(converted) ? Math.trunc(converted) : 0;
        }
        if (size < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        this._der_flush();
        if (target === WebGL2RenderingContext.ARRAY_BUFFER) {
            buffer.descriptor.usage |= GPUBufferUsage.VERTEX;
        }
        else if (target === WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER) {
            buffer.descriptor.usage |= GPUBufferUsage.INDEX;
        }
        else if (target === WebGL2RenderingContext.PIXEL_PACK_BUFFER || target === WebGL2RenderingContext.PIXEL_UNPACK_BUFFER) {
            buffer.descriptor.usage |= GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
        }
        buffer.webglSize = size;
        buffer.descriptor.size = Math.max(4, Math.ceil(size / 4) * 4);
        const invalidatesConvertedVertices = buffer.hasConvertedVertexBuffers;
        buffer.write(source, 0);
        buffer.webglUsage = usage;
        this.hydGlobalState.recordTransition("bufferData", target, buffer.hash, size, invalidatesConvertedVertices ? buffer.version : 0);
    }
    bufferSubData(target, dstOffset, data) {
        if (!this.bufferBindingKindForTarget(target)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        const buffer = this.getBoundBufferForTarget(target);
        if (!buffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (!isBufferSource(data)) {
            throw new TypeError("bufferSubData requires an ArrayBuffer or ArrayBufferView");
        }
        const offset = toWebGlInt64(dstOffset);
        if (offset < 0 || offset + data.byteLength > buffer.webglSize) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (data.byteLength === 0)
            return;
        this._der_flush();
        const invalidatesConvertedVertices = buffer.hasConvertedVertexBuffers;
        buffer.write(data, offset);
        if (invalidatesConvertedVertices) {
            this.hydGlobalState.recordTransition("bufferSubDataConvertedVertex", buffer.hash, buffer.version);
        }
    }
    getBufferSubData(target, srcByteOffset, dstData, dstOffset = 0, length) {
        const buffer = this.getBoundBufferForTarget(target);
        if (!buffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            throw new Error("getBufferSubData called with no buffer bound for target: " + target);
        }
        const dst = new Uint8Array(dstData.buffer, dstData.byteOffset, dstData.byteLength);
        const bytesPerElement = dstData.BYTES_PER_ELEMENT || 1;
        const byteOffset = dstOffset * bytesPerElement;
        const byteLength = length === undefined ? dst.byteLength - byteOffset : length * bytesPerElement;
        dst.set(buffer.shadowData.subarray(srcByteOffset, srcByteOffset + byteLength), byteOffset);
    }
    getActiveUniform(program, index) {
        if (program === null || program === undefined) {
            throw new TypeError("getActiveUniform requires a WebGLProgram");
        }
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return null;
        }
        const publicUniforms = program.hydUniforms.filter(isVisibleActiveUniform);
        const publicSamplers = program.hydSamplers.filter((sampler) => sampler.arrayIndex === undefined || sampler.arrayIndex === 0);
        if (index < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return null;
        }
        if (index < publicUniforms.length) {
            const uniform = publicUniforms[index];
            const baseName = uniform.sourceName || uniform.name;
            return brandHydWebGlObject({
                name: uniform.isArray ? `${baseName}[0]` : baseName,
                size: uniform.size,
                type: uniform.webgl_type,
            }, "active-info");
        }
        else if (index - publicUniforms.length < publicSamplers.length) {
            const sampler = publicSamplers[index - publicUniforms.length];
            return brandHydWebGlObject({
                name: sampler.arrayName ? `${sampler.arrayName}[0]` : (sampler.sourceName || sampler.name),
                size: sampler.size,
                type: sampler.webgl_type,
            }, "active-info");
        }
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
        return null;
    }
    getUniformIndices(program, uniformNames) {
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return null;
        }
        const publicUniforms = program.hydUniforms.filter(isVisibleActiveUniform);
        const publicSamplers = program.hydSamplers.filter((sampler) => sampler.arrayIndex === undefined || sampler.arrayIndex === 0);
        return uniformNames.map((name) => {
            const safeName = name.replace(/[^A-Za-z0-9_]/g, "_").replace(/_+$/g, "");
            const uniformIndex = publicUniforms.findIndex((uniform) => uniform.name === name || uniform.name === safeName || uniform.sourceName === name);
            if (uniformIndex >= 0) {
                return uniformIndex;
            }
            const samplerIndex = publicSamplers.findIndex((sampler) => sampler.name === name || sampler.name === safeName || sampler.sourceName === name || sampler.arrayName === name);
            if (samplerIndex >= 0) {
                return publicUniforms.length + samplerIndex;
            }
            return 0xffffffff;
        });
    }
    getActiveUniforms(program, uniformIndices, pname) {
        const publicUniforms = program.hydUniforms.filter(isVisibleActiveUniform);
        const publicSamplers = program.hydSamplers.filter((sampler) => sampler.arrayIndex === undefined || sampler.arrayIndex === 0);
        const entries = [...publicUniforms, ...publicSamplers];
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
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                    return null;
            }
        });
    }
    getActiveAttrib(program, index) {
        if (program === null || program === undefined) {
            throw new TypeError("getActiveAttrib requires a WebGLProgram");
        }
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return null;
        }
        if (index < 0 || index >= program.hydAttributes.length) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return null;
        }
        return brandHydWebGlObject({
            name: program.hydAttributes[index].name,
            size: program.hydAttributes[index].size,
            type: program.hydAttributes[index].type,
        }, "active-info");
    }
    attachShader(program, shader) {
        if (!this.isProgram(program) || !this.isShader(shader)) {
            this.setShaderProgramValidationError(program, shader);
            return;
        }
        if (!program.attachShader(shader)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
        }
    }
    compileShader(s) {
        if (!this.isShader(s) || (s.deleted && s.attachmentCount === 0)) {
            this.setShaderProgramValidationError(s);
            return;
        }
        s.compiled = false;
        s.infoLog = "";
        const validationContext = nativeValidationContext(this.hydContextType);
        if (!validationContext) {
            s.infoLog = "Native WebGL shader validation context is unavailable.";
            return;
        }
        if (s.validationShader && s.validationContext) {
            s.validationContext.deleteShader(s.validationShader);
        }
        const shader = validationContext.createShader(s.type);
        if (!shader) {
            s.infoLog = "Unable to create native validation shader.";
            return;
        }
        validationContext.shaderSource(shader, bridgeGlslDunderIdentifiers(s.glsl_shader));
        validationContext.compileShader(shader);
        s.validationShader = shader;
        s.validationContext = validationContext;
        s.compiled = Boolean(validationContext.getShaderParameter(shader, WebGL2RenderingContext.COMPILE_STATUS));
        s.infoLog = validationContext.getShaderInfoLog(shader) || "";
        const debugShaders = validationContext.getExtension('WEBGL_debug_shaders');
        s.translated_glsl_shader = debugShaders && s.compiled
            ? debugShaders.getTranslatedShaderSource(shader)
            : "";
        if (!s.compiled) {
            return;
        }
        try {
            s.compileShader();
        }
        catch (error) {
            s.compiled = false;
            s.infoLog = `GL2GPU shader preprocessing failed: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
    useProgram(program) {
        if (program !== null && !this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return;
        }
        if (program !== null && !program.linked) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (this.hydGlobalState.commonState.currentProgram !== program) {
            const previousProgram = this.hydGlobalState.commonState.currentProgram;
            this.hydGlobalState.commonState.currentProgram = program;
            this.currentProgramValid = Boolean(program?.linked);
            this.activateUniformLocations(program);
            this.hydGlobalState.recordTransition("useProgram", program ? program.hash : "null");
            if (previousProgram?.deleted) {
                this.finalizeProgramDeletion(previousProgram);
            }
        }
    }
    linkProgram(program) {
        if (!this.isProgram(program) || (program.deleted && this.hydGlobalState.commonState.currentProgram !== program)) {
            this.setShaderProgramValidationError(program);
            return;
        }
        program.linkGeneration++;
        program.linked = false;
        this.lastDrawPbv = null;
        if (this.hydGlobalState.commonState.currentProgram === program) {
            this.currentProgramValid = false;
            this.activateUniformLocations(null);
        }
        program.uniformBufferLocations = [];
        program.uniformSamplerLocations = [];
        program.infoLog = "";
        const attachedShaders = program.getAttachedShaders();
        if (attachedShaders.length !== 2 || attachedShaders.some((shader) => !shader.compiled || !shader.validationShader)) {
            program.infoLog = "A successfully compiled vertex shader and fragment shader must both be attached.";
            return;
        }
        const validationContext = nativeValidationContext(this.hydContextType);
        if (validationContext) {
            if (attachedShaders.some((shader) => shader.validationContext !== validationContext)) {
                program.infoLog = "Attached shaders were not compiled for this WebGL context version.";
                return;
            }
            const validationProgram = validationContext.createProgram();
            if (!validationProgram) {
                program.infoLog = "Unable to create native validation program.";
                return;
            }
            for (const shader of attachedShaders) {
                validationContext.attachShader(validationProgram, shader.validationShader);
            }
            for (const [name, index] of program.boundAttributeLocations) {
                validationContext.bindAttribLocation(validationProgram, index, bridgeGlslDunderIdentifier(name));
            }
            validationContext.linkProgram(validationProgram);
            const linked = Boolean(validationContext.getProgramParameter(validationProgram, WebGL2RenderingContext.LINK_STATUS));
            const infoLog = validationContext.getProgramInfoLog(validationProgram) || "";
            validationContext.deleteProgram(validationProgram);
            if (!linked) {
                program.infoLog = infoLog;
                return;
            }
        }
        try {
            if (program.linkProgram()) {
                if (this.hydGlobalState.commonState.currentProgram === program) {
                    this.currentProgramValid = true;
                    this.activateUniformLocations(program);
                }
                this.hydGlobalState.recordTransition("linkProgram", program.hash, program.linkGeneration);
            }
            else if (program.infoLog) {
                console.error("[HYD] Program link failed:", program.infoLog);
            }
        }
        catch (error) {
            program.linked = false;
            program.infoLog = error instanceof Error ? error.message : String(error);
            console.error("[HYD] Program link failed after shader translation:", program.infoLog);
        }
    }
    validateProgram(program) {
        if (!this.isProgram(program)) {
            this.setShaderProgramValidationError(program);
            return;
        }
        program.validated = program.linked;
    }
    bindVertexArray(vertexArray) {
        if (vertexArray !== null && !this.isVertexArray(vertexArray)) {
            this.setObjectValidationError(vertexArray);
            return;
        }
        const target = vertexArray || this.hydGlobalState.defaultVertexArrayBinding;
        if (this.hydGlobalState.commonState.vertexArrayBinding !== target) {
            this.hydGlobalState.commonState.vertexArrayBinding = target;
            this.hydGlobalState.recordTransition("bindVertexArray", target.hash);
        }
    }
    activeTexture(texture) {
        const target = texture - WebGL2RenderingContext.TEXTURE0;
        const maxTextureUnits = enumToConstant.get(WebGL2RenderingContext.MAX_COMBINED_TEXTURE_IMAGE_UNITS) || 0;
        if (target < 0 || target >= maxTextureUnits) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (this.hydGlobalState.commonState.activeTextureUnit !== target) {
            this.hydGlobalState.commonState.activeTextureUnit = target;
        }
    }
    bindTexture(target, texture) {
        const vd = enumToViewDimension.get(target);
        const webgl2OnlyTarget = target === WebGL2RenderingContext.TEXTURE_3D ||
            target === WebGL2RenderingContext.TEXTURE_2D_ARRAY;
        if (!vd || (this.hydContextType !== "webgl2" && webgl2OnlyTarget)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        let hydTexture;
        if (texture instanceof HydTexture) {
            if (texture.deleted) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            if (texture.ownerToken !== this.contextToken) {
                this.setObjectValidationError(texture);
                return;
            }
            hydTexture = texture;
        }
        else {
            hydTexture = this.normalizeTexture(texture);
        }
        if (hydTexture)
            hydTexture.initialized = true;
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
        console.assert(args.length === 9 || args.length === 6);
        const target = args.at(0);
        const level = args.at(1);
        const internalformat = args.at(2);
        let width;
        let height;
        const border = 0;
        const format = args.at(-3);
        const type = args.at(-2);
        const sourcePixels = args.at(-1);
        let pixels = sourcePixels;
        if (!this.validateTexImage2DTarget(target))
            return;
        if (args.length === 6) {
            const extent = this.resolveTexImageSourceExtent(sourcePixels);
            if (!extent) {
                throw new Error("unsupported texImage2D: " + args);
            }
            width = extent.width;
            height = extent.height;
        }
        else {
            width = args.at(3);
            height = args.at(4);
            if (this.hydContextType !== "webgl2" && sourcePixels !== null && !ArrayBuffer.isView(sourcePixels)) {
                throw new TypeError("texImage2D pixels must be an ArrayBufferView or null");
            }
        }
        if ((args.length === 9 && args.at(5) !== 0) ||
            !this.validateTexImage2DDimensions(target, level, width, height)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (!this.isKnownTextureFormat(format) || !this.isKnownTextureType(type)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (sourcePixels instanceof HTMLCanvasElement) {
            pixels = hydCanvasContexts.get(sourcePixels)?.prepareCanvasForTextureUpload() || sourcePixels;
        }
        if (!this.textureUploadExtensionsAllow(format, type))
            return;
        if (!this.isSupportedTextureUploadFormat(internalformat, format, type)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (!this.validateTextureUploadView(pixels, width, height, format, type))
            return;
        const unpack = this.hydGlobalState.miscState.unpackState;
        const texture = this.currentTexture(target);
        if (!texture)
            return;
        this._der_flush();
        try {
            texture.texImage2D(pixels, target, level, internalformat, width, height, border, format, type, unpack);
        }
        catch (error) {
            if (error?.name === "SecurityError")
                throw error;
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("texImage2D", target, level, internalformat, width, height, border, format, type);
    }
    compressedTexImage2D(...args) {
        if (this.hydContextType !== "webgl2" && (args.length < 7 || !ArrayBuffer.isView(args[6]))) {
            throw new TypeError(`compressedTexImage2D requires 7 arguments in WebGL 1, received ${args.length}`);
        }
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
    }
    compressedTexSubImage2D(...args) {
        if (this.hydContextType !== "webgl2" && (args.length < 8 || !ArrayBuffer.isView(args[7]))) {
            throw new TypeError(`compressedTexSubImage2D requires 8 arguments in WebGL 1, received ${args.length}`);
        }
        this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
    }
    texStorage2D(target, levels, internalformat, width, height) {
        this._der_flush();
        if (levels < 1) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const { format, type } = this.textureStorageUploadFormat(internalformat);
        this.currentTexture(target).texImage2D(null, target, 0, internalformat, width, height, 0, format, type, this.hydGlobalState.miscState.unpackState);
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("texStorage2D", target, levels, internalformat, width, height);
    }
    texSubImage2D(...args) {
        console.assert(args.length === 7 || args.length === 9 || args.length === 8 || args.length === 10);
        const target = args.at(0);
        const level = args.at(1);
        const xoffset = args.at(2);
        const yoffset = args.at(3);
        let width;
        let height;
        let format;
        let type;
        let pixels;
        if (!this.validateTexImage2DTarget(target))
            return;
        if (args.length === 7 || args.length === 8) {
            format = args.at(4);
            type = args.at(5);
            pixels = args.at(6);
            if (args.length === 8 && pixels && "byteLength" in pixels) {
                const sourceOffset = args.at(7) || 0;
                const byteOffset = sourceOffset * (pixels.BYTES_PER_ELEMENT || 1);
                pixels = new Uint8Array(pixels.buffer, pixels.byteOffset + byteOffset, pixels.byteLength - byteOffset);
            }
            const extent = this.resolveTexImageSourceExtent(pixels);
            if (!extent) {
                throw new Error("unsupported texSubImage2D: " + args);
            }
            width = extent.width;
            height = extent.height;
        }
        else {
            width = args.at(4);
            height = args.at(5);
            format = args.at(6);
            type = args.at(7);
            pixels = args.at(8);
            if (this.hydContextType !== "webgl2" && pixels !== null && !ArrayBuffer.isView(pixels)) {
                throw new TypeError("texSubImage2D pixels must be an ArrayBufferView or null");
            }
            if (typeof pixels === "number") {
                pixels = this.pixelUnpackBufferSlice(pixels, width, height, 1, format, type);
            }
            else if (args.length === 10 && pixels && "byteLength" in pixels) {
                const sourceOffset = args.at(9) || 0;
                const byteOffset = sourceOffset * (pixels.BYTES_PER_ELEMENT || 1);
                pixels = new Uint8Array(pixels.buffer, pixels.byteOffset + byteOffset, pixels.byteLength - byteOffset);
            }
        }
        if (level < 0 || xoffset < 0 || yoffset < 0 || width < 0 || height < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (!this.isKnownTextureFormat(format) || !this.isKnownTextureType(type)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (pixels === null) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (pixels instanceof HTMLCanvasElement) {
            pixels = hydCanvasContexts.get(pixels)?.prepareCanvasForTextureUpload() || pixels;
        }
        if (!this.textureUploadExtensionsAllow(format, type))
            return;
        if (!this.isSupportedTextureSubUploadFormat(format, type)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const texture = this.currentTexture(target);
        if (!texture)
            return;
        const image = texture.getImageState(target, level);
        if (!image) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (xoffset > image.width || yoffset > image.height ||
            width > image.width - xoffset || height > image.height - yoffset) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (image.format !== format || (this.hydContextType !== "webgl2" && image.type !== type)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (!this.validateTextureUploadView(pixels, width, height, format, type))
            return;
        const unpack = this.hydGlobalState.miscState.unpackState;
        this._der_flush();
        try {
            texture.texSubImage2D(pixels, target, level, xoffset, yoffset, width, height, format, type, unpack);
        }
        catch (error) {
            if (error?.name === "SecurityError")
                throw error;
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("texSubImage2D", target, level, xoffset, yoffset, width, height, format, type);
    }
    texStorage3D(target, levels, internalformat, width, height, depth) {
        this._der_flush();
        if (levels < 1) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const { format, type } = this.textureStorageUploadFormat(internalformat);
        this.currentTexture(target).texImage3D(null, target, 0, internalformat, width, height, depth, 0, format, type, 0);
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("texStorage3D", target, levels, internalformat, width, height, depth);
    }
    texImage3D(...args) {
        this._der_flush();
        if (args.length === 10) {
            args.push(0);
        }
        console.assert(args.length === 11);
        const [target, level, internalformat, width, height, depth, border, format, type, rawPixels, offset] = args;
        let pixels = rawPixels;
        if (pixels instanceof HTMLVideoElement
            || border !== 0) {
            throw new Error("unsupported texImage3D: " + args);
        }
        if (typeof pixels === "number") {
            pixels = this.pixelUnpackBufferSlice(pixels, width, height, depth, format, type);
        }
        else if (offset && pixels && "byteLength" in pixels) {
            const byteOffset = offset * (pixels.BYTES_PER_ELEMENT || 1);
            pixels = new Uint8Array(pixels.buffer, pixels.byteOffset + byteOffset, pixels.byteLength - byteOffset);
        }
        if (!this.isSupportedTextureUploadFormat(internalformat, format, type)) {
            throw new Error("unsupported texImage3D: " + args);
        }
        this.currentTexture(target).texImage3D(pixels, target, level, internalformat, width, height, depth, border, format, type, offset);
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("texImage3D", target, level, internalformat, width, height, depth, border, format, type, offset);
    }
    texSubImage3D(...args) {
        this._der_flush();
        console.assert(args.length === 11 || args.length === 12);
        const target = args.at(0);
        const level = args.at(1);
        const xoffset = args.at(2);
        const yoffset = args.at(3);
        const zoffset = args.at(4);
        const width = args.at(5);
        const height = args.at(6);
        const depth = args.at(7);
        const format = args.at(8);
        const type = args.at(9);
        let pixels = args.at(10);
        if (typeof pixels === "number") {
            pixels = this.pixelUnpackBufferSlice(pixels, width, height, depth, format, type);
        }
        else if (args.length === 12 && pixels && "byteLength" in pixels) {
            const sourceOffset = args.at(11) || 0;
            const byteOffset = sourceOffset * (pixels.BYTES_PER_ELEMENT || 1);
            pixels = new Uint8Array(pixels.buffer, pixels.byteOffset + byteOffset, pixels.byteLength - byteOffset);
        }
        if (!this.isSupportedTextureSubUploadFormat(format, type)) {
            throw new Error("unsupported texSubImage3D: " + args);
        }
        const unpack = this.hydGlobalState.miscState.unpackState;
        this.currentTexture(target).texSubImage3D(pixels, target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, unpack);
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("texSubImage3D", target, level, xoffset, yoffset, zoffset, width, height, depth, format, type);
    }
    texParameteri(target, pname, param) {
        const validTargets = new Set([
            WebGL2RenderingContext.TEXTURE_2D,
            WebGL2RenderingContext.TEXTURE_CUBE_MAP,
            ...(this.hydContextType === "webgl2" ? [WebGL2RenderingContext.TEXTURE_3D, WebGL2RenderingContext.TEXTURE_2D_ARRAY] : []),
        ]);
        if (!validTargets.has(target)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        const viewDimension = enumToViewDimension.get(target);
        const texture = this.hydGlobalState.getTextureUnitBinding(this.hydGlobalState.commonState.activeTextureUnit, viewDimension);
        if (!texture) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const minFilters = new Set([
            WebGL2RenderingContext.NEAREST,
            WebGL2RenderingContext.LINEAR,
            WebGL2RenderingContext.NEAREST_MIPMAP_NEAREST,
            WebGL2RenderingContext.LINEAR_MIPMAP_NEAREST,
            WebGL2RenderingContext.NEAREST_MIPMAP_LINEAR,
            WebGL2RenderingContext.LINEAR_MIPMAP_LINEAR,
        ]);
        const magFilters = new Set([WebGL2RenderingContext.NEAREST, WebGL2RenderingContext.LINEAR]);
        const wrapModes = new Set([WebGL2RenderingContext.CLAMP_TO_EDGE, WebGL2RenderingContext.MIRRORED_REPEAT, WebGL2RenderingContext.REPEAT]);
        const valid = (pname === WebGL2RenderingContext.TEXTURE_MIN_FILTER && minFilters.has(param)) ||
            (pname === WebGL2RenderingContext.TEXTURE_MAG_FILTER && magFilters.has(param)) ||
            ((pname === WebGL2RenderingContext.TEXTURE_WRAP_S || pname === WebGL2RenderingContext.TEXTURE_WRAP_T ||
                (this.hydContextType === "webgl2" && pname === WebGL2RenderingContext.TEXTURE_WRAP_R)) && wrapModes.has(param));
        if (!valid) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        texture.texParameteri(pname, param);
        this.hydGlobalState.recordTransition("texParameteri", target, pname, param);
    }
    texParameterf(target, pname, param) {
        this.texParameteri(target, pname, param);
    }
    generateMipmap(target) {
        if (target !== WebGL2RenderingContext.TEXTURE_2D && target !== WebGL2RenderingContext.TEXTURE_CUBE_MAP) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        const texture = this.currentTexture(target);
        if (!texture)
            return;
        const baseTarget = target === WebGL2RenderingContext.TEXTURE_CUBE_MAP
            ? WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X
            : WebGL2RenderingContext.TEXTURE_2D;
        const baseImage = texture.getImageState(baseTarget, 0);
        const powerOfTwo = (value) => value > 0 && (value & (value - 1)) === 0;
        if (!baseImage || baseImage.width <= 0 || baseImage.height <= 0 ||
            (this.hydContextType !== "webgl2" &&
                (baseImage.internalFormat === hydWebGLStatic_GL_SRGB_EXT || baseImage.internalFormat === hydWebGLStatic_GL_SRGB_ALPHA_EXT)) ||
            (target === WebGL2RenderingContext.TEXTURE_CUBE_MAP && !texture.isCubeCompleteAtLevel(0)) ||
            (this.hydContextType !== "webgl2" && (!powerOfTwo(baseImage.width) || !powerOfTwo(baseImage.height))) ||
            !texture.generateMipmap(target)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this.hydGlobalState.recordTransition("generateMipmap", target);
    }
    getTexParameter(target, pname) {
        const validTargets = target === WebGL2RenderingContext.TEXTURE_2D || target === WebGL2RenderingContext.TEXTURE_CUBE_MAP ||
            (this.hydContextType === "webgl2" && (target === WebGL2RenderingContext.TEXTURE_3D || target === WebGL2RenderingContext.TEXTURE_2D_ARRAY));
        if (!validTargets) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        const texture = this.hydGlobalState.getTextureUnitBinding(this.hydGlobalState.commonState.activeTextureUnit, enumToViewDimension.get(target));
        if (!texture) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return null;
        }
        const validPname = pname === WebGL2RenderingContext.TEXTURE_MIN_FILTER ||
            pname === WebGL2RenderingContext.TEXTURE_MAG_FILTER ||
            pname === WebGL2RenderingContext.TEXTURE_WRAP_S ||
            pname === WebGL2RenderingContext.TEXTURE_WRAP_T ||
            (this.hydContextType === "webgl2" && pname === WebGL2RenderingContext.TEXTURE_WRAP_R);
        if (!validPname) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        return texture.webglParameters.get(pname);
    }
    viewport(x, y, width, height) {
        if (width < 0 || height < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        width = Math.min(width, this.maxDrawingBufferDimension);
        height = Math.min(height, this.maxDrawingBufferDimension);
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
        if (width < 0 || height < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const scissorBox = this.hydGlobalState.miscState.scissorBox;
        if (scissorBox[0] !== x || scissorBox[1] !== y || scissorBox[2] !== width || scissorBox[3] !== height) {
            this._der_flush();
            this.gpuScissorDirty = true;
        }
        this.hydGlobalState.miscState.scissorBox = [x, y, width, height];
        this.hydGlobalState.recordTransition("scissor", x, y, width, height);
    }
    depthRange(zNear, zFar) {
        if (zNear > zFar) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        zNear = clampWebGlUnitFloat(zNear);
        zFar = clampWebGlUnitFloat(zFar);
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
        index = Number(index) >>> 0;
        divisor = Number(divisor) >>> 0;
        const attribute = this.hydGlobalState.commonState.vertexArrayBinding.attributes[index];
        if (!attribute) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (attribute.divisor === divisor)
            return;
        attribute.divisor = divisor;
        attribute.updateHash();
        this.hydGlobalState.recordTransition("vertexAttribDivisor", index, divisor);
    }
    vertexAttribPointer(index, size, type, normalized, _stride, offset) {
        const repeatAttribute = this.hydGlobalState.commonState.vertexArrayBinding.attributes[index];
        const repeatBuffer = this.hydGlobalState.commonState.arrayBufferBinding;
        if (repeatAttribute && repeatBuffer &&
            repeatAttribute.size === size && repeatAttribute.type === type &&
            repeatAttribute.normalized === Boolean(normalized) && repeatAttribute.webglStride === _stride &&
            repeatAttribute.offset === offset && repeatAttribute.buffer === repeatBuffer) {
            return;
        }
        index = Number(index) >>> 0;
        size = toWebGlInt32(size);
        type = Number(type) >>> 0;
        _stride = toWebGlInt32(_stride);
        offset = toWebGlInt64(offset);
        const attribute = this.hydGlobalState.commonState.vertexArrayBinding.attributes[index];
        if (!attribute) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const componentBytes = vertexComponentByteSize(type);
        const webgl1Type = type === WebGL2RenderingContext.BYTE || type === WebGL2RenderingContext.UNSIGNED_BYTE ||
            type === WebGL2RenderingContext.SHORT || type === WebGL2RenderingContext.UNSIGNED_SHORT ||
            type === WebGL2RenderingContext.FLOAT;
        const validType = webgl1Type || (this.hydContextType === "webgl2" &&
            (type === WebGL2RenderingContext.HALF_FLOAT || type === WebGL2RenderingContext.INT || type === WebGL2RenderingContext.UNSIGNED_INT));
        if (!validType) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (size < 1 || size > 4 || _stride < 0 || _stride > 255 || offset < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if ((offset % componentBytes) !== 0 || (_stride % componentBytes) !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        normalized = Boolean(normalized);
        const buffer = this.hydGlobalState.commonState.arrayBufferBinding;
        if (!buffer && offset !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const stride = _stride || size * componentBytes;
        if (attribute.size !== size || attribute.type !== type || attribute.normalized !== normalized ||
            attribute.stride !== stride || attribute.webglStride !== _stride ||
            attribute.offset !== offset || attribute.buffer !== buffer) {
            const formatChanged = attribute.size !== size || attribute.type !== type || attribute.normalized !== normalized;
            attribute.size = size;
            attribute.type = type;
            attribute.normalized = normalized;
            attribute.int = false;
            attribute.stride = stride;
            attribute.webglStride = _stride;
            attribute.offset = offset;
            attribute.buffer = buffer;
            attribute.shaderLocation = index;
            if (formatChanged || !attribute.format) {
                if (vertexFormatNeedsFloatConversion(type, size, normalized)) {
                    attribute.format = null;
                }
                else
                    try {
                        attribute.format = getVertexFormat(type, size, normalized);
                    }
                    catch (_) {
                        attribute.format = null;
                    }
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
                this.hydGlobalState.miscState.sampleAlphaToCoverage = value;
                break;
            case WebGL2RenderingContext.SAMPLE_COVERAGE:
                this.hydGlobalState.miscState.sampleCoverage = value;
                break;
            case WebGL2RenderingContext.DITHER:
                this.hydGlobalState.miscState.dither = value;
                break;
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return false;
        }
        return true;
    }
    enable(cap) {
        if (this.xxable(cap, true)) {
            this.hydGlobalState.recordTransition("enable", cap);
        }
    }
    disable(cap) {
        if (this.xxable(cap, false)) {
            this.hydGlobalState.recordTransition("disable", cap);
        }
    }
    isEnabled(cap) {
        switch (cap) {
            case WebGL2RenderingContext.DEPTH_TEST:
                return this.hydGlobalState.depthState.enabled;
            case WebGL2RenderingContext.STENCIL_TEST:
                return this.hydGlobalState.stencilState.enabled;
            case WebGL2RenderingContext.CULL_FACE:
                return this.hydGlobalState.polygonState.cullFace;
            case WebGL2RenderingContext.BLEND:
                return this.hydGlobalState.blendState.enabled;
            case WebGL2RenderingContext.SCISSOR_TEST:
                return this.hydGlobalState.miscState.scissorTest;
            case WebGL2RenderingContext.POLYGON_OFFSET_FILL:
                return this.hydGlobalState.polygonState.polygonOffsetFill;
            case WebGL2RenderingContext.SAMPLE_ALPHA_TO_COVERAGE:
                return this.hydGlobalState.miscState.sampleAlphaToCoverage;
            case WebGL2RenderingContext.SAMPLE_COVERAGE:
                return this.hydGlobalState.miscState.sampleCoverage;
            case WebGL2RenderingContext.DITHER:
                return this.hydGlobalState.miscState.dither;
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return false;
        }
    }
    blendFunc(sfactor, dfactor) {
        const src = enumToBlendFactors.get(sfactor);
        const dst = enumToBlendFactors.get(dfactor);
        if (!src || !dst || dfactor === WebGL2RenderingContext.SRC_ALPHA_SATURATE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (mixesConstantColorAndAlpha(sfactor, dfactor)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this.hydGlobalState.blendState.srcRGB = src;
        this.hydGlobalState.blendState.srcAlpha = src;
        this.hydGlobalState.blendState.dstRGB = dst;
        this.hydGlobalState.blendState.dstAlpha = dst;
        this.hydGlobalState.blendState.srcRGBEnum = sfactor;
        this.hydGlobalState.blendState.srcAlphaEnum = sfactor;
        this.hydGlobalState.blendState.dstRGBEnum = dfactor;
        this.hydGlobalState.blendState.dstAlphaEnum = dfactor;
        this.hydGlobalState.recordTransition("blendFunc", sfactor, dfactor);
    }
    blendColor(r, g, b, a) {
        r = clampWebGlUnitFloat(r);
        g = clampWebGlUnitFloat(g);
        b = clampWebGlUnitFloat(b);
        a = clampWebGlUnitFloat(a);
        this.hydGlobalState.blendState.color = [r, g, b, a];
        this.hydGlobalState.recordTransition("blendColor", r, g, b, a);
    }
    blendFuncSeparate(srcRGB, dstRGB, srcAlpha, dstAlpha) {
        const srcRGB1 = enumToBlendFactors.get(srcRGB);
        const dstRGB1 = enumToBlendFactors.get(dstRGB);
        const srcAlpha1 = enumToBlendFactors.get(srcAlpha);
        const dstAlpha1 = enumToBlendFactors.get(dstAlpha);
        if (!srcRGB1 || !dstRGB1 || !srcAlpha1 || !dstAlpha1 ||
            dstRGB === WebGL2RenderingContext.SRC_ALPHA_SATURATE ||
            dstAlpha === WebGL2RenderingContext.SRC_ALPHA_SATURATE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (mixesConstantColorAndAlpha(srcRGB, dstRGB) || mixesConstantColorAndAlpha(srcAlpha, dstAlpha)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this.hydGlobalState.blendState.srcRGB = srcRGB1;
        this.hydGlobalState.blendState.srcAlpha = srcAlpha1;
        this.hydGlobalState.blendState.dstRGB = dstRGB1;
        this.hydGlobalState.blendState.dstAlpha = dstAlpha1;
        this.hydGlobalState.blendState.srcRGBEnum = srcRGB;
        this.hydGlobalState.blendState.srcAlphaEnum = srcAlpha;
        this.hydGlobalState.blendState.dstRGBEnum = dstRGB;
        this.hydGlobalState.blendState.dstAlphaEnum = dstAlpha;
        this.hydGlobalState.recordTransition("blendFuncSeparate", srcRGB, dstRGB, srcAlpha, dstAlpha);
    }
    blendEquation(mode) {
        const op = enumToBlendOperations.get(mode);
        const extensionMinMax = this.enabledExtensions.has("EXT_BLEND_MINMAX");
        if (!op || (this.hydContextType !== "webgl2" &&
            (mode === WebGL2RenderingContext.MIN || mode === WebGL2RenderingContext.MAX) && !extensionMinMax)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        this.hydGlobalState.blendState.equationRGB = op;
        this.hydGlobalState.blendState.equationAlpha = op;
        this.hydGlobalState.blendState.equationRGBEnum = mode;
        this.hydGlobalState.blendState.equationAlphaEnum = mode;
        this.hydGlobalState.recordTransition("blendEquation", mode);
    }
    blendEquationSeparate(modeRGB, modeAlpha) {
        const rgbOp = enumToBlendOperations.get(modeRGB);
        const alphaOp = enumToBlendOperations.get(modeAlpha);
        const extensionMinMax = this.enabledExtensions.has("EXT_BLEND_MINMAX");
        const webgl1MinMax = this.hydContextType !== "webgl2" && !extensionMinMax &&
            (modeRGB === WebGL2RenderingContext.MIN || modeRGB === WebGL2RenderingContext.MAX ||
                modeAlpha === WebGL2RenderingContext.MIN || modeAlpha === WebGL2RenderingContext.MAX);
        if (!rgbOp || !alphaOp || webgl1MinMax) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        this.hydGlobalState.blendState.equationRGB = rgbOp;
        this.hydGlobalState.blendState.equationAlpha = alphaOp;
        this.hydGlobalState.blendState.equationRGBEnum = modeRGB;
        this.hydGlobalState.blendState.equationAlphaEnum = modeAlpha;
        this.hydGlobalState.recordTransition("blendEquationSeparate", modeRGB, modeAlpha);
    }
    stencilFunc(func, ref, mask) {
        const compare = enumToCompareFunction.get(func);
        if (!compare) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        this.hydGlobalState.stencilState.frontFunc = compare;
        this.hydGlobalState.stencilState.frontFuncEnum = func;
        this.hydGlobalState.stencilState.frontRef = ref;
        this.hydGlobalState.stencilState.frontValueMask = mask >>> 0;
        this.hydGlobalState.stencilState.backFunc = compare;
        this.hydGlobalState.stencilState.backFuncEnum = func;
        this.hydGlobalState.stencilState.backRef = ref;
        this.hydGlobalState.stencilState.backValueMask = mask >>> 0;
        this.hydGlobalState.recordTransition("stencilFunc", func, ref, mask);
    }
    stencilFuncSeparate(face, func, ref, mask) {
        const compare = enumToCompareFunction.get(func);
        if (!compare) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        const valueMask = mask >>> 0;
        switch (face) {
            case WebGL2RenderingContext.FRONT:
                this.hydGlobalState.stencilState.frontFunc = compare;
                this.hydGlobalState.stencilState.frontFuncEnum = func;
                this.hydGlobalState.stencilState.frontRef = ref;
                this.hydGlobalState.stencilState.frontValueMask = valueMask;
                break;
            case WebGL2RenderingContext.BACK:
                this.hydGlobalState.stencilState.backFunc = compare;
                this.hydGlobalState.stencilState.backFuncEnum = func;
                this.hydGlobalState.stencilState.backRef = ref;
                this.hydGlobalState.stencilState.backValueMask = valueMask;
                break;
            case WebGL2RenderingContext.FRONT_AND_BACK:
                this.hydGlobalState.stencilState.frontFunc = compare;
                this.hydGlobalState.stencilState.frontFuncEnum = func;
                this.hydGlobalState.stencilState.frontRef = ref;
                this.hydGlobalState.stencilState.frontValueMask = valueMask;
                this.hydGlobalState.stencilState.backFunc = compare;
                this.hydGlobalState.stencilState.backFuncEnum = func;
                this.hydGlobalState.stencilState.backRef = ref;
                this.hydGlobalState.stencilState.backValueMask = valueMask;
                break;
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return;
        }
        this.hydGlobalState.recordTransition("stencilFuncSeparate", face, func, ref, mask);
    }
    stencilMask(mask) {
        const writeMask = mask >>> 0;
        this.hydGlobalState.stencilState.frontWriteMask = writeMask;
        this.hydGlobalState.stencilState.backWriteMask = writeMask;
        this.hydGlobalState.recordTransition("stencilMask", mask);
    }
    stencilMaskSeparate(face, mask) {
        const writeMask = mask >>> 0;
        switch (face) {
            case WebGL2RenderingContext.FRONT:
                this.hydGlobalState.stencilState.frontWriteMask = writeMask;
                break;
            case WebGL2RenderingContext.BACK:
                this.hydGlobalState.stencilState.backWriteMask = writeMask;
                break;
            case WebGL2RenderingContext.FRONT_AND_BACK:
                this.hydGlobalState.stencilState.frontWriteMask = writeMask;
                this.hydGlobalState.stencilState.backWriteMask = writeMask;
                break;
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return;
        }
        this.hydGlobalState.recordTransition("stencilMaskSeparate", face, mask);
    }
    stencilOp(fail, zfail, zpass) {
        const failOp = enumToStencilOperation.get(fail);
        const depthFailOp = enumToStencilOperation.get(zfail);
        const passOp = enumToStencilOperation.get(zpass);
        if (!failOp || !depthFailOp || !passOp) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        this.hydGlobalState.stencilState.frontFail = failOp;
        this.hydGlobalState.stencilState.frontFailEnum = fail;
        this.hydGlobalState.stencilState.frontPassDepthFail = depthFailOp;
        this.hydGlobalState.stencilState.frontPassDepthFailEnum = zfail;
        this.hydGlobalState.stencilState.frontPassDepthPass = passOp;
        this.hydGlobalState.stencilState.frontPassDepthPassEnum = zpass;
        this.hydGlobalState.stencilState.backFail = failOp;
        this.hydGlobalState.stencilState.backFailEnum = fail;
        this.hydGlobalState.stencilState.backPassDepthFail = depthFailOp;
        this.hydGlobalState.stencilState.backPassDepthFailEnum = zfail;
        this.hydGlobalState.stencilState.backPassDepthPass = passOp;
        this.hydGlobalState.stencilState.backPassDepthPassEnum = zpass;
        this.hydGlobalState.recordTransition("stencilOp", fail, zfail, zpass);
    }
    stencilOpSeparate(face, fail, zfail, zpass) {
        const failOp = enumToStencilOperation.get(fail);
        const depthFailOp = enumToStencilOperation.get(zfail);
        const passOp = enumToStencilOperation.get(zpass);
        if (!failOp || !depthFailOp || !passOp) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        switch (face) {
            case WebGL2RenderingContext.FRONT:
                this.hydGlobalState.stencilState.frontFail = failOp;
                this.hydGlobalState.stencilState.frontFailEnum = fail;
                this.hydGlobalState.stencilState.frontPassDepthFail = depthFailOp;
                this.hydGlobalState.stencilState.frontPassDepthFailEnum = zfail;
                this.hydGlobalState.stencilState.frontPassDepthPass = passOp;
                this.hydGlobalState.stencilState.frontPassDepthPassEnum = zpass;
                break;
            case WebGL2RenderingContext.BACK:
                this.hydGlobalState.stencilState.backFail = failOp;
                this.hydGlobalState.stencilState.backFailEnum = fail;
                this.hydGlobalState.stencilState.backPassDepthFail = depthFailOp;
                this.hydGlobalState.stencilState.backPassDepthFailEnum = zfail;
                this.hydGlobalState.stencilState.backPassDepthPass = passOp;
                this.hydGlobalState.stencilState.backPassDepthPassEnum = zpass;
                break;
            case WebGL2RenderingContext.FRONT_AND_BACK:
                this.hydGlobalState.stencilState.frontFail = failOp;
                this.hydGlobalState.stencilState.frontFailEnum = fail;
                this.hydGlobalState.stencilState.frontPassDepthFail = depthFailOp;
                this.hydGlobalState.stencilState.frontPassDepthFailEnum = zfail;
                this.hydGlobalState.stencilState.frontPassDepthPass = passOp;
                this.hydGlobalState.stencilState.frontPassDepthPassEnum = zpass;
                this.hydGlobalState.stencilState.backFail = failOp;
                this.hydGlobalState.stencilState.backFailEnum = fail;
                this.hydGlobalState.stencilState.backPassDepthFail = depthFailOp;
                this.hydGlobalState.stencilState.backPassDepthFailEnum = zfail;
                this.hydGlobalState.stencilState.backPassDepthPass = passOp;
                this.hydGlobalState.stencilState.backPassDepthPassEnum = zpass;
                break;
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
                return;
        }
        this.hydGlobalState.recordTransition("stencilOpSeparate", face, fail, zfail, zpass);
    }
    bindFramebuffer(target, framebuffer) {
        if (!this.validateFramebufferTarget(target))
            return;
        if (framebuffer !== null && (!(framebuffer instanceof HydFramebuffer) || framebuffer.ownerToken !== this.contextToken || framebuffer.deleted)) {
            this.setObjectValidationError(framebuffer);
            return;
        }
        this._der_flush();
        this.gpuViewportDirty = true;
        this.gpuScissorDirty = true;
        if (framebuffer === null) {
            framebuffer = this.hydGlobalState.defaultFramebuffer;
        }
        if (target === WebGL2RenderingContext.FRAMEBUFFER) {
            if (framebuffer !== this.hydGlobalState.defaultFramebuffer)
                framebuffer.initialized = true;
            this.hydGlobalState.commonState.drawFramebufferBinding = framebuffer;
            this.hydGlobalState.commonState.readFramebufferBinding = framebuffer;
        }
        else if (target === WebGL2RenderingContext.DRAW_FRAMEBUFFER) {
            if (framebuffer !== this.hydGlobalState.defaultFramebuffer)
                framebuffer.initialized = true;
            this.hydGlobalState.commonState.drawFramebufferBinding = framebuffer;
        }
        else if (target === WebGL2RenderingContext.READ_FRAMEBUFFER) {
            if (framebuffer !== this.hydGlobalState.defaultFramebuffer)
                framebuffer.initialized = true;
            this.hydGlobalState.commonState.readFramebufferBinding = framebuffer;
        }
        this.hydGlobalState.recordTransition("bindFramebuffer", target, framebuffer.hash);
    }
    framebufferTexture2D(target, attachment, texTarget, texture, level) {
        if (!this.validateFramebufferTarget(target))
            return;
        if (this.hydContextType !== "webgl2" && level !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (this.hydContextType !== "webgl2" &&
            attachment >= WebGL2RenderingContext.COLOR_ATTACHMENT1 &&
            attachment <= WebGL2RenderingContext.COLOR_ATTACHMENT15 &&
            !this.enabledExtensions.has("WEBGL_DRAW_BUFFERS")) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (texture !== null && !this.isTexture(texture)) {
            if (texture instanceof HydTexture && texture.ownerToken === this.contextToken) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            this.setObjectValidationError(texture);
            return;
        }
        this._der_flush();
        const framebuffer = this.getFramebufferForTarget(target);
        if (framebuffer === this.hydGlobalState.defaultFramebuffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (texture === null) {
            framebuffer.attachments.delete(attachment);
            framebuffer.resetHash();
            this.gpuViewportDirty = true;
            this.gpuScissorDirty = true;
            this.hydGlobalState.recordTransition("framebufferTexture2D", target, attachment, texTarget, "null", level);
            return;
        }
        const attrib = new FramebufferAttributes(attachment, level, texTarget, texture);
        texture.onStorageChange.push(() => {
            if (framebuffer.attachments.get(attachment) === attrib)
                framebuffer.resetHash();
        });
        texture.onDelete.push(() => {
            if (this.isFramebufferBound(framebuffer) && framebuffer.attachments.get(attachment) === attrib) {
                framebuffer.attachments.delete(attachment);
                framebuffer.resetHash();
            }
        });
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
        if (texture !== null && !this.isTexture(texture)) {
            if (texture instanceof HydTexture && texture.ownerToken === this.contextToken) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            this.setObjectValidationError(texture);
            return;
        }
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
        const attrib = new FramebufferAttributes(attachment, level, undefined, texture, layer);
        texture.onStorageChange.push(() => {
            if (framebuffer.attachments.get(attachment) === attrib)
                framebuffer.resetHash();
        });
        texture.onDelete.push(() => {
            if (this.isFramebufferBound(framebuffer) && framebuffer.attachments.get(attachment) === attrib) {
                framebuffer.attachments.delete(attachment);
                framebuffer.resetHash();
            }
        });
        framebuffer.attachments.set(attachment, attrib);
        framebuffer.resetHash();
        this.gpuViewportDirty = true;
        this.gpuScissorDirty = true;
        this.hydGlobalState.recordTransition("framebufferTextureLayer", target, attachment, texture.hash, level, layer);
    }
    framebufferRenderbuffer(target, attachment, renderbufferTarget, renderbuffer) {
        if (!this.validateFramebufferTarget(target))
            return;
        if (this.hydContextType !== "webgl2" &&
            attachment >= WebGL2RenderingContext.COLOR_ATTACHMENT1 &&
            attachment <= WebGL2RenderingContext.COLOR_ATTACHMENT15 &&
            !this.enabledExtensions.has("WEBGL_DRAW_BUFFERS")) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (renderbuffer !== null && !this.isRenderbuffer(renderbuffer)) {
            if (renderbuffer instanceof HydTexture && renderbuffer.ownerToken === this.contextToken) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            this.setObjectValidationError(renderbuffer);
            return;
        }
        if (renderbufferTarget !== WebGL2RenderingContext.RENDERBUFFER) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        this._der_flush();
        const framebuffer = this.getFramebufferForTarget(target);
        if (framebuffer === this.hydGlobalState.defaultFramebuffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (renderbuffer === null) {
            framebuffer.attachments.delete(attachment);
            framebuffer.resetHash();
            this.gpuViewportDirty = true;
            this.gpuScissorDirty = true;
            this.hydGlobalState.recordTransition("framebufferRenderbuffer", target, attachment, renderbufferTarget, "null");
            return;
        }
        const attrib = new FramebufferAttributes(attachment, undefined, undefined, renderbuffer, undefined, WebGL2RenderingContext.RENDERBUFFER);
        renderbuffer.onStorageChange.push(() => {
            if (framebuffer.attachments.get(attachment) === attrib)
                framebuffer.resetHash();
        });
        renderbuffer.onDelete.push(() => {
            if (this.isFramebufferBound(framebuffer) && framebuffer.attachments.get(attachment) === attrib) {
                framebuffer.attachments.delete(attachment);
                framebuffer.resetHash();
            }
        });
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
    copyAliasesReadAttachment(texture, target, level) {
        if (this.hydGlobalState.commonState.readFramebufferBinding === this.hydGlobalState.defaultFramebuffer) {
            return false;
        }
        const attachment = this.getReadColorAttachment();
        if (!attachment || attachment.attachment !== texture || (attachment.level || 0) !== level) {
            return false;
        }
        const sourceLayer = attachment.layer !== undefined
            ? attachment.layer
            : this.isCubeFaceTarget(attachment.face)
                ? attachment.face - WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X
                : 0;
        const destinationLayer = this.isCubeFaceTarget(target)
            ? target - WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X
            : 0;
        return sourceLayer === destinationLayer;
    }
    copyTexImage2D(target, level, internalformat, x, y, width, height, border) {
        if (!this.validateTexImage2DTarget(target))
            return;
        if (border !== 0 || !this.validateTexImage2DDimensions(target, level, width, height)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const validInternalFormats = new Set([
            WebGL2RenderingContext.ALPHA,
            WebGL2RenderingContext.LUMINANCE,
            WebGL2RenderingContext.LUMINANCE_ALPHA,
            WebGL2RenderingContext.RGB,
            WebGL2RenderingContext.RGBA,
        ]);
        if (this.hydContextType !== "webgl2" && !validInternalFormats.has(internalformat)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (this.framebufferStatus(this.hydGlobalState.commonState.readFramebufferBinding) !== WebGL2RenderingContext.FRAMEBUFFER_COMPLETE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_FRAMEBUFFER_OPERATION);
            return;
        }
        const readFramebuffer = this.hydGlobalState.commonState.readFramebufferBinding;
        const sourceHasAlpha = readFramebuffer === this.hydGlobalState.defaultFramebuffer
            ? this.hydGlobalState.contextAttributes.alpha !== false
            : (this.getReadColorAttachment()?.colorBits[3] || 0) > 0;
        const destinationNeedsAlpha = internalformat === WebGL2RenderingContext.ALPHA ||
            internalformat === WebGL2RenderingContext.LUMINANCE_ALPHA ||
            internalformat === WebGL2RenderingContext.RGBA;
        if (destinationNeedsAlpha && !sourceHasAlpha) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const texture = this.currentTexture(target);
        if (!texture)
            return;
        if (this.copyAliasesReadAttachment(texture, target, level)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this._der_flush();
        texture.texImage2D(null, target, level, internalformat, width, height, border, internalformat, WebGL2RenderingContext.UNSIGNED_BYTE);
        if (!this.copyReadFramebufferRegionToTexture(texture, target, level, 0, 0, x, y, width, height))
            return;
        texture.markCopyDestination();
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("copyTexImage2D", target, level, internalformat, x, y, width, height, border);
    }
    copyTexSubImage2D(target, level, xoffset, yoffset, x, y, width, height) {
        if (!this.validateTexImage2DTarget(target))
            return;
        if (level < 0 || xoffset < 0 || yoffset < 0 || width < 0 || height < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (this.framebufferStatus(this.hydGlobalState.commonState.readFramebufferBinding) !== WebGL2RenderingContext.FRAMEBUFFER_COMPLETE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_FRAMEBUFFER_OPERATION);
            return;
        }
        const texture = this.currentTexture(target);
        if (!texture)
            return;
        const destinationImage = texture.getImageState(target, level);
        if (!destinationImage) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (xoffset > destinationImage.width || yoffset > destinationImage.height ||
            width > destinationImage.width - xoffset || height > destinationImage.height - yoffset) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const readFramebuffer = this.hydGlobalState.commonState.readFramebufferBinding;
        const sourceHasAlpha = readFramebuffer === this.hydGlobalState.defaultFramebuffer
            ? this.hydGlobalState.contextAttributes.alpha !== false
            : (this.getReadColorAttachment()?.colorBits[3] || 0) > 0;
        const destinationNeedsAlpha = destinationImage.internalFormat === WebGL2RenderingContext.ALPHA ||
            destinationImage.internalFormat === WebGL2RenderingContext.LUMINANCE_ALPHA ||
            destinationImage.internalFormat === WebGL2RenderingContext.RGBA;
        if (destinationNeedsAlpha && !sourceHasAlpha) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (this.copyAliasesReadAttachment(texture, target, level)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        this._der_flush();
        if (!this.copyReadFramebufferRegionToTexture(texture, target, level, xoffset, yoffset, x, y, width, height))
            return;
        texture.markCopyDestination();
        this.samplerOriginStateVersion++;
        this.hydGlobalState.recordTransition("copyTexSubImage2D", target, level, xoffset, yoffset, x, y, width, height);
    }
    copyReadFramebufferRegionToTexture(destination, target, level, xoffset, yoffset, x, y, width, height) {
        if (width === 0 || height === 0)
            return true;
        if (destination.format !== "rgba8unorm" && destination.format !== "bgra8unorm") {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return false;
        }
        const framebuffer = this.hydGlobalState.commonState.readFramebufferBinding;
        const readsDefault = framebuffer === this.hydGlobalState.defaultFramebuffer;
        const attachment = readsDefault ? null : this.getReadColorAttachment();
        const sourceWidth = readsDefault ? this.hydCanvas.width : attachment?.width || 0;
        const sourceHeight = readsDefault ? this.hydCanvas.height : attachment?.height || 0;
        if (!readsDefault && !attachment) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return false;
        }
        const sourceX0 = Math.max(0, x);
        const sourceY0 = Math.max(0, y);
        const sourceX1 = Math.min(sourceWidth, x + width);
        const sourceY1 = Math.min(sourceHeight, y + height);
        const copyWidth = Math.max(0, sourceX1 - sourceX0);
        const copyHeight = Math.max(0, sourceY1 - sourceY0);
        if (copyWidth === 0 || copyHeight === 0)
            return true;
        const pixels = new Uint8Array(copyWidth * copyHeight * 4);
        const read = readsDefault
            ? this.readDefaultFramebufferSynchronously(sourceX0, sourceY0, copyWidth, copyHeight, pixels, 0)
            : this.readColorAttachmentSynchronously(attachment, sourceX0, sourceY0, copyWidth, copyHeight, pixels, 0);
        if (!read) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return false;
        }
        const destinationImage = destination.getImageState(target, level);
        const logicalFormat = destinationImage?.internalFormat || WebGL2RenderingContext.RGBA;
        for (let offset = 0; offset < pixels.length; offset += 4) {
            const red = pixels[offset];
            const alpha = pixels[offset + 3];
            if (logicalFormat === WebGL2RenderingContext.ALPHA) {
                pixels[offset] = 0;
                pixels[offset + 1] = 0;
                pixels[offset + 2] = 0;
                pixels[offset + 3] = alpha;
            }
            else if (logicalFormat === WebGL2RenderingContext.LUMINANCE) {
                pixels[offset] = red;
                pixels[offset + 1] = red;
                pixels[offset + 2] = red;
                pixels[offset + 3] = 255;
            }
            else if (logicalFormat === WebGL2RenderingContext.LUMINANCE_ALPHA) {
                pixels[offset] = red;
                pixels[offset + 1] = red;
                pixels[offset + 2] = red;
                pixels[offset + 3] = alpha;
            }
            else if (logicalFormat === WebGL2RenderingContext.RGB) {
                pixels[offset + 3] = 255;
            }
        }
        const rowBytes = copyWidth * 4;
        const gpuRows = new Uint8Array(pixels.byteLength);
        for (let row = 0; row < copyHeight; row++) {
            const sourceOffset = row * rowBytes;
            const destinationOffset = (copyHeight - row - 1) * rowBytes;
            gpuRows.set(pixels.subarray(sourceOffset, sourceOffset + rowBytes), destinationOffset);
        }
        const destinationLogicalX = xoffset + sourceX0 - x;
        const destinationLogicalY = yoffset + sourceY0 - y;
        const destinationHeight = Math.max(1, destination.height >> level);
        const layer = target >= WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X &&
            target <= WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z
            ? target - WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X
            : 0;
        this.hydDevice.queue.writeTexture({
            texture: destination.texture,
            mipLevel: level,
            origin: {
                x: destinationLogicalX,
                y: destinationHeight - destinationLogicalY - copyHeight,
                z: layer,
            },
        }, gpuRows, { bytesPerRow: rowBytes, rowsPerImage: copyHeight }, { width: copyWidth, height: copyHeight, depthOrArrayLayers: 1 });
        return true;
    }
    readSnapshotSynchronously(snapshot, sourceWidth, sourceHeight, x, y, width, height, destination, destinationOffset) {
        const scratch = getSynchronousReadbackScratch();
        if (!scratch)
            return false;
        const { canvas, gl: readbackGl, texture, framebuffer } = scratch;
        try {
            if (canvas.width !== sourceWidth || canvas.height !== sourceHeight) {
                canvas.width = sourceWidth;
                canvas.height = sourceHeight;
            }
            readbackGl.bindTexture(readbackGl.TEXTURE_2D, texture);
            readbackGl.pixelStorei(readbackGl.UNPACK_FLIP_Y_WEBGL, false);
            readbackGl.pixelStorei(readbackGl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
            readbackGl.pixelStorei(readbackGl.UNPACK_COLORSPACE_CONVERSION_WEBGL, readbackGl.NONE);
            readbackGl.texParameteri(readbackGl.TEXTURE_2D, readbackGl.TEXTURE_MIN_FILTER, readbackGl.NEAREST);
            readbackGl.texParameteri(readbackGl.TEXTURE_2D, readbackGl.TEXTURE_MAG_FILTER, readbackGl.NEAREST);
            if (globalThis.__HYD_DEBUG_READBACK) {
                const probeCanvas = new OffscreenCanvas(snapshot.width, snapshot.height);
                const probeContext = probeCanvas.getContext("2d");
                probeContext?.drawImage(snapshot, 0, 0);
                console.debug("[HYD] readback snapshot center", Array.from(probeContext?.getImageData(snapshot.width >> 1, snapshot.height >> 1, 1, 1).data || []));
            }
            readbackGl.texImage2D(readbackGl.TEXTURE_2D, 0, readbackGl.RGBA, readbackGl.RGBA, readbackGl.UNSIGNED_BYTE, snapshot);
            readbackGl.bindFramebuffer(readbackGl.FRAMEBUFFER, framebuffer);
            readbackGl.framebufferTexture2D(readbackGl.FRAMEBUFFER, readbackGl.COLOR_ATTACHMENT0, readbackGl.TEXTURE_2D, texture, 0);
            if (readbackGl.checkFramebufferStatus(readbackGl.FRAMEBUFFER) !== readbackGl.FRAMEBUFFER_COMPLETE) {
                return false;
            }
            const target = new Uint8Array(destination.buffer, destination.byteOffset + destinationOffset, width * height * 4);
            const nativeY = sourceHeight - y - height;
            readbackGl.readPixels(x, nativeY, width, height, readbackGl.RGBA, readbackGl.UNSIGNED_BYTE, target);
            if (readbackGl.getError() !== readbackGl.NO_ERROR) {
                return false;
            }
            const rowBytes = width * 4;
            const temporaryRow = new Uint8Array(rowBytes);
            for (let row = 0; row < Math.floor(height / 2); row++) {
                const opposite = height - row - 1;
                const rowOffset = row * rowBytes;
                const oppositeOffset = opposite * rowBytes;
                temporaryRow.set(target.subarray(rowOffset, rowOffset + rowBytes));
                target.copyWithin(rowOffset, oppositeOffset, oppositeOffset + rowBytes);
                target.set(temporaryRow, oppositeOffset);
            }
            if (globalThis.__HYD_DEBUG_READBACK && width * height <= 16) {
                console.debug("[HYD] synchronous readback pixels", width, height, Array.from(target));
            }
            return true;
        }
        catch (error) {
            console.warn("[HYD] native WebGL snapshot readPixels failed:", error);
            return false;
        }
    }
    readTextureChannelsSynchronously(texture, sourceWidth, sourceHeight, x, y, width, height, destination, destinationOffset, mipLevel = 0, layer = 0, opaqueAlpha = false, viewFormat) {
        if (width === 0 || height === 0)
            return true;
        const byteLength = width * height * 4;
        const rgb = new Uint8Array(byteLength);
        const alpha = opaqueAlpha ? null : new Uint8Array(byteLength);
        let snapshot = null;
        try {
            snapshot = this.snapshotTextureChannel(texture, sourceWidth, sourceHeight, "rgb", mipLevel, layer, viewFormat);
            if (!snapshot || !this.readSnapshotSynchronously(snapshot, sourceWidth, sourceHeight, x, y, width, height, rgb, 0)) {
                return false;
            }
            snapshot.close();
            snapshot = null;
            if (alpha) {
                snapshot = this.snapshotTextureChannel(texture, sourceWidth, sourceHeight, "alpha", mipLevel, layer, viewFormat);
                if (!snapshot || !this.readSnapshotSynchronously(snapshot, sourceWidth, sourceHeight, x, y, width, height, alpha, 0)) {
                    return false;
                }
            }
            for (let offset = 0; offset < byteLength; offset += 4) {
                const target = destinationOffset + offset;
                destination[target] = rgb[offset];
                destination[target + 1] = rgb[offset + 1];
                destination[target + 2] = rgb[offset + 2];
                destination[target + 3] = alpha ? alpha[offset] : 255;
            }
            return true;
        }
        catch (error) {
            console.warn("[HYD] lossless texture-channel readback failed:", error);
            return false;
        }
        finally {
            snapshot?.close();
        }
    }
    prepareExactExternalReadCanvas() {
        if (!this.defaultFramebufferBackingTexture || this.hydCanvas.width <= 0 || this.hydCanvas.height <= 0) {
            return null;
        }
        const width = this.hydCanvas.width;
        const height = this.hydCanvas.height;
        const pixels = new Uint8Array(width * height * 4);
        if (!this.readTextureChannelsSynchronously(this.defaultFramebufferBackingTexture, width, height, 0, 0, width, height, pixels, 0)) {
            return null;
        }
        if (this.hydGlobalState.contextAttributes.alpha !== false &&
            this.hydGlobalState.contextAttributes.premultipliedAlpha === false) {
            return prepareStraightAlphaCanvas(pixels, width, height);
        }
        const rowBytes = width * 4;
        const temporaryRow = new Uint8Array(rowBytes);
        for (let row = 0; row < Math.floor(height / 2); row++) {
            const opposite = height - row - 1;
            const rowOffset = row * rowBytes;
            const oppositeOffset = opposite * rowBytes;
            temporaryRow.set(pixels.subarray(rowOffset, rowOffset + rowBytes));
            pixels.copyWithin(rowOffset, oppositeOffset, oppositeOffset + rowBytes);
            pixels.set(temporaryRow, oppositeOffset);
        }
        const premultiplied = this.hydGlobalState.contextAttributes.alpha !== false &&
            this.hydGlobalState.contextAttributes.premultipliedAlpha !== false;
        for (let offset = 0; offset < pixels.length; offset += 4) {
            if (this.hydGlobalState.contextAttributes.alpha === false) {
                pixels[offset + 3] = 255;
            }
            else if (premultiplied) {
                const alpha = pixels[offset + 3];
                if (alpha === 0) {
                    pixels[offset] = 0;
                    pixels[offset + 1] = 0;
                    pixels[offset + 2] = 0;
                }
                else {
                    pixels[offset] = Math.min(255, Math.round(pixels[offset] * 255 / alpha));
                    pixels[offset + 1] = Math.min(255, Math.round(pixels[offset + 1] * 255 / alpha));
                    pixels[offset + 2] = Math.min(255, Math.round(pixels[offset + 2] * 255 / alpha));
                }
            }
        }
        if (!this.exactExternalReadCanvas) {
            this.exactExternalReadCanvas = document.createElement("canvas");
            this.exactExternalReadContext = this.exactExternalReadCanvas.getContext("2d");
        }
        const canvas = this.exactExternalReadCanvas;
        const context = this.exactExternalReadContext;
        if (!canvas || !context) {
            return null;
        }
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        context.putImageData(new ImageData(new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, pixels.byteLength), width, height), 0, 0);
        return canvas;
    }
    readColorAttachmentSynchronously(attachment, x, y, width, height, destination, destinationOffset) {
        if (attachment.format !== "rgba8unorm" &&
            attachment.format !== "bgra8unorm" &&
            attachment.format !== "rgba8unorm-srgb") {
            return false;
        }
        const level = attachment.level || 0;
        const sourceWidth = attachment.width;
        const sourceHeight = attachment.height;
        const cubeLayer = attachment.face >= WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X &&
            attachment.face <= WebGL2RenderingContext.TEXTURE_CUBE_MAP_NEGATIVE_Z
            ? attachment.face - WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X
            : 0;
        const layer = attachment.layer === undefined ? cubeLayer : attachment.layer;
        const framebufferOriented = this.samplerNeedsOriginFlip(attachment.attachment);
        const readY = framebufferOriented ? y : sourceHeight - y - height;
        try {
            const read = this.readTextureChannelsSynchronously(attachment.attachment.texture, sourceWidth, sourceHeight, x, readY, width, height, destination, destinationOffset, level, layer, false, attachment.format === "rgba8unorm-srgb" ? "rgba8unorm" : undefined);
            if (read && !framebufferOriented) {
                const rowBytes = width * 4;
                const temporaryRow = new Uint8Array(rowBytes);
                for (let row = 0; row < Math.floor(height / 2); row++) {
                    const opposite = height - row - 1;
                    const rowOffset = destinationOffset + row * rowBytes;
                    const oppositeOffset = destinationOffset + opposite * rowBytes;
                    temporaryRow.set(destination.subarray(rowOffset, rowOffset + rowBytes));
                    destination.copyWithin(rowOffset, oppositeOffset, oppositeOffset + rowBytes);
                    destination.set(temporaryRow, oppositeOffset);
                }
            }
            return read;
        }
        catch (error) {
            console.warn("[HYD] synchronous color-attachment readPixels failed:", error);
            return false;
        }
    }
    readDefaultFramebufferSynchronously(x, y, width, height, destination, destinationOffset) {
        if (width === 0 || height === 0) {
            return true;
        }
        try {
            this.activateDefaultFramebufferBacking(true);
            this.materializeImplicitDefaultFramebufferClear();
            this._der_flush();
            if (this.readTextureChannelsSynchronously(this.defaultFramebufferBackingTexture, this.hydCanvas.width, this.hydCanvas.height, x, y, width, height, destination, destinationOffset, 0, 0, this.hydGlobalState.contextAttributes.alpha === false)) {
                return true;
            }
        }
        catch (error) {
            console.warn("[HYD] native WebGL default-framebuffer readPixels failed:", error);
        }
        if (!this.synchronousReadbackCanvas) {
            this.synchronousReadbackCanvas = document.createElement("canvas");
            this.synchronousReadbackContext = this.synchronousReadbackCanvas.getContext("2d", { willReadFrequently: true });
        }
        if (!this.synchronousReadbackContext) {
            return false;
        }
        const canvas = this.synchronousReadbackCanvas;
        if (canvas.width !== this.hydCanvas.width || canvas.height !== this.hydCanvas.height) {
            canvas.width = this.hydCanvas.width;
            canvas.height = this.hydCanvas.height;
        }
        const context = this.synchronousReadbackContext;
        try {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(this.hydCanvas, 0, 0);
            const sourceY = this.hydCanvas.height - y - height;
            const source = context.getImageData(x, sourceY, width, height).data;
            const rowBytes = width * 4;
            for (let row = 0; row < height; row++) {
                const sourceOffset = row * rowBytes;
                const targetOffset = destinationOffset + (height - row - 1) * rowBytes;
                destination.set(source.subarray(sourceOffset, sourceOffset + rowBytes), targetOffset);
            }
            return true;
        }
        catch (error) {
            console.warn("[HYD] synchronous default-framebuffer readPixels failed:", error);
            return false;
        }
    }
    readPixels(x, y, width, height, format, type, pixels, dstOffset = 0) {
        if (width < 0 || height < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (format !== WebGL2RenderingContext.RGBA || type !== WebGL2RenderingContext.UNSIGNED_BYTE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        if (pixels === null) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const readFramebuffer = this.hydGlobalState.commonState.readFramebufferBinding;
        if (this.framebufferStatus(readFramebuffer) !== WebGL2RenderingContext.FRAMEBUFFER_COMPLETE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_FRAMEBUFFER_OPERATION);
            return;
        }
        if (this.canvasSizeDirty)
            this.updateCanvasSize();
        const layout = packedPixelLayout(width, height, 4, this.hydGlobalState.miscState.packAlignment);
        let destination = null;
        let destinationOffset = 0;
        if (typeof pixels === "number") {
            const buffer = this.hydGlobalState.commonState.pixelPackBufferBinding;
            if (!buffer) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            destinationOffset = pixels;
            if (destinationOffset < 0 || destinationOffset + layout.requiredBytes > buffer.shadowData.byteLength) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            destination = buffer.shadowData;
        }
        else if (pixels && "byteLength" in pixels) {
            const bytesPerElement = pixels.BYTES_PER_ELEMENT;
            if (bytesPerElement !== 1) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
            destination = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength);
            if (dstOffset < 0 || dstOffset > pixels.length) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                return;
            }
            destinationOffset = dstOffset * bytesPerElement;
            if (destinationOffset + layout.requiredBytes > destination.byteLength) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return;
            }
        }
        if (!destination) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (width === 0 || height === 0) {
            this.hydGlobalState.recordTransition("readPixels", x, y, width, height, format, type);
            return;
        }
        const readsDefaultFramebuffer = readFramebuffer === this.hydGlobalState.defaultFramebuffer;
        const attachment = readsDefaultFramebuffer ? null : this.getReadColorAttachment();
        if (!readsDefaultFramebuffer && !attachment) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const sourceWidth = readsDefaultFramebuffer ? this.hydCanvas.width : attachment.width;
        const sourceHeight = readsDefaultFramebuffer ? this.hydCanvas.height : attachment.height;
        const sourceX0 = Math.max(0, x);
        const sourceY0 = Math.max(0, y);
        const sourceX1 = Math.min(sourceWidth, x + width);
        const sourceY1 = Math.min(sourceHeight, y + height);
        const clippedWidth = Math.max(0, sourceX1 - sourceX0);
        const clippedHeight = Math.max(0, sourceY1 - sourceY0);
        if (clippedWidth === 0 || clippedHeight === 0) {
            this.hydGlobalState.recordTransition("readPixels", x, y, width, height, format, type);
            return;
        }
        this._der_flush();
        const tightPixels = new Uint8Array(clippedWidth * clippedHeight * 4);
        const read = readsDefaultFramebuffer
            ? this.readDefaultFramebufferSynchronously(sourceX0, sourceY0, clippedWidth, clippedHeight, tightPixels, 0)
            : this.readColorAttachmentSynchronously(attachment, sourceX0, sourceY0, clippedWidth, clippedHeight, tightPixels, 0);
        if (!read) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const destinationColumnOffset = (sourceX0 - x) * 4;
        const destinationFirstRow = sourceY0 - y;
        const tightRowBytes = clippedWidth * 4;
        for (let row = 0; row < clippedHeight; row++) {
            const sourceOffset = row * tightRowBytes;
            const targetOffset = destinationOffset +
                (destinationFirstRow + row) * layout.rowStride + destinationColumnOffset;
            destination.set(tightPixels.subarray(sourceOffset, sourceOffset + tightRowBytes), targetOffset);
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
    readBuffer(mode) {
        const framebuffer = this.hydGlobalState.commonState.readFramebufferBinding;
        if (framebuffer.readBuffer !== mode) {
            framebuffer.readBuffer = mode;
            framebuffer.resetHash();
        }
        this.hydGlobalState.recordTransition("readBuffer", mode);
    }
    fenceSync(condition, flags) {
        if (condition !== WebGL2RenderingContext.SYNC_GPU_COMMANDS_COMPLETE || flags !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        const pending = this.pendingReadbacks.splice(0);
        const sync = {
            condition,
            flags,
            signaled: pending.length === 0,
        };
        if (pending.length > 0) {
            Promise.allSettled(pending).then(() => {
                sync.signaled = true;
            });
        }
        return sync;
    }
    clientWaitSync(sync, flags, _timeout) {
        if (flags !== 0 && flags !== WebGL2RenderingContext.SYNC_FLUSH_COMMANDS_BIT) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return WebGL2RenderingContext.WAIT_FAILED;
        }
        return sync?.signaled ? WebGL2RenderingContext.ALREADY_SIGNALED : WebGL2RenderingContext.TIMEOUT_EXPIRED;
    }
    waitSync(_sync, _flags, _timeout) {
    }
    deleteSync(_sync) {
    }
    isSync(sync) {
        return !!sync;
    }
    flush() {
        this._der_flush();
    }
    finish() {
        this._der_flush();
    }
    pixelStorei(pname, param) {
        const value = typeof param === "boolean" ? (param ? 1 : 0) : param;
        switch (pname) {
            case WebGL2RenderingContext.UNPACK_FLIP_Y_WEBGL:
                this.hydGlobalState.miscState.unpackFlipYWebGL = value !== 0;
                this.hydGlobalState.recordTransition("pixelStorei", pname, value);
                return;
            case WebGL2RenderingContext.UNPACK_PREMULTIPLY_ALPHA_WEBGL:
                this.hydGlobalState.miscState.unpackPremultiplyAlphaWebGL = value !== 0;
                this.hydGlobalState.recordTransition("pixelStorei", pname, value);
                return;
            case WebGL2RenderingContext.UNPACK_COLORSPACE_CONVERSION_WEBGL:
                if (value !== WebGL2RenderingContext.BROWSER_DEFAULT_WEBGL && value !== WebGL2RenderingContext.NONE) {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                    return;
                }
                this.hydGlobalState.miscState.unpackColorSpaceConversionWebGL = value;
                this.hydGlobalState.recordTransition("pixelStorei", pname, value);
                return;
            case WebGL2RenderingContext.UNPACK_ALIGNMENT:
                if (!VALID_PIXEL_ALIGNMENT.has(value)) {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                    return;
                }
                this.hydGlobalState.miscState.unpackAlignment = value;
                this.hydGlobalState.recordTransition("pixelStorei", pname, value);
                return;
            case WebGL2RenderingContext.PACK_ALIGNMENT:
                if (!VALID_PIXEL_ALIGNMENT.has(value)) {
                    this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
                    return;
                }
                this.hydGlobalState.miscState.packAlignment = value;
                this.hydGlobalState.recordTransition("pixelStorei", pname, value);
                return;
            default:
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
        }
    }
    isFramebufferBound(framebuffer) {
        return this.hydGlobalState.commonState.drawFramebufferBinding === framebuffer ||
            this.hydGlobalState.commonState.readFramebufferBinding === framebuffer;
    }
    framebufferStatus(framebuffer) {
        if (framebuffer === this.hydGlobalState.defaultFramebuffer) {
            return WebGL2RenderingContext.FRAMEBUFFER_COMPLETE;
        }
        if (framebuffer.attachments.size === 0) {
            return WebGL2RenderingContext.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT;
        }
        const depthStencilAttachmentCount = [
            WebGL2RenderingContext.DEPTH_ATTACHMENT,
            WebGL2RenderingContext.STENCIL_ATTACHMENT,
            WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT,
        ].filter((point) => framebuffer.attachments.has(point)).length;
        if (depthStencilAttachmentCount > 1) {
            return WebGL2RenderingContext.FRAMEBUFFER_UNSUPPORTED;
        }
        let width = null;
        let height = null;
        for (const [attachmentPoint, attachment] of framebuffer.attachments) {
            if (!attachment.attachment.isConfigured || attachment.width <= 0 || attachment.height <= 0) {
                return WebGL2RenderingContext.FRAMEBUFFER_INCOMPLETE_ATTACHMENT;
            }
            if (attachment.isCubeFace && !attachment.attachment.isCubeCompleteAtLevel(attachment.level || 0)) {
                return WebGL2RenderingContext.FRAMEBUFFER_INCOMPLETE_ATTACHMENT;
            }
            const format = attachment.format;
            const colorAttachment = attachmentPoint >= WebGL2RenderingContext.COLOR_ATTACHMENT0 &&
                attachmentPoint <= WebGL2RenderingContext.COLOR_ATTACHMENT15;
            if ((attachmentPoint === WebGL2RenderingContext.DEPTH_ATTACHMENT &&
                (!format.includes("depth") || format.includes("stencil"))) ||
                (attachmentPoint === WebGL2RenderingContext.STENCIL_ATTACHMENT &&
                    (!format.includes("stencil") || format.includes("depth"))) ||
                (attachmentPoint === WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT &&
                    (!format.includes("depth") || !format.includes("stencil"))) ||
                (colorAttachment && !attachment.colorRenderable)) {
                return WebGL2RenderingContext.FRAMEBUFFER_INCOMPLETE_ATTACHMENT;
            }
            width ??= attachment.width;
            height ??= attachment.height;
            if (attachment.width !== width || attachment.height !== height) {
                return WebGL2RenderingContext.FRAMEBUFFER_INCOMPLETE_DIMENSIONS;
            }
        }
        for (const drawBuffer of framebuffer.drawBuffers) {
            if (drawBuffer >= WebGL2RenderingContext.COLOR_ATTACHMENT0 &&
                drawBuffer <= WebGL2RenderingContext.COLOR_ATTACHMENT15 &&
                !framebuffer.attachments.has(drawBuffer)) {
                return WebGL2RenderingContext.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT;
            }
        }
        return WebGL2RenderingContext.FRAMEBUFFER_COMPLETE;
    }
    checkFramebufferStatus(target = WebGL2RenderingContext.FRAMEBUFFER) {
        const webgl2Target = this.hydContextType === "webgl2" &&
            (target === WebGL2RenderingContext.DRAW_FRAMEBUFFER || target === WebGL2RenderingContext.READ_FRAMEBUFFER);
        if (target !== WebGL2RenderingContext.FRAMEBUFFER && !webgl2Target) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return 0;
        }
        return this.framebufferStatus(this.getFramebufferForTarget(target));
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
    getDrawValidationLimits() {
        const stateToken = this.hydGlobalState.stateToken;
        const cached = this.drawValidationCache.get(stateToken);
        if (cached)
            return cached;
        let valid = true;
        let vertexCapacity = Number.POSITIVE_INFINITY;
        let instanceCapacity = Number.POSITIVE_INFINITY;
        let hasActivePerVertexAttribute = false;
        const attributes = this.hydGlobalState.commonState.vertexArrayBinding.attributes;
        const activeLocations = this.hydGlobalState.commonState.currentProgram?.hydAttributeLocations || new Set();
        for (let location = 0; location < attributes.length; location++) {
            const attribute = attributes[location];
            if (!attribute.enabled)
                continue;
            const buffer = attribute.buffer;
            if (!buffer || buffer.deleted) {
                valid = false;
                break;
            }
            if (!activeLocations.has(location))
                continue;
            const componentBytes = vertexComponentByteSize(attribute.type);
            const elementBytes = componentBytes * attribute.size;
            const stride = attribute.webglStride || elementBytes;
            if (!buffer.buffer || componentBytes === 0 ||
                !Number.isInteger(attribute.size) || attribute.size < 1 || attribute.size > 4 ||
                attribute.offset < 0 || stride <= 0) {
                valid = false;
                break;
            }
            const capacity = buffer.webglSize < attribute.offset + elementBytes
                ? 0
                : Math.floor((buffer.webglSize - attribute.offset - elementBytes) / stride) + 1;
            if (attribute.divisor > 0) {
                instanceCapacity = Math.min(instanceCapacity, capacity * attribute.divisor);
            }
            else {
                hasActivePerVertexAttribute = true;
                vertexCapacity = Math.min(vertexCapacity, capacity);
            }
        }
        const validation = { valid, vertexCapacity, instanceCapacity, hasActivePerVertexAttribute };
        this.drawValidationCache.set(stateToken, validation);
        return validation;
    }
    validateDrawVertexState(maxVertexIndex, instanceCount, instancedApi) {
        const limits = this.getDrawValidationLimits();
        if (!limits.valid || maxVertexIndex >= limits.vertexCapacity || instanceCount > limits.instanceCapacity ||
            (instancedApi && !limits.hasActivePerVertexAttribute)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return false;
        }
        return true;
    }
    primitiveTopology(mode) {
        if (!VALID_DRAW_MODES.has(mode)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return null;
        }
        if (mode === WebGL2RenderingContext.LINE_LOOP)
            return "line-list";
        if (mode === WebGL2RenderingContext.TRIANGLE_FAN)
            return "triangle-list";
        return enum2PT[mode];
    }
    setPrimitiveState(topology, stripIndexFormat) {
        const nextStripIndexFormat = topology === "line-strip" || topology === "triangle-strip"
            ? stripIndexFormat
            : undefined;
        if (this.hydGlobalState.topology === topology && this.hydGlobalState.stripIndexFormat === nextStripIndexFormat) {
            return;
        }
        this.hydGlobalState.topology = topology;
        this.hydGlobalState.stripIndexFormat = nextStripIndexFormat;
        this.hydGlobalState.recordTransition("primitive", topology, nextStripIndexFormat || "none");
    }
    finishDraw() {
        if (this.hydUniOff >= this.hydMaxUniSize) {
            this._der_flush();
        }
        if (this.hydGlobalState.clearState.target !== 0) {
            this.hydGlobalState.clearState.target = 0;
            this.hydGlobalState.recordTransitionOne('!!d0');
        }
    }
    findPreparedIndexedDraw(mode, count, type, offset, instanceCount, instancedApi) {
        if (!this.currentProgramValid)
            return null;
        const stateToken = this.hydGlobalState.stateToken;
        const elementArrayBuffer = this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
        const last = this.lastIndexedDraw;
        if (last && last.stateToken === stateToken && last.mode === mode && last.count === count && last.type === type &&
            last.offset === offset && last.instanceCount === instanceCount &&
            last.instancedApi === instancedApi &&
            last.elementArrayBuffer === elementArrayBuffer && last.bufferVersion === last.elementArrayBuffer.version) {
            return last;
        }
        const preparedDraws = this.indexedDrawCache.get(stateToken);
        if (!preparedDraws)
            return null;
        for (const prepared of preparedDraws) {
            if (prepared.mode === mode && prepared.count === count && prepared.type === type &&
                prepared.offset === offset && prepared.instanceCount === instanceCount &&
                prepared.instancedApi === instancedApi &&
                prepared.elementArrayBuffer === elementArrayBuffer && prepared.bufferVersion === prepared.elementArrayBuffer.version) {
                this.lastIndexedDraw = prepared;
                return prepared;
            }
        }
        return null;
    }
    executePreparedIndexedDraw(prepared) {
        this.setPBV();
        this.hydRpCache.RpSetIndexBuffer(prepared.indexBuffer, prepared.indexFormat);
        this.hydRpCache.RpDrawIndexed(prepared.indexCount, prepared.instanceCount, prepared.firstIndex, 0, 0);
        this.finishDraw();
    }
    cachePreparedIndexedDraw(prepared) {
        let preparedDraws = this.indexedDrawCache.get(prepared.stateToken);
        if (!preparedDraws) {
            this.indexedDrawCache.set(prepared.stateToken, [prepared]);
            return;
        }
        const existing = preparedDraws.findIndex((candidate) => candidate.mode === prepared.mode && candidate.count === prepared.count &&
            candidate.type === prepared.type && candidate.offset === prepared.offset &&
            candidate.instanceCount === prepared.instanceCount &&
            candidate.instancedApi === prepared.instancedApi &&
            candidate.elementArrayBuffer === prepared.elementArrayBuffer);
        if (existing >= 0) {
            preparedDraws[existing] = prepared;
        }
        else {
            preparedDraws.push(prepared);
        }
    }
    findPreparedArrayDraw(mode, first, count, instanceCount, instancedApi) {
        if (!this.currentProgramValid)
            return null;
        const stateToken = this.hydGlobalState.stateToken;
        const last = this.lastArrayDraw;
        if (last && last.stateToken === stateToken && last.mode === mode && last.first === first &&
            last.count === count && last.instanceCount === instanceCount && last.instancedApi === instancedApi) {
            return last;
        }
        const preparedDraws = this.arrayDrawCache.get(stateToken);
        if (!preparedDraws)
            return null;
        for (const prepared of preparedDraws) {
            if (prepared.mode === mode && prepared.first === first &&
                prepared.count === count && prepared.instanceCount === instanceCount &&
                prepared.instancedApi === instancedApi) {
                this.lastArrayDraw = prepared;
                return prepared;
            }
        }
        return null;
    }
    executePreparedArrayDraw(prepared) {
        this.setPBV();
        if (prepared.indexBuffer) {
            this.hydRpCache.RpSetIndexBuffer(prepared.indexBuffer, "uint32");
            this.hydRpCache.RpDrawIndexed(prepared.indexCount, prepared.instanceCount, 0, prepared.first, 0);
        }
        else {
            this.hydRpCache.RpDraw(prepared.count, prepared.instanceCount, prepared.first, 0);
        }
        this.finishDraw();
    }
    cachePreparedArrayDraw(prepared) {
        let preparedDraws = this.arrayDrawCache.get(prepared.stateToken);
        if (!preparedDraws) {
            this.arrayDrawCache.set(prepared.stateToken, [prepared]);
            return;
        }
        const existing = preparedDraws.findIndex((candidate) => candidate.mode === prepared.mode && candidate.first === prepared.first &&
            candidate.count === prepared.count && candidate.instanceCount === prepared.instanceCount &&
            candidate.instancedApi === prepared.instancedApi);
        if (existing >= 0) {
            preparedDraws[existing] = prepared;
        }
        else {
            preparedDraws.push(prepared);
        }
    }
    setPBV() {
        if (frameDepth === 0) {
            ensureAutoFrame();
        }
        if (this.canvasSizeDirty)
            this.updateCanvasSize();
        this.ensureDefaultFramebufferRenderTarget();
        if (this.hydGlobalState.commonState.drawFramebufferBinding === this.hydGlobalState.defaultFramebuffer &&
            this.defaultFramebufferNeedsImplicitClear) {
            this.materializeImplicitDefaultFramebufferClear();
            this._der_flush();
            this.ensureDefaultFramebufferRenderTarget();
        }
        let framebufferWriteMask = this.getColorWriteMask() !== 0
            ? WebGL2RenderingContext.COLOR_BUFFER_BIT
            : 0;
        if (this.hydGlobalState.depthState.enabled && this.hydGlobalState.depthState.writeMask) {
            framebufferWriteMask |= WebGL2RenderingContext.DEPTH_BUFFER_BIT;
        }
        if (this.hydGlobalState.stencilState.enabled &&
            ((this.hydGlobalState.stencilState.frontWriteMask | this.hydGlobalState.stencilState.backWriteMask) & 0xff) !== 0) {
            framebufferWriteMask |= WebGL2RenderingContext.STENCIL_BUFFER_BIT;
        }
        this.markDrawFramebufferAttachmentsAsRenderTargets(framebufferWriteMask);
        if ((framebufferWriteMask & WebGL2RenderingContext.COLOR_BUFFER_BIT) &&
            this.hydGlobalState.commonState.drawFramebufferBinding === this.hydGlobalState.defaultFramebuffer &&
            this.hydGlobalState.__canvasTexture === this.defaultFramebufferBackingTexture) {
            this.defaultFramebufferBackingNeedsPresentation = true;
        }
        const program = this.hydGlobalState.commonState.currentProgram;
        if (program.fragCoordHeightUniform) {
            const framebufferHeight = this.getDrawFramebufferHeight();
            if (program.fragCoordHeightValue !== framebufferHeight) {
                program.fragCoordHeightValue = framebufferHeight;
                program.write_uniform_f1(program.fragCoordHeightUniform.offset, framebufferHeight);
            }
        }
        if (program.depthRangeUniforms.some(Boolean)) {
            const near = this.hydGlobalState.commonState.viewport[4];
            const far = this.hydGlobalState.commonState.viewport[5];
            if (program.depthRangeValue[0] !== near || program.depthRangeValue[1] !== far) {
                program.depthRangeValue = [near, far];
                const values = [near, far, far - near];
                program.depthRangeUniforms.forEach((uniform, index) => {
                    if (uniform)
                        program.write_uniform_f1(uniform.offset, values[index]);
                });
            }
        }
        if (program.hydSamplers.length > 0) {
            const useSamplerOriginVariants = program.staticSamplerOriginVariants;
            const samplerCount = useSamplerOriginVariants ? program.hydSampler2D.length : program.hydSamplers.length;
            const samplerOriginVersion = useSamplerOriginVariants
                ? program.originVariantStateVersion
                : program.originUniformStateVersion;
            if (samplerCount > 0 && samplerOriginVersion !== this.samplerOriginStateVersion) {
                const samplerOriginFlips = this.updateSamplerOriginUniforms(program, useSamplerOriginVariants);
                if (useSamplerOriginVariants && samplerOriginFlips) {
                    program.applySamplerOriginVariant(samplerOriginFlips);
                }
            }
        }
        const pbv = this.hydGlobalState.getPBV();
        const { pipelineHash, pipeline, bindGroup, vertexBuffersHash, vertexBufferHashes, vertexBuffers, vertexBufferOffsets, } = pbv;
        const canReuseDrawState = pbv === this.lastDrawPbv &&
            this.hydRpCache.hasActiveRenderPass() &&
            !this.gpuViewportDirty &&
            !(this.hydGlobalState.miscState.scissorTest && this.gpuScissorDirty);
        if (!canReuseDrawState) {
            const currentRenderPass = this.hydGlobalState.getCurrentRenderPassInfo();
            const passChanged = this.hydRpCache.RpSetDescriptor(currentRenderPass.hash, currentRenderPass.bundleDescriptor, () => currentRenderPass.passDescriptor);
            if (passChanged || this.gpuViewportDirty) {
                this.setGpuViewport();
                this.gpuViewportDirty = false;
            }
            if (this.hydGlobalState.miscState.scissorTest && (passChanged || this.gpuScissorDirty)) {
                this.setGpuScissorRect();
                this.gpuScissorDirty = false;
            }
            if (this.hydGlobalState.stencilState.enabled) {
                const reference = Math.min(0xff, Math.max(0, this.hydGlobalState.stencilState.frontRef | 0));
                this.hydRpCache.RpSetStencilReference(reference);
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
    currentDrawTargetHasSize() {
        if (this.hydGlobalState.commonState.drawFramebufferBinding !== this.hydGlobalState.defaultFramebuffer ||
            (this.hydCanvas.width > 0 && this.hydCanvas.height > 0)) {
            return true;
        }
        this.hydGlobalState.clearState.target = 0;
        return false;
    }
    shouldCullAllTriangles(mode) {
        if (!this.hydGlobalState.polygonState.cullFace ||
            this.hydGlobalState.polygonState.cullFaceModeEnum !== WebGL2RenderingContext.FRONT_AND_BACK) {
            return false;
        }
        return mode === WebGL2RenderingContext.TRIANGLES ||
            mode === WebGL2RenderingContext.TRIANGLE_STRIP ||
            mode === WebGL2RenderingContext.TRIANGLE_FAN;
    }
    validateFramebufferAndStencilForDraw() {
        const framebuffer = this.hydGlobalState.commonState.drawFramebufferBinding;
        if (this.framebufferStatus(framebuffer) !== WebGL2RenderingContext.FRAMEBUFFER_COMPLETE) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_FRAMEBUFFER_OPERATION);
            return false;
        }
        if (this.currentProgramValid && framebuffer !== this.hydGlobalState.defaultFramebuffer) {
            const attachedTextures = new Set(Array.from(framebuffer.attachments.values(), (attachment) => attachment.attachment));
            const feedbackLoop = this.hydGlobalState.commonState.currentProgram.hydSamplers.some((sampler) => {
                const texture = this.hydGlobalState.getTextureUnitBinding(sampler.textureUnit, sampler.viewDimension);
                return texture !== null &&
                    texture.isSamplingComplete(sampler.viewDimension, this.hydContextType === "webgl2" ? 2 : 1) &&
                    attachedTextures.has(texture);
            });
            if (feedbackLoop) {
                this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
                return false;
            }
        }
        if (!this.hydGlobalState.stencilState.enabled)
            return true;
        const hasStencil = framebuffer === this.hydGlobalState.defaultFramebuffer
            ? this.hydGlobalState.contextAttributes.stencil === true
            : Array.from(framebuffer.attachments.entries()).some(([point, attachment]) => (point === WebGL2RenderingContext.STENCIL_ATTACHMENT ||
                point === WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT) &&
                attachment.format.includes("stencil"));
        if (!hasStencil)
            return true;
        const state = this.hydGlobalState.stencilState;
        const stencilMask = 0xff;
        const clampRef = (value) => Math.min(stencilMask, Math.max(0, value | 0));
        const mismatch = clampRef(state.frontRef) !== clampRef(state.backRef) ||
            (state.frontValueMask & stencilMask) !== (state.backValueMask & stencilMask) ||
            (state.frontWriteMask & stencilMask) !== (state.backWriteMask & stencilMask);
        if (mismatch) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return false;
        }
        return true;
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
    getLineLoopIndexBuffer(vertexCount) {
        let buffer = this.lineLoopIndexBuffers.get(vertexCount);
        if (buffer)
            return buffer;
        const indices = new Uint32Array(vertexCount >= 2 ? vertexCount * 2 : 0);
        if (vertexCount >= 2) {
            for (let i = 0; i < vertexCount - 1; i++) {
                indices[i * 2] = i;
                indices[i * 2 + 1] = i + 1;
            }
            indices[(vertexCount - 1) * 2] = vertexCount - 1;
            indices[(vertexCount - 1) * 2 + 1] = 0;
        }
        buffer = this.hydDevice.createBuffer({
            label: `lineLoopIndexBuffer-${vertexCount}`,
            size: Math.max(4, indices.byteLength),
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        if (indices.byteLength > 0) {
            this.hydDevice.queue.writeBuffer(buffer, 0, indices.buffer, indices.byteOffset, indices.byteLength);
        }
        this.lineLoopIndexBuffers.set(vertexCount, buffer);
        return buffer;
    }
    drawArrays(mode, first, count) {
        if (!this.validateFramebufferAndStencilForDraw())
            return;
        if (this.shouldCullAllTriangles(mode)) {
            this.drawArraysInternal(mode, first, count, 1, false, true);
            return;
        }
        const stateToken = this.hydGlobalState.stateToken;
        const prepared = this.lastArrayDraw;
        if (this.currentProgramValid && prepared && prepared.stateToken === stateToken &&
            prepared.mode === mode && prepared.first === first && prepared.count === count &&
            prepared.instanceCount === 1 && !prepared.instancedApi && !prepared.indexBuffer) {
            this.setPBV();
            this.hydRpCache.RpDraw(count, 1, first, 0);
            if (this.hydUniOff >= this.hydMaxUniSize)
                this._der_flush();
            if (this.hydGlobalState.clearState.target !== 0) {
                this.hydGlobalState.clearState.target = 0;
                this.hydGlobalState.recordTransitionOne('!!d0');
            }
            return;
        }
        if (this.currentProgramValid) {
            const preparedDraws = this.arrayDrawCache.get(stateToken);
            if (preparedDraws) {
                for (const candidate of preparedDraws) {
                    if (candidate.mode === mode && candidate.first === first && candidate.count === count &&
                        candidate.instanceCount === 1 && !candidate.instancedApi) {
                        this.lastArrayDraw = candidate;
                        this.executePreparedArrayDraw(candidate);
                        return;
                    }
                }
            }
        }
        this.drawArraysInternal(mode, first, count, 1, false);
    }
    drawArraysInstanced(mode, first, count, instanceCount) {
        if (!this.validateFramebufferAndStencilForDraw())
            return;
        if (this.shouldCullAllTriangles(mode)) {
            this.drawArraysInternal(mode, first, count, instanceCount, true, true);
            return;
        }
        const prepared = this.findPreparedArrayDraw(mode, first, count, instanceCount, true);
        if (prepared) {
            this.executePreparedArrayDraw(prepared);
            return;
        }
        this.drawArraysInternal(mode, first, count, instanceCount, true);
    }
    drawArraysInternal(mode, first, count, instanceCount, instancedApi, cullAll = false) {
        mode = Number(mode) >>> 0;
        first = toWebGlInt32(first);
        count = toWebGlInt32(count);
        instanceCount = toWebGlInt32(instanceCount);
        const topology = this.primitiveTopology(mode);
        if (!topology)
            return;
        if (first < 0 || count < 0 || instanceCount < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        if (!this.currentProgramValid) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (count === 0 || instanceCount === 0)
            return;
        if (!this.validateDrawVertexState(first + count - 1, instanceCount, instancedApi))
            return;
        if (cullAll)
            return;
        if (!this.currentDrawTargetHasSize())
            return;
        this.setPrimitiveState(topology);
        this.setPBV();
        let indexBuffer;
        let indexCount;
        if (mode === WebGL2RenderingContext.TRIANGLE_FAN) {
            indexBuffer = this.getTriangleFanIndexBuffer(count);
            indexCount = Math.max(0, count - 2) * 3;
            this.hydRpCache.RpSetIndexBuffer(indexBuffer, "uint32");
            this.hydRpCache.RpDrawIndexed(indexCount, instanceCount, 0, first, 0);
        }
        else if (mode === WebGL2RenderingContext.LINE_LOOP) {
            indexBuffer = this.getLineLoopIndexBuffer(count);
            indexCount = count >= 2 ? count * 2 : 0;
            this.hydRpCache.RpSetIndexBuffer(indexBuffer, "uint32");
            this.hydRpCache.RpDrawIndexed(indexCount, instanceCount, 0, first, 0);
        }
        else {
            this.hydRpCache.RpDraw(count, instanceCount, first, 0);
        }
        this.finishDraw();
        const cached = {
            stateToken: this.hydGlobalState.stateToken,
            mode,
            first,
            count,
            instanceCount,
            instancedApi,
            indexBuffer,
            indexCount,
        };
        this.lastArrayDraw = cached;
        this.cachePreparedArrayDraw(cached);
    }
    drawElements(mode, count, type, offset) {
        if (!this.validateFramebufferAndStencilForDraw())
            return;
        if (this.shouldCullAllTriangles(mode)) {
            this.drawElementsInternal(mode, count, type, offset, 1, false, true);
            return;
        }
        if (this.currentProgramValid) {
            const stateToken = this.hydGlobalState.stateToken;
            const prepared = this.lastIndexedDraw;
            const elementArrayBuffer = this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
            if (prepared && prepared.stateToken === stateToken && prepared.mode === mode &&
                prepared.count === count && prepared.type === type && prepared.offset === offset &&
                prepared.instanceCount === 1 && !prepared.instancedApi &&
                prepared.elementArrayBuffer === elementArrayBuffer &&
                prepared.bufferVersion === prepared.elementArrayBuffer.version) {
                this.setPBV();
                this.hydRpCache.RpSetIndexBuffer(prepared.indexBuffer, prepared.indexFormat);
                this.hydRpCache.RpDrawIndexed(prepared.indexCount, 1, prepared.firstIndex, 0, 0);
                this.finishDraw();
                return;
            }
        }
        const prepared = this.findPreparedIndexedDraw(mode, count, type, offset, 1, false);
        if (prepared) {
            this.executePreparedIndexedDraw(prepared);
            return;
        }
        this.drawElementsInternal(mode, count, type, offset, 1, false);
    }
    drawElementsInstanced(mode, count, type, offset, instanceCount) {
        if (!this.validateFramebufferAndStencilForDraw())
            return;
        if (this.shouldCullAllTriangles(mode)) {
            this.drawElementsInternal(mode, count, type, offset, instanceCount, true, true);
            return;
        }
        const prepared = this.findPreparedIndexedDraw(mode, count, type, offset, instanceCount, true);
        if (prepared) {
            this.executePreparedIndexedDraw(prepared);
            return;
        }
        this.drawElementsInternal(mode, count, type, offset, instanceCount, true);
    }
    drawElementsInternal(mode, count, type, offset, instanceCount, instancedApi, cullAll = false) {
        mode = Number(mode) >>> 0;
        count = toWebGlInt32(count);
        type = Number(type) >>> 0;
        offset = toWebGlInt64(offset);
        instanceCount = toWebGlInt32(instanceCount);
        const topology = this.primitiveTopology(mode);
        if (!topology)
            return;
        if (count < 0 || offset < 0 || instanceCount < 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_VALUE);
            return;
        }
        const uint32Enabled = this.hydContextType === "webgl2" || this.enabledExtensions.has("OES_ELEMENT_INDEX_UINT");
        if (type !== WebGL2RenderingContext.UNSIGNED_BYTE &&
            type !== WebGL2RenderingContext.UNSIGNED_SHORT &&
            (type !== WebGL2RenderingContext.UNSIGNED_INT || !uint32Enabled)) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_ENUM);
            return;
        }
        const indexSize = type === WebGL2RenderingContext.UNSIGNED_BYTE ? 1 :
            type === WebGL2RenderingContext.UNSIGNED_SHORT ? 2 : 4;
        if ((offset % indexSize) !== 0) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (!this.currentProgramValid) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const elementArrayBuffer = this.hydGlobalState.commonState.vertexArrayBinding.elementArrayBufferBinding;
        if (!elementArrayBuffer) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        if (count === 0 || instanceCount === 0)
            return;
        if (!elementArrayBuffer.buffer || offset + count * indexSize > elementArrayBuffer.webglSize) {
            this.hydGlobalState.setError(WebGL2RenderingContext.INVALID_OPERATION);
            return;
        }
        const maxIndex = elementArrayBuffer.maxIndex(type, offset, count);
        if (!this.validateDrawVertexState(maxIndex, instanceCount, instancedApi))
            return;
        if (cullAll)
            return;
        if (!this.currentDrawTargetHasSize())
            return;
        let indexBuffer = elementArrayBuffer.buffer;
        let indexFormat;
        if (type === WebGL2RenderingContext.UNSIGNED_SHORT) {
            indexFormat = "uint16";
        }
        else if (type === WebGL2RenderingContext.UNSIGNED_INT) {
            indexFormat = "uint32";
        }
        else {
            indexBuffer = elementArrayBuffer.getUint16IndexBuffer();
            indexFormat = "uint16";
        }
        let drawIndexCount = count;
        let firstIndex = Math.floor(offset / indexSize);
        if (mode === WebGL2RenderingContext.TRIANGLE_FAN || mode === WebGL2RenderingContext.LINE_LOOP) {
            const expanded = elementArrayBuffer.getExpandedIndexBuffer(mode, type, offset, count);
            indexBuffer = expanded.buffer;
            indexFormat = expanded.format;
            drawIndexCount = expanded.indexCount;
            firstIndex = 0;
        }
        this.setPrimitiveState(topology, indexFormat);
        this.setPBV();
        this.hydRpCache.RpSetIndexBuffer(indexBuffer, indexFormat);
        this.hydRpCache.RpDrawIndexed(drawIndexCount, instanceCount, firstIndex, 0, 0);
        this.finishDraw();
        const prepared = {
            stateToken: this.hydGlobalState.stateToken,
            elementArrayBuffer,
            bufferVersion: elementArrayBuffer.version,
            mode,
            count,
            type,
            offset,
            instanceCount,
            instancedApi,
            indexBuffer,
            indexFormat,
            indexCount: drawIndexCount,
            firstIndex,
        };
        this.lastIndexedDraw = prepared;
        this.cachePreparedIndexedDraw(prepared);
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

;// ./src/components/shaderGlslCompatibility.ts

function shaderGlslCompatibility_maskComments(source) {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\r\n]/g, " "))
        .replace(/\/\/.*$/gm, (comment) => " ".repeat(comment.length));
}
function replaceMaskedToken(source, masked, token, replacement) {
    let out = "";
    let cursor = 0;
    token.lastIndex = 0;
    for (let match = token.exec(masked); match !== null; match = token.exec(masked)) {
        out += source.slice(cursor, match.index) + replacement;
        cursor = match.index + match[0].length;
    }
    return out + source.slice(cursor);
}
function updateBlockCommentState(line, initiallyInComment) {
    let inComment = initiallyInComment;
    for (let index = 0; index < line.length; index++) {
        if (inComment) {
            if (line[index] === "*" && line[index + 1] === "/") {
                inComment = false;
                index++;
            }
            continue;
        }
        if (line[index] === "/" && line[index + 1] === "/")
            break;
        if (line[index] === "/" && line[index + 1] === "*") {
            inComment = true;
            index++;
        }
    }
    return inComment;
}
function materializeWebGlLineMacros(source) {
    const sourceLines = source.split(/(?<=\n)/);
    const maskedLines = shaderGlslCompatibility_maskComments(source).split(/(?<=\n)/);
    const objectLineMacros = new Map();
    let logicalLine = 1;
    let inBlockComment = false;
    let defineContinuation = false;
    return sourceLines.map((line, index) => {
        const masked = maskedLines[index] || "";
        const directive = defineContinuation
            ? null
            : /^\s*#\s*([A-Za-z_]\w*)\b([^\r\n]*)/.exec(masked);
        let out = line;
        if (!defineContinuation && !directive && logicalLine !== null) {
            out = replaceMaskedToken(line, masked, /\b__LINE__\b/g, String(logicalLine));
        }
        if (directive?.[1] === "define") {
            const definition = /^\s+([A-Za-z_]\w*)(?!\s*\()\s+([0-9]+)\s*$/.exec(directive[2]);
            if (definition)
                objectLineMacros.set(definition[1], Number(definition[2]));
        }
        else if (directive?.[1] === "undef") {
            const name = /^\s+([A-Za-z_]\w*)\s*$/.exec(directive[2])?.[1];
            if (name)
                objectLineMacros.delete(name);
        }
        let nextLogicalLine = logicalLine === null ? null : logicalLine + 1;
        if (directive?.[1] === "line") {
            const argument = /^\s+([A-Za-z_]\w*|[0-9]+)(?:\s+(?:[A-Za-z_]\w*|[0-9]+))?\s*$/.exec(directive[2])?.[1];
            const value = argument && (/^\d+$/.test(argument)
                ? Number(argument)
                : objectLineMacros.get(argument));
            nextLogicalLine = value === undefined ? null : value;
        }
        const currentDefine = defineContinuation || directive?.[1] === "define";
        inBlockComment = updateBlockCommentState(line, inBlockComment);
        const lineContinuation = /\\\s*(?:\r?\n)?$/.test(masked);
        defineContinuation = currentDefine && (inBlockComment || lineContinuation);
        logicalLine = nextLogicalLine;
        return out;
    }).join("");
}
function stripGlslVersionDirectives(source) {
    const sourceLines = source.split(/(?<=\n)/);
    const maskedLines = shaderGlslCompatibility_maskComments(source).split(/(?<=\n)/);
    return sourceLines.map((line, index) => /^\s*#\s*version\b/.test(maskedLines[index] || "")
        ? line.replace(/[^\r\n]/g, " ")
        : line).join("");
}
const WEBGL1_GLSL_BUILTIN_LIMITS = {
    gl_MaxVertexAttribs: 16,
    gl_MaxVertexUniformVectors: 1024,
    gl_MaxVaryingVectors: 32,
    gl_MaxVertexTextureImageUnits: 16,
    gl_MaxCombinedTextureImageUnits: 16,
    gl_MaxTextureImageUnits: 16,
    gl_MaxFragmentUniformVectors: 1024,
    gl_MaxDrawBuffers: 1,
};
function normalizeWebGl1BuiltinLimits(source) {
    let out = source;
    for (const [name, value] of Object.entries(WEBGL1_GLSL_BUILTIN_LIMITS)) {
        out = out.replace(new RegExp(`\\b${name}\\b`, "g"), String(value));
    }
    return out;
}
function staticallyKnownPreprocessorCondition(expression, webglVersion) {
    const version = webglVersion === 2 ? 300 : 100;
    const normalized = expression
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/\/\/.*$/g, " ")
        .replace(/\b__VERSION__\b/g, String(version))
        .replace(/\bdefined\s*\(\s*GL_ES\s*\)/g, "1")
        .replace(/\bdefined\s+GL_ES\b/g, "1")
        .trim()
        .replace(/^\((.*)\)$/s, "$1")
        .trim();
    if (normalized === "0")
        return false;
    if (normalized === "1")
        return true;
    const comparison = /^(\d+)\s*(==|!=|<=|>=|<|>)\s*(\d+)$/.exec(normalized);
    if (!comparison)
        return undefined;
    const left = Number(comparison[1]);
    const right = Number(comparison[3]);
    switch (comparison[2]) {
        case "==": return left === right;
        case "!=": return left !== right;
        case "<=": return left <= right;
        case ">=": return left >= right;
        case "<": return left < right;
        case ">": return left > right;
        default: return undefined;
    }
}
function maskStaticallyInactivePreprocessorBranches(source, webglVersion) {
    const lines = source.split(/(?<=\n)/);
    const stack = [];
    const effectiveActive = () => stack.length === 0 || stack[stack.length - 1].active;
    return lines.map((line) => {
        const directive = /^\s*#\s*(if|ifdef|ifndef|elif|else|endif)\b([\s\S]*?)(?:\r?\n)?$/i.exec(line);
        if (directive) {
            const kind = directive[1].toLowerCase();
            const expression = directive[2].trim();
            if (kind === "if" || kind === "ifdef" || kind === "ifndef") {
                const parentActive = effectiveActive();
                let condition;
                if (kind === "ifdef" && expression === "GL_ES")
                    condition = true;
                else if (kind === "ifndef" && expression === "GL_ES")
                    condition = false;
                else if (kind === "if")
                    condition = staticallyKnownPreprocessorCondition(expression, webglVersion);
                stack.push({
                    parentActive,
                    conditionKnown: condition !== undefined,
                    branchTaken: condition === true,
                    active: parentActive && condition !== false,
                });
            }
            else if (kind === "elif" && stack.length > 0) {
                const frame = stack[stack.length - 1];
                const condition = staticallyKnownPreprocessorCondition(expression, webglVersion);
                if (frame.conditionKnown && condition !== undefined) {
                    frame.active = frame.parentActive && !frame.branchTaken && condition;
                    frame.branchTaken ||= condition;
                }
                else {
                    frame.conditionKnown = false;
                    frame.active = frame.parentActive;
                }
            }
            else if (kind === "else" && stack.length > 0) {
                const frame = stack[stack.length - 1];
                frame.active = frame.conditionKnown
                    ? frame.parentActive && !frame.branchTaken
                    : frame.parentActive;
                frame.branchTaken = true;
            }
            else if (kind === "endif") {
                stack.pop();
            }
            return line;
        }
        return effectiveActive() ? line : line.replace(/[^\r\n]/g, " ");
    }).join("");
}
function wrapVertexMainForWebGpuClipSpace(source) {
    const signature = /\bvoid\s+main\s*\(\s*(?:void\s*)?\)\s*\{/;
    if (!signature.test(source))
        return source;
    let innerName = "_hyd_webgl_vertex_main";
    while (new RegExp(`\\b${innerName}\\b`).test(source))
        innerName += "_";
    const body = source.replace(signature, (match) => match.replace(/\bmain\b/, innerName));
    return `${body}\n\nvoid main() {\n  ${innerName}();\n  gl_Position.z = (gl_Position.z + gl_Position.w) * 0.5;\n}\n`;
}
function lowerWebGlPointSizeToPrivateState(source) {
    const masked = shaderGlslCompatibility_maskComments(source);
    if (!/\bgl_PointSize\b/.test(masked))
        return source;
    let privateName = "_hydWebGlPointSize";
    while (new RegExp(`\\b${privateName}\\b`).test(masked))
        privateName += "_";
    const token = /\bgl_PointSize\b/g;
    let out = "";
    let cursor = 0;
    for (let match = token.exec(masked); match !== null; match = token.exec(masked)) {
        out += source.slice(cursor, match.index) + privateName;
        cursor = match.index + match[0].length;
    }
    out += source.slice(cursor);
    return `float ${privateName};\n${out}`;
}
function normalizeWebGlDepthRange(source) {
    if (!/\bgl_DepthRange\s*\./.test(shaderGlslCompatibility_maskComments(source)))
        return source;
    return source
        .replace(/\bgl_DepthRange\s*\.\s*near\b/g, DEPTH_RANGE_NEAR_UNIFORM_NAME)
        .replace(/\bgl_DepthRange\s*\.\s*far\b/g, DEPTH_RANGE_FAR_UNIFORM_NAME)
        .replace(/\bgl_DepthRange\s*\.\s*diff\b/g, DEPTH_RANGE_DIFF_UNIFORM_NAME);
}
function shaderGlslCompatibility_isTopLevelAt(source, index) {
    let braceDepth = 0;
    let parenDepth = 0;
    for (let cursor = 0; cursor < index; cursor++) {
        if (source[cursor] === "{")
            braceDepth++;
        else if (source[cursor] === "}")
            braceDepth--;
        else if (source[cursor] === "(")
            parenDepth++;
        else if (source[cursor] === ")")
            parenDepth--;
    }
    return braceDepth === 0 && parenDepth === 0;
}
function splitTopLevelArguments(source) {
    const parts = [];
    let start = 0;
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    for (let index = 0; index < source.length; index++) {
        const ch = source[index];
        if (ch === "(")
            parenDepth++;
        else if (ch === ")")
            parenDepth--;
        else if (ch === "[")
            bracketDepth++;
        else if (ch === "]")
            bracketDepth--;
        else if (ch === "{")
            braceDepth++;
        else if (ch === "}")
            braceDepth--;
        else if (ch === "," && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
            parts.push(source.slice(start, index));
            start = index + 1;
        }
    }
    parts.push(source.slice(start));
    return parts;
}
function topLevelAssignmentIndex(source) {
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    for (let index = 0; index < source.length; index++) {
        const ch = source[index];
        if (ch === "(")
            parenDepth++;
        else if (ch === ")")
            parenDepth--;
        else if (ch === "[")
            bracketDepth++;
        else if (ch === "]")
            bracketDepth--;
        else if (ch === "{")
            braceDepth++;
        else if (ch === "}")
            braceDepth--;
        else if (ch === "=" && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
            const previous = source[index - 1] || "";
            const next = source[index + 1] || "";
            if (previous !== "=" && previous !== "!" && previous !== "<" && previous !== ">" && next !== "=") {
                return index;
            }
        }
    }
    return -1;
}
function simpleMacroDefinitions(source) {
    const macros = new Map();
    for (const line of shaderGlslCompatibility_maskComments(source).split(/\r?\n/)) {
        const match = /^\s*#\s*define\s+([A-Za-z_]\w*)(\([^)]*\))?(?:[ \t]+(.*))?$/.exec(line);
        if (!match || /\\\s*$/.test(line))
            continue;
        macros.set(match[1], {
            functionLike: match[2] !== undefined,
            replacement: (match[3] || "").trim(),
        });
    }
    return macros;
}
function matchingParen(source, open) {
    let depth = 0;
    for (let index = open; index < source.length; index++) {
        if (source[index] === "(")
            depth++;
        else if (source[index] === ")" && --depth === 0)
            return index;
    }
    return -1;
}
function provablyExpandsToEmpty(source, macros) {
    let current = source.trim();
    const expandedObjects = new Set();
    for (let step = 0; step < 32 && current; step++) {
        const identifier = /^([A-Za-z_]\w*)/.exec(current);
        if (!identifier)
            return false;
        const name = identifier[1];
        const macro = macros.get(name);
        if (!macro)
            return false;
        let suffix = current.slice(identifier[0].length);
        if (!macro.functionLike) {
            if (expandedObjects.has(name))
                return false;
            expandedObjects.add(name);
            current = `${macro.replacement}${suffix}`.trim();
            continue;
        }
        if (macro.replacement.length !== 0)
            return false;
        const open = suffix.search(/\S/);
        if (open < 0 || suffix[open] !== "(")
            return false;
        const close = matchingParen(suffix, open);
        if (close < 0)
            return false;
        current = suffix.slice(close + 1).trim();
    }
    return current.length === 0;
}
function stripProvablyEmptyTopLevelMacroInvocations(source) {
    const macros = simpleMacroDefinitions(source);
    if (macros.size === 0)
        return source;
    const maskedLines = shaderGlslCompatibility_maskComments(source).split(/(?<=\n)/);
    const sourceLines = source.split(/(?<=\n)/);
    let braceDepth = 0;
    return sourceLines.map((line, index) => {
        const masked = maskedLines[index] || "";
        const trimmed = masked.trim();
        if (braceDepth === 0 && trimmed && !trimmed.startsWith("#") &&
            provablyExpandsToEmpty(trimmed, macros)) {
            return line.replace(/[^\r\n]/g, " ");
        }
        if (!trimmed.startsWith("#")) {
            for (const ch of masked) {
                if (ch === "{")
                    braceDepth++;
                else if (ch === "}")
                    braceDepth--;
            }
        }
        return line;
    }).join("");
}
function lowerEs100GlobalInitializers(source) {
    const masked = shaderGlslCompatibility_maskComments(source).replace(/^\s*#.*$/gm, (line) => line.replace(/[^\r\n]/g, " "));
    const declaration = /((?:(?:const|lowp|mediump|highp)\s+)*[A-Za-z_]\w*)\s+([^;{}]+);/g;
    const assignments = [];
    const hoistedDeclarations = [];
    const mainIndex = masked.search(/\bvoid\s+main\s*\(\s*(?:void\s*)?\)\s*\{/);
    let out = "";
    let cursor = 0;
    for (let match = declaration.exec(masked); match !== null; match = declaration.exec(masked)) {
        if (!shaderGlslCompatibility_isTopLevelAt(masked, match.index) || /\bconst\b/.test(match[1]))
            continue;
        const declaratorOffset = match.index + match[0].indexOf(match[2]);
        const declarators = splitTopLevelArguments(source.slice(declaratorOffset, declaration.lastIndex - 1));
        if (declarators.every((item) => topLevelAssignmentIndex(item) < 0))
            continue;
        const loweredDeclarations = [];
        for (const declarator of declarators) {
            const assignmentIndex = topLevelAssignmentIndex(declarator);
            if (assignmentIndex < 0) {
                loweredDeclarations.push(declarator.trim());
                continue;
            }
            const target = declarator.slice(0, assignmentIndex).trim();
            const initializer = declarator.slice(assignmentIndex + 1).trim();
            const name = /^([A-Za-z_]\w*)/.exec(target)?.[1];
            if (!name || !initializer) {
                loweredDeclarations.push(declarator.trim());
                continue;
            }
            loweredDeclarations.push(target);
            assignments.push(`${name} = ${initializer};`);
        }
        const loweredDeclaration = `${match[1]} ${loweredDeclarations.join(", ")};`;
        out += source.slice(cursor, match.index);
        if (mainIndex >= 0 && match.index > mainIndex) {
            hoistedDeclarations.push(loweredDeclaration);
            out += source.slice(match.index, declaration.lastIndex).replace(/[^\r\n]/g, " ");
        }
        else {
            out += loweredDeclaration;
        }
        cursor = declaration.lastIndex;
    }
    if (assignments.length === 0)
        return source;
    out += source.slice(cursor);
    return out.replace(/\bvoid\s+main\s*\(\s*(?:void\s*)?\)\s*\{/, (signature) => `${hoistedDeclarations.join("\n")}${hoistedDeclarations.length ? "\n" : ""}${signature}\n  ${assignments.join("\n  ")}`);
}
function normalizeEs100SequenceArrayDimensions(source) {
    return source.replace(/\[\s*\(\s*([^()[\]]*?,[^()[\]]*?)\s*\)\s*\]/g, (full, expression) => {
        const values = splitTopLevelArguments(expression);
        return values.length > 1 ? `[${values[values.length - 1].trim()}]` : full;
    });
}

;// ./src/components/shaderGlslStructs.ts
const VALUE_TYPES = new Set([
    "float", "int", "uint", "bool",
    "vec2", "vec3", "vec4", "ivec2", "ivec3", "ivec4", "uvec2", "uvec3", "uvec4",
    "bvec2", "bvec3", "bvec4",
    "mat2", "mat3", "mat4", "mat2x2", "mat2x3", "mat2x4", "mat3x2", "mat3x3", "mat3x4",
    "mat4x2", "mat4x3", "mat4x4",
]);
function integerDefines(source) {
    const defines = new Map();
    const pattern = /^\s*#define\s+([A-Za-z_]\w*)\s+(\d+)\s*$/gm;
    for (let match = pattern.exec(source); match !== null; match = pattern.exec(source)) {
        defines.set(match[1], Math.max(1, Number(match[2])));
    }
    return defines;
}
function arrayInfo(rawName, defines) {
    const compact = rawName.replace(/\s+/g, "");
    const match = /^([A-Za-z_]\w*)(?:\[([A-Za-z_]\w*|\d+)\])?$/.exec(compact);
    if (!match)
        return { name: compact, size: 1, isArray: false };
    const size = match[2]
        ? (/^\d+$/.test(match[2]) ? Math.max(1, Number(match[2])) : defines.get(match[2]) || 1)
        : 1;
    return { name: match[1], size, isArray: !!match[2] };
}
function stableHash(value) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index++) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36);
}
function internalLeafName(sourceName) {
    const readable = sourceName.replace(/[^A-Za-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    return `hydgl2gpu_uniform_${readable}_${stableHash(sourceName)}`;
}
function shaderGlslStructs_isTopLevelAt(source, index) {
    let depth = 0;
    for (let cursor = 0; cursor < index; cursor++) {
        if (source[cursor] === "{")
            depth++;
        else if (source[cursor] === "}")
            depth--;
    }
    return depth === 0;
}
function normalizeAnonymousUniformStructs(source) {
    let index = 0;
    return source.replace(/\buniform\s+struct(?:\s+([A-Za-z_]\w*))?\s*\{([\s\S]*?)\}\s*([A-Za-z_]\w*(?:\s*\[[^\]]+\])?)\s*;/g, (_full, declaredTypeName, fields, rawName) => {
        const typeName = declaredTypeName || `hydgl2gpu_anon_uniform_${index++}`;
        return `struct ${typeName} {${fields}};\nuniform ${typeName} ${rawName};`;
    });
}
function shaderGlslStructs_escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function readsAggregate(body, sourceName) {
    return new RegExp(`(^|[^A-Za-z0-9_])${shaderGlslStructs_escapeRegExp(sourceName)}(?![A-Za-z0-9_])(?!\\s*[.\\[])`, "m").test(body);
}
function parseDefinitions(source, defines) {
    const definitions = new Map();
    const structPattern = /\bstruct\s+([A-Za-z_]\w*)\s*\{([\s\S]*?)\}\s*;/g;
    for (let match = structPattern.exec(source); match !== null; match = structPattern.exec(source)) {
        const fields = [];
        const fieldPattern = /(?:^|;)\s*(?:(?:lowp|mediump|highp)\s+)?([A-Za-z_]\w*)\s+([A-Za-z_]\w*(?:\s*\[[^\]]+\])?)\s*(?=;|$)/g;
        for (let field = fieldPattern.exec(match[2]); field !== null; field = fieldPattern.exec(match[2])) {
            const info = arrayInfo(field[2], defines);
            fields.push({ name: info.name, glslType: field[1], size: info.size, isArray: info.isArray });
        }
        definitions.set(match[1], { name: match[1], fields });
    }
    return definitions;
}
function blankRanges(source, ranges) {
    const chars = source.split("");
    for (const range of ranges) {
        for (let index = range.start; index < range.end; index++) {
            if (chars[index] !== "\n" && chars[index] !== "\r")
                chars[index] = " ";
        }
    }
    return chars.join("");
}
function planValueStructUniforms(rawSource) {
    const source = normalizeAnonymousUniformStructs(rawSource);
    const defines = integerDefines(source);
    const definitions = parseDefinitions(source, defines);
    const parsedRoots = [];
    const declarationRanges = [];
    const uniformPattern = /\buniform\s+(?:(?:lowp|mediump|highp)\s+)?([A-Za-z_]\w*)\s+([A-Za-z_]\w*(?:\s*\[[^\]]+\])?)\s*;/g;
    for (let match = uniformPattern.exec(source); match !== null; match = uniformPattern.exec(source)) {
        if (!shaderGlslStructs_isTopLevelAt(source, match.index) || !definitions.has(match[1]))
            continue;
        const info = arrayInfo(match[2], defines);
        parsedRoots.push({ name: info.name, glslType: match[1], size: info.size, isArray: info.isArray });
        declarationRanges.push({ start: match.index, end: uniformPattern.lastIndex });
    }
    const body = blankRanges(source, declarationRanges);
    const roots = parsedRoots.map((root) => ({
        ...root,
        aggregateRead: !root.isArray && readsAggregate(body, root.name),
    }));
    const allLeaves = [];
    const aggregates = [];
    const expand = (rootName, glslType, sourceName) => {
        if (VALUE_TYPES.has(glslType)) {
            allLeaves.push({
                rootName,
                sourceName,
                name: internalLeafName(sourceName),
                glslType,
                size: 1,
                isArray: false,
            });
            return;
        }
        const definition = definitions.get(glslType);
        if (!definition)
            return;
        if (readsAggregate(body, sourceName))
            aggregates.push({ sourceName, glslType });
        for (const field of definition.fields) {
            const fieldPath = `${sourceName}.${field.name}`;
            if (field.isArray && VALUE_TYPES.has(field.glslType)) {
                allLeaves.push({
                    rootName,
                    sourceName: fieldPath,
                    name: internalLeafName(fieldPath),
                    glslType: field.glslType,
                    size: field.size,
                    isArray: true,
                });
            }
            else if (field.isArray) {
                for (let index = 0; index < field.size; index++)
                    expand(rootName, field.glslType, `${fieldPath}[${index}]`);
            }
            else {
                expand(rootName, field.glslType, fieldPath);
            }
        }
    };
    for (const root of roots) {
        if (root.isArray) {
            for (let index = 0; index < root.size; index++)
                expand(root.name, root.glslType, `${root.name}[${index}]`);
        }
        else {
            expand(root.name, root.glslType, root.name);
        }
    }
    const leaves = allLeaves.filter((leaf) => {
        const root = roots.find((item) => item.name === leaf.rootName);
        return !!root && (root.aggregateRead || body.includes(leaf.sourceName) ||
            aggregates.some((aggregate) => leaf.sourceName.startsWith(`${aggregate.sourceName}.`)));
    });
    return { definitions, roots, leaves, aggregates };
}
function constructorFor(plan, glslType, sourceName) {
    const definition = plan.definitions.get(glslType);
    if (!definition)
        return null;
    const args = [];
    for (const field of definition.fields) {
        if (field.isArray)
            return null;
        const fieldPath = `${sourceName}.${field.name}`;
        if (VALUE_TYPES.has(field.glslType)) {
            const leaf = plan.leaves.find((item) => item.sourceName === fieldPath);
            if (!leaf)
                return null;
            args.push(leaf.name);
        }
        else {
            const nested = constructorFor(plan, field.glslType, fieldPath);
            if (!nested)
                return null;
            args.push(nested);
        }
    }
    return `${glslType}(${args.join(", ")})`;
}
function rewriteStructUniformAggregateReads(source, plan) {
    let out = source;
    for (const aggregate of [...plan.aggregates].sort((left, right) => right.sourceName.length - left.sourceName.length)) {
        const constructor = constructorFor(plan, aggregate.glslType, aggregate.sourceName);
        if (!constructor)
            continue;
        out = out.replace(new RegExp(`(^|[^A-Za-z0-9_])${shaderGlslStructs_escapeRegExp(aggregate.sourceName)}(?![A-Za-z0-9_])(?!\\s*[.\\[])`, "gm"), (_match, prefix) => `${prefix}${constructor}`);
    }
    return out;
}

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
    ["isampler2D", "texture_2d<i32>"],
    ["isamplerCube", "texture_cube<i32>"],
    ["isampler2DArray", "texture_2d_array<i32>"],
    ["isampler3D", "texture_3d<i32>"],
    ["usampler2D", "texture_2d<u32>"],
    ["usamplerCube", "texture_cube<u32>"],
    ["usampler2DArray", "texture_2d_array<u32>"],
    ["usampler3D", "texture_3d<u32>"],
]);
function stripComments(source) {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
}
function normalizeIdentifierName(raw) {
    return raw.replace(/\[[^\]]*\]$/, "").replace(/;$/, "").trim();
}
function tokenizeIntegerExpression(expression) {
    const tokens = [];
    const token = /\s*(?:(0[xX][0-9a-fA-F]+[uU]?|\d+[uU]?)|([A-Za-z_]\w*)|(<<|>>|[()+\-*/%~&^|]))/gy;
    let cursor = 0;
    while (cursor < expression.length) {
        token.lastIndex = cursor;
        const match = token.exec(expression);
        if (!match || match.index !== cursor)
            return null;
        tokens.push({
            kind: match[1] ? "number" : match[2] ? "identifier" : "operator",
            value: match[1] || match[2] || match[3],
        });
        cursor = token.lastIndex;
    }
    return tokens;
}
function evaluateIntegerExpression(expression, constants) {
    const tokens = tokenizeIntegerExpression(expression);
    if (!tokens)
        return null;
    let index = 0;
    const accept = (value) => tokens[index]?.value === value ? (index++, true) : false;
    const binary = (next, operators, apply) => {
        let left = next();
        if (left === null)
            return null;
        while (operators.includes(tokens[index]?.value)) {
            const operator = tokens[index++].value;
            const right = next();
            if (right === null)
                return null;
            left = apply(left, operator, right);
            if (left === null)
                return null;
        }
        return left;
    };
    const primary = () => {
        const current = tokens[index];
        if (!current)
            return null;
        if (accept("(")) {
            const value = bitwiseOr();
            return value !== null && accept(")") ? value : null;
        }
        index++;
        if (current.kind === "number")
            return Number(current.value.replace(/[uU]$/, ""));
        return current.kind === "identifier" ? constants.get(current.value) ?? null : null;
    };
    const unary = () => {
        const operator = tokens[index]?.value;
        if (operator !== "+" && operator !== "-" && operator !== "~")
            return primary();
        index++;
        const value = unary();
        if (value === null)
            return null;
        return operator === "+" ? value : operator === "-" ? -value : ~value;
    };
    const multiply = () => binary(unary, ["*", "/", "%"], (left, operator, right) => {
        if ((operator === "/" || operator === "%") && right === 0)
            return null;
        if (operator === "*")
            return left * right;
        if (operator === "/")
            return Math.trunc(left / right);
        return left % right;
    });
    const add = () => binary(multiply, ["+", "-"], (left, operator, right) => operator === "+" ? left + right : left - right);
    const shift = () => binary(add, ["<<", ">>"], (left, operator, right) => operator === "<<" ? left << right : left >> right);
    const bitwiseAnd = () => binary(shift, ["&"], (left, _operator, right) => left & right);
    const bitwiseXor = () => binary(bitwiseAnd, ["^"], (left, _operator, right) => left ^ right);
    const bitwiseOr = () => binary(bitwiseXor, ["|"], (left, _operator, right) => left | right);
    const value = bitwiseOr();
    return value !== null && index === tokens.length && Number.isFinite(value) ? Math.trunc(value) : null;
}
function splitIntegerDeclarators(source) {
    const result = [];
    let start = 0;
    let depth = 0;
    for (let index = 0; index < source.length; index++) {
        if (source[index] === "(")
            depth++;
        else if (source[index] === ")")
            depth--;
        else if (source[index] === "," && depth === 0) {
            result.push(source.slice(start, index));
            start = index + 1;
        }
    }
    result.push(source.slice(start));
    return result;
}
function shaderMetadata_integerDefines(source) {
    const constants = new Map();
    const pending = [];
    const defineRegex = /^\s*#define\s+([A-Za-z_]\w*)\s+([^\r\n]+)$/gm;
    for (let match = defineRegex.exec(source); match !== null; match = defineRegex.exec(source)) {
        pending.push({ name: match[1], expression: match[2].trim() });
    }
    const constRegex = /\bconst\s+(?:(?:lowp|mediump|highp)\s+)?(?:int|uint)\s+([^;]+);/g;
    for (let match = constRegex.exec(source); match !== null; match = constRegex.exec(source)) {
        if (!shaderMetadata_isTopLevelAt(source, match.index))
            continue;
        for (const declarator of splitIntegerDeclarators(match[1])) {
            const assignment = /^\s*([A-Za-z_]\w*)\s*=\s*([\s\S]+)$/.exec(declarator);
            if (assignment)
                pending.push({ name: assignment[1], expression: assignment[2].trim() });
        }
    }
    for (let pass = 0; pass <= pending.length; pass++) {
        let changed = false;
        for (const item of pending) {
            if (constants.has(item.name))
                continue;
            const value = evaluateIntegerExpression(item.expression, constants);
            if (value !== null) {
                constants.set(item.name, value);
                changed = true;
            }
        }
        if (!changed)
            break;
    }
    return constants;
}
function identifierArraySize(raw, defines) {
    const match = raw.match(/\[\s*([^\]]+)\s*\]\s*$/);
    if (!match)
        return 1;
    const value = evaluateIntegerExpression(match[1], defines);
    return value === null ? 1 : Math.max(1, value);
}
function identifierIsArray(raw) {
    return /\[\s*[^\]]+\s*\]\s*$/.test(raw);
}
function appendSamplerDeclarations(output, name, glslType, textureType, size, sourceName, isArray = false) {
    for (let index = 0; index < size; index++) {
        output.push({
            name: isArray ? `${name}_${index}` : name,
            glsl_type: glslType,
            wgsl_texture_type: textureType,
            wgsl_sampler_type: "sampler",
            source_name: isArray ? `${sourceName || name}[${index}]` : sourceName,
            size,
            is_array: isArray,
            array_name: isArray ? (sourceName || name) : undefined,
            array_index: isArray ? index : undefined,
        });
    }
}
function sanitizeResourceName(name) {
    return name.replace(/[^A-Za-z0-9_]/g, "_").replace(/_+$/g, "");
}
function shaderMetadata_escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function isIdentifierReferenced(source, name) {
    return new RegExp(`\\b${shaderMetadata_escapeRegExp(name)}\\b`).test(source);
}
function shaderMetadata_isTopLevelAt(source, index) {
    let braceDepth = 0;
    let parenDepth = 0;
    for (let i = 0; i < index; i++) {
        const ch = source[i];
        if (ch === "{") {
            braceDepth++;
        }
        else if (ch === "}") {
            braceDepth = Math.max(0, braceDepth - 1);
        }
        else if (ch === "(") {
            parenDepth++;
        }
        else if (ch === ")") {
            parenDepth = Math.max(0, parenDepth - 1);
        }
    }
    return braceDepth === 0 && parenDepth === 0;
}
function toWgslType(glslType) {
    const mapped = TYPE_MAP.get(glslType);
    if (!mapped) {
        throw new Error(`unsupported GLSL type: ${glslType}`);
    }
    return mapped;
}
function toUniformWgslType(glslType) {
    switch (glslType) {
        case "bool":
            return "u32";
        case "bvec2":
            return "vec2<u32>";
        case "bvec3":
            return "vec3<u32>";
        case "bvec4":
            return "vec4<u32>";
        default:
            return toWgslType(glslType);
    }
}
function declarationFrom(glslType, name, interpolation = "", sourceName, uniform = false, size = 1, isArray = false) {
    const elementType = uniform ? toUniformWgslType(glslType) : toWgslType(glslType);
    return {
        name,
        glsl_type: glslType,
        wgsl_type: isArray ? `array<${elementType}, ${size}>` : elementType,
        interpolation,
        source_name: sourceName,
        size,
        is_array: isArray,
    };
}
function isKnownValueType(glslType) {
    return TYPE_MAP.has(glslType);
}
function isKnownSamplerType(glslType) {
    return SAMPLER_TEXTURE_MAP.has(glslType);
}
function parseStructDefinitions(source, defines) {
    const structs = new Map();
    const structRegex = /\bstruct\s+([A-Za-z_]\w*)\s*\{([\s\S]*?)\}\s*;/g;
    let match;
    while ((match = structRegex.exec(source)) !== null) {
        const fields = [];
        const fieldRegex = /^\s*(?:(?:lowp|mediump|highp)\s+)?([A-Za-z_]\w*)\s+([A-Za-z_]\w*\s*(?:\[[^\]]*\])?)\s*;/gm;
        let fieldMatch;
        while ((fieldMatch = fieldRegex.exec(match[2])) !== null) {
            const rawName = fieldMatch[2].replace(/\s+/g, "");
            fields.push({
                glslType: fieldMatch[1],
                name: normalizeIdentifierName(rawName),
                size: identifierArraySize(rawName, defines),
                isArray: identifierIsArray(rawName),
            });
        }
        structs.set(match[1], fields);
    }
    return structs;
}
function scanGlslDeclarations(source, stage, options = {}) {
    const cleaned = normalizeAnonymousUniformStructs(stripComments(source));
    const defines = shaderMetadata_integerDefines(cleaned);
    const declarations = {
        attributes: [],
        uniforms: [],
        samplers: [],
        varyings: [],
    };
    const structs = parseStructDefinitions(cleaned, defines);
    const valueStructUniforms = planValueStructUniforms(cleaned);
    const seen = new Set();
    const declarationPattern = /\b(?:(?:layout\s*\([^)]*\)\s*)?)(?:invariant\s+)?(?:(?:lowp|mediump|highp)\s+)?((?:(?:flat|smooth|noperspective|centroid|sample)\s+)*)(attribute|uniform|varying|in|out)\s+(?:(?:lowp|mediump|highp)\s+)?([A-Za-z_]\w*)\s+([^;]+)\s*;/g;
    const bodyWithoutGlobalDeclarations = cleaned.replace(declarationPattern, (full, ...args) => {
        const offset = args[args.length - 2];
        return shaderMetadata_isTopLevelAt(cleaned, offset) ? "\n" : full;
    });
    const declarationRegex = new RegExp(declarationPattern);
    let match;
    while ((match = declarationRegex.exec(cleaned)) !== null) {
        if (!shaderMetadata_isTopLevelAt(cleaned, match.index)) {
            continue;
        }
        const interpolation = match[1].trim();
        const qualifier = match[2];
        const glslType = match[3];
        const names = match[4].split(",");
        for (const rawName of names) {
            const sourceName = normalizeIdentifierName(rawName);
            const name = bridgeGlslIdentifier(sourceName);
            const size = identifierArraySize(rawName, defines);
            const isArray = identifierIsArray(rawName);
            if (!name)
                continue;
            const key = `${qualifier}:${glslType}:${name}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            if (qualifier === "uniform") {
                if (!isIdentifierReferenced(bodyWithoutGlobalDeclarations, sourceName)) {
                    continue;
                }
                const textureType = SAMPLER_TEXTURE_MAP.get(glslType);
                if (textureType) {
                    appendSamplerDeclarations(declarations.samplers, name, glslType, textureType, size, name === sourceName ? undefined : sourceName, isArray);
                }
                else if (structs.has(glslType)) {
                    const rootReferenced = isIdentifierReferenced(bodyWithoutGlobalDeclarations, sourceName);
                    for (const field of structs.get(glslType)) {
                        const fieldTextureType = SAMPLER_TEXTURE_MAP.get(field.glslType);
                        if (fieldTextureType) {
                            if (!rootReferenced)
                                continue;
                            const outerCount = isArray ? size : 1;
                            const fieldCount = field.isArray ? field.size : 1;
                            for (let outerIndex = 0; outerIndex < outerCount; outerIndex++) {
                                const rootName = isArray ? `${sourceName}[${outerIndex}]` : sourceName;
                                const fieldBase = `${rootName}.${field.name}`;
                                for (let fieldIndex = 0; fieldIndex < fieldCount; fieldIndex++) {
                                    const sourceName = field.isArray ? `${fieldBase}[${fieldIndex}]` : fieldBase;
                                    declarations.samplers.push({
                                        name: sanitizeResourceName(sourceName),
                                        glsl_type: field.glslType,
                                        wgsl_texture_type: fieldTextureType,
                                        wgsl_sampler_type: "sampler",
                                        source_name: sourceName,
                                        size: outerCount * fieldCount,
                                        is_array: isArray || field.isArray,
                                        array_name: field.isArray ? fieldBase : undefined,
                                        array_index: field.isArray ? fieldIndex : undefined,
                                    });
                                }
                            }
                        }
                    }
                    for (const leaf of valueStructUniforms.leaves.filter((item) => item.rootName === sourceName)) {
                        declarations.uniforms.push(declarationFrom(leaf.glslType, leaf.name, "", leaf.sourceName, true, leaf.size, leaf.isArray));
                    }
                }
                else if (isKnownValueType(glslType)) {
                    declarations.uniforms.push(declarationFrom(glslType, name, "", name === sourceName ? undefined : sourceName, true, size, isArray));
                }
                else {
                    continue;
                }
                continue;
            }
            if (qualifier === "attribute" || (qualifier === "in" && stage === "vertex")) {
                if (!isIdentifierReferenced(bodyWithoutGlobalDeclarations, sourceName)) {
                    continue;
                }
                if (!isKnownValueType(glslType)) {
                    continue;
                }
                declarations.attributes.push(declarationFrom(glslType, name, interpolation, name === sourceName ? undefined : sourceName, false, size, isArray));
                continue;
            }
            if (qualifier === "varying" || (qualifier === "out" && stage === "vertex") || (qualifier === "in" && stage === "fragment")) {
                if (!options.includeUnusedVaryings && !isIdentifierReferenced(bodyWithoutGlobalDeclarations, sourceName)) {
                    continue;
                }
                if (!isKnownValueType(glslType)) {
                    continue;
                }
                declarations.varyings.push(declarationFrom(glslType, name, interpolation, name === sourceName ? undefined : sourceName, false, size, isArray));
            }
        }
    }
    return declarations;
}
function makeShaderMetadata(source, type, wgsl = "") {
    const stage = type === 0x8B31 ? "vertex" : "fragment";
    const declarations = scanGlslDeclarations(source, stage);
    const sourceWithoutComments = stripComments(source);
    const readsFragCoord = stage === "fragment" && /\bgl_FragCoord\b/.test(sourceWithoutComments.replace(/\binvariant\s+gl_FragCoord\s*;/g, ""));
    if (readsFragCoord) {
        declarations.uniforms.push({
            name: FRAG_COORD_HEIGHT_UNIFORM_NAME,
            glsl_type: "float",
            wgsl_type: "f32",
            internal: true,
        });
    }
    if (/\bgl_DepthRange\s*\./.test(sourceWithoutComments)) {
        declarations.uniforms.push({
            name: DEPTH_RANGE_NEAR_UNIFORM_NAME,
            source_name: "gl_DepthRange.near",
            glsl_type: "float",
            wgsl_type: "f32",
            internal: true,
        }, {
            name: DEPTH_RANGE_FAR_UNIFORM_NAME,
            source_name: "gl_DepthRange.far",
            glsl_type: "float",
            wgsl_type: "f32",
            internal: true,
        }, {
            name: DEPTH_RANGE_DIFF_UNIFORM_NAME,
            source_name: "gl_DepthRange.diff",
            glsl_type: "float",
            wgsl_type: "f32",
            internal: true,
        });
    }
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
function shaderTexCoord_splitTopLevelArguments(source) {
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
        const args = shaderTexCoord_splitTopLevelArguments(wgsl.slice(openParen + 1, closeParen));
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
function stripWholeExpressionParentheses(source) {
    let out = source.trim();
    while (out.startsWith("(") && findMatching(out, 0, "(", ")") === out.length - 1) {
        out = out.slice(1, -1).trim();
    }
    return out;
}
function rightmostTopLevelPlus(source) {
    let parenDepth = 0;
    let bracketDepth = 0;
    for (let index = source.length - 1; index >= 0; index--) {
        const ch = source[index];
        if (ch === ")")
            parenDepth++;
        else if (ch === "(")
            parenDepth--;
        else if (ch === "]")
            bracketDepth++;
        else if (ch === "[")
            bracketDepth--;
        else if (ch === "+" && parenDepth === 0 && bracketDepth === 0) {
            let previous = index - 1;
            let next = index + 1;
            while (previous >= 0 && /\s/.test(source[previous]))
                previous--;
            while (next < source.length && /\s/.test(source[next]))
                next++;
            if (previous >= 0 && next < source.length && !/[+\-*/%(<>=!,&|^]/.test(source[previous])) {
                return index;
            }
        }
    }
    return -1;
}
function leftAssociativeAddTerms(source) {
    const rightTerms = [];
    let left = stripWholeExpressionParentheses(source);
    while (true) {
        const plus = rightmostTopLevelPlus(left);
        if (plus < 0)
            break;
        rightTerms.push(left.slice(plus + 1).trim());
        left = stripWholeExpressionParentheses(left.slice(0, plus));
    }
    return [left, ...rightTerms.reverse()];
}
function splitDeepAssociativeExpressions(source) {
    const lines = source.split("\n");
    let split = 0;
    let temporary = 0;
    const out = [];
    const assignment = /^(\s*)((?:(?:let|var)\s+[A-Za-z_]\w*(?:\s*:\s*[^=;]+)?|[A-Za-z_]\w*)\s*=\s*)(.+);\s*$/;
    for (const line of lines) {
        const match = assignment.exec(line);
        if (!match) {
            out.push(line);
            continue;
        }
        const terms = leftAssociativeAddTerms(match[3]);
        if (terms.length <= 48) {
            out.push(line);
            continue;
        }
        let expression = terms[0];
        let chunkTerms = 0;
        for (let index = 1; index < terms.length; index++) {
            expression = `(${expression} + ${terms[index]})`;
            chunkTerms++;
            if (chunkTerms === 24 && index < terms.length - 1) {
                const name = `_hyd_add_chain_${temporary++}`;
                out.push(`${match[1]}let ${name} = ${expression};`);
                expression = name;
                chunkTerms = 0;
                split++;
            }
        }
        out.push(`${match[1]}${match[2]}${expression};`);
    }
    return { wgsl: out.join("\n"), split };
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
function shaderWgslOptimizer_parseStructs(source) {
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
        const fieldDetails = [];
        const fieldRegex = /((?:@[A-Za-z_]\w*(?:\([^)]*\))?\s*)*)([A-Za-z_]\w*)\s*:\s*([^,]+),/g;
        for (let field = fieldRegex.exec(body); field !== null; field = fieldRegex.exec(body)) {
            const attributes = (field[1] || "").replace(/\s+/g, " ").trim();
            const name = field[2];
            fields.push(name);
            fieldDetails.push({
                attributes,
                name,
                type: field[3].trim(),
            });
        }
        structs.push({ name: match[1], fields, fieldDetails, start: match.index, end: bodyClose + 1 });
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
function pointerAssignmentCount(source, name) {
    const deref = `\\*\\s*\\(\\s*${shaderWgslOptimizer_escapeRegExp(name)}\\s*\\)`;
    const maybeParenthesizedDeref = `(?:${deref}|\\(\\s*${deref}\\s*\\))`;
    const regex = new RegExp(`${maybeParenthesizedDeref}\\s*(?:[+\\-*/%&|^]?=|(?:\\.|\\[[^\\]]+\\])[^=;\\n]*=)`, "g");
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
function applyExpressionMap(source, replacements) {
    let out = source;
    const expressions = Array.from(replacements.keys()).sort((a, b) => b.length - a.length);
    for (const expression of expressions) {
        out = out.replace(new RegExp(`\\b${shaderWgslOptimizer_escapeRegExp(expression)}(?=$|[^A-Za-z0-9_])`, "g"), replacements.get(expression));
    }
    return out;
}
function exactAssignmentCount(source, expression) {
    const regex = new RegExp(`(?:^|[;\\n]\\s*)${shaderWgslOptimizer_escapeRegExp(expression)}\\s*(?:[+\\-*/%&|^]?=)`, "g");
    return source.match(regex)?.length ?? 0;
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
    const outputStruct = shaderWgslOptimizer_parseStructs(source).find((item) => item.name === outputStructName);
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
    const outputExpressionMap = new Map();
    const outputPrivateNames = new Set();
    for (let i = 0; i < returnArgs.length; i++) {
        const arg = returnArgs[i].trim();
        if (/^[A-Za-z_]\w*$/.test(arg) && privateNames.has(arg)) {
            if (outputMap.has(arg)) {
                return { wgsl: source, loweredPrivateVars: 0, skipped: "duplicate-output-expression" };
            }
            outputMap.set(arg, `_hyd_output.${outputStruct.fields[i]}`);
            outputPrivateNames.add(arg);
            continue;
        }
        const indexed = /^([A-Za-z_]\w*)\s*\[\s*([^\]]+)\s*\]$/.exec(arg);
        if (indexed && privateNames.has(indexed[1])) {
            const expression = `${indexed[1]}[${indexed[2].trim()}]`;
            if (outputExpressionMap.has(expression)) {
                return { wgsl: source, loweredPrivateVars: 0, skipped: "duplicate-output-expression" };
            }
            outputExpressionMap.set(expression, `_hyd_output.${outputStruct.fields[i]}`);
            outputPrivateNames.add(indexed[1]);
            continue;
        }
        return { wgsl: source, loweredPrivateVars: 0, skipped: "unsupported-output-expression" };
    }
    const mappedPrivateNames = new Set([...inputMap.keys(), ...outputPrivateNames]);
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
    if (countIdentifier(outsideHelperAndEntry, helper.name) > 0) {
        return { wgsl: source, loweredPrivateVars: 0, skipped: "helper-has-other-callsites" };
    }
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
    for (const expression of outputExpressionMap.keys()) {
        if (exactAssignmentCount(helper.body, expression) < 1) {
            return { wgsl: source, loweredPrivateVars: 0, skipped: "output-private-never-written" };
        }
    }
    const replacements = new Map([...inputMap, ...outputMap]);
    let loweredBody = applyExpressionMap(helper.body, outputExpressionMap);
    loweredBody = applyIdentifierMap(loweredBody, replacements)
        .replace(/^\s*return\s*;\s*$/gm, "")
        .trim();
    for (const name of mappedPrivateNames) {
        if (countIdentifier(loweredBody, name) > 0) {
            return { wgsl: source, loweredPrivateVars: 0, skipped: "private-io-has-unmapped-uses" };
        }
    }
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
            if (assignmentCount(fn.body, param.name) > 0 || pointerAssignmentCount(fn.body, param.name) > 0) {
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
function collectVectorDimensions(source) {
    const dimensions = new Map();
    const typePattern = "vec\\s*([234])\\s*(?:f|<\\s*f32\\s*>)";
    const declarationRegex = new RegExp(`\\b(?:var(?:<[^>]+>)?|let)\\s+([A-Za-z_]\\w*)\\s*:\\s*${typePattern}`, "g");
    for (let match = declarationRegex.exec(source); match !== null; match = declarationRegex.exec(source)) {
        dimensions.set(match[1], Number(match[2]));
    }
    const inferredConstructorRegex = /\b(?:var|let)\s+([A-Za-z_]\w*)\s*=\s*vec([234])f\s*\(/g;
    for (let match = inferredConstructorRegex.exec(source); match !== null; match = inferredConstructorRegex.exec(source)) {
        dimensions.set(match[1], Number(match[2]));
    }
    const paramRegex = new RegExp(`\\b([A-Za-z_]\\w*)\\s*:\\s*${typePattern}`, "g");
    for (let match = paramRegex.exec(source); match !== null; match = paramRegex.exec(source)) {
        dimensions.set(match[1], Number(match[2]));
    }
    return dimensions;
}
function foldVectorConstructors(source) {
    let folded = 0;
    const vectorDimensions = collectVectorDimensions(source);
    let out = source.replace(/\bvec2f\s*\(\s*([A-Za-z_]\w*)\.x\s*,\s*\1\.y\s*\)/g, (_match, value) => {
        if (vectorDimensions.get(value) !== 2) {
            return _match;
        }
        folded++;
        return value;
    });
    out = out.replace(/\bvec3f\s*\(\s*([A-Za-z_]\w*)\.x\s*,\s*\1\.y\s*,\s*\1\.z\s*\)/g, (_match, value) => {
        if (vectorDimensions.get(value) !== 3) {
            return _match;
        }
        folded++;
        return value;
    });
    out = out.replace(/\bvec4f\s*\(\s*([A-Za-z_]\w*)\.x\s*,\s*\1\.y\s*,\s*\1\.z\s*,\s*\1\.w\s*\)/g, (_match, value) => {
        if (vectorDimensions.get(value) !== 4) {
            return _match;
        }
        folded++;
        return value;
    });
    out = out.replace(/\bvec4f\s*\(\s*([A-Za-z_]\w*)\.x\s*,\s*\1\.y\s*,\s*\1\.z\s*,\s*([^,)]+?)\s*\)/g, (_match, value, scalar) => {
        if (vectorDimensions.get(value) !== 3) {
            return _match;
        }
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
function simpleAliasRoot(expression) {
    return /^([A-Za-z_]\w*)(?:\.[A-Za-z_]\w*)?$/.exec(expression)?.[1];
}
function aliasSourceMayChange(sourceBeforeUse, sourceBetweenDeclarationAndUse, root, privateNames) {
    if (privateNames.has(root)) {
        return true;
    }
    const escapedRoot = shaderWgslOptimizer_escapeRegExp(root);
    if (new RegExp(`&\\s*\\(?\\s*${escapedRoot}\\b`).test(sourceBeforeUse)) {
        return true;
    }
    const accessPath = `\\b${escapedRoot}\\b(?:\\s*\\.\\s*[A-Za-z_]\\w*|\\s*\\[[^\\]]+\\])*`;
    const assignment = new RegExp(`${accessPath}\\s*(?:=(?!=)|\\+=|-=|\\*=|/=|%=|&=|\\|=|\\^=|<<=|>>=|\\+\\+|--)`);
    return assignment.test(sourceBetweenDeclarationAndUse);
}
function removeSingleUseLetsInBody(body, privateNames, immutableNames) {
    let out = body;
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
            const root = simpleAliasRoot(expression);
            const immutableSource = root !== undefined && immutableNames.has(root);
            if (useCount === 0 || (!immutableSource && useCount !== 1)) {
                continue;
            }
            const firstUse = after.search(new RegExp(`\\b${shaderWgslOptimizer_escapeRegExp(name)}\\b`));
            if (firstUse < 0) {
                continue;
            }
            const betweenDeclarationAndUse = after.slice(0, firstUse);
            if (root) {
                const sourceBeforeUse = out.slice(0, match.index + full.length + firstUse);
                if (!immutableSource && aliasSourceMayChange(sourceBeforeUse, betweenDeclarationAndUse, root, privateNames)) {
                    continue;
                }
            }
            else if (betweenDeclarationAndUse.trim().length > 0) {
                continue;
            }
            out = out.slice(0, match.index) + out.slice(match.index + full.length);
            const replacement = root ? expression : `(${expression})`;
            out = out.slice(0, match.index) + wordBoundaryReplace(out.slice(match.index), name, replacement);
            removed++;
            changed = true;
            break;
        }
    }
    return { body: out, removed };
}
function removeSingleUseLets(source) {
    let out = source;
    let removed = 0;
    let changed = true;
    while (changed) {
        changed = false;
        const privateNames = new Set(parsePrivateDeclarations(out).map((declaration) => declaration.name));
        for (const fn of parseFunctions(out)) {
            const immutableNames = parseParamNames(fn.params);
            const letRegex = /\blet\s+([A-Za-z_]\w*)\b/g;
            for (let declaration = letRegex.exec(fn.body); declaration !== null; declaration = letRegex.exec(fn.body)) {
                immutableNames.add(declaration[1]);
            }
            const result = removeSingleUseLetsInBody(fn.body, privateNames, immutableNames);
            if (result.removed === 0) {
                continue;
            }
            out = out.slice(0, fn.bodyOpen + 1) + result.body + out.slice(fn.bodyClose);
            removed += result.removed;
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
function returnStructName(returnType) {
    const match = /^\s*->\s*([A-Za-z_]\w*)\s*$/.exec(returnType);
    return match ? match[1] : undefined;
}
function replaceOutputSwizzle(expression, outputName, fieldName, swizzle, replacement) {
    const pattern = new RegExp(`${shaderWgslOptimizer_escapeRegExp(outputName)}\\.${shaderWgslOptimizer_escapeRegExp(fieldName)}\\.${shaderWgslOptimizer_escapeRegExp(swizzle)}`, "g");
    return expression.replace(pattern, () => replacement);
}
function foldOutputComponentStoresInBody(body, outputName) {
    const lines = body.split("\n");
    let folded = 0;
    for (let i = 0; i <= lines.length - 5; i++) {
        const xMatch = new RegExp(`^([ \\t]*)${shaderWgslOptimizer_escapeRegExp(outputName)}\\.([A-Za-z_]\\w*)\\.x\\s*=\\s*([\\s\\S]+);\\s*$`).exec(lines[i]);
        if (!xMatch) {
            continue;
        }
        const indent = xMatch[1];
        const field = xMatch[2];
        const yMatch = new RegExp(`^[ \\t]*${shaderWgslOptimizer_escapeRegExp(outputName)}\\.${shaderWgslOptimizer_escapeRegExp(field)}\\.y\\s*=\\s*([\\s\\S]+);\\s*$`).exec(lines[i + 1]);
        const wholeMatch = new RegExp(`^[ \\t]*${shaderWgslOptimizer_escapeRegExp(outputName)}\\.${shaderWgslOptimizer_escapeRegExp(field)}\\s*=\\s*([\\s\\S]+);\\s*$`).exec(lines[i + 2]);
        const zMatch = new RegExp(`^[ \\t]*${shaderWgslOptimizer_escapeRegExp(outputName)}\\.${shaderWgslOptimizer_escapeRegExp(field)}\\.z\\s*=\\s*([\\s\\S]+);\\s*$`).exec(lines[i + 3]);
        const wMatch = new RegExp(`^[ \\t]*${shaderWgslOptimizer_escapeRegExp(outputName)}\\.${shaderWgslOptimizer_escapeRegExp(field)}\\.w\\s*=\\s*([\\s\\S]+);\\s*$`).exec(lines[i + 4]);
        if (!yMatch || !wholeMatch || !zMatch || !wMatch) {
            continue;
        }
        const constructorArgs = unwrapFunctionCall(wholeMatch[1].trim(), "vec4f") ?? unwrapFunctionCall(wholeMatch[1].trim(), "vec4<f32>");
        if (!constructorArgs) {
            continue;
        }
        const args = shaderWgslOptimizer_splitTopLevelArguments(constructorArgs);
        if (args.length !== 2 || normalizeExpressionForCompare(args[1]) !== `${outputName}.${field}.zw`) {
            continue;
        }
        const xyReplacement = `vec2f(${xMatch[3].trim()}, ${yMatch[1].trim()})`;
        const xyExpression = replaceOutputSwizzle(args[0].trim(), outputName, field, "xy", xyReplacement);
        const xyComponents = splitVec2AffineComponents(xyExpression);
        const constructor = xyComponents
            ? `vec4f(${xyComponents[0]}, ${xyComponents[1]}, ${zMatch[1].trim()}, ${wMatch[1].trim()})`
            : `vec4f(${xyExpression}, ${zMatch[1].trim()}, ${wMatch[1].trim()})`;
        lines.splice(i, 5, `${indent}${outputName}.${field} = ${constructor};`);
        folded++;
    }
    for (let i = 0; i <= lines.length - 4; i++) {
        const xMatch = new RegExp(`^([ \\t]*)${shaderWgslOptimizer_escapeRegExp(outputName)}\\.([A-Za-z_]\\w*)\\.x\\s*=\\s*([\\s\\S]+);\\s*$`).exec(lines[i]);
        if (!xMatch) {
            continue;
        }
        const indent = xMatch[1];
        const field = xMatch[2];
        const yMatch = new RegExp(`^[ \\t]*${shaderWgslOptimizer_escapeRegExp(outputName)}\\.${shaderWgslOptimizer_escapeRegExp(field)}\\.y\\s*=\\s*([\\s\\S]+);\\s*$`).exec(lines[i + 1]);
        const zMatch = new RegExp(`^[ \\t]*${shaderWgslOptimizer_escapeRegExp(outputName)}\\.${shaderWgslOptimizer_escapeRegExp(field)}\\.z\\s*=\\s*([\\s\\S]+);\\s*$`).exec(lines[i + 2]);
        const wMatch = new RegExp(`^[ \\t]*${shaderWgslOptimizer_escapeRegExp(outputName)}\\.${shaderWgslOptimizer_escapeRegExp(field)}\\.w\\s*=\\s*([\\s\\S]+);\\s*$`).exec(lines[i + 3]);
        if (!yMatch || !zMatch || !wMatch) {
            continue;
        }
        lines.splice(i, 4, `${indent}${outputName}.${field} = vec4f(${xMatch[3].trim()}, ${yMatch[1].trim()}, ${zMatch[1].trim()}, ${wMatch[1].trim()});`);
        folded++;
    }
    return { body: lines.join("\n"), folded };
}
function scalarizeVec2OutputAssignmentsInBody(body, outputName, fieldTypes, vectorNames) {
    const lines = body.split("\n");
    let scalarized = 0;
    for (let i = 0; i < lines.length; i++) {
        const assignment = new RegExp(`^([ \\t]*)${shaderWgslOptimizer_escapeRegExp(outputName)}\\.([A-Za-z_]\\w*)\\s*=\\s*([\\s\\S]+);\\s*$`).exec(lines[i]);
        if (!assignment || !isVec2Type(fieldTypes.get(assignment[2]) || "")) {
            continue;
        }
        const components = splitVec2AffineComponents(assignment[3].trim(), vectorNames);
        if (!components) {
            continue;
        }
        const replacement = `${assignment[1]}${outputName}.${assignment[2]} = vec2f(${components[0]}, ${components[1]});`;
        if (replacement === lines[i]) {
            continue;
        }
        lines[i] = replacement;
        scalarized++;
    }
    return { body: lines.join("\n"), scalarized };
}
function foldOutputComponentStores(source) {
    let out = source;
    let folded = 0;
    let changed = true;
    while (changed) {
        changed = false;
        const functions = parseFunctions(out);
        const structs = shaderWgslOptimizer_parseStructs(out);
        for (const fn of functions) {
            if (!/@(vertex|fragment)\b/.test(fn.attributes)) {
                continue;
            }
            const structName = returnStructName(fn.returnType);
            if (!structName) {
                continue;
            }
            const outputStruct = structs.find((item) => item.name === structName);
            if (!outputStruct) {
                continue;
            }
            const vectorNames = collectVec2ValueNames(fn);
            const fieldTypes = new Map(outputStruct.fieldDetails.map((field) => [field.name, field.type]));
            const varMatch = new RegExp(`^\\s*var\\s+([A-Za-z_]\\w*)\\s*:\\s*${shaderWgslOptimizer_escapeRegExp(structName)}\\s*;`).exec(fn.body);
            if (!varMatch) {
                continue;
            }
            if (/\b(if|for|while|loop|switch|discard|break|continue|return)\b/.test(fn.body.replace(new RegExp(`return\\s+${shaderWgslOptimizer_escapeRegExp(varMatch[1])}\\s*;\\s*$`), ""))) {
                continue;
            }
            const componentResult = foldOutputComponentStoresInBody(fn.body, varMatch[1]);
            const scalarResult = scalarizeVec2OutputAssignmentsInBody(componentResult.body, varMatch[1], fieldTypes, vectorNames);
            const changedCount = componentResult.folded + scalarResult.scalarized;
            if (changedCount === 0) {
                continue;
            }
            out = out.slice(0, fn.bodyOpen + 1) + scalarResult.body + out.slice(fn.bodyClose);
            folded += changedCount;
            changed = true;
            break;
        }
    }
    return { wgsl: out, folded };
}
function isVec2Type(type) {
    return /^(?:vec2f|vec2\s*<\s*f32\s*>)$/.test(type.trim().replace(/\s+/g, ""));
}
function collectVec2ValueNames(fn) {
    const names = new Set();
    for (const param of splitTopLevelParameters(fn.params)) {
        const cleaned = param.replace(/@[A-Za-z_]\w*(?:\([^)]*\))?/g, " ").trim();
        const match = /^([A-Za-z_]\w*)\s*:\s*([\s\S]+)$/.exec(cleaned);
        if (match && isVec2Type(match[2])) {
            names.add(match[1]);
        }
    }
    const declarationRegex = /\b(?:let|var)\s+([A-Za-z_]\w*)\s*:\s*([^=;]+)(?:[=;])/g;
    for (let declaration = declarationRegex.exec(fn.body); declaration !== null; declaration = declarationRegex.exec(fn.body)) {
        if (isVec2Type(declaration[2])) {
            names.add(declaration[1]);
        }
    }
    return names;
}
function constructOutputStructReturnsOnce(source) {
    const functions = parseFunctions(source);
    const structs = shaderWgslOptimizer_parseStructs(source);
    for (const fn of functions) {
        if (!/@(vertex|fragment)\b/.test(fn.attributes)) {
            continue;
        }
        const structName = returnStructName(fn.returnType);
        if (!structName) {
            continue;
        }
        const outputStruct = structs.find((item) => item.name === structName);
        if (!outputStruct || outputStruct.fields.length === 0) {
            continue;
        }
        if (outputStruct.fields.length !== 1) {
            continue;
        }
        const vectorNames = collectVec2ValueNames(fn);
        const fieldTypes = new Map(outputStruct.fieldDetails.map((field) => [field.name, field.type]));
        const varMatch = new RegExp(`^\\s*var\\s+([A-Za-z_]\\w*)\\s*:\\s*${shaderWgslOptimizer_escapeRegExp(structName)}\\s*;[ \\t]*(?:\\r?\\n)?`).exec(fn.body);
        if (!varMatch) {
            continue;
        }
        const outputName = varMatch[1];
        const afterVar = fn.body.slice(varMatch[0].length);
        const returnMatch = new RegExp(`\\s*return\\s+${shaderWgslOptimizer_escapeRegExp(outputName)}\\s*;\\s*$`).exec(afterVar);
        if (!returnMatch) {
            continue;
        }
        const middle = afterVar.slice(0, returnMatch.index);
        if (/\b(if|for|while|loop|switch|return|discard|break|continue)\b/.test(middle)) {
            continue;
        }
        const assigned = new Map();
        const prelude = [];
        let outputAssignmentsStarted = false;
        let safe = true;
        for (const line of middle.split("\n")) {
            const trimmed = line.trim();
            if (trimmed.length === 0) {
                if (!outputAssignmentsStarted) {
                    prelude.push(line);
                }
                continue;
            }
            const assignment = new RegExp(`^[ \\t]*${shaderWgslOptimizer_escapeRegExp(outputName)}\\.([A-Za-z_]\\w*)\\s*=\\s*([\\s\\S]+);\\s*$`).exec(line);
            if (assignment) {
                outputAssignmentsStarted = true;
                const field = assignment[1];
                let value = assignment[2].trim();
                if (assigned.has(field) || value.includes(`${outputName}.`)) {
                    safe = false;
                    break;
                }
                if (isVec2Type(fieldTypes.get(field) || "")) {
                    const components = splitVec2AffineComponents(value, vectorNames);
                    if (components) {
                        value = `vec2f(${components[0]}, ${components[1]})`;
                    }
                }
                assigned.set(field, value);
                continue;
            }
            if (outputAssignmentsStarted || new RegExp(`\\b${shaderWgslOptimizer_escapeRegExp(outputName)}\\b`).test(line)) {
                safe = false;
                break;
            }
            if (!/^\s*(let|var)\s+[A-Za-z_]\w*\b/.test(line)) {
                safe = false;
                break;
            }
            prelude.push(line);
        }
        if (!safe) {
            continue;
        }
        if (assigned.size !== outputStruct.fields.length || outputStruct.fields.some((field) => !assigned.has(field))) {
            continue;
        }
        const args = outputStruct.fields.map((field) => assigned.get(field));
        const preludeBody = prelude.join("\n").replace(/\s+$/g, "");
        const newBody = preludeBody.length > 0
            ? `\n${preludeBody}\n  return ${structName}(${args.join(", ")});\n`
            : `\n  return ${structName}(${args.join(", ")});\n`;
        return {
            wgsl: source.slice(0, fn.bodyOpen + 1) + newBody + source.slice(fn.bodyClose),
            constructed: 1,
        };
    }
    return { wgsl: source, constructed: 0 };
}
function constructOutputStructReturns(source) {
    let out = source;
    let constructed = 0;
    for (let i = 0; i < 32; i++) {
        const result = constructOutputStructReturnsOnce(out);
        if (result.constructed === 0) {
            return { wgsl: out, constructed };
        }
        out = result.wgsl;
        constructed += result.constructed;
    }
    return { wgsl: out, constructed };
}
function collapseSingleFieldOutputStructsOnce(source) {
    const functions = parseFunctions(source);
    const structs = shaderWgslOptimizer_parseStructs(source);
    for (const fn of functions) {
        if (!/@(vertex|fragment)\b/.test(fn.attributes)) {
            continue;
        }
        const structName = returnStructName(fn.returnType);
        if (!structName) {
            continue;
        }
        const outputStruct = structs.find((item) => item.name === structName);
        if (!outputStruct || outputStruct.fieldDetails.length !== 1) {
            continue;
        }
        const field = outputStruct.fieldDetails[0];
        if (!field.attributes) {
            continue;
        }
        if ((fn.body.match(/\breturn\b/g) || []).length !== 1) {
            continue;
        }
        const returnRegex = new RegExp(`return\\s+${shaderWgslOptimizer_escapeRegExp(structName)}\\s*\\(`, "g");
        let returnMatch = null;
        for (let match = returnRegex.exec(fn.body); match !== null; match = returnRegex.exec(fn.body)) {
            returnMatch = match;
        }
        if (!returnMatch) {
            continue;
        }
        const bodyReturnStart = returnMatch.index;
        const openParen = fn.body.indexOf("(", bodyReturnStart);
        if (openParen < 0) {
            continue;
        }
        const closeParen = findMatching(fn.body, openParen, "(", ")");
        if (closeParen < 0 || !/^\s*;\s*$/.test(fn.body.slice(closeParen + 1))) {
            continue;
        }
        const args = shaderWgslOptimizer_splitTopLevelArguments(fn.body.slice(openParen + 1, closeParen));
        if (args.length !== 1) {
            continue;
        }
        const absoluteReturnStart = fn.bodyOpen + 1 + bodyReturnStart;
        const absoluteReturnEnd = fn.bodyOpen + 1 + closeParen + 2;
        const replacementReturnType = ` -> ${field.attributes} ${field.type} `;
        let out = removeRanges(source, [
            { start: absoluteReturnStart, end: absoluteReturnEnd, replacement: `return ${args[0]};` },
            { start: fn.closeParen + 1, end: fn.bodyOpen, replacement: replacementReturnType },
        ]);
        out = out.replace(/\n{3,}/g, "\n\n");
        return { wgsl: out, collapsed: 1 };
    }
    return { wgsl: source, collapsed: 0 };
}
function collapseSingleFieldOutputStructs(source) {
    let out = source;
    let collapsed = 0;
    for (let i = 0; i < 32; i++) {
        const result = collapseSingleFieldOutputStructsOnce(out);
        if (result.collapsed === 0) {
            return { wgsl: out, collapsed };
        }
        out = result.wgsl;
        collapsed += result.collapsed;
    }
    return { wgsl: out, collapsed };
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
function unwrapTrailingSwizzle(expression, swizzle) {
    const trimmed = expression.trim();
    if (!trimmed.endsWith(`.${swizzle}`)) {
        return undefined;
    }
    return stripBalancedOuterParens(trimmed.slice(0, -(swizzle.length + 1)).trim());
}
function splitVec2ConstructorComponents(expression) {
    const argsSource = unwrapFunctionCall(stripBalancedOuterParens(expression), "vec2f")
        ?? unwrapFunctionCall(stripBalancedOuterParens(expression), "vec2<f32>");
    if (!argsSource) {
        return undefined;
    }
    const args = shaderWgslOptimizer_splitTopLevelArguments(argsSource);
    return args.length === 2 ? [args[0], args[1]] : undefined;
}
function vectorComponent(expression, index, vectorNames) {
    const expr = stripBalancedOuterParens(expression);
    const constructor = splitVec2ConstructorComponents(expr);
    if (constructor) {
        return constructor[index];
    }
    if (vectorNames?.has(expr)) {
        return `${expr}.${index === 0 ? "x" : "y"}`;
    }
    const swizzle = /^([\s\S]+)\.([xyzw]{2,4})$/.exec(expr);
    if (!swizzle || swizzle[2].length <= index) {
        return undefined;
    }
    return `${stripBalancedOuterParens(swizzle[1].trim())}.${swizzle[2][index]}`;
}
function splitVec2AffineComponents(expression, vectorNames) {
    const expr = unwrapTrailingSwizzle(expression, "xy") ?? stripBalancedOuterParens(expression);
    const addOffset = splitTopLevelOperator(expr, "+");
    if (!addOffset) {
        return splitVec2ConstructorComponents(expr);
    }
    const multiply = splitTopLevelOperator(stripBalancedOuterParens(addOffset[0]), "*");
    if (!multiply) {
        return undefined;
    }
    const addBase = splitTopLevelOperator(stripBalancedOuterParens(multiply[0]), "+");
    if (!addBase) {
        const baseX = vectorComponent(multiply[0], 0, vectorNames);
        const baseY = vectorComponent(multiply[0], 1, vectorNames);
        const scaleX = vectorComponent(multiply[1], 0, vectorNames);
        const scaleY = vectorComponent(multiply[1], 1, vectorNames);
        const offsetX = vectorComponent(addOffset[1], 0, vectorNames);
        const offsetY = vectorComponent(addOffset[1], 1, vectorNames);
        if (!baseX || !baseY || !scaleX || !scaleY || !offsetX || !offsetY) {
            return undefined;
        }
        return [
            `(((${baseX}) * ${scaleX}) + ${offsetX})`,
            `(((${baseY}) * ${scaleY}) + ${offsetY})`,
        ];
    }
    const baseX = vectorComponent(addBase[0], 0, vectorNames);
    const baseY = vectorComponent(addBase[0], 1, vectorNames);
    const addX = vectorComponent(addBase[1], 0, vectorNames);
    const addY = vectorComponent(addBase[1], 1, vectorNames);
    const scaleX = vectorComponent(multiply[1], 0, vectorNames);
    const scaleY = vectorComponent(multiply[1], 1, vectorNames);
    const offsetX = vectorComponent(addOffset[1], 0, vectorNames);
    const offsetY = vectorComponent(addOffset[1], 1, vectorNames);
    if (!baseX || !baseY || !addX || !addY || !scaleX || !scaleY || !offsetX || !offsetY) {
        return undefined;
    }
    return [
        `(((${baseX} + ${addX}) * ${scaleX}) + ${offsetX})`,
        `(((${baseY} + ${addY}) * ${scaleY}) + ${offsetY})`,
    ];
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
function braceDepthAt(source, index) {
    let depth = 0;
    for (let i = 0; i < index; i++) {
        if (source[i] === "{") {
            depth++;
        }
        else if (source[i] === "}") {
            depth = Math.max(0, depth - 1);
        }
    }
    return depth;
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
            if (braceDepthAt(out, declaration.index) !== braceDepthAt(out, assignment.index)) {
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
    let foldedOutputStores = 0;
    let collapsedOutputStructs = 0;
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
    const outputComponents = foldOutputComponentStores(out);
    out = outputComponents.wgsl;
    foldedOutputStores += outputComponents.folded;
    const outputReturns = constructOutputStructReturns(out);
    out = outputReturns.wgsl;
    foldedOutputStores += outputReturns.constructed;
    const singleFieldOutputs = collapseSingleFieldOutputStructs(out);
    out = singleFieldOutputs.wgsl;
    collapsedOutputStructs += singleFieldOutputs.collapsed;
    return { wgsl: out, promotedLocalVars, branchifiedSelects, hoistedModOperands, foldedModByOne, elidedRangeClamps, foldedOutputStores, collapsedOutputStructs, removedTemporaries, foldedConstructors };
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
        foldedOutputStores: 0,
        collapsedOutputStructs: 0,
        removedTemporaries: 0,
        foldedConstructors: 0,
        splitDeepExpressions: 0,
        skippedPasses: [],
    };
    const initialDepth = splitDeepAssociativeExpressions(wgsl);
    stats.splitDeepExpressions += initialDepth.split;
    const lowered = lowerEntryWrapper(initialDepth.wgsl);
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
    stats.foldedOutputStores = peepholes.foldedOutputStores;
    stats.collapsedOutputStructs = peepholes.collapsedOutputStructs;
    stats.removedTemporaries = peepholes.removedTemporaries;
    stats.foldedConstructors = peepholes.foldedConstructors;
    const finalDepth = splitDeepAssociativeExpressions(out);
    out = finalDepth.wgsl;
    stats.splitDeepExpressions += finalDepth.split;
    return {
        wgsl: out.trim() + "\n",
        stats,
    };
}

;// ./src/components/shaderGlslUniforms.ts
function glslMatrixDimensions(glslType) {
    const square = /^mat([234])$/.exec(glslType);
    if (square) {
        const size = Number(square[1]);
        return { columns: size, rows: size };
    }
    const rectangular = /^mat([234])x([234])$/.exec(glslType);
    return rectangular ? { columns: Number(rectangular[1]), rows: Number(rectangular[2]) } : null;
}
function matrixArrayLoaderName(name) {
    return `_hyd_load_matrix_array_${name}`;
}
function matrixArrayStorageDeclaration(uniform) {
    const dimensions = glslMatrixDimensions(uniform.glsl_type);
    const size = uniform.size || 1;
    if (!dimensions || !uniform.is_array)
        return null;
    return `vec${dimensions.rows} ${uniform.name}[${size * dimensions.columns}];`;
}
function makeMatrixArrayLoaders(uniforms) {
    const loaders = [];
    for (const uniform of uniforms) {
        const dimensions = glslMatrixDimensions(uniform.glsl_type);
        if (!dimensions || !uniform.is_array)
            continue;
        const columns = [];
        for (let column = 0; column < dimensions.columns; column++) {
            columns.push(`${uniform.name}[(index * ${dimensions.columns}) + ${column}]`);
        }
        loaders.push([
            `${uniform.glsl_type} ${matrixArrayLoaderName(uniform.name)}(int index) {`,
            `  return ${uniform.glsl_type}(${columns.join(", ")});`,
            "}",
        ].join("\n"));
    }
    return loaders;
}
function findMatchingBracket(source, openIndex) {
    let depth = 0;
    let lineComment = false;
    let blockComment = false;
    for (let i = openIndex; i < source.length; i++) {
        const ch = source[i];
        const next = source[i + 1];
        if (lineComment) {
            if (ch === "\n")
                lineComment = false;
            continue;
        }
        if (blockComment) {
            if (ch === "*" && next === "/") {
                blockComment = false;
                i++;
            }
            continue;
        }
        if (ch === "/" && next === "/") {
            lineComment = true;
            i++;
            continue;
        }
        if (ch === "/" && next === "*") {
            blockComment = true;
            i++;
            continue;
        }
        if (ch === "[") {
            depth++;
        }
        else if (ch === "]") {
            depth--;
            if (depth === 0)
                return i;
        }
    }
    return -1;
}
function rewriteMatrixArrayUniform(source, uniform) {
    const size = uniform.size || 1;
    const name = uniform.name;
    const loader = matrixArrayLoaderName(name);
    let out = "";
    let cursor = 0;
    let index = 0;
    let lineComment = false;
    let blockComment = false;
    while (index < source.length) {
        const ch = source[index];
        const next = source[index + 1];
        if (lineComment) {
            if (ch === "\n")
                lineComment = false;
            index++;
            continue;
        }
        if (blockComment) {
            if (ch === "*" && next === "/") {
                blockComment = false;
                index += 2;
            }
            else {
                index++;
            }
            continue;
        }
        if (ch === "/" && next === "/") {
            lineComment = true;
            index += 2;
            continue;
        }
        if (ch === "/" && next === "*") {
            blockComment = true;
            index += 2;
            continue;
        }
        if (source.startsWith(name, index) &&
            (index === 0 || !/[A-Za-z0-9_]/.test(source[index - 1])) &&
            !/[A-Za-z0-9_]/.test(source[index + name.length] || "")) {
            let suffix = index + name.length;
            while (/\s/.test(source[suffix] || ""))
                suffix++;
            if (source[suffix] === "[") {
                const close = findMatchingBracket(source, suffix);
                if (close < 0)
                    throw new Error(`unterminated matrix array access for ${name}`);
                const expression = source.slice(suffix + 1, close).trim();
                if (!expression)
                    throw new Error(`empty matrix array index for ${name}`);
                out += source.slice(cursor, index) + `${loader}(int(${expression}))`;
                cursor = close + 1;
                index = cursor;
                continue;
            }
            const lengthCall = source.slice(suffix).match(/^\.\s*length\s*\(\s*\)/);
            if (lengthCall) {
                out += source.slice(cursor, index) + `${size}`;
                cursor = suffix + lengthCall[0].length;
                index = cursor;
                continue;
            }
            if (source[suffix] === ";") {
                let previous = index - 1;
                while (previous >= 0 && /\s/.test(source[previous]))
                    previous--;
                if (previous < 0 || source[previous] === ";" || source[previous] === "{" || source[previous] === "}") {
                    out += source.slice(cursor, index);
                    cursor = suffix;
                    index = cursor;
                    continue;
                }
            }
            throw new Error(`unsupported whole-array use of matrix uniform ${name}`);
        }
        index++;
    }
    return out + source.slice(cursor);
}
function rewriteMatrixArrayUniformReads(source, uniforms) {
    let out = source;
    for (const uniform of uniforms) {
        if (glslMatrixDimensions(uniform.glsl_type) && uniform.is_array) {
            out = rewriteMatrixArrayUniform(out, uniform);
        }
    }
    return out;
}

;// ./src/components/shaderGlslSamplers.ts
const SAMPLER_TYPE_PATTERN = /^[iu]?sampler(?:2D|Cube|2DArray|3D)$/;
const STRUCT_FUNCTION_SIGNATURE = /((?:^|[;\n{}])\s*(?:[A-Za-z_]\w*\s+)+([A-Za-z_]\w*)\s*)\(([^()]*)\)(\s*[;{])/gm;
function shaderGlslSamplers_escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function shaderGlslSamplers_sanitizeResourceName(name) {
    return name.replace(/[^A-Za-z0-9_]/g, "_").replace(/_+$/g, "");
}
function parseSamplerOnlyStructs(source) {
    const structs = new Map();
    const regex = /\bstruct\s+([A-Za-z_]\w*)\s*\{([\s\S]*?)\}\s*;/g;
    for (let match = regex.exec(source); match !== null; match = regex.exec(source)) {
        const fields = [];
        let totalFields = 0;
        const fieldRegex = /^\s*(?:(?:lowp|mediump|highp)\s+)?([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*(?:\[\s*(\d+)\s*\])?\s*;/gm;
        for (let field = fieldRegex.exec(match[2]); field !== null; field = fieldRegex.exec(match[2])) {
            totalFields++;
            if (!SAMPLER_TYPE_PATTERN.test(field[1]))
                continue;
            fields.push({
                glslType: field[1],
                name: field[2],
                size: field[3] ? Math.max(1, Number(field[3])) : 1,
            });
        }
        if (fields.length > 0 && fields.length === totalFields) {
            structs.set(match[1], { name: match[1], fields });
        }
    }
    return structs;
}
function parseSamplerStructParam(raw, structs) {
    const normalized = raw.trim()
        .replace(/^(?:const|in|out|inout)\s+/, "")
        .replace(/^(?:lowp|mediump|highp)\s+/, "");
    const match = /^([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*(?:\[\s*(\d+)\s*\])?$/.exec(normalized);
    if (!match)
        return null;
    const struct = structs.get(match[1]);
    return struct ? { name: match[2], struct, size: match[3] ? Math.max(1, Number(match[3])) : 1 } : null;
}
function samplerStructExpansions(parameterName, struct, parameterSize) {
    const expansions = [];
    for (let parameterIndex = 0; parameterIndex < parameterSize; parameterIndex++) {
        const parameterSuffix = parameterSize > 1 ? `[${parameterIndex}]` : "";
        for (const field of struct.fields) {
            for (let fieldIndex = 0; fieldIndex < field.size; fieldIndex++) {
                const fieldSuffix = field.size > 1 ? `[${fieldIndex}]` : "";
                const suffix = `${parameterSuffix}.${field.name}${fieldSuffix}`;
                expansions.push({
                    suffix,
                    name: shaderGlslSamplers_sanitizeResourceName(`${parameterName}${suffix}`),
                    glslType: field.glslType,
                });
            }
        }
    }
    return expansions;
}
function rewriteSamplerStructCalls(source, lowerings, samplers) {
    const samplerBySourceName = new Map(samplers.filter((sampler) => sampler.source_name).map((sampler) => [sampler.source_name, sampler.name]));
    let out = source;
    for (const lowering of lowerings) {
        let result = "";
        let cursor = 0;
        const callRegex = new RegExp(`\\b${shaderGlslSamplers_escapeRegExp(lowering.name)}\\s*\\(`, "g");
        for (let match = callRegex.exec(out); match !== null; match = callRegex.exec(out)) {
            const open = callRegex.lastIndex - 1;
            const close = shaderGlslSamplers_findMatchingParen(out, open);
            if (close < 0)
                break;
            const next = out.slice(close + 1).match(/^\s*([;{])/);
            const statementStart = Math.max(out.lastIndexOf(";", match.index - 1), out.lastIndexOf("{", match.index - 1), out.lastIndexOf("}", match.index - 1), out.lastIndexOf("\n", match.index - 1)) + 1;
            const prefix = out.slice(statementStart, match.index);
            const isPrototype = !!(next && next[1] === ";" && /^\s*(?:[A-Za-z_]\w*\s+)+$/.test(prefix));
            if ((next && next[1] === "{") || isPrototype) {
                callRegex.lastIndex = close + 1;
                continue;
            }
            const args = shaderGlslSamplers_splitTopLevelArguments(out.slice(open + 1, close));
            const loweringByIndex = new Map(lowering.params.map((param) => [param.index, param]));
            const rewritten = [];
            for (let index = 0; index < args.length; index++) {
                const param = loweringByIndex.get(index);
                if (!param) {
                    rewritten.push(args[index].trim());
                    continue;
                }
                const argument = args[index].trim();
                for (const expansion of param.expansions) {
                    const sourceName = `${argument}${expansion.suffix}`.replace(/\s+/g, "");
                    rewritten.push(samplerBySourceName.get(sourceName) || shaderGlslSamplers_sanitizeResourceName(sourceName));
                }
            }
            result += out.slice(cursor, match.index);
            result += `${lowering.name}(${rewritten.join(", ")})`;
            cursor = close + 1;
            callRegex.lastIndex = close + 1;
        }
        if (cursor !== 0)
            out = result + out.slice(cursor);
    }
    return out;
}
function lowerSamplerStructFunctionParameters(source, samplers) {
    const structs = parseSamplerOnlyStructs(source);
    if (structs.size === 0)
        return source;
    const loweringByName = new Map();
    let out = source.replace(STRUCT_FUNCTION_SIGNATURE, (full, prefix, functionName, rawParams, suffix) => {
        const params = shaderGlslSamplers_splitTopLevelArguments(rawParams);
        const structParams = [];
        const rewrittenParams = [];
        for (let index = 0; index < params.length; index++) {
            const parsed = parseSamplerStructParam(params[index], structs);
            if (!parsed) {
                rewrittenParams.push(params[index].trim());
                continue;
            }
            const expansions = samplerStructExpansions(parsed.name, parsed.struct, parsed.size);
            structParams.push({ index, name: parsed.name, expansions });
            for (const expansion of expansions) {
                rewrittenParams.push(`${expansion.glslType} ${expansion.name}`);
            }
        }
        if (structParams.length === 0)
            return full;
        loweringByName.set(functionName, { name: functionName, params: structParams });
        return `${prefix}(${rewrittenParams.join(", ")})${suffix}`;
    });
    const lowerings = Array.from(loweringByName.values());
    if (lowerings.length === 0)
        return source;
    for (const lowering of lowerings) {
        for (const param of lowering.params) {
            for (const expansion of param.expansions) {
                const access = `${param.name}${expansion.suffix}`;
                const accessPattern = new RegExp(`\\b${shaderGlslSamplers_escapeRegExp(access)}(?=$|[^A-Za-z0-9_])`, "g");
                out = out.replace(accessPattern, expansion.name);
            }
        }
    }
    out = rewriteSamplerStructCalls(out, lowerings, samplers);
    for (const struct of structs.values()) {
        out = out.replace(new RegExp(`\\bstruct\\s+${shaderGlslSamplers_escapeRegExp(struct.name)}\\s*\\{[\\s\\S]*?\\}\\s*;`, "g"), "");
    }
    return out;
}
function samplerGroups(samplers) {
    const groups = new Map();
    for (const sampler of samplers) {
        if (!sampler.array_name)
            continue;
        let group = groups.get(sampler.array_name);
        if (!group) {
            group = { name: sampler.array_name, elements: [] };
            groups.set(sampler.array_name, group);
        }
        group.elements.push(sampler);
    }
    for (const group of groups.values()) {
        group.elements.sort((a, b) => (a.array_index || 0) - (b.array_index || 0));
    }
    return groups;
}
function shaderGlslSamplers_findMatchingParen(source, openIndex) {
    let depth = 0;
    for (let i = openIndex; i < source.length; i++) {
        if (source[i] === "(")
            depth++;
        else if (source[i] === ")" && --depth === 0)
            return i;
    }
    return -1;
}
function shaderGlslSamplers_splitTopLevelArguments(source) {
    const args = [];
    let start = 0;
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    for (let i = 0; i < source.length; i++) {
        const ch = source[i];
        if (ch === "(")
            parenDepth++;
        else if (ch === ")")
            parenDepth--;
        else if (ch === "[")
            bracketDepth++;
        else if (ch === "]")
            bracketDepth--;
        else if (ch === "{")
            braceDepth++;
        else if (ch === "}")
            braceDepth--;
        else if (ch === "," && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
            args.push(source.slice(start, i).trim());
            start = i + 1;
        }
    }
    args.push(source.slice(start).trim());
    return args;
}
function sampleResultType(glslType) {
    if (glslType.startsWith("isampler"))
        return "ivec4";
    if (glslType.startsWith("usampler"))
        return "uvec4";
    return "vec4";
}
function sampleCoordinateType(glslType) {
    return glslType.endsWith("2D") ? "vec2" : "vec3";
}
function helperName(group, argumentCount) {
    return `_hyd_texture_sampler_array_${group.elements[0].name.replace(/_0$/, "")}_${argumentCount}`;
}
function makeTextureHelper(group, argumentCount, stage) {
    const glslType = group.elements[0].glsl_type;
    const resultType = sampleResultType(glslType);
    const params = ["int index", `${sampleCoordinateType(glslType)} coord`];
    if (argumentCount === 3) {
        params.push("float bias");
    }
    const lines = [`${resultType} ${helperName(group, argumentCount)}(${params.join(", ")}) {`];
    for (let i = 0; i < group.elements.length; i++) {
        const element = group.elements[i];
        const combinedSampler = `${glslType}(${element.name}T, ${element.name}S)`;
        const sample = stage === "fragment"
            ? `texture(${combinedSampler}, coord${argumentCount === 3 ? ", bias" : ""})`
            : `textureLod(${combinedSampler}, coord, 0.0)`;
        if (i < group.elements.length - 1)
            lines.push(`  if (index == ${i}) return ${sample};`);
        else
            lines.push(`  return ${sample};`);
    }
    lines.push("}");
    return lines.join("\n");
}
function lowerDynamicSamplerArrayTextureCalls(source, samplers, stage = "fragment") {
    const groups = samplerGroups(samplers);
    if (groups.size === 0)
        return { source, helpers: [] };
    const helperKeys = new Map();
    let result = "";
    let cursor = 0;
    const callRegex = /\btexture\s*\(/g;
    for (let match = callRegex.exec(source); match !== null; match = callRegex.exec(source)) {
        const open = callRegex.lastIndex - 1;
        const close = shaderGlslSamplers_findMatchingParen(source, open);
        if (close < 0)
            break;
        const args = shaderGlslSamplers_splitTopLevelArguments(source.slice(open + 1, close));
        if (args.length < 2 || args.length > 3) {
            callRegex.lastIndex = close + 1;
            continue;
        }
        const arrayAccess = /^([A-Za-z_]\w*)\s*\[([\s\S]+)\]$/.exec(args[0]);
        const group = arrayAccess ? groups.get(arrayAccess[1]) : undefined;
        if (!group) {
            callRegex.lastIndex = close + 1;
            continue;
        }
        const indexExpression = arrayAccess[2].trim();
        const constantIndex = /^\d+$/.test(indexExpression) ? Number(indexExpression) : -1;
        let replacement;
        if (constantIndex >= 0 && constantIndex < group.elements.length) {
            const rewrittenArgs = args.slice();
            rewrittenArgs[0] = group.elements[constantIndex].name;
            replacement = `texture(${rewrittenArgs.join(", ")})`;
        }
        else {
            const key = `${group.name}:${args.length}`;
            helperKeys.set(key, { group, argumentCount: args.length });
            replacement = `${helperName(group, args.length)}(int(${indexExpression}), ${args.slice(1).join(", ")})`;
        }
        result += source.slice(cursor, match.index) + replacement;
        cursor = close + 1;
        callRegex.lastIndex = close + 1;
    }
    return {
        source: cursor === 0 ? source : result + source.slice(cursor),
        helpers: Array.from(helperKeys.values()).map(({ group, argumentCount }) => makeTextureHelper(group, argumentCount, stage)),
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
function compiledShaderSource(shader) {
    return shader.compiled_glsl_shader || shader.glsl_shader;
}
const GLOBAL_DECLARATION_REGEX = /\b(?:layout\s*\([^)]*\)\s*)?(?:invariant\s+)?(?:(?:lowp|mediump|highp)\s+)?((?:(?:flat|smooth|noperspective|centroid|sample)\s+)*)(attribute|uniform|varying|in|out)\s+(?:(?:lowp|mediump|highp)\s+)?([A-Za-z_]\w*)\s+([^;]+)\s*;/g;
const SPV_OP_NAME = 5;
const SPV_OP_TYPE_SAMPLED_IMAGE = 27;
const SPV_OP_TYPE_POINTER = 32;
const SPV_OP_FUNCTION_PARAMETER = 55;
const SPV_OP_VARIABLE = 59;
const SPV_OP_LOAD = 61;
const SPV_OP_DECORATE = 71;
const SPV_OP_MEMBER_DECORATE = 72;
const SPV_OP_IMAGE = 100;
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
function sourceNameReplace(source, from, to) {
    const parts = from.split(".");
    if (parts.length === 1) {
        if (/^[A-Za-z_]\w*$/.test(from))
            return shaderTranslator_wordBoundaryReplace(source, from, to);
        return source.replace(new RegExp(`(^|[^A-Za-z0-9_])${shaderTranslator_escapeRegExp(from)}(?=$|[^A-Za-z0-9_])`, "g"), (_match, prefix) => `${prefix}${to}`);
    }
    const pattern = parts
        .map((part) => shaderTranslator_escapeRegExp(part))
        .join("\\s*\\.\\s*");
    return source.replace(new RegExp(`\\b${pattern}\\b`, "g"), to);
}
function referencesIdentifier(source, name) {
    return new RegExp(`\\b${shaderTranslator_escapeRegExp(name)}\\b`).test(source);
}
function shaderTranslator_isTopLevelAt(source, index) {
    let braceDepth = 0;
    let parenDepth = 0;
    for (let i = 0; i < index; i++) {
        const ch = source[i];
        if (ch === "{") {
            braceDepth++;
        }
        else if (ch === "}") {
            braceDepth = Math.max(0, braceDepth - 1);
        }
        else if (ch === "(") {
            parenDepth++;
        }
        else if (ch === ")") {
            parenDepth = Math.max(0, parenDepth - 1);
        }
    }
    return braceDepth === 0 && parenDepth === 0;
}
function maskGlslComments(source) {
    const masked = source.split("");
    let lineComment = false;
    let blockComment = false;
    for (let index = 0; index < source.length; index++) {
        const ch = source[index];
        const next = source[index + 1];
        if (lineComment) {
            if (ch === "\n") {
                lineComment = false;
            }
            else {
                masked[index] = " ";
            }
            continue;
        }
        if (blockComment) {
            if (ch === "*" && next === "/") {
                masked[index] = " ";
                masked[index + 1] = " ";
                blockComment = false;
                index++;
            }
            else if (ch !== "\n") {
                masked[index] = " ";
            }
            continue;
        }
        if (ch === "/" && next === "/") {
            masked[index] = " ";
            masked[index + 1] = " ";
            lineComment = true;
            index++;
        }
        else if (ch === "/" && next === "*") {
            masked[index] = " ";
            masked[index + 1] = " ";
            blockComment = true;
            index++;
        }
    }
    return masked.join("");
}
function replaceTopLevelGlobalDeclarations(source, replacement) {
    const masked = maskGlslComments(source);
    const regex = new RegExp(GLOBAL_DECLARATION_REGEX.source, GLOBAL_DECLARATION_REGEX.flags);
    let result = "";
    let cursor = 0;
    for (let match = regex.exec(masked); match !== null; match = regex.exec(masked)) {
        if (!shaderTranslator_isTopLevelAt(masked, match.index))
            continue;
        result += source.slice(cursor, match.index);
        result += replacement(source.slice(match.index, regex.lastIndex), match[1], match[2], match[3], match[4], match.index);
        cursor = regex.lastIndex;
    }
    return result + source.slice(cursor);
}
function normalizeUnsupportedInvariantPragmas(source) {
    return source
        .replace(/^\s*#\s*pragma\b[^\r\n]*$/gmi, "")
        .replace(/^\s*invariant\s+[A-Za-z_]\w*\s*;\s*$/gmi, "");
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
        const groupUsed = sampler.array_name && metadata.samplers.some((item) => item.array_name === sampler.array_name &&
            (referencesIdentifier(wgsl, `${item.name}S`) || referencesIdentifier(wgsl, `${item.name}T`)));
        const keep = groupUsed || referencesIdentifier(wgsl, `${sampler.name}S`) || referencesIdentifier(wgsl, `${sampler.name}T`);
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
function shaderTranslator_attributeLocationSpan(item) {
    const matrix = /^mat([2-4])(?:x[2-4])?$/.exec(item.glsl_type);
    const elementSpan = matrix ? Number(matrix[1]) : 1;
    return elementSpan * (item.is_array ? Math.max(1, item.size || 1) : 1);
}
function assignLocations(items, boundLocations = new Map(), locationSpan = () => 1) {
    const locations = new Map();
    const usedLocations = new Set();
    for (const item of items) {
        const boundLocation = boundLocations.get(item.source_name || item.name) ?? boundLocations.get(item.name);
        if (boundLocation !== undefined && !locations.has(item.name)) {
            locations.set(item.name, boundLocation);
            for (let offset = 0; offset < locationSpan(item); offset++) {
                usedLocations.add(boundLocation + offset);
            }
        }
    }
    let nextLocation = 0;
    for (const item of items) {
        if (locations.has(item.name))
            continue;
        const span = locationSpan(item);
        while (Array.from({ length: span }, (_, offset) => nextLocation + offset).some((location) => usedLocations.has(location))) {
            nextLocation++;
        }
        locations.set(item.name, nextLocation);
        for (let offset = 0; offset < span; offset++) {
            usedLocations.add(nextLocation + offset);
        }
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
    let body = stripGlslVersionDirectives(source);
    body = body.replace(/^\s*(#extension[^\n]*|precision\s+(?:lowp|mediump|highp)\s+\w+\s*;)\s*$/gm, (line) => {
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
    body = replaceTopLevelGlobalDeclarations(body, (_full, interpolation, qualifier, glslType, rawNames) => {
        for (const parsed of parseDeclarationNames(rawNames)) {
            declarations.push({
                qualifier,
                interpolation: interpolation.trim(),
                glslType,
                name: parsed.name,
                arraySuffix: parsed.arraySuffix,
            });
        }
        return "";
    });
    return {
        declarations,
        source: `${preamble.join("\n")}\n`,
    };
}
function normalizeLegacyFragmentBuiltins(source) {
    let out = source;
    const usesFragColor = /\bgl_FragColor\b|\bgl_FragData\s*\[\s*0\s*\]/.test(out);
    out = shaderTranslator_wordBoundaryReplace(out, "gl_FragColor", "_hyd_fragColor");
    out = out.replace(/\bgl_FragData\s*\[\s*0\s*\]/g, "_hyd_fragColor");
    out = shaderTranslator_wordBoundaryReplace(out, "texture2D", "texture");
    out = shaderTranslator_wordBoundaryReplace(out, "textureCube", "texture");
    out = shaderTranslator_wordBoundaryReplace(out, "texture2DProj", "textureProj");
    out = shaderTranslator_wordBoundaryReplace(out, "texture2DProjLod", "textureProjLod");
    out = shaderTranslator_wordBoundaryReplace(out, "texture2DProjLodEXT", "textureProjLod");
    out = shaderTranslator_wordBoundaryReplace(out, "texture2DLod", "textureLod");
    out = shaderTranslator_wordBoundaryReplace(out, "texture2DLodEXT", "textureLod");
    out = shaderTranslator_wordBoundaryReplace(out, "textureCubeLod", "textureLod");
    out = shaderTranslator_wordBoundaryReplace(out, "textureCubeLodEXT", "textureLod");
    return { source: out, usesFragColor };
}
function normalizeWebGlBuiltinsForVulkanGlsl(source, webglVersion = 1) {
    let out = source;
    out = shaderTranslator_wordBoundaryReplace(out, "gl_VertexID", "gl_VertexIndex");
    out = shaderTranslator_wordBoundaryReplace(out, "gl_InstanceID", "gl_InstanceIndex");
    if (webglVersion === 1) {
        out = normalizeWebGl1BuiltinLimits(out);
        out = shaderTranslator_wordBoundaryReplace(out, "__VERSION__", "100");
    }
    out = out.replace(/\b1(?:\.0)?\s*\/\s*0(?:\.0)?\b/g, "3.4028234663852886e38");
    out = out.replace(/-\s*3\.4028234663852886e38/g, "-3.4028234663852886e38");
    return clampOutOfRangeFloatLiterals(out);
}
function clampOutOfRangeFloatLiterals(source) {
    const masked = maskGlslComments(source);
    const regex = /(?<![A-Za-z0-9_.])(?:\d+\.\d*|\.\d+|\d+[eE][+\-]?\d+)(?:[eE][+\-]?\d+)?(?![A-Za-z0-9_.])/g;
    let result = "";
    let cursor = 0;
    for (let match = regex.exec(masked); match !== null; match = regex.exec(masked)) {
        const value = Number(match[0]);
        if (Number.isFinite(value) && value <= 3.4028234663852886e38)
            continue;
        result += source.slice(cursor, match.index);
        result += "3.4028234663852886e38";
        cursor = regex.lastIndex;
    }
    return cursor === 0 ? source : result + source.slice(cursor);
}
function demoteConstDeclarationsForVulkanGlsl(source) {
    return source.replace(/\bconst\s+((?:(?:lowp|mediump|highp)\s+)?[A-Za-z_]\w*\s+)([A-Za-z_]\w*)\s*=\s*([^;]+);/g, (full, typeAndSpacing, name, initializer) => {
        const requiresConstant = new RegExp(`\\[\\s*${shaderTranslator_escapeRegExp(name)}\\s*\\]`).test(source) ||
            new RegExp(`\\bcase\\s+${shaderTranslator_escapeRegExp(name)}\\s*:`).test(source);
        return requiresConstant ? full : `${typeAndSpacing}${name} = ${initializer};`;
    });
}
function ensureVertexPositionBuiltin(source) {
    const withoutComments = source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
    if (/\bgl_Position\b/.test(withoutComments))
        return source;
    return source.replace(/\bvoid\s+main\s*\(\s*(?:void\s*)?\)\s*\{/, (signature) => `${signature}\n  gl_Position = vec4(0.0);`);
}
function normalizeWebGlFragCoord(source, metadata) {
    if (!metadata.uniforms.some((uniform) => uniform.name === FRAG_COORD_HEIGHT_UNIFORM_NAME)) {
        return source;
    }
    const invariantStatements = [];
    let body = source.replace(/\binvariant\s+gl_FragCoord\s*;/g, (statement) => {
        const placeholder = `__HYD_FRAG_COORD_INVARIANT_${invariantStatements.length}__`;
        invariantStatements.push(statement);
        return placeholder;
    });
    body = shaderTranslator_wordBoundaryReplace(body, "gl_FragCoord", "_hydWebGlFragCoord()");
    invariantStatements.forEach((statement, index) => {
        body = shaderTranslator_wordBoundaryReplace(body, `__HYD_FRAG_COORD_INVARIANT_${index}__`, statement);
    });
    return `
vec4 _hydWebGlFragCoord() {
  return vec4(
      gl_FragCoord.x,
      ${FRAG_COORD_HEIGHT_UNIFORM_NAME} - gl_FragCoord.y,
      gl_FragCoord.z,
      gl_FragCoord.w);
}

${body}`;
}
function normalizeWebGlPointCoord(source) {
    if (!/\bgl_PointCoord\b/.test(maskGlslComments(source)))
        return source;
    const body = shaderTranslator_wordBoundaryReplace(source, "gl_PointCoord", "_hydWebGlPointCoord()");
    return `
vec2 _hydWebGlPointCoord() {
  return vec2(0.5, 0.5);
}

${body}`;
}
function makeSamplerBindingDeclarations(metadata, layout) {
    const lines = [];
    metadata.samplers.forEach((sampler, fallback) => {
        const binding = layout.samplerBindings.get(sampler.name);
        const textureType = samplerGlslTextureType(sampler.glsl_type);
        const baseBinding = binding === undefined ? fallback * 2 : binding;
        lines.push(`layout(set = 0, binding = ${baseBinding}) uniform highp sampler ${sampler.name}S;`);
        lines.push(`layout(set = 0, binding = ${baseBinding + 1}) uniform ${textureType} ${sampler.name}T;`);
    });
    return lines;
}
function makeUniformBlockDeclarations(metadata, declarations) {
    if (metadata.uniforms.length === 0) {
        return [];
    }
    const lines = ["layout(std140, set = 0, binding = 0) uniform HydUniformObject {"];
    for (const uniform of metadata.uniforms) {
        const matrixArrayStorage = matrixArrayStorageDeclaration(uniform);
        const arraySuffix = uniform.is_array
            ? `[${Math.max(1, uniform.size || 1)}]`
            : declarationArraySuffix(declarations, uniform.name);
        lines.push(`  ${matrixArrayStorage || `${uniform.glsl_type} ${uniform.name}${arraySuffix};`}`);
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
        case "isampler2D":
            return "itexture2D";
        case "isamplerCube":
            return "itextureCube";
        case "isampler2DArray":
            return "itexture2DArray";
        case "isampler3D":
            return "itexture3D";
        case "usampler2D":
            return "utexture2D";
        case "usamplerCube":
            return "utextureCube";
        case "usampler2DArray":
            return "utexture2DArray";
        case "usampler3D":
            return "utexture3D";
        default:
            throw new Error(`unsupported sampler type: ${glslType}`);
    }
}
function addSamplerPrecisionDeclarations(lines, metadata) {
    const seen = new Set();
    for (const sampler of metadata.samplers) {
        const separateSamplerPrecision = "precision highp sampler;";
        const samplerPrecision = `precision highp ${sampler.glsl_type};`;
        if (!seen.has(separateSamplerPrecision)) {
            seen.add(separateSamplerPrecision);
            lines.push(separateSamplerPrecision);
        }
        if (!seen.has(samplerPrecision)) {
            seen.add(samplerPrecision);
            lines.push(samplerPrecision);
        }
    }
}
function rewriteMetadataSourceNames(source, metadata, varyings = []) {
    let out = source;
    for (const value of [...metadata.attributes, ...metadata.uniforms, ...varyings]) {
        if (value.source_name && value.source_name !== value.name) {
            if (/^[A-Za-z_]\w*$/.test(value.source_name))
                continue;
            out = sourceNameReplace(out, value.source_name, value.name);
        }
    }
    for (const sampler of metadata.samplers) {
        if (sampler.source_name && sampler.source_name !== sampler.name) {
            if (/^[A-Za-z_]\w*$/.test(sampler.source_name))
                continue;
            out = sourceNameReplace(out, sampler.source_name, sampler.name);
        }
    }
    return out;
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
    const match = normalized.match(/^([iu]?sampler(?:2D|Cube|2DArray|3D))\s+([A-Za-z_]\w*)\s*(?:\[[^\]]*\])?$/);
    return match ? { glslType: match[1], name: match[2] } : null;
}
function expandSamplerArgument(expr) {
    const trimmed = expr.trim();
    const constructor = trimmed.match(/^[iu]?sampler(?:2D|Cube|2DArray|3D)\s*\(([\s\S]*)\)$/);
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
        if (args.length >= 2 && /^[iu]?sampler(?:2D|Cube|2DArray|3D)\s*\(/.test(args[0].trim())) {
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
    const patchedImageLoads = new Set();
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
            patchedImageLoads.add(patched[offset + 2]);
        }
    }
    const replacements = new Map();
    const removedOffsets = new Set();
    for (const offset of offsets) {
        const op = patched[offset] & 0xffff;
        if (op !== SPV_OP_IMAGE) {
            continue;
        }
        const sampledImageId = patched[offset + 3];
        if (patchedImageLoads.has(sampledImageId)) {
            replacements.set(patched[offset + 2], sampledImageId);
            removedOffsets.add(offset);
        }
    }
    if (replacements.size === 0) {
        return patched;
    }
    const finalWords = Array.from(patched.slice(0, 5));
    for (const offset of offsets) {
        if (removedOffsets.has(offset)) {
            continue;
        }
        const wordCount = patched[offset] >>> 16;
        finalWords.push(patched[offset]);
        for (let i = 1; i < wordCount; i++) {
            finalWords.push(replacements.get(patched[offset + i]) || patched[offset + i]);
        }
    }
    return new Uint32Array(finalWords);
}
function buildGlslangSource(source, stage, metadata, layout, options = {}) {
    const anonymousStructSource = normalizeAnonymousUniformStructs(source);
    const structUniformPlan = planValueStructUniforms(anonymousStructSource);
    const invariantNormalizedSource = normalizeUnsupportedInvariantPragmas(maskStaticallyInactivePreprocessorBranches(anonymousStructSource, options.webglVersion || 1));
    const lineNormalizedSource = materializeWebGlLineMacros(invariantNormalizedSource);
    const bridgeSource = options.webglVersion === 2
        ? lineNormalizedSource
        : bridgeGlslEs100Identifiers(lineNormalizedSource);
    const prepared = prepareSourceAndDeclarations(bridgeSource);
    const lines = [prepared.source.trimEnd()];
    const declarations = prepared.declarations;
    const sourceWithoutPreamble = stripGlslVersionDirectives(bridgeSource)
        .replace(/^\s*(#extension[^\n]*|precision\s+(?:lowp|mediump|highp)\s+\w+\s*;)\s*$/gm, "");
    const bodyStart = replaceTopLevelGlobalDeclarations(sourceWithoutPreamble, () => "");
    let body = stripProvablyEmptyTopLevelMacroInvocations(bodyStart);
    addSamplerPrecisionDeclarations(lines, metadata);
    if (stage === "vertex") {
        for (const attribute of metadata.attributes) {
            const location = layout.attributeLocations.get(attribute.name);
            lines.push(`layout(location = ${location === undefined ? 0 : location}) in ${attribute.glsl_type} ${attribute.name};`);
        }
    }
    const stageVaryings = uniqueByName(scanGlslDeclarations(source, stage, {
        includeUnusedVaryings: stage === "vertex",
    }).varyings.filter((varying) => layout.varyingLocations.has(varying.name)));
    for (const varying of stageVaryings) {
        const location = layout.varyingLocations.get(varying.name);
        const direction = stage === "vertex" ? "out" : "in";
        const interpolation = varying.interpolation ? `${varying.interpolation} ` : "";
        lines.push(`layout(location = ${location === undefined ? 0 : location}) ${interpolation}${direction} ${varying.glsl_type} ${varying.name}${declarationArraySuffix(declarations, varying.name)};`);
    }
    let fragmentOutputLocation = 0;
    for (const declaration of declarations) {
        if (isFragmentOutput(declaration, stage)) {
            lines.push(`layout(location = ${fragmentOutputLocation++}) out ${declaration.glslType} ${declaration.name}${declaration.arraySuffix};`);
        }
    }
    body = renameUserDefinedFunctions(body);
    const normalized = normalizeLegacyFragmentBuiltins(body);
    normalized.source = lowerSamplerStructFunctionParameters(normalized.source, metadata.samplers);
    const samplerArrayLowering = lowerDynamicSamplerArrayTextureCalls(normalized.source, metadata.samplers, stage);
    normalized.source = samplerArrayLowering.source;
    normalized.source = normalizeWebGlBuiltinsForVulkanGlsl(normalized.source, options.webglVersion);
    normalized.source = normalizeWebGlDepthRange(normalized.source);
    if (stage === "vertex") {
        normalized.source = lowerWebGlPointSizeToPrivateState(normalized.source);
        normalized.source = ensureVertexPositionBuiltin(normalized.source);
        normalized.source = wrapVertexMainForWebGpuClipSpace(normalized.source);
    }
    else {
        normalized.source = normalizeWebGlFragCoord(normalized.source, metadata);
        normalized.source = normalizeWebGlPointCoord(normalized.source);
    }
    normalized.source = rewriteMetadataSourceNames(normalized.source, metadata, stageVaryings);
    normalized.source = rewriteStructUniformAggregateReads(normalized.source, structUniformPlan);
    body = lowerSamplerFunctionParameters(normalized.source);
    body = rewriteSamplerExpressions(body, metadata);
    body = rewriteMatrixArrayUniformReads(body, metadata.uniforms);
    if (options.webglVersion !== 2) {
        body = normalizeEs100SequenceArrayDimensions(body);
        body = lowerEs100GlobalInitializers(body);
    }
    if (stage === "fragment" && options.preserveImplicitTextureLod === false) {
        body = rewriteFragmentImplicitTextureLod(body);
    }
    if (stage === "fragment" && normalized.usesFragColor) {
        lines.push("layout(location = 0) out vec4 _hyd_fragColor;");
    }
    lines.push(...makeUniformBlockDeclarations(metadata, declarations));
    lines.push(...makeSamplerBindingDeclarations(metadata, layout));
    lines.push(...makeMatrixArrayLoaders(metadata.uniforms));
    lines.push(...samplerArrayLowering.helpers);
    lines.push("");
    const leadingLineBreaks = (body.match(/^[\t \r\n]*/)?.[0].match(/\n/g) || []).length;
    lines.push(`#line ${leadingLineBreaks + 1}`);
    lines.push(body.trim());
    return `${lines.filter((line) => line.length > 0).join("\n")}\n`;
}
function stripResourceDeclarations(wgsl) {
    return wgsl
        .replace(/^\s*@group\([^)]*\)\s*@binding\([^)]*\)\s*var(?:<[^>]+>)?\s+\w+\s*:\s*[^;]+;\s*$/gm, "")
        .replace(/^\s*@binding\([^)]*\)\s*@group\([^)]*\)\s*var(?:<[^>]+>)?\s+\w+\s*:\s*[^;]+;\s*$/gm, "")
        .replace(/^\s*struct\s+\w*Uniform\w*\s*\{[\s\S]*?^\s*\}\s*;?\s*$/gm, "");
}
function uniformReadExpression(uniform) {
    return `_hyd_uniforms_.${uniform.name}`;
}
function normalizeTintWgsl(wgsl, metadata) {
    const uniformVariableNames = wgslUniformVariableNames(wgsl);
    wgsl = synchronizeTintUniformTypes(wgsl, metadata);
    let out = stripResourceDeclarations(wgsl);
    out = renameReservedWgslIdentifiers(out);
    const uniformPlaceholders = [];
    for (const uniform of metadata.uniforms) {
        const placeholder = `__HYD_UNIFORM_${uniformPlaceholders.length}__`;
        uniformPlaceholders.push([placeholder, uniformReadExpression(uniform)]);
        out = replaceWgslMemberAccess(out, uniformVariableNames, uniform.name, placeholder);
        out = replaceBareWgslIdentifier(out, uniform.name, placeholder);
    }
    for (const sampler of metadata.samplers) {
        out = out.replace(new RegExp(`textureSample\\s*\\(\\s*${sampler.name}\\s*,`, "g"), `textureSample(${sampler.name}T, ${sampler.name}S,`);
        out = shaderTranslator_wordBoundaryReplace(out, `${sampler.name}_sampler`, `${sampler.name}S`);
        out = shaderTranslator_wordBoundaryReplace(out, `${sampler.name}_texture`, `${sampler.name}T`);
    }
    for (const [placeholder, value] of uniformPlaceholders) {
        out = shaderTranslator_wordBoundaryReplace(out, placeholder, value);
    }
    return normalizeSamplerOriginCoordinates(out.trim() + "\n", metadata);
}
const WGSL_TEXTURE_SAMPLE_CALL = /\b(textureSample(?:Level|Bias|Grad)?)\s*\(/g;
function addSamplerOriginHelper(wgsl) {
    if (wgsl.includes("fn _hyd_samplerOriginCoord")) {
        return wgsl;
    }
    const helper = `fn _hyd_samplerOriginCoord(texCoord: vec2<f32>, flipY: f32) -> vec2<f32> {\n    return vec2<f32>(texCoord.x, select(texCoord.y, 1.0 - texCoord.y, flipY > 0.5));\n}\n\n`;
    const directivePrefix = wgsl.match(/^\s*(?:(?:(?:enable|requires)\s+[^;]+;|diagnostic\s*\([^;]+\)\s*;)\s*)+/);
    const insertion = directivePrefix ? directivePrefix[0].length : 0;
    return wgsl.slice(0, insertion) + helper + wgsl.slice(insertion);
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
        return shader.shader_info || makeShaderMetadata(compiledShaderSource(shader), shader.type);
    }
    makeLayout(vertexShader, fragmentShader, boundAttributeLocations = new Map()) {
        const vertexMetadata = vertexShader ? this.metadataFor(vertexShader) : undefined;
        const fragmentMetadata = fragmentShader ? this.metadataFor(fragmentShader) : undefined;
        const vertexVaryings = vertexShader ? scanGlslDeclarations(compiledShaderSource(vertexShader), "vertex").varyings : [];
        const fragmentVaryings = fragmentShader ? scanGlslDeclarations(compiledShaderSource(fragmentShader), "fragment").varyings : [];
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
        const attributeLocations = assignLocations(vertexMetadata ? vertexMetadata.attributes : [], boundAttributeLocations, shaderTranslator_attributeLocationSpan);
        const varyingLocations = assignLocations(uniqueByName([...vertexVaryings, ...fragmentVaryings]), new Map(), shaderTranslator_attributeLocationSpan);
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
        const key = compiledShaderSource(shader);
        const preserveImplicitTextureLod = this.options.preserveImplicitTextureLod !== false;
        const shouldOptimizeTintWgsl = this.options.optimizeTintWgsl !== false;
        const webglVersion = shader.webglVersion || 1;
        const runtimeKey = [
            stage,
            layout.cacheKey,
            `lod=${preserveImplicitTextureLod ? 1 : 0}`,
            `opt=${shouldOptimizeTintWgsl ? 1 : 0}`,
            `legacyTexCoord=${this.options.legacyTextureCoordinateFixups ? 1 : 0}`,
            `webgl=${webglVersion}`,
            key,
        ].join(":");
        const cachedRuntime = this.runtimeCache.get(runtimeKey);
        if (cachedRuntime) {
            return cachedRuntime;
        }
        const metadata = makeShaderMetadata(key, shader.type);
        if (!this.runtimeTranslationAvailable) {
            throw new Error(`Runtime shader translator is unavailable (${stage}).`);
        }
        let glslangSource = "";
        const timingsMs = {};
        const compatibilityFallbacks = [];
        try {
            const buildStart = nowMs();
            glslangSource = buildGlslangSource(key, stage, metadata, layout, {
                preserveImplicitTextureLod,
                webglVersion,
            });
            timingsMs.glslPreprocess = nowMs() - buildStart;
            const compileStart = nowMs();
            let spirvWords;
            try {
                spirvWords = this.glslang.compileGLSL(glslangSource, stage, false);
            }
            catch (error) {
                const relaxedConstSource = demoteConstDeclarationsForVulkanGlsl(glslangSource);
                if (relaxedConstSource === glslangSource)
                    throw error;
                spirvWords = this.glslang.compileGLSL(relaxedConstSource, stage, false);
                glslangSource = relaxedConstSource;
                compatibilityFallbacks.push("demote-es100-const-initializers");
            }
            const spirv = patchGlslangSampledTextureVariables(spirvWords, metadata.samplers);
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
                foldedOutputStores: 0,
                collapsedOutputStructs: 0,
                removedTemporaries: 0,
                foldedConstructors: 0,
                splitDeepExpressions: 0,
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
                metadata.wgsl = normalizeWebGlTextureCoordinates(wgsl, metadata, stage, key);
                timingsMs.legacyTextureCoordinateFixups = nowMs() - legacyFixupStart;
            }
            else {
                metadata.wgsl = wgsl;
            }
            const resourcePrune = pruneUnusedShaderResources(metadata, metadata.wgsl);
            const shaderId = `${stage}:${stableHashString(key)}:${layout.cacheKey}`;
            const capture = {
                kind: "shader-stage",
                stage,
                shaderId,
                source: "runtime",
                optimizer: optimizerStats,
                timingsMs,
                compatibilityFallbacks,
                glsl: sourceCapture(key),
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
                compatibilityFallbacks,
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
            throw new Error(`Runtime shader translation failed for ${stage} shader: ${message}\n--- original GLSL ---\n${key}\n--- normalized GLSL ---\n${glslangSource}`);
        }
    }
}

;// ./src/webgl-static.ts




const hydWebGLTypes = ["experimental-webgl", "webgl", "webgl2"];
const webgl_static_NATIVE_CANVAS_GET_CONTEXT = HTMLCanvasElement.prototype.getContext;
const nativeEnumerableApiNames = new Map();
function getNativeEnumerableApiNames(contextType) {
    const normalizedType = contextType === "webgl2" ? "webgl2" : "webgl";
    const cached = nativeEnumerableApiNames.get(normalizedType);
    if (cached)
        return cached;
    const names = new Set(["canvas"]);
    const canvas = document.createElement("canvas");
    const context = (webgl_static_NATIVE_CANVAS_GET_CONTEXT.call(canvas, normalizedType, { antialias: false }) ||
        (normalizedType === "webgl"
            ? webgl_static_NATIVE_CANVAS_GET_CONTEXT.call(canvas, "experimental-webgl", { antialias: false })
            : null));
    if (context) {
        for (const name in context)
            names.add(name);
        context.getExtension("WEBGL_lose_context")?.loseContext();
    }
    nativeEnumerableApiNames.set(normalizedType, names);
    return names;
}
const requiredObject = (brand) => ({ brand, nullable: false });
const nullableObject = (brand) => ({ brand, nullable: true });
const WEBGL_METHOD_ARGUMENTS = {
    attachShader: [requiredObject("program"), requiredObject("shader")],
    bindAttribLocation: [requiredObject("program"), "u32", "string"],
    bindBuffer: ["u32", nullableObject("buffer")],
    bindFramebuffer: ["u32", nullableObject("framebuffer")],
    bindRenderbuffer: ["u32", nullableObject("renderbuffer")],
    bindTexture: ["u32", nullableObject("texture")],
    blendColor: ["f32", "f32", "f32", "f32"],
    bufferSubData: ["u32", "i32"],
    clear: ["u32"],
    clearColor: ["f32", "f32", "f32", "f32"],
    clearDepth: ["f32"],
    clearStencil: ["i32"],
    compileShader: [requiredObject("shader")],
    copyTexImage2D: ["u32", "i32", "u32", "i32", "i32", "i32", "i32", "i32"],
    copyTexSubImage2D: ["u32", "i32", "i32", "i32", "i32", "i32", "i32", "i32"],
    deleteBuffer: [nullableObject("buffer")],
    deleteFramebuffer: [nullableObject("framebuffer")],
    deleteProgram: [nullableObject("program")],
    deleteRenderbuffer: [nullableObject("renderbuffer")],
    deleteShader: [nullableObject("shader")],
    deleteTexture: [nullableObject("texture")],
    depthMask: ["bool"],
    depthRange: ["f32", "f32"],
    detachShader: [requiredObject("program"), requiredObject("shader")],
    disableVertexAttribArray: ["u32"],
    drawArrays: ["u32", "i32", "i32"],
    enableVertexAttribArray: ["u32"],
    framebufferRenderbuffer: ["u32", "u32", "u32", nullableObject("renderbuffer")],
    framebufferTexture2D: ["u32", "u32", "u32", nullableObject("texture"), "i32"],
    getActiveAttrib: [requiredObject("program"), "u32"],
    getActiveUniform: [requiredObject("program"), "u32"],
    getAttachedShaders: [requiredObject("program")],
    getAttribLocation: [requiredObject("program"), "string"],
    getParameter: ["u32"],
    getProgramInfoLog: [requiredObject("program")],
    getProgramParameter: [requiredObject("program"), "u32"],
    getShaderInfoLog: [requiredObject("shader")],
    getShaderParameter: [requiredObject("shader"), "u32"],
    getShaderSource: [requiredObject("shader")],
    getUniform: [requiredObject("program"), requiredObject("uniform-location")],
    getUniformLocation: [requiredObject("program"), "string"],
    isBuffer: [nullableObject("buffer")],
    isFramebuffer: [nullableObject("framebuffer")],
    isProgram: [nullableObject("program")],
    isRenderbuffer: [nullableObject("renderbuffer")],
    isShader: [nullableObject("shader")],
    isTexture: [nullableObject("texture")],
    isVertexArray: [nullableObject("vertex-array")],
    lineWidth: ["f32"],
    linkProgram: [requiredObject("program")],
    polygonOffset: ["f32", "f32"],
    sampleCoverage: ["f32", "bool"],
    scissor: ["i32", "i32", "i32", "i32"],
    shaderSource: [requiredObject("shader"), "string"],
    stencilFunc: ["u32", "i32", "u32"],
    stencilMask: ["u32"],
    uniform1f: [nullableObject("uniform-location"), "f32"],
    uniform1fv: [nullableObject("uniform-location")],
    uniform1i: [nullableObject("uniform-location"), "i32"],
    uniform1iv: [nullableObject("uniform-location")],
    uniform1ui: [nullableObject("uniform-location"), "u32"],
    uniform1uiv: [nullableObject("uniform-location")],
    uniform2f: [nullableObject("uniform-location"), "f32", "f32"],
    uniform2fv: [nullableObject("uniform-location")],
    uniform2i: [nullableObject("uniform-location"), "i32", "i32"],
    uniform2iv: [nullableObject("uniform-location")],
    uniform2ui: [nullableObject("uniform-location"), "u32", "u32"],
    uniform2uiv: [nullableObject("uniform-location")],
    uniform3f: [nullableObject("uniform-location"), "f32", "f32", "f32"],
    uniform3fv: [nullableObject("uniform-location")],
    uniform3i: [nullableObject("uniform-location"), "i32", "i32", "i32"],
    uniform3iv: [nullableObject("uniform-location")],
    uniform3ui: [nullableObject("uniform-location"), "u32", "u32", "u32"],
    uniform3uiv: [nullableObject("uniform-location")],
    uniform4f: [nullableObject("uniform-location"), "f32", "f32", "f32", "f32"],
    uniform4fv: [nullableObject("uniform-location")],
    uniform4i: [nullableObject("uniform-location"), "i32", "i32", "i32", "i32"],
    uniform4iv: [nullableObject("uniform-location")],
    uniform4ui: [nullableObject("uniform-location"), "u32", "u32", "u32", "u32"],
    uniform4uiv: [nullableObject("uniform-location")],
    uniformMatrix2fv: [nullableObject("uniform-location"), "bool"],
    uniformMatrix3fv: [nullableObject("uniform-location"), "bool"],
    uniformMatrix4fv: [nullableObject("uniform-location"), "bool"],
    useProgram: [nullableObject("program")],
};
function convertWebIdlArgument(method, index, value, argument) {
    if (typeof argument === "object") {
        if (value === null || value === undefined) {
            if (argument.nullable)
                return null;
            throw new TypeError(`${method} argument ${index + 1} is not nullable`);
        }
        if (typeof value !== "object" || value[HYD_WEBGL_OBJECT_BRAND] !== argument.brand) {
            throw new TypeError(`${method} argument ${index + 1} is not a WebGL ${argument.brand}`);
        }
        return value;
    }
    switch (argument) {
        case "bool": return Boolean(value);
        case "f32": return Math.fround(Number(value));
        case "i32": return Number(value) >> 0;
        case "u32": return Number(value) >>> 0;
        case "string": return String(value);
    }
}
function convertWebIdlArguments(method, values) {
    const signature = WEBGL_METHOD_ARGUMENTS[method];
    if (!signature)
        return values;
    const converted = values.slice();
    for (let index = 0; index < signature.length; index++) {
        converted[index] = convertWebIdlArgument(method, index, values[index], signature[index]);
    }
    return converted;
}
const identityWebIdlArgument = (value) => value;
function createWebIdlConverter(method, index, argument) {
    if (typeof argument === "object") {
        if (argument.nullable) {
            return (value) => {
                if (value === null || value === undefined)
                    return null;
                if (typeof value !== "object" || value[HYD_WEBGL_OBJECT_BRAND] !== argument.brand) {
                    throw new TypeError(`${method} argument ${index + 1} is not a WebGL ${argument.brand}`);
                }
                return value;
            };
        }
        return (value) => {
            if (value === null || value === undefined) {
                throw new TypeError(`${method} argument ${index + 1} is not nullable`);
            }
            if (typeof value !== "object" || value[HYD_WEBGL_OBJECT_BRAND] !== argument.brand) {
                throw new TypeError(`${method} argument ${index + 1} is not a WebGL ${argument.brand}`);
            }
            return value;
        };
    }
    switch (argument) {
        case "bool": return Boolean;
        case "f32": return (value) => Math.fround(Number(value));
        case "i32": return (value) => Number(value) >> 0;
        case "u32": return (value) => Number(value) >>> 0;
        case "string": return String;
    }
}
function createFacadeMethod(facade, context, property, method) {
    const signature = WEBGL_METHOD_ARGUMENTS[property];
    const header = Function.prototype.toString.call(method).split("{", 1)[0];
    const needsVariableArguments = header.includes("...") || header.includes("=");
    const arity = Math.max(method.length, signature?.length || 0);
    const invoke = method.bind(context);
    if (!needsVariableArguments && arity <= 10) {
        if (!signature) {
            switch (arity) {
                case 0: return function () { if (this !== facade && this !== context)
                    throw new TypeError("Illegal invocation"); return invoke(); };
                case 1: return function (a0) { if (this !== facade && this !== context)
                    throw new TypeError("Illegal invocation"); return invoke(a0); };
                case 2: return function (a0, a1) { if (this !== facade && this !== context)
                    throw new TypeError("Illegal invocation"); return invoke(a0, a1); };
                case 3: return function (a0, a1, a2) { if (this !== facade && this !== context)
                    throw new TypeError("Illegal invocation"); return invoke(a0, a1, a2); };
                case 4: return function (a0, a1, a2, a3) { if (this !== facade && this !== context)
                    throw new TypeError("Illegal invocation"); return invoke(a0, a1, a2, a3); };
                case 5: return function (a0, a1, a2, a3, a4) { if (this !== facade && this !== context)
                    throw new TypeError("Illegal invocation"); return invoke(a0, a1, a2, a3, a4); };
                case 6: return function (a0, a1, a2, a3, a4, a5) { if (this !== facade && this !== context)
                    throw new TypeError("Illegal invocation"); return invoke(a0, a1, a2, a3, a4, a5); };
                case 7: return function (a0, a1, a2, a3, a4, a5, a6) { if (this !== facade && this !== context)
                    throw new TypeError("Illegal invocation"); return invoke(a0, a1, a2, a3, a4, a5, a6); };
                case 8: return function (a0, a1, a2, a3, a4, a5, a6, a7) { if (this !== facade && this !== context)
                    throw new TypeError("Illegal invocation"); return invoke(a0, a1, a2, a3, a4, a5, a6, a7); };
                case 9: return function (a0, a1, a2, a3, a4, a5, a6, a7, a8) { if (this !== facade && this !== context)
                    throw new TypeError("Illegal invocation"); return invoke(a0, a1, a2, a3, a4, a5, a6, a7, a8); };
                case 10: return function (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) { if (this !== facade && this !== context)
                    throw new TypeError("Illegal invocation"); return invoke(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9); };
            }
        }
        const converters = Array.from({ length: arity }, (_, index) => index < signature.length
            ? createWebIdlConverter(property, index, signature[index])
            : identityWebIdlArgument);
        const [c0, c1, c2, c3, c4, c5, c6, c7, c8, c9] = converters;
        switch (arity) {
            case 0: return function () { if (this !== facade && this !== context)
                throw new TypeError("Illegal invocation"); return invoke(); };
            case 1: return function (a0) { if (this !== facade && this !== context)
                throw new TypeError("Illegal invocation"); return invoke(c0(a0)); };
            case 2: return function (a0, a1) { if (this !== facade && this !== context)
                throw new TypeError("Illegal invocation"); return invoke(c0(a0), c1(a1)); };
            case 3: return function (a0, a1, a2) { if (this !== facade && this !== context)
                throw new TypeError("Illegal invocation"); return invoke(c0(a0), c1(a1), c2(a2)); };
            case 4: return function (a0, a1, a2, a3) { if (this !== facade && this !== context)
                throw new TypeError("Illegal invocation"); return invoke(c0(a0), c1(a1), c2(a2), c3(a3)); };
            case 5: return function (a0, a1, a2, a3, a4) { if (this !== facade && this !== context)
                throw new TypeError("Illegal invocation"); return invoke(c0(a0), c1(a1), c2(a2), c3(a3), c4(a4)); };
            case 6: return function (a0, a1, a2, a3, a4, a5) { if (this !== facade && this !== context)
                throw new TypeError("Illegal invocation"); return invoke(c0(a0), c1(a1), c2(a2), c3(a3), c4(a4), c5(a5)); };
            case 7: return function (a0, a1, a2, a3, a4, a5, a6) { if (this !== facade && this !== context)
                throw new TypeError("Illegal invocation"); return invoke(c0(a0), c1(a1), c2(a2), c3(a3), c4(a4), c5(a5), c6(a6)); };
            case 8: return function (a0, a1, a2, a3, a4, a5, a6, a7) { if (this !== facade && this !== context)
                throw new TypeError("Illegal invocation"); return invoke(c0(a0), c1(a1), c2(a2), c3(a3), c4(a4), c5(a5), c6(a6), c7(a7)); };
            case 9: return function (a0, a1, a2, a3, a4, a5, a6, a7, a8) { if (this !== facade && this !== context)
                throw new TypeError("Illegal invocation"); return invoke(c0(a0), c1(a1), c2(a2), c3(a3), c4(a4), c5(a5), c6(a6), c7(a7), c8(a8)); };
            case 10: return function (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) { if (this !== facade && this !== context)
                throw new TypeError("Illegal invocation"); return invoke(c0(a0), c1(a1), c2(a2), c3(a3), c4(a4), c5(a5), c6(a6), c7(a7), c8(a8), c9(a9)); };
        }
    }
    return function (...args) {
        if (this !== facade && this !== context)
            throw new TypeError("Illegal invocation");
        return Reflect.apply(invoke, undefined, convertWebIdlArguments(property, args));
    };
}
function normalizeContextAttributes(attributes = {}) {
    return {
        alpha: attributes.alpha !== undefined ? attributes.alpha : true,
        antialias: false,
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
async function createHydRuntime(translatorOptions = {}, powerPreference = "high-performance") {
    const defaultTranslatorOptions = (globalThis.__HYD_TRANSLATOR_OPTIONS || {});
    const [shaderTranslator, hydAdapter] = await Promise.all([
        ShaderTranslator.create({
            ...defaultTranslatorOptions,
            ...translatorOptions,
        }),
        navigator.gpu.requestAdapter({ powerPreference }),
    ]);
    if (!hydAdapter)
        throw new Error("Unable to acquire a WebGPU adapter");
    const hydDevice = await hydAdapter.requestDevice({ label: "hydDevice" });
    hydDevice.addEventListener("uncapturederror", (event) => {
        console.error("[HYD] WebGPU uncaptured error:", event.error && event.error.message);
    });
    hydDevice.lost.then((info) => {
        console.error("[HYD] WebGPU device lost:", info.reason, info.message);
    });
    return { device: hydDevice, shaderTranslator };
}
function createHydContextFacade(context, contextType) {
    const webgl2 = contextType === "webgl2";
    const contextPrototype = webgl2
        ? WebGL2RenderingContext.prototype
        : WebGLRenderingContext.prototype;
    const webgl1Names = new Set(Object.getOwnPropertyNames(WebGLRenderingContext.prototype));
    const publicApiCandidates = [
        ...getNativeEnumerableApiNames(contextType),
        ...webgl1Names,
        ...(webgl2 ? Object.getOwnPropertyNames(WebGL2RenderingContext.prototype) : []),
        ...Object.keys(hydWebGLConstants),
        "canvas",
    ];
    const publicEnumerableNames = new Set(publicApiCandidates.filter((name) => name === "canvas" || Reflect.has(context, name)));
    publicEnumerableNames.delete("constructor");
    const facadePrototype = Object.create(contextPrototype);
    const facade = Object.create(facadePrototype);
    const nativeDescriptor = (property) => {
        for (let prototype = contextPrototype; prototype; prototype = Object.getPrototypeOf(prototype)) {
            const descriptor = Object.getOwnPropertyDescriptor(prototype, property);
            if (descriptor)
                return descriptor;
        }
        return undefined;
    };
    for (const property of publicEnumerableNames) {
        let value = Reflect.get(context, property, context);
        if (value === undefined && property in hydWebGLConstants) {
            value = hydWebGLConstants[property];
        }
        if (typeof value === "function") {
            const method = value;
            const facadeMethod = createFacadeMethod(facade, context, property, method);
            Object.defineProperty(facade, property, {
                configurable: true,
                enumerable: true,
                writable: true,
                value: facadeMethod,
            });
            Object.defineProperty(facadePrototype, property, {
                configurable: true,
                enumerable: true,
                writable: true,
                value: facadeMethod,
            });
            continue;
        }
        if (property in hydWebGLConstants) {
            Object.defineProperty(facade, property, {
                configurable: true,
                enumerable: true,
                writable: false,
                value,
            });
            continue;
        }
        const descriptor = nativeDescriptor(property);
        Object.defineProperty(facade, property, {
            configurable: true,
            enumerable: true,
            get: () => Reflect.get(context, property, context),
            ...(descriptor?.set ? {
                set: (nextValue) => {
                    Reflect.set(context, property, nextValue, context);
                },
            } : {}),
        });
    }
    Object.defineProperties(facade, {
        hydContextType: {
            configurable: false,
            enumerable: false,
            get: () => context.hydContextType,
        },
        [Symbol.toStringTag]: {
            configurable: true,
            enumerable: false,
            value: webgl2 ? "WebGL2RenderingContext" : "WebGLRenderingContext",
        },
    });
    return facade;
}
function createHydContext(runtime, element, _shader_info_url, arg0, arg1, existingGpuContext) {
    let [contextType, contextAttributes] = arg0;
    contextAttributes = normalizeContextAttributes(contextAttributes || {});
    const [uniform_size, replay_delay] = arg1;
    if (!hydWebGLTypes.includes(contextType)) {
        throw new Error("Invalid context type");
    }
    let targetElement = element;
    let gpuctx = existingGpuContext || targetElement.getContext("webgpu");
    if (!gpuctx) {
        targetElement = makeReplacementCanvas(element);
        gpuctx = targetElement.getContext("webgpu");
    }
    if (!gpuctx) {
        throw new Error("Unable to create WebGPU canvas context");
    }
    const maxDrawingBufferDimension = runtime.device.limits.maxTextureDimension2D;
    if (targetElement.width > maxDrawingBufferDimension)
        targetElement.width = maxDrawingBufferDimension;
    if (targetElement.height > maxDrawingBufferDimension)
        targetElement.height = maxDrawingBufferDimension;
    gpuctx.configure({
        device: runtime.device,
        format: 'bgra8unorm',
        alphaMode: contextAttributes.alpha === false ? 'opaque' : 'premultiplied',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
    });
    const context = new HydWebGLStatic(targetElement, gpuctx, contextAttributes, runtime.device, uniform_size, replay_delay, runtime.shaderTranslator, contextType);
    return createHydContextFacade(context, contextType);
}
async function hydGetContext(element, shaderInfoUrl, arg0, arg1, translatorOptions = {}) {
    const contextAttributes = normalizeContextAttributes(arg0[1] || {});
    const powerPreference = contextAttributes.powerPreference === "default"
        ? undefined
        : contextAttributes.powerPreference;
    const runtime = await createHydRuntime(translatorOptions, powerPreference);
    return createHydContext(runtime, element, shaderInfoUrl, [arg0[0], contextAttributes], arg1);
}


/******/ 	return __webpack_exports__;
/******/ })()
;
});