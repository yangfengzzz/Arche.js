import { ShaderMacroCollection } from "../../shader";
import { LightManager } from "../../lighting";

export class WGSLMobileBlinnphongFrag {
  private readonly _input: string;
  private readonly _output: string;

  constructor(input: string, output: string) {
    this._input = input;
    this._output = output;
  }

  execute(macros: ShaderMacroCollection): string {
    const input = this._input;

    let source = `var N = getNormal(${input}`;
    if (macros.isEnable("HAS_NORMAL_TEXTURE")) {
      source += "u_normalTexture, u_normalSampler, u_blinnPhongData.normalIntensity";
    }
    source += ");\n";

    source += "var lightDiffuse = vec3<f32>( 0.0, 0.0, 0.0 );\n";
    source += "var lightSpecular = vec3<f32>( 0.0, 0.0, 0.0 );\n";

    if (LightManager.enableForwardPlus) {
      source += `let clusterIndex = getClusterIndex(${this._input}.position);\n`;
      source += "let lightOffset  = u_clusterLights.lights[clusterIndex].offset;\n";
    }

    if (macros.isEnable("DIRECT_LIGHT_COUNT")) {
      source += "{\n";
      source += "var i:i32 = 0;\n";
      source += "loop {\n";
      source += `if (i >= ${macros.variableMacros("DIRECT_LIGHT_COUNT")}) { break; }\n`;

      source += "    var d:f32 = max(dot(N, -u_directLight[i].direction), 0.0);\n";
      source += "    lightDiffuse = lightDiffuse + u_directLight[i].color * d;\n";
      source += "\n";
      source += "    var halfDir:vec3<f32> = normalize( V - u_directLight[i].direction );\n";
      source += "    var s:f32 = pow( clamp( dot( N, halfDir ), 0.0, 1.0 ), u_blinnPhongData.shininess );\n";
      source += "    lightSpecular = lightSpecular + u_directLight[i].color * s;\n";

      source += "i = i + 1;\n";
      source += "}\n";
      source += "}\n";
    }

    if (macros.isEnable("POINT_LIGHT_COUNT")) {
      source += "{\n";

      if (LightManager.enableForwardPlus) {
        source += "let lightCount = u_clusterLights.lights[clusterIndex].point_count;\n";
      } else {
        source += `let lightCount = ${macros.variableMacros("POINT_LIGHT_COUNT")}u;\n`;
      }

      source += "var i:u32 = 0;\n";
      source += "loop {\n";
      source += "if (i >= lightCount) { break; }\n";

      if (LightManager.enableForwardPlus) {
        source += "let index = u_clusterLights.indices[lightOffset + i];\n";
      } else {
        source += "let index = i;\n";
      }

      source += `    var direction = ${input}.v_pos - u_pointLight[index].position;\n`;
      source += "    var dist = length( direction );\n";
      source += "    direction = direction / dist;\n";
      source += "    var decay = clamp(1.0 - pow(dist / u_pointLight[index].distance, 4.0), 0.0, 1.0);\n";
      source += "\n";
      source += "    var d =  max( dot( N, -direction ), 0.0 ) * decay;\n";
      source += "    lightDiffuse = lightDiffuse + u_pointLight[index].color * d;\n";
      source += "\n";
      source += "    var halfDir = normalize( V - direction );\n";
      source += "    var s = pow( clamp( dot( N, halfDir ), 0.0, 1.0 ), u_blinnPhongData.shininess )  * decay;\n";
      source += "    lightSpecular = lightSpecular + u_pointLight[index].color * s;\n";

      source += "i = i + 1u;\n";
      source += "}\n";
      source += "}\n";
    }

    if (macros.isEnable("SPOT_LIGHT_COUNT")) {
      source += "{\n";

      if (LightManager.enableForwardPlus) {
        source += "let pointlightCount = u_clusterLights.lights[clusterIndex].point_count;\n";
        source += "let spotlightCount = u_clusterLights.lights[clusterIndex].spot_count;\n";
      } else {
        source += `let spotlightCount = ${macros.variableMacros("SPOT_LIGHT_COUNT")}u;\n`;
      }

      source += "var i:u32 = 0;\n";
      source += "loop {\n";
      source += "if (i >= spotlightCount) { break; }\n";

      if (LightManager.enableForwardPlus) {
        source += "let index = u_clusterLights.indices[lightOffset + i + pointlightCount];\n";
      } else {
        source += "let index = i;\n";
      }

      source += `    var direction = u_spotLight[index].position - ${input}.v_pos;\n`;
      source += "    var lightDistance = length( direction );\n";
      source += "    direction = direction / lightDistance;\n";
      source += "    var angleCos = dot( direction, -u_spotLight[index].direction );\n";
      source += "    var decay = clamp(1.0 - pow(lightDistance/u_spotLight[index].distance, 4.0), 0.0, 1.0);\n";
      source +=
        "    var spotEffect = smoothStep( u_spotLight[index].penumbraCos, u_spotLight[index].angleCos, angleCos );\n";
      source += "    var decayTotal = decay * spotEffect;\n";
      source += "    var d = max( dot( N, direction ), 0.0 )  * decayTotal;\n";
      source += "    lightDiffuse = lightDiffuse + u_spotLight[index].color * d;\n";
      source += "\n";
      source += "    var halfDir = normalize( V + direction );\n";
      source += "    var s = pow( clamp( dot( N, halfDir ), 0.0, 1.0 ), u_blinnPhongData.shininess ) * decayTotal;\n";
      source += "    lightSpecular = lightSpecular + u_spotLight[index].color * s;\n";

      source += "i = i + 1u;\n";
      source += "}\n";
      source += "}\n";
    }

    source += "diffuse = diffuse * vec4<f32>(lightDiffuse, 1.0);\n";
    source += "specular = specular * vec4<f32>(lightSpecular, 1.0);\n";
    if (macros.isEnable("NEED_ALPHA_CUTOFF")) {
      source += "if( diffuse.a < u_alphaCutoff ) {\n";
      source += "    discard;\n";
      source += "}\n";
    }
    return source;
  }
}
