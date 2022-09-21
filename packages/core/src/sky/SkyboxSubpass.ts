import { Subpass } from "../rendering";
import { Engine } from "../Engine";
import { Scene } from "../Scene";
import { Camera } from "../Camera";
import { Image } from "../image/Image";
import { ModelMesh } from "../mesh";
import { Buffer } from "../graphic";
import {
  BindGroupDescriptor,
  BindGroupEntry,
  BindGroupLayout,
  BindGroupLayoutDescriptor,
  BindGroupLayoutEntry,
  ColorTargetState,
  DepthStencilState,
  FragmentState,
  MultisampleState,
  PipelineLayoutDescriptor,
  PrimitiveState,
  RenderPipelineDescriptor,
  VertexState,
  BufferBindingLayout,
  TextureBindingLayout,
  SamplerBindingLayout,
  SamplerDescriptor
} from "../webgpu";
import { PrimitiveMesh } from "../mesh";
import { Matrix } from "@arche-engine/math";
import { Shader, ShaderMacroCollection } from "../shader";

export class SkyboxSubpass extends Subpass {
  private static _vpMatrix: Matrix = new Matrix();
  private _type: SkyBoxType;
  private _mesh: ModelMesh;
  private _cubeMap: Image;
  private _vpBuffer: Buffer;

  private _shader: Shader;
  private __samplerDesc = new SamplerDescriptor();
  private _forwardPipelineDescriptor: RenderPipelineDescriptor = new RenderPipelineDescriptor();
  private _depthStencilState = new DepthStencilState();
  private _fragment = new FragmentState();
  private _primitive = new PrimitiveState();
  private _multisample = new MultisampleState();
  private _vertex = new VertexState();

  private _bindGroupLayoutEntry: BindGroupLayoutEntry[] = [];
  private _bindGroupLayoutDescriptor = new BindGroupLayoutDescriptor();
  private _bindGroupLayout: BindGroupLayout;

  private _bindGroupEntries: BindGroupEntry[] = [];
  private _bindGroupDescriptor = new BindGroupDescriptor();

  private _pipelineLayoutDescriptor = new PipelineLayoutDescriptor();
  private _pipelineLayout: GPUPipelineLayout;

  private _renderPipeline: GPURenderPipeline;

  /**
   * Texture cube map of the sky box material.
   */
  get textureCubeMap(): Image {
    return this._cubeMap;
  }

  set textureCubeMap(v: Image) {
    this._cubeMap = v;
  }

