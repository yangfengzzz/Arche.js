import { IKChain, IKLink } from "../rigs/IKChain";
import { ISolver } from "./support/ISolver";
import { Dir } from "../IKData";
import { Matrix, Quaternion, Vector3 } from "@arche-engine/math";

export class SwingTwistSolver implements ISolver {
  static pos = new Vector3();
  static rot = new Quaternion();
  static scale = new Vector3();

  // Is the Target a Position or a Direction?
  _isTarPosition: boolean = false;
  // Pole gets updated based on effector direction, so keep originally set dir to compute the orthogonal poleDir
  _originPoleDir = new Vector3();
  effectorScale: number = 1;
  // IK Target can be a Position or...
  effectorPos = new Vector3();
  // Direction. BUT if its position, need to compute dir from chain origin position.
  effectorDir = new Vector3(0, 0, 1);
  // Direction that handles the twisitng rotation
  poleDir = new Vector3(0, 1, 0);
  // Direction that handles the bending direction, like elbow/knees.
  orthoDir = new Vector3(1, 0, 0);
  // Starting World Position of the Chain
  originPos = new Vector3();

  initData(chain?: IKChain): this {
    if (chain) {
      // If init pose is the same used for binding, this should recreate the WORLD SPACE Pole Direction just fine
      const lnk: IKLink = chain.links[0];
      const rot: Quaternion = lnk.idx.transform.worldRotationQuaternion;

      const eff = new Vector3();
      Vector3.transformByQuat(lnk.effectorDir, rot, eff);
      const pole = new Vector3();
      Vector3.transformByQuat(lnk.poleDir, rot, pole);

      this.setTargetDir(eff, pole);
    }
    return this;
  }

  setTargetDir(e: Vector3, pole?: Vector3, effectorScale?: number): this {
    this._isTarPosition = false;
    this.effectorDir.x = e.x;
    this.effectorDir.y = e.y;
    this.effectorDir.z = e.z;
    if (pole) this.setTargetPole(pole);

    if (effectorScale) this.effectorScale = effectorScale;
    return this;
  }

  setTargetPos(v: Vector3, pole?: Vector3): this {
    this._isTarPosition = true;
    this.effectorPos.x = v.x;
    this.effectorPos.y = v.y;
    this.effectorPos.z = v.z;
    if (pole) this.setTargetPole(pole);
    return this;
  }

  setTargetPole(v: Vector3): this {
    this._originPoleDir.x = v.x;
    this._originPoleDir.y = v.y;
    this._originPoleDir.z = v.z;
    return this;
  }

  resolve(chain: IKChain): void {
    const [rot, pt] = this.getWorldRot(chain);

    // To Local Space
    pt.decompose(SwingTwistSolver.pos, SwingTwistSolver.rot, SwingTwistSolver.scale);
    Quaternion.pmulInvert(rot, SwingTwistSolver.rot, rot);
    // Save to Pose
    chain.links[0].idx.transform.rotationQuaternion.cloneTo(rot);
  }

  ikDataFromPose(chain: IKChain, out: Dir): void {
    const dir = new Vector3();
    const lnk = chain.first();
    const b = lnk.idx;

    // Alt Effector
    Vector3.transformByQuat(lnk.effectorDir, b.transform.worldRotationQuaternion, dir);
    Vector3.normalize(dir, out.effectorDir);

    // Alt Pole
    Vector3.transformByQuat(lnk.poleDir, b.transform.worldRotationQuaternion, dir);
    Vector3.normalize(dir, out.poleDir);
  }

  /** Update Target Data  */
  _update(origin: Vector3): void {
    const v = new Vector3();
    const o = new Vector3();

    // Compute the Effector Direction if only given effector position
    if (this._isTarPosition) {
      // Forward Axis Z
      Vector3.subtract(this.effectorPos, origin, v);
      Vector3.normalize(v, this.effectorDir);
    }

    // Left axis X - Only needed to make pole orthogonal to effector
    Vector3.cross(this._originPoleDir, this.effectorDir, v);
    Vector3.normalize(v, this.orthoDir);

    // Up Axis Y
    Vector3.cross(this.effectorDir, this.orthoDir, v);
    Vector3.normalize(v, this.poleDir);

    origin.cloneTo(this.originPos);
  }

  getWorldRot(chain: IKChain): [Quaternion, Matrix] {
    const pt = new Matrix();
    const ct = new Matrix();
    let lnk = chain.first();

    // Get the Starting Transform
    if (lnk.pidx == null) lnk.idx.transform.worldMatrix.cloneTo(pt);
    else lnk.pidx.transform.worldMatrix.cloneTo(pt);

    // Get Bone's BindPose position in relation to this pose
    Matrix.multiply(pt, lnk.bind, ct);
    // Update Data to use new Origin.
    ct.decompose(SwingTwistSolver.pos, SwingTwistSolver.rot, SwingTwistSolver.scale);
    this._update(SwingTwistSolver.pos);

    const rot = SwingTwistSolver.rot.clone();
    const dir = new Vector3();
    const q = new Quaternion();

    // Swing
    // Get WS Binding Effector Direction of the Bone
    Vector3.transformByQuat(lnk.effectorDir, SwingTwistSolver.rot, dir);
    // Rotation TO IK Effector Direction
    Quaternion.rotationTo(dir, this.effectorDir, q);
    // Apply to Bone WS Rot
    Quaternion.multiply(q, rot, rot);

    // Twist
    if (this.poleDir.lengthSquared() > 0.0001) {
      // Get WS Binding Pole Direction of the Bone
      Vector3.transformByQuat(lnk.poleDir, rot, dir);
      // Rotation to IK Pole Direction
      Quaternion.rotationTo(dir, this.poleDir, q);
      // Apply to Bone WS Rot + Swing
      Quaternion.multiply(q, rot, rot);
    }

    // Kinda Hacky putting this here, but its the only time where there is access to chain's length for all extending solvers.
    // So if not using a TargetPosition, means we're using Direction then we have to compute the effectorPos.
    if (!this._isTarPosition) {
      this.effectorPos[0] = this.originPos[0] + this.effectorDir[0] * chain.length * this.effectorScale;
      this.effectorPos[1] = this.originPos[1] + this.effectorDir[1] * chain.length * this.effectorScale;
      this.effectorPos[2] = this.originPos[2] + this.effectorDir[2] * chain.length * this.effectorScale;
    }

    return [rot, pt];
  }
}
