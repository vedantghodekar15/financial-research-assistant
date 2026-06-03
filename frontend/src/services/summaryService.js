import API from "../api";

export const getSummary = async () => {
  return await API.get(
    "/summarize"
  );
};