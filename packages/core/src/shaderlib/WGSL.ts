import { BindGroupLayoutEntry, ShaderStage } from "../webgpu";
import { ShaderMacroCollection } from "../shader/ShaderMacroCollection";
import { WGSLEncoder } from "./WGSLEncoder";

export type BindGroupInfo = Map<number, Set<number>>;
export type BindGroupLayoutEntryMap = Map<number, Map<number, BindGroupLayoutEntry>>;

export class WGSL {
  protected _source: string;
  protected _bindGroupInfo: BindGroupInfo = new Map<number, Set<number>>();
  protected _bindGroupLayoutEntryMap: BindGroupLayoutEntryMap = new Map<number, Map<number, BindGroupLayoutEntry>>();

  get bindGroupLayoutEntryMap(): BindGroupLayoutEntryMap {
    return this._bindGroupLayoutEntryMap;
  }

  constructor() {}

  compile(macros: ShaderMacroCollection): [string, BindGroupInfo] {
    return [this._source, this._bindGroupInfo];
  }

  createSourceEncoder(currentStage: ShaderStage): WGSLEncoder {
    return new WGSLEncoder(this, currentStage);
  }

  /**
   * @internal
   */
  _setSource(source: string) {
    this._source = source;
  }

  /**
   * @internal
   */
  _setBindGroupInfo(info: BindGroupInfo) {
    this._bindGroupInfo = info;
  }

  /**
   * @internal
   */
  _setBindGroupLayoutEntryMap(map: BindGroupLayoutEntryMap) {
    const bindGroupLayoutEntryMap = this._bindGroupLayoutEntryMap;
    map.forEach((bindingEntries, group) => {
      if (bindGroupLayoutEntryMap.has(group)) {
        bindingEntries.forEach((entry, binding) => {
          if (!bindGroupLayoutEntryMap.get(group).has(binding)) {
            bindGroupLayoutEntryMap.get(group).set(binding, entry);
          }
        });
      } else {
        bindGroupLayoutEntryMap.set(group, bindingEntries);
      }
    });
  }
}
