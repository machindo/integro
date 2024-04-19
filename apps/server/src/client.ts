import { createClient } from 'integro';

import type { app } from './app';

const createAppClient = createClient<typeof app>;

export { createAppClient as createClient };
