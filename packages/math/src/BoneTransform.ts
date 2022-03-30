import { Quaternion } from "./Quaternion";
import { Vector3 } from "./Vector3";

export class BoneTransform {
  static temp = new Vector3();
  rot = new Quaternion();
  pos = new Vector3();
  scl = new Vector3(1, 1, 1);

  constructor();
  constructor(tran: BoneTransform);
  constructor(rot: Quaternion, pos: Vector3, scl: Vector3);
  constructor(rot?: Quaternion | BoneTransform, pos?: Vector3, scl?: Vector3) {
    if (rot instanceof BoneTransform) {
      this.copy(rot);
    } else if (rot && pos && scl) {
      this.set(rot, pos, scl);
    }
  }

  reset(): this {
    this.rot.setValue(0, 0, 0, 1);
    this.pos.setValue(0, 0, 0);
    this.scl.setValue(1, 1, 1);
    return this;
  }

  copy(t: BoneTransform): this {
    t.rot.cloneTo(this.rot);
    t.pos.cloneTo(this.pos);
    t.scl.cloneTo(this.scl);
    return this;
  }

  set(r?: Quaternion, p?: Vector3, s?: Vector3): this {
    if (r) r.cloneTo(this.rot);
    if (p) p.cloneTo(this.pos);
    if (s) s.cloneTo(this.scl);
    return this;
  }

  setPos(v: Vector3): this {
    v.cloneTo(this.pos);
    return this;
  }

  setRot(v: Quaternion): this {
    v.cloneTo(this.rot);
    return this;
  }

  setScl(v: Vector3): this {
    v.cloneTo(this.scl);
    return this;
  }

  setUniformScale(v: number): this {
    this.scl[0] = v;
    this.scl[1] = v;
    this.scl[2] = v;
    return this;
  }

  clone(): BoneTransform {
    return new BoneTransform(this);
  }

  // Computing Transforms, Parent -> Child
  mul(tran: BoneTransform): this;
  mul(cr: Quaternion, cp: Vector3, cs?: Vector3): this;
  mul(cr: Quaternion | BoneTransform, cp?: Vector3, cs?: Vector3): this {
    // If just passing in Transform Object
    if (cr instanceof BoneTransform) {
      cp = cr.pos;
      cs = cr.scl;
      cr = cr.rot;
    }

    if (cr && cp) {
      // POSITION - parent.position + ( parent.rotation * ( parent.scale * child.position ) )

      //this.pos.add( Vec3.mul( this.scl, cp ).transformQuat( this.rot ) );

      // Avoid Create a Float32Array for tmp.
      const tmp: Vector3 = new Vector3();
      Vector3.multiply(this.scl, cp, tmp);
      Vector3.transformByQuat(tmp, this.rot, tmp);
      Vector3.add(this.pos, tmp, this.pos);

      // SCALE - parent.scale * child.scale
      //if( cs ) this.scl.mul( cs );
      if (cs) Vector3.multiply(this.scl, cs, this.scl);

      // ROTATION - parent.rotation * child.rotation
      // this.rot.mul( cr );
      Quaternion.multiply(this.rot, cr, this.rot);
    }

    return this;
  }

  // Computing Transforms in reverse, Child - > Parent
  pmul(tran: BoneTransform): this;
  pmul(pr: Quaternion, pp: Vector3, ps: Vector3): this;
  pmul(pr: Quaternion | BoneTransform, pp?: Vector3, ps?: Vector3): this {
    // If just passing in Transform Object
    if (pr instanceof BoneTransform) {
      pp = pr.pos;
      ps = pr.scl;
      pr = pr.rot;
    }

    if (!pr || !pp || !ps) return this;

    // POSITION - parent.position + ( parent.rotation * ( parent.scale * child.position ) )
    // The only difference for this func, We use the IN.scl & IN.rot instead of THIS.scl * THIS.rot
    // Consider that this Object is the child and the input is the Parent.
    //this.pos.mul( ps ).transformQuat( pr ).add( pp );
    // Avoid Create a Float32Array for tmp.
    const tmp = new Vector3();
    Vector3.multiply(this.pos, ps, tmp);
    Vector3.transformByQuat(tmp, pr, tmp);
    Vector3.add(tmp, pp, this.pos);

    // SCALE - parent.scale * child.scale
    //if( ps ) this.scl.mul( ps );
    if (ps) Vector3.multiply(this.scl, ps, this.scl);

    // ROTATION - parent.rotation * child.rotation
    //this.rot.pmul( pr ); // Must Rotate from Parent->Child, need PMUL
    Quaternion.multiply(pr, this.rot, this.rot);

    return this;
  }

