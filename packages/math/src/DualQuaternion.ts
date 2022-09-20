import { Quaternion } from "./Quaternion";
import { Vector3 } from "./Vector3";
import { MathUtil } from "./MathUtil";

export class DualQuaternion {
  static _temp: Quaternion = new Quaternion();
  static _temp2: Quaternion = new Quaternion();
  elements: Float32Array = new Float32Array(8);

  /**
   * Creates a new dual quat from the given values (quat and translation)
   */
  static fromRotationTranslationValues(quat: Quaternion, translation: Vector3): DualQuaternion {
    let ax = translation.x * 0.5,
      ay = translation.y * 0.5,
      az = translation.z * 0.5;
    return new DualQuaternion(
      quat.x,
      quat.y,
      quat.z,
      quat.w,
      ax * quat.w + ay * quat.z - az * quat.y,
      ay * quat.w + az * quat.x - ax * quat.z,
      az * quat.w + ax * quat.y - ay * quat.x,
      -ax * quat.x - ay * quat.y - az * quat.z
    );
  }

  /**
   * Creates a dual quat from a quaternion and a translation
   */
  static fromRotationTranslation(q: Quaternion, t: Vector3, out: DualQuaternion): DualQuaternion {
    let ax = t.x * 0.5,
      ay = t.y * 0.5,
      az = t.z * 0.5,
      bx = q.x,
      by = q.y,
      bz = q.z,
      bw = q.w;
    out.elements[0] = bx;
    out.elements[1] = by;
    out.elements[2] = bz;
    out.elements[3] = bw;
    out.elements[4] = ax * bw + ay * bz - az * by;
    out.elements[5] = ay * bw + az * bx - ax * bz;
    out.elements[6] = az * bw + ax * by - ay * bx;
    out.elements[7] = -ax * bx - ay * by - az * bz;
    return out;
  }

  /**
   * Creates a dual quat from a translation
   */
  static fromTranslation(t: Vector3, out: DualQuaternion): DualQuaternion {
    out.elements[0] = 0;
    out.elements[1] = 0;
    out.elements[2] = 0;
    out.elements[3] = 1;
    out.elements[4] = t.x * 0.5;
    out.elements[5] = t.y * 0.5;
    out.elements[6] = t.z * 0.5;
    out.elements[7] = 0;
    return out;
  }

  /**
   * Creates a dual quat from a quaternion
   * @param out quaternion receiving operation result
   * @param q the quaternion
   * @returns dual quaternion receiving operation result
   */
  static fromRotation(q: Quaternion, out: DualQuaternion): DualQuaternion {
    out.elements[0] = q.x;
    out.elements[1] = q.y;
    out.elements[2] = q.z;
    out.elements[3] = q.w;
    out.elements[4] = 0;
    out.elements[5] = 0;
    out.elements[6] = 0;
    out.elements[7] = 0;
    return out;
  }

  /**
   * Set a dual quat to the identity dual quaternion
   *
   * @param out the receiving quaternion
   * @returns out
   */
  static identity(out: DualQuaternion): DualQuaternion {
    out.elements[0] = 0;
    out.elements[1] = 0;
    out.elements[2] = 0;
    out.elements[3] = 1;
    out.elements[4] = 0;
    out.elements[5] = 0;
    out.elements[6] = 0;
    out.elements[7] = 0;
    return out;
  }

  /**
   * Set the components of a dual quat to the given values
   *
   * @param out the receiving quaternion
   * @param x1 X component
   * @param y1 Y component
   * @param z1 Z component
   * @param w1 W component
   * @param x2 X component
   * @param y2 Y component
   * @param z2 Z component
   * @param w2 W component
   * @returns out
   * @function
   */
  static setValue(
    x1: number,
    y1: number,
    z1: number,
    w1: number,
    x2: number,
    y2: number,
    z2: number,
    w2: number,
    out: DualQuaternion
  ): DualQuaternion {
    out.elements[0] = x1;
    out.elements[1] = y1;
    out.elements[2] = z1;
    out.elements[3] = w1;

    out.elements[4] = x2;
    out.elements[5] = y2;
    out.elements[6] = z2;
    out.elements[7] = w2;
    return out;
  }

