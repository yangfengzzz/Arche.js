import { WGSLEncoder } from "../../shaderlib";
import { ShaderMacroCollection } from "../../shader";

export class WGSLShadowCommon {
  execute(encoder: WGSLEncoder, macros: ShaderMacroCollection) {
    if (macros.isEnable("SHADOW_MAP_COUNT")) {
      const count = macros.variableMacros("SHADOW_MAP_COUNT");
      if (count === "1") {
        let source = "";
        source +=
          "let offsets = array<vec2<f32>, 4>(\n" +
          "    vec2<f32>(0.0, 0.0),\n" +
          "    vec2<f32>(0.5, 0.0),\n" +
          "    vec2<f32>(0.0, 0.5),\n" +
          "    vec2<f32>(0.5, 0.5)\n" +
          ");\n" +
          "\n" +
          "struct ShadowData {\n" +
          "     bias:f32;\n" +
          "     intensity:f32;\n" +
          "     radius:f32;\n" +
          "     dump:f32;\n" +
          "     vp:array<mat4x4<f32>, 4>;\n" +
          "     cascadeSplits:vec4<f32>;\n" +
          "};\n" +
          "\n" +
          "fn textureProj( worldPos:vec3<f32>,  viewPos:vec3<f32>,  off:vec2<f32>,\n" +
          "                u_shadowData: ShadowData, u_shadowMap: texture_depth_2d, u_shadowSampler: sampler_comparison)->f32 {\n" +
          "    // Get cascade index for the current fragment's view position\n" +
          "    var cascadeIndex:i32 = 0;\n" +
          "    var scale:f32 = 1.0;\n" +
          "    if (u_shadowData.cascadeSplits[0] * u_shadowData.cascadeSplits[1] > 0.0) {\n" +
          "        scale = 0.5;\n" +
          "        for(var i:i32 = 0; i < 4 - 1; i = i+1) {\n" +
          "            if(viewPos.z < u_shadowData.cascadeSplits[i]) {\n" +
          "                cascadeIndex = i + 1;\n" +
          "            }\n" +
          "        }\n" +
          "    }\n" +
          "\n" +
          "    var shadowCoord:vec4<f32> = u_shadowData.vp[cascadeIndex] * vec4<f32>(worldPos, 1.0);\n" +
          "    var xy = shadowCoord.xy;\n" +
          "    xy = xy / shadowCoord.w;\n" +
          "    xy = xy * 0.5 + 0.5;\n" +
          "    xy.y = 1.0 - xy.y;\n" +
          "    xy = xy * scale;\n" +
          "    var shadow_sample = textureSampleCompare(u_shadowMap, u_shadowSampler, xy + off + offsets[cascadeIndex], shadowCoord.z / shadowCoord.w);\n" +
          "    return select(1.0, u_shadowData.intensity, shadow_sample < 1.0);\n" +
          "}\n" +
          "\n" +
          "fn filterPCF( worldPos:vec3<f32>,  viewPos:vec3<f32>,\n" +
          "              u_shadowData: ShadowData, u_shadowMap: texture_depth_2d, u_shadowSampler: sampler_comparison)->f32 {\n" +
          "    // Get cascade index for the current fragment's view position\n" +
          "    var cascadeIndex = 0;\n" +
          "    var scale = 1.0;\n" +
          "    if (u_shadowData.cascadeSplits[0] * u_shadowData.cascadeSplits[1] > 0.0) {\n" +
          "        scale = 0.5;\n" +
          "        for(var i = 0; i < 4 - 1; i = i + 1) {\n" +
          "            if(viewPos.z < u_shadowData.cascadeSplits[i]) {\n" +
          "                cascadeIndex = i + 1;\n" +
          "            }\n" +
          "        }\n" +
          "    }\n" +
          "    \n" +
          "    var shadowCoord = u_shadowData.vp[cascadeIndex] * vec4<f32>(worldPos, 1.0);\n" +
          "    var xy = shadowCoord.xy;\n" +
          "    xy = xy / shadowCoord.w;\n" +
          "    xy = xy * 0.5 + 0.5;\n" +
          "    xy.y = 1.0 - xy.y;\n" +
          "    xy = xy * scale;\n" +
          "    \n" +
          "    let neighborWidth = 3.0;\n" +
          "    let neighbors = (neighborWidth * 2.0 + 1.0) * (neighborWidth * 2.0 + 1.0);\n" +
          "    let mapSize = 4096.0;\n" +
          "    let texelSize = 1.0 / mapSize;\n" +
          "    var total = 0.0;\n" +
          "    for (var x = -neighborWidth; x <= neighborWidth; x = x + 1.0) {\n" +
          "        for (var y = -neighborWidth; y <= neighborWidth; y = y + 1.0) {\n" +
          "            var shadow_sample = textureSampleCompare(u_shadowMap, u_shadowSampler, \n" +
          "                                                    xy + vec2<f32>(x, y) * texelSize + offsets[cascadeIndex], \n" +
          "                                                    shadowCoord.z / shadowCoord.w);\n" +
          "            total = total + select(1.0, u_shadowData.intensity, shadow_sample < 1.0);\n" +
          "        }\n" +
          "    }\n" +
          "    return total / neighbors;\n" +
          "}\n" +
          "\n";
        encoder.addStruct(source);
      } else {
        let source = "";
        source +=
          "let offsets = array<vec2<f32>, 4>(\n" +
          "    vec2<f32>(0.0, 0.0),\n" +
          "    vec2<f32>(0.5, 0.0),\n" +
          "    vec2<f32>(0.0, 0.5),\n" +
          "    vec2<f32>(0.5, 0.5)\n" +
          ");\n" +
          "\n" +
          "struct ShadowData {\n" +
          "     bias:f32;\n" +
          "     intensity:f32;\n" +
          "     radius:f32;\n" +
          "     dump:f32;\n" +
          "     vp:array<mat4x4<f32>, 4>;\n" +
          "     cascadeSplits:vec4<f32>;\n" +
          "};\n" +
          "\n" +
          "fn textureProj( worldPos:vec3<f32>,  viewPos:vec3<f32>,  off:vec2<f32>,\n" +
          "                u_shadowData: ShadowData, index: i32,\n" +
          "                u_shadowMap: texture_depth_2d_array, u_shadowSampler: sampler_comparison)->f32 {\n" +
          "    // Get cascade index for the current fragment's view position\n" +
          "    var cascadeIndex:i32 = 0;\n" +
          "    var scale:f32 = 1.0;\n" +
          "    if (u_shadowData.cascadeSplits[0] * u_shadowData.cascadeSplits[1] > 0.0) {\n" +
          "        scale = 0.5;\n" +
          "        for(var i:i32 = 0; i < 4 - 1; i = i+1) {\n" +
          "            if(viewPos.z < u_shadowData.cascadeSplits[i]) {\n" +
          "                cascadeIndex = i + 1;\n" +
          "            }\n" +
          "        }\n" +
          "    }\n" +
          "\n" +
          "    var shadowCoord:vec4<f32> = u_shadowData.vp[cascadeIndex] * vec4<f32>(worldPos, 1.0);\n" +
          "    var xy = shadowCoord.xy;\n" +
          "    xy = xy / shadowCoord.w;\n" +
          "    xy = xy * 0.5 + 0.5;\n" +
          "    xy.y = 1.0 - xy.y;\n" +
          "    xy = xy * scale;\n" +
          "    var shadow_sample = textureSampleCompare(u_shadowMap, u_shadowSampler, xy + off + offsets[cascadeIndex], index, shadowCoord.z / shadowCoord.w);\n" +
          "    return select(1.0, u_shadowData.intensity, shadow_sample < 1.0);\n" +
          "}\n" +
          "\n" +
          "fn filterPCF( worldPos:vec3<f32>,  viewPos:vec3<f32>,\n" +
          "              u_shadowData: ShadowData, index: i32,\n" +
          "              u_shadowMap: texture_depth_2d_array, u_shadowSampler: sampler_comparison)->f32 {\n" +
          "    // Get cascade index for the current fragment's view position\n" +
          "    var cascadeIndex = 0;\n" +
          "    var scale = 1.0;\n" +
          "    if (u_shadowData.cascadeSplits[0] * u_shadowData.cascadeSplits[1] > 0.0) {\n" +
          "        scale = 0.5;\n" +
          "        for(var i = 0; i < 4 - 1; i = i + 1) {\n" +
          "            if(viewPos.z < u_shadowData.cascadeSplits[i]) {\n" +
          "                cascadeIndex = i + 1;\n" +
          "            }\n" +
          "        }\n" +
          "    }\n" +
          "    \n" +
          "    var shadowCoord = u_shadowData.vp[cascadeIndex] * vec4<f32>(worldPos, 1.0);\n" +
          "    var xy = shadowCoord.xy;\n" +
          "    xy = xy / shadowCoord.w;\n" +
          "    xy = xy * 0.5 + 0.5;\n" +
          "    xy.y = 1.0 - xy.y;\n" +
          "    xy = xy * scale;\n" +
          "    \n" +
          "    let neighborWidth = 3.0;\n" +
          "    let neighbors = (neighborWidth * 2.0 + 1.0) * (neighborWidth * 2.0 + 1.0);\n" +
          "    let mapSize = 4096.0;\n" +
          "    let texelSize = 1.0 / mapSize;\n" +
          "    var total = 0.0;\n" +
          "    for (var x = -neighborWidth; x <= neighborWidth; x = x + 1.0) {\n" +
          "        for (var y = -neighborWidth; y <= neighborWidth; y = y + 1.0) {\n" +
          "            var shadow_sample = textureSampleCompare(u_shadowMap, u_shadowSampler, \n" +
          "                                                    xy + vec2<f32>(x, y) * texelSize + offsets[cascadeIndex], \n" +
          "                                                    index, shadowCoord.z / shadowCoord.w);\n" +
          "            total = total + select(1.0, u_shadowData.intensity, shadow_sample < 1.0);\n" +
          "        }\n" +
          "    }\n" +
          "    return total / neighbors;\n" +
          "}\n" +
          "\n";
        encoder.addStruct(source);
      }
    }

    if (macros.isEnable("CUBE_SHADOW_MAP_COUNT")) {
      let source = "";
      source +=
        "struct CubeShadowData {\n" +
        "     bias:f32;\n" +
        "     intensity:f32;\n" +
        "     radius:f32;\n" +
        "     dump:f32;\n" +
        "     vp:array<mat4x4<f32>, 6>;\n" +
        "     lightPos:vec3<f32>;\n" +
        "};\n" +
        "\n" +
        "fn convertUVToDirection( face:i32,  uv:vec2<f32>)->vec3<f32> {\n" +
        "    var u = 2.0 * uv.x - 1.0;\n" +
        "    var v = -2.0 * uv.y + 1.0;\n" +
        "    \n" +
        "    let offsets = array<vec3<f32>, 6>(\n" +
        "        vec3<f32>(1.0, v, -u),\n" +
        "        vec3<f32>(-1.0, v, u),\n" +
        "        vec3<f32>(u, 1.0, -v),\n" +
        "        vec3<f32>(u, -1.0, v),\n" +
        "        vec3<f32>(u, v, 1.0),\n" +
        "        vec3<f32>(-u, v, -1.0),\n" +
        "    );\n" +
        "    return offsets[face];\n" +
        "}\n" +
        "\n" +
        "fn cubeTextureProj( worldPos:vec3<f32>, off:vec2<f32>, u_cubeShadowData: CubeShadowData, index: i32,\n" +
        "                    u_cubeShadowMap: texture_depth_cube_array, u_cubeShadowSampler: sampler_comparison)->f32 {\n" +
        "    var direction = worldPos - u_cubeShadowData.lightPos;\n" +
        "    var scale = 1.0 / max(max(abs(direction.x), abs(direction.y)), abs(direction.z));\n" +
        "    direction = direction * scale;\n" +
        "    var faceIndex = 0;\n" +
        "    if (abs(direction.x - 1.0) < 1.0e-3) {\n" +
        "        faceIndex = 0;\n" +
        "    } else if (abs(direction.x + 1.0) < 1.0e-3) {\n" +
        "        faceIndex = 1;\n" +
        "    }  else if (abs(direction.y - 1.0) < 1.0e-3) {\n" +
        "        faceIndex = 2;\n" +
        "    } else if (abs(direction.y + 1.0) < 1.0e-3) {\n" +
        "        faceIndex = 3;\n" +
        "    } else if (abs(direction.z - 1.0) < 1.0e-3) {\n" +
        "        faceIndex = 4;\n" +
        "    } else if (abs(direction.z + 1.0) < 1.0e-3) {\n" +
        "        faceIndex = 5;\n" +
        "    }\n" +
        "    \n" +
        "    var shadowCoord = u_cubeShadowData.vp[faceIndex] * vec4<f32>(worldPos, 1.0);\n" +
        "    var xy = shadowCoord.xy;\n" +
        "    xy = xy / shadowCoord.w;\n" +
        "    xy = xy * 0.5 + 0.5;\n" +
        "    xy.y = 1.0 - xy.y;\n" +
        "    var dir = convertUVToDirection(faceIndex, xy + off);\n" +
        "    \n" +
        "    var shadow_sample = textureSampleCompare(u_cubeShadowMap, u_cubeShadowSampler, dir, index, shadowCoord.z / shadowCoord.w);\n" +
        "    return select(1.0, u_cubeShadowData.intensity, shadow_sample < 1.0);\n" +
        "}\n" +
        "\n" +
        "fn cubeFilterPCF( worldPos:vec3<f32>,  u_cubeShadowData: CubeShadowData, index: i32,\n" +
        "                  u_cubeShadowMap: texture_depth_cube_array, u_cubeShadowSampler: sampler_comparison)->f32 {\n" +
        "    var direction = worldPos - u_cubeShadowData.lightPos;\n" +
        "    var scale = 1.0 / max(max(abs(direction.x), abs(direction.y)), abs(direction.z));\n" +
        "    direction = direction * scale;\n" +
        "    var faceIndex = 0;\n" +
        "    if (abs(direction.x - 1.0) < 1.0e-3) {\n" +
        "        faceIndex = 0;\n" +
        "    } else if (abs(direction.x + 1.0) < 1.0e-3) {\n" +
        "        faceIndex = 1;\n" +
        "    }  else if (abs(direction.y - 1.0) < 1.0e-3) {\n" +
        "        faceIndex = 2;\n" +
        "    } else if (abs(direction.y + 1.0) < 1.0e-3) {\n" +
        "        faceIndex = 3;\n" +
        "    } else if (abs(direction.z - 1.0) < 1.0e-3) {\n" +
        "        faceIndex = 4;\n" +
        "    } else if (abs(direction.z + 1.0) < 1.0e-3) {\n" +
        "        faceIndex = 5;\n" +
        "    }\n" +
        "    \n" +
        "    var shadowCoord = u_cubeShadowData.vp[faceIndex] * vec4<f32>(worldPos, 1.0);\n" +
        "    var xy = shadowCoord.xy;\n" +
        "    xy = xy / shadowCoord.w;\n" +
        "    xy = xy * 0.5 + 0.5;\n" +
        "    xy.y = 1.0 - xy.y;\n" +
        "    \n" +
        "    let neighborWidth = 3.0;\n" +
        "    let neighbors = (neighborWidth * 2.0 + 1.0) * (neighborWidth * 2.0 + 1.0);\n" +
        "    let mapSize = 4096.0;\n" +
        "    let texelSize = 1.0 / mapSize;\n" +
        "    var total = 0.0;\n" +
        "    for (var x = -neighborWidth; x <= neighborWidth; x = x + 1.0) {\n" +
        "        for (var y = -neighborWidth; y <= neighborWidth; y = y + 1.0) {\n" +
        "            var dir = convertUVToDirection(faceIndex, xy + vec2<f32>(x, y) * texelSize);\n" +
        "            var shadow_sample = textureSampleCompare(u_cubeShadowMap, u_cubeShadowSampler, dir, index, shadowCoord.z / shadowCoord.w);\n" +
        "            total = total + select(1.0, u_cubeShadowData.intensity, shadow_sample < 1.0);\n" +
        "        }\n" +
        "    }\n" +
        "    return total / neighbors;\n" +
        "}";
      encoder.addStruct(source);
    }
  }
}
