import { IncomingMessage, createServer } from "http";
import { pack, unpack } from "msgpackr";
import { join } from "path";
import { getConfig } from "./getConfig";

const port = process.env.PORT ?? process.env.NODE_PORT ?? 8000;

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
    incomingMessage.on("end", () => resolve(new Blob(body)));
  });

const getData = async (req: Request) => {
  try {
    const blob = await req.blob();
    const arrayBuffer = await blob.arrayBuffer();

    return unpack(Buffer.from(arrayBuffer));
  } catch {
    return undefined;
  }
};

const toRequest = async (incomingMessage: IncomingMessage) =>
  new Request(`http://localhost${incomingMessage.url ?? ""}`, {
    method: incomingMessage.method,
    headers: incomingMessage.headers as Record<string, string>,
    body: await getIncomingMessageBody(incomingMessage),
  });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
  "Access-Control-Max-Age": 2592000, // 30 days
};

const serve = async () => {
  const cwd = process.cwd();
  const config = await getConfig();
  const root = join(cwd, config?.root ?? "");
  const validatorPath = join(cwd, config?.out ?? ".integro", "server/types.ts");

  const handleRequest = async (req: Request): Promise<Response> => {
    try {
      req = pipe(req, ...(config?.middleware ?? []));
    } catch (e) {
      return new Response(pack((e as Error).message), { status: 403 });
    }

    const fnPath = new URL(req.url).pathname.slice(1);
    const fnName = fnPath.match(/[^\/]*$/)?.[0] ?? "";
    const module = await import(join(root, fnPath));
    const handler = module[fnName] ?? module.default;

    if (typeof handler !== "function")
      return new Response(undefined, { status: 404 });

    const props = await getData(req);
    const validators = await import(validatorPath);
    const validator = validators[
      `validate_${fnPath.replaceAll("/", "_")}` as keyof typeof validators
    ] as (typeof validators)[keyof typeof validators] | undefined;

    if (!validator) {
      console.warn(`No validator found for ${fnName}`);
    }

    const validation = validator?.(props) ?? {
      success: true,
      errors: [],
      data: props,
    };

    if (!validation.success) {
      return new Response(pack(validation.errors), { status: 403 });
    }

    const res = (await handler(props)) ?? {};

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

export const server = serve();
