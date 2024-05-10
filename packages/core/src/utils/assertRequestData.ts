import { RequestData } from '../types/RequestData';
import { BodyParsingError } from '../types/errors';
import { everyItemIsString } from './everyItemIsString';

const requestDataTypes: readonly string[] = [
  'all',
  'allSequential',
  'allSettled',
  'allSettledSequential',
  'request',
];

export const assertRequestData = (data: unknown) => {
  if (!data || typeof data !== 'object')
    throw new BodyParsingError('Could not parse body. Body must be an object.');
  if (!('type' in data) || typeof data.type !== 'string' || !requestDataTypes.includes(data.type))
    throw new BodyParsingError('Could not parse body. Type must be one of the following: all, allSettled, allSequential, allSettledSequential, request.');
  if (data.type === 'request') {
    if (!('path' in data) || !Array.isArray(data.path) || !everyItemIsString(data.path))
      throw new BodyParsingError('Could not parse body. Path must be an array of strings.');
    if (!('args' in data) || !Array.isArray(data.args))
      throw new BodyParsingError('Could not parse body. Args must be an array.');
  } else if (!('data' in data) || !Array.isArray(data.data) || !data.data.every(assertRequestData)) {
    throw new BodyParsingError('Could not parse body. Nested data is missing or malformed.');
  }

  return data as RequestData;
}