import { ISkin } from "./skins/ISkin";
import { Bone } from "./Bone";
import { Pose } from "./Pose";
import { Quaternion, Vector3, BoneTransform } from "@arche-engine/math";

export class Armature {
  // Map Bone Names to The Index in the Bones Array
  names: Map<string, number> = new Map();
  // List of Bones, Will hold resting pose transforms
  bones: Array<Bone> = [];
  // Which Skinning System to use?
  skin?: ISkin;
  // Sometimes the Armatures have a Transform Applied to them to render correctly in webgl.
  offset: BoneTransform = new BoneTransform();

  addBone(name: string, pidx?: number, rot?: Quaternion, pos?: Vector3, scl?: Vector3): Bone {
    const idx = this.bones.length;
    const bone = new Bone(name, idx);

    this.bones.push(bone);
    this.names.set(name, idx);

    if (pos || rot || scl) bone.setLocal(rot, pos, scl);
    if (pidx != null && pidx != -1) bone.pidx = pidx;

    return bone;
  }

  bind(skin?: new () => ISkin, defaultBoneLen: number = 1.0): this {
    // Compute WorldSpace Transform for all the bones
    this.updateWorld();
    // Compute the length of all the Bones
    this.updateBoneLengths(defaultBoneLen);
    // Setup Skin BindPose
    if (skin) this.skin = new skin().init(this);
    return this;
  }

  clone(): Armature {
    const arm = new Armature();
    arm.skin = this.skin?.clone();
    arm.offset.copy(this.offset);
    this.bones.forEach((b) => arm.bones.push(b.clone()));
    this.names.forEach((v: number, k: string) => arm.names.set(k, v));
    return arm;
  }

  newPose(doWorldUpdate: boolean = false): Pose {
    const p = new Pose(this);
    return doWorldUpdate ? p.updateWorld() : p;
  }

  getBone(bName: string): Bone | null {
    const idx = this.names.get(bName);
    if (idx == undefined) return null;
    return this.bones[idx];
  }

  getSkinOffsets(): Array<unknown> | null {
    return this.skin ? this.skin.getOffsets() : null;
  }

  updateSkinFromPose(pose: Pose): Array<unknown> | null {
    if (this.skin) {
      this.skin.updateFromPose(pose);
      return this.skin.getOffsets();
    }
    return null;
  }

  updateWorld(): this {
    const bCnt = this.bones.length;
    let b;

    for (let i = 0; i < bCnt; i++) {
      b = this.bones[i];
      if (b.pidx != -1) b.world.fromMul(this.bones[b.pidx].world, b.local);
      else b.world.copy(b.local);
    }

    return this;
  }

  updateBoneLengths(defaultBoneLen: number = 0): this {
    const bCnt = this.bones.length;
    let b: Bone;
    let p: Bone;

    for (let i = bCnt - 1; i >= 0; i--) {
      b = this.bones[i];
      // No Parent to compute its length.
      if (b.pidx == -1) continue;

      // Parent Bone, Compute its length based on its position and the current bone.
      p = this.bones[b.pidx];
      // Compromise
      p.len = Vector3.distance(p.world.pos, b.world.pos);
    }

    if (defaultBoneLen != 0) {
      for (let i = 0; i < bCnt; i++) {
        b = this.bones[i];
        if (b.len == 0) b.len = defaultBoneLen;
      }
    }

    return this;
  }
}
