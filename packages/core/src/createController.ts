import { pack, unpack } from 'msgpackr';
import { IncomingMessage, ServerResponse } from "node:http";
import { TLSSocket } from 'node:tls';
import { isUnwrappable } from './index.js';
import { isResponseInitObject } from './respondWith.js';
import { IntegroApp } from './types/IntegroApp.js';

class BodyParsingError extends Error { };
class PathError extends Error { };

const accessHeaders = {
  "Access-Control-Allow-Methods": "OPTIONS, POST"
} as const;

const parseIncomingMessageUrl = (req: IncomingMessage) => {
  const protocol = (req.socket as TLSSocket).encrypted ? 'https' : 'http';
  const baseUrl = `${protocol}://${req.headers.host}`;

  return req.url ? new URL(req.url, baseUrl) : new URL(baseUrl);
}

const everyItemIsString = (array: unknown[]): array is string[] => array.every(value => typeof value === 'string');

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

const resolveProp = async (
  { path: [firstProp, ...path], app, request }:
    { path: string[], app: IntegroApp, request: Request }
): Promise<IntegroApp> => {
  const unwrappedApp = isUnwrappable(app) ? await app(request) : app;

  if (!unwrappedApp) throw new PathError(`Path could not be found in the app.`);

  const property = firstProp == null ? undefined : (unwrappedApp as Record<string, IntegroApp>)[firstProp];

  return property ? resolveProp({ path, app: property, request }) : unwrappedApp;
}

const getHttpMessageBody = (
  incomingMessage: IncomingMessage | ServerResponse
): Promise<Blob> =>
  new Promise((resolve) => {
    const body: Uint8Array[] = [];

    incomingMessage.on("data", (chunk) => body.push(chunk));
    incomingMessage.on("end", () => resolve(new Blob(body) as Blob));
  });

const toRequest = async (incomingMessage: IncomingMessage) =>
  new Request(parseIncomingMessageUrl(incomingMessage), {
    method: incomingMessage.method,
    headers: incomingMessage.headers as Record<string, string>,
    body: await getHttpMessageBody(incomingMessage),
  });

const encodeResponse = (data: unknown, responseInit?: ResponseInit) =>
  new Response(pack(data), responseInit)

const handleRequest = async (app: IntegroApp, request: Request): Promise<Response> => {
  try {
    const { args, path } = await getData(request);

    const handler = await resolveProp({ path, app, request });

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

type RequestHandler = (request: IncomingMessage | Request, response?: unknown) => Promise<Response>;

export const createController = (app: IntegroApp): RequestHandler =>
  async (request, response) => {
    const usesServerResponse = response instanceof ServerResponse;
    const req = request instanceof Request ? request : await toRequest(request);

    if (req.method === "OPTIONS") {
      if (usesServerResponse) {
        response.writeHead(204, accessHeaders);
        response.end();
      }

      return new Response(undefined, { headers: accessHeaders, status: 204 })
    }

    const res = await handleRequest(app, req);

    if (usesServerResponse) {
      response.statusCode = res.status;
      response.statusMessage = res.statusText;
      res.headers.forEach((value, key) => response.setHeader(key, value));
      response.end(Buffer.from(await (await res.blob()).arrayBuffer()));
    }

    return res;
  }
