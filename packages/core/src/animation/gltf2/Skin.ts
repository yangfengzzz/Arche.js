import { Matrix, Quaternion, Vector3 } from "@arche-engine/math";

export class Skin {
  // Index in Mesh Collection
  index: number | null = null;
  // Skin Name
  name: string | null = null;
  // Collection of Joints
  joints: Array<SkinJoint> = [];

  // Sometimes Skin Objects will have their own transform in nodes
  // Tends to come from FBX to GLTF conversion in blender.
  // Local Space Position
  position: Vector3 | null = null;
  // Local Space Rotation
  rotation: Quaternion | null = null;
  // Local Space Scale
  scale: Vector3 | null = null;
}

export class SkinJoint {
  // Name of Joint
  name: string | null = null;
  // Joint Index
  index: number | null = null;
  // Parent Joint Index, Null if it's a Root Joint
  parentIndex: number | null = null;

  // Inverted WorldSpace Transform
  bindMatrix: Matrix | null = null;
  // Local Space Position
  position: Vector3 | null = null;
  // Local Space Rotation
  rotation: Quaternion | null = null;
  // Local Space Scale
  scale: Vector3 | null = null;
}
