export class QuerySetDescriptor implements GPUQuerySetDescriptor {
  count: GPUSize32;
  type: GPUQueryType;
  label?: string;
}
