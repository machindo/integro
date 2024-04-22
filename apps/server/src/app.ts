import { defineApp, guard, lazy } from 'integro';
import z from 'zod';
import { getArtist } from './api/artists/getArtist.js';
import getArtists from './api/artists/getArtists.js';
import { upsertArtist } from './api/artists/upsertArtist.js';

export const app = defineApp({
  artists: {
    create: lazy(() => import('./api/artists/createArtist').then(module => module.createArtist)),
    get: getArtist,
    list: getArtists,
    upsert: upsertArtist,
    delete: guard((req) => {
      if (!req.headers.get('Authorization')) throw new Error('User does not have permission to delete artists!');

      return (id: string) => `Deleted ${id} forever and ever!`;
    }),
    admin: guard((req => {
      if (req.headers.get('Authorization') !== 'admin') throw new Error('User does not have admin permissions!');

      return {
        deleteAll: () => 'Deleted all!'
      }
    }))
  },
  photos: lazy(() => import('./photos').then(module => module.photos)),
  repeatString: z.function().args(z.string(), z.number()).implement(
    (text, times) => Array(times).fill(text).join(', ')
  ),
});
