import { RefObject } from "../asset";
import { ImageCopyBuffer, ImageCopyTexture, TextureDescriptor, SamplerDescriptor, Origin3DDict } from "../webgpu";
import { Engine } from "../Engine";

/**
 * The base class of texture, contains some common functions of texture-related classes.
 */
export abstract class SampledTexture extends RefObject {
  private static _imageCopyBuffer: ImageCopyBuffer = new ImageCopyBuffer();
  private static _imageCopyTexture: ImageCopyTexture = new ImageCopyTexture();

  name: string;

  protected _platformTexture: GPUTexture;
  protected _platformTextureDesc: TextureDescriptor = new TextureDescriptor();
  protected _platformSampler: GPUSampler;
  protected _platformSamplerDesc: SamplerDescriptor = new SamplerDescriptor();
  protected _dimension: GPUTextureViewDimension;

  protected _isDirty: boolean = false;

  /**
   * The width of the texture.
   */
  get width(): number {
    return this._platformTextureDesc.size.width;
  }

  /**
   * The height of the texture.
   */
  get height(): number {
    return this._platformTextureDesc.size.height;
  }

  /**
   * The depthOrArrayLayers of the texture.
   */
  get depthOrArrayLayers(): number {
    return this._platformTextureDesc.size.depthOrArrayLayers;
  }

  /**
   * Texture mipmapping count.
   */
  get mipmapCount(): number {
    return this._platformTextureDesc.mipLevelCount;
  }

  /**
   * Texture format.
   */
  get format(): GPUTextureFormat {
    return this._platformTextureDesc.format;
  }

  get texture(): GPUTexture {
    return this._platformTexture;
  }

  get sampler(): GPUSampler {
    if (this._isDirty) {
      this._platformSampler = this.engine.device.createSampler(this._platformSamplerDesc);
      this._isDirty = false;
    }
    return this._platformSampler;
  }

  abstract get textureView(): GPUTextureView;

  get textureViewDimension(): GPUTextureViewDimension {
    return this._dimension;
  }

  set textureViewDimension(dim: GPUTextureViewDimension) {
    this._dimension = dim;
  }

  /**
   * Wrapping mode for texture coordinate S.
   */
  get addressModeU(): GPUAddressMode {
    return this._platformSamplerDesc.addressModeU;
  }

  set addressModeU(value: GPUAddressMode) {
    if (value === this._platformSamplerDesc.addressModeU) return;
    this._platformSamplerDesc.addressModeU = value;
    this._isDirty = true;
  }

  /**
   * Wrapping mode for texture coordinate T.
   */
  get addressModeV(): GPUAddressMode {
    return this._platformSamplerDesc.addressModeV;
  }

  set addressModeV(value: GPUAddressMode) {
    if (value === this._platformSamplerDesc.addressModeV) return;
    this._platformSamplerDesc.addressModeV = value;
    this._isDirty = true;
  }

  /**
   * Filter mode for texture.
   */
  get minFilterMode(): GPUFilterMode {
    return this._platformSamplerDesc.minFilter;
  }

  set minFilterMode(value: GPUFilterMode) {
    if (value === this._platformSamplerDesc.minFilter) return;
    this._platformSamplerDesc.minFilter = value;
    this._isDirty = true;
  }

  /**
   * Filter mode for texture.
   */
  get magFilterMode(): GPUFilterMode {
    return this._platformSamplerDesc.magFilter;
  }

  set magFilterMode(value: GPUFilterMode) {
    if (value === this._platformSamplerDesc.magFilter) return;
    this._platformSamplerDesc.magFilter = value;
    this._isDirty = true;
  }

  /**
   * Filter mode for texture.
   */
  get mipmapFilter(): GPUFilterMode {
    return this._platformSamplerDesc.mipmapFilter;
  }

  set mipmapFilter(value: GPUFilterMode) {
    if (value === this._platformSamplerDesc.mipmapFilter) return;
    this._platformSamplerDesc.mipmapFilter = value;
    this._isDirty = true;
  }

  /**
   * Anisotropic level for texture.
   */
  get anisoLevel(): number {
    return this._platformSamplerDesc.maxAnisotropy;
  }

  set anisoLevel(value: number) {
    if (value === this._platformSamplerDesc.maxAnisotropy) return;
    this._platformSamplerDesc.maxAnisotropy = value;
    this._isDirty = true;
  }

  get compareFunction(): GPUCompareFunction {
    return this._platformSamplerDesc.compare;
  }

  set compareFunction(value: GPUCompareFunction) {
    if (value === this._platformSamplerDesc.compare) return;
    this._platformSamplerDesc.compare = value;
    this._isDirty = true;
  }

  protected constructor(engine: Engine) {
    super(engine);
    this.minFilterMode = "linear";
    this.magFilterMode = "linear";
    this.mipmapFilter = "linear";
    this.addressModeU = "repeat";
    this.addressModeV = "repeat";
  }

  /**
   * @override
   */
  _onDestroy() {
    this._platformTexture.destroy();
    this._platformTexture = null;
  }

  /**
   * Get the maximum mip level of the corresponding size:rounding down.
   * @remarks http://download.nvidia.com/developer/Papers/2005/NP2_Mipmapping/NP2_Mipmap_Creation.pdf
   */
  protected _getMaxMiplevel(size: number): number {
    return Math.floor(Math.log2(size));
  }

  protected _getMipmapCount(mipmap: boolean): number {
    return mipmap
      ? Math.floor(Math.log2(Math.max(this._platformTextureDesc.size.width, this._platformTextureDesc.size.height))) + 1
      : 1;
  }

  protected _createImageCopyBuffer(
    buffer: GPUBuffer,
    offset?: number,
    bytesPerRow?: number,
    rowsPerImage?: number
  ): ImageCopyBuffer {
    const imageCopyBuffer = SampledTexture._imageCopyBuffer;
    imageCopyBuffer.buffer = buffer;
    if (offset) {
      imageCopyBuffer.offset = offset;
    }
    if (bytesPerRow) {
      imageCopyBuffer.bytesPerRow = bytesPerRow;
    }
    if (rowsPerImage) {
      imageCopyBuffer.rowsPerImage = rowsPerImage;
    }
    return imageCopyBuffer;
  }

  protected _createImageCopyTexture(
    mipLevel: number,
    origin: Origin3DDict,
    aspect: GPUTextureAspect = "all"
  ): ImageCopyTexture {
    const imageCopyTexture = SampledTexture._imageCopyTexture;
    imageCopyTexture.texture = this._platformTexture;
    imageCopyTexture.mipLevel = mipLevel;
    imageCopyTexture.origin = origin;
    imageCopyTexture.aspect = aspect;
    return imageCopyTexture;
  }
}
