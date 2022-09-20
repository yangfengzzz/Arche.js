import { ISpringType } from "./index";
import { SpringChain } from "./SpringChain";
import { SpringItem } from "./SpringItem";
import { Entity } from "../../Entity";
import { Matrix, Quaternion, Vector3 } from "@arche-engine/math";

export class SpringPos implements ISpringType {
  static pos = new Vector3();
  static rot = new Quaternion();
  static scale = new Vector3();
  static transform = new Matrix();

  setRestPose(chain: SpringChain, resetSpring: boolean = true): void {
    let si: SpringItem;
    let b: Entity;

    for (si of chain.items) {
      // Get Pose Bone
      b = si.index;
      // Set Spring to Start at this Position.
      si.spring.reset(b.transform.worldPosition);
      // Copy LS Transform as this will be the Actual Rest Pose of the bone.
      si.bind.copyFrom(b.transform.localMatrix);
    }
  }

  updatePose(chain: SpringChain, dt: number): void {
    let si: SpringItem;
    let b: Entity;
    let pTran = new Matrix();
    let cTran = new Matrix();
    let iTran = new Matrix();

    // Find the Starting WorldSpace Transform
    // First Chain Link
    si = chain.items[0];
    // Its Pose Bone
    b = si.index;
    if (b.parent) {
      // Use Parent's WS Transform
      pTran.copyFrom(b.parent.transform.worldMatrix);
    } else {
      // Use Pose's Offset if there is no parent.
      pTran.copyFrom(b.transform.worldMatrix);
    }

    // Start Processing Chain
    for (si of chain.items) {
      // Get Pose Bone
      b = si.index;

      // Compute the Bone's Resting WS Transform
      Matrix.multiply(pTran, si.bind, cTran);
      // Set new Target
      cTran.decompose(SpringPos.pos, SpringPos.rot, SpringPos.scale);
      si.spring.setTarget(SpringPos.pos);

      // If no spring movement, save WS transform and move to next item
      if (!si.spring.update(dt)) {
        pTran.copyFrom(cTran);
        continue;
      }

      // Need Parent WS Transform inverted...
      // to move spring position to Local Space,
      Matrix.invert(pTran, iTran);
      Vector3.transformCoordinate(si.spring.val, iTran, b.transform.position);

      // Using new Position, Move Parent WS Transform for the next item
      SpringPos.transform.copyFrom(si.bind);
      const localPos = b.transform.position;
      SpringPos.transform.elements[12] = localPos.x;
      SpringPos.transform.elements[13] = localPos.y;
      SpringPos.transform.elements[14] = localPos.z;
      Matrix.multiply(pTran, SpringPos.transform, pTran);
    }
  }
}
