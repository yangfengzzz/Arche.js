import { IKChain } from "./IKChain";
import { Entity } from "../../../Entity";

export class IKRig {
  items: Map<string, IKChain> = new Map();

  // Change the Bind Transform for all the chains
  // Mostly used for late binding a TPose when armature isn't naturally in a TPose
  bindPose(): this {
    let ch: IKChain;
    for (ch of this.items.values()) ch.bindToPose();
    return this;
  }

  updateBoneLengths(): this {
    let ch: IKChain;

    for (ch of this.items.values()) {
      ch.resetLengths();
    }

    return this;
  }

  get(name: string): IKChain | undefined {
    return this.items.get(name);
  }

  add(name: string, bNames: Entity[]): IKChain {
    const chain = new IKChain(bNames);
    this.items.set(name, chain);
    return chain;
  }
}
