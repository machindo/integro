import { createClient } from 'integro/client';
import type { app } from './app';

export const createApiClient = createClient<typeof app>;
