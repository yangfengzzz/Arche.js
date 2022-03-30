import { BipedIKPose } from "../BipedIKPose";
import type IIKPoseAdditive from "../support/IIKPoseAdditive";
import { Vector3 } from "@arche-engine/math";

export default class PositionOffset implements IIKPoseAdditive {
  pos = new Vector3();

  constructor(p: Vector3) {
    p.cloneTo(this.pos);
  }

  apply(key: string, src: BipedIKPose): void {
    const o: any = (src as any)[key];
    Vector3.add(o.pos, this.pos, o.pos);
  }
}
