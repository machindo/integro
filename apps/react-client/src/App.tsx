import React from "react";
import "./App.css";
import { Artists } from "./Artists.1";
import { SWRConfig } from "swr";
import { CreateArtist } from "./CreateArtist";

function App() {
  return (
    <SWRConfig value={{}}>
      <div className="App">
        <Artists />
        <hr />
        <CreateArtist />
      </div>
    </SWRConfig>
  );
}

export default App;
