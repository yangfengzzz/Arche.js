import { Pose as GLPose, PoseJoint as GLPoseJoint } from "../gltf2";
import { Armature } from "./Armature.js";
import { Bone } from "./Bone.js";
import { BoneTransform, Quaternion, Vector3 } from "@arche-engine/math";

export class Pose {
  //#region MAIN
  arm!: Armature;
  // Clone of Armature Bones
  bones!: Bone[];
  // Pose Transform Offset, useful to apply parent mesh transform
  offset = new BoneTransform();

  constructor(arm?: Armature) {
    if (arm) {
      const bCnt = arm.bones.length;
      this.bones = new Array(bCnt);
      this.arm = arm;

      for (let i = 0; i < bCnt; i++) {
        this.bones[i] = arm.bones[i].clone();
      }

      this.offset.copy(this.arm.offset);
    }
  }

  /** Get Bone by Name */
  get(bName: string): Bone | null {
    const bIdx = this.arm.names.get(bName);
    return bIdx !== undefined ? this.bones[bIdx] : null;
  }

  clone(): Pose {
    const bCnt = this.bones.length;
    const p = new Pose();

    p.arm = this.arm;
    p.bones = new Array(bCnt);
    p.offset.copy(this.offset);

    for (let i = 0; i < bCnt; i++) {
      p.bones[i] = this.bones[i].clone();
    }

    return p;
  }

  setLocalPos(bone: number | string, v: Vector3): this {
    const bIdx = typeof bone === "string" ? this.arm.names.get(bone) : bone;
    if (bIdx != undefined) v.cloneTo(this.bones[bIdx].local.pos);
    return this;
  }

  setLocalRot(bone: number | string, v: Quaternion): this {
    const bIdx = typeof bone === "string" ? this.arm.names.get(bone) : bone;
    if (bIdx != undefined) v.cloneTo(this.bones[bIdx].local.rot);
    return this;
  }

  fromGLTF2(glPose: GLPose): this {
    let jnt: GLPoseJoint;
    let b: Bone;
    for (jnt of glPose.joints) {
      b = this.bones[jnt.index];
      if (jnt.rot) jnt.rot.cloneTo(b.local.rot);
      if (jnt.pos) jnt.pos.cloneTo(b.local.pos);
      if (jnt.scl) jnt.scl.cloneTo(b.local.scl);
    }
    return this;
  }

  copy(pose: Pose): this {
    const bLen = this.bones.length;

    for (let i = 0; i < bLen; i++) {
      this.bones[i].local.copy(pose.bones[i].local);
      this.bones[i].world.copy(pose.bones[i].world);
    }

    return this;
  }

  rotLocal(bone: number | string, deg: number, axis = "x"): this {
    const bIdx = typeof bone === "string" ? this.arm.names.get(bone) : bone;
    if (bIdx != undefined) {
      const q = this.bones[bIdx].local.rot;
      const rad = (deg * Math.PI) / 180;
      switch (axis) {
        case "y":
          Quaternion.rotateY(q, rad, q);
          break;
        case "z":
          Quaternion.rotateZ(q, rad, q);
          break;
        default:
          Quaternion.rotateX(q, rad, q);
          break;
      }
    } else console.warn("Bone not found, ", bone);
    return this;
  }

