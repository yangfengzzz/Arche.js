import { RenderPass } from "../RenderPass";
import { RenderPassColorAttachment, RenderPassDepthStencilAttachment } from "../../webgpu";
import { ForwardSubpass } from "../subpasses";
import { Engine } from "../../Engine";
import { Scene } from "../../Scene";
import { Camera } from "../../Camera";

export class ForwardRenderPass extends RenderPass {
  private _renderPassColorAttachment = new RenderPassColorAttachment();
  private _renderPassDepthStencilAttachment = new RenderPassDepthStencilAttachment();
  private _engine: Engine;

  constructor(engine: Engine) {
    super();
    this._engine = engine;
    const renderPassDescriptor = this.renderPassDescriptor;
    const renderPassColorAttachment = this._renderPassColorAttachment;
    const renderPassDepthStencilAttachment = this._renderPassDepthStencilAttachment;

    renderPassDescriptor.colorAttachments.push(this._renderPassColorAttachment);
    renderPassDescriptor.depthStencilAttachment = this._renderPassDepthStencilAttachment;
    renderPassColorAttachment.storeOp = "store";
    renderPassColorAttachment.loadOp = "clear";
    renderPassColorAttachment.clearValue = { r: 0.4, g: 0.4, b: 0.4, a: 1.0 };
    renderPassDepthStencilAttachment.depthLoadOp = "clear";
    renderPassDepthStencilAttachment.depthClearValue = 1.0;
    renderPassDepthStencilAttachment.depthStoreOp = "store";
    renderPassDepthStencilAttachment.stencilLoadOp = "clear";
    renderPassDepthStencilAttachment.stencilClearValue = 0.0;
    renderPassDepthStencilAttachment.stencilStoreOp = "store";
    renderPassDepthStencilAttachment.view = engine.renderContext.depthStencilTexture();

    this.addSubpass(new ForwardSubpass(engine));
  }

  draw(scene: Scene, camera: Camera, commandEncoder: GPUCommandEncoder) {
    this._renderPassColorAttachment.view = this._engine.renderContext.currentDrawableTexture();
    super.draw(scene, camera, commandEncoder);
  }
}
