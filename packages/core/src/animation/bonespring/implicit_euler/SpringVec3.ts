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

    this.vel.x = (this.vel.x + dt_osc * (this.tar.x - this.val.x)) * det_inv;
    this.vel.y = (this.vel.y + dt_osc * (this.tar.y - this.val.y)) * det_inv;
    this.vel.z = (this.vel.z + dt_osc * (this.tar.z - this.val.z)) * det_inv;

    this.val.x = (friction * this.val.x + dt * this.vel.x + dt2_osc * this.tar.x) * det_inv;
    this.val.y = (friction * this.val.y + dt * this.vel.y + dt2_osc * this.tar.y) * det_inv;
    this.val.z = (friction * this.val.z + dt * this.vel.z + dt2_osc * this.tar.z) * det_inv;

    return true;
  }
}
