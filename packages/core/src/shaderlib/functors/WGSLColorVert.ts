import { ShaderMacroCollection } from "../../shader";

export class WGSLColorVert {
  private readonly _input: string;
  private readonly _output: string;

  constructor(input: string, output: string) {
    this._input = input;
    this._output = output;
  }

  execute(macros: ShaderMacroCollection): string {
    if (macros.isEnable("HAS_VERTEXCOLOR")) {
      return `${this._output}.v_color = ${this._input}.COLOR_0;\n`;
    }
    return "";
  }
}
