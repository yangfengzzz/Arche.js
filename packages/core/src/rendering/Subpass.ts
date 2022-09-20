import { Scene } from "../Scene";
import { Camera } from "../Camera";
import { RenderPass } from "./RenderPass";
import { EngineObject } from "../base";
import { Engine } from "../Engine";
import { RenderElement } from "./RenderElement";

export abstract class Subpass extends EngineObject {
  protected _pass: RenderPass;

  protected constructor(engine: Engine) {
    super(engine);
  }

  /**
   * @brief Prepares the shaders and shader variants for a subpass
   */
  abstract prepare(): void;

  /**
   * @brief Draw virtual function
   * @param scene
   * @param camera
   * @param renderPassEncoder GPURenderPassEncoder to use to record draw commands
   */
  abstract draw(scene: Scene, camera: Camera, renderPassEncoder: GPURenderPassEncoder);

  setRenderPass(pass: RenderPass): void {
    this._pass = pass;
    this.prepare();
  }

  /**
   * @internal
   */
  static _compareFromNearToFar(a: RenderElement, b: RenderElement): number {
    return (
      a.material.renderQueueType - b.material.renderQueueType ||
      a.renderer._distanceForSort - b.renderer._distanceForSort
    );
  }

  /**
   * @internal
   */
  static _compareFromFarToNear(a: RenderElement, b: RenderElement): number {
    return (
      a.material.renderQueueType - b.material.renderQueueType ||
      b.renderer._distanceForSort - a.renderer._distanceForSort
    );
  }
}
