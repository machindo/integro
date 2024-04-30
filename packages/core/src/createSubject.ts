const _isSubject = Symbol('isSubject');

export type SubjectHandler<T> = (message: T) => void;

export type Subject<T> = {
  [_isSubject]: true;
  send: (message: T) => void;
  subscribe: (handler: SubjectHandler<T>) => () => void;
};

export const createSubject = <T>(): Subject<T> => {
  const handlers = new Set<SubjectHandler<T>>();

  return {
    [_isSubject]: true,
    send: (message: T) => {
      handlers.forEach(handler => handler(message));
    },
    subscribe: (handler: SubjectHandler<T>) => {
      handlers.add(handler);

      return () => { handlers.delete(handler) };
    },
  }
}

export const isSubject = <T>(object: unknown): object is Subject<T> =>
  typeof object === 'object' && object !== null && (object as Subject<T>)[_isSubject] === true
