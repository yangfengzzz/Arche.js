import { PointLight } from "./PointLight";
import { SpotLight } from "./SpotLight";
import { DirectLight } from "./DirectLight";
import { Shader, ShaderData, ShaderDataGroup, ShaderProperty } from "../shader";
import { DisorderedArray } from "../DisorderedArray";
import { Buffer } from "../graphic";
import { ComputePass } from "../rendering";
import { Engine } from "../Engine";
import { WGSLUnlitVertex } from "../shaderlib";
import { WGSLClusterDebug } from "./wgsl/WGSLClusterDebug";
import { ShaderStage } from "../webgpu";
import { WGSLClusterBoundsSource, WGSLClusterLightsSource } from "./wgsl/WGSLClusterCompute";
import { Camera } from "../Camera";

export class LightManager {
  private static _pointLightProperty: ShaderProperty = Shader.getPropertyByName("u_pointLight");
  private static _spotLightProperty: ShaderProperty = Shader.getPropertyByName("u_spotLight");
  private static _directLightProperty: ShaderProperty = Shader.getPropertyByName("u_directLight");
  private static _pointLightData: Float32Array = new Float32Array(8);
  private static _spotLightData: Float32Array = new Float32Array(12);
  private static _directLightData: Float32Array = new Float32Array(8);

  static FORWARD_PLUS_ENABLE_MIN_COUNT = 20;
  static TILE_COUNT = [32, 18, 48];
  static TOTAL_TILES = LightManager.TILE_COUNT[0] * LightManager.TILE_COUNT[1] * LightManager.TILE_COUNT[2];

  static WORKGROUP_SIZE = [4, 2, 4];
  static DISPATCH_SIZE = [
    LightManager.TILE_COUNT[0] / LightManager.WORKGROUP_SIZE[0],
    LightManager.TILE_COUNT[1] / LightManager.WORKGROUP_SIZE[1],
    LightManager.TILE_COUNT[2] / LightManager.WORKGROUP_SIZE[2]
  ];

  // Each cluster tracks up to MAX_LIGHTS_PER_CLUSTER light indices (ints) and one light count.
  // This limitation should be able to go away when we have atomic methods in WGSL.
  static MAX_LIGHTS_PER_CLUSTER = 50;
  static CLUSTER_LIGHTS_SIZE =
    12 * LightManager.TOTAL_TILES + 4 * LightManager.MAX_LIGHTS_PER_CLUSTER * LightManager.TOTAL_TILES + 4;

  // proj, inv_proj, outputSize, zNear, zFar, view
  private _forwardPlusUniforms = new Float32Array(16 + 16 + 4 + 16);
  private static _forwardPlusProp = Shader.getPropertyByName("u_cluster_uniform");

  private _clustersBuffer: Buffer; // minAABB, pad, maxAABB, pad
  private static _clustersProp = Shader.getPropertyByName("u_clusters");

  private _clusterLightsBuffer: Buffer;
  private static _clusterLightsProp = Shader.getPropertyByName("u_clusterLights");

  private _shaderData: ShaderData;
  private _clusterBoundsCompute: ComputePass;
  private _clusterLightsCompute: ComputePass;
  private _camera: Camera;
  private _engine: Engine;

  private _pointLights: DisorderedArray<PointLight> = new DisorderedArray();
  private _pointLightDatas: Float32Array;

  private _spotLights: DisorderedArray<SpotLight> = new DisorderedArray();
  private _spotLightDatas: Float32Array;

  private _directLights: DisorderedArray<DirectLight> = new DisorderedArray();
  private _directLightDatas: Float32Array;

