import { Extent3DDict, TextureDescriptor, CanvasConfiguration } from "../webgpu";

export class RenderContext {
  private _adapter: GPUAdapter;
  private _device: GPUDevice;

  private _size = new Extent3DDict();
  private _configure = new CanvasConfiguration();
  private _context: GPUCanvasContext;

  private _depthStencilDescriptor = new TextureDescriptor();
  private _depthStencilAttachmentView: GPUTextureView;

  get device(): GPUDevice {
    return this._device;
  }

  constructor(adapter: GPUAdapter, device: GPUDevice, context: GPUCanvasContext) {
    this._adapter = adapter;
    this._device = device;
    this._context = context;

    this._size.width = (<HTMLCanvasElement>context.canvas).width;
    this._size.height = (<HTMLCanvasElement>context.canvas).height;
    this._size.depthOrArrayLayers = 1;

    this._configure = new CanvasConfiguration();
    this._configure.device = this._device;
    this._configure.format = this.drawableTextureFormat();
    this._configure.usage = GPUTextureUsage.RENDER_ATTACHMENT;
    this._context.configure(this._configure);

    this._depthStencilDescriptor.dimension = "2d";
    this._depthStencilDescriptor.size = this._size;
    this._depthStencilDescriptor.sampleCount = 1;
    this._depthStencilDescriptor.format = "depth24plus-stencil8";
    this._depthStencilDescriptor.mipLevelCount = 1;
    this._depthStencilDescriptor.usage = GPUTextureUsage.RENDER_ATTACHMENT;
    this._depthStencilAttachmentView = this._device.createTexture(this._depthStencilDescriptor).createView();
  }

  resize(width: number, height: number): void {
    const size = this._size;
    if (size.width != width || size.height != height) {
      this._size.width = width;
      this._size.height = height;
      this._context.configure(this._configure);
      this._depthStencilAttachmentView = this._device.createTexture(this._depthStencilDescriptor).createView();
    }
  }

  currentDrawableTexture(): GPUTextureView {
    return this._context.getCurrentTexture().createView();
  }

  drawableTextureFormat(): GPUTextureFormat {
    return this._context.getPreferredFormat(this._adapter);
  }

  depthStencilTexture(): GPUTextureView {
    return this._depthStencilAttachmentView;
  }

  depthStencilTextureFormat(): GPUTextureFormat {
    return this._depthStencilDescriptor.format;
  }
}
