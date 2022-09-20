import { BoundingBox } from "@arche-engine/math";
import { RefObject } from "../asset";
import { Engine } from "../Engine";
import { IndexBufferBinding } from "./IndexBufferBinding";
import { SubMesh } from "./SubMesh";
import { UpdateFlagManager } from "../UpdateFlagManager";
import { Buffer } from "./Buffer";
import { VertexBufferLayout } from "../webgpu";
import { BoolUpdateFlag } from "../BoolUpdateFlag";

/**
 * Mesh.
 */
export abstract class Mesh extends RefObject {
  /** Name. */
  name: string;
  /** The bounding volume of the mesh. */
  readonly bounds: BoundingBox = new BoundingBox();

  /** @internal */
  _instanceCount: number = 1;
  /** @internal */
  _vertexBufferBindings: Buffer[] = [];
  /** @internal */
  _indexBufferBinding: IndexBufferBinding = null;
  /** @internal */
  _vertexBufferLayouts: VertexBufferLayout[] = [];

  private _subMeshes: SubMesh[] = [];
  private _updateFlagManager: UpdateFlagManager = new UpdateFlagManager();

  /**
   * Instanced count, disable instanced drawing when set zero.
   */
  get instanceCount(): number {
    return this._instanceCount;
  }

  /**
   * First sub-mesh. Rendered using the first material.
   */
  get subMesh(): SubMesh | null {
    return this._subMeshes[0] || null;
  }

  /**
   * A collection of sub-mesh, each sub-mesh can be rendered with an independent material.
   */
  get subMeshes(): Readonly<SubMesh[]> {
    return this._subMeshes;
  }

  /**
   * Create mesh.
   * @param engine - Engine
   * @param name - Mesh name
   */
  protected constructor(engine: Engine, name?: string) {
    super(engine);
    this.name = name;
  }

  /**
   * Add sub-mesh, each sub-mesh can correspond to an independent material.
   * @param subMesh - Start drawing offset, if the index buffer is set,
   * it means the offset in the index buffer, if not set, it means the offset in the vertex buffer
   * @returns Sub-mesh
   */
  addSubMesh(subMesh: SubMesh): SubMesh;

  /**
   * Add sub-mesh, each sub-mesh can correspond to an independent material.
   * @param start - Start drawing offset, if the index buffer is set,
   * it means the offset in the index buffer, if not set,
   * it means the offset in the vertex buffer
   * @param count - Drawing count, if the index buffer is set,
   * it means the count in the index buffer, if not set,
   * it means the count in the vertex buffer
   * @param topology - Drawing topology, default is MeshTopology.Triangles
   * @returns Sub-mesh
   */
  addSubMesh(start: number, count: number, topology?: GPUPrimitiveTopology): SubMesh;

  addSubMesh(
    startOrSubMesh: number | SubMesh,
    count?: number,
    topology: GPUPrimitiveTopology = "triangle-list"
  ): SubMesh {
    if (typeof startOrSubMesh === "number") {
      startOrSubMesh = new SubMesh(startOrSubMesh, count, topology);
    }
    this._subMeshes.push(startOrSubMesh);
    return startOrSubMesh;
  }

  /**
   * Remove sub-mesh.
   * @param subMesh - Sub-mesh needs to be removed
   */
  removeSubMesh(subMesh: SubMesh): void {
    const subMeshes = this._subMeshes;
    const index = subMeshes.indexOf(subMesh);
    if (index !== -1) {
      subMeshes.splice(index, 1);
    }
  }

  /**
   * Clear all sub-mesh.
   */
  clearSubMesh(): void {
    this._subMeshes.length = 0;
  }

  /**
   * Register update flag, update flag will be true if the vertex layout changes.
   * @returns Update flag
   */
  registerUpdateFlag(): BoolUpdateFlag {
    return this._updateFlagManager.createFlag(BoolUpdateFlag);
  }

  /**
   * @override
   */
  _addRefCount(value: number): void {
    super._addRefCount(value);
    const vertexBufferBindings = this._vertexBufferBindings;
    for (let i = 0, n = vertexBufferBindings.length; i < n; i++) {
      vertexBufferBindings[i]._addRefCount(value);
    }
  }

  /**
   * @override
   * Destroy.
   */
  _onDestroy(): void {
    this._vertexBufferBindings = null;
    this._indexBufferBinding = null;
    this._vertexBufferLayouts = null;
  }

  protected _setVertexLayouts(layouts: VertexBufferLayout[]): void {
    this._clearVertexLayouts();
    for (let i = 0, n = layouts.length; i < n; i++) {
      this._addVertexLayout(layouts[i]);
    }
  }

  protected _setVertexBufferBinding(index: number, binding: Buffer): void {
    if (this._getRefCount() > 0) {
      const lastBinding = this._vertexBufferBindings[index];
      lastBinding && lastBinding._addRefCount(-1);
      binding._addRefCount(1);
    }
    this._vertexBufferBindings[index] = binding;
  }

  protected _setIndexBufferBinding(binding: IndexBufferBinding | null): void {
    if (binding) {
      this._indexBufferBinding = binding;
    } else {
      this._indexBufferBinding = null;
    }
  }

  private _clearVertexLayouts(): void {
    this._vertexBufferLayouts.length = 0;
  }

  private _addVertexLayout(layout: VertexBufferLayout): void {
    this._vertexBufferLayouts.push(layout);
    this._updateFlagManager.dispatch();
  }
}
