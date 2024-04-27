import Bun from 'bun';
import getPort from 'get-port';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { pack, unpack } from 'msgpackr';
import { ClientConfig, createClient } from '../client';
import { IntegroApp, createController, respondWith, unwrap } from '../index';

const artists = [
  { id: 'clvfae6bu0000cgvc4ufm336g', name: 'miles', dob: new Date('1926-05-26') },
  { id: 'clvfaey730002cgvc5th8e890', name: 'monk', dob: new Date('1917-10-10') },
  { id: 'clvfaf07y0004cgvcbw5f7fda', name: 'mingus', dob: new Date('1922-04-22') },
]

const serverAPI = {
  '': () => 'empty',
  version: () => '0.1.0',
  artists: {
    findById: (id: string) => artists.find(a => a.id === id),
    findByName: async (name: string) => artists.find(a => a.name === name),
  },
  auth: {
    login: {
      withUsernameAndPassword: (username: string, _password: string) =>
        respondWith(null, {
          headers: {
            'Set-Cookie': `username=${username}`
          }
        })
    },
    dangerous: () => { throw new Error() },
  },
  nestedApp: unwrap(() => import('./nestedApp.spec').then(module => module.nestedApp)),
  nestedFunction: unwrap(() => import('./nestedFunction.spec').then(module => module.nestedFunction)),
  getAuthHeader: unwrap(req => () => req.headers.get('Authorization')),
  teapot: {
    makeCoffee: () => respondWith({ message: "I'm a teapot" }, { status: 418 }),
  },
}

const serve = async (app: IntegroApp) => Bun.serve({
  fetch: createController(app),
  port: await getPort()
});

const start = async <App extends IntegroApp>(app: App, clientConfig?: ClientConfig) => {
  const server = await serve(app);
  const client = createClient<typeof app>(`http://localhost:${server.port}`, clientConfig);

  return { client, server };
}

test('resolves single function api', async () => {
  const app = () => 'hello';
  const { client } = await start(app);

  return expect(client()).resolves.toBe('hello');
});

test('resolves single function api with args', async () => {
  const app = (name: string) => `hello, ${name}`;
  const { client } = await start(app);

  return expect(client('duke')).resolves.toBe('hello, duke');
});

test('resolves version', async () => {
  const { client } = await start(serverAPI);

  return expect(client.version()).resolves.toBe('0.1.0');
});

test('resolves empty string function', async () => {
  const { client } = await start(serverAPI);

  return expect(client['']()).resolves.toBe('empty');
});

test('resolves nested function', async () => {
  const { client } = await start(serverAPI);

  return expect(client.artists.findById('clvfaf07y0004cgvcbw5f7fda')).resolves.toEqual({
    id: 'clvfaf07y0004cgvcbw5f7fda', name: 'mingus', dob: new Date('1922-04-22')
  });
});

test('resolves nested async function', async () => {
  const { client } = await start(serverAPI);

  return expect(client.artists.findByName('miles')).resolves.toEqual({
    id: 'clvfae6bu0000cgvc4ufm336g', name: 'miles', dob: new Date('1926-05-26')
  });
});

test('unwraps dynamically imported module app', async () => {
  const { client } = await start(serverAPI);

  return expect(client.nestedApp.getName()).resolves.toBe("I'm a nested app!");
});

test('unwraps dynamically imported module function', async () => {
  const { client } = await start(serverAPI);

  return expect(client.nestedFunction()).resolves.toBe("I'm a nested function!");
});

test('unwraps twice dynamically imported module function', async () => {
  const { client } = await start(serverAPI);

  return expect(client.nestedApp.nestedFunction()).resolves.toBe("I'm a nested function!");
});

test('unwrap provides request object', async () => {
  const { client } = await start(serverAPI, {
    requestInit: {
      headers: { 'Authorization': "Do you know who I am?!" }
    }
  });

  return expect(client.getAuthHeader()).resolves.toBe("Do you know who I am?!");
});

test('client method includes pathname', () => {
  const client = createClient<typeof serverAPI>();

  expect(client.version[Symbol.toStringTag]).toBe('version');
});

test('nested client method includes pathname', () => {
  const client = createClient<typeof serverAPI>();

  expect(client.artists.findById[Symbol.toStringTag]).toBe('artists.findById');
});

test('empty client method includes pathname', () => {
  const client = createClient<typeof serverAPI>();

  expect(client[''][Symbol.toStringTag]).toBe('');
});

test('respondWith sets headers', async () => {
  const server = await serve(serverAPI);
  const res = await fetch(`http://localhost:${server.port}`, {
    method: 'POST',
    body: pack({
      path: ['auth', 'login', 'withUsernameAndPassword'],
      args: ['art', 'jazz'],
    }),
  });

  expect(res.headers.get('Set-Cookie')).toBe('username=art');
});

