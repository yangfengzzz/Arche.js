export class ShaderModuleDescriptor implements GPUShaderModuleDescriptor {
  code: string;
  label?: string;
  sourceMap?: object;
  hints?: Record<string, ShaderModuleCompilationHint>;
}

export class ShaderModuleCompilationHint implements GPUShaderModuleCompilationHint {
  layout?: GPUPipelineLayout | GPUAutoLayoutMode;
}