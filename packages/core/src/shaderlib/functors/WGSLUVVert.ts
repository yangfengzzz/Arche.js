import { ShaderMacroCollection } from "../../shader";

export class WGSLUVVert {
  private readonly _input: string;
  private readonly _output: string;

  constructor(input: string, output: string) {
    this._input = input;
    this._output = output;
  }

  execute(macros: ShaderMacroCollection): string {
    const output = this._output;
    const input = this._input;
    let source: string = "";
    if (macros.isEnable("HAS_UV")) {
      source += `${output}.v_uv = ${input}.UV_0;\n`;
    } else {
      // may need this calculate normal
      source += `${output}.v_uv = vec2<f32>( 0., 0. );\n`;
    }

    if (macros.isEnable("NEED_TILINGOFFSET")) {
      source += `${output}.v_uv = ${output}.v_uv * u_tilingOffset.xy + u_tilingOffset.zw;\n`;
    }
    return source;
  }
}
