import { MsgPackEncoderFast } from '@jsonjoy.com/json-pack/lib/msgpack/MsgPackEncoderFast';
import { MsgPackDecoderFast } from '@jsonjoy.com/json-pack/lib/msgpack/MsgPackDecoderFast';
import { IncomingMessage, ServerResponse } from "node:http";
import { TLSSocket } from 'node:tls';
import { isUnwrappable } from './index.js';
import { isResponseInitObject } from './respondWith.js';
import { IntegroApp } from './types/IntegroApp.js';

class PathError extends Error { };

const encoder = new MsgPackEncoderFast();
const decoder = new MsgPackDecoderFast();

const accessHeaders = {
  "Access-Control-Allow-Methods": "OPTIONS, POST"
} as const;

const parseIncomingMessageUrl = (req: IncomingMessage) => {
  let protocol = (req.socket as TLSSocket).encrypted ? 'https' : 'http';

  const baseUrl = `${protocol}://${req.headers.host}`;

  if (!req.url) {
    return new URL(baseUrl);
  }

  const parsedUrl = new URL(req.url, `${protocol}://${req.headers.host}`);
  return parsedUrl;
}

const getData = async (req: Request) => {
  const arrayBuffer = await req.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const data = decoder.read(buffer) as { path: string[], args: unknown[] };

  if (!Array.isArray(data.path) || typeof data.path[0] !== 'string' || !Array.isArray(data.args)) {
    throw new Error('Data is malformed');
  }

  return data;
};

const resolveProp = async (
  { path: [firstProp, ...path], app, request }:
    { path: string[], app: IntegroApp, request: Request }
): Promise<IntegroApp> => {
  const property = app && (typeof app === 'object' ? app[firstProp] : undefined);

  if (!property) throw new PathError();

  const unwrappedProperty = isUnwrappable(property) ? await property(request) : property;

  return path.length ? resolveProp({ path, app: unwrappedProperty, request }) : unwrappedProperty;
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

const handleRequest = async (app: IntegroApp, request: Request): Promise<Response> => {
  try {
    const data = await getData(request);
    const { args, path } = data;

    try {
      const handler = await resolveProp({ path, app, request });

      if (typeof handler !== "function") {
        throw new PathError('handler is not a function');
      }

      const res = await handler(...args);

      if (isResponseInitObject(res)) {
        return new Response(encoder.encode(res.data), res.responseInit)
      }

      return new Response(encoder.encode(res));
    } catch (e) {
      if (e instanceof PathError) {
        return new Response(encoder.encode(`Path "${path.join('.')}" could not be found in the app.`), { status: 404 });
      }

      if (e instanceof Error) {
        return new Response(encoder.encode(e.message), { status: 404 });
      }

      return new Response(encoder.encode('Something went wrong.'), { status: 400 });
    }
  } catch (e) {
    return new Response(encoder.encode('Could not parse body.'), { status: 400 });
  }
};

type RequestHandler = (request: IncomingMessage | Request, response?: unknown) => Promise<Response>;

export const integro = (app: IntegroApp): RequestHandler =>
  async (request, response) => {
    const usesServerResponse = response instanceof ServerResponse;
    const req = request instanceof Request ? request : await toRequest(request);

    try {
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
    } catch (e) {
      if (usesServerResponse) {
        response.statusCode = 403;
        response.end(
          encoder.encode(e instanceof Error ? e.message : "An error occured")
        );
      }

      return new Response(encoder.encode(e instanceof Error ? e.message : "An error occured"), { status: 403 })
    }
  }
