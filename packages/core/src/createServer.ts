import { pack, unpack } from "msgpackr";
import { IncomingMessage, OutgoingHttpHeaders, createServer as createNodeServer } from "node:http";
import { IntegroApp } from './types/IntegroApp.js';
import { Middleware } from './types/Middleware.js';
import { pipe } from './utils/pipe.js';
import { isResponseInitObject } from './respondWith.js';
import { isUnwrappable } from './index.js';

export type ServerConfig = {
  headers?: OutgoingHttpHeaders;
  middleware?: Middleware[];
};

class PathError extends Error {};

const accessHeaders = {
  "Access-Control-Allow-Methods": "OPTIONS, POST"
} as const;

const getData = async (req: Request) => {
  const blob = await req.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const data = unpack(Buffer.from(arrayBuffer));

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

const getIncomingMessageBody = (
  incomingMessage: IncomingMessage
): Promise<Blob> =>
  new Promise((resolve) => {
    const body: Uint8Array[] = [];

    incomingMessage.on("data", (chunk) => body.push(chunk));
    incomingMessage.on("end", () => resolve(new Blob(body) as Blob));
  });

const toRequest = async (incomingMessage: IncomingMessage) =>
  new Request(`http://localhost${incomingMessage.url ?? ""}`, {
    method: incomingMessage.method,
    headers: incomingMessage.headers as Record<string, string>,
    body: await getIncomingMessageBody(incomingMessage),
  });

export const createServer = (app: IntegroApp, { headers, middleware }: ServerConfig = {}) => {
  const handleRequest = async (request: Request): Promise<Response> => {
    try {
      request = pipe(request, ...(middleware ?? []));
    } catch (e) {
      return new Response(pack((e as Error).message), { status: 403 });
    }

    try {
      const { args, path } = await getData(request);

      try {
        const handler = await resolveProp({ path, app, request });

        if (typeof handler !== "function") {
          throw new PathError('handler is not a function');
        }
  
        const res = await handler(...args);

        if (isResponseInitObject(res)) {
          return new Response(pack(res.data), res.responseInit)
        }

        return new Response(pack(res));
      } catch (e) {
        if (e instanceof PathError) {
          return new Response(pack(`Path "${path.join('.')}" could not be found in the app.`), { status: 404 });
        }

        if (e instanceof Error) {
          return new Response(pack(e.message), { status: 404 });
        }
        
        return new Response(pack('Something went wrong.'), { status: 400 });
      }
    } catch (e) {
      return new Response(pack('Could not parse body.'), { status: 400 });
    }
  };

  return createNodeServer(async (incomingMessage, serverResponse) => {
    serverResponse.writeHead(204, { ...headers, ...accessHeaders });

    try {
      if (incomingMessage.method === "OPTIONS") {
        serverResponse.end();

        return;
      }

      const req = await toRequest(incomingMessage);
      const res = await handleRequest(req);

      serverResponse.statusCode = res.status;
      serverResponse.statusMessage = res.statusText;
      res.headers.forEach((value, key) => serverResponse.setHeader(key, value));
      serverResponse.end(Buffer.from(await (await res.blob()).arrayBuffer()));
    } catch (e) {
      serverResponse.statusCode = 403;
      serverResponse.end(
        pack(e instanceof Error ? e.message : "An error occured")
      );
    }
  });
};
