import { Extent3DDict, RenderPassDepthStencilAttachment, TextureDescriptor, TextureViewDescriptor } from "../webgpu";
import { RenderPass } from "../rendering";
import { ShadowSubpass } from "./ShadowSubpass";
import { SampledTexture } from "../texture/SampledTexture";
import { ShadowMaterial } from "./ShadowMaterial";
import { Matrix, Vector3, Vector4 } from "@arche-engine/math";
import { Engine } from "../Engine";
import { Shader, ShaderProperty } from "../shader";
import { Scene } from "../Scene";
import { Camera } from "../Camera";
import { DirectLight, PointLight, SpotLight } from "../lighting";
import { SampledTexture2D, SampledTextureCube, TextureUtils } from "../texture";

export class ShadowManager extends RenderPass {
  // ShadowData: bias:number, intensity:number, radius:number, dump:number, vp: Matrix[4], cascadeSplits: Vector4
  private static _shadowData = new Float32Array(72);
  // CubeShadowData: bias:number, intensity:number, radius:number, dump:number, vp: Matrix[6], lightPos: Vector4
  private static _cubeShadowData = new Float32Array(104);

  private static _tempProjMatrix = new Matrix();
  private static _tempViewMatrix = new Matrix();
  private static _tempVector = new Vector3();

  private static _cascadeSplits = new Float32Array(4);
  private static _frustumCorners = [
    new Vector3(-1.0, 1.0, 0.0),
    new Vector3(1.0, 1.0, 0.0),
    new Vector3(1.0, -1.0, 0.0),
    new Vector3(-1.0, -1.0, 0.0),
    new Vector3(-1.0, 1.0, 1.0),
    new Vector3(1.0, 1.0, 1.0),
    new Vector3(1.0, -1.0, 1.0),
    new Vector3(-1.0, -1.0, 1.0)
  ];

  static SHADOW_MAP_CASCADE_COUNT = 4;
  static MAX_SHADOW = 10;
  static MAX_CUBE_SHADOW = 5;
  static SHADOW_MAP_RESOLUTION = 4000;
  static SHADOW_MAP_FORMAT: GPUTextureFormat = "depth32float";

  cascadeSplitLambda: number = 0.5;

  private _engine: Engine;

  private _depthStencilAttachment = new RenderPassDepthStencilAttachment();

  private _shadowSubpass: ShadowSubpass;

  private static _shadowCount: number;
  private static _shadowMapProp: ShaderProperty = Shader.getPropertyByName("u_shadowMap");
  private static _shadowSamplerProp: ShaderProperty = Shader.getPropertyByName("u_shadowSampler");
  private static _shadowDataProp: ShaderProperty = Shader.getPropertyByName("u_shadowData");
  private _shadowMaps: GPUTexture[] = [];
  private _packedTexture: SampledTexture;
  private _shadowDatas: Float32Array = new Float32Array(72 * 10);

  private static _cubeShadowCount: number;
  private static _cubeShadowMapProp: ShaderProperty = Shader.getPropertyByName("u_cubeShadowMap");
  private static _cubeShadowSamplerProp: ShaderProperty = Shader.getPropertyByName("u_cubeShadowSampler");
  private static _cubeShadowDataProp: ShaderProperty = Shader.getPropertyByName("u_cubeShadowData");
  private _cubeShadowMaps: GPUTexture[] = [];
  private _packedCubeTexture: SampledTexture;
  private _cubeShadowDatas: Float32Array = new Float32Array(104 * 5);

  private _numOfdrawCall: number = 0;
  private _materialPool: ShadowMaterial[] = [];

  private _cubeMapDirection: [Vector3, Vector3][] = [
    [new Vector3(10, 0, 0), new Vector3(0, 1, 0)],
    [new Vector3(-10, 0, 0), new Vector3(0, 1, 0)],
    [new Vector3(0, 10, 0), new Vector3(1, 0, 0)],
    [new Vector3(0, -10, 0), new Vector3(1, 0, 0)],
    [new Vector3(0, 0, 10), new Vector3(0, 1, 0)],
    [new Vector3(0, 0, -10), new Vector3(0, 1, 0)]
  ];

