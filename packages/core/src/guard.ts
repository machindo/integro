import { IntegroApp } from './types/IntegroApp';

const isGuardedHandler = Symbol('isLazy');

export type GuardHandler<T extends IntegroApp> = (request: Request) => T | Promise<T>;

export type Guarded<T extends IntegroApp> = GuardHandler<T> & {
  [isGuardedHandler]: true;
};

export type MaybeGuarded<T extends IntegroApp> = GuardHandler<T> & {
  [isGuardedHandler]?: true;
};

export const guard = <T extends IntegroApp>(handler: GuardHandler<T>): Guarded<T> => {
  const fn = (request: Request) => handler(request);

  fn[isGuardedHandler] = true as const;

  return fn;
};

export const isGuarded = <T extends IntegroApp>(fn: MaybeGuarded<T>): fn is Guarded<T> => fn[isGuardedHandler] === true
