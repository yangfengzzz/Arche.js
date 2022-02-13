import { PointLight } from "./PointLight";
import { SpotLight } from "./SpotLight";
import { ShaderProperty } from "../shader/ShaderProperty";
import { DirectLight } from "./DirectLight";
import { Shader, ShaderData } from "../shader";
import { DisorderedArray } from "../DisorderedArray";

export class LightManager {
  private static _pointLightProperty: ShaderProperty = Shader.getPropertyByName("u_pointLight");
  private static _spotLightProperty: ShaderProperty = Shader.getPropertyByName("u_spotLight");
  private static _directLightProperty: ShaderProperty = Shader.getPropertyByName("u_directLight");
  private static _pointLightData: Float32Array = new Float32Array(8);
  private static _spotLightData: Float32Array = new Float32Array(12);
  private static _directLightData: Float32Array = new Float32Array(8);

  private _pointLights: DisorderedArray<PointLight> = new DisorderedArray();
  private _pointLightDatas: Float32Array;

  private _spotLights: DisorderedArray<SpotLight> = new DisorderedArray();
  private _spotLightDatas: Float32Array;

  private _directLights: DisorderedArray<DirectLight> = new DisorderedArray();
  private _directLightDatas: Float32Array;

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

    if (this._pointLightDatas === undefined || this._pointLightDatas.length !== pointLightCount * pointLightData.length) {
      this._pointLightDatas = new Float32Array(_pointLights.length * pointLightData.length);
    }
    if (this._spotLightDatas === undefined || this._spotLightDatas.length !== spotLightCount * spotLightData.length) {
      this._spotLightDatas = new Float32Array(_spotLights.length * spotLightData.length);
    }
    if (this._directLightDatas == undefined || this._directLightDatas.length !== directLightCount * directLightData.length) {
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
}
