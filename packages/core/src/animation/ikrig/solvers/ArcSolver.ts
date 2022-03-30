import { Pose } from "../../armature";
import { IKChain, IKLink } from "../rigs/IKChain";
import { SwingTwistBase } from "./support/SwingTwistBase";
import { Quaternion, Vector3 } from "@arche-engine/math";

// #region ARC OFFSET RATIO CURVE
// if Scale <= 0.3 or >= 1, Offset is zero
// 20 Samples between 0 and 1 of PI*2.
const PI_2 = Math.PI * 2;
const OFFSETS: Array<number> = [
  0, 0.025, 0.07, 0.12808739578845105, 0.19558255045541925, 0.2707476090618156, 0.35128160042581186,
  0.43488355336557927, 0.5192524966992895, 0.6051554208208854, 0.6887573737606529, 0.7692913651246491,
  0.8444564237310455, 0.9119515783980137, 0.9694758579437253, 1.0124273200045233, 1.034670041428865, 1.026233147095494,
  0.966407896367954, 0.8053399136399616, 0
];

function getOffset(t: number): number {
  if (t <= 0.03 || t >= 1) return 0;

  const i = 20 * t;
  const idx = Math.floor(i);
  const fract = i - idx;

  const a = OFFSETS[idx];
  const b = OFFSETS[idx + 1];
  return a * (1 - fract) + b * fract;
}

export class ArcSolver extends SwingTwistBase {
  // Switching to Negative will flip the rotation arc
  bendDir: number = 1;

  invertBend(): this {
    this.bendDir = -this.bendDir;
    return this;
  }

  resolve(chain: IKChain, pose: Pose, debug?: any): void {
    // Start by Using SwingTwist to target the bone toward the EndEffector
    const ST = this._swingTwist;
    const [rot, pt] = ST.getWorldRot(chain, pose, debug);
    const eff_len = Vector3.distance(ST.effectorPos, ST.originPos);

    // If Distance to the end effector is at or over the chain length,
    // Just Apply SwingTwist to Root Bone.
    // Normalize IK Length from Chain Length
    let len_scl = eff_len / chain.length;
    if (len_scl >= 0.999) {
      // To Local
      Quaternion.pmulInvert(rot, rot, pt.rot);
      // Save
      pose.setLocalRot(chain.links[0].idx, rot);
      return;
    }

    // Use the IK Length Scale to get the Arc angle out of 360 Degrees
    // The Angle isn't perfect, but adding a curved offset fixes things up.
    const arc_ang = PI_2 * (1 - len_scl) + getOffset(len_scl);

    // Divide the Arc Angle how many bones on the chain.
    const arc_inc = (arc_ang / chain.count) * this.bendDir;

    // Use IK Ortho Dir & Arc Angle Increment as our Rotation to apply to each bone
    // Rotation Increment for each bone
    const q_inc = new Quaternion();
    Quaternion.rotationAxisAngle(ST.orthoDir, arc_inc, q_inc);
    // Use to LocalSpace the first bone after ReAlignment
    const final_inv = new Quaternion();
    Quaternion.invert(pt.rot, final_inv);

    // Handle the First Bone in the chain, Need to Store
    // The world rotation to use later in the alignment

    let lnk: IKLink = chain.links[0];
    // Apply Inc to First Bone's SwingTwist Rotation
    Quaternion.multiply(q_inc, rot, rot);

    // Root WS Rot, Save for Alignment
    const init_rot = rot.clone();
    // To Local
    Quaternion.pmulInvert(rot, pt.rot, rot);

    // Dont Really need to save yet, save after realignment
    pose.setLocalRot(lnk.idx, rot);
    // Set new Parent Transform for next bone
    pt.mul(rot, lnk.bind.pos, lnk.bind.scl);

    // Apply Rotation Increment to each bone after the first one
    let i: number;
    for (i = 1; i < chain.count; i++) {
      lnk = chain.links[i];

      // Move Bind to WorldSpace
      Quaternion.multiply(pt.rot, lnk.bind.rot, rot);
      // Add Increment
      Quaternion.multiply(q_inc, rot, rot);
      // To Local
      Quaternion.pmulInvert(rot, pt.rot, rot);
      // Save to Pose
      pose.setLocalRot(lnk.idx, rot);
      // WS Transform for next bone
      pt.mul(rot, lnk.bind.pos, lnk.bind.scl);
    }

    // Get the end position of the arc, use that to figure out
    // the rotation need to make that position align to the effector pos
    // WS Position of the Chain's tail
    const tail_pos = pt.transformVec3(new Vector3(0, lnk.len, 0));
    // Direction from IK Origin Pos to chain's tail pos
    const tail_dir = new Vector3();
    Vector3.subtract(tail_pos, ST.originPos, tail_dir);
    // Needed for rotationTo
    tail_dir.normalize();
    // Rotation For Alignment
    Quaternion.rotationTo(tail_dir, ST.effectorDir, rot);
    // Apply to the first Bone's initial rotation
    Quaternion.multiply(rot, init_rot, rot);
    // Move it to Root's Local Space
    Quaternion.multiply(final_inv, rot, rot);
    // Save to Pose
    pose.setLocalRot(chain.links[0].idx, rot);
  }
}
