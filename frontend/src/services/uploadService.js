import API from "../api";

export const uploadReport = async (
  file,
  onUploadProgress
) => {
  const formData = new FormData();

  formData.append("file", file);

  return await API.post(
    "/upload",
    formData,
    {
      headers: {
        "Content-Type":
          "multipart/form-data",
      },
      onUploadProgress,
    }
  );
};