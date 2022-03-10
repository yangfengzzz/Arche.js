import { BindGroupInfo, WGSL, WGSLEncoder, WGSLUVShare } from "../../shaderlib";
import { WGSLForwardPlusUniforms } from "./WGSLClusterCommon";
import { WGSLClusterLightsStructs, WGSLTileFunctions } from "./WGSLClusterCompute";
import { ShaderMacroCollection } from "../../shader";
import { ShaderStage } from "../../webgpu";

export class WGSLClusterDebug extends WGSL {
  private _uvShare: WGSLUVShare;
  private _forwardPlusUniforms: WGSLForwardPlusUniforms;
  private _tileFunctions: WGSLTileFunctions;
  private _clusterLightsStructs: WGSLClusterLightsStructs;
  private readonly _maxLightsPerCluster: number;

  constructor(tileCount: number[], maxLightsPerCluster: number) {
    super();
    this._forwardPlusUniforms = new WGSLForwardPlusUniforms();
    this._tileFunctions = new WGSLTileFunctions(tileCount);
    this._clusterLightsStructs = new WGSLClusterLightsStructs(
      tileCount[0] * tileCount[1] * tileCount[2],
      maxLightsPerCluster
    );
    this._uvShare = new WGSLUVShare("VertexOut");
    this._maxLightsPerCluster = maxLightsPerCluster;
  }

  compile(macros: ShaderMacroCollection): [string, BindGroupInfo] {
    this._source = "";
    this._bindGroupInfo.clear();
    const inputStructCounter = WGSLEncoder.startCounter(0);
    {
      const encoder = this.createSourceEncoder(ShaderStage.FRAGMENT);
      this._forwardPlusUniforms.execute(encoder, macros);
      this._tileFunctions.execute(encoder, macros);
      this._clusterLightsStructs.execute(encoder, macros);

      this._uvShare.execute(encoder, macros, inputStructCounter);
      encoder.addBuiltInoutType("VertexOut", "position", "fragCoord", "vec4<f32>");
      encoder.addInoutType("Output", 0, "finalColor", "vec4<f32>");

      encoder.addRenderEntry([["in", "VertexOut"]], ["out", "Output"], () => {
        let source: string = "let clusterIndex : u32 = getClusterIndex(in.fragCoord);\n";
        source +=
          "let lightCount : u32 = u_clusterLights.lights[clusterIndex].point_count + u_clusterLights.lights[clusterIndex].spot_count;\n";
        source += `let lightFactor : f32 = f32(lightCount) / f32(${this._maxLightsPerCluster});\n`;
        source +=
          "out.finalColor = mix(vec4<f32>(0.0, 0.0, 1.0, 1.0), vec4<f32>(1.0, 0.0, 0.0, 1.0), vec4<f32>(lightFactor, lightFactor, lightFactor, lightFactor));\n";
        return source;
      });
      encoder.flush();
    }
    WGSLEncoder.endCounter(inputStructCounter);
    return [this._source, this._bindGroupInfo];
  }
}
