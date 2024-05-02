# `batch`

`batch` sends multiple requests in a single fetch.

## Type definition

```ts
export type BatchedPromise<T extends readonly IntegroPromise<unknown>[] | []> =
  IntegroPromise<{ -readonly [P in keyof T]: PromiseSettledResult<Awaited<T[P]>>; }>
  & [...{ -readonly [P in keyof T]: IntegroPromise<Awaited<T[P]>>; }, () => BatchedPromise<T>];

const batch: <T extends readonly IntegroPromise<unknown>[] | []>(values: T) => BatchedPromise<T>;
```

`batch` is typed the same as [`Promise.allSettled`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled).
Batch results are typed as PromiseSettledResult:

```ts
/// lib.es2020.promise.d.ts

interface PromiseFulfilledResult<T> {
    status: "fulfilled";
    value: T;
}

interface PromiseRejectedResult {
    status: "rejected";
    reason: any;
}

type PromiseSettledResult<T> = PromiseFulfilledResult<T> | PromiseRejectedResult;
```

## Usage

```ts
const [res1, res2, res3] = await batch([
  api.artists.findById(validId1),
  api.artists.findById(validId2),
  api.artists.findById(invalidId),
]);

console.log(res1); // -> { status: 'fulfilled', value: { ... } }
console.log(res2); // -> { status: 'fulfilled', value: { ... } }
console.log(res3); // -> { status: 'rejected', reason: { ... } }
```

When batch is resolved, it also resolved the IntegroPromises that are passed in. This allows you
to batch API calls while retaining the standard non-batch syntax (more or less).

```ts
const artistRequest1 = api.artists.findById(validId1);
const artistRequest2 = api.artists.findById(validId2);
const artistRequest3 = api.artists.findById(invalidId);

await batch([
  artistRequest1,
  artistRequest2,
  artistRequest3,
]); // Batch request executes here

// The following requests are already resolved. No additional calls will be made to the server.
console.log(await artistRequest1); // -> { status: 'fulfilled', value: { ... } }
console.log(await artistRequest2); // -> { status: 'fulfilled', value: { ... } }
console.log(await artistRequest3); // -> { status: 'rejected', reason: { ... } }
```

For a simpler syntax, the returned `BatchedPromise` is an iterable containing the IntegroPromises that
are passed in, along with an additional `run()` function to execute the batch.

```ts
const [
  artistRequest1,
  artistRequest2,
  artistRequest3,
  run
] = batch([
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

## Parameters

### `promises`

**Type:** `IntegroPromise[]`<br>
**Required:** true

The API promises to batch together.
