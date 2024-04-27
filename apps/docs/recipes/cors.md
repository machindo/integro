# CORS

CORS can be configured according to your chosen server framework.

::: code-group

```ts [node:http]
import { createController } from 'integro';
import { createServer } from 'node:http';
import { app } from './app';

createServer((req, res) => {
  res.setHeader('access-control-allow-credentials', 'true');
  res.setHeader('access-control-allow-headers', 'Content-Type');
  res.setHeader('access-control-allow-origin', 'http://localhost:5173');
  res.setHeader('access-control-max-age', '2592000');

  if (new URL(req.url ?? '', 'https://localhost').pathname === '/api') {
    return createController(app)(req, res);
  }

  res.end();
}).listen(8000);
```

```ts [bun]
import { serve } from 'bun';
import { createController } from 'integro';
import { app } from './app.js';

serve({
  port: 8000,
  fetch: async (req) => {
    const res = await createController(app)(req);

    res.headers.set('access-control-allow-credentials', 'true');
    res.headers.set('access-control-allow-headers', 'Content-Type');
    res.headers.set('access-control-allow-origin', 'http://localhost:5173');
    res.headers.set('access-control-max-age', '2592000');

    return res;
  }
});
```

```ts [express]
import express from 'express';
import { createController } from 'integro';
import { app } from './app';

express()
  .use((_req, res, next) => {
    res.setHeader('access-control-allow-credentials', 'true');
    res.setHeader('access-control-allow-headers', 'Content-Type');
    res.setHeader('access-control-allow-origin', 'http://localhost:5173');
    res.setHeader('access-control-max-age', '2592000');

    next();
  })
  .use(createController(app))
  .listen(8000);
```

:::
