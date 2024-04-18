import { IncomingMessage, createServer } from "node:http";
import { pack, unpack } from "msgpackr";
import { Middleware } from './types/Middleware';

export type ServerConfig = {
  middleware?: Middleware[];
  port?: number | string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
  "Access-Control-Max-Age": 2592000, // 30 days
};

const getData = async (req: Request) => {
  try {
    const blob = await req.blob();
    const arrayBuffer = await blob.arrayBuffer();

    return unpack(Buffer.from(arrayBuffer));
  } catch {
    return undefined;
  }
};

const prop = ([firstProp, ...path]: string[], object: any): any =>
  path.length ? prop(path, object[firstProp]) : object[firstProp];

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

export const serve = async (app: object, {
  middleware,
  port = process.env.PORT ?? process.env.NODE_PORT ?? 8000
}: ServerConfig = {}) => {
  const handleRequest = async (req: Request): Promise<Response> => {
    try {
      req = pipe(req, ...(middleware ?? []));
    } catch (e) {
      return new Response(pack((e as Error).message), { status: 403 });
    }
    const { args, path } = await getData(req);
    const handler = prop(path, app);

    if (typeof handler !== "function")
      return new Response(undefined, { status: 404 });

    const res = (await handler(...args)) ?? {};

    return new Response(pack(res));
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
      console.log("e:", e);

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
