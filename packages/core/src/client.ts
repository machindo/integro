import { pack, unpack } from 'msgpackr';
import DeepProxy from 'proxy-deep';
import { Middleware } from './types/Middleware';

export type ClientConfig = {
  middlewares?: Middleware[];
  path?: string;
};

const pipe = <T = unknown>(
  value: T,
  next?: (value: T) => T,
  ...rest: ((value: T) => T)[]
): T => (next ? pipe(next(value), ...rest) : value);

const post = async ({
  url,
  middlewares = [],
  data,
}: {
  url: string;
  middlewares?: Middleware[];
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
    ...middlewares
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

export const createClient = <T extends object>(host: string, config: ClientConfig = {}) =>
  new DeepProxy({}, {
    get() {
      return this.nest(() => { })
    },
    async apply(_target, _thisArg, args) {
      const data = await post({
        url: `${host}/${config.path}`,
        middlewares: config.middlewares,
        data: {
          path: this.path,
          args
        }
      })

      return data;
    }
  }) as T;
