# React recipes

You can retrieve the path name of an integro client method by using [`Symbol.toStringTag`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toStringTag). This is useful for cases where you need to dynamically get the path at runtime.

```ts
const path = api.artists.list[Symbol.toStringTag];
console.log(path); // => 'artists.list'
```

Here are a couple examples where `Symbol.toStringTag` proves useful for using integro with React querying hooks:

### With Vercel's SWR

::: code-group

```tsx [api.ts]
import type { createApiClient } from '@/api';
import { AnyClientMethod } from 'integro/browser';
import useSWR from 'swr';

export const api = createApiClient("https://example.com/api", {
  requestInit: { credentials: 'include' }
});

export const useIntegroSWR = <Fn extends AnyClientMethod>(fn: Fn, ...args: Parameters<Fn>) =>
  useSWR<Awaited<ReturnType<Fn>>>([fn[Symbol.toStringTag], ...args], () => fn(...args));
```

```tsx [Artists.tsx]
import { api, useIntegroSWR } from '../api';

export const Artists = () => {
  const { data } = useIntegroSWR(api.artists.list);

  return (
    <div>
      {data?.map((artist) => (
        <p key={artist.name}>
          {artist.name}: {artist.instruments?.join(",")}
        </p>
      ))}
    </div>
  );
};
```

```tsx [Artist.tsx]
import { api, useIntegroSWR } from '../api';

export const Artist = () => {
  const { data } = useIntegroSWR(api.artists.get, 'monk');

  return (
    <p>
      {artist.name}: {artist.instruments?.join(",")}
    </p>
  );
};
```

:::

### With Tanstack Query

::: code-group

```tsx [api.ts]
import type { createApiClient } from '@/api';
import { useQuery } from '@tanstack/react-query';
import { AnyClientMethod } from 'integro/browser';

export const api = createApiClient("https://example.com/api", {
  requestInit: { credentials: 'include' }
});

export const useIntegroQuery = <Fn extends AnyClientMethod>(fn: Fn, ...args: Parameters<Fn>) =>
  useQuery<Awaited<ReturnType<Fn>>>({
    queryKey: [fn[Symbol.toStringTag], ...args],
    queryFn: () => fn(...args)
  });
```

```tsx [Artists.tsx]
import { api, useIntegroQuery } from '../api';

export const Artists = () => {
  const { data } = useIntegroQuery(api.artists.list);

  return (
    <div>
      {data?.map((artist) => (
        <p key={artist.name}>
          {artist.name}: {artist.instruments?.join(",")}
        </p>
      ))}
    </div>
  );
};
```

```tsx [Artist.tsx]
import { api, useIntegroQuery } from '../api';

export const Artist = () => {
  const { data } = useIntegroQuery(api.artists.get, 'monk');

  return (
    <p>
      {artist.name}: {artist.instruments?.join(",")}
    </p>
  );
};
```

:::