  /**
   * Gets the dual part of a dual quat
   * @param out dual part
   * @param a Dual Quaternion
   * @return dual part
   */
  static getDual(a: DualQuaternion, out: Quaternion): Quaternion {
    out.x = a.elements[4];
    out.y = a.elements[5];
    out.z = a.elements[6];
    out.w = a.elements[7];
    return out;
  }

  /**
   * Set the dual component of a dual quat to the given quaternion
   *
   * @param out the receiving quaternion
   * @param q a quaternion representing the dual part
   * @returns out
   * @function
   */
  static setDual(q: Quaternion, out: DualQuaternion): DualQuaternion {
    out.elements[4] = q.x;
    out.elements[5] = q.y;
    out.elements[6] = q.z;
    out.elements[7] = q.w;
    return out;
  }

  /**
   * Gets the translation of a normalized dual quat
   * @param out translation
   * @param a Dual Quaternion to be decomposed
   * @return translation
   */
  static getTranslation(a: DualQuaternion, out: Vector3): Vector3 {
    let ax = a.elements[4],
      ay = a.elements[5],
      az = a.elements[6],
      aw = a.elements[7],
      bx = -a.elements[0],
      by = -a.elements[1],
      bz = -a.elements[2],
      bw = a.elements[3];
    out.x = (ax * bw + aw * bx + ay * bz - az * by) * 2;
    out.y = (ay * bw + aw * by + az * bx - ax * bz) * 2;
    out.z = (az * bw + aw * bz + ax * by - ay * bx) * 2;
    return out;
  }

  /**
   * Translates a dual quat by the given vector
   *
   * @param out the receiving dual quaternion
   * @param a the dual quaternion to translate
   * @param v vector to translate by
   * @returns out
   */
  static translate(a: DualQuaternion, v: Vector3, out: DualQuaternion): DualQuaternion {
    let ax1 = a.elements[0],
      ay1 = a.elements[1],
      az1 = a.elements[2],
      aw1 = a.elements[3],
      bx1 = v.x * 0.5,
      by1 = v.y * 0.5,
      bz1 = v.z * 0.5,
      ax2 = a.elements[4],
      ay2 = a.elements[5],
      az2 = a.elements[6],
      aw2 = a.elements[7];
    out.elements[0] = ax1;
    out.elements[1] = ay1;
    out.elements[2] = az1;
    out.elements[3] = aw1;
    out.elements[4] = aw1 * bx1 + ay1 * bz1 - az1 * by1 + ax2;
    out.elements[5] = aw1 * by1 + az1 * bx1 - ax1 * bz1 + ay2;
    out.elements[6] = aw1 * bz1 + ax1 * by1 - ay1 * bx1 + az2;
    out.elements[7] = -ax1 * bx1 - ay1 * by1 - az1 * bz1 + aw2;
    return out;
  }

  /**
   * Rotates a dual quat around the X axis
   *
   * @param out the receiving dual quaternion
   * @param a the dual quaternion to rotate
   * @param rad how far should the rotation be
   * @returns out
   */
  static rotateX(a: DualQuaternion, rad: number, out: DualQuaternion): DualQuaternion {
    let bx = -a.elements[0],
      by = -a.elements[1],
      bz = -a.elements[2],
      bw = a.elements[3],
      ax = a.elements[4],
      ay = a.elements[5],
      az = a.elements[6],
      aw = a.elements[7],
      ax1 = ax * bw + aw * bx + ay * bz - az * by,
      ay1 = ay * bw + aw * by + az * bx - ax * bz,
      az1 = az * bw + aw * bz + ax * by - ay * bx,
      aw1 = aw * bw - ax * bx - ay * by - az * bz;

    DualQuaternion._temp.set(a.elements[0], a.elements[1], a.elements[2], a.elements[3]);
    Quaternion.rotateX(DualQuaternion._temp, rad, DualQuaternion._temp2);
    out.elements[0] = DualQuaternion._temp2.x;
    out.elements[1] = DualQuaternion._temp2.y;
    out.elements[2] = DualQuaternion._temp2.z;
    out.elements[3] = DualQuaternion._temp2.w;

    bx = out.elements[0];
    by = out.elements[1];
    bz = out.elements[2];
    bw = out.elements[3];
    out.elements[4] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
    out.elements[5] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
    out.elements[6] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
    out.elements[7] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
    return out;
  }

