import { ShaderMacroCollection } from "../../shader/ShaderMacroCollection";

export class WGSLSkinningVert {
  private readonly _input: string;
  private readonly _output: string;

  constructor(input: string, output: string) {
    this._input = input;
    this._output = output;
  }

  execute(macros: ShaderMacroCollection): string {
    const input = this._input;
    let source: string = "";
    if (macros.isEnable("HAS_SKIN")) {
      if (macros.isEnable("HAS_JOINT_TEXTURE")) {
        source += `var skinMatrix = ${input}.Weights_0.x * getJointMatrix(u_jointSampler, ${input}.Joints_0.x ) +\n`;
        source += `${input}.Weights_0.y * getJointMatrix(u_jointSampler, ${input}.Joints_0.y ) +\n`;
        source += `${input}.Weights_0.z * getJointMatrix(u_jointSampler, ${input}.Joints_0.z ) +\n`;
        source += `${input}.Weights_0.w * getJointMatrix(u_jointSampler, ${input}.Joints_0.w );\n`;
      } else {
        source += `var skinMatrix = ${input}.Weights_0.x * u_jointMatrix[ i32( ${input}.Joints_0.x ) ] +\n`;
        source += `${input}.Weights_0.y * u_jointMatrix[ i32( ${input}.Joints_0.y ) ] +\n`;
        source += `${input}.Weights_0.z * u_jointMatrix[ i32( ${input}.Joints_0.z ) ] +\n`;
        source += `${input}.Weights_0.w * u_jointMatrix[ i32( ${input}.Joints_0.w ) ];\n`;
      }
      source += "position = skinMatrix * position;\n";
      if (macros.isEnable("HAS_NORMAL") && !macros.isEnable("OMIT_NORMAL")) {
        source += "normal = vec4<f32>( skinMatrix * vec4<f32>( normal, 0.0 ) ).xyz;\n";
        if (macros.isEnable("HAS_TANGENT") && macros.isEnable("HAS_NORMAL_TEXTURE")) {
          source += "tangent.xyz = vec4<f32>( skinMatrix * vec4<f32>( tangent.xyz, 0.0 ) ).xyz;\n";
        }
      }
    }
    return source;
  }
}
