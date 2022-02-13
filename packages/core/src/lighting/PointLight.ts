import { Light } from "./Light";
import { Color, MathUtil, Matrix } from "@oasis-engine/math";
import { Entity } from "../Entity";
import { ignoreClone } from "../clone/CloneManager";

export class PointLight extends Light {
  /** @internal */
  @ignoreClone
  _index: number = -1;

  private _projectMatrix: Matrix = new Matrix();

  /** Light color. */
  color: Color = new Color(1, 1, 1, 1);
  /** Light intensity. */
  intensity: number = 1.0;
  /** Defines a distance cutoff at which the light's intensity must be considered zero. */
  distance: number = 100;

  constructor(entity: Entity) {
    super(entity);
  }

  shadowProjectionMatrix(): Matrix {
    const projectMatrix = this._projectMatrix;
    Matrix.perspective(MathUtil.degreeToRadian(120), 1, 0.1, 100, projectMatrix);
    return projectMatrix;
  }

  /**
   * Mount to the current Scene.
   * @override
   */
  _onEnable() {
    this.engine._lightManager.attachPointLight(this);
  }

  /**
   * Unmount from the current Scene.
   * @override
   */
  _onDisable() {
    this.engine._lightManager.detachPointLight(this);
  }

  /**
   * PointLightData: color, _colorPad, position, distance
   * @param shaderData
   */
  _updateShaderData(shaderData: Float32Array) {
    const { color, intensity, distance } = this;

    shaderData[0] = color.r * intensity;
    shaderData[1] = color.g * intensity;
    shaderData[2] = color.b * intensity;
    shaderData[3] = 0;
    const position = this.entity.transform.worldPosition;
    shaderData[4] = position.x;
    shaderData[5] = position.y;
    shaderData[6] = position.z;
    shaderData[7] = distance;
  }
}
