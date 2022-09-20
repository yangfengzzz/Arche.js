import { Vector3 } from "@arche-engine/math";

export class DirScale {
  lenScale: number = 1;
  effectorDir = new Vector3();
  poleDir = new Vector3();

  copy(v: DirScale): void {
    this.lenScale = v.lenScale;
    this.effectorDir.copyFrom(v.effectorDir);
    this.poleDir.copyFrom(v.poleDir);
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
    this.effectorDir.copyFrom(v.effectorDir);
    this.poleDir.copyFrom(v.poleDir);
  }
}

export class DirEnds {
  startEffectorDir = new Vector3();
  startPoleDir = new Vector3();
  endEffectorDir = new Vector3();
  endPoleDir = new Vector3();

  copy(v: DirEnds): void {
    this.startEffectorDir.copyFrom(v.startEffectorDir);
    this.startPoleDir.copyFrom(v.startPoleDir);
    this.endEffectorDir.copyFrom(v.endEffectorDir);
    this.endPoleDir.copyFrom(v.endPoleDir);
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
    this.effectorDir.copyFrom(v.effectorDir);
    this.poleDir.copyFrom(v.poleDir);
    this.pos.copyFrom(v.pos);
  }
}
