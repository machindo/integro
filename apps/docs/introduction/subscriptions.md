# Subscriptions

There's more to an API than sending and fetching data. Integro makes it a piece of 🍰
to allow the client to subscribe to events.

## Server setup

Subscriptions use web sockets. As a result, the server requires a tiny bit more
code to setup than using integro without subscriptions. The client side does
not need any extra setup.

::: code-group
 
```ts [node:http]
import { createSubscriptionController } from 'integro';
import { createServer } from 'node:http'; // or 'node:https'
import { app } from './app';

const { createWebSocketServer, handleRequest } = createSubscriptionController(app);

createServer(handleRequest)
  .on('upgrade', createWebSocketServer)
  .listen(8000);
```

```ts [Bun.serve]
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

```ts [Express]
import { app } from './app';
import { createSubscriptionController } from 'integro';
import express from 'express';

const { createWebSocketServer, handleRequest } = createSubscriptionController(app);

express()
  .use(handleRequest)
  .listen(8000)
  .on('upgrade', createWebSocketServer);
```

:::

## Simple subscriptions

Use the included `createSubject()` function to create a typesafe

::: code-group

```ts [Server-side]
type Article = { author: string; content: string };

const app = {
  articles: {
    create: async (article: Article) => {
      await db.save(article);

      // Notify subscribers
      app.creation$.send(article);
    },
    creation$: createSubject<Article>(),
  },
};
```

```ts [Client-side]
const api = createClient<App>('https://example.com/api');

api.articles.creation$.subscribe(console.log);
// -> { author: 'Me', content: '...' }

api.articles.create({ author: 'Me', content: '...' });
```

:::

## With `unwrap`

Subscriptions can be used with `unwrap`, just like normal requests. However, there are two important things to note:

- The context object will not contain a `request` object because subscriptions are made via web sockets. Instead,
  the `auth` parameter (passed to `createClient`) can be used for authentication.
- `createSubject` should not be called inside the `unwrap` function. Doing so would make the subject scoped
  to the function body and we wouldn't be able to invoke it from elsewhere in the app.

::: code-group

```ts [Server-side]
type Article = { author: string; content: string };

const articleCreation$ = createSubject<Article>();

const app = {
  articles: unwrap(({ auth }) => {
    if (auth !== 'user.auth.token') throw new Error('Unauthenticated!')

    return {
      create: async (article: Article) => {
        await db.save(article);

        // Notify subscribers
        articleCreation$.send(article);
      },
      creation$: articleCreation$,
    };
  }),
};
```

```ts [Client-side]
const api = createClient<App>('https://example.com/api', { auth: 'user.auth.token' });

api.articles.creation$.subscribe(console.log);
// -> { author: 'Me', content: '...' }

api.articles.create({ author: 'Me', content: '...' });
```

:::

## With parameters

In addition to all-or-nothing subscriptions, you can create parameterized subscriptions for
filtering, altering, or authenticating the subscription messages.

Subjects provide `.filter()` and `.map()` methods to make it easy to create a new subject
based on an existing one.

::: code-group

```ts [Server-side]
type Article = { author: string; content: string };

const articleCreation$ = createSubject<Article>();
const articleList$ = createSubject<Article>();

const app = {
  articles: {
    create: async (article: Article) => {
      await db.save(article);
      const list = await db.getAll()

      // Notify subscribers
      articleCreation$.send(article);
      articleList$.send(list);
    },
    creation$: {
      // Create an object with a subscribe function instead of a full subject
      subscribe: (author: string) =>
        articleCreation$.filter((article) => article.author === author).subscribe,
    },
    list$: {
      // Create an object with a subscribe function instead of a full subject
      subscribe: (author: string) =>
        articleList$.map((list) => list.filter((article) => article.author === author)).subscribe,
    },
  },
};
```

```ts [Client-side]
const api = createClient<App>('https://example.com/api');

api.articles.creation$.subscribe('Alice', console.log);
// -> { author: 'Alice', content: 'Article 2' }
// -> { author: 'Alice', content: 'Article 4' }

api.articles.list$.subscribe('Alice', console.log);
// -> []
// -> []
// -> [{ author: 'Alice', content: 'Article 2' }]
// -> [{ author: 'Alice', content: 'Article 2' }]
// -> [{ author: 'Alice', content: 'Article 2' }, { author: 'Alice', content: 'Article 4' }]

api.articles.create({ author: 'Me', content: 'Article 3' });
api.articles.create({ author: 'Timmy', content: 'Article 1' });
api.articles.create({ author: 'Alice', content: 'Article 2' });
api.articles.create({ author: 'Me', content: 'Article 3' });
api.articles.create({ author: 'Alice', content: 'Article 4' });
```

:::
