import { Color } from "@arche-engine/math";
import { Engine } from "../Engine";
import { Shader } from "../shader";
import { BaseMaterial } from "./BaseMaterial";
import { SampledTexture2D } from "../texture";

/**
 * Blinn-phong Material.
 */
export class BlinnPhongMaterial extends BaseMaterial {
  private static _blinnPhongProp = Shader.getPropertyByName("u_blinnPhongData");
  private static _baseTextureProp = Shader.getPropertyByName("u_diffuseTexture");
  private static _baseSamplerProp = Shader.getPropertyByName("u_diffuseSampler");
  private static _specularTextureProp = Shader.getPropertyByName("u_specularTexture");
  private static _specularSamplerProp = Shader.getPropertyByName("u_specularSampler");
  private static _emissiveTextureProp = Shader.getPropertyByName("u_emissiveTexture");
  private static _emissiveSamplerProp = Shader.getPropertyByName("u_emissiveSampler");
  private static _normalTextureProp = Shader.getPropertyByName("u_normalTexture");
  private static _normalSamplerProp = Shader.getPropertyByName("u_normalSampler");

  // baseColor, specularColor, emissiveColor, normalIntensity, shininess, _pad1, _pad2
  private _blinnPhongData: Float32Array = new Float32Array(16);
  private _baseTexture: SampledTexture2D;
  private _specularTexture: SampledTexture2D;
  private _emissiveTexture: SampledTexture2D;
  private _normalTexture: SampledTexture2D;

  private _baseColor: Color = new Color(1, 1, 1, 1);
  private _specularColor: Color = new Color(1, 1, 1, 1);

  /**
   * Base color.
   */
  get baseColor(): Color {
    return this._baseColor;
  }

  set baseColor(value: Color) {
    const blinnPhongData = this._blinnPhongData;
    blinnPhongData[0] = value.r;
    blinnPhongData[1] = value.g;
    blinnPhongData[2] = value.b;
    blinnPhongData[3] = value.a;
    this.shaderData.setFloatArray(BlinnPhongMaterial._blinnPhongProp, blinnPhongData);

    const baseColor = this._baseColor;
    if (value !== baseColor) {
      value.cloneTo(baseColor);
    }
  }

  /**
   * Base texture.
   */
  get baseTexture(): SampledTexture2D {
    return this._baseTexture;
  }

  set baseTexture(value: SampledTexture2D) {
    this._baseTexture = value;
    this.shaderData.setSampledTexture(BlinnPhongMaterial._baseTextureProp, BlinnPhongMaterial._baseSamplerProp, value);
    if (value) {
      this.shaderData.enableMacro("HAS_DIFFUSE_TEXTURE");
    } else {
      this.shaderData.disableMacro("HAS_DIFFUSE_TEXTURE");
    }
  }

  /**
   * Specular color.
   */
  get specularColor(): Color {
    return this._specularColor;
  }

  set specularColor(value: Color) {
    const blinnPhongData = this._blinnPhongData;
    blinnPhongData[4] = value.r;
    blinnPhongData[5] = value.g;
    blinnPhongData[6] = value.b;
    blinnPhongData[7] = value.a;
    this.shaderData.setFloatArray(BlinnPhongMaterial._blinnPhongProp, blinnPhongData);

    const specularColor = this._specularColor;
    if (value !== specularColor) {
      value.cloneTo(specularColor);
    }
  }

  /**
   * Specular texture.
   */
  get specularTexture(): SampledTexture2D {
    return this._specularTexture;
  }

  set specularTexture(value: SampledTexture2D) {
    this._specularTexture = value;
    this.shaderData.setSampledTexture(
      BlinnPhongMaterial._specularTextureProp,
      BlinnPhongMaterial._specularSamplerProp,
      value
    );
    if (value) {
      this.shaderData.enableMacro("HAS_SPECULAR_TEXTURE");
    } else {
      this.shaderData.disableMacro("HAS_SPECULAR_TEXTURE");
    }
  }

