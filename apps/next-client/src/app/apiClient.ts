'use client';

import { createClient } from 'integro/client';
import type { app } from './api/app';

export const apiClient = createClient<typeof app>('/api');
