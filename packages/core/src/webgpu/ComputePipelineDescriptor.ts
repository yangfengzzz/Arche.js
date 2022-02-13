export class ComputePipelineDescriptor implements GPUComputePipelineDescriptor {
  compute: ProgrammableStage;
  label?: string;
  layout?: GPUPipelineLayout;
}

export class ProgrammableStage implements GPUProgrammableStage {
  constants?: Record<string, GPUPipelineConstantValue> = {};
  entryPoint: string;
  module: GPUShaderModule;
}
