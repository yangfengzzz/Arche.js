import { Armature, Pose, Bone } from "./armature";
import { Clip } from "./Clip";
import { Animator } from "./Animator";
import { BoneMap, BoneInfo, BoneChain } from "./armature/BoneMap";
import { Quaternion, Vector3 } from "@arche-engine/math";

class Source {
  arm: Armature;
  pose: Pose;
  posHip = new Vector3();

  constructor(arm: Armature) {
    this.arm = arm;
    this.pose = arm.newPose();
  }
}

class BoneLink {
  fromIndex: number;
  fromName: string;
  toIndex: number;
  toName: string;

  // Cache the Bone's Parent WorldSpace Quat
  quatFromParent = new Quaternion();
  // Cache the FROM TPOSE Bone's Worldspace Quaternion for DOT Checking
  quatDotCheck = new Quaternion();
  // Handles "FROM WS" -> "TO WS" Transformation
  wquatFromTo = new Quaternion();
  // Cache Result to handle "TO WS" -> "TO LS" Transformation
  toWorldLocal = new Quaternion();

  constructor(fIdx: number, fName: string, tIdx: number, tName: string) {
    this.fromIndex = fIdx;
    this.fromName = fName;
    this.toIndex = tIdx;
    this.toName = tName;
  }

  bind(fromTPose: Pose, toTPose: Pose): this {
    const fBone: Bone = fromTPose.bones[this.fromIndex];
    const tBone: Bone = toTPose.bones[this.toIndex];

    // What is from the parent world space Transform can we use?
    // Bone's Parent
    // Pose Offset, most often its an identity value
    (fBone.pidx != -1 ? fromTPose.bones[fBone.pidx].world.rot : fromTPose.offset.rot).cloneTo(this.quatFromParent);

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // Caching the parent Bone of the "To Bone" and inverting it
    // This will make it easy to convert the final results back
    // to the TO Bone's Local Space.
    if (tBone.pidx != -1) Quaternion.invert(toTPose.bones[tBone.pidx].world.rot, this.toWorldLocal);
    else Quaternion.invert(toTPose.offset.rot, this.toWorldLocal);

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // This Transform is to handle Transforming the "From TPose Bone" to
    // be equal to "To TPose Bone". Basiclly allow to shift
    // the FROM worldspace to the TO worldspace.
    //this.wquatFromTo
    //    .fromInvert( fBone.world.rot )  // What is the diff from FBone WorldSpace...
    //    .mul( tBone.world.rot );        // to TBone's WorldSpace

    // What is the diff from FBone WorldSpace
    Quaternion.invert(fBone.world.rot, this.wquatFromTo);
    // ...to TBone's WorldSpace
    Quaternion.multiply(this.wquatFromTo, tBone.world.rot, this.wquatFromTo);

    //this.quatDotCheck.copy( fBone.world.rot );
    fBone.world.rot.cloneTo(this.quatDotCheck);

    return this;
  }
}

export class Retarget {
  // Retarget Hip Position
  hipScale = 1;
  // Animate Clip
  anim = new Animator();
  // All the Linked Bones
  map: Map<string, BoneLink> = new Map();
  // Armature for the Clip
  from!: Source;
  // Armature to retarget animation for
  to!: Source;
  //#endregion

  //#region SETTERS
  setClip(c: Clip): this {
    this.anim.setClip(c);
    return this;
  }

  setClipArmature(arm: Armature) {
    this.from = new Source(arm);
    return this;
  }

  setClipPoseOffset(rot?: Quaternion, pos?: Vector3, scl?: Vector3): this {
    const p = this.from.pose;

    // Armature has a Transform on itself sometimes
    // Apply it as the Offset Transform that gets preApplied to the root
    //if( rot ) p.offset.rot.copy( rot );
    //if( pos ) p.offset.pos.copy( pos );
    //if( scl ) p.offset.scl.copy( scl );

    if (rot) rot.cloneTo(p.offset.rot);
    if (pos) pos.cloneTo(p.offset.pos);
    if (scl) scl.cloneTo(p.offset.scl);

    return this;
  }

