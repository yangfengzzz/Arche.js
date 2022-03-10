import { ShaderMacroCollection } from "../../shader";

export class WGSLPositionVert {
  private readonly _input: string;
  private readonly _output: string;

  constructor(input: string, output: string) {
    this._input = input;
    this._output = output;
  }

  execute(macros: ShaderMacroCollection): string {
    return `${this._output}.position = u_rendererData.u_MVPMat * position;\n`;
  }
}