  private _viewport: Vector4[] = [
    new Vector4(0, 0, ShadowManager.SHADOW_MAP_RESOLUTION / 2, ShadowManager.SHADOW_MAP_RESOLUTION / 2),
    new Vector4(
      ShadowManager.SHADOW_MAP_RESOLUTION / 2,
      0,
      ShadowManager.SHADOW_MAP_RESOLUTION / 2,
      ShadowManager.SHADOW_MAP_RESOLUTION / 2
    ),
    new Vector4(
      0,
      ShadowManager.SHADOW_MAP_RESOLUTION / 2,
      ShadowManager.SHADOW_MAP_RESOLUTION / 2,
      ShadowManager.SHADOW_MAP_RESOLUTION / 2
    ),
    new Vector4(
      ShadowManager.SHADOW_MAP_RESOLUTION / 2,
      ShadowManager.SHADOW_MAP_RESOLUTION / 2,
      ShadowManager.SHADOW_MAP_RESOLUTION / 2,
      ShadowManager.SHADOW_MAP_RESOLUTION / 2
    )
  ];

  static shadowCount(): number {
    return ShadowManager._shadowCount;
  }

  static cubeShadowCount(): number {
    return ShadowManager._cubeShadowCount;
  }

  constructor(engine: Engine) {
    super();
    this._engine = engine;
    const { renderPassDescriptor, _depthStencilAttachment } = this;
    renderPassDescriptor.depthStencilAttachment = _depthStencilAttachment;
    _depthStencilAttachment.depthLoadOp = "clear";
    _depthStencilAttachment.depthClearValue = 1.0;
    _depthStencilAttachment.depthStoreOp = "store";
    _depthStencilAttachment.stencilLoadOp = "load";
    _depthStencilAttachment.stencilStoreOp = "discard";

    this._shadowSubpass = new ShadowSubpass(this._engine);
    super.addSubpass(this._shadowSubpass);
  }

  draw(scene: Scene, camera: Camera, commandEncoder: GPUCommandEncoder) {
    this._numOfdrawCall = 0;
    ShadowManager._shadowCount = 0;
    this._drawSpotShadowMap(scene, camera, commandEncoder);
    this._drawDirectShadowMap(scene, camera, commandEncoder);
    if (ShadowManager._shadowCount) {
      if (!this._packedTexture || this._packedTexture.depthOrArrayLayers != ShadowManager._shadowCount) {
        this._packedTexture = new SampledTexture2D(
          this._engine,
          ShadowManager.SHADOW_MAP_RESOLUTION,
          ShadowManager.SHADOW_MAP_RESOLUTION,
          ShadowManager._shadowCount,
          ShadowManager.SHADOW_MAP_FORMAT,
          GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
          false
        );
        if (ShadowManager._shadowCount == 1) {
          this._packedTexture.textureViewDimension = "2d";
        } else {
          this._packedTexture.textureViewDimension = "2d-array";
        }
        this._packedTexture.compareFunction = "less";
        this._packedTexture.addressModeU = "clamp-to-edge";
        this._packedTexture.addressModeV = "clamp-to-edge";
      }
      TextureUtils.buildTextureArray(
        this._shadowMaps,
        ShadowManager._shadowCount,
        ShadowManager.SHADOW_MAP_RESOLUTION,
        ShadowManager.SHADOW_MAP_RESOLUTION,
        this._packedTexture.texture,
        commandEncoder
      );

      scene.shaderData.setSampledTexture(
        ShadowManager._shadowMapProp,
        ShadowManager._shadowSamplerProp,
        this._packedTexture
      );
      scene.shaderData.setFloatArray(ShadowManager._shadowDataProp, this._shadowDatas);
    }

    ShadowManager._cubeShadowCount = 0;
    this._drawPointShadowMap(scene, camera, commandEncoder);

    if (ShadowManager._cubeShadowCount) {
      if (!this._packedCubeTexture) {
        this._packedCubeTexture = new SampledTextureCube(
          this._engine,
          ShadowManager.SHADOW_MAP_RESOLUTION,
          ShadowManager.SHADOW_MAP_RESOLUTION,
          ShadowManager._cubeShadowCount,
          ShadowManager.SHADOW_MAP_FORMAT,
          GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
          false
        );
        this._packedCubeTexture.textureViewDimension = "cube-array";
        this._packedCubeTexture.compareFunction = "less";
        this._packedCubeTexture.addressModeU = "clamp-to-edge";
        this._packedCubeTexture.addressModeV = "clamp-to-edge";
      }
      TextureUtils.buildCubeTextureArray(
        this._cubeShadowMaps,
        ShadowManager._cubeShadowCount,
        ShadowManager.SHADOW_MAP_RESOLUTION,
        ShadowManager.SHADOW_MAP_RESOLUTION,
        this._packedCubeTexture.texture,
        commandEncoder
      );

      scene.shaderData.setSampledTexture(
        ShadowManager._cubeShadowMapProp,
        ShadowManager._cubeShadowSamplerProp,
        this._packedCubeTexture
      );
      scene.shaderData.setFloatArray(ShadowManager._cubeShadowDataProp, this._cubeShadowDatas);
    }
  }

