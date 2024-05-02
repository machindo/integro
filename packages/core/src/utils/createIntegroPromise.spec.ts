import { expect, mock, test } from 'bun:test';
import { createIntegroPromise } from './createIntegroPromise';

test('createIntegroPromise is executed when awaited', async () => {
  const executer = mock();

  await createIntegroPromise(executer);

  expect(executer).toHaveBeenCalledTimes(1);
});

test('createIntegroPromise resolves to the given value', async () => {
  const square = mock((x: number) => x ** 2);

  expect(createIntegroPromise(square, 2).then()).resolves.toBe(4);
});

test('createIntegroPromise is executed when then is called', async () => {
  const executer = mock();

  createIntegroPromise(executer).then();

  expect(executer).toHaveBeenCalledTimes(1);
});

test('createIntegroPromise.then resolves to the given value', async () => {
  const square = mock((x: number) => x ** 2);

  expect(createIntegroPromise(square, 2).then()).resolves.toBe(4);
});

test('createIntegroPromise.then passes value through onfulfilled', async () => {
  const square = mock((x: number) => x ** 2);
  const double = (x: number) => x * 2;

  expect(createIntegroPromise(square, 2).then(double)).resolves.toBe(8);
});

test('createIntegroPromise.then invokes onrejected', async () => {
  const executer = mock().mockRejectedValue('An error');
  const onfulfilled = mock();
  const onrejected = mock();

  await createIntegroPromise(executer).then(onfulfilled, onrejected);

  expect(onfulfilled).toHaveBeenCalledTimes(0);
  expect(onrejected).toHaveBeenCalledTimes(1);
  expect(onrejected).toHaveBeenCalledWith('An error');
});

test('createIntegroPromise is executed when catch is called', async () => {
  const executer = mock();

  createIntegroPromise(executer).catch();

  expect(executer).toHaveBeenCalledTimes(1);
});

test('createIntegroPromise.catch invokes onrejected', async () => {
  const executer = mock().mockRejectedValue('An error');
  const onrejected = mock();

  await createIntegroPromise(executer).catch(onrejected);

  expect(onrejected).toHaveBeenCalledTimes(1);
  expect(onrejected).toHaveBeenCalledWith('An error');
});

test('createIntegroPromise is executed when finally is called', async () => {
  const executer = mock();

  createIntegroPromise(executer).finally();

  expect(executer).toHaveBeenCalledTimes(1);
});

test('createIntegroPromise.finally calls onfinally on fulfilled', async () => {
  const executer = mock().mockResolvedValue('Success');
  const onfinally = mock();

  await createIntegroPromise(executer).finally(onfinally);

  expect(onfinally).toHaveBeenCalledTimes(1);
});

test('createIntegroPromise.finally calls onfinally on rejected', async () => {
  const executer = mock().mockRejectedValue('Failed');
  const onfinally = mock();

  try {
    await createIntegroPromise(executer).finally(onfinally);
  } catch { /* ignore error */ }

  expect(onfinally).toHaveBeenCalledTimes(1);
});

test('createIntegroPromise is not executed when not awaited', async () => {
  const executer = mock();

  createIntegroPromise(executer, 'failed?');

  expect(executer).not.toHaveBeenCalled();
});
