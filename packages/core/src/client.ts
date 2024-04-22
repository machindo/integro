import { pack, unpack } from 'msgpackr';
import { Middleware } from './types/Middleware';
import { Handler, IntegroApp } from './types/IntegroApp';
import { IntegroClient } from './types/IntegroClient';

export type ClientConfig = {
  middleware?: Middleware[];
};

const pipe = <T = unknown>(
  value: T,
  next?: (value: T) => T,
  ...rest: ((value: T) => T)[]
): T => (next ? pipe(next(value), ...rest) : value);

const post = async ({
  url,
  middleware,
  data,
}: {
  url: string;
  middleware: Middleware[];
  data: {
    path: string[];
    args: any[];
  };
}) => {
  const req = pipe(
    new Request(url, {
      method: "POST",
      body: pack(data),
    }),
    ...middleware
  );
  const res = await fetch(req);
  const blob = await res.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const unpacked = unpack(new Uint8Array(arrayBuffer));

  if (!res.ok) {
    throw new Error('The server responded in error.', {
      cause: unpacked,
    });
  }

  return unpacked;
};

const createProxy = <
  T extends object | Handler,
  U extends (path: string[], args: any[]) => any = (path: string[], args: any[]) => any
>(apply: U, path: string[] = []): T =>
  new Proxy(() => {}, {
    get: (_target, key) => createProxy(apply, [...path, key.toString()]),
    apply: (_target, _thisArg, args) => apply(path, args)
  }) as T;

export const createClient = <T extends IntegroApp>(url = '/', { middleware = [] }: ClientConfig = {}) =>
  createProxy<IntegroClient<T>>((path, args) => post({
    url,
    middleware,
    data: {
      path,
      args
    }
  }));
  // new DeepProxy({} as IntegroClient<T>, {
  //   get() {
  //     return this.nest(() => { })
  //   },
  //   async apply(_target, _thisArg, args) {
  //     const data = await post({
  //       url,
  //       middleware,
  //       data: {
  //         path: this.path,
  //         args
  //       }
  //     })

  //     return data;
  //   }
  // });
