import cookie from 'cookie';
import { app } from './app';
import { integro } from 'integro';
import express from 'express';

const handler = integro(app);

express()
  .use((req, _res, next) => {
    console.log('cookies:', cookie.parse(req.header('cookie') ?? ''));

    next();
  })
  .use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('access-control-allow-origin', 'http://localhost:5173');
    res.setHeader('access-control-max-age', '2592000');

    next();
  })
  .use(handler)
  .listen(8000, () =>
    console.info(`Integro listening on port 8000 ...`)
  );
