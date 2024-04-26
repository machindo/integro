import { serve } from 'bun';
import { integro } from 'integro';
import { app } from './app.js';

serve({
  port: 8000,
  fetch: async (req) => {
    const res = await integro(app)(req);

    res.headers.set('access-control-allow-credentials', 'true');
    res.headers.set('access-control-allow-headers', 'Content-Type');
    res.headers.set('access-control-allow-origin', 'http://localhost:5173');
    res.headers.set('access-control-max-age', '2592000');

    return res;
  }
});

console.log('Started bun server on port 8000');
