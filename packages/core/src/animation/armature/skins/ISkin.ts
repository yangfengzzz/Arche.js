import { Armature } from "../Armature";
import { Pose } from "../Pose";

export interface ISkin {
  init(arm: Armature): this;

  updateFromPose(pose: Pose): this;

  getOffsets(): Array<unknown>;

  getTextureInfo(frameCount: number): TTextureInfo;

  clone(): ISkin;
}

export type TTextureInfo = {
  boneCount: number;
  strideFloatLength: number;
  strideByteLength: number;
  pixelsPerStride: number;
  floatRowSize: number;
  bufferFloatSize: number;
  bufferByteSize: number;
  pixelWidth: number;
  pixelHeight: number;
};
