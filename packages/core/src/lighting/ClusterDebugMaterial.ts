import { BaseMaterial } from "../material";
import { Engine } from "../Engine";
import { Shader } from "../shader";
import { WGSLUnlitVertex } from "../shaderlib";
import { ShaderStage } from "../webgpu";
import { WGSLClusterDebug } from "./wgsl/WGSLClusterDebug";
import { LightManager } from "./LightManager";

export class ClusterDebugMaterial extends BaseMaterial {
  constructor(engine: Engine) {
    super(
      engine,
      Shader.create(
        "cluster_debug",
        new WGSLUnlitVertex(),
        ShaderStage.VERTEX,
        new WGSLClusterDebug(LightManager.TILE_COUNT, LightManager.MAX_LIGHTS_PER_CLUSTER)
      )
    );
  }
}
