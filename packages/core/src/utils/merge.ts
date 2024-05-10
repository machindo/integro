import { isObject } from './isObject';

type R = Record<string, unknown>

const merge2 = <T extends object>(a: T, b: T): T =>
  Object.fromEntries(
    [
      ...Object.entries(a),
      ...Object.entries(b).map(
        ([key, value]) => [
          key,
          value && (a as R)[key] && isObject(value) && isObject((a as R)[key])
            ? merge2((a as never)[key], value)
            : value
        ]
      )
    ]
  ) as T;

export const merge = <T extends object>([first, second, ...rest]: T[]): T =>
  second ? merge([merge2(first, second), ...rest]) : first;
