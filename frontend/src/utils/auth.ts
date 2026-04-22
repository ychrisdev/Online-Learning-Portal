export const getUserId = () => {
  return localStorage.getItem("user_id") ?? "unknown";
};