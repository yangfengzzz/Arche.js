import { Buffer } from "./Buffer";

/**
 * Index buffer binding.
 */
export class IndexBufferBinding {
  /** @internal */
  _buffer: Buffer;
  /** @internal */
  _format: GPUIndexFormat;

  /**
   * Index buffer.
   */
  get buffer(): Buffer {
    return this._buffer;
  }

  /**
   * Index buffer format.
   */
  get format(): GPUIndexFormat {
    return this._format;
  }

  /**
   * Create index buffer binding.
   * @param buffer - Index buffer
   * @param format - Index buffer format
   */
  constructor(buffer: Buffer, format: GPUIndexFormat) {
    this._buffer = buffer;
    this._format = format;
  }
}
