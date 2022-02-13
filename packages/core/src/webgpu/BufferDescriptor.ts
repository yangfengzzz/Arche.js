export class BufferDescriptor implements GPUBufferDescriptor {
  label?: string;
  mappedAtCreation?: boolean;
  size: GPUSize64;
  usage: GPUBufferUsageFlags;
}