  /**
   * Rotates a dual quat around the Y axis
   *
   * @param out the receiving dual quaternion
   * @param a the dual quaternion to rotate
   * @param rad how far should the rotation be
   * @returns out
   */
  static rotateY(a: DualQuaternion, rad: number, out: DualQuaternion): DualQuaternion {
    let bx = -a.elements[0],
      by = -a.elements[1],
      bz = -a.elements[2],
      bw = a.elements[3],
      ax = a.elements[4],
      ay = a.elements[5],
      az = a.elements[6],
      aw = a.elements[7],
      ax1 = ax * bw + aw * bx + ay * bz - az * by,
      ay1 = ay * bw + aw * by + az * bx - ax * bz,
      az1 = az * bw + aw * bz + ax * by - ay * bx,
      aw1 = aw * bw - ax * bx - ay * by - az * bz;

    DualQuaternion._temp.set(a.elements[0], a.elements[1], a.elements[2], a.elements[3]);
    Quaternion.rotateY(DualQuaternion._temp, rad, DualQuaternion._temp2);
    out.elements[0] = DualQuaternion._temp2.x;
    out.elements[1] = DualQuaternion._temp2.y;
    out.elements[2] = DualQuaternion._temp2.z;
    out.elements[3] = DualQuaternion._temp2.w;

    bx = out.elements[0];
    by = out.elements[1];
    bz = out.elements[2];
    bw = out.elements[3];
    out.elements[4] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
    out.elements[5] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
    out.elements[6] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
    out.elements[7] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
    return out;
  }

  /**
   * Rotates a dual quat around the Z axis
   *
   * @param out the receiving dual quaternion
   * @param a the dual quaternion to rotate
   * @param rad how far should the rotation be
   * @returns out
   */
  static rotateZ(a: DualQuaternion, rad: number, out: DualQuaternion): DualQuaternion {
    let bx = -a.elements[0],
      by = -a.elements[1],
      bz = -a.elements[2],
      bw = a.elements[3],
      ax = a.elements[4],
      ay = a.elements[5],
      az = a.elements[6],
      aw = a.elements[7],
      ax1 = ax * bw + aw * bx + ay * bz - az * by,
      ay1 = ay * bw + aw * by + az * bx - ax * bz,
      az1 = az * bw + aw * bz + ax * by - ay * bx,
      aw1 = aw * bw - ax * bx - ay * by - az * bz;

    DualQuaternion._temp.set(a.elements[0], a.elements[1], a.elements[2], a.elements[3]);
    Quaternion.rotateZ(DualQuaternion._temp, rad, DualQuaternion._temp2);
    out.elements[0] = DualQuaternion._temp2.x;
    out.elements[1] = DualQuaternion._temp2.y;
    out.elements[2] = DualQuaternion._temp2.z;
    out.elements[3] = DualQuaternion._temp2.w;

    bx = out.elements[0];
    by = out.elements[1];
    bz = out.elements[2];
    bw = out.elements[3];
    out.elements[4] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
    out.elements[5] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
    out.elements[6] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
    out.elements[7] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
    return out;
  }

