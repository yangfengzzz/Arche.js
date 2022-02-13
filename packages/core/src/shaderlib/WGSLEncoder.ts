import {
  Attributes, attributesString, bindingType, BuiltInType, isMultisampled,
  SamplerType, sampleType,
  StorageTextureType, storageTextureViewDimension,
  TextureType, textureViewDimension,
  UniformType
} from "./WGSLCommon";
import { BindGroupInfo, BindGroupLayoutEntryMap, WGSL } from "./WGSL";
import { Shader } from "../shader";
import {
  BindGroupLayoutEntry,
  BufferBindingLayout,
  SamplerBindingLayout,
  StorageTextureBindingLayout,
  TextureBindingLayout
} from "../webgpu";

export class WGSLEncoder {
  private static _counters: number[] = [];

  private _wgsl: WGSL;
  private _currentStage: number;

  private _source: string;
  private _bindGroupInfo: BindGroupInfo = new Map<number, Set<number>>();
  private _bindGroupLayoutEntryMap: BindGroupLayoutEntryMap = new Map<number, Map<number, BindGroupLayoutEntry>>();
  private _needFlush: boolean = false;

  private _structBlock: string = "";
  private _uniformBlock: string = "";
  private _functionBlock: string = "";
  private _inoutType: Map<string, string[]> = new Map<string, string[]>();
  private _entryBlock: string = "";

  static startCounter(initVal: number = Attributes.TOTAL_COUNT): number {
    const counters = this._counters;
    for (let i = 0, n = counters.length; i < n; i++) {
      if (counters[i] == -1) {
        counters[i] = initVal;
        return i;
      }
    }

    counters.push(initVal);
    return counters.length - 1;
  }

  static getCounterNumber(index: number): number {
    return this._counters[index]++;
  }

  static endCounter(index: number) {
    this._counters[index] = -1;
  }

  addStruct(code: string) {
    this._structBlock += code;
    this._needFlush = true;
  }

  addFunction(code: string) {
    this._functionBlock += code;
    this._needFlush = true;
  }

  addUniformBinding(uniformName: string, type: string, group: number);

  addUniformBinding(uniformName: string, type: UniformType, group: number);

  addUniformBinding(uniformName: string, type: string, group: number = 0) {
    const property = Shader.getPropertyByName(uniformName);
    if (property !== null) {
      this.addManualUniformBinding(uniformName, type, property._uniqueId, group);
    } else {
      throw  "Unknown Uniform Name";
    }
  }

  addManualUniformBinding(uniformName: string, type: string, binding: number, group: number = 0) {
    this._uniformBlock += `@group(${group.toString()}) @binding(${binding.toString()})\n var<uniform> ${uniformName}: ${type};\n `;
    const entry = new BindGroupLayoutEntry();
    entry.binding = binding;
    entry.visibility = this._currentStage;
    entry.buffer = new BufferBindingLayout();
    entry.buffer.type = "uniform";

    const bindGroupLayoutEntryMap = this._bindGroupLayoutEntryMap;
    if (!bindGroupLayoutEntryMap.has(group)) {
      bindGroupLayoutEntryMap.set(group, new Map<number, BindGroupLayoutEntry>());
      bindGroupLayoutEntryMap.get(group).set(binding, entry);
    } else {
      if (!bindGroupLayoutEntryMap.get(group).has(binding)) {
        bindGroupLayoutEntryMap.get(group).set(binding, entry);
      }
    }
    if (!this._bindGroupInfo.has(group)) {
      this._bindGroupInfo.set(group, new Set<number>());
    }
    this._bindGroupInfo.get(group).add(binding);
    this._needFlush = true;
  }

  addSampledTextureBinding(texName: string, texType: TextureType,
                           samplerName: string, samplerType: SamplerType,
                           group: number = 0) {
    const texProperty = Shader.getPropertyByName(texName);
    const samplerProperty = Shader.getPropertyByName(samplerName);
    if (texProperty != undefined && samplerProperty != undefined) {
      const texBinding = texProperty._uniqueId;
      this.addManualTextureBinding(texName, texType, texBinding, group);

      const samplerBinding = samplerProperty._uniqueId;
      this.addManualSamplerBinding(samplerName, samplerType, samplerBinding, group);
    } else {
      throw  "Unknown Uniform Name";
    }
  }

