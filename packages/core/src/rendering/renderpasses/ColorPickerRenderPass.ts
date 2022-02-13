import { RenderPass } from "../RenderPass";
import {
  BufferDescriptor,
  Extent3DDict,
  ImageCopyBuffer,
  ImageCopyTexture,
  RenderPassColorAttachment,
  RenderPassDepthStencilAttachment,
  TextureDescriptor
} from "../../webgpu";
import { Engine } from "../../Engine";
import { ColorPickerSubpass } from "../subpasses";
import { Vector2 } from "@oasis-engine/math";
import { Renderer } from "../../Renderer";
import { Mesh } from "../../graphic";
import { Camera } from "../../Camera";
import { Scene } from "../../Scene";

export class ColorPickerRenderPass extends RenderPass {
  private _colorPickerColorAttachments = new RenderPassColorAttachment();
  private _colorPickerDepthStencilAttachment = new RenderPassDepthStencilAttachment();
  private _engine: Engine;
  private _mainCamera: Camera;

  private _colorPickerSubpass: ColorPickerSubpass;
  private _colorPickerTextureDesc = new TextureDescriptor();
  private _colorPickerTexture: GPUTexture;
  private _needPick: boolean = false;
  private _onPick: (renderer: Renderer, mesh: Mesh) => void;
  private _pickPos = new Vector2();

  private _stageBuffer: GPUBuffer;
  private _imageCopyTexture = new ImageCopyTexture();
  private _imageCopyBuffer = new ImageCopyBuffer();
  private _extent = new Extent3DDict();

  /**
   * Set the callback function after pick up.
   * @param {Function} fun Callback function. if there is an renderer selected, the parameter 1 is {component, primitive }, otherwise it is undefined
   */
  set onPick(fun: (renderer: Renderer, mesh: Mesh) => void) {
    this._onPick = fun;
  }

  set mainCamera(camera: Camera) {
    this._mainCamera = camera;
  }

  constructor(engine: Engine) {
    super();
    this._engine = engine;

    const colorPickerTextureDesc = this._colorPickerTextureDesc;
    colorPickerTextureDesc.size = new Extent3DDict();
    colorPickerTextureDesc.size.width = engine.canvas.width;
    colorPickerTextureDesc.size.height = engine.canvas.height;
    colorPickerTextureDesc.format = "bgra8unorm";
    colorPickerTextureDesc.mipLevelCount = 1;
    colorPickerTextureDesc.dimension = "2d";
    colorPickerTextureDesc.usage = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC;
    this._colorPickerTexture = engine.device.createTexture(colorPickerTextureDesc);
    this._colorPickerTexture.label = "ColorPicker Texture";

    const colorPickerColorAttachments = this._colorPickerColorAttachments;
    colorPickerColorAttachments.storeOp = "store";
    colorPickerColorAttachments.loadOp = 'clear';
    colorPickerColorAttachments.clearValue = { r: 1.0, g: 1.0, b: 1.0, a: 1.0 };
    const colorPickerDepthStencilAttachment = this._colorPickerDepthStencilAttachment;
    colorPickerDepthStencilAttachment.depthLoadOp = 'clear';
    colorPickerDepthStencilAttachment.depthClearValue = 1.0;
    colorPickerDepthStencilAttachment.depthStoreOp = "store";
    colorPickerDepthStencilAttachment.stencilLoadOp = 'clear';
    colorPickerDepthStencilAttachment.stencilClearValue= 0.0;
    colorPickerDepthStencilAttachment.stencilStoreOp = "store";
    colorPickerDepthStencilAttachment.view = engine.renderContext.depthStencilTexture();
    this.renderPassDescriptor.colorAttachments.push(colorPickerColorAttachments);
    this.renderPassDescriptor.depthStencilAttachment = colorPickerDepthStencilAttachment;

    this._colorPickerSubpass = new ColorPickerSubpass(engine);
    this.addSubpass(this._colorPickerSubpass);

    const bufferDesc = new BufferDescriptor();
    bufferDesc.usage = GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST;
    bufferDesc.size = 4;
    this._stageBuffer = engine.device.createBuffer(bufferDesc);

    this._imageCopyTexture.texture = this._colorPickerTexture;
    this._imageCopyTexture.mipLevel = 0;
    this._imageCopyTexture.aspect = "all";

    this._imageCopyBuffer.buffer = this._stageBuffer;
    this._imageCopyBuffer.offset = 0;

    this._extent.width = 1;
    this._extent.height = 1;
  }

  /**
   * Pick the object at the screen coordinate position.
   * @param offsetX Relative X coordinate of the canvas
   * @param offsetY Relative Y coordinate of the canvas
   */
  pick(offsetX: number, offsetY: number) {
    this._needPick = true;
    this._pickPos.setValue(offsetX, offsetY);
  }

  draw(scene: Scene, camera: Camera, commandEncoder: GPUCommandEncoder) {
    if (this._needPick && camera === this._mainCamera) {
      this._colorPickerColorAttachments.view = this._colorPickerTexture.createView();
      super.draw(scene, camera, commandEncoder);
      this._copyRenderTargetToBuffer(commandEncoder);
    }
    this._engine.device.queue.onSubmittedWorkDone().then(() => {
      if (this._needPick) {
        this._readColorFromRenderTarget();
        this._needPick = false;
      }
    });
  }

  private _copyRenderTargetToBuffer(commandEncoder: GPUCommandEncoder) {
    const canvas = this._engine.canvas._webCanvas;
    const clientWidth = canvas.clientWidth;
    const clientHeight = canvas.clientHeight;
    const canvasWidth = this._colorPickerTextureDesc.size.width;
    const canvasHeight = this._colorPickerTextureDesc.size.height;

    const px = (this._pickPos.x / clientWidth) * canvasWidth;
    const py = (this._pickPos.y / clientHeight) * canvasHeight;

    const viewport = this._mainCamera.viewport;
    const viewWidth = (viewport.z - viewport.x) * canvasWidth;
    const viewHeight = (viewport.w - viewport.y) * canvasHeight;

    const nx = (px - viewport.x) / viewWidth;
    const ny = (py - viewport.y) / viewHeight;
    const left = Math.floor(nx * (canvasWidth - 1));
    const bottom = Math.floor((1 - ny) * (canvasHeight - 1));

    this._imageCopyTexture.origin = [left, canvasHeight - bottom, 0];
    commandEncoder.copyTextureToBuffer(this._imageCopyTexture, this._imageCopyBuffer, this._extent);
  }

  private _readColorFromRenderTarget() {
    this._stageBuffer.mapAsync(GPUMapMode.READ, 0, 4).then(() => {
      const arrayBuffer = this._stageBuffer.getMappedRange();
      const picker = this._colorPickerSubpass.getObjectByColor(new Uint8Array(arrayBuffer));
      this._onPick(picker[0], picker[1]);
      this._stageBuffer.unmap();
    });
  }

}