  /**
   * Rotates a dual quat by a given quaternion (a * q)
   *
   * @param out the receiving dual quaternion
   * @param a the dual quaternion to rotate
   * @param q quaternion to rotate by
   * @returns out
   */
  static rotateByQuatAppend(a: DualQuaternion, q: Quaternion, out: DualQuaternion): DualQuaternion {
    let qx = q.x,
      qy = q.y,
      qz = q.z,
      qw = q.w,
      ax = a.elements[0],
      ay = a.elements[1],
      az = a.elements[2],
      aw = a.elements[3];

    out.elements[0] = ax * qw + aw * qx + ay * qz - az * qy;
    out.elements[1] = ay * qw + aw * qy + az * qx - ax * qz;
    out.elements[2] = az * qw + aw * qz + ax * qy - ay * qx;
    out.elements[3] = aw * qw - ax * qx - ay * qy - az * qz;
    ax = a.elements[4];
    ay = a.elements[5];
    az = a.elements[6];
    aw = a.elements[7];
    out.elements[4] = ax * qw + aw * qx + ay * qz - az * qy;
    out.elements[5] = ay * qw + aw * qy + az * qx - ax * qz;
    out.elements[6] = az * qw + aw * qz + ax * qy - ay * qx;
    out.elements[7] = aw * qw - ax * qx - ay * qy - az * qz;
    return out;
  }

  /**
   * Rotates a dual quat by a given quaternion (q * a)
   *
   * @param out the receiving dual quaternion
   * @param q quaternion to rotate by
   * @param a the dual quaternion to rotate
   * @returns out
   */
  static rotateByQuatPrepend(q: Quaternion, a: DualQuaternion, out: DualQuaternion): DualQuaternion {
    let qx = q.x,
      qy = q.y,
      qz = q.z,
      qw = q.w,
      bx = a.elements[0],
      by = a.elements[1],
      bz = a.elements[2],
      bw = a.elements[3];

    out.elements[0] = qx * bw + qw * bx + qy * bz - qz * by;
    out.elements[1] = qy * bw + qw * by + qz * bx - qx * bz;
    out.elements[2] = qz * bw + qw * bz + qx * by - qy * bx;
    out.elements[3] = qw * bw - qx * bx - qy * by - qz * bz;
    bx = a.elements[4];
    by = a.elements[5];
    bz = a.elements[6];
    bw = a.elements[7];
    out.elements[4] = qx * bw + qw * bx + qy * bz - qz * by;
    out.elements[5] = qy * bw + qw * by + qz * bx - qx * bz;
    out.elements[6] = qz * bw + qw * bz + qx * by - qy * bx;
    out.elements[7] = qw * bw - qx * bx - qy * by - qz * bz;
    return out;
  }

  /**
   * Rotates a dual quat around a given axis. Does the normalisation automatically
   *
   * @param out the receiving dual quaternion
   * @param a the dual quaternion to rotate
   * @param axis the axis to rotate around
   * @param rad how far the rotation should be
   * @returns out
   */
  static rotateAroundAxis(a: DualQuaternion, axis: Vector3, rad: number, out: DualQuaternion): DualQuaternion {
    //Special case for rad = 0
    if (Math.abs(rad) < MathUtil.zeroTolerance) {
      return a.cloneTo(out);
    }
    let axisLength = Math.hypot(axis.x, axis.y, axis.z);

    rad = rad * 0.5;
    let s = Math.sin(rad);
    let bx = (s * axis.x) / axisLength;
    let by = (s * axis.y) / axisLength;
    let bz = (s * axis.z) / axisLength;
    let bw = Math.cos(rad);

    let ax1 = a.elements[0],
      ay1 = a.elements[1],
      az1 = a.elements[2],
      aw1 = a.elements[3];
    out.elements[0] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
    out.elements[1] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
    out.elements[2] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
    out.elements[3] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;

    let ax = a.elements[4],
      ay = a.elements[5],
      az = a.elements[6],
      aw = a.elements[7];
    out.elements[4] = ax * bw + aw * bx + ay * bz - az * by;
    out.elements[5] = ay * bw + aw * by + az * bx - ax * bz;
    out.elements[6] = az * bw + aw * bz + ax * by - ay * bx;
    out.elements[7] = aw * bw - ax * bx - ay * by - az * bz;

    return out;
  }

