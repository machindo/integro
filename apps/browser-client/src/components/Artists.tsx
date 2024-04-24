import useSWR from 'swr';
import { api } from '../api';
import { Artist } from '@integro/demo-server/src/types/Artist';
import { useEffect } from 'react';

export const Artists = () => {
  const { data } = useSWR('api.artists.list', () => api.artists.list());
  const { data: version } = useSWR('api.version', () => api.version());
  
  useEffect(() => {
    console.log('version:', version)
  }, [version]);

  return (
    <div>
      {data?.map((artist: Artist) => (
        <p key={artist.name}>
          {artist.name}: {artist.instruments?.join(",")}
        </p>
      ))}
    </div>
  );
}