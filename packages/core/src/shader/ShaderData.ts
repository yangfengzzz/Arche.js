import { IClone } from "../clone/IClone";
import { Color, Matrix, Vector2, Vector3, Vector4 } from "@arche-engine/math";
import { IRefObject } from "../asset";
import { ShaderDataGroup } from "./ShaderDataGroup";
import { Shader } from "./Shader";
import { ShaderMacro } from "./ShaderMacro";
import { ShaderMacroCollection } from "./ShaderMacroCollection";
import { ShaderProperty } from "./ShaderProperty";
import { SampledTexture2D } from "../texture";
import { SampledTexture } from "../texture/SampledTexture";
import { Buffer } from "../graphic";
import { Engine } from "../Engine";
import { MacroName } from "./InternalMacroName";
import { ignoreClone } from "../clone/CloneManager";

export type ShaderPropertyResourceType = Buffer | SampledTexture;

/**
 * Shader data collection,Correspondence includes shader properties data and macros data.
 */
export class ShaderData implements IRefObject, IClone {
  private static _intArray1: Int32Array = new Int32Array(1);
  private static _floatArray1: Float32Array = new Float32Array(1);
  private static _floatArray2: Float32Array = new Float32Array(2);
  private static _floatArray3: Float32Array = new Float32Array(3);
  private static _floatArray4: Float32Array = new Float32Array(4);

  /** @internal */
  @ignoreClone
  _index: number = -1;
  /** @internal */
  _group: ShaderDataGroup;
  /** @internal */
  _propertyResources: Record<number, ShaderPropertyResourceType> = Object.create(null);
  /** @internal */
  _propertyFunctors: Record<number, () => Buffer> = Object.create(null);
  /** @internal */
  _macroCollection: ShaderMacroCollection = new ShaderMacroCollection();
  private readonly _engine: Engine;
  private _refCount: number = 0;

  /**
   * @internal
   */
  constructor(group: ShaderDataGroup, engine: Engine) {
    this._engine = engine;
    this._group = group;
  }

  /**
   * Set float by shader property name.
   * @remarks Corresponding float shader property type.
   * @param propertyName - Shader property name
   * @param value - Float
   */
  setBufferFunctor(propertyName: string, value: () => Buffer): void;

  /**
   * Set float by shader property.
   * @remarks Corresponding float shader property type.
   * @param property - Shader property
   * @param value - Float
   */
  setBufferFunctor(property: ShaderProperty, value: () => Buffer): void;

  setBufferFunctor(property: string | ShaderProperty, value: () => Buffer): void {
    if (typeof property === "string") {
      property = Shader.getPropertyByName(property);
    }

    if (property._group !== this._group) {
      if (property._group === undefined) {
        property._group = this._group;
      } else {
        throw `Shader property ${property.name} has been used as ${ShaderDataGroup[property._group]} property.`;
      }
    }

    if (this._propertyResources[property._uniqueId] == undefined) {
      this._propertyFunctors[property._uniqueId] = value;
    }
  }

  //--------------------------------------------------------------------------------------------------------------------
  /**
   * Get float by shader property name.
   * @param propertyID - Shader property name
   * @returns Float
   */
  getFloat(propertyID: number): Buffer;

  /**
   * Get float by shader property name.
   * @param propertyName - Shader property name
   * @returns Float
   */
  getFloat(propertyName: string): Buffer;

  /**
   * Get float by shader property.
   * @param property - Shader property
   * @returns Float
   */
  getFloat(property: ShaderProperty): Buffer;

  getFloat(property: number | string | ShaderProperty): Buffer {
    return this._getDataBuffer(property);
  }

  /**
   * Set float by shader property name.
   * @remarks Corresponding float shader property type.
   * @param propertyName - Shader property name
   * @param value - Float
   */
  setFloat(propertyName: string, value: number): void;

  /**
   * Set float by shader property.
   * @remarks Corresponding float shader property type.
   * @param property - Shader property
   * @param value - Float
   */
  setFloat(property: ShaderProperty, value: number): void;