  /**
   * Adds two dual quat's
   *
   * @param out the receiving dual quaternion
   * @param a the first operand
   * @param b the second operand
   * @returns out
   * @function
   */
  static add(a: DualQuaternion, b: DualQuaternion, out: DualQuaternion): DualQuaternion {
    out.elements[0] = a.elements[0] + b.elements[0];
    out.elements[1] = a.elements[1] + b.elements[1];
    out.elements[2] = a.elements[2] + b.elements[2];
    out.elements[3] = a.elements[3] + b.elements[3];
    out.elements[4] = a.elements[4] + b.elements[4];
    out.elements[5] = a.elements[5] + b.elements[5];
    out.elements[6] = a.elements[6] + b.elements[6];
    out.elements[7] = a.elements[7] + b.elements[7];
    return out;
  }

  /**
   * Multiplies two dual quat's
   *
   * @param out the receiving dual quaternion
   * @param a the first operand
   * @param b the second operand
   * @returns out
   */
  static multiply(a: DualQuaternion, b: DualQuaternion, out: DualQuaternion): DualQuaternion {
    let ax0 = a.elements[0],
      ay0 = a.elements[1],
      az0 = a.elements[2],
      aw0 = a.elements[3],
      bx1 = b.elements[4],
      by1 = b.elements[5],
      bz1 = b.elements[6],
      bw1 = b.elements[7],
      ax1 = a.elements[4],
      ay1 = a.elements[5],
      az1 = a.elements[6],
      aw1 = a.elements[7],
      bx0 = b.elements[0],
      by0 = b.elements[1],
      bz0 = b.elements[2],
      bw0 = b.elements[3];
    out.elements[0] = ax0 * bw0 + aw0 * bx0 + ay0 * bz0 - az0 * by0;
    out.elements[1] = ay0 * bw0 + aw0 * by0 + az0 * bx0 - ax0 * bz0;
    out.elements[2] = az0 * bw0 + aw0 * bz0 + ax0 * by0 - ay0 * bx0;
    out.elements[3] = aw0 * bw0 - ax0 * bx0 - ay0 * by0 - az0 * bz0;
    out.elements[4] = ax0 * bw1 + aw0 * bx1 + ay0 * bz1 - az0 * by1 + ax1 * bw0 + aw1 * bx0 + ay1 * bz0 - az1 * by0;
    out.elements[5] = ay0 * bw1 + aw0 * by1 + az0 * bx1 - ax0 * bz1 + ay1 * bw0 + aw1 * by0 + az1 * bx0 - ax1 * bz0;
    out.elements[6] = az0 * bw1 + aw0 * bz1 + ax0 * by1 - ay0 * bx1 + az1 * bw0 + aw1 * bz0 + ax1 * by0 - ay1 * bx0;
    out.elements[7] = aw0 * bw1 - ax0 * bx1 - ay0 * by1 - az0 * bz1 + aw1 * bw0 - ax1 * bx0 - ay1 * by0 - az1 * bz0;
    return out;
  }

  /**
   * Scales a dual quat by a scalar number
   *
   * @param out the receiving dual quat
   * @param a the dual quat to scale
   * @param b amount to scale the dual quat by
   * @returns out
   * @function
   */
  static scale(a: DualQuaternion, b: number, out: DualQuaternion): DualQuaternion {
    out.elements[0] = a.elements[0] * b;
    out.elements[1] = a.elements[1] * b;
    out.elements[2] = a.elements[2] * b;
    out.elements[3] = a.elements[3] * b;
    out.elements[4] = a.elements[4] * b;
    out.elements[5] = a.elements[5] * b;
    out.elements[6] = a.elements[6] * b;
    out.elements[7] = a.elements[7] * b;
    return out;
  }

  /**
   * Determines the dot product of two quaternions.
   * @param left - The first quaternion to dot
   * @param right - The second quaternion to dot
   * @returns The dot product of two quaternions
   */
  static dot(left: DualQuaternion, right: DualQuaternion): number {
    return (
      left.elements[0] * right.elements[0] +
      left.elements[1] * right.elements[1] +
      left.elements[2] * right.elements[2] +
      left.elements[3] * right.elements[3]
    );
  }

