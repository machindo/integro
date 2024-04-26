import cookie from 'cookie';
import express from 'express';
import { integro } from 'integro';
import { app } from './app';

const handler = integro(app);

express()
  .use((req, _res, next) => {
    console.log('cookies:', cookie.parse(req.header('cookie') ?? ''));

    next();
  })
  .use((_req, res, next) => {
    res.setHeader('access-control-allow-credentials', 'true');
    res.setHeader('access-control-allow-headers', 'Content-Type');
    res.setHeader('access-control-allow-origin', 'http://localhost:5173');
    res.setHeader('access-control-max-age', '2592000');

    next();
  })
  .use(handler)
  .post('/api', handler)
  .listen(8000, () =>
    console.info(`Integro listening on port 8000 ...`)
  );
