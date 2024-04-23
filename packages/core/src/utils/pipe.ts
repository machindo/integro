export const pipe = <T = unknown>(
  value: T,
  next?: (value: T) => T,
  ...rest: ((value: T) => T)[]
): T => (next ? pipe(next(value), ...rest) : value);
