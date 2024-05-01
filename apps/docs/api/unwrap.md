# `unwrap`

`unwrap` is a function used to "unwrap" the request object on the server-side, as well as "unwrap" the return value of the function.

It has two primary uses:

* Lazy load portions of your app using dynamic imports.
* Inspect the request object to guard against unauthorized access.

## Type definition

```ts
type MessageContext = {
  type: 'message';
  auth?: string;
  request?: undefined;
};

type RequestContext = {
  type: 'request';
  auth?: undefined;
  request: Request;
};

type HandlerContext =
  | MessageContext
  | RequestContext;

type WrappedHandler<T extends IntegroApp> = (context: HandlerContext) => T | Promise<T>;

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
  users: unwrap(({ request }) => {
    const token = request?.headers.get('Authorization');

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

## With subscriptions

`unwrap` can be also used with subscriptions. However, there are two important things to note:

- The context object will not contain a `request` object because subscriptions are made via web sockets. Instead,
  the `auth` parameter (passed to `createClient`) can be used for authentication.
- `createSubject` should not be called inside the `unwrap` function. Doing so would make the subject scoped
  to the function body and we wouldn't be able to invoke it from elsewhere in the app.

::: code-group

```ts [Server-side]
type Article = { author: string; content: string };

const articleCreation$ = createSubject<Article>();

const app = {
  articles: unwrap(async ({ auth }) => {
    const user = auth && await userService.getUserByToken(auth);

    if (!user) throw new Error('Unauthenticated!')

    return {
      create: async (article: Article) => {
        await db.save(article);

        // Notify subscribers
        articleCreation$.send(article);
      },
      myCreation$: {
        subscribe: (author: string) =>
          articleCreation$.filter((article) => article.author === user.name).subscribe,
      },
    };
  }),
};
```

```ts [Client-side]
const api = createClient<App>('https://example.com/api', { auth: 'user.auth.token' });

api.articles.myCreation.subscribe(console.log);
// -> { author: 'Me', content: '...' }

api.articles.create({ author: 'Someone else', content: '...' });
api.articles.create({ author: 'Me', content: '...' });
```

:::
