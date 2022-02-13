import { BindGroupInfo, WGSL } from "./WGSL";
import {
  WGSLCommon,
  WGSLCommonVert
} from "./functors";
import { ShaderMacroCollection } from "../shader/ShaderMacroCollection";

export class WGSLSkyboxVertex extends WGSL {
  private _commonVert: WGSLCommonVert;

  constructor() {
    super();
    this._commonVert = new WGSLCommonVert("VertexIn");
  }

  compile(macros: ShaderMacroCollection): [string, BindGroupInfo] {
    this._source = "";
    this._bindGroupInfo.clear();
    {
      const encoder = this.createSourceEncoder(GPUShaderStage.VERTEX);
      this._commonVert.execute(encoder, macros);
      encoder.addManualUniformBinding("u_mvpNoscale", "mat4x4<f32>", 10, 0);

      encoder.addInoutType("VertexOut", 0, "v_cubeUV", "vec3<f32>");
      encoder.addBuiltInoutType("VertexOut", "position", "position", "vec4<f32>");

      encoder.addEntry([["in", "VertexIn"]], ["out", "VertexOut"], () => {
        let source: string = "";
        source += "out.v_cubeUV = in.Position.xyz;\n";
        source += "out.position = u_mvpNoscale * vec4<f32>( in.Position, 1.0 );\n";
        source += "out.position.z = out.position.w;\n";
        return source;
      });
      encoder.flush();
    }
    return [this._source, this._bindGroupInfo];
  }
}

export class WGSLSkyboxFragment extends WGSL {
  private _common: WGSLCommon;

  constructor() {
    super();
    this._common = new WGSLCommon();
  }

  compile(macros: ShaderMacroCollection): [string, BindGroupInfo] {
    this._source = "";
    this._bindGroupInfo.clear();
    {
      const encoder = this.createSourceEncoder(GPUShaderStage.FRAGMENT);
      this._common.execute(encoder, macros);
      encoder.addManualTextureBinding("u_cubeTexture", "texture_cube<f32>", 0, 0);
      encoder.addManualSamplerBinding("u_cubeSampler", "sampler", 1, 0);
      encoder.addInoutType("VertexOut", 0, "v_cubeUV", "vec3<f32>");
      encoder.addInoutType("Output", 0, "finalColor", "vec4<f32>");

      encoder.addEntry([["in", "VertexOut"]], ["out", "Output"], () => {
        let source: string = "";
        source += "var textureColor = textureSample( u_cubeTexture, u_cubeSampler, in.v_cubeUV );\n";
        source += "out.finalColor = textureColor;\n";
        return source;
      });
      encoder.flush();
    }
    return [this._source, this._bindGroupInfo];
  }
}
