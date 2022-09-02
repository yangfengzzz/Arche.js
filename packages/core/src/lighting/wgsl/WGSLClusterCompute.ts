import { BindGroupInfo, WGSL, WGSLEncoder, WGSLLightFragDefine } from "../../shaderlib";
import { ShaderMacroCollection } from "../../shader";
import { ShaderStage } from "../../webgpu";
import { WGSLForwardPlusUniforms } from "./WGSLClusterCommon";

export class WGSLTileFunctions {
  private readonly _tileCount: number[] = [];

  constructor(tileCount: number[]) {
    this._tileCount = tileCount;
  }

  execute(encoder: WGSLEncoder, macros: ShaderMacroCollection) {
    encoder.addStruct(
      `const tileCount : vec3<u32> = vec3<u32>(${this._tileCount[0]}u, ${this._tileCount[1]}u, ${this._tileCount[2]}u);\n`
    );
    const tileFunc =
      "fn linearDepth(depthSample : f32) -> f32 {\n" +
      "  return u_cluster_uniform.zFar * u_cluster_uniform.zNear / fma(depthSample, u_cluster_uniform.zNear - u_cluster_uniform.zFar, u_cluster_uniform.zFar);\n" +
      "}\n" +
      "\n" +
      "fn getTile(fragCoord : vec4<f32>) -> vec3<u32> {\n" +
      "  // TODO: scale and bias calculation can be moved outside the shader to save cycles.\n" +
      "  let sliceScale = f32(tileCount.z) / log2(u_cluster_uniform.zFar / u_cluster_uniform.zNear);\n" +
      "  let sliceBias = -(f32(tileCount.z) * log2(u_cluster_uniform.zNear) / log2(u_cluster_uniform.zFar / u_cluster_uniform.zNear));\n" +
      "  let zTile = u32(max(log2(linearDepth(fragCoord.z)) * sliceScale + sliceBias, 0.0));\n" +
      "\n" +
      "  return vec3<u32>(u32(fragCoord.x / (u_cluster_uniform.outputSize.x / f32(tileCount.x))),\n" +
      "      u32(fragCoord.y / (u_cluster_uniform.outputSize.y / f32(tileCount.y))),\n" +
      "      zTile);\n" +
      "}\n" +
      "\n" +
      "fn getClusterIndex(fragCoord : vec4<f32>) -> u32 {\n" +
      "  let tile = getTile(fragCoord);\n" +
      "  return tile.x +\n" +
      "      tile.y * tileCount.x +\n" +
      "      tile.z * tileCount.x * tileCount.y;\n" +
      "}\n";
    encoder.addFunction(tileFunc);
  }
}

//------------------------------------------------------------------------------
export class WGSLClusterStructs {
  private readonly _totalTiles: number;

  constructor(totalTiles: number) {
    this._totalTiles = totalTiles;
  }

  execute(encoder: WGSLEncoder, macros: ShaderMacroCollection) {
    encoder.addStruct(
      "struct ClusterBounds {\n" +
        "  minAABB : vec3<f32>,\n" +
        "  maxAABB : vec3<f32>,\n" +
        "};\n" +
        "struct Clusters {\n" +
        `  bounds : array<ClusterBounds, ${this._totalTiles}>,\n` +
        "};\n"
    );
  }
}

//------------------------------------------------------------------------------
export class WGSLClusterLightsStructs {
  private readonly _totalTiles: number;
  private readonly _maxLightsPerCluster: number;

  constructor(totalTiles: number, maxLightsPerCluster: number) {
    this._totalTiles = totalTiles;
    this._maxLightsPerCluster = maxLightsPerCluster;
  }

  execute(encoder: WGSLEncoder, macros: ShaderMacroCollection) {
    encoder.addStruct(
      "struct ClusterLights {\n" +
        "  offset : u32,\n" +
        "  point_count : u32,\n" +
        "  spot_count : u32,\n" +
        "};\n" +
        "struct ClusterLightGroup {\n" +
        "  offset : atomic<u32>,\n" +
        `  lights : array<ClusterLights, ${this._totalTiles}>,\n` +
        `  indices : array<u32, ${this._totalTiles * this._maxLightsPerCluster}>,\n` +
        "};\n"
    );
    encoder.addStorageBufferBinding("u_clusterLights", "ClusterLightGroup", false);
  }
}

