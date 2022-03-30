import { Bone, Pose } from "../armature";
import { ISpringType } from "./index";
import { SpringChain } from "./SpringChain";
import { SpringItem } from "./SpringItem";
import { BoneTransform } from "@arche-engine/math";

export class SpringPos implements ISpringType {
  setRestPose(chain: SpringChain, pose: Pose, resetSpring: boolean = true, debug?: any): void {
    let si: SpringItem;
    let b: Bone;

    for (si of chain.items) {
      // Get Pose Bone
      b = pose.bones[si.index];
      // Set Spring to Start at this Position.
      si.spring.reset(b.world.pos);
      // Copy LS Transform as this will be the Actual Rest Pose of the bone.
      si.bind.copy(b.local);
    }
  }

  updatePose(chain: SpringChain, pose: Pose, dt: number, debug?: any): void {
    let si: SpringItem;
    let b: Bone;
    let pTran = new BoneTransform();
    let cTran = new BoneTransform();
    let iTran = new BoneTransform();

    // Find the Starting WorldSpace Transform
    // First Chain Link
    si = chain.items[0];
    // Its Pose Bone
    b = pose.bones[si.index];
    // Use Parent's WS Transform
    if (b.pidx != -1) pTran.copy(pose.bones[b.pidx].world);
    // Use Pose's Offset if there is no parent.
    else pTran.copy(pose.offset);

    // Start Processing Chain
    for (si of chain.items) {
      // Get Pose Bone
      b = pose.bones[si.index];

      // Compute the Bone's Resting WS Transform
      cTran.fromMul(pTran, si.bind);
      // Set new Target
      si.spring.setTarget(cTran.pos);

      // If no spring movement, save WS transform and move to next item
      if (!si.spring.update(dt)) {
        pTran.copy(cTran);
        continue;
      }

      // Need Parent WS Transform inverted...
      // to move spring position to Local Space,
      iTran.fromInvert(pTran).transformVec3(si.spring.val, b.local.pos);

      // Using new Position, Move Parent WS Transform for the next item
      pTran.mul(si.bind.rot, b.local.pos, si.bind.scl);
    }
  }
}
