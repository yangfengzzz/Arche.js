import { WGSLEncoder } from "../WGSLEncoder";
import { ShaderMacroCollection } from "../../shader/ShaderMacroCollection";

export class WGSLUVShare {
  private readonly _outputStructName: string;

  constructor(outputStructName: string) {
    this._outputStructName = outputStructName;
  }

  execute(encoder: WGSLEncoder, macros: ShaderMacroCollection, counterIndex: number) {
    encoder.addInoutType(this._outputStructName, WGSLEncoder.getCounterNumber(counterIndex),
      "v_uv", "vec2<f32>");
  }
}
