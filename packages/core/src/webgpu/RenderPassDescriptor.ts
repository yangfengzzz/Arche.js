export class RenderPassDescriptor implements GPURenderPassDescriptor {
  label?: string;
  occlusionQuerySet?: GPUQuerySet;
  timestampWrites?: GPURenderPassTimestampWrites;
  depthStencilAttachment?: RenderPassDepthStencilAttachment;
  colorAttachments: RenderPassColorAttachment[] = [];
}

export class RenderPassColorAttachment implements GPURenderPassColorAttachment {
  loadOp: GPULoadOp;
  storeOp: GPUStoreOp;
  view: GPUTextureView;
  resolveTarget?: GPUTextureView;
  clearValue?: GPUColor;

  /**
   * @deprecated
   */
  loadValue: GPULoadOp | GPUColor;
}

export class RenderPassDepthStencilAttachment implements GPURenderPassDepthStencilAttachment {
  depthClearValue?: number;
  depthLoadOp?: GPULoadOp;
  depthReadOnly?: boolean;
  depthStoreOp?: GPUStoreOp;
  stencilClearValue?: GPUStencilValue;
  stencilLoadOp?: GPULoadOp;
  stencilReadOnly?: boolean;
  stencilStoreOp?: GPUStoreOp;
  view: GPUTextureView;

  /**
   * @deprecated
   */
  depthLoadValue: GPULoadOp | number;
  /**
   * @deprecated
   */
  stencilLoadValue: GPULoadOp | GPUStencilValue;
}
