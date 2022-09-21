export class BindGroupLayoutDescriptor implements GPUBindGroupLayoutDescriptor {
  label?: string;
  entries: BindGroupLayoutEntry[] = [];
}

export class BindGroupLayoutEntry implements GPUBindGroupLayoutEntry {
  binding: GPUIndex32;
  visibility: GPUShaderStageFlags;
  buffer: BufferBindingLayout = new BufferBindingLayout();
  sampler: SamplerBindingLayout = new SamplerBindingLayout();
  texture: TextureBindingLayout = new TextureBindingLayout();
  storageTexture: StorageTextureBindingLayout = new StorageTextureBindingLayout();
  externalTexture: ExternalTextureBindingLayout = new ExternalTextureBindingLayout();

  reset() {
    this.binding = 0;
    this.visibility = 0;
    this.buffer.reset();
    this.sampler.reset();
    this.texture.reset();
    this.storageTexture.reset();
  }
}

export class BufferBindingLayout implements GPUBufferBindingLayout {
  type?: GPUBufferBindingType;
  hasDynamicOffset?: boolean;
  minBindingSize?: GPUSize64;

  reset() {
    this.type = null;
    this.hasDynamicOffset = null;
    this.minBindingSize = null;
  }
}

export class ExternalTextureBindingLayout implements GPUExternalTextureBindingLayout {}

export class SamplerBindingLayout implements GPUSamplerBindingLayout {
  type?: GPUSamplerBindingType;

  reset() {
    this.type = null;
  }
}

export class StorageTextureBindingLayout implements GPUStorageTextureBindingLayout {
  format: GPUTextureFormat;
  access?: GPUStorageTextureAccess;
  viewDimension?: GPUTextureViewDimension;

  reset() {
    this.format = null;
    this.access = null;
    this.viewDimension = null;
  }
}

export class TextureBindingLayout implements GPUTextureBindingLayout {
  sampleType?: GPUTextureSampleType;
  viewDimension?: GPUTextureViewDimension;
  multisampled?: boolean;

  reset() {
    this.sampleType = null;
    this.viewDimension = null;
    this.multisampled = null;
  }
}
