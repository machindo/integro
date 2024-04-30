import type { IncomingMessage, ServerResponse } from 'node:http';
import type { TLSSocket } from 'node:tls';

const parseIncomingMessageUrl = (req: IncomingMessage) => {
  const protocol = (req.socket as TLSSocket).encrypted ? 'https' : 'http';
  const baseUrl = `${protocol}://${req.headers.host}`;

  return req.url ? new URL(req.url, baseUrl) : new URL(baseUrl);
}

const getHttpMessageBody = (
  incomingMessage: IncomingMessage | ServerResponse
): Promise<Blob> =>
  new Promise((resolve) => {
    const body: Uint8Array[] = [];

    incomingMessage.on("data", (chunk) => body.push(chunk));
    incomingMessage.on("end", () => resolve(new Blob(body) as Blob));
  });

export const toRequest = async (incomingMessage: IncomingMessage) =>
  new Request(parseIncomingMessageUrl(incomingMessage), {
    method: incomingMessage.method,
    headers: incomingMessage.headers as Record<string, string>,
    body: await getHttpMessageBody(incomingMessage),
  });
