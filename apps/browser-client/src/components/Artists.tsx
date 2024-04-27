import { useEffect } from 'react';
import { api, useIntegro, useIntegroQuery } from '../api';

export const Artists = () => {
  const { data } = useIntegro(api.artists.list);
  const { data: version } = useIntegroQuery(api.version);

  useEffect(() => {
    console.log('data:', data)
  }, [data]);
  
  useEffect(() => {
    console.log('version:', version)
  }, [version]);

  return (
    <div>
      {data?.map((artist) => (
        <p key={artist.name}>
          {artist.name}: {artist.instruments?.join(",")}
        </p>
      ))}
    </div>
  );
};
