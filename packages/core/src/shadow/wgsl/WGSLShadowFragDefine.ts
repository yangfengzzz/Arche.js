import { WGSLEncoder } from "../../shaderlib";
import { ShaderMacroCollection } from "../../shader/ShaderMacroCollection";

export class WGSLShadowFragDefine {
  execute(encoder: WGSLEncoder, macros: ShaderMacroCollection) {
    if (macros.isEnable("SHADOW_MAP_COUNT")) {
      const count = macros.variableMacros("SHADOW_MAP_COUNT");
      encoder.addUniformBinding("u_shadowData", `array<ShadowData, ${count}>`, 0);
      if (count == "1") {
        encoder.addSampledTextureBinding("u_shadowMap", "texture_depth_2d", "u_shadowSampler", "sampler_comparison");
      } else {
        encoder.addSampledTextureBinding(
          "u_shadowMap",
          "texture_depth_2d_array",
          "u_shadowSampler",
          "sampler_comparison"
        );
      }
    }

    if (macros.isEnable("CUBE_SHADOW_MAP_COUNT")) {
      encoder.addUniformBinding(
        "u_cubeShadowData",
        `array<CubeShadowData, {macros.variableMacros("CUBE_SHADOW_MAP_COUNT")}>`,
        0
      );
      encoder.addSampledTextureBinding(
        "u_cubeShadowMap",
        "texture_depth_cube_array",
        "u_cubeShadowSampler",
        "sampler_comparison"
      );
    }
  }
}
