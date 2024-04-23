import { pack, unpack } from 'msgpackr';
import { Middleware } from './types/Middleware.js';
import { Handler, IntegroApp } from './types/IntegroApp.js';
import { IntegroClient } from './types/IntegroClient.js';
import { pipe } from './utils/pipe.js';
import { createProxy } from './utils/createProxy.js';

export type ClientConfig = {
  fetchOptions?: RequestInit;
  middleware?: Middleware[];
};

const post = async ({
  url,
  fetchOptions = {},
  middleware,
  data,
}: {
  url: string;
  fetchOptions?: RequestInit;
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
  const res = await fetch(req, fetchOptions);
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

export const createClient = <T extends IntegroApp>(url = '/', { fetchOptions, middleware = [] }: ClientConfig = {}) =>
  createProxy<IntegroClient<T>>((path, args) => post({
    url,
    fetchOptions,
    middleware,
    data: {
      path,
      args
    }
  }));
