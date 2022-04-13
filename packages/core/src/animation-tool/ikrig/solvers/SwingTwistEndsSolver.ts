import { IKChain, IKLink } from "../rigs/IKChain";
import { ISolver } from "./support/ISolver";
import { DirEnds } from "../IKData";
import { Quaternion, Vector3 } from "@arche-engine/math";
import { Entity } from "../../../Entity";

export class SwingTwistEndsSolver implements ISolver {
  static rot = new Quaternion();

  startEffectorDir = new Vector3();
  startPoleDir = new Vector3();
  endEffectorDir = new Vector3();
  endPoleDir = new Vector3();

  initData(chain?: IKChain): this {
    if (chain) {
      const pole = new Vector3();
      const eff = new Vector3();
      let rot: Quaternion;
      let lnk: IKLink;

      // First Direction
      lnk = chain.first();
      rot = lnk.idx.transform.worldRotationQuaternion;
      Vector3.transformByQuat(lnk.effectorDir, rot, eff);
      Vector3.transformByQuat(lnk.poleDir, rot, pole);
      this.setStartDir(eff, pole);

      // Second Direction
      lnk = chain.last();
      rot = lnk.idx.transform.worldRotationQuaternion;
      Vector3.transformByQuat(lnk.effectorDir, rot, eff);
      Vector3.transformByQuat(lnk.poleDir, rot, pole);
      this.setEndDir(eff, pole);
    }
    return this;
  }

  setStartDir(eff: Vector3, pole: Vector3): this {
    this.startEffectorDir.x = eff.x;
    this.startEffectorDir.y = eff.y;
    this.startEffectorDir.z = eff.z;
    this.startPoleDir.x = pole.x;
    this.startPoleDir.y = pole.y;
    this.startPoleDir.z = pole.z;
    return this;
  }

  setEndDir(eff: Vector3, pole: Vector3): this {
    this.endEffectorDir.x = eff.x;
    this.endEffectorDir.y = eff.y;
    this.endEffectorDir.z = eff.z;
    this.endPoleDir.x = pole.x;
    this.endPoleDir.y = pole.y;
    this.endPoleDir.z = pole.z;
    return this;
  }

  resolve(chain: IKChain): void {
    const iEnd = chain.count - 1;
    const pRot = new Quaternion();
    const cRot = new Quaternion();
    const ikEffe = new Vector3();
    const ikPole = new Vector3();
    const dir = new Vector3();
    const rot = new Quaternion();
    const tmp = new Quaternion();

    let lnk: IKLink = chain.first();
    let t: number;

    // Get Starting Parent WS Rotation
    if (lnk.pidx != null) {
      lnk.pidx.transform.worldRotationQuaternion.cloneTo(pRot);
    } else {
      lnk.idx.transform.worldRotationQuaternion.cloneTo(pRot);
    }

    for (let i = 0; i <= iEnd; i++) {
      // PREPARE
      // Lerp Value
      t = i / iEnd;
      // Which Bone to act on
      lnk = chain.links[i];

      // Get Current Effector Direction
      Vector3.lerp(this.startEffectorDir, this.endEffectorDir, t, ikEffe);
      // Get Current Pole Direction
      Vector3.lerp(this.startPoleDir, this.endPoleDir, t, ikPole);

      // SWING
      // Get bone in WS that has yet to have any rotation applied
      lnk.bind.getRotation(SwingTwistEndsSolver.rot);
      Quaternion.multiply(pRot, SwingTwistEndsSolver.rot, cRot);
      // What is the WS Effector Direction
      Vector3.transformByQuat(lnk.effectorDir, cRot, dir);
      // Create our Swing Rotation
      Quaternion.rotationTo(dir, ikEffe, rot);
      // Then Apply to our Bone, so its now swong to match the ik effector dir
      Quaternion.multiply(rot, cRot, cRot);

      // TWIST
      // Get our Current Pole Direction from Our Effector Rotation
      Vector3.transformByQuat(lnk.poleDir, cRot, dir);
      // Create our twist rotation
      Quaternion.rotationTo(dir, ikPole, rot);
      // Apply Twist so now it matches our IK Pole direction
      Quaternion.multiply(rot, cRot, cRot);
      // Save as the next Parent Rotation
      cRot.cloneTo(tmp);

      // To Local Space
      Quaternion.pmulInvert(cRot, pRot, cRot);
      // Save back to pose
      lnk.idx.transform.rotationQuaternion = cRot;
      // Set WS Rotation for Next Bone.
      if (i != iEnd) tmp.cloneTo(pRot);
    }
  }

  ikDataFromPose(chain: IKChain, out: DirEnds): void {
    const dir = new Vector3();
    let lnk: IKLink;
    let b: Entity;

    // First Bone
    lnk = chain.first();
    b = lnk.idx;

    Vector3.transformByQuat(lnk.effectorDir, b.transform.worldRotationQuaternion, dir);
    Vector3.normalize(dir, out.startEffectorDir);

    Vector3.transformByQuat(lnk.poleDir, b.transform.worldRotationQuaternion, dir);
    Vector3.normalize(dir, out.startPoleDir);

    // Last Bone
    lnk = chain.last();
    b = lnk.idx;

    Vector3.transformByQuat(lnk.effectorDir, b.transform.worldRotationQuaternion, dir);
    Vector3.normalize(dir, out.endEffectorDir);

    Vector3.transformByQuat(lnk.poleDir, b.transform.worldRotationQuaternion, dir);
    Vector3.normalize(dir, out.endPoleDir);
  }
}
