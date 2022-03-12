import {
  IBoxColliderShape,
  ICapsuleColliderShape,
  IDynamicCollider,
  IPhysics,
  IPhysicsManager,
  IPhysicsMaterial,
  IPlaneColliderShape,
  ISphereColliderShape,
  IStaticCollider
} from "@arche-engine/design";
import { StaticInterfaceImplement } from "./StaticInterfaceImplement";
import { Entity, Quaternion, Vector3, WebGPUEngine } from "arche-engine";
import { PhysXPhysics, PhysXPlaneColliderShape, PhysXPhysicsMaterial } from "@arche-engine/physics-physx";
import { PhysXDebugBoxColliderShape } from "./shape/PhysXDebugBoxColliderShape";
import { PhysXDebugSphereColliderShape } from "./shape/PhysXDebugSphereColliderShape";
import { PhysXDebugCapsuleColliderShape } from "./shape/PhysXDebugCapsuleColliderShape";

/**
 * PhysX object creation.
 */
@StaticInterfaceImplement<IPhysics>()
export class PhysXDebugPhysics extends PhysXPhysics {
  static _rootEntity: Entity;
  static _engine: WebGPUEngine;

  static setEngine(engine: WebGPUEngine) {
    this._engine = engine;
    const scene = this._engine.sceneManager.activeScene;
    this._rootEntity = scene.createRootEntity();
  }

  /**
   * {@inheritDoc IPhysics.createBoxColliderShape }
   */
  static createBoxColliderShape(uniqueID: number, size: Vector3, material: PhysXPhysicsMaterial): IBoxColliderShape {
    return new PhysXDebugBoxColliderShape(uniqueID, size, material);
  }

  /**
   * {@inheritDoc IPhysics.createSphereColliderShape }
   */
  static createSphereColliderShape(
    uniqueID: number,
    radius: number,
    material: PhysXPhysicsMaterial
  ): ISphereColliderShape {
    return new PhysXDebugSphereColliderShape(uniqueID, radius, material);
  }

  /**
   * {@inheritDoc IPhysics.createPlaneColliderShape }
   */
  static createPlaneColliderShape(uniqueID: number, material: PhysXPhysicsMaterial): IPlaneColliderShape {
    return new PhysXPlaneColliderShape(uniqueID, material);
  }

  /**
   * {@inheritDoc IPhysics.createCapsuleColliderShape }
   */
  static createCapsuleColliderShape(
    uniqueID: number,
    radius: number,
    height: number,
    material: PhysXPhysicsMaterial
  ): ICapsuleColliderShape {
    return new PhysXDebugCapsuleColliderShape(uniqueID, radius, height, material);
  }
}
