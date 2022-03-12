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
import { PhysXPhysics } from "@arche-engine/physics-physx";

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
}
