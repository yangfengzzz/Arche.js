import { Subpass } from "../Subpass";
import { Scene } from "../../Scene";
import { Camera } from "../../Camera";
import {
  BindGroupDescriptor,
  BindGroupEntry,
  BindGroupLayout,
  ColorTargetState,
  DepthStencilState,
  FragmentState,
  MultisampleState,
  PipelineLayoutDescriptor,
  PrimitiveState,
  RenderPipelineDescriptor,
  VertexState
} from "../../webgpu";
import { Engine } from "../../Engine";
import { RenderElement } from "../RenderElement";
import { Shader, ShaderDataGroup } from "../../shader";
import { ShaderMacroCollection } from "../../shader";
import { UnlitMaterial } from "../../material";
import { Renderer } from "../../Renderer";
import { Buffer } from "../../graphic";
import { Mesh } from "../../graphic";
import { Logger } from "../../base";

export class ColorPickerSubpass extends Subpass {
  static _color: Float32Array = new Float32Array(4);
  static readonly _compileMacros: ShaderMacroCollection = new ShaderMacroCollection();

  private _material: UnlitMaterial;
  private _bufferPool: Buffer[] = [];
  private _currentId: number = 0;
  private _primitivesMap: Record<number, [Renderer, Mesh]> = [];

  private _scene: Scene;
  private _camera: Camera;
  private _opaqueQueue: RenderElement[] = [];
  private _alphaTestQueue: RenderElement[] = [];
  private _transparentQueue: RenderElement[] = [];

  private _forwardPipelineDescriptor: RenderPipelineDescriptor = new RenderPipelineDescriptor();
  private _depthStencilState = new DepthStencilState();
  private _fragment = new FragmentState();
  private _primitive = new PrimitiveState();
  private _multisample = new MultisampleState();
  private _vertex = new VertexState();

  private _bindGroupDescriptor = new BindGroupDescriptor();
  private _bindGroupEntries: BindGroupEntry[] = [];

  private _pipelineLayoutDescriptor = new PipelineLayoutDescriptor();
  private _pipelineLayout: GPUPipelineLayout;

  constructor(engine: Engine) {
    super(engine);
    this._material = new UnlitMaterial(engine);
  }

  prepare(): void {
    this._forwardPipelineDescriptor.depthStencil = this._depthStencilState;
    this._forwardPipelineDescriptor.fragment = this._fragment;
    this._forwardPipelineDescriptor.primitive = this._primitive;
    this._forwardPipelineDescriptor.multisample = this._multisample;
    this._forwardPipelineDescriptor.vertex = this._vertex;
    this._forwardPipelineDescriptor.label = "Forward Pipeline";
    {
      this._depthStencilState.format = this._engine.renderContext.depthStencilTextureFormat();

      this._fragment.targets.length = 1;
      const colorTargetState = new ColorTargetState();
      colorTargetState.format = this._engine.renderContext.drawableTextureFormat();
      this._fragment.targets[0] = colorTargetState;

      this._vertex.entryPoint = "main";
      this._fragment.entryPoint = "main";
    }
  }

  draw(scene: Scene, camera: Camera, renderPassEncoder: GPURenderPassEncoder): void {
    this._currentId = 0;
    this._primitivesMap = [];

    this._scene = scene;
    this._camera = camera;

    renderPassEncoder.pushDebugGroup("Draw Element");
    renderPassEncoder.setViewport(0, 0, this._engine.canvas.width, this._engine.canvas.height, 0, 1);
    this._drawMeshes(renderPassEncoder);
    renderPassEncoder.popDebugGroup();
  }

  private _drawMeshes(renderPassEncoder: GPURenderPassEncoder): void {
    this._opaqueQueue = [];
    this._alphaTestQueue = [];
    this._transparentQueue = [];
    this._engine._componentsManager.callRender(
      this._camera,
      this._opaqueQueue,
      this._alphaTestQueue,
      this._transparentQueue
    );
    this._opaqueQueue.sort(Subpass._compareFromNearToFar);
    this._alphaTestQueue.sort(Subpass._compareFromNearToFar);
    this._transparentQueue.sort(Subpass._compareFromFarToNear);

    const total = this._opaqueQueue.length + this._alphaTestQueue.length + this._transparentQueue.length;
    const bufferPool = this._bufferPool;
    const oldTotal = bufferPool.length;
    bufferPool.length = total;
    for (let i = oldTotal; i < total; i++) {
      bufferPool[i] = new Buffer(this.engine, 16, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    }

    this._drawElement(renderPassEncoder, this._opaqueQueue);
    this._drawElement(renderPassEncoder, this._alphaTestQueue);
    this._drawElement(renderPassEncoder, this._transparentQueue);
  }

  private _drawElement(renderPassEncoder: GPURenderPassEncoder, items: RenderElement[]) {
    const compileMacros = ColorPickerSubpass._compileMacros;

    for (let i = 0, n = items.length; i < n; i++) {
      const { mesh, subMesh, renderer } = items[i];

      const camera = this._camera;
      renderer._updateShaderData(camera.viewMatrix, camera.projectionMatrix);
      // union render global macro and material self macro.
      ShaderMacroCollection.unionCollection(
        camera._globalShaderMacro,
        renderer.shaderData._macroCollection,
        compileMacros
      );

      this._primitivesMap[this._currentId] = [renderer, mesh];
      const color = this.id2Color(this._currentId);
      const buffer = this._bufferPool[this._currentId];
      buffer.uploadData(color, 0, 0, 4);
      this._currentId += 1;

      const material = this._material;
      const device = this._engine.device;
      // PSO
      {
        const shader = material.shader;
        const program = shader.getShaderProgram(this._engine, compileMacros);
        this._vertex.module = program.vertexShader;
        this._fragment.module = program.fragmentShader;

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
              this._bindingData(bindGroupEntries[i], buffer, renderer);
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
        this._forwardPipelineDescriptor.layout = this._pipelineLayout;

        material.renderState._apply(this._forwardPipelineDescriptor, renderPassEncoder, false);

        this._vertex.buffers.length = mesh._vertexBufferLayouts.length;
        for (let j = 0, m = mesh._vertexBufferLayouts.length; j < m; j++) {
          this._vertex.buffers[j] = mesh._vertexBufferLayouts[j];
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

  _bindingData(entry: BindGroupEntry, buffer: Buffer, renderer: Renderer) {
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
          entry.resource = buffer;
          break;

        default:
          break;
      }
    }
  }

  /**
   * Convert id to RGB color value, 0 and 0xffffff are illegal values.
   */
  id2Color(id: number): Float32Array {
    const color = ColorPickerSubpass._color;
    if (id >= 0xffffff) {
      Logger.warn("Framebuffer Picker encounter primitive's id greater than " + 0xffffff);
      color.fill(0);
      return color;
    }

    color[2] = (id & 0xff) / 255;
    color[1] = ((id & 0xff00) >> 8) / 255;
    color[0] = ((id & 0xff0000) >> 16) / 255;
    return color;
  }

  /**
   * Convert RGB color to id.
   * @param color - Color
   */
  color2Id(color: Uint8Array): number {
    return color[0] | (color[1] << 8) | (color[2] << 16);
  }

  /**
   * Get renderer element by color.
   */
  getObjectByColor(color: Uint8Array): [Renderer, Mesh] {
    const result = this._primitivesMap[this.color2Id(color)];
    if (result === undefined) {
      return [undefined, undefined];
    } else {
      return result;
    }
  }
}
