import {
  BindGroupInfo,
  WGSL,
  WGSLCommonFrag,
  WGSLEncoder,
  WGSLLightFragDefine,
} from "../../shaderlib";
import { Shader, ShaderMacroCollection } from "../../shader";
import { Engine } from "../../Engine";
import { BaseMaterial, BlendMode, RenderFace } from "../../material";

export class WGSLSpriteDebugVertex extends WGSL {
  private readonly _isSpotLight: boolean;
  private _lightFragDefine: WGSLLightFragDefine;
  private _commonVert: WGSLCommonFrag;

  constructor(isSpotLight: boolean) {
    super();
    this._isSpotLight = isSpotLight;
    this._lightFragDefine = new WGSLLightFragDefine();
    this._commonVert = new WGSLCommonFrag("VertexIn");
  }

  compile(macros: ShaderMacroCollection): [string, BindGroupInfo] {
    this._source = "";
    this._bindGroupInfo.clear();
    const inputStructCounter = WGSLEncoder.startCounter();
    const outputStructCounter = WGSLEncoder.startCounter(0);
    {
      const encoder = this.createSourceEncoder(GPUShaderStage.VERTEX);
      this._lightFragDefine.execute(encoder, macros);
      this._commonVert.execute(encoder, macros);

      encoder.addStruct(
        "var<private> pos : array<vec2<f32>, 4> = array<vec2<f32>, 4>(\n" +
          "  vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, 1.0), vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0)\n" +
          ");\n"
      );

      encoder.addBuiltInoutType("VertexIn", "vertex_index", "vertexIndex", "u32");
      encoder.addBuiltInoutType("VertexIn", "instance_index", "instanceIndex", "u32");

      encoder.addBuiltInoutType("VertexOut", "position", "position", "vec4<f32>");
      encoder.addInoutType("VertexOut", 0, "localPos", "vec2<f32>");
      encoder.addInoutType("VertexOut", 1, "color", "vec3<f32>");

      encoder.addRenderEntry([["input", "VertexIn"]], ["output", "VertexOut"], () => {
        let source: string = "";
        source += "output.localPos = pos[input.vertexIndex];\n";
        source += `output.color = ${this._isSpotLight ? "u_spotLight" : "u_pointLight"}[input.instanceIndex].color;\n`;
        source += `let worldPos = vec3<f32>(output.localPos, 0.0) * ${
          this._isSpotLight ? "u_spotLight" : "u_pointLight"
        }[input.instanceIndex].distance * 0.025;\n`;
        source += "\n";
        source += "// Generate a billboarded model view matrix\n";
        source += "var bbModelViewMatrix : mat4x4<f32>;\n";
        source += `bbModelViewMatrix[3] = vec4<f32>(${
          this._isSpotLight ? "u_spotLight" : "u_pointLight"
        }[input.instanceIndex].position, 1.0);\n`;
        source +=
          "bbModelViewMatrix = u_cameraData.u_viewMat * bbModelViewMatrix;\n" +
          "bbModelViewMatrix[0][0] = 1.0;\n" +
          "bbModelViewMatrix[0][1] = 0.0;\n" +
          "bbModelViewMatrix[0][2] = 0.0;\n" +
          "\n" +
          "bbModelViewMatrix[1][0] = 0.0;\n" +
          "bbModelViewMatrix[1][1] = 1.0;\n" +
          "bbModelViewMatrix[1][2] = 0.0;\n" +
          "\n" +
          "bbModelViewMatrix[2][0] = 0.0;\n" +
          "bbModelViewMatrix[2][1] = 0.0;\n" +
          "bbModelViewMatrix[2][2] = 1.0;\n" +
          "\n" +
          "output.position = u_cameraData.u_projMat * bbModelViewMatrix * vec4<f32>(worldPos, 1.0);\n";
        return source;
      });
      encoder.flush();
    }
    WGSLEncoder.endCounter(inputStructCounter);
    WGSLEncoder.endCounter(outputStructCounter);
    return [this._source, this._bindGroupInfo];
  }
}

export class WGSLSpriteDebugFragment extends WGSL {
  compile(macros: ShaderMacroCollection): [string, BindGroupInfo] {
    this._source = "";
    this._bindGroupInfo.clear();
    {
      const encoder = this.createSourceEncoder(GPUShaderStage.FRAGMENT);
      encoder.addInoutType("VertexOut", 0, "localPos", "vec2<f32>");
      encoder.addInoutType("VertexOut", 1, "color", "vec3<f32>");
      encoder.addInoutType("Output", 0, "finalColor", "vec4<f32>");

      encoder.addRenderEntry([["in", "VertexOut"]], ["out", "Output"], () => {
        let source: string = "let distToCenter = length(in.localPos);\n";
        source += "let fade = (1.0 - distToCenter) * (1.0 / (distToCenter * distToCenter));\n";
        source += "out.finalColor = vec4<f32>(in.color * fade, fade);\n";
        return source;
      });
      encoder.flush();
    }
    return [this._source, this._bindGroupInfo];
  }
}

export class SpriteDebugMaterial extends BaseMaterial {
  constructor(engine: Engine, isSpotLight: boolean) {
    super(engine, Shader.find(isSpotLight ? "spotlight_sprite_debug" : "pointlight_sprite_debug"));
    this.renderFace = RenderFace.Double;
    this.isTransparent = true;
    this.blendMode = BlendMode.Additive;
  }
}
