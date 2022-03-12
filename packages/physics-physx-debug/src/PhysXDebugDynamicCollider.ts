import { IDynamicCollider } from "@arche-engine/design";
import { PhysXDynamicCollider, PhysXColliderShape } from "@arche-engine/physics-physx";
import { Entity, Quaternion, Vector3 } from "arche-engine";
import { PhysXDebugPhysics } from "./PhysXDebugPhysics";
import { PhysXDebugBoxColliderShape } from "./shape/PhysXDebugBoxColliderShape";
import { PhysXDebugSphereColliderShape } from "./shape/PhysXDebugSphereColliderShape";
import { PhysXDebugCapsuleColliderShape } from "./shape/PhysXDebugCapsuleColliderShape";

/**
 * A dynamic collider can act with self-defined movement or physical force
 */
export class PhysXDebugDynamicCollider extends PhysXDynamicCollider implements IDynamicCollider {
  _entity: Entity;

  /**
   * Initialize PhysX static actor.
   * @param position - The global position
   * @param rotation - The global rotation
   */
  constructor(position: Vector3, rotation: Quaternion) {
    super(position, rotation);
    this._entity = PhysXDebugPhysics._rootEntity.createChild();
  }

  /**
   * {@inheritDoc ICollider.addShape }
   */
  addShape(shape: PhysXColliderShape): void {
    super.addShape(shape);
    if (
      shape instanceof PhysXDebugBoxColliderShape ||
      shape instanceof PhysXDebugSphereColliderShape ||
      shape instanceof PhysXDebugCapsuleColliderShape
    ) {
      shape.setEntity(this._entity);
    }
  }

  /**
   * {@inheritDoc ICollider.removeShape }
   */
  removeShape(shape: PhysXColliderShape): void {
    super.removeShape(shape);
    if (
      shape instanceof PhysXDebugBoxColliderShape ||
      shape instanceof PhysXDebugSphereColliderShape ||
      shape instanceof PhysXDebugCapsuleColliderShape
    ) {
      shape.removeEntity(this._entity);
    }
  }

  /**
   * {@inheritDoc ICollider.setWorldTransform }
   */
  setWorldTransform(position: Vector3, rotation: Quaternion): void {
    super.setWorldTransform(position, rotation);
    this.getWorldTransform(this._entity.transform.position, this._entity.transform.rotationQuaternion);
  }

  /**
   * {@inheritDoc ICollider.getWorldTransform }
   */
  getWorldTransform(outPosition: Vector3, outRotation: Quaternion): void {
    super.getWorldTransform(outPosition, outRotation);
    this._entity.transform.position = outPosition;
    this._entity.transform.rotationQuaternion = outRotation;
  }
}
