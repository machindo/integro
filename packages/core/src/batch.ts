import { ClientConfig, PostOptions, post } from './createClient.js';
import { BatchRequestData, RequestData } from './types/RequestData.js';
import { assertRequestData } from './utils/assertRequestData.js';
import { IntegroPromise, createIntegroPromise, getIntegroPromiseArgs, isIntegroPromises, setIntegroPromiseValue } from './utils/createIntegroPromise.js';

export type BatchPostOptions = {
  url: string;
  config: ClientConfig;
  data: BatchRequestData;
};

export type BatchedPromise<T extends readonly Promise<unknown>[] | [], Type extends Exclude<RequestData['type'], 'request'>> =
  IntegroPromise<{ -readonly [P in keyof T]: Type extends 'all' | 'allSequential'
    ? Awaited<T[P]>
    : PromiseSettledResult<Awaited<T[P]>>;
  }, [BatchPostOptions]>
  & [...{ -readonly [P in keyof T]: IntegroPromise<Awaited<T[P]>>; }, () => BatchedPromise<T, Type>];

const assertPostOptions = (value: unknown) => {
  if (
    !Array.isArray(value)
    || !value[0]
    || typeof value[0] !== 'object'
    || typeof value[0].url !== 'string'
    || !value[0].config
    || typeof value[0].config !== 'object'
  ) {
    throw new Error('Only IntegroPromises can be batched');
  }

  try {
    assertRequestData(value[0].data);
  } catch {
    throw new Error('Only IntegroPromises can be batched');
  }

  return value.slice(0, 1) as [PostOptions];
}

const batch = <Type extends Exclude<RequestData['type'], 'request'>>(type: Type) =>
  <T extends readonly Promise<unknown>[] | []>(promises: T): BatchedPromise<T, Type> => {
    if (!isIntegroPromises(promises)) throw new Error('Only IntegroPromises can be batched');

    const allPostOptions = promises.map(promise =>
      assertPostOptions(getIntegroPromiseArgs(promise))[0]
    );
    const executor = (options: BatchPostOptions) =>
      post(options).then((results: unknown[]) => {
        results.forEach((result, index) => {
          if (type === 'all' || type === 'allSequential') {
            setIntegroPromiseValue(promises[index], Promise.resolve(result));
          } else {
            const settledResult = result as PromiseSettledResult<unknown>;

            setIntegroPromiseValue(promises[index], settledResult.status === 'fulfilled'
              ? Promise.resolve(settledResult.value)
              : Promise.reject(settledResult.reason));
          }
        });

        return results;
      });
    const batchPromise = promises.length === 0
      ? createIntegroPromise(() => [])
      : createIntegroPromise(executor, {
        url: allPostOptions[0].url,
        config: allPostOptions[0].config,
        data: {
          type,
          data: allPostOptions.map(({ data }) => data)
        },
      });

    Object.assign(batchPromise, {
      *[Symbol.iterator]() {
        for (const promise of promises) {
          yield promise;
        }

        yield () => batchPromise;
      }
    });

    return batchPromise as unknown as BatchedPromise<T, Type>;
  };

export const all = batch('all');

export const allSequential = batch('allSequential');

export const allSettled = batch('allSettled');

export const allSettledSequential = batch('allSettledSequential');
