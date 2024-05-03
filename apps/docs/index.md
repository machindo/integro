---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "Integro"
  text: "Seamless API integration with E2E integrity."
  tagline: Convert your functions into an API server plus a type-safe client in just 2 lines of code.
  actions:
    - theme: brand
      text: What is integro?
      link: /introduction/what-is-integro
    - theme: alt
      text: Getting Started
      link: /introduction/getting-started

features:
  - title: Seamless integration
    details: Write functions on the server. Call those functions from the client, types included. Don't waste time designing and maintaining your endpoints.
  - title: Go beyond JSON
    details: Integro uses MessagePack internally to send nearly any data type to and from the server, including binary data and JS Dates.
  - title: Pub/Sub
    details: With integro, publishing and subscribing to events couldn't be easier. Upgrade to web sockets with 1 additional line of code.
  - title: Framework agnostic
    details: Integro supports Node's http/s, Bun.serve, Express, and more. You can also plug it into your existing REST API.
  - title: Batching
    details: Call multiple functions with a single HTTP request.
  - title: Server-side validation made easy
    details: Works with many popular validation libraries, including Zod, Typia, and Prisma's built-in validation.
---

<script setup>
  import { version } from '../../packages/core/package.json'
</script>

## Quick example

::: code-group

```ts-vue [Server]
import { createServer } from 'node:http'
import { createController } from 'integro'

export const app = {
  version: () => '{{ version }}',
  greetings: {
    sayHey: (name: string) => `Hey, ${name}!`,
  },
}

createServer(createController(app)).listen()
```

```ts-vue [Client]
import { createClient } from 'integro/client'
import type { app } from './app'

export const api = createClient<typeof app>()

console.log(await api.version())
// -> "{{ version }}"
console.log(await api.greetings.sayHey('Babe'))
// -> "Hey, Babe!"
console.log(await api.greetings('Babe')) // Error: This expression is not callable. // [!code error]
console.log(await api.greetings.sayHey(666)) // Error: Argument of type 'number' is not assignable to parameter of type 'string'. // [!code error]
```

:::
