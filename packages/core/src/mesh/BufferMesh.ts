import { Mesh } from "../graphic/Mesh";
import { IndexBufferBinding } from "../graphic/IndexBufferBinding";
import { Buffer } from "../graphic/Buffer";
import { VertexBufferLayout } from "../webgpu";

/**
 * BufferMesh.
 */
export class BufferMesh extends Mesh {
  /**
   * Instanced count, disable instanced drawing when set zero.
   */
  get instanceCount(): number {
    return this._instanceCount;
  }

  set instanceCount(value: number) {
    this._instanceCount = value;
  }

  /**
   * Vertex buffer binding collection.
   */
  get vertexBufferBindings(): Readonly<Buffer[]> {
    return this._vertexBufferBindings;
  }

  /**
   * Index buffer binding.
   */
  get indexBufferBinding(): IndexBufferBinding {
    return this._indexBufferBinding;
  }

  /**
   * Vertex layout collection.
   */
  get vertexBufferLayouts(): Readonly<VertexBufferLayout[]> {
    return this._vertexBufferLayouts;
  }

  /**
   * Set vertex layouts.
   * @param layouts - Vertex layouts collection
   */
  setVertexLayouts(layouts: VertexBufferLayout[]): void {
    this._setVertexLayouts(layouts);
  }

  /**
   * Set vertex buffer binding.
   * @param buffer - Vertex buffer binding
   * @param index - Vertex buffer index, the default value is 0
   */
  setVertexBufferBinding(buffer: Buffer, index: number = 0) {
    const bindings = this._vertexBufferBindings;
    bindings.length <= index && (bindings.length = index + 1);
    this._setVertexBufferBinding(index, buffer);
  }

  /**
   * Set vertex buffer binding.
   * @param vertexBufferBindings - Vertex buffer binding
   * @param firstIndex - First vertex buffer index, the default value is 0
   */
  setVertexBufferBindings(vertexBufferBindings: Buffer[], firstIndex: number = 0): void {
    const bindings = this._vertexBufferBindings;
    const count = vertexBufferBindings.length;
    const needLength = firstIndex + count;
    bindings.length < needLength && (bindings.length = needLength);
    for (let i = 0; i < count; i++) {
      this._setVertexBufferBinding(firstIndex + i, vertexBufferBindings[i]);
    }
  }

  /**
   * Set index buffer binding.
   * @param buffer - Index buffer
   * @param format - Index buffer format
   */
  setIndexBufferBinding(buffer: Buffer, format: GPUIndexFormat): void;

  /**
   * Set index buffer binding.
   * @param bufferBinding - Index buffer binding
   * @remarks When bufferBinding is null, it will clear IndexBufferBinding
   */
  setIndexBufferBinding(bufferBinding: IndexBufferBinding | null): void;

  setIndexBufferBinding(bufferOrBinding: Buffer | IndexBufferBinding | null, format?: GPUIndexFormat): void {
    let binding = <IndexBufferBinding>bufferOrBinding;
    if (binding) {
      const isBinding = binding.buffer !== undefined;
      isBinding || (binding = new IndexBufferBinding(<Buffer>bufferOrBinding, format));
    }
    this._setIndexBufferBinding(binding);
  }
}
