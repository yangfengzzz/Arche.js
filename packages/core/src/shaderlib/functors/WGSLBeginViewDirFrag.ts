import { ShaderMacroCollection } from "../../shader";

export class WGSLBeginViewDirFrag {
  private readonly _input: string;
  private readonly _output: string;

  constructor(input: string, output: string) {
    this._input = input;
    this._output = output;
  }

  execute(macros: ShaderMacroCollection): string {
    if (macros.isEnable("NEED_WORLDPOS")) {
      return `var V = normalize(u_cameraData.u_cameraPos - ${this._input}.v_pos);\n`;
    }
    return "";
  }
}
