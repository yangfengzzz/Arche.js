import { SampledTexture } from "./SampledTexture";
import { Engine } from "../Engine";
import { SampledTexture2DView } from "./SampledTexture2DView";
import {
  BufferDescriptor,
  bytesPerPixel,
  Extent3DDict,
  Extent3DDictStrict,
  ImageCopyExternalImage,
  ImageCopyTextureTagged,
  Origin2DDict,
  Origin3DDict,
  TextureViewDescriptor
} from "../webgpu";
import { TextureCubeFace } from "./enums/TextureCubeFace";

export class SampledTextureCube extends SampledTexture {
  private static _textureViewDescriptor: TextureViewDescriptor = new TextureViewDescriptor();
  private static _imageCopyExternalImage: ImageCopyExternalImage = new ImageCopyExternalImage();
  private static _imageCopyTextureTagged = new ImageCopyTextureTagged();
  private static _extent3DDictStrict = new Extent3DDictStrict();
  private static _bufferDescriptor = new BufferDescriptor();
  private static _origin3DDict = new Origin3DDict();
  private static _origin2DDict = new Origin2DDict();

  /**
   * Create TextureCube.
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
    usage: GPUTextureUsageFlags = GPUTextureUsage.RENDER_ATTACHMENT |
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST,
    mipmap: boolean = true
  ) {
    super(engine);
    const textureDesc = this._platformTextureDesc;
    textureDesc.size = new Extent3DDict();
    textureDesc.size.width = width;
    textureDesc.size.height = height;
    textureDesc.size.depthOrArrayLayers = 6;
    textureDesc.format = format;
    textureDesc.usage = usage;
    textureDesc.mipLevelCount = this._getMipmapCount(mipmap);

    this._dimension = "cube";
    this._platformTexture = engine.device.createTexture(textureDesc);
  }

  get textureView(): GPUTextureView {
    const textureViewDescriptor = SampledTextureCube._textureViewDescriptor;
    const platformTextureDesc = this._platformTextureDesc;
    textureViewDescriptor.format = platformTextureDesc.format;
    textureViewDescriptor.dimension = "cube";
    textureViewDescriptor.mipLevelCount = platformTextureDesc.mipLevelCount;
    textureViewDescriptor.arrayLayerCount = platformTextureDesc.size.depthOrArrayLayers;
    textureViewDescriptor.aspect = "all";
    return this._platformTexture.createView(textureViewDescriptor);
  }

  textureView2D(mipmapLevel: number, layer: number): SampledTexture2DView {
    return new SampledTexture2DView(this.engine, () => {
      const textureViewDescriptor = new TextureViewDescriptor();
      textureViewDescriptor.dimension = "2d";
      textureViewDescriptor.format = this._platformTextureDesc.format;
      textureViewDescriptor.baseMipLevel = mipmapLevel;
      textureViewDescriptor.mipLevelCount = 1;
      textureViewDescriptor.baseArrayLayer = layer;
      textureViewDescriptor.arrayLayerCount = 1;
      textureViewDescriptor.aspect = "all";
      return this._platformTexture.createView(textureViewDescriptor);
    });
  }

  /**
   * Setting pixels data through color buffer data, designated area and texture mipmapping level,it's also applicable to compressed formats.
   * @remarks If it is the WebGL1.0 platform and the texture format is compressed, the first upload must be filled with textures.
   * @param face - Cube face
   * @param colorBuffer - Color buffer data
   * @param mipLevel - Texture mipmapping level
   * @param x - X coordinate of area start
   * @param y - Y coordinate of area start
   * @param width - Data width. if it's empty, width is the width corresponding to mipLevel minus x , width corresponding to mipLevel is Math.max(1, this.width >> mipLevel)
   * @param height - Data height. if it's empty, height is the height corresponding to mipLevel minus y , height corresponding to mipLevel is Math.max(1, this.height >> mipLevel)
   */
  setPixelBuffer(
    face: TextureCubeFace,
    colorBuffer: ArrayBufferView,
    mipLevel: number = 0,
    x: number = 0,
    y: number = 0,
    width?: number,
    height?: number
  ): void {
    const device = this.engine.device;

    const descriptor = SampledTextureCube._bufferDescriptor;
    descriptor.size = colorBuffer.byteLength;
    descriptor.usage = GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    const stagingBuffer = device.createBuffer(descriptor);
    device.queue.writeBuffer(stagingBuffer, 0, colorBuffer, 0, colorBuffer.byteLength);

    const imageCopyBuffer = this._createImageCopyBuffer(
      stagingBuffer,
      0,
      bytesPerPixel(this._platformTextureDesc.format) * width
    );
    const origin3DDict = SampledTextureCube._origin3DDict;
    origin3DDict.x = x;
    origin3DDict.y = y;
    origin3DDict.z = face;
    const imageCopyTexture = this._createImageCopyTexture(mipLevel, origin3DDict);

    const extent3DDictStrict = SampledTextureCube._extent3DDictStrict;
    const size = this._platformTextureDesc.size;
    extent3DDictStrict.width = Math.max(1, size.width / Math.pow(2, mipLevel));
    extent3DDictStrict.height = Math.max(1, size.height / Math.pow(2, mipLevel));

    const encoder = device.createCommandEncoder();
    encoder.copyBufferToTexture(imageCopyBuffer, imageCopyTexture, extent3DDictStrict);
    device.queue.submit([encoder.finish()]);
  }

  /**
   * Setting pixels data through cube face, TexImageSource, designated area and texture mipmapping level.
   * @param face - Cube face
   * @param imageSource - The source of texture
   * @param mipLevel - Texture mipmapping level
   * @param premultiplyAlpha - Whether to premultiply the transparent channel
   * @param x - X coordinate of area start
   * @param y - Y coordinate of area start
   */
  setImageSource(
    face: TextureCubeFace,
    imageSource: ImageBitmap | HTMLCanvasElement | OffscreenCanvas,
    mipLevel: number = 0,
    premultiplyAlpha: boolean = false,
    x: number = 0,
    y: number = 0
  ): void {
    const imageCopyExternalImage = SampledTextureCube._imageCopyExternalImage;
    imageCopyExternalImage.source = imageSource;
    const origin2DDict = SampledTextureCube._origin2DDict;
    origin2DDict.x = x;
    origin2DDict.y = y;
    imageCopyExternalImage.origin = origin2DDict;

    const imageCopyTextureTagged = SampledTextureCube._imageCopyTextureTagged;
    imageCopyTextureTagged.texture = this._platformTexture;
    imageCopyTextureTagged.aspect = "all";
    imageCopyTextureTagged.mipLevel = mipLevel;
    const origin3DDict = SampledTextureCube._origin3DDict;
    origin3DDict.x = x;
    origin3DDict.y = y;
    origin3DDict.z = face;
    imageCopyTextureTagged.origin = origin3DDict;
    imageCopyTextureTagged.premultipliedAlpha = premultiplyAlpha;

    const extent3DDictStrict = SampledTextureCube._extent3DDictStrict;
    const size = this._platformTextureDesc.size;
    extent3DDictStrict.width = Math.max(1, size.width / Math.pow(2, mipLevel));
    extent3DDictStrict.height = Math.max(1, size.height / Math.pow(2, mipLevel));

    this._engine.device.queue.copyExternalImageToTexture(
      imageCopyExternalImage,
      imageCopyTextureTagged,
      extent3DDictStrict
    );
  }
}
