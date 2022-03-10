import { WGSLEncoder } from "../WGSLEncoder";
import { ShaderMacroCollection } from "../../shader";

export class WGSLIBLFragDefine {
  private _paramName: string = "in";
  private readonly _outputStructName: string;

  set paramName(name: string) {
    this._paramName = name;
  }

  get paramName(): string {
    return this._paramName;
  }

  constructor(outputStructName: string) {
    this._outputStructName = outputStructName;
  }

  execute(encoder: WGSLEncoder, macros: ShaderMacroCollection, counterIndex: number) {
    // sh need be pre-scaled in CPU.
    let func = "fn getLightProbeIrradiance(sh: array<vec3<f32>, 9>, normal:vec3<f32>)->vec3<f32> {\n";
    func += "      var result = sh[0] +\n";
    func += "\n";
    func += "            sh[1] * (normal.y) +\n";
    func += "            sh[2] * (normal.z) +\n";
    func += "            sh[3] * (normal.x) +\n";
    func += "\n";
    func += "           sh[4] * (normal.y * normal.x) +\n";
    func += "           sh[5] * (normal.y * normal.z) +\n";
    func += "           sh[6] * (3.0 * normal.z * normal.z - 1.0) +\n";
    func += "           sh[7] * (normal.z * normal.x) +\n";
    func += "           sh[8] * (normal.x * normal.x - normal.y * normal.y);\n";
    func += "\n";
    func += "   return max(result, vec3<f32>(0.0));\n";
    func += "}\n";
    encoder.addFunction(func);

    // ref: https://www.unrealengine.com/blog/physically-based-shading-on-mobile - environmentBRDF for GGX on mobile
    func = "fn envBRDFApprox(specularColor:vec3<f32>, roughness:f32, dotNV:f32 )->vec3<f32>{\n";
    func += "   let c0 = vec4<f32>( -1.0, -0.0275, -0.572, 0.022 );\n";
    func += "\n";
    func += "   let c1 = vec4<f32>( 1.0, 0.0425, 1.04, -0.04 );\n";
    func += "\n";
    func += "   var r = roughness * c0 + c1;\n";
    func += "\n";
    func += "   var a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;\n";
    func += "\n";
    func += "   var AB = vec2<f32>( -1.04, 1.04 ) * a004 + r.zw;\n";
    func += "\n";
    func += "   return specularColor * AB.x + AB.y;\n";
    func += "}\n";
    encoder.addFunction(func);

    func = "fn getSpecularMIPLevel(roughness:f32, maxMIPLevel:i32)->f32 {\n";
    func += "    return roughness * f32(maxMIPLevel);\n";
    func += "}\n";
    encoder.addFunction(func);

    func =
      "fn getLightProbeRadiance(geometry:GeometricContext, roughness:f32, maxMIPLevel:i32, specularIntensity:f32)->vec3<f32> {\n";
    if (!macros.isEnable("HAS_SPECULAR_ENV")) {
      func += "return vec3<f32>(0.0, 0.0, 0.0);\n";
    } else {
      func += "var reflectVec = reflect( -geometry.viewDir, geometry.normal );\n";
      func += "var specularMIPLevel = getSpecularMIPLevel(roughness, maxMIPLevel );\n";
      func +=
        "var envMapColor =  textureSampleLevel(u_env_specularTexture, u_env_specularSampler, reflectVec, specularMIPLevel );\n";
      func += "return envMapColor.rgb * specularIntensity;\n";
    }
    func += "}\n";
    encoder.addFunction(func);
  }
}
