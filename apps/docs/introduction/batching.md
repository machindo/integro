# Batching

One of the downsides of the REST paradigm is that it doesn't allow the handling of more than one request per HTTP call.
There are workarounds of course, but those workarounds by necessity are not RESTful. Because Integro isn't RESTful
to begin with, we can batch calls without violating any underlying patterns.

## Basic usage

Integro provides 4 batching functions: `all`, `allSequential`, `allSettled`, and `allSettledSequential`.

### `all`

`all` essentially works like [`Promise.all`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)
except that makes a single request to the server, which itself calls `Promise.all`.

```ts
// All succeed
const [miles, mingus, monk] = await all([
  api.musicians.getByName('Miles'),
  api.musicians.getByName('Mingus'),
  api.musicians.getByName('Monk'),
]);

console.log(miles); // -> { name: "Miles" }
console.log(mingus); // -> { name: "Mingus" }
console.log(monk); // -> { name: "Monk" }

// Some fail = all fail
const [miles, mingus, monk] = await all([
  api.musicians.getByName('Miles'),
  api.musicians.getByName('Mingus'),
  api.musicians.getByName(''),
]); // Error: name must be a non-empty string
```

### `allSettled`

`allSettled` works like [`Promise.allSettled`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled).
It differs from `all` in that it always succeeds even if some or all of the sub-requests fail.
Also, it returns a PromiseSettledResult instead of the raw value.

```ts

// All succeed
const [miles, mingus, monk] = await all([
  api.musicians.getByName('Miles'),
  api.musicians.getByName('Mingus'),
  api.musicians.getByName('Monk'),
]);

console.log(miles); // -> { status: 'fulfilled', value: { name: "Miles" } }
console.log(mingus); // -> { status: 'fulfilled', value: { name: "Mingus" } }
console.log(monk); // -> { status: 'fulfilled', value: { name: "Monk" } }

// Some fail, some succeed
const [miles, mingus, monk] = await all([
  api.musicians.getByName('Miles'),
  api.musicians.getByName('Mingus'),
  api.musicians.getByName(''),
]);

console.log(miles); // -> { status: 'fulfilled', value: { name: "Miles" } }
console.log(mingus); // -> { status: 'fulfilled', value: { name: "Mingus" } }
console.log(monk); // -> { status: 'rejected', reason: { message: 'name must be a non-empty string' } }
```

### `allSequential`

`allSequential` is typed the same as [`Promise.all`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all).
It acts like the `all` function, with the exception that each request is made sequentially instead of all at once. This is useful when
you need to ensure one call is made before another, for example when creating a new record and then
fetching a list of records that must contain the new one.

```ts
// with all()
const [, coltrane] = await all([
  api.musicians.slowCreation('Coltrane'),
  api.musicians.fastFindByName('Coltrane'),
]);

console.log(coltrane); // -> undefined

// with allSequential()
const [, coltrane] = await allSequential([
  api.musicians.slowCreation('Coltrane'),
  api.musicians.fastFindByName('Coltrane'),
]);

console.log(coltrane); // -> { name: 'Coltrane' }
```

### `allSettledSequential`

`allSettledSequential` is a mix of `allSettled` and `allSequential`. It succeeds even if some sub-requests fail and all calls are performed in order.

```ts
// with allSequential()
const [creationResult, coltrane] = await allSequential([
  api.musicians.slowCreation('Coltrane'),
  api.musicians.fastFindByName('Coltrane'),
]); // Error: "Coltrane" conflicts with an existing record.

// with allSettledSequential()
const [creationResult, coltrane] = await allSettledSequential([
  api.musicians.slowCreation('Coltrane'),
  api.musicians.fastFindByName('Coltrane'),
]);

console.log(creationResult); // -> { status: 'rejected', reason: { message: '"Coltrane" conflicts with an existing record.' } }
console.log(coltrane); // -> { status: 'fulfilled', value: { name: 'Coltrane' } }
```

## Destructured resolution

When a batched promise is resolved, it also resolved the IntegroPromises that are passed in. This allows you
to all API calls while retaining the standard non-all syntax (more or less).

```ts
const artistRequest1 = api.artists.findById(validId1);
const artistRequest2 = api.artists.findById(validId2);
const artistRequest3 = api.artists.findById(invalidId);

await all([
  artistRequest1,
  artistRequest2,
  artistRequest3,
]); // Batch request executes here

// The following requests are already resolved. No additional calls will be made to the server.
console.log(await artistRequest1); // -> { status: 'fulfilled', value: { ... } }
console.log(await artistRequest2); // -> { status: 'fulfilled', value: { ... } }
console.log(await artistRequest3); // -> { status: 'rejected', reason: { ... } }
```

or

```ts
const multipleRequests = [
  api.artists.findById(validId1),
  api.artists.findById(validId2),
  api.artists.findById(invalidId),
];

const [
  artistRequest1,
  artistRequest2,
  artistRequest3,
] = multipleRequests;

await multipleRequests; // Batch request executes here

// The following requests are already resolved. No additional calls will be made to the server.
console.log(await artistRequest1); // -> { status: 'fulfilled', value: { ... } }
console.log(await artistRequest2); // -> { status: 'fulfilled', value: { ... } }
console.log(await artistRequest3); // -> { status: 'rejected', reason: { ... } }
```

For a simpler syntax, the returned `BatchedPromise` is an iterable containing the IntegroPromises that
are passed in, along with an additional `run()` function to execute the all.

```ts
const [
  artistRequest1,
  artistRequest2,
  artistRequest3,
  run
] = all([
  api.artists.findById(validId1),
  api.artists.findById(validId2),
  api.artists.findById(invalidId),
]);

await run(); // Batch request executes here

// The following requests are already resolved. No additional calls will be made to the server.
console.log(await artistRequest1); // -> { status: 'fulfilled', value: { ... } }
console.log(await artistRequest2); // -> { status: 'fulfilled', value: { ... } }
console.log(await artistRequest3); // -> { status: 'rejected', reason: { ... } }
```

## With `unwrap`

`unwrap` still works with batched calls. The request object is passed to each sub-request handler.

::: code-group

```ts [Server]
export const app = {
  public: {
    getPosts: () => db.post.findMany(),
  },
  private: unwrap(async ({ request }) => {
    const user = await getUserByToken(request?.headers.get('Authorization'));

    if (!user) throw new Error('User not logged in');

    return { getMyPosts: () => db.post.findMany({ where: { userId: user.id } }) };
  });
};
```

```ts [Client]
const [allPosts, myPosts] = await allSettled([
  api.public.getPosts(),
  api.private.getMyPosts(),
]);

console.log(allPosts); // -> { status: 'fulfilled', value: [ ... ] }
console.log(myPosts); // -> { status: 'rejected', reason: { message: 'User not logged in' } }
```

:::

## With `respondWith`

When batching API methods that use `respondWith`, ResponseInit objects will be deeply merged
in the order they are specified by the client. When calling API methods that set the same header,
the last write wins.

## Nesting batches

Batches can be batched just like other API functions.

```ts
const [
  [, duke],
  [, dave],
] = await all([
  allSequential([api.musicians.create('Duke Ellington'), api.musicians.getByName('Duke Ellington')]),
  allSequential([api.musicians.create('Dave Brubeck'), api.musicians.getByName('Dave Brubeck')]),
]);

console.log(duke); // -> { name: 'Duke Ellington' }
console.log(dave); // -> { name: 'Dave Brubeck' }
```
