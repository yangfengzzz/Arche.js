import { Pose } from "../../armature";
import type { IKChain, IKLink } from "../rigs/IKChain";
import type { ISolver } from "./support/ISolver";
import { BoneTransform, CurveSample, Quaternion, Vector3 } from "@arche-engine/math";

export class Caternary {
  // Feed it a Sag Factor( A ) and the X of the Graph when plotting the curve,
  // will return the Y of the curve.
  static get(A: number, x: number): number {
    return A * Math.cosh(x / A);
  }

  // A = Sagging Factor of the Curve. Need Length between the ends & Total Possible Length between the 2 points
  static computeSag(len: number, maxLen: number, tries = 100): number | null {
    // Solution for Solving for A was found at http://rhin.crai.archi.fr/rld/plugin_details.php?id=990
    // I've since have modified from the original function, removing yDelta and sqrts
    // Note: This seems like newton's method for solving roots ??
    if (len > maxLen) return null;

    const hLen = len * 0.5;
    const hMaxLen = maxLen * 0.5;
    let e: number = Number.MAX_VALUE;
    let a: number = 100;
    let tmp: number = 0;

    for (let i = 0; i < tries; i++) {
      tmp = hLen / Math.asinh(hMaxLen / a);
      e = Math.abs((tmp - a) / a);
      a = tmp;
      if (e < 0.001) break;
    }

    return a;
  }

  static fromEndPoints(
    p0: Vector3,
    p1: Vector3,
    maxLen: number,
    segments: number = 5,
    invert: boolean = false
  ): Array<Vector3> {
    const vecLen = Vector3.distance(p0, p1);
    const A = this.computeSag(vecLen, maxLen);
    if (A == null) return [];
    // Skipping Zero, so need to add one to return the requested segment count
    segments += 1;

    const hVecLen = vecLen * 0.5;
    // Need starting C to base things at Zero, subtract offset from each c point
    const offset = this.get(A, -hVecLen);
    // Size of Each Segment
    const step = vecLen / segments;
    const rtn: Array<Vector3> = [];

    let pnt: Vector3;
    let x: number;
    let c: number;

    for (let i = 1; i < segments; i++) {
      pnt = new Vector3();
      Vector3.lerp(p0, p1, i / segments, pnt); // t   = i / segments;

      // x position between two points but using half as zero center
      x = i * step - hVecLen;
      // Get a y value, but needs to be changed to work with coord system
      c = offset - this.get(A, x);
      pnt[1] = !invert ? pnt[1] - c : pnt[1] + c;

      rtn.push(pnt);
    }

    return rtn;
  }
}

// Align chain onto a Catenary curve, which is often used to simulate
// rope/chains. There was an instance when someone called it RopeIK :/
export class CatenarySolver implements ISolver {
  effectorPos = new Vector3();
  sampler!: CurveSample;

  initData(pose?: Pose, chain?: IKChain): this {
    return this;
  }

  setTargetPos(v: Vector3): this {
    this.effectorPos.x = v.x;
    this.effectorPos.y = v.y;
    this.effectorPos.z = v.z;
    return this;
  }

  resolve(chain: IKChain, pose: Pose, debug?: any): void {
    const sCnt = chain.count * 2;
    if (!this.sampler) this.sampler = new CurveSample(sCnt + 2);

    const pt = new BoneTransform();
    const ct = new BoneTransform();
    let lnk: IKLink = chain.first();

    // Get the Starting Transform for the chain.
    pose.getWorldTransform(lnk.pidx, pt);
    // Move Bind to WS, to get staring position of the chain
    ct.fromMul(pt, lnk.bind);

    const pnts = Caternary.fromEndPoints(ct.pos, this.effectorPos, chain.length, sCnt, false);

    // Update Curve Sampler with new Data
    let i = 1;
    // Set Starting Point
    this.sampler.set(0, ct.pos);
    // Inbetween Points
    for (let p of pnts) this.sampler.set(i++, p);
    // End Point
    this.sampler.set(i, this.effectorPos);
    // Recompute the Curve lengths
    this.sampler.updateLengths();

    // Bone's Tail Position
    const tail = new Vector3();
    // Target Position
    const tar = new Vector3();
    // Unit Vector of Bone Head to Bone Tail
    const from = new Vector3();
    // Unit Vector of Bone Head to Target
    const to = new Vector3();
    // Rotation for FROM > TO
    const q = new Quaternion();
    // Distance at each step of the curve
    let dist = 0;

    for (let i = 0; i < chain.count; i++) {
      // Get Bone Link
      lnk = chain.links[i];
      // Current Distance of the chain this bone's tail reaches.
      dist += lnk.len;

      // Move Bind to World Space
      ct.fromMul(pt, lnk.bind);
      tail[0] = 0;
      tail[1] = lnk.len;
      tail[2] = 0;
      // Get WS Position of Tail
      ct.transformVec3(tail);
      // Get the closes point on the curve in relation to the bone's tail distance
      this.sampler.atLength(dist, tar);

      // Bind Direction
      Vector3.subtract(tail, ct.pos, from);
      from.normalize();
      // Target Direction
      Vector3.subtract(tar, ct.pos, to);
      to.normalize();
      // Create rotation from bind to target
      Quaternion.rotationTo(from, to, q);

      // Apply
      Quaternion.multiply(q, ct.rot, q);
      // To Local
      Quaternion.pmulInvert(q, pt.rot, q);
      // Save
      pose.setLocalRot(lnk.idx, q);
      // Create WorldSpace Parent for next bone
      pt.mul(q, lnk.bind.pos, lnk.bind.scl);
    }
  }
}
