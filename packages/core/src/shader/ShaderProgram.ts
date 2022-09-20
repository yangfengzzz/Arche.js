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

  private _engine: Engine;
  private _device: GPUDevice;
  private _vertexShader: GPUShaderModule = null;
  private _vertexIntrospection: WgslReflect = null;
  private _fragmentShader: GPUShaderModule = null;
  private _fragmentIntrospection: WgslReflect = null;
  private _computeShader: GPUShaderModule = null;
  private _computeIntrospection: WgslReflect = null;

  /**
   * introspect info
   */
  get vertexIntrospection(): WgslReflect {
    return this._vertexIntrospection;
  }

  /**
   * webgpu shader
   */
  get vertxShader(): GPUShaderModule {
    return this._vertexShader;
  }

  /**
   * introspect info
   */
  get fragmentIntrospection(): WgslReflect {
    return this._fragmentIntrospection;
  }

  /**
   * webgpu shader
   */
  get fragmentShader(): GPUShaderModule {
    return this._fragmentShader;
  }

  /**
   * introspect info
   */
  get computeIntrospection(): WgslReflect {
    return this._computeIntrospection;
  }

  /**
   * webgpu shader
   */
  get computeShader(): GPUShaderModule {
    return this._computeShader;
  }

  constructor(engine: Engine, vertexShader: string, fragmentShader: string);

  constructor(engine: Engine, vertexOrComputeShader: string, stage: ShaderStage);

  constructor(engine: Engine, vertexOrComputeShader: string, fragmentShaderOrStage: string | ShaderStage) {
    this._engine = engine;
    this._device = engine.device;

    if (typeof fragmentShaderOrStage == "string") {
      const vertexWGSL = glsl_compile(vertexOrComputeShader, "vertex", false);
      // console.log(vertexWGSL);
      ShaderProgram._shaderModuleDescriptor.code = vertexWGSL;
      this._vertexShader = this._device.createShaderModule(ShaderProgram._shaderModuleDescriptor);
      this._vertexIntrospection = new WgslReflect(vertexWGSL);

      const fragmentWGSL = glsl_compile(vertexOrComputeShader, "fragment", false);
      // console.log(fragmentWGSL);
      ShaderProgram._shaderModuleDescriptor.code = fragmentWGSL;
      this._fragmentShader = this._device.createShaderModule(ShaderProgram._shaderModuleDescriptor);
      this._fragmentIntrospection = new WgslReflect(fragmentWGSL);
    } else {
      if (fragmentShaderOrStage == ShaderStage.VERTEX) {
        const wgsl = glsl_compile(vertexOrComputeShader, "vertex", false);
        // console.log(wgsl);
        ShaderProgram._shaderModuleDescriptor.code = wgsl;
        this._vertexShader = this._device.createShaderModule(ShaderProgram._shaderModuleDescriptor);
        this._vertexIntrospection = new WgslReflect(wgsl);
      } else {
        const wgsl = glsl_compile(vertexOrComputeShader, "compute", false);
        // console.log(wgsl);
        ShaderProgram._shaderModuleDescriptor.code = wgsl;
        this._fragmentShader = this._device.createShaderModule(ShaderProgram._shaderModuleDescriptor);
        this._fragmentIntrospection = new WgslReflect(wgsl);
      }
    }

    this.id = ShaderProgram._counter++;
  }
}
