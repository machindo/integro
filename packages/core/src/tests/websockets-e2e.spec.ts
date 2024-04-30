import { sleep } from 'bun';
import { expect, mock, test } from 'bun:test';
import express from 'express';
import getPort from 'get-port';
import { createServer } from 'http';
import { ClientConfig, createClient } from '../client';
import { createSubject } from '../createSubject';
import { createSubscriptionController } from '../createSubscriptionController';
import { IntegroApp, createController, unwrap } from '../index';

const createServerAPI = () => {
  const restrictedUpdates$ = createSubject<number>();
  const serverAPI = {
    version: () => '0.1.0',
    artists: {
      updates: createSubject<{ name: string }[]>(), // misnamed subject
      update$: createSubject<{ name: string }[]>(),
    },
    restricted: unwrap(({ auth }) => {
      if (auth !== 'bear') throw new Error('Bears only!');

      return { update$: restrictedUpdates$ };
    }),
    teapot: {
      brew$: createSubject<{ type: string }>()
    },
  };

  return { restrictedUpdates$, serverAPI };
};

const serve = async (app: IntegroApp) => {
  const port = await getPort()
  const { createWebSocketServer, handleRequest, unsubscribeAll } = createSubscriptionController(app);
  const server = createServer(handleRequest)
    .on('upgrade', createWebSocketServer)
    .listen(port);

  return {
    port,
    server,
    unsubscribeAll
  }
};

const start = async <App extends IntegroApp>(app: App, clientConfig?: ClientConfig) => {
  const { port, server, unsubscribeAll } = await serve(app);
  const client = createClient<typeof app>(`http://localhost:${port}`, clientConfig);

  return { client, port, server, unsubscribeAll };
};

test('client receives subject updates from server', async () => {
  const { serverAPI } = createServerAPI();
  const { client, server } = await start(serverAPI);
  const handler = mock();

  await sleep(10);

  client.artists.update$.subscribe(handler);

  await sleep(10);

  serverAPI.artists.update$.send([{ name: 'chick' }]);

  await sleep(10);

  expect(handler).toHaveBeenCalledTimes(1);
  expect(handler).toHaveBeenCalledWith([{ name: 'chick' }]);

  server.close();
});

test('client only receives updates from chosen path', async () => {
  const { serverAPI } = createServerAPI();
  const { client, server } = await start(serverAPI);
  const artistsUpdateHandler = mock();
  const teapotBrewHandler = mock();

  await sleep(10);

  client.artists.update$.subscribe(artistsUpdateHandler);
  client.teapot.brew$.subscribe(teapotBrewHandler);

  await sleep(10);

  serverAPI.teapot.brew$.send({ type: 'oolong' });

  await sleep(10);

  expect(artistsUpdateHandler).not.toHaveBeenCalled();
  expect(teapotBrewHandler).toHaveBeenCalledTimes(1);
  expect(teapotBrewHandler).toHaveBeenCalledWith({ type: 'oolong' });

  server.close();
});

test('client fetches http even with websocket connection open', async () => {
  const { serverAPI } = createServerAPI();
  const { client, server } = await start(serverAPI);
  const handler = mock();

  await sleep(10);

  client.artists.update$.subscribe(handler);

  await sleep(10);

  expect(client.version()).resolves.toBe('0.1.0');

  server.close();
});

test.skipIf(!process.isBun)('web sockets work with bun', async () => {
  const serverAPI = { update$: createSubject<string>() };
  const { handleRequest, websocketHandlers } = createSubscriptionController(serverAPI);
  const handler = mock();
  const server = Bun.serve({
    port: await getPort(),
    fetch: (req, server) => server.upgrade(req) ? undefined : handleRequest(req),
    websocket: websocketHandlers,
  });

  const client = createClient<typeof serverAPI>(`http://localhost:${server.port}`);

  await sleep(10);

  client.update$.subscribe(handler);

  await sleep(10);

  serverAPI.update$.send('Hi!');
  serverAPI.update$.send('Bye!');

  await sleep(10);

  expect(handler).toHaveBeenCalledTimes(2);
  expect(handler).toHaveBeenNthCalledWith(1, 'Hi!');
  expect(handler).toHaveBeenNthCalledWith(2, 'Bye!');

  server.stop();
});

