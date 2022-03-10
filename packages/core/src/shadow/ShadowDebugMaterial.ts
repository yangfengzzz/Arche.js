import { BaseMaterial } from "../material";
import { WGSLShadowDebug } from "./wgsl/WGSLShadowDebug";
import { WGSLBlinnPhongVertex } from "../shaderlib";
import { Engine } from "../Engine";
import { Shader } from "../shader";
import { ShaderStage } from "../webgpu";

export class ShadowDebugMaterial extends BaseMaterial {
  constructor(engine: Engine) {
    super(
      engine,
      Shader.create("shadow_debug_material", new WGSLBlinnPhongVertex(), ShaderStage.VERTEX, new WGSLShadowDebug())
    );
  }
}
