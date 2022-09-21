import { Subpass } from "../Subpass";
import { Scene } from "../../Scene";
import { Camera } from "../../Camera";
import {
  BindGroupDescriptor,
  BindGroupEntry,
  DepthStencilState,
  FragmentState,
  MultisampleState,
  PipelineLayoutDescriptor,
  PrimitiveState,
  RenderPipelineDescriptor,
  VertexState,
  ColorTargetState,
  BindGroupLayout,
  BindGroupLayoutEntry,
  BindGroupLayoutDescriptor,
  ShaderStage
} from "../../webgpu";
import { Engine } from "../../Engine";
import { RenderElement } from "../RenderElement";
import { ShaderMacroCollection } from "../../shader";

export abstract class ForwardSubpass extends Subpass {
  static readonly _compileMacros: ShaderMacroCollection = new ShaderMacroCollection();

  protected _scene: Scene;
  protected _camera: Camera;

  private _forwardPipelineDescriptor: RenderPipelineDescriptor = new RenderPipelineDescriptor();
  private _depthStencilState = new DepthStencilState();
  private _fragment = new FragmentState();
  private _colorTargetState = new ColorTargetState();
  private _primitive = new PrimitiveState();
  private _multisample = new MultisampleState();
  private _vertex = new VertexState();

  private _bindGroupLayoutEntryVecMap: Map<number, Array<BindGroupLayoutEntry>> = new Map<
    number,
    Array<BindGroupLayoutEntry>
  >();
  private _bindGroupLayoutDescriptor = new BindGroupLayoutDescriptor();
  private _bindGroupEntryVecMap: Map<number, Array<BindGroupEntry>> = new Map<number, Array<BindGroupEntry>>();
  private _bindGroupDescriptor = new BindGroupDescriptor();

  private _pipelineLayoutDescriptor = new PipelineLayoutDescriptor();
  private _pipelineLayout: GPUPipelineLayout;

  constructor(engine: Engine) {
    super(engine);
  }

  prepare(): void {
    const {
      _forwardPipelineDescriptor: forwardPipelineDescriptor,
      _depthStencilState: depthStencilState,
      _fragment: fragment,
      _primitive: primitive,
      _multisample: multisample,
      _vertex: vertex,
      _colorTargetState: colorTargetState
    } = this;
    forwardPipelineDescriptor.depthStencil = depthStencilState;
    forwardPipelineDescriptor.fragment = fragment;
    forwardPipelineDescriptor.primitive = primitive;
    forwardPipelineDescriptor.multisample = multisample;
    forwardPipelineDescriptor.vertex = vertex;
    forwardPipelineDescriptor.label = "Forward Pipeline";
    {
      depthStencilState.format = this._engine.renderContext.depthStencilTextureFormat();
      colorTargetState.format = this._engine.renderContext.drawableTextureFormat();

      fragment.targets.length = 1;
      fragment.targets[0] = colorTargetState;

      vertex.entryPoint = "main";
      fragment.entryPoint = "main";
    }
  }

  draw(scene: Scene, camera: Camera, renderPassEncoder: GPURenderPassEncoder): void {
    this._scene = scene;
    this._camera = camera;

    renderPassEncoder.pushDebugGroup("Draw Element");
    this._drawMeshes(renderPassEncoder);
    renderPassEncoder.popDebugGroup();
  }

  abstract _drawMeshes(renderPassEncoder: GPURenderPassEncoder);

