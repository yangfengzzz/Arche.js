import { BindGroupInfo, WGSL, WGSLEncoder } from "../shaderlib";
import {
  WGSLBeginPositionVert,
  WGSLBlendShapeInput,
  WGSLBlendShapeVert,
  WGSLCommonVert,
  WGSLSkinningVert
} from "../shaderlib/functors";
import { ShaderMacroCollection } from "../shader/ShaderMacroCollection";

export class WGSLShadowVertex extends WGSL {
  private _commonVert: WGSLCommonVert;
  private _blendShapeInput: WGSLBlendShapeInput;
  private _beginPositionVert: WGSLBeginPositionVert;
  private _blendShapeVert: WGSLBlendShapeVert;
  private _skinningVert: WGSLSkinningVert;

  constructor() {
    super();
    this._commonVert = new WGSLCommonVert("VertexIn");
    this._blendShapeInput = new WGSLBlendShapeInput("VertexIn");
    this._beginPositionVert = new WGSLBeginPositionVert("in", "out");
    this._blendShapeVert = new WGSLBlendShapeVert("in", "out");
    this._skinningVert = new WGSLSkinningVert("in", "out");
  }

  compile(macros: ShaderMacroCollection): [string, BindGroupInfo] {
    this._source = "";
    this._bindGroupInfo.clear();
    const inputStructCounter = WGSLEncoder.startCounter();
    {
      const encoder = this.createSourceEncoder(GPUShaderStage.VERTEX);
      this._commonVert.execute(encoder, macros);
      this._blendShapeInput.execute(encoder, macros, inputStructCounter);
      encoder.addUniformBinding("u_shadowVPMat", "mat4x4<f32>", 0);

      encoder.addBuiltInoutType("VertexOut", "position", "position", "vec4<f32>");

      encoder.addEntry([["in", "VertexIn"]], ["out", "VertexOut"], () => {
        let source: string = "";
        source += this._beginPositionVert.execute(macros);
        source += this._blendShapeVert.execute(macros);
        source += this._skinningVert.execute(macros);

        source += "out.position = u_shadowVPMat * u_rendererData.u_modelMat * position;\n";
        return source;
      });
      encoder.flush();
    }
    WGSLEncoder.endCounter(inputStructCounter);
    return [this._source, this._bindGroupInfo];
  }
}
