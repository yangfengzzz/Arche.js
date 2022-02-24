import { RenderPassDepthStencilAttachment, RenderPassDescriptor } from "../webgpu";
import { RenderPass } from "../rendering";
import { ShadowSubpass } from "./ShadowSubpass";
import { SampledTexture } from "../texture/SampledTexture";
import { ShaderProperty } from "../shader/ShaderProperty";
import { ShadowMaterial } from "./ShadowMaterial";
import { Vector3, Vector4 } from "@arche-engine/math";
import { Engine } from "../Engine";
import { Shader } from "../shader";
import { Scene } from "../Scene";
import { Camera } from "../Camera";

export class ShadowManager extends RenderPass {
  static SHADOW_MAP_CASCADE_COUNT = 4;
  static MAX_SHADOW = 10;
  static MAX_CUBE_SHADOW = 5;
  static SHADOW_MAP_RESOLUTION = 4000;
  static SHADOW_MAP_FORMAT: GPUTextureFormat = "depth32float";

  private _engine: Engine;

  private _renderPassDescriptor: RenderPassDescriptor;
  private _depthStencilAttachment: RenderPassDepthStencilAttachment;

  private _shadowSubpass: ShadowSubpass;

  _cascadeSplitLambda: number = 0.5;

  private static _shadowCount: number;
  private static _shadowMapProp: ShaderProperty = Shader.getPropertyByName("u_shadowMap");
  private static _shadowSamplerProp: ShaderProperty = Shader.getPropertyByName("u_shadowSampler");
  private static _shadowDataProp: ShaderProperty = Shader.getPropertyByName("u_shadowData");
  private _shadowMaps: GPUTexture[] = [];
  private _packedTexture: SampledTexture;
  // ShadowData: bias:number, intensity:number, radius:number, dump:number, vp: Matrix[4], cascadeSplits: Vector4
  private _shadowDatas: Float32Array[] = [];

  private static _cubeShadowCount: number;
  private static _cubeShadowMapProp: ShaderProperty = Shader.getPropertyByName("u_cubeShadowMap");
  private static _cubeShadowSamplerProp: ShaderProperty = Shader.getPropertyByName("u_cubeShadowSampler");
  private static _cubeShadowDataProp: ShaderProperty = Shader.getPropertyByName("u_cubeShadowData");
  private _cubeShadowMaps: GPUTexture[] = [];
  private _packedCubeTexture: SampledTexture;
  // CubeShadowData: bias:number, intensity:number, radius:number, dump:number, vp: Matrix[6], lightPos: Vector4
  private _cubeShadowDatas: Float32Array[] = [];

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
    const { _renderPassDescriptor, _depthStencilAttachment } = this;
    _renderPassDescriptor.depthStencilAttachment = _depthStencilAttachment;
    _depthStencilAttachment.depthLoadOp = "clear";
    _depthStencilAttachment.depthClearValue = 1.0;
    _depthStencilAttachment.depthStoreOp = "store";
    _depthStencilAttachment.stencilLoadOp = "load";
    _depthStencilAttachment.stencilStoreOp = "discard";

    this._shadowSubpass = new ShadowSubpass(this._engine);
    super.addSubpass(this._shadowSubpass);
  }

  draw(scene: Scene, camera: Camera, commandEncoder: GPUCommandEncoder) {
    super.draw(scene, camera, commandEncoder);
  }
}
