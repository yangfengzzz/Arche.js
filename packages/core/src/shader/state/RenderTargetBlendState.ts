/**
 * The blend state of the render target.
 */
export class RenderTargetBlendState {
  /** Whether to enable blend. */
  enabled: boolean = false;
  /** color (RGB) blend operation. */
  colorBlendOperation: GPUBlendOperation = "add";
  /** alpha (A) blend operation. */
  alphaBlendOperation: GPUBlendOperation = "add";
  /** color blend factor (RGB) for source. */
  sourceColorBlendFactor: GPUBlendFactor = "one";
  /** alpha blend factor (A) for source. */
  sourceAlphaBlendFactor: GPUBlendFactor = "one";
  /** color blend factor (RGB) for destination. */
  destinationColorBlendFactor: GPUBlendFactor = "zero";
  /** alpha blend factor (A) for destination. */
  destinationAlphaBlendFactor: GPUBlendFactor = "zero";
  /** color mask. */
  colorWriteMask: GPUColorWriteFlags = GPUColorWrite.ALL;
}
