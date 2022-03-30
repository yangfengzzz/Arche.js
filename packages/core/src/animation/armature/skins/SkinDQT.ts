import type { ISkin, TTextureInfo } from "./ISkin";
import { Armature } from "../Armature";
import { Pose } from "../Pose";
import { Bone } from "../Bone";
import { BoneTransform, DualQuaternion, Vector3, Vector4 } from "@arche-engine/math";

// 12 Floats, Extra Byte for 16 Byte Alignment Requirement in certain buffer types
const COMP_LEN = 12;
// 12 Floats * 4 Bytes Each
const BYTE_LEN = COMP_LEN * 4;

export class SkinDQT implements ISkin {
  bind!: BoneTransform[];
  world!: BoneTransform[];

  // Split into 3 Buffers because THREEJS does handle mat4x3 correctly
  // Since using in Shader Uniforms, can skip the 16 byte alignment for scale & store data as Vec3 instead of Vec4.
  // TODO : This may change in the future into a single mat4x3 buffer.
  offsetQBuffer!: Float32Array; // DualQuat : Quaternion
  offsetPBuffer!: Float32Array; // DualQuat : Translation
  offsetSBuffer!: Float32Array; // Scale
  //constructor(){}

  init(arm: Armature): this {
    const bCnt = arm.bones.length;
    const world: BoneTransform[] = new Array(bCnt);
    const bind: BoneTransform[] = new Array(bCnt);

    // For THREEJS support, Split DQ into Two Vec4 since it doesn't support mat2x4 properly
    this.offsetQBuffer = new Float32Array(4 * bCnt); // Create Flat Buffer Space
    this.offsetPBuffer = new Float32Array(4 * bCnt);
    this.offsetSBuffer = new Float32Array(3 * bCnt);

    // Fill Arrays
    for (let i = 0; i < bCnt; i++) {
      world[i] = new BoneTransform();
      bind[i] = new BoneTransform();
    }

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    let b: Bone;
    let t: BoneTransform;

    for (let i = 0; i < bCnt; i++) {
      b = arm.bones[i];
      t = world[i];

      t.copy(b.local);
      if (b.pidx != -1) t.pmul(world[b.pidx]); // Add Parent if Available
      bind[i].fromInvert(t); // Invert for Bind Pose

      new Vector4(0, 0, 0, 1).toArray(this.offsetQBuffer, i * 4); // Init Offsets : Quat Identity
      new Vector4(0, 0, 0, 0).toArray(this.offsetPBuffer, i * 4); // ...No Translation
      new Vector3(1, 1, 1).toArray(this.offsetSBuffer, i * 3); // ...No Scale
    }

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    this.bind = bind; // Save Reference to Vars
    this.world = world;
    return this;
  }

  updateFromPose(pose: Pose): this {
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Get Pose Starting Offset
    const offset = pose.offset;

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    const bOffset = new BoneTransform();
    const dq = new DualQuaternion();
    let b: Bone;
    let ws: BoneTransform;
    let i: number;
    let ii: number;
    let si: number;

    for (i = 0; i < pose.bones.length; i++) {
      b = pose.bones[i];
      ws = this.world[i];

      //----------------------------------------
      // Compute world space Transform for Each Bone
      if (b.pidx != -1) ws.fromMul(this.world[b.pidx], b.local);
      // Add Parent if Available
      else ws.fromMul(offset, b.local); // Or use pose Offset on all root bones

      //----------------------------------------
      // Compute Offset Transform that will be used for skinning a mesh
      // OffsetTransform = Bone.WorldTransform * Bone.BindTransform
      bOffset.fromMul(ws, this.bind[i]);

      // Convert Rotation & Translation to Dual Quaternions
      // For handling weights, it works best when Translation exists in a Dual Quaternion.
      DualQuaternion.fromRotationTranslation(bOffset.rot, bOffset.pos, dq);

      //----------------------------------------
      ii = i * 4; // Vec4 Index
      si = i * 3; // Vec3 Index
      this.offsetQBuffer[ii] = dq[0]; // Quaternion Half
      this.offsetQBuffer[ii + 1] = dq[1];
      this.offsetQBuffer[ii + 2] = dq[2];
      this.offsetQBuffer[ii + 3] = dq[3];

      this.offsetPBuffer[ii] = dq[4]; // Translation Half
      this.offsetPBuffer[ii + 1] = dq[5];
      this.offsetPBuffer[ii + 2] = dq[6];
      this.offsetPBuffer[ii + 3] = dq[7];

      this.offsetSBuffer[si] = bOffset.scl[0]; // Scale
      this.offsetSBuffer[si + 1] = bOffset.scl[1];
      this.offsetSBuffer[si + 2] = bOffset.scl[2];
    }

    return this;
  }

  getOffsets(): Array<unknown> {
    return [this.offsetQBuffer, this.offsetPBuffer, this.offsetSBuffer];
  }

  getTextureInfo(frameCount: number): TTextureInfo {
    const boneCount = this.bind.length; // One Bind Per Bone
    const strideByteLength = BYTE_LEN; // n Floats, 4 Bytes Each
    const strideFloatLength = COMP_LEN; // How many floats makes up one bone offset
    const pixelsPerStride = COMP_LEN / 4; // n Floats, 4 Floats Per Pixel ( RGBA )
    const floatRowSize = COMP_LEN * frameCount; // How many Floats needed to hold all the frame data for 1 bone
    const bufferFloatSize = floatRowSize * boneCount; // Size of the Buffer to store all the data.
    const bufferByteSize = bufferFloatSize * 4; // Size of buffer in Bytes.
    const pixelWidth = pixelsPerStride * frameCount; // How Many Pixels needed to hold all the frame data for 1 bone
    const pixelHeight = boneCount; // Repeat Data, but more user-friendly to have 2 names depending on usage.

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

  clone(): SkinDQT {
    const skin = new SkinDQT();
    skin.offsetQBuffer = new Float32Array(this.offsetQBuffer);
    skin.offsetPBuffer = new Float32Array(this.offsetPBuffer);
    skin.offsetSBuffer = new Float32Array(this.offsetSBuffer);
    skin.bind = this.bind.map((v) => v.clone());
    skin.world = this.world.map((v) => v.clone());
    return skin;
  }
}
