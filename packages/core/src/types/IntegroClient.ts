import type { PrismaPromise } from '@prisma/client';
import { AsyncReturnType, SetReturnType } from 'type-fest';
import { Subject, SubjectHandler, Subscribe } from '../createSubject';
import { WithResponseInit } from '../respondWith';
import { Unwrappable } from '../unwrap';
import { Handler, IntegroApp } from './IntegroApp';

type AsyncData<Fn extends Handler> =
  ReturnType<Fn> extends void
  ? SetReturnType<Fn, Promise<void>>
  : ReturnType<Fn> extends Subscribe<infer U>
  ? (...args: [...Parameters<Fn>, handler: SubjectHandler<U>]) => () => void
  : ReturnType<Fn> extends WithResponseInit<infer U>
  ? AsyncData<SetReturnType<Fn, U>>
  : ReturnType<Fn> extends PrismaPromise<unknown>
  ? Fn
  : SetReturnType<Fn, Promise<AsyncReturnType<Fn>>>;

export type IntegroClient<T extends IntegroApp> =
  T extends Unwrappable<infer U>
  ? IntegroClient<U>
  : T extends Subject<infer U>
  ? { subscribe: (handler: SubjectHandler<U>) => () => void }
  : T extends Handler
  ? (AsyncData<T> & { [Symbol.toStringTag]: string })
  : { [K in keyof T]: T[K] extends IntegroApp ? IntegroClient<T[K]> : never };

export type AnyClientMethod = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- this is the convention for a generic function type
  (...args: any[]): Promise<any>;
  [Symbol.toStringTag]: string;
};
