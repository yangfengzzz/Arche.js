import { IKChain, IKLink } from "../rigs/IKChain";
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

export class SpringSolver extends SwingTwistBase {
  static rot = new Quaternion();

  resolve(chain: IKChain): void {
    // Start by Using SwingTwist to target the bone toward the EndEffector
    const ST = this._swingTwist;
    const [rot, pt] = ST.getWorldRot(chain);
    const effLen = Vector3.distance(ST.effectorPos, ST.originPos);

    // Going to treat the chain as if each bone is the same length to simplify the solver.
    // The basic Idea is that the line that forms the IK direction will be subdivided by
    // the number of pair bones to form a chain of triangles. So Each A, B is a bone and C
    // will be the sub divided IK line segment.
    //     / \     / \
    //  A /   \ B /   \
    //   /_____\ /_____\
    //    C ( Base )

    // Previous Parent WS Rotation
    pt.getRotation(SpringSolver.rot);
    const qprev = SpringSolver.rot.clone();
    // Save Child WS Rotation to be the next parent
    const qnext = new Quaternion();
    // First bone of the triangle
    let lnk: IKLink = chain.links[0];
    // Treat each bone as the same length
    const boneLen = lnk.len;
    // Length of the sub divided IK segment, will be triangle's base len
    const baseLen = effLen / (chain.count / 2);
    // Angle of AC
    const rad_a = lawcos_sss(boneLen, baseLen, boneLen);
    // Angle 0f AB
    const rad_b = Math.PI - lawcos_sss(boneLen, boneLen, baseLen);
    // First Bone Rotation
    const r_axis_an = new Quaternion();
    Quaternion.rotationAxisAngle(ST.orthoDir, -rad_a, r_axis_an);
    // Second Bone Rotation
    const r_axis_b = new Quaternion();
    Quaternion.rotationAxisAngle(ST.orthoDir, rad_b, r_axis_b);

    // The first bone of the Chain starts off with the rotation from the SwingTwistSolver.
    // So from here, just need to apply the first axis rotation, save the WS for next bone's parent
    // then convert it back to local space to be saved back to the pose.
    // Apply First Rotation to SwingTwist Rot
    Quaternion.multiply(r_axis_an, rot, rot);
    // Save as Next Parent Rotation
    qnext.copyFrom(rot);
    // To Local
    Quaternion.pmulInvert(rot, qprev, rot);
    // Save
    lnk.idx.transform.rotationQuaternion = rot;
    // Move as Prev Parent Rotation
    qprev.copyFrom(qnext);

    // The last thing we do is fix the first bone rotation. The first bone starts off
    // aligned with the IK line, so we rotate N degrees to the left of the line for it.
    // When we start the loop, every first bone will now be looking down across the IK line
    // at about N amount of the line on the right side. To get it to where we need to go, we
    // move it N degrees to the left which should align it again to the IK line, THEN we add
    // N degrees more to the left which should have it pointing to the same direction as the
    // first bone of the chain. So we just fix it by going N*-2 degrees on the same rotation axis
    Quaternion.rotationAxisAngle(ST.orthoDir, rad_a * -2, r_axis_an);

    let r_axis: Quaternion;
    for (let i = 1; i < chain.count; i++) {
      lnk = chain.links[i];
      r_axis = (i & 1) == 0 ? r_axis_an : r_axis_b; // Use A for Even Numbers, B for Odd
      // Move Local Bind to WorldSpace
      lnk.bind.getRotation(SpringSolver.rot);
      Quaternion.multiply(qprev, SpringSolver.rot, rot);
      // Then apply the AB rotation to get it to point toward the IK Line
      Quaternion.multiply(r_axis, rot, rot);
      // Save WS rotation for next bone
      qnext.copyFrom(rot);
      // To local space...
      Quaternion.pmulInvert(rot, qprev, rot);
      // Save to Pose
      lnk.idx.transform.rotationQuaternion = rot;
      // Move WS to qprev to act as the starting point
      qprev.copyFrom(qnext);
    }
  }
}
