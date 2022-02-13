import { Shader } from "./Shader";
import {
  WGSLBlinnPhongFragment,
  WGSLBlinnPhongVertex,
  WGSLPbrFragment,
  WGSLPbrVertex,
  WGSLUnlitFragment,
  WGSLUnlitVertex
} from "../shaderlib";

/**
 * Internal shader pool.
 * @internal
 */
export class ShaderPool {
  static init(): void {
    Shader.create("unlit", new WGSLUnlitVertex(), new WGSLUnlitFragment());
    Shader.create("blinn-phong", new WGSLBlinnPhongVertex(), new WGSLBlinnPhongFragment());
    Shader.create("pbr", new WGSLPbrVertex(), new WGSLPbrFragment(true));
    Shader.create("pbr-specular", new WGSLPbrVertex(), new WGSLPbrFragment(false));
  }
}
