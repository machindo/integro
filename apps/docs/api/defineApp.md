# `defineApp`

`defineApp` is an optional helper to provide type checking for your app object.

## Type definition

```ts
const defineApp = <T extends IntegroApp>(app: T) => app;
```

## Usage

```ts
// app.ts

import { defineApp } from 'integro';

export const app = defineApp({
  version: () => '1.0.0',
  greetings: {
    sayHello: (name: string) => `Hello, ${name}!`,
    sayGoodbye: (name: string) => `Goodbye, ${name}!`
  },
  author: 'Wheeberry Hooperson', // Error: must be a function // [!code error]
});
```

## Parameters

### `app`

**Type:** `IntegroApp`<br>
**Required:** true

Your app object or function.
