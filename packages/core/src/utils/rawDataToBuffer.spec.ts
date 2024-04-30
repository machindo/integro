import { rawDataToBuffer } from './rawDataToBuffer';

test('rawDataToBuffer converts ArrayBuffer to Buffer', () => {
  const buffer = Buffer.from('test');
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer)

  buffer.forEach((chunk, index) => view[index] = chunk);

  expect(rawDataToBuffer(arrayBuffer)).toEqual(buffer);
});

test('rawDataToBuffer converts Buffer[] to Buffer', () => {
  const buffer = Buffer.from('test');

  expect(rawDataToBuffer([buffer])).toEqual(buffer);
});

test('rawDataToBuffer passes Buffer through', () => {
  const buffer = Buffer.from('test');

  expect(rawDataToBuffer(buffer)).toEqual(buffer);
});
