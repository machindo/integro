import { SetReturnType } from 'type-fest';
import { IntegroApp, Handler } from './IntegroApp';
import { Unwrappable } from '../unwrap';
import { WithResponseInit } from '../respondWith';

type AsyncData<Fn extends (...arguments_: any[]) => any> =
  ReturnType<Fn> extends WithResponseInit<infer U>
    ? AsyncData<SetReturnType<Fn, U>>
    : ReturnType<Fn> extends Promise<unknown>
    ? Fn
    : SetReturnType<Fn, Promise<ReturnType<Fn>>>;

export type IntegroClient<T extends IntegroApp> =
  T extends Unwrappable<infer U>
    ? IntegroClient<U>
    : T extends Handler
    ? AsyncData<T>
    : { [K in keyof T]: T[K] extends IntegroApp ? IntegroClient<T[K]> : never }
