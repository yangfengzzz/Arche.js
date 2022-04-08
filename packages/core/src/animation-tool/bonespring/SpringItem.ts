import { SpringVec3 } from "./implicit_euler/SpringVec3";
import { Entity } from "../../Entity";
import { Matrix } from "@arche-engine/math";

export class SpringItem {
  index: Entity;
  spring = new SpringVec3();
  // Bind Transform in Local Space
  bind = new Matrix();

  constructor(idx: Entity) {
    this.index = idx;
  }
}
