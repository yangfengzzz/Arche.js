import { ShaderMacroCollection } from "../../shader/ShaderMacroCollection";

export class WGSLShadowVert {
  private readonly _output: string;

  constructor(output: string) {
    this._output = output;
  }

  execute(macros: ShaderMacroCollection): string {
    let source: string = "";
    if (macros.isEnable("SHADOW_MAP_COUNT")) {
      source += `${this._output}.view_pos = (u_rendererData.u_MVMat * position).xyz;\n`;
    }
    return source;
  }
}
