import { defineApp, unwrap } from '../index.js';

export const nestedApp = defineApp({
  getName: () => "I'm a nested app!",
  nestedFunction: unwrap(() => import('./nestedFunction.spec.js').then(module => module.nestedFunction)),
});
