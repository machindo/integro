import { defineApp, lazy } from 'integro';
import { getArtist } from './api/artists/getArtist.js';
import getArtists from './api/artists/getArtists.js';
import { upsertArtist } from './api/artists/upsertArtist.js';

export const app = defineApp({
  artists: {
    create: lazy(() => import('./api/artists/createArtist').then(module => module.createArtist)),
    get: getArtist,
    list: getArtists,
    upsert: upsertArtist,
  },
  photos: lazy(() => import('./photos').then(module => module.photos))
});
