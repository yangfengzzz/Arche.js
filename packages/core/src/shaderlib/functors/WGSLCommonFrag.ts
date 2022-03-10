import { WGSLEncoder } from "../WGSLEncoder";
import { ShaderMacroCollection } from "../../shader";

export class WGSLCommonFrag {
  private _inputStructName: string;
  private _cameraStruct: string;
  private _rendererStruct: string;

  constructor(inputStructName: string) {
    this._inputStructName = inputStructName;

    this._cameraStruct = "struct CameraData {\n";
    this._cameraStruct += " u_viewMat: mat4x4<f32>;\n";
    this._cameraStruct += " u_projMat: mat4x4<f32>;\n";
    this._cameraStruct += " u_VPMat: mat4x4<f32>;\n";
    this._cameraStruct += " u_viewInvMat: mat4x4<f32>;\n";
    this._cameraStruct += " u_projInvMat: mat4x4<f32>;\n";
    this._cameraStruct += " u_cameraPos: vec3<f32>;\n";
    this._cameraStruct += "}\n";

    this._rendererStruct = "struct RendererData {\n";
    this._rendererStruct += " u_localMat: mat4x4<f32>;\n";
    this._rendererStruct += " u_modelMat: mat4x4<f32>;\n";
    this._rendererStruct += " u_MVMat: mat4x4<f32>;\n";
    this._rendererStruct += " u_MVPMat: mat4x4<f32>;\n";
    this._rendererStruct += " u_MVInvMat: mat4x4<f32>;\n";
    this._rendererStruct += " u_normalMat: mat4x4<f32>;\n";
    this._rendererStruct += "}\n";
  }

  execute(encoder: WGSLEncoder, macros: ShaderMacroCollection) {
    encoder.addStruct(this._cameraStruct);
    encoder.addUniformBinding("u_cameraData", "CameraData", 0);
    encoder.addStruct(this._rendererStruct);
    encoder.addUniformBinding("u_rendererData", "RendererData", 0);
  }
}
