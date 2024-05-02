import { pack, unpack } from 'msgpackr';
import { IncomingMessage, ServerResponse } from "node:http";
import { isResponseInitObject } from './respondWith';
import { IntegroApp } from './types/IntegroApp';
import { BodyParsingError, PathError } from './types/errors';
import { everyItemIsString } from './utils/everyItemIsString';
import { resolveProp } from './utils/resolveProp';
import { toRequest } from './utils/toRequest';

type RequestData = {
  args: unknown[];
  path: string[];
};

const accessHeaders = {
  "Access-Control-Allow-Methods": "OPTIONS, POST"
} as const;

const getData = async (req: Request) => {
  const arrayBuffer = await req.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return unpack(buffer) as { path: string[], args: unknown[] };
};

const assertRequestData = (data: unknown) => {
  if (!data || typeof data !== 'object')
    throw new BodyParsingError('Could not parse body. Path must be an array of strings.');
  if (!('path' in data) || !Array.isArray(data.path) || !everyItemIsString(data.path))
    throw new BodyParsingError('Could not parse body. Path must be an array of strings.');
  if (!('args' in data) || !Array.isArray(data.args))
    throw new BodyParsingError('Could not parse body. Args must be an array.');

  return data as RequestData;
}

const encodeResponse = (data: unknown, responseInit?: ResponseInit) =>
  new Response(pack(data), responseInit)

const merge = <T extends object>(objects: T[]): T => Object.assign({}, ...objects);

const handleRequest = async (app: IntegroApp, request: Request): Promise<Response> => {
  try {
    const rawData = await getData(request);
    const isBatch = Array.isArray(rawData);
    const inputs = isBatch ? rawData.map(assertRequestData) : [assertRequestData(rawData)];
    const results = await Promise.allSettled(inputs.map(async ({ args, path }) => {
      const handler = await resolveProp({ path, app, context: { type: 'request', request } });

      if (typeof handler !== "function") {
        throw new PathError(`Path "${path.join('.')}" could not be found in the app.`);
      }

      return handler(...args);
    }));

    if (isBatch) {
      return encodeResponse(
        results.map(res => (res.status === 'fulfilled' && isResponseInitObject(res.value)) ? { ...res, value: res.value.data } : res),
        merge(results.map(res => (res.status === 'fulfilled' && isResponseInitObject(res.value) && res.value.responseInit) || {}))
      );
    }

    const res = results[0];

    if (res.status === 'rejected') {
      throw res.reason;
    }

    return isResponseInitObject(res.value)
      ? encodeResponse(res.value.data, res.value.responseInit)
      : encodeResponse(res.value);
  } catch (e) {
    if (e instanceof BodyParsingError) {
      return encodeResponse({ message: e.message }, { status: 400 });
    }

    if (e instanceof PathError) {
      return encodeResponse({ message: e.message }, { status: 404 });
    }

    if (e instanceof Error) {
      return encodeResponse({ message: e.message }, { status: 400 });
    }

    return encodeResponse({ message: 'Something went wrong.' }, { status: 400 });
  }
};

type RequestHandler = (request: IncomingMessage | Request, arg2?: unknown) => Promise<Response>;

const isServerResponse = (object: unknown): object is ServerResponse => object instanceof ServerResponse;

export const createController =
  (app: IntegroApp): RequestHandler =>
    async (request: IncomingMessage | Request, arg2?: unknown) => {
      const serverResponse = isServerResponse(arg2) ? arg2 : undefined;
      const req = request instanceof Request ? request : await toRequest(request);

      if (req.method === "OPTIONS") {
        serverResponse?.writeHead(204, accessHeaders);
        serverResponse?.end();

        return new Response(undefined, { headers: accessHeaders, status: 204 })
      }

      const res = await handleRequest(app, req);

      if (serverResponse) {
        serverResponse.statusCode = res.status;
        serverResponse.statusMessage = res.statusText;
        res.headers.forEach((value, key) => serverResponse.setHeader(key, value));
        serverResponse.end(Buffer.from(await (await res.blob()).arrayBuffer()));
      }

      return res;
    };
