import cookie from 'cookie';
import { createServer } from 'integro';
import { app } from './app';

const server = createServer(app, {
  headers: {
    'Access-Control-Allow-Credentials': 'true',
    'access-control-allow-origin': 'http://localhost:5173',
    'access-control-max-age': '2592000'
  },
  middleware: [
    req => {
      console.log('cookies', cookie.parse(req.headers.get('cookie') ?? ''));

      return req;
    }
  ]
});

server.listen(8000, undefined, () =>
  console.info(`Integro listening on port 8000 ...`)
);
