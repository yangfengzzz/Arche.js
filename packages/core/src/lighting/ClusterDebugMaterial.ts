import { BaseMaterial } from "../material";
import { Engine } from "../Engine";
import { Shader } from "../shader";

export class ClusterDebugMaterial extends BaseMaterial {
  constructor(engine: Engine) {
    super(engine, Shader.find("cluster_debug"));
  }
}
