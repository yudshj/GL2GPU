import json
from pathlib import Path


glsl_type_map = {
    "float": "f32",
    "vec2": "vec2<f32>",
    "vec3": "vec3<f32>",
    "vec4": "vec4<f32>",
    "mat4": "mat4x4<f32>",
    "mat3": "mat3x3<f32>",
    "mat2": "mat2x2<f32>",
    "sampler2D": "texture_2d<f32>",
    "samplerCube": "texture_cube<f32>",
}

def main():
    cwd = Path(__file__).parent
    o = []
    for dir in sorted(cwd.iterdir()):
        src_dir = dir / 'src'
        for glsl_p in sorted(src_dir.glob("*.glsl")):
            wgsl_p = glsl_p.with_suffix(".wgsl")
            uniforms = []
            attributes = []
            samplers = []
            for line in glsl_p.read_text().splitlines():
                if line.startswith("uniform"):
                    a = line.split()
                    t = a[1]
                    n = a[2].replace(";", "")
                    if "sampler" in t:
                        samplers.append({"name": n, "glsl_type": t, "wgsl_texture_type": glsl_type_map[t], "wgsl_sampler_type": "sampler"})
                    else:
                        uniforms.append({"name": n, "glsl_type": t, "wgsl_type": glsl_type_map[t]})
                elif line.startswith("attribute") or line.startswith("in"):
                    a = line.split()
                    t = a[1]
                    n = a[2].replace(";", "")
                    attributes.append({"name": n, "glsl_type": t, "wgsl_type": glsl_type_map[t]})
            o.append({
                "attributes": attributes,
                "uniforms": uniforms,
                "samplers": samplers,
                "glsl": glsl_p.read_text(),
                "wgsl": wgsl_p.read_text(),
                "debug_info": json.dumps({
                    "glsl_path": glsl_p.relative_to(cwd).as_posix(),
                    "wgsl_path": wgsl_p.relative_to(cwd).as_posix(),
                })
            })

    # print(json.dumps(o, indent=4))
    out_path = cwd / "shaders_info.json"
    out_path.write_text(json.dumps(o, indent=4))


if __name__ == "__main__":
    main()
