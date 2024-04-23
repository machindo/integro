import useSWR from 'swr'
import { api } from '../api'
import { Artist } from '@integro/demo-server/src/types/Artist';

export const Artists = () => {
  const { data } = useSWR('api.artists.list', () => api.artists.list());

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