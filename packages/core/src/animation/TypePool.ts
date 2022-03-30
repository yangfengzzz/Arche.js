import { Quaternion, Vector3 } from "@arche-engine/math";

class TypePool {
  static _vec3Pool: Vector3[] = [];
  static _quatPool: Quaternion[] = [];

  static vec3(): Vector3 {
    let v: Vector3 | undefined = this._vec3Pool.pop();
    if (!v) v = new Vector3();
    return v;
  }

  static quat(): Quaternion {
    let v: Quaternion | undefined = this._quatPool.pop();
    if (!v) v = new Quaternion();
    return v;
  }

  static recycle_vec3(...ary: Vector3[]): TypePool {
    let v: Vector3;
    for (v of ary) this._vec3Pool.push(v.setValue(0, 0, 0));
    return this;
  }

  static recycle_quat(...ary: Quaternion[]): TypePool {
    let v: Quaternion;
    for (v of ary) this._quatPool.push(v.setValue(0, 0, 0, 1));
    return this;
  }
}

export default TypePool;
