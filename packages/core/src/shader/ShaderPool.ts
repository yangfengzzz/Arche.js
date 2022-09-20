import blinnPhongFs from "../shaderlib/extra/blinn-phong.fs.glsl";
import blinnPhongVs from "../shaderlib/extra/blinn-phong.vs.glsl";
import pbrFs from "../shaderlib/extra/pbr.fs.glsl";
import pbrSpecularFs from "../shaderlib/extra/pbr-specular.fs.glsl";
import shadowMapVs from "../shaderlib/extra/shadow-map.vs.glsl";
import skyboxFs from "../shaderlib/extra/skybox.fs.glsl";
import skyboxVs from "../shaderlib/extra/skybox.vs.glsl";
import unlitFs from "../shaderlib/extra/unlit.fs.glsl";
import unlitVs from "../shaderlib/extra/unlit.vs.glsl";
import { Shader } from "./Shader";
import { ShaderStage } from "../webgpu";

/**
 * Internal shader pool.
 * @internal
 */
export class ShaderPool {
  static init(): void {
    Shader.create("blinn-phong-vert", blinnPhongVs, ShaderStage.VERTEX);
    Shader.create("blinn-phong-frag", blinnPhongFs, ShaderStage.FRAGMENT);

    Shader.create("pbr", pbrFs, ShaderStage.FRAGMENT);
    Shader.create("pbr-specular", pbrSpecularFs, ShaderStage.FRAGMENT);

    Shader.create("unlit-vert", unlitVs, ShaderStage.VERTEX);
    Shader.create("unlit-frag", unlitFs, ShaderStage.FRAGMENT);

    Shader.create("shadow-map", shadowMapVs, ShaderStage.VERTEX);

    Shader.create("skybox-vert", skyboxVs, ShaderStage.VERTEX);
    Shader.create("skybox-frag", skyboxFs, ShaderStage.FRAGMENT);
  }
}
