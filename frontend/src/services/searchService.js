import API from "../api";

export const semanticSearch = async (
  query
) => {
  return await API.post(
    "/search",
    null,
    {
      params: {
        query,
      },
    }
  );
};