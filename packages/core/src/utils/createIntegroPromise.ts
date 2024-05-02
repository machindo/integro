const _args = Symbol('args');
const _setPromise = Symbol('setPromise');

export type IntegroPromise<T, Args extends unknown[] | undefined = undefined> =
  Promise<T> & { [_args]?: Args, [_setPromise]?: (promise: Promise<T>) => void };

type LazyExecuter<T, Args extends unknown[]> = (...args: Args) => Promise<T> | T;


export const createIntegroPromise = <T, Args extends unknown[] = unknown[]>(executor: LazyExecuter<T, Args>, ...args: Args): IntegroPromise<T, Args> => {
  let promise: Promise<T> | undefined;

  return {
    [Symbol.toStringTag]: 'IntegroPromise',
    [_args]: args,
    [_setPromise]: (rawPromise) => {
      promise ??= rawPromise;
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

export const getIntegroPromiseArgs = <T, Args extends unknown[] | undefined = undefined>(
  promise: IntegroPromise<T, Args>
): unknown[] | undefined =>
  (promise as IntegroPromise<T>)[_args];

export const setIntegroPromiseValue = <T, Args extends unknown[] | undefined = undefined>(
  promise: IntegroPromise<T, Args>, rawPromise: Promise<T>
): void => {
  (promise as IntegroPromise<T>)[_setPromise]?.(rawPromise);
};