  constructor(engine: Engine) {
    super(engine);
    this._vpBuffer = new Buffer(engine, 64, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    this.createCuboid();
    this._shader = Shader.find("skybox");
  }

  createSphere(radius: number) {
    this._mesh = PrimitiveMesh.createSphere(this._engine, radius);
    this._type = SkyBoxType.Sphere;
  }

  createCuboid() {
    this._mesh = PrimitiveMesh.createCuboid(this._engine, 1, 1, 1);
    this._type = SkyBoxType.Cuboid;
  }

  prepare(): void {
    const device = this.engine.device;

    this._forwardPipelineDescriptor.depthStencil = this._depthStencilState;
    this._forwardPipelineDescriptor.fragment = this._fragment;
    this._forwardPipelineDescriptor.primitive = this._primitive;
    this._forwardPipelineDescriptor.multisample = this._multisample;
    this._forwardPipelineDescriptor.vertex = this._vertex;
    this._forwardPipelineDescriptor.label = "Skybox Pipeline";
    // Shader
    {
      const macros = new ShaderMacroCollection();
      const shaderProgram = this._shader.passes[0]._getShaderProgram(this.engine, macros);
      this._vertex.entryPoint = "main";
      this._vertex.module = shaderProgram.vertxShader;
      this._fragment.entryPoint = "main";
      this._fragment.module = shaderProgram.fragmentShader;
    }
    // DepthStencilState
    {
      this._depthStencilState.format = this.engine.renderContext.depthStencilTextureFormat();
      this._depthStencilState.depthWriteEnabled = false;
      this._depthStencilState.depthCompare = "less-equal";
    }
    // FragmentState
    {
      this._fragment.targets.length = 1;
      const colorTargetState = new ColorTargetState();
      colorTargetState.format = this._engine.renderContext.drawableTextureFormat();
      this._fragment.targets[0] = colorTargetState;
    }
    // BindGroupLayout
    {
      this._bindGroupLayoutEntry.length = 3;
      this._bindGroupLayoutEntry[0] = new BindGroupLayoutEntry();
      this._bindGroupLayoutEntry[0].binding = 10;
      this._bindGroupLayoutEntry[0].visibility = GPUShaderStage.VERTEX;
      this._bindGroupLayoutEntry[0].buffer = new BufferBindingLayout();
      this._bindGroupLayoutEntry[0].buffer.type = "uniform";

      this._bindGroupLayoutEntry[1] = new BindGroupLayoutEntry();
      this._bindGroupLayoutEntry[1].binding = 0;
      this._bindGroupLayoutEntry[1].visibility = GPUShaderStage.FRAGMENT;
      this._bindGroupLayoutEntry[1].texture = new TextureBindingLayout();
      this._bindGroupLayoutEntry[1].texture.multisampled = false;
      this._bindGroupLayoutEntry[1].texture.sampleType = "float";
      this._bindGroupLayoutEntry[1].texture.viewDimension = "cube";

      this._bindGroupLayoutEntry[2] = new BindGroupLayoutEntry();
      this._bindGroupLayoutEntry[2].binding = 1;
      this._bindGroupLayoutEntry[2].visibility = GPUShaderStage.FRAGMENT;
      this._bindGroupLayoutEntry[2].sampler = new SamplerBindingLayout();
      this._bindGroupLayoutEntry[2].sampler.type = "filtering";

      this._bindGroupLayoutDescriptor.entries = this._bindGroupLayoutEntry;
      this._bindGroupLayout = device.createBindGroupLayout(this._bindGroupLayoutDescriptor);
    }
    // BindGroup
    {
      this._bindGroupEntries.length = 3;
      this._bindGroupEntries[0] = new BindGroupEntry();
      this._bindGroupEntries[0].binding = 10;
      this._bindGroupEntries[0].resource = this._vpBuffer;
      this._bindGroupEntries[1] = new BindGroupEntry();
      this._bindGroupEntries[1].binding = 0;
      this._bindGroupEntries[2] = new BindGroupEntry();
      this._bindGroupEntries[2].binding = 1;
      this._bindGroupDescriptor.entries = this._bindGroupEntries;
      this._bindGroupDescriptor.layout = this._bindGroupLayout;
    }
    // PipelineLayout
    {
      this._pipelineLayoutDescriptor.bindGroupLayouts = [this._bindGroupLayout];
      this._pipelineLayout = device.createPipelineLayout(this._pipelineLayoutDescriptor);
      this._forwardPipelineDescriptor.layout = this._pipelineLayout;
    }
    // RenderPipeline
    {
      this._forwardPipelineDescriptor.primitive.frontFace = "ccw";
      this._forwardPipelineDescriptor.primitive.cullMode = "front";
      this._forwardPipelineDescriptor.primitive.topology = "triangle-list";
      this._forwardPipelineDescriptor.vertex.buffers = this._mesh._vertexBufferLayouts;
      this._renderPipeline = device.createRenderPipeline(this._forwardPipelineDescriptor);
    }
  }

  draw(scene: Scene, camera: Camera, renderPassEncoder: GPURenderPassEncoder): void {
    renderPassEncoder.pushDebugGroup("Draw Skybox");

    const device = this.engine.device;

    const vpMatrix = SkyboxSubpass._vpMatrix;
    const projectionMatrix = camera.projectionMatrix;
    vpMatrix.copyFrom(camera.viewMatrix);
    if (this._type == SkyBoxType.Cuboid) {
      vpMatrix.elements[12] = 0;
      vpMatrix.elements[13] = 0;
      vpMatrix.elements[14] = 0;
      vpMatrix.elements[15] = 1;
    }

    Matrix.multiply(projectionMatrix, vpMatrix, vpMatrix);
    device.queue.writeBuffer(this._vpBuffer.buffer, 0, vpMatrix.elements, 0, 16);

    this._bindGroupEntries[1].resource = this._cubeMap.getImageView("cube").handle;
    this._bindGroupEntries[2].resource = this.engine._resourceCache.requestSampler(this.__samplerDesc);
    renderPassEncoder.setBindGroup(0, device.createBindGroup(this._bindGroupDescriptor));
    renderPassEncoder.setPipeline(this._renderPipeline);

    const mesh = this._mesh;
    const subMesh = mesh.subMesh;
    for (let j = 0, m = mesh._vertexBufferBindings.length; j < m; j++) {
      renderPassEncoder.setVertexBuffer(j, mesh._vertexBufferBindings[j].buffer);
    }
    renderPassEncoder.setIndexBuffer(mesh._indexBufferBinding.buffer.buffer, mesh._indexBufferBinding.format);
    renderPassEncoder.drawIndexed(subMesh.count, 1, subMesh.start, 0, 0);

    renderPassEncoder.popDebugGroup();
  }
}

enum SkyBoxType {
  Cuboid,
  Sphere
}
