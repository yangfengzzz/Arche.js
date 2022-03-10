import { ShaderMacroCollection } from "../../shader";
import { WGSLEncoder } from "../../shaderlib";

export class WGSLShadowShare {
  private readonly _outputStructName: string;

  constructor(outputStructName: string) {
    this._outputStructName = outputStructName;
  }

  execute(encoder: WGSLEncoder, macros: ShaderMacroCollection, counterIndex: number) {
    if (macros.isEnable("SHADOW_MAP_COUNT")) {
      encoder.addInoutType(this._outputStructName, WGSLEncoder.getCounterNumber(counterIndex), "view_pos", "vec3<f32>");
    }
  }
}
