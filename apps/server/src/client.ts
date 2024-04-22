import { createClient } from 'integro';
import type { app } from './app';

export const createApiClient = createClient<typeof app>;
