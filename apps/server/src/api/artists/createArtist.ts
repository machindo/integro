import { Artist } from "../../types/Artist";

export const createArtist = async (props: { json: Artist }) => {
  return {
    status: 201,
  };
};
