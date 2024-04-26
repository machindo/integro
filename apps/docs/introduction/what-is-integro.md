# What is Integro?

Designed for rapid development and end-to-end type safety, Integro is an alternative to REST and GraphQL patterns which provides a seamless developer experience.

::: info Definition

The word **integro** is Latin and comes from the Latin word **integer**, meaning untouched or unhurt. It shares the same root as **integration**, **integral**, and **integrity**.

***Verb***<br>
**integrō** (present infinitive integrāre, perfect active integrāvī, supine integrātum); first conjugation

1. to renew, restore, make whole
2. to begin again, start from scratch
3. to recreate, refresh
4. (Medieval Latin) to finish

***Adjective***<br>
**integrō** ablative/dative neuter/masculine singular of integer
1. complete, whole, intact, uninjured, sound, healthy 
:::

## End-to-end type safety

Integro provides your client with the same types you define on the server side.

It turns this server-side app object ...

```ts
export const serverApi = {
  version: () => '1.0.0',
  greetings: {
    sayHello: async (name: string) => `Hello, ${name}!`,
    sayGoodbye: async (name: string) => `Goodbye, ${name}!`
  },
  currentServerDateTime: () => new Date();
};
```

... into this client-side object:

```ts
const clientApi: {
  version: () => Promise<string>;
  greetings: {
    sayHello: (name: string) => Promise<string>;
    sayGoodbye: (name: string) => Promise<string>;
  };
  currentServerDateTime: () => Promise<Date>; // <- Yup! A real JS Date object
};
```

## Doesn't this couple the client and API too tightly?

Perhaps. But doesn't REST? Doesn't GraphQL? If you change an endpoint in your REST API, your client
app will break, but you may not notice it right away and it can be difficult to track down every usage
of that endpoint. The same goes with a change in the request or response types.

With integro's E2E type safety, any change in path, request, or response types on the server
become immediately obvious on the client-side in your IDE and at build time.

## What's wrong with REST?

There's nothing wrong with REST itself, but it does result in problems that belong to one of three camps:

1. Nobody seems to agree on what a RESTful API is.

   * When should you use POST vs PUT vs PATCH?
   * Should a GET call for all "all white ravens" return 404 or an empty array?

   The answers are obvious to me and may be obvious to you, but you and I may still disagree. In the end,
   arguing over these points takes up valuable time while providing little value in return.

2. REST on its own provides no type safety. OpenAPI helps a lot, but it mostly amounts to an
   additional documentation that developers need to look up to make sure they're following. Types
   can be shared across domains, but they are usually manually written, and therefor take time
   to maintain and are open to bugs. On top of that, REST APIs tend to be serialized with JSON
   (or some other text-based format), which prevents losslessly sending complex objects, such as
   JavaScript Dates, over the network.

3. You have to spend time designing your API.
   
   * What should the route be to get the data representing the current user?
   * What format should query parameters be?
   * What format should the response be?

   In addition to the time you spend writing your server code, you have to spend time designing the
   server-client contract and maintaining that as your app grows. This can duplicate the amount of time
   you spend

With integro, you don't have to worry about fitting some spec that you can't even agree on. You
write your functions on the server-side and you call those functions on the client-side. Done and done.

## What's wrong with GraphQL?

GraphQL looks simple at first glance, but it usually involves a lot of additional configuration,
parsing, and API design just like with REST.
