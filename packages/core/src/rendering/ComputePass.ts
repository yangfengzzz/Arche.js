import { Shader, ShaderData } from "../shader";
import {
  BindGroupDescriptor,
  BindGroupEntry,
  BindGroupLayout,
  BindGroupLayoutDescriptor,
  BindGroupLayoutEntry,
  ComputePipelineDescriptor,
  PipelineLayoutDescriptor,
  ProgrammableStage,
  ShaderStage
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

  private _shader: Shader;
  private _computePipelineDescriptor = new ComputePipelineDescriptor();

  private _pipelineLayoutDescriptor = new PipelineLayoutDescriptor();
  private _pipelineLayout: GPUPipelineLayout;

  private _bindGroupLayoutEntryVecMap: Map<number, Array<BindGroupLayoutEntry>> = new Map();
  private _bindGroupLayoutDescriptor = new BindGroupLayoutDescriptor();
  private _bindGroupEntryVecMap: Map<number, Array<BindGroupEntry>> = new Map();
  private _bindGroupDescriptor = new BindGroupDescriptor();

  get workgroupCountX(): number {
    return this._workgroupCountX;
  }

  get workgroupCountY(): number {
    return this._workgroupCountY;
  }

  get workgroupCountZ(): number {
    return this._workgroupCountZ;
  }

  constructor(engine: Engine, shader: Shader) {
    super(engine);
    this._shader = shader;
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

    const bindGroupLayoutEntryVecMap = this._bindGroupLayoutEntryVecMap;
    const bindGroupEntryVecMap = this._bindGroupEntryVecMap;
    const device = this._engine.device;
    const passes = this._shader.passes;
    for (let i = 0; i < passes.length; i++) {
      const pass = passes[i];
      const shaderProgram = pass._getShaderProgram(this._engine, compileMacros);

      this._computePipelineDescriptor.compute.module = shaderProgram.computeShader;
      bindGroupLayoutEntryVecMap.clear();
      bindGroupEntryVecMap.clear();
      const elements = data._elements;
      for (let i = data.length - 1; i >= 0; --i) {
        const shaderData = elements[i];
        shaderData.bindData(
          ShaderStage.COMPUTE,
          shaderProgram.computeIntrospection,
          bindGroupLayoutEntryVecMap,
          bindGroupEntryVecMap
        );
      }

      const bindGroupDescriptor = this._bindGroupDescriptor;
      const bindGroupLayoutDescriptor = this._bindGroupLayoutDescriptor;
      let bindGroupLayouts: BindGroupLayout[] = [];
      bindGroupLayoutEntryVecMap.forEach((entries, group) => {
        bindGroupLayoutDescriptor.entries = entries;
        const bindGroupLayout = this.engine.device.createBindGroupLayout(bindGroupLayoutDescriptor);

        const bindGroupEntryVec = bindGroupEntryVecMap.get(group);
        bindGroupDescriptor.layout = bindGroupLayout;
        bindGroupDescriptor.entries = bindGroupEntryVec;
        const uniformBindGroup = this.engine.device.createBindGroup(bindGroupDescriptor);
        passEncoder.setBindGroup(group, uniformBindGroup);
        bindGroupLayouts.push(bindGroupLayout);
      });

      this._pipelineLayoutDescriptor.bindGroupLayouts = bindGroupLayouts;
      this._pipelineLayout = device.createPipelineLayout(this._pipelineLayoutDescriptor);
      this._computePipelineDescriptor.layout = this._pipelineLayout;
      const computePipeline = device.createComputePipeline(this._computePipelineDescriptor);
      passEncoder.setPipeline(computePipeline);
      passEncoder.dispatchWorkgroups(this._workgroupCountX, this._workgroupCountY, this._workgroupCountZ);

      for (let i = data.length - 1; i >= 0; --i) {
        elements[i].resetPool();
      }
    }
  }
}
