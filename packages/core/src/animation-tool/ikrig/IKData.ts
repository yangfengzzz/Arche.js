import { Vector3 } from "@arche-engine/math";

export class DirScale {
  lenScale: number = 1;
  effectorDir = new Vector3();
  poleDir = new Vector3();

  copy(v: DirScale): void {
    this.lenScale = v.lenScale;
    v.effectorDir.cloneTo(this.effectorDir);
    v.poleDir.cloneTo(this.poleDir);
  }

  clone(): DirScale {
    const c = new DirScale();
    c.copy(this);
    return c;
  }
}

export class Dir {
  effectorDir = new Vector3();
  poleDir = new Vector3();

  copy(v: Dir): void {
    v.effectorDir.cloneTo(this.effectorDir);
    v.poleDir.cloneTo(this.poleDir);
  }
}

export class DirEnds {
  startEffectorDir = new Vector3();
  startPoleDir = new Vector3();
  endEffectorDir = new Vector3();
  endPoleDir = new Vector3();

  copy(v: DirEnds): void {
    v.startEffectorDir.cloneTo(this.startEffectorDir);
    v.startPoleDir.cloneTo(this.startPoleDir);
    v.endEffectorDir.cloneTo(this.endEffectorDir);
    v.endPoleDir.cloneTo(this.endPoleDir);
  }
}

export class Hip {
  effectorDir = new Vector3();
  poleDir = new Vector3();
  pos = new Vector3();
  bindHeight: number = 1;
  isAbsolute: boolean = false;

  copy(v: Hip): void {
    this.bindHeight = v.bindHeight;
    this.isAbsolute = v.isAbsolute;
    v.effectorDir.cloneTo(this.effectorDir);
    v.poleDir.cloneTo(this.poleDir);
    v.pos.cloneTo(this.pos);
  }
}