  setFloat(property: string | ShaderProperty, value: number): void {
    ShaderData._floatArray1[0] = value;
    this._setDataBuffer(property, ShaderData._floatArray1);
  }

  //------------------------------------------------------------------------------------------------------------------
  /**
   * Get int by shader property name.
   * @param propertyID - Shader property name
   * @returns Int
   */
  getInt(propertyID: number): Buffer;

  /**
   * Get int by shader property name.
   * @param propertyName - Shader property name
   * @returns Int
   */
  getInt(propertyName: string): Buffer;

  /**
   * Get int by shader property.
   * @param property - Shader property
   * @returns Int
   */
  getInt(property: ShaderProperty): Buffer;

  getInt(property: number | string | ShaderProperty): Buffer {
    return this._getDataBuffer(property);
  }

  /**
   * Set int by shader property name.
   * @remarks Correspondence includes int and bool shader property type.
   * @param propertyName - Shader property name
   * @param value - Int
   */
  setInt(propertyName: string, value: number): void;

  /**
   * Set int by shader property.
   * @remarks Correspondence includes int and bool shader property type.
   * @param property - Shader property
   * @param value - Int
   */
  setInt(property: ShaderProperty, value: number): void;

  setInt(property: string | ShaderProperty, value: number): void {
    ShaderData._intArray1[0] = value;
    this._setDataBuffer(property, ShaderData._intArray1);
  }

  //------------------------------------------------------------------------------------------------------------------
  /**
   * Get float array by shader property name.
   * @param propertyID - Shader property name
   * @returns Float array
   */
  getFloatArray(propertyID: number): Buffer;

  /**
   * Get float array by shader property name.
   * @param propertyName - Shader property name
   * @returns Float array
   */
  getFloatArray(propertyName: string): Buffer;

  /**
   * Get float array by shader property.
   * @param property - Shader property
   * @returns Float array
   */
  getFloatArray(property: ShaderProperty): Buffer;

  getFloatArray(property: number | string | ShaderProperty): Buffer {
    return this._getDataBuffer(property);
  }

  /**
   * Set float array by shader property name.
   * @remarks Correspondence includes float array、vec2 array、vec3 array、vec4 array and matrix array shader property type.
   * @param propertyName - Shader property name
   * @param value - Float array
   */
  setFloatArray(propertyName: string, value: Float32Array): void;

  /**
   * Set float array by shader property.
   * @remarks Correspondence includes float array、vec2 array、vec3 array、vec4 array and matrix array shader property type.
   * @param property - Shader property
   * @param value - Float array
   */
  setFloatArray(property: ShaderProperty, value: Float32Array): void;

  setFloatArray(property: string | ShaderProperty, value: Float32Array): void {
    this._setDataBuffer(property, value);
  }

  //------------------------------------------------------------------------------------------------------------------
  /**
   * Get int array by shader property name.
   * @param propertyID - Shader property name
   * @returns Int Array
   */
  getIntArray(propertyID: number): Buffer;

  /**
   * Get int array by shader property name.
   * @param propertyName - Shader property name
   * @returns Int Array
   */
  getIntArray(propertyName: string): Buffer;

  /**
   * Get int array by shader property.
   * @param property - Shader property
   * @returns Int Array
   */
  getIntArray(property: ShaderProperty): Buffer;

  getIntArray(property: number | string | ShaderProperty): Buffer {
    return this._getDataBuffer(property);
  }

  /**
   * Set int array by shader property name.
   * @remarks Correspondence includes bool array、int array、bvec2 array、bvec3 array、bvec4 array、ivec2 array、ivec3 array and ivec4 array shader property type.
   * @param propertyName - Shader property name
   * @param value - Int Array
   */
  setIntArray(propertyName: string, value: Int32Array): void;

  /**
   * Set int array by shader property.
   * @remarks Correspondence includes bool array、int array、bvec2 array、bvec3 array、bvec4 array、ivec2 array、ivec3 array and ivec4 array shader property type.
   * @param property - Shader property
   * @param value - Int Array
   */
  setIntArray(property: ShaderProperty, value: Int32Array): void;

