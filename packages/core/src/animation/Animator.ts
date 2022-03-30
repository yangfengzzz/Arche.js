import type { ITrack } from "./tracks/types";
import { Pose } from "./armature";
import { Clip } from "./Clip";
import { MathUtil } from "@arche-engine/math";

/** Set of information to pass to Tracks for when animating a character. */
export class FrameInfo {
  // Keyframe Index for Start Tangent
  kt0: number = 0;
  // Keyframe Index for End Tangent
  kt1: number = 0;
  // Keyframe Index Lerp Start
  k0: number = -1;
  // Keyframe Index Lerp End
  k1: number = -1;
  // Lerp Time
  t: number = 0;
  // Lerp Time Inverse
  ti: number = 0;
}

/** Basic Animator for Armature */
export class Animator {
  // Clips can have multiple TimeStamps, So need to compute Frame Data for each
  frameInfo: Array<FrameInfo> = [];
  // Running Animation Clock
  clock: number = 0;
  // Animation to Run
  clip!: Clip;
  // Lock the forward movement of the animation when applied to pose
  inPlace = false;

  resetClock() {
    this.clock = 0;
    return this;
  }

  setClip(c: Clip): this {
    this.clip = c;
    return this;
  }

  /** Move Animation to the next possible frame. */
  update(deltaTime: number): this {
    this.clock = (this.clock + deltaTime) % this.clip.duration;
    this._computeFrameInfo();
    return this;
  }

  applyPose(pose: Pose): this {
    if (!this.clip) return this;

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    let t: ITrack;
    for (t of this.clip.tracks) {
      t.apply(pose, this.frameInfo[t.timeStampIndex]);
    }

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    if (this.inPlace) {
      // TODO: Y only because Maximo Animations have ZUp, Need to do a better version of inplace setting
      // Also come up with a better way then just "inPlace" property.

      // Maybe InPlace Scale, so [1,0,1] will zero out Y
      const bPos = pose.bones[0].local.pos;
      bPos[1] = 0;
    }

    return this;
  }

  /** Set Animator on a specific frame */
  atKey(n: number): this {
    // TODO : Revisit when have animation examples of multiple TimeStamp Arrays
    if (!this.clip) return this;
    if (n < 0) n = 0;
    this._genFrameInfo();

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    const aryTs = this.clip.timeStamps;
    const aryFi = this.frameInfo;
    // TimeStamp;
    let ts: Float32Array;
    let fi: FrameInfo;
    // TimeStamp Length;
    let tsLen: number;

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    for (let i = 0; i < aryTs.length; i++) {
      ts = aryTs[i];
      fi = aryFi[i];
      tsLen = ts.length - 1;

      fi.t = 1;
      fi.ti = 0;
      fi.k0 = n <= tsLen ? n : tsLen;
      fi.k1 = fi.k0;
      fi.kt0 = fi.k0;
      fi.kt1 = fi.k0;
    }

    return this;
  }

  /** Make sure we have enough frame info objects to handle all the timestamps of the clip  */
  _genFrameInfo() {
    const aryFi = this.frameInfo;
    const aryTs = this.clip.timeStamps;
    if (aryFi.length < aryTs.length) {
      for (let i = aryFi.length; i < aryTs.length; i++) aryFi.push(new FrameInfo());
    }
  }

  _computeFrameInfo(): void {
    if (!this.clip) return;
    this._genFrameInfo();

    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    const aryFi = this.frameInfo;
    const aryTs = this.clip.timeStamps;
    const time = this.clock;

    // TimeStamp;
    let ts: Float32Array;
    let fi: FrameInfo;
    // TimeStamp Length;
    let tLen: number;

    for (let i = 0; i < aryTs.length; i++) {
      //-------------------------------------
      // Get our Main bits of Data
      ts = aryTs[i];
      fi = aryFi[i];
      tLen = ts.length;

      //-------------------------------------
      // Some Animations have a timestamp with just one frame
      // this is to set specific bones at the start of the animation but
      // doesn't change during the course of the animation.
      if (tLen == 0) {
        //console.log( 'Single Keyframe' );
        fi.t = 1;
        fi.ti = 0;
        fi.k0 = 0;
        fi.k1 = 0;
        fi.kt0 = 0;
        fi.kt1 = 0;
        continue;
      }

      //-------------------------------------
      if (fi.k0 != -1 && time >= ts[fi.k0] && time <= ts[fi.k1]) {
        // If the clock still exists between the previous keyframes,
        // then just save time by just computing its T values.
        //console.log( 'Reuse Keyframes' );
        //continue;
      } else {
        // Find the Start/End Keyframes that the clock lives between
        //console.log( 'Find Keyframes' );
        //console.log( 'Clock', time );
        //console.log( "TimeStamp", ts );

        // Find the Index of timestamp that is the first one to be greater than time.
        let imin = 0,
          mi = 0,
          imax = ts.length - 1;
        // Once Min Crosses or Equals Max, Stop Loop.
        while (imin < imax) {
          // Compute Mid-Index
          mi = (imin + imax) >>> 1;
          // Time is LT Timestamp, use mid as new Max Range
          if (time < ts[mi]) imax = mi;
          // Time is GTE TimeStamp, move min to one after mid.
          else imin = mi + 1;
        }

        // The starting / ending Keyframe Indices
        // Can't go negative, so set to main frame
        if (imax <= 0) {
          fi.k0 = 0;
          fi.k1 = 1;
        } else {
          fi.k0 = imax - 1;
          fi.k1 = imax;
        }

        // Tangent Keyframe Indices that loop around
        fi.kt0 = MathUtil.mod(fi.k0 - 1, tLen);
        fi.kt1 = MathUtil.mod(fi.k1 + 1, tLen);
      }

      //-------------------------------------
      // Lerp Time & its inverse.
      fi.t = (time - ts[fi.k0]) / (ts[fi.k1] - ts[fi.k0]); // Map Time between the Two Time Stamps
      fi.ti = 1 - fi.t;
    }
  }
}
