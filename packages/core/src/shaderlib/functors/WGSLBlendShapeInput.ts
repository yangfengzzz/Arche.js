import { WGSLEncoder } from "../WGSLEncoder";
import { ShaderMacroCollection } from "../../shader";

export class WGSLBlendShapeInput {
  private _inputStructName: string;

  constructor(inputStructName: string) {
    this._inputStructName = inputStructName;
  }

  execute(encoder: WGSLEncoder, macros: ShaderMacroCollection, counterIndex: number) {
    const inputStructName = this._inputStructName;
    if (macros.isEnable("HAS_BLENDSHAPE")) {
      if (!macros.isEnable("HAS_BASE_TEXTURE")) {
        encoder.addInoutType(inputStructName, WGSLEncoder.getCounterNumber(counterIndex), "POSITION_BS0", "vec3<f32>");
        encoder.addInoutType(inputStructName, WGSLEncoder.getCounterNumber(counterIndex), "POSITION_BS1", "vec3<f32>");
        encoder.addInoutType(inputStructName, WGSLEncoder.getCounterNumber(counterIndex), "POSITION_BS2", "vec3<f32>");
        encoder.addInoutType(inputStructName, WGSLEncoder.getCounterNumber(counterIndex), "POSITION_BS3", "vec3<f32>");

        if (macros.isEnable("HAS_BLENDSHAPE_NORMAL")) {
          encoder.addInoutType(inputStructName, WGSLEncoder.getCounterNumber(counterIndex), "NORMAL_BS0", "vec3<f32>");
          encoder.addInoutType(inputStructName, WGSLEncoder.getCounterNumber(counterIndex), "NORMAL_BS1", "vec3<f32>");
          encoder.addInoutType(inputStructName, WGSLEncoder.getCounterNumber(counterIndex), "NORMAL_BS2", "vec3<f32>");
          encoder.addInoutType(inputStructName, WGSLEncoder.getCounterNumber(counterIndex), "NORMAL_BS3", "vec3<f32>");
        }

        if (macros.isEnable("HAS_BLENDSHAPE_TANGENT")) {
          encoder.addInoutType(inputStructName, WGSLEncoder.getCounterNumber(counterIndex), "TANGENT_BS0", "vec3<f32>");
          encoder.addInoutType(inputStructName, WGSLEncoder.getCounterNumber(counterIndex), "TANGENT_BS1", "vec3<f32>");
          encoder.addInoutType(inputStructName, WGSLEncoder.getCounterNumber(counterIndex), "TANGENT_BS2", "vec3<f32>");
          encoder.addInoutType(inputStructName, WGSLEncoder.getCounterNumber(counterIndex), "TANGENT_BS3", "vec3<f32>");
        }
      }
      encoder.addUniformBinding("u_blendShapeWeights", "array<f32, 4>", 0);
    }
  }
}
