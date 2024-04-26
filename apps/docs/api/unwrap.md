# `unwrap`

`unwrap` is a function used to "unwrap" the request object on the server-side, as well as "unwrap" the return value of the function.

It has two primary uses:

* Lazy load portions of your app using dynamic imports.
* Inspect the request object to guard against unauthorized access.

## Type definition

```ts
type WrappedHandler<T extends IntegroApp> = (request: Request) => T | Promise<T>;

const unwrap: <T extends IntegroApp>(handler: WrappedHandler<T>) => T;
```

## Usage

### Lazy loading

If your API app is large, it may be expensive to initialize it all at once. In this case, lazy loading portions of your app can help improve performance.

Lazy loaded modules can even be nested!

::: code-group

```ts [app.ts]
export const app = {
  artists: unwrap(() => import('./artists').then(module => module.artists)),
  getPhoto: unwrap(() => import('./getPhoto').then(module => module.getPhoto)),
};
```

```ts [artists.ts]
import 'db' from './expensiveDBService';

export const artists = {
  getById: (artistId: string) => db.select('artist', artistId),
  getPhoto: unwrap(() => import('./getPhoto').then({ getPhoto } =>
    (artistId: string) => getPhoto(artistId)
  )),
};
```

```ts [getPhoto.ts]
import 'photos' from './expensivePhotoService';

export const getPhoto = (id: string) => photos.getById(id);
```

:::

On the client side, your app will be typed as if the dynamically imported modules were statically imported.

```ts
const apiClient: {
  artists: {
    getById: (artistId: string) => Artist;
    getPhoto: (artistId: string) => Blob;
  },
  getPhoto: (artistId: string) => Blob;
};
```

### Inspecting Request

Most APIs require some level of authentication. The `unwrap` function provides access to the server [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) object.

```ts
import { parseBearer } from './authService';
import { db } from './dbService';

export const app = {
  users: unwrap((req) => {
    const token = req.headers.get('Authorization');

    if (!token) {
      throw new Error('User is not authenticated!');
    }

    return {
      list: () => db.select('user'),
      me: async () => {
        const user = await parseBearer(token);

        return db.select('user', user.id);
      }
    }
  }),
};
```

As with lazy loading, your client-side app will be typed as if unwrap were not used:

```ts
const apiClient: {
  users: {
    list: () => Promise<User[]>;
    me: () => Promise<User>;
  };
};
```
