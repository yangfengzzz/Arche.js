import { ShaderMacroCollection } from "../../shader/ShaderMacroCollection";

export class WGSLBlendShapeVert {
  private readonly _input: string;
  private readonly _output: string;

  constructor(input: string, output: string) {
    this._input = input;
    this._output = output;
  }

  execute(macros: ShaderMacroCollection): string {
    let source: string = "";
    if (macros.isEnable("HAS_BLENDSHAPE")) {
      if (macros.isEnable("HAS_BASE_TEXTURE")) {

      } else {
        source += "position.xyz += POSITION_BS0 * u_blendShapeWeights[0];\n";
        source += "position.xyz += POSITION_BS1 * u_blendShapeWeights[1];\n";
        source += "position.xyz += POSITION_BS2 * u_blendShapeWeights[2];\n";
        source += "position.xyz += POSITION_BS3 * u_blendShapeWeights[3];\n";

        if (macros.isEnable("HAS_NORMAL") && macros.isEnable("HAS_BLENDSHAPE_NORMAL")) {
          source += "normal.xyz += NORMAL_BS0 * u_blendShapeWeights[0];\n";
          source += "normal.xyz += NORMAL_BS1 * u_blendShapeWeights[1];\n";
          source += "normal.xyz += NORMAL_BS2 * u_blendShapeWeights[2];\n";
          source += "normal.xyz += NORMAL_BS3 * u_blendShapeWeights[3];\n";
        }

        if (macros.isEnable("HAS_TANGENT") && macros.isEnable("HAS_BLENDSHAPE_TANGENT")) {
          source += "tangent.xyz += TANGENT_BS0 * u_blendShapeWeights[0];\n";
          source += "tangent.xyz += TANGENT_BS1 * u_blendShapeWeights[1];\n";
          source += "tangent.xyz += TANGENT_BS2 * u_blendShapeWeights[2];\n";
          source += "tangent.xyz += TANGENT_BS3 * u_blendShapeWeights[3];\n";
        }
      }
    }
    return source;
  }
}
