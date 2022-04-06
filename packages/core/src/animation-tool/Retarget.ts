import { Entity } from "../Entity";
import { Script } from "../Script";
import { BoneLink } from "./BoneLink";
import { BoneChain, BoneInfo, BoneMap } from "./BoneMap";
import { Quaternion, Vector3 } from "@arche-engine/math";

/**
 * Link BoneMap to retarget animation.
 */
export class Retarget extends Script {
  private static _diff = new Quaternion();
  private static _tmp = new Quaternion();

  // Retarget Hip Position
  hipScale = 1;
  toPosHip = new Vector3();
  fromPosHip = new Vector3();

  // Armature for the Clip
  mapFrom: BoneMap;
  // Armature to retarget animation for
  mapTo: BoneMap;
  // All the Linked Bones
  map: Map<string, BoneLink> = new Map();

  onStart() {
    const mapFrom = this.mapFrom;
    const mapTo = this.mapTo;

    // Loop the FROM map looking for any Matches in the TO map
    let i: number,
      fLen: number,
      tLen: number,
      len: number,
      lnk: BoneLink,
      k: string,
      bFrom: BoneInfo | BoneChain,
      bTo: BoneInfo | BoneChain | undefined;

    for ([k, bFrom] of mapFrom.bones) {
      // Check if there is a Matching Bone
      bTo = mapTo.bones.get(k);
      if (!bTo) {
        console.warn("Target missing bone :", k);
        continue;
      }

      // Single Bones
      if (bFrom instanceof Entity && bTo instanceof Entity) {
        lnk = new BoneLink(bFrom, bTo);
        this.map.set(k, lnk);
      } else if (bFrom instanceof BoneChain && bTo instanceof BoneChain) {
        fLen = bFrom.items.length;
        tLen = bTo.items.length;

        if (fLen == 1 && tLen == 1) {
          // Chain of both are just a single bone
          this.map.set(k, new BoneLink(bFrom.items[0], bTo.items[0]));
        } else if (fLen >= 2 && tLen >= 2) {
          // Link the Chain ends first, then fill in the middle bits

          // Match up the first bone on each chain.
          this.map.set(k + "_0", new BoneLink(bFrom.items[0], bTo.items[0]));

          // Match up the Last bone on each chain.
          this.map.set(k + "_x", new BoneLink(bFrom.items[fLen - 1], bTo.items[tLen - 1]));

          // Match any middle bits
          for (i = 1; i < Math.min(fLen - 1, tLen - 1); i++) {
            lnk = new BoneLink(bFrom.items[i], bTo.items[i]);
            this.map.set(k + "_" + i, lnk);
          }
        } else {
          // Try to match up the bones
          len = Math.min(bFrom.items.length, bTo.items.length);
          for (i = 0; i < len; i++) {
            lnk = new BoneLink(bFrom.items[i], bTo.items[i]);
            this.map.set(k + "_" + i, lnk);
          }
        }

        // Match but the data is mismatch, one is a bone while the other is a chain.
      } else {
        console.warn("Bone Mapping is mix match of info and chain", k);
      }
    }

    // Data to handle Hip Position Retargeting
    const hip = this.map.get("hip");
    if (hip) {
      const fBone = hip.fromIndex;
      const tBone = hip.toIndex;

      // Cache for Retargeting
      fBone.transform.worldPosition.cloneTo(this.fromPosHip);
      tBone.transform.worldPosition.cloneTo(this.toPosHip);
      this.hipScale = Math.abs(this.toPosHip.y / this.fromPosHip.y); // Retarget Scale FROM -> TO
    }
  }

  onUpdate(deltaTime: number) {
    const diff = Retarget._diff;
    const tmp = Retarget._tmp;
    let fBone: Entity;
    let tBone: Entity;
    let bl: BoneLink;

    // Update the bone rotations
    for (bl of this.map.values()) {
      fBone = bl.fromIndex;
      tBone = bl.toIndex;

      Quaternion.multiply(bl.quatFromParent, fBone.transform.rotationQuaternion, diff);

      if (Quaternion.dot(diff, bl.quatDotCheck) < 0) {
        Quaternion.scale(bl.wquatFromTo, -1, tmp);
        Quaternion.multiply(diff, tmp, diff);
      } else {
        Quaternion.multiply(diff, bl.wquatFromTo, diff);
      }

      Quaternion.multiply(bl.toWorldLocal, diff, diff); // Move to Local Space

      tBone.transform.rotationQuaternion = diff;
    }

    // Apply Bone Translations
    const hip = this.map.get("hip");
    if (hip) {
      fBone = hip.fromIndex;
      tBone = hip.toIndex;

      const v = new Vector3();
      Vector3.subtract(fBone.transform.worldPosition, this.fromPosHip, v); // Change Since TPose
      Vector3.scale(v, this.hipScale, v); // Scale Diff to Target's Scale
      Vector3.add(v, this.toPosHip, v); // Add Scaled Diff to Target's TPose Position

      tBone.transform.position = v;
    }
  }
}