//------------------------------------------------------------------------------
export class WGSLClusterBoundsSource extends WGSL {
  private readonly _tileCount: number[];
  private readonly _workgroupSize: number[];
  private _forwardPlusUniforms: WGSLForwardPlusUniforms;
  private _clusterStructs: WGSLClusterStructs;

  constructor(tileCount: number[], maxLightsPerCluster: number, workgroupSize: number[]) {
    super();
    this._tileCount = tileCount;
    this._workgroupSize = workgroupSize;

    this._forwardPlusUniforms = new WGSLForwardPlusUniforms();
    this._clusterStructs = new WGSLClusterStructs(tileCount[0] * tileCount[1] * tileCount[2]);
  }

  compile(macros: ShaderMacroCollection): [string, BindGroupInfo] {
    this._source = "";
    this._bindGroupInfo.clear();
    {
      const encoder = this.createSourceEncoder(ShaderStage.COMPUTE);
      this._forwardPlusUniforms.execute(encoder, macros);
      this._clusterStructs.execute(encoder, macros);
      encoder.addStorageBufferBinding("u_clusters", "Clusters", false);
      encoder.addFunction(
        "fn lineIntersectionToZPlane(a : vec3<f32>, b : vec3<f32>, zDistance : f32) -> vec3<f32> {\n" +
          "  let normal = vec3<f32>(0.0, 0.0, 1.0);\n" +
          "  let ab = b - a;\n" +
          "  let t = (zDistance - dot(normal, a)) / dot(normal, ab);\n" +
          "  return a + t * ab;\n" +
          "}\n" +
          "\n" +
          "fn clipToView(clip : vec4<f32>) -> vec4<f32> {\n" +
          "  let view = u_cluster_uniform.inverseMatrix * clip;\n" +
          "  return view / vec4<f32>(view.w, view.w, view.w, view.w);\n" +
          "}\n" +
          "\n" +
          "fn screen2View(screen : vec4<f32>) -> vec4<f32> {\n" +
          "  let texCoord = screen.xy / u_cluster_uniform.outputSize.xy;\n" +
          "  let clip = vec4<f32>(vec2<f32>(texCoord.x, 1.0 - texCoord.y) * 2.0 - vec2<f32>(1.0, 1.0), screen.z, screen.w);\n" +
          "  return clipToView(clip);\n" +
          "}\n"
      );
      encoder.addFunction(
        `const tileCount = vec3<u32>(${this._tileCount[0]}u, ${this._tileCount[1]}u, ${this._tileCount[2]}u);\n`
      );
      encoder.addFunction("const eyePos = vec3<f32>(0.0, 0.0, 0.0);\n");

      encoder.addComputeEntry(
        [this._workgroupSize[0], this._workgroupSize[1], this._workgroupSize[2]],
        () => {
          return (
            "let tileIndex = global_id.x +\n" +
            "    global_id.y * tileCount.x +\n" +
            "    global_id.z * tileCount.x * tileCount.y;\n" +
            "\n" +
            "let tileSize = vec2<f32>(u_cluster_uniform.outputSize.x / f32(tileCount.x),\n" +
            "u_cluster_uniform.outputSize.y / f32(tileCount.y));\n" +
            "\n" +
            "let maxPoint_sS = vec4<f32>(vec2<f32>(f32(global_id.x+1u), f32(global_id.y+1u)) * tileSize, 0.0, 1.0);\n" +
            "let minPoint_sS = vec4<f32>(vec2<f32>(f32(global_id.x), f32(global_id.y)) * tileSize, 0.0, 1.0);\n" +
            "\n" +
            "let maxPoint_vS = screen2View(maxPoint_sS).xyz;\n" +
            "let minPoint_vS = screen2View(minPoint_sS).xyz;\n" +
            "\n" +
            "let tileNear = -u_cluster_uniform.zNear * pow(u_cluster_uniform.zFar/ u_cluster_uniform.zNear, f32(global_id.z)/f32(tileCount.z));\n" +
            "let tileFar = -u_cluster_uniform.zNear * pow(u_cluster_uniform.zFar/ u_cluster_uniform.zNear, f32(global_id.z+1u)/f32(tileCount.z));\n" +
            "\n" +
            "let minPointNear = lineIntersectionToZPlane(eyePos, minPoint_vS, tileNear);\n" +
            "let minPointFar = lineIntersectionToZPlane(eyePos, minPoint_vS, tileFar);\n" +
            "let maxPointNear = lineIntersectionToZPlane(eyePos, maxPoint_vS, tileNear);\n" +
            "let maxPointFar = lineIntersectionToZPlane(eyePos, maxPoint_vS, tileFar);\n" +
            "\n" +
            "u_clusters.bounds[tileIndex].minAABB = min(min(minPointNear, minPointFar),min(maxPointNear, maxPointFar));\n" +
            "u_clusters.bounds[tileIndex].maxAABB = max(max(minPointNear, minPointFar),max(maxPointNear, maxPointFar));\n"
          );
        },
        [["global_id", "global_invocation_id"]]
      );
      encoder.flush();
    }
    return [this._source, this._bindGroupInfo];
  }
}

