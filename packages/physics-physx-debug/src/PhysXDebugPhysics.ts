import {
  IBoxColliderShape,
  ICapsuleColliderShape,
  IDynamicCollider,
  IPhysics,
  ISphereColliderShape,
  IStaticCollider
} from "@arche-engine/design";
import { StaticInterfaceImplement } from "./StaticInterfaceImplement";
import { Entity, Quaternion, Vector3, WebGPUEngine } from "arche-engine";
import { PhysXPhysics, PhysXPhysicsMaterial } from "@arche-engine/physics-physx";
import { PhysXDebugBoxColliderShape } from "./shape/PhysXDebugBoxColliderShape";
import { PhysXDebugSphereColliderShape } from "./shape/PhysXDebugSphereColliderShape";
import { PhysXDebugCapsuleColliderShape } from "./shape/PhysXDebugCapsuleColliderShape";
import { PhysXDebugStaticCollider } from "./PhysXDebugStaticCollider";
import { PhysXDebugDynamicCollider } from "./PhysXDebugDynamicCollider";

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
   * {@inheritDoc IPhysics.createStaticCollider }
   */
  static createStaticCollider(position: Vector3, rotation: Quaternion): IStaticCollider {
    return new PhysXDebugStaticCollider(position, rotation);
  }

  /**
   * {@inheritDoc IPhysics.createDynamicCollider }
   */
  static createDynamicCollider(position: Vector3, rotation: Quaternion): IDynamicCollider {
    return new PhysXDebugDynamicCollider(position, rotation);
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
