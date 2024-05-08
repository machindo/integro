import { sleep } from 'bun';
import { expect, mock, test } from 'bun:test';
import getPort from 'get-port';
import { createServer } from 'http';
import { all, allSequential, allSettled, allSettledSequential } from '../batch.js';
import { IntegroApp } from '../client.js';
import { ClientConfig, createClient } from '../createClient.js';
import { SubscriptionControllerConfig, createSubscriptionController } from '../createSubscriptionController.js';

const createServerAPI = () => {
  const artists = [
    { id: 'clvfae6bu0000cgvc4ufm336g', name: 'miles', dob: new Date('1926-05-26') },
    { id: 'clvfaey730002cgvc5th8e890', name: 'monk', dob: new Date('1917-10-10') },
    { id: 'clvfaf07y0004cgvcbw5f7fda', name: 'mingus', dob: new Date('1922-04-22') },
  ];

  const serverAPI = {
    version: () => '0.1.0',
    artists: {
      findById: (id: string) => {
        if (!id) throw new Error('id must be a non-empty string');

        return artists.find(a => a.id === id)
      },
      findByName: async (name: string) => artists.find(a => a.name === name),
    },
  };

  return { serverAPI };
};

const serve = async (app: IntegroApp, serverConfig?: SubscriptionControllerConfig) => {
  const port = await getPort()
  const { createWebSocketServer, handleRequest, unsubscribeAll } = createSubscriptionController(app, serverConfig);
  const controller = mock(handleRequest);
  const server = createServer(controller)
    .on('upgrade', createWebSocketServer)
    .listen(port);

  return {
    controller,
    port,
    server,
    unsubscribeAll
  };
};

const start = async <App extends IntegroApp>(app: App, clientConfig?: ClientConfig, serverConfig?: SubscriptionControllerConfig) => {
  const { controller, port, server, unsubscribeAll } = await serve(app, serverConfig);
  const client = createClient<typeof app>(`http://localhost:${port}`, clientConfig);

  return { client, controller, port, server, unsubscribeAll };
};

test.each(Object.entries({ all, allSequential }))
  ('%s returns an array of results', async (_, batch) => {
    const { serverAPI } = createServerAPI();
    const { client } = await start(serverAPI);

    expect(batch([
      client.artists.findById('clvfae6bu0000cgvc4ufm336g'),
      client.artists.findById('clvfaey730002cgvc5th8e890'),
      client.artists.findById('clvfaf07y0004cgvcbw5f7fda'),
    ]).then()).resolves.toEqual([
      { id: 'clvfae6bu0000cgvc4ufm336g', name: 'miles', dob: new Date('1926-05-26') },
      { id: 'clvfaey730002cgvc5th8e890', name: 'monk', dob: new Date('1917-10-10') },
      { id: 'clvfaf07y0004cgvcbw5f7fda', name: 'mingus', dob: new Date('1922-04-22') },
    ]);
  });

test.each(Object.entries({ allSettled, allSettledSequential }))
  ('%s returns an array of results', async (_, batch) => {
    const { serverAPI } = createServerAPI();
    const { client } = await start(serverAPI);

    expect(batch([
      client.artists.findById('clvfae6bu0000cgvc4ufm336g'),
      client.artists.findById('clvfaey730002cgvc5th8e890'),
      client.artists.findById('clvfaf07y0004cgvcbw5f7fda'),
    ]).then()).resolves.toEqual([
      { status: 'fulfilled', value: { id: 'clvfae6bu0000cgvc4ufm336g', name: 'miles', dob: new Date('1926-05-26') } },
      { status: 'fulfilled', value: { id: 'clvfaey730002cgvc5th8e890', name: 'monk', dob: new Date('1917-10-10') } },
      { status: 'fulfilled', value: { id: 'clvfaf07y0004cgvcbw5f7fda', name: 'mingus', dob: new Date('1922-04-22') } },
    ]);
  });

test.each(Object.entries({ all, allSequential }))
  ('%s fails when any sub-requests fail', async (_, batch) => {
    const { serverAPI } = createServerAPI();
    const { client } = await start(serverAPI);

    expect(batch([client.version(), client.artists.findById('')]).then()).rejects.toThrowError('id must be a non-empty string')
  });

test.each(Object.entries({ allSettled, allSettledSequential }))
  ('%s succeeds even when some sub-requests fail', async (_, batch) => {
    const { serverAPI } = createServerAPI();
    const { client } = await start(serverAPI);
    const res = await batch([client.version(), client.artists.findById('')]);

    expect(res).toEqual([
      { status: 'fulfilled', value: '0.1.0' },
      { status: 'rejected', reason: { message: 'id must be a non-empty string' } },
    ]);
  });