  setIntArray(property: string | ShaderProperty, value: Int32Array): void {
    this._setDataBuffer(property, value);
  }

  //------------------------------------------------------------------------------------------------------------------
  /**
   * Get two-dimensional from shader property name.
   * @param propertyID - Shader property name
   * @returns Two-dimensional vector
   */
  getVector2(propertyID: number): Buffer;

  /**
   * Get two-dimensional from shader property name.
   * @param propertyName - Shader property name
   * @returns Two-dimensional vector
   */
  getVector2(propertyName: string): Buffer;

  /**
   * Get two-dimensional from shader property.
   * @param property - Shader property
   * @returns Two-dimensional vector
   */
  getVector2(property: ShaderProperty): Buffer;

  getVector2(property: number | string | ShaderProperty): Buffer {
    return this._getDataBuffer(property);
  }

  /**
   * Set two-dimensional vector from shader property name.
   * @remarks Correspondence includes vec2、ivec2 and bvec2 shader property type.
   * @param property - Shader property name
   * @param value - Two-dimensional vector
   */
  setVector2(property: string, value: Vector2): void;

  /**
   * Set two-dimensional vector from shader property.
   * @remarks Correspondence includes vec2、ivec2 and bvec2 shader property type.
   * @param property - Shader property
   * @param value - Two-dimensional vector
   */
  setVector2(property: ShaderProperty, value: Vector2): void;

  setVector2(property: string | ShaderProperty, value: Vector2): void {
    ShaderData._floatArray2[0] = value.x;
    ShaderData._floatArray2[1] = value.y;
    this._setDataBuffer(property, ShaderData._floatArray2);
  }

  //------------------------------------------------------------------------------------------------------------------
  /**
   * Get vector3 by shader property name.
   * @param propertyID - Shader property name
   * @returns Three-dimensional vector
   */
  getVector3(propertyID: number): Buffer;

  /**
   * Get vector3 by shader property name.
   * @param propertyName - Shader property name
   * @returns Three-dimensional vector
   */
  getVector3(propertyName: string): Buffer;

  /**
   * Get vector3 by shader property.
   * @param property - Shader property
   * @returns Three-dimensional vector
   */
  getVector3(property: ShaderProperty): Buffer;

  getVector3(property: number | string | ShaderProperty): Buffer {
    return this._getDataBuffer(property);
  }

  /**
   * Set three-dimensional vector by shader property name.
   * @remarks Correspondence includes vec3、ivec3 and bvec3 shader property type.
   * @param property - Shader property name
   * @param value - Three-dimensional vector
   */
  setVector3(property: string, value: Vector3): void;

  /**
   * Set three-dimensional vector by shader property.
   * @remarks Correspondence includes vec3、ivec3 and bvec3 shader property type.
   * @param property - Shader property
   * @param value - Three-dimensional vector
   */
  setVector3(property: ShaderProperty, value: Vector3): void;

  setVector3(property: string | ShaderProperty, value: Vector3): void {
    ShaderData._floatArray3[0] = value.x;
    ShaderData._floatArray3[1] = value.y;
    ShaderData._floatArray3[2] = value.z;
    this._setDataBuffer(property, ShaderData._floatArray3);
  }

  //------------------------------------------------------------------------------------------------------------------
  /**
   * Get vector4 by shader property name.
   * @param propertyID - Shader property name
   * @returns Four-dimensional vector
   */
  getVector4(propertyID: number): Buffer;

  /**
   * Get vector4 by shader property name.
   * @param propertyName - Shader property name
   * @returns Four-dimensional vector
   */
  getVector4(propertyName: string): Buffer;

  /**
   * Get vector4 by shader property.
   * @param property - Shader property
   * @returns Four-dimensional vector
   */
  getVector4(property: ShaderProperty): Buffer;

  getVector4(property: number | string | ShaderProperty): Buffer {
    return this._getDataBuffer(property);
  }

