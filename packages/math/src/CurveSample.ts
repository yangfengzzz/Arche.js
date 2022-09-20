import { Vector3 } from "./Vector3";

export class CurveSample {
  // Total Length of the Spline
  _totalLen = 0;
  // Total Samples Collected
  _sampleCnt = 0;
  // Total Length at each sample point
  _aryLen: Array<number>;
  // Delta Length at each sample point, Cached as a Range value when Remapping Distance between Samples
  _aryInc: Array<number>;
  _aryPos: Array<Vector3>;

  constructor(cnt = 0) {
    if (cnt == 0) {
      this._aryLen = [];
      this._aryInc = [];
      this._aryPos = [];
    } else {
      this._sampleCnt = cnt;
      this._aryLen = new Array(cnt);
      this._aryLen.fill(0);

      this._aryInc = this._aryLen.slice(0);
      this._aryPos = this._aryLen.map(() => new Vector3());
    }
  }

  add(pnt: Vector3) {
    if (this._sampleCnt > 0) {
      const inc = Vector3.distance(pnt, this._aryPos[this._sampleCnt - 1]);
      // Total Length
      this._totalLen += inc;
      // Current Total Length at this point
      this._aryLen.push(this._totalLen);
      // Length between Current+Previous Point
      this._aryInc.push(inc);
    } else {
      this._aryLen.push(0);
      this._aryInc.push(0);
    }

    this._aryPos.push(pnt.clone());
    this._sampleCnt++;
  }

  set(i: number, pnt: Vector3): void {
    this._aryPos[i].copyFrom(pnt);
  }

  updateLengths(): void {
    let inc: number;
    this._totalLen = 0;

    for (let i = 1; i < this._sampleCnt; i++) {
      inc = Vector3.distance(this._aryPos[i], this._aryPos[i - 1]);
      this._totalLen += inc;
      this._aryLen[i] = this._totalLen;
      this._aryInc[i] = inc;
    }
  }

  atLength(len: number, out?: Vector3): Vector3 {
    const alen = this._aryLen;
    const ainc = this._aryInc;
    out ??= new Vector3();

    if (len <= 0) out.copyFrom(this._aryPos[0]);
    else if (len >= this._totalLen - 0.001) out.copyFrom(this._aryPos[this._sampleCnt - 1]);
    else {
      for (let i = this._sampleCnt - 1; i >= 0; i--) {
        if (alen[i] < len) {
          // Normalize Search Length ( x-a / b - a );
          const t = (len - alen[i]) / ainc[i + 1];
          // Get the Position between the two sample positions.
          Vector3.lerp(this._aryPos[i], this._aryPos[i + 1], t, out);
          return out;
        }
      }
    }

    return out;
  }
}
