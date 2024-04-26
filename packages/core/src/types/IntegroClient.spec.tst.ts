import { expect, test } from "tstyche";
import { createClient } from '../createClient';
import { respondWith } from '../respondWith';
import { unwrap } from '../unwrap';

type Method<Args extends unknown[], Return> = ((...args: Args) => Promise<Return>) & { [Symbol.toStringTag]: string; }

test('single-function api', () => {
  const api = () => { };
  const client = createClient<typeof api>();

  expect(client).type.toEqual<Method<[], void>>();
});

test('basic api', () => {
  const api = {
    version: () => '1.0.0',
    sayHi: (name: string) => `Hi, ${name}`
  };
  const client = createClient<typeof api>();

  expect(client).type.toEqual<{
    sayHi: Method<[string], string>;
    version: Method<[], string>;
  }>();
});

test('nested api', () => {
  type BluesMan = { genre: 'blues' };
  type JazzMan = { genre: 'jazz' };

  const api = {
    genres: {
      blues: {
        getByName: (_name: string) => ({ } as BluesMan)
      },
      jazz: {
        getByName: (_name: string) => ({ } as JazzMan)
      }
    }
  };
  const client = createClient<typeof api>();

  expect(client).type.toEqual<{
    genres: {
      blues: {
        getByName: Method<[string], BluesMan>;
      };
      jazz: {
        getByName: Method<[string], JazzMan>;
      };
    }
  }>();
});

test('unwrap dynamic imports', () => {
  const api = {
    nestedApp: unwrap(() => import('../tests/nestedApp.spec.js').then(module => module.nestedApp)),
    nestedFunction: unwrap(() => import('../tests/nestedFunction.spec.js').then(module => module.nestedFunction)),
  };
  const client = createClient<typeof api>();

  expect(client).type.toEqual<{
    nestedApp: {
      getName: Method<[], string>;
      nestedFunction: Method<[], string>;
    };
    nestedFunction: Method<[], string>;
  }>();
});

test('gets body type from respondWith', () => {
  const api = {
    auth: {
      login: () => respondWith({ message: 'OK!' }, { headers: { 'Set-Cookie': 'session=true' } }),
      logout: () => respondWith({ message: 'OK!' }, { headers: { 'Set-Cookie': 'session=false; expires 1970' } }),
    }
  };
  const client = createClient<typeof api>();

  expect(client).type.toEqual<{
    auth: {
      login: Method<[], { message: string }>;
      logout: Method<[], { message: string }>;
    };
  }>();
});
