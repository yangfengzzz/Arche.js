import { WGSLEncoder } from "../WGSLEncoder";
import { ShaderMacroCollection } from "../../shader/ShaderMacroCollection";

export class WGSLNormalShare {
  private readonly _outputStructName: string;

  constructor(outputStructName: string) {
    this._outputStructName = outputStructName;
  }

  execute(encoder: WGSLEncoder, macros: ShaderMacroCollection, counterIndex: number) {
    const outputStructName = this._outputStructName;
    if (macros.isEnable("HAS_NORMAL")) {
      if (macros.isEnable("HAS_TANGENT") && macros.isEnable("HAS_NORMAL_TEXTURE")) {
        encoder.addInoutType(outputStructName, WGSLEncoder.getCounterNumber(counterIndex),
          "v_normalW", "vec3<f32>");
        encoder.addInoutType(outputStructName, WGSLEncoder.getCounterNumber(counterIndex),
          "v_tangentW", "vec3<f32>");
        encoder.addInoutType(outputStructName, WGSLEncoder.getCounterNumber(counterIndex),
          "v_bitangentW", "vec3<f32>");
      } else {
        encoder.addInoutType(outputStructName, WGSLEncoder.getCounterNumber(counterIndex),
          "v_normal", "vec3<f32>");
      }
    }
  }
}
