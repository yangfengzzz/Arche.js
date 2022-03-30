import type { ISkin, TTextureInfo } from "./ISkin";
import { Armature } from "../Armature";
import { Pose } from "../Pose";
import { Bone } from "../Bone";
import { Matrix } from "@arche-engine/math";

// 16 Floats
const COMP_LEN = 16;
// 16 Floats * 4 Bytes Each
const BYTE_LEN = COMP_LEN * 4;

export class SkinMTX implements ISkin {
  bind!: Matrix[];
  world!: Matrix[];
  offsetBuffer!: Float32Array;

  init(arm: Armature): this {
    const mat4Identity = new Matrix();
    const bCnt = arm.bones.length;
    const world: Matrix[] = new Array(bCnt);
    const bind: Matrix[] = new Array(bCnt);

    this.offsetBuffer = new Float32Array(16 * bCnt);

    // Fill Arrays
    for (let i = 0; i < bCnt; i++) {
      world[i] = new Matrix();
      bind[i] = new Matrix();
    }

    let b, l, m;
    for (let i = 0; i < bCnt; i++) {
      b = arm.bones[i];
      l = b.local;
      m = world[i];

      Matrix.affineTransformation(l.scl, l.rot, l.pos, m);
      // Add Parent if Available
      if (b.pidx != -1) Matrix.multiply(world[b.pidx], m, m);
      // Invert for Bind Pose
      Matrix.invert(bind[i], m);
      // Fill in Offset with Unmodified matrices
      mat4Identity.toArray(this.offsetBuffer, i * 16);
    }

    // Save Reference to Vars
    this.bind = bind;
    this.world = world;
    return this;
  }

  updateFromPose(pose: Pose): this {
    // Get Pose Starting Offset
    //const offset = new Mat4();
    //offset.fromQuatTranScale( pose.offset.rot, pose.offset.pos, pose.offset.scl );
    const offset = new Matrix();
    Matrix.affineTransformation(pose.offset.scl, pose.offset.rot, pose.offset.pos, offset);

    const bOffset = new Matrix();
    let b: Bone;
    let m: Matrix;
    let i: number;

    for (i = 0; i < pose.bones.length; i++) {
      b = pose.bones[i];

      // Compute world space Matrix for Each Bone
      m = this.world[i];
      // Local Space Matrix
      Matrix.affineTransformation(b.local.scl, b.local.rot, b.local.pos, m);
      // Add Parent if Available (PMUL)
      // Or use Offset on all root bones (PMUL)
      if (b.pidx != -1) {
        Matrix.multiply(this.world[b.pidx], m, m);
      } else {
        Matrix.multiply(offset, m, m);
      }

      // Compute Offset Matrix that will be used for skin a mesh
      Matrix.multiply(m, this.bind[i], bOffset);
      bOffset.toArray(this.offsetBuffer, i * 16);
    }

    return this;
  }

  getOffsets(): Array<unknown> {
    return [this.offsetBuffer];
  }

  getTextureInfo(frameCount: number): TTextureInfo {
    // One Bind Per Bone
    const boneCount = this.bind.length;
    // How many floats makes up one bone offset
    const strideFloatLength = COMP_LEN;
    // n Floats, 4 Bytes Each
    const strideByteLength = BYTE_LEN;
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
      strideFloatLength,
      strideByteLength,
      pixelsPerStride,
      floatRowSize,
      bufferFloatSize,
      bufferByteSize,
      pixelWidth,
      pixelHeight
    };
  }

  clone(): SkinMTX {
    const skin = new SkinMTX();
    skin.offsetBuffer = new Float32Array(this.offsetBuffer);
    skin.bind = this.bind.map((v) => v.clone());
    skin.world = this.world.map((v) => v.clone());
    return skin;
  }
}
