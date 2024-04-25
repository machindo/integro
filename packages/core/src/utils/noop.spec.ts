import { noop } from './noop';

test('noop does nothing', () => {
  expect(noop()).toBeUndefined();
});
