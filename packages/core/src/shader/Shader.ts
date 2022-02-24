import { ShaderDataGroup } from "./ShaderDataGroup";
import { ShaderMacro } from "./ShaderMacro";
import { ShaderMacroCollection } from "./ShaderMacroCollection";
import { ShaderProperty } from "./ShaderProperty";
import { BindGroupInfo, WGSL } from "../shaderlib";
import { Engine } from "../Engine";
import { ShaderProgram } from "./ShaderProgram";
import { BindGroupLayoutDescriptor, BindGroupLayoutEntry } from "../webgpu";
import { MacroName } from "./InternalMacroName";

type BindGroupLayoutEntryVecMap = Map<number, BindGroupLayoutEntry[]>;
type BindGroupLayoutDescriptorMap = Map<number, BindGroupLayoutDescriptor>;

/**
 * Shader containing vertex and fragment source.
 */
export class Shader {
  /** @internal */
  private static _shaderCounter: number = 0;
  private static _shaderMap: Record<string, Shader> = Object.create(null);
  private static _propertyNameMap: Record<string, ShaderProperty> = Object.create(null);
  private static _propertyGroupMap: Record<number, ShaderProperty> = Object.create(null);

  private static _macroMaskMap: string[][] = [];
  private static _macroCounter: number = 0;
  private static _macroMap: Record<string, ShaderMacro> = Object.create(null);

  /**
   * Create a shader.
   * @param name - Name of the shader
   * @param vertexSource - Vertex source code
   * @param fragmentSource - Fragment source code
   */
  static create(name: string, vertexSource: WGSL, fragmentSource: WGSL): Shader {
    const shaderMap = Shader._shaderMap;
    if (shaderMap[name]) {
      throw `Shader named "${name}" already exists.`;
    }
    return (shaderMap[name] = new Shader(name, vertexSource, fragmentSource));
  }

  /**
   * Find a shader by name.
   * @param name - Name of the shader
   */
  static find(name: string): Shader {
    return Shader._shaderMap[name];
  }

  static getMacroByName(name: MacroName): ShaderMacro;

  static getMacroByName(name: string): ShaderMacro;

  /**
   * Get shader macro by name.
   * @param name - Name of the shader macro
   * @returns Shader macro
   */
  static getMacroByName(name: string): ShaderMacro {
    let macro = Shader._macroMap[name];
    if (!macro) {
      const maskMap = Shader._macroMaskMap;
      const counter = Shader._macroCounter;
      const index = Math.floor(counter / 32);
      const bit = counter % 32;
      macro = new ShaderMacro(name, index, 1 << bit);
      Shader._macroMap[name] = macro;
      if (index == maskMap.length) {
        maskMap.length++;
        maskMap[index] = new Array<string>(32);
      }
      maskMap[index][bit] = name;
      Shader._macroCounter++;
    }
    return macro;
  }

  /**
   * Get shader property by name.
   * @param name - Name of the shader property
   * @returns Shader property
   */
  static getPropertyByName(name: string): ShaderProperty {
    const propertyNameMap = Shader._propertyNameMap;
    const propertyGroupMap = Shader._propertyGroupMap;
    if (propertyNameMap[name] != null) {
      return propertyNameMap[name];
    } else {
      const property = new ShaderProperty(name);
      propertyNameMap[name] = property;
      propertyGroupMap[property._uniqueId] = property;
      return property;
    }
  }

  static getShaderPropertyGroup(uniqueID: number): ShaderDataGroup | null {
    return Shader._propertyGroupMap[uniqueID]?._group;
  }

  /** The name of shader. */
  readonly name: string;

  /** @internal */
  _shaderId: number = 0;

  private _vertexSource: WGSL;
  private readonly _fragmentSource?: WGSL;
  private _bindGroupInfo: BindGroupInfo = new Map<number, Set<number>>();
  private _bindGroupLayoutEntryVecMap: BindGroupLayoutEntryVecMap = new Map<number, BindGroupLayoutEntry[]>();
  private _bindGroupLayoutDescriptorMap: BindGroupLayoutDescriptorMap = new Map<number, BindGroupLayoutDescriptor>();

