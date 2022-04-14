import { Matrix, Quaternion, Vector3 } from "@arche-engine/math";
import { Entity } from "../../../Entity";

export class IKLink {
  // Bone Index
  idx: Entity;
  // Bone Parent Index
  pidx: Entity;
  // Bone Length
  len: number;
  // LocalSpace BindPose ( TPose ) Transform
  bind: Matrix = new Matrix();

  // WorldSpace Target Alt Direction ( Maybe created from Inverted world space Rotation of bone )
  effectorDir = new Vector3(0, 1, 0);
  // WorldSpace Bend   Alt Direction ...
  poleDir = new Vector3(0, 0, 1);

  constructor(idx: Entity) {
    this.idx = idx;
    this.pidx = null;
    this.len = Vector3.distance(
      idx.transform.worldPosition,
      idx.childCount > 0 ? idx.children[0].transform.worldPosition : idx.transform.worldPosition
    );
  }

  static fromBone(b: Entity): IKLink {
    const l = new IKLink(b);
    b.transform.localMatrix.cloneTo(l.bind);
    l.pidx = b.parent;
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

  constructor(bName?: Entity[]) {
    if (bName) this.setBones(bName);
  }

  addBone(b: Entity): this {
    this.length += Vector3.distance(
      b.transform.worldPosition,
      b.childCount > 0 ? b.children[0].transform.worldPosition : b.transform.worldPosition
    );
    this.links.push(IKLink.fromBone(b));
    this.count++;
    return this;
  }

  setBones(bNames: Entity[]): this {
    let b: Entity | null;
    // Reset Chain Length
    this.length = 0;

    for (b of bNames) {
      if (b) {
        this.length += Vector3.distance(
          b.transform.worldPosition,
          b.childCount > 0 ? b.children[0].transform.worldPosition : b.transform.worldPosition
        );
        this.links.push(IKLink.fromBone(b));
      } else {
        console.log("Chain.setBones - Bone Not Found:", b.name);
      }
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
  bindToPose(): this {
    let lnk: IKLink;
    for (lnk of this.links) {
      lnk.idx.transform.localMatrix.cloneTo(lnk.bind);
    }
    return this;
  }

  /** For usecase when bone lengths have been recomputed for a pose which differs from the initial armature */
  resetLengths(): void {
    let lnk: IKLink;
    let len: number;

    this.length = 0;
    for (lnk of this.links) {
      // Get Current Length in Pose
      len = Vector3.distance(
        lnk.idx.transform.worldPosition,
        lnk.idx.childCount > 0 ? lnk.idx.children[0].transform.worldPosition : lnk.idx.transform.worldPosition
      );
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

  getEndPositions(): Array<Vector3> {
    let rtn: Array<Vector3> = [];

    if (this.count != 0) rtn.push(this.links[0].idx.transform.worldPosition.clone());

    if (this.count > 1) {
      const lnk = this.last();
      const v = new Vector3(0, lnk.len, 0);
      Vector3.transformCoordinate(v, lnk.idx.transform.worldMatrix, v);

      rtn.push(v.clone());
    }

    return rtn;
  }

  getPositionAt(idx: number): Vector3 {
    const b = this.links[idx].idx;
    return b.transform.worldPosition.clone();
  }

  getAllPositions(): Array<Vector3> {
    const rtn: Array<Vector3> = [];
    let lnk: IKLink;

    // Get head position of every bone
    for (lnk of this.links) {
      rtn.push(lnk.idx.transform.worldPosition.clone());
    }

    // Get tail position of the last bone
    lnk = this.links[this.count - 1];
    const v = new Vector3(0, lnk.len, 0);
    Vector3.transformCoordinate(v, lnk.idx.transform.worldMatrix, v);

    rtn.push(v.clone());

    return rtn;
  }

  getStartPosition(): Vector3 {
    const b = this.links[0].idx;
    return b.transform.worldPosition.clone();
  }

  getMiddlePosition(): Vector3 {
    if (this.count == 2) {
      const b = this.links[1].idx;
      return b.transform.worldPosition.clone();
    }
    console.warn("TODO: Implement IKChain.getMiddlePosition");
    return new Vector3();
  }

  getLastPosition(): Vector3 {
    const b = this.links[this.count - 1].idx;
    return b.transform.worldPosition.clone();
  }

  getTailPosition(ignoreScale: boolean = false): Vector3 {
    const b = this.links[this.count - 1].idx;
    const v = new Vector3(
      0,
      Vector3.distance(
        b.transform.worldPosition,
        b.childCount > 0 ? b.children[0].transform.worldPosition : b.transform.worldPosition
      ),
      0
    );

    if (!ignoreScale) {
      return v.transformCoordinate(b.transform.worldMatrix);
    }

    Vector3.transformByQuat(v, b.transform.worldRotationQuaternion, v);
    Vector3.add(v, b.transform.worldPosition, v);
    return v.clone();
  }

  getAltDirections(idx: number = 0): Array<Vector3> {
    // Get Link & Bone
    const lnk = this.links[idx];
    const b = lnk.idx;
    // Clone the Directions
    const eff: Vector3 = lnk.effectorDir.clone();
    const pol: Vector3 = lnk.poleDir.clone();

    // Transform Directions
    Vector3.transformByQuat(eff, b.transform.worldRotationQuaternion, eff);
    Vector3.transformByQuat(pol, b.transform.worldRotationQuaternion, pol);

    return [eff, pol];
  }

  bindAltDirections(effectorDir: Vector3, poleDir: Vector3): this {
    let l: IKLink;
    let v = new Vector3();
    let inv = new Quaternion();

    for (l of this.links) {
      Quaternion.invert(l.idx.transform.worldRotationQuaternion, inv);

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

  resolveToPose(debug?: any): this {
    if (!this.solver) {
      console.warn("Chain.resolveToPose - Missing Solver");
      return this;
    }
    this.solver.resolve(this, debug);
    return this;
  }
}
