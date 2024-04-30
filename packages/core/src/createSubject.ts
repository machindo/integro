export type SubjectHandler<T> = (message: T, error?: { message: string }) => void;

export type Subscribe<T> = (handler: SubjectHandler<T>) => () => void;

export type Subject<T> = {
  _subscriptionCount: () => number;
  filter: (filter: (message: T) => boolean) => Subject<T>;
  map: <U = T>(mapper: (message: T) => U) => Subject<U>;
  send: (message: T) => void;
  subscribe: Subscribe<T>;
};

export type SubjectConfig = {
  onUnsubscribe?: (remainingSubscriptionCount: number) => void;
};

const filterSubject = <T>(source: Subject<T>, filter: (message: T) => boolean) => {
  const subject = createSubject<T>({ onUnsubscribe: (count) => { count === 0 && unsubscribeTarget(); } });
  const unsubscribeTarget = source.subscribe((message) => { filter(message) && subject.send(message); });

  return subject;
};

const mapSubject = <T, U = T>(source: Subject<T>, mapper: (message: T) => U) => {
  const subject = createSubject<U>({ onUnsubscribe: (count) => { count === 0 && unsubscribeTarget(); } });
  const unsubscribeTarget = source.subscribe((message) => {
    const mappedMessage = mapper(message);

    if (mappedMessage) subject.send(mappedMessage);
  });

  return subject;
};

export const createSubject = <T>(config: SubjectConfig = {}): Subject<T> => {
  const subscriptions = new Set<SubjectHandler<T>>();
  const subject: Subject<T> = {
    _subscriptionCount: () => subscriptions.size,
    filter: (filter) => filterSubject(subject, filter),
    map: (mapper) => mapSubject(subject, mapper),
    send: (message) => {
      Array.from(subscriptions.keys()).forEach(handler => handler(message));
    },
    subscribe: (handler) => {
      subscriptions.add(handler);

      return () => {
        subscriptions.delete(handler);
        config.onUnsubscribe?.(subscriptions.size)
      };
    },
  }

  return subject;
};

export const isSubject = <T>(object: unknown): object is Subject<T> =>
  typeof object === 'object' && object !== null && typeof (object as Subject<T>).subscribe === 'function';
