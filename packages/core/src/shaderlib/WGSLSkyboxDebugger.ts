import { BindGroupInfo, WGSL } from "./WGSL";
import {
  WGSLBeginPositionVert,
  WGSLCommon,
  WGSLCommonVert,
  WGSLPositionVert,
  WGSLUVShare,
  WGSLUVVert
} from "./functors";
import { ShaderMacroCollection } from "../shader";
import { WGSLEncoder } from "./WGSLEncoder";

export class WGSLSkyboxDebuggerVertex extends WGSL {
  private _commonVert: WGSLCommonVert;
  private _uvShare: WGSLUVShare;
  private _beginPositionVert: WGSLBeginPositionVert;
  private _uvVert: WGSLUVVert;
  private _positionVert: WGSLPositionVert;

  constructor() {
    super();
    this._commonVert = new WGSLCommonVert("VertexIn");
    this._uvShare = new WGSLUVShare("VertexOut");
    this._beginPositionVert = new WGSLBeginPositionVert("in", "out");
    this._uvVert = new WGSLUVVert("in", "out");
    this._positionVert = new WGSLPositionVert("in", "out");
  }

  compile(macros: ShaderMacroCollection): [string, BindGroupInfo] {
    this._source = "";
    this._bindGroupInfo.clear();
    const inputStructCounter = WGSLEncoder.startCounter();
    const outputStructCounter = WGSLEncoder.startCounter(0);
    {
      const encoder = this.createSourceEncoder(GPUShaderStage.VERTEX);
      this._commonVert.execute(encoder, macros);
      this._uvShare.execute(encoder, macros, outputStructCounter);
      encoder.addBuiltInoutType("VertexOut", "position", "position", "vec4<f32>");

      encoder.addRenderEntry([["in", "VertexIn"]], ["out", "VertexOut"], () => {
        let source: string = "";
        source += this._beginPositionVert.execute(macros);
        source += this._uvVert.execute(macros);
        source += this._positionVert.execute(macros);
        return source;
      });
      encoder.flush();
    }
    WGSLEncoder.endCounter(inputStructCounter);
    WGSLEncoder.endCounter(outputStructCounter);
    return [this._source, this._bindGroupInfo];
  }
}

export class WGSLSkyboxDebuggerFragment extends WGSL {
  private _common: WGSLCommon;
  private _uvShare: WGSLUVShare;

  constructor() {
    super();
    this._common = new WGSLCommon();
    this._uvShare = new WGSLUVShare("VertexOut");
  }

  compile(macros: ShaderMacroCollection): [string, BindGroupInfo] {
    this._source = "";
    this._bindGroupInfo.clear();
    const inputStructCounter = WGSLEncoder.startCounter(0);
    {
      const encoder = this.createSourceEncoder(GPUShaderStage.FRAGMENT);
      this._common.execute(encoder, macros);
      this._uvShare.execute(encoder, macros, inputStructCounter);

      encoder.addInoutType("Output", 0, "finalColor", "vec4<f32>");
      encoder.addSampledTextureBinding("u_baseTexture", "texture_2d<f32>", "u_baseSampler", "sampler");
      encoder.addUniformBinding("u_faceIndex", "i32", 0);

      encoder.addRenderEntry([["in", "VertexOut"]], ["out", "Output"], () => {
        let source: string = "";
        source += "var uv = in.v_uv;\n";
        source += "if (u_faceIndex == 2 || u_faceIndex == 3) {\n";
        source += "    uv.y = 1.0 - uv.y;\n";
        source += "}\n";

        source += "var baseColor = textureSample(u_baseTexture, u_baseSampler, uv);\n";
        source += "out.finalColor = vec4<f32>(baseColor.rgb, 1.0);\n";
        return source;
      });
      encoder.flush();
    }
    WGSLEncoder.endCounter(inputStructCounter);
    return [this._source, this._bindGroupInfo];
  }
}
