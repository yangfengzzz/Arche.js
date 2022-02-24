import {
  AssetPromise,
  LoadItem,
  Loader,
  AssetType,
  resourceLoader,
  ResourceManager,
  SampledTexture2D
} from "@arche-engine/core";
import { imageBitmapOptions } from "./Image";

@resourceLoader(AssetType.Texture2D, ["png", "jpg", "webp", "jpeg"])
class Texture2DLoader extends Loader<SampledTexture2D> {
  private static _imageBitmapOptions = new imageBitmapOptions();

  load(item: LoadItem, resourceManager: ResourceManager): AssetPromise<SampledTexture2D> {
    return new AssetPromise((resolve, reject) => {
      this.request<HTMLImageElement>(item.url, {
        ...item,
        type: "image"
      })
        .then((image) => {
          const texture = new SampledTexture2D(resourceManager.engine, image.width, image.height);
          /** @ts-ignore */
          if (!texture._platformTexture) return;

          const imageBitmapOptions = Texture2DLoader._imageBitmapOptions;
          const levelCount = Math.max(Math.log2(image.width) + 1, Math.log2(image.height) + 1);
          for (let level = 0; level < levelCount; level++) {
            imageBitmapOptions.resizeWidth = Math.max(1, image.width / Math.pow(2, level));
            imageBitmapOptions.resizeHeight = Math.max(1, image.height / Math.pow(2, level));
            createImageBitmap(image, imageBitmapOptions).then((value) => {
              texture.setImageSource(value, level);
            });
          }

          if (item.url.indexOf("data:") !== 0) {
            const splitPath = item.url.split("/");
            texture.name = splitPath[splitPath.length - 1];
          }
          resolve(texture);
        })
        .catch((e) => {
          reject(e);
        });
    });
  }
}
