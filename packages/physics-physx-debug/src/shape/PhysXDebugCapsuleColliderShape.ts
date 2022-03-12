import { ICapsuleColliderShape } from "@arche-engine/design";
import { PhysXCapsuleColliderShape } from "@arche-engine/physics-physx";
import {
  Entity,
  MeshRenderer,
  BlinnPhongMaterial,
  WireFramePrimitive,
  Vector3,
  ColliderShapeUpAxis
} from "arche-engine";
import { PhysXDebugPhysics } from "../PhysXDebugPhysics";

/**
 * Box collider shape in PhysX.
 */
export class PhysXDebugCapsuleColliderShape extends PhysXCapsuleColliderShape implements ICapsuleColliderShape {
  static readonly halfSqrt: number = 0.70710678118655;

  private _entity: Entity;
  private _renderer: MeshRenderer;

  setEntity(value: Entity) {
    this._entity = value.createChild();
    const position = this._entity.transform.position;
    this._getLocalTranslation(position);
    this._entity.transform.position = position;

    this._renderer = this._entity.addComponent(MeshRenderer);
    this._renderer.setMaterial(new BlinnPhongMaterial(PhysXDebugPhysics._engine));
    this._syncCapsuleAxis(this.getUpAxis());
    this._syncCapsuleGeometry();
  }

  removeEntity(value: Entity) {
    value.removeChild(this._entity);
    this._entity = null;
  }

  /**
   * {@inheritDoc ICapsuleColliderShape.setRadius }
   */
  setRadius(value: number): void {
    super.setRadius(value);
    this._syncCapsuleGeometry();
  }

  /**
   * {@inheritDoc ICapsuleColliderShape.setHeight }
   */
  setHeight(value: number): void {
    super.setHeight(value);
    this._syncCapsuleGeometry();
  }

  /**
   * {@inheritDoc ICapsuleColliderShape.setUpAxis }
   */
  setUpAxis(upAxis: ColliderShapeUpAxis): void {
    super.setUpAxis(upAxis);
    this._syncCapsuleAxis(upAxis);
  }

  /**
   * {@inheritDoc IColliderShape.setWorldScale }
   */
  setWorldScale(scale: Vector3): void {
    super.setWorldScale(scale);
    this._syncCapsuleGeometry();
  }

  private _syncCapsuleGeometry() {
    if (this._entity) {
      const radius = this.getRadius();
      const height = this.getHeight();
      this._renderer.mesh = WireFramePrimitive.createCapsuleWireFrame(PhysXDebugPhysics._engine, radius, height);
    }
  }

  private _syncCapsuleAxis(upAxis: ColliderShapeUpAxis) {
    if (this._entity) {
      switch (upAxis) {
        case ColliderShapeUpAxis.X:
          this._entity.transform.setRotationQuaternion(
            0,
            PhysXDebugCapsuleColliderShape.halfSqrt,
            0,
            PhysXDebugCapsuleColliderShape.halfSqrt
          );
          break;
        case ColliderShapeUpAxis.Y:
          this._entity.transform.setRotationQuaternion(0, 0, 0, 1);
          break;
        case ColliderShapeUpAxis.Z:
          this._entity.transform.setRotationQuaternion(
            0,
            0,
            PhysXDebugCapsuleColliderShape.halfSqrt,
            PhysXDebugCapsuleColliderShape.halfSqrt
          );
          break;
      }
    }
  }
}
