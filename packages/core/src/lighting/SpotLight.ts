import { Light } from "./Light";
import { Color, Matrix, Vector3 } from "@arche-engine/math";
import { Entity } from "../Entity";
import { ignoreClone } from "../clone/CloneManager";

export class SpotLight extends Light {
  private static _forward = new Vector3();

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
  /** Angle, in radians, from centre of spotlight where falloff begins. */
  angle: number = Math.PI / 6;
  /** Angle, in radians, from falloff begins to ends. */
  penumbra: number = Math.PI / 12;

  constructor(entity: Entity) {
    super(entity);
  }

  shadowProjectionMatrix(): Matrix {
    const projectMatrix = this._projectMatrix;
    const fov = Math.min(Math.PI / 2, this.angle * 2 * Math.sqrt(2));
    Matrix.perspective(fov, 1, 0.1, this.distance + 5, projectMatrix);
    return projectMatrix;
  }

  /**
   * Mount to the current Scene.
   * @override
   */
  _onEnable() {
    this.engine._lightManager.attachSpotLight(this);
  }

  /**
   * Unmount from the current Scene.
   * @override
   */
  _onDisable() {
    this.engine._lightManager.detachSpotLight(this);
  }

  /**
   * SpotLightData: color, distance, position, angleCos, direction, penumbraCos
   * @param shaderData
   */
  _updateShaderData(shaderData: Float32Array) {
    const { color, intensity, distance, angle, penumbra } = this;

    shaderData[0] = color.r * intensity;
    shaderData[1] = color.g * intensity;
    shaderData[2] = color.b * intensity;
    shaderData[3] = distance;

    const position = this.entity.transform.worldPosition;
    shaderData[4] = position.x;
    shaderData[5] = position.y;
    shaderData[6] = position.z;
    shaderData[7] = Math.cos(angle);

    const forward = SpotLight._forward;
    this.entity.transform.getWorldForward(forward);
    shaderData[8] = forward.x;
    shaderData[9] = forward.y;
    shaderData[10] = forward.z;
    shaderData[11] = Math.cos(angle + penumbra);
  }
}
