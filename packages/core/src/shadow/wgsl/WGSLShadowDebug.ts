import {
  WGSL,
  WGSLCommonFrag,
  WGSLUVShare,
  WGSLColorShare,
  WGSLNormalShare,
  WGSLWorldPosShare,
  BindGroupInfo,
  WGSLEncoder
} from "../../shaderlib";
import { ShaderMacroCollection } from "../../shader";
import { ShaderStage } from "../../webgpu";
import { WGSLShadowCommon } from "./WGSLShadowCommon";
import { WGSLShadowShare } from "./WGSLShadowShare";
import { WGSLShadowFragDefine } from "./WGSLShadowFragDefine";

export class WGSLShadowDebug extends WGSL {
  private _commonFrag: WGSLCommonFrag;
  private _uvShare: WGSLUVShare;
  private _colorShare: WGSLColorShare;
  private _normalShare: WGSLNormalShare;
  private _worldPosShare: WGSLWorldPosShare;

  private _shadowCommon: WGSLShadowCommon;
  private _shadowShare: WGSLShadowShare;
  private _shadowFragDefine: WGSLShadowFragDefine;

  constructor() {
    super();
    this._commonFrag = new WGSLCommonFrag("VertexOut");
    this._uvShare = new WGSLUVShare("VertexOut");
    this._colorShare = new WGSLColorShare("VertexOut");
    this._normalShare = new WGSLNormalShare("VertexOut");
    this._worldPosShare = new WGSLWorldPosShare("VertexOut");

    this._shadowCommon = new WGSLShadowCommon();
    this._shadowShare = new WGSLShadowShare("VertexOut");
    this._shadowFragDefine = new WGSLShadowFragDefine();
  }

  compile(macros: ShaderMacroCollection): [string, BindGroupInfo] {
    this._source = "";
    this._bindGroupInfo.clear();
    const inputStructCounter = WGSLEncoder.startCounter();
    const outputStructCounter = WGSLEncoder.startCounter(0);
    {
      const encoder = this.createSourceEncoder(ShaderStage.VERTEX);
      encoder.addBuiltInoutType("VertexOut", "position", "position", "vec4<f32>");

      this._shadowCommon.execute(encoder, macros);

      this._commonFrag.execute(encoder, macros);
      this._shadowFragDefine.execute(encoder, macros);

      this._uvShare.execute(encoder, macros, inputStructCounter);
      this._colorShare.execute(encoder, macros, inputStructCounter);
      this._normalShare.execute(encoder, macros, inputStructCounter);
      this._worldPosShare.execute(encoder, macros, inputStructCounter);
      this._shadowShare.execute(encoder, macros, inputStructCounter);

      encoder.addFunction(
        "fn LinearizeDepth(depth: f32)->f32 {\n" +
          "  let n = 1.0;\n" + // camera z near
          "  let f = 128.0;\n" + // camera z far
          "  let z = depth;\n" +
          "  return (2.0 * n) / (f + n - z * (f - n));\n" +
          "}\n"
      );

      encoder.addInoutType("Output", 0, "finalColor", "vec4<f32>");
      encoder.addRenderEntry([["in", "VertexOut"]], ["out", "Output"], () => {
        let source: string = "";
        // Get cascade index for the current fragment's view position
        source +=
          "var cascadeIndex = 0u;\n" +
          "for(var i = 0u; i < 4u - 1u; i = i + 1u) {\n" +
          "  if(in.view_pos.z < u_shadowData[0].cascadeSplits[i]) {\n" +
          "    cascadeIndex = i + 1u;\n" +
          "  }\n" +
          "}\n" +
          "\n" +
          "if (cascadeIndex == 0u) {\n" +
          "  out.finalColor = vec4<f32>(1.0, 1.0, 1.0, 1.0);\n" +
          "} else if (cascadeIndex == 1u) {\n" +
          "  out.finalColor = vec4<f32>(1.0, 0.0, 0.0, 1.0);\n" +
          "} else if (cascadeIndex == 2u) {\n" +
          "  out.finalColor = vec4<f32>(0.0, 1.0, 0.0, 1.0);\n" +
          "} else if (cascadeIndex == 3u) {\n" +
          "  out.finalColor = vec4<f32>(0.0, 0.0, 1.0, 1.0);\n" +
          "}\n";
        return source;
      });
      encoder.flush();
    }
    WGSLEncoder.endCounter(inputStructCounter);
    WGSLEncoder.endCounter(outputStructCounter);
    return [this._source, this._bindGroupInfo];
  }
}
