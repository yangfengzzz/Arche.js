import { BoneTransform, Quaternion, Vector3 } from "@arche-engine/math";

export class Bone {
  // Name of Bone
  name: string;
  // Bone Index
  idx: number;
  // Index to Parent Bone if not root. -1 means no parent
  pidx: number;
  // Length of the Bone
  len: number;

  // Local Transform of Resting Pose
  local = new BoneTransform();
  // World Transform of Resting Pose
  world = new BoneTransform();

  constructor(name: string, idx: number, len: number = 0) {
    this.name = name;
    this.idx = idx;
    this.pidx = -1;
    this.len = len;
  }

  setLocal(rot?: Quaternion, pos?: Vector3, scl?: Vector3): this {
    if (rot) rot.cloneTo(this.local.rot);
    if (pos) pos.cloneTo(this.local.pos);
    if (scl) scl.cloneTo(this.local.scl);
    return this;
  }

  clone(): Bone {
    const b = new Bone(this.name, this.idx, this.len);

    b.pidx = this.pidx;
    b.local.copy(this.local);
    b.world.copy(this.world);
    return b;
  }
}
