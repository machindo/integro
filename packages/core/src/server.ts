import { pack, unpack } from "msgpackr";
import { IncomingMessage, createServer } from "node:http";
import { isGuarded, isLazy } from '.';
import { IntegroApp } from './types/IntegroApp';
import { Middleware } from './types/Middleware';

export type ServerConfig = {
  middleware?: Middleware[];
  port?: number | string;
};

class PathError extends Error {};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
  "Access-Control-Max-Age": 2592000, // 30 days
};

const getData = async (req: Request) => {
  const blob = await req.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const data = unpack(Buffer.from(arrayBuffer));

  if (!Array.isArray(data.path) || typeof data.path[0] !== 'string' || !Array.isArray(data.args)) {
    throw new Error('Data is malformed');
  }
    
  return data;
};

const resolveProp = async ([firstProp, ...path]: string[], object: any, request: Request): Promise<any> => {
  const property = object[firstProp];

  if (!property) throw new PathError();

  const resolvedLazyProperty = isLazy(property) ? await property() : property;
  const resolvedGuardedProperty = isGuarded(resolvedLazyProperty) ? await resolvedLazyProperty(request) : resolvedLazyProperty;

  return path.length ? resolveProp(path, resolvedGuardedProperty, request) : resolvedGuardedProperty;
}

const pipe = <T = unknown>(
  value: T,
  next?: (value: T) => T,
  ...rest: ((value: T) => T)[]
): T => (next ? pipe(next(value), ...rest) : value);

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

export const serve = async (app: IntegroApp, {
  middleware,
  port = process.env.PORT ?? process.env.NODE_PORT ?? 8000
}: ServerConfig = {}) => {
  const handleRequest = async (req: Request): Promise<Response> => {
    try {
      req = pipe(req, ...(middleware ?? []));
    } catch (e) {
      return new Response(pack((e as Error).message), { status: 403 });
    }

    try {
      const { args, path } = await getData(req);

      try {
        const handler = await resolveProp(path, app, req);

        if (typeof handler !== "function") {
          throw new PathError('handler is not a function');
        }
  
        const res = (await handler(...args)) ?? {};

        return new Response(pack(res));
      } catch (e) {
        if (e instanceof PathError) {
          return new Response(pack(`Path "${path.join('.')}" could not be found in the app.`), { status: 404 });
        }

        if (e instanceof Error) {
          return new Response(pack(e.message), { status: 404 });
        }
        
        return new Response('Something went wrong.', { status: 400 });
      }
    } catch (e) {
      return new Response(pack('Could not parse body.'), { status: 400 });
    }
  };

  const server = createServer(async (incomingMessage, serverResponse) => {
    serverResponse.writeHead(204, corsHeaders);

    try {
      if (incomingMessage.method === "OPTIONS") {
        serverResponse.end();

        return;
      }

      const req = await toRequest(incomingMessage);
      const res = await handleRequest(req);

      serverResponse.statusCode = res.status;
      serverResponse.statusMessage = res.statusText;
      serverResponse.end(Buffer.from(await (await res.blob()).arrayBuffer()));
    } catch (e) {
      serverResponse.statusCode = 403;
      serverResponse.end(
        pack(e instanceof Error ? e.message : "An error occured")
      );
    }
  });

  server.listen(port, undefined, () =>
    console.info(`Integro listening on port ${port} ...`)
  );

  return server;
};
