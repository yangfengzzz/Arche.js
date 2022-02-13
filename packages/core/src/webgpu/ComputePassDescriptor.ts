export class ComputePassDescriptor implements GPUComputePassDescriptor {
  timestampWrites?: ComputePassTimestampWrite[] = [];
}

export class ComputePassTimestampWrite implements GPUComputePassTimestampWrite {
  location: GPUComputePassTimestampLocation;
  queryIndex: GPUSize32;
  querySet: GPUQuerySet;
}