  addPos(cp: Vector3, ignoreScl = false): this {
    //POSITION - parent.position + ( parent.rotation * ( parent.scale * child.position ) )
    //if( ignoreScl )	this.pos.add( Vec3.fromQuat( this.rot, cp ) );
    //else 			    this.pos.add( Vec3.mul( cp, this.scl ).transformQuat( this.rot ) );

    if (ignoreScl) {
      Vector3.transformByQuat(cp, this.rot, BoneTransform.temp);
      Vector3.add(this.pos, BoneTransform.temp, this.pos);
    } else {
      const tmp = new Vector3();
      Vector3.multiply(cp, this.scl, tmp);
      Vector3.transformByQuat(tmp, this.rot, BoneTransform.temp);
      Vector3.add(this.pos, BoneTransform.temp, this.pos);
    }

    return this;
  }

  fromMul(tp: BoneTransform, tc: BoneTransform): this {
    // POSITION - parent.position + ( parent.rotation * ( parent.scale * child.position ) )
    //const v = Vec3.mul( tp.scl, tc.pos ).transformQuat( tp.rot ); // parent.scale * child.position;
    //this.pos.fromAdd( tp.pos, v );

    const tmp = new Vector3();
    Vector3.multiply(tp.scl, tc.pos, tmp);
    Vector3.transformByQuat(tmp, tp.rot, tmp);
    Vector3.add(tp.pos, tmp, this.pos);

    // SCALE - parent.scale * child.scale
    //this.scl.fromMul( tp.scl, tc.scl );
    Vector3.multiply(tp.scl, tc.scl, this.scl);

    // ROTATION - parent.rotation * child.rotation
    //this.rot.fromMul( tp.rot, tc.rot );
    Quaternion.multiply(tp.rot, tc.rot, this.rot);

    return this;
  }

  fromInvert(t: BoneTransform): this {
    // Invert Rotation
    //this.rot.fromInvert( t.rot );
    Quaternion.invert(this.rot, t.rot);

    // Invert Scale
    //this.scl.fromInvert( t.scl );
    this.scl.setValue(1.0 / t.scl.x, 1.0 / t.scl.y, 1.0 / t.scl.z);

    // Invert Position : rotInv * ( invScl * -Pos )
    //this.pos
    //    .fromNegate( t.pos )
    //    .mul( this.scl )
    //    .transformQuat( this.rot );
    const tmp = new Vector3();
    Vector3.negate(t.pos, tmp);
    Vector3.multiply(tmp, this.scl, tmp);
    Vector3.transformByQuat(tmp, this.rot, this.pos);

    return this;
  }

  transformVec3(v: Vector3, out?: Vector3): Vector3 {
    const tmp = new Vector3();
    Vector3.multiply(v, this.scl, tmp);
    Vector3.transformByQuat(tmp, this.rot, tmp);

    Vector3.add(tmp, this.pos, out || v);
    return out || v;
  }

  static mul(tp: BoneTransform, tc: BoneTransform): BoneTransform {
    return new BoneTransform().fromMul(tp, tc);
  }

  static invert(t: BoneTransform): BoneTransform {
    return new BoneTransform().fromInvert(t);
  }

  static fromPos(v: Vector3): BoneTransform;
  static fromPos(x: number, y: number, z: number): BoneTransform;
  static fromPos(x: number | Vector3, y?: number, z?: number): BoneTransform {
    const t = new BoneTransform();
    if (x instanceof Vector3) {
      x.cloneTo(t.pos);
    } else if (x != undefined && y != undefined && z != undefined) {
      t.pos.setValue(x, y, z);
    }

    return t;
  }
}
