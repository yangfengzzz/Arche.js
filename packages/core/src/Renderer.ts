import { BoundingBox, Matrix, Vector3 } from "@arche-engine/math";
import { deepClone, ignoreClone, shallowClone } from "./clone/CloneManager";
import { Component } from "./Component";
import { Entity } from "./Entity";
import { Material, RenderQueueType } from "./material";
import { Shader } from "./shader";
import { ShaderDataGroup } from "./shader/ShaderDataGroup";
import { ShaderData } from "./shader";
import { ShaderMacroCollection } from "./shader/ShaderMacroCollection";
import { UpdateFlag } from "./UpdateFlag";
import { RenderElement } from "./rendering/RenderElement";

/**
 * Renderable component.
 */
export abstract class Renderer extends Component {
  private static _rendererProperty = Shader.getPropertyByName("u_rendererData");

  /** ShaderData related to renderer. */
  @deepClone
  readonly shaderData: ShaderData;
  /** Whether it is clipped by the frustum, needs to be turned on camera.enableFrustumCulling. */
  @ignoreClone
  isCulled: boolean = false;

  /** @internal */
  @ignoreClone
  _distanceForSort: number;
  /** @internal */
  @ignoreClone
  _onUpdateIndex: number = -1;
  /** @internal */
  @ignoreClone
  _rendererIndex: number = -1;
  /** @internal */
  @ignoreClone
  _globalShaderMacro: ShaderMacroCollection = new ShaderMacroCollection();

  /** @internal temp solution. */
  @ignoreClone
  _renderSortId: number = 0;

  @ignoreClone
  protected _overrideUpdate: boolean = false;
  @shallowClone
  protected _materials: Material[] = [];

  @ignoreClone
  private _transformChangeFlag: UpdateFlag;
  @deepClone
  private _bounds: BoundingBox = new BoundingBox(new Vector3(), new Vector3());
  @ignoreClone
  private _mvMatrix: Matrix = new Matrix();
  @ignoreClone
  private _mvpMatrix: Matrix = new Matrix();
  @ignoreClone
  private _mvInvMatrix: Matrix = new Matrix();
  @ignoreClone
  private _normalMatrix: Matrix = new Matrix();
  @ignoreClone
  private _materialsInstanced: boolean[] = [];
  // localMat, modelMat, MVMat, MVPMat, MVInvMat, normalMat
  @ignoreClone
  private _rendererData: Float32Array = new Float32Array(96);

  /**
   * Material count.
   */
  get materialCount(): number {
    return this._materials.length;
  }

  set materialCount(value: number) {
    const materials = this._materials;
    const materialsInstanced = this._materialsInstanced;

    materials.length !== value && (materials.length = value);
    materialsInstanced.length > value && (materialsInstanced.length = value);
  }

  /**
   * The bounding volume of the renderer.
   */
  get bounds(): BoundingBox {
    const changeFlag = this._transformChangeFlag;
    if (changeFlag.flag) {
      this._updateBounds(this._bounds);
      changeFlag.flag = false;
    }
    return this._bounds;
  }

  /**
   * @internal
   */
  constructor(entity: Entity) {
    super(entity);
    this.shaderData = new ShaderData(ShaderDataGroup.Renderer, this._engine);

    const prototype = Renderer.prototype;
    this._overrideUpdate = this.update !== prototype.update;
    this._transformChangeFlag = this.entity.transform.registerWorldChangeFlag();
    this.shaderData._addRefCount(1);
  }

  /**
   * Get the first instance material.
   * @returns The first instance material
   */
  getInstanceMaterial(): Material | null;

  /**
   * Get the first instance material by index.
   * @remarks Calling this function for the first time after the material is set will create an instance material to ensure that it is unique to the renderer.
   * @param index - Material index
   * @returns Instance material
   */
  getInstanceMaterial(index: number): Material | null;

  getInstanceMaterial(index: number = 0): Material | null {
    const materials = this._materials;
    if (materials.length > index) {
      const material = materials[index];
      if (material) {
        if (this._materialsInstanced[index]) {
          return material;
        } else {
          return this._createInstanceMaterial(material, index);
        }
      }
    }
    return null;
  }

  /**
   * Get the first material.
   * @returns The first material
   */
  getMaterial(): Material | null;

  /**
   * Get the first material by index.
   * @param index - Material index
   * @returns Material
   */
  getMaterial(index: number): Material | null;

  getMaterial(index: number = 0): Material | null {
    return this._materials[index] || null;
  }

  /**
   * Set the first material.
   * @param material - The first material
   */
  setMaterial(material: Material): void;

  /**
   * Set material by index.
   * @param index - Material index
   * @param material - The material
   */
  setMaterial(index: number, material: Material): void;

  setMaterial(indexOrMaterial: number | Material, material: Material = null): void {
    let index;
    if (typeof indexOrMaterial === "number") {
      index = indexOrMaterial;
    } else {
      index = 0;
      material = indexOrMaterial;
    }

    const materials = this._materials;
    if (index >= materials.length) {
      materials.length = index + 1;
    }

    const materialsInstance = this._materialsInstanced;
    const internalMaterial = materials[index];
    if (internalMaterial !== material) {
      materials[index] = material;
      index < materialsInstance.length && (materialsInstance[index] = false);
      internalMaterial && internalMaterial._addRefCount(-1);
      material && material._addRefCount(1);
    }
  }

