import { BoundingBox } from "@oasis-engine/math";
import { Logger } from "../base";
import { ignoreClone } from "../clone/CloneManager";
import { ICustomClone } from "../clone/ComponentCloner";
import { Entity } from "../Entity";
import { Mesh } from "../graphic/Mesh";
import { Renderer } from "../Renderer";
import { Shader } from "../shader";
import { UpdateFlag } from "../UpdateFlag";
import { RenderElement } from "../rendering/RenderElement";
import { Attributes } from "../shaderlib";

/**
 * MeshRenderer Component.
 */
export class MeshRenderer extends Renderer implements ICustomClone {
  private static _uvMacro = Shader.getMacroByName("HAS_UV");
  private static _normalMacro = Shader.getMacroByName("HAS_NORMAL");
  private static _tangentMacro = Shader.getMacroByName("HAS_TANGENT");
  private static _vertexColorMacro = Shader.getMacroByName("HAS_VERTEXCOLOR");

  @ignoreClone
  private _mesh: Mesh;
  @ignoreClone
  private _meshUpdateFlag: UpdateFlag;

  /**
   * @internal
   */
  constructor(entity: Entity) {
    super(entity);
  }

  /**
   * Mesh assigned to the renderer.
   */
  get mesh() {
    return this._mesh;
  }

  set mesh(mesh: Mesh) {
    const lastMesh = this._mesh;
    if (lastMesh !== mesh) {
      if (lastMesh) {
        lastMesh._addRefCount(-1);
        this._meshUpdateFlag.destroy();
      }
      if (mesh) {
        mesh._addRefCount(1);
        this._meshUpdateFlag = mesh.registerUpdateFlag();
      }
      this._mesh = mesh;
    }
  }

  /**
   * @internal
   */
  _render(opaqueQueue: RenderElement[],
          alphaTestQueue: RenderElement[],
          transparentQueue: RenderElement[]): void {
    const mesh = this._mesh;
    if (mesh) {
      if (this._meshUpdateFlag.flag) {
        const shaderData = this.shaderData;
        const vertexLayouts = mesh._vertexBufferLayouts;

        shaderData.disableMacro(MeshRenderer._uvMacro);
        shaderData.disableMacro(MeshRenderer._normalMacro);
        shaderData.disableMacro(MeshRenderer._tangentMacro);
        shaderData.disableMacro(MeshRenderer._vertexColorMacro);

        for (let i = 0, n = vertexLayouts.length; i < n; i++) {
          for (let j = 0, m = vertexLayouts[i].attributes.length; j < m; j++) {
            const { shaderLocation } = vertexLayouts[i].attributes[j];
            switch (shaderLocation) {
              case Attributes.UV_0:
                shaderData.enableMacro(MeshRenderer._uvMacro);
                break;
              case Attributes.Normal:
                shaderData.enableMacro(MeshRenderer._normalMacro);
                break;
              case Attributes.Tangent:
                shaderData.enableMacro(MeshRenderer._tangentMacro);
                break;
              case Attributes.Color_0:
                shaderData.enableMacro(MeshRenderer._vertexColorMacro);
                break;
            }
          }
        }
        this._meshUpdateFlag.flag = false;
      }

      const subMeshes = mesh.subMeshes;
      const renderElementPool = this._engine._renderElementPool;
      for (let i = 0, n = subMeshes.length; i < n; i++) {
        const material = this._materials[i];
        if (material) {
          const element = renderElementPool.getFromPool();
          element.setValue(this, mesh, subMeshes[i], material);
          this._pushPrimitive(element, opaqueQueue, alphaTestQueue, transparentQueue);
        }
      }
    } else {
      Logger.error("mesh is null.");
    }
  }

  /**
   * @internal
   * @override
   */
  _onDestroy() {
    super._onDestroy();
    const mesh = this._mesh;
    if (mesh && !mesh.destroyed) {
      mesh._addRefCount(-1);
      this._mesh = null;
    }
  }

  /**
   * @internal
   */
  _cloneTo(target: MeshRenderer): void {
    target.mesh = this._mesh;
  }

  /**
   * @override
   */
  protected _updateBounds(worldBounds: BoundingBox): void {
    const mesh = this._mesh;
    if (mesh) {
      const localBounds = mesh.bounds;
      const worldMatrix = this._entity.transform.worldMatrix;
      BoundingBox.transform(localBounds, worldMatrix, worldBounds);
    } else {
      worldBounds.min.setValue(0, 0, 0);
      worldBounds.max.setValue(0, 0, 0);
    }
  }
}