  constructor(engine: Engine) {
    this._engine = engine;
    Shader.create(
      "cluster_debug",
      new WGSLUnlitVertex(),
      ShaderStage.VERTEX,
      new WGSLClusterDebug(LightManager.TILE_COUNT, LightManager.MAX_LIGHTS_PER_CLUSTER)
    );

    this._shaderData = new ShaderData(ShaderDataGroup.Compute, engine);
    const sceneShaderData = engine.sceneManager.activeScene.shaderData;
    // Cluster x, y, z size * 32 bytes per cluster.
    this._clustersBuffer = new Buffer(
      engine,
      LightManager.TOTAL_TILES * 32,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    );
    this._shaderData.setBufferFunctor(LightManager._clustersProp, () => {
      return this._clustersBuffer;
    });

    this._clusterLightsBuffer = new Buffer(
      engine,
      LightManager.CLUSTER_LIGHTS_SIZE,
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    );
    sceneShaderData.setBufferFunctor(LightManager._clusterLightsProp, () => {
      return this._clusterLightsBuffer;
    });

    this._clusterBoundsCompute = new ComputePass(
      engine,
      Shader.create(
        "cluster_bounds",
        new WGSLClusterBoundsSource(
          LightManager.TILE_COUNT,
          LightManager.MAX_LIGHTS_PER_CLUSTER,
          LightManager.WORKGROUP_SIZE
        ),
        ShaderStage.COMPUTE
      )
    );
    this._clusterBoundsCompute.attachShaderData(this._shaderData);
    this._clusterBoundsCompute.attachShaderData(sceneShaderData);
    this._clusterBoundsCompute.setDispatchCount(
      LightManager.DISPATCH_SIZE[0],
      LightManager.DISPATCH_SIZE[1],
      LightManager.DISPATCH_SIZE[2]
    );

    this._clusterLightsCompute = new ComputePass(
      engine,
      Shader.create(
        "cluster_lights",
        new WGSLClusterLightsSource(
          LightManager.TILE_COUNT,
          LightManager.MAX_LIGHTS_PER_CLUSTER,
          LightManager.WORKGROUP_SIZE
        ),
        ShaderStage.COMPUTE
      )
    );
    this._clusterLightsCompute.attachShaderData(this._shaderData);
    this._clusterLightsCompute.attachShaderData(sceneShaderData);
    this._clusterLightsCompute.setDispatchCount(
      LightManager.DISPATCH_SIZE[0],
      LightManager.DISPATCH_SIZE[1],
      LightManager.DISPATCH_SIZE[2]
    );
  }

  set camera(camera: Camera) {
    this._camera = camera;
  }

  /**
   * Register a light object to the current scene.
   * @param light render light
   */
  attachPointLight(light: PointLight) {
    light._index = this._pointLights.length;
    this._pointLights.add(light);
  }

  /**
   * Remove a light object from the current scene.
   * @param light render light
   */
  detachPointLight(light: PointLight) {
    const replaced = this._pointLights.deleteByIndex(light._index);
    replaced && (replaced._index = light._index);
    light._index = -1;
  }

  get pointLights(): DisorderedArray<PointLight> {
    return this._pointLights;
  }

  /**
   * Register a light object to the current scene.
   * @param light render light
   */
  attachSpotLight(light: SpotLight) {
    light._index = this._spotLights.length;
    this._spotLights.add(light);
  }

  /**
   * Remove a light object from the current scene.
   * @param light render light
   */
  detachSpotLight(light: SpotLight) {
    const replaced = this._spotLights.deleteByIndex(light._index);
    replaced && (replaced._index = light._index);
    light._index = -1;
  }

  get spotLights(): DisorderedArray<SpotLight> {
    return this._spotLights;
  }

  /**
   * Register a light object to the current scene.
   * @param light direct light
   */
  attachDirectLight(light: DirectLight) {
    light._index = this._directLights.length;
    this._directLights.add(light);
  }

  /**
   * Remove a light object from the current scene.
   * @param light direct light
   */
  detachDirectLight(light: DirectLight) {
    const replaced = this._directLights.deleteByIndex(light._index);
    replaced && (replaced._index = light._index);
    light._index = -1;
  }

  get directLights(): DisorderedArray<DirectLight> {
    return this._directLights;
  }

