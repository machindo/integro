# `all`

`all` sends multiple requests in a single fetch. Like [`Promise.all`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled),
this function succeeds if all requests succeed and fails if any request fails.

## Type definition

```ts
export type BatchedPromise<T extends readonly IntegroPromise<unknown>[] | []> =
  IntegroPromise<{ -readonly [P in keyof T]: Awaited<T[P]>; }>
  & [...{ -readonly [P in keyof T]: IntegroPromise<Awaited<T[P]>>; }, () => BatchedPromise<T>];

const all: <T extends readonly IntegroPromise<unknown>[] | []>(values: T) => BatchedPromise<T>;
```

`all` is typed the same as [`Promise.all`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled).

## Usage

```ts
const [res1, res2, res3] = await all([
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

The API promises to all together.
