import { BaseMaterial } from "../material";
import { Shader } from "../shader";
import { Engine } from "../Engine";
import { Matrix } from "@arche-engine/math";

export class ShadowMaterial extends BaseMaterial {
  private static _shadowViewProjectionProp = Shader.getPropertyByName("u_shadowVPMat");
  private _vp = new Matrix();

  set viewProjectionMatrix(vp: Matrix) {
    if (vp !== this._vp) {
      vp.cloneTo(this._vp);
    }
    this.shaderData.setMatrix(ShadowMaterial._shadowViewProjectionProp, this._vp);
  }

  get viewProjectionMatrix(): Matrix {
    return this._vp;
  }

  /**
   * Create a shadow material instance.
   * @param engine - Engine to which the material belongs
   */
  constructor(engine: Engine) {
    super(engine, Shader.find("shadow"));
  }
}
