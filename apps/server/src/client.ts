import { createClient } from 'integro/browser';
import type { app } from './app';

export const createApiClient = createClient<typeof app>;
