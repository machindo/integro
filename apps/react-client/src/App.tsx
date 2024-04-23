import React from "react";
import "./App.css";
import { SWRConfig } from "swr";

function App() {
  return (
    <SWRConfig value={{}}>
      <div className="App">
      </div>
    </SWRConfig>
  );
}

export default App;
