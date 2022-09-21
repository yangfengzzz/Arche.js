import { Subpass } from "../Subpass";
import { Engine } from "../../Engine";
import { RenderElement } from "../RenderElement";
import { UnlitMaterial } from "../../material";
import { Renderer } from "../../Renderer";
import { Buffer } from "../../graphic";
import { Mesh } from "../../graphic";
import { Logger } from "../../base";
import { GeometrySubpass } from "./GeometrySubpass";

export class ColorPickerSubpass extends GeometrySubpass {
  static _color: Float32Array = new Float32Array(4);

  /**
   * Convert id to RGB color value, 0 and 0xffffff are illegal values.
   */
  static id2Color(id: number): Float32Array {
    const color = ColorPickerSubpass._color;
    if (id >= 0xffffff) {
      Logger.warn("Framebuffer Picker encounter primitive's id greater than " + 0xffffff);
      color.fill(0);
      return color;
    }

    color[2] = (id & 0xff) / 255;
    color[1] = ((id & 0xff00) >> 8) / 255;
    color[0] = ((id & 0xff0000) >> 16) / 255;
    return color;
  }

  /**
   * Convert RGB color to id.
   * @param color - Color
   */
  static color2Id(color: Uint8Array): number {
    return color[0] | (color[1] << 8) | (color[2] << 16);
  }

  private _material: UnlitMaterial;
  private _bufferPool: Buffer[] = [];
  private _currentId: number = 0;
  private _primitivesMap: Record<number, [Renderer, Mesh]> = [];

  constructor(engine: Engine) {
    super(engine);
    this._material = new UnlitMaterial(engine);
  }

  _drawMeshes(renderPassEncoder: GPURenderPassEncoder) {
    this._currentId = 0;
    this._primitivesMap = [];

    this._opaqueQueue = [];
    this._alphaTestQueue = [];
    this._transparentQueue = [];
    const { _opaqueQueue: opaqueQueue, _alphaTestQueue: alphaTestQueue, _transparentQueue: transparentQueue } = this;

    this.callRender(this._camera, opaqueQueue, alphaTestQueue, transparentQueue);
    opaqueQueue.sort(Subpass._compareFromNearToFar);
    alphaTestQueue.sort(Subpass._compareFromNearToFar);
    transparentQueue.sort(Subpass._compareFromFarToNear);

    const total = this._opaqueQueue.length + this._alphaTestQueue.length + this._transparentQueue.length;
    const bufferPool = this._bufferPool;
    const oldTotal = bufferPool.length;
    bufferPool.length = total;
    for (let i = oldTotal; i < total; i++) {
      bufferPool[i] = new Buffer(this.engine, 16, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    }

    for (const element of opaqueQueue) {
      this._uploadColor(element);
      super._drawElement(renderPassEncoder, element);
    }
    for (const element of alphaTestQueue) {
      this._uploadColor(element);
      super._drawElement(renderPassEncoder, element);
    }
    for (const element of transparentQueue) {
      this._uploadColor(element);
      super._drawElement(renderPassEncoder, element);
    }
  }

  private _uploadColor(element: RenderElement) {
    element.material = this._material;
    this._primitivesMap[this._currentId] = [element.renderer, element.mesh];
    const color = ColorPickerSubpass.id2Color(this._currentId);

    const buffer = this._bufferPool[this._currentId];
    buffer.uploadData(color, 0, 0, 4);
    this._material.shaderData._setDataBuffer("", null);

    this._currentId += 1;
  }

  /**
   * Get renderer element by color.
   */
  getObjectByColor(color: Uint8Array): [Renderer, Mesh] {
    const result = this._primitivesMap[ColorPickerSubpass.color2Id(color)];
    if (result === undefined) {
      return [undefined, undefined];
    } else {
      return result;
    }
  }
}
