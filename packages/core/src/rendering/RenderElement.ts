import { Mesh } from "../graphic";
import { SubMesh } from "../graphic";
import { Material } from "../material";
import { Renderer } from "../Renderer";
import { RenderState } from "../shader/state/RenderState";
import { ShaderPass } from "../shader/ShaderPass";

/**
 * Render element.
 */
export class RenderElement {
  renderer: Renderer;
  material: Material;
  multiRenderData: boolean;
  renderState: RenderState;
  shaderPass: ShaderPass;
  mesh: Mesh;
  subMesh: SubMesh;

  setValue(
    renderer: Renderer,
    mesh: Mesh,
    subMesh: SubMesh,
    material: Material,
    renderState: RenderState,
    shaderPass: ShaderPass
  ): void {
    this.renderer = renderer;
    this.mesh = mesh;
    this.subMesh = subMesh;
    this.material = material;
    this.renderState = renderState;
    this.shaderPass = shaderPass;
  }
}
