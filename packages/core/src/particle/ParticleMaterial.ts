import { BaseMaterial, BlendMode } from "../material";
import { Engine } from "../Engine";
import { Shader } from "../shader";
import { Vector3 } from "@arche-engine/math";

export enum ColorMode {
  DEFAULT,
  GRADIENT,
  kNumColorMode
}

export class ParticleMaterial extends BaseMaterial {
  private static _particleDataProp = Shader.getPropertyByName("u_particleData");

  // birthGradient, minParticleSize
  // deathGradient, maxParticleSize
  // colorMode, fadeCoefficient, debugDraw, pad
  private _particleData = new Float32Array(12);
  private _birthGradient = new Vector3();
  private _deathGradient = new Vector3();

  get minParticleSize(): number {
    return this._particleData[3];
  }

  set minParticleSize(size: number) {
    this._particleData[3] = size;
    this.shaderData.setFloatArray(ParticleMaterial._particleDataProp, this._particleData);
  }

  get maxParticleSize(): number {
    return this._particleData[7];
  }

  set maxParticleSize(size: number) {
    this._particleData[7] = size;
    this.shaderData.setFloatArray(ParticleMaterial._particleDataProp, this._particleData);
  }

  get colorMode(): ColorMode {
    return this._particleData[8];
  }

  set colorMode(mode: ColorMode) {
    this._particleData[8] = mode;
    this.shaderData.setFloatArray(ParticleMaterial._particleDataProp, this._particleData);
  }

  get birthGradient(): Vector3 {
    return this._birthGradient;
  }

  set birthGradient(gradient: Vector3) {
    if (gradient !== this._birthGradient) {
      gradient.cloneTo(this._birthGradient);
    }
    this._particleData[0] = gradient.x;
    this._particleData[1] = gradient.y;
    this._particleData[2] = gradient.z;
    this.shaderData.setFloatArray(ParticleMaterial._particleDataProp, this._particleData);
  }

  get deathGradient(): Vector3 {
    return this._deathGradient;
  }

  set deathGradient(gradient: Vector3) {
    if (gradient !== this._deathGradient) {
      gradient.cloneTo(this._deathGradient);
    }
    this._particleData[4] = gradient.x;
    this._particleData[5] = gradient.y;
    this._particleData[6] = gradient.z;
    this.shaderData.setFloatArray(ParticleMaterial._particleDataProp, this._particleData);
  }

  get fadeCoefficient(): number {
    return this._particleData[9];
  }

  set fadeCoefficient(coeff: number) {
    this._particleData[9] = coeff;
    this.shaderData.setFloatArray(ParticleMaterial._particleDataProp, this._particleData);
  }

  get debugDraw(): boolean {
    return this._particleData[10] > 0;
  }

  set debugDraw(flag: boolean) {
    this._particleData[10] = flag ? 1 : 0;
    this.shaderData.setFloatArray(ParticleMaterial._particleDataProp, this._particleData);
  }

  /**
   * Create a BaseMaterial instance.
   * @param engine - Engine to which the material belongs
   */
  constructor(engine: Engine) {
    super(engine, Shader.find("particle_instancing"));
    this.colorMode = ColorMode.DEFAULT;

    this.isTransparent = true;
    this.blendMode = BlendMode.Additive;
  }
}
