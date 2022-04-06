import { Entity } from "../Entity";
import { Quaternion } from "@arche-engine/math";

export class BoneLink {
  fromIndex: Entity;
  toIndex: Entity;

  // Cache the Bone's Parent WorldSpace Quat
  quatFromParent = new Quaternion();
  // Cache the FROM TPOSE Bone's Worldspace Quaternion for DOT Checking
  quatDotCheck = new Quaternion();
  // Handles "FROM WS" -> "TO WS" Transformation
  wquatFromTo = new Quaternion();
  // Cache Result to handle "TO WS" -> "TO LS" Transformation
  toWorldLocal = new Quaternion();

  constructor(fIdx: Entity, tIdx: Entity) {
    this.fromIndex = fIdx;
    this.toIndex = tIdx;
    this._bind();
  }

  _bind() {
    const fromParent = this.fromIndex.parent;
    if (fromParent) {
      fromParent.transform.worldRotationQuaternion.cloneTo(this.quatFromParent);
    }

    const toParent = this.toIndex.parent;
    if (toParent) {
      Quaternion.invert(toParent.transform.worldRotationQuaternion, this.toWorldLocal);
    }

    Quaternion.invert(this.fromIndex.transform.worldRotationQuaternion, this.wquatFromTo);
    Quaternion.multiply(this.wquatFromTo, this.toIndex.transform.worldRotationQuaternion, this.wquatFromTo);

    this.fromIndex.transform.worldRotationQuaternion.cloneTo(this.quatDotCheck);
  }
}
