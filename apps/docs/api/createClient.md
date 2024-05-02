# `createClient`

`createClient` creates a client object that matches your server's app object for seamless development.

## Type definition

```ts
type ClientConfig = {
  auth?: string;
  requestInit?: RequestInit | (() => RequestInit);
  subscribeKey?: string;
};

const createClient = <T extends IntegroApp>(url = '/', config?: ClientConfig) => IntegroClient;
```

## Usage

`createClient` can be called on the client side if you include integro as a client-side dependency.

::: code-group

```ts [Client-side apiClient.ts]
import { createController } from 'integro/client';
import type { App } from '@/api/app';

export apiClient = createClient<App>('https://example.com');
```

```ts [Server-side app.ts]
export const app = {
  version: () => '1.0.0',
  greetings: {
    sayHello: (name: string) => `Hello, ${name}!`,
    sayGoodbye: (name: string) => `Goodbye, ${name}!`,
  },
};

export type App = typeof app;
```

:::

For easier dependency management and simpler typing, we recommend having your server app publish its own strongly-typed version of `createClient`:

::: code-group

```ts [Client-side apiClient.ts]
import { createApiClient } from '@/api/createApiClient';

export apiClient = createApiClient<App>('https://example.com');
```

```ts [Server-side createApiClient.ts]
import { createController } from 'integro/client';
import type { app } from './api';

export createApiClient = createClient<typeof app>;
```

```ts [Server-side app.ts]
export const app = {
  version: () => '1.0.0',
  greetings: {
    sayHello: (name: string) => `Hello, ${name}!`,
    sayGoodbye: (name: string) => `Goodbye, ${name}!`,
  },
};
```

:::

## Parameters

`createClient` has 2 optional parameters:

### `url`

**Type:** `string`<br>
**Default:** "/"

The first parameter to createClient is an optional string representing the path your server is running on.

### `config`

**Type:** `ClientConfig`<br>
**Default:** `{}`

The second parameter to createClient is a configuration object which allows you to manipulate the Request before sending it to the server.

#### `config.auth`

**Type:** `string | (() => string | undefined)`<br>
**Default:** `undefined`

Auth token sent in request's "Authorization" header and websocket message body. If supplied, `requestInit.header.Authorization`
overrides `auth` during fetches. `auth` will be used by websockets regardless.

```ts [Set auth header]
import { createApiClient } from '@/api';
import { getCurrentAuthToken } from './authService';

export const api = createClient<App>('https://example.com', {
  auth: () => {
    const currentAuthToken = getCurrentAuthToken();

    return currentAuthToken && `bearer ${currentAuthToken}`;
  }),
});
```

#### `config.requestInit`

**Type:** `RequestInit | (() => RequestInit)`<br>
**Default:** `undefined`

`requestInit` is a standard [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request) object or a function returning one.
It may be used for supporting CORS, cross-site cookies, authentication, and other business requirements.

::: code-group

```ts [Allow cross-domain cookies]
import { createApiClient } from '@/api';

export const api = createApiClient("https://example.com", {
  requestInit: {
    headers: {
      credentials: 'include',
    },
  },
});
```

```ts [Set auth header]
import { createApiClient } from '@/api';
import { getCurrentAuthToken } from './authService';

export const api = createClient<App>('https://example.com', {
  requestInit: () => {
    const currentAuthToken = getCurrentAuthToken();

    return currentAuthToken ? {
      headers: {
        'Authorization': `bearer ${currentAuthToken}`,
      },
    } : {};
  }),
});
```

:::

#### `config.subscribeKey`

**Type:** `string`<br>
**Default:** "subscribe"

The leaf endpoint which will trigger a subscription. If creating subscribable endpoints using `createSubject`, then the default "subscribe" should be used.

## `IntegroPromise` behavior

All client methods return instances of `IntegroPromise`. These are "lazy" promises, which means
they only execute when you call `await`, `.then()`, `.catch()` or `.finally()`. This makes it
possible to [batch API calls](./batch).

```ts
const promise = api.artists.findById(validId); // not executed yet

await promise; // executed here
```

Most of the time, you'll await a method immediately. But in cases where you need to begin execution
immediately without waiting for the results, you can trigger the execution with `.then()` without
passing it a callback.

```ts
test('it fetches an artist from the API', () => {
  const promise = api.artists.findById(validId).then();

  expect(promise).resolves.toEqual({ /* ... */ });
});
```
