# `createController`

`createController` is used to convert your app object into a node/express/bun-compliant request handler. This is one of the 2 functions required to run a complete integro app (the other being `createClient`).

## Type definition

```ts
type RequestHandler = (request: IncomingMessage | Request, response?: unknown) => Promise<Response>;

const createController: (app: IntegroApp) => RequestHandler;
```

## Usage


Integro's `createController()` works with servers that accept handlers in the form `(request: IncomingMessage, response: ServerResponse) => void` (Node's http module, Express) as well as the Fetch API style `(request: Request) => Response` (Bun, Next.js).

### Node's built-in `http` module

::: code-group

```ts [Listen to all routes]
import { createController } from 'integro';
import { createServer } from 'node:http'; // or 'node:https'
import { app } from './app';

createServer(createController(app)).listen(8000);
```

```ts [Specific route]
import { createController } from 'integro';
import { createServer } from 'node:http'; // or 'node:https'
import { app } from './app';

createServer((req, res) => {
  if (new URL(req.url ?? '', 'https://localhost').pathname === '/api') {
    return createController(req, res);
  }

  res.end();
}).listen(8000);
```

:::

### Bun's built-in `serve` function

::: code-group

```ts [Listen to all routes]
import { serve } from 'bun';
import { createController } from 'integro';
import { app } from './app.js';

serve({
  port: 8000,
  fetch: createController(app)
});
```

```ts [Specific route]
import { serve } from 'bun';
import { createController } from 'integro';
import { app } from './app.js';

serve({
  port: 8000,
  fetch: (req) => {
    if (new URL(req.url).pathname === '/api') {
      return createController(app)(req);
    }

    return Response.error();
  }
});
```

:::

### Express

::: code-group

```ts [Listen to all routes]
import { app } from './app';
import { createController } from 'integro';
import express from 'express';

express()
  .use(createController(app))
  .listen(8000);
```

```ts [Specific route]
import { app } from './app';
import { createController } from 'integro';
import express from 'express';

const handler = createController(app);

express()
  .options('/api', handler) // <- Responds with the "Access-Control-Allow-Methods" header set to "OPTIONS, POST"
  .post('/api', handler)
  .listen(8000);
```

:::

### Next.js

You can even serve an integro app from a single route in Next.js (with app router)!

```ts
// src/api/route.ts

import { createController } from 'integro';
import { app } from './app';

export const POST = createController(app);
```

> [!NOTE]
> If you're using Next.js with app router, take a look at server actions.
> They may be a better fit for you.

## Parameters

### `app`

**Type:** `IntegroApp`<br>
**Required:** true

Your app object or function.
