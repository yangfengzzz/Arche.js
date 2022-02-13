import { Color } from "@arche-engine/math";
import { Engine } from "../Engine";
import { Shader } from "../shader";
import { PBRBaseMaterial } from "./PBRBaseMaterial";
import { SampledTexture2D } from "../texture";

/**
 * PBR (Specular-Glossiness Workflow) Material.
 */
export class PBRSpecularMaterial extends PBRBaseMaterial {
  private static _pbrSpecularProp = Shader.getPropertyByName("u_pbrSpecularData");
  private static _specularGlossinessTextureProp = Shader.getPropertyByName("u_specularGlossinessTexture");
  private static _specularGlossinessSamplerProp = Shader.getPropertyByName("u_specularGlossinessSampler");

  // specularColor, glossiness, _pad1, _pad2, _pad3
  private _pbrSpecularData: Float32Array = new Float32Array(8);
  private _specularGlossinessTexture: SampledTexture2D;

  private _specularColor = new Color(1, 1, 1, 1);

  /**
   * Specular color.
   */
  get specularColor(): Color {
    return this._specularColor;
  }

  set specularColor(value: Color) {
    const pbrSpecularData = this._pbrSpecularData;
    pbrSpecularData[0] = value.r;
    pbrSpecularData[1] = value.g;
    pbrSpecularData[2] = value.b;
    pbrSpecularData[3] = value.a;
    this.shaderData.setFloatArray(PBRSpecularMaterial._pbrSpecularProp, pbrSpecularData);

    const specularColor = this._specularColor;
    if (value !== specularColor) {
      value.cloneTo(specularColor);
    }
  }

  /**
   * Glossiness.
   */
  get glossiness(): number {
    return this._pbrSpecularData[4];
  }

  set glossiness(value: number) {
    const pbrSpecularData = this._pbrSpecularData;
    pbrSpecularData[4] = value;
    this.shaderData.setFloatArray(PBRSpecularMaterial._pbrSpecularProp, pbrSpecularData);
  }

  /**
   * Specular glossiness texture.
   * @remarks RGB is specular, A is glossiness
   */
  get specularGlossinessTexture(): SampledTexture2D {
    return this._specularGlossinessTexture;
  }

  set specularGlossinessTexture(value: SampledTexture2D) {
    this._specularGlossinessTexture = value;
    this.shaderData.setSampledTexture(
      PBRSpecularMaterial._specularGlossinessTextureProp,
      PBRSpecularMaterial._specularGlossinessSamplerProp,
      value
    );
    if (value) {
      this.shaderData.enableMacro("HAS_SPECULARGLOSSINESSMAP");
    } else {
      this.shaderData.disableMacro("HAS_SPECULARGLOSSINESSMAP");
    }
  }

  /**
   * Create a pbr specular-glossiness workflow material instance.
   * @param engine - Engine to which the material belongs
   */
  constructor(engine: Engine) {
    super(engine, Shader.find("pbr-specular"));

    const pbrSpecularData = this._pbrSpecularData;
    // specularColor
    pbrSpecularData[0] = 1;
    pbrSpecularData[1] = 1;
    pbrSpecularData[2] = 1;
    pbrSpecularData[3] = 1;
    // glossiness
    pbrSpecularData[4] = 1;
    // pad1, pad2, pad3
    pbrSpecularData[5] = 0;
    pbrSpecularData[6] = 0;
    pbrSpecularData[7] = 0;
    this.shaderData.setFloatArray(PBRSpecularMaterial._pbrSpecularProp, pbrSpecularData);
  }

  /**
   * @override
   */
  clone(): PBRSpecularMaterial {
    const dest = new PBRSpecularMaterial(this._engine);
    this.cloneTo(dest);
    return dest;
  }
}
