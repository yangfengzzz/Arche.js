import { WGSLEncoder } from "../WGSLEncoder";
import { ShaderMacroCollection } from "../../shader/ShaderMacroCollection";

export class WGSLBRDF {
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
    // Original approximation by Christophe Schlick '94
    // float fresnel = pow( 1.0 - dotLH, 5.0 );
    // Optimized variant (presented by Epic at SIGGRAPH '13)
    // https://cdn2.unrealengine.com/Resources/files/2013SiggraphPresentationsNotes-26915738.pdf
    let func = "fn F_Schlick(specularColor: vec3<f32>, dotLH: f32)->vec3<f32> {\n";
    func += "   var fresnel = exp2( ( -5.55473 * dotLH - 6.98316 ) * dotLH );\n";
    func += "   return ( 1.0 - specularColor ) * fresnel + specularColor;\n";
    func += "}\n";
    encoder.addFunction(func);

    // Moving Frostbite to Physically Based Rendering 3.0 - page 12, listing 2
    // https://seblagarde.files.wordpress.com/2015/07/course_notes_moving_frostbite_to_pbr_v32.pdf
    func = "fn G_GGX_SmithCorrelated(alpha: f32, dotNL: f32, dotNV: f32)->f32 {\n";
    func += "    var a2 = pow2( alpha );\n";
    func += "\n";
    func += "    // dotNL and dotNV are explicitly swapped. This is not a mistake.\n";
    func += "    var gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );\n";
    func += "    var gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );\n";
    func += "\n";
    func += "    return 0.5 / max( gv + gl, EPSILON );\n";
    func += "}\n";
    encoder.addFunction(func);

    // Microfacet Models for Refraction through Rough Surfaces - equation (33)
    // http://graphicrants.blogspot.com/2013/08/specular-brdf-reference.html
    // alpha is "roughness squared" in Disney’s reparameterization
    func = "fn D_GGX(alpha: f32, dotNH: f32)->f32 {\n";
    func += "   var a2 = pow2( alpha );\n";
    func += "\n";
    func += "    var denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0; // avoid alpha = 0 with dotNH = 1\n";
    func += "\n";
    func += "   return RECIPROCAL_PI * a2 / pow2( denom );\n";
    func += "}\n";
    encoder.addFunction(func);

    // GGX Distribution, Schlick Fresnel, GGX-Smith Visibility
    func =
      "fn BRDF_Specular_GGX(incidentDirection:vec3<f32>, geometry:GeometricContext, specularColor:vec3<f32>, roughness:f32)->vec3<f32> {\n";
    func += "\n";
    func += "    var alpha = pow2( roughness ); // UE4's roughness\n";
    func += "\n";
    func += "    var halfDir = normalize( incidentDirection + geometry.viewDir );\n";
    func += "\n";
    func += "    var dotNL = saturate( dot( geometry.normal, incidentDirection ) );\n";
    func += "    var dotNV = saturate( dot( geometry.normal, geometry.viewDir ) );\n";
    func += "    var dotNH = saturate( dot( geometry.normal, halfDir ) );\n";
    func += "   var dotLH = saturate( dot( incidentDirection, halfDir ) );\n";
    func += "\n";
    func += "    var F = F_Schlick( specularColor, dotLH );\n";
    func += "\n";
    func += "   var G = G_GGX_SmithCorrelated( alpha, dotNL, dotNV );\n";
    func += "\n";
    func += "   var D = D_GGX( alpha, dotNH );\n";
    func += "\n";
    func += "   return F * ( G * D );\n";
    func += "\n";
    func += "}\n";
    encoder.addFunction(func);
  }
}
