import { getPhoto } from './api/photos/getPhoto';
import { uploadPhoto } from './api/photos/uploadPhoto';

export const photos = {
  get: getPhoto,
  upload: uploadPhoto,
};
