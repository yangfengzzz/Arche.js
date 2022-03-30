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

    this.offsetBuffer = new Float32Array(16 * bCnt); // Create Flat Buffer Space

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

      //world[ i ].fromQuatTranScale( b.local.rot, b.local.pos, b.local.scl );
      Matrix.affineTransformation(l.scl, l.rot, l.pos, m);

      if (b.pidx != -1) Matrix.multiply(world[b.pidx], m, m); // Add Parent if Available

      //bind[ i ].fromInvert( world[ i ] );
      Matrix.invert(bind[i], m); // Invert for Bind Pose

      mat4Identity.toArray(this.offsetBuffer, i * 16); // Fill in Offset with Unmodified matrices
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
      Matrix.affineTransformation(b.local.scl, b.local.rot, b.local.pos, m); // Local Space Matrix
      if (b.pidx != -1) Matrix.multiply(this.world[b.pidx], m, m);
      // Add Parent if Available (PMUL)
      else Matrix.multiply(offset, m, m); // Or use Offset on all root bones (PMUL)

      // Compute Offset Matrix that will be used for skin a mesh
      // OffsetMatrix = Bone.WorldMatrix * Bone.BindMatrix
      //bOffset
      //    .fromMul( this.world[ i ], this.bind[ i ] )
      //    .toBuf( this.offsetBuffer, i * 16 );

      Matrix.multiply(m, this.bind[i], bOffset);
      bOffset.toArray(this.offsetBuffer, i * 16);
    }

    return this;
  }

  getOffsets(): Array<unknown> {
    return [this.offsetBuffer];
  }

  getTextureInfo(frameCount: number): TTextureInfo {
    const boneCount = this.bind.length; // One Bind Per Bone
    const strideFloatLength = COMP_LEN; // How many floats makes up one bone offset
    const strideByteLength = BYTE_LEN; // n Floats, 4 Bytes Each
    const pixelsPerStride = COMP_LEN / 4; // n Floats, 4 Floats Per Pixel ( RGBA )
    const floatRowSize = COMP_LEN * frameCount; // How many Floats needed to hold all the frame data for 1 bone
    const bufferFloatSize = floatRowSize * boneCount; // Size of the Buffer to store all the data.
    const bufferByteSize = bufferFloatSize * 4; // Size of buffer in Bytes.
    const pixelWidth = pixelsPerStride * frameCount; // How Many Pixels needed to hold all the frame data for 1 bone
    const pixelHeight = boneCount; // Repeat Data, but more user-friendly to have 2 names depending on usage.

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
