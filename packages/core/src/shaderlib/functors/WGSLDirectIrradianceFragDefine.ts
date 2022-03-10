import { WGSLEncoder } from "../WGSLEncoder";
import { ShaderMacroCollection } from "../../shader";

export class WGSLDirectIrradianceFragDefine {
  private _paramName: string = "in";
  private readonly _outputStructName: string;

  set paramName(name: string) {
    this._paramName = name;
  }

  get paramName(): string {
    return this._paramName;
  }

  constructor(outputStructName: string) {
    this._outputStructName = outputStructName;
  }

  execute(encoder: WGSLEncoder, macros: ShaderMacroCollection, counterIndex: number) {
    let func = "fn addDirectRadiance(incidentDirection:vec3<f32>, color:vec3<f32>, geometry:GeometricContext, \n";
    func += "material:PhysicalMaterial, reflectedLight:ptr<function, ReflectedLight>) {\n";
    func += "   var dotNL = saturate( dot( geometry.normal, incidentDirection ) );\n";
    func += "\n";
    func += "   var irradiance = dotNL * color;\n";
    func += "   irradiance = irradiance * PI;\n";
    func += "\n";
    func += "   (*reflectedLight).directSpecular = (*reflectedLight).directSpecular + irradiance * BRDF_Specular_GGX( incidentDirection, geometry, material.specularColor, material.roughness);\n";
    func += "\n";
    func += "   (*reflectedLight).directDiffuse = (*reflectedLight).directDiffuse + irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );\n";
    func += "}\n";
    encoder.addFunction(func);

    if (macros.isEnable("DIRECT_LIGHT_COUNT")) {
      func = "fn addDirectionalDirectLightRadiance(directionalLight:DirectLight, geometry:GeometricContext, material:PhysicalMaterial, reflectedLight:ptr<function, ReflectedLight>) {\n";
      func += "    var color = directionalLight.color;\n";
      func += "    var direction = -directionalLight.direction;\n";
      func += "\n";
      func += "   addDirectRadiance( direction, color, geometry, material, reflectedLight );\n";
      func += "}\n";
      encoder.addFunction(func);
    }
    if (macros.isEnable("POINT_LIGHT_COUNT")) {
      func = "fn addPointDirectLightRadiance(pointLight:PointLight, geometry:GeometricContext, material:PhysicalMaterial, reflectedLight:ptr<function, ReflectedLight>) {\n";
      func += "    var lVector = pointLight.position - geometry.position;\n";
      func += "    var direction = normalize( lVector );\n";
      func += "\n";
      func += "    var lightDistance = length( lVector );\n";
      func += "\n";
      func += "    var color = pointLight.color;\n";
      func += "    color = color * clamp(1.0 - pow(lightDistance/pointLight.distance, 4.0), 0.0, 1.0);\n";
      func += "\n";
      func += "    addDirectRadiance( direction, color, geometry, material, reflectedLight );\n";
      func += "}\n";
      encoder.addFunction(func);
    }
    if (macros.isEnable("SPOT_LIGHT_COUNT")) {
      func = "fn addSpotDirectLightRadiance(spotLight:SpotLight, geometry:GeometricContext, material:PhysicalMaterial, reflectedLight:ptr<function, ReflectedLight>) {\n";
      func += "    var lVector = spotLight.position - geometry.position;\n";
      func += "    var direction = normalize( lVector );\n";
      func += "\n";
      func += "    var lightDistance = length( lVector );\n";
      func += "    var angleCos = dot( direction, -spotLight.direction );\n";
      func += "\n";
      func += "    var spotEffect = smoothstep( spotLight.penumbraCos, spotLight.angleCos, angleCos );\n";
      func += "    var decayEffect = clamp(1.0 - pow(lightDistance/spotLight.distance, 4.0), 0.0, 1.0);\n";
      func += "\n";
      func += "    var color = spotLight.color;\n";
      func += "    color = color * spotEffect * decayEffect;\n";
      func += "\n";
      func += "    addDirectRadiance( direction, color, geometry, material, reflectedLight );\n";
      func += "}\n";
      encoder.addFunction(func);
    }

    func = "fn addTotalDirectRadiance(geometry:GeometricContext, material:PhysicalMaterial, reflectedLight:ptr<function, ReflectedLight>){\n";
    if (macros.isEnable("DIRECT_LIGHT_COUNT")) {
      func += "{\n";
      func += "var i:i32 = 0;\n";
      func += "loop {\n";
      func += `if (i >= ${macros.variableMacros("DIRECT_LIGHT_COUNT")}) { break; }\n`;

      func += "addDirectionalDirectLightRadiance( u_directLight[i], geometry, material, reflectedLight );\n";

      func += "i = i + 1;\n";
      func += "}\n";
      func += "}\n";
    }
    if (macros.isEnable("POINT_LIGHT_COUNT")) {
      func += "{\n";
      func += "var i:i32 = 0;\n";
      func += "loop {\n";
      func += `if (i >= ${macros.variableMacros("POINT_LIGHT_COUNT")}) { break; }\n`;

      func += "addPointDirectLightRadiance( u_pointLight[i], geometry, material, reflectedLight );\n";

      func += "i = i + 1;\n";
      func += "}\n";
      func += "}\n";
    }
    if (macros.isEnable("SPOT_LIGHT_COUNT")) {
      func += "{\n";
      func += "var i:i32 = 0;\n";
      func += "loop {\n";
      func += `if (i >= ${macros.variableMacros("SPOT_LIGHT_COUNT")}) { break; }\n`;

      func += "addSpotDirectLightRadiance( u_spotLight[i], geometry, material, reflectedLight );\n";

      func += "i = i + 1;\n";
      func += "}\n";
      func += "}\n";
    }
    func += "}\n";
    encoder.addFunction(func);
  }
}
