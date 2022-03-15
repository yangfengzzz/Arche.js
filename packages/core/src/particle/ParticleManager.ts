import { Engine } from "../Engine";
import { ParticleRenderer } from "./ParticleRenderer";
import { DisorderedArray } from "../DisorderedArray";
import { ComputePass } from "../rendering";
import { Shader } from "../shader";

export class ParticleManager {
  static PARTICLES_KERNEL_GROUP_WIDTH = 256;

  static threadsGroupCount(nthreads: number): number {
    return (nthreads + ParticleManager.PARTICLES_KERNEL_GROUP_WIDTH - 1) / ParticleManager.PARTICLES_KERNEL_GROUP_WIDTH;
  }

  static floorParticleCount(nparticles: number): number {
    return ParticleManager.PARTICLES_KERNEL_GROUP_WIDTH * (nparticles / ParticleManager.PARTICLES_KERNEL_GROUP_WIDTH);
  }

  private _particles: DisorderedArray<ParticleRenderer> = new DisorderedArray();
  private _timeStepFactor: number = 1.0;

  private _emitterPass: ComputePass;
  private _simulationPass: ComputePass;

  get timeStepFactor(): number {
    return this._timeStepFactor;
  }

  set timeStepFactor(factor: number) {
    this._timeStepFactor = factor;
  }

  get particles(): ParticleRenderer[] {
    return this._particles._elements;
  }

  constructor(engine: Engine) {
    this._emitterPass = new ComputePass(engine, Shader.find("particle_emission"));
    this._simulationPass = new ComputePass(engine, Shader.find("particle_simulation"));
  }

  addParticle(particle: ParticleRenderer) {
    particle._index = this._particles.length;
    this._particles.add(particle);
  }

  removeParticle(particle: ParticleRenderer) {
    const replaced = this._particles.deleteByIndex(particle._index);
    replaced && (replaced._index = particle._index);
    particle._index = -1;
  }

  draw(passEncoder: GPUComputePassEncoder) {
    const particleCount = this._particles.length;
    const elements = this._particles._elements;
    for (let i = particleCount - 1; i >= 0; --i) {
      const particle = elements[i];
      /* Max number of particles able to be spawned. */
      const num_dead_particles = ParticleRenderer.kMaxParticleCount - particle.numAliveParticles;
      /* Number of particles to be emitted. */
      const emit_count = Math.min(ParticleRenderer.kBatchEmitCount, num_dead_particles); //
      this._emission(emit_count, particle, passEncoder);
      this._simulation(particle, passEncoder);
    }
  }

  private _emission(count: number, particle: ParticleRenderer, passEncoder: GPUComputePassEncoder) {
    /* Emit only if a minimum count is reached. */
    if (!count) {
      return;
    }
    if (count < ParticleRenderer.kBatchEmitCount) {
      //return;
    }
    particle.emitCount = count;

    this._emitterPass.attachShaderData(particle.shaderData);
    const nGroups = ParticleManager.threadsGroupCount(count);
    this._emitterPass.setDispatchCount(nGroups);
    this._emitterPass.compute(passEncoder);
    this._emitterPass.detachShaderData(particle.shaderData);
  }

  private _simulation(particle: ParticleRenderer, passEncoder: GPUComputePassEncoder) {
    if (particle.numAliveParticles == 0) {
      return;
    }

    this._simulationPass.attachShaderData(particle.shaderData);
    const nGroups = ParticleManager.threadsGroupCount(particle.numAliveParticles);
    this._simulationPass.setDispatchCount(nGroups);
    this._simulationPass.compute(passEncoder);
    this._simulationPass.detachShaderData(particle.shaderData);
  }
}
