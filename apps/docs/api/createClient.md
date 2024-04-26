# `createClient`

`createClient` creates a client object that matches your server's app object for seamless development.

## Type definition

```ts
type ClientConfig = {
  requestInit?: RequestInit | (() => RequestInit);
};

const createClient = <T extends IntegroApp>(url = '/', clientConfig?: ClientConfig) => IntegroClient;
```

## Usage

`createClient` can be called on the client side if you include integro as a client-side dependency.

::: code-group

```ts [Client-side apiClient.ts]
import { integro } from 'integro/browser';
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
import { integro } from 'integro/browser';
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

**Type:** string<br>
**Default:** "/"

The first parameter to createClient is an optional string representing the path your server is running on.

### `clientConfig`

**Type:** `ClientConfig`<br>
**Default:** `{}`

The second parameter to createClient is a configuration object which allows you to manipulate the Request before sending it to the server.

#### `requestInit`

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
      credentials: 'include'
    }
  }
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
        'Authorization': `bearer ${currentAuthToken}`
      }
    } : {};
  })
});
```

:::