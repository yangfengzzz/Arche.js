import { ISpringType } from "./index";
import { SpringChain } from "./SpringChain";
import { SpringItem } from "./SpringItem";
import { Matrix, Quaternion, Vector3 } from "@arche-engine/math";
import { Entity } from "../../Entity";

export class SpringRot implements ISpringType {
  static pos = new Vector3();
  static rot = new Quaternion();
  static scale = new Vector3();
  static transform = new Matrix();

  setRestPose(chain: SpringChain, resetSpring: boolean = true): void {
    const tail = new Vector3();
    let si: SpringItem;
    let b: Entity;

    for (si of chain.items) {
      // Get Pose Bone
      b = si.index;

      if (resetSpring) {
        // Tail's LocalSpace Position.
        tail.set(0, b.transform.position.length(), 0);
        // Move Tail to WorldSpace
        Vector3.transformCoordinate(tail, b.transform.worldMatrix, tail);
        // Set Spring to Start at this Position.
        si.spring.reset(tail);
      }

      // Copy LS Transform as this will be the Actual Rest Pose of the bone.
      si.bind.copyFrom(b.transform.localMatrix);
    }
  }

  updatePose(chain: SpringChain, dt: number): void {
    let si: SpringItem;
    let b: Entity;
    let tail = new Vector3();
    let pTran = new Matrix();
    let cTran = new Matrix();
    let va = new Vector3();
    let vb = new Vector3();
    let rot = new Quaternion();

    // Find the Starting WorldSpace Transform
    // First Chain Link
    si = chain.items[0];
    // Its Pose Bone
    b = si.index;

    pTran.copyFrom(b.parent.transform.worldMatrix);

    // Start Processing Chain
    for (si of chain.items) {
      // Get Pose Bone
      b = si.index;

      // Compute the Tail's Position as if this bone had never rotated
      // The idea is to find its resting location which will be our spring target.
      // Compute the Bone's Resting WS Transform
      Matrix.multiply(pTran, si.bind, cTran);
      // Tail's LocalSpace Position.
      tail.set(0, b.transform.position.length(), 0);
      // Move Tail to WorldSpace
      Vector3.transformCoordinate(tail, cTran, tail);

      // Set new Target
      // Update Spring with new Target & DeltaTime
      si.spring.setTarget(tail).update(dt);

      // Compute the rotation based on two direction, one is our bone's position toward
      // its resting tail position with the other toward our spring tail position.
      // Resting Ray
      cTran.decompose(SpringRot.pos, SpringRot.rot, SpringRot.scale);
      SpringRot.rot.normalize();
      Vector3.subtract(tail, SpringRot.pos, va);
      va.normalize();

      // Spring Ray
      Vector3.subtract(si.spring.val, SpringRot.pos, vb);
      vb.normalize();

      // Resting to Spring
      Quaternion.rotationTo(va, vb, rot);
      // Prevent any Artifacts
      Quaternion.dotNegate(rot, SpringRot.rot, rot);
      // Apply spring rotation to our resting rotation
      Quaternion.multiply(rot, SpringRot.rot, rot);
      // Use parent to convert to Local Space
      pTran.decompose(SpringRot.pos, SpringRot.rot, SpringRot.scale);
      SpringRot.rot.normalize();
      Quaternion.pmulInvert(rot, SpringRot.rot, rot);
      // TODO : Normalize as a possible fix if artifacts creeping up

      // Save Result back to pose bone
      b.transform.rotationQuaternion = rot;
      // Using new Rotation, Move Parent WS Transform for the next item
      si.bind.decompose(SpringRot.pos, SpringRot.rot, SpringRot.scale);
      Matrix.affineTransformation(SpringRot.scale, rot, SpringRot.pos, SpringRot.transform);
      pTran.multiply(SpringRot.transform);
    }
  }
}
