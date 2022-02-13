import { Component } from "../Component";
import { Entity } from "../Entity";
import { Matrix } from "@arche-engine/math";

/**
 * Light base class.
 */
export abstract class Light extends Component {
  /**
   * Each type of light source is at most 10, beyond which it will not take effect.
   * */
  static MAX_LIGHT: number = 10;

  private _enableShadow: boolean = false;
  private _shadowBias: number = 0.005;
  private _shadowIntensity: number = 0.2;
  private _shadowRadius: number = 1;

  private _viewMatrix: Matrix = new Matrix();

  constructor(entity: Entity) {
    super(entity);
  }

  /**
   * View matrix.
   */
  get viewMatrix(): Matrix {
    Matrix.invert(this.entity.transform.worldMatrix, this._viewMatrix);
    return this._viewMatrix;
  }

  /**
   * Inverse view matrix.
   */
  get inverseViewMatrix(): Matrix {
    return this.entity.transform.worldMatrix;
  }

  get enableShadow(): boolean {
    return this._enableShadow;
  }

  set enableShadow(enabled: boolean) {
    this._enableShadow = enabled;
  }

  /**
   * Shadow bias.
   */
  get shadowBias(): number {
    return this._shadowBias;
  }

  set shadowBias(value: number) {
    this._shadowBias = value;
  }

  /**
   * Shadow intensity, the larger the value, the clearer and darker the shadow.
   */
  get shadowIntensity(): number {
    return this._shadowIntensity;
  }

  set shadowIntensity(value: number) {
    this._shadowIntensity = value;
  }

  /**
   * Pixel range used for shadow PCF interpolation.
   */
  get shadowRadius(): number {
    return this._shadowRadius;
  }

  set shadowRadius(value: number) {
    this._shadowRadius = value;
  }

  abstract shadowProjectionMatrix(): Matrix;
}
