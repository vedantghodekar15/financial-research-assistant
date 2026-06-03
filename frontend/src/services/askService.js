import API from "../api";

export const askQuestion = async (
  query
) => {
  return await API.post(
    "/ask",
    null,
    {
      params: {
        query,
      },
    }
  );
};