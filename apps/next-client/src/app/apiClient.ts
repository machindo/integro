'use client';

import { createClient } from 'integro/browser';
import type { app } from './api/app';

export const apiClient = createClient<typeof app>('/api');
