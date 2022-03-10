import { BindGroupLayoutDescriptor, ShaderModuleDescriptor } from "../webgpu";

type BindGroupLayoutDescriptorMap = Map<number, BindGroupLayoutDescriptor>;

/**
 * Shader program, corresponding to the GPU shader program.
 * @internal
 */
export class ShaderProgram {
  private static _shaderModuleDescriptor: ShaderModuleDescriptor = new ShaderModuleDescriptor();

  private readonly _bindGroupLayoutDescriptorMap: BindGroupLayoutDescriptorMap;
  private readonly _stage: number;
  private _shader: GPUShaderModule;
  private _fragmentShader: GPUShaderModule;
  private _device: GPUDevice;

  get vertexShader(): GPUShaderModule {
    if (this._stage === GPUShaderStage.VERTEX) {
      return this._shader;
    } else {
      return null;
    }
  }

  get computeShader(): GPUShaderModule {
    if (this._stage === GPUShaderStage.COMPUTE) {
      return this._shader;
    } else {
      return null;
    }
  }

  get fragmentShader(): GPUShaderModule {
    return this._fragmentShader;
  }

  get bindGroupLayoutDescriptorMap(): BindGroupLayoutDescriptorMap {
    return this._bindGroupLayoutDescriptorMap;
  }

  constructor(
    device: GPUDevice,
    source: string,
    stage: number,
    bindGroupLayoutDescriptorMap: BindGroupLayoutDescriptorMap = null,
    fragmentSource: string = null
  ) {
    if (bindGroupLayoutDescriptorMap) {
      this._bindGroupLayoutDescriptorMap = new Map<number, BindGroupLayoutDescriptor>();
      bindGroupLayoutDescriptorMap.forEach((descriptor, group) => {
        const bindGroupLayoutDescriptor = new BindGroupLayoutDescriptor();
        descriptor.cloneTo(bindGroupLayoutDescriptor);
        this._bindGroupLayoutDescriptorMap.set(group, bindGroupLayoutDescriptor);
      });
    }

    // console.log(source);
    // console.log(fragmentSource);
    // debugger;

    this._stage = stage;
    this._device = device;
    this._createProgram(source, fragmentSource);
  }

  /**
   * init and link program with shader.
   */
  private _createProgram(source: string, fragmentSource: string = null) {
    ShaderProgram._shaderModuleDescriptor.code = source;
    this._shader = this._device.createShaderModule(ShaderProgram._shaderModuleDescriptor);

    if (fragmentSource) {
      ShaderProgram._shaderModuleDescriptor.code = fragmentSource;
      this._fragmentShader = this._device.createShaderModule(ShaderProgram._shaderModuleDescriptor);
    }
  }
}
