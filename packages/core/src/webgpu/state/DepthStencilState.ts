export class DepthStencilState implements GPUDepthStencilState {
  format: GPUTextureFormat;
  depthBias?: GPUDepthBias;
  depthBiasClamp?: number;
  depthBiasSlopeScale?: number;
  depthCompare?: GPUCompareFunction;
  depthWriteEnabled?: boolean;
  stencilBack?: StencilFaceState;
  stencilFront?: StencilFaceState;
  stencilReadMask?: GPUStencilValue;
  stencilWriteMask?: GPUStencilValue;
}

export class StencilFaceState implements GPUStencilFaceState {
  compare?: GPUCompareFunction;
  failOp?: GPUStencilOperation;
  depthFailOp?: GPUStencilOperation;
  passOp?: GPUStencilOperation;
}
