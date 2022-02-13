export class BindGroupLayoutDescriptor implements GPUBindGroupLayoutDescriptor {
  label?: string;
  entries: BindGroupLayoutEntry[] = [];

  cloneTo(desc: BindGroupLayoutDescriptor): BindGroupLayoutDescriptor {
    desc.label = this.label;
    desc.entries.length = this.entries.length;
    for (let i = 0, n = this.entries.length; i < n; i++) {
      const entry = this.entries[i];
      desc.entries[i] = new BindGroupLayoutEntry();
      entry.cloneTo(desc.entries[i]);
    }
    return desc;
  }
}

export class BindGroupLayoutEntry implements GPUBindGroupLayoutEntry {
  binding: GPUIndex32;
  visibility: GPUShaderStageFlags;
  buffer?: BufferBindingLayout;
  sampler?: SamplerBindingLayout;
  texture?: TextureBindingLayout;
  storageTexture?: StorageTextureBindingLayout;
  externalTexture?: ExternalTextureBindingLayout;

  cloneTo(entry: BindGroupLayoutEntry): BindGroupLayoutEntry {
    const { buffer, sampler, texture, storageTexture, externalTexture } = this;

    entry.binding = this.binding;
    entry.visibility = this.visibility;
    if (buffer !== undefined) {
      entry.buffer = new BufferBindingLayout();
      buffer.cloneTo(entry.buffer);
    }
    if (sampler !== undefined) {
      entry.sampler = new SamplerBindingLayout();
      sampler.cloneTo(entry.sampler);
    }
    if (texture !== undefined) {
      entry.texture = new TextureBindingLayout();
      texture.cloneTo(entry.texture);
    }
    if (storageTexture !== undefined) {
      entry.storageTexture = new StorageTextureBindingLayout();
      storageTexture.cloneTo(entry.storageTexture);
    }
    if (externalTexture !== undefined) {
      entry.externalTexture = new ExternalTextureBindingLayout();
      externalTexture.cloneTo(entry.externalTexture);
    }

    return entry;
  }
}

export class BufferBindingLayout implements GPUBufferBindingLayout {
  type?: GPUBufferBindingType;
  hasDynamicOffset?: boolean;
  minBindingSize?: GPUSize64;

  cloneTo(layout: BufferBindingLayout): BufferBindingLayout {
    layout.type = this.type;
    layout.hasDynamicOffset = this.hasDynamicOffset;
    layout.minBindingSize = this.minBindingSize;
    return layout;
  }
}

export class ExternalTextureBindingLayout implements GPUExternalTextureBindingLayout {
  cloneTo(layout: ExternalTextureBindingLayout): ExternalTextureBindingLayout {
    return layout;
  }
}

export class SamplerBindingLayout implements GPUSamplerBindingLayout {
  type?: GPUSamplerBindingType;

  cloneTo(layout: SamplerBindingLayout): SamplerBindingLayout {
    layout.type = this.type;
    return layout;
  }
}

export class StorageTextureBindingLayout implements GPUStorageTextureBindingLayout {
  format: GPUTextureFormat;
  access?: GPUStorageTextureAccess;
  viewDimension?: GPUTextureViewDimension;

  cloneTo(layout: StorageTextureBindingLayout): StorageTextureBindingLayout {
    layout.format = this.format;
    layout.access = this.access;
    layout.viewDimension = this.viewDimension;
    return layout;
  }
}

export class TextureBindingLayout implements GPUTextureBindingLayout {
  sampleType?: GPUTextureSampleType;
  viewDimension?: GPUTextureViewDimension;
  multisampled?: boolean;

  cloneTo(layout: TextureBindingLayout): TextureBindingLayout {
    layout.sampleType = this.sampleType;
    layout.viewDimension = this.viewDimension;
    layout.multisampled = this.multisampled;
    return layout;
  }
}
