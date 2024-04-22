import { IncomingMessage, createServer } from "node:http";
import { pack, unpack } from "msgpackr";
import z from 'zod';
import { IntegroApp } from './types/IntegroApp';
import { Middleware } from './types/Middleware';
import { isLazy } from '.';

export type ServerConfig = {
  middleware?: Middleware[];
  port?: number | string;
};

class PathError extends Error {};

const Data = z.object({
  path: z.string().min(1).array().nonempty(),
  args: z.any().array()
})

type Data = z.infer<typeof Data>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
  "Access-Control-Max-Age": 2592000, // 30 days
};

const getData = async (req: Request) => {
  const blob = await req.blob();
  const arrayBuffer = await blob.arrayBuffer();

  return Data.parse(unpack(Buffer.from(arrayBuffer)));
};

const resolveProp = async ([firstProp, ...path]: string[], object: any): Promise<any> => {
  try {
    const property = isLazy(object[firstProp]) ? await object[firstProp]() : object[firstProp];

    return path.length ? resolveProp(path, property) : property;
  } catch (e) {
    throw new PathError();
  }
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
        const handler = await resolveProp(path, app);

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
    console.log(`Integro listening on port ${port} ...`)
  );

  return server;
};
