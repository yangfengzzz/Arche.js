import { Vector3 } from "@arche-engine/math";
import { Engine } from "../Engine";
import { ModelMesh } from "./ModelMesh";

export class WireFramePrimitive {
  static createCuboidWireFrame(engine: Engine, width: number, height: number, depth: number): ModelMesh {
    const mesh = new ModelMesh(engine);

    const halfWidth: number = width / 2;
    const halfHeight: number = height / 2;
    const halfDepth: number = depth / 2;

    const positions: Vector3[] = new Array(24);
    // Up
    positions[0] = new Vector3(-halfWidth, halfHeight, -halfDepth);
    positions[1] = new Vector3(halfWidth, halfHeight, -halfDepth);
    positions[2] = new Vector3(halfWidth, halfHeight, halfDepth);
    positions[3] = new Vector3(-halfWidth, halfHeight, halfDepth);

    // Down
    positions[4] = new Vector3(-halfWidth, -halfHeight, -halfDepth);
    positions[5] = new Vector3(halfWidth, -halfHeight, -halfDepth);
    positions[6] = new Vector3(halfWidth, -halfHeight, halfDepth);
    positions[7] = new Vector3(-halfWidth, -halfHeight, halfDepth);

    // Left
    positions[8] = new Vector3(-halfWidth, halfHeight, -halfDepth);
    positions[9] = new Vector3(-halfWidth, halfHeight, halfDepth);
    positions[10] = new Vector3(-halfWidth, -halfHeight, halfDepth);
    positions[11] = new Vector3(-halfWidth, -halfHeight, -halfDepth);

    // Right
    positions[12] = new Vector3(halfWidth, halfHeight, -halfDepth);
    positions[13] = new Vector3(halfWidth, halfHeight, halfDepth);
    positions[14] = new Vector3(halfWidth, -halfHeight, halfDepth);
    positions[15] = new Vector3(halfWidth, -halfHeight, -halfDepth);

    // Front
    positions[16] = new Vector3(-halfWidth, halfHeight, halfDepth);
    positions[17] = new Vector3(halfWidth, halfHeight, halfDepth);
    positions[18] = new Vector3(halfWidth, -halfHeight, halfDepth);
    positions[19] = new Vector3(-halfWidth, -halfHeight, halfDepth);

    // Back
    positions[20] = new Vector3(-halfWidth, halfHeight, -halfDepth);
    positions[21] = new Vector3(halfWidth, halfHeight, -halfDepth);
    positions[22] = new Vector3(halfWidth, -halfHeight, -halfDepth);
    positions[23] = new Vector3(-halfWidth, -halfHeight, -halfDepth);

    const indices = new Uint32Array(48);
    // Up
    (indices[0] = 0), (indices[1] = 1);
    (indices[2] = 1), (indices[3] = 2);
    (indices[4] = 2), (indices[5] = 3);
    (indices[6] = 3), (indices[7] = 0);
    // Down
    (indices[8] = 4), (indices[9] = 5);
    (indices[10] = 5), (indices[11] = 6);
    (indices[12] = 6), (indices[13] = 7);
    (indices[14] = 7), (indices[15] = 4);
    // Left
    (indices[16] = 8), (indices[17] = 9);
    (indices[18] = 9), (indices[19] = 10);
    (indices[20] = 10), (indices[21] = 11);
    (indices[22] = 11), (indices[23] = 8);
    // Right
    (indices[24] = 12), (indices[25] = 13);
    (indices[26] = 13), (indices[27] = 14);
    (indices[28] = 14), (indices[29] = 15);
    (indices[30] = 15), (indices[31] = 12);
    // Front
    (indices[32] = 16), (indices[33] = 17);
    (indices[34] = 17), (indices[35] = 18);
    (indices[36] = 18), (indices[37] = 19);
    (indices[38] = 19), (indices[39] = 16);
    // Back
    (indices[40] = 20), (indices[41] = 21);
    (indices[42] = 21), (indices[43] = 22);
    (indices[44] = 22), (indices[45] = 23);
    (indices[46] = 23), (indices[47] = 20);

    mesh.setPositions(positions);
    mesh.setIndices(indices);

    mesh.uploadData(true);
    mesh.addSubMesh(0, indices.length, "line-list");
    return mesh;
  }

