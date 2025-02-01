struct UniformBufferObject {
    _umodelMatrix: mat4x4<f32>,
    _umodelViewMatrix: mat4x4<f32>,
    _uprojectionMatrix: mat4x4<f32>,
    _uviewMatrix: mat4x4<f32>,
    _unormalMatrix: mat3x3<f32>,
    _ucameraPosition: vec3<f32>,
    _uisOrthographic: u32,
    _uopacity: f32,
}
@group(0) @binding(0) var<uniform> unnamed: UniformBufferObject;

var<private> _upc_fragColor: vec4<f32>;
var<private> _uvNormal_1: vec3<f32>;

fn _upackNormalToRGBvf3_(_unormal: vec3<f32>) -> vec3<f32> {
    return ((normalize(_unormal) * 0.5) + vec3<f32>(0.5));
}

fn main_1() {
    var _unormal_1: vec3<f32>;

    _upc_fragColor = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    let _e14 = _uvNormal_1;
    _unormal_1 = normalize(_e14);
    let _e16 = _unormal_1;
    let _e17 = _upackNormalToRGBvf3_(_e16);
    let _e19 = unnamed._uopacity;
    _upc_fragColor = vec4<f32>(_e17.x, _e17.y, _e17.z, _e19);
    _upc_fragColor[3u] = 1.0;
    return;
}

@fragment 
fn main(@location(0) _uvNormal: vec3<f32>) -> @location(0) vec4<f32> {
    _uvNormal_1 = _uvNormal;
    main_1();
    let _e3 = _upc_fragColor;
    return _e3;
}
