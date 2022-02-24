import { Color, SphericalHarmonics3 } from "@arche-engine/math";
import { Scene } from "../Scene";
import { Shader, ShaderProperty } from "../shader";
import { ShaderMacro } from "../shader/ShaderMacro";
import { DiffuseMode } from "./enums/DiffuseMode";
import { SampledTexture } from "../texture/SampledTexture";

/**
 * Ambient light.
 */
export class AmbientLight {
  private static _shMacro: ShaderMacro = Shader.getMacroByName("HAS_SH");
  private static _specularMacro: ShaderMacro = Shader.getMacroByName("HAS_SPECULAR_ENV");
  private static _diffuseMacro: ShaderMacro = Shader.getMacroByName("HAS_DIFFUSE_ENV");
  private static _decodeRGBMMacro: ShaderMacro = Shader.getMacroByName("O3_DECODE_ENV_RGBM");

  private static _diffuseSHProperty: ShaderProperty = Shader.getPropertyByName("u_env_sh");
  private static _envMapProperty: ShaderProperty = Shader.getPropertyByName("u_envMapLight");

  private static _specularTextureProperty: ShaderProperty = Shader.getPropertyByName("u_env_specularTexture");
  private static _specularSamplerProperty: ShaderProperty = Shader.getPropertyByName("u_env_specularSampler");
  private static _diffuseTextureProperty: ShaderProperty = Shader.getPropertyByName("u_env_diffuseTexture");
  private static _diffuseSamplerProperty: ShaderProperty = Shader.getPropertyByName("u_env_diffuseSampler");

  private _diffuseMode: DiffuseMode = DiffuseMode.SolidColor;
  private _scene: Scene;

  // diffuse, mipMapLevel, diffuseIntensity, specularIntensity, _pad1, _pad2
  private _envMapLight: Float32Array = new Float32Array(8);
  private _diffuseSolidColor: Color = new Color(0.212, 0.227, 0.259);

  private _diffuseSphericalHarmonics: SphericalHarmonics3;
  private _shArray: Float32Array = new Float32Array(27);

  private _diffuseTexture: SampledTexture;

  private _specularTextureDecodeRGBM: boolean = false;
  private _specularReflection: SampledTexture;

  /**
   * Diffuse mode of ambient light.
   */
  get diffuseMode(): DiffuseMode {
    return this._diffuseMode;
  }

  set diffuseMode(value: DiffuseMode) {
    this._diffuseMode = value;
    if (!this._scene) return;

    if (value === DiffuseMode.SphericalHarmonics) {
      this._scene.shaderData.enableMacro(AmbientLight._shMacro);
    } else {
      this._scene.shaderData.disableMacro(AmbientLight._shMacro);
    }
  }

  /**
   * Diffuse reflection solid color.
   * @remarks Effective when diffuse reflection mode is `DiffuseMode.SolidColor`.
   */
  get diffuseSolidColor(): Color {
    return this._diffuseSolidColor;
  }

  set diffuseSolidColor(value: Color) {
    const envMapLight = this._envMapLight;
    if (value !== this._diffuseSolidColor) {
      value.cloneTo(this._diffuseSolidColor);
    }
    envMapLight[0] = value.r;
    envMapLight[1] = value.g;
    envMapLight[2] = value.b;
    this._scene.shaderData.setFloatArray(AmbientLight._envMapProperty, envMapLight);
  }

  /**
   * Diffuse reflection intensity.
   */
  get diffuseIntensity(): number {
    return this._envMapLight[4];
  }

  set diffuseIntensity(value: number) {
    const envMapLight = this._envMapLight;
    envMapLight[4] = value;
    if (!this._scene) return;
    this._scene.shaderData.setFloatArray(AmbientLight._envMapProperty, envMapLight);
  }

  /**
   * Diffuse reflection spherical harmonics 3.
   * @remarks Effective when diffuse reflection mode is `DiffuseMode.SphericalHarmonics`.
   */
  get diffuseSphericalHarmonics(): SphericalHarmonics3 {
    return this._diffuseSphericalHarmonics;
  }

  set diffuseSphericalHarmonics(value: SphericalHarmonics3) {
    this._diffuseSphericalHarmonics = value;
    if (!this._scene) return;

    if (value) {
      this._scene.shaderData.setFloatArray(
        AmbientLight._diffuseSHProperty,
        AmbientLight._preComputeSH(value, this._shArray)
      );
    }
  }

  /**
   * Diffuse reflection texture.
   * @remarks This texture must be baked from MetalLoader::createIrradianceTexture
   */
  get diffuseTexture(): SampledTexture {
    return this._diffuseTexture;
  }

  set diffuseTexture(value: SampledTexture) {
    this._diffuseTexture = value;
    if (!this._scene) return;

    const shaderData = this._scene.shaderData;

    if (value) {
      shaderData.setSampledTexture(
        AmbientLight._diffuseTextureProperty,
        AmbientLight._diffuseSamplerProperty,
        this._diffuseTexture
      );
      shaderData.enableMacro(AmbientLight._diffuseMacro);
    } else {
      shaderData.disableMacro(AmbientLight._diffuseMacro);
    }
  }

