import { VertexState, FragmentState, PrimitiveState, DepthStencilState, MultisampleState } from "./state";

export class RenderPipelineDescriptor implements GPURenderPipelineDescriptor {
  label?: string;
  layout?: GPUPipelineLayout;
  depthStencil?: DepthStencilState;
  fragment?: FragmentState;
  multisample?: MultisampleState;
  primitive?: PrimitiveState;
  vertex: VertexState;
}
