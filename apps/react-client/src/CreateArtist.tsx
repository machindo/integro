import React, { useState } from "react";
import useSWRMutation from "swr/mutation";
import "./App.css";
import { client, createMutatationPair, useClientMutate } from "./client";

export const CreateArtist: React.FC = () => {
  const [name, setName] = useState("");
  const mutate = useClientMutate();
  const { isMutating, trigger } = useSWRMutation(
    ...createMutatationPair(client.artists.createArtist)
  );
  const save = async () => {
    setName("");

    await trigger({ json: { name } });
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