test.each(Object.entries({ all, allSequential, allSettled, allSettledSequential }))
  ('%s send a single call', async (_, batch) => {
    const { serverAPI } = createServerAPI();
    const { client, controller } = await start(serverAPI);

    await batch([
      client.artists.findById('clvfae6bu0000cgvc4ufm336g'),
      client.artists.findById('clvfaey730002cgvc5th8e890'),
      client.artists.findById('clvfaf07y0004cgvcbw5f7fda'),
    ]);

    expect(controller).toHaveBeenCalledTimes(1);
  });

test.each(Object.entries({ all, allSequential, allSettled, allSettledSequential }))
  ('%s calls are lazy', async (_, batch) => {
    const { serverAPI } = createServerAPI();
    const { client, controller } = await start(serverAPI);

    batch([client.version()]);

    await sleep(0);

    expect(controller).toHaveBeenCalledTimes(0);
  });

test.each(Object.entries({ all, allSequential, allSettled, allSettledSequential }))
  ('%s returns successfully with empty array', async (_, batch) => {
    expect(batch([]).then()).resolves.toEqual([]);
  });

test.each(Object.entries({ all, allSequential, allSettled, allSettledSequential }))
  ('%s throws when given a non-IntegroPromise', async (_, batch) => {
    const { serverAPI } = createServerAPI();
    const { client } = await start(serverAPI);

    expect(() => batch([client.version().then()])).toThrowError('Only IntegroPromises can be batched');
  });

test.each(Object.entries({ all, allSequential, allSettled, allSettledSequential }))
  ('%s reruns the same calls when called again', async (_, batch) => {
    const { serverAPI } = createServerAPI();
    const { client, controller } = await start(serverAPI);
    const calls = [
      client.artists.findById('clvfae6bu0000cgvc4ufm336g'),
      client.artists.findById('clvfaey730002cgvc5th8e890'),
      client.artists.findById('clvfaf07y0004cgvcbw5f7fda'),
    ];

    await calls[0];
    await batch(calls);
    await batch(calls);

    expect(controller).toHaveBeenCalledTimes(3);
  });

test.each(Object.entries({ all, allSequential }))
  ('%s resolves passed-in promises', async (_, batch) => {
    const { serverAPI } = createServerAPI();
    const { client, controller } = await start(serverAPI);
    const artist1Promise = client.artists.findById('clvfae6bu0000cgvc4ufm336g');
    const artist2Promise = client.artists.findById('clvfaey730002cgvc5th8e890');

    const batchRes = await batch([artist1Promise, artist2Promise]);
    const artist1 = await artist1Promise;

    expect(controller).toHaveBeenCalledTimes(1);
    expect(batchRes).toEqual([
      { id: 'clvfae6bu0000cgvc4ufm336g', name: 'miles', dob: new Date('1926-05-26') },
      { id: 'clvfaey730002cgvc5th8e890', name: 'monk', dob: new Date('1917-10-10') },
    ]);
    expect(artist1).toEqual({ id: 'clvfae6bu0000cgvc4ufm336g', name: 'miles', dob: new Date('1926-05-26') });
    expect(artist2Promise.then()).resolves.toEqual({ id: 'clvfaey730002cgvc5th8e890', name: 'monk', dob: new Date('1917-10-10') });

    await sleep(0);

    expect(controller).toHaveBeenCalledTimes(1);
  });

test.each(Object.entries({ allSettled, allSettledSequential }))
  ('%s resolves passed-in promises', async (_, batch) => {
    const { serverAPI } = createServerAPI();
    const { client, controller } = await start(serverAPI);
    const artist1Promise = client.artists.findById('clvfae6bu0000cgvc4ufm336g');
    const artist2Promise = client.artists.findById('');

    const batchRes = await batch([artist1Promise, artist2Promise]);
    const artist1 = await artist1Promise;

    expect(controller).toHaveBeenCalledTimes(1);
    expect(batchRes).toEqual([
      { status: 'fulfilled', value: { id: 'clvfae6bu0000cgvc4ufm336g', name: 'miles', dob: new Date('1926-05-26') } },
      { status: 'rejected', reason: { message: 'id must be a non-empty string' } },
    ]);
    expect(artist1).toEqual({ id: 'clvfae6bu0000cgvc4ufm336g', name: 'miles', dob: new Date('1926-05-26') });
    expect(artist2Promise.then()).rejects.toThrowError({ message: 'id must be a non-empty string' });

    await sleep(0);

    expect(controller).toHaveBeenCalledTimes(1);
  });

