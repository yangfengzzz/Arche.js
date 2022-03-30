import { Pose } from "../../../armature";
import { IKChain } from "../..";

export interface ISolver {
  resolve(chain: IKChain, pose: Pose, debug?: any): void;
}
