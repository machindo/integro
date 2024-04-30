# `createSubscriptionController`

`createSubscriptionController` provides an easy web socket setup.

## Type definition

```ts
type SubscriptionControllerConfig = {
  subscribeKey?: string;
};

const createSubscriptionController: (app: IntegroApp, config?: SubscriptionControllerConfig) => {
  createWebSocketServer: (request: IncomingMessage, socket: Duplex, head: Buffer) => void;
  handleRequest: RequestHandler; /* See createController */
  unsubscribeAll: () => void;
  websocketHandlers: {
    close: () => void;
    message: (ws: WebSocket, message: ArrayBuffer | Buffer | Buffer[]) => void;
    open: (ws: WebSocket) => void;
  }
};
```

## Usage

### Node's built-in http module

```ts
import { createSubscriptionController } from 'integro';
import { createServer } from 'node:http'; // or 'node:https'
import { app } from './app';

const { createWebSocketServer, handleRequest } = createSubscriptionController(app);

createServer(handleRequest)
  .on('upgrade', createWebSocketServer)
  .listen(8000);
```

### Bun's built-in serve function

```ts
import { serve } from 'bun';
import { createSubscriptionController } from 'integro';
import { app } from './app.js';

const { handleRequest, websocketHandlers } = createSubscriptionController(app);

Bun.serve({
  port: await getPort(),
  fetch: (req, server) => server.upgrade(req) ? undefined : handleRequest(req),
  websocket: websocketHandlers
});
```

### Express

```ts
import { app } from './app';
import { createSubscriptionController } from 'integro';
import express from 'express';

const { createWebSocketServer, handleRequest } = createSubscriptionController(app);

express()
  .use(handleRequest)
  .listen(8000)
  .on('upgrade', createWebSocketServer);
```

## Parameters

### `app`

**Type:** `IntegroApp`<br>
**Required:** true

Your app object or function.

### `config`

**Type:** `SubscriptionControllerConfig`<br>
**Default:** `{}`

#### `config.subscribeKey`

**Type:** `string`<br>
**Default:** "subscribe"

The leaf endpoint which will trigger a subscription. If creating subscribable endpoints using `createSubject`, then the default "subscribe" should be used.