  /**
   * Whether to decode from specularTexture with RGBM format.
   */
  get specularTextureDecodeRGBM(): boolean {
    return this._specularTextureDecodeRGBM;
  }

  set specularTextureDecodeRGBM(value: boolean) {
    this._specularTextureDecodeRGBM = value;
    if (!this._scene) return;

    if (value) {
      this._scene.shaderData.enableMacro(AmbientLight._decodeRGBMMacro);
    } else {
      this._scene.shaderData.disableMacro(AmbientLight._decodeRGBMMacro);
    }
  }

  /**
   * Specular reflection texture.
   * @remarks This texture must be baked from @arche-engine/baker
   */
  get specularTexture(): SampledTexture {
    return this._specularReflection;
  }

  set specularTexture(value: SampledTexture) {
    this._specularReflection = value;
    if (!this._scene) return;

    const shaderData = this._scene.shaderData;

    if (value) {
      shaderData.setSampledTexture(AmbientLight._specularTextureProperty, AmbientLight._specularSamplerProperty, value);
      const envMapLight = this._envMapLight;
      envMapLight[3] = this._specularReflection.mipmapCount - 1;
      this._scene.shaderData.setFloatArray(AmbientLight._envMapProperty, envMapLight);

      shaderData.enableMacro(AmbientLight._specularMacro);
    } else {
      shaderData.disableMacro(AmbientLight._specularMacro);
    }
  }

  /**
   * Specular reflection intensity.
   */
  get specularIntensity(): number {
    return this._envMapLight[5];
  }

  set specularIntensity(value: number) {
    const envMapLight = this._envMapLight;
    envMapLight[5] = value;
    if (!this._scene) return;

    this._scene.shaderData.setFloatArray(AmbientLight._envMapProperty, envMapLight);
  }

  /**
   * @internal
   */
  _setScene(value: Scene) {
    this._scene = value;
    if (!value) return;

    const envMapLight = this._envMapLight;
    envMapLight[0] = 0.212;
    envMapLight[1] = 0.227;
    envMapLight[2] = 0.259;
    envMapLight[3] = 0; // mipmap
    envMapLight[4] = 1; // diffuseIntensity
    envMapLight[5] = 1; // specularIntensity
    const { shaderData } = value;
    shaderData.setFloatArray(AmbientLight._envMapProperty, envMapLight);

    this.diffuseMode = this._diffuseMode;
    this.diffuseSphericalHarmonics = this._diffuseSphericalHarmonics;
    this.specularTexture = this._specularReflection;
    this.specularTextureDecodeRGBM = this._specularTextureDecodeRGBM;
  }

  private static _preComputeSH(sh: SphericalHarmonics3, out: Float32Array): Float32Array {
    /**
     * Basis constants
     *
     * 0: 1/2 * Math.sqrt(1 / Math.PI)
     *
     * 1: -1/2 * Math.sqrt(3 / Math.PI)
     * 2: 1/2 * Math.sqrt(3 / Math.PI)
     * 3: -1/2 * Math.sqrt(3 / Math.PI)
     *
     * 4: 1/2 * Math.sqrt(15 / Math.PI)
     * 5: -1/2 * Math.sqrt(15 / Math.PI)
     * 6: 1/4 * Math.sqrt(5 / Math.PI)
     * 7: -1/2 * Math.sqrt(15 / Math.PI)
     * 8: 1/4 * Math.sqrt(15 / Math.PI)
     */

    /**
     * Convolution kernel
     *
     * 0: Math.PI
     * 1: (2 * Math.PI) / 3
     * 2: Math.PI / 4
     */

    const src = sh.coefficients;

    // l0
    out[0] = src[0] * 0.886227; // kernel0 * basis0 = 0.886227
    out[1] = src[1] * 0.886227;
    out[2] = src[2] * 0.886227;

    // l1
    out[3] = src[3] * -1.023327; // kernel1 * basis1 = -1.023327;
    out[4] = src[4] * -1.023327;
    out[5] = src[5] * -1.023327;
    out[6] = src[6] * 1.023327; // kernel1 * basis2 = 1.023327
    out[7] = src[7] * 1.023327;
    out[8] = src[8] * 1.023327;
    out[9] = src[9] * -1.023327; // kernel1 * basis3 = -1.023327
    out[10] = src[10] * -1.023327;
    out[11] = src[11] * -1.023327;

    // l2
    out[12] = src[12] * 0.858086; // kernel2 * basis4 = 0.858086
    out[13] = src[13] * 0.858086;
    out[14] = src[14] * 0.858086;
    out[15] = src[15] * -0.858086; // kernel2 * basis5 = -0.858086
    out[16] = src[16] * -0.858086;
    out[17] = src[17] * -0.858086;
    out[18] = src[18] * 0.247708; // kernel2 * basis6 = 0.247708
    out[19] = src[19] * 0.247708;
    out[20] = src[20] * 0.247708;
    out[21] = src[21] * -0.858086; // kernel2 * basis7 = -0.858086
    out[22] = src[22] * -0.858086;
    out[23] = src[23] * -0.858086;
    out[24] = src[24] * 0.429042; // kernel2 * basis8 = 0.429042
    out[25] = src[25] * 0.429042;
    out[26] = src[26] * 0.429042;

    return out;
  }
}
