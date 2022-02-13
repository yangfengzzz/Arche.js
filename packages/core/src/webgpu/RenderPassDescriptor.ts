export class RenderPassDescriptor implements GPURenderPassDescriptor {
  label?: string;
  occlusionQuerySet?: GPUQuerySet;
  timestampWrites?: GPURenderPassTimestampWrites;
  depthStencilAttachment?: RenderPassDepthStencilAttachment;
  colorAttachments: RenderPassColorAttachment[] = [];
}

export class RenderPassColorAttachment implements GPURenderPassColorAttachment {
  loadOp: GPULoadOp;
  loadValue: GPULoadOp | GPUColor;
  storeOp: GPUStoreOp;
  view: GPUTextureView;
  resolveTarget?: GPUTextureView;
  clearValue?: GPUColor;
}

export class RenderPassDepthStencilAttachment implements GPURenderPassDepthStencilAttachment {
  depthClearValue?: number;
  depthLoadOp?: GPULoadOp;
  depthLoadValue: GPULoadOp | number;
  depthReadOnly?: boolean;
  depthStoreOp?: GPUStoreOp;
  stencilClearValue?: GPUStencilValue;
  stencilLoadOp?: GPULoadOp;
  stencilLoadValue: GPULoadOp | GPUStencilValue;
  stencilReadOnly?: boolean;
  stencilStoreOp?: GPUStoreOp;
  view: GPUTextureView;
}
