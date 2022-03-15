import { WGSLEncoder } from "../../shaderlib";
import { ShaderMacroCollection } from "../../shader";

export class WGSLParticleCommon {
  execute(encoder: WGSLEncoder, macros: ShaderMacroCollection) {
    encoder.addStruct(
      "struct TParticle {\n" +
        "    position: vec4<f32>;\n" +
        "    velocity: vec4<f32>;\n" +
        "    start_age: f32;\n" +
        "    age: f32;\n" +
        "    padding0: f32; \n" +
        "    id: u32;\n" +
        "};\n"
    );

    encoder.addFunction(
      "fn pi() -> f32 {\n" +
        "    return 3.141564;\n" +
        "}\n" +
        "\n" +
        "fn twoPi() -> f32 {\n" +
        "    return 6.283185;\n" +
        "}\n" +
        "\n" +
        "fn goldenAngle() -> f32 {\n" +
        "    return 2.399963;\n" +
        "}\n" +
        "\n" +
        "fn cbrt(x: f32) -> f32 {\n" +
        "    return pow(x, 0.33333);\n" +
        "}\n" +
        "\n" +
        "fn rotationX(c: f32, s: f32) -> mat3x3<f32> {\n" +
        "    return mat3x3<f32>(vec3<f32>(1.0, 0.0, 0.0),\n" +
        "                        vec3<f32>(0.0, c, s),\n" +
        "                        vec3<f32>(0.0, -s, c));\n" +
        "}\n" +
        "\n" +
        "fn rotationY(c: f32, s: f32) -> mat3x3<f32> {\n" +
        "    return mat3x3<f32>(vec3<f32>(c, 0.0, -s),\n" +
        "                        vec3<f32>(0.0, 1.0, 0.0),\n" +
        "                        vec3<f32>(s, 0.0, c));\n" +
        "}\n" +
        "\n" +
        "fn rotationZ(c: f32, s: f32) -> mat3x3<f32> {\n" +
        "    return mat3x3<f32>(vec3<f32>(c, s, 0.0),\n" +
        "                        vec3<f32>(-s, c, 0.0),\n" +
        "                        vec3<f32>(0.0, 0.0, 1.0));\n" +
        "}\n" +
        "\n" +
        "fn rotationXAngle(radians: f32) -> mat3x3<f32> {\n" +
        "    return rotationX(cos(radians), sin(radians));\n" +
        "}\n" +
        "\n" +
        "fn rotationYAngle(radians: f32) -> mat3x3<f32> {\n" +
        "    return rotationY(cos(radians), sin(radians));\n" +
        "}\n" +
        "\n" +
        "fn rotationZAngle(radians: f32) -> mat3x3<f32> {\n" +
        "    return rotationZ(cos(radians), sin(radians));\n" +
        "}\n" +
        "\n" +
        "fn disk_distribution(radius: f32, rn: vec2<f32>) -> vec3<f32> {\n" +
        "    let r = radius * rn.x;\n" +
        "    let theta = twoPi() * rn.y;\n" +
        "    return vec3<f32>(r * cos(theta),\n" +
        "                    0.0,\n" +
        "                    r * sin(theta));\n" +
        "}\n" +
        "\n" +
        "fn disk_even_distribution(radius: f32, id: u32, total: u32) -> vec3<f32> {\n" +
        "    // ref : http://blog.marmakoide.org/?p=1\n" +
        "    let theta:f32 = f32(id) * goldenAngle();\n" +
        "    let r = radius * sqrt(f32(id) / f32(total));\n" +
        "    return vec3<f32>(r * cos(theta),\n" +
        "                  0.0,\n" +
        "                  r * sin(theta));\n" +
        "}\n" +
        "\n" +
        "fn sphere_distribution(radius: f32, rn: vec2<f32>) -> vec3<f32> {\n" +
        "    // ref : https://www.cs.cmu.edu/~mws/rpos.html\n" +
        "    //       https://gist.github.com/dinob0t/9597525\n" +
        "    let phi = twoPi() * rn.x;\n" +
        "    let z = radius * (2.0 * rn.y - 1.0);\n" +
        "    let r = sqrt(radius * radius - z * z);\n" +
        "    return vec3<f32>(r * cos(phi),\n" +
        "                    r * sin(phi),\n" +
        "                    z);\n" +
        "}\n" +
        "\n" +
        "fn ball_distribution(radius: f32, rn: vec3<f32>) -> vec3<f32> {\n" +
        "    // ref : so@5408276\n" +
        "    let costheta = 2.0 * rn.x - 1.0;\n" +
        "    let phi = twoPi() * rn.y;\n" +
        "    let theta = acos(costheta);\n" +
        "    let r = radius * cbrt(rn.z);\n" +
        "    let s = sin(theta);\n" +
        "    \n" +
        "    return r * vec3<f32>(s * cos(phi),\n" +
        "                        s * sin(phi),\n" +
        "                        costheta);\n" +
        "}\n"
    );
  }
}