test.skipIf(!process.isBun)('client fetches http even with websocket connection open (the bun version)', async () => {
  const { serverAPI } = createServerAPI();
  const { handleRequest, websocketHandlers } = createSubscriptionController(serverAPI);
  const handler = mock();
  const server = Bun.serve({
    port: await getPort(),
    fetch: (req, server) => server.upgrade(req) ? undefined : handleRequest(req),
    websocket: websocketHandlers,
  });

  const client = createClient<typeof serverAPI>(`http://localhost:${server.port}`);

  await sleep(10);

  client.artists.update$.subscribe(handler);

  await sleep(10);

  expect(client.version()).resolves.toBe('0.1.0');

  server.stop();
});

test('web sockets work with express', async () => {
  const serverAPI = { update$: createSubject<string>() };
  const { createWebSocketServer, handleRequest } = createSubscriptionController(serverAPI);
  const handler = mock();
  const port = await getPort();
  const client = createClient<typeof serverAPI>(`http://localhost:${port}`);

  express()
    .use(handleRequest)
    .listen(port)
    .on('upgrade', createWebSocketServer);

  await sleep(10);

  client.update$.subscribe(handler);

  await sleep(10);

  serverAPI.update$.send('Hi!');
  serverAPI.update$.send('Bye!');

  await sleep(10);

  expect(handler).toHaveBeenCalledTimes(2);
  expect(handler).toHaveBeenNthCalledWith(1, 'Hi!');
  expect(handler).toHaveBeenNthCalledWith(2, 'Bye!');
});

test('stops listeners when unsubscribeAll is called', async () => {
  const { serverAPI } = createServerAPI();
  const { client, server, unsubscribeAll } = await start(serverAPI);
  const handler = mock();

  await sleep(10);

  client.artists.update$.subscribe(handler);

  await sleep(10);

  serverAPI.artists.update$.send([{ name: 'duke' }]);
  unsubscribeAll();

  await sleep(10);

  serverAPI.artists.update$.send([{ name: 'jellyroll' }]);

  await sleep(10);

  expect(handler).toHaveBeenCalledTimes(1);
  expect(handler).toHaveBeenCalledWith([{ name: 'duke' }]);

  server.close();
});

test('can access restricted subscription with auth', async () => {
  const { restrictedUpdates$, serverAPI } = createServerAPI();
  const { client, server } = await start(serverAPI, { auth: 'bear' });
  const handler = mock();

  await sleep(10);

  client.restricted.update$.subscribe(handler);

  await sleep(10);

  restrictedUpdates$.send(42);

  await sleep(10);

  expect(handler).toHaveBeenCalledTimes(1);
  expect(handler).toHaveBeenCalledWith(42);

  server.close();
});

test('cannot access restricted subscription without auth', async () => {
  const { restrictedUpdates$, serverAPI } = createServerAPI();
  const { client, server } = await start(serverAPI);
  const handler = mock();

  await sleep(10);

  client.restricted.update$.subscribe(handler);

  await sleep(10);

  restrictedUpdates$.send(42);

  await sleep(10);

  expect(handler).toHaveBeenCalledTimes(1);
  expect(handler).toHaveBeenCalledWith(undefined, { message: 'Bears only!', name: "Error" });
  server.close();
});

test('throws error when accessing subject.send via HTTP', async () => {
  const { serverAPI } = createServerAPI();
  const { client, server } = await start(serverAPI);

  // @ts-expect-error: send is not accessible by the client
  expect(client.artists.update$.send()).rejects.toThrowError('Subjects may not be accessed by the client.');

  server.close();
});

test('throws error when accessing subject.subscribe via HTTP', async () => {
  const { serverAPI } = createServerAPI();
  const { client, server } = await start(serverAPI);

  expect(client.artists.updates.subscribe(() => { })).rejects.toThrowError('Subjects may not be accessed by the client.');

  server.close();
});

test('throws error when accessing subject.subscribe via HTTP', async () => {
  const { serverAPI } = createServerAPI();
  const { client, server } = await start(serverAPI);

  await sleep(10);

  // @ts-expect-error: subscribe must be passed a callback
  expect(client.artists.update$.subscribe()).rejects.toThrowError('First parameter must be a callback function.');

  server.close();
});
