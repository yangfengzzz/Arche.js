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
  position: number[] | null = null;
  // Local Space Rotation
  rotation: number[] | null = null;
  // Local Space Scale
  scale: number[] | null = null;
}

export class SkinJoint {
  // Name of Joint
  name: string | null = null;
  // Joint Index
  index: number | null = null;
  // Parent Joint Index, Null if its a Root Joint
  parentIndex: number | null = null;

  // Inverted WorldSpace Transform
  bindMatrix: number[] | null = null;
  // Local Space Position
  position: number[] | null = null;
  // Local Space Rotation
  rotation: number[] | null = null;
  // Local Space Scale
  scale: number[] | null = null;
}
