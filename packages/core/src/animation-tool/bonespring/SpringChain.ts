import { ISpringType } from "./index";

import { SpringItem } from "./SpringItem";
import { SpringRot } from "./SpringRot";
import { SpringPos } from "./SpringPos";
import { Entity } from "../../Entity";

export class SpringChain {
  static ROT = 0;
  static POS = 1;

  items: SpringItem[] = [];
  name: string;
  spring: ISpringType;

  constructor(name: string, type = 0) {
    this.name = name;
    this.spring = type == 1 ? new SpringPos() : new SpringRot();
  }

  setBones(aryName: Entity[], osc: number = 5.0, damp: number = 0.5): void {
    let bn: Entity;
    let spr: SpringItem;

    for (bn of aryName) {
      if (bn == null) {
        console.log("Bone not found for spring: ", bn);
        continue;
      }

      spr = new SpringItem(bn);
      spr.spring.setDamp(damp);
      spr.spring.setOscPerSec(osc);

      this.items.push(spr);
    }
  }

  setRestPose(resetSpring: boolean = false): void {
    this.spring.setRestPose(this, resetSpring);
  }

  updatePose(dt: number): void {
    this.spring.updatePose(this, dt);
  }
}