  static createSphereWireFrame(engine: Engine, radius: number): ModelMesh {
    const mesh = new ModelMesh(engine);

    const vertexCount = 40;
    const shift = new Vector3();

    const positions: Vector3[] = new Array(vertexCount * 3);
    const indices = new Uint32Array(vertexCount * 6);
    // X
    this._createCircleWireFrame(radius, 0, vertexCount, 0, shift, positions, indices);

    // Y
    this._createCircleWireFrame(radius, vertexCount, vertexCount, 1, shift, positions, indices);

    // Z
    this._createCircleWireFrame(radius, 2 * vertexCount, vertexCount, 2, shift, positions, indices);

    mesh.setPositions(positions);
    mesh.setIndices(indices);

    mesh.uploadData(true);
    mesh.addSubMesh(0, indices.length, "line-list");
    return mesh;
  }

  static createCapsuleWireFrame(engine: Engine, radius: number, height: number): ModelMesh {
    const mesh = new ModelMesh(engine);

    const vertexCount = 40;
    const shift = new Vector3();
    const halfHeight = height / 2;
    const positions: Vector3[] = new Array(vertexCount * 4);
    const indices = new Uint32Array(vertexCount * 8);

    // Y-Top
    shift.y = halfHeight;
    this._createCircleWireFrame(radius, 0, vertexCount, 1, shift, positions, indices);

    // Y-Bottom
    shift.y = -halfHeight;
    this._createCircleWireFrame(radius, vertexCount, vertexCount, 1, shift, positions, indices);

    // X-Elliptic
    this._createEllipticWireFrame(radius, halfHeight, vertexCount * 2, vertexCount, 2, positions, indices);

    // Z-Elliptic
    this._createEllipticWireFrame(radius, halfHeight, vertexCount * 3, vertexCount, 0, positions, indices);

    mesh.setPositions(positions);
    mesh.setIndices(indices);

    mesh.uploadData(true);
    mesh.addSubMesh(0, indices.length, "line-list");
    return mesh;
  }

  private static _createCircleWireFrame(
    radius: number,
    vertexBegin: number,
    vertexCount: number,
    axis: number,
    shift: Vector3,
    positions: Vector3[],
    indices: Uint32Array
  ) {
    const countReciprocal = 1.0 / vertexCount;
    for (let i = 0; i < vertexCount; ++i) {
      const v = i * countReciprocal;
      const thetaDelta = v * Math.PI * 2;

      const globalIndex = i + vertexBegin;
      switch (axis) {
        case 0:
          positions[globalIndex] = new Vector3(
            shift.x,
            radius * Math.cos(thetaDelta) + shift.y,
            radius * Math.sin(thetaDelta) + shift.z
          );
          break;
        case 1:
          positions[globalIndex] = new Vector3(
            radius * Math.cos(thetaDelta) + shift.x,
            shift.y,
            radius * Math.sin(thetaDelta) + shift.z
          );
          break;
        case 2:
          positions[globalIndex] = new Vector3(
            radius * Math.cos(thetaDelta) + shift.x,
            radius * Math.sin(thetaDelta) + shift.y,
            shift.z
          );
          break;
      }

      if (i < vertexCount - 1) {
        indices[2 * globalIndex] = globalIndex;
        indices[2 * globalIndex + 1] = globalIndex + 1;
      } else {
        indices[2 * globalIndex] = globalIndex;
        indices[2 * globalIndex + 1] = vertexBegin;
      }
    }
  }

  private static _createEllipticWireFrame(
    radius: number,
    height: number,
    vertexBegin: number,
    vertexCount: number,
    axis: number,
    positions: Vector3[],
    indices: Uint32Array
  ) {
    const countReciprocal = 1.0 / vertexCount;
    for (let i = 0; i < vertexCount; ++i) {
      const v = i * countReciprocal;
      const thetaDelta = v * Math.PI * 2;

      const globalIndex = i + vertexBegin;
      switch (axis) {
        case 0:
          positions[globalIndex] = new Vector3(
            0,
            radius * Math.sin(thetaDelta) + height,
            radius * Math.cos(thetaDelta)
          );
          break;
        case 1:
          positions[globalIndex] = new Vector3(radius * Math.cos(thetaDelta), height, radius * Math.sin(thetaDelta));
          break;
        case 2:
          positions[globalIndex] = new Vector3(
            radius * Math.cos(thetaDelta),
            radius * Math.sin(thetaDelta) + height,
            0
          );
          break;
      }

      if (i == vertexCount / 2) {
        height = -height;
      }

      if (i < vertexCount - 1) {
        indices[2 * globalIndex] = globalIndex;
        indices[2 * globalIndex + 1] = globalIndex + 1;
      } else {
        indices[2 * globalIndex] = globalIndex;
        indices[2 * globalIndex + 1] = vertexBegin;
      }
    }
  }
}
