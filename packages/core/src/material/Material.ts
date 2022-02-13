import { IClone } from "../clone/IClone";
import { RefObject } from "../asset/RefObject";
import { CloneManager } from "../clone/CloneManager";
import { Engine } from "../Engine";
import { ShaderDataGroup } from "../shader/ShaderDataGroup";
import { Shader } from "../shader";
import { ShaderData } from "../shader";
import { RenderState } from "../shader/state/RenderState";
import { RenderQueueType } from "./enums/RenderQueueType";

/**
 * Material.
 */
export class Material extends RefObject implements IClone {
  /** Name. */
  name: string;
  /** Shader used by the material. */
  shader: Shader;
  /** Render queue type. */
  renderQueueType: RenderQueueType = RenderQueueType.Opaque;
  /** Shader data. */
  readonly shaderData: ShaderData;
  /** Render state. */
  readonly renderState: RenderState = new RenderState(); // todo: later will as a part of shaderData when shader effect frame is OK, that is more powerful and flexible.

  /**
   * Create a material instance.
   * @param engine - Engine to which the material belongs
   * @param shader - Shader used by the material
   */
  constructor(engine: Engine, shader: Shader) {
    super(engine);
    this.shaderData = new ShaderData(ShaderDataGroup.Material, this._engine);
    this.shader = shader;
  }

  /**
   * Clone and return the instance.
   */
  clone(): Material {
    const dest = new Material(this._engine, this.shader);
    this.cloneTo(dest);
    return dest;
  }

  /**
   * Clone to the target material.
   * @param target - target material
   */
  cloneTo(target: Material): void {
    target.shader = this.shader;
    target.renderQueueType = this.renderQueueType;
    this.shaderData.cloneTo(target.shaderData);
    CloneManager.deepCloneObject(this.renderState, target.renderState);
  }

  /**
   * @override
   */
  _addRefCount(value: number): void {
    super._addRefCount(value);
    this.shaderData._addRefCount(value);
  }

  /**
   * @override
   */
  protected _onDestroy(): void {
  }
}
