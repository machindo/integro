import { PostOptions, post } from './createClient';
import { IntegroPromise, createIntegroPromise, getIntegroPromiseArgs, setIntegroPromiseValue } from './utils/createIntegroPromise';

export type BatchedPromise<T extends readonly IntegroPromise<unknown>[] | []> =
  IntegroPromise<{ -readonly [P in keyof T]: PromiseSettledResult<Awaited<T[P]>>; }>
  & [...{ -readonly [P in keyof T]: IntegroPromise<Awaited<T[P]>>; }, () => BatchedPromise<T>];

export const batch = <T extends readonly IntegroPromise<unknown>[] | []>(
  promises: T
): BatchedPromise<T> => {
  const batchPromise = createIntegroPromise((options: PostOptions[]) => {
    return options.length ? post(options).then((results: PromiseSettledResult<unknown>[]) => {
      results.forEach((result, index) => {
        setIntegroPromiseValue(promises[index], result.status === 'fulfilled'
          ? Promise.resolve(result.value)
          : Promise.reject(Array.isArray(result.reason) ? { message: result.reason[1] ?? result.reason[0], details: result.reason } : result.reason));
      });

      return results;
    }) : [];
  }, promises.map(promise => {
    const args = getIntegroPromiseArgs(promise)

    if (
      !args
      || !args[0]
      || typeof args[0] !== 'object'
      || !Object.hasOwn(args[0], 'config')
      || !Object.hasOwn(args[0], 'data')
      || !Object.hasOwn(args[0], 'url')
    ) throw new Error('Only IntegroPromises can be batched');

    return args[0] as PostOptions;
  })) as BatchedPromise<T>;

  Object.assign(batchPromise, {
    *[Symbol.iterator]() {
      for (const promise of promises) {
        yield promise;
      }

      yield () => batchPromise;
    }
  });

  return batchPromise;
};
