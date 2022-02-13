export class PipelineLayoutDescriptor implements GPUPipelineLayoutDescriptor {
  label?: string;
  bindGroupLayouts: BindGroupLayout[] = [];
}

export class BindGroupLayout implements GPUBindGroupLayout {
  readonly __brand: "GPUBindGroupLayout";
  label: string | null;
}
