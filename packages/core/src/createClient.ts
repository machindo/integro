import WebSocket from 'isomorphic-ws';
import { pack, unpack } from 'msgpackr';
import { IntegroApp } from './types/IntegroApp';
import { IntegroClient } from './types/IntegroClient';
import { RequestData } from './types/RequestData';
import { createIntegroPromise } from './utils/createIntegroPromise';
import { createProxy } from './utils/createProxy';
import { isArrayEqual } from './utils/isArrayEqual';

export type ClientConfig = {
  auth?: string | (() => string | undefined);
  requestInit?: RequestInit | (() => RequestInit);
  subscribeKey?: string;
};

export type PostOptions = {
  url: string;
  config: ClientConfig;
  data: RequestData;
};

export const post = async (options: PostOptions) => {
  const { url, config } = Array.isArray(options) ? options[0] : options;
  const data = Array.isArray(options) ? options.map(o => o.data) : options.data;
  const init = typeof config.requestInit === 'function' ? config.requestInit() : config.requestInit;
  const auth = typeof config.auth === 'function' ? config.auth() : config.auth;
  const res = await fetch(url, {
    method: "POST",
    ...init,
    headers: {
      'Content-Type': 'application/msgpack',
      ...(auth ? { 'Authorization': auth } : undefined),
      ...init?.headers,
    },
    body: pack(data),
  });
  const arrayBuffer = await res.arrayBuffer();
  const unpacked = unpack(new Uint8Array(arrayBuffer));

  if (!res.ok) {
    if (
      typeof unpacked === 'object' &&
      unpacked !== null &&
      Object.getPrototypeOf(unpacked) === Object.prototype &&
      'message' in unpacked &&
      typeof unpacked.message === 'string' &&
      unpacked.message.length
    ) {
      throw new Error((unpacked as { message: string }).message);
    }

    throw new Error('The server responded in error.', {
      cause: unpacked,
    });
  }

  return unpacked;
};

const subscribe = ({
  url,
  config,
  data: { path, args },
  websocket,
}: {
  url: string;
  config: ClientConfig;
  data: {
    path: string[];
    args: unknown[];
  };
  websocket: { current: WebSocket | undefined, isOpen: boolean }
}) => {
  const handler = args[args.length - 1];
  const sendArgs = args.slice(0, args.length - 1);
  if (typeof handler !== 'function') throw new Error('Last parameter must be a callback function.')

  const listener = (data: ArrayBuffer) => {
    const unpacked = unpack(new Uint8Array(data)) as { type: string; path: string[]; message: unknown };

    if (unpacked.type === 'error') {
      handler(undefined, unpacked.message);
      websocket.current?.off('message', listener);
    };
    if (unpacked.type !== 'event') return;
    if (!isArrayEqual(unpacked.path, path)) return;

    handler(unpacked.message);
  };

  websocket.current ??= new WebSocket(url);

  websocket.current.on('error', console.error);
  websocket.current.on('message', listener);
  websocket.isOpen
    ? websocket.current?.send(pack({ type: 'subscribe', auth: config.auth, path, args: sendArgs }))
    : websocket.current.on('open', () => {
      websocket.isOpen = !!websocket.current;
      websocket.current?.send(pack({ type: 'subscribe', auth: config.auth, path, args: sendArgs }));
    });

  return () => {
    websocket.current?.off('message', listener);
  };
};

export const createClient = <T extends IntegroApp>(url = '/', config: ClientConfig = {}): IntegroClient<T> => {
  const websocket: { current: WebSocket | undefined; isOpen: boolean } = { current: undefined, isOpen: false };

  return createProxy<IntegroClient<T>>((path, args) =>
    path.length >= 2 && path[path.length - 1] === (config.subscribeKey ?? 'subscribe')
      ? subscribe({
        url,
        config,
        data: {
          path,
          args
        },
        websocket,
      })
      : createIntegroPromise(post, { url, config, data: { type: 'request', path, args } }),
  );
};
