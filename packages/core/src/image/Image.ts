import {
  Extent3DDict,
  Extent3DDictStrict,
  ImageCopyExternalImage,
  ImageCopyTextureTagged,
  Origin3DDict,
  TextureDescriptor
} from "../webgpu";
import { ImageView } from "./ImageView";
import { murmurhash3_32_gc, TypedArray } from "../base";
import { RefObject } from "../asset";
import { Engine } from "../Engine";

/**
 * @brief Mipmap information
 */
export class Mipmap {
  /// Mipmap level
  level: number = 0;

  /// Byte offset used for uploading
  offset: number = 0;

  /// Width depth and height of the mipmap
  extent = new Extent3DDict();
}

class imageBitmapOptions implements ImageBitmapOptions {
  colorSpaceConversion?: ColorSpaceConversion;
  imageOrientation?: ImageOrientation;
  premultiplyAlpha?: PremultiplyAlpha;
  resizeHeight?: number;
  resizeQuality?: ResizeQuality;
  resizeWidth?: number;
}

export class Image extends RefObject {
  private static _textureDescriptor = new TextureDescriptor();

  private static _imageBitmapOptions = new imageBitmapOptions();
  private static _imageCopyExternalImage: ImageCopyExternalImage = new ImageCopyExternalImage();
  private static _imageCopyTextureTagged = new ImageCopyTextureTagged();
  private static _extent3DDictStrict = new Extent3DDictStrict();

  private _data: TypedArray;
  private _format: GPUTextureFormat;
  private _layers = 1;
  private readonly _mipmaps: Array<Mipmap>;
  // Offsets stored like offsets[array_layer][mipmap_layer]
  private _offsets: Array<Array<number>>;
  private _image_views: Map<number, ImageView>;

  protected _texture: GPUTexture;

  name: string;

  /**
   * Raw Data
   */
  get data(): TypedArray {
    return this._data;
  }

  set data(value: TypedArray) {
    this._data = value;
  }

  /**
   * texture format
   */
  get format(): GPUTextureFormat {
    return this._format;
  }

  set format(format: GPUTextureFormat) {
    this._format = format;
  }

  /**
   * MipMaps
   */
  get mipmaps(): Array<Mipmap> {
    return this._mipmaps;
  }

  /**
   * Extent
   */
  get extent(): Extent3DDict {
    return this._mipmaps[0].extent;
  }

  set width(width: number) {
    this._mipmaps.at(0).extent.width = width;
  }

  set height(height: number) {
    this._mipmaps.at(0).extent.height = height;
  }

  set depth(depth: number) {
    this._mipmaps.at(0).extent.depthOrArrayLayers = depth;
  }

  /**
   * Layers
   */
  get layers(): number {
    return this._layers;
  }

  set layers(layers: number) {
    this._layers = layers;
  }

  /**
   * Offsets
   */
  get offsets(): Array<Array<number>> {
    return this._offsets;
  }

  set offsets(offsets: Array<Array<number>>) {
    this._offsets = offsets;
  }

  get texture(): GPUTexture {
    return this._texture;
  }

  constructor(engine: Engine, name: string) {
    super(engine);
    this.name = name;
  }

  /**
   * Load external image
   * @param element - HTML element
   */
  loadExternalImage(element: HTMLImageElement) {
    this.format = "rgba8unorm";
    this.width = element.width;
    this.height = element.height;
    this.depth = 1;
    this.createTexture();

    const imageBitmapOptions = Image._imageBitmapOptions;
    const levelCount = Math.max(Math.log2(element.width) + 1, Math.log2(element.height) + 1);
    for (let level = 0; level < levelCount; level++) {
      imageBitmapOptions.resizeWidth = Math.max(1, element.width / Math.pow(2, level));
      imageBitmapOptions.resizeHeight = Math.max(1, element.height / Math.pow(2, level));
      createImageBitmap(element, imageBitmapOptions).then((imageSource) => {
        const imageCopyExternalImage = Image._imageCopyExternalImage;
        imageCopyExternalImage.source = imageSource;
        if (imageCopyExternalImage.origin == undefined) {
          imageCopyExternalImage.origin = new Origin3DDict();
        }
        imageCopyExternalImage.origin.x = 0;
        imageCopyExternalImage.origin.y = 0;

        const imageCopyTextureTagged = Image._imageCopyTextureTagged;
        imageCopyTextureTagged.texture = this._texture;
        imageCopyTextureTagged.aspect = "all";
        imageCopyTextureTagged.mipLevel = level;
        imageCopyTextureTagged.premultipliedAlpha = false;

        const extent3DDictStrict = Image._extent3DDictStrict;
        extent3DDictStrict.width = Math.max(1, this.extent.width / Math.pow(2, level));
        extent3DDictStrict.height = Math.max(1, this.extent.height / Math.pow(2, level));

        this._engine.device.queue.copyExternalImageToTexture(
          imageCopyExternalImage,
          imageCopyTextureTagged,
          extent3DDictStrict
        );
      });
    }
  }

  /**
   * Clear data
   */
  clear(): void {
    this._data = null;
  }

  /**
   * Create webgpu texture
   * @param usage - Texture Usage
   */
  createTexture(usage: number = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST) {
    Image._textureDescriptor.label = this.name;
    Image._textureDescriptor.usage = usage;
    Image._textureDescriptor.format = this._format;
    Image._textureDescriptor.size = this._mipmaps.at(0).extent;
    if (this._layers > 1) {
      Image._textureDescriptor.size.depthOrArrayLayers = this._layers;
    }
    Image._textureDescriptor.mipLevelCount = this._mipmaps.length;
    this._texture = this.engine.device.createTexture(Image._textureDescriptor);
  }

  /**
   * Create image view
   * @param view_type - Texture view dimension
   * @param base_mip_level - base mipmap level
   * @param base_array_layer - base array layer
   * @param n_mip_levels - mipmap level count
   * @param n_array_layers - array layer count
   */
  getImageView(
    view_type: GPUTextureViewDimension = "2d",
    base_mip_level: number = 0,
    base_array_layer: number = 0,
    n_mip_levels: number = 0,
    n_array_layers: number = 0
  ): ImageView {
    let key = murmurhash3_32_gc(view_type, 0);
    key = murmurhash3_32_gc(base_mip_level.toString(), key);
    key = murmurhash3_32_gc(base_array_layer.toString(), key);
    key = murmurhash3_32_gc(n_mip_levels.toString(), key);
    key = murmurhash3_32_gc(n_array_layers.toString(), key);

    let view = this._image_views.get(key);
    if (view === undefined) {
      view = new ImageView(this, view_type, base_mip_level, base_array_layer, n_mip_levels, n_array_layers);
      this._image_views.set(key, view);
    }
    return view;
  }

  /**
   * Generate mipmaps
   */
  generateMipmaps(): void {
    // todo
  }

  /**
   * @override
   */
  _onDestroy() {
    this._texture && this._texture.destroy();
  }
}