  /**
   * Set four-dimensional vector by shader property name.
   * @remarks Correspondence includes vec4、ivec4 and bvec4 shader property type.
   * @param property - Shader property name
   * @param value - Four-dimensional vector
   */
  setVector4(property: string, value: Vector4): void;

  /**
   * Set four-dimensional vector by shader property.
   * @remarks Correspondence includes vec4、ivec4 and bvec4 shader property type.
   * @param property - Shader property
   * @param value - Four-dimensional vector
   */
  setVector4(property: ShaderProperty, value: Vector4): void;

  setVector4(property: string | ShaderProperty, value: Vector4): void {
    ShaderData._floatArray4[0] = value.x;
    ShaderData._floatArray4[1] = value.y;
    ShaderData._floatArray4[2] = value.z;
    ShaderData._floatArray4[3] = value.w;
    this._setDataBuffer(property, ShaderData._floatArray4);
  }

  //------------------------------------------------------------------------------------------------------------------
  /**
   * Get matrix by shader property name.
   * @param propertyID - Shader property name
   * @returns Matrix
   */
  getMatrix(propertyID: number): Buffer;

  /**
   * Get matrix by shader property name.
   * @param propertyName - Shader property name
   * @returns Matrix
   */
  getMatrix(propertyName: string): Buffer;

  /**
   * Get matrix by shader property.
   * @param property - Shader property
   * @returns Matrix
   */
  getMatrix(property: ShaderProperty): Buffer;

  getMatrix(property: number | string | ShaderProperty): Buffer {
    return this._getDataBuffer(property);
  }

  /**
   * Set matrix by shader property name.
   * @remarks Correspondence includes matrix shader property type.
   * @param propertyName - Shader property name
   * @param value - Matrix
   */
  setMatrix(propertyName: string, value: Matrix);

  /**
   * Set matrix by shader property.
   * @remarks Correspondence includes matrix shader property type.
   * @param property - Shader property
   * @param value - Matrix
   */
  setMatrix(property: ShaderProperty, value: Matrix);

  setMatrix(property: string | ShaderProperty, value: Matrix): void {
    this._setDataBuffer(property, value.elements);
  }

  //------------------------------------------------------------------------------------------------------------------
  /**
   * Get color by shader property name.
   * @param propertyID - Shader property name
   * @returns Color
   */
  getColor(propertyID: number): Buffer;

  /**
   * Get color by shader property name.
   * @param propertyName - Shader property name
   * @returns Color
   */
  getColor(propertyName: string): Buffer;

  /**
   * Get color by shader property.
   * @param property - Shader property
   * @returns Color
   */
  getColor(property: ShaderProperty): Buffer;

  getColor(property: number | string | ShaderProperty): Buffer {
    return this._getDataBuffer(property);
  }

  /**
   * Set color by shader property name.
   * @remarks Correspondence includes vec4 shader property type.
   * @param propertyName - Shader property name
   * @param value - Color
   */
  setColor(propertyName: string, value: Color): void;

  /**
   * Set color by shader property.
   * @remarks Correspondence includes vec4 shader property type.
   * @param property - Shader property
   * @param value - Color
   */
  setColor(property: ShaderProperty, value: Color): void;

  setColor(property: string | ShaderProperty, value: Color): void {
    ShaderData._floatArray4[0] = value.r;
    ShaderData._floatArray4[1] = value.g;
    ShaderData._floatArray4[2] = value.b;
    ShaderData._floatArray4[3] = value.a;
    this._setDataBuffer(property, ShaderData._floatArray4);
  }

  //------------------------------------------------------------------------------------------------------------------
  /**
   * Get texture by shader property name.
   * @param propertyID - Shader property name
   * @returns Texture
   */
  getTextureView(propertyID: number): GPUTextureView;

  /**
   * Get texture by shader property name.
   * @param propertyName - Shader property name
   * @returns Texture
   */
  getTextureView(propertyName: string): GPUTextureView;

