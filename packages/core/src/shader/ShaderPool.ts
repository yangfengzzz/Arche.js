import { Shader } from "./Shader";
import {
  WGSLBlinnPhongFragment,
  WGSLBlinnPhongVertex,
  WGSLPbrFragment,
  WGSLPbrVertex,
  WGSLUnlitFragment,
  WGSLUnlitVertex
} from "../shaderlib";
import { WGSLShadowVertex } from "../shadow/WGSLShadowVertex";
import { ShaderStage } from "../webgpu";

/**
 * Internal shader pool.
 * @internal
 */
export class ShaderPool {
  static init(): void {
    Shader.create("unlit", new WGSLUnlitVertex(), ShaderStage.VERTEX, new WGSLUnlitFragment());
    Shader.create("blinn-phong", new WGSLBlinnPhongVertex(), ShaderStage.VERTEX, new WGSLBlinnPhongFragment());
    Shader.create("pbr", new WGSLPbrVertex(), ShaderStage.VERTEX, new WGSLPbrFragment(true));
    Shader.create("pbr-specular", new WGSLPbrVertex(), ShaderStage.VERTEX, new WGSLPbrFragment(false));

    Shader.create("shadow", new WGSLShadowVertex(), ShaderStage.VERTEX);
  }
}
