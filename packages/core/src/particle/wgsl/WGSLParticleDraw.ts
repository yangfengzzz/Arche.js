import { WGSLParticleCommon } from "./WGSLParticleCommon";
import { BindGroupInfo, WGSL, WGSLCommonFrag, WGSLEncoder } from "../../shaderlib";
import { ShaderMacroCollection } from "../../shader";

export class WGSLParticleDraw extends WGSL {
  protected _drawFunction: string;
  protected _drawStruct: string;

  constructor() {
    super();
    this._drawFunction =
      "// Map a range from [edge0, edge1] to [0, 1].\n" +
      "fn maprange(edge0: f32, edge1: f32, x: f32) -> f32 {\n" +
      "    return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);\n" +
      "}\n" +
      "\n" +
      "// Map a value in [0, 1] to peak at edge.\n" +
      "fn curve_inout(x: f32, edge: f32) -> f32 {\n" +
      "    // Coefficient for sub range.\n" +
      "    let a = maprange(0.0, edge, x);\n" +
      "    let b = maprange(edge, 1.0, x);\n" +
      "    \n" +
      "    // Quadratic ease-in / quadratic ease-out.\n" +
      "    let easein = a * (2.0 - a);        // a * a;\n" +
      "    let easeout = b*b - 2.0 * b + 1.0;  // 1.0f - b * b;\n" +
      "    \n" +
      "    // chose between easin / easout function.\n" +
      "    let result = mix(easein, easeout, step(edge, x));\n" +
      "    \n" +
      "    // Makes particles fade-in and out of existence\n" +
      "    return result;\n" +
      "}\n" +
      "\n" +
      "fn compute_size(z: f32, decay: f32, uMinParticleSize: f32, uMaxParticleSize: f32) -> f32 {\n" +
      "    let min_size = uMinParticleSize;\n" +
      "    let max_size = uMaxParticleSize;\n" +
      "    \n" +
      "    // tricks to 'zoom-in' the pointsprite, just set to 1 to have normal size.\n" +
      "    let depth = (max_size-min_size) / (z);\n" +
      "    \n" +
      "    return mix(min_size, max_size, decay * depth);\n" +
      "}\n" +
      "\n" +
      "\n" +
      "fn base_color(position: vec3<f32>, decay: f32, uColorMode: u32, uBirthGradient: vec3<f32>, uDeathGradient: vec3<f32>) -> vec3<f32> {\n" +
      "    // Gradient mode\n" +
      "    if (uColorMode == 1u) {\n" +
      "        return mix(uBirthGradient, uDeathGradient, decay);\n" +
      "    }\n" +
      "    // Default mode\n" +
      "    return 0.5 * (normalize(position) + 1.0);\n" +
      "}\n" +
      "\n" +
      "fn compute_color(base_color: vec3<f32>, decay: f32, texcoord: vec2<f32>, uFadeCoefficient: f32, uDebugDraw: bool) -> vec4<f32> {\n" +
      "    if (uDebugDraw) {\n" +
      "        return vec4<f32>(1.0);\n" +
      "    }\n" +
      "    \n" +
      "    var color = vec4<f32>(base_color, 1.0);\n" +
      "    \n" +
      "    // Centered coordinates.\n" +
      "    let p = 2.0 * (texcoord - 0.5);\n" +
      "    // Pixel intensity depends on its distance from center.\n" +
      "    let d = 1.0 - abs(dot(p, p));\n" +
      "    \n" +
      "    // Alpha coefficient.\n" +
      "    let alpha = smoothStep(0.0, 1.0, d);\n" +
      "    \n" +
      "    //color = texture(uSpriteSampler2d, texcoord).rrrr;\n" +
      "    color = color * alpha * decay * uFadeCoefficient;\n" +
      "    \n" +
      "    return color;\n" +
      "}";

    this._drawStruct =
      "struct ParticleData {\n" +
      "    birthGradient: vec3<f32>;\n" +
      "    minParticleSize: f32;\n" +
      "    deathGradient: vec3<f32>;\n" +
      "    maxParticleSize: f32;\n" +
      "    colorMode: u32;\n" +
      "    fadeCoefficient: f32;\n" +
      "    debugDraw: f32;\n" +
      "    _pad: f32;\n" +
      "};\n";
  }
}

//------------------------------------------------------------------------------
export class WGSLParticleVertex extends WGSLParticleDraw {
  private _particleCommon: WGSLParticleCommon;
  private _commonFrag: WGSLCommonFrag;

  constructor() {
    super();
    this._particleCommon = new WGSLParticleCommon();
    this._commonFrag = new WGSLCommonFrag("VertexIn");
  }

