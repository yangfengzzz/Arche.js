import { Accessor } from "./gltf2";
import { Track } from "./gltf2";
import { ITrack } from "./tracks/types";

import { ELerp } from "./tracks/types";
import { Vec3Track } from "./tracks/Vec3Track";
import { QuatTrack } from "./tracks/QuatTrack";

export class Clip {
  // Name of the Clip
  name: string = "";
  // How many frames
  frameCount: number = 0;
  // How Long is the Animation
  duration: number = 0;
  // Tracks : Each track is a single Transform Property( Rot|Trans|Scale ) per bone.
  tracks: Array<ITrack> = [];
  // Clip can have multiple timeStamps that is shared by the Tracks
  timeStamps: Array<Float32Array> = [];

  /** Translate GLTF Animation to Armature Animation Clip */
  static fromGLTF2(anim: any): Clip {
    const clip = new Clip();
    clip.name = anim.name;

    let i: Accessor;
    for (i of anim.timestamps) {
      // Clone TimeStamp Data, so it's not bound to GLTF's BIN
      if (i.data) clip.timeStamps.push(new Float32Array(i.data));
      // Find out the max frame count
      if (i.elementCnt > clip.frameCount) clip.frameCount = i.elementCnt;
      // Find out the full animation time
      if (i.boundMax && i.boundMax[0] > clip.duration) clip.duration = i.boundMax[0];
    }

    // GLTF Track
    let t: Track;
    // Animator Track
    let track: ITrack;
    for (t of anim.tracks) {
      // Filter out all translation tracks unless its for the root bone.
      // TODO: Future add the ability to list out bone names or indexes as a filter
      // The reason being that if there is a root bone & hip bone, might want to have those
      // two include position tracks.
      if (t.transform == 1 && t.jointIndex != 0) continue;

      switch (t.transform) {
        case 0:
          track = new QuatTrack();
          break; // Rot
        case 1:
          track = new Vec3Track();
          break; // Pos
        case 2:
          continue;

        default:
          console.error("unknown animation track transform", t.transform);
          continue;
      }

      switch (t.interpolation) {
        case 0:
          track.setInterpolation(ELerp.Step);
          break;
        case 1:
          track.setInterpolation(ELerp.Linear);
          break;
        case 2:
          track.setInterpolation(ELerp.Cubic);
          break;
      }

      // Clone Data, so it's not bound to GLTF's BIN
      if (t.keyframes.data) track.values = new Float32Array(t.keyframes.data);
      else console.error("Track has no keyframe data");

      track.timeStampIndex = t.timeStampIndex;
      track.boneIndex = t.jointIndex;

      clip.tracks.push(track);
    }

    return clip;
  }
}
