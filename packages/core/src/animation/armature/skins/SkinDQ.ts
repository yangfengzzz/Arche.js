import { ISkin, TTextureInfo } from "./ISkin";
import { Armature } from "../Armature";
import { Pose } from "../Pose";
import { Bone } from "../Bone";
import { BoneTransform, DualQuaternion, Vector4 } from "@arche-engine/math";

// 8 Floats
const COMP_LEN = 8;
// 8 Floats * 4 Bytes Each
const BYTE_LEN = COMP_LEN * 4;

export class SkinDQ implements ISkin {
  bind!: DualQuaternion[];
  world!: DualQuaternion[];
  offsetQBuffer!: Float32Array;
  offsetPBuffer!: Float32Array;

  init(arm: Armature): this {
    const bCnt = arm.bones.length;
    const world: DualQuaternion[] = new Array(bCnt);
    const bind: DualQuaternion[] = new Array(bCnt);

    // For THREEJS support, Split DQ into Two Vec4 since it doesn't support mat2x4 properly
    this.offsetQBuffer = new Float32Array(4 * bCnt);
    this.offsetPBuffer = new Float32Array(4 * bCnt);

    // Fill Arrays
    for (let i = 0; i < bCnt; i++) {
      world[i] = new DualQuaternion();
      bind[i] = new DualQuaternion();
    }

    let l: BoneTransform;
    let b: Bone;
    let q: DualQuaternion;

    for (let i = 0; i < bCnt; i++) {
      b = arm.bones[i];
      l = b.local;
      q = world[i];

      // Local Space
      DualQuaternion.fromRotationTranslation(l.rot, l.pos, q);
      // Add Parent if Available
      if (b.pidx != -1) DualQuaternion.multiply(world[b.pidx], q, q);
      // Invert for Bind Pose
      DualQuaternion.invert(bind[i], q);
      // Init Offsets : Quat Identity
      new Vector4(0, 0, 0, 1).toArray(this.offsetQBuffer, i * 4);
      // ...No Translation
      new Vector4(0, 0, 0, 0).toArray(this.offsetPBuffer, i * 4);
    }

    // Save Reference to Vars
    this.bind = bind;
    this.world = world;
    return this;
  }

  updateFromPose(pose: Pose): this {
    // Get Pose Starting Offset
    const offset = new DualQuaternion();
    DualQuaternion.fromRotationTranslation(pose.offset.rot, pose.offset.pos, offset);

    const bOffset = new DualQuaternion();
    let b: Bone;
    let q: DualQuaternion;
    let i: number;
    let ii: number;

    for (i = 0; i < pose.bones.length; i++) {
      b = pose.bones[i];

      // Compute world space Dual Quaternion for Each Bone
      // Make sure scale is applied in no way to prevent artifacts.
      q = this.world[i];
      // Local Space Matrix
      DualQuaternion.fromRotationTranslation(b.local.rot, b.local.pos, q);
      // Add Parent if Available (PMUL)
      // Or use Offset on all root bones (PMUL)
      if (b.pidx != -1) {
        DualQuaternion.multiply(this.world[b.pidx], q, q);
      } else {
        DualQuaternion.multiply(offset, q, q);
      }

      // Compute Offset Matrix that will be used for skin a mesh
      // OffsetMatrix = Bone.WorldMatrix * Bone.BindMatrix
      DualQuaternion.multiply(q, this.bind[i], bOffset);

      ii = i * 4;
      // Quaternion Half
      this.offsetQBuffer[ii] = bOffset.elements[0];
      this.offsetQBuffer[ii + 1] = bOffset.elements[1];
      this.offsetQBuffer[ii + 2] = bOffset.elements[2];
      this.offsetQBuffer[ii + 3] = bOffset.elements[3];
      // Translation Half
      this.offsetPBuffer[ii] = bOffset.elements[4];
      this.offsetPBuffer[ii + 1] = bOffset.elements[5];
      this.offsetPBuffer[ii + 2] = bOffset.elements[6];
      this.offsetPBuffer[ii + 3] = bOffset.elements[7];
    }

    return this;
  }

  getOffsets(): Array<unknown> {
    return [this.offsetQBuffer, this.offsetPBuffer];
  }

  getTextureInfo(frameCount: number): TTextureInfo {
    // One Bind Per Bone
    const boneCount = this.bind.length;
    // n Floats, 4 Bytes Each
    const strideByteLength = BYTE_LEN;
    // How many floats makes up one bone offset
    const strideFloatLength = COMP_LEN;
    // n Floats, 4 Floats Per Pixel ( RGBA )
    const pixelsPerStride = COMP_LEN / 4;
    // How many Floats needed to hold all the frame data for 1 bone
    const floatRowSize = COMP_LEN * frameCount;
    // Size of the Buffer to store all the data.
    const bufferFloatSize = floatRowSize * boneCount;
    // Size of buffer in Bytes.
    const bufferByteSize = bufferFloatSize * 4;
    // How Many Pixels needed to hold all the frame data for 1 bone
    const pixelWidth = pixelsPerStride * frameCount;
    // Repeat Data, but more user-friendly to have 2 names depending on usage.
    const pixelHeight = boneCount;

    return {
      boneCount,
      strideByteLength,
      strideFloatLength,
      pixelsPerStride,
      floatRowSize,
      bufferFloatSize,
      bufferByteSize,
      pixelWidth,
      pixelHeight
    };
  }

  clone(): SkinDQ {
    const skin = new SkinDQ();
    skin.offsetQBuffer = new Float32Array(this.offsetQBuffer);
    skin.offsetPBuffer = new Float32Array(this.offsetPBuffer);
    skin.bind = this.bind.map((v) => v.clone());
    skin.world = this.world.map((v) => v.clone());
    return skin;
  }
}
