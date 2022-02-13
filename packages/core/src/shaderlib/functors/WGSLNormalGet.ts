import { WGSLEncoder } from "../WGSLEncoder";
import { ShaderMacroCollection } from "../../shader/ShaderMacroCollection";

export class WGSLNormalGet {
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
    let source = `fn getNormal(${this._paramName}:${this._outputStructName}, \n`;
    if (macros.isEnable("HAS_NORMAL_TEXTURE")) {
      source += "     u_normalTexture: texture_2d<f32>,\n";
      source += "     u_normalSampler: sampler,\n";
      source += "     normalIntensity: f32,\n";
    }
    source += ")->vec3<f32> {\n";

    const paramName = this._paramName;
    if (macros.isEnable("HAS_NORMAL_TEXTURE")) {
      if (!macros.isEnable("HAS_TANGENT")) {
        source += `var pos_dx = dfdx(${paramName}.v_pos);\n`;
        source += `var pos_dy = dfdy(${paramName}.v_pos);\n`;
        source += `var tex_dx = dfdx(vec3<f32>(${paramName}.v_uv, 0.0));\n`;
        source += `var tex_dy = dfdy(vec3<f32>(${paramName}.v_uv, 0.0));\n`;
        source += "var t = (tex_dy.t * pos_dx - tex_dx.t * pos_dy) / (tex_dx.s * tex_dy.t - tex_dy.s * tex_dx.t);\n";
        if (macros.isEnable("HAS_NORMAL")) {
          source += "var ng = normalize(v_normal);\n";
        } else {
          source += "var ng = normalize( cross(pos_dx, pos_dy) );\n";
        }
        source += "t = normalize(t - ng * dot(ng, t));\n";
        source += "var b = normalize(cross(ng, t));\n";
        source += "var tbn = mat3x3<f32>(t, b, ng);\n";
      } else {
        source += `var tbn =  mat3x3<f32>(${paramName}.v_tangentW, ${paramName}.v_bitangentW, ${paramName}.v_normalW );\n`;
      }
      source += `var n = textureSample(u_normalTexture, u_normalSampler, ${paramName}.v_uv ).rgb;\n`;
      source += "n = normalize(tbn * ((2.0 * n - 1.0) * vec3<f32>(normalIntensity, normalIntensity, 1.0)));\n";
    } else {
      if (macros.isEnable("HAS_NORMAL")) {
        source += `var n = normalize(${paramName}.v_normal);\n`;
      } else {
        source += `var pos_dx = dfdx(${paramName}.v_pos);\n`;
        source += `var pos_dy = dfdy(${paramName}.v_pos);\n`;
        source += "var n = normalize( cross(pos_dx, pos_dy) );\n";
      }
    }
//    source += "n = -1.0 * n;\n";
    source += "return n;\n";
    source += "}\n";

    encoder.addFunction(source);
  }
}
