import { artists } from "../../data/artists.js";

export function getArtist(props: { params: { name: string } }) {
  return {
    name: props.params.name,
    instruments: artists[props.params.name] ?? [],
  };
}
