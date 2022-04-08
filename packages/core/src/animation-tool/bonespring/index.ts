import { SpringItem } from "./SpringItem";
import { SpringChain } from "./SpringChain";
import { Entity } from "../../Entity";
import { Script } from "../../Script";

export interface ISpringType {
  setRestPose(chain: SpringChain, resetSpring: boolean): void;

  updatePose(chain: SpringChain, dt: number): void;
}

export class BoneSpring extends Script {
  private _items: Map<string, SpringChain> = new Map();

  addRotChain(chName: string, bNames: Entity[], osc: number = 5.0, damp: number = 0.5): this {
    // Rotation Spring Chain
    const chain = new SpringChain(chName, 0);
    // Setup Chain
    chain.setBones(bNames, osc, damp);
    // Save
    this._items.set(chName, chain);
    return this;
  }

  addPosChain(chName: string, bNames: Entity[], osc: number = 5.0, damp: number = 0.5): this {
    // Position Spring Chain
    const chain = new SpringChain(chName, 1);
    // Setup Chain
    chain.setBones(bNames, osc, damp);
    // Save
    this._items.set(chName, chain);
    return this;
  }

  /**
   * @override
   */
  onStart() {
    this._setRestPose();
  }

  /**
   * @override
   * @param deltaTime
   */
  onUpdate(deltaTime: number) {
    deltaTime /= 1000;
    let ch: SpringChain;
    for (ch of this._items.values()) {
      ch.updatePose(deltaTime);
    }
    return this;
  }

  /**
   * Set Oscillation Per Section for all Chain Items
   */
  setOsc(chName: string, osc: number): this {
    const ch = this._items.get(chName);
    if (!ch) {
      console.error("Spring Chain name not found", chName);
      return this;
    }

    let si: SpringItem;
    for (si of ch.items) si.spring.setOscPerSec(osc);

    return this;
  }

  /**
   * Spread an Oscillation range on the chain
   */
  setOscRange(chName: string, a: number, b: number): this {
    const ch = this._items.get(chName);
    if (!ch) {
      console.error("Spring Chain name not found", chName);
      return this;
    }

    const len = ch.items.length - 1;
    let t: number;
    for (let i = 0; i <= len; i++) {
      t = i / len;
      ch.items[i].spring.setOscPerSec(a * (1 - t) + b * t);
    }

    return this;
  }

  setDamp(chName: string, damp: number): this {
    const ch = this._items.get(chName);
    if (!ch) {
      console.error("Spring Chain name not found", chName);
      return this;
    }

    let si: SpringItem;
    for (si of ch.items) si.spring.setDamp(damp);

    return this;
  }

  setDampRange(chName: string, a: number, b: number): this {
    const ch = this._items.get(chName);
    if (!ch) {
      console.error("Spring Chain name not found", chName);
      return this;
    }

    const len = ch.items.length - 1;
    let t: number;
    for (let i = 0; i <= len; i++) {
      t = i / len;
      ch.items[i].spring.setDamp(a * (1 - t) + b * t);
    }

    return this;
  }

  private _setRestPose(resetSpring: boolean = true): this {
    let ch: SpringChain;
    for (ch of this._items.values()) {
      ch.setRestPose(resetSpring);
    }
    return this;
  }
}
