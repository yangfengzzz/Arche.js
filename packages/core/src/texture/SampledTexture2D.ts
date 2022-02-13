import { SampledTexture } from "./SampledTexture";
import { Engine } from "../Engine";
import {
  BufferDescriptor, bytesPerPixel,
  Extent3DDictStrict,
  ImageCopyExternalImage,
  ImageCopyTextureTagged,
  TextureViewDescriptor
} from "../webgpu";
import { Extent3DDict } from "../webgpu";

/**
 * Two-dimensional texture.
 */
export class SampledTexture2D extends SampledTexture {
  private static _textureViewDescriptor: TextureViewDescriptor = new TextureViewDescriptor();
  private static _imageCopyExternalImage: ImageCopyExternalImage = new ImageCopyExternalImage();
  private static _imageCopyTextureTagged = new ImageCopyTextureTagged();
  private static _extent3DDictStrict = new Extent3DDictStrict();
  private static _bufferDescriptor = new BufferDescriptor();

  /**
   * Texture format.
   */
  get format(): GPUTextureFormat {
    return this._platformTextureDesc.format;
  }

  /**
   * Create Texture2D.
   * @param engine - Define the engine to use to render this texture
   * @param width - Texture width
   * @param height - Texture height
   * @param format - Texture format. default  `TextureFormat.R8G8B8A8`
   * @param usage - Texture usage. default  `TEXTURE_BINDING | COPY_DST`
   * @param mipmap - Whether to use multi-level texture
   */
  constructor(
    engine: Engine,
    width: number = 0,
    height: number = 0,
    format: GPUTextureFormat = "rgba8unorm",
    usage: GPUTextureUsageFlags = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    mipmap: boolean = true
  ) {
    super(engine);
    const textureDesc = this._platformTextureDesc;
    textureDesc.size = new Extent3DDict();
    textureDesc.size.width = width;
    textureDesc.size.height = height;
    textureDesc.format = format;
    textureDesc.usage = usage;
    textureDesc.mipLevelCount = this._getMipmapCount(mipmap);
    this._platformTexture = engine.device.createTexture(textureDesc);
  }

  get textureView(): GPUTextureView {
    const textureViewDescriptor = SampledTexture2D._textureViewDescriptor;
    const platformTextureDesc = this._platformTextureDesc;
    textureViewDescriptor.format = platformTextureDesc.format;
    textureViewDescriptor.dimension = "2d";
    textureViewDescriptor.mipLevelCount = platformTextureDesc.mipLevelCount;
    textureViewDescriptor.arrayLayerCount = platformTextureDesc.size.depthOrArrayLayers;
    textureViewDescriptor.aspect = "all";
    return this._platformTexture.createView(textureViewDescriptor);
  }

  /**
   * Setting pixels data through color buffer data, designated area and texture mipmapping level,it's also applicable to compressed formats.
   * @remarks If it is the WebGL1.0 platform and the texture format is compressed, the first upload must be filled with textures.
   * @param colorBuffer - Color buffer data
   * @param mipLevel - Texture mipmapping level
   * @param x - X coordinate of area start
   * @param y - Y coordinate of area start
   * @param width - Data width. if it's empty, width is the width corresponding to mipLevel minus x , width corresponding to mipLevel is Math.max(1, this.width >> mipLevel)
   * @param height - Data height. if it's empty, height is the height corresponding to mipLevel minus y , height corresponding to mipLevel is Math.max(1, this.height >> mipLevel)
   */
  setPixelBuffer(
    colorBuffer: ArrayBufferView,
    mipLevel: number = 0,
    x: number = 0,
    y: number = 0,
    width?: number,
    height?: number
  ): void {
    const device = this.engine.device;

    const descriptor = SampledTexture2D._bufferDescriptor;
    descriptor.size = colorBuffer.byteLength;
    descriptor.usage = GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    const stagingBuffer = device.createBuffer(descriptor);
    device.queue.writeBuffer(stagingBuffer, 0, colorBuffer, 0, colorBuffer.byteLength);

    const imageCopyBuffer = this._createImageCopyBuffer(stagingBuffer, 0, bytesPerPixel(this._platformTextureDesc.format) * width);
    const imageCopyTexture = this._createImageCopyTexture(mipLevel, { x, y });

    const extent3DDictStrict = SampledTexture2D._extent3DDictStrict;
    const size = this._platformTextureDesc.size;
    extent3DDictStrict.width = Math.max(1, size.width / Math.pow(2, mipLevel));
    extent3DDictStrict.height = Math.max(1, size.height / Math.pow(2, mipLevel));

    const encoder = device.createCommandEncoder();
    encoder.copyBufferToTexture(imageCopyBuffer, imageCopyTexture, extent3DDictStrict);
    device.queue.submit([encoder.finish()]);
  }

  /**
   * Setting pixels data through TexImageSource, designated area and texture mipmapping level.
   * @param imageSource - The source of texture
   * @param mipLevel - Texture mipmapping level
   * @param premultiplyAlpha - Whether to premultiply the transparent channel
   * @param x - X coordinate of area start
   * @param y - Y coordinate of area start
   */
  setImageSource(
    imageSource: ImageBitmap | HTMLCanvasElement | OffscreenCanvas,
    mipLevel: number = 0,
    premultiplyAlpha: boolean = false,
    x: number = 0,
    y: number = 0
  ): void {
    const imageCopyExternalImage = SampledTexture2D._imageCopyExternalImage;
    imageCopyExternalImage.source = imageSource;
    imageCopyExternalImage.origin = [x, y];

    const imageCopyTextureTagged = SampledTexture2D._imageCopyTextureTagged;
    imageCopyTextureTagged.texture = this._platformTexture;
    imageCopyTextureTagged.aspect = "all";
    imageCopyTextureTagged.mipLevel = mipLevel;
    imageCopyTextureTagged.premultipliedAlpha = premultiplyAlpha;

    const extent3DDictStrict = SampledTexture2D._extent3DDictStrict;
    const size = this._platformTextureDesc.size;
    extent3DDictStrict.width = Math.max(1, size.width / Math.pow(2, mipLevel));
    extent3DDictStrict.height = Math.max(1, size.height / Math.pow(2, mipLevel));

    this._engine.device.queue.copyExternalImageToTexture(imageCopyExternalImage, imageCopyTextureTagged, extent3DDictStrict);
  }
}
