import { integro } from 'integro';
import { createServer } from 'node:http';
import { app } from './app';

const handle = integro(app);

createServer((req, res) => {
  if (new URL(req.url ?? '', 'https://localhost').pathname === '/api') {
    return handle(req, res);
  }

  res.end();
}).listen(8000, undefined, () =>
  console.info(`Integro listening on port 8000 ...`)
);
