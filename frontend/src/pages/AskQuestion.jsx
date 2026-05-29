import { useState } from "react";
import API from "../api";

function AskQuestion() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");

  const ask = async () => {
    const res = await API.post(
      `/ask?query=${query}`
    );

    setAnswer(res.data.answer);
  };

  return (
    <div>
      <h2>Ask Question</h2>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask financial question"
      />

      <button onClick={ask}>
        Ask
      </button>

      <p>{answer}</p>
    </div>
  );
}

export default AskQuestion;