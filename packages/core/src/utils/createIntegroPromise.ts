const _args = Symbol('args');
const _setPromise = Symbol('setPromise');

export type IntegroPromise<T, Args extends unknown[] = unknown[]> =
  Promise<T> & { [_args]: Args, [_setPromise]?: (promise: Promise<T>) => void };

type LazyExecuter<T, Args extends unknown[]> = (...args: Args) => Promise<T> | T;

export const createIntegroPromise = <T, Args extends unknown[] = unknown[]>(executor: LazyExecuter<T, Args>, ...args: Args): IntegroPromise<T, Args> => {
  let promise: Promise<T> | undefined;

  return {
    [Symbol.toStringTag]: 'IntegroPromise',
    [_args]: args,
    [_setPromise]: (nativePromise) => {
      promise ??= nativePromise;
    },
    catch: (onrejected) => {
      promise ??= Promise.resolve(executor(...args));

      return promise.catch(onrejected);
    },
    finally: (onfinally) => {
      promise ??= Promise.resolve(executor(...args));

      return promise.finally(onfinally);
    },
    then: (onfulfilled, onrejected) => {
      promise ??= Promise.resolve(executor(...args));

      return promise.then(onfulfilled, onrejected);
    },
  };
};

export const getIntegroPromiseArgs = <T extends IntegroPromise<unknown, unknown[]>>(
  promise: T
): unknown[] => promise[_args];

export const setIntegroPromiseValue = <T>(
  promise: IntegroPromise<T, unknown[]>, nativePromise: Promise<T>
): void => {
  promise[_setPromise]?.(nativePromise);
};

export const isIntegroPromise = (promise: unknown): promise is IntegroPromise<unknown> =>
  !!promise
  && typeof promise === 'object'
  && promise.toString() === '[object IntegroPromise]'
  && Array.isArray((promise as IntegroPromise<unknown>)[_args]);

export const isIntegroPromises = (promises: readonly unknown[]): promises is IntegroPromise<unknown>[] =>
  promises.every(isIntegroPromise);
