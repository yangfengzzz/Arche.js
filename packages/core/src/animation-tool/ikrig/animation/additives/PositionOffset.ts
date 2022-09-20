import { BipedIKPose } from "../BipedIKPose";
import { IIKPoseAdditive } from "../support/IIKPoseAdditive";
import { Vector3 } from "@arche-engine/math";

export class PositionOffset implements IIKPoseAdditive {
  pos = new Vector3();

  constructor(p: Vector3) {
    this.pos.copyFrom(p);
  }

  apply(key: string, src: BipedIKPose): void {
    const o: any = (src as any)[key];
    Vector3.add(o.pos, this.pos, o.pos);
  }
}
