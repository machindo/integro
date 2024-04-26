# `respondWith`

`respondWith` allows you to alter the status or headers of your response while maintaining the typing of the returned data.

## Type definition

```ts
const respondWith: <T>(data?: T, responseInit?: ResponseInit) => ResponseLike<T>;
```

## Usage

```ts
// app.ts

import { respondWith } from 'integro';
import { createSession } from './authService';

export const app = {
  auth: {
    login: async (username: string, password: string) => {
      const sessionToken = await createSession(username, password);

      return sessionToken
        ? respondWith('Welcome!', { headers: { 'Set-Cookie': `session=${sessionToken}` } })
        : respondWith('Username does not exist or does not match password', { status: 401 });
    },
    logout: () =>
      respondWith('Goodbye!', { headers: { 'Set-Cookie': 'session=deleted; expires=Thu, 01 Jan 1970 00:00:00 GMT' } }),
  },
};
```

On the client side, your methods will return only the data portion of the response:

```ts
const apiClient: {
  auth: {
    login: () => Promise<string>;
    logout: () => Promise<string>;
  };
};
```

## Parameters

### `data`

**Type:** `any`<br>
**Default:** `undefined`

The intended result of calling your function.

### `responseInit`

**Type:** [`ResponseInit`](https://developer.mozilla.org/en-US/docs/Web/API/Response/Response#options)<br>
**Default:** `undefined`

An object to be passed to the Request constructor.
