import { Armature } from "./Armature";
import { Pose } from "./Pose";
import { Quaternion, Vector3 } from "@arche-engine/math";
import { Bone } from "./Bone";

/** Hold Object Reference along with an offset transform */
class SlotItem {
  obj: any;
  offsetPos?: Vector3;
  offsetRot?: Quaternion;
  offsetScl?: Vector3;
}

class Slot {
  name: string;
  boneName: string;
  boneIdx: number = -1;
  items: Array<SlotItem> = [];
  invBindRot: Quaternion = new Quaternion(0, 0, 0, 1);

  constructor(name: string, bone: Bone) {
    this.name = name;
    this.boneName = bone.name;
    this.boneIdx = bone.idx;

    Quaternion.invert(bone.world.rot, this.invBindRot);
  }
}

export class BoneSlots {
  arm: Armature;
  slots: Map<string, Slot> = new Map();
  onAttachmentUpdate?: (obj: any, rot: Quaternion, pos: Vector3, scl: Vector3) => void;

  constructor(arm: Armature) {
    this.arm = arm;
  }

  add(slotName: string, boneName: string): this {
    const idx = this.arm.names.get(boneName);
    if (idx == undefined) {
      console.warn("Can not create bone slot, bone name not found:", boneName);
      return this;
    }

    const b = this.arm.bones[idx];
    const slot = new Slot(slotName, b);

    this.slots.set(slotName, slot);
    return this;
  }

  attach(slotName: string, obj: any, offsetRot?: Quaternion, offsetPos?: Vector3, offsetScl?: Vector3): this {
    const slot = this.slots.get(slotName);
    if (!slot) {
      console.warn("Slot not found", slotName);
      return this;
    }

    const si = new SlotItem();
    si.obj = obj;

    if (offsetRot) si.offsetRot = offsetRot.clone();
    if (offsetPos) si.offsetPos = offsetPos.clone();
    if (offsetScl) si.offsetScl = offsetScl.clone();

    slot.items.push(si);
    return this;
  }

  updateFromPose(pose: Pose): this {
    if (this.onAttachmentUpdate == undefined) {
      console.warn("BoneSlots need handler assigned: onAttachmentUpdate ");
      return this;
    }

    const offsetRot = new Quaternion();
    const rot = new Quaternion();
    const pos = new Vector3();
    const scl = new Vector3(1, 1, 1);

    let slot: Slot;
    let si: SlotItem;
    let b: Bone;

    for (slot of this.slots.values()) {
      // If there are no objects, just skip
      if (slot.items.length == 0) continue;

      // Get Slot's Bone
      b = pose.bones[slot.boneIdx];
      // Compute Offset Rotation from Bind Pose Rotation
      //quat.mul( offsetRot, slot.invBindRot, b.world.rot );
      // Compute Offset Rotation from Bind Pose Rotation
      Quaternion.multiply(b.world.rot, slot.invBindRot, offsetRot);

      // Loop all the objects in the slot
      for (si of slot.items) {
        // ROTATION
        if (!si.offsetRot) offsetRot.cloneTo(rot);
        else Quaternion.multiply(offsetRot, si.offsetRot, rot);
        //else                quat.mul( rot, si.offsetRot, offsetRot );

        // SCALE
        if (!si.offsetScl) b.world.scl.cloneTo(scl);
        else Vector3.multiply(b.world.scl, si.offsetScl, scl);

        // POSITION
        if (!si.offsetPos) b.world.pos.cloneTo(pos);
        else {
          Vector3.transformByQuat(si.offsetPos, offsetRot, pos);
          Vector3.add(b.world.pos, pos, pos);

          //vec3.add( pos, b.world.pos, si.offsetPos );
          //vec3.copy( pos, b.world.pos );
        }

        // APPLY
        this.onAttachmentUpdate(si.obj, rot, pos, scl);
      }
    }

    return this;
  }

  /** Get All Slotted Objects */
  getAllObjects(): Array<any> {
    const rtn: Array<any> = [];
    let slot: Slot;
    let si: SlotItem;

    for (slot of this.slots.values()) {
      if (slot.items.length == 0) continue;

      for (si of slot.items) rtn.push(si.obj);
    }
    return rtn;
  }
}
