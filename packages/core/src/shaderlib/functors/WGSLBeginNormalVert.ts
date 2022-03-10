import { ShaderMacroCollection } from "../../shader";

export class WGSLBeginNormalVert {
  private readonly _input: string;
  private readonly _output: string;

  constructor(input: string, output: string) {
    this._input = input;
    this._output = output;
  }

  execute(macros: ShaderMacroCollection): string {
    let source: string = "";
    if (macros.isEnable("HAS_NORMAL")) {
      source += `var normal = ${this._input}.Normal;\n`;
      if (macros.isEnable("HAS_TANGENT") && macros.isEnable("HAS_NORMAL_TEXTURE")) {
        source += `var tangent = ${this._input}.Tangent;\n`;
      }
    }
    return source;
  }
}
