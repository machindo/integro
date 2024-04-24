import { MsgPackDecoderFast } from '@jsonjoy.com/json-pack/lib/msgpack/MsgPackDecoderFast';
import { MsgPackEncoderFast } from '@jsonjoy.com/json-pack/lib/msgpack/MsgPackEncoderFast';
import { IntegroApp } from './types/IntegroApp';
import { IntegroClient } from './types/IntegroClient';
import { createProxy } from './utils/createProxy';

export type ClientConfig = {
  requestInit?: RequestInit | (() => RequestInit);
};

const encoder = new MsgPackEncoderFast();
const decoder = new MsgPackDecoderFast();

const post = async ({
  url,
  requestInit = {},
  data,
}: {
  url: string;
  requestInit?: ClientConfig['requestInit'];
  data: {
    path: string[];
    args: any[];
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
    body: encoder.encode(data),
  });
  const arrayBuffer = await res.arrayBuffer();
  const unpacked = decoder.read(new Uint8Array(arrayBuffer));

  if (!res.ok) {
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
