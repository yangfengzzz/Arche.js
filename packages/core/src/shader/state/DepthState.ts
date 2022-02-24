import { RenderPipelineDescriptor } from "../../webgpu";

/**
 * Depth state.
 */
export class DepthState {
  /** Whether to enable the depth test. */
  enabled: boolean = true;
  /** Whether the depth value can be written.*/
  writeEnabled: boolean = true;
  /** Depth comparison function. */
  compareFunction: GPUCompareFunction = "less";

  platformApply(pipelineDescriptor: RenderPipelineDescriptor): void {
    const { enabled, compareFunction, writeEnabled } = this;
    const depthStencil = pipelineDescriptor.depthStencil;

    if (enabled) {
      // apply compare func.
      depthStencil.depthCompare = compareFunction;
      // apply to write enabled.
      depthStencil.depthWriteEnabled = writeEnabled;
    }
  }
}
