export const everyItemIsString = (array: unknown[]): array is string[] =>
  array.every(value => typeof value === 'string');