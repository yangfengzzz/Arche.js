import { ISphereColliderShape } from "@arche-engine/design";
import { PhysXSphereColliderShape } from "@arche-engine/physics-physx";
import { Entity, MeshRenderer, BlinnPhongMaterial, WireFramePrimitive, Vector3 } from "arche-engine";
import { PhysXDebugPhysics } from "../PhysXDebugPhysics";

/**
 * Sphere collider shape in PhysX.
 */
export class PhysXDebugSphereColliderShape extends PhysXSphereColliderShape implements ISphereColliderShape {
  private _entity: Entity;

  setEntity(value: Entity) {
    this._entity = value.createChild();
    const position = this._entity.transform.position;
    this._getLocalTranslation(position);
    this._entity.transform.position = position;

    const renderer = this._entity.addComponent(MeshRenderer);
    renderer.setMaterial(new BlinnPhongMaterial(PhysXDebugPhysics._engine));
    renderer.mesh = WireFramePrimitive.createSphereWireFrame(PhysXDebugPhysics._engine, 1);
    this._syncSphereGeometry();
  }

  removeEntity(value: Entity) {
    value.removeChild(this._entity);
    this._entity = null;
  }

  /**
   * {@inheritDoc ISphereColliderShape.setRadius }
   */
  setRadius(value: number): void {
    super.setRadius(value);
    this._syncSphereGeometry();
  }

  /**
   * {@inheritDoc IColliderShape.setWorldScale }
   */
  setWorldScale(scale: Vector3): void {
    super.setWorldScale(scale);
    this._syncSphereGeometry();
  }

  private _syncSphereGeometry() {
    if (this._entity) {
      const radius = this.getRadius();
      this._entity.transform.setScale(radius, radius, radius);
    }
  }
}
