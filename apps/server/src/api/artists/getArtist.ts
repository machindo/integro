import { artists } from "../../data/artists.js";

export async function getArtist({ name }: { name: string }) {
  return {
    name: name,
    instruments: artists[name] ?? [],
  };
}
