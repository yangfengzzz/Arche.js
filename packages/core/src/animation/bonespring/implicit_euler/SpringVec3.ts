import { SpringBase } from "./SpringBase";
import { Vector3 } from "@arche-engine/math";

// implicit euler spring
export class SpringVec3 extends SpringBase {
  static _zero = new Vector3();

  // Velocity
  vel = new Vector3();
  // Current Value
  val = new Vector3();
  // Target Value
  tar = new Vector3();
  epsilon = 0.000001;

  // #region SETTERS / GETTERS
  setTarget(v: Vector3) {
    v.cloneTo(this.tar);
    return this;
  }

  reset(v: Vector3) {
    if (v) {
      v.cloneTo(this.val);
      v.cloneTo(this.tar);
    } else {
      this.val.setValue(0, 0, 0);
      this.tar.setValue(0, 0, 0);
    }

    return this;
  }

  update(dt: number): boolean {
    if (Vector3.equals(this.vel, SpringVec3._zero) && Vector3.distanceSquared(this.tar, this.val) == 0) return false;

    if (this.vel.lengthSquared() < this.epsilon && Vector3.distanceSquared(this.tar, this.val) < this.epsilon) {
      this.vel.setValue(0, 0, 0);
      this.tar.cloneTo(this.val);
      return true;
    }

    let friction = 1.0 + 2.0 * dt * this.damping * this.oscPerSec,
      dt_osc = dt * this.oscPerSec ** 2,
      dt2_osc = dt * dt_osc,
      det_inv = 1.0 / (friction + dt2_osc);

    this.vel[0] = (this.vel[0] + dt_osc * (this.tar[0] - this.val[0])) * det_inv;
    this.vel[1] = (this.vel[1] + dt_osc * (this.tar[1] - this.val[1])) * det_inv;
    this.vel[2] = (this.vel[2] + dt_osc * (this.tar[2] - this.val[2])) * det_inv;

    this.val[0] = (friction * this.val[0] + dt * this.vel[0] + dt2_osc * this.tar[0]) * det_inv;
    this.val[1] = (friction * this.val[1] + dt * this.vel[1] + dt2_osc * this.tar[1]) * det_inv;
    this.val[2] = (friction * this.val[2] + dt * this.vel[2] + dt2_osc * this.tar[2]) * det_inv;

    return true;
  }
}
