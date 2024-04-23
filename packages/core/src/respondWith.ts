const hasResponseInit = Symbol('hasResponseInit');

export type WithResponseInit<T> = {
  [hasResponseInit]: true;
  data?: T;
  responseInit?: ResponseInit;
};

export const respondWith = <T>(data?: T, responseInit?: ResponseInit): WithResponseInit<T> => ({
  [hasResponseInit]: true,
  data,
  responseInit,
});

export const isResponseInitObject = <T>(object: WithResponseInit<T> | unknown): object is WithResponseInit<T> =>
  typeof object === 'object' && object !== null && (object as WithResponseInit<T>)[hasResponseInit] === true