//------------------------------------------------------------------------------
export class WGSLClusterLightsSource extends WGSL {
  private readonly _tileCount: number[];
  private readonly _workgroupSize: number[];
  private readonly _maxLightsPerCluster: number;
  private _forwardPlusUniforms: WGSLForwardPlusUniforms;
  private _lightFragDefine: WGSLLightFragDefine;
  private _clusterLightsStructs: WGSLClusterLightsStructs;
  private _clusterStructs: WGSLClusterStructs;
  private _tileFunctions: WGSLTileFunctions;

  constructor(tileCount: number[], maxLightsPerCluster: number, workgroupSize: number[]) {
    super();
    this._forwardPlusUniforms = new WGSLForwardPlusUniforms();
    this._lightFragDefine = new WGSLLightFragDefine();
    this._clusterLightsStructs = new WGSLClusterLightsStructs(
      tileCount[0] * tileCount[1] * tileCount[2],
      maxLightsPerCluster
    );
    this._clusterStructs = new WGSLClusterStructs(tileCount[0] * tileCount[1] * tileCount[2]);
    this._tileFunctions = new WGSLTileFunctions(tileCount);
    this._maxLightsPerCluster = maxLightsPerCluster;
    this._tileCount = tileCount;
    this._workgroupSize = workgroupSize;
  }

