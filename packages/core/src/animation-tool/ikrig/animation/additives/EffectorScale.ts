import { BipedIKPose } from "../BipedIKPose";
import { IIKPoseAdditive } from "../support/IIKPoseAdditive";

export class EffectorScale implements IIKPoseAdditive {
  scale: number = 1.0;

  constructor(s: number) {
    this.scale = s;
  }

  apply(key: string, src: BipedIKPose): void {
    const o: any = (src as any)[key];
    o.lenScale *= this.scale;
  }
}
