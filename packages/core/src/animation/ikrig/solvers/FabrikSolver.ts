import { Pose, Bone } from "../../armature";
import { IKChain, IKLink } from "../rigs/IKChain";
import { ISolver } from "./support/ISolver";
import { BoneTransform, Quaternion, Vector3 } from "@arche-engine/math";

// Forward And Backward Reaching Inverse Kinematics
export class FabrikSolver implements ISolver {
  // Max Attempts to reach the end effector
  maxIteration = 15;
  // IK Target can be a Position or...
  effectorPos = new Vector3();
  effectorFwd = new Vector3();

  // Use & Apply changes to pose, else will use bindpose for initial data & updating pose
  _inWorldSpace = false;
  _threshold = 0.0001 ** 2;
  // Use to keep track of the position of each bone
  _bonePos!: Array<Vector3>;

  _radLimit = (45 * Math.PI) / 180;
  _dotLimit = Math.cos(this._radLimit);

  _radLimit2 = (10 * Math.PI) / 180;
  _dotLimit2 = Math.cos(this._radLimit2);

  initData(pose?: Pose, chain?: IKChain): this {
    return this;
  }

  setTargetPos(v: Vector3): this {
    //this._isTarPosition     = true;
    this.effectorPos.x = v.x;
    this.effectorPos.y = v.y;
    this.effectorPos.z = v.z;
    return this;
  }

  setTargetFwd(v: Vector3): this {
    this.effectorFwd.x = v.x;
    this.effectorFwd.y = v.y;
    this.effectorFwd.z = v.z;
    return this;
  }

  inWorldSpace(): this {
    this._inWorldSpace = true;
    return this;
  }

  resolve(chain: IKChain, pose: Pose, debug?: any): void {
    this._preProcess(chain, pose, debug);

    let i: number = 0;
    let good: number = 0;
    for (i; i < this.maxIteration; i++) {
      this._iterateBackward(chain, debug);
      this._iterateForward(chain, debug);

      if (Vector3.distanceSquared(this.effectorPos, this._bonePos[chain.count]) <= this._threshold) {
        good++;
        if (good >= 3) break;
      }
    }
    if (this._inWorldSpace) this._update_fromWorldPose(chain, pose, debug);
    // Apply Changes to Pose that's passed in.
    else this._update_fromBindPose(chain, pose, debug); // Apply to BindPose then save results to pose.
  }

  _preProcess(chain: IKChain, pose: Pose, debug?: any): void {
    // JIT Array
    if (!this._bonePos) {
      this._bonePos = [];
      for (let i = 0; i < chain.count; i++) this._bonePos.push(new Vector3());
      this._bonePos.push(new Vector3()); // One more to store tail
    }

    // Compute all the Starting Positions for the Chain
    let lnk: IKLink;

    if (this._inWorldSpace) {
      for (let i = 0; i < chain.count; i++) {
        lnk = chain.links[i];
        pose.bones[lnk.idx].world.pos.cloneTo(this._bonePos[i]);
      }
    } else {
      const pt = new BoneTransform();
      const ct = new BoneTransform();
      lnk = chain.first();

      // Start in Bind Space
      // Get the Starting Transform for the chain.
      pose.getWorldTransform(lnk.pidx, pt);
      // Shift Bind to World Space
      ct.fromMul(pt, lnk.bind);
      // Save First Position
      ct.pos.cloneTo(this._bonePos[0]);

      for (let i = 1; i < chain.count; i++) {
        // Add Next Bone to transform chain
        ct.mul(chain.links[i].bind);
        // Save its position
        ct.pos.cloneTo(this._bonePos[i]);
      }
    }
  }

  _update_fromWorldPose(chain: IKChain, pose: Pose, debug?: any): void {
    const pt = new BoneTransform();
    const ct = new BoneTransform();
    let lnk = chain.first();
    const tail = new Vector3();
    const from = new Vector3();
    const to = new Vector3();
    const q = new Quaternion();
    let b: Bone;

    // Get the Starting Transform for the chain.
    pose.getWorldTransform(lnk.pidx, pt);

    for (let i = 0; i < chain.count; i++) {
      lnk = chain.links[i];
      b = pose.bones[lnk.idx];

      ct.fromMul(pt, b.local); // Get Bone's World Space Transform
      tail[0] = 0;
      tail[1] = lnk.len;
      tail[2] = 0;
      // Get its Tail Position
      ct.transformVec3(tail);
      // From Direction, WS Bone to WS Bind Tail
      Vector3.subtract(tail, ct.pos, from);
      from.normalize();
      // To Direction, WS Bone to Fabrik Pos
      Vector3.subtract(this._bonePos[i + 1], ct.pos, to);
      to.normalize();
      // Create Swing Rotation
      Quaternion.rotationTo(from, to, q);
      // Apply it to world space bind
      Quaternion.multiply(q, ct.rot, q);
      // To Local
      Quaternion.pmulInvert(q, pt.rot, q);
      // Save
      pose.setLocalRot(lnk.idx, q);
      // Set WorldSpace Transform for next bone
      pt.mul(q, lnk.bind.pos, lnk.bind.scl);
    }
  }

