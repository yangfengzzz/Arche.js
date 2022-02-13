import { RenderPassDescriptor } from "../webgpu";
import { Subpass } from "./Subpass";
import { Scene } from "../Scene";
import { Camera } from "../Camera";

export class RenderPass {
  renderPassDescriptor = new RenderPassDescriptor();

  private _subpasses: Subpass[] = [];
  private _activeSubpassIndex: number = 0;

  get subpasses(): Subpass[] {
    return this._subpasses;
  }

  /**
   * @return Subpass currently being recorded, or the first one
   *         if drawing has not started
   */
  get activeSubpass(): Subpass {
    return this._subpasses[this._activeSubpassIndex];
  }

  /**
   * @brief Appends a subpass to the pipeline
   * @param subpass Subpass to append
   */
  addSubpass(subpass: Subpass): void {
    subpass.setRenderPass(this);
    this._subpasses.push(subpass);
  }

  draw(scene: Scene, camera: Camera, commandEncoder: GPUCommandEncoder) {
    const renderPassEncoder = commandEncoder.beginRenderPass(this.renderPassDescriptor);
    for (let i: number = 0; i < this._subpasses.length; ++i) {
      this._activeSubpassIndex = i;
      this._subpasses[i].draw(scene, camera, renderPassEncoder);
    }
    this._activeSubpassIndex = 0;
    renderPassEncoder.endPass();
  }
}
