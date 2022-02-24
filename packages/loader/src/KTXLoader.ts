import {
  AssetPromise,
  AssetType,
  Loader,
  LoadItem,
  resourceLoader,
  ResourceManager,
  SampledTexture2D
} from "@arche-engine/core";
import { parseSingleKTX } from "./compressed-texture";

@resourceLoader(AssetType.KTX, ["ktx"])
export class KTXLoader extends Loader<SampledTexture2D> {
  load(item: LoadItem, resourceManager: ResourceManager): AssetPromise<SampledTexture2D> {
    return new AssetPromise((resolve, reject) => {
      this.request<ArrayBuffer>(item.url, {
        ...item,
        type: "arraybuffer"
      })
        .then((bin) => {
          const parsedData = parseSingleKTX(bin);
          const { width, height, mipmaps, engineFormat } = parsedData;
          const mipmap = mipmaps.length > 1;
          const texture = new SampledTexture2D(
            resourceManager.engine,
            width,
            height,
            1,
            engineFormat,
            GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
            mipmap
          );

          for (let miplevel = 0; miplevel < mipmaps.length; miplevel++) {
            const { width, height, data } = mipmaps[miplevel];
            texture.setPixelBuffer(data, miplevel, 0, 0, width, height);
          }

          resolve(texture);
        })
        .catch((e) => {
          reject(e);
        });
    });
  }
}
