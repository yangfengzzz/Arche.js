import { Engine } from "./Engine";
import { WebCanvas } from "./WebCanvas";

type OffscreenCanvas = any;

/**
 * WebGL platform engine,support includes WebGL1.0 and WebGL2.0.
 */
export class WebGPUEngine extends Engine {
  /**
   * Create an engine suitable for the WebGL platform.
   * @param canvas - Native web canvas
   */
  constructor(canvas: string | HTMLCanvasElement | OffscreenCanvas) {
    const webCanvas = new WebCanvas(
      <HTMLCanvasElement | OffscreenCanvas>(typeof canvas === "string" ? document.getElementById(canvas) : canvas)
    );
    super(webCanvas);
  }

  /**
   * Web canvas.
   */
  get canvas(): WebCanvas {
    return this._canvas as WebCanvas;
  }
}
