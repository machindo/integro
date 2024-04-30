import { pack, unpack } from 'msgpackr';
import { IncomingMessage, ServerResponse } from "node:http";
import { isResponseInitObject } from './respondWith';
import { IntegroApp } from './types/IntegroApp';
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
  const data = unpack(buffer) as { path: string[], args: unknown[] };

  if (!Array.isArray(data.path) || !everyItemIsString(data.path)) {
    throw new BodyParsingError('Could not parse body. Path must be an array of strings.');
  }

  if (!Array.isArray(data.args)) {
    throw new BodyParsingError('Could not parse body. Args must be an array.');
  }

  return data;
};

const encodeResponse = (data: unknown, responseInit?: ResponseInit) =>
  new Response(pack(data), responseInit)

const handleRequest = async (app: IntegroApp, request: Request): Promise<Response> => {
  try {
    const { args, path } = await getData(request);

    const handler = await resolveProp({ path, app, context: { type: 'request', request } });

    if (typeof handler !== "function") {
      throw new PathError(`Path "${path.join('.')}" could not be found in the app.`);
    }

    const res = await handler(...args);

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
