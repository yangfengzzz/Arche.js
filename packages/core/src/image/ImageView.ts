import { TextureViewDescriptor } from "../webgpu";
import { Image } from "./Image";

export class ImageView {
  private readonly _sampleCount: number = 1;
  private readonly _handle: GPUTextureView;
  private _desc: TextureViewDescriptor = new TextureViewDescriptor();

  constructor(
    image: Image,
    view_type: GPUTextureViewDimension,
    base_mip_level: number,
    base_array_layer: number,
    n_mip_levels: number,
    n_array_layers: number
  ) {
    this._desc.label = image.name;
    this._desc.format = image.format;
    this._desc.dimension = view_type;
    this._desc.baseMipLevel = base_mip_level;
    this._desc.baseArrayLayer = base_array_layer;
    this._desc.mipLevelCount = n_mip_levels == 0 ? image.mipmaps.length : n_mip_levels;
    this._desc.arrayLayerCount = n_array_layers == 0 ? image.layers : n_array_layers;
    this._handle = image.texture.createView(this._desc);
    this._sampleCount = image.texture.sampleCount;
  }

  get format(): GPUTextureFormat {
    return this._desc.format;
  }

  get dimension(): GPUTextureViewDimension {
    return this._desc.dimension;
  }

  get baseMipLevel(): number {
    return this._desc.baseMipLevel;
  }

  get mipLevelCount(): number {
    return this._desc.mipLevelCount;
  }

  get baseArrayLayer(): number {
    return this._desc.baseArrayLayer;
  }

  get arrayLayerCount(): number {
    return this._desc.arrayLayerCount;
  }

  get aspect(): GPUTextureAspect {
    return this._desc.aspect;
  }

  get sampleCount(): number {
    return this._sampleCount;
  }

  get handle(): GPUTextureView {
    return this._handle;
  }
}