  /**
   * Get texture by shader property.
   * @param property - Shader property
   * @returns Texture
   */
  getTextureView(property: ShaderProperty): GPUTextureView;

  getTextureView(property: number | string | ShaderProperty): GPUTextureView {
    return this._getTextureView(property);
  }

  /**
   * Get texture by shader property name.
   * @param propertyID - Shader property name
   * @returns Texture
   */
  getSampler(propertyID: number): GPUSampler;

  /**
   * Get texture by shader property name.
   * @param propertyName - Shader property name
   * @returns Texture
   */
  getSampler(propertyName: string): GPUSampler;

  /**
   * Get texture by shader property.
   * @param property - Shader property
   * @returns Texture
   */
  getSampler(property: ShaderProperty): GPUSampler;

  getSampler(property: number | string | ShaderProperty): GPUSampler {
    return this._getSampler(property);
  }

  /**
   * Set texture by shader property name.
   * @param textureName - Shader property name
   * @param samplerName - Shader property name
   * @param value - Texture
   */
  setSampledTexture(textureName: string, samplerName: string, value: SampledTexture): void;

  /**
   * Set texture by shader property.
   * @param textureProperty - Shader property
   * @param samplerProperty - Shader property
   * @param value - Texture
   */
  setSampledTexture(textureProperty: ShaderProperty, samplerProperty: ShaderProperty, value: SampledTexture): void;

  setSampledTexture(
    textureProperty: string | ShaderProperty,
    samplerProperty: string | ShaderProperty,
    value: SampledTexture
  ): void {
    this._setSampledTexture(textureProperty, samplerProperty, value);
  }

  //------------------------------------------------------------------------------------------------------------------
  /**
   * Enable macro.
   * @param macroName - Macro name
   */
  enableMacro(macroName: MacroName): void;

  /**
   * Enable macro.
   * @param macroName - Macro name
   */
  enableMacro(macroName: string): void;

  /**
   * Enable macro.
   * @param macro - Shader macro
   */
  enableMacro(macro: ShaderMacro): void;

  /**
   * Enable macro.
   * @remarks Name and value will combine one macro, it's equal the macro of "name value".
   * @param name - Macro name
   * @param value - Macro value
   */
  enableMacro(name: string, value: string): void;

  enableMacro(macro: string | ShaderMacro, value: string = null): void {
    this._macroCollection.enableMacro(macro, value);
  }

  /**
   * Disable macro
   * @param macroName - Macro name
   */
  disableMacro(macroName: MacroName): void;

  /**
   * Disable macro
   * @param macroName - Macro name
   */
  disableMacro(macroName: string): void;

  /**
   * Disable macro
   * @param macro - Shader macro
   */
  disableMacro(macro: ShaderMacro): void;

  disableMacro(macro: string | ShaderMacro): void {
    this._macroCollection.disableMacro(macro);
  }

  clone(): ShaderData {
    const shaderData = new ShaderData(this._group, this._engine);
    this.cloneTo(shaderData);
    return shaderData;
  }

  cloneTo(target: ShaderData): void {
    // CloneManager.deepCloneObject(this._macroCollection, target._macroCollection);
    // Object.assign(target._variableMacros, this._variableMacros);
    //
    // const properties = this._propertyResources;
    // const targetProperties = target._propertyResources;
    // const keys = Object.keys(properties);
    // for (let i = 0, n = keys.length; i < n; i++) {
    //     const k = keys[i];
    //     const property: ShaderPropertyResourceType = properties[k];
    //     if (property != null) {
    //         if (typeof property === "number") {
    //             targetProperties[k] = property;
    //         } else if (property instanceof SamplerTexture2D) {
    //             targetProperties[k] = property;
    //         } else if (property instanceof Array || property instanceof Float32Array || property instanceof Int32Array) {
    //             targetProperties[k] = property.slice();
    //         } else {
    //             const targetProperty = targetProperties[k];
    //             if (targetProperty) {
    //                 property.cloneTo(targetProperty);
    //             } else {
    //                 targetProperties[k] = property.clone();
    //             }
    //         }
    //     } else {
    //         targetProperties[k] = property;
    //     }
    // }
  }

