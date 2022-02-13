import { Color, Vector4 } from "@oasis-engine/math";
import { Shader } from "../shader";
import { BaseMaterial } from "./BaseMaterial";
import { SampledTexture2D } from "../texture/SampledTexture2D";
import { Engine } from "../Engine";

/**
 * Unlit Material.
 */
export class UnlitMaterial extends BaseMaterial {
  private static _baseColorProp = Shader.getPropertyByName("u_baseColor");
  private static _baseTextureProp = Shader.getPropertyByName("u_baseTexture");
  private static _baseSamplerProp = Shader.getPropertyByName("u_baseSampler");

  private _baseColor = new Color(1, 1, 1, 1);
  private _baseTexture: SampledTexture2D;

  /**
   * Base color.
   */
  get baseColor(): Color {
    return this._baseColor;
  }

  set baseColor(value: Color) {
    const baseColor = this._baseColor;
    if (value !== baseColor) {
      value.cloneTo(baseColor);
    }
    this.shaderData.setColor(UnlitMaterial._baseColorProp, baseColor);
  }

  /**
   * Base texture.
   */
  get baseTexture(): SampledTexture2D {
    return this._baseTexture;
  }

  set baseTexture(value: SampledTexture2D) {
    this._baseTexture = value;
    this.shaderData.setSampledTexture(UnlitMaterial._baseTextureProp, UnlitMaterial._baseSamplerProp, value);
    if (value) {
      this.shaderData.enableMacro("HAS_BASE_TEXTURE");
    } else {
      this.shaderData.disableMacro("HAS_BASE_TEXTURE");
    }
  }

  /**
   * Create a unlit material instance.
   * @param engine - Engine to which the material belongs
   */
  constructor(engine: Engine) {
    super(engine, Shader.find("unlit"));

    const shaderData = this.shaderData;
    shaderData.enableMacro("OMIT_NORMAL");

    shaderData.setColor(UnlitMaterial._baseColorProp, new Color(1, 1, 1, 1));
  }

  /**
   * @override
   */
  clone(): UnlitMaterial {
    const dest = new UnlitMaterial(this._engine);
    this.cloneTo(dest);
    return dest;
  }
}
