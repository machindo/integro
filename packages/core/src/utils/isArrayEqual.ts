export const isArrayEqual = (a: unknown[], b: unknown[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index]);