test.each(Object.entries({ all, allSequential, allSettled, allSettledSequential }))
  ('%s can be destructured into an array of the original promises', async (_, batch) => {
    const { serverAPI } = createServerAPI();
    const { client } = await start(serverAPI);
    const [versionRequest, artist1Request, artist2Request] = batch([
      client.version(),
      client.artists.findById('clvfae6bu0000cgvc4ufm336g'),
      client.artists.findById('')
    ]);

    expect(versionRequest.then()).resolves.toEqual('0.1.0');
    expect(artist1Request.then()).resolves.toEqual({ id: 'clvfae6bu0000cgvc4ufm336g', name: 'miles', dob: new Date('1926-05-26') });
    expect(artist2Request.then()).rejects.toThrowError('id must be a non-empty string');
  });

test.each(Object.entries({ all, allSequential, allSettled, allSettledSequential }))
  ('destructured %s promises do not result in additional fetches', async (_, batch) => {
    const { serverAPI } = createServerAPI();
    const { client, controller } = await start(serverAPI);
    const [artist1Promise, artist2Promise] = [
      client.artists.findById('clvfae6bu0000cgvc4ufm336g'),
      client.artists.findById('clvfaey730002cgvc5th8e890'),
    ];
    await batch([artist1Promise, artist2Promise]);

    expect(await artist1Promise).toEqual({ id: 'clvfae6bu0000cgvc4ufm336g', name: 'miles', dob: new Date('1926-05-26') });
    expect(await artist2Promise).toEqual({ id: 'clvfaey730002cgvc5th8e890', name: 'monk', dob: new Date('1917-10-10') });

    expect(controller).toHaveBeenCalledTimes(1);
  });

test.each(Object.entries({ all, allSequential, allSettled, allSettledSequential }))
  ('awaiting the final item of the destructured %s executes the batch', async (_, batch) => {
    const { serverAPI } = createServerAPI();
    const { client, controller } = await start(serverAPI);
    const [artist1Promise, artist2Promise, run] = batch([
      client.artists.findById('clvfae6bu0000cgvc4ufm336g'),
      client.artists.findById('clvfaey730002cgvc5th8e890'),
    ]);

    await run();

    expect(await artist1Promise).toEqual({ id: 'clvfae6bu0000cgvc4ufm336g', name: 'miles', dob: new Date('1926-05-26') });
    expect(await artist2Promise).toEqual({ id: 'clvfaey730002cgvc5th8e890', name: 'monk', dob: new Date('1917-10-10') });

    expect(controller).toHaveBeenCalledTimes(1);
  });

test.each(Object.entries({ all, allSettled }))
  ('%s resolves promises fastest-first', async (_, batch) => {
    const callOrder: string[] = [];
    const serverAPI = {
      nap: () => sleep(0).then(() => callOrder.push('nap')),
      sleep: () => sleep(20).then(() => callOrder.push('sleep')),
      coma: () => sleep(40).then(() => callOrder.push('coma')),
    };
    const { client } = await start(serverAPI);

    await batch([client.coma(), client.nap(), client.sleep()]);

    expect(callOrder).toEqual(['nap', 'sleep', 'coma']);
  });

test.each(Object.entries({ allSequential, allSettledSequential }))
  ('%s resolves promises in order', async (_, batch) => {
    const callOrder: string[] = [];
    const serverAPI = {
      nap: () => sleep(0).then(() => callOrder.push('nap')),
      sleep: () => sleep(20).then(() => callOrder.push('sleep')),
      coma: () => sleep(40).then(() => callOrder.push('coma')),
    };
    const { client } = await start(serverAPI);

    await batch([client.coma(), client.nap(), client.sleep()]);

    expect(callOrder).toEqual(['coma', 'nap', 'sleep']);
  });

test('batches can be nested', async () => {
  const { serverAPI } = createServerAPI();
  const { client, controller } = await start(serverAPI);
  const res = await all([
    allSettledSequential([client.artists.findById('clvfae6bu0000cgvc4ufm336g')]),
    allSequential([client.artists.findById('clvfaey730002cgvc5th8e890'), client.artists.findById('clvfaf07y0004cgvcbw5f7fda')]),
    allSettled([client.artists.findById(''), client.artists.findById('clvfaf07y0004cgvcbw5f7fda')])
  ]);

  expect(res).toEqual([
    [
      { status: 'fulfilled', value: { id: 'clvfae6bu0000cgvc4ufm336g', name: 'miles', dob: new Date('1926-05-26') } }
    ],
    [
      { id: 'clvfaey730002cgvc5th8e890', name: 'monk', dob: new Date('1917-10-10') },
      { id: 'clvfaf07y0004cgvcbw5f7fda', name: 'mingus', dob: new Date('1922-04-22') },
    ],
    [
      { status: 'rejected', reason: { message: 'id must be a non-empty string' } },
      { status: 'fulfilled', value: { id: 'clvfaf07y0004cgvcbw5f7fda', name: 'mingus', dob: new Date('1922-04-22') } },
    ],
  ]);

  expect(controller).toHaveBeenCalledTimes(1);
})