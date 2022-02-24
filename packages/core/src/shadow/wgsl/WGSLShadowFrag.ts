import { ShaderMacroCollection } from "../../shader/ShaderMacroCollection";

export class WGSLShadowFrag {
  execute(macros: ShaderMacroCollection): string {
    let source = "var shadow:f32 = 0.0;\n";
    source += "var totalShadow:f32 = 0.0;\n";

    if (macros.isEnable("SHADOW_MAP_COUNT")) {
      const count = macros.variableMacros("SHADOW_MAP_COUNT");

      if (count === "1") {
        source +=
          "shadow = shadow + filterPCF(in.v_pos, in.view_pos, u_shadowData[0], u_shadowMap, u_shadowSampler);\n";
        // source +=
        //   "shadow = shadow + textureProj(in.v_pos, in.view_pos, vec2<f32>(0.0, 0.0), u_shadowData[0], u_shadowMap, u_shadowSampler);\n";
      } else {
        source += "{\n";
        source += "var i:i32 = 0;\n";
        source += "loop {\n";
        source += `if (i >= ${count}) {{ break; }}\n`;

        source +=
          "shadow = shadow + filterPCF(in.v_pos, in.view_pos, u_shadowData[i], i, u_shadowMap, u_shadowSampler);\n";
        // source +=
        //   "shadow = shadow + textureProj(in.v_pos, in.view_pos, vec2<f32>(0.0, 0.0), u_shadowData[i], i, u_shadowMap, u_shadowSampler);\n";

        source += "i = i + 1;\n";
        source += "}\n";
        source += "}\n";
      }

      source += `totalShadow = totalShadow + ${count}.0;\n`;
    }

    if (macros.isEnable("CUBE_SHADOW_MAP_COUNT")) {
      const count = macros.variableMacros("CUBE_SHADOW_MAP_COUNT");

      source += "{\n";
      source += "var i:i32 = 0;\n";
      source += "loop {\n";
      source += `if (i >= ${count}) {{ break; }}\n`;

      // source +=
      //   "shadow = shadow + cubeFilterPCF(in.v_pos, u_cubeShadowData[i], i, u_cubeShadowMap, u_cubeShadowSampler);\n"; // too expensive
      source +=
        "shadow = shadow + cubeTextureProj(in.v_pos, vec2<f32>(0.0, 0.0), u_cubeShadowData[i], i, u_cubeShadowMap, u_cubeShadowSampler);\n";

      source += "i = i + 1;\n";
      source += "}\n";
      source += "}\n";

      source += `totalShadow = totalShadow + ${count}.0;\n`;
    }

    if (macros.isEnable("SHADOW_MAP_COUNT") || macros.isEnable("CUBE_SHADOW_MAP_COUNT")) {
      source += "shadow = shadow / totalShadow;\n";
    }

    return source;
  }
}
