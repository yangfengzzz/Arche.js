export class CanvasConfiguration implements GPUCanvasConfiguration {
  colorSpace?: PredefinedColorSpace;
  usage?: GPUTextureUsageFlags;
  device: GPUDevice;
  format: GPUTextureFormat;
  viewFormats?: Iterable<GPUTextureFormat>;
  alphaMode?: GPUCanvasAlphaMode;
}
