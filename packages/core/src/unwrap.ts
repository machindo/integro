import { IntegroApp } from './types/IntegroApp';

const canUnwrappable = Symbol('canUnwrappable');

export type WrappedHandler<T extends IntegroApp> = (request: Request) => T | Promise<T>;

export type Unwrappable<T extends IntegroApp> = WrappedHandler<T> & {
  [canUnwrappable]: true;
};

export const unwrap = <T extends IntegroApp>(handler: WrappedHandler<T>): Unwrappable<T> => {
  const fn = (request: Request) => handler(request);

  fn[canUnwrappable] = true as const;

  return fn;
};

export const isUnwrappable = <T extends IntegroApp>(fn: unknown): fn is Unwrappable<T> =>
  typeof fn === 'function' && (fn as Unwrappable<T>)[canUnwrappable] === true
