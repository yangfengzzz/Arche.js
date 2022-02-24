import { WGSLEncoder } from "../../shaderlib";
import { ShaderMacroCollection } from "../../shader/ShaderMacroCollection";
import shadow from "./shadow.wgsl";
import shadow_single from "./shadow_single.wgsl";
import shadow_cube from "./shadow_cube.wgsl";

export class WGSLShadowCommon {
  execute(encoder: WGSLEncoder, macros: ShaderMacroCollection) {
    if (macros.isEnable("SHADOW_MAP_COUNT")) {
      const count = macros.variableMacros("SHADOW_MAP_COUNT");
      if (count === "1") {
        encoder.addStruct(shadow_single);
      } else {
        encoder.addStruct(shadow);
      }
    }

    if (macros.isEnable("CUBE_SHADOW_MAP_COUNT")) {
      encoder.addStruct(shadow_cube);
    }
  }
}
