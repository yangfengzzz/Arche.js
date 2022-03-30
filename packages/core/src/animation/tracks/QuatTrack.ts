import { ITrack, fnInterp, Lerp } from "./types";
import { FrameInfo } from "../Animator";
import { TypePool } from "../TypePool";
import { Quaternion } from "@arche-engine/math";
import { ELerp } from "./types";
import { Pose } from "../armature";

function quat_step(track: ITrack, fi: FrameInfo, out: Quaternion): Quaternion {
  return out.setValueByArray(track.values, fi.k0 * 4);
}

function quat_linear(track: ITrack, fi: FrameInfo, out: Quaternion): Quaternion {
  const v0 = TypePool.quat();
  const v1 = TypePool.quat();

  v0.setValueByArray(track.values, fi.k0 * 4);
  v1.setValueByArray(track.values, fi.k1 * 4);
  Quaternion.slerp(v0, v1, fi.t, out);

  TypePool.recycle_quat(v0, v1);
  return out;
}

export class QuatTrack implements ITrack {
  name: string = "QuatTrack";
  values!: Float32Array;
  boneIndex = -1;
  timeStampIndex = -1;
  fnLerp: fnInterp<Quaternion> = quat_linear;

  setInterpolation(i: Lerp): this {
    switch (i) {
      case ELerp.Step:
        this.fnLerp = quat_step;
        break;
      case ELerp.Linear:
        this.fnLerp = quat_linear;
        break;
      case ELerp.Cubic:
        console.warn("Quat Cubic Lerp Not Implemented");
        break;
    }
    return this;
  }

  apply(pose: Pose, fi: FrameInfo): this {
    const q = TypePool.quat();
    pose.setLocalRot(this.boneIndex, this.fnLerp(this, fi, q));
    TypePool.recycle_quat(q);
    return this;
  }
}