  /**
   * Emissive color.
   */
  emissiveColor(color: Color): Color {
    const blinnPhongData = this._blinnPhongData;
    color.setValue(blinnPhongData[8], blinnPhongData[9], blinnPhongData[10], blinnPhongData[11]);
    return color;
  }

  setEmissiveColor(value: Color) {
    const blinnPhongData = this._blinnPhongData;
    blinnPhongData[8] = value.r;
    blinnPhongData[9] = value.g;
    blinnPhongData[10] = value.b;
    blinnPhongData[11] = value.a;
    this.shaderData.setFloatArray(BlinnPhongMaterial._blinnPhongProp, blinnPhongData);
  }

  /**
   * Emissive texture.
   */
  get emissiveTexture(): SampledTexture2D {
    return this._emissiveTexture;
  }

  set emissiveTexture(value: SampledTexture2D) {
    this._emissiveTexture = value;
    this.shaderData.setSampledTexture(
      BlinnPhongMaterial._emissiveTextureProp,
      BlinnPhongMaterial._emissiveSamplerProp,
      value
    );
    if (value) {
      this.shaderData.enableMacro("HAS_EMISSIVE_TEXTURE");
    } else {
      this.shaderData.disableMacro("HAS_EMISSIVE_TEXTURE");
    }
  }

  /**
   * Normal texture.
   */
  get normalTexture(): SampledTexture2D {
    return this._normalTexture;
  }

  set normalTexture(value: SampledTexture2D) {
    this._normalTexture = value;
    this.shaderData.setSampledTexture(
      BlinnPhongMaterial._normalTextureProp,
      BlinnPhongMaterial._normalSamplerProp,
      value
    );
    if (value) {
      this.shaderData.enableMacro("HAS_NORMAL_TEXTURE");
    } else {
      this.shaderData.disableMacro("HAS_NORMAL_TEXTURE");
    }
  }

  /**
   * Normal texture intensity.
   */
  get normalIntensity(): number {
    return this._blinnPhongData[12];
  }

  set normalIntensity(value: number) {
    const blinnPhongData = this._blinnPhongData;
    blinnPhongData[12] = value;
    this.shaderData.setFloatArray(BlinnPhongMaterial._blinnPhongProp, blinnPhongData);
  }

  /**
   * Set the specular reflection coefficient, the larger the value, the more convergent the specular reflection effect.
   */
  get shininess(): number {
    return this._blinnPhongData[13];
  }

  set shininess(value: number) {
    const blinnPhongData = this._blinnPhongData;
    blinnPhongData[13] = value;
    this.shaderData.setFloatArray(BlinnPhongMaterial._blinnPhongProp, blinnPhongData);
  }

  constructor(engine: Engine) {
    super(engine, Shader.find("blinn-phong"));

    const shaderData = this.shaderData;

    shaderData.enableMacro("NEED_WORLDPOS");

    const blinnPhongData = this._blinnPhongData;
    // diffuseColor
    blinnPhongData[0] = 1;
    blinnPhongData[1] = 1;
    blinnPhongData[2] = 1;
    blinnPhongData[3] = 1;
    // specularColor
    blinnPhongData[4] = 1;
    blinnPhongData[5] = 1;
    blinnPhongData[6] = 1;
    blinnPhongData[7] = 1;
    // emissiveColor
    blinnPhongData[8] = 0;
    blinnPhongData[9] = 0;
    blinnPhongData[10] = 0;
    blinnPhongData[11] = 1;
    // shininess
    blinnPhongData[12] = 16;
    // normalIntensity
    blinnPhongData[13] = 1;
    // pad1, pad2
    blinnPhongData[14] = 0;
    blinnPhongData[15] = 0;
    shaderData.setFloatArray(BlinnPhongMaterial._blinnPhongProp, blinnPhongData);
  }

  /**
   * @override
   */
  clone(): BlinnPhongMaterial {
    const dest: BlinnPhongMaterial = new BlinnPhongMaterial(this._engine);
    this.cloneTo(dest);
    return dest;
  }
}
