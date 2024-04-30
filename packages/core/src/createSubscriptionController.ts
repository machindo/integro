import type { ServerWebSocket } from 'bun';
import { pack, unpack } from 'msgpackr';
import { IncomingMessage } from 'node:http';
import { Duplex } from 'node:stream';
import WebSocket, { WebSocketServer } from 'ws';
import { IntegroApp } from './client.js';
import { createController } from './createController.js';
import { BodyParsingError } from './types/errors.js';
import { everyItemIsString } from './utils/everyItemIsString.js';
import { resolveProp } from './utils/resolveProp.js';
import { rawDataToBuffer } from './utils/rawDataToBuffer.js';

export type SubscriptionControllerConfig = {
  subscribeKey?: string;
};

const getData = (message: ArrayBuffer | Buffer | Buffer[]) => {
  const buffer = rawDataToBuffer(message);
  const data = unpack(buffer) as { type: string; auth?: string; path: string[]; args: unknown[] };

  return data;
};

export const createSubscriptionController = (app: IntegroApp, { subscribeKey = 'subscribe' }: SubscriptionControllerConfig = {}) => {
  const subjectUnsubscribes: (() => void)[] = [];
  const unsubscribeAll = () => subjectUnsubscribes.forEach(unsubscribe => unsubscribe());
  const handleMessage = async (ws: ServerWebSocket | WebSocket, message: WebSocket.RawData | string) => {
    if (typeof message === 'string') return;
    const { type, auth, path, args } = getData(message);

    try {
      if (typeof type !== 'string') {
        throw new BodyParsingError('Could not parse body. `type` must be a string.');
      }

      if (auth && typeof auth !== 'string') {
        throw new BodyParsingError('Could not parse body. `auth` must be a string or undefined.');
      }

      if (!Array.isArray(path) || !everyItemIsString(path)) {
        throw new BodyParsingError('Could not parse body. `path` must be an array of strings.');
      }

      if (!Array.isArray(args)) {
        throw new BodyParsingError('Could not parse body. Args must be an array.');
      }

      if (type !== 'subscribe') return;
      if (path.at(-1) !== subscribeKey) return;

      const subscribe = await resolveProp({ path, app, context: { type: 'message', auth } });

      if (typeof subscribe !== 'function') return;

      const unsubscribe = args.length ? subscribe(...args)((message: unknown) => {
        ws.send(pack({
          type: 'event',
          path,
          message,
        }));
      }) : subscribe((message: unknown) => {
        ws.send(pack({
          type: 'event',
          path,
          message,
        }));
      });

      subjectUnsubscribes.push(unsubscribe);
    } catch (e) {
      if (e instanceof Error) {
        ws.send(pack({ type: 'error', path, message: { message: e.message, name: e.name } }));
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
