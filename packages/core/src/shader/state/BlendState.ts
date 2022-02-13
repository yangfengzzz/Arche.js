import { RenderTargetBlendState } from "./RenderTargetBlendState";
import { Color } from "@arche-engine/math";
import {
  BlendState as WGPUBlendState
} from "../../webgpu/state/FragmentState";
import { RenderPipelineDescriptor } from "../../webgpu";

/**
 * Blend state.
 */
export class BlendState {
  /** The blend state of the render target. */
  readonly targetBlendState: RenderTargetBlendState = new RenderTargetBlendState();
  /** Constant blend color. */
  readonly blendColor: Color = new Color(0, 0, 0, 0);
  /** Whether to use (Alpha-to-Coverage) technology. */
  alphaToCoverage: boolean = false;

  private _blendState: WGPUBlendState = new WGPUBlendState();

  platformApply(pipelineDescriptor: RenderPipelineDescriptor,
                encoder: GPURenderPassEncoder): void {
    const {
      enabled,
      colorBlendOperation,
      alphaBlendOperation,
      sourceColorBlendFactor,
      destinationColorBlendFactor,
      sourceAlphaBlendFactor,
      destinationAlphaBlendFactor,
      colorWriteMask
    } = this.targetBlendState;
    const { fragment, multisample } = pipelineDescriptor;

    if (enabled) {
      fragment.targets[0].blend = this._blendState;
    }

    if (enabled) {
      // apply blend factor.
      this._blendState.color.srcFactor = sourceColorBlendFactor;
      this._blendState.color.dstFactor = destinationColorBlendFactor;
      this._blendState.alpha.srcFactor = sourceAlphaBlendFactor;
      this._blendState.alpha.dstFactor = destinationAlphaBlendFactor;

      // apply blend operation.
      this._blendState.color.operation = colorBlendOperation;
      this._blendState.alpha.operation = alphaBlendOperation;

      // apply blend color.
      encoder.setBlendConstant([this.blendColor.r, this.blendColor.g, this.blendColor.b, this.blendColor.a]);

      // apply color mask.
      fragment.targets[0].writeMask = colorWriteMask;
    }

    // apply alpha to coverage.
    multisample.alphaToCoverageEnabled = this.alphaToCoverage;
  }
}
