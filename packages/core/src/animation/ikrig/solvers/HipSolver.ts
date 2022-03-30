import { Pose } from "../../armature";
import type { IKChain } from "../rigs/IKChain";
import type { IKData } from "..";
import type { ISolver } from "./support/ISolver";
import { SwingTwistSolver } from "./SwingTwistSolver";
import { BoneTransform, Vector3 } from "@arche-engine/math";

export class HipSolver implements ISolver {
  //#region MAIN
  isAbs: boolean = true;
  position = new Vector3();
  bindHeight: number = 0;
  _swingTwist = new SwingTwistSolver();

  initData(pose?: Pose, chain?: IKChain): this {
    if (pose && chain) {
      const b = pose.bones[chain.links[0].idx];
      this.setMovePos(b.world.pos, true);

      this._swingTwist.initData(pose, chain);
    }
    return this;
  }

  setTargetDir(e: Vector3, pole?: Vector3): this {
    this._swingTwist.setTargetDir(e, pole);
    return this;
  }

  setTargetPos(v: Vector3, pole?: Vector3): this {
    this._swingTwist.setTargetPos(v, pole);
    return this;
  }

  setTargetPole(v: Vector3): this {
    this._swingTwist.setTargetPole(v);
    return this;
  }

  setMovePos(pos: Vector3, isAbs: boolean = true, bindHeight: number = 0): this {
    this.position.x = pos.x;
    this.position.y = pos.y;
    this.position.z = pos.z;
    this.isAbs = isAbs;
    this.bindHeight = bindHeight;
    return this;
  }

  resolve(chain: IKChain, pose: Pose, debug?: any): void {
    const hipPos = new Vector3();
    const pt = new BoneTransform();
    const ptInv = new BoneTransform();
    const lnk = chain.first();

    // Get the Starting Transform
    if (lnk.pidx == -1) pt.copy(pose.offset);
    else pose.getWorldTransform(lnk.pidx, pt);

    // Invert Transform to Translate Position to Local Space
    ptInv.fromInvert(pt);

    // Which Position Type Are we handling?
    if (this.isAbs) {
      // Set Absolute Position of where the hip must be
      this.position.cloneTo(hipPos);
    } else {
      const ct = new BoneTransform();
      // Get Bone's BindPose position in relation to this pose
      ct.fromMul(pt, lnk.bind);

      if (this.bindHeight == 0) {
        // Add Offset Position
        Vector3.add(ct.pos, this.position, hipPos);
      } else {
        // Need to scale offset position in relation to the Hip Height of the Source
        Vector3.scale(this.position, Math.abs(ct.pos[1] / this.bindHeight), hipPos);
        Vector3.add(hipPos, ct.pos, hipPos);
      }
    }

    // To Local Space
    ptInv.transformVec3(hipPos);
    pose.setLocalPos(lnk.idx, hipPos);

    // Apply SwingTwist Rotation
    this._swingTwist.resolve(chain, pose, debug);
  }

  ikDataFromPose(chain: IKChain, pose: Pose, out: IKData.Hip): void {
    const v = new Vector3();
    const lnk = chain.first();
    const b = pose.bones[lnk.idx];
    const tran = new BoneTransform();

    // Figure out the Delta Change of the Hip Position from its Bind Pose to its Animated Pose
    // Use Offset if there is no parent
    if (b.pidx == -1) tran.fromMul(pose.offset, lnk.bind);
    // Compute Parent's WorldSpace transform, then add local bind pose to it.
    else pose.getWorldTransform(lnk.pidx, tran).mul(lnk.bind);

    // Position Change from Bind Pose
    Vector3.subtract(b.world.pos, tran.pos, v);

    // This isn't an absolute Position, its a delta change
    out.isAbsolute = false;
    // Use the bind's World Space Y value as its bind height
    out.bindHeight = tran.pos[1];

    // Save Delta Change
    v.cloneTo(out.pos);

    // Alt Effector
    Vector3.transformByQuat(lnk.effectorDir, b.world.rot, v);
    Vector3.normalize(v, out.effectorDir);

    // Alt Pole
    Vector3.transformByQuat(lnk.poleDir, b.world.rot, v);
    Vector3.normalize(v, out.poleDir);
  }
}
