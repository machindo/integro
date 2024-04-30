import { IntegroApp } from './types/IntegroApp';
import { HandlerContext } from './types/HandlerContext';

const _isUnwrappable = Symbol('isUnwrappable');

export type WrappedHandler<T extends IntegroApp> = (context: HandlerContext) => T | Promise<T>;

export type Unwrappable<T extends IntegroApp> = WrappedHandler<T> & {
  [_isUnwrappable]: true;
};

export const unwrap = <T extends IntegroApp>(handler: WrappedHandler<T>): Unwrappable<T> => {
  const fn = (context: HandlerContext) => handler(context);

  fn[_isUnwrappable] = true as const;

  return fn;
};

export const isUnwrappable = <T extends IntegroApp>(fn: unknown): fn is Unwrappable<T> =>
  typeof fn === 'function' && (fn as Unwrappable<T>)[_isUnwrappable] === true
