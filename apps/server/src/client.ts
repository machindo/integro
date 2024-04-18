import { createClient } from 'integro';

import type { App } from './app';

const createAppClient = createClient<App>;

export { createAppClient as createClient };
