import { assertFunction } from 'typia/lib/functional';
import { Artist } from "../../types/Artist";

export const createArtist = assertFunction(async (artist: Artist) => {
  return {
    status: 201,
  };
});
