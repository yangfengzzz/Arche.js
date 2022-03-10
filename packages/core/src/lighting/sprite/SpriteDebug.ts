import { Script } from "../../Script";
import { Entity } from "../../Entity";
import { BufferMesh, MeshRenderer } from "../../mesh";
import { SpriteDebugMaterial, WGSLSpriteDebugFragment, WGSLSpriteDebugVertex } from "./SpriteDebugMaterial";
import { Shader } from "../../shader";
import { ShaderStage } from "../../webgpu";

class SpriteDebug extends Script {
  private _spotEntity: Entity;
  private _spotLightMesh: BufferMesh;

  private _pointEntity: Entity;
  private _pointLightMesh: BufferMesh;

  constructor(entity: Entity) {
    super(entity);
    Shader.create(
      "spotlight_sprite_debug",
      new WGSLSpriteDebugVertex(true),
      ShaderStage.VERTEX,
      new WGSLSpriteDebugFragment()
    );
    Shader.create(
      "pointlight_sprite_debug",
      new WGSLSpriteDebugVertex(false),
      ShaderStage.VERTEX,
      new WGSLSpriteDebugFragment()
    );

    this._spotLightMesh = new BufferMesh(entity.engine);
    this._spotLightMesh.addSubMesh(0, 4, "triangle-strip");
    this._spotEntity = entity.createChild();
    const spotRenderer = this._spotEntity.addComponent(MeshRenderer);
    spotRenderer.setMaterial(new SpriteDebugMaterial(entity.engine, true));
    spotRenderer.mesh = this._spotLightMesh;

    this._pointLightMesh = new BufferMesh(entity.engine);
    this._pointLightMesh.addSubMesh(0, 4, "triangle-strip");
    this._pointEntity = entity.createChild();
    const pointRenderer = this._pointEntity.addComponent(MeshRenderer);
    pointRenderer.setMaterial(new SpriteDebugMaterial(entity.engine, false));
    pointRenderer.mesh = this._spotLightMesh;
  }

  onUpdate(deltaTime: number) {
    const lightManager = this.engine._lightManager;

    const spotLightCount = lightManager.spotLights.length;
    if (spotLightCount > 0) {
      this._spotLightMesh.instanceCount = spotLightCount;
      this._spotEntity.isActive = true;
    } else {
      this._spotEntity.isActive = false;
    }

    const pointLightCount = lightManager.pointLights.length;
    if (pointLightCount > 0) {
      this._pointLightMesh.instanceCount = pointLightCount;
      this._pointEntity.isActive = true;
    } else {
      this._pointEntity.isActive = false;
    }
  }
}
