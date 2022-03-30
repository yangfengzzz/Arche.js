import { Pose } from "../../../armature";
import { IKChain } from "../../rigs/IKChain";
import { IKData } from "../..";
import { ISolver } from "./ISolver";
import { SwingTwistSolver } from "../SwingTwistSolver";
import { Vector3 } from "@arche-engine/math";

export class SwingTwistBase implements ISolver {
  _swingTwist = new SwingTwistSolver();

  initData(pose?: Pose, chain?: IKChain): this {
    if (pose && chain) this._swingTwist.initData(pose, chain);
    return this;
  }

  setTargetDir(e: Vector3, pole?: Vector3, effectorScale?: number): this {
    this._swingTwist.setTargetDir(e, pole, effectorScale);
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

  resolve(chain: IKChain, pose: Pose, debug?: any): void {}

  ikDataFromPose(chain: IKChain, pose: Pose, out: IKData.DirScale): void {
    // Length Scaled & Effector Direction
    const p0: Vector3 = chain.getStartPosition(pose);
    const p1: Vector3 = chain.getTailPosition(pose, true);
    const dir = new Vector3();
    Vector3.subtract(p1, p0, dir);

    out.lenScale = dir.length() / chain.length;
    Vector3.normalize(dir, out.effectorDir);

    // Pole Direction
    // Chain Link : Pole is based on the first Bone's Rotation
    const lnk = chain.first();
    // Bone ref from Pose
    const bp = pose.bones[lnk.idx];

    // Get Alt Pole Direction from Pose
    Vector3.transformByQuat(lnk.poleDir, bp.world.rot, dir);
    // Get orthogonal Direction...
    Vector3.cross(dir, out.effectorDir, dir);
    // to Align Pole to Effector
    Vector3.cross(out.effectorDir, dir, dir);
    Vector3.normalize(dir, out.poleDir);
  }
}
