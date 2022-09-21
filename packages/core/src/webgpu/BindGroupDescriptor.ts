export class BindGroupDescriptor implements GPUBindGroupDescriptor {
  label?: string;
  layout: GPUBindGroupLayout;
  entries: BindGroupEntry[] = [];
}

export class BindGroupEntry implements GPUBindGroupEntry {
  private _bufferBinding = new BufferBinding();

  binding: GPUIndex32;
  resource: GPUBindingResource;

  /**
   * Buffer
   */
  get buffer(): GPUBuffer {
    return this._bufferBinding.buffer;
  }

  set buffer(value: GPUBuffer) {
    this._bufferBinding.buffer = value;
    this.resource = this._bufferBinding;
  }

  /**
   * Offset
   */
  get offset(): GPUSize64 {
    return this._bufferBinding.offset;
  }

  set offset(value: GPUSize64) {
    this._bufferBinding.offset = value;
    this.resource = this._bufferBinding;
  }

  /**
   * Size
   */
  get size(): GPUSize64 {
    return this._bufferBinding.size;
  }

  set size(value: GPUSize64) {
    this._bufferBinding.size = value;
    this.resource = this._bufferBinding;
  }

  reset() {
    this.resource = null;
  }
}

export class BufferBinding implements GPUBufferBinding {
  buffer: GPUBuffer;
  offset?: GPUSize64;
  size?: GPUSize64;
}
