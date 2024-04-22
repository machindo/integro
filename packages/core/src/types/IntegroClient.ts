import { SetReturnType } from 'type-fest';
import { LazyModule } from '../lazy';
import { IntegroApp, Handler } from './IntegroApp';

type Asyncify<Fn extends (...arguments_: any[]) => any> = ReturnType<Fn> extends Promise<unknown> ? Fn : SetReturnType<Fn, Promise<ReturnType<Fn>>>;

export type IntegroClient<T extends IntegroApp> =
  T extends LazyModule<infer U>
    ? IntegroClient<U>
    : T extends Handler
    ? Asyncify<T>
    : { [K in keyof T]: T[K] extends IntegroApp ? IntegroClient<T[K]> : never }
