'use client';

import useSWR from 'swr';
import { apiClient } from './apiClient';
import { useEffect } from 'react';

export const Version: React.FC = () => {
  const { data: version } = useSWR('version', () => apiClient.version());
  
  useEffect(() => {
    console.log('version:', version)
  }, [version]);

  return <div>{version}</div>;
}
