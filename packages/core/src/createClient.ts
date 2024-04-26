import { pack, unpack } from 'msgpackr';
import { IntegroApp } from './types/IntegroApp';
import { IntegroClient } from './types/IntegroClient';
import { createProxy } from './utils/createProxy';

export type ClientConfig = {
  requestInit?: RequestInit | (() => RequestInit);
};

const post = async ({
  url,
  requestInit = {},
  data,
}: {
  url: string;
  requestInit?: ClientConfig['requestInit'];
  data: {
    path: string[];
    args: unknown[];
  };
  }) => {
  const init = typeof requestInit === 'function' ? requestInit() : requestInit;
  const res = await fetch(url, {
    method: "POST",
    ...init,
    headers: {
      'Content-Type': 'application/msgpack',
      ...init.headers
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

export const createClient = <T extends IntegroApp>(url = '/', { requestInit }: ClientConfig = {}) =>
  createProxy<IntegroClient<T>>((path, args) => post({
    url,
    requestInit,
    data: {
      path,
      args
    }
  }));
