export class CanvasConfiguration implements GPUCanvasConfiguration {
  colorSpace?: GPUPredefinedColorSpace;
  compositingAlphaMode?: GPUCanvasCompositingAlphaMode;
  size?: GPUExtent3D;
  usage?: GPUTextureUsageFlags;
  device: GPUDevice;
  format: GPUTextureFormat;
}
