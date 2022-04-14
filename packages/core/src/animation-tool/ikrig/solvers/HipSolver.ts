import { IKChain } from "../rigs/IKChain";
import { Hip } from "../IKData";
import { ISolver } from "./support/ISolver";
import { SwingTwistSolver } from "./SwingTwistSolver";
import { Matrix, Quaternion, Vector3 } from "@arche-engine/math";

export class HipSolver implements ISolver {
  static pos = new Vector3();
  static rot = new Quaternion();
  static scale = new Vector3();

  isAbs: boolean = true;
  position = new Vector3();
  bindHeight: number = 0;
  _swingTwist = new SwingTwistSolver();

  initData(chain?: IKChain): this {
    if (chain) {
      const b = chain.links[0].idx;
      this.setMovePos(b.transform.worldPosition, true);

      this._swingTwist.initData(chain);
    }
    return this;
  }

  setTargetDir(e: Vector3, pole?: Vector3): this {
    this._swingTwist.setTargetDir(e, pole);
    return this;
  }

  setTargetPos(v: Vector3, pole?: Vector3): this {
    this._swingTwist.setTargetPos(v, pole);
    return this;
  }

  setTargetPole(v: Vector3): this {
    this._swingTwist.setTargetPole(v);
    return this;
  }

  setMovePos(pos: Vector3, isAbs: boolean = true, bindHeight: number = 0): this {
    this.position.x = pos.x;
    this.position.y = pos.y;
    this.position.z = pos.z;
    this.isAbs = isAbs;
    this.bindHeight = bindHeight;
    return this;
  }

  resolve(chain: IKChain): void {
    const hipPos = new Vector3();
    const pt = new Matrix();
    const ptInv = new Matrix();
    const lnk = chain.first();

    // Get the Starting Transform
    if (lnk.pidx == null) {
      // lnk.idx.transform.worldMatrix.cloneTo(pt);
    } else {
      lnk.pidx.transform.worldMatrix.cloneTo(pt);
    }

    // Invert Transform to Translate Position to Local Space
    Matrix.invert(pt, ptInv);

    // Which Position Type Are we handling?
    if (this.isAbs) {
      // Set Absolute Position of where the hip must be
      this.position.cloneTo(hipPos);
    } else {
      const ct = new Matrix();
      // Get Bone's BindPose position in relation to this pose
      Matrix.multiply(pt, lnk.bind, ct);
      ct.decompose(HipSolver.pos, HipSolver.rot, HipSolver.scale);

      if (this.bindHeight == 0) {
        // Add Offset Position
        Vector3.add(HipSolver.pos, this.position, hipPos);
      } else {
        // Need to scale offset position in relation to the Hip Height of the Source
        Vector3.scale(this.position, Math.abs(HipSolver.pos.y / this.bindHeight), hipPos);
        Vector3.add(hipPos, HipSolver.pos, hipPos);
      }
    }

    // To Local Space
    hipPos.transformCoordinate(ptInv);
    lnk.idx.transform.position = hipPos;

    // Apply SwingTwist Rotation
    this._swingTwist.resolve(chain);
  }

  ikDataFromPose(chain: IKChain, out: Hip): void {
    const v = new Vector3();
    const lnk = chain.first();
    const b = lnk.idx;
    const tran = new Matrix();

    // Figure out the Delta Change of the Hip Position from its Bind Pose to its Animated Pose
    if (b.parent == null) {
      // Use Offset if there is no parent
      Matrix.multiply(b.transform.worldMatrix, lnk.bind, tran);
    } else {
      // Compute Parent's WorldSpace transform, then add local bind pose to it.
      Matrix.multiply(b.parent.transform.worldMatrix, lnk.bind, tran);
    }

    // Position Change from Bind Pose
    tran.decompose(HipSolver.pos, HipSolver.rot, HipSolver.scale);
    Vector3.subtract(b.transform.worldPosition, HipSolver.pos, v);

    // This isn't an absolute Position, its a delta change
    out.isAbsolute = false;
    // Use the bind's World Space Y value as its bind height
    out.bindHeight = HipSolver.pos.y;

    // Save Delta Change
    v.cloneTo(out.pos);

    // Alt Effector
    Vector3.transformByQuat(lnk.effectorDir, b.transform.worldRotationQuaternion, v);
    Vector3.normalize(v, out.effectorDir);

    // Alt Pole
    Vector3.transformByQuat(lnk.poleDir, b.transform.worldRotationQuaternion, v);
    Vector3.normalize(v, out.poleDir);
  }
}
