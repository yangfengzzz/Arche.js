import { ShaderMacroCollection } from "../../shader/ShaderMacroCollection";

export class WGSLNormalVert {
  private readonly _input: string;
  private readonly _output: string;

  constructor(input: string, output: string) {
    this._input = input;
    this._output = output;
  }

  execute(macros: ShaderMacroCollection): string {
    const output = this._output;
    let source: string = "";
    if (macros.isEnable("HAS_NORMAL")) {
      if (macros.isEnable("HAS_TANGENT") && macros.isEnable("HAS_NORMAL_TEXTURE")) {
        source += "var normalW = normalize( mat3x3<f32>(u_rendererData.u_normalMat[0].xyz, ";
        "u_rendererData.u_normalMat[1].xyz, u_rendererData.u_normalMat[2].xyz) * normal.xyz );\n";
        source += "var tangentW = normalize( mat3x3<f32>(u_rendererData.u_normalMat[0].xyz, ";
        "u_rendererData.u_normalMat[1].xyz, u_rendererData.u_normalMat[2].xyz) * tangent.xyz );\n";
        source += "var bitangentW = cross( normalW, tangentW ) * tangent.w;\n";
        source += `${output}.v_normalW = normalW;\n`;
        source += `${output}.v_tangentW = tangentW;\n`;
        source += `${output}.v_bitangentW = bitangentW;\n`;
      } else {
        source += `${output}.v_normal = normalize(mat3x3<f32>(
                            u_rendererData.u_normalMat[0].xyz,
                            u_rendererData.u_normalMat[1].xyz, 
                            u_rendererData.u_normalMat[2].xyz) * normal);\n`;
      }
    }
    return source;
  }
}
