export { Engine } from "./Engine";
export type { Canvas } from "./Canvas";
export { WebGPUEngine } from "./WebGPUEngine";

export { Scene } from "./Scene";
export { SceneManager } from "./SceneManager";

export { Entity } from "./Entity";
export { Component } from "./Component";
export { Script } from "./Script";
export { Renderer } from "./Renderer";
export { dependencies } from "./ComponentsDependencies";
export { Camera } from "./Camera";
export { Transform } from "./Transform";
export { UpdateFlag } from "./UpdateFlag";
export type { EngineSettings } from "./EngineSettings";

export { request } from "./asset/request";
export { Loader } from "./asset/Loader";
export { ResourceManager, resourceLoader } from "./asset/ResourceManager";
export { AssetPromise, AssetPromiseStatus } from "./asset/AssetPromise";
export type { LoadItem } from "./asset/LoadItem";
export { AssetType } from "./asset/AssetType";
export { RefObject } from "./asset/RefObject";

export * from "./base";

// Lighting
import { Scene } from "./Scene";

export { Background } from "./Background";
export { BackgroundMode } from "./enums/BackgroundMode";
export { CameraClearFlags } from "./enums/CameraClearFlags";
export { ColorSpace } from "./enums/ColorSpace";
export * from "./lighting/index";
export * from "./material/index";
export * from "./texture/index";
export * from "./graphic/index";
export * from "./shaderlib/index";
export * from "./mesh/index";
export * from "./rendering/index";
export * from "./shader/index";
export * from "./Layer";
export * from "./clone/CloneManager";
export * from "./shadow";