  updateShaderData(shaderData: ShaderData) {
    const { _pointLights, _spotLights, _directLights } = this;
    const pointLightData = LightManager._pointLightData;
    const pointLightCount = _pointLights.length;
    const spotLightData = LightManager._spotLightData;
    const spotLightCount = _spotLights.length;
    const directLightData = LightManager._directLightData;
    const directLightCount = _directLights.length;

    if (
      this._pointLightDatas === undefined ||
      this._pointLightDatas.length !== pointLightCount * pointLightData.length
    ) {
      this._pointLightDatas = new Float32Array(_pointLights.length * pointLightData.length);
    }
    if (this._spotLightDatas === undefined || this._spotLightDatas.length !== spotLightCount * spotLightData.length) {
      this._spotLightDatas = new Float32Array(_spotLights.length * spotLightData.length);
    }
    if (
      this._directLightDatas == undefined ||
      this._directLightDatas.length !== directLightCount * directLightData.length
    ) {
      this._directLightDatas = new Float32Array(_directLights.length * directLightData.length);
    }

    // point light
    {
      const elements = _pointLights._elements;
      for (let i = pointLightCount - 1; i >= 0; --i) {
        const element = elements[i];
        element._updateShaderData(pointLightData);
        this._pointLightDatas.set(pointLightData, i * pointLightData.length);
      }
    }

    // spotlight
    {
      const elements = _spotLights._elements;
      for (let i = spotLightCount - 1; i >= 0; --i) {
        const element = elements[i];
        element._updateShaderData(spotLightData);
        this._spotLightDatas.set(spotLightData, i * spotLightData.length);
      }
    }

    // direct light
    {
      const elements = _directLights._elements;
      for (let i = directLightCount - 1; i >= 0; --i) {
        const element = elements[i];
        element._updateShaderData(directLightData);
        this._directLightDatas.set(directLightData, i * directLightData.length);
      }
    }

    if (directLightCount) {
      shaderData.enableMacro("DIRECT_LIGHT_COUNT", directLightCount.toString());
      shaderData.setFloatArray(LightManager._directLightProperty, this._directLightDatas);
    } else {
      shaderData.disableMacro("DIRECT_LIGHT_COUNT");
    }

    if (pointLightCount) {
      shaderData.enableMacro("POINT_LIGHT_COUNT", pointLightCount.toString());
      shaderData.setFloatArray(LightManager._pointLightProperty, this._pointLightDatas);
    } else {
      shaderData.disableMacro("POINT_LIGHT_COUNT");
    }

    if (spotLightCount) {
      shaderData.enableMacro("SPOT_LIGHT_COUNT", spotLightCount.toString());
      shaderData.setFloatArray(LightManager._spotLightProperty, this._spotLightDatas);
    } else {
      shaderData.disableMacro("SPOT_LIGHT_COUNT");
    }
  }

  draw(encoder: GPUComputePassEncoder): void {
    const sceneShaderData = this._engine.sceneManager.activeScene.shaderData;
    const camera = this._camera;

    const pointLightCount = this._pointLights.length;
    const spotLightCount = this._spotLights.length;
    if (pointLightCount + spotLightCount > LightManager.FORWARD_PLUS_ENABLE_MIN_COUNT) {
      sceneShaderData.enableMacro("NEED_FORWARD_PLUS");
      let updateBounds = false;

      const projMat = camera.projectionMatrix;
      this._forwardPlusUniforms.set(projMat.elements, 0);
      const invProjMat = camera._getInverseProjectionMatrix();
      this._forwardPlusUniforms.set(invProjMat.elements, 16);

      if (this._forwardPlusUniforms[32] != this._engine.canvas.width) {
        updateBounds = true;
        this._forwardPlusUniforms[32] == this._engine.canvas.width;
      }
      if (this._forwardPlusUniforms[33] != this._engine.canvas.height) {
        updateBounds = true;
        this._forwardPlusUniforms[33] == this._engine.canvas.height;
      }
      this._forwardPlusUniforms[34] = camera.nearClipPlane;
      this._forwardPlusUniforms[35] = camera.farClipPlane;

      const viewMatrix = camera.viewMatrix;
      this._forwardPlusUniforms.set(viewMatrix.elements, 36);
      sceneShaderData.setFloatArray(LightManager._forwardPlusProp, this._forwardPlusUniforms);

      // Reset the light offset counter to 0 before populating the light clusters.
      const empty = new Uint32Array(1);
      empty[0] = 0;
      this._clusterLightsBuffer.uploadData(empty, 0, 0, 1);

      if (updateBounds) {
        this._clusterBoundsCompute.compute(encoder);
      }
      this._clusterLightsCompute.compute(encoder);
    }
  }
}