  setTargetArmature(arm: Armature) {
    this.to = new Source(arm);
    return this;
  }

  getClipPose(doUpdate = false, incOffset = false): Pose {
    if (doUpdate) this.from.pose.updateWorld(incOffset);
    return this.from.pose;
  }

  getTargetPose(doUpdate = false, incOffset = false): Pose {
    if (doUpdate) this.to.pose.updateWorld(incOffset);
    return this.to.pose;
  }

  bind(): boolean {
    // Compute a Common Bone Map to make it easy to compare
    // and link together
    const mapFrom = new BoneMap(this.from.arm);
    const mapTo = new BoneMap(this.to.arm);

    // Make sure the pose world space data is set up
    // and using any offset that pre-exists.
    // Has to be done on bind because TPoses can be set
    // after calling setTargetArmature / setClipArmature
    this.from.pose.updateWorld(true);
    this.to.pose.updateWorld(true);

    // Loop the FROM map looking for any Matches in the TO map
    let i: number,
      fLen: number,
      tLen: number,
      len: number,
      lnk: BoneLink,
      k: string,
      bFrom: BoneInfo | BoneChain,
      bTo: BoneInfo | BoneChain | undefined;

    for ([k, bFrom] of mapFrom.bones) {
      // Check if there is a Matching Bone
      bTo = mapTo.bones.get(k);
      if (!bTo) {
        console.warn("Target missing bone :", k);
        continue;
      }

      // Single Bones
      if (bFrom instanceof BoneInfo && bTo instanceof BoneInfo) {
        lnk = new BoneLink(bFrom.index, bFrom.name, bTo.index, bTo.name);
        lnk.bind(this.from.pose, this.to.pose);

        this.map.set(k, lnk);

        // Bone Chain
      } else if (bFrom instanceof BoneChain && bTo instanceof BoneChain) {
        fLen = bFrom.items.length;
        tLen = bTo.items.length;

        if (fLen == 1 && tLen == 1) {
          // Chain of both are just a single bone
          this.map.set(
            k,
            new BoneLink(bFrom.items[0].index, bFrom.items[0].name, bTo.items[0].index, bTo.items[0].name).bind(
              this.from.pose,
              this.to.pose
            )
          );
        } else if (fLen >= 2 && tLen >= 2) {
          // Link the Chain ends first, then fill in the middle bits

          // Match up the first bone on each chain.
          this.map.set(
            k + "_0",
            new BoneLink(bFrom.items[0].index, bFrom.items[0].name, bTo.items[0].index, bTo.items[0].name).bind(
              this.from.pose,
              this.to.pose
            )
          );

          // Match up the Last bone on each chain.
          this.map.set(
            k + "_x",
            new BoneLink(
              bFrom.items[fLen - 1].index,
              bFrom.items[fLen - 1].name,
              bTo.items[tLen - 1].index,
              bTo.items[tLen - 1].name
            ).bind(this.from.pose, this.to.pose)
          );

          // Match any middle bits
          for (i = 1; i < Math.min(fLen - 1, tLen - 1); i++) {
            lnk = new BoneLink(bFrom.items[i].index, bFrom.items[i].name, bTo.items[i].index, bTo.items[i].name);

            lnk.bind(this.from.pose, this.to.pose);
            this.map.set(k + "_" + i, lnk);
          }
        } else {
          // Try to match up the bones
          len = Math.min(bFrom.items.length, bTo.items.length);
          for (i = 0; i < len; i++) {
            lnk = new BoneLink(bFrom.items[i].index, bFrom.items[i].name, bTo.items[i].index, bTo.items[i].name);

            lnk.bind(this.from.pose, this.to.pose);
            this.map.set(k + "_" + i, lnk);
          }
        }

        // Match but the data is mismatch, one is a bone while the other is a chain.
      } else {
        console.warn("Bone Mapping is mix match of info and chain", k);
      }
    }

    // Data to handle Hip Position Retargeting
    const hip = this.map.get("hip");
    if (hip) {
      const fBone = this.from.pose.bones[hip.fromIndex]; // TBone State
      const tBone = this.to.pose.bones[hip.toIndex];

      //this.from.posHip.copy( fBone.world.pos ).nearZero();    // Cache to Retargeting
      //this.to.posHip.copy( tBone.world.pos ).nearZero();

      // Cache for Retargeting
      fBone.world.pos.cloneTo(this.from.posHip);
      tBone.world.pos.cloneTo(this.to.posHip);

      //this.hipScale = Math.abs( this.to.posHip.y / this.from.posHip.y ); // Retarget Scale FROM -> TO
      this.hipScale = Math.abs(this.to.posHip[1] / this.from.posHip[1]); // Retarget Scale FROM -> TO
    }

    return true;
  }

