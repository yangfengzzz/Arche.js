import { ShaderMacroCollection } from "../../shader/ShaderMacroCollection";

export class WGSLPbrFrag {
  private readonly _input: string;
  private readonly _output: string;
  private readonly _is_metallic_workflow: boolean;

  constructor(input: string, output: string, is_metallic_workflow: boolean) {
    this._input = input;
    this._output = output;
    this._is_metallic_workflow = is_metallic_workflow;
  }

  execute(macros: ShaderMacroCollection): string {
    const input = this._input;
    const is_metallic_workflow = this._is_metallic_workflow;

    let source = `var geometry = GeometricContext(${input}.v_pos, getNormal(${input}, \n`;
    if (macros.isEnable("HAS_NORMAL_TEXTURE")) {
      source += "u_normalTexture, u_normalSampler, u_pbrBaseData.normalTextureIntensity";
    }
    source += `), normalize(u_cameraData.u_cameraPos - ${input}.v_pos));\n`;

    if (is_metallic_workflow) {
      source += "var material = getPhysicalMaterial(u_pbrBaseData.baseColor, u_pbrData.metallic, u_pbrData.roughness, u_alphaCutoff, \n";
    } else {
      source += "var material = getPhysicalMaterial(u_pbrBaseData.baseColor, u_pbrSpecularData.specularColor, u_pbrSpecularData.glossiness, u_alphaCutoff, \n";
    }
    if (macros.isEnable("HAS_BASE_COLORMAP")) {
      source += `${input}.v_uv, u_baseColorTexture, u_baseColorSampler,\n`;
    }
    if (macros.isEnable("HAS_VERTEXCOLOR")) {
      source += `{input}.v_color,\n`;
    }
    if (macros.isEnable("HAS_METALROUGHNESSMAP") && is_metallic_workflow) {
      source += "u_metallicRoughnessTexture, u_metallicRoughnessSampler\n";
    }
    if (macros.isEnable("HAS_SPECULARGLOSSINESSMAP") && !is_metallic_workflow) {
      source += "u_specularGlossinessTexture, u_specularGlossinessSampler,\n";
    }
    source += ");\n";

    source += "var reflectedLight = ReflectedLight( vec3<f32>(0.0, 0.0, 0.0), vec3<f32>(0.0, 0.0, 0.0), vec3<f32>(0.0, 0.0, 0.0), vec3<f32>(0.0, 0.0, 0.0) );\n";
    source += "var dotNV = saturate( dot( geometry.normal, geometry.viewDir ) );\n";

    // Direct Light
    source += "addTotalDirectRadiance(geometry, material, &reflectedLight);\n";

    // IBL diffuse
    if (macros.isEnable("HAS_SH")) {
      source += "var irradiance = getLightProbeIrradiance(u_env_sh, geometry.normal);\n";
      source += "irradiance = irradiance * u_envMapLight.diffuseIntensity;\n";
    } else if (macros.isEnable("HAS_DIFFUSE_ENV")) {
      source += "var irradiance = textureSample(u_env_diffuseTexture, u_env_diffuseSampler, geometry.normal).rgb;\n";
      source += "irradiance = irradiance * u_envMapLight.diffuseIntensity;\n";
    } else {
      source += "var irradiance = u_envMapLight.diffuse * u_envMapLight.diffuseIntensity;\n";
      source += "irradiance = irradiance * PI;\n";
    }
    source += "reflectedLight.indirectDiffuse = reflectedLight.indirectDiffuse + irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );\n";

    // IBL specular
    source += "var radiance = getLightProbeRadiance( geometry, material.roughness, i32(u_envMapLight.mipMapLevel), u_envMapLight.specularIntensity);\n";
    source += "reflectedLight.indirectSpecular = reflectedLight.indirectSpecular + radiance * envBRDFApprox(material.specularColor, material.roughness, dotNV );\n";

    // Occlusion
    if (macros.isEnable("HAS_OCCLUSIONMAP")) {
      source += `var ambientOcclusion = (textureSample(u_occlusionTexture, u_occlusionSampler, ${input}.v_uv).r - 1.0) * u_occlusionStrength + 1.0;\n`;
      source += "reflectedLight.indirectDiffuse = reflectedLight.indirectDiffuse * ambientOcclusion;\n";
      if (macros.isEnable("HAS_SPECULAR_ENV")) {
        source += "reflectedLight.indirectSpecular = reflectedLight.indirectSpecular * computeSpecularOcclusion(ambientOcclusion, material.roughness, dotNV);\n";
      }
    }

    // Emissive
    source += "var emissiveRadiance = u_pbrBaseData.emissiveColor.rgb;\n";
    if (macros.isEnable("HAS_EMISSIVEMAP")) {
      source += `var emissiveColor = textureSample(u_emissiveTexture, u_emissiveSampler, ${input}.v_uv);\n`;
      source += "emissiveRadiance = emissiveRadiance * emissiveColor.rgb;\n";
    }

    // Total
    source += "var totalRadiance =    reflectedLight.directDiffuse +\n";
    source += "                        reflectedLight.indirectDiffuse +\n";
    source += "                        reflectedLight.directSpecular +\n";
    source += "                        reflectedLight.indirectSpecular +\n";
    source += "                        emissiveRadiance;\n";
    return source;
  }
}
