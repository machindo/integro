import { integro } from 'integro';
import { createServer } from 'node:http';
import { app } from './app';

const handle = integro(app);

createServer((req, res) => {
  res.setHeader('access-control-allow-credentials', 'true');
  res.setHeader('access-control-allow-headers', 'Content-Type');
  res.setHeader('access-control-allow-origin', 'http://localhost:5173');
  res.setHeader('access-control-max-age', '2592000');

  if (new URL(req.url ?? '', 'https://localhost').pathname === '/api') {
    return handle(req, res);
  }

  res.end();
}).listen(8000, undefined, () =>
  console.info(`Integro listening on port 8000 ...`)
);
