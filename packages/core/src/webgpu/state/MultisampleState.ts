export class MultisampleState implements GPUMultisampleState {
  count?: GPUSize32;
  mask?: GPUSampleMask;
  alphaToCoverageEnabled?: boolean;
}
