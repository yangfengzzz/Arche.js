import { BipedIKPose } from "../BipedIKPose";

export interface IIKPoseAdditive {
  apply(key: string, src: BipedIKPose): void;
}
