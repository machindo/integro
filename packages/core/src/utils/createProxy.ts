import { Handler } from '../types/IntegroApp';

export const createProxy = <
  T extends object | Handler,
  U extends (path: string[], args: any[]) => any = (path: string[], args: any[]) => any
>(apply: U, path: string[] = []): T =>
  new Proxy(() => {}, {
    get: (_target, key) => createProxy(apply, [...path, key.toString()]),
    apply: (_target, _thisArg, args) => apply(path, args)
  }) as T;
