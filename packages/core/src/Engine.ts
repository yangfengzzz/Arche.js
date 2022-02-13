import { Logger, Time } from "./base";
import { WebCanvas } from "./WebCanvas";
import { EngineSettings } from "./EngineSettings";
import { ColorSpace } from "./enums/ColorSpace";
import { Entity } from "./Entity";
import { RenderContext, RenderPass } from "./rendering";
import { ComponentsManager } from "./ComponentsManager";
import { ResourceManager } from "./asset";
import { SceneManager } from "./SceneManager";
import { Scene } from "./Scene";
import { ShaderMacro } from "./shader/ShaderMacro";
import { Shader, ShaderPool } from "./shader";
import { ShaderMacroCollection } from "./shader/ShaderMacroCollection";
import { RenderElement } from "./rendering/RenderElement";
import { ClassPool } from "./rendering/ClassPool";
import { ShaderProgramPool } from "./shader/ShaderProgramPool";
import { LightManager } from "./lighting";
import { ForwardRenderPass } from "./rendering/renderpasses/ForwardRenderPass";

ShaderPool.init();

export class Engine {
  /** @internal */
  static _gammaMacro: ShaderMacro = Shader.getMacroByName("OASIS_COLORSPACE_GAMMA");

  _lightManager: LightManager = new LightManager();
  _componentsManager: ComponentsManager = new ComponentsManager();
  _renderElementPool: ClassPool<RenderElement> = new ClassPool(RenderElement);

  /** @internal */
  _shaderProgramPools: ShaderProgramPool[] = [];
  /** @internal */
  _macroCollection: ShaderMacroCollection = new ShaderMacroCollection();

  protected _canvas: WebCanvas;

  private _settings: EngineSettings = {};
  private _resourceManager: ResourceManager = new ResourceManager(this);
  private _sceneManager: SceneManager = new SceneManager(this);
  private _vSyncCount: number = 1;
  private _targetFrameRate: number = 60;
  private _time: Time = new Time();
  private _isPaused: boolean = true;
  private _requestId: number;
  private _timeoutId: number;
  private _vSyncCounter: number = 1;
  private _targetFrameInterval: number = 1000 / 60;

  private _adapter: GPUAdapter;
  private _device: GPUDevice;
  private _renderContext: RenderContext;

  private _renderPasses: RenderPass[] = [];

  get device(): GPUDevice {
    return this._device;
  }

  get renderContext(): RenderContext {
    return this._renderContext;
  }

  get renderPasses(): RenderPass[] {
    return this._renderPasses;
  }

  get defaultRenderPass(): RenderPass {
    return this._renderPasses[0];
  }

  private _animate = () => {
    if (this._vSyncCount) {
      this._requestId = requestAnimationFrame(this._animate);
      if (this._vSyncCounter++ % this._vSyncCount === 0) {
        this.update();
        this._vSyncCounter = 1;
      }
    } else {
      this._timeoutId = window.setTimeout(this._animate, this._targetFrameInterval);
      this.update();
    }
  };

  /**
   * Settings of Engine.
   */
  get settings(): Readonly<EngineSettings> {
    return this._settings;
  }

  /**
   * The canvas to use for rendering.
   */
  get canvas(): WebCanvas {
    return this._canvas;
  }

  /**
   * Get the resource manager.
   */
  get resourceManager(): ResourceManager {
    return this._resourceManager;
  }

  /**
   * Get the scene manager.
   */
  get sceneManager(): SceneManager {
    return this._sceneManager;
  }

  /**
   * Get the Time class.
   */
  get time(): Time {
    return this._time;
  }

  /**
   * Whether the engine is paused.
   */
  get isPaused(): boolean {
    return this._isPaused;
  }

  /**
   * The number of vertical synchronization means the number of vertical blanking for one frame.
   * @remarks 0 means that the vertical synchronization is turned off.
   */
  get vSyncCount(): number {
    return this._vSyncCount;
  }

  set vSyncCount(value: number) {
    this._vSyncCount = Math.max(0, Math.floor(value));
  }

  /**
   * Set the target frame rate you want to achieve.
   * @remarks
   * It only takes effect when vSyncCount = 0 (ie, vertical synchronization is turned off).
   * The larger the value, the higher the target frame rate, Number.POSITIVE_INFINITY represents the infinite target frame rate.
   */
  get targetFrameRate(): number {
    return this._targetFrameRate;
  }