  private constructor(name: string, vertexSource: WGSL, fragmentSource?: WGSL) {
    this._shaderId = Shader._shaderCounter++;
    this.name = name;
    this._vertexSource = vertexSource;
    this._fragmentSource = fragmentSource;
  }

  /**
   * Compile shader variant by macro name list.
   *
   * @remarks
   * Usually a shader contains some macros,any combination of macros is called shader variant.
   *
   * @param engine - Engine to which the shader variant belongs
   * @param macroCollection - Macro name list
   */
  getShaderProgram(engine: Engine, macroCollection: ShaderMacroCollection): ShaderProgram {
    const shaderProgramPool = engine._getShaderProgramPool(this);
    let shaderProgram = shaderProgramPool.get(macroCollection);
    if (shaderProgram) {
      return shaderProgram;
    }

    // merge info
    const vertexCode = this._vertexSource.compile(macroCollection);
    vertexCode[1].forEach((bindings, group) => {
      bindings.forEach((binding) => {
        if (!this._bindGroupInfo.has(group)) {
          this._bindGroupInfo.set(group, new Set<number>());
        }
        this._bindGroupInfo.get(group).add(binding);
      });
    });

    let fragmentCode: [string, BindGroupInfo] = null;
    if (this._fragmentSource) {
      fragmentCode = this._fragmentSource.compile(macroCollection);
      fragmentCode[1].forEach((bindings, group) => {
        bindings.forEach((binding) => {
          if (!this._bindGroupInfo.has(group)) {
            this._bindGroupInfo.set(group, new Set<number>());
          }
          this._bindGroupInfo.get(group).add(binding);
        });
      });
    }

    // console.log(vertexCode[0]);
    // console.log(fragmentCode[0]);
    // debugger;

    // move to vecMap
    this._bindGroupInfo.forEach((bindings, group) => {
      bindings.forEach((binding) => {
        if (!this._bindGroupLayoutEntryVecMap.has(group)) {
          this._bindGroupLayoutEntryVecMap.set(group, []);
        }
        this._bindGroupLayoutEntryVecMap.get(group).push(this._findEntry(group, binding));
      });
    });

    // generate map
    this._bindGroupLayoutEntryVecMap.forEach((entries, group) => {
      const desc = new BindGroupLayoutDescriptor();
      desc.entries = entries;
      this._bindGroupLayoutDescriptorMap.set(group, desc);
    });

    shaderProgram = new ShaderProgram(
      engine.device,
      vertexCode[0],
      fragmentCode ? fragmentCode[0] : null,
      this._bindGroupLayoutDescriptorMap
    );
    shaderProgramPool.cache(shaderProgram);
    return shaderProgram;
  }

  flush() {
    this._bindGroupInfo.clear();
    this._bindGroupLayoutEntryVecMap.clear();
    this._bindGroupLayoutDescriptorMap.clear();
  }

  _findEntry(group: number, binding: number): BindGroupLayoutEntry {
    let entry: BindGroupLayoutEntry = undefined;

    const entryMap = this._vertexSource.bindGroupLayoutEntryMap;
    if (entryMap.has(group) && entryMap.get(group).has(binding)) {
      entry = entryMap.get(group).get(binding);
    }

    if (this._fragmentSource) {
      const entryMap = this._fragmentSource.bindGroupLayoutEntryMap;
      if (entryMap.has(group) && entryMap.get(group).has(binding)) {
        if (entry !== undefined) {
          entry.visibility |= GPUShaderStage.FRAGMENT;
        } else {
          entry = entryMap.get(group).get(binding);
        }
      }
    }

    if (entry !== undefined) {
      return entry;
    } else {
      throw "have bug!";
    }
  }
}
