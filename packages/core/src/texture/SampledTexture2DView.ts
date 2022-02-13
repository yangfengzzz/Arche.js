import { SampledTexture2D } from "./SampledTexture2D";
import { Engine } from "../Engine";

export class SampledTexture2DView extends SampledTexture2D {
  private readonly _creator: () => GPUTextureView;

  constructor(engine: Engine, creator: () => GPUTextureView) {
    super(engine);
    this._creator = creator;
  }

  get textureView(): GPUTextureView {
    return this._creator();
  }
}
