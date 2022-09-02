import { BindGroupInfo, WGSL } from "../../shaderlib";
import { WGSLParticleCommon } from "./WGSLParticleCommon";
import { ShaderMacroCollection } from "../../shader";
import { ShaderStage } from "../../webgpu";

export class WGSLParticleEmission extends WGSL {
  private _particleCommon: WGSLParticleCommon;
  private readonly _workgroupSize: number[];

  constructor(workgroupSize: number[]) {
    super();
    this._particleCommon = new WGSLParticleCommon();
    this._workgroupSize = workgroupSize;
  }

  compile(macros: ShaderMacroCollection): [string, BindGroupInfo] {
    this._source = "";
    this._bindGroupInfo.clear();
    {
      const encoder = this.createSourceEncoder(ShaderStage.COMPUTE);
      this._particleCommon.execute(encoder, macros);

      encoder.addStruct(
        "struct ParticleEmitterData {\n" +
          "    emitterPosition: vec3<f32>,\n" +
          "    emitCount: u32,\n" +
          "    emitterDirection: vec3<f32>,\n" +
          "    emitterType: u32,\n" +
          "    emitterRadius: f32,\n" +
          "    particleMinAge: f32,\n" +
          "    particleMaxAge: f32,\n" +
          "    pad: f32 \n" +
          "};\n"
      );
      encoder.addUniformBinding("u_emitterData", "ParticleEmitterData");

      encoder.addStruct("struct Counter {\n" + "counter: atomic<u32>,\n" + "};\n");
      encoder.addStorageBufferBinding("u_readAtomicBuffer", "Counter", false);

      const particleCount = macros.variableMacros("PARTICLE_COUNT");
      encoder.addStorageBufferBinding("u_readConsumeBuffer", `array<TParticle, ${particleCount}>`, false);
      encoder.addUniformBinding("u_randomBuffer", "array<vec4<f32>, 256>");

      encoder.addComputeEntry(
        [this._workgroupSize[0], this._workgroupSize[1], this._workgroupSize[2]],
        () => {
          let source: string = "";
          source += "if (global_id.x < u_emitterData.emitCount) {\n";
          source +=
            " // Random vector.\n" +
            "    let rn = vec3<f32>(u_randomBuffer[global_id.x / 256u].x, u_randomBuffer[global_id.x / 256u].y, u_randomBuffer[global_id.x / 256u].z);\n" +
            "    \n" +
            "    // Position\n" +
            "    var pos = u_emitterData.emitterPosition;\n" +
            "    if (u_emitterData.emitterType == 1u) {\n" +
            "        //pos += disk_distribution(uEmitterRadius, rn.xy);\n" +
            "        pos = pos + disk_even_distribution(u_emitterData.emitterRadius, global_id.x, u_emitterData.emitCount);\n" +
            "    } else if (u_emitterData.emitterType == 2u) {\n" +
            "        pos = pos + sphere_distribution(u_emitterData.emitterRadius, rn.xy);\n" +
            "    } else if (u_emitterData.emitterType == 3u) {\n" +
            "        pos = pos + ball_distribution(u_emitterData.emitterRadius, rn);\n" +
            "    }\n" +
            "    \n" +
            "    // Velocity\n" +
            "    var vel = u_emitterData.emitterDirection;\n" +
            "    \n" +
            "    // Age\n" +
            "    // The age is set by thread groups to assure we have a number of particles\n" +
            "    // factors of groupWidth, this method is safe but prevents continuous emission.\n" +
            "    // const float group_rand = randbuffer[gid];\n" +
            "    // [As the threadgroup are not full, some dead particles might appears if not\n" +
            "    // skipped in following stages].\n" +
            "    \n" +
            "    let age = mix( u_emitterData.particleMinAge, u_emitterData.particleMaxAge, u_randomBuffer[global_id.x / 256u].w);\n" +
            "\n" +
            "    // Emit particle id.\n" +
            "    let id = atomicAdd(&u_readAtomicBuffer.counter, 1u);\n" +
            "    \n" +
            "    var p = TParticle();\n" +
            "    p.position = vec4<f32>(pos, 1.0);\n" +
            "    p.velocity = vec4<f32>(vel, 0.0);\n" +
            "    p.start_age = age;\n" +
            "    p.age = age;\n" +
            "    p.id = id;\n" +
            "    \n" +
            "    u_readConsumeBuffer[id] = p;\n" +
            "}\n";
          return source;
        },
        [["global_id", "global_invocation_id"]]
      );
      encoder.flush();
    }
    return [this._source, this._bindGroupInfo];
  }
}
