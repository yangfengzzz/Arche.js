import {
  AssetPromise,
  LoadItem,
  Loader,
  AssetType,
  resourceLoader,
  ResourceManager,
  SampledTextureCube
} from "@arche-engine/core";
import { imageBitmapOptions } from "./Image";

@resourceLoader(AssetType.TextureCube, [""])
class TextureCubeLoader extends Loader<SampledTextureCube> {
  private static _imageBitmapOptions = new imageBitmapOptions();

  load(item: LoadItem, resourceManager: ResourceManager): AssetPromise<SampledTextureCube> {
    return new AssetPromise((resolve, reject) => {
      Promise.all(
        item.urls.map((url) =>
          this.request<HTMLImageElement>(url, {
            ...item,
            type: "image"
          })
        )
      )
        .then((images) => {
          const { width, height } = images[0];

          if (width !== height) {
            console.error("The cube texture must have the same width and height");
            return;
          }

          const tex = new SampledTextureCube(resourceManager.engine, width, height);

          /** @ts-ignore */
          if (!tex._platformTexture) return;

          const imageBitmapOptions = TextureCubeLoader._imageBitmapOptions;
          for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
            const image = images[faceIndex];
            const levelCount = Math.max(Math.log2(image.width) + 1, Math.log2(image.height) + 1);
            for (let level = 0; level < levelCount; level++) {
              imageBitmapOptions.resizeWidth = Math.max(1, image.width / Math.pow(2, level));
              imageBitmapOptions.resizeHeight = Math.max(1, image.height / Math.pow(2, level));
              createImageBitmap(image, imageBitmapOptions).then((value => {
                tex.setImageSource(faceIndex, value, level);
              }));
            }
          }

          resolve(tex);
        })
        .catch((e) => {
          reject(e);
        });
    });
  }
}
