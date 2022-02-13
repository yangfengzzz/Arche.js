import { Engine } from "../Engine";
import { Shader } from "../shader";
import { PBRBaseMaterial } from "./PBRBaseMaterial";
import { SampledTexture2D } from "../texture";

/**
 * PBR (Metallic-Roughness Workflow) Material.
 */
export class PBRMaterial extends PBRBaseMaterial {
  private static _pbrProp = Shader.getPropertyByName("u_pbrData");
  private static _metallicRoughnessTextureProp = Shader.getPropertyByName("u_metallicRoughnessTexture");
  private static _metallicRoughnessSamplerProp = Shader.getPropertyByName("u_metallicRoughnessSampler");

  // metallic, roughness, _pad1, _pad2
  private _pbrData: Float32Array = new Float32Array(4);
  private _roughnessMetallicTexture: SampledTexture2D;

  /**
   * Metallic.
   */
  get metallic(): number {
    return this._pbrData[0];
  }

  set metallic(value: number) {
    const pbrData = this._pbrData;
    pbrData[0] = value;
    this.shaderData.setFloatArray(PBRMaterial._pbrProp, pbrData);
  }

  /**
   * Roughness.
   */
  get roughness(): number {
    return this._pbrData[1];
  }

  set roughness(value: number) {
    const pbrData = this._pbrData;
    pbrData[1] = value;
    this.shaderData.setFloatArray(PBRMaterial._pbrProp, pbrData);
  }

  /**
   * Roughness metallic texture.
   * @remarks G channel is roughness, B channel is metallic
   */
  get roughnessMetallicTexture(): SampledTexture2D {
    return this._roughnessMetallicTexture;
  }

  set roughnessMetallicTexture(value: SampledTexture2D) {
    this._roughnessMetallicTexture = value;
    this.shaderData.setSampledTexture(PBRMaterial._metallicRoughnessTextureProp, PBRMaterial._metallicRoughnessSamplerProp, value);
    if (value) {
      this.shaderData.enableMacro("HAS_METALROUGHNESSMAP");
    } else {
      this.shaderData.disableMacro("HAS_METALROUGHNESSMAP");
    }
  }

  /**
   * Create a pbr metallic-roughness workflow material instance.
   * @param engine - Engine to which the material belongs
   */
  constructor(engine: Engine) {
    super(engine, Shader.find("pbr"));

    const pbrData = this._pbrData;
    // metallic
    pbrData[0] = 1;
    // roughness
    pbrData[1] = 1;
    // pad1, pad2
    pbrData[2] = 0;
    pbrData[3] = 0;
    this.shaderData.setFloatArray(PBRMaterial._pbrProp, pbrData);
  }

  /**
   * @override
   */
  clone(): PBRMaterial {
    const dest = new PBRMaterial(this._engine);
    this.cloneTo(dest);
    return dest;
  }
}
