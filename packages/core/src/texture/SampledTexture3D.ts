import { SampledTexture } from "./SampledTexture";
import { Engine } from "../Engine";
import {
  BufferDescriptor,
  bytesPerPixel,
  Extent3DDictStrict,
  ImageCopyExternalImage,
  ImageCopyTextureTagged,
  Origin3DDict,
  TextureViewDescriptor
} from "../webgpu";
import { Extent3DDict } from "../webgpu";

/**
 * Two-dimensional texture.
 */
export class SampledTexture3D extends SampledTexture {
  private static _textureViewDescriptor: TextureViewDescriptor = new TextureViewDescriptor();
  private static _imageCopyExternalImage: ImageCopyExternalImage = new ImageCopyExternalImage();
  private static _imageCopyTextureTagged = new ImageCopyTextureTagged();
  private static _extent3DDictStrict = new Extent3DDictStrict();
  private static _bufferDescriptor = new BufferDescriptor();

  /**
   * Create Texture3D.
   * @param engine - Define the engine to use to render this texture
   * @param width - Texture width
   * @param height - Texture height
   * @param depth - Texture depth or arrayLayers
   * @param format - Texture format. default  `TextureFormat.R8G8B8A8`
   * @param usage - Texture usage. default  `TEXTURE_BINDING | COPY_DST`
   * @param mipmap - Whether to use multi-level texture
   */
  constructor(
    engine: Engine,
    width: number = 0,
    height: number = 0,
    depth: number = 1,
    format: GPUTextureFormat = "rgba8unorm",
    usage: GPUTextureUsageFlags = GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST,
    mipmap: boolean = true
  ) {
    super(engine);
    if (width !== 0) {
      const textureDesc = this._platformTextureDesc;
      textureDesc.size = new Extent3DDict();
      textureDesc.size.width = width;
      textureDesc.size.height = height;
      textureDesc.size.depthOrArrayLayers = depth;
      textureDesc.format = format;
      textureDesc.usage = usage;
      textureDesc.mipLevelCount = this._getMipmapCount(mipmap);

      this._dimension = "3d";
      this._platformTexture = engine.device.createTexture(textureDesc);
    }
  }

  get textureView(): GPUTextureView {
    const textureViewDescriptor = SampledTexture3D._textureViewDescriptor;
    const platformTextureDesc = this._platformTextureDesc;
    textureViewDescriptor.format = platformTextureDesc.format;
    textureViewDescriptor.dimension = this._dimension;
    textureViewDescriptor.mipLevelCount = platformTextureDesc.mipLevelCount;
    textureViewDescriptor.arrayLayerCount = platformTextureDesc.size.depthOrArrayLayers;
    textureViewDescriptor.aspect = "all";
    return this._platformTexture.createView(textureViewDescriptor);
  }
}
