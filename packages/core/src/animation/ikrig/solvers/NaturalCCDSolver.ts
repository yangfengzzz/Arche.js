import { Pose } from "../../armature";
import { IKChain, IKLink } from "../rigs/IKChain";
import { ISolver } from "./support/ISolver";
import { BoneTransform, Quaternion, Vector3 } from "@arche-engine/math";

export class NaturalCCDSolver implements ISolver {
  effectorPos = new Vector3();
  // Use & Apply changes to pose, else will use bindpose for initial data & updating pose
  _inWorldSpace = false;
  _tries = 30;
  // Min Effector Range Square
  _minEffRng = 0.001 ** 2;
  _chainCnt = 0;
  _local!: BoneTransform[];
  _world!: BoneTransform[];
  _kFactor!: any;

  initData(pose?: Pose, chain?: IKChain): this {
    // Get the Chain's Tail Position as the Effector Position
    if (pose && chain) {
      const lnk = chain.last();
      const eff = new Vector3(0, lnk.len, 0);

      // The Trail Position in WorldSpace
      pose.bones[lnk.idx].world.transformVec3(eff);
      eff.cloneTo(this.effectorPos);
    }

    // Setup Transform Chains to handle Iterative Processing of CCD
    if (chain) {
      const cnt = chain.count;
      this._chainCnt = cnt;
      // Extra Transform for Final Tail
      this._world = new Array(cnt + 1);
      this._local = new Array(cnt + 1);

      // Create a Transform for each link/bone
      for (let i = 0; i < cnt; i++) {
        this._world[i] = new BoneTransform();
        this._local[i] = new BoneTransform();
      }

      // Tail Transform
      this._world[cnt] = new BoneTransform();
      this._local[cnt] = new BoneTransform(new Quaternion(), new Vector3(0, chain.last().len, 0), new Vector3(1, 1, 1));
    }

    return this;
  }

  setTargetPos(v: Vector3): this {
    this.effectorPos[0] = v[0];
    this.effectorPos[1] = v[1];
    this.effectorPos[2] = v[2];
    return this;
  }

  useArcSqrFactor(c: number, offset: number, useInv = false): this {
    this._kFactor = new KFactorArcSqr(c, offset, useInv);
    return this;
  }

  inWorldSpace(): this {
    this._inWorldSpace = true;
    return this;
  }

  setTries(v: number) {
    this._tries = v;
    return this;
  }

  resolve(chain: IKChain, pose: Pose, debug?: any): void {
    if (!this._local) {
      const cnt = chain.count;
      this._world = new Array(cnt + 1); // Extra Transform for Final Tail
      this._local = new Array(cnt + 1);

      for (let i = 0; i < cnt; i++) {
        this._world[i] = new BoneTransform();
        this._local[i] = new BoneTransform();
      }

      // Tail Transform
      this._world[cnt] = new BoneTransform();
      this._local[cnt] = new BoneTransform(new Quaternion(), new Vector3(0, chain.last().len, 0), new Vector3(1, 1, 1));
    }

    const root = new BoneTransform();
    let lnk: IKLink = chain.first();

    // Get the Starting Transform
    pose.getWorldTransform(lnk.pidx, root);

    let i: number;

    // Set the Initial Local Space from the chain Bind Pose
    for (i = 0; i < chain.count; i++) {
      if (!this._inWorldSpace) this._local[i].copy(chain.links[i].bind);
      else this._local[i].copy(pose.bones[chain.links[i].idx].local);
    }

    // Update World Space
    this._updateWorld(0, root);
    if (Vector3.distanceSquared(this.effectorPos, this._getTailPos()) < this._minEffRng) {
      return;
    }

    for (i = 0; i < this._tries; i++) {
      // Exit early if reaching effector
      if (this._iteration(chain, pose, root, debug)) break;
    }

    // Save Results to Pose
    for (i = 0; i < chain.count; i++) {
      pose.setLocalRot(chain.links[i].idx, this._local[i].rot);
    }
  }

  // Update the Iteration Transform Chain, helps know the position of
  // each joint & end effector ( Last point on the chain )
  _updateWorld(startIdx: number, root: BoneTransform) {
    const w = this._world;
    const l = this._local;
    let i: number;

    // HANDLE ROOT TRANSFORM
    if (startIdx == 0) {
      // ( Pose Offset * Chain Parent ) * First Link
      w[0].fromMul(root, l[0]);
      // Start on the Nex Transform
      startIdx++;
    }

    // HANDLE MIDDLE TRANSFORMS
    for (i = startIdx; i < w.length; i++) {
      // Parent * Child
      w[i].fromMul(w[i - 1], l[i]);
    }
  }

  _getTailPos() {
    return this._world[this._world.length - 1].pos;
  }

  _iteration(chain: IKChain, pose: Pose, root: BoneTransform, debug?: any): boolean {
    const w = this._world;
    const l = this._local;
    const cnt = w.length - 1;
    const tail = w[cnt];
    const tailDir = new Vector3();
    const effDir = new Vector3();
    const lerpDir = new Vector3();
    const q = new Quaternion();
    const k = this._kFactor;

    let i: number;
    let diff: number;
    let b: BoneTransform;

    if (k) k.reset();

    // Skip End Effector Transform
    for (i = cnt - 1; i >= 0; i--) {
      // Check how far tail is from End Effector
      // Distance Squared from Tail to Effector
      diff = Vector3.distanceSquared(tail.pos, this.effectorPos);
      // Point Reached, can Stop
      if (diff <= this._minEffRng) return true;

      b = w[i];

      // Direction from current joint to end effector
      Vector3.subtract(tail.pos, b.pos, tailDir);
      // Direction from current joint to target
      tailDir.normalize();

      Vector3.subtract(this.effectorPos, b.pos, effDir);
      effDir.normalize();

      // How Factor to Rotation Movement
      if (k) k.apply(chain, chain.links[i], tailDir, effDir, lerpDir);
      else effDir.cloneTo(lerpDir);

      // Create Rotation toward target
      Quaternion.rotationTo(tailDir, lerpDir, q);
      // Apply to current World rotation
      Quaternion.multiply(q, b.rot, q);

      // To Local Space
      if (i != 0) Quaternion.pmulInvert(q, w[i - 1].rot, q);
      else Quaternion.pmulInvert(q, root.rot, q);

      // Save back to bone
      q.cloneTo(l[i].rot);

      // Update Chain from this bone and up.
      this._updateWorld(i, root);
    }

    return false;
  }
}

class KFactorArcSqr {
  c: number;
  offset: number;
  arcLen = 0;
  useInv = false;

  constructor(c: number, offset: number, useInv = false) {
    this.c = c;
    this.offset = offset;
    this.useInv = useInv;
  }

  reset() {
    this.arcLen = 0;
  }

  apply(chain: IKChain, lnk: IKLink, tailDir: Vector3, effDir: Vector3, out: Vector3) {
    // Notes, Can do the inverse of pass in chain's length so chain.len - this.arcLen
    // This causes the beginning of the chain to move more and the tail less.
    // Accumulate the Arc length for each bone
    this.arcLen += lnk.len;

    //const k = this.c / Math.sqrt( this.arcLen + this.offset );  // k = Constant / sqrt( CurrentArcLen )
    const k = !this.useInv
      ? this.c / Math.sqrt(this.arcLen + this.offset)
      : this.c / Math.sqrt(chain.length - this.arcLen + this.offset);

    Vector3.lerp(tailDir, effDir, k, out);
    out.normalize();
  }
}
