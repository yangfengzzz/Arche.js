import { ISkin, TTextureInfo } from "./ISkin";
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
  // DualQuat : Quaternion
  offsetQBuffer!: Float32Array;
  // DualQuat : Translation
  offsetPBuffer!: Float32Array;
  // Scale
  offsetSBuffer!: Float32Array;

  init(arm: Armature): this {
    const bCnt = arm.bones.length;
    const world: BoneTransform[] = new Array(bCnt);
    const bind: BoneTransform[] = new Array(bCnt);

    // For THREEJS support, Split DQ into Two Vec4 since it doesn't support mat2x4 properly
    this.offsetQBuffer = new Float32Array(4 * bCnt);
    this.offsetPBuffer = new Float32Array(4 * bCnt);
    this.offsetSBuffer = new Float32Array(3 * bCnt);

    // Fill Arrays
    for (let i = 0; i < bCnt; i++) {
      world[i] = new BoneTransform();
      bind[i] = new BoneTransform();
    }

    let b: Bone;
    let t: BoneTransform;

    for (let i = 0; i < bCnt; i++) {
      b = arm.bones[i];
      t = world[i];

      t.copy(b.local);
      // Add Parent if Available
      if (b.pidx != -1) t.pmul(world[b.pidx]);
      // Invert for Bind Pose
      bind[i].fromInvert(t);

      // Init Offsets : Quat Identity
      new Vector4(0, 0, 0, 1).toArray(this.offsetQBuffer, i * 4);
      // ...No Translation
      new Vector4(0, 0, 0, 0).toArray(this.offsetPBuffer, i * 4);
      // ...No Scale
      new Vector3(1, 1, 1).toArray(this.offsetSBuffer, i * 3);
    }

    // Save Reference to Vars
    this.bind = bind;
    this.world = world;
    return this;
  }

  updateFromPose(pose: Pose): this {
    // Get Pose Starting Offset
    const offset = pose.offset;

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

      // Compute world space Transform for Each Bone
      // Add Parent if Available
      // Or use pose Offset on all root bones
      if (b.pidx != -1) {
        ws.fromMul(this.world[b.pidx], b.local);
      } else {
        ws.fromMul(offset, b.local);
      }

      // Compute Offset Transform that will be used for skinning a mesh
      // OffsetTransform = Bone.WorldTransform * Bone.BindTransform
      bOffset.fromMul(ws, this.bind[i]);

      // Convert Rotation & Translation to Dual Quaternions
      // For handling weights, it works best when Translation exists in a Dual Quaternion.
      DualQuaternion.fromRotationTranslation(bOffset.rot, bOffset.pos, dq);

      // Vec4 Index
      ii = i * 4;
      // Vec3 Index
      si = i * 3;
      // Quaternion Half
      this.offsetQBuffer[ii] = dq.elements[0];
      this.offsetQBuffer[ii + 1] = dq.elements[1];
      this.offsetQBuffer[ii + 2] = dq.elements[2];
      this.offsetQBuffer[ii + 3] = dq.elements[3];
      // Translation Half
      this.offsetPBuffer[ii] = dq.elements[4];
      this.offsetPBuffer[ii + 1] = dq.elements[5];
      this.offsetPBuffer[ii + 2] = dq.elements[6];
      this.offsetPBuffer[ii + 3] = dq.elements[7];
      // Scale
      this.offsetSBuffer[si] = bOffset.scl.x;
      this.offsetSBuffer[si + 1] = bOffset.scl.y;
      this.offsetSBuffer[si + 2] = bOffset.scl.z;
    }

    return this;
  }

  getOffsets(): Array<unknown> {
    return [this.offsetQBuffer, this.offsetPBuffer, this.offsetSBuffer];
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
