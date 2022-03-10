import { ShaderMacroCollection } from "../../shader";

export class WGSLBeginMobileFrag {
  private readonly _input: string;
  private readonly _output: string;

  constructor(input: string, output: string) {
    this._input = input;
    this._output = output;
  }

  execute(macros: ShaderMacroCollection): string {
    const input = this._input;
    let source = "var ambient = vec4<f32>(0.0);\n";
    source += "var emission = u_blinnPhongData.emissiveColor;\n";
    source += "var diffuse = u_blinnPhongData.baseColor;\n";
    source += "var specular = u_blinnPhongData.specularColor;\n";
    if (macros.isEnable("HAS_EMISSIVE_TEXTURE")) {
      source += `var emissiveTextureColor = textureSample(u_emissiveTexture, u_emissiveSampler, ${input}.v_uv);\n`;
      source += "emission = emission * emissiveTextureColor;\n";
    }

    if (macros.isEnable("HAS_DIFFUSE_TEXTURE")) {
      source += `var diffuseTextureColor = textureSample(u_diffuseTexture, u_diffuseSampler, ${input}.v_uv);\n`;
      source += "diffuse = diffuse * diffuseTextureColor;\n";
    }

    if (macros.isEnable("HAS_VERTEXCOLOR")) {
      source += `diffuse = diffuse * ${input}.v_color;\n`;
    }

    if (macros.isEnable("HAS_SPECULAR_TEXTURE")) {
      source += `var specularTextureColor = textureSample(u_specularTexture, u_specularSampler, ${input}.v_uv);\n`;
      source += "specular = specular * specularTextureColor;\n";
    }
    source += "ambient = vec4<f32>(u_envMapLight.diffuse * u_envMapLight.diffuseIntensity, 1.0) * diffuse;\n";
    return source;
  }
}
