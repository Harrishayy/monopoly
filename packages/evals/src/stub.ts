/** Identifies a public API whose implementation is assigned to a later module. */
export class NotImplementedYet extends Error {
  constructor(fn: string) {
    super(`${fn} is not implemented yet`);
    this.name = 'NotImplementedYet';
  }
}
