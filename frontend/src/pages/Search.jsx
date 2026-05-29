import { useState } from "react";
import API from "../api";

function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const search = async () => {
    const res = await API.post(
      `/search?query=${query}`
    );

    setResults(res.data.results);
  };

  return (
    <div>
      <h2>Semantic Search</h2>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search context"
      />

      <button onClick={search}>
        Search
      </button>

      {results.map((r, i) => (
        <div key={i}>
          <h4>{r.source}</h4>
          <p>{r.content}</p>
        </div>
      ))}
    </div>
  );
}

export default Search;