  private _drawSpotShadowMap(scene: Scene, camera: Camera, commandEncoder: GPUCommandEncoder) {
    const shadowMaps = this._shadowMaps;
    const materialPool = this._materialPool;
    const shadowDatas = this._shadowDatas;
    const engine = this._engine;

    const lights = engine._lightManager.spotLights._elements;
    for (let i = lights.length - 1; i >= 0; --i) {
      const light = lights[i];
      if (light.enableShadow && ShadowManager._shadowCount < ShadowManager.MAX_SHADOW) {
        ShadowManager._updateSpotShadow(light, ShadowManager._shadowData);
        shadowDatas.set(ShadowManager._shadowData, ShadowManager._shadowCount * ShadowManager._shadowData.length);

        let texture: GPUTexture;
        if (ShadowManager._shadowCount < shadowMaps.length) {
          texture = shadowMaps[ShadowManager._shadowCount];
        } else {
          const descriptor = new TextureDescriptor();
          descriptor.size = new Extent3DDict();
          descriptor.size.width = ShadowManager.SHADOW_MAP_RESOLUTION;
          descriptor.size.height = ShadowManager.SHADOW_MAP_RESOLUTION;
          descriptor.format = ShadowManager.SHADOW_MAP_FORMAT;
          descriptor.usage = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC;
          texture = engine.device.createTexture(descriptor);
          shadowMaps.push(texture);
        }

        this._depthStencilAttachment.view = texture.createView();
        {
          let material: ShadowMaterial;
          if (this._numOfdrawCall < materialPool.length) {
            material = materialPool[this._numOfdrawCall];
          } else {
            material = new ShadowMaterial(engine);
            materialPool.push(material);
          }
          const viewProjectionMatrix = material.viewProjectionMatrix;
          const shadowData = ShadowManager._shadowData;
          viewProjectionMatrix.setValue(
            shadowData[4],
            shadowData[5],
            shadowData[6],
            shadowData[7],
            shadowData[8],
            shadowData[9],
            shadowData[10],
            shadowData[11],
            shadowData[12],
            shadowData[13],
            shadowData[14],
            shadowData[15],
            shadowData[16],
            shadowData[17],
            shadowData[18],
            shadowData[19]
          );
          material.viewProjectionMatrix = viewProjectionMatrix;
          this._shadowSubpass.shadowMaterial = material;
          super.draw(scene, camera, commandEncoder);
          this._numOfdrawCall++;
        }
        ShadowManager._shadowCount++;
      }
    }
  }

