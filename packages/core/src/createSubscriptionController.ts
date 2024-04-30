import type { ServerWebSocket } from 'bun';
import { pack, unpack } from 'msgpackr';
import { IncomingMessage } from 'node:http';
import { Duplex } from 'node:stream';
import WebSocket, { WebSocketServer } from 'ws';
import { IntegroApp } from './client.js';
import { isSubject } from './createSubject.js';
import { BodyParsingError } from './types/errors.js';
import { everyItemIsString } from './utils/everyItemIsString.js';
import { resolveProp } from './utils/resolveProp.js';
import { createController } from './createController.js';

const getData = (message: ArrayBuffer | Buffer | Buffer[]) => {
  const buffer = message instanceof Buffer
    ? message
    : Array.isArray(message)
      ? Buffer.concat(message)
      : Buffer.from(message);
  const data = unpack(buffer) as { type: string; auth?: string; path: string[] };

  if (typeof data.type !== 'string') {
    throw new BodyParsingError('Could not parse body. `type` must be a string.');
  }

  if (data.auth && typeof data.auth !== 'string') {
    throw new BodyParsingError('Could not parse body. `auth` must be a string or undefined.');
  }

  if (!Array.isArray(data.path) || !everyItemIsString(data.path)) {
    throw new BodyParsingError('Could not parse body. `path` must be an array of strings.');
  }

  return data;
};

export const createSubscriptionController = (app: IntegroApp) => {
  const subjectUnsubscribes: (() => void)[] = [];
  const unsubscribeAll = () => subjectUnsubscribes.forEach(unsubscribe => unsubscribe());
  const handleMessage = async (ws: ServerWebSocket | WebSocket, message: WebSocket.RawData | string) => {
    if (typeof message === 'string') return;

    const { type, auth, path } = getData(message);

    if (type !== 'subscribe') return;

    try {
      const subject = await resolveProp({ path: path.slice(0, path.length - 1), app, context: { type: 'message', auth } });

      if (!isSubject(subject)) return;

      const unsubscribe = subject.subscribe((message) => {
        ws.send(pack({
          type: 'event',
          path,
          message,
        }));
      });

      subjectUnsubscribes.push(unsubscribe);
    } catch (e) {
      if (e instanceof Error) {
        ws.send(pack({ type: 'error', path, message: { message: e.message, name: e.name } }))
      }
    }
  };
  const connect = (ws: ServerWebSocket | WebSocket) => {
    if ('on' in ws) {
      ws.on('message', (data) => {
        handleMessage(ws, data);
      });
      ws.on('close', unsubscribeAll);
    }
  };
  const createWebSocketServer = (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const webSocketServer = new WebSocketServer({ noServer: true });

    webSocketServer.on('connection', connect);
    webSocketServer.handleUpgrade(request, socket, head, (ws) => {
      webSocketServer.emit('connection', ws, request);
    });
  };

  return {
    createWebSocketServer,
    handleRequest: createController(app),
    unsubscribeAll,
    websocketHandlers: {
      close: unsubscribeAll,
      message: handleMessage,
      open: connect,
    }
  };
};