  /**
   * Performs a linear interpolation between two dual quats's
   * NOTE: The resulting dual quaternions won't always be normalized (The error is most noticeable when t = 0.5)
   *
   * @param out the receiving dual quat
   * @param a the first operand
   * @param b the second operand
   * @param t interpolation amount, in the range [0-1], between the two inputs
   * @returns out
   */
  static lerp(a: DualQuaternion, b: DualQuaternion, t: number, out: DualQuaternion): DualQuaternion {
    let mt = 1 - t;
    if (DualQuaternion.dot(a, b) < 0) t = -t;

    out.elements[0] = a.elements[0] * mt + b.elements[0] * t;
    out.elements[1] = a.elements[1] * mt + b.elements[1] * t;
    out.elements[2] = a.elements[2] * mt + b.elements[2] * t;
    out.elements[3] = a.elements[3] * mt + b.elements[3] * t;
    out.elements[4] = a.elements[4] * mt + b.elements[4] * t;
    out.elements[5] = a.elements[5] * mt + b.elements[5] * t;
    out.elements[6] = a.elements[6] * mt + b.elements[6] * t;
    out.elements[7] = a.elements[7] * mt + b.elements[7] * t;

    return out;
  }

  /**
   * Calculates the squared length of a vec4
   *
   * @param a vector to calculate squared length of
   * @returns squared length of a
   */
  static squaredLength(a: DualQuaternion): number {
    let x = a.elements[0];
    let y = a.elements[1];
    let z = a.elements[2];
    let w = a.elements[3];
    return x * x + y * y + z * z + w * w;
  }

  /**
   * Calculates the inverse of a dual quat. If they are normalized, conjugate is cheaper
   *
   * @param out the receiving dual quaternion
   * @param a dual quat to calculate inverse of
   * @returns out
   */
  static invert(a: DualQuaternion, out: DualQuaternion): DualQuaternion {
    let sqlen = DualQuaternion.squaredLength(a);
    out[0] = -a[0] / sqlen;
    out[1] = -a[1] / sqlen;
    out[2] = -a[2] / sqlen;
    out[3] = a[3] / sqlen;
    out[4] = -a[4] / sqlen;
    out[5] = -a[5] / sqlen;
    out[6] = -a[6] / sqlen;
    out[7] = a[7] / sqlen;
    return out;
  }

  /**
   * Calculates the conjugate of a dual quat
   * If the dual quaternion is normalized, this function is faster than quat2.inverse and produces the same result.
   *
   * @param out the receiving quaternion
   * @param a quat to calculate conjugate of
   * @returns out
   */
  static conjugate(a: DualQuaternion, out: DualQuaternion): DualQuaternion {
    out.elements[0] = -a.elements[0];
    out.elements[1] = -a.elements[1];
    out.elements[2] = -a.elements[2];
    out.elements[3] = a.elements[3];
    out.elements[4] = -a.elements[4];
    out.elements[5] = -a.elements[5];
    out.elements[6] = -a.elements[6];
    out.elements[7] = a.elements[7];
    return out;
  }

  /**
   * Normalize a dual quat
   *
   * @param out the receiving dual quaternion
   * @param a dual quaternion to normalize
   * @returns out
   * @function
   */
  static normalize(a: DualQuaternion, out: DualQuaternion): DualQuaternion {
    let magnitude = DualQuaternion.squaredLength(a);
    if (magnitude > 0) {
      magnitude = Math.sqrt(magnitude);

      let a0 = a.elements[0] / magnitude;
      let a1 = a.elements[1] / magnitude;
      let a2 = a.elements[2] / magnitude;
      let a3 = a.elements[3] / magnitude;

      let b0 = a.elements[4];
      let b1 = a.elements[5];
      let b2 = a.elements[6];
      let b3 = a.elements[7];

      let a_dot_b = a0 * b0 + a1 * b1 + a2 * b2 + a3 * b3;

      out.elements[0] = a0;
      out.elements[1] = a1;
      out.elements[2] = a2;
      out.elements[3] = a3;

      out.elements[4] = (b0 - a0 * a_dot_b) / magnitude;
      out.elements[5] = (b1 - a1 * a_dot_b) / magnitude;
      out.elements[6] = (b2 - a2 * a_dot_b) / magnitude;
      out.elements[7] = (b3 - a3 * a_dot_b) / magnitude;
    }
    return out;
  }

