import { ShaderModuleDescriptor, ShaderStage } from "../webgpu";
import { Engine } from "../Engine";
import { glsl_compile } from "./transcode/glsl_wgsl_compiler";
import { WgslReflect } from "./introspector/wgsl_reflect";

/**
 * Shader program, corresponding to the GPU shader program.
 * @internal
 */
export class ShaderProgram {
  private static _shaderModuleDescriptor: ShaderModuleDescriptor = new ShaderModuleDescriptor();
  private static _counter: number = 0;

  id: number;

  private _shader: GPUShaderModule;
  private _engine: Engine;
  private _device: GPUDevice;
  private _introspection: WgslReflect;

  /**
   * introspect info
   */
  get introspection(): WgslReflect {
    return this._introspection;
  }

  /**
   * webgpu shader
   */
  get shader(): GPUShaderModule {
    return this._shader;
  }

  constructor(engine: Engine, source: string, stage: ShaderStage) {
    this._engine = engine;
    this._device = engine.device;
    this._createProgram(source, stage);

    this.id = ShaderProgram._counter++;
  }

  /**
   * init and link program with shader.
   */
  private _createProgram(source: string, stage: ShaderStage) {
    const wgsl = glsl_compile(source, stage, false);
    // console.log(wgsl);
    ShaderProgram._shaderModuleDescriptor.code = wgsl;
    this._shader = this._device.createShaderModule(ShaderProgram._shaderModuleDescriptor);
    this._introspection = new WgslReflect(wgsl);
  }
}
