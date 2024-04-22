import type { IntegroApp } from './types/IntegroApp';

const isLazyModule = Symbol('isLazy');

type Importer<T extends IntegroApp> = () => Promise<T>;

export type LazyModule<T extends IntegroApp> = Importer<T> & {
  [isLazyModule]: true;
};

export type MaybeLazyModule<T extends IntegroApp> = Importer<T> & {
  [isLazyModule]?: true;
};

export const lazy = <T extends IntegroApp>(importer: Importer<T>): LazyModule<T> => {
  const fn = () => importer();
  
  fn[isLazyModule] = true as const;

  return fn;
};

export const isLazy = <T extends IntegroApp>(fn: MaybeLazyModule<T>): fn is LazyModule<T> => fn[isLazyModule] === true
