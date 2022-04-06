export class BoneParse {
  static reLeft = new RegExp("\\.l|left|_l", "i");
  static reRight = new RegExp("\\.r|right|_r", "i");

  name: string;
  isLR: boolean;
  isChain: boolean;
  reFind: RegExp;
  reExclude?: RegExp;

  constructor(name: string, isLR: boolean, reFind: string, reExclude?: string, isChain: boolean = false) {
    this.name = name;
    this.isLR = isLR;
    this.isChain = isChain;
    this.reFind = new RegExp(reFind, "i");
    if (reExclude) this.reExclude = new RegExp(reExclude, "i");
  }

  test(bname: string) {
    if (!this.reFind.test(bname)) return null;
    if (this.reExclude && this.reExclude.test(bname)) return null;

    if (this.isLR && BoneParse.reLeft.test(bname)) return this.name + "_l";
    if (this.isLR && BoneParse.reRight.test(bname)) return this.name + "_r";

    return this.name;
  }
}
