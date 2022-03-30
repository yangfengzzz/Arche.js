import { SpringBase } from "./SpringBase";
import { Quaternion } from "@arche-engine/math";

// implicit euler spring
export class SpringQuat extends SpringBase {
  static _zero = new Quaternion();
  // Velocity
  vel = new Quaternion();
  // Current Value
  val = new Quaternion();
  // Target Value
  tar = new Quaternion();
  epsilon = 0.00001;

  setTarget(v: Quaternion, doNorm = false): this {
    v.cloneTo(this.tar);
    if (doNorm) this.tar.normalize();
    return this;
  }

  reset(v?: Quaternion) {
    this.vel.identity();

    if (v) {
      v.cloneTo(this.val);
      v.cloneTo(this.tar);
    } else {
      this.val.identity();
      this.tar.identity();
    }

    return this;
  }

  update(dt: number): boolean {
    if (Quaternion.equals(this.vel, SpringQuat._zero) && Quaternion.distanceSquared(this.tar, this.val) == 0) return false;

    if (this.vel.lengthSquared() < this.epsilon && Quaternion.distanceSquared(this.tar, this.val) < this.epsilon) {
      this.vel.setValue(0, 0, 0, 0);
      this.tar.cloneTo(this.val);
      return true;
    }

    // Can screw up skinning if axis not in same hemisphere
    if (Quaternion.dot(this.tar, this.val) < 0) Quaternion.scale(this.tar, -1, this.tar);

    let friction = 1.0 + 2.0 * dt * this.damping * this.oscPerSec,
      dt_osc = dt * this.oscPerSec ** 2,
      dt2_osc = dt * dt_osc,
      det_inv = 1.0 / (friction + dt2_osc);

    this.vel[0] = (this.vel[0] + dt_osc * (this.tar[0] - this.val[0])) * det_inv;
    this.vel[1] = (this.vel[1] + dt_osc * (this.tar[1] - this.val[1])) * det_inv;
    this.vel[2] = (this.vel[2] + dt_osc * (this.tar[2] - this.val[2])) * det_inv;
    this.vel[3] = (this.vel[3] + dt_osc * (this.tar[3] - this.val[3])) * det_inv;

    this.val[0] = (friction * this.val[0] + dt * this.vel[0] + dt2_osc * this.tar[0]) * det_inv;
    this.val[1] = (friction * this.val[1] + dt * this.vel[1] + dt2_osc * this.tar[1]) * det_inv;
    this.val[2] = (friction * this.val[2] + dt * this.vel[2] + dt2_osc * this.tar[2]) * det_inv;
    this.val[3] = (friction * this.val[3] + dt * this.vel[3] + dt2_osc * this.tar[3]) * det_inv;

    this.val.normalize();
    return true;
  }
}
