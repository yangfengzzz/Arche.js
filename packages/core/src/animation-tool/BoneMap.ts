import { BoneParse } from "./BoneParse";
import { Entity } from "../Entity";

export type BoneInfo = Entity;

export class BoneChain {
  items: BoneInfo[] = [];
}

/**
 * Map Joint node into specific joint name list.
 */
export class BoneMap {
  bones: Map<string, BoneInfo | BoneChain> = new Map();

  Parsers = [
    new BoneParse("thigh", true, "thigh|up.*leg", "twist"), //upleg | upperleg
    new BoneParse("shin", true, "shin|leg|calf", "up|twist"),
    new BoneParse("foot", true, "foot"),
    new BoneParse("shoulder", true, "clavicle|shoulder"),
    new BoneParse("upperarm", true, "(upper.*arm|arm)", "fore|twist|lower"),
    new BoneParse("forearm", true, "forearm|arm", "up|twist"),
    new BoneParse("hand", true, "hand", "thumb|index|middle|ring|pinky"),
    new BoneParse("head", false, "head"),
    new BoneParse("neck", false, "neck"),
    new BoneParse("hip", false, "hips*|pelvis"),
    new BoneParse("spine", false, "spine.*d*|chest", undefined, true)
  ];

  constructor(joints: Entity[]);
  constructor(joints: string[], root: BoneInfo);

  constructor(joints: string[] | Entity[], root?: BoneInfo) {
    let i: number;
    let b: BoneInfo;
    let bp: BoneParse;
    let key: string | null;

    for (i = 0; i < joints.length; i++) {
      if (root) {
        b = root.findByName(<string>joints[i]);
      } else {
        b = <Entity>joints[i];
      }
      for (bp of this.Parsers) {
        // Didn't pass test, Move to next parser.
        if (!(key = bp.test(b.name))) continue;

        if (!this.bones.has(key)) {
          if (bp.isChain) {
            const ch = new BoneChain();
            ch.items.push(b);
            this.bones.set(key, ch);
          } else {
            this.bones.set(key, b);
          }
        } else {
          if (bp.isChain) {
            const ch = this.bones.get(bp.name);
            if (ch && ch instanceof BoneChain) ch.items.push(b);
          }
        }

        break;
      }
    }
  }
}