  set targetFrameRate(value: number) {
    value = Math.max(0.000001, value);
    this._targetFrameRate = value;
    this._targetFrameInterval = 1000 / value;
  }

  constructor(canvas: WebCanvas, settings?: EngineSettings) {
    this._canvas = canvas;

    const colorSpace = settings?.colorSpace || ColorSpace.Linear;
    // colorSpace === ColorSpace.Gamma && this._macroCollection.enable(Engine._gammaMacro);
    this._settings.colorSpace = colorSpace;
  }

  /**
   * Create an entity.
   * @param name - The name of the entity
   * @returns Entity
   */
  createEntity(name?: string): Entity {
    return new Entity(this, name);
  }

  /**
   * Pause the engine.
   */
  pause(): void {
    this._isPaused = true;
    cancelAnimationFrame(this._requestId);
    clearTimeout(this._timeoutId);
  }

  init(): Promise<void> {
    return new Promise<void>((resolve => {
      navigator.gpu.requestAdapter({
        powerPreference: "high-performance"
      }).then((adapter) => {
        this._adapter = adapter;
        this._adapter.requestDevice().then((device) => {
          this._device = device;

          this._renderContext = this._canvas.createRenderContext(this._adapter, this._device);
          this._renderPasses.push(new ForwardRenderPass(this));
          this._sceneManager.activeScene = new Scene(this, "DefaultScene");
          resolve();
        });
      });
    }));
  }

  /**
   * Execution engine loop.
   */
  run(): void {
    if (!this._isPaused) return;
    this._isPaused = false;
    this.time.reset();

    requestAnimationFrame(this._animate);
  }

  /**
   * Destroy engine.
   */
  destroy(): void {
    if (this._sceneManager) {
      // -- cancel animation
      this.pause();

      this._animate = null;

      this._sceneManager._activeScene.destroy();
      this._resourceManager._destroy();
      // If engine destroy, callComponentDestroy() maybe will not call anymore.
      this._componentsManager.callComponentDestroy();
      this._sceneManager = null;
      this._resourceManager = null;

      this._canvas = null;
      this._time = null;
    }
  }

  /**
   * @brief Runs the application for one frame
   */
  update(): void {
    const time = this._time;
    const deltaTime = time.deltaTime;

    time.tick();
    this._renderElementPool.resetPool();

    const scene = this._sceneManager._activeScene;
    const componentsManager = this._componentsManager;
    if (scene) {
      scene._activeCameras.sort((camera1, camera2) => camera1.priority - camera2.priority);

      componentsManager.callScriptOnStart();
      componentsManager.callScriptOnUpdate(deltaTime);
      componentsManager.callAnimationUpdate(deltaTime);
      componentsManager.callScriptOnLateUpdate(deltaTime);

      this._render(scene);
    }
    this._componentsManager.callComponentDestroy();
  }

  _render(scene: Scene): void {
    const cameras = scene._activeCameras;
    const componentsManager = this._componentsManager;
    const deltaTime = this.time.deltaTime;
    componentsManager.callRendererOnUpdate(deltaTime);

    this._lightManager.updateShaderData(scene.shaderData);
    scene._updateShaderData();

    if (cameras.length > 0) {
      for (let i = 0, l = cameras.length; i < l; i++) {
        const camera = cameras[i];
        const cameraEntity = camera.entity;
        if (camera.enabled && cameraEntity.isActiveInHierarchy) {
          componentsManager.callCameraOnBeginRender(camera);

          camera._updateShaderData();
          const commandEncoder = this._device.createCommandEncoder();
          for (let j = 0, n = this._renderPasses.length; j < n; j++) {
            const renderPass = this._renderPasses[j];
            renderPass.draw(scene, camera, commandEncoder);
          }
          this._device.queue.submit([commandEncoder.finish()]);

          componentsManager.callCameraOnEndRender(camera);
        }
      }
    } else {
      Logger.debug("NO active camera.");
    }
  }

  /**
   * @internal
   */
  _getShaderProgramPool(shader: Shader): ShaderProgramPool {
    const index = shader._shaderId;
    const shaderProgramPools = this._shaderProgramPools;
    let pool = shaderProgramPools[index];
    if (!pool) {
      const length = index + 1;
      if (length < shaderProgramPools.length) {
        shaderProgramPools.length = length;
      }
      shaderProgramPools[index] = pool = new ShaderProgramPool();
    }
    return pool;
  }
}