  compile(macros: ShaderMacroCollection): [string, BindGroupInfo] {
    this._source = "";
    this._bindGroupInfo.clear();
    const inputStructCounter = WGSLEncoder.startCounter();
    const outputStructCounter = WGSLEncoder.startCounter(0);
    {
      const encoder = this.createSourceEncoder(GPUShaderStage.VERTEX);
      this._particleCommon.execute(encoder, macros);
      encoder.addFunction(this._drawFunction);

      encoder.addStruct(
        "var<private> pos : array<vec2<f32>, 4> = array<vec2<f32>, 4>(\n" +
          "  vec2<f32>(-1.0, 1.0), vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, 1.0), vec2<f32>(1.0, -1.0)\n" +
          ");\n"
      );

      encoder.addStruct(this._drawStruct);
      encoder.addUniformBinding("u_particleData", "ParticleData");

      this._commonFrag.execute(encoder, macros);

      encoder.addInoutType("VertexIn", 0, "position", "vec4<f32>");
      encoder.addInoutType("VertexIn", 1, "velocity", "vec4<f32>");
      encoder.addInoutType("VertexIn", 2, "simulation", "vec4<f32>");
      encoder.addBuiltInoutType("VertexIn", "vertex_index", "vertexIndex", "u32");

      encoder.addBuiltInoutType("VertexOut", "position", "position", "vec4<f32>");
      encoder.addInoutType("VertexOut", 0, "uv", "vec2<f32>");
      encoder.addInoutType("VertexOut", 1, "color", "vec3<f32>");
      encoder.addInoutType("VertexOut", 2, "decay", "f32");

      encoder.addRenderEntry([["in", "VertexIn"]], ["out", "VertexOut"], () => {
        let source: string = "";
        source +=
          "    // Time alived in [0, 1].\n" +
          "    let dAge = 1.0 - maprange(0.0, in.simulation.x, in.simulation.y);\n" +
          "    let decay = curve_inout(dAge, 0.55);\n" +
          "    \n" +
          "    out.uv = pos[in.vertexIndex];\n" +
          "    let worldPosApprox = u_cameraData.u_projMat * u_cameraData.u_viewMat * vec4<f32>(in.position.xyz, 1.0);\n" +
          "    let worldPos = vec3<f32>(out.uv, 0.0) * compute_size(worldPosApprox.z/worldPosApprox.w, decay,\n" +
          "                                                         u_particleData.minParticleSize, u_particleData.maxParticleSize) * 0.025;\n" +
          "    \n" +
          "    // Generate a billboarded model view matrix\n" +
          "    var bbModelViewMatrix:mat4x4<f32> = mat4x4<f32>(1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0);\n" +
          "    bbModelViewMatrix[3] = vec4<f32>(in.position.xyz, 1.0);\n" +
          "    bbModelViewMatrix = u_cameraData.u_viewMat * bbModelViewMatrix;\n" +
          "    bbModelViewMatrix[0][0] = 1.0;\n" +
          "    bbModelViewMatrix[0][1] = 0.0;\n" +
          "    bbModelViewMatrix[0][2] = 0.0;\n" +
          "\n" +
          "    bbModelViewMatrix[1][0] = 0.0;\n" +
          "    bbModelViewMatrix[1][1] = 1.0;\n" +
          "    bbModelViewMatrix[1][2] = 0.0;\n" +
          "\n" +
          "    bbModelViewMatrix[2][0] = 0.0;\n" +
          "    bbModelViewMatrix[2][1] = 0.0;\n" +
          "    bbModelViewMatrix[2][2] = 1.0;\n" +
          "    out.position = u_cameraData.u_projMat * bbModelViewMatrix * vec4<f32>(worldPos, 1.0);\n" +
          "    \n" +
          "    // Output parameters.\n" +
          "    out.color = base_color(in.position.xyz, decay,\n" +
          "                           u_particleData.colorMode, u_particleData.birthGradient, u_particleData.deathGradient);\n" +
          "    out.decay = decay;\n";
        return source;
      });
      encoder.flush();
    }
    WGSLEncoder.endCounter(inputStructCounter);
    WGSLEncoder.endCounter(outputStructCounter);
    return [this._source, this._bindGroupInfo];
  }
}

//------------------------------------------------------------------------------
export class WGSLParticleFragment extends WGSLParticleDraw {
  constructor() {
    super();
  }

  compile(macros: ShaderMacroCollection): [string, BindGroupInfo] {
    this._source = "";
    this._bindGroupInfo.clear();
    const inputStructCounter = WGSLEncoder.startCounter(0);
    {
      const encoder = this.createSourceEncoder(GPUShaderStage.FRAGMENT);
      encoder.addFunction(this._drawFunction);
      encoder.addStruct(this._drawStruct);
      encoder.addUniformBinding("u_particleData", "ParticleData");

      encoder.addInoutType("VertexOut", 0, "uv", "vec2<f32>");
      encoder.addInoutType("VertexOut", 1, "color", "vec3<f32>");
      encoder.addInoutType("VertexOut", 2, "decay", "f32");
      encoder.addInoutType("Output", 0, "finalColor", "vec4<f32>");

      encoder.addRenderEntry([["in", "VertexOut"]], ["out", "Output"], () => {
        return "out.finalColor = compute_color(in.color, in.decay, in.uv, u_particleData.fadeCoefficient, bool(u_particleData.debugDraw));\n";
      });
      encoder.flush();
    }
    WGSLEncoder.endCounter(inputStructCounter);
    return [this._source, this._bindGroupInfo];
  }
}
