import { sleep } from 'bun';
import { expect, mock, test } from 'bun:test';
import express from 'express';
import getPort from 'get-port';
import { createServer } from 'http';
import WebSocket from 'isomorphic-ws';
import { pack, unpack } from 'msgpackr';
import { ClientConfig, createClient } from '../client.js';
import { createSubject } from '../createSubject.js';
import { SubscriptionControllerConfig, createSubscriptionController } from '../createSubscriptionController.js';
import { IntegroApp, unwrap } from '../index.js';

type ArticleList = { author: string; content: string }[];
type ArticleUpdate = { author: string; content: string };

const createServerAPI = () => {
  const articleList$ = createSubject<ArticleList>();
  const articleUpdate$ = createSubject<ArticleUpdate>();
  const restrictedUpdates$ = createSubject<number>();
  const serverAPI = {
    version: () => '0.1.0',
    articles: {
      list$: {
        subscribe: (author: string) =>
          articleList$.map((list) => list.filter((article) => article.author === author)).subscribe,
      },
      update$: {
        listen: (author: string) =>
          articleUpdate$.filter((article) => article.author === author).subscribe,
        subscribe: (author: string) =>
          articleUpdate$.filter((article) => article.author === author).subscribe,
      },
    },
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

  return { articleList$, articleUpdate$, restrictedUpdates$, serverAPI };
};

const serve = async (app: IntegroApp, serverConfig?: SubscriptionControllerConfig) => {
  const port = await getPort()
  const { createWebSocketServer, handleRequest, unsubscribeAll } = createSubscriptionController(app, serverConfig);
  const server = createServer(handleRequest)
    .on('upgrade', createWebSocketServer)
    .listen(port);

  return {
    port,
    server,
    unsubscribeAll
  };
};

const start = async <App extends IntegroApp>(app: App, clientConfig?: ClientConfig, serverConfig?: SubscriptionControllerConfig) => {
  const { port, server, unsubscribeAll } = await serve(app, serverConfig);
  const client = createClient<typeof app>(`http://localhost:${port}`, clientConfig);

  return { client, port, server, unsubscribeAll };
};

test('client receives subject updates from server', async () => {
  const { serverAPI } = createServerAPI();
  const { client, server } = await start(serverAPI);
  const handler = mock();

  await sleep(20);

  client.artists.update$.subscribe(handler);

  await sleep(20);

  serverAPI.artists.update$.send([{ name: 'chick' }]);

  await sleep(20);

  expect(handler).toHaveBeenCalledTimes(1);
  expect(handler).toHaveBeenCalledWith([{ name: 'chick' }]);

  server.close();
});

test('client receives from multiple paths', async () => {
  const { serverAPI } = createServerAPI();
  const { client, server } = await start(serverAPI);
  const artistsUpdateHandler = mock();
  const teapotBrewHandler = mock();

  await sleep(10);

  client.artists.update$.subscribe(artistsUpdateHandler);

  await sleep(10);

  client.teapot.brew$.subscribe(teapotBrewHandler);

  await sleep(10);

  serverAPI.artists.update$.send([{ name: 'chick' }]);
  serverAPI.teapot.brew$.send({ type: 'oolong' });

  await sleep(10);

  expect(artistsUpdateHandler).toHaveBeenCalledTimes(1);
  expect(artistsUpdateHandler).toHaveBeenCalledWith([{ name: 'chick' }]);
  expect(teapotBrewHandler).toHaveBeenCalledTimes(1);
  expect(teapotBrewHandler).toHaveBeenCalledWith({ type: 'oolong' });

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

  expect(client.version().then()).resolves.toBe('0.1.0');

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

test.skipIf(!process.isBun)('client fetches http even with websocket connection open (bun)', async () => {
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

  expect(client.version().then()).resolves.toBe('0.1.0');

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

test('stops listener when unsubscribe is called', async () => {
  const { serverAPI } = createServerAPI();
  const { client, server } = await start(serverAPI);
  const handler = mock();

  await sleep(10);

  const unsubscribe = client.artists.update$.subscribe(handler);

  await sleep(10);

  serverAPI.artists.update$.send([{ name: 'duke' }]);

  await sleep(10);

  unsubscribe();

  await sleep(10);

  serverAPI.artists.update$.send([{ name: 'jellyroll' }]);

  await sleep(10);

  expect(handler).toHaveBeenCalledTimes(1);
  expect(handler).toHaveBeenCalledWith([{ name: 'duke' }]);

  server.close();
});

test('continues listening when another unsubscribe is called', async () => {
  const { serverAPI } = createServerAPI();
  const { client, server } = await start(serverAPI);
  const handler = mock();

  await sleep(10);

  const unsubscribe = client.teapot.brew$.subscribe(() => { });
  client.artists.update$.subscribe(handler);

  await sleep(10);

  serverAPI.artists.update$.send([{ name: 'duke' }]);
  unsubscribe();

  await sleep(10);

  serverAPI.artists.update$.send([{ name: 'jellyroll' }]);

  await sleep(10);

  expect(handler).toHaveBeenCalledTimes(2);

  server.close();
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

test('parameterized subscriber receives filtered updates', async () => {
  const { articleUpdate$, serverAPI } = createServerAPI();
  const { client, server } = await start(serverAPI);
  const handler = mock();

  await sleep(10);

  client.articles.update$.subscribe('borges', handler);

  await sleep(10);

  articleUpdate$.send({ author: 'borges', content: 'labyrinths' });
  articleUpdate$.send({ author: 'cervantes', content: 'knights' });
  articleUpdate$.send({ author: 'borges', content: 'the moon' });

  await sleep(10);

  expect(handler).toHaveBeenCalledTimes(2);
  expect(handler).toHaveBeenNthCalledWith(1, { author: 'borges', content: 'labyrinths' });
  expect(handler).toHaveBeenNthCalledWith(2, { author: 'borges', content: 'the moon' });

  server.close();
});

test('parameterized subscriber receives mapped updates', async () => {
  const { articleList$, serverAPI } = createServerAPI();
  const { client, server } = await start(serverAPI);
  const handler = mock();

  await sleep(20);

  client.articles.list$.subscribe('borges', handler);

  await sleep(20);

  articleList$.send([
    { author: 'borges', content: 'labyrinths' },
    { author: 'cervantes', content: 'knights' },
    { author: 'borges', content: 'the moon' }
  ]);

  await sleep(20);

  expect(handler).toHaveBeenCalledTimes(1);
  expect(handler).toHaveBeenNthCalledWith(1, [{ author: 'borges', content: 'labyrinths' }, { author: 'borges', content: 'the moon' }]);

  server.close();
});

test('source subject is unsubscribed when filtered subject is unsubscribed', () => {
  const { articleUpdate$, serverAPI } = createServerAPI();
  const unsubscribe = serverAPI.articles.update$.subscribe('')(() => { });

  expect(articleUpdate$._subscriptionCount()).toBe(1);

  unsubscribe();

  expect(articleUpdate$._subscriptionCount()).toBe(0);
});

test('source subject is unsubscribed when mapped subject is unsubscribed', () => {
  const { articleList$, serverAPI } = createServerAPI();
  const unsubscribe = serverAPI.articles.list$.subscribe('')(() => { });

  expect(articleList$._subscriptionCount()).toBe(1);

  unsubscribe();

  expect(articleList$._subscriptionCount()).toBe(0);
});

test('uses subscribeKey from config', async () => {
  const { articleUpdate$, serverAPI } = createServerAPI();
  const { client, server } = await start(serverAPI, { subscribeKey: 'listen' }, { subscribeKey: 'listen' });
  const handler = mock();

  await sleep(10);

  client.articles.update$.listen('borges', handler);

  await sleep(10);

  articleUpdate$.send({ author: 'borges', content: 'labyrinths' });
  articleUpdate$.send({ author: 'cervantes', content: 'knights' });
  articleUpdate$.send({ author: 'borges', content: 'the moon' });

  await sleep(10);

  expect(handler).toHaveBeenCalledTimes(2);
  expect(handler).toHaveBeenNthCalledWith(1, { author: 'borges', content: 'labyrinths' });
  expect(handler).toHaveBeenNthCalledWith(2, { author: 'borges', content: 'the moon' });

  server.close();
});

test('throws error when accessing subject.send via HTTP', async () => {
  const { serverAPI } = createServerAPI();
  const { client, server } = await start(serverAPI);

  // @ts-expect-error: send is not accessible by the client
  expect(client.artists.update$.send().then()).rejects.toThrowError('Subjects may not be accessed by the client.');

  server.close();
});

test('throws error when not supplying a callback', async () => {
  const { serverAPI } = createServerAPI();
  const { client, server } = await start(serverAPI);

  await sleep(10);

  // @ts-expect-error: subscribe must be passed a callback
  expect(() => client.artists.update$.subscribe()).toThrowError('Last parameter must be a callback function.');

  server.close();
});

test('throws error when not sending type', async () => {
  const { serverAPI } = createServerAPI();
  const { port } = await start(serverAPI);
  const handler = mock();
  const ws = new WebSocket(`ws://localhost:${port}`);

  await sleep(10);

  ws.on('message', (data) => handler(unpack(new Uint8Array(data as Buffer))));
  ws.send(pack({ path: ['artists', 'update$', 'subscribe'], args: [] }));

  await sleep(10);

  expect(handler).toHaveBeenCalledWith({
    type: 'error',
    path: ['artists', 'update$', 'subscribe'],
    message: { message: 'Could not parse body. `type` must be a string.', name: "Error" },
  });
});

test('throws error when auth is not a string', async () => {
  const { serverAPI } = createServerAPI();
  const { port } = await start(serverAPI);
  const handler = mock();
  const ws = new WebSocket(`ws://localhost:${port}`);

  await sleep(10);

  ws.on('message', (data) => handler(unpack(new Uint8Array(data as Buffer))));
  ws.send(pack({ type: 'subscribe', auth: 1000, path: ['artists', 'update$', 'subscribe'], args: [] }));

  await sleep(10);

  expect(handler).toHaveBeenCalledWith({
    type: 'error',
    path: ['artists', 'update$', 'subscribe'],
    message: { message: 'Could not parse body. `auth` must be a string or undefined.', name: "Error" },
  });
});

test('throws error when path is missing', async () => {
  const { serverAPI } = createServerAPI();
  const { port } = await start(serverAPI);
  const handler = mock();
  const ws = new WebSocket(`ws://localhost:${port}`);

  await sleep(10);

  ws.on('message', (data) => handler(unpack(new Uint8Array(data as Buffer))));
  ws.send(pack({ type: 'subscribe', args: [] }));

  await sleep(10);

  expect(handler).toHaveBeenCalledWith({
    type: 'error',
    message: { message: 'Could not parse body. `path` must be an array of strings.', name: "Error" },
  });
});

test('throws error when args is missing', async () => {
  const { serverAPI } = createServerAPI();
  const { port } = await start(serverAPI);
  const handler = mock();
  const ws = new WebSocket(`ws://localhost:${port}`);

  await sleep(10);

  ws.on('message', (data) => handler(unpack(new Uint8Array(data as Buffer))));
  ws.send(pack({ type: 'subscribe', path: ['artists', 'update$', 'subscribe'] }));

  await sleep(10);

  expect(handler).toHaveBeenCalledWith({
    type: 'error',
    path: ['artists', 'update$', 'subscribe'],
    message: { message: 'Could not parse body. Args must be an array.', name: "Error" },
  });
});
