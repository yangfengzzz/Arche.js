import { removeFromArray } from "./base/Util";

/**
 * Used to update tags.
 */
export class UpdateFlag {
  /** Flag. */
  flag = true;

  constructor(private _flags: UpdateFlag[] = []) {
    this._flags.push(this);
  }

  /**
   * Destroy.
   */
  destroy(): void {
    removeFromArray(this._flags, this);
    this._flags = null;
  }
}
