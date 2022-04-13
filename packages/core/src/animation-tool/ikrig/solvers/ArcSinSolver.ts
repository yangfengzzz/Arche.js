import { IKChain, IKLink } from "../rigs/IKChain";
import { SwingTwistBase } from "./support/SwingTwistBase";
import { Matrix, Quaternion, Vector3 } from "@arche-engine/math";

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

export class ArcSinSolver extends SwingTwistBase {
  static rot = new Quaternion();
  static rot2 = new Quaternion();
  static pos = new Vector3();
  static scale = new Vector3();
  static mat = new Matrix();

  // Switching to Negative will flip the rotation arc
  bendDir: number = 1;

  resolve(chain: IKChain): void {
    // Start by Using SwingTwist to target the bone toward the EndEffector
    const ST = this._swingTwist;
    const [rot, pt] = ST.getWorldRot(chain);
    const eff_len = Vector3.distance(ST.effectorPos, ST.originPos);

    // If Distance to the end effector is at or over the chain length,
    // Just Apply SwingTwist to Root Bone.
    // Normalize IK Length from Chain Length
    let len_scl = eff_len / chain.length;
    if (len_scl >= 0.999) {
      // To Local
      pt.getRotation(ArcSinSolver.rot);
      Quaternion.pmulInvert(rot, ArcSinSolver.rot, rot);
      // Save
      chain.links[0].idx.transform.rotationQuaternion.cloneTo(rot);
      return;
    }

    // Split the IK target into Two.
    // The idea is place the first half of the bones to the mid-point of our IK Target
    // Then do the same thing for the second half but invert the angle of rotation.

    const midPos = new Vector3();
    Vector3.lerp(ST.originPos, ST.effectorPos, 0.5, midPos);
    // The end index of First Arc
    const midIdx: number = Math.floor(chain.count / 2) - 1;
    const ws: Matrix = pt.clone();

    // 1st Arc
    this._resolveSlice(chain, 0, midIdx, ST.originPos, midPos, this.bendDir, ws, rot);

    // Compute the new Parent WS Transform as a starting point for the 2nd Arc
    pt.cloneTo(ws);
    for (let i = 0; i <= midIdx; i++) {
      Matrix.multiply(chain.links[i].idx.transform.localMatrix, ws, ws);
    }

    // 2nd Arc
    this._resolveSlice(chain, midIdx + 1, chain.count - 1, midPos, ST.effectorPos, -this.bendDir, ws, undefined);
  }

  /** Apply ArcSolver to a slice of the chain  */
  _resolveSlice(
    chain: IKChain,
    aIdx: number,
    bIdx: number,
    startPos: Vector3,
    endPos: Vector3,
    dir: number,
    pt: Matrix,
    initRot?: Quaternion
  ) {
    const ST = this._swingTwist;
    const rot = new Quaternion();
    const root_rot = new Quaternion();
    let sliceLen: number = 0;
    let i: number;
    let lnk: IKLink;

    // Compute Length of this slice
    for (i = aIdx; i <= bIdx; i++) sliceLen += chain.links[i].len;

    // Use the IK Length Scale to get the Arc angle out of 360 Degrees
    // The Angle isn't perfect, but adding a curved offset fixes things up.

    // Normalize Distance
    const len_scl = Vector3.distance(startPos, endPos) / sliceLen;
    // Total Arc Angle
    const arc_ang = PI_2 * (1 - len_scl) + getOffset(len_scl);
    // angle Per Bone
    const arc_inc = arc_ang / (bIdx - aIdx + 1);
    // axis rotation per bone
    const q_inc = new Quaternion();
    Quaternion.rotationAxisAngle(ST.orthoDir, arc_inc * dir, q_inc);
    // Use to LocalSpace the first bone after ReAlignment
    const final_inv = new Quaternion();
    pt.getRotation(ArcSinSolver.rot);
    Quaternion.invert(ArcSinSolver.rot, final_inv);

    // Apply Rotation Increment to each bone after the first one
    for (i = aIdx; i <= bIdx; i++) {
      lnk = chain.links[i];
      lnk.bind.decompose(ArcSinSolver.pos, ArcSinSolver.rot2, ArcSinSolver.scale);

      // Use Init Rotation instead
      // Move Bind to WorldSpace
      if (i == aIdx && initRot) {
        initRot.cloneTo(rot);
      } else {
        Quaternion.multiply(ArcSinSolver.rot, ArcSinSolver.rot2, rot);
      }

      // Add Increment
      // Save as Root WS Rotation for Realignment
      Quaternion.multiply(q_inc, rot, rot);
      if (i == aIdx) rot.cloneTo(root_rot);

      // To Local
      Quaternion.pmulInvert(rot, ArcSinSolver.rot, rot);
      // Save to Pose
      lnk.idx.transform.rotationQuaternion = rot;

      // WS Transform for next bone
      Matrix.affineTransformation(ArcSinSolver.scale, rot, ArcSinSolver.pos, ArcSinSolver.mat);
      pt.multiply(ArcSinSolver.mat);
    }

    // Get the end position of the arc, use that to figure out the rotation need to make that position align to the effector pos
    lnk = chain.links[bIdx];
    // WS Position of the Chain's tail
    const tail_pos = new Vector3(0, lnk.len, 0);
    tail_pos.transformCoordinate(pt);
    // Direction from IK Origin Pos to chain's tail pos
    const tail_dir = new Vector3();
    Vector3.subtract(tail_pos, startPos, tail_dir);

    // Needed for rotationTo
    tail_dir.normalize();

    // Rotation For Alignment
    Quaternion.rotationTo(tail_dir, ST.effectorDir, rot);
    // Apply to the first Bone's initial rotation
    Quaternion.multiply(rot, root_rot, rot);
    // Move it to Root's Local Space
    Quaternion.multiply(final_inv, rot, rot);
    // Save to Pose
    chain.links[aIdx].idx.transform.rotationQuaternion = rot;
  }
}
