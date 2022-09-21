import { ForwardSubpass } from "./ForwardSubpass";
import { RenderElement } from "../RenderElement";
import { Subpass } from "../Subpass";
import { Camera } from "../../Camera";
import { ShaderMacroCollection } from "../../shader";
import { Vector3 } from "@arche-engine/math";

export class GeometrySubpass extends ForwardSubpass {
  private static _tempVector0 = new Vector3();
  private static _tempVector1 = new Vector3();

  protected _opaqueQueue: RenderElement[] = [];
  protected _alphaTestQueue: RenderElement[] = [];
  protected _transparentQueue: RenderElement[] = [];

  _drawMeshes(renderPassEncoder: GPURenderPassEncoder) {
    this._opaqueQueue = [];
    this._alphaTestQueue = [];
    this._transparentQueue = [];
    const { _opaqueQueue: opaqueQueue, _alphaTestQueue: alphaTestQueue, _transparentQueue: transparentQueue } = this;

    this.callRender(this._camera, opaqueQueue, alphaTestQueue, transparentQueue);
    opaqueQueue.sort(Subpass._compareFromNearToFar);
    alphaTestQueue.sort(Subpass._compareFromNearToFar);
    transparentQueue.sort(Subpass._compareFromFarToNear);

    for (const element of opaqueQueue) {
      super._drawElement(renderPassEncoder, element);
    }
    for (const element of alphaTestQueue) {
      super._drawElement(renderPassEncoder, element);
    }
    for (const element of transparentQueue) {
      super._drawElement(renderPassEncoder, element);
    }
  }

  callRender(
    camera: Camera,
    opaqueQueue: RenderElement[],
    alphaTestQueue: RenderElement[],
    transparentQueue: RenderElement[]
  ): void {
    const renderers = this.engine._componentsManager._renderers;
    for (let i = renderers.length - 1; i >= 0; --i) {
      const element = renderers._elements[i];

      // filter by camera culling mask.
      if (!(camera.cullingMask & element._entity.layer)) {
        continue;
      }

      // filter by camera frustum.
      if (camera.enableFrustumCulling) {
        element.isCulled = !camera._frustum.intersectsBox(element.bounds);
        if (element.isCulled) {
          continue;
        }
      }

      const transform = camera.entity.transform;
      const position = transform.worldPosition;
      const center = element.bounds.getCenter(GeometrySubpass._tempVector0);
      if (camera.isOrthographic) {
        const forward = transform.getWorldForward(GeometrySubpass._tempVector1);
        Vector3.subtract(center, position, center);
        element._distanceForSort = Vector3.dot(center, forward);
      } else {
        element._distanceForSort = Vector3.distanceSquared(center, position);
      }

      element._updateShaderData(camera.viewMatrix, camera.projectionMatrix);

      element._render(opaqueQueue, alphaTestQueue, transparentQueue);

      // union camera global macro and renderer macro.
      ShaderMacroCollection.unionCollection(
        camera._globalShaderMacro,
        element.shaderData._macroCollection,
        element._globalShaderMacro
      );
    }
  }
}
