import { pack, unpack } from "msgpackr";

type GenericFunction = (...args: any) => Promise<any>;
type Middleware = (request: Request) => Request;
type KnownValue = object | string | number | Array<any> | Uint8Array;

const defaultHost =
  import.meta?.env?.INTEGRO_HOST ??
  process?.env?.INTEGRO_HOST ??
  import.meta?.env?.VITE_INTEGRO_HOST ??
  process?.env?.VITE_INTEGRO_HOST ??
  import.meta?.env?.NEXT_PUBLIC_INTEGRO_HOST ??
  process?.env?.NEXT_PUBLIC_INTEGRO_HOST ??
  import.meta?.env?.REACT_APP_INTEGRO_HOST ??
  process?.env?.REACT_APP_INTEGRO_HOST ??
  "//";

export type FirstParam<T extends (...args: any) => any> = T extends (
  props: infer P
) => any
  ? P
  : never;

export type Caller<Fn extends GenericFunction = GenericFunction> =
  unknown extends FirstParam<Fn>
    ? FirstParam<Fn> extends KnownValue
      ? {
          (props?: FirstParam<Fn>): Promise<Awaited<ReturnType<Fn>>>;
          pathname: string;
          url: string;
        }
      : {
          (): Promise<Awaited<ReturnType<Fn>>>;
          pathname: string;
          url: string;
        }
    : {
        (props: FirstParam<Fn>): Promise<Awaited<ReturnType<Fn>>>;
        pathname: string;
        url: string;
      };

export type Config = {
  host: string;
  middlewares?: Middleware[];
};

const pipe = <T = unknown>(
  value: T,
  next?: (value: T) => T,
  ...rest: ((value: T) => T)[]
): T => (next ? pipe(next(value), ...rest) : value);

const post = async ({
  url,
  middlewares = [],
  props,
}: {
  url: string;
  middlewares?: Middleware[];
  props: any;
}) => {
  const req = pipe(
    new Request(url, {
      method: "POST",
      body: pack(props),
    }),
    ...middlewares
  );
  const res = await fetch(req);
  const blob = await res.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const unpacked = unpack(new Uint8Array(arrayBuffer));

  if (!res.ok) {
    throw new Error(`Invalid payload sent to "${url}"`, {
      cause: unpacked,
    });
  }

  return unpacked;
};

const cc = <Fn extends GenericFunction>({
  host = defaultHost,
  pathname,
  middlewares,
}: {
  host?: string;
  pathname: string;
  middlewares: Middleware[];
}): Caller<Fn> => {
  const url = `${host}/${pathname}`;
  const caller = (props?: FirstParam<Fn>) => post({ url, middlewares, props });

  caller.pathname = pathname;
  caller.url = url;

  return caller;
};

export function createClient({ host, middlewares = [] }: Config) {
  const c = {};

  return c;
}

export type Client = ReturnType<typeof createClient>;

export const ClientDotPath = [] as const satisfies (keyof Client)[];

export const ClientSlashPath = [] as const satisfies (keyof Client)[];

export type ClientDotPath = (typeof ClientDotPath)[number];

export type ClientSlashPath = (typeof ClientSlashPath)[number];

export type ClientPropsType<Key extends ClientDotPath | ClientSlashPath> =
  FirstParam<Client[Key]>;

// Unused
export type CallerParams<C extends Caller> =
  unknown extends FirstParam<C>
    ? FirstParam<C> extends KnownValue
      ? [props: FirstParam<C>] | []
      : []
    : [FirstParam<C>];

export type ClientParams<Key extends ClientDotPath | ClientSlashPath> =
  unknown extends ClientPropsType<Key>
    ? ClientPropsType<Key> extends KnownValue
      ? [props: ClientPropsType<Key>] | []
      : []
    : [ClientPropsType<Key>];

export type ClientReturnType<Key extends ClientDotPath | ClientSlashPath> =
  Awaited<ReturnType<Client[Key]>>;

export type ClientGetterParams<Key extends ClientDotPath | ClientSlashPath> =
  unknown extends ClientPropsType<Key>
    ? ClientPropsType<Key> extends KnownValue
      ? [key: Key, props?: ClientPropsType<Key>]
      : [key: Key]
    : [key: Key, props: ClientPropsType<Key>];

export type ClientCallerParams<C extends Caller> =
  unknown extends FirstParam<C>
    ? FirstParam<C> extends KnownValue
      ? [caller: C, props?: FirstParam<C>]
      : [caller: C]
    : [caller: C, props: FirstParam<C>];
