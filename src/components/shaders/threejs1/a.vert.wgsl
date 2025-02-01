struct gl_PerVertex {
    @builtin(position) gl_Position: vec4<f32>,
    gl_PointSize: f32,
    gl_ClipDistance: array<f32,1u>,
    gl_CullDistance: array<f32,1u>,
}

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

struct VertexOutput {
    @builtin(position) gl_Position: vec4<f32>,
    @location(0) member: vec3<f32>,
}

var<private> perVertexStruct: gl_PerVertex = gl_PerVertex(vec4<f32>(0.0, 0.0, 0.0, 1.0), 1.0, array<f32,1u>(0.0), array<f32,1u>(0.0));
var<private> _uvNormal: vec3<f32>;
var<private> _unormal_1: vec3<f32>;
var<private> _uposition_1: vec3<f32>;
var<private> _uuv_1: vec2<f32>;

fn main_1() {
    var _uobjectNormal: vec3<f32>;
    var _utransformedNormal: vec3<f32>;
    var _utransformed: vec3<f32>;
    var _umvPosition: vec4<f32>;

    perVertexStruct.gl_Position = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    _uvNormal = vec3<f32>(0.0, 0.0, 0.0);
    let _e24 = _unormal_1;
    _uobjectNormal = vec3<f32>(_e24.x, _e24.y, _e24.z);
    let _e29 = _uobjectNormal;
    _utransformedNormal = _e29;
    let _e31 = unnamed._unormalMatrix;
    let _e32 = _utransformedNormal;
    _utransformedNormal = (_e31 * _e32);
    let _e34 = _utransformedNormal;
    _uvNormal = normalize(_e34);
    let _e36 = _uposition_1;
    _utransformed = vec3<f32>(_e36.x, _e36.y, _e36.z);
    let _e41 = _utransformed;
    _umvPosition = vec4<f32>(_e41.x, _e41.y, _e41.z, 1.0);
    let _e47 = unnamed._umodelViewMatrix;
    let _e48 = _umvPosition;
    _umvPosition = (_e47 * _e48);
    let _e51 = unnamed._uprojectionMatrix;
    let _e52 = _umvPosition;
    perVertexStruct.gl_Position = (_e51 * _e52);
    return;
}

@vertex 
fn main( @location(1) _unormal: vec3<f32>, @location(0) _uposition: vec3<f32>, @location(2) _uuv: vec2<f32>) -> VertexOutput {
    _unormal_1 = _unormal;
    _uposition_1 = _uposition;
    _uuv_1 = _uuv;
    main_1();
    let _e10 = perVertexStruct.gl_Position.y;
    let _e12 = perVertexStruct.gl_Position;
    let _e13 = _uvNormal;
    return VertexOutput(_e12, _e13);
}
