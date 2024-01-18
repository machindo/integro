import { artists } from "../../data/artists.js";

export default async function (props?: {
  queryParams?: { instrument?: string };
}) {
  return [
    ...Object.entries(artists)
      .filter(
        ([_, instruments]) =>
          !props?.queryParams?.instrument ||
          instruments.includes(props?.queryParams.instrument)
      )
      .map(([name, instruments]) => ({ name, instruments })),
    { name: Math.random().toString(), instruments: [] },
  ];
}
