import { createArtist } from './api/artists/createArtist.js';
import { getArtist } from './api/artists/getArtist.js';
import getArtists from './api/artists/getArtists.js';
import { upsertArtist } from './api/artists/upsertArtist.js';
import { getPhoto } from './api/photos/getPhoto.js';
import { uploadPhoto } from './api/photos/uploadPhoto.js';

export const app = {
  artists: {
    create: createArtist,
    get: getArtist,
    list: getArtists,
    upsert: upsertArtist,
  },
  photos: {
    get: getPhoto,
    upload: uploadPhoto,
  }
};
