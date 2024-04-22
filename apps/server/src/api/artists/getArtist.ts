import { artists } from "../../data/artists.js";

export async function getArtist(id: string) {
  return {
    name: id,
    instruments: artists[id] ?? [],
  };
}