  protected _drawElement(renderPassEncoder: GPURenderPassEncoder, item: RenderElement) {
    const compileMacros = ForwardSubpass._compileMacros;

    const { mesh, subMesh, material, renderer, renderState, shaderPass, multiRenderData } = item;
    const {
      _bindGroupLayoutEntryVecMap: bindGroupLayoutEntryVecMap,
      _bindGroupEntryVecMap: bindGroupEntryVecMap,
      _bindGroupDescriptor: bindGroupDescriptor,
      _bindGroupLayoutDescriptor: bindGroupLayoutDescriptor,
      _camera: camera,
      _vertex: vertex
    } = this;
    const device = this._engine.device;

    renderer._updateShaderData(camera.viewMatrix, camera.projectionMatrix);
    // union render global macro and material self macro.
    ShaderMacroCollection.unionCollection(
      camera._globalShaderMacro,
      renderer.shaderData._macroCollection,
      compileMacros
    );
    ShaderMacroCollection.unionCollection(compileMacros, material.shaderData._macroCollection, compileMacros);

    // PSO
    {
      bindGroupLayoutEntryVecMap.clear();
      bindGroupEntryVecMap.clear();

      const shaderProgram = shaderPass._getShaderProgram(this._engine, compileMacros);
      vertex.module = shaderProgram.vertxShader;

      this._scene.shaderData.bindData(
        ShaderStage.VERTEX,
        shaderProgram.computeIntrospection,
        bindGroupLayoutEntryVecMap,
        bindGroupEntryVecMap
      );
      this._camera.shaderData.bindData(
        ShaderStage.VERTEX,
        shaderProgram.computeIntrospection,
        bindGroupLayoutEntryVecMap,
        bindGroupEntryVecMap
      );
      renderer.shaderData.bindData(
        ShaderStage.VERTEX,
        shaderProgram.computeIntrospection,
        bindGroupLayoutEntryVecMap,
        bindGroupEntryVecMap
      );
      material.shaderData.bindData(
        ShaderStage.VERTEX,
        shaderProgram.computeIntrospection,
        bindGroupLayoutEntryVecMap,
        bindGroupEntryVecMap
      );

      if (shaderProgram.fragmentShader) {
        this._fragment.module = shaderProgram.fragmentShader;
        this._scene.shaderData.bindData(
          ShaderStage.FRAGMENT,
          shaderProgram.computeIntrospection,
          bindGroupLayoutEntryVecMap,
          bindGroupEntryVecMap
        );
        this._camera.shaderData.bindData(
          ShaderStage.FRAGMENT,
          shaderProgram.computeIntrospection,
          bindGroupLayoutEntryVecMap,
          bindGroupEntryVecMap
        );
        renderer.shaderData.bindData(
          ShaderStage.FRAGMENT,
          shaderProgram.computeIntrospection,
          bindGroupLayoutEntryVecMap,
          bindGroupEntryVecMap
        );
        material.shaderData.bindData(
          ShaderStage.FRAGMENT,
          shaderProgram.computeIntrospection,
          bindGroupLayoutEntryVecMap,
          bindGroupEntryVecMap
        );
      }

      let bindGroupLayouts: BindGroupLayout[] = [];
      bindGroupLayoutEntryVecMap.forEach((entries, group) => {
        bindGroupLayoutDescriptor.entries = entries;
        const bindGroupLayout = this.engine.device.createBindGroupLayout(bindGroupLayoutDescriptor);

        const bindGroupEntryVec = bindGroupEntryVecMap.get(group);
        bindGroupDescriptor.layout = bindGroupLayout;
        bindGroupDescriptor.entries = bindGroupEntryVec;
        const uniformBindGroup = this.engine.device.createBindGroup(bindGroupDescriptor);
        renderPassEncoder.setBindGroup(group, uniformBindGroup);
        bindGroupLayouts.push(bindGroupLayout);
      });

      this._pipelineLayoutDescriptor.bindGroupLayouts = bindGroupLayouts;
      this._pipelineLayout = device.createPipelineLayout(this._pipelineLayoutDescriptor);
      this._forwardPipelineDescriptor.layout = this._pipelineLayout;

      renderState._apply(this._forwardPipelineDescriptor, renderPassEncoder, false);

      vertex.buffers.length = mesh._vertexBufferLayouts.length;
      for (let j = 0, m = mesh._vertexBufferLayouts.length; j < m; j++) {
        vertex.buffers[j] = mesh._vertexBufferLayouts[j];
      }
      this._forwardPipelineDescriptor.primitive.topology = subMesh.topology;

      const renderPipeline = device.createRenderPipeline(this._forwardPipelineDescriptor);
      renderPassEncoder.setPipeline(renderPipeline);
    }

    for (let j = 0, m = mesh._vertexBufferBindings.length; j < m; j++) {
      renderPassEncoder.setVertexBuffer(j, mesh._vertexBufferBindings[j].buffer);
    }
    const indexBufferBinding = mesh._indexBufferBinding;
    if (indexBufferBinding) {
      renderPassEncoder.setIndexBuffer(indexBufferBinding.buffer.buffer, indexBufferBinding.format);
      renderPassEncoder.drawIndexed(subMesh.count, mesh._instanceCount, subMesh.start, 0, 0);
    } else {
      renderPassEncoder.draw(subMesh.count, mesh._instanceCount);
    }
  }
}
