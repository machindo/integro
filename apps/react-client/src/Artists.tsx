import React, { useState } from "react";
import useSWR from "swr";
import "./App.css";
import { client, createFetcherPair, useCaller } from "./client";

export const Artists: React.FC = () => {
  const [instrument, setInstrument] = useState("");
  const { data, isValidating } = useSWR(
    ...createFetcherPair(client.artists.getArtists, {})
  );
  const { data: version } = useCaller(client.getVersion);

  return (
    <div>
      <p>Version: {version?.version}</p>
      <label>
        Instrument{" "}
        <input
          value={instrument}
          onChange={(e) => setInstrument(e.target.value)}
        />
      </label>
      {isValidating && <p>Loading...</p>}
      {data?.map((artist: any) => (
        <p key={artist.name}>
          {artist.name}: {artist.instruments.join(",")}
        </p>
      ))}
    </div>
  );
};
