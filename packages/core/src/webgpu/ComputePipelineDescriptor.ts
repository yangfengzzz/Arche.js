export class ComputePipelineDescriptor implements GPUComputePipelineDescriptor {
  label?: string;
  compute: ProgrammableStage;
  layout: GPUPipelineLayout | GPUAutoLayoutMode;
}

export class ProgrammableStage implements GPUProgrammableStage {
  constants?: Record<string, GPUPipelineConstantValue> = {};
  entryPoint: string;
  module: GPUShaderModule;
}
