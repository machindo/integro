import { Handler } from '../types/IntegroApp';
import { noop } from './noop';

export const createProxy = <
  T extends object | Handler,
  U extends (path: string[], args: unknown[]) => unknown = (path: string[], args: unknown[]) => unknown
>(apply: U, path: string[] = []): T =>
  new Proxy(noop, {
    get: (_target, key) =>
      key === Symbol.toStringTag
        ? path.join('.')
        : createProxy(apply, [...path, key.toString()]),
    apply: (_target, _thisArg, args) =>
      apply(path, args)
  }) as T;
