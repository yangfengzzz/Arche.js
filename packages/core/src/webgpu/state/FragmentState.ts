export class FragmentState implements GPUFragmentState {
  entryPoint: string;
  module: GPUShaderModule;
  targets: ColorTargetState[] = [];
  constants?: Record<string, GPUPipelineConstantValue> = {};
}

export class ColorTargetState implements GPUColorTargetState {
  format: GPUTextureFormat;
  blend?: BlendState;
  writeMask?: GPUColorWriteFlags;
}

export class BlendState implements GPUBlendState {
  alpha: BlendComponent;
  color: BlendComponent;
}

export class BlendComponent implements GPUBlendComponent {
  operation?: GPUBlendOperation;
  srcFactor?: GPUBlendFactor;
  dstFactor?: GPUBlendFactor;
}
