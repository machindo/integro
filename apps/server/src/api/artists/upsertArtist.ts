import { Artist } from "../../types/Artist";

export function upsertArtist({
  params: { name },
  json,
}: {
  params: { name: string };
  json: Artist;
}) {
  return {
    name: json.name,
    instruments: json.instruments ?? [],
  };
}
