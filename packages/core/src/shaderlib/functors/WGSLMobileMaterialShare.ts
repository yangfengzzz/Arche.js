import { WGSLEncoder } from "../WGSLEncoder";
import { ShaderMacroCollection } from "../../shader";

export class WGSLMobileMaterialShare {
  private readonly _outputStructName: string;
  private _blinnPhongStruct: string;

  constructor(outputStructName: string) {
    this._outputStructName = outputStructName;
    this._blinnPhongStruct =
      "struct BlinnPhongData {\n" +
      "  baseColor : vec4<f32>,\n" +
      "  specularColor : vec4<f32>,\n" +
      "  emissiveColor : vec4<f32>,\n" +
      "  normalIntensity : f32,\n" +
      "  shininess : f32 \n" +
      "};\n";
  }

  execute(encoder: WGSLEncoder, macros: ShaderMacroCollection, counterIndex: number) {
    encoder.addStruct(this._blinnPhongStruct);
    encoder.addUniformBinding("u_blinnPhongData", "BlinnPhongData", 0);

    encoder.addUniformBinding("u_alphaCutoff", "f32", 0);

    if (macros.isEnable("HAS_EMISSIVE_TEXTURE")) {
      encoder.addSampledTextureBinding("u_emissiveTexture", "texture_2d<f32>", "u_emissiveSampler", "sampler");
    }

    if (macros.isEnable("HAS_DIFFUSE_TEXTURE")) {
      encoder.addSampledTextureBinding("u_diffuseTexture", "texture_2d<f32>", "u_diffuseSampler", "sampler");
    }

    if (macros.isEnable("HAS_SPECULAR_TEXTURE")) {
      encoder.addSampledTextureBinding("u_specularTexture", "texture_2d<f32>", "u_specularSampler", "sampler");
    }

    if (macros.isEnable("HAS_NORMAL_TEXTURE")) {
      encoder.addSampledTextureBinding("u_normalTexture", "texture_2d<f32>", "u_normalSampler", "sampler");
    }
  }
}
