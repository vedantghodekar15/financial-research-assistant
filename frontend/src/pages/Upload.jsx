import { useState } from "react";
import API from "../api";

function Upload() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const uploadFile = async () => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await API.post("/upload", formData);

    setMessage(res.data.message);
  };

  return (
    <div>
      <h2>Upload Report</h2>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <button onClick={uploadFile}>
        Upload
      </button>

      <p>{message}</p>
    </div>
  );
}

export default Upload;