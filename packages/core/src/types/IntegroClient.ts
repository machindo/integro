import { Asyncify } from 'type-fest';
import { LazyModule } from '../lazy';
import { IntegroApp, Handler } from './IntegroApp';

export type IntegroClient<T extends IntegroApp> =
  T extends LazyModule<infer U>
    ? IntegroClient<U>
    : T extends Handler
    ? Asyncify<T>
    : { [K in keyof T]: T[K] extends IntegroApp ? IntegroClient<T[K]> : never }
