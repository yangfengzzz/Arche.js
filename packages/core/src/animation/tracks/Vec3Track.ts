import type { ITrack, fnInterp, Lerp } from "./types";
import type { FrameInfo } from "../Animator";
import { Pose } from "../armature";
import { ELerp } from "./types";
import TypePool from "../TypePool";
import { Vector3 } from "@arche-engine/math";

function vec3_step(track: ITrack, fi: FrameInfo, out: Vector3): Vector3 {
  return out.setValueByArray(track.values, fi.k0 * 3);
}

function vec3_linear(track: ITrack, fi: FrameInfo, out: Vector3): Vector3 {
  const v0 = TypePool.vec3();
  const v1 = TypePool.vec3();

  v0.setValueByArray(track.values, fi.k0 * 3);
  v1.setValueByArray(track.values, fi.k1 * 3);
  Vector3.lerp(v0, v1, fi.t, out);

  TypePool.recycle_vec3(v0, v1);
  return out;
}

export default class Vec3Track implements ITrack {
  name: string = "Vec3Track";
  values!: Float32Array;
  boneIndex = -1;
  timeStampIndex = -1;
  fnLerp: fnInterp<Vector3> = vec3_linear;

  setInterpolation(i: Lerp): this {
    switch (i) {
      case ELerp.Step:
        this.fnLerp = vec3_step;
        break;
      case ELerp.Linear:
        this.fnLerp = vec3_linear;
        break;
      case ELerp.Cubic:
        console.warn("Vec3 Cubic Lerp Not Implemented");
        break;
    }
    return this;
  }

  apply(pose: Pose, fi: FrameInfo): this {
    const v = TypePool.vec3();
    pose.setLocalPos(this.boneIndex, this.fnLerp(this, fi, v));
    TypePool.recycle_vec3(v);
    return this;
  }
}
