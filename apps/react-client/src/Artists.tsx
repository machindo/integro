import React, { useState } from "react";
import useSWR from "swr";
import "./App.css";
import { api } from "./client";

export const Artists: React.FC = () => {
  const [instrument, setInstrument] = useState("");
  const { data, isValidating } = useSWR('artists/getArtists', () => api.artists.list());

  return (
    <div>
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
