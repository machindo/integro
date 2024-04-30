import { serve } from 'bun';
import { createController } from 'integro';
import { app } from './app.js';

serve({
  port: 8000,
  fetch: async (req) => {
    const res = await createController(app)(req);

    res.headers.set('access-control-allow-credentials', 'true');
    res.headers.set('access-control-allow-headers', 'Content-Type');
    res.headers.set('access-control-allow-origin', 'http://localhost:5173');
    res.headers.set('access-control-max-age', '2592000');

    return res;
  },
  websocket: {
    message: (ws, message) => {
      ws
    }
  }
});

console.log('Started bun server on port 8000');
