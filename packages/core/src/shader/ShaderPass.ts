import { Engine } from "../Engine";
import { ShaderFactory } from "../shaderlib/ShaderFactory";
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

  private readonly _source: string;
  private readonly _stage: ShaderStage;

  constructor(source: string, stage: ShaderStage) {
    this._shaderPassId = ShaderPass._shaderPassCounter++;

    this._source = source;
    this._stage = stage;
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

    let source = ShaderFactory.parseIncludes(
      ` ${versionStr}
        ${precisionStr}
        ${macroNameStr}
      ` + this._source
    );

    shaderProgram = new ShaderProgram(engine, source, this._stage);

    shaderProgramPool.cache(shaderProgram);
    return shaderProgram;
  }
}
