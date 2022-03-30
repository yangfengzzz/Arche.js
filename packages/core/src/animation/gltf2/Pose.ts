import { Quaternion, Vector3 } from "@arche-engine/math";

export class PoseJoint {
  index: number;
  rot?: Quaternion;
  pos?: Vector3;
  scl?: Vector3;

  constructor(idx: number, rot?: Quaternion, pos?: Vector3, scl?: Vector3) {
    this.index = idx;
    this.rot = rot;
    this.pos = pos;
    this.scl = scl;
  }
}

export class Pose {
  name: string = "";
  joints: Array<PoseJoint> = [];

  constructor(name?: string) {
    if (name) this.name = name;
  }

  add(idx: number, rot?: Quaternion, pos?: Vector3, scl?: Vector3): void {
    this.joints.push(new PoseJoint(idx, rot, pos, scl));
  }
}