  /**
   * Get all instance materials.
   * @remarks Calling this function for the first time after the material is set will create an instance material to ensure that it is unique to the renderer.
   * @returns All instance materials
   */
  getInstanceMaterials(): Readonly<Material[]> {
    const materials = this._materials;
    const materialsInstance = this._materialsInstanced;
    for (let i = 0, n = materials.length; i < n; i++) {
      if (!materialsInstance[i]) {
        this._createInstanceMaterial(this._materials[i], i);
      }
    }
    return materials;
  }

  /**
   * Get all materials.
   * @returns All materials
   */
  getMaterials(): Readonly<Material[]> {
    return this._materials;
  }

  /**
   * Set all materials.
   * @param materials - All materials
   */
  setMaterials(materials: Material[]): void {
    const count = materials.length;
    const internalMaterials = this._materials;
    const materialsInstanced = this._materialsInstanced;

    for (let i = count, n = internalMaterials.length; i < n; i++) {
      const internalMaterial = internalMaterials[i];
      internalMaterial && internalMaterial._addRefCount(-1);
    }

    internalMaterials.length !== count && (internalMaterials.length = count);
    materialsInstanced.length !== 0 && (materialsInstanced.length = 0);

    for (let i = 0; i < count; i++) {
      const internalMaterial = internalMaterials[i];
      const material = materials[i];
      if (internalMaterial !== material) {
        internalMaterials[i] = material;
        internalMaterial && internalMaterial._addRefCount(-1);
        material && material._addRefCount(1);
      }
    }
  }

  update(deltaTime: number): void {
  }

  /**
   * @internal
   */
  _updateShaderData(viewMatrix: Matrix, projectionMatrix: Matrix): void {
    const shaderData = this.shaderData;
    const worldMatrix = this.entity.transform.worldMatrix;
    const mvMatrix = this._mvMatrix;
    const mvpMatrix = this._mvpMatrix;
    const mvInvMatrix = this._mvInvMatrix;
    const normalMatrix = this._normalMatrix;

    Matrix.multiply(viewMatrix, worldMatrix, mvMatrix);
    Matrix.multiply(projectionMatrix, mvMatrix, mvpMatrix);
    Matrix.invert(mvMatrix, mvInvMatrix);
    Matrix.invert(worldMatrix, normalMatrix);
    normalMatrix.transpose();

    const rendererData = this._rendererData;
    rendererData.set(this.entity.transform.localMatrix.elements, 0);
    rendererData.set(worldMatrix.elements, 16);
    rendererData.set(mvMatrix.elements, 32);
    rendererData.set(mvpMatrix.elements, 48);
    rendererData.set(mvInvMatrix.elements, 64);
    rendererData.set(normalMatrix.elements, 80);
    this.shaderData.setFloatArray(Renderer._rendererProperty, rendererData);
  }

  _onEnable(): void {
    const componentsManager = this.engine._componentsManager;
    if (this._overrideUpdate) {
      componentsManager.addOnUpdateRenderers(this);
    }
    componentsManager.addRenderer(this);
  }

  _onDisable(): void {
    const componentsManager = this.engine._componentsManager;
    if (this._overrideUpdate) {
      componentsManager.removeOnUpdateRenderers(this);
    }
    componentsManager.removeRenderer(this);
  }

  /**
   * @internal
   */
  abstract _render(opaqueQueue: RenderElement[],
                   alphaTestQueue: RenderElement[],
                   transparentQueue: RenderElement[]): void;

  /**
   * @internal
   * Push a render element to the render queue.
   * @param element - Render element
   * @param opaqueQueue
   * @param alphaTestQueue
   * @param transparentQueue
   */
  _pushPrimitive(element: RenderElement,
                 opaqueQueue: RenderElement[],
                 alphaTestQueue: RenderElement[],
                 transparentQueue: RenderElement[]) {
    const renderQueueType = element.material.renderQueueType;

    if (renderQueueType > (RenderQueueType.Transparent + RenderQueueType.AlphaTest) >> 1) {
      transparentQueue.push(element);
    } else if (renderQueueType > (RenderQueueType.AlphaTest + RenderQueueType.Opaque) >> 1) {
      alphaTestQueue.push(element);
    } else {
      opaqueQueue.push(element);
    }
  }

  /**
   * @internal
   */
  _onDestroy(): void {
    const flag = this._transformChangeFlag;
    if (flag) {
      flag.destroy();
      this._transformChangeFlag = null;
    }

    this.shaderData._addRefCount(-1);

    for (let i = 0, n = this._materials.length; i < n; i++) {
      this._materials[i]._addRefCount(-1);
    }
  }

  protected _updateBounds(worldBounds: BoundingBox): void {
  }

  private _createInstanceMaterial(material: Material, index: number): Material {
    const insMaterial: Material = material.clone();
    insMaterial.name = insMaterial.name + "(Instance)";
    material._addRefCount(-1);
    insMaterial._addRefCount(1);
    this._materialsInstanced[index] = true;
    this._materials[index] = insMaterial;
    return insMaterial;
  }
}
