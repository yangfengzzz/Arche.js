import { IKChain } from "../rigs/IKChain";
import { SwingTwistBase } from "./support/SwingTwistBase";
import { Quaternion, Vector3 } from "@arche-engine/math";

function lawcos_sss(aLen: number, bLen: number, cLen: number): number {
  // Law of Cosines - SSS : cos(C) = (a^2 + b^2 - c^2) / 2ab
  // The Angle between A and B with C being the opposite length of the angle.
  let v = (aLen * aLen + bLen * bLen - cLen * cLen) / (2 * aLen * bLen);
  // Clamp to prevent NaN Errors
  if (v < -1) v = -1;
  else if (v > 1) v = 1;
  return Math.acos(v);
}

export class LimbSolver extends SwingTwistBase {
  static rot = new Quaternion();

  // Switching to Negative will flip the rotation arc
  bendDir: number = 1;

  invertBend(): this {
    this.bendDir = -this.bendDir;
    return this;
  }

  resolve(chain: IKChain): void {
    // Start by Using SwingTwist to target the bone toward the EndEffector
    const ST = this._swingTwist;
    const [rot, pt] = ST.getWorldRot(chain);

    let b0 = chain.links[0],
      b1 = chain.links[1],
      alen = b0.len,
      blen = b1.len,
      clen = Vector3.distance(ST.effectorPos, ST.originPos),
      prot = new Quaternion(),
      rad: number;

    // Get the Angle between First Bone and Target.
    rad = lawcos_sss(alen, clen, blen);
    // Use the Axis X to rotate by Radian Angle
    Quaternion.pmulAxisAngle(ST.orthoDir, -rad * this.bendDir, rot, rot);
    // Save For Next Bone as Starting Point.
    prot.copyFrom(rot);
    // To Local
    pt.getRotation(LimbSolver.rot);
    Quaternion.pmulInvert(rot, LimbSolver.rot, rot);
    // Save to Pose
    b0.idx.transform.rotationQuaternion = rot;

    // SECOND BONE
    // Need to rotate from Right to Left, So take the angle and subtract it from 180 to rotate from
    // the other direction. Ex. L->R 70 degrees == R->L 110 degrees
    rad = Math.PI - lawcos_sss(alen, blen, clen);
    // Get the Bind WS Rotation for this bone
    b1.bind.getRotation(LimbSolver.rot);
    Quaternion.multiply(prot, LimbSolver.rot, rot);
    // Rotation that needs to be applied to bone.
    Quaternion.pmulAxisAngle(ST.orthoDir, rad * this.bendDir, rot, rot);
    // To Local Space
    Quaternion.pmulInvert(rot, prot, rot);
    // Save to Pose
    b1.idx.transform.rotationQuaternion = rot;
  }
}