  _update_fromBindPose(chain: IKChain, pose: Pose, debug?: any): void {
    const tail = new Vector3();
    const from = new Vector3();
    const to = new Vector3();
    const q = new Quaternion();
    const pt = new BoneTransform();
    const ct = new BoneTransform();
    let lnk = chain.first();
    // Get the Starting Transform for the chain.
    pose.getWorldTransform(lnk.pidx, pt);

    for (let i = 0; i < chain.count; i++) {
      lnk = chain.links[i];

      ct.fromMul(pt, lnk.bind);
      tail[0] = 0;
      tail[1] = lnk.len;
      tail[2] = 0;

      ct.transformVec3(tail);
      // From Direction, Bone to Bind Tail
      Vector3.subtract(tail, ct.pos, from);
      from.normalize();
      // To Direction, Bone to Fabrik Pos
      Vector3.subtract(this._bonePos[i + 1], ct.pos, to);
      to.normalize();
      // Create Swing Rotation
      Quaternion.rotationTo(from, to, q);
      // Apply it to world space bind
      Quaternion.multiply(q, ct.rot, q);
      // To Local
      Quaternion.pmulInvert(q, pt.rot, q);

      pose.setLocalRot(lnk.idx, q); // Save
      pt.mul(q, lnk.bind.pos, lnk.bind.scl); // Set WorldSpace Transform for next bone
    }
  }

  _applyAngleConstraint(fromDir: Vector3, toDir: Vector3, t: number) {
    const dLmt = lerp(this._dotLimit, this._dotLimit2, t);
    const dot = Math.max(Math.min(Vector3.dot(fromDir, toDir), 1), -1);
    if (dot > dLmt) return;

    const rad = Math.acos(dot);
    const axis = new Vector3();
    Vector3.cross(fromDir, toDir, axis);
    axis.normalize();

    const radLmt = lerp(this._radLimit, this._radLimit2, t);
    const q = new Quaternion();
    Quaternion.rotationAxisAngle(axis, -(rad - radLmt), q);
    Vector3.transformByQuat(toDir, q, toDir);
  }

  _iterateBackward(chain: IKChain, debug?: any): void {
    const endIdx = chain.count - 1;
    const apos = this._bonePos;
    const lnks = chain.links;
    const dir = new Vector3();
    const prevDir = new Vector3();
    // Start Pointing to Effector
    const prevPos = this.effectorPos.clone();

    // Skip root point since we can consider it pinned
    let i, t;
    for (i = endIdx; i > 0; i--) {
      // Direction from pos toward prev
      Vector3.subtract(apos[i], prevPos, dir);
      dir.normalize();

      if (this._radLimit && i != endIdx) {
        t = 1 - i / endIdx;
        // 0-1 to 0-1-0
        t = 1 - Math.abs(2 * t - 1);
        // Apply controllable curve on T
        t = sigmoid(t, -0.5);

        this._applyAngleConstraint(prevDir, dir, t);
      }

      // Scale direction by bone's length, move bone so its tail touches prev pos
      Vector3.scale(dir, lnks[i].len, apos[i]);
      Vector3.add(apos[i], prevPos, apos[i]);
      // Save for next bone as target pos
      apos[i].cloneTo(prevPos);
      // Save for next bone for Angle Constraint Testing
      dir.cloneTo(prevDir);
    }
  }

  _iterateForward(chain: IKChain, debug?: any): void {
    const apos = this._bonePos;
    const lnks = chain.links;
    const dir = new Vector3();
    const prevPos = apos[0].clone();
    let prevLen: number = lnks[0].len;

    // Move all the points back towards the root position
    for (let i = 1; i < chain.count; i++) {
      Vector3.subtract(apos[i], prevPos, dir); // Direction from Bone pos to prev pos
      dir.normalize(); // Normalize it

      // Scale Direction by Prev Bone's Length then Move it so its touches prev bone's
      Vector3.scale(dir, prevLen, apos[i]);
      Vector3.add(apos[i], prevPos, apos[i]);

      apos[i].cloneTo(prevPos); // Save for next bone
      prevLen = lnks[i].len; // Save Previous Bone Length to compute tail position
    }

    // Figure out the tail position after iteration
    const ilast = chain.count - 1;
    Vector3.subtract(this.effectorPos, apos[ilast], prevPos);

    prevPos.normalize();
    Vector3.scale(prevPos, lnks[ilast].len, apos[chain.count]);
    Vector3.add(apos[chain.count], apos[ilast], apos[chain.count]);
  }
}

function lerp(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}

function sigmoid(t: number, k = 0) {
  // Over 0, Eases in the middle, under eases in-out
  // this uses the -1 to 1 value of sigmoid which allows to create easing at
  // start and finish. Can pass in range 0:1 and it'll return that range.
  // https://dhemery.github.io/DHE-Modules/technical/sigmoid/
  // https://www.desmos.com/calculator/q6ukniiqwn
  return (t - k * t) / (k - 2 * k * Math.abs(t) + 1);
}
