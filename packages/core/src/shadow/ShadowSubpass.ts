import { Subpass } from "../rendering";
import { Engine } from "../Engine";
import { Scene } from "../Scene";
import { Camera } from "../Camera";
import { ShadowMaterial } from "./ShadowMaterial";
import { BoundingFrustum, Vector4 } from "@arche-engine/math";
import { ShaderMacroCollection } from "../shader";
import { RenderElement } from "../rendering/RenderElement";
import {
  BindGroupDescriptor,
  BindGroupEntry,
  BindGroupLayout,
  DepthStencilState,
  MultisampleState,
  PipelineLayoutDescriptor,
  PrimitiveState,
  RenderPipelineDescriptor,
  VertexState
} from "../webgpu";
import { Material } from "../material";
import { Renderer } from "../Renderer";
import { Shader } from "../shader";
import { ShaderDataGroup } from "../shader/ShaderDataGroup";
import { ShadowManager } from "./ShadowManager";

export class ShadowSubpass extends Subpass {
  private static _frustum = new BoundingFrustum();

  static readonly _compileMacros: ShaderMacroCollection = new ShaderMacroCollection();

  private _viewport?: Vector4 = undefined;
  private _material: ShadowMaterial;

  private _scene: Scene;
  private _camera: Camera;

  private _opaqueQueue: RenderElement[] = [];
  private _alphaTestQueue: RenderElement[] = [];
  private _transparentQueue: RenderElement[] = [];

  private _shadowGenDescriptor: RenderPipelineDescriptor = new RenderPipelineDescriptor();
  private _depthStencilState = new DepthStencilState();
  private _primitive = new PrimitiveState();
  private _multisample = new MultisampleState();
  private _vertex = new VertexState();

  private _bindGroupDescriptor = new BindGroupDescriptor();
  private _bindGroupEntries: BindGroupEntry[] = [];

  private _pipelineLayoutDescriptor = new PipelineLayoutDescriptor();
  private _pipelineLayout: GPUPipelineLayout;

  set shadowMaterial(mat: ShadowMaterial) {
    this._material = mat;
  }

  set viewport(viewport: Vector4) {
    this._viewport = viewport;
  }

  constructor(engine: Engine) {
    super(engine);
  }

  prepare(): void {
    this._shadowGenDescriptor.depthStencil = this._depthStencilState;
    this._shadowGenDescriptor.primitive = this._primitive;
    this._shadowGenDescriptor.multisample = this._multisample;
    this._shadowGenDescriptor.vertex = this._vertex;
    this._shadowGenDescriptor.label = "Forward Pipeline";
    {
      this._depthStencilState.format = ShadowManager.SHADOW_MAP_FORMAT;
      this._vertex.entryPoint = "main";
    }
  }

  draw(scene: Scene, camera: Camera, renderPassEncoder: GPURenderPassEncoder) {
    this._scene = scene;
    this._camera = camera;

    renderPassEncoder.pushDebugGroup("Draw Element");
    const viewport = this._viewport;
    if (this._viewport) {
      renderPassEncoder.setViewport(
        Math.floor(viewport.x),
        Math.floor(viewport.y),
        Math.floor(viewport.z),
        Math.floor(viewport.w),
        0,
        1
      );
    }
    this._drawMeshes(renderPassEncoder);
    renderPassEncoder.popDebugGroup();
  }

  private _drawMeshes(renderPassEncoder: GPURenderPassEncoder): void {
    this._opaqueQueue = [];
    this._alphaTestQueue = [];
    this._transparentQueue = [];

    ShadowSubpass._frustum.calculateFromMatrix(this._material.viewProjectionMatrix);
    this._engine._componentsManager.callFrustumRender(
      ShadowSubpass._frustum,
      this._opaqueQueue,
      this._alphaTestQueue,
      this._transparentQueue
    );
    this._opaqueQueue.sort(Subpass._compareFromNearToFar);
    this._alphaTestQueue.sort(Subpass._compareFromNearToFar);
    this._transparentQueue.sort(Subpass._compareFromFarToNear);

    this._drawElement(renderPassEncoder, this._opaqueQueue);
    this._drawElement(renderPassEncoder, this._alphaTestQueue);
    this._drawElement(renderPassEncoder, this._transparentQueue);
  }

