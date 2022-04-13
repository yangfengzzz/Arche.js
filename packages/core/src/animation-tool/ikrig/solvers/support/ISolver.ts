import { IKChain } from "../../rigs/IKChain";

export interface ISolver {
  resolve(chain: IKChain): void;
}
