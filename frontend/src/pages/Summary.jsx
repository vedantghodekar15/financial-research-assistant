import { useState } from "react";
import API from "../api";

function Summary() {
  const [summary, setSummary] = useState("");

  const getSummary = async () => {
    const res = await API.get("/summarize");
    setSummary(res.data.summary);
  };

  return (
    <div>
      <h2>Financial Summary</h2>

      <button onClick={getSummary}>
        Generate Summary
      </button>

      <p>{summary}</p>
    </div>
  );
}

export default Summary;