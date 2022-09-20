import { Engine } from "../Engine";
import { ShaderFactory } from "../shaderlib";
import { Shader } from "./Shader";
import { ShaderMacroCollection } from "./ShaderMacroCollection";
import { ShaderProgram } from "./ShaderProgram";
import { ShaderStage } from "../webgpu";

/**
 * Shader pass containing vertex and fragment source.
 */
export class ShaderPass {
  private static _shaderPassCounter: number = 0;

  /** @internal */
  _shaderPassId: number = 0;

  private readonly _vertexOrComputeSource: string;
  private readonly _fragmentSource: string = null;
  private readonly _stage: ShaderStage = null;

  constructor(vertexOrComputeSource: string, fragmentSourceOrStage: string | ShaderStage) {
    this._shaderPassId = ShaderPass._shaderPassCounter++;

    this._vertexOrComputeSource = vertexOrComputeSource;
    if (typeof fragmentSourceOrStage == "string") {
      this._fragmentSource = fragmentSourceOrStage;
    } else {
      if (fragmentSourceOrStage === ShaderStage.FRAGMENT) {
        throw "Fragment Shader can't use alone.";
      }
      this._stage = fragmentSourceOrStage;
    }
  }

  /**
   * @internal
   */
  _getShaderProgram(engine: Engine, macroCollection: ShaderMacroCollection): ShaderProgram {
    const shaderProgramPool = engine._getShaderProgramPool(this);
    let shaderProgram = shaderProgramPool.get(macroCollection);
    if (shaderProgram) {
      return shaderProgram;
    }

    const macroNameList = [];
    Shader._getNamesByMacros(macroCollection, macroNameList);
    const macroNameStr = ShaderFactory.parseCustomMacros(macroNameList);
    const versionStr = "#version 450";
    let precisionStr = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      precision highp int;
    #else
      precision mediump float;
      precision mediump int;
    #endif
    `;

    const vertexOrComputeSource = ShaderFactory.parseIncludes(
      ` ${versionStr}
        ${precisionStr}
        ${macroNameStr}
      ` + this._vertexOrComputeSource
    );

    if (this._fragmentSource) {
      const fragmentSource = ShaderFactory.parseIncludes(
        ` ${versionStr}
        ${precisionStr}
        ${macroNameStr}
      ` + this._fragmentSource
      );
      shaderProgram = new ShaderProgram(engine, vertexOrComputeSource, fragmentSource);
    } else {
      shaderProgram = new ShaderProgram(engine, vertexOrComputeSource, this._stage);
    }

    shaderProgramPool.cache(shaderProgram);
    return shaderProgram;
  }
}
