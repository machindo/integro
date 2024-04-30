const _isResponseInitObject = Symbol('isResponseInitObject');

export type WithResponseInit<T> = {
  [_isResponseInitObject]: true;
  data?: T;
  responseInit?: ResponseInit;
};

export const respondWith = <T>(data?: T, responseInit?: ResponseInit): WithResponseInit<T> => ({
  [_isResponseInitObject]: true,
  data,
  responseInit,
});

export const isResponseInitObject = <T>(object: WithResponseInit<T> | unknown): object is WithResponseInit<T> =>
  typeof object === 'object' && object !== null && (object as WithResponseInit<T>)[_isResponseInitObject] === true