  private _drawDirectShadowMap(scene: Scene, camera: Camera, commandEncoder: GPUCommandEncoder) {
    const shadowMaps = this._shadowMaps;
    const materialPool = this._materialPool;
    const shadowDatas = this._shadowDatas;
    const engine = this._engine;

    const lights = engine._lightManager.directLights._elements;
    for (let i = lights.length - 1; i >= 0; --i) {
      const light = lights[i];
      if (light.enableShadow && ShadowManager._shadowCount < ShadowManager.MAX_SHADOW) {
        this._updateCascadesShadow(camera, light, ShadowManager._shadowData);
        shadowDatas.set(ShadowManager._shadowData, ShadowManager._shadowCount * ShadowManager._shadowData.length);

        let texture: GPUTexture;
        if (ShadowManager._shadowCount < shadowMaps.length) {
          texture = shadowMaps[ShadowManager._shadowCount];
        } else {
          const descriptor = new TextureDescriptor();
          descriptor.size = new Extent3DDict();
          descriptor.size.width = ShadowManager.SHADOW_MAP_RESOLUTION;
          descriptor.size.height = ShadowManager.SHADOW_MAP_RESOLUTION;
          descriptor.format = ShadowManager.SHADOW_MAP_FORMAT;
          descriptor.usage = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC;
          texture = engine.device.createTexture(descriptor);
          shadowMaps.push(texture);
        }
        this._depthStencilAttachment.view = texture.createView();

        for (let i = 0; i < ShadowManager.SHADOW_MAP_CASCADE_COUNT; i++) {
          let material: ShadowMaterial;
          if (this._numOfdrawCall < materialPool.length) {
            material = materialPool[this._numOfdrawCall];
          } else {
            material = new ShadowMaterial(engine);
            materialPool.push(material);
          }
          const stride = i * 16;
          const viewProjectionMatrix = material.viewProjectionMatrix;
          const shadowData = ShadowManager._shadowData;
          viewProjectionMatrix.setValue(
            shadowData[4 + stride],
            shadowData[5 + stride],
            shadowData[6 + stride],
            shadowData[7 + stride],
            shadowData[8 + stride],
            shadowData[9 + stride],
            shadowData[10 + stride],
            shadowData[11 + stride],
            shadowData[12 + stride],
            shadowData[13 + stride],
            shadowData[14 + stride],
            shadowData[15 + stride],
            shadowData[16 + stride],
            shadowData[17 + stride],
            shadowData[18 + stride],
            shadowData[19 + stride]
          );
          material.viewProjectionMatrix = viewProjectionMatrix;

          this._shadowSubpass.shadowMaterial = material;

          this._shadowSubpass.viewport = this._viewport[i];
          if (i == 0) {
            this._depthStencilAttachment.depthLoadOp = "clear";
          } else {
            this._depthStencilAttachment.depthLoadOp = "load";
          }
          super.draw(scene, camera, commandEncoder);
          this._numOfdrawCall++;
        }
        ShadowManager._shadowCount++;
      }
    }
    this._depthStencilAttachment.depthLoadOp = "clear";
    this._shadowSubpass.viewport = null;
  }

  private _drawPointShadowMap(scene: Scene, camera: Camera, commandEncoder: GPUCommandEncoder) {
    const cubeShadowMaps = this._cubeShadowMaps;
    const materialPool = this._materialPool;
    const cubeShadowDatas = this._cubeShadowDatas;
    const engine = this._engine;
    const lights = engine._lightManager.pointLights._elements;
    for (let i = lights.length - 1; i >= 0; --i) {
      const light = lights[i];
      if (light.enableShadow && ShadowManager._cubeShadowCount < ShadowManager.MAX_CUBE_SHADOW) {
        let texture: GPUTexture;
        if (ShadowManager._cubeShadowCount < cubeShadowMaps.length) {
          texture = cubeShadowMaps[ShadowManager._cubeShadowCount];
        } else {
          const descriptor = new TextureDescriptor();
          descriptor.size = new Extent3DDict();
          descriptor.size.width = ShadowManager.SHADOW_MAP_RESOLUTION;
          descriptor.size.height = ShadowManager.SHADOW_MAP_RESOLUTION;
          descriptor.size.depthOrArrayLayers = 6;
          descriptor.format = ShadowManager.SHADOW_MAP_FORMAT;
          descriptor.usage = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC;
          texture = engine.device.createTexture(descriptor);
          cubeShadowMaps.push(texture);
        }

        this._updatePointShadow(light, ShadowManager._cubeShadowData);
        cubeShadowDatas.set(
          ShadowManager._cubeShadowData,
          ShadowManager._cubeShadowData.length * ShadowManager._cubeShadowCount
        );

        const descriptor = new TextureViewDescriptor();
        descriptor.format = ShadowManager.SHADOW_MAP_FORMAT;
        descriptor.dimension = "2d";
        descriptor.arrayLayerCount = 1;
        for (let i = 0; i < 6; i++) {
          descriptor.baseArrayLayer = i;
          this._depthStencilAttachment.view = texture.createView(descriptor);

          let material: ShadowMaterial;
          if (this._numOfdrawCall < materialPool.length) {
            material = materialPool[this._numOfdrawCall];
          } else {
            material = new ShadowMaterial(engine);
            materialPool.push(material);
          }
          const stride = i * 16;
          const viewProjectionMatrix = material.viewProjectionMatrix;
          const shadowData = ShadowManager._cubeShadowData;
          viewProjectionMatrix.setValue(
            shadowData[4 + stride],
            shadowData[5 + stride],
            shadowData[6 + stride],
            shadowData[7 + stride],
            shadowData[8 + stride],
            shadowData[9 + stride],
            shadowData[10 + stride],
            shadowData[11 + stride],
            shadowData[12 + stride],
            shadowData[13 + stride],
            shadowData[14 + stride],
            shadowData[15 + stride],
            shadowData[16 + stride],
            shadowData[17 + stride],
            shadowData[18 + stride],
            shadowData[19 + stride]
          );
          material.viewProjectionMatrix = viewProjectionMatrix;

          this._shadowSubpass.shadowMaterial = material;
          super.draw(scene, camera, commandEncoder);
          this._numOfdrawCall++;
        }
        ShadowManager._cubeShadowCount++;
      }
    }
  }