  rotWorld(bone: number | string, deg: number, axis = "x"): this {
    const bIdx = typeof bone === "string" ? this.arm.names.get(bone) : bone;
    if (bIdx != undefined) {
      const ax = axis == "y" ? new Vector3(0, 1, 0) : axis == "z" ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0);
      // Get Bone
      const b: Bone = this.bones[bIdx];
      // Get Bone's Parent WorldSpace Rotation
      const p: Quaternion = new Quaternion();
      this.getWorldRotation(b.pidx, p);
      // Get Bone's world space Rotation
      const q = new Quaternion();
      Quaternion.multiply(p, b.local.rot, q);
      // Degrees to Radians
      const rad = (deg * Math.PI) / 180;
      // Create Axis Rotation
      const rot = new Quaternion();
      Quaternion.rotationAxisAngle(ax, rad, rot);
      // Apply Axis Rotation
      Quaternion.multiply(rot, q, q);
      // To Local Space Conversion
      p.cloneTo(b.local.rot);
      b.local.rot.invert().multiply(q);
    } else console.warn("Bone not found, ", bone);
    return this;
  }

  /** Add Offset movement to local space position */
  moveLocal(bone: number | string, offset: Vector3): this {
    const bIdx = typeof bone === "string" ? this.arm.names.get(bone) : bone;
    //if( bIdx != undefined ) this.bones[ bIdx ].local.pos.add( offset );

    if (bIdx != undefined) {
      const v = this.bones[bIdx].local.pos;
      Vector3.add(v, offset, v);
    } else console.warn("Bone not found, ", bone);

    return this;
  }

  sclLocal(bone: number | string, v: number | Vector3): this {
    const bIdx = typeof bone === "string" ? this.arm.names.get(bone) : bone;
    if (bIdx != undefined) {
      const scl = this.bones[bIdx].local.scl;
      if (v instanceof Vector3) v.cloneTo(scl);
      else scl.setValue(v, v, v);
    } else console.warn("Bone not found, ", bone);

    return this;
  }

  updateWorld(useOffset = true): this {
    let i, b;
    for (i = 0; i < this.bones.length; i++) {
      b = this.bones[i];

      if (b.pidx != -1) b.world.fromMul(this.bones[b.pidx].world, b.local);
      else if (useOffset) b.world.fromMul(this.offset, b.local);
      else b.world.copy(b.local);
    }

    return this;
  }

  getWorldTransform(bIdx: number, out?: BoneTransform): BoneTransform {
    out ??= new BoneTransform();
    if (bIdx == -1) return out.copy(this.offset);

    // get Initial Bone
    let bone = this.bones[bIdx];
    // Starting Transform
    out.copy(bone.local);

    // Loop up the hierarchy till we hit the root bone
    while (bone.pidx != -1) {
      bone = this.bones[bone.pidx];
      out.pmul(bone.local);
    }

    // Add offset at the end
    out.pmul(this.offset);
    return out;
  }

  getWorldRotation(bIdx: number, out?: Quaternion): Quaternion {
    out ??= new Quaternion();
    if (bIdx == -1) {
      this.offset.rot.cloneTo(out);
      return out;
    }

    // get Initial Bone
    let bone = this.bones[bIdx];
    // Starting Rotation
    bone.local.rot.cloneTo(out);

    // Loop up the hierarchy till we hit the root bone
    while (bone.pidx != -1) {
      bone = this.bones[bone.pidx];
      Quaternion.multiply(bone.local.rot, out, out);
    }

    // Add offset at the end
    Quaternion.multiply(this.offset.rot, out, out);
    return out;
  }

  updateBoneLengths(defaultBoneLen = 0): this {
    const bCnt = this.bones.length;
    let b: Bone, p: Bone;
    let i: number;

    // Reset all lengths to zero if default length isn't zero
    if (defaultBoneLen != 0) {
      for (b of this.bones) b.len = 0;
    }

    // Compute Bone Length from Children to Parent Bones
    // Leaf bones don't have children, so no way to determine this length
    for (i = bCnt - 1; i >= 0; i--) {
      //-------------------------------
      b = this.bones[i];
      // No Parent to compute its length.
      if (b.pidx == -1) continue;

      // Parent Bone, Compute its length based on its position and the current bone.
      p = this.bones[b.pidx];
      p.len = Vector3.distance(p.world.pos, b.world.pos);
    }

    // Set a default size for Leaf bones
    if (defaultBoneLen != 0) {
      for (i = 0; i < bCnt; i++) {
        b = this.bones[i];
        if (b.len == 0) b.len = defaultBoneLen;
      }
    }

    return this;
  }
}
