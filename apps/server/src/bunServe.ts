import { serve } from 'bun';
import { integro } from 'integro';
import { app } from './app.js';

serve({
  port: 8000,
  fetch: (req) => {
    if (new URL(req.url).pathname === '/api') return integro(app)(req);

    return Response.error();
  }
});

console.log('Started bun server on port 8000');
