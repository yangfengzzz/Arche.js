import { AssetType, Logger, SampledTexture2D } from "@arche-engine/core";
import { GLTFResource } from "../GLTFResource";
import { ISampler } from "../Schema";
import { GLTFUtil } from "../GLTFUtil";
import { Parser } from "./Parser";
import { imageBitmapOptions } from "../../Image";

export class TextureParser extends Parser {
  private static _imageBitmapOptions = new imageBitmapOptions();

  private static _wrapMap = {
    33071: <GPUAddressMode>"clamp-to-edge",
    33648: <GPUAddressMode>"mirror-repeat",
    10497: <GPUAddressMode>"repeat"
  };

  parse(context: GLTFResource): void | Promise<void> {
    const { gltf, buffers, engine, url } = context;

    if (gltf.textures) {
      return Promise.all(
        gltf.textures.map(({ sampler, source = 0, name: textureName }, index) => {
          const { uri, bufferView: bufferViewIndex, mimeType, name: imageName } = gltf.images[source];

          if (uri) {
            return engine.resourceManager
              .load<SampledTexture2D>({
                url: GLTFUtil.parseRelativeUrl(url, uri),
                type: AssetType.Texture2D
              })
              .then((texture) => {
                if (!texture.name) {
                  texture.name = textureName || imageName || `texture_${index}`;
                }
                if (sampler !== undefined) {
                  this._parseSampler(texture, gltf.samplers[sampler]);
                }
                return texture;
              });
          } else {
            const bufferView = gltf.bufferViews[bufferViewIndex];
            const bufferViewData = GLTFUtil.getBufferViewData(bufferView, buffers);
            return GLTFUtil.loadImageBuffer(bufferViewData, mimeType).then((image) => {
              const texture = new SampledTexture2D(engine, image.width, image.height);
              /** @ts-ignore */
              if (!texture._platformTexture) return;

              const imageBitmapOptions = TextureParser._imageBitmapOptions;
              const levelCount = Math.max(Math.log2(image.width) + 1, Math.log2(image.height) + 1);
              for (let level = 0; level < levelCount; level++) {
                imageBitmapOptions.resizeWidth = Math.max(1, image.width / Math.pow(2, level));
                imageBitmapOptions.resizeHeight = Math.max(1, image.height / Math.pow(2, level));
                createImageBitmap(image, imageBitmapOptions).then((value) => {
                  texture.setImageSource(value, level);
                });
              }
              texture.name = textureName || imageName || `texture_${index}`;
              if (sampler !== undefined) {
                this._parseSampler(texture, gltf.samplers[sampler]);
              }
              return texture;
            });
          }
        })
      ).then((textures: SampledTexture2D[]) => {
        context.textures = textures;
      });
    }
  }

  private _parseSampler(texture: SampledTexture2D, sampler: ISampler): void {
    const { magFilter, minFilter, wrapS, wrapT } = sampler;

    if (magFilter || minFilter) {
      Logger.warn("texture use filterMode in engine");
    }

    if (wrapS) {
      texture.addressModeU = TextureParser._wrapMap[wrapS];
    }

    if (wrapT) {
      texture.addressModeV = TextureParser._wrapMap[wrapT];
    }
  }
}
