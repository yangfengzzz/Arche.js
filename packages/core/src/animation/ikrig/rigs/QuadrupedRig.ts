import { Pose } from "../../armature";
import { IKChain } from "./IKChain";
import { IKRig } from "./IKRig";
import { Vector3 } from "@arche-engine/math";

// https://www.schoolofmotion.com/blog/how-to-rig-quadrupeds-animation
class QuadrupedRig extends IKRig {
  //#region MAIN
  hip?: IKChain = undefined;
  tail?: IKChain = undefined;
  spine?: IKChain = undefined;
  neck?: IKChain = undefined;
  head?: IKChain = undefined;

  hindLegL?: IKChain = undefined; // Rear Leg
  hindLegR?: IKChain = undefined;
  foreLegL?: IKChain = undefined; // Front Leg
  foreLegR?: IKChain = undefined;

  tarsalL?: IKChain = undefined; // Foot / Rear Paw
  tarsalR?: IKChain = undefined;
  carpalL?: IKChain = undefined; // Hand / Front Paw
  carpalR?: IKChain = undefined;

  /** Setup Chain Data & Sets Alt Directions */
  bindPose(pose: Pose): this {
    // Copy the Local Space Transform of starting Pose to All Chained Bones
    super.bindPose(pose);
    // Set Alt Direction from starting pose
    this._setAltDirection(pose);
    return this;
  }

  _setAltDirection(pose: any): void {
    const FWD = new Vector3(0, 0, 1);
    const UP = new Vector3(0, 1, 0);
    const DN = new Vector3(0, -1, 0);
    const R = new Vector3(-1, 0, 0);
    const L = new Vector3(1, 0, 0);
    const BAK = new Vector3(0, 0, -1);

    if (this.hip) this.hip.bindAltDirections(pose, FWD, UP);
    if (this.spine) this.spine.bindAltDirections(pose, UP, FWD);
    if (this.neck) this.neck.bindAltDirections(pose, FWD, UP);
    if (this.head) this.head.bindAltDirections(pose, FWD, UP);
    if (this.tail) this.tail.bindAltDirections(pose, BAK, UP);

    if (this.hindLegL) this.hindLegL.bindAltDirections(pose, DN, FWD);
    if (this.hindLegR) this.hindLegR.bindAltDirections(pose, DN, FWD);
    if (this.tarsalL) this.tarsalL.bindAltDirections(pose, FWD, UP);
    if (this.tarsalR) this.tarsalR.bindAltDirections(pose, FWD, UP);

    if (this.foreLegL) this.foreLegL.bindAltDirections(pose, DN, FWD);
    if (this.foreLegR) this.foreLegR.bindAltDirections(pose, DN, FWD);
    if (this.carpalL) this.carpalL.bindAltDirections(pose, FWD, UP);
    if (this.carpalR) this.carpalR.bindAltDirections(pose, FWD, UP);
  }

  resolveToPose(pose: any, debug?: any) {
    let ch: IKChain;
    for (ch of this.items.values()) {
      if (ch.solver) ch.resolveToPose(pose, debug);
    }
  }

  //BipedIKPose
  applyBipedIKPose(p: any): void {
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Use Biped Legs for the HindLegs, Then Flip R>L for ForeLegs
    // Animals don't really walk like that, there is more of a delay between the Hind & Fore
    // But without running the animation of the legs twice with the second on a slight delay
    // there is no other solution.

    this.hindLegL?.solver.setTargetDir(p.legL.effectorDir, p.legL.poleDir, p.legL.lenScale);
    this.hindLegR?.solver.setTargetDir(p.legR.effectorDir, p.legR.poleDir, p.legR.lenScale);

    //this.foreLegL?.solver.setTargetDir( p.legR.effectorDir, p.legR.poleDir, p.legR.lenScale );
    //this.foreLegR?.solver.setTargetDir( p.legL.effectorDir, p.legL.poleDir, p.legL.lenScale );

    // FIRST IDEA: Try to blend the arm direction with the hindLegs
    // OTHER IDEAS: Maybe Try to lerp between the two hindlegs to create a delay for forelegs??
    let a = new Vector3();
    Vector3.lerp(p.armL.effectorDir, p.legR.effectorDir, 0.4, a);
    a.normalize();
    let b = new Vector3();
    Vector3.lerp(p.armR.effectorDir, p.legL.effectorDir, 0.4, b);
    b.normalize();

    this.foreLegL?.solver.setTargetDir(a, p.legR.poleDir, p.legR2.lenScale);
    this.foreLegR?.solver.setTargetDir(b, p.legL.poleDir, p.legL2.lenScale);

    this.tarsalL?.solver.setTargetDir(p.footL.effectorDir, p.footL.poleDir);
    this.tarsalR?.solver.setTargetDir(p.footR.effectorDir, p.footR.poleDir);

    this.carpalL?.solver.setTargetDir(p.footR.effectorDir, p.footR.poleDir);
    this.carpalR?.solver.setTargetDir(p.footL.effectorDir, p.footL.poleDir);

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    this.head?.solver.setTargetDir(p.head.effectorDir, p.head.poleDir);

    this.hip?.solver
      .setTargetDir(p.hip.effectorDir, p.hip.poleDir)
      .setMovePos(p.hip.pos, p.hip.isAbsolute, p.hip.bindHeight);

    this.spine?.solver
      .setStartDir(p.spine.startEffectorDir, p.spine.startPoleDir)
      .setEndDir(p.spine.endEffectorDir, p.spine.endPoleDir);
  }
}

export default QuadrupedRig;