  private static _updateSpotShadow(light: SpotLight, shadowData: Float32Array) {
    const viewMatrix = ShadowManager._tempViewMatrix;
    shadowData[0] = light.shadowRadius;
    shadowData[1] = light.shadowBias;
    shadowData[2] = light.shadowIntensity;

    const projMatrix = light.shadowProjectionMatrix();
    Matrix.invert(light.entity.transform.worldMatrix, viewMatrix);
    Matrix.multiply(projMatrix, viewMatrix, viewMatrix);
    shadowData.set(viewMatrix.elements, 4);
    shadowData[68] = 1;
    shadowData[69] = -1; // mark cascade with negative sign
  }

  private _updatePointShadow(light: PointLight, shadowData: Float32Array) {
    const viewMatrix = ShadowManager._tempViewMatrix;
    const vector = ShadowManager._tempVector;
    const cubeMapDirection = this._cubeMapDirection;
    shadowData[0] = light.shadowRadius;
    shadowData[1] = light.shadowBias;
    shadowData[2] = light.shadowIntensity;

    const worldPos = light.entity.transform.worldPosition;
    const projMatrix = light.shadowProjectionMatrix();
    for (let i = 0; i < 6; i++) {
      Vector3.add(worldPos, cubeMapDirection[i][0], vector);
      light.entity.transform.lookAt(vector, cubeMapDirection[i][1]);
      Matrix.invert(light.entity.transform.worldMatrix, viewMatrix);
      Matrix.multiply(projMatrix, viewMatrix, viewMatrix);
      shadowData.set(viewMatrix.elements, 4 + 16 * i);
    }
    shadowData[100] = worldPos.x;
    shadowData[101] = worldPos.y;
    shadowData[102] = worldPos.z;
    shadowData[103] = 1.0;
  }

