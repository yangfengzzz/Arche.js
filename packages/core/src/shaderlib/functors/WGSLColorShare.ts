import { WGSLEncoder } from "../WGSLEncoder";
import { ShaderMacroCollection } from "../../shader";

export class WGSLColorShare {
  private readonly _outputStructName: string;

  constructor(outputStructName: string) {
    this._outputStructName = outputStructName;
  }

  execute(encoder: WGSLEncoder, macros: ShaderMacroCollection, counterIndex: number) {
    if (macros.isEnable("HAS_VERTEXCOLOR")) {
      encoder.addInoutType(this._outputStructName, WGSLEncoder.getCounterNumber(counterIndex), "v_color", "vec4<f32>");
    }
  }
}
