import { ShaderMacroCollection } from "../../shader";

export class WGSLWorldPosVert {
  private readonly _input: string;
  private readonly _output: string;

  constructor(input: string, output: string) {
    this._input = input;
    this._output = output;
  }

  execute(macros: ShaderMacroCollection): string {
    let source: string = "";
    if (macros.isEnable("NEED_WORLDPOS")) {
      source += "var temp_pos = u_rendererData.u_modelMat * position;\n";
      source += `${this._output}.v_pos = temp_pos.xyz / temp_pos.w;\n`;
    }
    return source;
  }
}
