import { Renderer } from "../Renderer";
import { Entity } from "../Entity";
import { RenderElement } from "../rendering/RenderElement";
import { BoundingBox } from "@arche-engine/math";

enum EmitterType {
  POINT,
  DISK,
  SPHERE,
  BALL,
  kNumEmitterType
}

enum SimulationVolume {
  SPHERE,
  BOX,
  NONE,
  kNumSimulationVolume
}

export class ParticleRenderer extends Renderer {
  constructor(entity: Entity) {
    super(entity);
  }

  _render(opaqueQueue: RenderElement[], alphaTestQueue: RenderElement[], transparentQueue: RenderElement[]): void {
  }

  _updateBounds(worldBounds: BoundingBox) {
  }

  update(deltaTime: number): void {
  }
}