  private _updateCascadesShadow(camera: Camera, light: DirectLight, shadowData: Float32Array) {
    const viewMatrix = ShadowManager._tempViewMatrix;
    const projMatrix = ShadowManager._tempProjMatrix;
    const vector = ShadowManager._tempVector;
    const { SHADOW_MAP_CASCADE_COUNT } = ShadowManager;
    const cascadeSplits = ShadowManager._cascadeSplits;
    const cascadeSplitLambda = this.cascadeSplitLambda;

    shadowData[0] = light.shadowRadius;
    shadowData[1] = light.shadowBias;
    shadowData[2] = light.shadowIntensity;

    const worldPos = light.entity.transform.worldPosition;

    const nearClip = camera.nearClipPlane;
    const farClip = camera.farClipPlane;
    const clipRange = farClip - nearClip;

    const minZ = nearClip;
    const maxZ = nearClip + clipRange;

    const range = maxZ - minZ;
    const ratio = maxZ / minZ;

    // Calculate split depths based on view camera frustum
    // Based on method presented in https://developer.nvidia.com/gpugems/GPUGems3/gpugems3_ch10.html
    for (let i = 0; i < SHADOW_MAP_CASCADE_COUNT; i++) {
      const p = (i + 1) / SHADOW_MAP_CASCADE_COUNT;
      const log = minZ * Math.pow(ratio, p);
      const uniform = minZ + range * p;
      const d = cascadeSplitLambda * (log - uniform) + uniform;
      cascadeSplits[i] = (d - nearClip) / clipRange;
    }

    const frustumCorners = [
      new Vector3(-1.0, 1.0, 0.0),
      new Vector3(1.0, 1.0, 0.0),
      new Vector3(1.0, -1.0, 0.0),
      new Vector3(-1.0, -1.0, 0.0),
      new Vector3(-1.0, 1.0, 1.0),
      new Vector3(1.0, 1.0, 1.0),
      new Vector3(1.0, -1.0, 1.0),
      new Vector3(-1.0, -1.0, 1.0)
    ];

    // Project frustum corners into world space
    Matrix.multiply(camera.projectionMatrix, camera.viewMatrix, viewMatrix);
    const invCam = viewMatrix.invert();
    for (let i = 0; i < 8; i++) {
      Vector3.transformCoordinate(frustumCorners[i], invCam, frustumCorners[i]);
    }

    // Calculate orthographic projection matrix for each cascade
    let lastSplitDist = 0.0;
    for (let i = 0; i < SHADOW_MAP_CASCADE_COUNT; i++) {
      const splitDist = cascadeSplits[i];
      const _frustumCorners = ShadowManager._frustumCorners;
      for (let i = 0; i < 4; i++) {
        Vector3.subtract(frustumCorners[i + 4], frustumCorners[i], vector);
        frustumCorners[i].cloneTo(_frustumCorners[i + 4]);
        _frustumCorners[i + 4].add(vector.scale(splitDist));

        frustumCorners[i].cloneTo(_frustumCorners[i]);
        _frustumCorners[i].add(vector.scale(lastSplitDist / splitDist));
      }

      const lightMat = light.entity.transform.worldMatrix;
      Matrix.invert(lightMat, viewMatrix);
      for (let i = 0; i < 8; i++) {
        Vector3.transformCoordinate(_frustumCorners[i], viewMatrix, _frustumCorners[i]);
      }
      const farDist = Vector3.distance(_frustumCorners[7], _frustumCorners[5]);
      const crossDist = Vector3.distance(_frustumCorners[7], _frustumCorners[1]);
      const maxDist = farDist > crossDist ? farDist : crossDist;

      let minX = Number.MAX_VALUE;
      let maxX = Number.MIN_VALUE;
      let minY = Number.MAX_VALUE;
      let maxY = Number.MIN_VALUE;
      let minZ = Number.MAX_VALUE;
      let maxZ = Number.MIN_VALUE;
      for (let i = 0; i < 8; i++) {
        minX = Math.min(minX, _frustumCorners[i].x);
        maxX = Math.max(maxX, _frustumCorners[i].x);
        minY = Math.min(minY, _frustumCorners[i].y);
        maxY = Math.max(maxY, _frustumCorners[i].y);
        minZ = Math.min(minZ, _frustumCorners[i].z);
        maxZ = Math.max(maxZ, _frustumCorners[i].z);
      }

      // texel tile
      const fWorldUnitsPerTexel = maxDist / 1000;
      let posX = (minX + maxX) * 0.5;
      posX /= fWorldUnitsPerTexel;
      posX = Math.floor(posX);
      posX *= fWorldUnitsPerTexel;

      let posY = (minY + maxY) * 0.5;
      posY /= fWorldUnitsPerTexel;
      posY = Math.floor(posY);
      posY *= fWorldUnitsPerTexel;

      let posZ = maxZ;
      posZ /= fWorldUnitsPerTexel;
      posZ = Math.floor(posZ);
      posZ *= fWorldUnitsPerTexel;

      vector.setValue(posX, posY, posZ);
      Vector3.transformCoordinate(vector, lightMat, vector);
      light.entity.transform.worldPosition = vector;

      const radius = maxDist / 2.0;
      Matrix.ortho(-radius, radius, -radius, radius, 0, maxZ - minZ, projMatrix);

      // Store split distance and matrix in cascade
      Matrix.invert(light.entity.transform.worldMatrix, viewMatrix);
      Matrix.multiply(projMatrix, viewMatrix, viewMatrix);
      shadowData.set(viewMatrix.elements, 4 + 16 * i);
      shadowData[68 + i] = (camera.nearClipPlane + splitDist * clipRange) * -1.0;
      light.entity.transform.worldPosition = worldPos;
      lastSplitDist = cascadeSplits[i];
    }
  }
}
