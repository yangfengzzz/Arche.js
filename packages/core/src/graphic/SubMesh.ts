/**
 * Sub-mesh, mainly contains drawing information.
 */
export class SubMesh {
  /** Start drawing offset. */
  start: number;
  /** Drawing count. */
  count: number;
  /** Drawing topology. */
  topology: GPUPrimitiveTopology;

  /**
   * Create a sub-mesh.
   * @param start - Start drawing offset
   * @param count - Drawing count
   * @param topology - Drawing topology
   */
  constructor(start: number = 0, count: number = 0, topology: GPUPrimitiveTopology = "triangle-list") {
    this.start = start;
    this.count = count;
    this.topology = topology;
  }
}