  addManualTextureBinding(texName: string, texType: TextureType, texBinding: number, group: number = 0) {
    this._uniformBlock += `@group(${group}) @binding(${texBinding}) 
            var ${texName}: ${texType};\n `;

    const bindGroupLayoutEntryMap = this._bindGroupLayoutEntryMap;
    // Texture
    {
      const entry = new BindGroupLayoutEntry();
      entry.binding = texBinding;
      entry.visibility = this._currentStage;
      entry.texture = new TextureBindingLayout();
      entry.texture.multisampled = isMultisampled(texType);
      entry.texture.viewDimension = textureViewDimension(texType);
      entry.texture.sampleType = sampleType(texType);
      if (!bindGroupLayoutEntryMap.has(group)) {
        bindGroupLayoutEntryMap.set(group, new Map<number, BindGroupLayoutEntry>());
        bindGroupLayoutEntryMap.get(group).set(texBinding, entry);
      } else {
        if (!bindGroupLayoutEntryMap.get(group).has(texBinding)) {
          bindGroupLayoutEntryMap.get(group).set(texBinding, entry);
        }
      }
      if (!this._bindGroupInfo.has(group)) {
        this._bindGroupInfo.set(group, new Set<number>());
      }
      this._bindGroupInfo.get(group).add(texBinding);
    }
    this._needFlush = true;
  }

  addManualSamplerBinding(samplerName: string, samplerType: SamplerType, samplerBinding: number, group: number = 0) {
    this._uniformBlock += `@group(${group}) @binding(${samplerBinding}) 
            var ${samplerName}: ${samplerType};\n `;

    const bindGroupLayoutEntryMap = this._bindGroupLayoutEntryMap;
    // Sampler
    {
      const entry = new BindGroupLayoutEntry();
      entry.binding = samplerBinding;
      entry.visibility = this._currentStage;
      entry.sampler = new SamplerBindingLayout();
      entry.sampler.type = bindingType(samplerType);
      if (!bindGroupLayoutEntryMap.has(group)) {
        bindGroupLayoutEntryMap.set(group, new Map<number, BindGroupLayoutEntry>());
        bindGroupLayoutEntryMap.get(group).set(samplerBinding, entry);
      } else {
        if (!bindGroupLayoutEntryMap.get(group).has(samplerBinding)) {
          bindGroupLayoutEntryMap.get(group).set(samplerBinding, entry);
        }
      }
      if (!this._bindGroupInfo.has(group)) {
        this._bindGroupInfo.set(group, new Set<number>());
      }
      this._bindGroupInfo.get(group).add(samplerBinding);
    }
    this._needFlush = true;
  }

  addStorageTextureBinding(texName: string, texType: StorageTextureType,
                           texelFormat: GPUTextureFormat, group: number = 0) {
    const property = Shader.getPropertyByName(texName);
    if (property !== null) {
      const binding = property._uniqueId;
      this._uniformBlock += `@group(${group}) @binding(${binding})\n 
            var ${texName}: ${texType}<${texelFormat.toString()}, write>;\n `;

      const entry = new BindGroupLayoutEntry();
      entry.binding = binding;
      entry.visibility = this._currentStage;
      entry.storageTexture = new StorageTextureBindingLayout();
      entry.storageTexture.format = texelFormat;
      entry.storageTexture.viewDimension = storageTextureViewDimension(texType);
      entry.storageTexture.access = "write-only";

      const bindGroupLayoutEntryMap = this._bindGroupLayoutEntryMap;
      if (!bindGroupLayoutEntryMap.has(group)) {
        bindGroupLayoutEntryMap.set(group, new Map<number, BindGroupLayoutEntry>());
        bindGroupLayoutEntryMap.get(group).set(binding, entry);
      } else {
        if (!bindGroupLayoutEntryMap.get(group).has(binding)) {
          bindGroupLayoutEntryMap.get(group).set(binding, entry);
        }
      }
      if (!this._bindGroupInfo.has(group)) {
        this._bindGroupInfo.set(group, new Set<number>());
      }
      this._bindGroupInfo.get(group).add(binding);
      this._needFlush = true;
    } else {
      throw  "Unknown Uniform Name";
    }
  }

