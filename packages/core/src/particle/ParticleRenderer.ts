import { Renderer } from "../Renderer";
import { Entity } from "../Entity";
import { RenderElement } from "../rendering/RenderElement";
import { BoundingBox, Vector3 } from "@arche-engine/math";
import { ignoreClone } from "../clone/CloneManager";
import { SampledTexture3D } from "../texture";
import { BufferMesh } from "../mesh";
import { ParticleMaterial } from "./ParticleMaterial";
import { Shader } from "../shader";
import { Buffer } from "../graphic";
import { VertexAttribute, VertexBufferLayout } from "../webgpu";
import { ParticleManager } from "./ParticleManager";

export enum EmitterType {
  POINT,
  DISK,
  SPHERE,
  BALL,
  kNumEmitterType
}

export enum SimulationVolume {
  SPHERE,
  BOX,
  NONE,
  kNumSimulationVolume
}

function closestPowerOfTwo(n: number): number {
  let r = 1;
  for (let i = 0; r < n; r <<= 1) ++i;
  return r;
}

export class ParticleRenderer extends Renderer {
  static kDefaultSimulationVolumeSize: number = 32.0;
  static kMaxParticleCount: number = 1 << 15;
  static kBatchEmitCount = Math.max(256, ParticleRenderer.kMaxParticleCount >> 4);
  static sizeOfParticle = 16 * 3;

  private _numAliveParticles: number = 0;

  private readonly _mesh: BufferMesh;
  private readonly _material: ParticleMaterial;

  private _minValue: number = 0.0;
  private _maxValue: number = 1.0;
  private _randomVec = new Float32Array(256 * 4);
  private static _randomBufferProp = Shader.getPropertyByName("u_randomBuffer");

  // timeStep, boundingVolumeType, bboxSize, scatteringFactor
  // vectorFieldFactor, curlNoiseFactor, curlNoiseScale, velocityFactor
  private _simulationData = new Float32Array(8);
  private static _simulationDataProp = Shader.getPropertyByName("u_simulationData");

  private _emitterPosition = new Vector3();
  private _emitterDirection = new Vector3();
  // emitterPosition, emitCount
  // emitterDirection, emitterType
  // emitterRadius, particleMinAge, particleMaxAge, _pad
  private _emitterData = new Float32Array(12);
  private static _emitterDataProp = Shader.getPropertyByName("u_emitterData");

  private _vectorFieldTexture: SampledTexture3D;
  private static _vectorFieldTextureProp = Shader.getPropertyByName("u_vectorFieldTexture");
  private static _vectorFieldSamplerProp = Shader.getPropertyByName("u_vectorFieldSampler");

  private _read: number = 0;
  private _write: number = 1;
  private _atomicBuffer: [Buffer, Buffer] = [null, null];
  private static _readAtomicBufferProp = Shader.getPropertyByName("u_readAtomicBuffer");
  private static _writeAtomicBufferProp = Shader.getPropertyByName("u_writeAtomicBuffer");

