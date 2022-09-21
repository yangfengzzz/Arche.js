import { Engine } from "../Engine";
import { murmurhash3_32_gc } from "../base";
import { SamplerDescriptor } from "../webgpu";

export class ResourceCache {
  private _engine: Engine;
  private _samplers: Map<number, GPUSampler>;

  constructor(engine: Engine) {
    this._engine = engine;
  }

  requestSampler(descriptor: SamplerDescriptor): GPUSampler {
    let key = murmurhash3_32_gc(descriptor.addressModeU, 0);
    key = murmurhash3_32_gc(descriptor.addressModeV, key);
    key = murmurhash3_32_gc(descriptor.addressModeW, key);
    key = murmurhash3_32_gc(descriptor.lodMaxClamp.toString(), key);
    key = murmurhash3_32_gc(descriptor.lodMinClamp.toString(), key);
    key = murmurhash3_32_gc(descriptor.magFilter, key);
    key = murmurhash3_32_gc(descriptor.minFilter, key);
    key = murmurhash3_32_gc(descriptor.minFilter, key);
    key = murmurhash3_32_gc(descriptor.mipmapFilter, key);
    key = murmurhash3_32_gc(descriptor.compare, key);
    key = murmurhash3_32_gc(descriptor.maxAnisotropy.toString(), key);

    let sampler = this._samplers.get(key);
    if (sampler === null || sampler === undefined) {
      sampler = this._samplers[key] = this._engine.device.createSampler(descriptor);
    }
    return sampler;
  }
}
