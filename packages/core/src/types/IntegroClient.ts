import { SetReturnType } from 'type-fest';
import { IntegroApp, Handler } from './IntegroApp';
import { Unwrappable } from '../unwrap';
import { WithResponseInit } from '../respondWith';

type AsyncData<Fn extends Handler> =
  ReturnType<Fn> extends WithResponseInit<infer U>
    ? AsyncData<SetReturnType<Fn, U>>
    : ReturnType<Fn> extends Promise<unknown>
    ? Fn
    : SetReturnType<Fn, Promise<ReturnType<Fn>>>;

export type IntegroClient<T extends IntegroApp> =
  T extends Unwrappable<infer U>
    ? IntegroClient<U>
    : T extends Handler
    ? (AsyncData<T> & { [Symbol.toStringTag]: string })
    : { [K in keyof T]: T[K] extends IntegroApp ? IntegroClient<T[K]> : never }

export type AnyClientMethod = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- this is the convention for a generic function type
  (...args: any[]): Promise<any>;
  [Symbol.toStringTag]: string;
}