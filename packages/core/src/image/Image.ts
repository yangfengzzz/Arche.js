import { Extent3DDict, TextureDescriptor } from "../webgpu";
import { ImageView } from "./ImageView";
import { murmurhash3_32_gc } from "../base";

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

export class Image {
  private static _textureDescriptor = new TextureDescriptor();

  private _data: Uint8Array;
  private _format: GPUTextureFormat;
  private _layers = 1;
  private readonly _mipmaps: Array<Mipmap>;
  // Offsets stored like offsets[array_layer][mipmap_layer]
  private _offsets: Array<Array<number>>;
  private _texture: GPUTexture;
  private _image_views: Map<number, ImageView>;

  name: string;

  get data(): Uint8Array {
    return this._data;
  }

  get format(): GPUTextureFormat {
    return this._format;
  }

  get extent(): Extent3DDict {
    return this._mipmaps[0].extent;
  }

  get layers(): number {
    return this._layers;
  }

  get mipmaps(): Array<Mipmap> {
    return this._mipmaps;
  }

  get offsets(): Array<Array<number>> {
    return this._offsets;
  }

  get texture(): GPUTexture {
    return this._texture;
  }

  constructor(name: string, data: Uint8Array, mipmaps: Array<Mipmap>) {
    this.name = name;
    this._data = data;
    this._mipmaps = mipmaps;
  }

  clear(): void {
    this._data = new Uint8Array();
  }

  createTexture(device: GPUDevice, usage: number = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST) {
    Image._textureDescriptor.label = this.name;
    Image._textureDescriptor.usage = usage;
    Image._textureDescriptor.format = this._format;
    Image._textureDescriptor.size = this._mipmaps.at(0).extent;
    if (this._layers > 1) {
      Image._textureDescriptor.size.depthOrArrayLayers = this._layers;
    }
    Image._textureDescriptor.mipLevelCount = this._mipmaps.length;
    this._texture = device.createTexture(Image._textureDescriptor);
  }

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

  generateMipmaps(): void {
    // todo
  }

  /**
   * @internal
   */
  _setData(raw_data: Uint8Array, size: number): void {
    if (this._data.length !== size) {
      this._data = new Uint8Array(size);
      this._data.set(raw_data);
    }
  }

  /**
   * @internal
   */
  _setFormat(format: GPUTextureFormat): void {
    this._format = format;
  }

  /**
   * @internal
   */
  _setWidth(width: number): void {
    this._mipmaps.at(0).extent.width = width;
  }

  /**
   * @internal
   */
  _setHeight(height: number): void {
    this._mipmaps.at(0).extent.height = height;
  }

  /**
   * @internal
   */
  _setDepth(depth: number): void {
    this._mipmaps.at(0).extent.depthOrArrayLayers = depth;
  }

  /**
   * @internal
   */
  _setLayers(layers: number): void {
    this._layers = layers;
  }

  /**
   * @internal
   */
  _setOffsets(offsets: Array<Array<number>>): void {
    this._offsets = offsets;
  }
}
