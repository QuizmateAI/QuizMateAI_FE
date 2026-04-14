import api from "./api";

export async function getWelcomeBackInfo() {
  const response = await api.get("/user/welcome-back/info");
  return response?.data ?? response;
}

export async function dismissWelcomeBack() {
  const response = await api.post("/user/welcome-back/dismiss");
  return response?.data ?? response;
}