  compile(macros: ShaderMacroCollection): [string, BindGroupInfo] {
    this._source = "";
    this._bindGroupInfo.clear();
    {
      const encoder = this.createSourceEncoder(ShaderStage.COMPUTE);
      this._forwardPlusUniforms.execute(encoder, macros);
      this._lightFragDefine.execute(encoder, macros);
      this._clusterLightsStructs.execute(encoder, macros);
      this._clusterStructs.execute(encoder, macros);
      encoder.addStorageBufferBinding("u_clusters", "Clusters", false);
      this._tileFunctions.execute(encoder, macros);

      encoder.addFunction(
        "fn sqDistPointAABB(p : vec3<f32>, minAABB : vec3<f32>, maxAABB : vec3<f32>) -> f32 {\n" +
          "  var sqDist = 0.0;\n" +
          "  // const minAABB : vec3<f32> = u_clusters.bounds[tileIndex].minAABB;\n" +
          "  // const maxAABB : vec3<f32> = u_clusters.bounds[tileIndex].maxAABB;\n" +
          "\n" +
          "  // Wait, does this actually work? Just porting code, but it seems suspect?\n" +
          "  for(var i = 0; i < 3; i = i + 1) {\n" +
          "    let v = p[i];\n" +
          "    if(v < minAABB[i]){\n" +
          "      sqDist = sqDist + (minAABB[i] - v) * (minAABB[i] - v);\n" +
          "    }\n" +
          "    if(v > maxAABB[i]){\n" +
          "      sqDist = sqDist + (v - maxAABB[i]) * (v - maxAABB[i]);\n" +
          "    }\n" +
          "  }\n" +
          "\n" +
          "  return sqDist;\n" +
          "}\n"
      );

      encoder.addComputeEntry(
        [this._workgroupSize[0], this._workgroupSize[1], this._workgroupSize[2]],
        () => {
          let source: string = "";
          source +=
            "let tileIndex = global_id.x +\n" +
            "    global_id.y * tileCount.x +\n" +
            "    global_id.z * tileCount.x * tileCount.y;\n" +
            "\n" +
            "var clusterLightCount = 0u;\n";
          source += `var cluserLightIndices : array<u32, ${this._maxLightsPerCluster}>;\n`;
          if (macros.isEnable("POINT_LIGHT_COUNT")) {
            source += `for (var i = 0u; i < ${macros.variableMacros("POINT_LIGHT_COUNT")}u; i = i + 1u) {\n`;
            source +=
              "  let range = u_pointLight[i].distance;\n" +
              "  // Lights without an explicit range affect every cluster, but this is a poor way to handle that.\n" +
              "  var lightInCluster = range <= 0.0;\n" +
              "\n" +
              "  if (!lightInCluster) {\n" +
              "    let lightViewPos = u_cluster_uniform.viewMatrix * vec4<f32>(u_pointLight[i].position, 1.0);\n" +
              "    let sqDist = sqDistPointAABB(lightViewPos.xyz, u_clusters.bounds[tileIndex].minAABB, u_clusters.bounds[tileIndex].maxAABB);\n" +
              "    lightInCluster = sqDist <= (range * range);\n" +
              "  }\n" +
              "\n" +
              "  if (lightInCluster) {\n" +
              "    // Light affects this cluster. Add it to the list.\n" +
              "    cluserLightIndices[clusterLightCount] = i;\n" +
              "    clusterLightCount = clusterLightCount + 1u;\n" +
              "  }\n" +
              "\n";
            source += `  if (clusterLightCount == ${this._maxLightsPerCluster}u) {\n`;
            source += "    break;\n" + "  }\n" + "}\n";
          }

          source += "let pointLightCount = clusterLightCount;\n";

          if (macros.isEnable("SPOT_LIGHT_COUNT")) {
            source += `for (var i = 0u; i < ${macros.variableMacros("SPOT_LIGHT_COUNT")}u; i = i + 1u) {\n`;
            source +=
              "  let range = u_spotLight[i].distance;\n" +
              "  // Lights without an explicit range affect every cluster, but this is a poor way to handle that.\n" +
              "  var lightInCluster = range <= 0.0;\n" +
              "\n" +
              "  if (!lightInCluster) {\n" +
              "    let lightViewPos = u_cluster_uniform.viewMatrix * vec4<f32>(u_spotLight[i].position, 1.0);\n" +
              "    let sqDist = sqDistPointAABB(lightViewPos.xyz, u_clusters.bounds[tileIndex].minAABB, u_clusters.bounds[tileIndex].maxAABB);\n" +
              "    lightInCluster = sqDist <= (range * range);\n" +
              "  }\n" +
              "\n" +
              "  if (lightInCluster) {\n" +
              "    // Light affects this cluster. Add it to the list.\n" +
              "    cluserLightIndices[clusterLightCount] = i;\n" +
              "    clusterLightCount = clusterLightCount + 1u;\n" +
              "  }\n" +
              "\n";
            source += `  if (clusterLightCount == ${this._maxLightsPerCluster}u) {\n`;
            source += "    break;\n" + "  }\n" + "}\n";
          }
          source +=
            "\n" +
            "var offset = atomicAdd(&u_clusterLights.offset, clusterLightCount);\n" +
            "\n" +
            "for(var i = 0u; i < clusterLightCount; i = i + 1u) {\n" +
            "  u_clusterLights.indices[offset + i] = cluserLightIndices[i];\n" +
            "}\n" +
            "u_clusterLights.lights[tileIndex].offset = offset;\n" +
            "u_clusterLights.lights[tileIndex].point_count = pointLightCount;\n" +
            "u_clusterLights.lights[tileIndex].spot_count = clusterLightCount - pointLightCount;\n";
          return source;
        },
        [["global_id", "global_invocation_id"]]
      );
      encoder.flush();
    }
    return [this._source, this._bindGroupInfo];
  }
}
