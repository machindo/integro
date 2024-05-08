# `allSettledSequential`

`allSettledSequential` sends multiple requests in a single fetch.

## Type definition

```ts
export type BatchedPromise<T extends readonly IntegroPromise<unknown>[] | []> =
  IntegroPromise<{ -readonly [P in keyof T]: PromiseSettledResult<Awaited<T[P]>>; }>
  & [...{ -readonly [P in keyof T]: IntegroPromise<Awaited<T[P]>>; }, () => BatchedPromise<T>];

const allSettledSequential: <T extends readonly IntegroPromise<unknown>[] | []>(values: T) => BatchedPromise<T>;
```

`allSettledSequential` is typed the same as [`Promise.allSettled`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettledSequential).
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
const [res1, res2, res3] = await allSettledSequential([
  api.artists.findById(validId1),
  api.artists.findById(validId2),
  api.artists.findById(invalidId),
]);

console.log(res1); // -> { status: 'fulfilled', value: { ... } }
console.log(res2); // -> { status: 'fulfilled', value: { ... } }
console.log(res3); // -> { status: 'rejected', reason: { ... } }
```

## Parameters

### `promises`

**Type:** `IntegroPromise[]`<br>
**Required:** true

The API promises to allSettledSequential together.