  animateNext(dt: number): this {
    // Run Animation & Update the FROM Pose with the results
    this.anim.update(dt).applyPose(this.from.pose);

    this.from.pose.updateWorld(true);

    this.applyRetarget();
    this.to.pose.updateWorld(true);

    return this;
  }

  atKey(k: number): this {
    // Set Animator to keyframe & update the FROM Pose with the results
    this.anim.atKey(k).applyPose(this.from.pose);

    this.from.pose.updateWorld(true);

    this.applyRetarget();
    this.to.pose.updateWorld(true);

    return this;
  }

  applyRetarget() {
    const fPose = this.from.pose.bones;
    const tPose = this.to.pose.bones;
    const diff = new Quaternion();
    const tmp = new Quaternion();
    let fBone: Bone;
    let tBone: Bone;
    let bl: BoneLink;

    // Update the bone rotations
    for (bl of this.map.values()) {
      fBone = fPose[bl.fromIndex];
      tBone = tPose[bl.toIndex];

      //------------------------------------
      // Move Bone's Animated LocalSpace into the TPose WorldSpace
      // Using the Cached Quat when the TPoses where bound.
      // The FromTo Rotation is based on the TPose, so the animated
      // pose needs to live in that world, as if out of the whole pose
      // this is the only bone has been modified.

      //diff.fromMul( bl.quatFromParent, fBone.local.rot );
      Quaternion.multiply(bl.quatFromParent, fBone.local.rot, diff);

      //------------------------------------
      // Do dot check to prevent artifacts when applying to vertices

      //if( Quat.dot( diff, bl.quatDotCheck ) < 0 ) diff.mul( tmp.fromNegate( bl.wquatFromTo ) );
      //else                                        diff.mul( bl.wquatFromTo );

      if (Quaternion.dot(diff, bl.quatDotCheck) < 0) {
        Quaternion.scale(bl.wquatFromTo, -1, tmp);
        Quaternion.multiply(diff, tmp, diff);
      } else {
        Quaternion.multiply(diff, bl.wquatFromTo, diff);
      }

      //diff.pmul( bl.toWorldLocal );   // Move to Local Space
      Quaternion.multiply(bl.toWorldLocal, diff, diff); // Move to Local Space

      //tBone.local.rot.copy( diff );   // Save
      diff.cloneTo(tBone.local.rot); // Save
    }

    // Apply Bone Translations
    const hip = this.map.get("hip");
    if (hip) {
      const fBone = this.from.pose.bones[hip.fromIndex];
      const tBone = this.to.pose.bones[hip.toIndex];

      //const v = Vec3
      //    .sub( fBone.world.pos, this.from.posHip )   // Change Since TPose
      //    .scale( this.hipScale )                     // Scale Diff to Target's Scale
      //    .add( this.to.posHip )                      // Add Scaled Diff to Target's TPose Position

      const v = new Vector3();
      Vector3.subtract(fBone.world.pos, this.from.posHip, v); // Change Since TPose
      Vector3.scale(v, this.hipScale, v); // Scale Diff to Target's Scale
      Vector3.add(v, this.to.posHip, v); // Add Scaled Diff to Target's TPose Position

      //tBone.local.pos.copy( v );                      // Save To Target
      v.cloneTo(tBone.local.pos);
    }
  }
}
