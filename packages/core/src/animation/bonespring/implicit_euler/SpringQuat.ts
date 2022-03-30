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

  setTarget(v: Quaternion, doNorm: boolean = false): this {
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

    this.vel.x = (this.vel.x + dt_osc * (this.tar.x - this.val.x)) * det_inv;
    this.vel.y = (this.vel.y + dt_osc * (this.tar.y - this.val.y)) * det_inv;
    this.vel.z = (this.vel.z + dt_osc * (this.tar.z - this.val.z)) * det_inv;
    this.vel.w = (this.vel.w + dt_osc * (this.tar.w - this.val.w)) * det_inv;

    this.val.x = (friction * this.val.x + dt * this.vel.x + dt2_osc * this.tar.x) * det_inv;
    this.val.y = (friction * this.val.y + dt * this.vel.y + dt2_osc * this.tar.y) * det_inv;
    this.val.z = (friction * this.val.z + dt * this.vel.z + dt2_osc * this.tar.z) * det_inv;
    this.val.w = (friction * this.val.w + dt * this.vel.w + dt2_osc * this.tar.w) * det_inv;

    this.val.normalize();
    return true;
  }
}
