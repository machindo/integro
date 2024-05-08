# `allSequential`

`allSequential` sends multiple requests in a single fetch. It acts like the [`all`](./all) function,
with the exception that each request is made sequentially instead of all at once. This is useful when
you need to ensure one call is made before another, for example when creating a new record and then
fetching a list of records that must contain the new one.

## Type definition

```ts
export type BatchedPromise<T extends readonly IntegroPromise<unknown>[] | []> =
  IntegroPromise<{ -readonly [P in keyof T]: Awaited<T[P]>; }>
  & [...{ -readonly [P in keyof T]: IntegroPromise<Awaited<T[P]>>; }, () => BatchedPromise<T>];

const allSequential: <T extends readonly IntegroPromise<unknown>[] | []>(values: T) => BatchedPromise<T>;
```

`allSequential` is typed the same as [`Promise.all`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all).

## Usage

```ts
const [res1, res2, res3] = await allSequential([
  api.artists.findById(validId1),
  api.artists.findById(validId2),
  api.artists.findById(invalidId),
]);

console.log(res1); // -> value: { ... }
console.log(res2); // -> value: { ... }
console.log(res3); // -> value: { ... }
```

## Parameters

### `promises`

**Type:** `IntegroPromise[]`<br>
**Required:** true

The API promises to allSequential together.
