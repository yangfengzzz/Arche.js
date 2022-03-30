import { Armature, Bone, Pose } from "../../armature";
import { BoneTransform, Quaternion, Vector3 } from "@arche-engine/math";

export class IKLink {
  // Bone Index
  idx: number;
  // Bone Parent Index
  pidx: number;
  // Bone Length
  len: number;
  // LocalSpace BindPose ( TPose ) Transform
  bind: BoneTransform = new BoneTransform();

  // WorldSpace Target Alt Direction ( Maybe created from Inverted world space Rotation of bone )
  effectorDir = new Vector3(0, 1, 0);
  // WorldSpace Bend   Alt Direction ...
  poleDir = new Vector3(0, 0, 1);

  constructor(idx: number, len: number) {
    this.idx = idx;
    this.pidx = -1;
    this.len = len;
  }

  static fromBone(b: Bone): IKLink {
    const l = new IKLink(b.idx, b.len);
    l.bind.copy(b.local);
    l.pidx = b.pidx;
    return l;
  }
}

export class IKChain {
  links: IKLink[] = [];
  solver: any = null;
  /** How many bones in the chain */
  count: number = 0;
  /** Total Length of the Chain */
  length: number = 0;

  constructor(bName?: string[], arm?: Armature) {
    if (bName && arm) this.setBones(bName, arm);
  }

  addBone(b: Bone): this {
    this.length += b.len;
    this.links.push(IKLink.fromBone(b));
    this.count++;
    return this;
  }

  setBones(bNames: string[], arm: Armature): this {
    let b: Bone | null;
    let n: string;
    // Reset Chain Length
    this.length = 0;

    for (n of bNames) {
      b = arm.getBone(n);
      if (b) {
        this.length += b.len;
        this.links.push(IKLink.fromBone(b));
      } else console.log("Chain.setBones - Bone Not Found:", n);
    }

    this.count = this.links.length;
    return this;
  }

  setSolver(s: any): this {
    this.solver = s;
    return this;
  }

  // Change the Bind Transform
  // Mostly used for late binding a TPose when armature isn't naturally in a TPose
  bindToPose(pose: Pose): this {
    let lnk: IKLink;
    for (lnk of this.links) {
      lnk.bind.copy(pose.bones[lnk.idx].local);
    }
    return this;
  }

  /** For usecase when bone lengths have been recomputed for a pose which differs from the initial armature */
  resetLengths(pose: Pose): void {
    let lnk: IKLink;
    let len: number;

    this.length = 0;
    for (lnk of this.links) {
      // Get Current Length in Pose
      len = pose.bones[lnk.idx].len;
      // Save it to Link
      lnk.len = len;
      // Accumulate the total chain length
      this.length += len;
    }
  }

  first(): IKLink {
    return this.links[0];
  }

  last(): IKLink {
    return this.links[this.count - 1];
  }

  getEndPositions(pose: Pose): Array<Vector3> {
    let rtn: Array<Vector3> = [];

    if (this.count != 0) rtn.push(pose.bones[this.links[0].idx].world.pos.clone());

    if (this.count > 1) {
      const lnk = this.last();
      const v = new Vector3(0, lnk.len, 0);
      pose.bones[lnk.idx].world.transformVec3(v);

      rtn.push(v.clone());
    }

    return rtn;
  }

  getPositionAt(pose: Pose, idx: number): Vector3 {
    const b = pose.bones[this.links[idx].idx];
    return b.world.pos;
  }

  getAllPositions(pose: Pose): Array<Vector3> {
    const rtn: Array<Vector3> = [];
    let lnk: IKLink;

    // Get head position of every bone
    for (lnk of this.links) {
      rtn.push(pose.bones[lnk.idx].world.pos.clone());
    }

    // Get tail position of the last bone
    lnk = this.links[this.count - 1];
    const v = new Vector3(0, lnk.len, 0);
    pose.bones[lnk.idx].world.transformVec3(v);

    rtn.push(v.clone());

    return rtn;
  }

  getStartPosition(pose: Pose): Vector3 {
    const b = pose.bones[this.links[0].idx];
    return b.world.pos;
  }

  getMiddlePosition(pose: Pose): Vector3 {
    if (this.count == 2) {
      const b = pose.bones[this.links[1].idx];
      return b.world.pos;
    }
    console.warn("TODO: Implemenet IKChain.getMiddlePosition");
    return new Vector3();
  }

  getLastPosition(pose: Pose): Vector3 {
    const b = pose.bones[this.links[this.count - 1].idx];
    return b.world.pos;
  }

  getTailPosition(pose: Pose, ignoreScale: boolean = false): Vector3 {
    const b = pose.bones[this.links[this.count - 1].idx];
    const v = new Vector3(0, b.len, 0);

    if (!ignoreScale) return b.world.transformVec3(v).clone();

    Vector3.transformByQuat(v, b.world.rot, v);
    Vector3.add(v, b.world.pos, v);
    return v.clone();
  }

  getAltDirections(pose: Pose, idx: number = 0): Array<Vector3> {
    // Get Link & Bone
    const lnk = this.links[idx];
    const b = pose.bones[lnk.idx];
    // Clone the Directions
    const eff: Vector3 = lnk.effectorDir.clone();
    const pol: Vector3 = lnk.poleDir.clone();

    // Transform Directions
    Vector3.transformByQuat(eff, b.world.rot, eff);
    Vector3.transformByQuat(pol, b.world.rot, pol);

    return [eff, pol];
  }

  bindAltDirections(pose: Pose, effectorDir: Vector3, poleDir: Vector3): this {
    let l: IKLink;
    let v = new Vector3();
    let inv = new Quaternion();

    for (l of this.links) {
      Quaternion.invert(pose.bones[l.idx].world.rot, inv);

      Vector3.transformByQuat(effectorDir, inv, v);
      v.cloneTo(l.effectorDir);

      Vector3.transformByQuat(poleDir, inv, v);
      v.cloneTo(l.poleDir);
    }

    return this;
  }

  setAltDirections(effectorDir: Vector3, poleDir: Vector3): this {
    let l: IKLink;
    for (l of this.links) {
      effectorDir.cloneTo(l.effectorDir);
      poleDir.cloneTo(l.poleDir);
    }
    return this;
  }

  resolveToPose(pose: Pose, debug?: any): this {
    if (!this.solver) {
      console.warn("Chain.resolveToPose - Missing Solver");
      return this;
    }
    this.solver.resolve(this, pose, debug);
    return this;
  }
}
