import { Renderer } from "../Renderer";
import { Entity } from "../Entity";
import { RenderElement } from "../rendering/RenderElement";
import { BoundingBox } from "@arche-engine/math";
import { ignoreClone } from "../clone/CloneManager";
import { SampledTexture3D } from "../texture";
import { BufferMesh } from "../mesh";
import { ParticleMaterial } from "./ParticleMaterial";
import { Shader } from "../shader";
import { Buffer } from "../graphic";
import { VertexAttribute, VertexBufferLayout } from "../webgpu";

enum EmitterType {
  POINT,
  DISK,
  SPHERE,
  BALL,
  kNumEmitterType
}

enum SimulationVolume {
  SPHERE,
  BOX,
  NONE,
  kNumSimulationVolume
}

export class ParticleRenderer extends Renderer {
  static kDefaultSimulationVolumeSize: number = 32.0;
  static kMaxParticleCount: number = 1 << 15;
  static kBatchEmitCount = Math.max(256, ParticleRenderer.kMaxParticleCount >> 4);

  private _numAliveParticles: number = 0;

  private _mesh: BufferMesh;
  private _material: ParticleMaterial;

  private _minValue: number = 0.0;
  private _maxValue: number = 1.0;
  private _randomVec = new Float32Array(256 * 4);
  private static _randomBufferProp = Shader.getPropertyByName("u_randomBuffer");

  private _simulationData = new Float32Array();
  private static _simulationDataProp = Shader.getPropertyByName("u_simulationData");

  private _emitterData = new Float32Array();
  private static _emitterDataProp = Shader.getPropertyByName("u_emitterData");

  private _vectorFieldTexture: SampledTexture3D;
  private static _vectorFieldTextureProp = Shader.getPropertyByName("u_vectorFieldTexture");
  private static _vectorFieldSamplerProp = Shader.getPropertyByName("u_vectorFieldSampler");

  private _read: number = 0;
  private _write: number = 1;
  private _atomicBuffer: [Buffer, Buffer];
  private static _readAtomicBufferProp = Shader.getPropertyByName("u_readAtomicBuffer");
  private static _writeAtomicBufferProp = Shader.getPropertyByName("u_writeAtomicBuffer");

  private _appendConsumeBuffer: [Buffer, Buffer];
  private static _readConsumeBufferProp = Shader.getPropertyByName("u_readConsumeBuffer");
  private static _writeConsumeBufferProp = Shader.getPropertyByName("u_writeConsumeBuffer");

  private _dpBuffer: Buffer;
  private static _dpBufferProp = Shader.getPropertyByName("u_dpBuffer");
  private _sortIndicesBuffer: Buffer;
  private static _sortIndicesBufferProp = Shader.getPropertyByName("u_sortIndicesBuffer");

  /** @internal */
  @ignoreClone
  _index: number = -1;

  get material(): ParticleMaterial {
    return this._material;
  }

  get numAliveParticles(): number {
    return this._numAliveParticles;
  }

  get timeStep(): number {

  }

  set timeStep(step: number) {

  }

  get boundingVolumeType(): SimulationVolume {

  }

  set boundingVolumeType(vol: SimulationVolume) {

  }

  get bboxSize(): number {

  }

  set bboxSize(size: number) {

  }

  get scatteringFactor(): number {

  }

  set scatteringFactor(factor: number) {

  }

  get vectorFieldFactor(): number {

  }

  set vectorFieldFactor(factor: number) {

  }

  get vectorFieldTexture(): SampledTexture3D {

  }

  set vectorFieldTexture(field: SampledTexture3D) {

  }

  get curlNoiseFactor(): number {

  }

  set curlNoiseFactor(factor: number) {

  }

  get curlNoiseScale(): number {

  }

  set curlNoiseScale(scale: number) {

  }

  get velocityFactor(): number {

  }

  set velocityFactor(factor: number) {

  }

  //----------------------------------------------------------------------------
  get emitCount(): number {

  }

  set emitCount(count: number) {

  }

  get emitterType(): EmitterType {

  }

  set emitterType(type: EmitterType) {

  }

  get emitterPosition(): Vector3 {
  }


  set emitterPosition(position: Vector3) {

  }

  get emitterDirection(): Vector3 {

  }

  set emitterDirection(direction: Vector3) {

  }

  get emitterRadius(): number {

  }

  set emitterRadius(radius: number) {

  }

  get particleMinAge(): number {

  }

  set particleMinAge(age: number) {

  }

  get particleMaxAge(): number {

  }

  set particleMaxAge(age: number) {

  }

  constructor(entity: Entity) {
    super(entity);

    this._allocBuffer();

    this._mesh = new BufferMesh(entity.engine);
    this._mesh.addSubMesh(0, 4, "triangle-strip");

    const vertexBufferLayout = new VertexBufferLayout();
    vertexBufferLayout.stepMode = "instance";
    vertexBufferLayout.arrayStride = 48;
    vertexBufferLayout.attributes = [];
    vertexBufferLayout.attributes.push(new VertexAttribute(0, "float32x4", 0));
    vertexBufferLayout.attributes.push(new VertexAttribute(16, "float32x4", 1));
    vertexBufferLayout.attributes.push(new VertexAttribute(32, "float32x4", 2));
    this._mesh.setVertexLayouts([vertexBufferLayout]);

    this._material = new ParticleMaterial(entity.engine);
    this.setMaterial(this._material);
  }

  _render(opaqueQueue: RenderElement[], alphaTestQueue: RenderElement[], transparentQueue: RenderElement[]): void {
    if (this._numAliveParticles > 0) {
      const renderElementPool = this._engine._renderElementPool;
      const element = renderElementPool.getFromPool();
      element.setValue(this, this._mesh, this._mesh.subMesh, this._material);
      transparentQueue.push(element);
    }
  }

  _updateBounds(worldBounds: BoundingBox) {
    worldBounds.min.x = -Number.MAX_VALUE;
    worldBounds.min.y = -Number.MAX_VALUE;
    worldBounds.min.z = -Number.MAX_VALUE;
    worldBounds.max.x = Number.MAX_VALUE;
    worldBounds.max.y = Number.MAX_VALUE;
    worldBounds.max.z = Number.MAX_VALUE;
  }

  update(deltaTime: number): void {
    this.timeStep = deltaTime * this.engine._particleManager.timeStepFactor;
    this._write = 1 - this._write;
    this._read = 1 - this._read;

    // todo
    this._mesh.instanceCount = this._numAliveParticles;
    this._mesh.setVertexBufferBinding(this._appendConsumeBuffer[this._read]);
    this._generateRandomValues();
  }

  _onEnable() {
    super._onEnable();
    this.engine._particleManager.addParticle(this);
  }

  _onDisable() {
    super._onDisable();
    this.engine._particleManager.removeParticle(this);
  }

  private _allocBuffer() {

  }

  private _generateRandomValues() {
    for (let i = 0; i < this._randomVec.length; ++i) {
      this._randomVec[i] = Math.random() * (this._maxValue - this._minValue) + this._minValue;
    }
  }
}
