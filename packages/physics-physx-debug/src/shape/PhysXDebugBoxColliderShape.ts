import { IBoxColliderShape } from "@arche-engine/design";
import { PhysXBoxColliderShape } from "@arche-engine/physics-physx";
import { Entity, MeshRenderer, BlinnPhongMaterial, WireFramePrimitive } from "arche-engine";
import { PhysXDebugPhysics } from "../PhysXDebugPhysics";

class PhysXDebugBoxColliderShape extends PhysXBoxColliderShape implements IBoxColliderShape {
  private _entity: Entity;

  setEntity(value: Entity) {
    this._entity = value.createChild();
    const position = this._entity.transform.position;
    this._getLocalTranslation(position);
    this._entity.transform.position = position;

    const renderer = this._entity.addComponent(MeshRenderer);
    renderer.setMaterial(new BlinnPhongMaterial(PhysXDebugPhysics._engine));
    renderer.mesh = WireFramePrimitive.createCuboidWireFrame(PhysXDebugPhysics._engine, 1, 1, 1);
    this._syncBoxGeometry();
  }

  removeEntity(value: Entity) {
    value.removeChild(this._entity);
    this._entity = null;
  }

  private _syncBoxGeometry() {
    if (this._entity) {
      const scale = this._entity.transform.scale;
      this.getSize(scale);
      this._entity.transform.scale = scale;
    }
  }
}
