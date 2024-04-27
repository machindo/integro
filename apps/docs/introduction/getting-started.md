# Getting started

::: info
Your server and client code may be structured however you'd like. It would commonly follow one of these three patterns:

* Server and client are written in the same repository.
* Server and client are written in separate repositories.
* Server and client are written in separate packages in the same monorepo.

The examples in this documentation assume that server and client are in the same repo and that server files can be imported from "@/api/*".
:::

## Installation

Let's start by installing integro in the server app:

::: code-group

```sh [npm]
$ npm add integro
```

```sh [pnpm]
$ pnpm add integro
```

```sh [yarn]
$ yarn add integro
```

```sh [bun]
$ bun add integro
```

:::

## Server setup

::: code-group

```ts [app.ts]
/**
 * Write your API as a monolithic object.
 * Your API object may be
 * - a single function,
 * - an object containing functions,
 * - or nested objects of functions.
 */

export const app = {
  version: () => '1.0.0',
  greetings: {
    sayHello: (name: string) => `Hello, ${name}!`,
    sayGoodbye: (name: string) => `Goodbye, ${name}!`
  }
};
```

```ts [server.ts]
/** 
 * Your app can be served using node's built in http or https module,
 * express, bun, or any other server library that uses compatible middleware.
 */

import { createController } from 'integro';
import { createServer } from 'node:http';
import { app } from './app';

createServer(createController(app)).listen(8000);
```

```ts [createApiClient.ts]
/**
 * Next, we'll export a typed version of integro's `createClient` function.
 */

import { createClient } from 'integro/client';
import type { app } from './app';

export const createApiClient = createClient<typeof app>;
```

:::

> [!IMPORTANT]
> `createApiClient.ts` will be consumed by the client side app, so make sure to do the following:
> 
> * If your client is run in the browser, then import `createClient` from 'integro/client', not 'integro'. If your client happens to be run exclusively on the server (e.g. with SSR), then it doesn't matter which you choose.
> * Import your `app` using the `import type` modifier.


## Client setup

::: code-group

```ts [api.ts]
/**
 * Initialize your API client object with the full path to your server.
 */

import { createApiClient } from '@/api/createApiClient';

export const api = createApiClient('https://example.com');
```

```ts [helloWorld.ts]
import { api } from './api';

const helloWorld = async () => 
  const greeting = await api.greetings.sayHello('World');

  return greeting; // "Hello, World!"
}
```

:::

Because the client is fully typed to mirror the server's implementation, we can avoid mistakes at development time.

```ts
const greeting = await api.greetings.sayHi('World'); // sayHi does not exist // [!code error]

const greeting: number = await api.greetings.sayHello('World'); // sayHello returns a string // [!code error]

const greeting = await api.greetings.sayHello(); // sayHello expects one parameter // [!code error]

const greeting = await api.greetings.sayHello(42); // sayHello expects a string as its only parameter // [!code error]

const greeting = await api.greetings.sayHello('World'); // Everything looks good
```