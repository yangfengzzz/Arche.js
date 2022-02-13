import { Mesh } from "../graphic/Mesh";
import { SubMesh } from "../graphic/SubMesh";
import { Material } from "../material";
import { Renderer } from "../Renderer";

/**
 * Render element.
 */
export class RenderElement {
  /** Render component. */
  renderer: Renderer;
  /** Mesh. */
  mesh: Mesh;
  /** Sub mesh. */
  subMesh: SubMesh;
  /** Material. */
  material: Material;

  setValue(renderer: Renderer, mesh: Mesh, subMesh: SubMesh, material: Material): void {
    this.renderer = renderer;
    this.mesh = mesh;
    this.subMesh = subMesh;
    this.material = material;
  }
}
