# `createSubject`

Creates a subscribable endpoint for server-to-client communication.

## Type definition

```ts
type Subject<T> = {
  _subscriptionCount: () => number;
  filter: (filter: (message: T) => boolean) => Subject<T>;
  map: <U = T>(mapper: (message: T) => U) => Subject<U>;
  send: (message: T) => void;
  subscribe: Subscribe<T>;
};

type SubjectConfig = {
  onUnsubscribe?: (remainingSubscriptionCount: number) => void;
};

const createSubject = <T>(config: SubjectConfig = {}): Subject<T>;
```

## Usage

```ts
type Article = {
  title: string;
  author: string;
  content: string;
};

const articlesList$ = createSubject<Article>();

const app = {
  articles: {
    list$: articlesList$,
    update$: createSubject<Article>(),
    listByAuthorUpdate$: {
      subscribe: (author: string) =>
        articleList$.map((list) => list.filter((article) => article.author === author)).subscribe,
    },
    byAuthorUpdate$: {
      subscribe: (author: string) =>
        app.articles.update$.filter((article) => article.author === author).subscribe,
    },
  },
};

app.articles.list$.subscribe(console.log);
// -> [
//     { title: 'Simpler API development with integro', author: 'Bugwee Mudbean', content: '...' },
//     { title: 'Simpler API development with integro', author: 'Gootsy Oxhandler', content: '...' },
//   ]

app.articles.update$.subscribe(console.log);
// -> { title: 'Simpler API development with integro', author: 'Gootsy Oxhandler', content: '...' }
// -> { title: 'Simpler API development with integro', author: 'Bugwee Mudbean', content: '...' }

app.articles.listByAuthorUpdate$.subscribe('Bugwee Mudbean', console.log);
// -> [{ title: 'Simpler API development with integro', author: 'Bugwee Mudbean', content: '...' }]

app.articles.byAuthorUpdate$.subscribe('Gootsy Oxhandler', console.log);
// -> { title: 'Simpler API development with integro', author: 'Gootsy Oxhandler', content: '...' }

articlesList$.send([
  { title: 'Simpler API development with integro', author: 'Bugwee Mudbean', content: '...' },
  { title: 'Simpler API development with integro', author: 'Gootsy Oxhandler', content: '...' },
]);
app.articles.update$.send({ title: 'Simpler API development with integro', author: 'Gootsy Oxhandler', content: '...' });
app.articles.update$.send({ title: 'Simpler API development with integro', author: 'Bugwee Mudbean', content: '...' });
```

`articlesList$` is a subject that can be shared throughout your application code.

`app.articles.list$` is set to `articlesList$`, so that any messages sent to `articlesList$`
will be subscribable at the `app.articles.list$.subscribe` endpoint.

`app.articles.update$` is set to a new subject, which can be accessed by sharing `app`.

`app.articles.listByAuthorUpdate$.subscribe` is a parameterized subscription. It takes in an
`author` parameter and returns all `articleList$` messages, mapped through the given function
(which filters for only articles matching the given author).

`app.articles.byAuthorUpdate$` is another parameterized subscription. This one filters on
`app.articles.update$` to only send messages that meet the given filter.

## Parameters

### `config`

**Type:** `SubjectConfig`<br>
**Default:** `{}`

#### `config.onUnsubscribe`

**Type:** `(remainingSubscriptionCount: number) => void`<br>
**Default:** `undefined`

Optional function called each time a subscription is unsubscribed. Good for cleanup tasks.