  private _drawElement(renderPassEncoder: GPURenderPassEncoder, items: RenderElement[]) {
    const compileMacros = ShadowSubpass._compileMacros;

    const material = this._material;
    for (let i = 0, n = items.length; i < n; i++) {
      const { mesh, subMesh, renderer } = items[i];
      if (renderer.castShadows) {
        const camera = this._camera;
        renderer._updateShaderData(camera.viewMatrix, camera.projectionMatrix);

        // union render global macro and material self macro.
        ShaderMacroCollection.unionCollection(
          camera._globalShaderMacro,
          renderer.shaderData._macroCollection,
          compileMacros
        );

        ShaderMacroCollection.unionCollection(compileMacros, material.shaderData._macroCollection, compileMacros);

        const device = this._engine.device;
        // PSO
        {
          const shader = material.shader;
          const program = shader.getShaderProgram(this._engine, compileMacros);
          this._vertex.module = program.vertexShader;

          const bindGroupDescriptor = this._bindGroupDescriptor;
          const bindGroupEntries = this._bindGroupEntries;

          const bindGroupLayoutDescriptors = program.bindGroupLayoutDescriptorMap;
          let bindGroupLayouts: BindGroupLayout[] = [];
          bindGroupLayoutDescriptors.forEach((descriptor, group) => {
            const bindGroupLayout = device.createBindGroupLayout(descriptor);
            this._bindGroupEntries = [];
            bindGroupEntries.length = descriptor.entries.length;
            for (let i = 0, n = descriptor.entries.length; i < n; i++) {
              const entry = descriptor.entries[i];
              bindGroupEntries[i] = new BindGroupEntry(); // cache
              bindGroupEntries[i].binding = entry.binding;
              if (entry.buffer !== undefined) {
                this._bindingData(bindGroupEntries[i], material, renderer);
              }
            }
            bindGroupDescriptor.layout = bindGroupLayout;
            bindGroupDescriptor.entries = bindGroupEntries;
            const uniformBindGroup = device.createBindGroup(bindGroupDescriptor);
            renderPassEncoder.setBindGroup(group, uniformBindGroup);
            bindGroupLayouts.push(bindGroupLayout);
          });
          shader.flush();

          this._pipelineLayoutDescriptor.bindGroupLayouts = bindGroupLayouts;
          this._pipelineLayout = device.createPipelineLayout(this._pipelineLayoutDescriptor);
          this._shadowGenDescriptor.layout = this._pipelineLayout;

          material.renderState._apply(this._shadowGenDescriptor, renderPassEncoder, false);

          this._vertex.buffers.length = mesh._vertexBufferLayouts.length;
          for (let j = 0, m = mesh._vertexBufferLayouts.length; j < m; j++) {
            this._vertex.buffers[j] = mesh._vertexBufferLayouts[j];
          }
          this._shadowGenDescriptor.primitive.topology = subMesh.topology;

          const renderPipeline = device.createRenderPipeline(this._shadowGenDescriptor);
          renderPassEncoder.setPipeline(renderPipeline);
        }

        for (let j = 0, m = mesh._vertexBufferBindings.length; j < m; j++) {
          renderPassEncoder.setVertexBuffer(j, mesh._vertexBufferBindings[j].buffer);
        }
        renderPassEncoder.setIndexBuffer(mesh._indexBufferBinding.buffer.buffer, mesh._indexBufferBinding.format);
        renderPassEncoder.drawIndexed(subMesh.count, 1, subMesh.start, 0, 0);
      }
    }
  }

  _bindingData(entry: BindGroupEntry, mat: Material, renderer: Renderer) {
    const group = Shader.getShaderPropertyGroup(entry.binding);
    if (group != null) {
      switch (group) {
        case ShaderDataGroup.Scene:
          entry.resource = this._scene.shaderData._getDataBuffer(entry.binding);
          break;

        case ShaderDataGroup.Camera:
          entry.resource = this._camera.shaderData._getDataBuffer(entry.binding);
          break;

        case ShaderDataGroup.Renderer:
          entry.resource = renderer.shaderData._getDataBuffer(entry.binding);
          break;

        case ShaderDataGroup.Material:
          entry.resource = mat.shaderData._getDataBuffer(entry.binding);
          break;

        default:
          break;
      }
    }
  }
}
