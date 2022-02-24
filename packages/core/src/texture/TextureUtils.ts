import { Extent3DDict, ImageCopyTexture, Origin3DDict } from "../webgpu";

export class TextureUtils {
  static destination = new ImageCopyTexture();
  static source = new ImageCopyTexture();
  static copySize = new Extent3DDict();

  // n -> 1
  static buildTextureArray(
    textures: GPUTexture[],
    width: number,
    height: number,
    textureArray: GPUTexture,
    commandEncoder: GPUCommandEncoder
  ): void {
    this.destination.origin = new Origin3DDict();
    this.destination.origin.x = 0;
    this.destination.origin.y = 0;

    this.destination.texture = textureArray;
    this.copySize.width = width;
    this.copySize.height = height;
    this.copySize.depthOrArrayLayers = 1;

    for (let i = 0, n = textures.length; i < n; i++) {
      this.destination.origin.z = i;
      this.source.texture = textures[i];
      commandEncoder.copyTextureToTexture(this.source, this.destination, this.copySize);
    }
  }

  // 6n -> 1
  static buildCubeTextureArray(
    textures: GPUTexture[],
    width: number,
    height: number,
    textureArray: GPUTexture,
    commandEncoder: GPUCommandEncoder
  ): void {
    this.destination.origin = new Origin3DDict();
    this.destination.origin.x = 0;
    this.destination.origin.y = 0;

    this.destination.texture = textureArray;
    this.copySize.width = width;
    this.copySize.height = height;
    this.copySize.depthOrArrayLayers = 6;

    for (let i = 0, n = textures.length; i < n; i++) {
      this.destination.origin.z = 6 * i;
      this.source.texture = textures[i];
      commandEncoder.copyTextureToTexture(this.source, this.destination, this.copySize);
    }
  }
}