test('respondWith headers work with node http server', async () => {
  const port = await getPort();
  const server = createHttpServer(createController(serverAPI)).listen(port);
  const res = await fetch(`http://localhost:${port}`, {
    method: 'POST',
    body: pack({
      path: ['auth', 'login', 'withUsernameAndPassword'],
      args: ['art', 'jazz'],
    }),
  });

  expect(res.headers.get('Set-Cookie')).toBe('username=art');

  server.close();
});

test('respondWith sets status code', async () => {
  const server = await serve(serverAPI);
  const res = await fetch(`http://localhost:${server.port}`, {
    method: 'POST',
    body: pack({
      path: ['teapot', 'makeCoffee'],
      args: [],
    }),
  });

  expect(res.status).toBe(418);
});

test('respondWith status code works with node http server', async () => {
  const port = await getPort();
  const server = createHttpServer(createController(serverAPI)).listen(port);
  const res = await fetch(`http://localhost:${port}`, {
    method: 'POST',
    body: pack({
      path: ['teapot', 'makeCoffee'],
      args: [],
    }),
  });

  expect(res.status).toBe(418);

  server.close();
});

test('rejects with custom error message', async () => {
  const { client } = await start(serverAPI);

  return expect(client.teapot.makeCoffee()).rejects.toThrowError("I'm a teapot");
});

test('rejects without custom error message', async () => {
  const { client } = await start(serverAPI);

  return expect(client.auth.dangerous()).rejects.toThrowError("The server responded in error.");
});

test('works with node http server', async () => {
  const port = await getPort();
  const client = createClient<typeof serverAPI>(`http://localhost:${port}`);
  const server = createHttpServer(createController(serverAPI)).listen(port);

  expect(client.version()).resolves.toBe('0.1.0');

  server.close();
});

test('works with node https server', async () => {
  const port = await getPort();
  const client = createClient<typeof serverAPI>(`http://localhost:${port}`);
  const server = createHttpsServer(createController(serverAPI)).listen(port);

  expect(client.version()).resolves.toBe('0.1.0');

  server.close();
});

// Error caused by not using integro client...

test('errors when request path is not present', async () => {
  const server = await serve(serverAPI);
  const res = await fetch(`http://localhost:${server.port}`, {
    method: 'POST',
    body: pack({
      args: [],
    }),
  });

  expect(res.status).toBe(400);
  expect(unpack(new Uint8Array(await res.arrayBuffer()))).toEqual({ message: 'Could not parse body. Path must be an array of strings.' });
});

test('errors when request path is not an array', async () => {
  const server = await serve(serverAPI);
  const res = await fetch(`http://localhost:${server.port}`, {
    method: 'POST',
    body: pack({
      path: 'version',
      args: [],
    }),
  });

  expect(res.status).toBe(400);
  expect(unpack(new Uint8Array(await res.arrayBuffer()))).toEqual({ message: 'Could not parse body. Path must be an array of strings.' });
});

test('errors when request path contains non-strings', async () => {
  const server = await serve(serverAPI);
  const res = await fetch(`http://localhost:${server.port}`, {
    method: 'POST',
    body: pack({
      path: [0],
      args: [],
    }),
  });

  expect(res.status).toBe(400);
  expect(unpack(new Uint8Array(await res.arrayBuffer()))).toEqual({ message: 'Could not parse body. Path must be an array of strings.' });
});

test('errors when request args is missing', async () => {
  const server = await serve(serverAPI);
  const res = await fetch(`http://localhost:${server.port}`, {
    method: 'POST',
    body: pack({
      path: ['version'],
    }),
  });

  expect(res.status).toBe(400);
  expect(unpack(new Uint8Array(await res.arrayBuffer()))).toEqual({ message: 'Could not parse body. Args must be an array.' });
});

test('errors when requested path is not a function', async () => {
  const { client } = await start(serverAPI);

  // @ts-expect-error: client.artists should not be a function
  return expect(client.artists()).rejects.toThrowError('Path "artists" could not be found in the app.');
});

test('errors when requested path is not found', async () => {
  const { client } = await start(serverAPI);

  // @ts-expect-error: client.artists.findByInstrument should be undefined
  return expect(client.artists.findByInstrument()).rejects.toThrowError('Path "artists.findByInstrument" could not be found in the app.');
});

test('responds to OPTIONS with allowed methods', async () => {
  const server = await serve({});
  const res = await fetch(`http://localhost:${server.port}`, { method: 'OPTIONS' });
  
  expect(res.headers.get('Access-Control-Allow-Methods')).toBe('OPTIONS, POST');
});

test('responds to OPTIONS with allowed methods with node http server', async () => {
  const port = await getPort();
  const server = createHttpServer(createController({})).listen(port);
  const res = await fetch(`http://localhost:${port}`, { method: 'OPTIONS' });

  expect(res.headers.get('Access-Control-Allow-Methods')).toBe('OPTIONS, POST');

  server.close();
});
