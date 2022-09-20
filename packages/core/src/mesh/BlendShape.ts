import { BlendShapeFrame } from "./BlendShapeFrame";
import { Vector3 } from "@arche-engine/math";
import { UpdateFlagManager } from "../UpdateFlagManager";
import { BoolUpdateFlag } from "../BoolUpdateFlag";

/**
 * BlendShape.
 */
export class BlendShape {
  /** Name of BlendShape. */
  name: string;

  /** @internal */
  _useBlendShapeNormal: boolean = false;
  /** @internal */
  _useBlendShapeTangent: boolean = false;

  private _frames: BlendShapeFrame[] = [];
  private _updateFlagManager: UpdateFlagManager = new UpdateFlagManager();

  /**
   * Frames of BlendShape.
   */
  get frames(): Readonly<BlendShapeFrame[]> {
    return this._frames;
  }

  /**
   * Create a BlendShape.
   * @param name - BlendShape name.
   */
  constructor(name: string) {
    this.name = name;
  }

  /**
   * Add a BlendShapeFrame by weight, deltaPositions, deltaNormals and deltaTangents.
   * @param weight - Weight of BlendShapeFrame
   * @param deltaPositions - Delta positions for the frame being added
   * @param deltaNormals - Delta normals for the frame being added
   * @param deltaTangents - Delta tangents for the frame being added
   */
  addFrame(
    weight: number,
    deltaPositions: Vector3[],
    deltaNormals?: Vector3[],
    deltaTangents?: Vector3[]
  ): BlendShapeFrame;

  /**
   * Add a BlendShapeFrame.
   * @param frame - The BlendShapeFrame.
   */
  addFrame(frame: BlendShapeFrame): void;

  addFrame(
    frameOrWeight: BlendShapeFrame | number,
    deltaPositions?: Vector3[],
    deltaNormals?: Vector3[],
    deltaTangents?: Vector3[]
  ): void | BlendShapeFrame {
    if (typeof frameOrWeight === "number") {
      const frame = new BlendShapeFrame(frameOrWeight, deltaPositions, deltaNormals, deltaTangents);
      this._addFrame(frame);
      return frame;
    } else {
      this._addFrame(frameOrWeight);
    }
    this._updateFlagManager.dispatch();
  }

  /**
   * Clear all frames.
   */
  clearFrames(): void {
    this._frames.length = 0;
    this._updateFlagManager.dispatch();
    this._useBlendShapeNormal = false;
    this._useBlendShapeTangent = false;
  }

  /**
   * @internal
   */
  _registerChangeFlag(): BoolUpdateFlag {
    return this._updateFlagManager.createFlag(BoolUpdateFlag);
  }

  private _addFrame(frame: BlendShapeFrame): void {
    const frames = this._frames;
    const frameCount = frames.length;
    if (frameCount > 0 && frame.deltaPositions.length !== frames[frameCount - 1].deltaPositions.length) {
      throw "Frame's deltaPositions length must same with before frame deltaPositions length.";
    }

    this._useBlendShapeNormal = this._useBlendShapeNormal || frame.deltaNormals !== null;
    this._useBlendShapeTangent = this._useBlendShapeTangent || frame.deltaTangents !== null;
    this._frames.push(frame);
  }
}
