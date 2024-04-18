import { serve } from 'integro';
import { app } from './app';

await serve(app, { port: 8000 });
