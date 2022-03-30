import { Bone, Pose } from "../armature";
import { ISpringType } from "./index";
import { SpringChain } from "./SpringChain";
import { SpringItem } from "./SpringItem";
import { BoneTransform, Quaternion, Vector3 } from "@arche-engine/math";

export class SpringRot implements ISpringType {
  setRestPose(chain: SpringChain, pose: Pose, resetSpring: boolean = true, debug?: any): void {
    const tail = new Vector3();
    let si: SpringItem;
    let b: Bone;

    for (si of chain.items) {
      // Get Pose Bone
      b = pose.bones[si.index];

      if (resetSpring) {
        // Tail's LocalSpace Position.
        tail.setValue(0, b.len, 0);
        // Move Tail to WorldSpace
        b.world.transformVec3(tail);
        // Set Spring to Start at this Position.
        si.spring.reset(tail);
      }

      // Copy LS Transform as this will be the Actual Rest Pose of the bone.
      si.bind.copy(b.local);
    }
  }

  updatePose(chain: SpringChain, pose: Pose, dt: number, debug?: any): void {
    let si: SpringItem;
    let b: Bone;
    let tail = new Vector3();
    let pTran = new BoneTransform();
    let cTran = new BoneTransform();
    let va = new Vector3();
    let vb = new Vector3();
    let rot = new Quaternion();

    // Find the Starting WorldSpace Transform
    // First Chain Link
    si = chain.items[0];
    // Its Pose Bone
    b = pose.bones[si.index];

    pose.getWorldTransform(b.pidx, pTran);

    // Start Processing Chain
    for (si of chain.items) {
      // Get Pose Bone
      b = pose.bones[si.index];

      // Compute the Tail's Position as if this bone had never rotated
      // The idea is to find its resting location which will be our spring target.
      // Compute the Bone's Resting WS Transform
      cTran.fromMul(pTran, si.bind);
      // Tail's LocalSpace Position.
      tail.setValue(0, b.len, 0);
      // Move Tail to WorldSpace
      cTran.transformVec3(tail);

      // Set new Target
      // Update Spring with new Target & DeltaTime
      si.spring.setTarget(tail).update(dt);

      // Compute the rotation based on two direction, one is our bone's position toward
      // its resting tail position with the other toward our spring tail position.
      // Resting Ray
      Vector3.subtract(tail, cTran.pos, va);
      va.normalize();

      // Spring Ray
      Vector3.subtract(si.spring.val, cTran.pos, vb);
      vb.normalize();

      // Resting to Spring
      Quaternion.rotationTo(va, vb, rot);
      // Prevent any Artifacts
      Quaternion.dotNegate(rot, cTran.rot, rot);
      // Apply spring rotation to our resting rotation
      Quaternion.multiply(rot, cTran.rot, rot);
      // Use parent to convert to Local Space
      Quaternion.pmulInvert(rot, pTran.rot, rot);
      // TODO : Normalize as a possible fix if artifacts creeping up

      // Save Result back to pose bone
      rot.cloneTo(b.local.rot);
      // Using new Rotation, Move Parent WS Transform for the next item
      pTran.mul(rot, si.bind.pos, si.bind.scl);
    }
  }
}
