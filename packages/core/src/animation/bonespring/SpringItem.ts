import { SpringVec3 } from "./implicit_euler/SpringVec3";
import { BoneTransform } from "@arche-engine/math";

export class SpringItem {
  index: number;
  name: string;
  spring = new SpringVec3();
  // Bind Transform in Local Space
  bind = new BoneTransform();

  constructor(name: string, idx: number) {
    this.name = name;
    this.index = idx;
  }
}
