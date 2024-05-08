import { pack, unpack } from 'msgpackr';
import { IncomingMessage, ServerResponse } from "node:http";
import { isResponseInitObject } from './respondWith';
import { IntegroApp } from './types/IntegroApp';
import { RequestData } from './types/RequestData';
import { BodyParsingError, PathError } from './types/errors';
import { everyItemIsString } from './utils/everyItemIsString';
import { resolveProp } from './utils/resolveProp';
import { toRequest } from './utils/toRequest';

const accessHeaders = {
  "Access-Control-Allow-Methods": "OPTIONS, POST"
} as const;

const getData = async (req: Request) => {
  const arrayBuffer = await req.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return unpack(buffer) as { path: string[], args: unknown[] };
};

const encodeResponse = (data: unknown, responseInit?: ResponseInit) =>
  new Response(pack(data), responseInit)

const batchTypes: readonly string[] = [
  'all',
  'allSequential',
  'allSettled',
  'allSettledSequential',
];

const requestDataTypes: readonly string[] = [
  ...batchTypes,
  'request',
];

const assertRequestData = (data: unknown) => {
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

const handleRequestData = async (app: IntegroApp, request: Request, data: RequestData): Promise<unknown> => {
  switch (data.type) {
    case 'all':
      return Promise.all(data.data.map(d => handleRequestData(app, request, d)));
    case 'allSettled':
      return Promise.allSettled(data.data.map(d => handleRequestData(app, request, d).catch(e => { throw e instanceof Error ? { message: e.message } : e; })));
    case 'allSequential':
      return Array.fromAsync(data.data.map(d => () => handleRequestData(app, request, d)), fn => fn());
    case 'allSettledSequential':
      return Array.fromAsync(data.data.map(d => () => handleRequestData(app, request, d)
        .then(value => ({ status: 'fulfilled', value }))
        .catch(e => ({ status: 'rejected', reason: e instanceof Error ? { message: e.message } : e }))),
        fn => fn()
      );
    case 'request':
    // Fall through
  }

  const handler = await resolveProp({ app, path: data.path, context: { type: 'request', request } });

  if (typeof handler !== "function") {
    throw new PathError(`Path "${data.path.join('.')}" could not be found in the app.`);
  }

  return handler(...data.args);
}

const handleRequest = async (app: IntegroApp, request: Request): Promise<Response> => {
  try {
    const data = assertRequestData(await getData(request));
    const res = await handleRequestData(app, request, data);

    return isResponseInitObject(res)
      ? encodeResponse(res.data, res.responseInit)
      : encodeResponse(res);
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
