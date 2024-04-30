import cookie from 'cookie';
import { defineApp, respondWith, unwrap } from 'integro';
import z from 'zod';
import { getArtist } from './api/artists/getArtist';
import getArtists from './api/artists/getArtists';
import { upsertArtist } from './api/artists/upsertArtist';
import { Artist } from './types/Artist';

const onArtistsUpdates = (ws: WebSocket) => (artists: Artist[]) => {
  ws.send(artists);
};

export const app = defineApp({
  version: () => '0.2.8',
  serverDate: () => new Date(),
  artists: {
    create: unwrap(() => import('./api/artists/createArtist').then(module => module.createArtist)),
    get: getArtist,
    list: getArtists,
    upsert: upsertArtist,
    delete: unwrap(req => {
      if (!req.headers.get('Authorization')) throw new Error('User does not have permission to delete artists!');

      return (id: string) => `Deleted ${id} forever and ever!`;
    }),
    admin: unwrap(req => {
      if (req.headers.get('Authorization') !== 'admin') throw new Error('User does not have admin permissions!');

      return {
        deleteAll: () => 'Deleted all!'
      }
    }),
    subscribe: (ws: WebSocket) => {
      return onArtistsUpdates(ws);
    },
  },
  auth: {
    login: (username: string, password: string) => {
      if (username && password) {
        const headers = new Headers();

        headers.set('Set-Cookie', cookie.serialize('session', username));

        return respondWith(undefined, { headers });
      } else {
        throw new Error('Not authenticated');
      }
    },
    logout: () => {
      const headers = new Headers();

      headers.set('Set-Cookie', cookie.serialize('session', '', { expires: new Date(0) }));

      return respondWith(undefined, { headers });
    }
  },
  photos: unwrap(() => import('./photos').then(module => module.photos)),
  repeatString: z.function().args(z.string(), z.number()).implement(
    (text, times) => Array(times).fill(text).join(', ')
  ),
});

export type App = typeof app;
