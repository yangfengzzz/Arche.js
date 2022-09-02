import { Shader, ShaderData } from "../shader";
import {
  BindGroupDescriptor,
  BindGroupEntry,
  BindGroupLayout,
  ComputePipelineDescriptor,
  PipelineLayoutDescriptor,
  ProgrammableStage
} from "../webgpu";
import { Engine } from "../Engine";
import { EngineObject } from "../base";
import { DisorderedArray } from "../DisorderedArray";
import { ShaderMacroCollection } from "../shader";

export class ComputePass extends EngineObject {
  static readonly _compileMacros: ShaderMacroCollection = new ShaderMacroCollection();

  private _workgroupCountX: number = 1;
  private _workgroupCountY: number = 1;
  private _workgroupCountZ: number = 1;
  private _data: DisorderedArray<ShaderData> = new DisorderedArray();

  private _source: Shader;
  private _computePipelineDescriptor = new ComputePipelineDescriptor();

  private _bindGroupDescriptor = new BindGroupDescriptor();
  private _bindGroupEntries: BindGroupEntry[] = [];

  private _pipelineLayoutDescriptor = new PipelineLayoutDescriptor();
  private _pipelineLayout: GPUPipelineLayout;

  get workgroupCountX(): number {
    return this._workgroupCountX;
  }

  get workgroupCountY(): number {
    return this._workgroupCountY;
  }

  get workgroupCountZ(): number {
    return this._workgroupCountZ;
  }

  constructor(engine: Engine, source: Shader) {
    super(engine);
    this._source = source;
    this._computePipelineDescriptor.compute = new ProgrammableStage();
    this._computePipelineDescriptor.compute.entryPoint = "main";
  }

  setDispatchCount(workgroupCountX: number, workgroupCountY: number = 1, workgroupCountZ: number = 1): void {
    this._workgroupCountX = workgroupCountX;
    this._workgroupCountY = workgroupCountY;
    this._workgroupCountZ = workgroupCountZ;
  }

  attachShaderData(data: ShaderData) {
    data._index = this._data.length;
    this._data.add(data);
  }

  detachShaderData(data: ShaderData) {
    const replaced = this._data.deleteByIndex(data._index);
    replaced && (replaced._index = data._index);
    data._index = -1;
  }

  /**
   * @brief Compute virtual function
   * @param passEncoder passEncoder to use to record compute commands
   */
  compute(passEncoder: GPUComputePassEncoder): void {
    const data = this._data;
    const compileMacros = ComputePass._compileMacros;
    compileMacros.clear();
    const elements = data._elements;
    for (let i = data.length - 1; i >= 0; --i) {
      const element = elements[i];
      // union render global macro and material self macro.
      ShaderMacroCollection.unionCollection(compileMacros, element._macroCollection, compileMacros);
    }

    const device = this._engine.device;
    // PSO
    {
      const shader = this._source;
      const program = shader.getShaderProgram(this._engine, compileMacros);
      this._computePipelineDescriptor.compute.module = program.computeShader;

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
            this._bindingData(bindGroupEntries[i]);
          } else if (entry.texture !== undefined || entry.storageTexture !== undefined) {
            this._bindingTexture(bindGroupEntries[i]);
          } else if (entry.sampler !== undefined) {
            this._bindingSampler(bindGroupEntries[i]);
          }
        }
        bindGroupDescriptor.layout = bindGroupLayout;
        bindGroupDescriptor.entries = bindGroupEntries;
        const uniformBindGroup = device.createBindGroup(bindGroupDescriptor);
        passEncoder.setBindGroup(group, uniformBindGroup);
        bindGroupLayouts.push(bindGroupLayout);
      });
      shader.flush();

      this._pipelineLayoutDescriptor.bindGroupLayouts = bindGroupLayouts;
      this._pipelineLayout = device.createPipelineLayout(this._pipelineLayoutDescriptor);
      this._computePipelineDescriptor.layout = this._pipelineLayout;
      const computePipeline = device.createComputePipeline(this._computePipelineDescriptor);
      passEncoder.setPipeline(computePipeline);
    }

    passEncoder.dispatchWorkgroups(this._workgroupCountX, this._workgroupCountY, this._workgroupCountZ);
  }

  _bindingData(entry: BindGroupEntry) {
    const data = this._data;
    const elements = data._elements;
    for (let i = data.length - 1; i >= 0; --i) {
      const shaderData = elements[i];
      const buffer = shaderData._getDataBuffer(entry.binding);
      if (buffer) {
        entry.resource = buffer;
      }
    }
  }

  _bindingTexture(entry: BindGroupEntry) {
    const data = this._data;
    const elements = data._elements;
    for (let i = data.length - 1; i >= 0; --i) {
      const shaderData = elements[i];
      const textureView = shaderData.getTextureView(entry.binding);
      if (textureView) {
        entry.resource = textureView;
      }
    }
  }

  _bindingSampler(entry: BindGroupEntry) {
    const data = this._data;
    const elements = data._elements;
    for (let i = data.length - 1; i >= 0; --i) {
      const shaderData = elements[i];
      const sampler = shaderData.getSampler(entry.binding);
      if (sampler) {
        entry.resource = sampler;
      }
    }
  }
}
