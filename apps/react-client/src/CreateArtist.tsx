import React, { useState } from "react";
import useSWRMutation from "swr/mutation";
import "./App.css";
import { api } from "./client";
import { useSWRConfig } from 'swr';
import { Artist } from '@integro/demo-server/src/types/Artist';

export const CreateArtist: React.FC = () => {
  const [name, setName] = useState("");
  const { mutate } = useSWRConfig();
  const { isMutating, trigger } = useSWRMutation('createArtist', (_: string, { arg }: { arg: Artist }) => api.artists.create(arg));
  const save = async () => {
    setName("");

    await trigger({ name: 'Charles' });
    await mutate("artists/getArtists");
  };

  return (
    <div>
      <label>
        Name <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <br />
      <button type="submit" onClick={save}>
        Save
      </button>
      {isMutating && <p>Saving...</p>}
    </div>
  );
};