  addInoutType(structName: string, location: number, attributes: string, type: string);

  addInoutType(structName: string, location: number, attributes: string, type: UniformType);

  addInoutType(structName: string, location: number, attributes: string, type: string) {
    const formatTemplate = `@location(${location}) ${attributes}: ${type};`;
    if (!this._inoutType.has(structName)) {
      this._inoutType.set(structName, []);
    }
    this._inoutType.get(structName).push(formatTemplate);
    this._needFlush = true;
  }

  addBuiltInoutType(structName: string, builtin: BuiltInType, attributes: string, type: string);

  addBuiltInoutType(structName: string, builtin: BuiltInType, attributes: string, type: UniformType);

  addBuiltInoutType(structName: string, builtin: BuiltInType, attributes: string, type: string) {
    const formatTemplate = `@builtin(${builtin}) ${attributes}: ${type};`;
    if (!this._inoutType.has(structName)) {
      this._inoutType.set(structName, []);
    }
    this._inoutType.get(structName).push(formatTemplate);
    this._needFlush = true;
  }

  addAttributeType(structName: string, attributes: Attributes, type: UniformType) {
    this.addInoutType(structName, attributes, attributesString(attributes), type);
  }

  addEntry(inParam: [string, string][], outType: [string, string], code: () => string) {
    if (this._currentStage == GPUShaderStage.VERTEX) {
      this._entryBlock += "@stage(vertex)\n";
    } else if (this._currentStage == GPUShaderStage.FRAGMENT) {
      this._entryBlock += "@stage(fragment)\n";
    } else {
      throw  "Use Begin at first";
    }

    this._entryBlock += "fn main(";
    for (let i = 0, n = inParam.length; i < n; i++) {
      const param = inParam[i];
      this._entryBlock += param[0];
      this._entryBlock += ": ";
      this._entryBlock += param[1];
      this._entryBlock += ", ";
    }
    this._entryBlock += ") -> ";
    this._entryBlock += outType[1];
    this._entryBlock += " {\n";

    this._entryBlock += `var ${outType[0]}:${outType[1]};\n`;

    this._entryBlock += code();

    this._entryBlock += `return ${outType[0]};\n`;
    this._entryBlock += "}\n";

    this._needFlush = true;
  }

  flush() {
    if (this._needFlush) {
      this._buildSource();
      this._wgsl._setSource(this._source);
      this._wgsl._setBindGroupInfo(this._bindGroupInfo);
      this._wgsl._setBindGroupLayoutEntryMap(this._bindGroupLayoutEntryMap);
      this.clearCache();
    }
  }

  clearCache() {
    this._structBlock = "";
    this._uniformBlock = "";
    this._functionBlock = "";
    this._inoutType.clear();
    this._entryBlock = "";
    this._needFlush = false;
  }

  /**
   * @internal
   * @param wgsl
   * @param currentStage
   */
  constructor(wgsl: WGSL, currentStage: number) {
    this._wgsl = wgsl;
    this._currentStage = currentStage;
  }

  private _buildSource() {
    this._source = "";
    this._source += this._structBlock;
    this._source += this._uniformBlock;
    // Inout
    {
      this._inoutType.forEach((structMember, structName) => {
        this._source += "struct ";
        this._source += structName;
        this._source += " {\n";
        for (let i = 0, n = structMember.length; i < n; i++) {
          const member = structMember[i];
          this._source += member;
          this._source += "\n";
        }
        this._source += "}\n";
      });
    }
    this._source += this._functionBlock;
    this._source += this._entryBlock;
  }
}