  /**
   * Returns whether the dual quaternions have approximately the same elements in the same position.
   *
   * @param a the first dual quat.
   * @param b the second dual quat.
   * @returns true if the dual quats are equal, false otherwise.
   */
  static equals(a: DualQuaternion, b: DualQuaternion): boolean {
    let a0 = a.elements[0],
      a1 = a.elements[1],
      a2 = a.elements[2],
      a3 = a.elements[3],
      a4 = a.elements[4],
      a5 = a.elements[5],
      a6 = a.elements[6],
      a7 = a.elements[7];
    let b0 = b.elements[0],
      b1 = b.elements[1],
      b2 = b.elements[2],
      b3 = b.elements[3],
      b4 = b.elements[4],
      b5 = b.elements[5],
      b6 = b.elements[6],
      b7 = b.elements[7];
    return (
      Math.abs(a0 - b0) <= MathUtil.zeroTolerance * Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
      Math.abs(a1 - b1) <= MathUtil.zeroTolerance * Math.max(1.0, Math.abs(a1), Math.abs(b1)) &&
      Math.abs(a2 - b2) <= MathUtil.zeroTolerance * Math.max(1.0, Math.abs(a2), Math.abs(b2)) &&
      Math.abs(a3 - b3) <= MathUtil.zeroTolerance * Math.max(1.0, Math.abs(a3), Math.abs(b3)) &&
      Math.abs(a4 - b4) <= MathUtil.zeroTolerance * Math.max(1.0, Math.abs(a4), Math.abs(b4)) &&
      Math.abs(a5 - b5) <= MathUtil.zeroTolerance * Math.max(1.0, Math.abs(a5), Math.abs(b5)) &&
      Math.abs(a6 - b6) <= MathUtil.zeroTolerance * Math.max(1.0, Math.abs(a6), Math.abs(b6)) &&
      Math.abs(a7 - b7) <= MathUtil.zeroTolerance * Math.max(1.0, Math.abs(a7), Math.abs(b7))
    );
  }

  constructor(
    m11: number = 0,
    m12: number = 0,
    m13: number = 0,
    m14: number = 1,
    m21: number = 0,
    m22: number = 0,
    m23: number = 0,
    m24: number = 0
  ) {
    this.elements[0] = m11;
    this.elements[1] = m12;
    this.elements[2] = m13;
    this.elements[3] = m14;
    this.elements[4] = m21;
    this.elements[5] = m22;
    this.elements[6] = m23;
    this.elements[7] = m24;
  }

  /**
   * Creates a clone of this quaternion.
   * @returns A clone of this quaternion
   */
  clone(): DualQuaternion {
    const elements = this.elements;
    return new DualQuaternion(
      elements[0],
      elements[1],
      elements[2],
      elements[3],
      elements[4],
      elements[5],
      elements[6],
      elements[7]
    );
  }

  /**
   * Clones this quaternion to the specified quaternion.
   * @param out - The specified quaternion
   * @returns The specified quaternion
   */
  cloneTo(out: DualQuaternion): DualQuaternion {
    out.elements[0] = this.elements[0];
    out.elements[1] = this.elements[1];
    out.elements[2] = this.elements[2];
    out.elements[3] = this.elements[3];
    out.elements[4] = this.elements[4];
    out.elements[5] = this.elements[5];
    out.elements[6] = this.elements[6];
    out.elements[7] = this.elements[7];
    return out;
  }
}
