import { merge } from './merge';

test('merge merges 2 simple objects', () => {
  expect(merge([{ a: 1, b: 2 }, { a: 3, c: 4 }])).toEqual({ a: 3, b: 2, c: 4 });
});

test('merge merges 3 simple objects', () => {
  expect(merge([{ a: 1, b: 2 }, { a: 3, c: 4 }, { a: 10, d: 12 }])).toEqual({ a: 10, b: 2, c: 4, d: 12 });
});

test('merge merges 3 nested objects', () => {
  expect(merge([
    { a: 1, b: { ba: 1, bb: 2 }, c: { ca: 1, cb: 9 } },
    { a: 3, c: { cb: 20, cc: 21 } },
    { a: 10, b: 11, d: 12 }
  ])).toEqual({ a: 10, b: 11, c: { ca: 1, cb: 20, cc: 21 }, d: 12 });
});

test('merge merges 3 deeply nested objects', () => {
  expect(merge([
    { a: 1, b: { ba: 1, bb: 2 }, c: { ca: 1, cb: { cba: 30 } } },
    { a: 3, c: { cb: { cba: 40 }, cc: 21 } },
    { a: 10, b: 11, d: 12 }
  ])).toEqual({ a: 10, b: 11, c: { ca: 1, cb: { cba: 40 }, cc: 21 }, d: 12 });
});
