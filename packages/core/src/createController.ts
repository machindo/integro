import { pack, unpack } from 'msgpackr';
import { IncomingMessage, ServerResponse } from "node:http";
import { WithResponseInit, isResponseInitObject, respondWith } from './respondWith';
import { IntegroApp } from './types/IntegroApp';
import { RequestData } from './types/RequestData';
import { BodyParsingError, PathError } from './types/errors';
import { assertRequestData } from './utils/assertRequestData';
import { resolveProp } from './utils/resolveProp';
import { toRequest } from './utils/toRequest';
import { merge } from './utils/merge';

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

const reduceResponseInit = (data: unknown, responseInit: ResponseInit = {}): WithResponseInit<unknown> => {
  if (isResponseInitObject(data)) {
    return respondWith(data.data, { ...responseInit, ...data.responseInit });
  }

  if (data && typeof data === 'object' && 'value' in data && isResponseInitObject(data.value)) {
    return reduceResponseInit(data.value, responseInit);
  }

  if (Array.isArray(data)) {
    const array = data.map(d => reduceResponseInit(d, responseInit));

    return respondWith(
      array.map(({ data }) => data),
      merge([responseInit, ...array.map(({ responseInit }) => responseInit).filter(Boolean) as ResponseInit[]]),
    );
  }

  return respondWith(data, responseInit);
}

const handleRequest = async (app: IntegroApp, request: Request): Promise<Response> => {
  try {
    const data = assertRequestData(await getData(request));
    const res = await handleRequestData(app, request, data);
    const response = reduceResponseInit(res);

    return encodeResponse(response.data, response.responseInit);
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
