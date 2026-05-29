import Upload from "./pages/Upload";
import AskQuestion from "./pages/AskQuestion";
import Search from "./pages/Search";
import Summary from "./pages/Summary";

function App() {
  return (
    <div style={{ padding: "30px" }}>
      <h1>Financial Research Assistant</h1>

      <Upload />
      <hr />

      <AskQuestion />
      <hr />

      <Search />
      <hr />

      <Summary />
    </div>
  );
}

export default App;