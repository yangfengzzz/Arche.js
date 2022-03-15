import { WGSLEncoder } from "../../shaderlib";
import { ShaderMacroCollection } from "../../shader";

export class WGSLParticleSDF {
  execute(encoder: WGSLEncoder, macros: ShaderMacroCollection) {
    encoder.addFunction(
      "fn opUnion(d1: f32, d2: f32) -> f32 {\n" +
        "    return min(d1, d2);\n" +
        "}\n" +
        "\n" +
        "fn opSmoothUnion(d1: f32, d2: f32, k: f32) -> f32 {\n" +
        "    let r = exp(-k*d1) + exp(-k*d2);\n" +
        "    return -log(r) / k;\n" +
        "}\n" +
        "\n" +
        "fn opIntersection(d1: f32, d2: f32) -> f32 {\n" +
        "    return max(d1, d2);\n" +
        "}\n" +
        "\n" +
        "fn opSubstraction(d1: f32, d2: f32) -> f32 {\n" +
        "    return max(d1, -d2);\n" +
        "}\n" +
        "\n" +
        "fn opRepeat(p: vec3<f32>, c: vec3<f32>) -> vec3<f32> {\n" +
        "    return p % c - 0.5*c;\n" +
        "}\n" +
        "\n" +
        "fn opDisplacement(p: vec3<f32>, d: f32) -> f32 {\n" +
        "    var dp = d * p;\n" +
        "    return sin(dp.x)*sin(dp.y)*sin(dp.z);\n" +
        "}\n" +
        "\n" +
        "fn sdPlane(p: vec3<f32>, n: vec4<f32>) -> f32 {\n" +
        "    //n.xyz = normalize(n.xyz);\n" +
        "    return n.w + dot(p, n.xyz);\n" +
        "}\n" +
        "\n" +
        "fn sdSphere(p: vec3<f32>, r: f32) -> f32 {\n" +
        "    return length(p) - r;\n" +
        "}\n" +
        "\n" +
        "fn udRoundBox(p: vec3<f32>, b: vec3<f32>, r: f32) -> f32 {\n" +
        "    return length(max(abs(p)-b, vec3<f32>(0.0))) - r;\n" +
        "}\n" +
        "\n" +
        "// fn sdCylinder(p: vec3<f32>, c: f32) -> f32 {\n" +
        "//     return length(p.xy) - c;\n" +
        "// }\n" +
        "\n" +
        "fn sdCylinder(p: vec3<f32>, c: vec3<f32>) -> f32 {\n" +
        "    return opIntersection(length(p.xz-c.xy) - c.z, abs(p.y)-c.y);\n" +
        "}\n" +
        "\n" +
        "fn sdTorus(p: vec3<f32>, t: vec2<f32>) -> f32 {\n" +
        "    let q = vec2<f32>(length(p.xz) - t.x, p.y);\n" +
        "    return length(q) - t.y;\n" +
        "}"
    );

    encoder.addFunction(
      "fn sample_distance(p: vec3<f32>) -> f32 {\n" +
        "    return p.y; //sdSphere(p - vec3(30.0f, 110.0f, 0.0f), 64.0);\n" +
        "}\n" +
        "\n" +
        "fn compute_gradient(p: vec3<f32>, normal: ptr<function, vec3<f32> >) -> f32 {\n" +
        "    let d = sample_distance(p);\n" +
        "    \n" +
        "    let eps = vec2<f32>(0.01, 0.0);\n" +
        "    (*normal).x = sample_distance(p + eps.xyy) - d;\n" +
        "    (*normal).y = sample_distance(p + eps.yxy) - d;\n" +
        "    (*normal).z = sample_distance(p + eps.yyx) - d;\n" +
        "    (*normal) = normalize(*normal);\n" +
        "    \n" +
        "    return d;\n" +
        "}"
    );
  }
}
