export class BindGroupDescriptor implements GPUBindGroupDescriptor {
  label?: string;
  layout: GPUBindGroupLayout;
  entries: BindGroupEntry[] = [];
}

export class BindGroupEntry implements GPUBindGroupEntry {
  binding: GPUIndex32;
  resource: GPUBindingResource;
}

export class BufferBinding implements GPUBufferBinding {
  buffer: GPUBuffer;
  offset?: GPUSize64;
  size?: GPUSize64;
}
