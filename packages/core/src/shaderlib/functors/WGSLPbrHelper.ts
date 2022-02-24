import { WGSLEncoder } from "../WGSLEncoder";
import { WGSLNormalGet } from "./WGSLNormalGet";
import { WGSLBRDF } from "./WGSLBRDF";
import { WGSLDirectIrradianceFragDefine } from "./WGSLDirectIrradianceFragDefine";
import { WGSLIBLFragDefine } from "./WGSLIBLFragDefine";
import { ShaderMacroCollection } from "../../shader/ShaderMacroCollection";

export class WGSLPbrHelper {
  private readonly _outputStructName: string;
  private readonly _is_metallic_workflow: boolean;
  private _paramName: string;

  private _normalGet: WGSLNormalGet;
  private _brdf: WGSLBRDF;
  private _directIrradianceFragDefine: WGSLDirectIrradianceFragDefine;
  private _iblFragDefine: WGSLIBLFragDefine;

  set paramName(name: string) {
    this._paramName = name;
  }

  get paramName(): string {
    return this._paramName;
  }

  constructor(outputStructName: string, is_metallic_workflow: boolean) {
    this._outputStructName = outputStructName;
    this._is_metallic_workflow = is_metallic_workflow;
  }

  execute(encoder: WGSLEncoder, macros: ShaderMacroCollection, counterIndex: number) {
    this._normalGet.execute(encoder, macros, counterIndex);

    encoder.addFunction("fn pow2(x: f32)->f32 {\n" + "    return x * x;\n" + "}\n");
    encoder.addFunction(
      "fn BRDF_Diffuse_Lambert(diffuseColor: vec3<f32>)->vec3<f32> {\n" +
        "    return RECIPROCAL_PI * diffuseColor;\n" +
        "}\n"
    );
    encoder.addFunction(
      "fn computeSpecularOcclusion(ambientOcclusion: f32, roughness: f32, dotNV: f32)->f32 {\n" +
        "    return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );\n" +
        "}\n"
    );

    const is_metallic_workflow = this._is_metallic_workflow;
    let getPhysicalMaterial = "fn getPhysicalMaterial(\n";
    getPhysicalMaterial += "     diffuseColor: vec4<f32>,\n";
    if (is_metallic_workflow) {
      getPhysicalMaterial += "     metal: f32,\n";
      getPhysicalMaterial += "     roughness: f32,\n";
    } else {
      getPhysicalMaterial += "     specularColor: vec3<f32>,\n";
      getPhysicalMaterial += "     glossiness: f32,\n";
    }
    getPhysicalMaterial += "     alphaCutoff: f32,\n";
    if (macros.isEnable("HAS_BASE_COLORMAP")) {
      getPhysicalMaterial += "     v_uv: vec2<f32>,\n";
      getPhysicalMaterial += "     u_baseColorTexture: texture_2d<f32>,\n";
      getPhysicalMaterial += "     u_baseColorSampler: sampler,\n";
    }
    if (macros.isEnable("HAS_VERTEXCOLOR")) {
      getPhysicalMaterial += "     v_color: vec4<f32>,\n";
    }
    if (macros.isEnable("HAS_METALROUGHNESSMAP") && is_metallic_workflow) {
      getPhysicalMaterial += "     u_metallicRoughnessTexture: texture_2d<f32>,\n";
      getPhysicalMaterial += "     u_metallicRoughnessSampler: sampler,\n";
    }
    if (macros.isEnable("HAS_SPECULARGLOSSINESSMAP") && !is_metallic_workflow) {
      getPhysicalMaterial += "     u_specularGlossinessTexture: texture_2d<f32>,\n";
      getPhysicalMaterial += "     u_specularGlossinessSampler: sampler,\n";
    }
    getPhysicalMaterial += "    )-> PhysicalMaterial {\n";
    getPhysicalMaterial += "        var material: PhysicalMaterial;\n";
    getPhysicalMaterial += "        var diffuseColorUpdate = diffuseColor;\n";
    if (macros.isEnable("HAS_BASE_COLORMAP")) {
      getPhysicalMaterial += "var baseColor = textureSample(u_baseColorTexture, u_baseColorSampler, v_uv);\n";
      getPhysicalMaterial += "diffuseColorUpdate = diffuseColorUpdate * baseColor;\n";
    }
    if (macros.isEnable("HAS_VERTEXCOLOR")) {
      getPhysicalMaterial += "diffuseColorUpdate = diffuseColorUpdate * v_color;\n";
    }
    if (macros.isEnable("NEED_ALPHA_CUTOFF")) {
      getPhysicalMaterial += "if( diffuseColorUpdate.a < alphaCutoff ) {\n";
      getPhysicalMaterial += "    discard;\n";
      getPhysicalMaterial += "}\n";
    }
    if (macros.isEnable("HAS_METALROUGHNESSMAP") && is_metallic_workflow) {
      getPhysicalMaterial +=
        "var metalRoughMapColor = textureSample(u_metallicRoughnessTexture, u_metallicRoughnessSampler, v_uv );\n";
      getPhysicalMaterial += "roughness = roughness * metalRoughMapColor.g;\n";
      getPhysicalMaterial += "metal = metal * metalRoughMapColor.b;\n";
    }
    if (macros.isEnable("HAS_SPECULARGLOSSINESSMAP") && !is_metallic_workflow) {
      getPhysicalMaterial +=
        "var specularGlossinessColor = textureSample(u_specularGlossinessTexture, u_specularGlossinessSampler, v_uv );\n";
      getPhysicalMaterial += "specularColor = specularColor * specularGlossinessColor.rgb;\n";
      getPhysicalMaterial += "glossiness = glossiness * specularGlossinessColor.a;\n";
    }

    if (is_metallic_workflow) {
      getPhysicalMaterial += "material.diffuseColor = diffuseColorUpdate.rgb * ( 1.0 - metal );\n";
      getPhysicalMaterial += "material.specularColor = mix( vec3<f32>( 0.04), diffuseColorUpdate.rgb, metal );\n";
      getPhysicalMaterial += "material.roughness = clamp( roughness, 0.04, 1.0 );\n";
    } else {
      getPhysicalMaterial +=
        "var specularStrength = max( max( specularColor.r, specularColor.g ), specularColor.b );\n";
      getPhysicalMaterial += "material.diffuseColor = diffuseColorUpdate.rgb * ( 1.0 - specularStrength );\n";
      getPhysicalMaterial += "material.specularColor = specularColor;\n";
      getPhysicalMaterial += "material.roughness = clamp( 1.0 - glossiness, 0.04, 1.0 );\n";
    }

    getPhysicalMaterial += "material.opacity = diffuseColorUpdate.a;\n";
    getPhysicalMaterial += "return material;\n";
    getPhysicalMaterial += "}\n";
    encoder.addFunction(getPhysicalMaterial);

    this._brdf.execute(encoder, macros, counterIndex);
    this._directIrradianceFragDefine.execute(encoder, macros, counterIndex);
    this._iblFragDefine.execute(encoder, macros, counterIndex);
  }
}
