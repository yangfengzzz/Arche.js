import { IKChain } from "../rigs/IKChain";
import { SwingTwistBase } from "./support/SwingTwistBase";
import { Quaternion, Vector3 } from "@arche-engine/math";

/* [[ NOTES ]]
Get the length of the bones, the calculate the ratio length for the bones based on the chain length
The 3 bones when placed in a zig-zag pattern creates a Parallelogram shape. We can break the shape down into two triangles
By using the ratio of the Target length divided between the 2 triangles, then using the first bone + half of the second bound
to solve for the top 2 joiints, then using the half of the second bone + 3rd bone to solve for the bottom joint.
If all bones are equal length,  then we only need to use half of the target length and only test one triangle and use that for
both triangles, but if bones are uneven, then we need to solve an angle for each triangle which this function does.
*/

function lawcos_sss(aLen: number, bLen: number, cLen: number): number {
  // Law of Cosines - SSS : cos(C) = (a^2 + b^2 - c^2) / 2ab
  // The Angle between A and B with C being the opposite length of the angle.
  let v = (aLen * aLen + bLen * bLen - cLen * cLen) / (2 * aLen * bLen);
  // Clamp to prevent NaN Errors
  if (v < -1) v = -1;
  else if (v > 1) v = 1;
  return Math.acos(v);
}

export class ZSolver extends SwingTwistBase {
  static rot = new Quaternion();

  resolve(chain: IKChain): void {
    // Start by Using SwingTwist to target the bone toward the EndEffector
    const ST = this._swingTwist;
    const [rot, pt] = ST.getWorldRot(chain);

    const b0 = chain.links[0];
    const b1 = chain.links[1];
    const b2 = chain.links[2];
    // Length of First 3 Bones of Chain
    const a_len = b0.len;
    const b_len = b1.len;
    const c_len = b2.len;
    // Half the length of the middle bone.
    const mh_len = b1.len * 0.5;

    // How much to subdivide the Target length between the two triangles
    const eff_len = Vector3.distance(ST.effectorPos, ST.originPos);
    const t_ratio = (a_len + mh_len) / (a_len + b_len + c_len);
    // Long Side Length for 1st Triangle : 0 & 1
    const ta_len = eff_len * t_ratio;
    // Long Side Length for 2nd Triangle : 1 & 2
    const tb_len = eff_len - ta_len;

    const prot = new Quaternion();
    const prot2 = new Quaternion();
    let rad: number;

    // 1ST BONE  a_len, ta_len, bh_len
    // Get the Angle between First Bone and Target.
    rad = lawcos_sss(a_len, ta_len, mh_len);
    // Use the Axis X to rotate by Radian Angle
    Quaternion.pmulAxisAngle(ST.orthoDir, -rad, rot, rot);
    // Save For Next Bone as its WorldSpace Parent
    rot.cloneTo(prot);
    // To Local
    pt.getRotation(ZSolver.rot);
    Quaternion.pmulInvert(rot, ZSolver.rot, rot);
    // Save to Pose
    b0.idx.transform.rotationQuaternion = rot;

    // 2ND BONE
    rad = Math.PI - lawcos_sss(a_len, mh_len, ta_len);
    // Move local bind rot to World Space
    b1.bind.getRotation(ZSolver.rot);
    Quaternion.multiply(prot, ZSolver.rot, rot);
    // Rotation that needs to be applied to bone, same as prev bone
    Quaternion.pmulAxisAngle(ST.orthoDir, rad, rot, rot);
    // Save for next bone
    rot.cloneTo(prot2);
    // To Local
    Quaternion.pmulInvert(rot, prot, rot);
    // Save to Pose
    b1.idx.transform.rotationQuaternion = rot;

    // 3RD BONE
    rad = Math.PI - lawcos_sss(c_len, mh_len, tb_len);
    // Move local bind rot to World Space
    b2.bind.getRotation(ZSolver.rot);
    Quaternion.multiply(prot2, ZSolver.rot, rot);
    // Rotation that needs to be applied to bone, same as prev bone
    Quaternion.pmulAxisAngle(ST.orthoDir, -rad, rot, rot);
    // To Local
    Quaternion.pmulInvert(rot, prot2, rot);
    // Save to Pose
    b2.idx.transform.rotationQuaternion = rot;
  }
}
