export class TextureDescriptor implements GPUTextureDescriptor {
  label?: string;
  size: Extent3DDict;
  mipLevelCount?: GPUIntegerCoordinate;
  sampleCount?: GPUSize32;
  dimension?: GPUTextureDimension;
  format: GPUTextureFormat;
  usage: GPUTextureUsageFlags;
}

export class Extent3DDict implements GPUExtent3DDict {
  width: GPUIntegerCoordinate;
  height?: GPUIntegerCoordinate;
  depthOrArrayLayers?: GPUIntegerCoordinate;
}

export class Extent3DDictStrict implements GPUExtent3DDictStrict {
  width: GPUIntegerCoordinate;
  height?: GPUIntegerCoordinate;
  depthOrArrayLayers?: GPUIntegerCoordinate;
  depth?: undefined;
}

export class TextureViewDescriptor implements GPUTextureViewDescriptor {
  label?: string;
  format?: GPUTextureFormat;
  dimension?: GPUTextureViewDimension;
  aspect?: GPUTextureAspect;
  baseMipLevel?: GPUIntegerCoordinate;
  mipLevelCount?: GPUIntegerCoordinate;
  baseArrayLayer?: GPUIntegerCoordinate;
  arrayLayerCount?: GPUIntegerCoordinate;
}

export class ExternalTextureDescriptor implements GPUExternalTextureDescriptor {
  colorSpace?: GPUPredefinedColorSpace;
  label?: string;
  source: HTMLVideoElement;
}

export class ImageCopyBuffer implements GPUImageCopyBuffer {
  buffer: GPUBuffer;
  bytesPerRow?: GPUSize32;
  offset?: GPUSize64;
  rowsPerImage?: GPUSize32;
}

export class ImageCopyTexture implements GPUImageCopyTexture {
  texture: GPUTexture;
  aspect?: GPUTextureAspect;
  mipLevel?: GPUIntegerCoordinate;
  origin?: GPUOrigin3D;
}

export class ImageCopyTextureTagged implements GPUImageCopyTextureTagged {
  texture: GPUTexture;
  aspect?: GPUTextureAspect;
  colorSpace?: GPUPredefinedColorSpace;
  mipLevel?: GPUIntegerCoordinate;
  origin?: GPUOrigin3D;
  premultipliedAlpha?: boolean;
}

export class ImageCopyExternalImage implements GPUImageCopyExternalImage {
  source: ImageBitmap | HTMLCanvasElement | OffscreenCanvas;
  origin?: GPUOrigin2D;
}

export function bytesPerPixel(format: GPUTextureFormat): number {
  switch (format) {
    case "r8unorm":
    case "r8snorm":
    case "r8uint":
    case "r8sint":
      return 1;

    case "r16uint":
    case "r16sint":
    case "r16float":
    case "rg8unorm":
    case "rg8snorm":
      return 2;

    case "r32float":
    case "r32uint":
    case "r32sint":
    case "rg16uint":
    case "rg16sint":
    case "rg16float":
    case "rgba8unorm":
    case "rgba8unorm-srgb":
    case "rgba8snorm":
    case "rgba8uint":
    case "rgba8sint":
    case "bgra8unorm":
    case "bgra8unorm-srgb":
      return 4;

    case "rg32float":
    case "rg32uint":
    case "rg32sint":
    case "rgba16uint":
    case "rgba16sint":
    case "rgba16float":
      return 8;

    case "rgba32float":
    case "rgba32uint":
    case "rgba32sint":
      return 16;

    default:
      throw "undefined";
  }
}