  //------------------------------------------------------------------------------------------------------------------
  /**
   * @internal
   */
  _setDataBuffer(property: string | ShaderProperty, value: Float32Array | Int32Array): void {
    if (typeof property === "string") {
      property = Shader.getPropertyByName(property);
    }

    if (property._group !== this._group) {
      if (property._group === undefined) {
        property._group = this._group;
      } else {
        throw `Shader property ${property.name} has been used as ${ShaderDataGroup[property._group]} property.`;
      }
    }

    if (this._propertyResources[property._uniqueId] == undefined) {
      this._propertyResources[property._uniqueId] = new Buffer(
        this._engine,
        value.byteLength,
        GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      );
    }
    (<Buffer>this._propertyResources[property._uniqueId]).uploadData(value, 0, 0, value.length);
  }

  /**
   * @internal
   */
  _setSampledTexture(
    texProperty: string | ShaderProperty,
    sampleProperty: string | ShaderProperty,
    value: SampledTexture
  ): void {
    // texture
    {
      if (typeof texProperty === "string") {
        texProperty = Shader.getPropertyByName(texProperty);
      }

      if (texProperty._group !== this._group) {
        if (texProperty._group === undefined) {
          texProperty._group = this._group;
        } else {
          throw `Shader property ${texProperty.name} has been used as ${ShaderDataGroup[texProperty._group]} property.`;
        }
      }

      if (this._propertyResources[texProperty._uniqueId] == undefined) {
        this._propertyResources[texProperty._uniqueId] = value;
      }
    }
    // sampler
    {
      if (typeof sampleProperty === "string") {
        sampleProperty = Shader.getPropertyByName(sampleProperty);
      }

      if (sampleProperty._group !== this._group) {
        if (sampleProperty._group === undefined) {
          sampleProperty._group = this._group;
        } else {
          throw `Shader property ${sampleProperty.name} has been used as ${
            ShaderDataGroup[sampleProperty._group]
          } property.`;
        }
      }

      if (this._propertyResources[sampleProperty._uniqueId] == undefined) {
        this._propertyResources[sampleProperty._uniqueId] = value;
      }
    }
  }

  /**
   * @internal
   */
  _getDataBuffer(property: number | string | ShaderProperty): Buffer {
    if (typeof property === "string") {
      property = Shader.getPropertyByName(property)._uniqueId;
    }
    if (typeof property !== "string" && typeof property !== "number") {
      property = property._uniqueId;
    }

    let buffer = this._propertyResources[property] as Buffer;
    if (buffer === undefined || buffer === null) {
      const functor = this._propertyFunctors[property];
      if (functor !== undefined) {
        buffer = functor();
      }
    }
    return buffer;
  }

  /**
   * @internal
   */
  _getSampler(property: number | string | ShaderProperty): GPUSampler {
    if (typeof property === "string") {
      property = Shader.getPropertyByName(property)._uniqueId;
    }
    if (typeof property !== "string" && typeof property !== "number") {
      property = property._uniqueId;
    }
    return (<SampledTexture>this._propertyResources[property]).sampler;
  }

  _getTextureView(property: number | string | ShaderProperty): GPUTextureView {
    if (typeof property === "string") {
      property = Shader.getPropertyByName(property)._uniqueId;
    }
    if (typeof property !== "string" && typeof property !== "number") {
      property = property._uniqueId;
    }
    return (<SampledTexture>this._propertyResources[property]).textureView;
  }

  /**
   * @internal
   */
  _getRefCount(): number {
    return this._refCount;
  }

  /**
   * @internal
   */
  _addRefCount(value: number): void {
    this._refCount += value;
    const properties = this._propertyResources;
    for (const k in properties) {
      const property = properties[k];
      // @todo: Separate array to speed performance.
      if (property && property instanceof SampledTexture2D) {
        property._addRefCount(value);
      }
    }
  }
}