  private _appendConsumeBuffer: [Buffer, Buffer] = [null, null];
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
    return this._simulationData[0];
  }

  set timeStep(step: number) {
    this._simulationData[0] = step;
    this.shaderData.setFloatArray(ParticleRenderer._simulationDataProp, this._simulationData);
  }

  get boundingVolumeType(): SimulationVolume {
    return this._simulationData[1];
  }

  set boundingVolumeType(vol: SimulationVolume) {
    this._simulationData[1] = vol;
    this.shaderData.setFloatArray(ParticleRenderer._simulationDataProp, this._simulationData);
  }

  get bboxSize(): number {
    return this._simulationData[2];
  }

  set bboxSize(size: number) {
    this._simulationData[2] = size;
    this.shaderData.setFloatArray(ParticleRenderer._simulationDataProp, this._simulationData);
  }

  get scatteringFactor(): number {
    return this._simulationData[3];
  }

  set scatteringFactor(factor: number) {
    this._simulationData[3] = factor;
    this.shaderData.setFloatArray(ParticleRenderer._simulationDataProp, this._simulationData);
    this.shaderData.enableMacro("NEED_PARTICLE_SCATTERING");
  }

  get vectorFieldFactor(): number {
    return this._simulationData[4];
  }

  set vectorFieldFactor(factor: number) {
    this._simulationData[4] = factor;
    this.shaderData.setFloatArray(ParticleRenderer._simulationDataProp, this._simulationData);
  }

  get vectorFieldTexture(): SampledTexture3D {
    return this._vectorFieldTexture;
  }

  set vectorFieldTexture(field: SampledTexture3D) {
    this._vectorFieldTexture = field;
    this.shaderData.setSampledTexture(
      ParticleRenderer._vectorFieldTextureProp,
      ParticleRenderer._vectorFieldSamplerProp,
      this._vectorFieldTexture
    );
    this.shaderData.enableMacro("NEED_PARTICLE_VECTOR_FIELD");
  }

  get curlNoiseFactor(): number {
    return this._simulationData[5];
  }

  set curlNoiseFactor(factor: number) {
    this._simulationData[5] = factor;
    this.shaderData.setFloatArray(ParticleRenderer._simulationDataProp, this._simulationData);
    this.shaderData.enableMacro("NEED_PARTICLE_CURL_NOISE");
  }

  get curlNoiseScale(): number {
    return this._simulationData[6];
  }

  set curlNoiseScale(scale: number) {
    this._simulationData[6] = scale;
    this.shaderData.setFloatArray(ParticleRenderer._simulationDataProp, this._simulationData);
    this.shaderData.enableMacro("NEED_PARTICLE_CURL_NOISE");
  }

  get velocityFactor(): number {
    return this._simulationData[7];
  }

  set velocityFactor(factor: number) {
    this._simulationData[7] = factor;
    this.shaderData.setFloatArray(ParticleRenderer._simulationDataProp, this._simulationData);
    this.shaderData.enableMacro("NEED_PARTICLE_VELOCITY_CONTROL");
  }

  //----------------------------------------------------------------------------
  get emitCount(): number {
    return this._emitterData[3];
  }

  set emitCount(count: number) {
    this._numAliveParticles += count;
    this._emitterData[3] = count;
    this.shaderData.setFloatArray(ParticleRenderer._emitterDataProp, this._emitterData);
  }

  get emitterType(): EmitterType {
    return this._emitterData[7];
  }

  set emitterType(type: EmitterType) {
    this._emitterData[7] = type;
    this.shaderData.setFloatArray(ParticleRenderer._emitterDataProp, this._emitterData);
  }

  get emitterPosition(): Vector3 {
    return this._emitterPosition;
  }

  set emitterPosition(position: Vector3) {
    if (position !== this._emitterPosition) {
      this._emitterPosition.copyFrom(position);
    }
    this._emitterData[0] = position.x;
    this._emitterData[1] = position.y;
    this._emitterData[2] = position.z;
    this.shaderData.setFloatArray(ParticleRenderer._emitterDataProp, this._emitterData);
  }

  get emitterDirection(): Vector3 {
    return this._emitterDirection;
  }

  set emitterDirection(direction: Vector3) {
    if (direction !== this._emitterDirection) {
      this._emitterDirection.copyFrom(direction);
    }
    this._emitterData[4] = direction.x;
    this._emitterData[5] = direction.y;
    this._emitterData[6] = direction.z;
    this.shaderData.setFloatArray(ParticleRenderer._emitterDataProp, this._emitterData);
  }

  get emitterRadius(): number {
    return this._emitterData[8];
  }

  set emitterRadius(radius: number) {
    this._emitterData[8] = radius;
    this.shaderData.setFloatArray(ParticleRenderer._emitterDataProp, this._emitterData);
  }

  get particleMinAge(): number {
    return this._emitterData[9];
  }

  set particleMinAge(age: number) {
    this._emitterData[9] = age;
    this.shaderData.setFloatArray(ParticleRenderer._emitterDataProp, this._emitterData);
  }

  get particleMaxAge(): number {
    return this._emitterData[10];
  }

  set particleMaxAge(age: number) {
    this._emitterData[10] = age;
    this.shaderData.setFloatArray(ParticleRenderer._emitterDataProp, this._emitterData);
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
    this.timeStep = (deltaTime / 1000) * this.engine._particleManager.timeStepFactor;
    this._write = 1 - this._write;
    this._read = 1 - this._read;

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
    const engine = this.engine;

    /* Assert than the number of particles will be a factor of threadGroupWidth */
    const numParticles = ParticleManager.floorParticleCount(ParticleRenderer.kMaxParticleCount);
    this.shaderData.enableMacro("PARTICLE_COUNT", numParticles.toString());

    /* Random value buffer */
    this.shaderData.setFloatArray(ParticleRenderer._randomBufferProp, this._randomVec);

    /* Atomic */
    this._atomicBuffer[0] = new Buffer(engine, 4, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
    this._atomicBuffer[1] = new Buffer(engine, 4, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
    this.shaderData.setBufferFunctor(ParticleRenderer._readAtomicBufferProp, () => {
      return this._atomicBuffer[this._read];
    });
    this.shaderData.setBufferFunctor(ParticleRenderer._writeAtomicBufferProp, () => {
      return this._atomicBuffer[this._write];
    });

    /* Append Consume */
    this._appendConsumeBuffer[0] = new Buffer(
      engine,
      ParticleRenderer.sizeOfParticle * numParticles,
      GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX
    );
    this._appendConsumeBuffer[1] = new Buffer(
      engine,
      ParticleRenderer.sizeOfParticle * numParticles,
      GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX
    );
    this.shaderData.setBufferFunctor(ParticleRenderer._readConsumeBufferProp, () => {
      return this._appendConsumeBuffer[this._read];
    });
    this.shaderData.setBufferFunctor(ParticleRenderer._writeConsumeBufferProp, () => {
      return this._appendConsumeBuffer[this._write];
    });

    /* Sort buffers */
    // The parallel nature of the sorting algorithm needs power of two sized buffer.
    const sort_buffer_max_count = closestPowerOfTwo(ParticleRenderer.kMaxParticleCount); //
    this._dpBuffer = new Buffer(engine, 4 * sort_buffer_max_count, GPUBufferUsage.STORAGE);
    this._sortIndicesBuffer = new Buffer(engine, 4 * sort_buffer_max_count * 2, GPUBufferUsage.STORAGE);
    this.shaderData.setBufferFunctor(ParticleRenderer._dpBufferProp, () => {
      return this._dpBuffer;
    });
    this.shaderData.setBufferFunctor(ParticleRenderer._sortIndicesBufferProp, () => {
      return this._sortIndicesBuffer;
    });
  }

  private _generateRandomValues() {
    for (let i = 0; i < this._randomVec.length; ++i) {
      this._randomVec[i] = Math.random() * (this._maxValue - this._minValue) + this._minValue;
    }
    this.shaderData.setFloatArray(ParticleRenderer._randomBufferProp, this._randomVec);
  }
}
