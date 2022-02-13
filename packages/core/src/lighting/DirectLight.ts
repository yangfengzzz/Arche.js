import { Light } from "./Light";
import { Entity } from "../Entity";
import { Color, Matrix, Vector3 } from "@oasis-engine/math";
import { ignoreClone } from "../clone/CloneManager";

export class DirectLight extends Light {
  /** @internal */
  @ignoreClone
  _index: number = -1;

  /** Light direction */
  private _direction: Vector3 = new Vector3();

  /** Light color. */
  color: Color = new Color(1, 1, 1, 1);
  /** Light intensity. */
  intensity: number = 1.0;

  constructor(entity: Entity) {
    super(entity);
  }

  shadowProjectionMatrix(): Matrix {
    throw "cascade shadow don't use this projection";
  }

  direction(): Vector3 {
    const direction = this._direction;
    this.entity.transform.getWorldForward(direction);
    return direction;
  }

  /**
   * Mount to the current Scene.
   * @override
   */
  _onEnable() {
    this.engine._lightManager.attachDirectLight(this);
  }

  /**
   * Unmount from the current Scene.
   * @override
   */
  _onDisable() {
    this.engine._lightManager.detachDirectLight(this);
  }

  /**
   * DirectLightData: color; _colorPad; direction; _directionPad
   * @param shaderData
   */
  _updateShaderData(shaderData: Float32Array) {
    const { color, intensity } = this;

    shaderData[0] = color.r * intensity;
    shaderData[1] = color.g * intensity;
    shaderData[2] = color.b * intensity;
    shaderData[3] = 0; // pad

    const direction = this.direction();
    shaderData[4] = direction.x;
    shaderData[5] = direction.y;
    shaderData[6] = direction.z;
    shaderData[7] = 0; // pad
  }
}
