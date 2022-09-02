import { WGSLEncoder } from "../WGSLEncoder";
import { ShaderMacroCollection } from "../../shader";

export class WGSLLightFragDefine {
  execute(encoder: WGSLEncoder, macros: ShaderMacroCollection) {
    if (macros.isEnable("DIRECT_LIGHT_COUNT")) {
      encoder.addStruct("struct DirectLight {\n " + " color : vec3<f32>,\n " + "direction : vec3<f32>,\n" + "};\n");
      encoder.addUniformBinding(
        "u_directLight",
        `array<DirectLight, ${macros.variableMacros("DIRECT_LIGHT_COUNT")}>`,
        0
      );
    }

    if (macros.isEnable("POINT_LIGHT_COUNT")) {
      encoder.addStruct(
        "struct PointLight {\n" + "  color : vec3<f32>,\n" + "  position : vec3<f32>,\n" + "  distance : f32\n" + "};\n"
      );
      encoder.addUniformBinding("u_pointLight", `array<PointLight, ${macros.variableMacros("POINT_LIGHT_COUNT")}>`, 0);
    }

    if (macros.isEnable("SPOT_LIGHT_COUNT")) {
      encoder.addStruct(
        "struct SpotLight {\n" +
          "  color : vec3<f32>,\n" +
          "  distance : f32,\n" +
          "  position : vec3<f32>,\n" +
          "  angleCos : f32,\n" +
          "  direction : vec3<f32>,\n" +
          "  penumbraCos : f32\n" +
          "};\n"
      );
      encoder.addUniformBinding("u_spotLight", `array<SpotLight, ${macros.variableMacros("SPOT_LIGHT_COUNT")}>`, 0);
    }

    encoder.addStruct(
      "struct EnvMapLight {\n" +
        "  diffuse : vec3<f32>,\n" +
        "  mipMapLevel : f32,\n" +
        "  diffuseIntensity : f32,\n" +
        "  specularIntensity : f32\n" +
        "};\n"
    );
    encoder.addUniformBinding("u_envMapLight", "EnvMapLight", 0);

    if (macros.isEnable("HAS_SH")) {
      encoder.addUniformBinding("u_env_sh", "vec3<f32>", 0);
    }

    if (macros.isEnable("HAS_DIFFUSE_ENV")) {
      encoder.addSampledTextureBinding("u_env_diffuseTexture", "texture_cube<f32>", "u_env_diffuseSampler", "sampler");
    }

    if (macros.isEnable("HAS_SPECULAR_ENV")) {
      encoder.addSampledTextureBinding(
        "u_env_specularTexture",
        "texture_cube<f32>",
        "u_env_specularSampler",
        "sampler"
      );
    }
  }
}
