import { RenderPipelineDescriptor, StencilFaceState } from "../../webgpu";

/**
 * Stencil state.
 */
export class StencilState {
  /** Whether to enable stencil test. */
  enabled: boolean = false;
  /** Write the reference value of the stencil buffer. */
  referenceValue: number = 0;
  /** Specifying a bit-wise mask that is used to AND the reference value and the stored stencil value when the test is done. */
  mask: number = 0xff;
  /** Specifying a bit mask to enable or disable writing of individual bits in the stencil planes. */
  writeMask: number = 0xff;
  /** The comparison function of the reference value of the front face of the geometry and the current buffer storage value. */
  compareFunctionFront: GPUCompareFunction = "always";
  /** The comparison function of the reference value of the back of the geometry and the current buffer storage value. */
  compareFunctionBack: GPUCompareFunction = "always";
  /** specifying the function to use for front face when both the stencil test and the depth test pass. */
  passOperationFront: GPUStencilOperation = "keep";
  /** specifying the function to use for back face when both the stencil test and the depth test pass. */
  passOperationBack: GPUStencilOperation = "keep";
  /** specifying the function to use for front face when the stencil test fails. */
  failOperationFront: GPUStencilOperation = "keep";
  /** specifying the function to use for back face when the stencil test fails. */
  failOperationBack: GPUStencilOperation = "keep";
  /** specifying the function to use for front face when the stencil test passes, but the depth test fails. */
  zFailOperationFront: GPUStencilOperation = "keep";
  /** specifying the function to use for back face when the stencil test passes, but the depth test fails. */
  zFailOperationBack: GPUStencilOperation = "keep";

  private _stencilFront = new StencilFaceState();
  private _stencilBack = new StencilFaceState();

  platformApply(pipelineDescriptor: RenderPipelineDescriptor,
                encoder: GPURenderPassEncoder): void {
    const {
      enabled,
      referenceValue,
      mask,
      compareFunctionFront,
      compareFunctionBack,
      failOperationFront,
      zFailOperationFront,
      passOperationFront,
      failOperationBack,
      zFailOperationBack,
      passOperationBack,
      writeMask
    } = this;
    const depthStencil = pipelineDescriptor.depthStencil;

    if (enabled) {
      depthStencil.stencilFront = this._stencilFront;
      depthStencil.stencilBack = this._stencilBack;

      encoder.setStencilReference(referenceValue);
      depthStencil.stencilReadMask = mask;
      this._stencilFront.compare = compareFunctionFront;
      this._stencilBack.compare = compareFunctionBack;

      // apply stencil operation.
      this._stencilFront.failOp = failOperationFront;
      this._stencilFront.depthFailOp = zFailOperationFront;
      this._stencilFront.passOp = passOperationFront;

      this._stencilBack.failOp = failOperationBack;
      this._stencilBack.depthFailOp = zFailOperationBack;
      this._stencilBack.passOp = passOperationBack;

      // apply write mask.
      depthStencil.stencilWriteMask = writeMask;
    }
  }
}
