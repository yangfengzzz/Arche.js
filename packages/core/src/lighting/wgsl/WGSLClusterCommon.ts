import { WGSLEncoder } from "../../shaderlib";
import { ShaderMacroCollection } from "../../shader";

export class WGSLForwardPlusUniforms {
  execute(encoder: WGSLEncoder, macros: ShaderMacroCollection) {
    encoder.addStruct(
      "struct ForwardPlusUniforms {\n" +
        "  matrix : mat4x4<f32>,\n" +
        "  inverseMatrix : mat4x4<f32>,\n" +
        "  outputSize : vec2<f32>,\n" +
        "  zNear : f32,\n" +
        "  zFar : f32,\n" +
        "  viewMatrix : mat4x4<f32>,\n" +
        "};\n"
    );
    encoder.addUniformBinding("u_cluster_uniform", "ForwardPlusUniforms");
  }
}
