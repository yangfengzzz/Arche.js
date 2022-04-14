import { IKChain, IKLink } from "../rigs/IKChain";
import { SwingTwistBase } from "./support/SwingTwistBase";
import { Quaternion, Vector3 } from "@arche-engine/math";

export class PistonSolver extends SwingTwistBase {
  static rot = new Quaternion();
  static pos = new Vector3();

  resolve(chain: IKChain): void {
    // Start by Using SwingTwist to target the bone toward the EndEffector
    const ST = this._swingTwist;
    const [rot, pt] = ST.getWorldRot(chain);
    const effLen = Vector3.distance(ST.effectorPos, ST.originPos);
    const v = new Vector3();
    let lnk: IKLink = chain.first();
    let i: number;

    // Apply SwingTwist Rotation
    pt.getRotation(PistonSolver.rot);
    Quaternion.pmulInvert(rot, PistonSolver.rot, rot);
    lnk.idx.transform.rotationQuaternion = rot;

    // Check if target length is less than any bone, then compress all bones down to zero
    for (lnk of chain.links) {
      if (lnk.len >= effLen) {
        for (i = 1; i < chain.count; i++) {
          chain.links[i].idx.transform.position = PistonSolver.pos;
        }
        return;
      }
    }

    // Bones can only shift into their parent bone. So the final bone's length in the chain isn't needed.
    // So we get the account of space we need to retract, then divide it evenly based on the ratio of bone
    // lengths. So if Bone0 = 2 and Bone1 = 8, that means Bone0 only needs to travel 20% of the total retraction
    // length where bone1 does 80%.
    // Keep in mind, we travel based on parent length BUT apply change to child.

    const endIdx = chain.count - 1;
    // How Much distance needing to move
    const deltaLen = chain.length - effLen;
    // Get Total Available Space of Movement, Inverted to remove division later
    const incInv = 1 / (chain.length - chain.links[endIdx].len);

    for (i = 0; i < endIdx; i++) {
      lnk = chain.links[i];

      // Normalize Bone Length In relation to Total, Use that as a scale of total delta movement
      // then subtract from the bone's length, apply that length to the next bone's Position.
      v.y = lnk.len - deltaLen * (lnk.len * incInv);

      chain.links[i + 1].idx.transform.position = v;
    }
  }
}
